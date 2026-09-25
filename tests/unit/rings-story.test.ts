import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { FLOOR_Y, FRAMING, INTRO, PITCH, RING, SEQUENCE } from '../../src/lib/rings/config';
import { CORNERS } from '../../src/lib/rings/curve';
import {
  heroOrientation,
  ISO,
  nearestSymmetry,
  RING_KEYS,
  storyState,
  towardCamera,
  worldRing,
  type SceneState,
  type StoryInput,
} from '../../src/lib/rings/story';

const hero: StoryInput = { intro: Infinity, spin: 0, tilt: [0, 0], journey: 0, sequence: 0, symmetry: 0 };
const docked: StoryInput = { ...hero, journey: 1 };
const TOUCH = 2 * RING.tube;

/** The original shader's rot(): R = Rz(az)·Rx(ax)·Ry(ay), row-major; it maps world to object space. */
function originalRotation(ay: number, ax: number, az: number): number[] {
  const [cy, sy, cx, sx, cz, sz] = [Math.cos(ay), Math.sin(ay), Math.cos(ax), Math.sin(ax), Math.cos(az), Math.sin(az)];
  const ry = [cy, 0, sy, 0, 1, 0, -sy, 0, cy];
  const rx = [1, 0, 0, 0, cx, -sx, 0, sx, cx];
  const rz = [cz, -sz, 0, sz, cz, 0, 0, 0, 1];
  const mul = (a: number[], b: number[]): number[] =>
    Array.from({ length: 9 }, (_, k) => {
      const i = Math.floor(k / 3);
      const j = k % 3;
      return a[i * 3]! * b[j]! + a[i * 3 + 1]! * b[3 + j]! + a[i * 3 + 2]! * b[6 + j]!;
    });
  return mul(mul(rz, rx), ry);
}

function closest(a: Vector3[], b: Vector3[]): number {
  let best = Infinity;
  for (const p of a) for (const q of b) best = Math.min(best, p.distanceToSquared(q));
  return Math.sqrt(best);
}

/** Closest approach between any two visible tube centre lines, and the lowest tube surface. */
function clearance(state: SceneState, count = 120): { rings: number; lowest: number } {
  const lines = RING_KEYS.flatMap((key) => {
    if (key !== 'automation') return [worldRing(key, state.poses[key], count)];
    const length = state.accent.to - state.accent.from;
    if (length < 1e-4) return [];
    return [worldRing(key, state.poses[key], Math.max(2, Math.round(count * length)), state.accent.from, state.accent.to)];
  });
  let rings = Infinity;
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) rings = Math.min(rings, closest(lines[i]!, lines[j]!));
  return { rings, lowest: Math.min(...lines.flat().map((p) => p.y)) - RING.tube };
}

const drawn = (state: SceneState): number => state.accent.to - state.accent.from;

describe('hero', () => {
  it('rests exactly where the original shader did', () => {
    const r = originalRotation(2.2, 0.55, 0.25);
    // Object → world is the transpose, so the object's x axis lands on R's first row.
    const x = new Vector3(1, 0, 0).applyQuaternion(heroOrientation(0, [0, 0]));
    expect(x.x).toBeCloseTo(r[0]!, 12);
    expect(x.y).toBeCloseTo(r[1]!, 12);
    expect(x.z).toBeCloseTo(r[2]!, 12);
  });

  it('is framed like the original render', () => {
    const state = storyState(hero);
    expect(state.stageMix).toBe(0);
    expect(state.camera).toMatchObject({ fov: FRAMING.hero.fov, fill: FRAMING.hero.fill, anchor: [...FRAMING.hero.anchor] });
    expect(state.camera.pitch).toBeCloseTo(PITCH, 12);
  });
});

