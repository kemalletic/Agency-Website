import { Curve, Mesh, SphereGeometry, TubeGeometry, Vector3, type Material } from 'three';
import { RING } from '../../lib/rings/config';
import { loopPoint, loopTangent, toPlane, tubeRange, type Plane } from '../../lib/rings/curve';

export interface TubeDetail {
  /** Segments along one lap of the ring. */
  segments: number;
  /** Segments around the tube. */
  radial: number;
}

/** A ring's centre line, `laps` times round. The loop is parametrised by arc length, so the "At" variants need no remapping. */
class RingCurve extends Curve<Vector3> {
  private readonly plane: Plane;
  private readonly laps: number;

  constructor(plane: Plane, laps: number) {
    super();
    this.plane = plane;
    this.laps = laps;
  }

  override getPoint(t: number, target = new Vector3()): Vector3 {
    const [x, y, z] = toPlane(this.plane, loopPoint(t * this.laps));
    return target.set(x, y, z);
  }

  override getPointAt(u: number, target = new Vector3()): Vector3 {
    return this.getPoint(u, target);
  }

  override getTangent(t: number, target = new Vector3()): Vector3 {
    const [x, y, z] = toPlane(this.plane, loopTangent(t * this.laps));
    return target.set(x, y, z);
  }

  override getTangentAt(u: number, target = new Vector3()): Vector3 {
    return this.getTangent(u, target);
  }
}

/** A closed ring tube. */
export function ringTube(plane: Plane, detail: TubeDetail): TubeGeometry {
  return new TubeGeometry(new RingCurve(plane, 1), detail.segments, RING.tube, detail.radial, true);
}

/**
 * The green ring, built two laps long: any stretch up to one lap that starts in the first lap is a single index range,
 * so `setDrawRange` can draw or undraw it around any point. Two spheres round off the open ends.
 */
export class DrawableRing {
  readonly mesh: Mesh<TubeGeometry, Material>;
  readonly caps: [Mesh<SphereGeometry, Material>, Mesh<SphereGeometry, Material>];
  private readonly plane: Plane;
  private readonly detail: TubeDetail;
  private shown: [number, number] = [Number.NaN, Number.NaN];

  constructor(plane: Plane, detail: TubeDetail, material: Material) {
    this.plane = plane;
    this.detail = detail;
    this.mesh = new Mesh(new TubeGeometry(new RingCurve(plane, 2), detail.segments * 2, RING.tube, detail.radial, false), material);
    const cap = new SphereGeometry(RING.tube, detail.radial, Math.max(8, detail.radial / 2));
    this.caps = [new Mesh(cap, material), new Mesh(cap, material)];
    this.mesh.add(...this.caps);
  }

  /** Shows the stretch [from, to] of the loop, in laps. Returns whether anything changed. */
  show(from: number, to: number): boolean {
    if (from === this.shown[0] && to === this.shown[1]) return false;
    this.shown = [from, to];
    const length = to - from;
    this.mesh.visible = length > 1e-4;
    const { start, count } = tubeRange(from, to, this.detail.segments, this.detail.radial);
    this.mesh.geometry.setDrawRange(start, count);
    const open = length > 1e-4 && length < 1 - 1e-4;
    this.caps.forEach((cap, i) => {
      cap.visible = open;
      const [x, y, z] = toPlane(this.plane, loopPoint(i === 0 ? from : to));
      cap.position.set(x, y, z);
    });
    return true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.caps[0].geometry.dispose();
  }
}
