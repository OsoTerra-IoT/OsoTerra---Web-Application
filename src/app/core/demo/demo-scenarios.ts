import { ApiRole, FarmResource, PlotResource } from '../api/api.types';
import {
  DEMO_PASSWORD,
  FakeAccount,
  FakeDatabase,
  localDate,
  localDateTime,
  severityFor,
} from '../api/fake/fake-database';

/** Numbers of the scenarios of the usability interview script. */
export type DemoScenarioId = 1 | 2 | 3 | 4 | 5 | 6;
export const DEMO_SCENARIO_IDS: readonly DemoScenarioId[] = [1, 2, 3, 4, 5, 6];

export interface DemoScenario {
  id: DemoScenarioId;
  /** Role the scenario signs in with. */
  role: 'Farmer' | 'Advisor';
  /** Account the scenario signs in with (password {@link DEMO_PASSWORD}). */
  email: string;
  /** Translation key of the scenario name, under `demo.scenarios`. */
  key: string;
  /** Data the moderator gives the participant: a sensor code or a farmer's email. */
  hint?: { key: string; value: string };
}

/** Sensor code the participant links in scenario 1; it is not registered yet. */
export const DEMO_SENSOR_CODE = 'OS-014';
const FARMER = 'rosa.chunga@osoterra.demo';
const FARMER_2 = 'luis.farfan@osoterra.demo';
const ADVISOR = 'jorge.sernaque@osoterra.demo';
/** Farmer the advisor has not invited yet (scenarios 5 and 6). */
export const DEMO_UNINVITED_FARMER = 'ana.ramirez@osoterra.demo';
/** Sensor without a laboratory calibration in scenario 6. */
export const DEMO_PENDING_SENSOR = 'OS-022';

export const DEMO_SCENARIOS: readonly DemoScenario[] = [
  {
    id: 1,
    role: 'Farmer',
    email: FARMER,
    key: 'noPlots',
    hint: { key: 'sensorCode', value: DEMO_SENSOR_CODE },
  },
  { id: 2, role: 'Farmer', email: FARMER, key: 'allNormal' },
  { id: 3, role: 'Farmer', email: FARMER, key: 'criticalAlert' },
  { id: 4, role: 'Farmer', email: FARMER, key: 'advisorRequest' },
  {
    id: 5,
    role: 'Advisor',
    email: ADVISOR,
    key: 'advisorClients',
    hint: { key: 'farmerEmail', value: DEMO_UNINVITED_FARMER },
  },
  {
    id: 6,
    role: 'Advisor',
    email: ADVISOR,
    key: 'advisorAlerts',
    hint: { key: 'pendingSensor', value: DEMO_PENDING_SENSOR },
  },
];

export function demoScenario(id: number): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id);
}

const DAY = 86_400_000;
/** Days of readings each monitored plot has. */
export const DEMO_READING_DAYS = 30;

interface PlotSeed {
  farm: FarmResource;
  name: string;
  areaHectares: number;
  latitude: number;
  longitude: number;
  device: string;
  /** Compensated ECe 30 days ago and today, in dS/m. */
  from: number;
  to: number;
  /** Alert status of the latest reading when it is above the threshold. */
  alert?: 'OPEN' | 'ACKNOWLEDGED';
  /** Laboratory ECe of a past calibration of the device, if any. */
  calibratedLab?: number;
}

/**
 * Builds the in-memory database of one interview scenario. Every scenario has the same ids
 * for the same accounts, so a reload restores the signed-in session on a fresh copy.
 */
