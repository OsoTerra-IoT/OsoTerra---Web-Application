import { Component, inject } from '@angular/core';
import { LocaleService } from '../../core/i18n/locale.service';
import { UI_IMPORTS } from '../ui-imports';
@Component({
  selector: 'app-language-switcher',
  imports: [...UI_IMPORTS],
  templateUrl: './language-switcher.html',
})
export class LanguageSwitcher {
  readonly locale = inject(LocaleService);
  change(event: Event) {
    void this.locale.setLocale(
      (event.target as HTMLSelectElement).value === 'es_419' ? 'es_419' : 'en_US',
    );
  }
}
