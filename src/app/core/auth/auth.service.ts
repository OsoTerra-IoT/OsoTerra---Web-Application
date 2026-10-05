import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { IamApi } from '../api/iam.api';
import { toUser } from '../api/mappers';
import { SessionTokenStore } from '../api/session-token.store';
import { LoginCredentials, RegistrationRequest, User, UserRole } from '../models';

export { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../api/fake/fake-database';

export type RegistrationResult = 'SUCCESS' | 'EXISTS' | 'INVALID';

/**
 * Session of the signed-in user, backed by the IAM endpoints. It keeps the user and the
 * accounts linked to them by advisory links (an advisor's farmers, a farmer's advisors),
 * which is all the directory the views need.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(IamApi);
  private readonly tokens = inject(SessionTokenStore);
  private readonly currentUser = signal<User | null>(null);
  private readonly linkedUsers = signal<User[]>([]);
  private readonly sessionListeners: ((user: User | null) => Promise<void> | void)[] = [];
  readonly user = this.currentUser.asReadonly();
  /** The signed-in user's linked counterparts (an advisor's farmers, a farmer's advisors). */
  readonly linked = this.linkedUsers.asReadonly();
  readonly isAuthenticated = computed(() => this.user() !== null);
  readonly isAdvisor = computed(() => this.user()?.role === 'Advisor');

  async login(credentials: LoginCredentials): Promise<boolean> {
    try {
      const session = await firstValueFrom(
        this.api.signIn({
          email: credentials.email.trim().toLowerCase(),
          password: credentials.password,
        }),
      );
      this.tokens.set(session.token);
      await this.startSession();
      return true;
    } catch (error) {
      if (error instanceof HttpErrorResponse && [400, 401].includes(error.status)) return false;
      throw error;
    }
  }

  async register(request: RegistrationRequest): Promise<RegistrationResult> {
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
    try {
      await firstValueFrom(
        this.api.signUp({
          email,
          password: request.password,
          firstName: request.firstName.trim(),
          lastName: request.lastName.trim(),
          role: request.role === 'Advisor' ? 'ADVISOR' : 'FARMER',
          professionalLicenseNumber: request.role === 'Advisor' ? request.cipNumber! : null,
          department: request.department.trim(),
          province: request.province.trim(),
        }),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 409) return 'EXISTS';
      if (error instanceof HttpErrorResponse && error.status === 400) return 'INVALID';
      throw error;
    }
    return (await this.login({ email, password: request.password })) ? 'SUCCESS' : 'INVALID';
  }

  /** Restores the session of a reload from the stored token, if it is still valid. */
  async restoreSession(): Promise<void> {
    if (!this.tokens.token()) return;
    try {
      await this.startSession();
    } catch {
      this.logout();
    }
  }

  /** Accounts the current user can see: themselves and their linked counterparts. */
  findUser(id: string): User | undefined {
    const user = this.user();
    return user?.id === id ? user : this.linkedUsers().find((linked) => linked.id === id);
  }

  /** Ids of the advisors linked to the signed-in farmer. */
  readonly advisorIds = computed(() =>
    this.isAdvisor() ? [] : this.linkedUsers().map((linked) => linked.id),
  );

  hasRole(roles: readonly UserRole[]): boolean {
    const user = this.user();
    return !!user && roles.includes(user.role);
  }

  /**
   * Asks for a reset link. The real Backend emails it; the fake API has no mailbox and
   * returns the token instead, so the demo can show the link on screen.
   */
  async requestPasswordReset(email: string): Promise<string | null> {
    const response = await firstValueFrom(
      this.api.requestPasswordReset({ email: email.trim().toLowerCase() }),
    );
    return response?.demoResetToken ?? null;
  }

  async resetPassword(token: string, password: string): Promise<boolean> {
    if (password.length < 12) return false;
    try {
      await firstValueFrom(this.api.resetPassword({ token, newPassword: password }));
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 400) return false;
      throw error;
    }
    this.logout();
    return true;
  }

  logout(): void {
    this.tokens.clear();
    this.linkedUsers.set([]);
    this.currentUser.set(null);
    for (const listener of this.sessionListeners) void listener(null);
  }

  /**
   * Runs `listener` whenever a session starts or ends. Sign-in resolves only after the
   * listeners finish, so the first screen already has its data.
   */
  onSessionChange(listener: (user: User | null) => Promise<void> | void): void {
    this.sessionListeners.push(listener);
  }

  private async startSession(): Promise<void> {
    const [me, linked] = await Promise.all([
      firstValueFrom(this.api.currentUser()),
      firstValueFrom(this.api.linkedAccounts()),
    ]);
    const linkedUsers = linked.map((account) => toUser(account));
    this.linkedUsers.set(linkedUsers);
    const user = toUser(me, me.role === 'FARMER' ? linkedUsers[0]?.id : undefined);
    this.currentUser.set(user);
    await Promise.all(this.sessionListeners.map((listener) => listener(user)));
  }
}
