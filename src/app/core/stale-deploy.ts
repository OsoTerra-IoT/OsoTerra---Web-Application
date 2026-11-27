import { LocationStrategy } from '@angular/common';
import { inject } from '@angular/core';
import { NavigationError } from '@angular/router';

/** How a lazy chunk that failed to load reads in Chromium, Firefox and Safari. */
const STALE_CHUNK =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
const LAST_RELOAD_KEY = 'osoterra.staleChunkReload';
/** A second failure this soon after a reload is not a stale tab, so it is left alone. */
const RELOAD_COOLDOWN_MS = 60_000;
/** `main-<hash>.js`, the name the production build gives its entry script. */
const MAIN_SCRIPT = /main-([A-Za-z0-9_-]+)\.js/;

/**
 * The hash in the name of the build's main script, which changes with every build whose code
 * changes; empty in development. Added to the translation URLs, it keeps a new build from
 * reading the translations of the previous one that the browser still caches (GitHub Pages
 * sends max-age=600), which showed raw keys for the texts the new build added.
 */
export function buildStamp(
  scripts: ArrayLike<Pick<Element, 'getAttribute'>> = document.querySelectorAll('script[src]'),
): string {
  for (const script of Array.from(scripts)) {
    const match = MAIN_SCRIPT.exec(script.getAttribute('src') ?? '');
    if (match) return match[1];
  }
  return '';
}

/**
 * A tab opened before a new deploy asks for lazy chunks that the new build no longer has, and
 * every navigation to a lazy page then fails without a word. This handler for
 * `withNavigationErrorHandler` loads the requested page again, so the tab picks up the new
 * build; it reloads at most once a minute, so a chunk that is really missing cannot loop.
 */
export function reloadOnStaleChunk(
  reload: (url: string) => void = (url) => window.location.assign(url),
  now: () => number = Date.now,
): (event: NavigationError) => void {
  return (event) => {
    const error = event.error as { message?: unknown } | null | undefined;
    if (!STALE_CHUNK.test(String(error?.message ?? event.error))) return;
    try {
      if (now() - Number(sessionStorage.getItem(LAST_RELOAD_KEY) ?? 0) < RELOAD_COOLDOWN_MS) return;
      sessionStorage.setItem(LAST_RELOAD_KEY, String(now()));
    } catch {
      // Without storage a reload could not be told from a loop, so the error stays as it was.
      return;
    }
    reload(inject(LocationStrategy).prepareExternalUrl(event.url));
  };
}
