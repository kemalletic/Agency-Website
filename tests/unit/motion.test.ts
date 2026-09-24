import { describe, expect, it } from 'vitest';
import { clamp, headerIsSolid, magneticOffset, nextHeaderHidden, pageDim, parseReveal } from '../../src/lib/motion';

describe('parseReveal', () => {
  it('reads a known type with no delay', () => {
    expect(parseReveal({ reveal: 'lines' })).toEqual({ type: 'lines', delay: 0 });
  });

  it('reads a positive delay in seconds', () => {
    expect(parseReveal({ reveal: 'fade-up', revealDelay: '0.25' })).toEqual({ type: 'fade-up', delay: 0.25 });
  });

  it('ignores unknown or missing types', () => {
    expect(parseReveal({ reveal: 'spin' })).toBeNull();
    expect(parseReveal({})).toBeNull();
  });

  it('treats negative or malformed delays as zero', () => {
    expect(parseReveal({ reveal: 'fade', revealDelay: '-1' })?.delay).toBe(0);
    expect(parseReveal({ reveal: 'fade', revealDelay: 'soon' })?.delay).toBe(0);
  });
});

describe('nextHeaderHidden', () => {
  const base = { y: 1000, lastY: 1000, hidden: false, locked: false };

  it('never hides near the top of the page', () => {
    expect(nextHeaderHidden({ ...base, y: 120, lastY: 60 })).toBe(false);
  });

  it('hides on a deliberate scroll down', () => {
    expect(nextHeaderHidden({ ...base, y: 1012 })).toBe(true);
  });

  it('shows again on a deliberate scroll up', () => {
    expect(nextHeaderHidden({ ...base, y: 990, hidden: true })).toBe(false);
  });

  it('keeps its state for tiny movements', () => {
    expect(nextHeaderHidden({ ...base, y: 1003, hidden: true })).toBe(true);
    expect(nextHeaderHidden({ ...base, y: 997, hidden: false })).toBe(false);
  });

  it('stays visible while locked (focus inside or menu open)', () => {
    expect(nextHeaderHidden({ ...base, y: 1200, locked: true })).toBe(false);
  });
});

describe('headerIsSolid', () => {
  it('is transparent at the very top and solid after 80px', () => {
    expect(headerIsSolid(0)).toBe(false);
    expect(headerIsSolid(80)).toBe(false);
    expect(headerIsSolid(81)).toBe(true);
  });
});

describe('magneticOffset', () => {
  const box = { left: 100, top: 100, width: 200, height: 56 };

  it('does not move when the pointer is at the centre', () => {
    expect(magneticOffset(200, 128, box)).toEqual({ x: 0, y: 0 });
  });

  it('pulls by a quarter of the distance', () => {
    expect(magneticOffset(220, 136, box)).toEqual({ x: 5, y: 2 });
  });

  it('caps the pull in both directions', () => {
    expect(magneticOffset(900, -400, box)).toEqual({ x: 14, y: -14 });
  });
});

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});

describe('pageDim', () => {
  // The sheet's top meets the viewport bottom at 1000 px of scroll; the page ends 1335 px later (a 1440 px screen).
  const start = 1000;
  const viewport = 1440;
  const end = start + 1335;
  const rise = start + viewport * 0.8;

  it('is clear before the sheet arrives', () => {
    expect(pageDim(0, start, end, viewport)).toBe(0);
    expect(pageDim(start, start, end, viewport)).toBe(0);
  });

  it('dims to 40 % while the sheet rises to a fifth of the viewport', () => {
    expect(pageDim((start + rise) / 2, start, end, viewport)).toBeCloseTo(0.2, 9);
    expect(pageDim(rise, start, end, viewport)).toBeCloseTo(0.4, 9);
  });

  it('reaches full night at the end of the page', () => {
    expect(pageDim((rise + end) / 2, start, end, viewport)).toBeCloseTo(0.7, 9);
    expect(pageDim(end, start, end, viewport)).toBe(1);
    expect(pageDim(end + 50, start, end, viewport)).toBe(1);
  });

  it('goes straight to night when the page ends before the sheet has risen', () => {
    const short = start + 400;
    expect(pageDim(start + 200, start, short, viewport)).toBeCloseTo(0.5, 9);
    expect(pageDim(short, start, short, viewport)).toBe(1);
  });
});
