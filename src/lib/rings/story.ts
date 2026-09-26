import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { FLOOR, FLOOR_Y, FRAMING, INTRO, PITCH, PLAY, RING, SEQUENCE, SLIDE } from './config';
import { CORNERS, loopPoint, toPlane, type Plane } from './curve';
import { expoOut, lerp, phase, power2InOut, smoothstep } from './math';

export type RingKey = 'design' | 'engineering' | 'automation';
export const RING_KEYS: readonly RingKey[] = ['design', 'engineering', 'automation'];

/** Porcelain design ring (xy), graphite engineering ring (yz), green automation ring (zx) — the original shader's a, b, c. */
export const RING_PLANE: Record<RingKey, Plane> = { design: 'xy', engineering: 'yz', automation: 'zx' };

const NORMAL: Record<RingKey, Vector3> = {
  design: new Vector3(0, 0, 1),
  engineering: new Vector3(1, 0, 0),
  automation: new Vector3(0, 1, 0),
};

export interface Pose {
  position: Vector3;
  quaternion: Quaternion;
}

export interface CameraState {
  fov: number;
  pitch: number;
  fill: number;
  anchor: [number, number];
  target: Vector3;
}

export interface SceneState {
  poses: Record<RingKey, Pose>;
  /** Visible stretch of the green ring in laps: 0 ≤ from, from ≤ to ≤ from + 1, to ≤ 2. */
  accent: { from: number; to: number };
  camera: CameraState;
  /** 0 = the knot sits in the hero stage, 1 = in the approach stage. */
  stageMix: number;
  floor: { opacity: number; sharpness: number; spread: number };
  /** 0..1 per ring: how far its approach label is drawn (only after the sequence, the knot whole again). */
  labels: Record<RingKey, number>;
  /** 0..1 per ring: how far its word in the approach lead has turned to ink (on the way in, and it stays). */
  words: Record<RingKey, number>;
  /** 0..1: how far each story phrase in the approach lead has turned to ink. */
  marks: { take: number; fall: number };
}

export interface StoryInput {
  /** Seconds since the intro began (Infinity when it does not play). */
  intro: number;
  /** Accumulated idle rotation in radians, dragging included. */
  spin: number;
  /** Smoothed pointer offset from the hero stage centre, each axis -0.5..0.5. */
  tilt: [number, number];
  /** 0..1 from the hero stage to the approach stage. */
  journey: number;
  /** 0..1 through the "take one away" sequence, which plays by itself once the knot has docked. */
  sequence: number;
  /** Which of the four identical approach orientations to turn to (`nearestSymmetry`), latched while the journey runs. */
  symmetry: number;
}

const DEG = Math.PI / 180;
const X = new Vector3(1, 0, 0);
const Y = new Vector3(0, 1, 0);

/** Unit vector from the camera's target towards a camera raised by `pitch` degrees. */
export function towardCamera(pitch: number): Vector3 {
  return new Vector3(0, Math.sin(pitch * DEG), Math.cos(pitch * DEG));
}

/** Screen-up direction of a camera raised by `pitch` degrees. */
export function cameraUp(pitch: number): Vector3 {
  return new Vector3(0, Math.cos(pitch * DEG), -Math.sin(pitch * DEG));
}

/**
 * The approach view: the knot's (1,1,1) diagonal points at the camera, so the three rings show three-fold symmetry,
 * with the design ring's long axis straight up the screen.
 */
export const ISO: Quaternion = (() => {
  const e3 = new Vector3(1, 1, 1).normalize();
  const e2 = new Vector3(2, -1, -1).normalize();
  const e1 = new Vector3().crossVectors(e2, e3);
  const camera = new Matrix4().makeBasis(X, cameraUp(PITCH), towardCamera(PITCH));
  const knot = new Matrix4().makeBasis(e1, e2, e3);
  return new Quaternion().setFromRotationMatrix(camera.multiply(knot.transpose()));
})();

/**
 * Half turns about the knot's own axes map every ring onto itself, so these four orientations look identical; the
 * journey turns to the nearest one (never more than ~105°). Each has its own front corner, where the green ring opens,
 * and its own sign for the free axis, so porcelain always slides left and graphite right.
 */
const SYMMETRY = [
  { turn: new Quaternion(), corner: CORNERS[0], side: 1 },
  { turn: new Quaternion().setFromAxisAngle(X, Math.PI), corner: CORNERS[1], side: 1 },
  { turn: new Quaternion().setFromAxisAngle(Y, Math.PI), corner: CORNERS[2], side: -1 },
  { turn: new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI), corner: CORNERS[3], side: -1 },
] as const;

