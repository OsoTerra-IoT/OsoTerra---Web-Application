import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AppLocale } from '../models';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  private readonly translate = inject(TranslateService);
  private readonly document = inject(DOCUMENT);
  readonly locale = signal<AppLocale>('en_US');
  readonly loading = signal(false);
  async initialize(): Promise<void> {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('osoterra.locale');
    } catch {
      /* Storage may be disabled. */
    }
    await this.setLocale(saved === 'es_419' ? 'es_419' : 'en_US');
  }
  async setLocale(locale: AppLocale): Promise<void> {
    this.loading.set(true);
    try {
      await firstValueFrom(this.translate.use(locale === 'es_419' ? 'es' : 'en'));
      this.locale.set(locale);
      this.document.documentElement.lang = locale.replace('_', '-');
      this.document.title = this.translate.instant('brand.name');
      try {
        localStorage.setItem('osoterra.locale', locale);
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
