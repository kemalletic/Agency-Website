import { RING_KEYS, type RingKey } from './story';

/**
 * Once a visit, when the reader rests on the docked rings (`wait` seconds), each ring is singled out in turn for
 * `step` seconds — showing, without a word of instruction, that the rings, labels and words answer the pointer.
 */
export const DEMO = { wait: 1.5, step: 1.2 } as const;

/** The ring singled out `t` seconds into the demo; null before it starts and once it is over. */
export function demoRing(t: number): RingKey | null {
  if (t < 0) return null;
  return RING_KEYS[Math.floor(t / DEMO.step)] ?? null;
}
