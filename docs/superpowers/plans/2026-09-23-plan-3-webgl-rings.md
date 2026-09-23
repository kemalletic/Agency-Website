# Plan 3 — WebGL Rings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the rings into the site's one big idea: three live Borromean rings that assemble in the hero, travel down the page into the Approach figure while flattening into a diagram, and then — pinned — show "take one away and the whole thing falls apart" before locking together again. Posters rendered from the same scene stand in wherever 3D should not run.

**Architecture:** All geometry, framing and choreography are pure functions in `src/lib/rings/` (Vitest-tested, including a proof-by-sampling that no tube ever passes through another or through the floor). A lazily imported Three.js module (`src/scripts/rings/`) renders them into one fixed, full-viewport canvas behind the page; each frame it frames the knot inside the current DOM stage with a camera view offset, so the canvas and the posters frame the knot identically. A small main-bundle module pins the Approach grid, decides when to load the 3D and falls back to posters on any failure. A dev-only "poster studio" page renders the posters from the real scene and doubles as a story scrubber for tuning.

**Tech Stack:** Three.js r186 (WebGL2 `WebGLRenderer`, `MeshPhysicalMaterial`, `RoomEnvironment` + PMREM, PCF shadow map, contact shadows), GSAP 3.15 ScrollTrigger (pin, refresh events), Astro 7 (`astro:assets`, integration API for the dev page), Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-23-studio-site-redesign-design.md` §9 (rings), with §3, §8.2, §8.3, §13, §14. Plan 3 of 4; Plan 4 adds the OG image (from the same poster studio), JSON-LD, sitemap, 404, audits and deploy docs.

## Global Constraints

- Run every `npm`/`npx` command with Node 24.21.0 (`export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH";` in Git Bash).
- Versions: `three@^0.186.0`, `@types/three@^0.186.0` (r186 has no `PCFSoftShadowMap`; soft shadows are `PCFShadowMap` + `shadow.radius`).
- Truthful topology (spec §3): no tube ever passes through another and nothing sinks into the floor. The green ring is drawn and undrawn along its own path, never threaded. Unit tests enforce a centre-line clearance above `2 × 0.076` for every sampled state.
- 3D runs only with JS, `prefers-reduced-motion: no-preference`, WebGL2 without a major performance caveat (no software rendering) and no Save-Data. Otherwise, and on any failure or context loss, posters (same framing) are shown and the Approach pin is removed.
- The 3D never blocks content. It is imported after `load` plus an idle callback (1.5 s timeout); the canvas is `aria-hidden`, `pointer-events: none` and never an LCP candidate; zero console errors in both the 3D path and the fallback path.
- Rendering budget: DPR ≤ 1.75 (≤ 1.5 on touch or below 48rem), canvas ≤ 5 MP. Frames are drawn only when an input changed and the stage is (nearly) on screen. The ticker stops in hidden tabs.
- Bundles: Three.js chunk ≤ 180 KB gzip (lazy); initial JS stays ≤ 70 KB gzip.
- At most two pinned sections: Approach (this plan) and Process (Plan 2).
- Ring colours come from the CSS tokens (`--porcelain`, `--graphite`, `--accent`).
- Every animated value is a pure function of time (intro, idle) or scroll (journey, sequence), so scrolling back reverses everything.
- No `style=""` attributes except data-carrying custom properties (`--x`, `--y`, `--draw`, `--mark`).
- Commit after each task with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.

## File Map

```text
package.json                               + three, @types/three
astro.config.ts                            registers the dev-only poster studio integration
src/lib/rings/config.ts                    geometry, framing, timing constants (single source)
src/lib/rings/math.ts                      phase, easing, damp (no DOM, no three)
src/lib/rings/curve.ts                     arc-length rounded-rectangle loop, planes, corners, tube index ranges
src/lib/rings/layout.ts                    camera distance, view offset, pinned stage position, stage blend/visibility
src/lib/rings/story.ts                     the story as pure state: hero, intro, journey, "take one away"
src/lib/rings/labels.ts                    projection to stage fractions, approach label anchors
src/scripts/rings/geometry.ts              RingCurve, ring tubes, the drawable (two-lap) green ring with caps
src/scripts/rings/materials.ts             token colours, physical materials
src/scripts/rings/contact-shadow.ts        soft floor contact shadows
src/scripts/rings/scene.ts                 renderer setup, lights, environment, apply(state) + render()
src/scripts/rings/pointer.ts               hover lean + drag/swipe spin with inertia
src/scripts/rings/overlay.ts               approach labels (--draw), ink phrases (--mark), word ↔ ring highlight
src/scripts/rings/index.ts                 live driver: canvas, stages, frame loop, fallbacks (lazy chunk)
src/scripts/motion/rings.ts                main bundle: Approach pin, idle loading, poster fallback
src/scripts/motion/index.ts                starts initRings() first (pins in document order)
src/styles/rings.css                       canvas, poster hand-over, live-only states
src/layouts/Base.astro                     head script decides data-rings; imports rings.css
src/styles/base.css                        body loses its (duplicate) background so the canvas shows through
src/components/Hero.astro                  poster class `stage-poster`
src/components/Approach.astro              square stage: approach poster + positioned labels (replaces the SVG)
src/components/art/ApproachDiagram.astro   deleted
src/assets/posters/hero.png                re-rendered from the scene (transparent)
src/assets/posters/approach.png            new, rendered from the scene (transparent)
src/dev/posters-integration.ts             dev-only route + PNG save endpoint
src/dev/posters.astro, src/dev/posters.ts  poster studio + story scrubber
tests/unit/rings-geometry.test.ts          math + curve
tests/unit/rings-layout.test.ts            layout
tests/unit/rings-story.test.ts             story, including the no-cheating invariants
tests/unit/rings-labels.test.ts            projection + label anchors
tests/dist/approach.test.ts, hero.test.ts  updated markup expectations
tests/dist/rings.test.ts                   head decision script, no canvas in HTML, no dev route in dist
```

## How the pieces talk

```text
head script ─ sets html[data-rings="pending"] when 3D is plausible (JS, motion OK, WebGL2, no Save-Data)
            └ after 4 s still pending → "poster" (hero poster fades in; 3D may still take over later)
motion/index.ts → initRings() (inside the no-preference matchMedia context)
   ├ ScrollTrigger pin on #approach .approach-grid  (centre-centre if it fits, else top+16; 220 % / 160 % of vh)
   └ load + idle → import('../rings/index').startRings({ pin, intro, onLost })
         ├ resolves after the first frame → html[data-rings="live"] (canvas fades in, posters fade out)
         └ rejects / context lost → html[data-rings="off"], pin killed, scroll position kept
rings/index.ts, every gsap tick:
   scroll → journey (approach top at viewport bottom → pin start) and sequence (pin start → end, damped)
   time   → intro clock, idle spin (+ drag), hover tilt
   storyState(inputs) → poses, accent arc, camera, floor, labels, marks
   stage = mix(hero rect, approach rect (pin-aware), stageMix) → camera.setViewOffset → render
```

---

### Task 1: Ring geometry — constants, easing, the arc-length loop

**Files:**
- Modify: `package.json`, `package-lock.json` (three, @types/three)
- Create: `src/lib/rings/config.ts`, `src/lib/rings/math.ts`, `src/lib/rings/curve.ts`
- Test: `tests/unit/rings-geometry.test.ts`

**Interfaces:**
- Produces: `PHI`, `RING {halfLong, halfShort, corner, tube}`, `BOUND_RADIUS`, `FLOOR_Y`, `LIGHT_DIRECTION`, `PITCH`, `FRAMING {hero, approach, floor}`, `SPIN_SPEED`, `INTRO`, `SEQUENCE`, `SLIDE`, `FLOOR`; `clamp01`, `lerp`, `phase(x, from, to)`, `smoothstep`, `expoOut`, `power2InOut`, `damp(current, target, rate, dt)`; `type Plane = 'xy'|'yz'|'zx'`, `type Vec2`, `type Vec3`, `LOOP_LENGTH`, `CORNERS: [number, number, number, number]`, `loopPoint(u): Vec2`, `loopTangent(u): Vec2`, `toPlane(plane, Vec2): Vec3`, `tubeRange(from, to, segments, radial): {start, count}`.

- [ ] **Step 1: Install Three.js**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npm install three@^0.186.0 && npm install -D @types/three@^0.186.0
```

Expected: `package.json` lists `"three": "^0.186.0"` in dependencies and `"@types/three": "^0.186.0"` in devDependencies.

- [ ] **Step 2: Write the failing test** — `tests/unit/rings-geometry.test.ts`

```ts
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
```

- [ ] **Step 3: Run it and watch it fail**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/rings-geometry.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/rings/config`.

- [ ] **Step 4: Write `src/lib/rings/config.ts`**

```ts
/** Geometry, framing and timing of the Borromean rings (spec §9). Lengths are world units; the knot's centre is the origin. */

export const PHI = (1 + Math.sqrt(5)) / 2;

/** Every ring is the same rounded rectangle, as in the original shader: half extents (φ/2, 1/2), corner 0.3, tube 0.076. */
export const RING = { halfLong: PHI / 2, halfShort: 0.5, corner: 0.3, tube: 0.076 } as const;

/** Radius of the sphere that bounds the assembled knot; stages are framed by it. */
export const BOUND_RADIUS = 1.1;

/** Height of the floor under the knot (original shader: uFloor). */
export const FLOOR_Y = -1.22;

/** Direction towards the key light (original shader: L). */
export const LIGHT_DIRECTION = [-0.34, 1, 0.5] as const;

/** Camera elevation in degrees: the original eye (0.22, 2.1, 8.7) looked at (0.22, -0.32, 0). */
export const PITCH = (Math.atan2(2.42, 8.7) * 180) / Math.PI;

/**
 * How a stage frames the knot. `fill`: the bounding radius as a share of the stage side. `anchor`: where the knot's
 * centre sits in the stage, as fractions from its top-left corner. The hero matches the original render; on the way to
 * the approach stage the lens narrows from 30° to 10° (a dolly zoom that flattens the knot into a diagram); while the
 * freed rings lie on the floor the camera cranes up and pulls back.
 */
export const FRAMING = {
  hero: { fov: 30, fill: 0.381, anchor: [0.4235, 0.3926] },
  approach: { fov: 10, fill: 0.4, anchor: [0.5, 0.46] },
  floor: { pitch: 40, fill: 0.25, anchor: [0.5, 0.52], targetY: FLOOR_Y + 0.1 },
} as const;

/** Idle rotation in the hero, rad/s. */
export const SPIN_SPEED = 0.14;

/** Intro timings (seconds) and distances: the two free rings slide home, then the green one is drawn through them. */
export const INTRO = { duration: 1.8, slide: 0.9, slideEnd: 1.1, drawFrom: 0.6, drawTo: 1.6, twist: 0.6, settle: 0.06 } as const;

/** Phase boundaries of the pinned "take one away" sequence (progress 0..1, spec §9.5). */
export const SEQUENCE = { hold: 0.12, taken: 0.3, apart: 0.45, fallen: 0.62, rise: 0.7, landed: 0.82, joined: 0.88 } as const;

/** How far the two freed rings slide apart along their free axis before they fall. */
export const SLIDE = 0.85;

/** Contact-shadow strength in the hero, at the docked approach view and with the rings lying on the floor. */
export const FLOOR = { hero: 1, docked: 0.35, fallen: 1 } as const;
```

