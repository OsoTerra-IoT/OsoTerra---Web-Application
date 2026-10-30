import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { provideApi } from './core/api/provide-api';
import { AuthService } from './core/auth/auth.service';
import { MonitoringService } from './core/data/monitoring.service';
import { DemoModeService } from './core/demo/demo-mode.service';
import { LocaleService } from './core/i18n/locale.service';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideApi(),
    provideTranslateService({
      fallbackLang: 'en',
      loader: provideTranslateHttpLoader({ prefix: './i18n/', suffix: '.json', failOnError: true }),
    }),
    // First: reads `?demo=` before the stored session is restored.
    provideAppInitializer(() => void inject(DemoModeService)),
    provideAppInitializer(() => inject(LocaleService).initialize()),
    provideAppInitializer(() => {
      // Created before any session starts, so it loads the data of every sign-in.
      inject(MonitoringService);
      return inject(AuthService).restoreSession();
    }),
  ],
};
