export const REVEAL_TYPES = ['lines', 'chars', 'fade-up', 'fade', 'figure', 'rule', 'clip'] as const;
export type RevealType = (typeof REVEAL_TYPES)[number];

export interface RevealOptions {
  type: RevealType;
  delay: number;
}

export function parseReveal(dataset: { reveal?: string; revealDelay?: string }): RevealOptions | null {
  const type = dataset.reveal;
  if (!type || !(REVEAL_TYPES as readonly string[]).includes(type)) return null;
  const delay = Number.parseFloat(dataset.revealDelay ?? '');
  return { type: type as RevealType, delay: Number.isFinite(delay) && delay > 0 ? delay : 0 };
}

export interface HeaderScroll {
  y: number;
  lastY: number;
  hidden: boolean;
  locked: boolean;
}

/** Hide on a deliberate scroll down past the hero area, show again on any deliberate scroll up. */
export function nextHeaderHidden({ y, lastY, hidden, locked }: HeaderScroll, minY = 240, threshold = 6): boolean {
  if (locked || y < minY) return false;
  const dy = y - lastY;
  if (dy > threshold) return true;
  if (dy < -threshold) return false;
  return hidden;
}

export function headerIsSolid(y: number, limit = 80): boolean {
  return y > limit;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Offset that pulls an element toward the pointer: a share of the distance from its centre, capped. */
export function magneticOffset(pointerX: number, pointerY: number, box: Box, strength = 0.25, max = 14): { x: number; y: number } {
  const dx = pointerX - (box.left + box.width / 2);
  const dy = pointerY - (box.top + box.height / 2);
  return { x: clamp(dx * strength, -max, max), y: clamp(dy * strength, -max, max) };
}

/**
 * How dark the page behind the contact sheet is at scroll `y` (0–1). It dims to 40 % while the sheet rises — its top
 * from the bottom of the viewport (`start`) to a fifth of it — then on to night by the end of the page (`end`), so a
 * tall screen, where contact and footer are shorter than the viewport, ends on night instead of a band of grey page.
 */
export function pageDim(y: number, start: number, end: number, viewport: number): number {
  const rise = start + viewport * 0.8;
  if (end <= rise) return clamp((y - start) / (end - start), 0, 1);
  if (y <= rise) return 0.4 * clamp((y - start) / (rise - start), 0, 1);
  return 0.4 + 0.6 * clamp((y - rise) / (end - rise), 0, 1);
}
