import { API_CONFIG } from '../../core/api/api-config';
import { Component, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AdvisoryLinkService } from '../../core/data/advisory-link.service';
import { LocaleService } from '../../core/i18n/locale.service';
import { AdvisoryLink } from '../../core/models';
import { confirmAction } from '../../shared/components/confirm-dialog';
import { UI_IMPORTS } from '../../shared/ui-imports';
import { LanguageSwitcher } from '../../shared/components/language-switcher';
@Component({
  selector: 'app-account',
  imports: [...UI_IMPORTS, LanguageSwitcher],
  templateUrl: './account.html',
})
export class Account {
  /** Demo labels only when the in-browser fake API answers, never on real data. */
  readonly demo = inject(API_CONFIG).useFakeApi;
  readonly auth = inject(AuthService);
  readonly locale = inject(LocaleService);
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  readonly page = this.route.snapshot.data['page'] as string;
  readonly title = this.route.snapshot.data['breadcrumb'] as string;
  /** Advisory links of the farmer, only needed on the "My advisor" page. */
  readonly links = this.page === 'advisor' ? inject(AdvisoryLinkService) : undefined;
  /** Id of the link being answered, so its buttons wait for the API. */
  readonly answering = signal('');
  readonly actionError = signal(false);

  /** The advisor's account, for the professional license shown with an accepted link. */
  advisor(link: AdvisoryLink) {
    const advisor = this.auth.findUser(link.advisorId);
    return advisor?.role === 'Advisor' ? advisor : undefined;
  }

  accept(link: AdvisoryLink) {
    return this.run(link, () => this.links!.accept(link.id));
  }
  decline(link: AdvisoryLink) {
    return this.run(link, () => this.links!.revoke(link.id));
  }
  endSupervision(link: AdvisoryLink) {
    confirmAction(this.dialog, {
      title: 'links.endTitle',
      message: 'links.endAdvisorMessage',
      confirm: 'links.endAdvisor',
      params: { name: link.advisorName },
    }).subscribe((confirmed) => {
      if (confirmed) void this.run(link, () => this.links!.revoke(link.id));
    });
  }

  private async run(link: AdvisoryLink, command: () => Promise<boolean>) {
    this.answering.set(link.id);
    this.actionError.set(false);
    this.actionError.set(!(await command()));
    this.answering.set('');
  }
}
