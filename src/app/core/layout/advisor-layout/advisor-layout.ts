import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { TranslatePipe } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';
import { LanguageSwitcher } from '../../../shared/components/language-switcher';

@Component({
  selector: 'app-advisor-layout',
  imports: [RouterOutlet, MatToolbarModule, MatButtonModule, TranslatePipe, LanguageSwitcher],
  templateUrl: './advisor-layout.html',
  styleUrl: './advisor-layout.scss',
})
export class AdvisorLayout {
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  logout(): void {
    this.auth.logout();
    void this.router.navigate(['/auth/login']);
  }
}
