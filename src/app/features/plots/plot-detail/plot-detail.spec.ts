import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideFakeApiForTests } from '../../../core/api/testing';
import { MonitoringService } from '../../../core/data/monitoring.service';
import { DEMO_MODE_KEY } from '../../../core/demo/demo-mode.service';
import { DemoScenarioService } from '../../../core/demo/demo-scenario.service';
import { DemoScenarioId } from '../../../core/demo/demo-scenarios';
import { LocaleService } from '../../../core/i18n/locale.service';
import { routes } from '../../../app.routes';
import en from '../../../../../public/i18n/en.json';

describe('Plot detail contingency status', () => {
  let harness: RouterTestingHarness;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideTranslateService(),
        provideFakeApiForTests(),
        { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ],
    });
    sessionStorage.setItem(DEMO_MODE_KEY, '1');
    TestBed.inject(TranslateService).setTranslation('en', en);
    await TestBed.inject(LocaleService).setLocale('en_US');
    harness = await RouterTestingHarness.create();
  });
  afterEach(() => sessionStorage.clear());

  const open = async (scenario: DemoScenarioId, plotName: string, tab = '') => {
    const data = TestBed.inject(MonitoringService);
    expect(await TestBed.inject(DemoScenarioService).load(scenario)).toBe(true);
    await vi.waitFor(() => expect(data.plots().length).toBeGreaterThan(0));
    const plot = data.plots().find((item) => item.name === plotName)!;
    await harness.navigateByUrl(`/app/plots/${plot.id}${tab}`);
    for (let round = 0; round < 3; round++) {
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
    return harness.routeNativeElement as HTMLElement;
  };

  it('shows the contingency as active with the washes used while the plot recovers', async () => {
    const root = await open(7, 'Sector Norte');
    const panel = root.querySelector('.contingency')!;
    expect(panel.textContent).toContain('Salinity contingency');
    expect(panel.textContent).toContain('Active');
    expect(panel.textContent).toContain('Washes used: 2/3');
    expect(panel.classList.contains('exhausted')).toBe(false);
  });
  it('says a person must act when the washes are used up', async () => {
    const root = await open(8, 'Sector Norte');
    const panel = root.querySelector('.contingency')!;
    expect(panel.classList.contains('exhausted')).toBe(true);
    expect(panel.textContent).toContain('Washes used up');
    expect(panel.textContent).toContain('Washes used: 3/3');
    expect(panel.textContent).toContain('A person must check the plot and act.');
  });
  it('lists the contingency among the sensor data', async () => {
    const root = await open(7, 'Sector Norte', '?tab=telemetry');
    expect(root.textContent).toContain('Salinity contingency');
    expect(root.textContent).toContain('Active · Washes used: 2/3');
  });
  it('shows nothing on a plot without washes', async () => {
    const root = await open(7, 'Sector Sur');
    expect(root.querySelector('.contingency')).toBeNull();
  });
});
