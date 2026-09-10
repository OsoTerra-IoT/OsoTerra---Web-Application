import { computed, Injectable, signal } from '@angular/core';
import { LoginCredentials, RegistrationRequest, User, UserRole } from '../models';

export const DEMO_PASSWORD = 'OsoTerra2026!';
const base = {
  department: 'Lima',
  province: 'Huaral',
  locale: 'en_US' as const,
  termsAcceptedAt: '2026-09-01T12:00:00Z',
};
export const DEMO_USERS: readonly User[] = [
  {
    ...base,
    id: 'farmer-1',
    firstName: 'Elena',
    lastName: 'Ramos',
    email: 'farmer@osoterra.demo',
    role: 'Farmer',
    advisorId: 'advisor-1',
  },
  {
    ...base,
    id: 'farmer-2',
    firstName: 'Carla',
    lastName: 'Mendoza',
    email: 'farmer2@osoterra.demo',
    province: 'Huaura',
    role: 'Farmer',
    advisorId: 'advisor-1',
  },
  {
    ...base,
    id: 'advisor-1',
    firstName: 'Diego',
    lastName: 'Torres',
    email: 'advisor@osoterra.demo',
    role: 'Advisor',
    cipNumber: '123456',
  },
];

/** Development adapter. Accounts, passwords and reset tokens live in memory only.
 * A production API must authenticate, authorize every request and issue secure sessions.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<User | null>(null);
  private readonly accounts = new Map(
    DEMO_USERS.map((user) => [user.email, { user, password: DEMO_PASSWORD }]),
  );
  private readonly resetTokens = new Map<string, { email: string; expiresAt: number }>();
  readonly user = this.currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdvisor = computed(() => this.user()?.role === 'Advisor');

  login(credentials: LoginCredentials): boolean {
    const account = this.accounts.get(credentials.email.trim().toLowerCase());
    if (!account || account.password !== credentials.password) return false;
    this.currentUser.set(account.user);
    return true;
  }

  register(request: RegistrationRequest): 'SUCCESS' | 'EXISTS' | 'INVALID' {
    const email = request.email.trim().toLowerCase();
    if (
      !request.acceptsTerms ||
      !request.firstName.trim() ||
      !request.lastName.trim() ||
      !request.department.trim() ||
      !request.province.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      request.password.length < 12 ||
      !['Farmer', 'Advisor'].includes(request.role) ||
      (request.role === 'Advisor' && !/^\d{4,10}$/.test(request.cipNumber ?? ''))
    )
      return 'INVALID';
    if (this.accounts.has(email)) return 'EXISTS';
    const common = {
      id: crypto.randomUUID(),
      email,
      firstName: request.firstName.trim(),
      lastName: request.lastName.trim(),
      department: request.department.trim(),
      province: request.province.trim(),
      locale: 'en_US' as const,
      termsAcceptedAt: new Date().toISOString(),
    };
    const user: User =
      request.role === 'Advisor'
        ? { ...common, role: 'Advisor', cipNumber: request.cipNumber! }
        : { ...common, role: 'Farmer' };
    this.accounts.set(email, { user, password: request.password });
    this.currentUser.set(user);
    return 'SUCCESS';
  }
  /** Directory lookup for demo relationships. A production API would scope this per request. */
  findUser(id: string): User | undefined {
    for (const account of this.accounts.values()) if (account.user.id === id) return account.user;
    return undefined;
  }
  hasRole(roles: readonly UserRole[]): boolean {
    const user = this.user();
    return !!user && roles.includes(user.role);
  }

  requestPasswordReset(email: string): string | null {
    const normalizedEmail = email.trim().toLowerCase();
    if (!this.accounts.has(normalizedEmail)) return null;
    for (const [key, entry] of this.resetTokens)
      if (entry.email === normalizedEmail) this.resetTokens.delete(key);
    const token = crypto.randomUUID();
    this.resetTokens.set(token, { email: normalizedEmail, expiresAt: Date.now() + 15 * 60_000 });
    return token;
  }

  resetPassword(token: string, password: string): boolean {
    const reset = this.resetTokens.get(token);
    if (!reset || reset.expiresAt <= Date.now() || password.length < 12) return false;
    const account = this.accounts.get(reset.email);
    if (!account) return false;
    account.password = password;
    this.resetTokens.delete(token);
    this.logout();
    return true;
  }

  logout(): void {
    this.currentUser.set(null);
  }
}
