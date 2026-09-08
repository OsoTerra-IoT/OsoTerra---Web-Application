import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AuthService, DEMO_USERS } from '../../core/auth/auth.service';
import { UI_IMPORTS } from '../../shared/ui-imports';
import { LanguageSwitcher } from '../../shared/components/language-switcher';
@Component({
  selector: 'app-account',
  imports: [...UI_IMPORTS, LanguageSwitcher],
  templateUrl: './account.html',
})
export class Account {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly page = this.route.snapshot.data['page'] as string;
  readonly title = this.route.snapshot.data['breadcrumb'] as string;
  readonly advisor = (() => {
    const user = this.auth.user();
    return user?.role === 'Farmer'
      ? DEMO_USERS.find((advisor) => advisor.id === user.advisorId)
      : undefined;
  })();
}
