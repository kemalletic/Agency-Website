import { describe, expect, it } from 'vitest';
import { RING } from '../../src/lib/rings/config';
import { CORNERS, LOOP_LENGTH, loopPoint, loopTangent, toPlane, tubeRange } from '../../src/lib/rings/curve';
import { damp, expoOut, phase, power2InOut, smoothstep } from '../../src/lib/rings/math';

/** Signed distance to the rounded rectangle (the original shader's sdRR). */
function outline([a, b]: [number, number]): number {
  const qa = Math.abs(a) - RING.halfLong + RING.corner;
  const qb = Math.abs(b) - RING.halfShort + RING.corner;
  return Math.hypot(Math.max(qa, 0), Math.max(qb, 0)) + Math.min(Math.max(qa, qb), 0) - RING.corner;
}

describe('easing helpers', () => {
  it('maps a value through a window', () => {
    expect(phase(0.5, 0.25, 0.75)).toBe(0.5);
    expect(phase(0, 0.25, 0.75)).toBe(0);
    expect(phase(1, 0.25, 0.75)).toBe(1);
  });

  it('eases from 0 to 1', () => {
    for (const ease of [smoothstep, expoOut, power2InOut]) {
      expect(ease(0)).toBe(0);
      expect(ease(1)).toBe(1);
      expect(ease(0.5)).toBeGreaterThan(0);
      expect(ease(0.5)).toBeLessThan(1);
    }
  });

  it('damps the same at 30 and 60 frames per second', () => {
    let fast = 0;
    let slow = 0;
    for (let i = 0; i < 60; i++) fast = damp(fast, 1, 5, 1 / 60);
    for (let i = 0; i < 30; i++) slow = damp(slow, 1, 5, 1 / 30);
    expect(fast).toBeCloseTo(slow, 10);
  });
});

describe('ring centre line', () => {
  it('is as long as its four straights and one full circle', () => {
    const { halfLong, halfShort, corner } = RING;
    expect(LOOP_LENGTH).toBeCloseTo(4 * (halfLong - corner) + 4 * (halfShort - corner) + 2 * Math.PI * corner, 12);
  });

  it('stays on the rounded rectangle of the original shader', () => {
    for (let i = 0; i <= 997; i++) expect(Math.abs(outline(loopPoint(i / 997)))).toBeLessThan(1e-12);
  });

  it('runs at constant speed, so the tube is even and drawing is exact', () => {
    const n = 1000;
    for (let i = 0; i < n; i++) {
      const [a0, b0] = loopPoint(i / n);
      const [a1, b1] = loopPoint((i + 1) / n);
      expect(Math.hypot(a1 - a0, b1 - b0)).toBeCloseTo(LOOP_LENGTH / n, 5);
    }
  });

  it('closes on itself with a continuous tangent', () => {
    const [a0, b0] = loopPoint(0);
    const [a1, b1] = loopPoint(1);
    expect(Math.hypot(a1 - a0, b1 - b0)).toBeLessThan(1e-12);
    const h = 1e-6;
    for (let i = 0; i < 500; i++) {
      const u = i / 500;
      const [pa, pb] = loopPoint(u - h);
      const [qa, qb] = loopPoint(u + h);
      const [ta, tb] = loopTangent(u);
      expect((qa - pa) / (2 * h * LOOP_LENGTH)).toBeCloseTo(ta, 4);
      expect((qb - pb) / (2 * h * LOOP_LENGTH)).toBeCloseTo(tb, 4);
    }
  });

  it('knows its four corner midpoints', () => {
    const a = RING.halfLong - RING.corner + RING.corner * Math.SQRT1_2;
    const b = RING.halfShort - RING.corner + RING.corner * Math.SQRT1_2;
    const expected: Array<[number, number]> = [
      [a, b],
      [-a, b],
      [-a, -b],
      [a, -b],
    ];
    CORNERS.forEach((u, i) => {
      const [pa, pb] = loopPoint(u);
      expect(pa).toBeCloseTo(expected[i]![0], 12);
      expect(pb).toBeCloseTo(expected[i]![1], 12);
    });
  });

  it('lies in the planes the original shader used', () => {
    expect(toPlane('xy', [1, 2])).toEqual([1, 2, 0]);
    expect(toPlane('yz', [1, 2])).toEqual([0, 1, 2]);
    expect(toPlane('zx', [1, 2])).toEqual([2, 0, 1]);
  });
});

describe('tubeRange', () => {
  it('turns a stretch of the loop into whole tube segments', () => {
    expect(tubeRange(0.25, 0.75, 256, 32)).toEqual({ start: 64 * 32 * 6, count: 128 * 32 * 6 });
  });

  it('reaches into the second lap and never goes negative', () => {
    expect(tubeRange(0.9, 1.9, 100, 10)).toEqual({ start: 90 * 60, count: 100 * 60 });
    expect(tubeRange(0.5, 0.5, 100, 10).count).toBe(0);
  });
});
