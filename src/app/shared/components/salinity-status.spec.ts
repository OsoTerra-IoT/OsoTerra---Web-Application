import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AuthService, DEMO_PASSWORD } from '../../core/auth/auth.service';
import { CROPS, READINGS } from '../../core/data/demo-data';
import { SalinityStatus } from './salinity-status';
import en from '../../../../public/i18n/en.json';

describe('Role-based salinity presentation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.use('en');
  });
  const create = (role: 'farmer' | 'advisor', withReading = true) => {
    TestBed.inject(AuthService).login({ email: role + '@osoterra.demo', password: DEMO_PASSWORD });
    const fixture = TestBed.createComponent(SalinityStatus);
    fixture.componentRef.setInput('crop', CROPS[0]);
    if (withReading) fixture.componentRef.setInput('reading', READINGS[13]);
    fixture.detectChanges();
    return fixture;
  };
  it('puts farmer values inside a closed disclosure and shows a textual risk label', () => {
    const element = create('farmer').nativeElement as HTMLElement;
    expect(element.querySelector('details')?.open).toBe(false);
    expect(element.querySelector('details')?.textContent).toContain('dS/m');
    expect(element.querySelector('.status-pill')?.textContent).toContain('Very high level');
    expect(element.querySelector('.status-pill mat-icon')).toBeTruthy();
    expect(element.querySelector('.salinity-value')).toBeNull();
  });
  it('shows advisor values and the linked crop threshold without a disclosure', () => {
    const element = create('advisor').nativeElement as HTMLElement;
    expect(element.querySelector('details')).toBeNull();
    expect(element.querySelector('.salinity-value')?.textContent).toContain('dS/m');
    expect(element.querySelector('.reference')?.textContent).toContain('1.7');
    expect(element.querySelector('a')?.href).toContain('P572.pdf');
  });
  it('shows the threshold even when there is no measurement, without inventing a value', () => {
    const element = create('advisor', false).nativeElement as HTMLElement;
    expect(element.textContent).toContain('No comparable reading');
    expect(element.querySelector('.reference')).toBeTruthy();
    expect(element.querySelector('.salinity-value')).toBeNull();
  });
  it('does not compare raw bulk conductivity against ECe thresholds', () => {
    const fixture = create('advisor');
    fixture.componentRef.setInput('reading', { ...READINGS[13], measurementBasis: 'BULK_EC' });
    fixture.detectChanges();
    expect(fixture.componentInstance.level()).toBe('unknown');
    expect(fixture.nativeElement.textContent).toContain('comparable ECe');
  });
});