- [ ] **Step 5: Write `src/lib/rings/math.ts`**

```ts
/** Scalar helpers for the rings story and layout. No DOM, no three.js — safe in the main bundle and in tests. */

export const clamp01 = (x: number): number => (x < 0 ? 0 : x > 1 ? 1 : x);

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** How far x has moved through [from, to], clamped to 0..1. */
export const phase = (x: number, from: number, to: number): number => {
  if (to <= from) return x >= to ? 1 : 0;
  return clamp01((x - from) / (to - from));
};

export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

export const expoOut = (t: number): number => {
  const x = clamp01(t);
  return x === 1 ? 1 : 1 - 2 ** (-10 * x);
};

export const power2InOut = (t: number): number => {
  const x = clamp01(t);
  return x < 0.5 ? 2 * x * x : 1 - 2 * (1 - x) ** 2;
};

/** Frame-rate independent approach of `current` towards `target` (rate in 1/s). */
export const damp = (current: number, target: number, rate: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-rate * dt));
```

- [ ] **Step 6: Write `src/lib/rings/curve.ts`**

```ts
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
```

- [ ] **Step 7: Run the tests and see them pass**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/rings-geometry.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/rings tests/unit/rings-geometry.test.ts
git commit -m "feat: add ring geometry — constants, easing and the arc-length loop

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Stage layout maths

**Files:**
- Create: `src/lib/rings/layout.ts`
- Test: `tests/unit/rings-layout.test.ts`

**Interfaces:**
- Consumes: `BOUND_RADIUS` (config), `lerp` (math).
- Produces: `interface Stage {x, y, size}` (centre and side in viewport pixels), `interface ViewOffset {fullWidth, fullHeight, x, y, width, height}`, `interface PinRange {start, end}`, `cameraDistance(fov, fill): number`, `viewOffset(stage, anchor, viewport): ViewOffset`, `pinnedY(natural, scroll, pin?): number`, `mixStages(a, b, t): Stage`, `stageInView(stage, viewport, margin = 0.5): boolean`, `progressAt(scroll, start, end): number`.

- [ ] **Step 1: Write the failing test** — `tests/unit/rings-layout.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { BOUND_RADIUS } from '../../src/lib/rings/config';
import { cameraDistance, mixStages, pinnedY, progressAt, stageInView, viewOffset } from '../../src/lib/rings/layout';

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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/rings-layout.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/rings/layout`.

- [ ] **Step 3: Write `src/lib/rings/layout.ts`**

```ts
import { BOUND_RADIUS } from './config';
import { lerp } from './math';

/** A square stage in viewport (or page) pixels: its centre and side. */
export interface Stage {
  x: number;
  y: number;
  size: number;
}

/** Arguments for `PerspectiveCamera.setViewOffset`. */
export interface ViewOffset {
  fullWidth: number;
  fullHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Scroll positions between which an element stays pinned. */
export interface PinRange {
  start: number;
  end: number;
}

const DEG = Math.PI / 180;

/** Camera distance at which the bounding sphere spans `fill` of the stage side (as a radius) for a vertical `fov`. */
export function cameraDistance(fov: number, fill: number): number {
  return BOUND_RADIUS / (2 * fill * Math.tan((fov * DEG) / 2));
}

/**
 * Makes a full-viewport canvas draw the knot exactly where, and as large as, a render of the stage alone would:
 * the canvas becomes a window onto a virtual square image the size of the stage, centred on the knot's anchor.
 */
export function viewOffset(stage: Stage, anchor: readonly [number, number], viewport: { width: number; height: number }): ViewOffset {
  const { size } = stage;
  return {
    fullWidth: size,
    fullHeight: size,
    x: size * (1 - anchor[0]) - stage.x,
    y: size * (1 - anchor[1]) - stage.y,
    width: viewport.width,
    height: viewport.height,
  };
}

/** Viewport y of a point `natural` px down the page that sits inside an element pinned over `pin` (if any). */
export function pinnedY(natural: number, scroll: number, pin?: PinRange): number {
  if (!pin) return natural - scroll;
  return natural - scroll + Math.min(Math.max(scroll - pin.start, 0), pin.end - pin.start);
}

export function mixStages(a: Stage, b: Stage, t: number): Stage {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), size: lerp(a.size, b.size, t) };
}

/** Whether a stage, grown by `margin` of its size on every side (shadows, falling rings), overlaps the viewport. */
export function stageInView(stage: Stage, viewport: { width: number; height: number }, margin = 0.5): boolean {
  const reach = stage.size * (0.5 + margin);
  return stage.x + reach > 0 && stage.x - reach < viewport.width && stage.y + reach > 0 && stage.y - reach < viewport.height;
}

/** Scroll progress through [start, end], clamped to 0..1. */
export function progressAt(scroll: number, start: number, end: number): number {
  if (end <= start) return scroll >= end ? 1 : 0;
  return Math.min(Math.max((scroll - start) / (end - start), 0), 1);
}
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/rings-layout.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rings/layout.ts tests/unit/rings-layout.test.ts
git commit -m "feat: add stage layout maths for the rings canvas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The story as pure state

**Files:**
- Create: `src/lib/rings/story.ts`
- Test: `tests/unit/rings-story.test.ts`

**Interfaces:**
- Consumes: config constants; `CORNERS`, `loopPoint`, `toPlane`, `type Plane` (curve); `expoOut`, `lerp`, `phase`, `power2InOut`, `smoothstep` (math).
- Produces: `type RingKey = 'design'|'engineering'|'automation'`, `RING_KEYS`, `RING_PLANE`, `interface Pose {position: Vector3, quaternion: Quaternion}`, `interface CameraState {fov, pitch, fill, anchor: [number, number], target: Vector3}`, `interface SceneState {poses, accent {from, to}, camera, stageMix, floor {opacity, sharpness, spread}, labels, marks {take, fall}}`, `interface StoryInput {intro, spin, tilt: [number, number], journey, sequence, symmetry}`, `towardCamera(pitch)`, `cameraUp(pitch)`, `ISO: Quaternion`, `heroOrientation(spin, tilt, twist = 0)`, `nearestSymmetry(q)`, `storyState(input): SceneState`, `worldRing(key, pose, count, from = 0, to = 1): Vector3[]`.

The choreography (spec §9.5, refined):

| Input | What happens |
|---|---|
| `intro` 0 → 1.8 s | porcelain and graphite slide home along their free axis (expo out, 1.1 s); from 0.6 s the green ring is drawn from its front corner (expo out, 1 s); the knot settles with a small twist |
| hero idle | the original pose `rot(2.2 + spin, 0.55, 0.25)`, plus the pointer lean |
| `journey` 0 → 1 | stage blend, slerp to the nearest of four identical approach orientations (≤ 105°), lens 30° → 10° (dolly zoom), floor fades to 35 %, labels draw over the last 18 % |
| `sequence` 0 – 0.12 | hold |
| 0.12 – 0.30 | the green ring opens at its front corner and undraws both ways; the knot rolls a quarter turn so the free axis runs across the screen; labels fade; "take one away" inks |
| 0.30 – 0.45 | porcelain slides left, graphite right (±0.85), the camera starts to pull back |
| 0.45 – 0.62 | both drift outwards, drop with gravity, land flat with one small hop; the camera cranes to 40° over the floor; "falls apart" inks |
| 0.62 – 0.70 | rest |
| 0.70 – 0.88 | they rise back along the same path and slide together |
| 0.88 – 1.00 | the knot rolls back, the green ring closes again, labels redraw |

- [ ] **Step 1: Write the failing test** — `tests/unit/rings-story.test.ts`

```ts
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
    expect(state.labels).toBe(1);
    expect(storyState({ ...hero, journey: 0.5 }).labels).toBe(0);
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
    expect(held.labels).toBe(1);
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
    expect(end.labels).toBe(1);
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/rings-story.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/rings/story`.

- [ ] **Step 3: Write `src/lib/rings/story.ts`**

```ts
import { Euler, Matrix4, Quaternion, Vector3 } from 'three';
import { FLOOR, FLOOR_Y, FRAMING, INTRO, PITCH, RING, SEQUENCE, SLIDE } from './config';
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
  /** 0..1: how far the approach labels are drawn. */
  labels: number;
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
  /** 0..1 through the pinned "take one away" sequence. */
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

  // The pinned sequence; its second half (`back`) retraces the first.
  const back = p >= (S.fallen + S.rise) / 2;
  const turn = back ? 1 - power2InOut(phase(p, S.joined, S.joined + 0.08)) : power2InOut(phase(p, S.hold, S.taken));
  const gap = back ? 1 - power2InOut(phase(p, S.joined, 1)) : power2InOut(phase(p, S.hold, S.taken));
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
      spread: lerp(1, 2.2, crane),
    },
    labels: p > 0 ? (back ? phase(p, 0.93, 1) : 1 - phase(p, S.hold, S.hold + 0.08)) : phase(input.journey, 0.82, 1),
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
```

- [ ] **Step 4: Run the tests and see them pass**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/rings-story.test.ts`
Expected: PASS (23 tests; the clearance tests take a few seconds).

- [ ] **Step 5: Commit**

