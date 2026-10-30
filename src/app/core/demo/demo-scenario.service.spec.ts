import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideFakeApiForTests } from '../api/testing';
import { AuthService } from '../auth/auth.service';
import { AdvisoryLinkService } from '../data/advisory-link.service';
import { MonitoringService } from '../data/monitoring.service';
import { DEMO_MODE_KEY, DEMO_SCENARIO_KEY, resolveDemoMode } from './demo-mode.service';
import { DemoScenarioService } from './demo-scenario.service';
import {
  buildDemoScenario,
  DEMO_PENDING_SENSOR,
  DEMO_READING_DAYS,
  DEMO_SCENARIO_IDS,
  DEMO_SENSOR_CODE,
  DEMO_UNINVITED_FARMER,
} from './demo-scenarios';

@Component({ template: '' })
class Blank {}

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe('resolveDemoMode', () => {
  it('stays off without the URL parameter or the environment flag', () => {
    expect(resolveDemoMode(false, '', memoryStorage())).toBe(false);
    expect(resolveDemoMode(false, '?lang=es', memoryStorage())).toBe(false);
  });
  it('turns on with ?demo=1 and remembers it until ?demo=0', () => {
    const storage = memoryStorage();
    expect(resolveDemoMode(false, '?demo=1', storage)).toBe(true);
    expect(resolveDemoMode(false, '', storage)).toBe(true);
    storage.setItem(DEMO_SCENARIO_KEY, '3');
    storage.setItem('osoterra.session', 'fake-jwt.1.x');
    expect(resolveDemoMode(false, '?demo=0', storage)).toBe(false);
    expect([...storage.values.keys()]).toEqual([]);
    expect(resolveDemoMode(false, '', storage)).toBe(false);
  });
  it('leaves the real session alone on ?demo=0 when the demo was never on', () => {
    const storage = memoryStorage({ 'osoterra.session': 'real-token' });
    expect(resolveDemoMode(false, '?demo=0', storage)).toBe(false);
    expect(storage.getItem('osoterra.session')).toBe('real-token');
  });
  it('turns on for the whole build with the environment flag', () => {
    expect(resolveDemoMode(true, '', null)).toBe(true);
  });
});

describe('buildDemoScenario', () => {
  const grade = (ratio: number) =>
    ratio >= 1.5 ? 'critical' : ratio >= 1.2 ? 'high' : ratio > 1 ? 'watch' : 'normal';
  const levels = (id: (typeof DEMO_SCENARIO_IDS)[number]) => {
    const db = buildDemoScenario(id);
    return Object.fromEntries(
      db.plots.map((plot) => {
        const latest = db.readings.filter((reading) => reading.plotId === plot.id).at(-1)!;
        const threshold = db.crops.find((crop) => crop.id === plot.cropId)!.salinityThresholdDsM;
        return [plot.name, grade(latest.compensatedConductivityDsM / threshold)];
      }),
    );
  };

  it('keeps the same account ids in every scenario, so a reload restores the session', () => {
    const ids = DEMO_SCENARIO_IDS.map((id) =>
      buildDemoScenario(id).accounts.map((account) => `${account.id}:${account.email}`),
    );
    for (const accounts of ids) expect(accounts).toEqual(ids[0]);
  });
  it('grades every plot with the cut-offs of the code on the grape threshold', () => {
    expect(levels(1)).toEqual({});
    expect(levels(2)).toEqual({ 'Sector Norte': 'normal', 'Sector Sur': 'normal' });
    expect(levels(3)).toEqual({
      'Sector Norte': 'critical',
      'Sector Sur': 'normal',
      'Sector Este': 'watch',
    });
    expect(levels(4)).toEqual(levels(3));
    expect(levels(5)).toEqual({ 'Sector Norte': 'watch', 'Sector Alto': 'normal' });
    expect(levels(6)).toEqual({
      'Sector Norte': 'watch',
      'Sector Alto': 'normal',
      'Sector Sur': 'critical',
      'Sector Bajo': 'high',
    });
  });
  it('gives each monitored plot 30 days of readings and the scenario value last', () => {
    const db = buildDemoScenario(3);
    const north = db.plots.find((plot) => plot.name === 'Sector Norte')!;
    const readings = db.readings.filter((reading) => reading.plotId === north.id);
    expect(readings).toHaveLength(DEMO_READING_DAYS);
    expect(readings.at(-1)!.compensatedConductivityDsM).toBe(2.3);
    const first = Date.parse(readings[0].capturedAt);
    expect((Date.parse(readings.at(-1)!.capturedAt) - first) / 86_400_000).toBeCloseTo(29, 0);
  });
});

