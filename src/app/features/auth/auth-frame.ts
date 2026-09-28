import { Component, inject } from '@angular/core';
import { UI_IMPORTS } from '../../shared/ui-imports';
import { LanguageSwitcher } from '../../shared/components/language-switcher';
import { LocaleService } from '../../core/i18n/locale.service';
@Component({
  selector: 'app-auth-frame',
  imports: [...UI_IMPORTS, LanguageSwitcher],
  templateUrl: './auth-frame.html',
})
export class AuthFrame {
  readonly locale = inject(LocaleService);
}
