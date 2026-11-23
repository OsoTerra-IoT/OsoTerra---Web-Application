import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LocaleService } from '../../core/i18n/locale.service';
import { SalinityAlert } from '../../core/models';

/**
 * What to do about an alert, in plain words (US33), and a link that shares it by WhatsApp so the
 * farmer can coordinate with family or the advisor (US34). The reading is shown in dS/m next to
 * the crop threshold, as the validation interviews asked.
 */
@Component({
  selector: 'app-alert-guidance',
  imports: [MatIconModule, TranslatePipe],
  template: `
    <div class="alert-guidance">
      <p class="alert-guidance-reading">
        {{
          'alerts.reading'
            | translate
              : {
                  value: locale.ece(alert().conductivityDsM),
                  threshold: locale.ece(alert().thresholdDsM),
                }
        }}
      </p>
      <p>
        <strong>{{ 'alerts.whatToDo' | translate }}</strong>
        {{ 'alerts.recommendation.' + alert().severity | translate }}
      </p>
      <a
        class="alert-guidance-share"
        [href]="shareUrl()"
        target="_blank"
        rel="noopener noreferrer"
        [attr.aria-label]="'alerts.shareLabel' | translate: { plot: plotName() }"
      >
        <mat-icon aria-hidden="true">share</mat-icon>{{ 'alerts.share' | translate }}
      </a>
    </div>
  `,
  styles: `
    .alert-guidance p {
      margin: 0.25rem 0;
    }
    .alert-guidance-reading {
      font-variant-numeric: tabular-nums;
    }
    .alert-guidance-share {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      min-block-size: 44px;
    }
  `,
})
export class AlertGuidance {
  readonly alert = input.required<SalinityAlert>();
  readonly plotName = input('');
  readonly locale = inject(LocaleService);
  private readonly translate = inject(TranslateService);

  /** Message for WhatsApp; wa.me lets the user pick the contact, so no number is stored. */
  readonly shareText = computed(() => {
    const alert = this.alert();
    // Read the language so the text is rebuilt when the user switches it.
    this.locale.locale();
    return this.translate.instant('alerts.shareText', {
      plot: this.plotName(),
      level: this.translate.instant('severity.' + alert.severity),
      value: this.locale.ece(alert.conductivityDsM),
      threshold: this.locale.ece(alert.thresholdDsM),
      date: this.locale.date(alert.createdAt),
      action: this.translate.instant('alerts.recommendation.' + alert.severity),
    });
  });

  readonly shareUrl = computed(() => `https://wa.me/?text=${encodeURIComponent(this.shareText())}`);
}