```bash
git add src/lib/rings/story.ts tests/unit/rings-story.test.ts
git commit -m "feat: add the rings story as pure, reversible state

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Three.js scene and the dev poster studio

**Files:**
- Create: `src/scripts/rings/geometry.ts`, `src/scripts/rings/materials.ts`, `src/scripts/rings/contact-shadow.ts`, `src/scripts/rings/scene.ts`
- Create: `src/dev/posters-integration.ts`, `src/dev/posters.astro`, `src/dev/posters.ts`
- Modify: `astro.config.ts` (register the integration)
- Replace: `src/assets/posters/hero.png`; create `src/assets/posters/approach.png` (both written by the studio)

**Interfaces:**
- Consumes: `RING`, `FLOOR_Y`, `LIGHT_DIRECTION` (config); `loopPoint`, `loopTangent`, `toPlane`, `tubeRange`, `type Plane` (curve); `cameraDistance`, `viewOffset`, `type Stage` (layout); `lerp` (math); `RING_KEYS`, `towardCamera`, `storyState`, `type RingKey`, `type SceneState`, `type StoryInput` (story).
- Produces: `interface TubeDetail {segments, radial}`, `ringTube(plane, detail)`, `class DrawableRing {mesh, caps, show(from, to): boolean, dispose()}`; `tokenColors(root?)`, `ringMaterial(key, color)`; `class ContactShadow {group, set(opacity, spread), update(renderer, scene, blur), dispose()}`; `interface Quality`, `QUALITY {high, low}`, `interface Viewport {width, height}`, `type Weights = Record<RingKey, number>`, `interface RingsScene {camera, scene, apply(state, stage, viewport, weights), render(), dispose()}`, `createRingsScene(renderer, colors, quality)`; dev route `/dev/posters`, dev endpoint `POST /__posters?name=hero|approach`.

- [ ] **Step 1: Write `src/scripts/rings/geometry.ts`**

```ts
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
```

- [ ] **Step 2: Write `src/scripts/rings/materials.ts`**

```ts
import { Color, MeshPhysicalMaterial } from 'three';
import type { RingKey } from '../../lib/rings/story';

/** Ring colours from the design tokens, so the scene and the page share one palette. */
export function tokenColors(root: Element = document.documentElement): Record<RingKey, string> {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: string): string => style.getPropertyValue(name).trim() || fallback;
  return {
    design: read('--porcelain', '#f4f2ee'),
    engineering: read('--graphite', '#2a2a2c'),
    automation: read('--accent', '#1e4636'),
  };
}

/** Porcelain, satin graphite and glazed green ceramic (spec §9.3). */
const FINISH: Record<RingKey, { roughness: number; clearcoat: number; clearcoatRoughness: number }> = {
  design: { roughness: 0.38, clearcoat: 1, clearcoatRoughness: 0.12 },
  engineering: { roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.4 },
  automation: { roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.1 },
};

export function ringMaterial(key: RingKey, color: string): MeshPhysicalMaterial {
  // Transparent from the start (at full opacity), so dimming a ring for the hover highlight never recompiles its shader.
  return new MeshPhysicalMaterial({ color: new Color(color), ...FINISH[key], transparent: true });
}
```

- [ ] **Step 3: Write `src/scripts/rings/contact-shadow.ts`**

```ts
import {
  Group,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  UniformsUtils,
  WebGLRenderTarget,
  type Color,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

/** Floor area the shadow covers (world units, centred under the knot) and how high above it objects still mark it. */
const SIZE = 6;
const REACH = 2.4;

const blurMaterial = (shader: typeof HorizontalBlurShader | typeof VerticalBlurShader): ShaderMaterial =>
  new ShaderMaterial({ ...shader, uniforms: UniformsUtils.clone(shader.uniforms), depthTest: false });

/**
 * Soft contact shadows (after three.js' webgl_shadow_contact example): an orthographic camera looks up from the floor,
 * records how close each surface comes to it, blurs that twice and lays it on the floor as a warm, dark stain.
 * `update` re-renders it — call it only when something moved.
 */
export class ContactShadow {
  readonly group = new Group();
  private readonly camera = new OrthographicCamera(-SIZE / 2, SIZE / 2, SIZE / 2, -SIZE / 2, 0, REACH);
  private readonly target: WebGLRenderTarget;
  private readonly blurred: WebGLRenderTarget;
  // Opaque with a depth test, so the surface nearest the floor wins: the closer, the darker.
  private readonly depth = new ShaderMaterial({
    vertexShader: 'void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'void main() { gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - gl_FragCoord.z); }',
  });
  private readonly horizontal = blurMaterial(HorizontalBlurShader);
  private readonly vertical = blurMaterial(VerticalBlurShader);
  private readonly plane = new PlaneGeometry(SIZE, SIZE).rotateX(Math.PI / 2);
  private readonly blurPlane: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly floor: Mesh<PlaneGeometry, ShaderMaterial>;

  constructor(resolution: number, color: Color) {
    this.target = new WebGLRenderTarget(resolution, resolution);
    this.blurred = new WebGLRenderTarget(resolution, resolution);
    this.target.texture.generateMipmaps = false;
    this.blurred.texture.generateMipmaps = false;
    this.floor = new Mesh(
      this.plane,
      new ShaderMaterial({
        uniforms: { map: { value: this.target.texture }, color: { value: color }, opacity: { value: 1 }, spread: { value: 1 } },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform sampler2D map;
          uniform vec3 color;
          uniform float opacity;
          uniform float spread;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * ${SIZE.toFixed(1)};
            float falloff = exp(-0.5 * dot(p, p) / (spread * spread));
            gl_FragColor = vec4(color, texture2D(map, vUv).a * opacity * falloff);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
      }),
    );
    // The plane was turned to face the camera below; a mirror in y makes it face up without flipping the texture.
    this.floor.scale.y = -1;
    this.floor.renderOrder = -1;
    this.blurPlane = new Mesh(this.plane, this.horizontal);
    this.blurPlane.visible = false;
    this.camera.rotation.x = Math.PI / 2;
    this.group.add(this.floor, this.blurPlane, this.camera);
  }

  /** Strength (0..1) of the stain and the radius (world units) over which it fades out around the knot. */
  set(opacity: number, spread: number): void {
    this.floor.material.uniforms.opacity.value = opacity;
    this.floor.material.uniforms.spread.value = spread;
  }

  update(renderer: WebGLRenderer, scene: Scene, blur: number): void {
    const previousTarget = renderer.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    this.floor.visible = false;
    scene.overrideMaterial = this.depth;
    scene.updateMatrixWorld();
    renderer.setRenderTarget(this.target);
    renderer.render(scene, this.camera);
    scene.overrideMaterial = previousOverride;
    this.floor.visible = true;
    this.blur(renderer, blur);
    this.blur(renderer, blur * 0.4);
    renderer.setRenderTarget(previousTarget);
  }

  private blur(renderer: WebGLRenderer, amount: number): void {
    this.blurPlane.visible = true;
    this.blurPlane.material = this.horizontal;
    this.horizontal.uniforms.tDiffuse.value = this.target.texture;
    this.horizontal.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(this.blurred);
    renderer.render(this.blurPlane, this.camera);
    this.blurPlane.material = this.vertical;
    this.vertical.uniforms.tDiffuse.value = this.blurred.texture;
    this.vertical.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(this.target);
    renderer.render(this.blurPlane, this.camera);
    this.blurPlane.visible = false;
  }

  dispose(): void {
    this.target.dispose();
    this.blurred.dispose();
    this.plane.dispose();
    this.depth.dispose();
    this.horizontal.dispose();
    this.vertical.dispose();
    this.floor.material.dispose();
  }
}
```

- [ ] **Step 4: Write `src/scripts/rings/scene.ts`**

```ts
import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  type MeshPhysicalMaterial,
  type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FLOOR_Y, LIGHT_DIRECTION } from '../../lib/rings/config';
import { cameraDistance, viewOffset, type Stage } from '../../lib/rings/layout';
import { lerp } from '../../lib/rings/math';
import { RING_KEYS, towardCamera, type RingKey, type SceneState } from '../../lib/rings/story';
import { ContactShadow } from './contact-shadow';
import { DrawableRing, ringTube, type TubeDetail } from './geometry';
import { ringMaterial } from './materials';

export interface Quality {
  tube: TubeDetail;
  shadowMap: number;
  contact: number;
}

export const QUALITY = {
  high: { tube: { segments: 256, radial: 32 }, shadowMap: 1024, contact: 512 },
  low: { tube: { segments: 160, radial: 20 }, shadowMap: 512, contact: 256 },
} satisfies Record<string, Quality>;

export interface Viewport {
  width: number;
  height: number;
}

/** Per-ring opacity; below 1 while a word in the approach lead points at another ring. */
export type Weights = Record<RingKey, number>;

/** The floor stain: warm dark ink at about 55 % (spec §9.3). */
const STAIN = '#2e2822';
const STAIN_OPACITY = 0.55;

export interface RingsScene {
  readonly camera: PerspectiveCamera;
  readonly scene: Scene;
  /** Puts rings, camera and floor into `state`, framed in `stage` (viewport pixels). */
  apply(state: SceneState, stage: Stage, viewport: Viewport, weights: Weights): void;
  render(): void;
  dispose(): void;
}

