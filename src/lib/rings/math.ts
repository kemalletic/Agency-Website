/** Scalar helpers for the rings story and layout. No DOM, no three.js — safe in the main bundle and in tests. */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** How far x has moved through [from, to], clamped to 0..1. */
export const phase = (x: number, from: number, to: number): number => {
  if (to <= from) return x >= to ? 1 : 0;
  return clamp01((x - from) / (to - from));
};

export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export const expoOut = (t: number): number => {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - 2 ** (-10 * x);
};

export const power2InOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) ** 2;
};

/** Frame-rate independent approach of `current` towards `target` (rate in 1/s). */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-rate * dt));
