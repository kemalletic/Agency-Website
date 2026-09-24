import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { initContact } from './contact';
import { initHeader } from './header';
import { initSmoothScroll } from './lenis';
import { initMagnetic } from './magnetic';
import { initPrinciples } from './principles';
import { initProcess } from './process';
import { initRings } from './rings';
import { initReveals } from './reveal';
import { initServices } from './services';
import { initWork } from './work';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

type Cleanup = () => void;

async function boot(): Promise<void> {
  await document.fonts.ready;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initHeader({ allowHide: !reduced });
  initServices({ animated: !reduced });

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Un-hide reveal targets in the same task in which the modules set their start states (no flash).
    root.classList.add('motion-ready');
    const cleanups: Cleanup[] = [
      initSmoothScroll(),
      initRings(),
      initReveals(),
      initWork(),
      initProcess(),
      initPrinciples(),
      initContact(),
      initMagnetic(),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });

  root.classList.add('motion-ready');
  ScrollTrigger.refresh();
  holdHashTarget();
}

/**
 * The browser jumps to a deep-linked section (#contact, #process…) before this script runs; the pins created above
 * it then push it down, and later layout moves it again (refreshes, the rings dropping their pin where WebGL is too
 * slow). Keep the reader on the section they asked for, frame by frame, until they scroll themselves (or for five
 * seconds).
 */
function holdHashTarget(): void {
  const id = decodeURIComponent(window.location.hash.slice(1));
  const target = id ? document.getElementById(id) : null;
  if (!target) return;
  const until = performance.now() + 5000;
  const inputs = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  let held = true;
  const release = (): void => {
    held = false;
    for (const type of inputs) window.removeEventListener(type, release);
  };
  const align = (): void => {
    if (!held || performance.now() > until) return release();
    const padding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const y = Math.min(target.getBoundingClientRect().top + window.scrollY - padding, max);
    if (Math.abs(y - window.scrollY) > 1) window.scrollTo({ top: y, behavior: 'instant' });
    requestAnimationFrame(align);
  };
  for (const type of inputs) window.addEventListener(type, release, { passive: true });
  align();
}

void boot();
