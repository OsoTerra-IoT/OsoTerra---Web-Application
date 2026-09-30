import { TestBed } from '@angular/core/testing';
import { provideFakeApiForTests } from '../api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../auth/auth.service';
import { MonitoringService } from './monitoring.service';

describe('MonitoringService over the OsoSense API', () => {
  let auth: AuthService;
  let data: MonitoringService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeApiForTests() });
    auth = TestBed.inject(AuthService);
    data = TestBed.inject(MonitoringService);
  });
  const login = (account: keyof typeof DEMO_ACCOUNTS) =>
    auth.login({ email: DEMO_ACCOUNTS[account], password: DEMO_PASSWORD });
  const today = () => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  };

  it('loads the session data at sign in and clears it at sign out', async () => {
    expect(data.plots()).toHaveLength(0);
    await login('farmer');
    expect(data.plots().map((plot) => plot.name)).toEqual(['Sector Norte', 'La Quebrada']);
    expect(data.readings('1')).toHaveLength(14);
    expect(data.device('1')?.serialNumber).toBe('OT-2401');
    auth.logout();
    expect(data.plots()).toHaveLength(0);
    expect(data.alerts()).toHaveLength(0);
    expect(data.devices()).toHaveLength(0);
  });
  it('maps the crop catalog with its agronomic references', async () => {
    await login('farmer');
    const avocado = data.crop(data.plots()[0]);
    expect(avocado.nameKey).toBe('crops.avocado');
    expect(avocado.salinityThresholdDsM).toBe(1.1);
    expect(data.crop(data.plots()[1]).yieldLossPercentPerDsM).toBe(9.6);
  });
  it('grades plots with the Backend alert rule', async () => {
    await login('advisor');
    const level = (name: string) => data.level(data.plots().find((plot) => plot.name === name)!);
    expect(level('Sector Norte')).toBe('critical');
    expect(level('La Quebrada')).toBe('normal');
    expect(level('Campo Este')).toBe('watch');
    expect(level('El Mirador')).toBe('high');
  });
  it('isolates farmer records: another farmer plot is not readable', async () => {
    await login('farmer');
    expect(data.readings('3')).toEqual([]);
    expect(data.device('3')).toBeUndefined();
    expect(data.alerts().map((alert) => alert.plotId)).toEqual(['1']);
  });
  it('builds the advisor client roster from accepted advisory links', async () => {
    await login('farmer');
    expect(data.clients()).toEqual([]);
    await login('advisor');
    const clients = data.clients();
    expect(clients.map((client) => client.user?.lastName)).toEqual(['Mendoza', 'Ramos']);
    expect(clients[0].openAlerts).toBe(2);
    expect(clients[0].farms.map((farm) => farm.name)).toEqual(['Los Olivos']);
    expect(clients[0].areaHectares).toBeCloseTo(9.6);
    expect(clients[1].openAlerts).toBe(1);
    expect(data.owner(clients[0].plots[0])?.firstName).toBe('Carla');
  });
  it('creates and updates owned farms and plots but rejects foreign farms', async () => {
    await login('farmer');
    expect(
      await data.saveFarm({
        name: 'Las Lomas',
        department: 'Lima',
        province: 'Huaral',
        district: 'Chancay',
      }),
    ).toBe(true);
    const farmId = data.farms().at(-1)!.id;
    const value = {
      name: 'New plot',
      farmId,
      latitude: -11.4,
      longitude: -77.2,
      areaHectares: 1.2,
      cropId: data.crops()[0].id,
    };
    expect(await data.savePlot({ ...value, latitude: 91 })).toBeNull();
    expect(await data.savePlot({ ...value, farmId: '2' })).toBeNull();
    const id = (await data.savePlot(value))!;
    expect(data.plots().find((plot) => plot.id === id)?.name).toBe('New plot');
    expect(await data.savePlot({ ...value, name: 'Renamed' }, id)).toBe(id);
    expect(data.plots().find((plot) => plot.id === id)?.name).toBe('Renamed');
    expect(data.latest(id)).toBeUndefined();
    await login('advisor');
    expect(await data.savePlot({ ...value, farmId: '1' })).toBeNull();
  });
  it('acknowledges and resolves an alert with a corrective action', async () => {
    await login('farmer');
    await data.acknowledge('1');
    expect(data.alerts()[0].status).toBe('ACKNOWLEDGED');
    const action = { type: 'LEACHING' as const, performedAt: today(), notes: 'Riego de lavado.' };
    expect(await data.recordAction('1', action)).toBe(true);
    expect(data.alerts()[0].status).toBe('RESOLVED');
    expect(data.alerts()[0].actions[0].createdBy).toBe('1');
    expect(data.activeAlerts()).toHaveLength(0);
    expect(await data.recordAction('1', action)).toBe(false);
  });
  it('rejects future-dated actions', async () => {
    await login('farmer');
    const tomorrow = new Date(Date.now() + 86_400_000 * 2).toISOString().slice(0, 10);
    expect(
      await data.recordAction('1', {
        type: 'SOIL_AMENDMENT',
        notes: 'Yeso',
        performedAt: tomorrow,
      }),
    ).toBe(false);
    expect(data.alerts()[0].status).toBe('OPEN');
  });
  it('lets only advisors record a calibration, without rewriting measurements', async () => {
    await login('farmer');
    expect(await data.calibrate('1', 2, 2.2, 'Lab A')).toBe(false);
    await login('advisor');
    const before = data.latest('1')?.conductivityDsM;
    expect(await data.calibrate('1', 2, 2.2, 'Lab A')).toBe(true);
    expect(data.device('1')?.calibration?.offsetDsM).toBeCloseTo(0.2);
    expect(data.device('1')?.calibration?.laboratory).toBe('Lab A');
    expect(data.latest('1')?.conductivityDsM).toBe(before);
  });
});
