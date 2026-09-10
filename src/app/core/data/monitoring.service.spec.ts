import { TestBed } from '@angular/core/testing';
import { AuthService, DEMO_PASSWORD } from '../auth/auth.service';
import { MonitoringService } from './monitoring.service';

describe('MonitoringService permissions and workflows', () => {
  let auth: AuthService;
  let data: MonitoringService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
    auth = TestBed.inject(AuthService);
    data = TestBed.inject(MonitoringService);
  });
  const login = (role: string) =>
    auth.login({ email: `${role}@osoterra.demo`, password: DEMO_PASSWORD });

  it('hides all user records before sign in and after sign out', () => {
    expect(data.plots()).toHaveLength(0);
    login('farmer');
    expect(data.plots()).toHaveLength(2);
    auth.logout();
    expect(data.plots()).toHaveLength(0);
    expect(data.alerts()).toHaveLength(0);
    expect(data.devices()).toHaveLength(0);
  });
  it('isolates farmer records and denies access to another client by ID', () => {
    login('farmer');
    expect(data.readings('plot-3')).toEqual([]);
    expect(data.device('plot-3')).toBeUndefined();
    expect(data.alerts().map((alert) => alert.plotId)).toEqual(['plot-1']);
    data.acknowledge('alert-2');
    login('advisor');
    expect(data.alerts().find((alert) => alert.id === 'alert-2')?.status).toBe('OPEN');
  });
  it('exposes only assigned plots to an advisor', () => {
    login('advisor');
    expect(data.plots()).toHaveLength(4);
    auth.register({
      firstName: 'New',
      lastName: 'Advisor',
      email: 'new@example.test',
      password: 'LongPassword123!',
      department: 'Lima',
      province: 'Lima',
      role: 'Advisor',
      cipNumber: '123456',
      acceptsTerms: true,
    });
    expect(data.plots()).toHaveLength(0);
  });
    it('builds the advisor client roster and hides it from farmers', () => {
    login('farmer');
    expect(data.clients()).toEqual([]);
    login('advisor');
    const clients = data.clients();
    expect(clients.map((client) => client.id)).toEqual(['farmer-2', 'farmer-1']);
    expect(clients[0].user?.lastName).toBe('Mendoza');
    expect(clients[0].openAlerts).toBe(2);
    expect(clients[0].plots.map((plot) => plot.id)).toEqual(['plot-3', 'plot-4']);
    expect(clients[0].farms.map((farm) => farm.name)).toEqual(['Los Olivos']);
    expect(clients[0].areaHectares).toBeCloseTo(9.6);
    expect(clients[1].user?.lastName).toBe('Ramos');
    expect(clients[1].openAlerts).toBe(1);
    expect(data.owner(clients[0].plots[0])?.firstName).toBe('Carla');
  });
  it('creates and updates owned plots but rejects invalid location and foreign farms', () => {
    login('farmer');
    const value = {
      name: 'New plot',
      farmId: 'farm-1',
      latitude: -11.4,
      longitude: -77.2,
      areaHectares: 1.2,
      cropId: 'corn',
    };
    expect(data.savePlot({ ...value, latitude: 91 })).toBeNull();
    expect(data.savePlot({ ...value, farmId: 'farm-2' })).toBeNull();
    const id = data.savePlot(value)!;
    expect(data.plots().find((plot) => plot.id === id)?.name).toBe('New plot');
    expect(data.savePlot({ ...value, name: 'Renamed' }, id)).toBe(id);
    expect(data.latest(id)).toBeUndefined();
    login('advisor');
    expect(data.savePlot(value)).toBeNull();
  });
  it('records corrective actions, updates the badge and prevents editing resolved alerts', () => {
    login('farmer');
    const action = {
      type: 'INSPECTION' as const,
      performedAt: new Date(Date.now() - 60_000).toISOString(),
      notes: 'Inspected irrigation line.',
    };
    data.acknowledge('alert-1');
    expect(data.alerts()[0].status).toBe('ACKNOWLEDGED');
    expect(data.recordAction('alert-1', action, true)).toBe(true);
    expect(data.alerts()[0].actions[0].createdBy).toBe('farmer-1');
    expect(data.activeAlerts()).toHaveLength(0);
    expect(data.recordAction('alert-1', action, false)).toBe(false);
  });
  it('rejects future-dated actions', () => {
    login('farmer');
    expect(
      data.recordAction(
        'alert-1',
        {
          type: 'LAB_SAMPLE',
          notes: 'Sample',
          performedAt: new Date(Date.now() + 86_400_000).toISOString(),
        },
        true,
      ),
    ).toBe(false);
    expect(data.alerts()[0].status).toBe('OPEN');
  });
  it('allows advisors to record calibration without rewriting measurements', () => {
    login('farmer');
    expect(data.calibrate('device-1', 2, 2.2, 'Sample A')).toBe(false);
    login('advisor');
    const before = data.latest('plot-1')?.conductivityDsM;
    expect(data.calibrate('device-1', 2, 2.2, 'Sample A')).toBe(true);
    expect(data.device('plot-1')?.calibration?.offsetDsM).toBeCloseTo(0.2);
    expect(data.latest('plot-1')?.conductivityDsM).toBe(before);
  });
});
