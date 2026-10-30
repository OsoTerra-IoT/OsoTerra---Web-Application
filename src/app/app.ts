import { Component, inject } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { RouterOutlet } from '@angular/router';
import { DemoBar } from './core/demo/demo-bar/demo-bar';
import { DemoModeService } from './core/demo/demo-mode.service';
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DemoBar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  /** The interview demo bar shows only in demo mode (`?demo=1`). */
  readonly demoActive = inject(DemoModeService).active;
  constructor() {
    inject(MatIconRegistry).setDefaultFontSetClass('material-icons-outlined');
  }
}
