import { TestBed } from '@angular/core/testing';
import { AuthService, DEMO_PASSWORD } from './auth.service';
import { RegistrationRequest } from '../models';

describe('AuthService demo lifecycle', () => {
  let auth: AuthService;
  beforeEach(() => {
    TestBed.configureTestingModule({});
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

  it('rejects invalid credentials without creating a session', () => {
    expect(auth.login({ email: 'farmer@osoterra.demo', password: 'incorrect' })).toBe(false);
    expect(auth.isAuthenticated()).toBe(false);
  });
  it('normalizes email and exposes only the authenticated role', () => {
    expect(auth.login({ email: ' FARMER@OSOTERRA.DEMO ', password: DEMO_PASSWORD })).toBe(true);
    expect(auth.hasRole(['Farmer'])).toBe(true);
    expect(auth.hasRole(['Advisor'])).toBe(false);
    auth.logout();
    expect(auth.user()).toBeNull();
  });
  it('requires terms and valid CIP for advisor registration', () => {
    expect(auth.register({ ...registration, acceptsTerms: false })).toBe('INVALID');
    expect(auth.register({ ...registration, role: 'Advisor', cipNumber: 'bad' })).toBe('INVALID');
    expect(auth.register({ ...registration, role: 'Advisor', cipNumber: '123456' })).toBe(
      'SUCCESS',
    );
    expect(auth.isAdvisor()).toBe(true);
  });
  it('rejects duplicate emails and never exposes a password on User', () => {
    expect(auth.register(registration)).toBe('SUCCESS');
    expect(auth.user()).not.toHaveProperty('password');
    expect(auth.register({ ...registration, email: 'ALEX@example.test' })).toBe('EXISTS');
  });
  it('consumes reset tokens and replaces the old password', () => {
    const token = auth.requestPasswordReset('farmer@osoterra.demo')!;
    expect(auth.resetPassword(token, 'Replacement123!')).toBe(true);
    expect(auth.resetPassword(token, 'AnotherPassword!')).toBe(false);
    expect(auth.login({ email: 'farmer@osoterra.demo', password: DEMO_PASSWORD })).toBe(false);
    expect(auth.login({ email: 'farmer@osoterra.demo', password: 'Replacement123!' })).toBe(true);
  });
  it('invalidates a previous token when another is requested', () => {
    const oldToken = auth.requestPasswordReset('farmer@osoterra.demo')!;
    const newToken = auth.requestPasswordReset('farmer@osoterra.demo')!;
    expect(auth.resetPassword(oldToken, 'Replacement123!')).toBe(false);
    expect(auth.resetPassword(newToken, 'Replacement123!')).toBe(true);
    expect(auth.requestPasswordReset('missing@example.test')).toBeNull();
  });
  it('rejects expired tokens', () => {
    const token = auth.requestPasswordReset('farmer@osoterra.demo')!;
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 16 * 60_000);
    expect(auth.resetPassword(token, 'Replacement123!')).toBe(false);
    clock.mockRestore();
  });
});
