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
