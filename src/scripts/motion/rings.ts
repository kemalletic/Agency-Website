import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isSoftwareRenderer, rendererName } from '../../lib/rings/gpu';
import { pinLength } from '../../lib/rings/layout';

interface Handle {
  dispose(): void;
}

/** Resolves once the page has loaded. */
const loaded = (): Promise<void> =>
  document.readyState === 'complete' ? Promise.resolve() : new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));

/** Resolves when the main thread is idle, half a second at the latest (so the intro follows the headline). */
const idle = (): Promise<void> =>
  new Promise((resolve) => {
    // Safari has no requestIdleCallback; a short timeout is close enough there.
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve(), { timeout: 500 });
    else window.setTimeout(resolve, 200);
  });

/**
 * Asks a worker whether WebGL2 runs on a real GPU: true, false, or null when it cannot tell. The worker also takes the
 * GPU's first WebGL set-up — a synchronous wait of up to ~100 ms — off the main thread.
 */
function probeGpu(): Promise<boolean | null> {
  if (typeof OffscreenCanvas !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('../rings/gpu-probe.ts', import.meta.url), { type: 'module' });
    } catch {
      resolve(null);
      return;
    }
    const finish = (verdict: boolean | null): void => {
      window.clearTimeout(timer);
      worker.terminate();
      resolve(verdict);
    };
    const timer = window.setTimeout(() => finish(null), 2000);
    worker.onmessage = (event: MessageEvent<boolean | null>) => finish(event.data);
    worker.onerror = () => finish(null);
  });
}

/** A WebGL2 context on a real GPU, or null (the page's own check, and the only one where workers cannot tell). */
function fastContext(canvas: HTMLCanvasElement): WebGL2RenderingContext | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  if (!gl) return null;
  if (!isSoftwareRenderer(rendererName(gl))) return gl;
  gl.getExtension('WEBGL_lose_context')?.loseContext();
  return null;
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

  const wide = window.matchMedia('(min-width: 64rem)');
  const pin = ScrollTrigger.create({
    trigger: grid,
    pin: true,
    // Centred when the grid fits the viewport; otherwise its top — stage, label and lead — stays in view.
    start: () => (grid.offsetHeight <= window.innerHeight - 32 ? 'center center' : 'top top+=16'),
    end: () => `+=${Math.round(window.innerHeight * pinLength(wide.matches))}`,
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

  const launch = async (): Promise<void> => {
    await loaded();
    if (done) return;
    // Without a fast GPU three.js is never downloaded: a software renderer found by the worker ends it here.
    if ((await probeGpu()) === false) return giveUp();
    await idle();
    if (done) return;
    const canvas = document.createElement('canvas');
    const context = fastContext(canvas);
    if (!context) return giveUp();
    const intro = root.dataset.rings === 'pending';
    const { startRings } = await import('../rings/index');
    const started = await startRings({ pin, intro, canvas, context, onLost: () => giveUp() });
    if (done) {
      started.dispose();
      return;
    }
    handle = started;
    root.dataset.rings = 'live';
  };
  launch().catch(giveUp);

  return () => {
    handle?.dispose();
    handle = null;
    if (!done) root.dataset.rings = 'off';
    done = true;
    root.classList.remove('is-pinned');
  };
}
