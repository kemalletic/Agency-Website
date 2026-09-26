import { BOUND_RADIUS, PLAY, SEQUENCE } from './config';
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

/** A stretch of scroll positions. */
export interface ScrollRange {
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

export function mixStages(a: Stage, b: Stage, t: number): Stage {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), size: lerp(a.size, b.size, t) };
}

/** Whether a stage, grown by `margin` of its size on every side (shadows, falling rings), overlaps the viewport. */
export function stageInView(stage: Stage, viewport: { width: number; height: number }, margin = 0.5): boolean {
  const reach = stage.size * (0.5 + margin);
  return stage.x + reach > 0 && stage.x - reach < viewport.width && stage.y + reach > 0 && stage.y - reach < viewport.height;
}

/** Progress through the "take one away" sequence `elapsed` seconds after the knot docked (it plays by itself). */
export function sequenceAt(elapsed: number): number {
  return SEQUENCE.hold + Math.min(Math.max(elapsed / PLAY.duration, 0), 1) * (1 - SEQUENCE.hold);
}

/** Seconds of play at which the sequence reaches `sequence` (the inverse of `sequenceAt`). */
export function playTime(sequence: number): number {
  return Math.max((sequence - SEQUENCE.hold) / (1 - SEQUENCE.hold), 0) * PLAY.duration;
}

/** Scroll progress through [start, end], clamped to 0..1. */
export function progressAt(scroll: number, start: number, end: number): number {
  if (end <= start) return scroll >= end ? 1 : 0;
  return Math.min(Math.max((scroll - start) / (end - start), 0), 1);
}
