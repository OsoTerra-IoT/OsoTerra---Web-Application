import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AuthService, DEMO_PASSWORD } from './core/auth/auth.service';
import { LocaleService } from './core/i18n/locale.service';
import { routes } from './app.routes';
import en from '../../public/i18n/en.json';
import es from '../../public/i18n/es.json';

const ADVISOR_URLS = [
  '/app/home',
  '/app/plots',
  '/app/plots/plot-1',
  '/app/alerts',
  '/app/subscription',
  '/app/settings',
  '/app/advisor/compare',
  '/app/advisor/reports',
  '/app/advisor/clients',
  '/app/advisor/calibration',
];

describe('OsoTerra routed application', () => {
  let auth: AuthService;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideTranslateService()],
    });
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', en);
    translate.setTranslation('es', es);
    await TestBed.inject(LocaleService).setLocale('en_US');
    auth = TestBed.inject(AuthService);
    harness = await RouterTestingHarness.create();
  });
  const login = (role: string) =>
    auth.login({ email: role + '@osoterra.demo', password: DEMO_PASSWORD });
  const signOutButton = () =>
    [...(harness.routeNativeElement?.querySelectorAll('button') ?? [])].find((button) =>
      button.textContent?.includes('Sign out'),
    ) as HTMLButtonElement;

  it('redirects anonymous deep links to sign in with the return path', async () => {
    await harness.navigateByUrl('/app/plots/plot-1');
    expect(TestBed.inject(Router).url).toContain('/auth/login?returnUrl=');
    expect(harness.routeNativeElement?.textContent).toContain('Sign in');
  });
  it('prevents a farmer from opening advisor URLs and hides advisor navigation', async () => {
    login('farmer');
    await harness.navigateByUrl('/app/advisor/reports');
    expect(TestBed.inject(Router).url).toBe('/app/home');
    expect(
      harness.routeNativeElement?.querySelector('nav a[href="/app/advisor/reports"]'),
    ).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Sector Norte');
    expect(harness.routeNativeElement?.textContent).not.toContain('Campo Este');
  });
  it('blocks advisor access to farmer-only plot creation', async () => {
    login('advisor');
    await harness.navigateByUrl('/app/plots/new');
    expect(TestBed.inject(Router).url).toBe('/app/home');
    expect(harness.routeNativeElement?.querySelector('#advisor-sidebar')).toBeTruthy();
    expect(harness.routeNativeElement?.querySelector('#primary-sidebar')).toBeNull();
  });
  it('renders authorized farmer routes and denies unowned detail IDs', async () => {
    login('farmer');
    for (const url of [
      '/app/home',
      '/app/plots',
      '/app/plots/plot-1',
      '/app/plots/new',
      '/app/plots/plot-1/edit',
      '/app/plots/farms/new',
      '/app/plots/farms/farm-1/edit',
      '/app/alerts',
      '/app/devices',
      '/app/my-advisor',
      '/app/subscription',
      '/app/settings',
    ]) {
      await harness.navigateByUrl(url);
      expect(TestBed.inject(Router).url).toBe(url);
      expect(harness.routeNativeElement?.querySelector('h1')).toBeTruthy();
      expect(harness.routeNativeElement?.querySelector('#primary-sidebar')).toBeTruthy();
    }
    await harness.navigateByUrl('/app/plots/plot-3');
    expect(harness.routeNativeElement?.textContent).toContain('Plot not found');
  });
  it('serves every advisor route from the advisor shell with its own sidebar', async () => {
    login('advisor');
    for (const url of ADVISOR_URLS) {
      await harness.navigateByUrl(url);
      expect(TestBed.inject(Router).url).toBe(url);
      expect(harness.routeNativeElement?.querySelector('#advisor-sidebar')).toBeTruthy();
      expect(harness.routeNativeElement?.querySelector('#primary-sidebar')).toBeNull();
      expect(
        harness.routeNativeElement?.querySelector('nav a[href="/app/advisor/compare"]'),
      ).toBeTruthy();
    }
  });
  it('keeps farmer-only destinations out of the advisor sidebar', async () => {
    login('advisor');
    await harness.navigateByUrl('/app/home');
    for (const href of ['/app/devices', '/app/my-advisor', '/app/plots/new']) {
      expect(harness.routeNativeElement?.querySelector(`nav a[href="${href}"]`)).toBeNull();
    }
  });

  it('lets the advisor sign out from the workspace toolbar', async () => {
    login('advisor');
    await harness.navigateByUrl('/app/home');
    signOutButton().click();
    await harness.fixture.whenStable();
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(Router).url).toBe('/auth/login');
    login('farmer');
    await harness.navigateByUrl('/app/home');
    expect(harness.routeNativeElement?.querySelector('#primary-sidebar')).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Sector Norte');
  });
  it('updates visible text and document language without signing out', async () => {
    login('farmer');
    await harness.navigateByUrl('/app/home');
    await TestBed.inject(LocaleService).setLocale('es_419');
    harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Hola, Elena');
    expect(harness.routeNativeElement?.textContent).toContain('Mis parcelas');
    expect(document.documentElement.lang).toBe('es-419');
    expect(auth.isAuthenticated()).toBe(true);
  });
  it('protects child navigation after logout', async () => {
    login('farmer');
    await harness.navigateByUrl('/app/home');
    auth.logout();
    await harness.navigateByUrl('/app/alerts');
    expect(TestBed.inject(Router).url).toContain('/auth/login');
  });
});