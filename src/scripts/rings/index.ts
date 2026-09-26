import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WebGLRenderer } from 'three';
import { INTRO, PLAY, SPIN_SPEED } from '../../lib/rings/config';
import { mixStages, playTime, progressAt, sequenceAt, stageInView, type ScrollRange, type Stage } from '../../lib/rings/layout';
import { damp } from '../../lib/rings/math';
import { holdScroll, scrollHeading, scrollingByHand } from '../motion/hold';
import { smoothScroller } from '../motion/lenis';
import { heroOrientation, nearestSymmetry, RING_KEYS, storyState } from '../../lib/rings/story';
import { tokenColors } from './materials';
import { createOverlay } from './overlay';
import { createPointer } from './pointer';
import { createRingsScene, QUALITY, type RingsScene, type Viewport } from './scene';

export interface RingsOptions {
  /** ScrollTrigger on the approach grid; the knot docks at its start (created by scripts/motion/rings.ts). */
  dock: ScrollTrigger;
  /** Assemble the knot in the hero — only when no poster was on screen first. */
  intro: boolean;
  /** Called once if the GPU drops the WebGL context. */
  onLost: () => void;
  /** Canvas with a WebGL2 context already created by the loader (who checked it is fast enough). */
  canvas: HTMLCanvasElement;
  context: WebGL2RenderingContext;
}

export interface RingsHandle {
  dispose(): void;
}

/** Most pixels the canvas may have, so large or dense screens never render 4K frames for three rings. */
const MAX_PIXELS = 5_000_000;

