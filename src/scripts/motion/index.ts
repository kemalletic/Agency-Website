import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { initSmoothScroll } from './lenis';
import { initReveals } from './reveal';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

type Cleanup = () => void;

async function boot(): Promise<void> {
  await document.fonts.ready;
  const root = document.documentElement;

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Un-hide reveal targets in the same task in which the modules set their start states (no flash).
    root.classList.add('motion-ready');
    const cleanups: Cleanup[] = [initSmoothScroll(), initReveals()];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });

  root.classList.add('motion-ready');
  ScrollTrigger.refresh();
}

void boot();
