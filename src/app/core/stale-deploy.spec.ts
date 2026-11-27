import { APP_BASE_HREF } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NavigationError, provideRouter } from '@angular/router';
import { buildStamp, reloadOnStaleChunk } from './stale-deploy';

describe('reloadOnStaleChunk', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: APP_BASE_HREF, useValue: '/OsoTerra---Web-Application/' },
      ],
    });
  });
  const failure = (message: string, url = '/app/plots') =>
    new NavigationError(1, url, new TypeError(message));
  const handle = (handler: (event: NavigationError) => void, event: NavigationError) =>
    TestBed.runInInjectionContext(() => handler(event));

  it('loads the requested page again when a chunk of an older build is gone', () => {
    const reload = vi.fn();
    let time = 1_000_000;
    const handler = reloadOnStaleChunk(reload, () => time);
    handle(handler, failure('Failed to fetch dynamically imported module: https://x/chunk-A.js'));
    expect(reload).toHaveBeenCalledWith('/OsoTerra---Web-Application/app/plots');
    // Failing again right after the reload is not a stale tab: no reload loop.
    handle(handler, failure('Failed to fetch dynamically imported module: https://x/chunk-A.js'));
    expect(reload).toHaveBeenCalledTimes(1);
    time += 61_000;
    handle(handler, failure('error loading dynamically imported module: https://x/chunk-B.js'));
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('reads the build stamp from the main script name', () => {
    const script = (src: string) => ({ getAttribute: () => src });
    expect(buildStamp([])).toBe('');
    expect(buildStamp([script('polyfills-ABC.js'), script('main-I6Y22RJL.js')])).toBe('I6Y22RJL');
    expect(buildStamp([script('main.js')])).toBe('');
  });

  it('leaves other navigation errors alone', () => {
    const reload = vi.fn();
    handle(reloadOnStaleChunk(reload), failure("Cannot match any routes. URL Segment: 'x'"));
    expect(reload).not.toHaveBeenCalled();
  });
});
