import { BOUND_RADIUS } from './config';
import { lerp } from './math';

/** A square stage in viewport (or page) pixels: its centre and side. */
export interface Stage {
  x: number;
  y: number;
  size: number;
}

/** Arguments for `PerspectiveCamera.setViewOffset`. */
export interface ViewOffset {
  fullWidth: number;
  fullHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Scroll positions between which an element stays pinned. */
export interface PinRange {
  start: number;
  end: number;
}

const DEG = Math.PI / 180;

/** Camera distance at which the bounding sphere spans `fill` of the stage side (as a radius) for a vertical `fov`. */
export function cameraDistance(fov: number, fill: number): number {
  return BOUND_RADIUS / (2 * fill * Math.tan((fov * DEG) / 2));
}

/**
 * Makes a full-viewport canvas draw the knot exactly where, and as large as, a render of the stage alone would:
 * the canvas becomes a window onto a virtual square image the size of the stage, centred on the knot's anchor.
 */
export function viewOffset(stage: Stage, anchor: readonly [number, number], viewport: { width: number; height: number }): ViewOffset {
  const { size } = stage;
  return {
    fullWidth: size,
    fullHeight: size,
    x: size * (1 - anchor[0]) - stage.x,
    y: size * (1 - anchor[1]) - stage.y,
    width: viewport.width,
    height: viewport.height,
  };
}

/** Viewport y of a point `natural` px down the page that sits inside an element pinned over `pin` (if any). */
export function pinnedY(natural: number, scroll: number, pin?: PinRange): number {
  if (!pin) return natural - scroll;
  return natural - scroll + Math.min(Math.max(scroll - pin.start, 0), pin.end - pin.start);
}

export function mixStages(a: Stage, b: Stage, t: number): Stage {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), size: lerp(a.size, b.size, t) };
}

/** Whether a stage, grown by `margin` of its size on every side (shadows, falling rings), overlaps the viewport. */
export function stageInView(stage: Stage, viewport: { width: number; height: number }, margin = 0.5): boolean {
  const reach = stage.size * (0.5 + margin);
  return stage.x + reach > 0 && stage.x - reach < viewport.width && stage.y + reach > 0 && stage.y - reach < viewport.height;
}

/** Scroll progress through [start, end], clamped to 0..1. */
export function progressAt(scroll: number, start: number, end: number): number {
  if (end <= start) return scroll >= end ? 1 : 0;
  return Math.min(Math.max((scroll - start) / (end - start), 0), 1);
}
