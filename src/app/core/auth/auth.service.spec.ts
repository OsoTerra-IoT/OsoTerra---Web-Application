import { TestBed } from '@angular/core/testing';
import { provideFakeApiForTests } from '../api/testing';
import { SessionTokenStore } from '../api/session-token.store';
import { RegistrationRequest } from '../models';
import { AuthService, DEMO_ACCOUNTS, DEMO_PASSWORD } from './auth.service';

describe('AuthService over the IAM API', () => {
  let auth: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeApiForTests() });
    auth = TestBed.inject(AuthService);
  });
  const registration: RegistrationRequest = {
    firstName: 'Alex',
    lastName: 'Rivera',
    email: 'alex@example.test',
    password: 'LongPassword123!',
    department: 'Lima',
    province: 'Huaral',
    role: 'Farmer',
    acceptsTerms: true,
  };

  it('rejects invalid credentials without creating a session', async () => {
    expect(await auth.login({ email: DEMO_ACCOUNTS.farmer, password: 'incorrect' })).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
    expect(TestBed.inject(SessionTokenStore).token()).toBeNull();
  });
  it('normalizes email, stores the token and exposes only the authenticated role', async () => {
    expect(await auth.login({ email: ' FARMER@OSOTERRA.DEMO ', password: DEMO_PASSWORD })).toBe(
      true,
    );
    expect(TestBed.inject(SessionTokenStore).token()).toMatch(/^fake-jwt\./);
    expect(auth.hasRole(['Farmer'])).toBe(true);
    expect(auth.hasRole(['Advisor'])).toBe(false);
    const user = auth.user();
    expect(user?.role === 'Farmer' && user.advisorId).toBe(auth.linked()[0].id);
    auth.logout();
    expect(auth.user()).toBeNull();
    expect(TestBed.inject(SessionTokenStore).token()).toBeNull();
  });
  it('restores a session from the stored token', async () => {
    await auth.login({ email: DEMO_ACCOUNTS.advisor, password: DEMO_PASSWORD });
    const restored = TestBed.runInInjectionContext(() => new AuthService());
    await restored.restoreSession();
    expect(restored.user()?.email).toBe(DEMO_ACCOUNTS.advisor);
    expect(restored.linked().map((user) => user.lastName)).toEqual(['Ramos', 'Mendoza']);
  });
  it('requires terms and a valid CIP for advisor registration', async () => {
    expect(await auth.register({ ...registration, acceptsTerms: false })).toBe('INVALID');
    expect(await auth.register({ ...registration, role: 'Advisor', cipNumber: 'bad' })).toBe(
      'INVALID',
    );
    expect(await auth.register({ ...registration, role: 'Advisor', cipNumber: '123456' })).toBe(
      'SUCCESS',
    );
    expect(auth.isAdvisor()).toBe(true);
  });
  it('rejects duplicate emails and never exposes a password on User', async () => {
    expect(await auth.register(registration)).toBe('SUCCESS');
    expect(auth.user()).not.toHaveProperty('password');
    expect(await auth.register({ ...registration, email: 'ALEX@example.test' })).toBe('EXISTS');
  });
  it('consumes reset tokens and replaces the old password', async () => {
    const token = (await auth.requestPasswordReset(DEMO_ACCOUNTS.farmer))!;
    expect(await auth.resetPassword(token, 'Replacement123!')).toBe(true);
    expect(await auth.resetPassword(token, 'AnotherPassword!')).toBe(false);
    expect(await auth.login({ email: DEMO_ACCOUNTS.farmer, password: DEMO_PASSWORD })).toBe(false);
    expect(await auth.login({ email: DEMO_ACCOUNTS.farmer, password: 'Replacement123!' })).toBe(
      true,
    );
  });
  it('invalidates a previous token and does not reveal unknown emails', async () => {
    const oldToken = (await auth.requestPasswordReset(DEMO_ACCOUNTS.farmer))!;
    const newToken = (await auth.requestPasswordReset(DEMO_ACCOUNTS.farmer))!;
    expect(await auth.resetPassword(oldToken, 'Replacement123!')).toBe(false);
    expect(await auth.resetPassword(newToken, 'Replacement123!')).toBe(true);
    expect(await auth.requestPasswordReset('missing@example.test')).toBeNull();
  });
  it('rejects expired tokens', async () => {
    const token = (await auth.requestPasswordReset(DEMO_ACCOUNTS.farmer))!;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60_000);
    expect(await auth.resetPassword(token, 'Replacement123!')).toBe(false);
    clock.mockRestore();
  });
});
