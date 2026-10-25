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

  describe('first language', () => {
    const start = async (url: string, saved?: string) => {
      history.replaceState(null, '', url);
      localStorage.clear();
      if (saved) localStorage.setItem('osoterra.locale', saved);
      TestBed.configureTestingModule({ providers: [provideTranslateService()] });
      const locale = TestBed.inject(LocaleService);
      await locale.initialize();
      return locale;
    };
    afterEach(() => {
      history.replaceState(null, '', '/');
      localStorage.clear();
    });

    it('opens in Spanish on a first visit', async () => {
      const locale = await start('/');
      expect(locale.locale()).toBe('es_419');
      expect(document.documentElement.lang).toBe('es-419');
    });

    it('follows the language chosen on the Landing Page and remembers it', async () => {
      const locale = await start('/auth/register?lang=en', 'es_419');
      expect(locale.locale()).toBe('en_US');
      expect(localStorage.getItem('osoterra.locale')).toBe('en_US');
    });

    it('keeps the remembered language when the link has no valid lang', async () => {
      expect((await start('/?lang=fr', 'en_US')).locale()).toBe('en_US');
    });
  });
});
