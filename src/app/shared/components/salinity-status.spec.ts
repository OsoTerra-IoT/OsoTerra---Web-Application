import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { toCrop } from '../../core/api/mappers';
import { provideFakeApiForTests } from '../../core/api/testing';
import { AuthService, DEMO_PASSWORD } from '../../core/auth/auth.service';
import { MonitoringService } from '../../core/data/monitoring.service';
import { SoilReading } from '../../core/models';
import { SalinityStatus } from './salinity-status';
import en from '../../../../public/i18n/en.json';

const AVOCADO = toCrop({
  id: 13,
  commonName: 'Palta',
  scientificName: null,
  salinityThresholdDsM: 1.1,
  saltToleranceClass: 'Sensible',
  sourceReference: null,
});
const READING: SoilReading = {
  id: '56',
  plotId: '1',
  deviceId: '1',
  recordedAt: '2026-09-30T08:00:00',
  conductivityDsM: 1.74,
  measurementBasis: 'ECe',
  moisturePercent: 34,
  temperatureCelsius: 24,
  quality: 'VALID',
};

describe('Role-based salinity presentation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTranslateService(), provideFakeApiForTests()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
  });
  const create = async (role: 'farmer' | 'advisor', withReading = true) => {
    TestBed.inject(MonitoringService);
    await TestBed.inject(AuthService).login({
      email: role + '@osoterra.demo',
      password: DEMO_PASSWORD,
    });
    const fixture = TestBed.createComponent(SalinityStatus);
    fixture.componentRef.setInput('crop', AVOCADO);
    if (withReading) fixture.componentRef.setInput('reading', READING);
    fixture.detectChanges();
    return fixture;
  };
  it('puts farmer values inside a closed disclosure and shows a textual risk label', async () => {
    const element = (await create('farmer')).nativeElement as HTMLElement;
    expect(element.querySelector('details')?.open).toBe(false);
    expect(element.querySelector('details')?.textContent).toContain('dS/m');
    expect(element.querySelector('.status-pill')?.textContent).toContain('Very high level');
    expect(element.querySelector('.status-pill mat-icon')).toBeTruthy();
    expect(element.querySelector('.salinity-value')).toBeNull();
  });
  it('shows advisor values and the linked crop threshold without a disclosure', async () => {
    const element = (await create('advisor')).nativeElement as HTMLElement;
    expect(element.querySelector('details')).toBeNull();
    expect(element.querySelector('.salinity-value')?.textContent).toContain('dS/m');
    expect(element.querySelector('.reference')?.textContent).toContain('1.1');
    expect(element.querySelector('a')?.href).toContain('P2665.pdf');
    expect(element.querySelector('a')?.textContent).toContain('Acosta-Rangel et al., 2019');
  });
  it('shows the threshold even when there is no measurement, without inventing a value', async () => {
    const element = (await create('advisor', false)).nativeElement as HTMLElement;
    expect(element.textContent).toContain('No comparable reading');
    expect(element.querySelector('.reference')).toBeTruthy();
    expect(element.querySelector('.salinity-value')).toBeNull();
  });
  it('does not compare raw bulk conductivity against ECe thresholds', async () => {
    const fixture = await create('advisor');
    fixture.componentRef.setInput('reading', { ...READING, measurementBasis: 'BULK_EC' });
    fixture.detectChanges();
    expect(fixture.componentInstance.level()).toBe('unknown');
    expect(fixture.nativeElement.textContent).toContain('comparable ECe');
  });
});
