import type { Vector3 } from 'three';
import { RING } from './config';
import { cameraDistance } from './layout';
import { cameraUp, RING_KEYS, storyState, towardCamera, worldRing, type CameraState, type RingKey } from './story';

const DEG = Math.PI / 180;

/** Where a world point lands in a stage framed by `camera`, as fractions of the stage from its top-left corner, and its depth. */
export function projectToStage(point: Vector3, camera: CameraState): { u: number; v: number; depth: number } {
  const toward = towardCamera(camera.pitch);
  const eye = camera.target.clone().addScaledVector(toward, cameraDistance(camera.fov, camera.fill));
  const rel = point.clone().sub(eye);
  const depth = -rel.dot(toward);
  const scale = 1 / (2 * Math.tan((camera.fov * DEG) / 2) * depth);
  return { u: camera.anchor[0] + rel.x * scale, v: camera.anchor[1] - rel.dot(cameraUp(camera.pitch)) * scale, depth };
}

export interface LabelAnchor {
  key: RingKey;
  /** Stage fractions of the label's dot, just outside the ring. */
  x: number;
  y: number;
  /** Which way the leader line runs from the dot. */
  dir: 'up' | 'down';
}

/** Each label hangs off the tip of its ring that points this way on screen (x right, y down), with a vertical leader. */
const TIPS: Record<RingKey, { toward: [number, number]; dir: 'up' | 'down' }> = {
  design: { toward: [0, -1], dir: 'up' },
  engineering: { toward: [-1, 0.35], dir: 'down' },
  automation: { toward: [0.35, 1], dir: 'down' },
};

/** Space between a ring's outline and its label dot, as a share of the stage. */
const GAP = 0.012;

/** Dots for the approach labels, placed from the docked view's projection so they sit on the 3D rings exactly. */
export function labelAnchors(): LabelAnchor[] {
  const { poses, camera } = storyState({ intro: Infinity, spin: 0, tilt: [0, 0], journey: 1, sequence: 0, symmetry: 0 });
  const focal = 1 / (2 * Math.tan((camera.fov * DEG) / 2));
  return RING_KEYS.map((key) => {
    const { toward, dir } = TIPS[key];
    const points = worldRing(key, poses[key], 720).map((p) => projectToStage(p, camera));
    const reach = (p: { u: number; v: number }): number => p.u * toward[0] + p.v * toward[1];
    const tip = points.reduce((best, p) => (reach(p) > reach(best) ? p : best));
    // The highest (or lowest) point near that tip, so the leader leaves the tube cleanly.
    const end = points
      .filter((p) => Math.hypot(p.u - tip.u, p.v - tip.v) < 0.04)
      .reduce((best, p) => ((dir === 'up' ? p.v < best.v : p.v > best.v) ? p : best));
    const offset = (RING.tube * focal) / end.depth + GAP;
    return { key, x: end.u, y: end.v + (dir === 'up' ? -offset : offset), dir };
  });
}
