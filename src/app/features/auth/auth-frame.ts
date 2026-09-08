import { Component } from '@angular/core';
import { UI_IMPORTS } from '../../shared/ui-imports';
import { LanguageSwitcher } from '../../shared/components/language-switcher';
@Component({
  selector: 'app-auth-frame',
  imports: [...UI_IMPORTS, LanguageSwitcher],
  templateUrl: './auth-frame.html',
})
export class AuthFrame {}
