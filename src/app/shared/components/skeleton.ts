import { Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';

/** Grey placeholders with the shape of the content while the API answers. */
@Component({
  selector: 'app-skeleton',
  imports: [TranslatePipe],
  template: `<div class="skeleton" [class]="'skeleton skeleton-' + variant()" role="status">
    <span class="sr-only">{{ 'common.loading' | translate }}</span>
    @for (row of rowList(); track row) {
      <div class="skeleton-item" aria-hidden="true">
        <span class="skeleton-line is-title"></span>
        <span class="skeleton-line is-text"></span>
        <span class="skeleton-line is-bar"></span>
      </div>
    }
  </div>`,
})
export class Skeleton {
  readonly rows = input(3);
  /** `strip` for the salinity strips of the home pages, `card` for card grids. */
  readonly variant = input<'strip' | 'card'>('strip');
  readonly rowList = computed(() => Array.from({ length: this.rows() }, (_, index) => index));
}
