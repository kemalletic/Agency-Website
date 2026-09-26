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

/** The original render's vertical field of view: focal length 3.1 for a half-height of 0.5. */
export const ORIGINAL_FOV = (2 * Math.atan(0.5 / 3.1) * 180) / Math.PI;

/**
 * How a stage frames the knot. `fill`: the bounding radius as a share of the stage side. `anchor`: where the knot's
 * centre sits in the stage, as fractions from its top-left corner. The hero matches the original render; on the way to
 * the approach stage the lens narrows to 10° (a dolly zoom that flattens the knot into a diagram); while the freed
 * rings lie on the floor the camera cranes up and pulls back.
 */
export const FRAMING = {
  hero: { fov: ORIGINAL_FOV, fill: 0.381, anchor: [0.4235, 0.3926] },
  approach: { fov: 10, fill: 0.4, anchor: [0.5, 0.46] },
  floor: { pitch: 40, fill: 0.25, anchor: [0.5, 0.52], targetY: FLOOR_Y + 0.1 },
} as const;

/** Idle rotation in the hero, rad/s. */
export const SPIN_SPEED = 0.14;

/** Intro timings (seconds) and distances: the two free rings slide home, then the green one is drawn through them. */
export const INTRO = { duration: 1.8, slide: 0.9, slideEnd: 1.1, drawFrom: 0.6, drawTo: 1.6, twist: 0.6, settle: 0.06 } as const;

/**
 * Phase boundaries of the "take one away" sequence (progress 0..1, spec §9.5). By `closed` the knot is whole again, the
 * green ring drawn through; only then do the labels come back.
 */
export const SEQUENCE = { hold: 0.12, taken: 0.3, apart: 0.45, fallen: 0.62, rise: 0.7, landed: 0.82, joined: 0.88, closed: 0.94 } as const;

/**
 * The sequence plays by itself, once a page view, moving the moment the knot docks at the approach stage: its still
 * opening (`SEQUENCE.hold`) is skipped. `dock`: share of the journey from which the knot counts as docked, so a scroll
 * that stops a hair short still starts it. `duration`: seconds for the rest of the sequence.
 */
export const PLAY = { dock: 0.95, duration: 3.6 } as const;

/** How far the two freed rings slide apart along their free axis before they fall. */
export const SLIDE = 0.85;

/** Contact-shadow strength in the hero, at the docked approach view and with the rings lying on the floor. */
export const FLOOR = { hero: 1, docked: 0.35, fallen: 1 } as const;