export function createRingsScene(renderer: WebGLRenderer, colors: Record<RingKey, string>, quality: Quality): RingsScene {
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.8;

  // Key light from the original shader's direction; its shadow map carries the shadows the rings cast on each other.
  const key = new DirectionalLight(new Color(1, 0.972, 0.935), 1.8);
  key.position.set(...LIGHT_DIRECTION).normalize().multiplyScalar(6);
  key.castShadow = true;
  key.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 11 });
  key.shadow.camera.updateProjectionMatrix();
  // Paper-coloured bounce from below, like the original's 0.16 · bounce · background term.
  scene.add(key, key.target, new HemisphereLight(0xffffff, new Color('#ebe9e4'), 0.4));

  const materials: Record<RingKey, MeshPhysicalMaterial> = {
    design: ringMaterial('design', colors.design),
    engineering: ringMaterial('engineering', colors.engineering),
    automation: ringMaterial('automation', colors.automation),
  };
  const accent = new DrawableRing('zx', quality.tube, materials.automation);
  const meshes: Record<RingKey, Mesh> = {
    design: new Mesh(ringTube('xy', quality.tube), materials.design),
    engineering: new Mesh(ringTube('yz', quality.tube), materials.engineering),
    automation: accent.mesh,
  };
  for (const mesh of [...Object.values(meshes), ...accent.caps]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  scene.add(meshes.design, meshes.engineering, meshes.automation);

  const floor = new ContactShadow(quality.contact, new Color(STAIN));
  floor.group.position.y = FLOOR_Y;
  scene.add(floor.group);

  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  let moved = true;
  let blur = -1;

  return {
    camera,
    scene,
    apply(state, stage, viewport, weights) {
      for (const ring of RING_KEYS) {
        const mesh = meshes[ring];
        const pose = state.poses[ring];
        if (!mesh.position.equals(pose.position) || !mesh.quaternion.equals(pose.quaternion)) {
          mesh.position.copy(pose.position);
          mesh.quaternion.copy(pose.quaternion);
          moved = true;
        }
        // A dimmed ring draws after the others and leaves the depth buffer alone, so what it covers shows through.
        materials[ring].opacity = weights[ring];
        materials[ring].depthWrite = weights[ring] >= 1;
        mesh.renderOrder = weights[ring] >= 1 ? 0 : 1;
      }
      if (accent.show(state.accent.from, state.accent.to)) moved = true;

      const view = state.camera;
      const distance = cameraDistance(view.fov, view.fill);
      camera.fov = view.fov;
      camera.near = Math.max(distance - 5, 0.1);
      camera.far = distance + 6;
      camera.position.copy(view.target).addScaledVector(towardCamera(view.pitch), distance);
      camera.lookAt(view.target);
      const offset = viewOffset(stage, view.anchor, viewport);
      camera.setViewOffset(offset.fullWidth, offset.fullHeight, offset.x, offset.y, offset.width, offset.height);

      floor.set(state.floor.opacity * STAIN_OPACITY, state.floor.spread);
      const sharp = lerp(3.2, 1.1, state.floor.sharpness);
      if (sharp !== blur) {
        blur = sharp;
        moved = true;
      }
    },
    render() {
      if (moved) {
        renderer.shadowMap.needsUpdate = true;
        floor.update(renderer, scene, blur);
        moved = false;
      }
      renderer.render(scene, camera);
    },
    dispose() {
      for (const ring of RING_KEYS) materials[ring].dispose();
      meshes.design.geometry.dispose();
      meshes.engineering.geometry.dispose();
      accent.dispose();
      floor.dispose();
      environment.dispose();
    },
  };
}
```

- [ ] **Step 5: Write the dev integration** — `src/dev/posters-integration.ts`

```ts
import { writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';

const POSTERS = new Set(['hero', 'approach']);

/**
 * Dev-only poster studio (spec §9.6). `/dev/posters` renders the rings' resting states with the real scene and offers a
 * story scrubber; its Save button posts PNGs to `/__posters`, which writes them to src/assets/posters/. Neither the
 * page nor the endpoint exists outside `astro dev`.
 */
export function devPosters(): AstroIntegration {
  let root = new URL('file:///');
  return {
    name: 'dev-posters',
    hooks: {
      'astro:config:setup': ({ command, config, injectRoute }) => {
        root = config.root;
        if (command === 'dev') injectRoute({ pattern: '/dev/posters', entrypoint: new URL('./src/dev/posters.astro', root) });
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/__posters', (req, res) => {
          const name = new URL(req.url ?? '/', 'http://localhost').searchParams.get('name') ?? '';
          if (req.method !== 'POST' || !POSTERS.has(name)) {
            res.statusCode = 400;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            writeFile(new URL(`./src/assets/posters/${name}.png`, root), Buffer.concat(chunks))
              .then(() => res.end('ok'))
              .catch((error: unknown) => {
                res.statusCode = 500;
                res.end(String(error));
              });
          });
        });
      },
    },
  };
}
```

- [ ] **Step 6: Register it** — `astro.config.ts` (add the import and the `integrations` line)

```ts
import { defineConfig, envField, fontProviders } from 'astro/config';
import { site } from './src/config/site';
import { devPosters } from './src/dev/posters-integration';

