import { Reveal } from '../../../shared/directives/reveal';
import { Skeleton } from '../../../shared/components/skeleton';
import { API_CONFIG } from '../../../core/api/api-config';
import { LevelPill } from '../../../shared/components/level-pill';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AdvisoryLinkService, InvitationResult } from '../../../core/data/advisory-link.service';
import { AdvisorClient, MonitoringService } from '../../../core/data/monitoring.service';
import { LocaleService } from '../../../core/i18n/locale.service';
import { confirmAction } from '../../../shared/components/confirm-dialog';
import { UI_IMPORTS } from '../../../shared/ui-imports';

/** Messages shown under the invitation form, by outcome. */
const INVITATION_MESSAGES: Record<Exclude<InvitationResult, 'sent'>, string> = {
  invalid: 'links.inviteInvalid',
  notFound: 'links.inviteNotFound',
  linked: 'links.inviteLinked',
  conflict: 'links.inviteConflict',
  failed: 'links.actionFailed',
};

/**
 * Client directory of the advisor: the farmers who accepted the advisory link, the
 * invitations still waiting for an answer, and the form to invite a farmer by email.
 */
@Component({
  selector: 'app-clients',
  imports: [Reveal, Skeleton, LevelPill, ...UI_IMPORTS],
  templateUrl: './clients.html',
  styleUrl: './clients.scss',
})
export class Clients {
  /** Demo labels only when the in-browser fake API answers, never on real data. */
  readonly demo = inject(API_CONFIG).useFakeApi;
  readonly data = inject(MonitoringService);
  readonly links = inject(AdvisoryLinkService);
  readonly locale = inject(LocaleService);
  private readonly dialog = inject(MatDialog);
  readonly area = computed(() =>
    this.data.clients().reduce((sum, client) => sum + client.areaHectares, 0),
  );
  readonly sending = signal(false);
  /** Email of the invitation just sent, for the confirmation message. */
  readonly sentTo = signal('');
  readonly inviteError = signal('');
  readonly actionError = signal(false);
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async invite() {
    const control = this.form.controls.email;
    control.setValue(control.value.trim());
    this.sentTo.set('');
    this.inviteError.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    const result = await this.links.invite(control.value);
    this.sending.set(false);
    if (result === 'sent') {
      this.sentTo.set(control.value.toLowerCase());
      this.form.reset();
    } else this.inviteError.set(INVITATION_MESSAGES[result]);
  }

  async cancel(id: string) {
    this.actionError.set(!(await this.links.revoke(id)));
  }

  endSupervision(client: AdvisorClient) {
    const link = this.links.acceptedWith(client.id);
    if (!link) return;
    confirmAction(this.dialog, {
      title: 'links.endTitle',
      message: 'links.endClientMessage',
      confirm: 'links.end',
      params: { name: link.farmerName },
    }).subscribe(async (confirmed) => {
      if (confirmed) this.actionError.set(!(await this.links.revoke(link.id)));
    });
  }
}
