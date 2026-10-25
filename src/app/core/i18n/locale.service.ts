import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AppLocale } from '../models';

const STORAGE_KEY = 'osoterra.locale';
/** Values of the `lang` query parameter the Landing Page adds to its links. */
const QUERY_LOCALES: Record<string, AppLocale> = { es: 'es_419', en: 'en_US' };

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  /** Both segments are Spanish-speaking producers and advisors, so Spanish comes first. */
  readonly locale = signal<AppLocale>('es_419');
  readonly loading = signal(false);
  /**
   * Picks the first language in this order: `?lang=es|en` from the Landing Page, the choice
   * remembered on this device, then Spanish (es_419).
   */
  async initialize(): Promise<void> {
    const requested = new URLSearchParams(this.document.defaultView?.location.search ?? '').get(
      'lang',
    );
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* Storage may be disabled. */
    }
    const fromQuery = QUERY_LOCALES[requested?.trim().toLowerCase() ?? ''];
    await this.setLocale(fromQuery ?? (saved === 'en_US' ? 'en_US' : 'es_419'));
  }
  async setLocale(locale: AppLocale): Promise<void> {
    this.loading.set(true);
    try {
      await firstValueFrom(this.translate.use(locale === 'es_419' ? 'es' : 'en'));
      this.locale.set(locale);
      this.document.documentElement.lang = locale.replace('_', '-');
      this.document.title = this.translate.instant('brand.name');
      try {
        localStorage.setItem(STORAGE_KEY, locale);
      } catch {
        /* Optional preference. */
      }
    } finally {
      this.loading.set(false);
    }
  }
  number(value: number, digits = 1): string {
    return new Intl.NumberFormat(this.locale().replace('_', '-'), {
      maximumFractionDigits: digits,
    }).format(value);
  }
  date(value: string): string {
    // A bare ISO date (yyyy-MM-dd) is a calendar day: new Date() would read it as UTC midnight
    // and show the previous day west of Greenwich, so build it in local time and omit the hour.
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (day) {
      return new Intl.DateTimeFormat(this.locale().replace('_', '-'), {
        dateStyle: 'medium',
      }).format(new Date(+day[1], +day[2] - 1, +day[3]));
    }
    return new Intl.DateTimeFormat(this.locale().replace('_', '-'), {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  }
}
