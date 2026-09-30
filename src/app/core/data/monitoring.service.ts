import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, forkJoin, Observable, of } from 'rxjs';
import {
  CalibrationRecordResource,
  CorrectiveActionResource,
  FarmResource,
  PlotResource,
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
}
const EMPTY: Snapshot = { farms: [], plots: [], devices: [], alerts: [], readings: new Map() };
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
  private generation = 0;
  readonly loading = signal(false);
  readonly crops = this.cropCatalog.asReadonly();
  readonly plots = computed(() => this.snapshot().plots);
  readonly farms = computed(() => this.snapshot().farms);
  readonly devices = computed(() => this.snapshot().devices);
  readonly alerts = computed(() => this.snapshot().alerts);
  readonly activeAlerts = computed(() =>
    this.alerts().filter((alert) => alert.status !== 'RESOLVED'),
  );
  /** Client roster derived from the owners of the plots the signed-in advisor supervises. */
  readonly clients = computed<AdvisorClient[]>(() =>
    this.auth.isAdvisor()
      ? [...new Set(this.plots().map((plot) => plot.ownerId))]
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
    try {
      const snapshot = await this.fetch(user);
      if (generation === this.generation) this.snapshot.set(snapshot);
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

  async acknowledge(id: string): Promise<void> {
    const alert = this.alerts().find((item) => item.id === id);
    if (alert?.status !== 'OPEN') return;
    const saved = await this.attempt(this.alertApi.acknowledge(fromId(id)));
    if (saved) this.replaceAlert(toAlert(saved, []), alert.actions);
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
    if (!this.crops().length)
      this.cropCatalog.set((await firstValueFrom(this.farmApi.crops())).map(toCrop));
    const farmResources: FarmResource[] =
      user.role === 'Advisor'
        ? (
            await Promise.all(
              this.auth
                .linked()
                .map((farmer) => firstValueFrom(this.farmApi.farmsOf(fromId(farmer.id)))),
            )
          ).flat()
        : await firstValueFrom(this.farmApi.myFarms());
    const plotResources = (
      await Promise.all(farmResources.map((farm) => firstValueFrom(this.farmApi.plotsOf(farm.id))))
    ).flat();
    const perPlot = await Promise.all(
      plotResources.map((plot) =>
        firstValueFrom(
          forkJoin({
            plot: of(plot),
            devices: this.farmApi.devicesOf(plot.id),
            readings: this.soilApi.readingsOf(plot.id),
            alerts: this.alertApi.alertsOf(plot.id),
          }),
        ),
      ),
    );
    const devices = perPlot.flatMap((entry) => entry.devices);
    const calibrations = await Promise.all(
      devices.map((device) => firstValueFrom(this.soilApi.calibrationsOf(device.id))),
    );
    const alertResources = perPlot.flatMap((entry) => entry.alerts);
    const actions = await Promise.all(
      alertResources.map((alert) =>
        alert.status === 'RESOLVED'
          ? firstValueFrom(this.alertApi.correctiveActionsOf(alert.id))
          : Promise.resolve([] as CorrectiveActionResource[]),
      ),
    );
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
    };
  }

  private clear(): void {
    this.generation++;
    this.snapshot.set(EMPTY);
    this.loading.set(false);
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

  /** Runs a command; a rejection by the API (4xx) is reported as a failed save. */
  private async attempt<T>(request: Observable<T>): Promise<T | null> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 0;
      if (status >= 400 && status < 500) return null;
      throw error;
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
