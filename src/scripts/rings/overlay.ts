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