describe('DemoScenarioService', () => {
  let auth: AuthService;
  let data: MonitoringService;
  let links: AdvisoryLinkService;
  let scenarios: DemoScenarioService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideFakeApiForTests(),
        provideRouter([
          { path: 'auth/login', component: Blank },
          { path: 'app/home', component: Blank },
        ]),
      ],
    });
    // provideFakeApiForTests clears the storage first; then the tab is in demo mode.
    sessionStorage.setItem(DEMO_MODE_KEY, '1');
    auth = TestBed.inject(AuthService);
    data = TestBed.inject(MonitoringService);
    links = TestBed.inject(AdvisoryLinkService);
    scenarios = TestBed.inject(DemoScenarioService);
  });
  afterEach(() => sessionStorage.clear());
  const open = () => data.alerts().filter((alert) => alert.status === 'OPEN');
  const plot = (name: string) => data.plots().find((item) => item.name === name)!;

  it('loads scenario 1: a farmer with a farm, no plots, and links a new grape plot', async () => {
    expect(await scenarios.load(1)).toBe(true);
    expect(auth.user()?.role).toBe('Farmer');
    expect(TestBed.inject(Router).url).toBe('/app/home');
    expect(data.plots()).toHaveLength(0);
    expect(data.farms()).toHaveLength(1);
    const grape = data.crops().find((crop) => crop.nameKey === 'crops.tableGrape')!;
    const id = await data.savePlot({
      name: 'Sector Norte',
      farmId: data.farms()[0].id,
      latitude: -5.09,
      longitude: -80.16,
      areaHectares: 2,
      cropId: grape.id,
    });
    expect(id).toBeTruthy();
    expect(await data.activateDevice(id!, DEMO_SENSOR_CODE)).toBe('activated');
    expect(data.device(id!)?.serialNumber).toBe(DEMO_SENSOR_CODE);
  });
  it('loads scenario 3 with one unattended critical alert and starts over on reload', async () => {
    await scenarios.load(3);
    expect(data.plots()).toHaveLength(3);
    expect(open().map((alert) => alert.severity)).toEqual(['CRITICAL']);
    expect(data.level(plot('Sector Norte'))).toBe('critical');
    expect(data.latest(plot('Sector Norte').id)?.conductivityDsM).toBe(2.3);
    await data.acknowledge(open()[0].id);
    expect(open()).toHaveLength(0);
    await scenarios.load(3);
    expect(open()).toHaveLength(1);
  });
  it('loads scenario 4 with a pending advisor request the farmer can accept', async () => {
    await scenarios.load(4);
    expect(links.pending()).toHaveLength(1);
    expect(links.pending()[0].advisorName).toBe('Jorge Sernaqué');
    expect(await links.accept(links.pending()[0].id)).toBe(true);
    expect(links.accepted()).toHaveLength(1);
  });
  it('loads scenario 5 as an advisor with two clients and a farmer to invite', async () => {
    await scenarios.load(5);
    expect(auth.user()?.role).toBe('Advisor');
    expect(data.clients()).toHaveLength(2);
    expect(data.plots()).toHaveLength(2);
    expect(data.readings(plot('Sector Norte').id)).toHaveLength(DEMO_READING_DAYS);
    expect(open()).toHaveLength(0);
    expect(await links.invite(DEMO_UNINVITED_FARMER)).toBe('sent');
  });
  it('loads scenario 6 with high and critical alerts and a sensor to calibrate', async () => {
    await scenarios.load(6);
    expect(
      open()
        .map((alert) => alert.severity)
        .sort(),
    ).toEqual(['CRITICAL', 'WARNING']);
    const pending = data.devices().filter((device) => !device.calibration);
    expect(pending.map((device) => device.serialNumber)).toEqual([DEMO_PENDING_SENSOR]);
    expect(await data.calibrate(pending[0].id, 2.32, 2.1, 'Laboratorio de Suelos UNP')).toBe(true);
    expect(data.devices().every((device) => device.calibration)).toBe(true);
    const critical = open().find((alert) => alert.severity === 'CRITICAL')!;
    await data.acknowledge(critical.id);
    expect(open().map((alert) => alert.severity)).toEqual(['WARNING']);
  });
  it('switches between farmer and advisor scenarios without mixing their data', async () => {
    await scenarios.load(6);
    await scenarios.load(2);
    expect(auth.user()?.role).toBe('Farmer');
    expect(data.plots().map((item) => item.name)).toEqual(['Sector Norte', 'Sector Sur']);
    expect(data.alerts()).toHaveLength(0);
    expect(sessionStorage.getItem(DEMO_SCENARIO_KEY)).toBe('2');
  });
});