describe('approach view', () => {
  it('points the (1,1,1) diagonal at the camera with the design ring upright', () => {
    expect(new Vector3(1, 1, 1).normalize().applyQuaternion(ISO).distanceTo(towardCamera(PITCH))).toBeLessThan(1e-12);
    expect(new Vector3(1, 0, 0).applyQuaternion(ISO).x).toBeCloseTo(0, 12);
  });

  it('has four orientations that look identical', () => {
    const reference = storyState(docked);
    for (let symmetry = 1; symmetry < 4; symmetry++) {
      const turned = storyState({ ...docked, symmetry });
      for (const key of RING_KEYS) {
        const dense = worldRing(key, turned.poses[key], 400);
        for (const p of worldRing(key, reference.poses[key], 50)) {
          expect(Math.min(...dense.map((q) => q.distanceTo(p)))).toBeLessThan(0.01);
        }
      }
    }
  });

  it('is never more than 105° from the hero pose', () => {
    for (let i = 0; i < 90; i++) {
      const pose = heroOrientation((i / 90) * 2 * Math.PI, [0, 0]);
      const target = storyState({ ...docked, symmetry: nearestSymmetry(pose) }).poses.automation.quaternion;
      expect(pose.angleTo(target)).toBeLessThan((105 * Math.PI) / 180);
    }
  });
});

describe('journey', () => {
  it('ends in the approach framing with the labels drawn', () => {
    const state = storyState(docked);
    expect(state.stageMix).toBe(1);
    expect(state.camera).toMatchObject({ fov: FRAMING.approach.fov, fill: FRAMING.approach.fill });
    expect(state.labels).toEqual({ design: 1, engineering: 1, automation: 1 });
    expect(storyState({ ...hero, journey: 0.5 }).labels).toEqual({ design: 0, engineering: 0, automation: 0 });
  });

  it('draws the labels one after another, each inking its word in the lead', () => {
    const early = storyState({ ...hero, journey: 0.5 });
    expect(early.words).toEqual({ design: 0, engineering: 0, automation: 0 });
    const drawing = storyState({ ...hero, journey: 0.87 });
    expect(drawing.labels.design).toBeGreaterThan(drawing.labels.engineering);
    expect(drawing.labels.engineering).toBeGreaterThan(drawing.labels.automation);
    expect(drawing.labels.design).toBeLessThan(1);
    expect(drawing.labels.automation).toBe(0);
    expect(drawing.words).toEqual(drawing.labels);
    expect(storyState(docked).words).toEqual({ design: 1, engineering: 1, automation: 1 });
  });

  it('turns smoothly all the way', () => {
    const symmetry = nearestSymmetry(heroOrientation(0, [0, 0]));
    let previous = storyState({ ...hero, symmetry }).poses.design.quaternion;
    for (let i = 1; i <= 200; i++) {
      const next = storyState({ ...hero, symmetry, journey: i / 200 }).poses.design.quaternion;
      expect(previous.angleTo(next)).toBeLessThan((2 * Math.PI) / 180);
      previous = next;
    }
  });
});

describe('intro', () => {
  it('starts with porcelain and graphite apart and the green ring not yet drawn', () => {
    const state = storyState({ ...hero, intro: 0 });
    expect(drawn(state)).toBe(0);
    expect(state.poses.design.position.distanceTo(state.poses.engineering.position)).toBeCloseTo(2 * INTRO.slide, 9);
  });

  it('draws the green ring from its front corner once the others are home', () => {
    expect(drawn(storyState({ ...hero, intro: INTRO.drawFrom }))).toBe(0);
    const drawing = storyState({ ...hero, intro: 1 });
    expect(drawing.accent.from).toBeCloseTo(CORNERS[0], 12);
    expect(drawn(drawing)).toBeGreaterThan(0.9);
    expect(drawn(drawing)).toBeLessThan(1);
  });

  it('ends whole and still, and is finished off by the journey', () => {
    const done = storyState({ ...hero, intro: INTRO.duration });
    expect(drawn(done)).toBeCloseTo(1, 12);
    expect(done.poses.design.position.length()).toBeLessThan(1e-9);
    expect(drawn(storyState({ ...hero, intro: 0, journey: 1 }))).toBeCloseTo(1, 12);
  });
});

