import { computed, inject, Injectable, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { CorrectiveAction, Crop, Device, Farm, Plot, SoilReading, User } from '../models';
import { ALERTS, CROPS, DEVICES, FARMS, PLOTS, READINGS } from './demo-data';
/** Demo severity bands. Documented in README as prototype values, not agronomic guidance. */
export type SalinityLevel = 'normal' | 'watch' | 'high' | 'critical' | 'unknown';
export interface AdvisorClient {
  id: string;
  user: User | undefined;
  plots: Plot[];
  farms: Farm[];
  areaHectares: number;
  openAlerts: number;
}

@Injectable({ providedIn: 'root' })
export class MonitoringService {
  private readonly auth = inject(AuthService);
  private readonly allPlots = signal<Plot[]>(structuredClone(PLOTS));
  private readonly allFarms = signal<Farm[]>(structuredClone(FARMS));
  private readonly allDevices = signal<Device[]>(structuredClone(DEVICES));
  private readonly allAlerts = signal(structuredClone(ALERTS));
  readonly crops = CROPS;
  readonly plots = computed(() => this.allPlots().filter((plot) => this.canAccess(plot)));
  readonly farms = computed(() =>
    this.allFarms().filter(
      (farm) =>
        farm.ownerId === this.auth.user()?.id ||
        this.plots().some((plot) => plot.farmId === farm.id),
    ),
  );
  readonly devices = computed(() =>
    this.allDevices().filter((device) => this.plots().some((plot) => plot.id === device.plotId)),
  );
  readonly alerts = computed(() =>
    this.allAlerts().filter((alert) => this.plots().some((plot) => plot.id === alert.plotId)),
  );
  readonly activeAlerts = computed(() =>
    this.alerts().filter((alert) => alert.status !== 'RESOLVED'),
  );
    /** Client roster derived from the owners of the plots assigned to the signed-in advisor. */
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
  owner(plot: Plot): User | undefined {
    return this.auth.findUser(plot.ownerId);
  }
  canAccess(plot: Plot): boolean {
    const user = this.auth.user();
    return (
      !!user &&
      (user.role === 'Farmer' ? plot.ownerId === user.id : plot.advisorIds.includes(user.id))
    );
  }
  crop(plot: Plot) {
    return this.crops.find((crop) => crop.id === plot.cropId)!;
  }
  farm(plot: Plot) {
    return this.farms().find((farm) => farm.id === plot.farmId);
  }
  readings(plotId: string): SoilReading[] {
    return this.plots().some((plot) => plot.id === plotId)
      ? READINGS.filter((reading) => reading.plotId === plotId)
      : [];
  }
  latest(plotId: string): SoilReading | undefined {
    return this.readings(plotId).at(-1);
  }
  device(plotId: string) {
    return this.devices().find((device) => device.plotId === plotId);
  }
  salinityLevel(crop: Crop, reading?: SoilReading): SalinityLevel {
    if (!reading || reading.quality !== 'VALID' || reading.measurementBasis !== 'ECe')
      return 'unknown';
    const ratio = reading.conductivityDsM / crop.salinityThresholdDsM;
    return ratio > 1.25 ? 'critical' : ratio > 1 ? 'high' : ratio >= 0.8 ? 'watch' : 'normal';
  }
  level(plot: Plot): SalinityLevel {
    return this.salinityLevel(this.crop(plot), this.latest(plot.id));
  }
  risk(plot: Plot): number {
    const reading = this.latest(plot.id);
    return reading?.quality === 'VALID' && reading.measurementBasis === 'ECe'
      ? reading.conductivityDsM / this.crop(plot).salinityThresholdDsM
      : -1;
  }
  saveFarm(value: Omit<Farm, 'id' | 'ownerId'>, id?: string): boolean {
    const user = this.auth.user();
    if (
      !user ||
      user.role !== 'Farmer' ||
      !value.name.trim() ||
      !value.department.trim() ||
      !value.province.trim()
    )
      return false;
    if (id && !this.farms().some((farm) => farm.id === id)) return false;
    const farm = { ...value, id: id ?? crypto.randomUUID(), ownerId: user.id };
    this.allFarms.update((farms) =>
      id ? farms.map((item) => (item.id === id ? farm : item)) : [...farms, farm],
    );
    return true;
  }
  savePlot(
    value: Pick<Plot, 'name' | 'farmId' | 'latitude' | 'longitude' | 'areaHectares' | 'cropId'>,
    id?: string,
  ): string | null {
    const user = this.auth.user();
    const existing = id ? this.plots().find((plot) => plot.id === id) : undefined;
    if (
      !user ||
      user.role !== 'Farmer' ||
      (id && !existing) ||
      !value.name.trim() ||
      !this.farms().some((farm) => farm.id === value.farmId && farm.ownerId === user.id) ||
      !this.crops.some((crop) => crop.id === value.cropId) ||
      !Number.isFinite(value.latitude) ||
      Math.abs(value.latitude) > 90 ||
      !Number.isFinite(value.longitude) ||
      Math.abs(value.longitude) > 180 ||
      !Number.isFinite(value.areaHectares) ||
      value.areaHectares <= 0
    )
      return null;
    const plot: Plot = {
      ...value,
      id: id ?? crypto.randomUUID(),
      ownerId: user.id,
      advisorIds: existing?.advisorIds ?? (user.advisorId ? [user.advisorId] : []),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      deviceId: existing?.deviceId,
    };
    this.allPlots.update((plots) =>
      id ? plots.map((item) => (item.id === id ? plot : item)) : [...plots, plot],
    );
    return plot.id;
  }
  acknowledge(id: string): void {
    if (!this.alerts().some((alert) => alert.id === id && alert.status === 'OPEN')) return;
    this.allAlerts.update((alerts) =>
      alerts.map((alert) =>
        alert.id === id
          ? { ...alert, status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString() }
          : alert,
      ),
    );
  }
  recordAction(
    id: string,
    action: Omit<CorrectiveAction, 'id' | 'createdBy'>,
    resolve: boolean,
  ): boolean {
    const user = this.auth.user();
    if (
      !user ||
      !this.alerts().some((alert) => alert.id === id && alert.status !== 'RESOLVED') ||
      !action.notes.trim() ||
      !['INSPECTION', 'IRRIGATION_REVIEW', 'DRAINAGE_REVIEW', 'LAB_SAMPLE'].includes(action.type) ||
      !Number.isFinite(Date.parse(action.performedAt)) ||
      Date.parse(action.performedAt) > Date.now()
    )
      return false;
    this.allAlerts.update((alerts) =>
      alerts.map((alert) =>
        alert.id === id
          ? {
              ...alert,
              actions: [
                ...alert.actions,
                { ...action, id: crypto.randomUUID(), createdBy: user.id },
              ],
              status: resolve ? 'RESOLVED' : 'ACKNOWLEDGED',
              acknowledgedAt: alert.acknowledgedAt ?? new Date().toISOString(),
              resolvedAt: resolve ? new Date().toISOString() : undefined,
            }
          : alert,
      ),
    );
    return true;
  }
  calibrate(deviceId: string, sensorDsM: number, laboratoryEceDsM: number, notes: string): boolean {
    const user = this.auth.user();
    if (
      user?.role !== 'Advisor' ||
      !this.devices().some((device) => device.id === deviceId) ||
      !Number.isFinite(sensorDsM) ||
      !Number.isFinite(laboratoryEceDsM) ||
      sensorDsM <= 0 ||
      laboratoryEceDsM < 0 ||
      !notes.trim()
    )
      return false;
    this.allDevices.update((devices) =>
      devices.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              calibration: {
                sensorDsM,
                laboratoryEceDsM,
                offsetDsM: laboratoryEceDsM - sensorDsM,
                calibratedAt: new Date().toISOString(),
                advisorId: user.id,
                notes,
              },
            }
          : device,
      ),
    );
    return true;
  }
}
