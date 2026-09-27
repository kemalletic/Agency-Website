import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

let active: Lenis | null = null;

/** The running smooth scroller, if any (none on touch screens or with reduced motion). */
export const smoothScroller = (): Lenis | null => active;

/**
 * Smooth wheel scrolling for mouse and trackpad users; touch keeps native scrolling.
 * Lenis already subtracts html's scroll-padding-top (the header height) for element targets.
 */
export function initSmoothScroll(): () => void {
  if (!window.matchMedia('(pointer: fine)').matches) return () => {};

  // lerp 0.16 (default 0.1): the glide after the wheel stops settles in about half a second instead of three quarters.
  const lenis = new Lenis({ lerp: 0.5, autoRaf: false, autoToggle: true, stopInertiaOnNavigate: true });
  active = lenis;
  const tick = (time: number): void => lenis.raf(time * 1000);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // Same-page links glide to their target, then move focus there like a native jump does.
  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const id = decodeURIComponent(link.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (id && !target) return;
    event.preventDefault();
    history.pushState(null, '', link.hash || '#');
    // Measure from the live scroll position so a native scroll Lenis has not seen yet cannot skew the target.
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const y = target ? target.getBoundingClientRect().top + window.scrollY - padding : 0;
    lenis.scrollTo(y, {
      force: true,
      onComplete: () => {
        if (!target) return;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      },
    });
  };
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    gsap.ticker.remove(tick);
    if (active === lenis) active = null;
    lenis.destroy();
  };
}
