import {
  AdvisoryLinkResource,
  ApiAlertSeverity,
  CalibrationRecordResource,
  CorrectiveActionResource,
  CropResource,
  DeviceResource,
  FarmResource,
  PlotResource,
  SalinityAlertResource,
  SoilReadingResource,
  SubscriptionPlanResource,
  SubscriptionResource,
  UserAccountResource,
} from '../api.types';

/** Password shared by the three demo accounts of the fake API. */
export const DEMO_PASSWORD = 'OsoTerra2026!';
export const DEMO_ACCOUNTS = {
  farmer: 'farmer@osoterra.demo',
  farmer2: 'farmer2@osoterra.demo',
  advisor: 'advisor@osoterra.demo',
} as const;

export interface FakeAccount extends UserAccountResource {
  password: string;
}
export interface FakeResetToken {
  token: string;
  email: string;
  expiresAt: number;
}

/**
 * Same severity rule as the Backend's `SalinityAlert`: the compensated reading divided by
 * the crop threshold gives the excess ratio; no alert at or below the threshold.
 */
export function severityFor(excessRatio: number): ApiAlertSeverity | null {
  if (excessRatio <= 1) return null;
  if (excessRatio < 1.2) return 'WATCH';
  return excessRatio < 1.5 ? 'WARNING' : 'CRITICAL';
}

/** Local date-time without offset, as Java's `LocalDateTime` serializes it. */
export function localDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}
export function localDate(date: Date): string {
  return localDateTime(date).slice(0, 10);
}

/** In-memory tables of the fake API. A page reload starts again from the seed. */
export class FakeDatabase {
  accounts: FakeAccount[] = [];
  advisoryLinks: AdvisoryLinkResource[] = [];
  resetTokens: FakeResetToken[] = [];
  plans: SubscriptionPlanResource[] = [];
  subscriptions: SubscriptionResource[] = [];
  crops: CropResource[] = [];
  farms: FarmResource[] = [];
  plots: PlotResource[] = [];
  devices: DeviceResource[] = [];
  readings: SoilReadingResource[] = [];
  calibrations: CalibrationRecordResource[] = [];
  alerts: SalinityAlertResource[] = [];
  correctiveActions: CorrectiveActionResource[] = [];
  private readonly sequences = new Map<string, number>();

  nextId(table: string): number {
    const next = (this.sequences.get(table) ?? 0) + 1;
    this.sequences.set(table, next);
    return next;
  }