describe('take one away', () => {
  it('holds the docked view with the labels on until 0.12', () => {
    const start = storyState(docked);
    const held = storyState({ ...docked, sequence: SEQUENCE.hold });
    expect(held.labels).toEqual({ design: 1, engineering: 1, automation: 1 });
    expect(drawn(held)).toBeCloseTo(1, 12);
    for (const key of RING_KEYS) expect(held.poses[key].quaternion.angleTo(start.poses[key].quaternion)).toBeLessThan(1e-6);
  });

  it('removes the green ring completely before the others move, and returns it last', () => {
    for (let i = 0; i <= 100; i++) {
      const sequence = SEQUENCE.taken + 1e-6 + ((SEQUENCE.joined - SEQUENCE.taken - 2e-6) * i) / 100;
      expect(drawn(storyState({ ...docked, sequence }))).toBeLessThan(1e-9);
    }
    expect(storyState({ ...docked, sequence: SEQUENCE.taken }).poses.design.position.length()).toBeLessThan(1e-9);
  });

  it('slides the freed rings apart sideways, then lays them flat on the floor', () => {
    const apart = storyState({ ...docked, sequence: SEQUENCE.apart });
    expect(apart.poses.design.position.x).toBeLessThan(-0.5);
    expect(apart.poses.engineering.position.x).toBeGreaterThan(0.5);
    const fallen = storyState({ ...docked, sequence: 0.66 });
    const normals = { design: new Vector3(0, 0, 1), engineering: new Vector3(1, 0, 0) };
    for (const key of ['design', 'engineering'] as const) {
      expect(fallen.poses[key].position.y).toBeCloseTo(FLOOR_Y + RING.tube, 9);
      expect(Math.abs(normals[key].applyQuaternion(fallen.poses[key].quaternion).y)).toBeCloseTo(1, 9);
    }
  });

  it('keeps the ring words inked while the labels make way for the sequence', () => {
    const taking = storyState({ ...docked, sequence: 0.5 });
    expect(taking.labels).toEqual({ design: 0, engineering: 0, automation: 0 });
    expect(taking.words).toEqual({ design: 1, engineering: 1, automation: 1 });
  });

  it('inks the two story phrases as they happen', () => {
    expect(storyState({ ...docked, sequence: 0.1 }).marks).toEqual({ take: 0, fall: 0 });
    expect(storyState({ ...docked, sequence: SEQUENCE.taken }).marks.take).toBe(1);
    expect(storyState({ ...docked, sequence: SEQUENCE.fallen }).marks.fall).toBe(1);
  });

  it('cranes over the floor while the rings lie on it', () => {
    const fallen = storyState({ ...docked, sequence: 0.66 });
    expect(fallen.camera.pitch).toBeCloseTo(FRAMING.floor.pitch, 9);
    expect(fallen.floor.sharpness).toBe(1);
  });

  it('ends exactly where it started', () => {
    const start = storyState(docked);
    const end = storyState({ ...docked, sequence: 1 });
    for (const key of RING_KEYS) {
      expect(end.poses[key].position.distanceTo(start.poses[key].position)).toBeLessThan(1e-9);
      expect(end.poses[key].quaternion.angleTo(start.poses[key].quaternion)).toBeLessThan(1e-6);
    }
    expect(drawn(end)).toBeCloseTo(1, 12);
    expect(end.labels).toEqual({ design: 1, engineering: 1, automation: 1 });
    expect(end.words).toEqual({ design: 1, engineering: 1, automation: 1 });
    expect(end.camera).toEqual(start.camera);
  });
});

describe('the knot never cheats', () => {
  it('keeps every tube clear of the others and above the floor during the intro', () => {
    for (let i = 0; i <= 120; i++) {
      const { rings, lowest } = clearance(storyState({ ...hero, intro: (i / 120) * 2 }));
      expect(rings).toBeGreaterThan(TOUCH + 0.05);
      expect(lowest).toBeGreaterThan(FLOOR_Y);
    }
  });

  it.each([0, 1, 2, 3])('keeps every tube clear and above the floor through "take one away" (symmetry %i)', (symmetry) => {
    for (let i = 0; i <= 150; i++) {
      const { rings, lowest } = clearance(storyState({ ...docked, symmetry, sequence: i / 150 }));
      expect(rings).toBeGreaterThan(TOUCH + 0.05);
      expect(lowest).toBeGreaterThan(FLOOR_Y - 1e-9);
    }
  });

  it('keeps the green ring inside the two laps its tube is built with', () => {
    for (let symmetry = 0; symmetry < 4; symmetry++) {
      for (let i = 0; i <= 100; i++) {
        for (const input of [
          { ...hero, intro: (i / 100) * 2 },
          { ...docked, symmetry, sequence: i / 100 },
        ]) {
          const { from, to } = storyState(input).accent;
          expect(from).toBeGreaterThanOrEqual(0);
          expect(to).toBeLessThanOrEqual(2);
          expect(to - from).toBeGreaterThanOrEqual(-1e-12);
          expect(to - from).toBeLessThanOrEqual(1 + 1e-12);
        }
      }
    }
  });
});
