import { TestBed } from '@angular/core/testing';
import { FakeBackend } from '../api/fake/fake-backend';
import { provideFakeApiForTests } from '../api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../auth/auth.service';
import { MonitoringService } from './monitoring.service';

/**
 * Requests the home screen's data needs, counted on the fake API. Before the load was
 * trimmed: farmer 12, farmer2 13, advisor 24, and activating a sensor reloaded every plot
 * (18 requests for farmer2 with three plots).
 */
describe('MonitoringService requests', () => {
  let calls: string[];
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeApiForTests() });
    calls = [];
    const handle = FakeBackend.prototype.handle;
    vi.spyOn(FakeBackend.prototype, 'handle').mockImplementation(function (
      this: FakeBackend,
      request,
    ) {
      calls.push(`${request.method} ${request.path}`);
      return handle.call(this, request);
    });
  });
  afterEach(() => vi.restoreAllMocks());

  const login = async (account: keyof typeof DEMO_ACCOUNTS) => {
    TestBed.inject(MonitoringService);
    await TestBed.inject(AuthService).login({
      email: DEMO_ACCOUNTS[account],
      password: DEMO_PASSWORD,
    });
    await new Promise((resolve) => setTimeout(resolve));
    return calls.filter((call) => !/ \/(auth|users)\//.test(call));
  };

  it('does not ask a farmer for calibrations, which only the advisor screens read', async () => {
    const monitoring = await login('farmer');
    expect(monitoring).toHaveLength(10);
    expect(monitoring.some((call) => call.includes('calibration-records'))).toBe(false);
    expect(monitoring.filter((call) => call.includes('/crops'))).toHaveLength(1);
  });
  it('still reads the calibrations of the plots an advisor supervises', async () => {
    const monitoring = await login('advisor');
    expect(monitoring).toHaveLength(24);
    expect(monitoring.filter((call) => call.includes('calibration-records'))).toHaveLength(4);
  });
  it('reloads only the plot whose sensor was activated', async () => {
    await login('farmer2');
    const data = TestBed.inject(MonitoringService);
    const id = (await data.savePlot({
      name: 'Nueva',
      farmId: data.farms()[0].id,
      latitude: -11.4,
      longitude: -77.2,
      areaHectares: 1,
      cropId: data.crops()[0].id,
    }))!;
    calls.length = 0;
    expect(await data.activateDevice(id, 'OT-9001')).toBe('activated');
    expect(calls).toHaveLength(6);
    expect(data.device(id)?.serialNumber).toBe('OT-9001');
    expect(data.plots().find((plot) => plot.id === id)?.deviceId).toBe(data.device(id)?.id);
    expect(data.plots()).toHaveLength(3);
    expect(data.readings(id)).toHaveLength(0);
  });
});
