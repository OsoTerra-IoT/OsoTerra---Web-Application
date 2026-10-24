import { HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { AdvisoryLinkResource } from '../api/api.types';
import { IamApi } from '../api/iam.api';
import { fromId, toAdvisoryLink } from '../api/mappers';
import { AuthService } from '../auth/auth.service';
import { AdvisoryLink } from '../models';
import { MonitoringService } from './monitoring.service';

/**
 * Outcome of inviting a farmer: `notFound` when no farmer has that email (404), `linked` when
 * this advisor already has a pending or accepted link with them, `conflict` for any other 409
 * (the email belongs to an advisor, or the API found a link this view did not know about).
 */
export type InvitationResult = 'sent' | 'invalid' | 'notFound' | 'linked' | 'conflict' | 'failed';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Advisory links of the signed-in user, as advisor or as farmer: the advisor invites a farmer
 * by email, the farmer accepts or declines, and either party ends the supervision. Accepting
 * or ending a link changes what the advisor may read, so the linked accounts and the
 * monitoring data are reloaded afterwards.
 */
@Injectable({ providedIn: 'root' })
export class AdvisoryLinkService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(IamApi);
  private readonly monitoring = inject(MonitoringService);
  private readonly mine = signal<AdvisoryLink[]>([]);
  private generation = 0;
  /** Pending and accepted links, newest first, as the API lists them. */
  readonly links = this.mine.asReadonly();
  readonly pending = computed(() => this.links().filter((link) => link.status === 'PENDING'));
  readonly accepted = computed(() => this.links().filter((link) => link.status === 'ACCEPTED'));
  readonly loading = signal(false);
  readonly loadFailed = signal(false);

  constructor() {
    this.auth.onSessionChange((user) => (user ? this.refresh() : this.clear()));
    if (this.auth.user()) void this.refresh();
  }

  /** The accepted link with a counterpart (an advisor's client, a farmer's advisor). */
  acceptedWith(counterpartId: string): AdvisoryLink | undefined {
    return this.accepted().find(
      (link) => link.farmerId === counterpartId || link.advisorId === counterpartId,
    );
  }

  async refresh(): Promise<void> {
    const generation = ++this.generation;
    if (!this.auth.user()) return this.clear();
    this.loading.set(true);
    this.loadFailed.set(false);
    try {
      const links = await firstValueFrom(this.api.myAdvisoryLinks());
      if (generation === this.generation) this.mine.set(links.map(toAdvisoryLink));
    } catch (error) {
      // An expired session is handled by the session expiry interceptor.
      if ((error as { status?: number }).status === 401) return;
      if (generation === this.generation) this.loadFailed.set(true);
      console.error('Could not load advisory links', error);
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }

  /** Sends a supervision request to the farmer registered with `email`. */
  async invite(email: string): Promise<InvitationResult> {
    const farmerEmail = email.trim().toLowerCase();
    if (!this.auth.isAdvisor() || !EMAIL.test(farmerEmail)) return 'invalid';
    if (this.links().some((link) => link.farmerEmail.toLowerCase() === farmerEmail))
      return 'linked';
    let status = 0;
    const saved = await this.attempt(
      this.api.requestAdvisoryLink({ farmerEmail }),
      (failure) => (status = failure),
    );
    if (!saved)
      return status === 404
        ? 'notFound'
        : status === 409
          ? 'conflict'
          : status === 400
            ? 'invalid'
            : 'failed';
    this.mine.update((links) => [toAdvisoryLink(saved), ...links]);
    return 'sent';
  }

  /** The farmer accepts a pending request; the advisor starts reading their farms. */
  async accept(id: string): Promise<boolean> {
    const link = this.pending().find((item) => item.id === id);
    if (!link || link.farmerId !== this.auth.user()?.id) return false;
    return this.answer(this.api.acceptAdvisoryLink(fromId(id)), true);
  }

  /**
   * Either party revokes a link: declining or cancelling a pending request, or ending an
   * accepted supervision.
   */
  async revoke(id: string): Promise<boolean> {
    const link = this.links().find((item) => item.id === id);
    if (!link) return false;
    return this.answer(this.api.revokeAdvisoryLink(fromId(id)), link.status === 'ACCEPTED');
  }

  /** Applies an answered link; `changesAccess` when the advisor gains or loses the farm data. */
  private async answer(
    request: Observable<AdvisoryLinkResource>,
    changesAccess: boolean,
  ): Promise<boolean> {
    const saved = await this.attempt(request);
    if (!saved) {
      // The link may have changed on the other side (409); show its current state.
      await this.refresh();
      return false;
    }
    const link = toAdvisoryLink(saved);
    this.mine.update((links) =>
      link.status === 'REVOKED'
        ? links.filter((item) => item.id !== link.id)
        : links.map((item) => (item.id === link.id ? link : item)),
    );
    if (changesAccess) {
      await this.auth.refreshLinkedAccounts();
      await this.monitoring.refresh();
    }
    return true;
  }

  private clear(): void {
    this.generation++;
    this.mine.set([]);
    this.loading.set(false);
    this.loadFailed.set(false);
  }

  /** Same convention as MonitoringService: an API rejection or outage is a failed command. */
  private async attempt<T>(
    request: Observable<T>,
    onFailure?: (status: number) => void,
  ): Promise<T | null> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      if (!(error instanceof HttpErrorResponse)) throw error;
      if (error.status === 0 || error.status >= 500)
        console.error('OsoSense API call failed', error);
      onFailure?.(error.status);
      return null;
    }
  }
}
