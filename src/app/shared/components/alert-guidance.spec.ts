import { TestBed } from '@angular/core/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { LocaleService } from '../../core/i18n/locale.service';
import { SalinityAlert } from '../../core/models';
import { AlertGuidance } from './alert-guidance';
import en from '../../../../public/i18n/en.json';

const alert: SalinityAlert = {
  id: 'a1',
  plotId: 'p1',
  readingId: 'r1',
  severity: 'CRITICAL',
  status: 'OPEN',
  conductivityDsM: 5.4,
  thresholdDsM: 3,
  createdAt: '2026-11-20',
  actions: [],
};

describe('AlertGuidance', () => {
  async function render() {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    TestBed.inject(TranslateService).setTranslation('en', en);
    await TestBed.inject(LocaleService).setLocale('en_US');
    const fixture = TestBed.createComponent(AlertGuidance);
    fixture.componentRef.setInput('alert', alert);
    fixture.componentRef.setInput('plotName', 'North plot');
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the reading next to the threshold and what to do for the level', async () => {
    const root = await render();
    expect(root.textContent).toContain('Reading: 5.40 dS/m (crop threshold: 3.00 dS/m)');
    expect(root.textContent).toContain('What to do:');
    expect(root.textContent).toContain('call your advisor');
  });

  it('shares the alert on WhatsApp in a new tab without a fixed phone number', async () => {
    const link = (await render()).querySelector('a') as HTMLAnchorElement;
    const url = new URL(link.href);
    expect(url.origin).toBe('https://wa.me');
    expect(url.pathname).toBe('/');
    expect(url.searchParams.get('text')).toContain('Critical salinity alert in North plot');
    expect(url.searchParams.get('text')).toContain('5.40 dS/m, threshold 3.00 dS/m');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    expect(link.getAttribute('aria-label')).toBe('Share the North plot alert on WhatsApp');
  });
});
