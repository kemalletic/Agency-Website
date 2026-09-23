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
const rings = await createRingsScene(renderer, tokenColors(), QUALITY.high);
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