export default defineConfig({
  site: site.url,
  integrations: [devPosters()],
  i18n: {
```

(the rest of the file is unchanged).

- [ ] **Step 7: Write the studio page** — `src/dev/posters.astro`

```astro
---
import '../styles/tokens.css';
import '../styles/base.css';

const controls = [
  { name: 'intro', label: 'Intro (s; 2 = done)', min: 0, max: 2, step: 0.01, value: 2 },
  { name: 'spin', label: 'Spin (rad)', min: 0, max: 6.283, step: 0.01, value: 0 },
  { name: 'journey', label: 'Journey', min: 0, max: 1, step: 0.001, value: 0 },
  { name: 'sequence', label: 'Take one away', min: 0, max: 1, step: 0.001, value: 0 },
  { name: 'symmetry', label: 'Symmetry', min: 0, max: 3, step: 1, value: 0 },
];
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Rings poster studio (dev)</title>
  </head>
  <body>
    <main class="studio">
      <canvas id="stage" width="1360" height="1360"></canvas>
      <form class="controls">
        {
          controls.map((control) => (
            <label>
              <span>{control.label}</span>
              <input type="range" name={control.name} min={control.min} max={control.max} step={control.step} value={control.value} />
            </label>
          ))
        }
        <button type="button" data-save>Save hero + approach posters</button>
        <output data-status></output>
      </form>
    </main>
    <script>
      import './posters';
    </script>
    <style>
      .studio {
        display: grid;
        grid-template-columns: minmax(0, 680px) 280px;
        gap: 32px;
        align-items: start;
        padding: 32px;
      }
      canvas {
        width: 100%;
        height: auto;
        background: var(--paper);
        outline: 1px solid var(--line);
      }
      .controls {
        display: grid;
        gap: 16px;
        font-size: 14px;
      }
      label {
        display: grid;
        gap: 4px;
      }
      button {
        padding: 10px 16px;
        border-radius: 999px;
        background: var(--ink);
        color: var(--paper);
      }
    </style>
  </body>
</html>
```

- [ ] **Step 8: Write the studio script** — `src/dev/posters.ts`

```ts
import { WebGLRenderer } from 'three';
import { storyState, type StoryInput } from '../lib/rings/story';
import { tokenColors } from '../scripts/rings/materials';
import { createRingsScene, QUALITY } from '../scripts/rings/scene';

/** Poster side in pixels: the stages are at most 720 CSS px wide, so this covers ~1.9× density. */
const SIZE = 1360;
const REST: StoryInput = { intro: Infinity, spin: 0, tilt: [0, 0], journey: 0, sequence: 0, symmetry: 0 };
/** The resting states the posters show: the hero before any scrolling, and the docked approach view. */
const POSTERS = { hero: REST, approach: { ...REST, journey: 1 } } satisfies Record<string, StoryInput>;

const canvas = document.querySelector<HTMLCanvasElement>('#stage')!;
const form = document.querySelector<HTMLFormElement>('.controls')!;
const status = document.querySelector<HTMLOutputElement>('[data-status]')!;

const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(SIZE, SIZE, false);
const rings = createRingsScene(renderer, tokenColors(), QUALITY.high);
const stage = { x: SIZE / 2, y: SIZE / 2, size: SIZE };
const viewport = { width: SIZE, height: SIZE };
const weights = { design: 1, engineering: 1, automation: 1 };

function draw(input: StoryInput): void {
  rings.apply(storyState(input), stage, viewport, weights);
  rings.render();
}

function fromForm(): StoryInput {
  const value = (name: string): number => Number((form.elements.namedItem(name) as HTMLInputElement).value);
  const intro = value('intro');
  return {
    ...REST,
    intro: intro >= 2 ? Infinity : intro,
    spin: value('spin'),
    journey: value('journey'),
    sequence: value('sequence'),
    symmetry: value('symmetry'),
  };
}

async function save(name: keyof typeof POSTERS): Promise<void> {
  draw(POSTERS[name]);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('canvas.toBlob failed');
  const response = await fetch(`/__posters?name=${name}`, { method: 'POST', body: blob });
  if (!response.ok) throw new Error(`saving ${name} failed: ${response.status}`);
}

async function saveAll(): Promise<void> {
  status.value = 'Saving…';
  try {
    await save('hero');
    await save('approach');
    status.value = 'Saved hero.png and approach.png';
  } catch (error) {
    status.value = String(error);
  }
  draw(fromForm());
}

form.addEventListener('input', () => draw(fromForm()));
document.querySelector('[data-save]')?.addEventListener('click', () => void saveAll());
draw(fromForm());
```

- [ ] **Step 9: Type-check**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check`
Expected: `0 errors`.

- [ ] **Step 10: Look at every state in the studio and tune the look**

Start `npm run dev -- --host 127.0.0.1 --port 4322` in the background and open `http://127.0.0.1:4322/dev/posters` with the Playwright MCP tools (1440×1000). For each state set the sliders via `browser_evaluate` (set `input.value`, dispatch `input`) and screenshot the canvas:

| State | Sliders | Look for |
|---|---|---|
| hero | journey 0, intro 2 | same composition as `reference/assets/abeb259b406b12574d07a6266a687771.png`: knot upper left of centre, soft warm shadow lower right; porcelain warm white (not blown out), graphite satin with visible highlights, green deep and glazed |
| intro | intro 0, 0.4, 0.8, 1.2 | rings apart → home; green stroke with round caps, no gaps or seams |
| journey | 0.5 | mid-turn, perspective flattening |
| docked | journey 1 | three-fold "star", crisp, faint floor stain; the gap point of the green ring is its nearest corner |
| sequence | 0.2, 0.4, 0.5, 0.56, 0.66, 0.8, 0.95 | undraw from the front, clean slide, fall with hop, rings flat on the floor with crisp dark contact, symmetric return |
| symmetry | journey 1, sequence 0.2 for symmetry 0–3 | same picture every time, gap always at the front |

Tune only these knobs and write down every change for the implementation notes: `scene.environmentIntensity`, the key light intensity, the hemisphere intensity, `STAIN`/`STAIN_OPACITY`, the blur range `lerp(3.2, 1.1, …)`, `renderer.toneMappingExposure`, material `FINISH`. Framing constants (`FRAMING`) change only if the hero no longer matches the reference composition — then re-run all unit tests.

- [ ] **Step 11: Render the posters**

In the studio click "Save hero + approach posters" and wait for `Saved hero.png and approach.png`. Then:

```bash
file src/assets/posters/hero.png src/assets/posters/approach.png
```

Expected: both `PNG image data, 1360 x 1360, 8-bit/color RGBA`. Look at both files (Read tool): transparent background, no clipped shadow edge.

- [ ] **Step 12: Commit**

```bash
git add src/scripts/rings src/dev astro.config.ts src/assets/posters
git commit -m "feat: add the three.js rings scene and a dev poster studio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Poster-mode markup — approach labels, stage states, the head decision

**Files:**
- Create: `src/lib/rings/labels.ts`, `src/styles/rings.css`
- Modify: `src/components/Approach.astro`, `src/components/Hero.astro`, `src/layouts/Base.astro`, `src/styles/base.css`
- Delete: `src/components/art/ApproachDiagram.astro`
- Test: `tests/unit/rings-labels.test.ts`, `tests/dist/approach.test.ts`, `tests/dist/hero.test.ts`, `tests/dist/rings.test.ts`

**Interfaces:**
- Consumes: `cameraDistance` (layout); `cameraUp`, `RING_KEYS`, `storyState`, `towardCamera`, `worldRing`, `type CameraState`, `type RingKey` (story); `RING` (config); posters from Task 4.
- Produces: `projectToStage(point, camera): {u, v, depth}`, `interface LabelAnchor {key, x, y, dir}`, `labelAnchors(): LabelAnchor[]`; markup `.stage-poster` (both stages), `.stage-labels > .stage-label[data-ring][data-dir][style="--x;--y"] > .stage-label-text`; `html[data-rings]` states `pending | poster | live | off`; CSS hooks `.rings-canvas`, `--draw`, `--mark`, `.is-dragging`.

- [ ] **Step 1: Write the failing test** — `tests/unit/rings-labels.test.ts`

```ts
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
```

- [ ] **Step 2: Run it and watch it fail**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/rings-labels.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/rings/labels`.

- [ ] **Step 3: Write `src/lib/rings/labels.ts`**

```ts
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
```

- [ ] **Step 4: Run the unit tests and see them pass**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/rings-labels.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Update the dist tests first**

In `tests/dist/approach.test.ts`, replace the `'labels the diagram in the page language'` test with these two:

```ts
  it('labels the rings in the page language, placed from the 3D view', () => {
    const labels = Array.from(section?.querySelectorAll('.stage-labels .stage-label') ?? []);
    expect(labels.map((label) => label.getAttribute('data-ring'))).toEqual(['design', 'engineering', 'automation']);
    const r = t.approach.rings;
    expect(labels.map((label) => text(label))).toEqual([r.design, r.engineering, r.automation].map((s) => s.toLocaleUpperCase(lang)));
    expect(section?.querySelector('.stage-labels')?.getAttribute('aria-hidden')).toBe('true');
    for (const label of labels) {
      const style = label.getAttribute('style') ?? '';
      for (const axis of ['x', 'y']) {
        const value = Number(new RegExp(`--${axis}:\\s*([\\d.]+)%`).exec(style)?.[1]);
        expect(value, `${label.getAttribute('data-ring')} ${axis}`).toBeGreaterThan(5);
        expect(value, `${label.getAttribute('data-ring')} ${axis}`).toBeLessThan(95);
      }
    }
  });

  it('shows a poster of the approach view until the 3D takes over', () => {
    const stage = section?.querySelector('[data-stage="approach"]');
    expect(Array.from(stage?.querySelectorAll('picture source') ?? []).map((s) => s.getAttribute('type'))).toEqual([
      'image/avif',
      'image/webp',
    ]);
    expect(stage?.querySelector('picture')?.classList.contains('stage-poster')).toBe(true);
    expect(stage?.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    expect(section?.querySelector('.diagram')).toBeNull();
  });
```

In `tests/dist/hero.test.ts`, add to the poster test (after the `loading` expectation):

```ts
    expect(hero?.querySelector('picture')?.classList.contains('stage-poster')).toBe(true);
```

Create `tests/dist/rings.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadPage, pages } from './helpers';

describe.each(pages)('$path rings hooks', ({ path }) => {
  const doc = loadPage(path);

  it('decides before first paint whether the 3D rings are worth waiting for', () => {
    const inline = Array.from(doc.querySelectorAll('head script:not([src])')).map((s) => s.textContent ?? '');
    expect(inline.some((code) => code.includes('WebGL2RenderingContext') && code.includes('saveData') && code.includes('rings'))).toBe(true);
  });

  it('ships no canvas — the 3D module adds one only when it runs', () => {
    expect(doc.querySelector('canvas')).toBeNull();
  });

  it('keeps both ring stages as labelled images with posters', () => {
    for (const name of ['hero', 'approach']) {
      const stage = doc.querySelector(`[data-stage="${name}"]`);
      expect(stage?.getAttribute('role'), name).toBe('img');
      expect(stage?.querySelector('picture.stage-poster'), name).not.toBeNull();
    }
  });
});

describe('build output', () => {
  it('leaves the dev poster studio out', () => {
    expect(existsSync(new URL('../../dist/dev/posters/index.html', import.meta.url))).toBe(false);
  });
});
```

- [ ] **Step 6: Replace the approach figure** — `src/components/Approach.astro`

Frontmatter:

```astro
---
import { Picture } from 'astro:assets';
import approachPoster from '../assets/posters/approach.png';
import { getDictionary, type Locale } from '../i18n';
import { labelAnchors } from '../lib/rings/labels';
import RingDot from './ui/RingDot.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);
// Label dots sit where the docked 3D view puts each ring — computed at build time from the scene's own maths.
const labels = labelAnchors();
const percent = (value: number): string => `${(value * 100).toFixed(2)}%`;
---
```

Figure (replaces the old `<figure>…</figure>`):

```astro
    <figure class="approach-figure" data-reveal="fade">
      <div class="approach-stage" data-stage="approach" role="img" aria-label={t.approach.diagramAlt}>
        <Picture
          src={approachPoster}
          alt=""
          formats={['avif', 'webp']}
          widths={[420, 640, 860, 1080]}
          sizes="(min-width: 64rem) min(38vw, 640px), min(100vw, 26rem)"
          loading="lazy"
          pictureAttributes={{ class: 'stage-poster' }}
        />
        <div class="stage-labels" aria-hidden="true">
          {
            labels.map((label) => (
              <span class="stage-label" data-ring={label.key} data-dir={label.dir} style={`--x: ${percent(label.x)}; --y: ${percent(label.y)}`}>
                <span class="label stage-label-text">{t.approach.rings[label.key].toLocaleUpperCase(lang)}</span>
              </span>
            ))
          }
        </div>
      </div>
      <figcaption class="fig-caption"><span class="fig-num">{t.approach.fig}</span> — {t.approach.caption}</figcaption>
    </figure>
```

Add to its `<style>` (after `.approach-figure .fig-caption`):

```css
  .approach-stage {
    position: relative;
    aspect-ratio: 1;
    container-type: inline-size;
  }
  .approach-stage :global(.stage-poster),
  .approach-stage :global(img) {
    display: block;
    width: 100%;
    height: 100%;
  }
  .stage-labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }
  /* A zero-size anchor at the dot; the live scene draws it with --draw (0..1), posters leave it at 1. */
  .stage-label {
    --len: 7cqi;
    position: absolute;
    left: var(--x);
    top: var(--y);
  }
  .stage-label::before {
    content: '';
    position: absolute;
    left: -2.5px;
    top: -2.5px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--ink);
    transform: scale(min(1, calc(var(--draw, 1) * 4)));
  }
  .stage-label::after {
    content: '';
    position: absolute;
    left: -0.5px;
    width: 1px;
    height: var(--len);
    background: var(--label);
    transform: scaleY(var(--draw, 1));
  }
  .stage-label[data-dir='up']::after {
    bottom: 0;
    transform-origin: 50% 100%;
  }
  .stage-label[data-dir='down']::after {
    top: 0;
    transform-origin: 50% 0;
  }
  .stage-label-text {
    position: absolute;
    left: 0;
    translate: -50% 0;
    white-space: nowrap;
    opacity: clamp(0, calc(var(--draw, 1) * 2 - 1), 1);
  }
  .stage-label[data-dir='up'] .stage-label-text {
    bottom: calc(var(--len) + 6px);
  }
  .stage-label[data-dir='down'] .stage-label-text {
    top: calc(var(--len) + 6px);
  }
```

Then delete the old diagram component:

```bash
git rm src/components/art/ApproachDiagram.astro
```

- [ ] **Step 7: Mark the hero poster** — `src/components/Hero.astro`

Change the `Picture`'s `pictureAttributes={{ class: 'stage-picture' }}` to `pictureAttributes={{ class: 'stage-poster' }}`, and the matching style selector `.hero-stage :global(.stage-picture)` to `.hero-stage :global(.stage-poster)`.

- [ ] **Step 8: Write `src/styles/rings.css`**

```css
/* WebGL rings: the canvas, the poster hand-over and the live-only states (see scripts/motion/rings.ts).
   html[data-rings]: pending → 3D expected soon · poster → slow, posters shown · live → 3D running · off → posters for good. */

.rings-canvas {
  position: fixed;
  top: 0;
  left: 0;
  z-index: -1;
  width: 100%;
  height: 100lvh;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.4s var(--ease-std);
}
[data-rings='live'] .rings-canvas {
  opacity: 1;
}

/* Canvas and posters cross-fade over the same 0.4 s (spec §9.1), so a late hand-over never dips. */
.stage-poster {
  transition: opacity 0.4s var(--ease-std);
}
/* While the rings are on their way the hero poster stays hidden, so the intro can assemble them in its place. */
[data-rings='pending'] [data-stage='hero'] .stage-poster,
[data-rings='live'] .stage-poster {
  opacity: 0;
}

[data-rings='live'] [data-stage='hero'] {
  cursor: grab;
  touch-action: pan-y;
}
[data-rings='live'] [data-stage='hero'].is-dragging {
  cursor: grabbing;
}

/* The two story phrases turn from label grey to ink as the rings act them out. */
[data-rings='live'] .approach-lead [data-mark] {
  color: color-mix(in srgb, var(--ink) calc(var(--mark, 0) * 100%), var(--label));
}
```

- [ ] **Step 9: Decide in the head, load the styles** — `src/layouts/Base.astro`

Add `import '../styles/rings.css';` after the `motion.css` import, and replace the inline script with:

```astro
    <script is:inline>
      (function () {
        var root = document.documentElement;
        root.classList.add('js');
        if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
        root.classList.add('js-motion');
        // The 3D rings are worth waiting for only with WebGL2 and without Save-Data; otherwise posters from the start.
        var connection = navigator.connection;
        if ('WebGL2RenderingContext' in window && !(connection && connection.saveData)) root.dataset.rings = 'pending';
        window.setTimeout(function () {
          if (!root.classList.contains('motion-ready')) root.classList.remove('js-motion');
        }, 3000);
        window.setTimeout(function () {
          if (root.dataset.rings === 'pending') root.dataset.rings = 'poster';
        }, 4000);
      })();
    </script>
```

- [ ] **Step 10: Let the canvas show through the body** — `src/styles/base.css`

Remove `background: var(--paper);` from the `body` rule (the `html` rule keeps the same paper background; a body background would paint over a canvas at `z-index: -1`).

- [ ] **Step 11: Build and run every test**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist
```

Expected: `0 errors`; unit tests all pass; build completes; dist tests all pass (including the new `rings.test.ts`).

- [ ] **Step 12: Look at poster mode**

Restart the preview server on 4321 (stop the old one first) and, with the Playwright MCP tools, emulate `prefers-reduced-motion: reduce`, then screenshot `/` and `/bs/` at 1440×900 (hero; approach section) and 390×844 (approach section). Expected: the hero poster exactly where the old one was; the approach poster (three-fold knot) with DESIGN above, ENGINEERING hanging left, AUTOMATION hanging bottom right (DIZAJN / INŽENJERING / AUTOMATIZACIJA on `/bs/`), text crisp and inside the stage.

- [ ] **Step 13: Commit**

```bash
git add -A src tests
git commit -m "feat: show ring posters with 3D-placed approach labels and decide 3D in the head

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The live rings — pin, loader, driver, interaction

**Files:**
- Create: `src/scripts/rings/pointer.ts`, `src/scripts/rings/overlay.ts`, `src/scripts/rings/index.ts`, `src/scripts/motion/rings.ts`
- Modify: `src/scripts/motion/index.ts`

**Interfaces:**
- Consumes: everything above; `ScrollTrigger` instance (`start`, `end`, `pin`), `gsap.ticker`.
- Produces: `createPointer(stage): Pointer {tilt, update(dt, active), takeSpin(), dispose()}`; `createOverlay(): Overlay {weights, ease(dt, docked), show(state), dispose()}`; `startRings({pin, intro, onLost}): Promise<RingsHandle {dispose()}>`; `initRings(): () => void`.

- [ ] **Step 1: Write `src/scripts/rings/pointer.ts`**

```ts
import { damp } from '../../lib/rings/math';

/** Spin per dragged pixel (rad), and how fast the knot leans towards the mouse (1/s — the original's 0.07 per frame). */
const DRAG = 0.009;
const LEAN = 4.35;

export interface Pointer {
  /** Smoothed mouse offset from the hero stage centre, each axis -0.5..0.5 (easing back to 0 when away). */
  readonly tilt: [number, number];
  /** Advances leaning and fling inertia by `dt` seconds; `active` is false once the knot has left the hero. */
  update(dt: number, active: boolean): void;
  /** Spin (radians) gained from dragging and flinging since the last call. */
  takeSpin(): number;
  dispose(): void;
}

/** Hover the hero knot to lean it towards the mouse; drag (or swipe sideways on touch) to spin it, with inertia. */
export function createPointer(stage: HTMLElement): Pointer {
  const tilt: [number, number] = [0, 0];
  const aim: [number, number] = [0, 0];
  let active = true;
  let drag: { id: number; x: number; time: number } | null = null;
  let velocity = 0;
  let spin = 0;

  const onMove = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse') {
      const box = stage.getBoundingClientRect();
      aim[0] = (event.clientX - box.left) / box.width - 0.5;
      aim[1] = (event.clientY - box.top) / box.height - 0.5;
    }
    if (!drag || event.pointerId !== drag.id) return;
    const step = -(event.clientX - drag.x) * DRAG;
    const elapsed = Math.max((event.timeStamp - drag.time) / 1000, 1 / 240);
    spin += step;
    velocity = velocity * 0.4 + (step / elapsed) * 0.6;
    drag = { id: drag.id, x: event.clientX, time: event.timeStamp };
  };
  const onDown = (event: PointerEvent): void => {
    if (!active || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, time: event.timeStamp };
    velocity = 0;
    try {
      stage.setPointerCapture(event.pointerId);
    } catch {
      // The pointer may already be gone; dragging still works while it stays over the stage.
    }
    stage.classList.add('is-dragging');
  };
  const onUp = (event: PointerEvent): void => {
    if (!drag || event.pointerId !== drag.id) return;
    // Holding still before letting go means no fling.
    if (event.timeStamp - drag.time > 80) velocity = 0;
    drag = null;
    stage.classList.remove('is-dragging');
  };
  const onLeave = (): void => {
    aim[0] = 0;
    aim[1] = 0;
  };

  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerleave', onLeave);

  return {
    tilt,
    update(dt, isActive) {
      active = isActive;
      tilt[0] = damp(tilt[0], active ? aim[0] : 0, LEAN, dt);
      tilt[1] = damp(tilt[1], active ? aim[1] : 0, LEAN, dt);
      if (!drag && velocity !== 0) {
        spin += velocity * dt;
        velocity *= 0.95 ** (dt * 60);
        if (Math.abs(velocity) < 1e-3) velocity = 0;
      }
    },
    takeSpin() {
      const taken = spin;
      spin = 0;
      return taken;
    },
    dispose() {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('pointerleave', onLeave);
      stage.classList.remove('is-dragging');
    },
  };
}
```

- [ ] **Step 2: Write `src/scripts/rings/overlay.ts`**

```ts
import { damp } from '../../lib/rings/math';
import { RING_KEYS, type RingKey, type SceneState } from '../../lib/rings/story';
import type { Weights } from './scene';

/** Opacity of the other rings while a word in the approach lead points at one of them. */
const DIM = 0.15;

export interface Overlay {
  readonly weights: Weights;
  /** Eases the word ↔ ring highlight; it only applies while the knot is docked at the approach stage. */
  ease(dt: number, docked: boolean): void;
  /** Draws the approach labels (--draw) and inks the two story phrases (--mark). */
  show(state: SceneState): void;
  dispose(): void;
}

/** The DOM half of the story: approach labels, the two ink phrases and hovering a ring's word to single it out. */
export function createOverlay(): Overlay {
  const labels = Array.from(document.querySelectorAll<HTMLElement>('.stage-label'));
  const marks = Array.from(document.querySelectorAll<HTMLElement>('.approach-lead [data-mark]')).map((el) => ({
    el,
    key: el.dataset.mark === 'fall' ? ('fall' as const) : ('take' as const),
    value: -1,
  }));
  const words = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ? Array.from(document.querySelectorAll<HTMLElement>('.approach-lead [data-ring]'))
    : [];
  const weights: Weights = { design: 1, engineering: 1, automation: 1 };
  let hovered: RingKey | null = null;
  let drawn = -1;

  const enter = (event: PointerEvent): void => {
    const ring = (event.currentTarget as HTMLElement).dataset.ring;
    hovered = RING_KEYS.find((key) => key === ring) ?? null;
  };
  const leave = (): void => {
    hovered = null;
  };
  for (const word of words) {
    word.addEventListener('pointerenter', enter);
    word.addEventListener('pointerleave', leave);
  }

  return {
    weights,
    ease(dt, docked) {
      for (const key of RING_KEYS) {
        const target = docked && hovered ? (key === hovered ? 1 : DIM) : 1;
        const next = damp(weights[key], target, 12, dt);
        weights[key] = Math.abs(next - target) < 0.002 ? target : next;
      }
    },
    show(state) {
      if (state.labels !== drawn) {
        drawn = state.labels;
        for (const label of labels) label.style.setProperty('--draw', drawn.toFixed(3));
      }
      for (const mark of marks) {
        const value = state.marks[mark.key];
        if (value === mark.value) continue;
        mark.value = value;
        mark.el.style.setProperty('--mark', value.toFixed(3));
      }
    },
    dispose() {
      for (const word of words) {
        word.removeEventListener('pointerenter', enter);
        word.removeEventListener('pointerleave', leave);
      }
      for (const label of labels) label.style.removeProperty('--draw');
      for (const mark of marks) mark.el.style.removeProperty('--mark');
    },
  };
}
```

- [ ] **Step 3: Write the driver** — `src/scripts/rings/index.ts`

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WebGLRenderer } from 'three';
import { INTRO, SPIN_SPEED } from '../../lib/rings/config';
import { mixStages, pinnedY, progressAt, stageInView, type PinRange, type Stage } from '../../lib/rings/layout';
import { damp } from '../../lib/rings/math';
import { heroOrientation, nearestSymmetry, storyState } from '../../lib/rings/story';
import { tokenColors } from './materials';
import { createOverlay } from './overlay';
import { createPointer } from './pointer';
import { createRingsScene, QUALITY, type Viewport } from './scene';

export interface RingsOptions {
  /** ScrollTrigger pinning the approach grid for the "take one away" sequence (created by scripts/motion/rings.ts). */
  pin: ScrollTrigger;
  /** Assemble the knot in the hero — only when no poster was on screen first. */
  intro: boolean;
  /** Called once if the GPU drops the WebGL context. */
  onLost: () => void;
}

export interface RingsHandle {
  dispose(): void;
}

/** Most pixels the canvas may have, so large or dense screens never render 4K frames for three rings. */
const MAX_PIXELS = 5_000_000;
/** How quickly the sequence follows the scroll (1/s): a little weight on top of the scroll itself. */
const FOLLOW = 14;

/** Starts the live rings; resolves after the first frame is on the canvas, rejects if WebGL is unsuitable. */
export async function startRings({ pin, intro, onLost }: RingsOptions): Promise<RingsHandle> {
  const heroStage = document.querySelector<HTMLElement>('[data-stage="hero"]');
  const approachStage = document.querySelector<HTMLElement>('[data-stage="approach"]');
  const section = document.getElementById('approach');
  const grid = pin.pin instanceof HTMLElement ? pin.pin : null;
  if (!heroStage || !approachStage || !section || !grid) throw new Error('rings: stage markup missing');

  const low = window.matchMedia('(max-width: 47.99rem), (pointer: coarse)').matches;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const canvas = document.createElement('canvas');
  canvas.className = 'rings-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  // Asking for the context ourselves keeps software rendering (and three's console error) out: posters beat a slideshow.
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  if (!context) throw new Error('rings: no fast WebGL2');
  document.body.append(canvas);
  const renderer = new WebGLRenderer({ canvas, context, antialias: true, alpha: true });
  const rings = createRingsScene(renderer, tokenColors(), low ? QUALITY.low : QUALITY.high);
  const overlay = createOverlay();
  const pointer = createPointer(heroStage);

  let viewport: Viewport = { width: 0, height: 0 };
  let last: number[] | null = null;
  const resize = (): void => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    // On touch screens a height-only change under 120 px is browser chrome, not a new layout.
    const chrome = coarse && width === viewport.width && Math.abs(height - viewport.height) < 120;
    if ((width === viewport.width && height === viewport.height) || chrome) return;
    viewport = { width, height };
    const cap = low ? 1.5 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cap, Math.sqrt(MAX_PIXELS / Math.max(width * height, 1))));
    renderer.setSize(width, height, false);
    last = null;
  };

  // Stage geometry in page coordinates, measured again whenever ScrollTrigger refreshes (resize, fonts, pins).
  let hero: Stage = { x: 0, y: 0, size: 0 };
  let approach: Stage = { x: 0, y: 0, size: 0 };
  let pinRange: PinRange = { start: 0, end: 0 };
  let journeyRange: PinRange = { start: 0, end: 0 };
  const measure = (): void => {
    const scroll = window.scrollY;
    // The box centre and offsetWidth ignore the hero's CSS scale-in, so measuring during it is still exact.
    const heroBox = heroStage.getBoundingClientRect();
    hero = { x: heroBox.left + heroBox.width / 2, y: heroBox.top + heroBox.height / 2 + scroll, size: heroStage.offsetWidth };
    // The approach stage moves with the pinned grid; measure it against the pin spacer, which never leaves the flow.
    const spacer = grid.parentElement?.classList.contains('pin-spacer') ? grid.parentElement : grid;
    const gridBox = grid.getBoundingClientRect();
    const stageBox = approachStage.getBoundingClientRect();
    approach = {
      x: stageBox.left + stageBox.width / 2,
      y: spacer.getBoundingClientRect().top + scroll + (stageBox.top - gridBox.top) + stageBox.height / 2,
      size: approachStage.offsetWidth,
    };
    pinRange = { start: pin.start, end: pin.end };
    // The knot sets off as the approach section's top enters the viewport and docks as the pin begins.
    journeyRange = { start: Math.max(0, section.getBoundingClientRect().top + scroll - window.innerHeight), end: pin.start };
    last = null;
  };

  let clock = 0;
  let introAt: number | null = null;
  let spin = 0;
  let spinRate = 0;
  let sequence = -1;
  let symmetry = -1;
  let painted = false;

  const frame = (dt: number): void => {
    clock += dt;
    const scroll = window.scrollY;
    const journey = progressAt(scroll, journeyRange.start, journeyRange.end);
    const target = progressAt(scroll, pinRange.start, pinRange.end);
    sequence = sequence < 0 || Math.abs(target - sequence) < 1e-4 ? target : damp(sequence, target, FOLLOW, dt);
    pointer.update(dt, journey === 0);
    const introTime = introAt === null ? Infinity : clock - introAt;
    // Idle spin only in the hero, after the intro, easing in and out.
    spinRate = damp(spinRate, journey === 0 && introTime >= INTRO.duration ? SPIN_SPEED : 0, 2.5, dt);
    spin += spinRate * dt + pointer.takeSpin();
    // Latch the nearest approach orientation as the knot leaves the hero, so the turn never flips mid-way.
    if (journey === 0) symmetry = -1;
    else if (symmetry < 0) symmetry = nearestSymmetry(heroOrientation(spin, pointer.tilt));
    overlay.ease(dt, journey > 0.9);

    const stage = { hero: { x: hero.x, y: hero.y - scroll, size: hero.size }, approach: { x: approach.x, y: pinnedY(approach.y, scroll, pinRange), size: approach.size } };
    const w = overlay.weights;
    // The state is a pure function of these inputs: when none of them moved, the last frame still stands.
    const inputs = [
      stage.hero.x, stage.hero.y, stage.hero.size, stage.approach.x, stage.approach.y, stage.approach.size,
      viewport.width, viewport.height, journey, sequence, spin, pointer.tilt[0], pointer.tilt[1],
      Math.min(introTime, INTRO.duration), symmetry, w.design, w.engineering, w.automation,
    ];
    if (last && inputs.every((value, i) => Math.abs(value - last![i]!) < 1e-6)) return;
    last = inputs;

    const state = storyState({ intro: introTime, spin, tilt: pointer.tilt, journey, sequence, symmetry: Math.max(symmetry, 0) });
    overlay.show(state);
    const at = mixStages(stage.hero, stage.approach, state.stageMix);
    if (!stageInView(at, viewport)) {
      if (painted) renderer.clear();
      painted = false;
      return;
    }
    rings.apply(state, at, viewport, w);
    rings.render();
    painted = true;
  };

  const tick = (_time: number, deltaMs: number): void => frame(Math.min(Math.max(deltaMs, 0) / 1000, 0.1));
  let resizeTimer = 0;
  const onResize = (): void => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 150);
  };
  let stopped = false;
  const stop = (): void => {
    if (stopped) return;
    stopped = true;
    gsap.ticker.remove(tick);
    ScrollTrigger.removeEventListener('refresh', measure);
    window.removeEventListener('resize', onResize);
    window.clearTimeout(resizeTimer);
    canvas.removeEventListener('webglcontextlost', lost);
    pointer.dispose();
    overlay.dispose();
    rings.dispose();
    renderer.dispose();
    canvas.remove();
  };
  function lost(event: Event): void {
    event.preventDefault();
    stop();
    onLost();
  }

  try {
    resize();
    measure();
    // Compile every shader before the first visible frame, off the main thread where the browser allows it.
    await renderer.compileAsync(rings.scene, rings.camera);
  } catch (error) {
    stop();
    throw error;
  }
  ScrollTrigger.addEventListener('refresh', measure);
  window.addEventListener('resize', onResize);
  canvas.addEventListener('webglcontextlost', lost);

  const scroll = window.scrollY;
  const heroOnScreen = stageInView({ x: hero.x, y: hero.y - scroll, size: hero.size }, viewport, 0);
  if (intro && heroOnScreen && progressAt(scroll, journeyRange.start, journeyRange.end) === 0) introAt = 0;
  frame(0);
  gsap.ticker.add(tick);
  return { dispose: stop };
}
```

- [ ] **Step 4: Write the main-bundle loader** — `src/scripts/motion/rings.ts`

```ts
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface Handle {
  dispose(): void;
}

