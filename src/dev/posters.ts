import { WebGLRenderer } from 'three';
import { site } from '../config/site';
import { getDictionary, type Locale } from '../i18n';
import { storyState, type StoryInput } from '../lib/rings/story';
import { tokenColors } from '../scripts/rings/materials';
import { createRingsScene, QUALITY } from '../scripts/rings/scene';

/** Poster side in pixels: the stages are at most 720 CSS px wide, so this covers ~1.9× density. */
const SIZE = 1360;
const REST: StoryInput = { intro: Infinity, spin: 0, tilt: [0, 0], journey: 0, sequence: 0, symmetry: 0 };
/** Resting states: the hero before any scrolling, the docked approach view, and the two freed rings lying apart (404). */
const POSTERS = {
  hero: REST,
  approach: { ...REST, journey: 1 },
  fallen: { ...REST, journey: 1, sequence: 0.66 },
} satisfies Record<string, StoryInput>;
/** Open Graph / X large-image card, and the iOS home-screen icon. */
const CARD = { width: 1200, height: 630 };
const ICON = 180;

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

const token = (name: string): string => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const toBlob = (source: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> =>
  new Promise((resolve, reject) => source.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), type, quality));

function preview(name: string, blob: Blob): void {
  const image = document.querySelector<HTMLImageElement>(`[data-preview="${name}"]`);
  if (image) image.src = URL.createObjectURL(blob);
}

/** Greedy word wrap for canvas text. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The social card: studio name, the hero headline and its label line on paper, with the rendered knot on the right. */
async function card(lang: Locale): Promise<Blob> {
  const t = getDictionary(lang);
  const font = token('--font-sans');
  const label = `${t.hero.studio} · ${t.hero.location}`.toLocaleUpperCase(lang);
  // Pass the text: without it only the basic latin subset loads and letters like š fall back to another face.
  await Promise.all([
    document.fonts.load(`300 60px ${font}`, t.hero.title),
    document.fonts.load(`500 26px ${font}`, site.name),
    document.fonts.load(`500 15px ${font}`, label),
  ]);
  draw(POSTERS.hero);
  const out = document.createElement('canvas');
  out.width = CARD.width;
  out.height = CARD.height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = token('--paper');
  ctx.fillRect(0, 0, CARD.width, CARD.height);
  // The knot sits at 42 % / 39 % of the render: this puts it right of centre with its shadow running off the bottom.
  ctx.drawImage(canvas, 560, -30, 720, 720);

  ctx.fillStyle = token('--ink');
  ctx.font = `500 26px ${font}`;
  ctx.letterSpacing = '-0.5px';
  ctx.fillText(site.name, 72, 104);
  ctx.fillStyle = token('--accent');
  ctx.beginPath();
  ctx.arc(72 + ctx.measureText(site.name).width + 10, 99, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = token('--ink');
  ctx.font = `300 60px ${font}`;
  ctx.letterSpacing = '-2.8px';
  const lines = wrap(ctx, t.hero.title, 540);
  const leading = 62;
  const first = 330 - (lines.length * leading) / 2 + leading * 0.8;
  lines.forEach((line, i) => ctx.fillText(line, 68, first + i * leading));

  ctx.fillStyle = token('--label');
  ctx.font = `500 15px ${font}`;
  ctx.letterSpacing = '2.1px';
  ctx.fillText(label, 72, CARD.height - 64);
  return toBlob(out, 'image/jpeg', 0.9);
}

/** The home-screen icon: the flattened three-fold knot on paper. */
async function icon(): Promise<Blob> {
  draw(POSTERS.approach);
  const out = document.createElement('canvas');
  out.width = ICON;
  out.height = ICON;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = token('--paper');
  ctx.fillRect(0, 0, ICON, ICON);
  // The docked knot, tubes included, spans about 0.18–0.81 of the render around (0.5, 0.455): crop with a margin.
  const side = SIZE * 0.8;
  ctx.drawImage(canvas, SIZE * 0.5 - side / 2, SIZE * 0.455 - side / 2, side, side, 0, 0, ICON, ICON);
  return toBlob(out);
}

async function saveAll(): Promise<void> {
  status.value = 'Saving…';
  const images = new FormData();
  try {
    for (const name of Object.keys(POSTERS) as Array<keyof typeof POSTERS>) {
      draw(POSTERS[name]);
      images.append(name, await toBlob(canvas));
    }
    for (const lang of ['en', 'bs'] as const) images.append(`og-${lang}`, await card(lang));
    images.append('apple-touch-icon', await icon());
    for (const [name, blob] of images) if (blob instanceof Blob) preview(name, blob);
    // All in one request: the first poster written makes the dev server reload this page.
    const response = await fetch('/__posters', { method: 'POST', body: images });
    if (!response.ok) throw new Error(`saving failed: ${response.status} ${await response.text()}`);
    status.value = 'Saved posters, social cards and the touch icon';
  } catch (error) {
    status.value = String(error);
  }
  draw(fromForm());
}

form.addEventListener('input', () => draw(fromForm()));
document.querySelector('[data-save]')?.addEventListener('click', () => void saveAll());
draw(fromForm());
if (new URLSearchParams(window.location.search).has('save')) {
  // Once: the reload that follows the save must not start another.
  history.replaceState(null, '', window.location.pathname);
  void saveAll();
}
