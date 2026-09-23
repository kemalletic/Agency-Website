import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface Handle {
  dispose(): void;
}

/** Runs `run` once the page has loaded and the main thread is idle (half a second at the latest, so the intro follows the headline). */
function whenIdle(run: () => void): () => void {
  let idle = 0;
  let timer = 0;
  const schedule = (): void => {
    // Safari has no requestIdleCallback; a short timeout after load is close enough there.
    if (typeof requestIdleCallback === 'function') idle = requestIdleCallback(run, { timeout: 500 });
    else timer = window.setTimeout(run, 200);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    window.removeEventListener('load', schedule);
    if (idle) window.cancelIdleCallback(idle);
    window.clearTimeout(timer);
  };
}

/**
 * The rings set piece (spec §9). Pins the approach grid for the "take one away" sequence, then brings in the WebGL
 * scene once the page is idle. Runs only where the head script expected 3D (html[data-rings]); on any failure the
 * posters stay, the pin goes and the reader keeps their place.
 */
export function initRings(): () => void {
  const root = document.documentElement;
  if (root.dataset.rings !== 'pending' && root.dataset.rings !== 'poster') return () => {};
  const grid = document.querySelector<HTMLElement>('#approach .approach-grid');
  if (!grid) return () => {};

  // Software rendering (and three.js' download) is not worth it: decide before pinning or importing anything.
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  if (!context) {
    root.dataset.rings = 'off';
    return () => {};
  }

  const wide = window.matchMedia('(min-width: 64rem)');
  const pin = ScrollTrigger.create({
    trigger: grid,
    pin: true,
    // Centred when the grid fits the viewport; otherwise its top — stage, label and lead — stays in view.
    start: () => (grid.offsetHeight <= window.innerHeight - 32 ? 'center center' : 'top top+=16'),
    end: () => `+=${Math.round(window.innerHeight * (wide.matches ? 2.2 : 1.6))}`,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onToggle: (self) => root.classList.toggle('is-pinned', self.isActive),
  });

  let handle: Handle | null = null;
  let done = false;

  const giveUp = (error?: unknown): void => {
    if (done) return;
    done = true;
    if (import.meta.env.DEV && error) console.warn('rings: staying with posters', error);
    handle?.dispose();
    handle = null;
    root.dataset.rings = 'off';
    // Without the rings the pinned stretch would scroll past a still picture: drop it, keep the reader's place.
    const { start, end } = pin;
    const y = window.scrollY;
    pin.kill(true);
    root.classList.remove('is-pinned');
    ScrollTrigger.refresh();
    if (y > end) window.scrollTo(0, y - (end - start));
    else if (y > start) window.scrollTo(0, start);
  };

  const cancel = whenIdle(() => {
    if (done) return;
    const intro = root.dataset.rings === 'pending';
    import('../rings/index')
      .then(({ startRings }) => startRings({ pin, intro, canvas, context, onLost: () => giveUp() }))
      .then((started) => {
        if (done) {
          started.dispose();
          return;
        }
        handle = started;
        root.dataset.rings = 'live';
      })
      .catch(giveUp);
  });

  return () => {
    cancel();
    handle?.dispose();
    handle = null;
    if (!done) root.dataset.rings = 'off';
    done = true;
    root.classList.remove('is-pinned');
  };
}
