import { Component } from '@angular/core';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { AuthFrame } from '../auth-frame';
@Component({
  selector: 'app-role-selection',
  imports: [...UI_IMPORTS, AuthFrame],
  templateUrl: './role-selection.html',
})
export class RoleSelection {
  readonly roles = [
    {
      value: 'farmer',
      icon: 'agriculture',
      title: 'auth.farmerTitle',
      description: 'auth.farmerDescription',
    },
    {
      value: 'advisor',
      icon: 'science',
      title: 'auth.advisorTitle',
      description: 'auth.advisorDescription',
    },
  ];
}
