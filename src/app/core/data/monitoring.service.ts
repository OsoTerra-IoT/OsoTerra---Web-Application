import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import {
  CalibrationRecordResource,
  CorrectiveActionResource,
  DeviceResource,
  FarmResource,
  PlotResource,
  SalinityAlertResource,
  SoilReadingResource,
} from '../api/api.types';
import { FarmManagementApi } from '../api/farm-management.api';
import {
  fromId,
  MAAS_HOFFMAN,
  toAlert,
  toCalibration,
  toCorrectiveAction,
  toCrop,
  toDevice,
  toFarm,
  toPlot,
  toReading,
} from '../api/mappers';
import { Contingency, contingencyOf } from './contingency';
import { SalinityAlertingApi } from '../api/salinity-alerting.api';
import { SoilMonitoringApi } from '../api/soil-monitoring.api';
import { AuthService } from '../auth/auth.service';
import {
  CORRECTIVE_ACTION_TYPES,
  CorrectiveAction,
  Crop,
  Device,
  Farm,
  Plot,
  SalinityAlert,
  SoilReading,
  User,
} from '../models';

/** Plot salinity level, from the same excess ratio the Backend uses to grade alerts. */
export type SalinityLevel = 'normal' | 'watch' | 'high' | 'critical' | 'unknown';
/** Outcome of activating a sensor: `codeInUse` when the API already has that activation code. */
export type DeviceActivation = 'activated' | 'codeInUse' | 'failed';
/** Length of the Backend's `activation_code` column. */
export const ACTIVATION_CODE_MAX_LENGTH = 40;
/** Plots loaded at the same time; each one makes up to three requests at once. */
const PLOT_LOAD_CONCURRENCY = 4;

/** Maps `items` with at most `limit` calls in flight, keeping the order of the results. */
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  run: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
export interface AdvisorClient {
  id: string;
  user: User | undefined;
  plots: Plot[];
  farms: Farm[];
  areaHectares: number;
  openAlerts: number;
}
interface Snapshot {
  farms: Farm[];
  plots: Plot[];
  devices: Device[];
  alerts: SalinityAlert[];
  readings: ReadonlyMap<string, SoilReading[]>;
  /** Plots whose own data could not be loaded; the others are unaffected. */
  failedPlotIds: string[];
}
const EMPTY: Snapshot = {
  farms: [],
  plots: [],
  devices: [],
  alerts: [],
  readings: new Map(),
  failedPlotIds: [],
};
/** Shown for a plot whose crop is not assigned yet; its level is always unknown. */
const UNASSIGNED_CROP: Crop = {
  id: '',
  nameKey: 'crops.unassigned',
  scientificName: '',
  salinityThresholdDsM: Number.NaN,
  yieldLossPercentPerDsM: null,
  measurementBasis: 'ECe',
  reference: MAAS_HOFFMAN,
};

/**
 * Monitoring data of the signed-in user, read from the OsoSense API: the farmer's own
 * farms, or the farms of every farmer linked to the advisor. The API decides what each
 * user may see; this service keeps it in signals for the views.
 */