const approachOrientation = (symmetry: number): Quaternion => ISO.clone().multiply((SYMMETRY[symmetry] ?? SYMMETRY[0]).turn);

/** Hero orientation: the original shader's rot(2.2 + spin + 0.9·tx, 0.55 + 0.6·ty, 0.25), inverted. */
export function heroOrientation(spin: number, tilt: [number, number], twist = 0): Quaternion {
  return new Quaternion().setFromEuler(new Euler(-(0.55 + 0.6 * tilt[1]), -(2.2 + spin + 0.9 * tilt[0]) + twist, -0.25, 'YXZ'));
}

/** Index of the approach orientation closest to `q`. Latch it as the knot leaves the hero, so the turn never flips. */
export function nearestSymmetry(q: Quaternion): number {
  let best = 0;
  for (let i = 1; i < SYMMETRY.length; i++) if (q.angleTo(approachOrientation(i)) < q.angleTo(approachOrientation(best))) best = i;
  return best;
}

const roll = (angle: number): Quaternion => new Quaternion().setFromAxisAngle(towardCamera(PITCH), angle);

/** Rings assembled around `knot`; design and engineering pushed apart by `slide` along the knot's free (x) axis. */
function assembled(q: Quaternion, knot: Vector3, slide: number): Record<RingKey, Pose> {
  const axis = X.clone().applyQuaternion(q);
  return {
    design: { position: knot.clone().addScaledVector(axis, -slide), quaternion: q.clone() },
    engineering: { position: knot.clone().addScaledVector(axis, slide), quaternion: q.clone() },
    automation: { position: knot.clone(), quaternion: q.clone() },
  };
}

/** The flat orientation nearest to `q` (the ring tips over the least), turned by `yaw` about the vertical. */
function flatten(key: RingKey, q: Quaternion, yaw: number): Quaternion {
  const normal = NORMAL[key].clone().applyQuaternion(q);
  const tip = new Quaternion().setFromUnitVectors(normal, new Vector3(0, Math.sign(normal.y) || 1, 0));
  return new Quaternion().setFromAxisAngle(Y, yaw).multiply(tip).multiply(q);
}

interface Fall {
  from: Record<'design' | 'engineering', Pose>;
  to: Record<'design' | 'engineering', Pose>;
}

/** Start (slid apart, knot rolled a quarter turn) and end (lying on the floor) of the fall, per symmetry. */
const FALLS: Fall[] = SYMMETRY.map((symmetry, i) => {
  const from = assembled(roll(-Math.PI / 2).multiply(approachOrientation(i)), new Vector3(), SLIDE * symmetry.side);
  return {
    from,
    to: {
      design: { position: new Vector3(-0.98, FLOOR_Y + RING.tube, -0.2), quaternion: flatten('design', from.design.quaternion, 0.1) },
      engineering: {
        position: new Vector3(0.98, FLOOR_Y + RING.tube, 0.2),
        quaternion: flatten('engineering', from.engineering.quaternion, -0.15),
      },
    },
  };
});

/** A ring falling from `from` to `to`: it drifts outwards, drops with gravity and is flat before it lands. */
function fall(from: Pose, to: Pose, f: number): Pose {
  const side = 1 - (1 - f) ** 2;
  const drop = f * f;
  return {
    position: new Vector3(
      lerp(from.position.x, to.position.x, side),
      lerp(from.position.y, to.position.y, drop),
      lerp(from.position.z, to.position.z, side),
    ),
    quaternion: from.quaternion.clone().slerp(to.quaternion, smoothstep(phase(f, 0.05, 0.75))),
  };
}

/** The journey's last stretch, in which the ring words in the lead ink one after another. */
const WORD_IN: Record<RingKey, readonly [number, number]> = { design: [0.8, 0.9], engineering: [0.85, 0.95], automation: [0.9, 1] };

/** The sequence's last stretch, after the knot is whole again (`SEQUENCE.closed`): the labels draw one after another. */
const LABEL_IN: Record<RingKey, readonly [number, number]> = {
  design: [SEQUENCE.closed, 0.97],
  engineering: [0.955, 0.985],
  automation: [0.97, 1],
};

const perRing = (value: (key: RingKey) => number): Record<RingKey, number> => ({
  design: value('design'),
  engineering: value('engineering'),
  automation: value('automation'),
});

/** Height of the one small hop after the rings land. */
const HOP = 0.07;