/** Runs `run` once the page has loaded and the main thread is idle (1.5 s at the latest). */
function whenIdle(run: () => void): () => void {
  let idle = 0;
  let timer = 0;
  const schedule = (): void => {
    if ('requestIdleCallback' in window) idle = window.requestIdleCallback(run, { timeout: 1500 });
    else timer = window.setTimeout(run, 200);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    window.removeEventListener('load', schedule);
    if (idle) window.cancelIdleCallback(idle);
    window.clearTimeout(timer);
  };
}

/**
 * The rings set piece (spec §9). Pins the approach grid for the "take one away" sequence, then brings in the WebGL
 * scene once the page is idle. Runs only where the head script expected 3D (html[data-rings]); on any failure the
 * posters stay, the pin goes and the reader keeps their place.
 */
export function initRings(): () => void {
  const root = document.documentElement;
  if (root.dataset.rings !== 'pending' && root.dataset.rings !== 'poster') return () => {};
  const grid = document.querySelector<HTMLElement>('#approach .approach-grid');
  if (!grid) return () => {};

  const wide = window.matchMedia('(min-width: 64rem)');
  const pin = ScrollTrigger.create({
    trigger: grid,
    pin: true,
    // Centred when the grid fits the viewport; otherwise its top — stage, label and lead — stays in view.
    start: () => (grid.offsetHeight <= window.innerHeight - 32 ? 'center center' : 'top top+=16'),
    end: () => `+=${Math.round(window.innerHeight * (wide.matches ? 2.2 : 1.6))}`,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onToggle: (self) => root.classList.toggle('is-pinned', self.isActive),
  });

  let handle: Handle | null = null;
  let done = false;

  const giveUp = (error?: unknown): void => {
    if (done) return;
    done = true;
    if (import.meta.env.DEV && error) console.warn('rings: staying with posters', error);
    handle?.dispose();
    handle = null;
    root.dataset.rings = 'off';
    // Without the rings the pinned stretch would scroll past a still picture: drop it, keep the reader's place.
    const { start, end } = pin;
    const y = window.scrollY;
    pin.kill(true);
    root.classList.remove('is-pinned');
    ScrollTrigger.refresh();
    if (y > end) window.scrollTo(0, y - (end - start));
    else if (y > start) window.scrollTo(0, start);
  };

  const cancel = whenIdle(() => {
    if (done) return;
    const intro = root.dataset.rings === 'pending';
    import('../rings/index')
      .then(({ startRings }) => startRings({ pin, intro, onLost: () => giveUp() }))
      .then((started) => {
        if (done) {
          started.dispose();
          return;
        }
        handle = started;
        root.dataset.rings = 'live';
      })
      .catch(giveUp);
  });

  return () => {
    cancel();
    handle?.dispose();
    handle = null;
    if (!done) root.dataset.rings = 'off';
    done = true;
    root.classList.remove('is-pinned');
  };
}
```

- [ ] **Step 5: Start it first among the motion modules** — `src/scripts/motion/index.ts`

Add `import { initRings } from './rings';` with the other imports, and put `initRings()` right after `initSmoothScroll()` in the `cleanups` array (pins are created in document order: the approach pin before the process pin and before the reveals below it):

```ts
    const cleanups: Cleanup[] = [
      initSmoothScroll(),
      initRings(),
      initReveals(),
      initWork(),
      initProcess(),
      initPrinciples(),
      initContact(),
      initMagnetic(),
    ];
