import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BOUND_RADIUS, FRAMING, RING } from '../../src/lib/rings/config';
import { labelAnchors, projectToStage } from '../../src/lib/rings/labels';
import { RING_KEYS, storyState, worldRing } from '../../src/lib/rings/story';

const docked = storyState({ intro: Infinity, spin: 0, tilt: [0, 0], journey: 1, sequence: 0, symmetry: 0 });
const tube = (RING.tube * FRAMING.approach.fill) / BOUND_RADIUS;
/** Leader length as a share of the stage (the CSS draws it 7cqi long). */
const LEADER = 0.07;

describe('projectToStage', () => {
  it('puts the knot centre on the stage anchor', () => {
    const centre = projectToStage(new Vector3(), docked.camera);
    expect(centre.u).toBeCloseTo(FRAMING.approach.anchor[0], 9);
    expect(centre.v).toBeCloseTo(FRAMING.approach.anchor[1], 9);
  });

  it('shows the bounding radius at the framing fill', () => {
    const edge = projectToStage(new Vector3(BOUND_RADIUS, 0, 0), docked.camera);
    expect(edge.u - FRAMING.approach.anchor[0]).toBeCloseTo(FRAMING.approach.fill, 9);
  });
});

describe('labelAnchors', () => {
  const labels = labelAnchors();

  it('labels design above, engineering on the left and automation at the bottom right', () => {
    expect(labels.map((label) => label.key)).toEqual(['design', 'engineering', 'automation']);
    const [design, engineering, automation] = labels;
    expect(design).toMatchObject({ dir: 'up' });
    expect(design!.y).toBeLessThan(0.2);
    expect(engineering).toMatchObject({ dir: 'down' });
    expect(engineering!.x).toBeLessThan(0.35);
    expect(automation).toMatchObject({ dir: 'down' });
    expect(automation!.x).toBeGreaterThan(0.55);
    expect(automation!.y).toBeGreaterThan(0.6);
    for (const label of labels) {
      expect(label.x).toBeGreaterThan(0.08);
      expect(label.x).toBeLessThan(0.92);
      expect(label.y).toBeGreaterThan(0.08);
      expect(label.y).toBeLessThan(0.92);
    }
  });

  it('sits each dot just outside its own ring', () => {
    for (const label of labels) {
      const ring = worldRing(label.key, docked.poses[label.key], 720).map((p) => projectToStage(p, docked.camera));
      const nearest = Math.min(...ring.map((p) => Math.hypot(p.u - label.x, p.v - label.y)));
      expect(nearest).toBeGreaterThan(tube);
      expect(nearest).toBeLessThan(tube + 0.03);
    }
  });

  it('runs every leader line clear of all three rings', () => {
    const rings = RING_KEYS.map((key) => worldRing(key, docked.poses[key], 720).map((p) => projectToStage(p, docked.camera)));
    for (const label of labels) {
      const direction = label.dir === 'up' ? -1 : 1;
      for (let i = 0; i <= 20; i++) {
        const y = label.y + direction * (0.004 + (LEADER * i) / 20);
        for (const ring of rings) for (const p of ring) expect(Math.hypot(p.u - label.x, p.v - y)).toBeGreaterThan(tube);
      }
    }
  });
});