export function storyState(input: StoryInput): SceneState {
  const journey = power2InOut(input.journey);
  const p = input.sequence;
  const S = SEQUENCE;
  const symmetry = SYMMETRY[input.symmetry] ?? SYMMETRY[0];

  // Intro, by time — finished off as the knot leaves the hero, so the journey always carries a whole knot.
  const t = input.intro + input.journey * INTRO.duration;
  const introSlide = INTRO.slide * (1 - expoOut(phase(t, 0, INTRO.slideEnd)));
  const drawnIn = expoOut(phase(t, INTRO.drawFrom, INTRO.drawTo));
  const settle = 1 - expoOut(phase(t, 0, INTRO.duration));

  // Orientation: the idle hero pose, turning to the nearest approach view.
  const q = heroOrientation(input.spin, input.tilt, INTRO.twist * settle).slerp(approachOrientation(input.symmetry), journey);

  // The sequence; its second half (`back`) retraces the first.
  const back = p >= (S.fallen + S.rise) / 2;
  const turn = back ? 1 - power2InOut(phase(p, S.joined, S.closed)) : power2InOut(phase(p, S.hold, S.taken));
  const gap = back ? 1 - power2InOut(phase(p, S.joined, S.closed)) : power2InOut(phase(p, S.hold, S.taken));
  const slide = SLIDE * (back ? 1 - power2InOut(phase(p, S.landed, S.joined)) : power2InOut(phase(p, S.taken, S.apart)));
  const landing = phase(p, S.apart, S.fallen);
  const f = back ? 1 - smoothstep(phase(p, S.rise, S.landed)) : Math.min(landing / 0.8, 1);
  const hop = back ? 0 : HOP * 4 * phase(landing, 0.8, 1) * (1 - phase(landing, 0.8, 1));
  const crane = back ? 1 - smoothstep(phase(p, S.rise, 0.84)) : smoothstep(phase(p, 0.42, 0.6));
  const zoom = back ? 1 - smoothstep(phase(p, 0.72, S.joined)) : smoothstep(phase(p, 0.28, 0.5));

  const knot = new Vector3(0, INTRO.settle * settle, 0);
  const poses = assembled(roll(-(Math.PI / 2) * turn).multiply(q), knot, introSlide + slide * symmetry.side);
  if (f > 0) {
    const { from, to } = FALLS[input.symmetry] ?? FALLS[0]!;
    poses.design = fall(from.design, to.design, f);
    poses.engineering = fall(from.engineering, to.engineering, f);
    poses.design.position.y += hop;
    poses.engineering.position.y += hop;
  }

  // The green ring is drawn from its front corner in the intro; later it opens and closes around that corner.
  const accent =
    drawnIn < 1 ? { from: CORNERS[0], to: CORNERS[0] + drawnIn } : { from: symmetry.corner + gap / 2, to: symmetry.corner + 1 - gap / 2 };

  const { hero, approach, floor } = FRAMING;
  return {
    poses,
    accent,
    camera: {
      fov: lerp(hero.fov, approach.fov, journey),
      pitch: lerp(PITCH, floor.pitch, crane),
      fill: lerp(lerp(hero.fill, approach.fill, journey), floor.fill, zoom),
      anchor: [
        lerp(lerp(hero.anchor[0], approach.anchor[0], journey), floor.anchor[0], crane),
        lerp(lerp(hero.anchor[1], approach.anchor[1], journey), floor.anchor[1], crane),
      ],
      target: new Vector3(0, lerp(0, floor.targetY, crane), 0),
    },
    stageMix: journey,
    floor: {
      opacity: lerp(lerp(FLOOR.hero, FLOOR.docked, journey), FLOOR.fallen, crane),
      sharpness: crane,
      spread: lerp(1.25, 2.2, crane),
    },
    // The labels wait for the sequence and draw only once the knot is whole again; the words ink on the way in and stay
    // so. The sequence plays by itself, so it can run on as the knot heads back: labels and words follow the journey.
    labels: perRing((key) => phase(p, ...LABEL_IN[key]) * phase(input.journey, PLAY.dock - 0.1, PLAY.dock)),
    words: perRing((key) => phase(input.journey, ...WORD_IN[key])),
    marks: { take: phase(p, S.hold, 0.24), fall: phase(p, 0.47, 0.58) },
  };
}

/** Centre-line points of a ring in world space (for the green ring, only the stretch `from`..`to`, in laps). */
export function worldRing(key: RingKey, pose: Pose, count: number, from = 0, to = 1): Vector3[] {
  const points: Vector3[] = [];
  for (let i = 0; i < count; i++) {
    const [x, y, z] = toPlane(RING_PLANE[key], loopPoint(from + ((to - from) * i) / Math.max(count - 1, 1)));
    points.push(new Vector3(x, y, z).applyQuaternion(pose.quaternion).add(pose.position));
  }
  return points;
}