```

- [ ] **Step 6: Check, build, test, measure the bundles**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist
for f in dist/_astro/*.js; do printf '%8s %s\n' "$(gzip -9 -c "$f" | wc -c)" "$f"; done | sort -n
```

Expected: 0 errors, all tests pass. The chunk that contains three.js is ≤ 180 000 bytes gzip; the entry chunk(s) loaded by `index.html` stay ≤ 70 KB gzip in total (check which chunks `dist/index.html` references).

- [ ] **Step 7: Verify the live experience in the browser**

Restart the preview server on 4321, then at 1440×900 with the Playwright MCP tools (mouse wheel for scrolling, since Lenis drives the page):

1. Load `/`. Within ~1.5 s `document.documentElement.dataset.rings === 'live'`, a single `canvas.rings-canvas` exists, no console errors. Screenshots at about 0.2, 0.7, 1.2 and 2.5 s after `live`: the rings slide home, the green ring is drawn through them, then the knot idles.
2. Hover over the hero stage (left, then right): the knot leans. Drag right about 200 px: it spins with a short glide after release.
3. Wheel down in steps of 120 px to the pin start, screenshotting at journey ≈ 0.25, 0.5, 0.75 and 1. The knot travels from the hero stage into the approach stage, turns to the three-fold view and flattens; the labels draw in at the end and meet the rings exactly.
4. Keep wheeling through the pin (screenshots at sequence ≈ 0.05, 0.2, 0.38, 0.5, 0.58, 0.66, 0.8, 0.94, 1). Check the table in Task 3: the header stays hidden, "take one away" and then "the whole thing falls apart" turn to ink, the rings never cross each other or the floor.
5. Wheel back to the top: everything reverses and the idle spin resumes in the hero.
6. At the docked view, hover "Design", "engineering" and "automation" in the lead: the matching ring stays, the others fade to 15 %.
7. Resize to 390×844 and reload. The knot sits in the hero stage, the journey drifts it into the approach stage, and the pin keeps the stage, label and lead in view. Also check 768×1024, 1024×768 and 1920×1080.
8. Check `/bs/` at 1440×900 (labels DIZAJN / INŽENJERING / AUTOMATIZACIJA line up).
9. Fallbacks:
   - Reload with `page.addInitScript` that makes `HTMLCanvasElement.prototype.getContext` return `null` for `'webgl2'`: `data-rings` ends as `off`, both posters are visible, no pin (`.pin-spacer` gone), no console errors.
   - While live, lose the context with `document.querySelector('.rings-canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()`: posters return, the pin is removed, the scroll position still shows the same content.
   - With `prefers-reduced-motion: reduce`: no canvas, posters, no pin.
   - With JavaScript disabled (CDP `Emulation.setScriptExecutionDisabled`): posters and labels visible.