export function buildDemoScenario(id: DemoScenarioId, now = new Date()): FakeDatabase {
  const db = new FakeDatabase().seedCatalog();
  const at = (offsetMs: number) => localDateTime(new Date(now.getTime() + offsetMs));
  const created = localDateTime(new Date(now.getTime() - 45 * DAY));
  const account = (
    email: string,
    firstName: string,
    lastName: string,
    role: ApiRole,
    province: string,
    department = 'Piura',
    license: string | null = null,
  ): FakeAccount => {
    const record: FakeAccount = {
      id: db.nextId('accounts'),
      email,
      firstName,
      lastName,
      role,
      professionalLicenseNumber: license,
      active: true,
      createdAt: created,
      department,
      province,
      password: DEMO_PASSWORD,
    };
    db.accounts.push(record);
    return record;
  };
  // Same accounts and ids in every scenario.
  const rosa = account(FARMER, 'Rosa', 'Chunga', 'FARMER', 'Morropón');
  const luis = account(FARMER_2, 'Luis', 'Farfán', 'FARMER', 'Lambayeque', 'Lambayeque');
  const jorge = account(ADVISOR, 'Jorge', 'Sernaqué', 'ADVISOR', 'Piura', 'Piura', '214578');
  account(DEMO_UNINVITED_FARMER, 'Ana', 'Ramírez', 'FARMER', 'Sullana');

  const subscribe = (owner: FakeAccount, planId: number, consumed: number) => {
    const plan = db.plans.find((candidate) => candidate.id === planId)!;
    db.subscriptions.push({
      id: db.nextId('subscriptions'),
      userAccountId: owner.id,
      subscriptionPlanId: plan.id,
      status: 'ACTIVE',
      quotaTotal: plan.maxPlots,
      quotaConsumed: consumed,
      periodStartDate: localDate(new Date(now.getTime() - 15 * DAY)),
      periodEndDate: plan.free ? null : localDate(new Date(now.getTime() + 15 * DAY)),
      createdAt: created,
    });
  };
  const link = (farmer: FakeAccount, status: 'PENDING' | 'ACCEPTED', daysAgo: number) =>
    db.advisoryLinks.push({
      id: db.nextId('advisoryLinks'),
      advisorId: jorge.id,
      farmerId: farmer.id,
      status,
      requestedAt: at(-daysAgo * DAY),
      respondedAt: status === 'ACCEPTED' ? at(-daysAgo * DAY + 3_600_000) : null,
    });
  const farm = (owner: FakeAccount, name: string, province: string, district: string) => {
    const record: FarmResource = {
      id: db.nextId('farms'),
      ownerId: owner.id,
      name,
      department: owner.department ?? 'Piura',
      province,
      district,
      createdAt: created,
    };
    db.farms.push(record);
    return record;
  };
  const grape = db.crops.find((crop) => crop.commonName === 'Uva')!;
  // Whoever answered the alerts already acknowledged: the farmer alone, or the advisor.
  const acknowledger = id <= 4 ? rosa.id : jorge.id;
  const plot = (seed: PlotSeed) => addMonitoredPlot(db, seed, grape.id, now, created, acknowledger);

  const santaRosa = farm(rosa, 'Fundo Santa Rosa', 'Morropón', 'Chulucanas');
  if (id === 1) {
    // A new account: the farm is registered, no plot or sensor yet.
    subscribe(rosa, 1, 0);
    return db;
  }
  const chulucanas = { farm: santaRosa, latitude: -5.093, longitude: -80.163 };
  if (id <= 4) {
    subscribe(rosa, 2, id === 2 ? 2 : 3);
    if (id === 2) {
      plot({
        ...chulucanas,
        name: 'Sector Norte',
        areaHectares: 3.2,
        device: 'OS-021',
        from: 1.12,
        to: 1.18,
      });
      plot({
        ...chulucanas,
        name: 'Sector Sur',
        areaHectares: 2.6,
        latitude: -5.101,
        device: 'OS-022',
        from: 0.94,
        to: 0.98,
      });
      return db;
    }
    plot({
      ...chulucanas,
      name: 'Sector Norte',
      areaHectares: 3.2,
      device: 'OS-021',
      from: 1.4,
      to: 2.3,
      alert: 'OPEN',
    });
    plot({
      ...chulucanas,
      name: 'Sector Sur',
      areaHectares: 2.6,
      latitude: -5.101,
      device: 'OS-022',
      from: 0.94,
      to: 0.98,
    });
    plot({
      ...chulucanas,
      name: 'Sector Este',
      areaHectares: 1.8,
      longitude: -80.151,
      device: 'OS-023',
      from: 1.36,
      to: 1.65,
      alert: 'ACKNOWLEDGED',
    });
    if (id === 4) link(rosa, 'PENDING', 1);
    return db;
  }

  // Advisor scenarios: two clients on the north coast, one plot each worsening apart.
  subscribe(jorge, 3, 0);
  subscribe(rosa, 2, id === 5 ? 1 : 2);
  subscribe(luis, 2, id === 5 ? 1 : 2);
  link(rosa, 'ACCEPTED', 40);
  link(luis, 'ACCEPTED', 32);
  const elAlgarrobo = farm(luis, 'Fundo El Algarrobo', 'Lambayeque', 'Mórrope');
  const morrope = { farm: elAlgarrobo, latitude: -6.538, longitude: -80.012 };
  plot({
    ...chulucanas,
    name: 'Sector Norte',
    areaHectares: 3.2,
    device: 'OS-021',
    from: 1.1,
    to: 1.72,
    alert: 'ACKNOWLEDGED',
    calibratedLab: 1.35,
  });
  plot({
    ...morrope,
    name: 'Sector Alto',
    areaHectares: 4.5,
    device: 'OS-031',
    from: 1.08,
    to: 1.04,
    calibratedLab: 1.1,
  });
  if (id === 6) {
    plot({
      ...chulucanas,
      name: 'Sector Sur',
      areaHectares: 2.6,
      latitude: -5.101,
      device: 'OS-022',
      from: 1.6,
      to: 2.4,
      alert: 'OPEN',
    });
    plot({
      ...morrope,
      name: 'Sector Bajo',
      areaHectares: 3.8,
      latitude: -6.546,
      device: 'OS-032',
      from: 1.5,
      to: 1.95,
      alert: 'OPEN',
      calibratedLab: 1.62,
    });
  }
  return db;
}

