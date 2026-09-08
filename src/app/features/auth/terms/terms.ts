import { Component } from '@angular/core';
import { UI_IMPORTS } from '../../../shared/ui-imports';
import { AuthFrame } from '../auth-frame';
@Component({
  selector: 'app-terms',
  imports: [...UI_IMPORTS, AuthFrame],
  templateUrl: './terms.html',
})
export class Terms {}
