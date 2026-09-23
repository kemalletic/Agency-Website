import { RING } from './config';

/** Plane a ring lies in, long side along the first axis — the original shader's loopXY(q), loopXY(q.yzx), loopXY(q.zxy). */
export type Plane = 'xy' | 'yz' | 'zx';
export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

const A = RING.halfLong;
const B = RING.halfShort;
const R = RING.corner;
const SA = A - R;
const SB = B - R;
const QUARTER = (Math.PI / 2) * R;

type Piece =
  | { kind: 'line'; from: Vec2; dir: Vec2; length: number }
  | { kind: 'arc'; center: Vec2; start: number; length: number };

// Counter-clockwise, starting in the middle of the right-hand short side.
const PIECES: Piece[] = [
  { kind: 'line', from: [A, 0], dir: [0, 1], length: SB },
  { kind: 'arc', center: [SA, SB], start: 0, length: QUARTER },
  { kind: 'line', from: [SA, B], dir: [-1, 0], length: 2 * SA },
  { kind: 'arc', center: [-SA, SB], start: Math.PI / 2, length: QUARTER },
  { kind: 'line', from: [-A, SB], dir: [0, -1], length: 2 * SB },
  { kind: 'arc', center: [-SA, -SB], start: Math.PI, length: QUARTER },
  { kind: 'line', from: [-SA, -B], dir: [1, 0], length: 2 * SA },
  { kind: 'arc', center: [SA, -SB], start: (3 * Math.PI) / 2, length: QUARTER },
  { kind: 'line', from: [A, -SB], dir: [0, 1], length: SB },
];

/** Length of a ring's centre line. */
export const LOOP_LENGTH = PIECES.reduce((sum, piece) => sum + piece.length, 0);

const STARTS = PIECES.map((_, i) => PIECES.slice(0, i).reduce((sum, piece) => sum + piece.length, 0));

/** Loop parameters of the corner midpoints, in the order (+,+), (−,+), (−,−), (+,−). */
export const CORNERS = [1, 3, 5, 7].map((i) => (STARTS[i]! + QUARTER / 2) / LOOP_LENGTH) as [number, number, number, number];

function locate(u: number): { piece: Piece; s: number } {
  let s = (((u % 1) + 1) % 1) * LOOP_LENGTH;
  for (const piece of PIECES) {
    if (s <= piece.length) return { piece, s };
    s -= piece.length;
  }
  const last = PIECES[PIECES.length - 1]!;
  return { piece: last, s: last.length };
}

/** Point on the rounded rectangle at loop parameter u (by arc length; any real u, one lap per unit). */
export function loopPoint(u: number): Vec2 {
  const { piece, s } = locate(u);
  if (piece.kind === 'line') return [piece.from[0] + piece.dir[0] * s, piece.from[1] + piece.dir[1] * s];
  const angle = piece.start + s / R;
  return [piece.center[0] + R * Math.cos(angle), piece.center[1] + R * Math.sin(angle)];
}

/** Unit tangent at loop parameter u, pointing the way u grows. */
export function loopTangent(u: number): Vec2 {
  const { piece, s } = locate(u);
  if (piece.kind === 'line') return [piece.dir[0], piece.dir[1]];
  const angle = piece.start + s / R;
  return [-Math.sin(angle), Math.cos(angle)];
}

/** Places a loop coordinate in 3D for the ring's plane. */
export function toPlane(plane: Plane, [a, b]: Vec2): Vec3 {
  if (plane === 'xy') return [a, b, 0];
  if (plane === 'yz') return [0, a, b];
  return [b, 0, a];
}

/** Index range of a tube (`segments` per lap, `radial` sides, 6 indices per quad) that shows the stretch [from, to] in laps. */
export function tubeRange(from: number, to: number, segments: number, radial: number): { start: number; count: number } {
  const first = Math.round(from * segments);
  const last = Math.round(to * segments);
  return { start: first * radial * 6, count: Math.max(last - first, 0) * radial * 6 };
}