  static seeded(now = new Date()): FakeDatabase {
    const db = new FakeDatabase();
    const at = (offsetMs: number) => localDateTime(new Date(now.getTime() + offsetMs));
    const created = '2026-09-01T07:00:00';
    const account = (
      email: string,
      firstName: string,
      lastName: string,
      role: 'FARMER' | 'ADVISOR',
      province: string,
      license: string | null = null,
    ): FakeAccount => ({
      id: db.nextId('accounts'),
      email,
      firstName,
      lastName,
      role,
      professionalLicenseNumber: license,
      active: true,
      createdAt: created,
      department: 'Lima',
      province,
      password: DEMO_PASSWORD,
    });
    const elena = account(DEMO_ACCOUNTS.farmer, 'Elena', 'Ramos', 'FARMER', 'Huaral');
    const carla = account(DEMO_ACCOUNTS.farmer2, 'Carla', 'Mendoza', 'FARMER', 'Huaura');
    const diego = account(DEMO_ACCOUNTS.advisor, 'Diego', 'Torres', 'ADVISOR', 'Huaral', '123456');
    db.accounts.push(elena, carla, diego);
    for (const farmer of [elena, carla])
      db.advisoryLinks.push({
        id: db.nextId('advisoryLinks'),
        advisorId: diego.id,
        farmerId: farmer.id,
        status: 'ACCEPTED',
        requestedAt: created,
        respondedAt: created,
      });

    // Same catalog and order as the Backend's SubscriptionPlanSeeder and CropCatalogSeeder.
    const plan = (
      name: string,
      priceAmount: number,
      billingCycle: SubscriptionPlanResource['billingCycle'],
      maxPlots: number,
    ): SubscriptionPlanResource => ({
      id: db.nextId('plans'),
      name,
      priceAmount,
      priceCurrency: 'PEN',
      billingCycle,
      maxPlots,
      free: priceAmount === 0,
      active: true,
    });
    db.plans.push(
      plan('Free', 0, 'NONE', 2),
      plan('Basic', 29.9, 'MONTHLY', 10),
      plan('Pro', 299.9, 'ANNUAL', 50),
    );
    const catalog: [string, number, string][] = [
      ['Cebada', 8.0, 'Tolerante'],
      ['Algodón', 7.7, 'Tolerante'],
      ['Remolacha azucarera', 7.0, 'Tolerante'],
      ['Trigo', 6.0, 'Moderadamente tolerante'],
      ['Espárrago', 5.0, 'Tolerante'],
      ['Arroz', 3.0, 'Moderadamente sensible'],
      ['Tomate', 2.5, 'Moderadamente sensible'],
      ['Maíz', 1.7, 'Sensible'],
      ['Papa', 1.7, 'Sensible'],
      ['Uva', 1.5, 'Sensible'],
      ['Arándano', 1.5, 'Sensible'],
      ['Cebolla', 1.2, 'Sensible'],
      ['Palta', 1.1, 'Sensible'],
      ['Fresa', 1.0, 'Sensible'],
    ];
    for (const [commonName, salinityThresholdDsM, saltToleranceClass] of catalog)
      db.crops.push({
        id: db.nextId('crops'),
        commonName,
        scientificName: null,
        salinityThresholdDsM,
        saltToleranceClass,
        sourceReference: null,
      });
    const crop = (name: string) => db.crops.find((candidate) => candidate.commonName === name)!;

    db.subscriptions.push(
      {
        id: db.nextId('subscriptions'),
        userAccountId: elena.id,
        subscriptionPlanId: 1,
        status: 'ACTIVE',
        quotaTotal: 2,
        quotaConsumed: 2,
        periodStartDate: '2026-09-01',
        periodEndDate: null,
        createdAt: created,
      },
      {
        id: db.nextId('subscriptions'),
        userAccountId: carla.id,
        subscriptionPlanId: 2,
        status: 'ACTIVE',
        quotaTotal: 10,
        quotaConsumed: 2,
        periodStartDate: '2026-09-01',
        periodEndDate: '2026-10-01',
        createdAt: created,
      },
    );

    const farm = (ownerId: number, name: string, province: string, district: string) => {
      const record: FarmResource = {
        id: db.nextId('farms'),
        ownerId,
        name,
        department: 'Lima',
        province,
        district,
        createdAt: created,
      };
      db.farms.push(record);
      return record;
    };
    const santaRosa = farm(elena.id, 'Santa Rosa', 'Huaral', 'Aucallama');
    const losOlivos = farm(carla.id, 'Los Olivos', 'Huaura', 'Huacho');
    const plotSeeds: [FarmResource, string, string, number, number, number][] = [
      [santaRosa, 'Sector Norte', 'Palta', -11.49, -77.21, 4.2],
      [santaRosa, 'La Quebrada', 'Uva', -11.5, -77.2, 2.8],
      [losOlivos, 'Campo Este', 'Arándano', -11.07, -77.59, 6.5],
      [losOlivos, 'El Mirador', 'Uva', -11.08, -77.58, 3.1],
    ];
    // Latest compensated EC per plot: critical, normal, watch and warning.
    const baseConductivity = [1.72, 0.9, 1.6, 1.88];
    plotSeeds.forEach(([owner, name, cropName, latitude, longitude, areaHectares], index) => {
      const plot: PlotResource = {
        id: db.nextId('plots'),
        farmId: owner.id,
        cropId: crop(cropName).id,
        name,
        areaHectares,
        latitude,
        longitude,
        active: true,
        createdAt: created,
      };
      db.plots.push(plot);
      const offline = index === 3;
      const device: DeviceResource = {
        id: db.nextId('devices'),
        plotId: plot.id,
        activationCode: `OT-240${index + 1}`,
        status: offline ? 'OFFLINE' : 'ACTIVE',
        calibrationFactor: 1,
        batteryLevel: [87, 64, 92, 18][index],
        firmwareVersion: '1.4.2',
        readingIntervalMinutes: 15,
        lastSeenAt: at(offline ? -7_200_000 : -300_000),
        createdAt: created,
      };
      db.devices.push(device);
      const batchId = db.nextId('batches');
      for (let day = 0; day < 14; day++) {
        const temperatureCelsius = +(23 + index + Math.sin(day) * 2).toFixed(1);
        const compensated = +(
          baseConductivity[index] +
          (day - 13) * 0.02 +
          Math.sin(day) * 0.04
        ).toFixed(2);
        const factor = 1 / (1 + 0.02 * (temperatureCelsius - 25));
        const capturedAt = at(-(13 - day) * 86_400_000 - 300_000);
        db.readings.push({
          id: db.nextId('readings'),
          deviceId: device.id,
          plotId: plot.id,
          readingBatchId: batchId,
          rawConductivityDsM: +(compensated / factor).toFixed(2),
          compensatedConductivityDsM: compensated,
          compensationFactor: +factor.toFixed(4),
          moisturePercentage: +(34 + index * 2 + Math.cos(day) * 4).toFixed(1),
          temperatureCelsius,
          capturedAt,
          storedAt: capturedAt,
        });
      }
      const latest = db.readings.at(-1)!;
      const threshold = crop(cropName).salinityThresholdDsM;
      const ratio = +(latest.compensatedConductivityDsM / threshold).toFixed(4);
      const severity = severityFor(ratio);
      if (!severity) return;
      const acknowledged = severity === 'WATCH';
      db.alerts.push({
        id: db.nextId('alerts'),
        plotId: plot.id,
        soilReadingId: latest.id,
        observedConductivityDsM: latest.compensatedConductivityDsM,
        appliedThresholdDsM: threshold,
        excessRatio: ratio,
        severity,
        status: acknowledged ? 'ACKNOWLEDGED' : 'OPEN',
        acknowledgedBy: acknowledged ? diego.id : null,
        acknowledgedAt: acknowledged ? at(-43_200_000) : null,
        generatedAt: at(-(index + 1) * 3_600_000),
      });
    });
    return db;
  }
}
