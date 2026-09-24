import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WebGLRenderer } from 'three';
import { INTRO, SPIN_SPEED } from '../../lib/rings/config';
import { mixStages, pinnedY, progressAt, stageInView, type PinRange, type Stage } from '../../lib/rings/layout';
import { damp } from '../../lib/rings/math';
import { heroOrientation, nearestSymmetry, storyState } from '../../lib/rings/story';
import { tokenColors } from './materials';
import { createOverlay } from './overlay';
import { createPointer } from './pointer';
import { createRingsScene, QUALITY, type Viewport } from './scene';

export interface RingsOptions {
  /** ScrollTrigger pinning the approach grid for the "take one away" sequence (created by scripts/motion/rings.ts). */
  pin: ScrollTrigger;
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
/** How quickly the sequence follows the scroll (1/s): a little weight on top of the scroll itself. */
const FOLLOW = 14;

/** Lets the browser paint and handle input between the heavier start-up steps, so none becomes a long task. */
const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Starts the live rings; resolves after the first frame is on the canvas, rejects if WebGL is unsuitable. */
export async function startRings({ pin, intro, onLost, canvas, context }: RingsOptions): Promise<RingsHandle> {
  const heroStage = document.querySelector<HTMLElement>('[data-stage="hero"]');
  const approachStage = document.querySelector<HTMLElement>('[data-stage="approach"]');
  const section = document.getElementById('approach');
  const grid = pin.pin instanceof HTMLElement ? pin.pin : null;
  if (!heroStage || !approachStage || !section || !grid) throw new Error('rings: stage markup missing');

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
  let pinRange: PinRange = { start: 0, end: 0 };
  let journeyRange: PinRange = { start: 0, end: 0 };
  const measure = (): void => {
    const scroll = window.scrollY;
    // The box centre and offsetWidth ignore the hero's CSS scale-in, so measuring during it is still exact.
    const heroBox = heroStage.getBoundingClientRect();
    hero = { x: heroBox.left + heroBox.width / 2, y: heroBox.top + heroBox.height / 2 + scroll, size: heroStage.offsetWidth };
    // The approach stage moves with the pinned grid; measure it against the pin spacer, which never leaves the flow.
    const spacer = grid.parentElement?.classList.contains('pin-spacer') ? grid.parentElement : grid;
    const gridBox = grid.getBoundingClientRect();
    const stageBox = approachStage.getBoundingClientRect();
    approach = {
      x: stageBox.left + stageBox.width / 2,
      y: spacer.getBoundingClientRect().top + scroll + (stageBox.top - gridBox.top) + stageBox.height / 2,
      size: approachStage.offsetWidth,
    };
    pinRange = { start: pin.start, end: pin.end };
    // The knot sets off as the approach section's top enters the viewport and docks as the pin begins.
    journeyRange = { start: Math.max(0, section.getBoundingClientRect().top + scroll - window.innerHeight), end: pin.start };
    last = null;
  };

  let clock = 0;
  let introAt: number | null = null;
  let spin = 0;
  let spinRate = 0;
  let sequence = -1;
  let symmetry = -1;
  let painted = false;

  const frame = (dt: number): void => {
    clock += dt;
    const scroll = window.scrollY;
    const journey = progressAt(scroll, journeyRange.start, journeyRange.end);
    const target = progressAt(scroll, pinRange.start, pinRange.end);
    sequence = sequence < 0 || Math.abs(target - sequence) < 1e-4 ? target : damp(sequence, target, FOLLOW, dt);
    pointer.update(dt, journey === 0);
    const introTime = introAt === null ? Infinity : clock - introAt;
    // Idle spin only in the hero, after the intro, easing in and out.
    spinRate = damp(spinRate, journey === 0 && introTime >= INTRO.duration ? SPIN_SPEED : 0, 2.5, dt);
    spin += spinRate * dt + pointer.takeSpin();
    // Latch the nearest approach orientation as the knot leaves the hero, so the turn never flips mid-way.
    if (journey === 0) symmetry = -1;
    else if (symmetry < 0) symmetry = nearestSymmetry(heroOrientation(spin, pointer.tilt));
    overlay.ease(dt, journey > 0.9);

    const stage = { hero: { x: hero.x, y: hero.y - scroll, size: hero.size }, approach: { x: approach.x, y: pinnedY(approach.y, scroll, pinRange), size: approach.size } };
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
    gsap.ticker.remove(tick);
    ScrollTrigger.removeEventListener('refresh', measure);
    window.removeEventListener('resize', onResize);
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
  canvas.addEventListener('webglcontextlost', lost);

  const scroll = window.scrollY;
  const heroOnScreen = stageInView({ x: hero.x, y: hero.y - scroll, size: hero.size }, viewport, 0);
  if (intro && heroOnScreen && progressAt(scroll, journeyRange.start, journeyRange.end) === 0) introAt = 0;
  frame(0);
  gsap.ticker.add(tick);
  return { dispose: stop };
}
