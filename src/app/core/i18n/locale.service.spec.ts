import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { LocaleService } from './locale.service';

describe('LocaleService', () => {
  it('shows a bare ISO date as the same calendar day, without a time', () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    const locale = TestBed.inject(LocaleService);
    locale.locale.set('es_419');
    const text = locale.date('2026-10-18');
    expect(text).toContain('18');
    expect(text).not.toMatch(/\d{1,2}:\d{2}/);
  });

  it('keeps the time for date-time values', () => {
    TestBed.configureTestingModule({ providers: [provideTranslateService()] });
    const locale = TestBed.inject(LocaleService);
    expect(locale.date('2026-10-18T09:30:00')).toMatch(/9:30/);
  });
});
