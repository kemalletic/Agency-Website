import { describe, expect, it } from 'vitest';
import { BOUND_RADIUS, PIN_HOLD, SEQUENCE } from '../../src/lib/rings/config';
import { cameraDistance, mixStages, pinLength, pinnedY, progressAt, sequenceAt, stageInView, viewOffset } from '../../src/lib/rings/layout';

describe('cameraDistance', () => {
  it('shows the bounding sphere at the requested share of the stage', () => {
    for (const [fov, fill] of [
      [30, 0.381],
      [10, 0.4],
      [18, 0.25],
    ] as const) {
      const distance = cameraDistance(fov, fill);
      expect(BOUND_RADIUS / (2 * distance * Math.tan((fov * Math.PI) / 360))).toBeCloseTo(fill, 12);
    }
  });

  it('reproduces the original render (eye about 8.95 away with focal length 3.1)', () => {
    const fov = (2 * Math.atan(0.5 / 3.1) * 180) / Math.PI;
    expect(cameraDistance(fov, 0.381)).toBeCloseTo(8.95, 1);
  });
});

describe('viewOffset', () => {
  it('centres the virtual stage image on the anchor point', () => {
    const stage = { x: 1000, y: 400, size: 600 };
    const view = viewOffset(stage, [0.4, 0.3], { width: 1440, height: 900 });
    const anchor = { x: stage.x - stage.size / 2 + 0.4 * stage.size, y: stage.y - stage.size / 2 + 0.3 * stage.size };
    expect(view.x + anchor.x).toBeCloseTo(stage.size / 2, 9);
    expect(view.y + anchor.y).toBeCloseTo(stage.size / 2, 9);
    expect(view).toMatchObject({ fullWidth: 600, fullHeight: 600, width: 1440, height: 900 });
  });

  it('is the plain camera when the canvas is the stage and the knot is centred', () => {
    expect(viewOffset({ x: 680, y: 680, size: 1360 }, [0.5, 0.5], { width: 1360, height: 1360 })).toEqual({
      fullWidth: 1360,
      fullHeight: 1360,
      x: 0,
      y: 0,
      width: 1360,
      height: 1360,
    });
  });
});

describe('pinnedY', () => {
  const pin = { start: 1000, end: 3000 };

  it('scrolls with the page before the pin', () => {
    expect(pinnedY(1500, 600, pin)).toBe(900);
  });

  it('holds still while pinned', () => {
    expect(pinnedY(1500, 1000, pin)).toBe(500);
    expect(pinnedY(1500, 2200, pin)).toBe(500);
  });

  it('scrolls on after the pin, displaced by its length', () => {
    expect(pinnedY(1500, 3400, pin)).toBe(100);
  });

  it('is plain scrolling without a pin', () => {
    expect(pinnedY(1500, 2200)).toBe(-700);
  });
});

describe('stages', () => {
  it('blends two stages', () => {
    expect(mixStages({ x: 0, y: 0, size: 100 }, { x: 100, y: 200, size: 300 }, 0.25)).toEqual({ x: 25, y: 50, size: 150 });
  });

  it('knows when a stage, with room for shadows, is on screen', () => {
    const viewport = { width: 1000, height: 800 };
    expect(stageInView({ x: 500, y: 400, size: 300 }, viewport)).toBe(true);
    expect(stageInView({ x: 500, y: -200, size: 300 }, viewport)).toBe(true);
    expect(stageInView({ x: 500, y: -400, size: 300 }, viewport)).toBe(false);
    expect(stageInView({ x: 1500, y: 400, size: 300 }, viewport)).toBe(false);
  });

  it('turns scroll into progress', () => {
    expect(progressAt(50, 100, 300)).toBe(0);
    expect(progressAt(200, 100, 300)).toBe(0.5);
    expect(progressAt(400, 100, 300)).toBe(1);
    expect(progressAt(100, 100, 100)).toBe(1);
  });
});

describe('the pinned stretch', () => {
  it('holds the docked view for its first part, then runs the sequence at its old pace', () => {
    expect(sequenceAt(0)).toBe(0);
    expect(sequenceAt(PIN_HOLD / 2)).toBeLessThan(SEQUENCE.hold);
    expect(sequenceAt(PIN_HOLD)).toBeCloseTo(SEQUENCE.hold, 12);
    expect(sequenceAt(1)).toBe(1);
    expect(sequenceAt(-1)).toBe(0);
    expect(sequenceAt(2)).toBe(1);
    for (let i = 1; i <= 100; i++) expect(sequenceAt(i / 100)).toBeGreaterThan(sequenceAt((i - 1) / 100));
  });

  it('gives the hold most of a screen of scrolling, leaving the moving part as long as before', () => {
    for (const [wide, before] of [
      [true, 2.2],
      [false, 1.6],
    ] as const) {
      expect(pinLength(wide) * PIN_HOLD).toBeGreaterThan(0.5);
      expect(pinLength(wide) * (1 - PIN_HOLD)).toBeCloseTo(before * (1 - SEQUENCE.hold), 12);
    }
  });
});