/** Lets the browser paint and handle input between the heavier start-up steps, so none becomes a long task. */
const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Starts the live rings; resolves after the first frame is on the canvas, rejects if WebGL is unsuitable. */
export async function startRings({ dock, intro, onLost, canvas, context }: RingsOptions): Promise<RingsHandle> {
  const heroStage = document.querySelector<HTMLElement>('[data-stage="hero"]');
  const approachStage = document.querySelector<HTMLElement>('[data-stage="approach"]');
  const section = document.getElementById('approach');
  if (!heroStage || !approachStage || !section) throw new Error('rings: stage markup missing');

  const low = window.matchMedia('(max-width: 47.99rem), (pointer: coarse)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  canvas.className = 'rings-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  const rings = await createRingsScene(renderer, tokenColors(), low ? QUALITY.low : QUALITY.high, breathe).catch((error: unknown) => {
    renderer.dispose();
    throw error;
  });
  await breathe();
  document.body.append(canvas);
  const overlay = createOverlay();
  const pointer = createPointer(heroStage);

  // Singling out a ring in the docked view: the mouse over the approach stage is hit-tested against the rings every
  // frame it moves or they do; a tap on a ring, label or ring word picks one (see overlay.ts).
  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  let docked = false;
  let aim: { x: number; y: number } | null = null;
  let aimStale = false;
  const onAim = (event: PointerEvent): void => {
    if (event.pointerType !== 'mouse') return;
    const over = event.target instanceof Element && event.target.closest('[data-stage="approach"]');
    aim = over ? { x: event.clientX, y: event.clientY } : null;
    aimStale = true;
  };
  const onAimOut = (): void => {
    aim = null;
    aimStale = true;
  };
  const pickAt = (x: number, y: number): ReturnType<RingsScene['pick']> =>
    painted && viewport.width > 0 && viewport.height > 0 ? rings.pick(x / viewport.width, y / viewport.height) : null;
  const onTap = (event: MouseEvent): void => {
    if (hoverable || !docked) return;
    const target = event.target instanceof Element ? event.target : null;
    const named = target?.closest<HTMLElement>('#approach [data-ring]')?.dataset.ring;
    const ring = RING_KEYS.find((key) => key === named) ?? (target?.closest('[data-stage="approach"]') ? pickAt(event.clientX, event.clientY) : null);
    overlay.tap(ring);
  };

  let viewport: Viewport = { width: 0, height: 0 };
  let last: number[] | null = null;
  const resize = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    // On touch screens a height-only change under 120 px is browser chrome, not a new layout.
    const chrome = coarse && width === viewport.width && Math.abs(height - viewport.height) < 120;
    if ((width === viewport.width && height === viewport.height) || chrome) return;
    viewport = { width, height };
    const cap = low ? 1.5 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap, Math.sqrt(MAX_PIXELS / Math.max(width * height, 1))));
    renderer.setSize(width, height, false);
    last = null;
  };

  // Stage geometry in page coordinates, measured again whenever ScrollTrigger refreshes (resize, fonts, pins).
  let hero: Stage = { x: 0, y: 0, size: 0 };
  let approach: Stage = { x: 0, y: 0, size: 0 };
  let journeyRange: ScrollRange = { start: 0, end: 0 };
  const measure = (): void => {
    const scroll = window.scrollY;
    // The box centre and offsetWidth ignore the hero's CSS scale-in, so measuring during it is still exact.
    const heroBox = heroStage.getBoundingClientRect();
    hero = { x: heroBox.left + heroBox.width / 2, y: heroBox.top + heroBox.height / 2 + scroll, size: heroStage.offsetWidth };
    const stageBox = approachStage.getBoundingClientRect();
    approach = { x: stageBox.left + stageBox.width / 2, y: stageBox.top + scroll + stageBox.height / 2, size: approachStage.offsetWidth };
    // The knot sets off as the approach section's top enters the viewport and docks where the dock trigger starts.
    journeyRange = { start: Math.max(0, section.getBoundingClientRect().top + scroll - window.innerHeight), end: dock.start };
    last = null;
  };

  let clock = 0;
  let introAt: number | null = null;
  let spin = 0;
  let spinRate = 0;
  // The "take one away" sequence plays by itself, by time, once a page view: from when the knot has (all but) docked
  // with its stage on screen. Heading back while it plays, the knot comes together again on the way, by scroll
  // (`leaving`). With a mouse or trackpad, the first scroll down that would carry past the dock stops there, however
  // hard it was flung (motion/hold.ts; the next scroll carries on at once).
  let sequence = 0;
  let dockedAt: number | null = null;
  let leaving: { from: number; forward: boolean } | null = null;
  let lastScroll = -1;
  let release: (() => void) | null = null;
  let rested = false;
  let symmetry = -1;
  let painted = false;

  const frame = (dt: number): void => {
    clock += dt;
    const scroll = window.scrollY;
    const journey = progressAt(scroll, journeyRange.start, journeyRange.end);
    pointer.update(dt, journey === 0);
    const introTime = introAt === null ? Infinity : clock - introAt;
    // Idle spin only in the hero, after the intro, easing in and out.
    spinRate = damp(spinRate, journey === 0 && introTime >= INTRO.duration ? SPIN_SPEED : 0, 2.5, dt);
    spin += spinRate * dt + pointer.takeSpin();
    // Latch the nearest approach orientation as the knot leaves the hero, so the turn never flips mid-way.
    if (journey === 0) symmetry = -1;
    else if (symmetry < 0) symmetry = nearestSymmetry(heroOrientation(spin, pointer.tilt));
    // A ring can be singled out once the labels are drawn, after the sequence (last frame's value is close enough).
    docked = journey > 0.9 && sequence === 1;
    if (!docked || !aim) overlay.point(null);
    else if (aimStale) overlay.point(pickAt(aim.x, aim.y));
    aimStale = false;
    overlay.ease(dt, docked);

    const stage = { hero: { x: hero.x, y: hero.y - scroll, size: hero.size }, approach: { x: approach.x, y: approach.y - scroll, size: approach.size } };
    if (dockedAt !== null && journey < PLAY.dock) {
      // Rings apart as the reader heads back: rejoin them by the hero, the shorter way (on through the sequence, or
      // back through it); scrolling down again picks the sequence up where it was.
      leaving = { from: sequence, forward: sequence > 0.5 };
      dockedAt = null;
      release?.();
      release = null;
    }
    if (leaving) {
      if (journey >= PLAY.dock) {
        dockedAt = clock - playTime(leaving.from);
        leaving = null;
      } else {
        const t = journey / PLAY.dock;
        sequence = leaving.forward ? 1 - (1 - leaving.from) * t : leaving.from * t;
        if (journey === 0) leaving = null;
      }
    }
    if (dockedAt === null && !leaving && sequence === 0 && journey >= PLAY.dock && stageInView(stage.approach, viewport, 0)) {
      dockedAt = clock;
    }
    // Caught as soon as Lenis's glide heads past the dock. Touch screens keep their native momentum, which a script
    // cannot reliably stop.
    const dockY = journeyRange.end;
    if (!rested && smoothScroller() && lastScroll >= 0 && lastScroll < dockY && scrollHeading() >= dockY && scrollingByHand()) {
      rested = true;
      release = holdScroll(dockY);
    }
    lastScroll = scroll;
    if (dockedAt !== null) sequence = sequenceAt(clock - dockedAt);
    if (sequence === 1) {
      dockedAt = null;
      release?.();
      release = null;
    }
    const w = overlay.weights;
    // The state is a pure function of these inputs: when none of them moved, the last frame still stands.
    const inputs = [
      stage.hero.x, stage.hero.y, stage.hero.size, stage.approach.x, stage.approach.y, stage.approach.size,
      viewport.width, viewport.height, journey, sequence, spin, pointer.tilt[0], pointer.tilt[1],
      Math.min(introTime, INTRO.duration), symmetry, w.design, w.engineering, w.automation,
    ];
    if (last && inputs.every((value, i) => Math.abs(value - last![i]!) < 1e-6)) return;
    last = inputs;

    const state = storyState({ intro: introTime, spin, tilt: pointer.tilt, journey, sequence, symmetry: Math.max(symmetry, 0) });
    overlay.show(state);
    const at = mixStages(stage.hero, stage.approach, state.stageMix);
    if (!stageInView(at, viewport)) {
      if (painted) renderer.clear();
      painted = false;
      return;
    }
    rings.apply(state, at, viewport, w);
    rings.render();
    painted = true;
    // The rings moved under a resting mouse: hit-test again next frame.
    if (aim) aimStale = true;
  };

  const tick = (_time: number, deltaMs: number): void => frame(Math.min(Math.max(deltaMs, 0) / 1000, 0.1));
  let resizeTimer = 0;
  const onResize = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  };
  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    release?.();
    gsap.ticker.remove(tick);
    ScrollTrigger.removeEventListener('refresh', measure);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pointermove', onAim);
    document.documentElement.removeEventListener('pointerleave', onAimOut);
    window.removeEventListener('click', onTap);
    window.clearTimeout(resizeTimer);
    canvas.removeEventListener('webglcontextlost', lost);
    pointer.dispose();
    overlay.dispose();
    rings.dispose();
    renderer.dispose();
    canvas.remove();
  };
  function lost(event: Event): void {
    event.preventDefault();
    stop();
    onLost();
  }

  try {
    resize();
    measure();
    // Compile every shader before the first visible frame, off the main thread where the browser allows it.
    await breathe();
    // Without KHR_parallel_shader_compile (Firefox) compiling is synchronous either way, and asking three for the
    // extension would log a warning.
    if (renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(rings.scene, rings.camera);
    else renderer.compile(rings.scene, rings.camera);
  } catch (error) {
    stop();
    throw error;
  }
  ScrollTrigger.addEventListener('refresh', measure);
  window.addEventListener('resize', onResize);
  if (hoverable) {
    window.addEventListener('pointermove', onAim, { passive: true });
    document.documentElement.addEventListener('pointerleave', onAimOut);
  } else window.addEventListener('click', onTap);
  canvas.addEventListener('webglcontextlost', lost);

  const scroll = window.scrollY;
  const heroOnScreen = stageInView({ x: hero.x, y: hero.y - scroll, size: hero.size }, viewport, 0);
  if (intro && heroOnScreen && progressAt(scroll, journeyRange.start, journeyRange.end) === 0) introAt = 0;
  frame(0);
  gsap.ticker.add(tick);
  return { dispose: stop };
}
