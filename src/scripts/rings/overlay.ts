import { damp } from '../../lib/rings/math';
import { RING_KEYS, type RingKey, type SceneState } from '../../lib/rings/story';
import type { Weights } from './scene';

/** Opacity of the other rings while one of them is singled out. */
const DIM = 0.15;

export interface Overlay {
  readonly weights: Weights;
  /** The ring under the mouse in the 3D view (null when none). */
  point(ring: RingKey | null): void;
  /** A tap on a ring, its label or its word singles it out; a second tap on it, or a tap elsewhere, lets go. */
  tap(ring: RingKey | null): void;
  /** Eases the highlight; it only applies while the knot is docked at the approach stage. */
  ease(dt: number, docked: boolean): void;
  /** Draws the approach labels (--draw), inks the ring words (--word) and the two story phrases (--mark). */
  show(state: SceneState): void;
  dispose(): void;
}

const ringKey = (value: string | undefined): RingKey | null => RING_KEYS.find((key) => key === value) ?? null;

/**
 * The DOM half of the story: the approach labels, the ring words and story phrases in the lead, and singling out one
 * ring — hovering the ring itself, its label or its word (mouse), or tapping any of them (touch). The singled-out
 * ring's label and word are marked with data-lit.
 */
export function createOverlay(): Overlay {
  const labelBox = document.querySelector<HTMLElement>('.stage-labels');
  const labels = Array.from(document.querySelectorAll<HTMLElement>('.stage-label')).map((el) => ({ el, key: ringKey(el.dataset.ring), value: -1 }));
  const words = Array.from(document.querySelectorAll<HTMLElement>('.approach-lead [data-ring]')).map((el) => ({ el, key: ringKey(el.dataset.ring), value: -1 }));
  const marks = Array.from(document.querySelectorAll<HTMLElement>('.approach-lead [data-mark]')).map((el) => ({
    el,
    key: el.dataset.mark === 'fall' ? ('fall' as const) : ('take' as const),
    value: -1,
  }));
  const hoverable = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const weights: Weights = { design: 1, engineering: 1, automation: 1 };
  let hovered: RingKey | null = null;
  let pointed: RingKey | null = null;
  let tapped: RingKey | null = null;
  let lit: RingKey | null = null;

  // Words and labels answer the mouse themselves; the rings are found by the caller's hit test (`point`).
  const targets = hoverable ? [...words.map((w) => w.el), ...labels.map((l) => l.el.querySelector<HTMLElement>('.stage-label-text'))] : [];
  const enter = (event: PointerEvent): void => {
    hovered = ringKey((event.currentTarget as HTMLElement).closest<HTMLElement>('[data-ring]')?.dataset.ring);
  };
  const leave = (): void => {
    hovered = null;
  };
  for (const target of targets) {
    target?.addEventListener('pointerenter', enter);
    target?.addEventListener('pointerleave', leave);
  }

  const light = (ring: RingKey | null): void => {
    if (ring === lit) return;
    lit = ring;
    for (const item of [...words, ...labels]) item.el.toggleAttribute('data-lit', item.key === ring);
    labelBox?.toggleAttribute('data-focus', ring !== null);
  };

  return {
    weights,
    point(ring) {
      pointed = ring;
    },
    tap(ring) {
      tapped = ring === tapped ? null : ring;
    },
    ease(dt, docked) {
      if (!docked) tapped = null;
      const active = docked ? (hovered ?? pointed ?? tapped) : null;
      light(active);
      for (const key of RING_KEYS) {
        const target = active ? (key === active ? 1 : DIM) : 1;
        const next = damp(weights[key], target, 12, dt);
        weights[key] = Math.abs(next - target) < 0.002 ? target : next;
      }
    },
    show(state) {
      for (const label of labels) {
        const value = label.key ? state.labels[label.key] : 1;
        if (value === label.value) continue;
        label.value = value;
        label.el.style.setProperty('--draw', value.toFixed(3));
      }
      for (const word of words) {
        const value = word.key ? state.words[word.key] : 1;
        if (value === word.value) continue;
        word.value = value;
        word.el.style.setProperty('--word', value.toFixed(3));
      }
      for (const mark of marks) {
        const value = state.marks[mark.key];
        if (value === mark.value) continue;
        mark.value = value;
        mark.el.style.setProperty('--mark', value.toFixed(3));
      }
    },
    dispose() {
      for (const target of targets) {
        target?.removeEventListener('pointerenter', enter);
        target?.removeEventListener('pointerleave', leave);
      }
      light(null);
      for (const label of labels) label.el.style.removeProperty('--draw');
      for (const word of words) word.el.style.removeProperty('--word');
      for (const mark of marks) mark.el.style.removeProperty('--mark');
    },
  };
}
