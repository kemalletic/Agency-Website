import { smoothScroller } from './lenis';

/** Keys that scroll the page; pressing one lets go of a hold, so the keyboard is never held up. */
const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

/** A pause in wheel events longer than this (ms) ends the gesture that brought the page here; the next one is new. */
const GESTURE_GAP = 180;

/**
 * However long that gesture keeps coming, it is let through after this (ms): long enough for a trackpad's momentum or
 * a flung wheel to die down, short enough that a wheel spinning on and on is not held for ever.
 */
const MAX_CATCH = 2500;

// When the reader last scrolled by hand (wheel or finger), so links and other programmatic scrolls are never caught.
let lastInput = -Infinity;
const onInput = (): void => {
  lastInput = performance.now();
};
window.addEventListener('wheel', onInput, { capture: true, passive: true });
window.addEventListener('touchmove', onInput, { capture: true, passive: true });

/** Whether the page is moving because of the reader's own scrolling (wheel, finger or its momentum). */
export const scrollingByHand = (): boolean => performance.now() - lastInput < 1500;

/** Where the page is heading: Lenis's target while it glides, else where it is. */
export const scrollHeading = (): number => smoothScroller()?.targetScroll ?? window.scrollY;

/**
 * Stops a scroll at position `y` — however hard the wheel was flung, the page comes to rest there — until the returned
 * release is called. Only the rest of the gesture that brought it here is caught: the next scroll, a scroll key or
 * the scrollbar carries on at once, and scrolling back up always does.
 */
export function holdScroll(y: number): () => void {
  const until = performance.now() + MAX_CATCH;
  // The gesture that brought the page here is still coming in.
  let lastWheel = performance.now();
  // Like a pin, the hold keeps the header away (header.ts), whichever way the page settles onto `y`.
  const root = document.documentElement;
  root.classList.add('is-pinned');
  const lenis = smoothScroller();
  // Lenis turns its glide towards `y` and eases into it, rather than passing and coming back.
  if (lenis) lenis.scrollTo(y, { force: true });
  else window.scrollTo({ top: y, behavior: 'smooth' });

  // These listen on window in the capture phase, so they run before Lenis (on window, bubbling) and the browser.
  const onWheel = (event: WheelEvent): void => {
    if (event.ctrlKey) return;
    const now = performance.now();
    if (event.deltaY < 0 || now - lastWheel > GESTURE_GAP || now > until) return release();
    lastWheel = now;
    event.preventDefault();
    event.stopPropagation();
  };
  // On touch screens a new touch is always a new gesture.
  const onTouch = (): void => release();
  const onKey = (event: KeyboardEvent): void => {
    if (SCROLL_KEYS.has(event.key)) release();
  };
  const onPointer = (event: PointerEvent): void => {
    // Past the layout width is the scrollbar.
    if (event.clientX >= document.documentElement.clientWidth) release();
  };

  const capture = { capture: true, passive: false } as const;
  window.addEventListener('wheel', onWheel, capture);
  window.addEventListener('touchstart', onTouch, { capture: true, passive: true });
  window.addEventListener('keydown', onKey, { capture: true });
  window.addEventListener('pointerdown', onPointer, { capture: true });

  let held = true;
  function release(): void {
    if (!held) return;
    held = false;
    root.classList.remove('is-pinned');
    window.removeEventListener('wheel', onWheel, capture);
    window.removeEventListener('touchstart', onTouch, { capture: true });
    window.removeEventListener('keydown', onKey, { capture: true });
    window.removeEventListener('pointerdown', onPointer, { capture: true });
  }
  return release;
}
