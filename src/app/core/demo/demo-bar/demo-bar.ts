import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { DemoModeService } from '../demo-mode.service';
import { DemoScenarioService } from '../demo-scenario.service';
import { DEMO_SCENARIOS, demoScenario, DemoScenario } from '../demo-scenarios';

/**
 * Fixed bar of the interview demo: the moderator presses a scenario number to load it, or the
 * same number again to start it over. It shows only while the tab runs the demo.
 */
@Component({
  selector: 'app-demo-bar',
  imports: [MatIconModule, MatTooltipModule, TranslatePipe],
  templateUrl: './demo-bar.html',
  styleUrl: './demo-bar.scss',
})
export class DemoBar {
  readonly demo = inject(DemoModeService);
  readonly scenarios = inject(DemoScenarioService);
  readonly options = DEMO_SCENARIOS;
  readonly current = computed(() => {
    const id = this.demo.scenario();
    return id ? demoScenario(id) : undefined;
  });

  load(scenario: DemoScenario): void {
    void this.scenarios.load(scenario.id);
  }

  toggle(): void {
    this.demo.setCollapsed(!this.demo.collapsed());
  }
}
