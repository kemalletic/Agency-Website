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