@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private readonly auth = inject(AuthService);
  private readonly farmApi = inject(FarmManagementApi);
  private readonly soilApi = inject(SoilMonitoringApi);
  private readonly alertApi = inject(SalinityAlertingApi);
  private readonly snapshot = signal<Snapshot>(EMPTY);
  private readonly cropCatalog = signal<Crop[]>([]);
  /** Devices registered by activation code whose attachment to a plot is still pending. */
  private readonly registeredDevices = new Map<string, number>();
  private generation = 0;
  readonly loading = signal(false);
  /** True when the last refresh could not reach the API or it failed (5xx). */
  readonly loadFailed = signal(false);
  readonly crops = this.cropCatalog.asReadonly();
  readonly plots = computed(() => this.snapshot().plots);
  readonly farms = computed(() => this.snapshot().farms);
  readonly devices = computed(() => this.snapshot().devices);
  /** Plots whose readings, sensors or alerts failed to load while the others did. */
  readonly failedPlots = computed(() =>
    this.plots().filter((plot) => this.snapshot().failedPlotIds.includes(plot.id)),
  );
  readonly alerts = computed(() => this.snapshot().alerts);
  readonly activeAlerts = computed(() =>
    this.alerts().filter((alert) => alert.status !== 'RESOLVED'),
  );
  /**
   * Client roster of the signed-in advisor: every farmer linked to them, plus any other owner
   * of the plots they supervise. A farmer who has just accepted shows up before registering
   * a plot.
   */
  readonly clients = computed<AdvisorClient[]>(() =>
    this.auth.isAdvisor()
      ? [
          ...new Set([
            ...this.auth.linked().map((farmer) => farmer.id),
            ...this.plots().map((plot) => plot.ownerId),
          ]),
        ]
          .map((ownerId) => {
            const plots = this.plots().filter((plot) => plot.ownerId === ownerId);
            return {
              id: ownerId,
              user: this.auth.findUser(ownerId),
              plots,
              farms: this.farms().filter((farm) => plots.some((plot) => plot.farmId === farm.id)),
              areaHectares: plots.reduce((sum, plot) => sum + plot.areaHectares, 0),
              openAlerts: this.activeAlerts().filter((alert) =>
                plots.some((plot) => plot.id === alert.plotId),
              ).length,
            };
          })
          .sort((a, b) => b.openAlerts - a.openAlerts || a.id.localeCompare(b.id))
      : [],
  );
  /** Plots in the High or Very high level: the ones the home headline counts. */
  readonly attentionPlots = computed(() =>
    this.plots().filter((plot) => ['high', 'critical'].includes(this.level(plot))),
  );
  /** Plots in the Watch level, named apart from the ones that need attention. */
  readonly watchPlots = computed(() => this.plots().filter((plot) => this.level(plot) === 'watch'));
  readonly search = signal('');
  readonly filteredPlots = computed(() =>
    this.plots().filter((plot) =>
      plot.name.toLowerCase().includes(this.search().trim().toLowerCase()),
    ),
  );

  constructor() {
    this.auth.onSessionChange((user) => (user ? this.refresh() : this.clear()));
    if (this.auth.user()) void this.refresh();
  }

  /** Reloads everything the signed-in user can see. */
  async refresh(): Promise<void> {
    const generation = ++this.generation;
    const user = this.auth.user();
    if (!user) return this.clear();
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      const snapshot = await this.fetch(user);
      if (generation === this.generation) this.snapshot.set(snapshot);
    } catch (error) {
      // An expired session is handled by the session expiry interceptor.
      if ((error as { status?: number }).status === 401) return;
      if (generation === this.generation) this.loadFailed.set(true);
      console.error('Could not load monitoring data', error);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  owner(plot: Plot): User | undefined {
    return this.auth.findUser(plot.ownerId);
  }
  crop(plot: Plot): Crop {
    return this.crops().find((crop) => crop.id === plot.cropId) ?? UNASSIGNED_CROP;
  }
  farm(plot: Plot) {
    return this.farms().find((farm) => farm.id === plot.farmId);
  }
  readings(plotId: string): SoilReading[] {
    return this.snapshot().readings.get(plotId) ?? [];
  }
  latest(plotId: string): SoilReading | undefined {
    return this.readings(plotId).at(-1);
  }
  device(plotId: string) {
    return this.devices().find((device) => device.plotId === plotId);
  }
  /** Mirrors the Backend's alert grading: above the threshold, < 1.2 watch, < 1.5 high. */
  salinityLevel(crop: Crop, reading?: SoilReading): SalinityLevel {
    const ratio = this.ratio(crop, reading);
    if (ratio < 0) return 'unknown';
    return ratio >= 1.5 ? 'critical' : ratio >= 1.2 ? 'high' : ratio > 1 ? 'watch' : 'normal';
  }
  /** Pump-wash contingency of a plot, when its sensor has washed the soil. */
  contingency(plot: Plot): Contingency | null {
    return contingencyOf(
      this.alerts().filter((alert) => alert.plotId === plot.id),
      this.level(plot),
    );
  }
  level(plot: Plot): SalinityLevel {
    return this.salinityLevel(this.crop(plot), this.latest(plot.id));
  }
  risk(plot: Plot): number {
    return this.ratio(this.crop(plot), this.latest(plot.id));
  }

  async saveFarm(value: Omit<Farm, 'id' | 'ownerId'>, id?: string): Promise<boolean> {
    const user = this.auth.user();
    const body = {
      name: value.name.trim(),
      department: value.department.trim(),
      province: value.province.trim(),
      district: value.district.trim(),
    };
    if (user?.role !== 'Farmer' || Object.values(body).some((field) => !field)) return false;
    if (id && !this.farms().some((farm) => farm.id === id && farm.ownerId === user.id))
      return false;
    const saved = await this.attempt(
      id ? this.farmApi.updateFarm(fromId(id), body) : this.farmApi.registerFarm(body),
    );
    if (!saved) return false;
    const farm = toFarm(saved);
    this.patch((state) => ({
      ...state,
      farms: id
        ? state.farms.map((item) => (item.id === id ? farm : item))
        : [...state.farms, farm],
    }));
    return true;
  }

  async savePlot(
    value: Pick<Plot, 'name' | 'farmId' | 'latitude' | 'longitude' | 'areaHectares' | 'cropId'>,
    id?: string,
  ): Promise<string | null> {
    const user = this.auth.user();
    const existing = id ? this.plots().find((plot) => plot.id === id) : undefined;
    if (
      user?.role !== 'Farmer' ||
      (id && !existing) ||
      !value.name.trim() ||
      !this.farms().some((farm) => farm.id === value.farmId && farm.ownerId === user.id) ||
      (existing && existing.farmId !== value.farmId) ||
      !this.crops().some((crop) => crop.id === value.cropId) ||
      !Number.isFinite(value.latitude) ||
      Math.abs(value.latitude) > 90 ||
      !Number.isFinite(value.longitude) ||
      Math.abs(value.longitude) > 180 ||
      // 0, 0 is in the ocean: the coordinates were left empty, not measured.
      (value.latitude === 0 && value.longitude === 0) ||
      !Number.isFinite(value.areaHectares) ||
      value.areaHectares <= 0
    )
      return null;
    const details = {
      name: value.name.trim(),
      areaHectares: value.areaHectares,
      latitude: value.latitude,
      longitude: value.longitude,
    };
    let saved = await this.attempt(
      id
        ? this.farmApi.updatePlot(fromId(id), details)
        : this.farmApi.registerPlot({ farmId: fromId(value.farmId), ...details }),
    );
    if (saved && existing?.cropId !== value.cropId)
      saved = await this.attempt(this.farmApi.assignCrop(saved.id, fromId(value.cropId)));
    if (!saved) return null;
    const plot = toPlot(saved, user.id, existing?.advisorIds ?? this.auth.advisorIds());
    plot.deviceId = existing?.deviceId;
    this.patch((state) => ({
      ...state,
      plots: id
        ? state.plots.map((item) => (item.id === id ? plot : item))
        : [...state.plots, plot],
    }));
    return plot.id;
  }

  /** Acknowledges an open alert; false when the API did not accept it, so the alert stays open. */
  async acknowledge(id: string): Promise<boolean> {
    const alert = this.alerts().find((item) => item.id === id);
    if (alert?.status !== 'OPEN') return false;
    const saved = await this.attempt(this.alertApi.acknowledge(fromId(id)));
    if (!saved) return false;
    this.replaceAlert(toAlert(saved, []), alert.actions);
    return true;
  }

  /** Registers the action that resolves an alert, as the Backend's workflow does. */
  async recordAction(
    id: string,
    action: Omit<CorrectiveAction, 'id' | 'createdBy'>,
  ): Promise<boolean> {
    const alert = this.alerts().find((item) => item.id === id);
    if (
      !this.auth.user() ||
      !alert ||
      alert.status === 'RESOLVED' ||
      !action.notes.trim() ||
      !CORRECTIVE_ACTION_TYPES.includes(action.type) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(action.performedAt) ||
      action.performedAt > this.today()
    )
      return false;
    const saved = await this.attempt(
      this.alertApi.registerCorrectiveAction(fromId(id), {
        actionType: action.type,
        executedAt: action.performedAt,
        notes: action.notes.trim(),
      }),
    );
    if (!saved) return false;
    const resolved = await this.attempt(this.alertApi.correctiveActionsOf(fromId(id)));
    const actions = resolved ?? [saved];
    this.patch((state) => ({
      ...state,
      alerts: state.alerts.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'RESOLVED',
              resolvedAt: actions.at(-1)?.registeredAt,
              actions: actions.map(toCorrectiveAction),
            }
          : item,
      ),
    }));
    return true;
  }

  /**
   * Registers a factory-provisioned sensor by its activation code and attaches it to an owned
   * plot without a device, then reloads the data so the plot shows it. A code registered by
   * an attempt whose attachment failed is reused, since the API rejects it a second time.
   */
  async activateDevice(plotId: string, activationCode: string): Promise<DeviceActivation> {
    const user = this.auth.user();
    const code = activationCode.trim();
    const plot = this.plots().find((item) => item.id === plotId);
    if (
      user?.role !== 'Farmer' ||
      !plot ||
      plot.ownerId !== user.id ||
      this.device(plotId) ||
      !code ||
      code.length > ACTIVATION_CODE_MAX_LENGTH
    )
      return 'failed';
    let codeInUse = false;
    let deviceId = this.registeredDevices.get(code);
    if (deviceId === undefined) {
      const registered = await this.attempt(
        this.farmApi.registerDevice(code),
        (status) => (codeInUse = status === 409),
      );
      if (!registered) return codeInUse ? 'codeInUse' : 'failed';
      deviceId = registered.id;
      this.registeredDevices.set(code, deviceId);
    }
    if (!(await this.attempt(this.farmApi.attachDevice(deviceId, fromId(plotId))))) return 'failed';
    this.registeredDevices.delete(code);
    // Only this plot changed: reload it instead of every plot of the user.
    if (!(await this.reloadPlot(plot, user))) await this.refresh();
    return 'activated';
  }

  /** Stores a laboratory comparison for a device; stored measurements are never rewritten. */
  async calibrate(
    deviceId: string,
    sensorDsM: number,
    laboratoryEceDsM: number,
    laboratory: string,
  ): Promise<boolean> {
    if (
      !this.auth.isAdvisor() ||
      !this.devices().some((device) => device.id === deviceId) ||
      !Number.isFinite(sensorDsM) ||
      !Number.isFinite(laboratoryEceDsM) ||
      sensorDsM <= 0 ||
      laboratoryEceDsM < 0 ||
      !laboratory.trim()
    )
      return false;
    const saved = await this.attempt(
      this.soilApi.registerCalibration({
        deviceId: fromId(deviceId),
        labConductivityDsM: laboratoryEceDsM,
        samplingDate: this.today(),
        laboratoryName: laboratory.trim(),
        deviceReadingAtSampling: sensorDsM,
      }),
    );
    if (!saved) return false;
    this.patch((state) => ({
      ...state,
      devices: state.devices.map((device) =>
        device.id === deviceId ? { ...device, calibration: toCalibration(saved) } : device,
      ),
    }));
    return true;
  }

  private async fetch(user: User): Promise<Snapshot> {
    // The crop catalog does not depend on the farms, so both are requested at the same time.
    const [farmResources] = await Promise.all([
      this.loadFarms(user),
      this.crops().length ? Promise.resolve() : this.loadCrops(),
    ]);
    const plotResources = (
      await Promise.all(farmResources.map((farm) => firstValueFrom(this.farmApi.plotsOf(farm.id))))
    ).flat();
    const perPlot = await mapLimit(plotResources, PLOT_LOAD_CONCURRENCY, (plot) =>
      this.loadPlot(plot, user),
    );
    const devices = perPlot.flatMap((entry) => entry.devices);
    const calibrations = perPlot.flatMap((entry) => entry.calibrations);
    const alertResources = perPlot.flatMap((entry) => entry.alerts);
    const actions = perPlot.flatMap((entry) => entry.actions);
    const advisorIds = user.role === 'Advisor' ? [user.id] : this.auth.advisorIds();
    return {
      farms: farmResources.map(toFarm),
      plots: perPlot.map(({ plot, devices }) =>
        toPlot(plot, String(this.farmOf(plot, farmResources).ownerId), advisorIds, devices[0]),
      ),
      devices: devices.map((device, index) =>
        toDevice(device, this.latestCalibration(calibrations[index])),
      ),
      alerts: alertResources.map((alert, index) => toAlert(alert, actions[index])),
      readings: new Map(
        perPlot.map(({ plot, readings }) => [String(plot.id), this.chronological(readings)]),
      ),
      failedPlotIds: perPlot.filter((entry) => entry.failed).map((entry) => String(entry.plot.id)),
    };
  }

  private async loadCrops(): Promise<void> {
    this.cropCatalog.set((await firstValueFrom(this.farmApi.crops())).map(toCrop));
  }

  private async loadFarms(user: User): Promise<FarmResource[]> {
    return user.role === 'Advisor'
      ? (
          await Promise.all(
            this.auth
              .linked()
              .map((farmer) => firstValueFrom(this.farmApi.farmsOf(fromId(farmer.id)))),
          )
        ).flat()
      : firstValueFrom(this.farmApi.myFarms());
  }

  /**
   * Loads what one plot needs. The three branches (sensors with their calibrations, readings,
   * alerts with their actions) do not wait for each other. Calibrations are only read by the
   * advisor's screens, so a farmer's sign-in does not request them. A failure of this plot
   * (network error or 5xx) leaves it with empty data and flags it, so the other plots still
   * load; an expired session (401) and unexpected errors are not swallowed here.
   */
  private async loadPlot(plot: PlotResource, user: User) {
    try {
      const [{ devices, calibrations }, readings, { alerts, actions }] = await Promise.all([
        firstValueFrom(
          this.farmApi
            .devicesOf(plot.id)
            .pipe(
              switchMap((devices) =>
                (user.role === 'Advisor' && devices.length
                  ? forkJoin(devices.map((device) => this.soilApi.calibrationsOf(device.id)))
                  : of(devices.map(() => [] as CalibrationRecordResource[]))
                ).pipe(map((calibrations) => ({ devices, calibrations }))),
              ),
            ),
        ),
        firstValueFrom(this.soilApi.readingsOf(plot.id)),
        firstValueFrom(
          this.alertApi.alertsOf(plot.id).pipe(
            switchMap((alerts) =>
              // Open alerts can also carry actions, e.g. those the device registered on its own.
              (alerts.length
                ? forkJoin(alerts.map((alert) => this.alertApi.correctiveActionsOf(alert.id)))
                : of([] as CorrectiveActionResource[][])
              ).pipe(map((actions) => ({ alerts, actions }))),
            ),
          ),
        ),
      ]);
      return { plot, devices, readings, alerts, calibrations, actions, failed: false };
    } catch (error) {
      if (!(error instanceof HttpErrorResponse) || error.status === 401) throw error;
      console.error(`Could not load plot ${plot.id}`, error);
      return {
        plot,
        devices: [] as DeviceResource[],
        readings: [] as SoilReadingResource[],
        alerts: [] as SalinityAlertResource[],
        calibrations: [] as CalibrationRecordResource[][],
        actions: [] as CorrectiveActionResource[][],
        failed: true,
      };
    }
  }

  /** Reloads one plot and patches it into the snapshot; false when it could not be loaded. */
  private async reloadPlot(plot: Plot, user: User): Promise<boolean> {
    const generation = this.generation;
    const resource = await this.attempt(this.farmApi.plot(fromId(plot.id)));
    if (!resource) return false;
    const entry = await this.loadPlot(resource, user);
    if (entry.failed) return false;
    // A sign-out or a full refresh while this plot loaded makes the result stale.
    if (generation !== this.generation) return true;
    this.patch((state) => {
      const keep = <T extends { plotId: string }>(items: T[]) =>
        items.filter((item) => item.plotId !== plot.id);
      return {
        ...state,
        plots: state.plots.map((item) =>
          item.id === plot.id
            ? toPlot(resource, item.ownerId, item.advisorIds, entry.devices[0])
            : item,
        ),
        devices: [
          ...keep(state.devices),
          ...entry.devices.map((device, index) =>
            toDevice(device, this.latestCalibration(entry.calibrations[index])),
          ),
        ],
        alerts: [
          ...keep(state.alerts),
          ...entry.alerts.map((alert, index) => toAlert(alert, entry.actions[index])),
        ],
        readings: new Map(state.readings).set(plot.id, this.chronological(entry.readings)),
        failedPlotIds: state.failedPlotIds.filter((id) => id !== plot.id),
      };
    });
    return true;
  }

  private clear(): void {
    this.generation++;
    this.snapshot.set(EMPTY);
    this.registeredDevices.clear();
    this.loading.set(false);
    this.loadFailed.set(false);
  }

  private patch(update: (state: Snapshot) => Snapshot): void {
    this.snapshot.update(update);
  }

  private replaceAlert(alert: SalinityAlert, actions: CorrectiveAction[]): void {
    this.patch((state) => ({
      ...state,
      alerts: state.alerts.map((item) => (item.id === alert.id ? { ...alert, actions } : item)),
    }));
  }

  /**
   * Runs a command; a rejection by the API (4xx) or an unreachable or failing API (network
   * error, 5xx) is reported as a failed save, so the view shows its error instead of hanging.
   */
  private async attempt<T>(
    request: Observable<T>,
    onFailure?: (status: number) => void,
  ): Promise<T | null> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      if (error.status === 0 || error.status >= 500)
        console.error('OsoSense API call failed', error);
      onFailure?.(error.status);
      return null;
    }
  }

  private ratio(crop: Crop, reading?: SoilReading): number {
    return reading?.quality === 'VALID' &&
      reading.measurementBasis === 'ECe' &&
      Number.isFinite(crop.salinityThresholdDsM)
      ? reading.conductivityDsM / crop.salinityThresholdDsM
      : -1;
  }

  private farmOf(plot: PlotResource, farms: FarmResource[]): FarmResource {
    return farms.find((farm) => farm.id === plot.farmId)!;
  }

  private latestCalibration(records: CalibrationRecordResource[]) {
    return [...records].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt)).at(-1);
  }

  private chronological(readings: SoilReadingResource[]): SoilReading[] {
    return readings.map(toReading).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  }

  private today(): string {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  }
}
