import { afterNextRender, DestroyRef, Directive, ElementRef, inject } from '@angular/core';

/**
 * Reveals a card with a short rise when it enters the screen (Style Guidelines 5.1: 750–900 ms,
 * small vertical offset). Cards already on screen rise on load; cards below wait until the
 * person scrolls to them. With `prefers-reduced-motion`, or without IntersectionObserver,
 * nothing is hidden or moved.
 */
@Directive({ selector: '[appReveal]', host: { class: 'reveal' } })
export class Reveal {
  constructor() {
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const view = element.ownerDocument.defaultView;
      if (
        !view ||
        typeof view.IntersectionObserver !== 'function' ||
        view.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      )
        return;
      if (element.getBoundingClientRect().top < view.innerHeight) {
        element.classList.add('reveal-in');
        return;
      }
      element.classList.add('reveal-wait');
      const observer = new view.IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          element.classList.replace('reveal-wait', 'reveal-in');
          observer.disconnect();
        },
        { rootMargin: '0px 0px -8% 0px' },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