10. Performance: during a scroll through the journey and the pin, record `requestAnimationFrame` intervals and a `PerformanceObserver({ type: 'longtask' })` in the page. Expected: median frame ≤ 17 ms, no long task over 50 ms after the rings are live. When the hero and approach stages are both off-screen, no frames are drawn: wrap `WebGLRenderingContext.prototype.drawElements` with a counter and check it stays flat.

Fix whatever these checks reveal and record every deviation for the implementation notes.

- [ ] **Step 8: Commit**

```bash
git add src/scripts tests
git commit -m "feat: bring the rings to life — intro, journey, pinned story and interaction

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Final posters, full verification and implementation notes

**Files:**
- Replace (if the look changed during Task 6): `src/assets/posters/hero.png`, `src/assets/posters/approach.png`
- Modify: `docs/superpowers/plans/2026-09-23-plan-3-webgl-rings.md` (implementation notes)

- [ ] **Step 1: Re-render the posters if anything visual was tuned after Task 4**

Run the studio (`npm run dev -- --host 127.0.0.1 --port 4322`), click Save, stop the dev server. Then rebuild and check the seamless hand-over. Temporarily set `root.dataset.rings = 'poster'` (so the poster shows), start the page, and compare a screenshot of the hero poster with the first live frame taken without the intro (reload scrolled 1 px so the intro is skipped, then scroll back). They must match.

- [ ] **Step 2: Size check of the posters**

```bash
ls -la dist/_astro/*.avif | sort -k5 -n | tail -8
```

Expected: the largest hero AVIF (1360 w) ≤ 60 KB (spec §3).

- [ ] **Step 3: Full test pass**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist
```

Expected: 0 errors; all unit and dist tests pass.

- [ ] **Step 4: Cross-viewport screenshots**

`/` and `/bs/` at 390×844, 768×1024, 1024×768, 1440×900 and 1920×1080: hero (live), approach docked, sequence at 0.5, and the reduced-motion posters. Nothing overlaps text badly; labels stay inside the stage; the canvas never covers the header, mobile menu or contact sheet.

- [ ] **Step 5: Write the implementation notes**

Append `## Implementation notes (deviations found during execution)` to this plan: a table of `| Where | Change | Why |` rows covering every tuned constant and every fix made during Tasks 4–7.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: record implementation notes for plan 3; final posters

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Implementation notes (deviations found during execution)

| Where | Change | Why |
|---|---|---|
| `src/lib/rings/config.ts` | `FRAMING.hero.fov` is `ORIGINAL_FOV` (2·atan(0.5/3.1) ≈ 18.4°) instead of 30°; the dolly zoom now runs 18.4° → 10°. | At 30° the nearest tubes were visibly exaggerated next to the approved original render; the original lens keeps the hero identical to the design, and the narrowing still flattens the knot on its way down. |
| `src/scripts/rings/contact-shadow.ts` | The depth pass projects every surface down the key-light ray (a sheared parallel projection written straight to clip space), the stain fades around the knot's centre seen along that ray, and high parts keep half their darkness (`1 − 0.5·h/reach`). The constructor takes the light direction and floor height. | A straight-down contact shadow sat under the knot as a round blob; the original's shadow falls lower right and shows the rings' shapes. |
| `src/scripts/rings/scene.ts` | Look tuned against the reference render: `environmentIntensity` 0.5 (plan 0.8), key light 2.3 (1.8), hemisphere 0.5 with a paper ground at 45 % (0.4, full paper), stain opacity 0.7 (0.55), stain blur 2.0 → 0.7 (3.2 → 1.1). | Matches the original's form shading (top-lit, darker undersides) and a soft stain that still shows the rings. |
| `src/scripts/rings/materials.ts` | Softer finishes: porcelain 0.42 / clearcoat 0.6 / 0.35; graphite 0.5 / 0.4 / 0.45; green 0.4 / 0.5 / 0.35 (roughness / clearcoat / clearcoat roughness). | The spec values mirrored the room's light panels as sharp lines (plastic); the original reads as matte ceramic with a soft sheen. |
| `src/lib/rings/story.ts` | Floor `spread` starts at 1.25 in the hero (plan 1). | A wider, softer stain, like the original. |
| `src/scripts/rings/scene.ts` | `renderer.debug.checkShaderErrors = import.meta.env.DEV`. | ANGLE on D3D11 logs harmless X4122 precision warnings through three's program log; the checks also cost a synchronous GPU round trip per program. |
| `src/scripts/rings/scene.ts`, `index.ts`, `src/dev/posters.ts` | `createRingsScene` is async and pauses after prefiltering the environment; `startRings` yields (`breathe`) before appending the canvas and before compiling, and only appends the canvas once the scene exists. | Start-up was one ~250 ms long task. Now the heaviest single task is the one-off first drawing-buffer allocation in `setSize` (60–130 ms on the test GPU, after `load`); nothing else exceeds ~70 ms. |
| `src/scripts/motion/rings.ts` | The idle callback waits at most 500 ms (plan and spec: 1500 ms); the check is `typeof requestIdleCallback === 'function'`. | With GSAP and CSS animations running, Chrome often waited the full timeout, leaving the hero stage empty for up to ~2 s. `'requestIdleCallback' in window` narrowed `window` to `never` in the fallback branch. |
| `src/components/Approach.astro` | The engineering label's text sits mostly left of its leader (`translate: -75% 0`). | On a 350 px stage the centred text ran into the porcelain ring. |
| `src/dev/posters.astro` | Favicon link added. | The dev studio logged a favicon 404. |
| `tests/dist/approach.test.ts` | Regex escapes doubled inside the template literal (`\s`, `\d`). | `\s` in a template literal is just `s`. |
| Tasks 2 and 3 | 11 and 22 tests (the plan said 12 and 23). | Miscount in the plan. |
| Spec §9.6 | Posters are saved by the dev studio's own `POST /__posters` endpoint (no separate Playwright capture script); the OG image moves to Plan 4. | Simpler and dependency-free. |
| Spec §9.1/§9.4/§9.5 (by design, see the plan body) | The hero poster hides while `pending` so the intro can assemble the knot (4 s fallback to the poster); the journey ends at the pin start rather than approach `top top`; leaders are CSS lines scaled by `--draw` instead of DrawSVG; visibility comes from the cached stage rects instead of an IntersectionObserver; the knot turns to the nearest of four identical approach orientations (≤ 105°); the sequence adds a quarter roll and a camera crane over the floor; on desktop the whole approach grid (including the smaller paragraph) is pinned because it fits the viewport. | Truthful motion, no jumps, and a clearer story. |

**Measured (1440×900, AMD integrated GPU over D3D11):**

- **Bundles:** the initial JS is 56.2 KB gzip and the lazy rings chunk (Three.js included) is 142.4 KB gzip.
- **Time to live:** about 0.6 s after `load` with a warm shader cache. A first visit in a fresh browser profile takes 2–3 s while the GPU driver compiles.
- **Frame rate:** scrolling through the journey and the whole pin gave a median frame of 16.7 ms, p95 17.1 ms and max 18 ms, with no long tasks. There were zero draw calls while the stages were off-screen.
- **Hand-over:** the live docked frame and the approach poster differ by a mean of ~1/255 per pixel.
- **Posters:** the hero AVIF is at most 31.8 KB and the approach AVIF at most 32 KB.
- **Fallbacks:**
  - No WebGL2 (and losing the context mid-page) ends in `data-rings="off"` with posters and no pin. The reader keeps their place: the scroll moves back by exactly the pin length. The only output is three's own "Context Lost" log.
  - Reduced motion and no-JS show posters and labels from the start.
