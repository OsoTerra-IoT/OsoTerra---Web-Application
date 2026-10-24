import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { provideFakeApiForTests } from '../core/api/testing';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../core/auth/auth.service';
import { MonitoringService } from '../core/data/monitoring.service';
import { LocaleService } from '../core/i18n/locale.service';
import { routes } from '../app.routes';
import en from '../../../public/i18n/en.json';

describe('Advisory link screens', () => {
  let auth: AuthService;
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
    TestBed.inject(TranslateService).setTranslation('en', en);
    await TestBed.inject(LocaleService).setLocale('en_US');
    auth = TestBed.inject(AuthService);
    TestBed.inject(MonitoringService);
    harness = await RouterTestingHarness.create();
  });
  const login = (account: keyof typeof DEMO_ACCOUNTS) =>
    auth.login({ email: DEMO_ACCOUNTS[account], password: DEMO_PASSWORD });
  const text = () => harness.routeNativeElement?.textContent ?? '';
  const settle = async () => {
    for (let round = 0; round < 3; round++) {
      await harness.fixture.whenStable();
      harness.detectChanges();
    }
  };
  /** Buttons of the page and of any open dialog, by their visible label. */
  const button = (label: string) =>
    [...document.querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.trim().endsWith(label) && !candidate.disabled,
    ) as HTMLButtonElement;
  const invite = async (email: string) => {
    const input = harness.routeNativeElement!.querySelector('input[name="email"]')!;
    (input as HTMLInputElement).value = email;
    input.dispatchEvent(new Event('input'));
    button('Send invitation').click();
    await settle();
  };
  const confirmDialog = async () => {
    await settle();
    const dialog = document.querySelector('app-confirm-dialog')!;
    expect(dialog.textContent).toContain('End supervision?');
    (
      [...dialog.querySelectorAll('button')].find((item) =>
        item.textContent?.includes('End supervision'),
      ) as HTMLButtonElement
    ).click();
    await settle();
    expect(document.querySelector('app-confirm-dialog')).toBeNull();
  };

  it('lets the advisor invite a farmer by email and cancel the invitation', async () => {
    await login('advisor');
    await harness.navigateByUrl('/app/advisor/clients');
    await settle();
    expect(text()).toContain('Invite a farmer');
    expect(text()).toContain('You have no invitations waiting for an answer.');
    await invite('nobody@osoterra.demo');
    expect(text()).toContain('No farmer is registered with this email.');
    await invite(DEMO_ACCOUNTS.advisor2);
    expect(text()).toContain('it belongs to an advisor');
    await invite(DEMO_ACCOUNTS.farmer3);
    expect(text()).toContain(`Invitation sent to ${DEMO_ACCOUNTS.farmer3}`);
    expect(text()).toContain('Rosa Quispe');
    button('Cancel invitation').click();
    await settle();
    expect(text()).not.toContain('Rosa Quispe');
    expect(text()).toContain('You have no invitations waiting for an answer.');
  });
  it('asks before the advisor ends the supervision of a client', async () => {
    await login('advisor');
    await harness.navigateByUrl('/app/advisor/clients');
    await settle();
    expect(text()).toContain('Mendoza');
    const card = [...harness.routeNativeElement!.querySelectorAll('.client-card')].find((item) =>
      item.textContent?.includes('Mendoza'),
    )!;
    (
      [...card.querySelectorAll('button')].find((item) =>
        item.textContent?.includes('End supervision'),
      ) as HTMLButtonElement
    ).click();
    await confirmDialog();
    expect(text()).not.toContain('Mendoza');
    expect(text()).toContain('Ramos');
  });
  it('shows the farmer pending requests and accepts one', async () => {
    await login('farmer');
    await harness.navigateByUrl('/app/my-advisor');
    await settle();
    expect(text()).toContain('Pending requests');
    expect(text()).toContain('Lucía Vargas');
    expect(text()).toContain(DEMO_ACCOUNTS.advisor2);
    expect(text()).toContain('Diego Torres');
    button('Accept').click();
    await settle();
    expect(text()).not.toContain('Pending requests');
    expect(harness.routeNativeElement!.querySelectorAll('.advisor-card')).toHaveLength(2);
  });
  it('lets the farmer decline a request and end a supervision', async () => {
    await login('farmer');
    await harness.navigateByUrl('/app/my-advisor');
    await settle();
    button('Decline').click();
    await settle();
    expect(text()).not.toContain('Lucía Vargas');
    button('End supervision').click();
    await confirmDialog();
    expect(text()).not.toContain('Diego Torres');
    expect(text()).toContain('No advisor is assigned to your account.');
    expect(auth.linked()).toEqual([]);
  });
  it('shows an empty state to a farmer without advisors or requests', async () => {
    await login('farmer3');
    await harness.navigateByUrl('/app/my-advisor');
    await settle();
    expect(text()).toContain('No advisor is assigned to your account.');
    expect(text()).toContain('When an advisor invites you by email');
  });
});
