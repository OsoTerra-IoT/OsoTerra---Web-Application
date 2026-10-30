import { DOCUMENT } from '@angular/common';
import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { demoScenario, DemoScenarioId } from './demo-scenarios';

export const DEMO_MODE_KEY = 'osoterra.demo';
export const DEMO_SCENARIO_KEY = 'osoterra.demo.scenario';
export const DEMO_COLLAPSED_KEY = 'osoterra.demo.collapsed';
/** Session token key of {@link SessionTokenStore}; a demo token means nothing to the Backend. */
const SESSION_KEY = 'osoterra.session';

/**
 * Decides whether this tab runs the interview demo: `?demo=1` turns it on and the tab
 * remembers it in session storage until `?demo=0`; the `demoMode` environment flag turns it
 * on for a whole build. Leaving the demo forgets its scenario and its signed-in session.
 */
export function resolveDemoMode(
  environmentFlag: boolean,
  search: string,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
): boolean {
  const requested = new URLSearchParams(search).get('demo');
  try {
    if (requested === '1') storage?.setItem(DEMO_MODE_KEY, '1');
    if (requested === '0' && storage?.getItem(DEMO_MODE_KEY)) {
      for (const key of [DEMO_MODE_KEY, DEMO_SCENARIO_KEY, DEMO_COLLAPSED_KEY, SESSION_KEY])
        storage.removeItem(key);
    }
    return environmentFlag || requested === '1' || storage?.getItem(DEMO_MODE_KEY) === '1';
  } catch {
    // Storage disabled: the URL alone decides, for this page load.
    return environmentFlag || requested === '1';
  }
}

/** Interview demo mode of this tab and the scenario it shows. */
@Injectable({ providedIn: 'root' })
export class DemoModeService {
  private readonly storage = storageOf(inject(DOCUMENT).defaultView);
  readonly active = resolveDemoMode(
    environment.demoMode,
    inject(DOCUMENT).defaultView?.location.search ?? '',
    this.storage,
  );
  private readonly current = signal<DemoScenarioId | null>(this.active ? this.stored() : null);
  /** Scenario loaded in this tab, kept across reloads. */
  readonly scenario = this.current.asReadonly();
  readonly collapsed = signal(this.active && this.read(DEMO_COLLAPSED_KEY) === '1');

  select(id: DemoScenarioId): void {
    this.current.set(id);
    this.write(DEMO_SCENARIO_KEY, String(id));
  }

  setCollapsed(collapsed: boolean): void {
    this.collapsed.set(collapsed);
    this.write(DEMO_COLLAPSED_KEY, collapsed ? '1' : null);
  }

  private stored(): DemoScenarioId | null {
    return demoScenario(Number(this.read(DEMO_SCENARIO_KEY)))?.id ?? null;
  }

  private read(key: string): string | null {
    try {
      return this.storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  private write(key: string, value: string | null): void {
    try {
      if (value === null) this.storage?.removeItem(key);
      else this.storage?.setItem(key, value);
    } catch {
      // Keep the in-memory state only.
    }
  }
}

function storageOf(view: Window | null): Storage | null {
  try {
    return view?.sessionStorage ?? null;
  } catch {
    return null;
  }
}