/** A grape plot with its active sensor, 30 daily readings and the alert of the last one. */
function addMonitoredPlot(
  db: FakeDatabase,
  seed: PlotSeed,
  cropId: number,
  now: Date,
  created: string,
  acknowledgerId: number,
): void {
  const at = (offsetMs: number) => localDateTime(new Date(now.getTime() + offsetMs));
  const plot: PlotResource = {
    id: db.nextId('plots'),
    farmId: seed.farm.id,
    cropId,
    name: seed.name,
    areaHectares: seed.areaHectares,
    latitude: seed.latitude,
    longitude: seed.longitude,
    active: true,
    createdAt: created,
  };
  db.plots.push(plot);
  const device = {
    id: db.nextId('devices'),
    plotId: plot.id,
    activationCode: seed.device,
    status: 'ACTIVE' as const,
    calibrationFactor: 1,
    batteryLevel: 70 + ((plot.id * 7) % 25),
    firmwareVersion: '1.4.2',
    readingIntervalMinutes: 30,
    lastSeenAt: at(-300_000),
    createdAt: created,
  };
  db.devices.push(device);
  const batchId = db.nextId('batches');
  const last = DEMO_READING_DAYS - 1;
  for (let day = 0; day <= last; day++) {
    const progress = day / last;
    // Gentle daily wobble, none on the last reading so it shows the scenario's value.
    const wobble = day === last ? 0 : Math.sin(day * 1.3 + plot.id) * 0.03;
    const compensated = +(seed.from + (seed.to - seed.from) * progress + wobble).toFixed(2);
    const temperatureCelsius = +(26 + Math.sin(day / 3) * 2.5).toFixed(1);
    const factor = 1 / (1 + 0.02 * (temperatureCelsius - 25));
    const capturedAt = at(-(last - day) * DAY - 300_000);
    db.readings.push({
      id: db.nextId('readings'),
      deviceId: device.id,
      plotId: plot.id,
      readingBatchId: batchId,
      rawConductivityDsM: +(compensated / factor).toFixed(2),
      compensatedConductivityDsM: compensated,
      compensationFactor: +factor.toFixed(4),
      moisturePercentage: +(31 + Math.cos(day / 2) * 4).toFixed(1),
      temperatureCelsius,
      capturedAt,
      storedAt: capturedAt,
    });
  }
  if (seed.calibratedLab !== undefined) {
    const sampled = db.readings.at(-8)!;
    db.calibrations.push({
      id: db.nextId('calibrations'),
      deviceId: device.id,
      labConductivityDsM: seed.calibratedLab,
      samplingDate: sampled.capturedAt.slice(0, 10),
      laboratoryName: 'Laboratorio de Suelos UNP',
      deviceReadingAtSampling: sampled.compensatedConductivityDsM,
      resultingFactor: +(seed.calibratedLab / sampled.compensatedConductivityDsM).toFixed(4),
      registeredAt: sampled.capturedAt,
    });
  }
  const latest = db.readings.at(-1)!;
  const threshold = db.crops.find((crop) => crop.id === cropId)!.salinityThresholdDsM;
  const ratio = +(latest.compensatedConductivityDsM / threshold).toFixed(4);
  const severity = severityFor(ratio);
  if (!severity || !seed.alert) return;
  const acknowledged = seed.alert === 'ACKNOWLEDGED';
  db.alerts.push({
    id: db.nextId('alerts'),
    plotId: plot.id,
    soilReadingId: latest.id,
    observedConductivityDsM: latest.compensatedConductivityDsM,
    appliedThresholdDsM: threshold,
    excessRatio: ratio,
    severity,
    status: acknowledged ? 'ACKNOWLEDGED' : 'OPEN',
    acknowledgedBy: acknowledged ? acknowledgerId : null,
    acknowledgedAt: acknowledged ? at(-2 * DAY) : null,
    generatedAt: at(-(acknowledged ? 3 : 1) * 3_600_000),
  });
}
