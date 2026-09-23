# Plan 4 — Launch Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the site ready to ship. Social cards and structured data, a sitemap, `robots.txt` and a 404 page. Slots for real photography. An earlier WebGL check so weak devices never download Three.js. Hosting headers and a README. Automated end-to-end tests in Chromium, Firefox and WebKit. Lighthouse audits that meet the spec's targets.

**Architecture:**
- The dev poster studio from Plan 3 also renders the social cards (1200×630, one per language), the touch icon and a "fallen rings" poster for the 404 page.
- SEO logic lives in a pure, tested module (`src/lib/seo.ts`). `Base.astro` gains page-level options: title, description and `index`.
- All absolute URLs come from Astro's configured `site`, which `SITE_URL` can override at build time.
- End-to-end tests use `@playwright/test` against `astro preview`. Lighthouse runs on demand through `npx`.

**Tech Stack:** Astro 7 (`@astrojs/sitemap`, endpoints, `astro:assets`), Three.js via the Plan 3 scene, `@playwright/test` 1.63 (Chromium, Firefox, WebKit), Lighthouse 13 (npx), Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-23-studio-site-redesign-design.md` §1 (success criteria), §8.5, §8.7, §9.6, §12, §14, §15, §17. Plan 4 of 4.

## Global Constraints

- Run every `npm`/`npx` command with Node 24.21.0 (`export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH";` in Git Bash).
- Versions: `@astrojs/sitemap@^3.7.4`, `@playwright/test@^1.63.0`, Lighthouse `13.5.0` via `npx` (not a dependency).
- Lighthouse targets (spec §1): performance ≥ 90 on mobile and ≥ 95 on desktop; accessibility and best practices ≥ 95; SEO 100. Zero console errors.
- Budgets (spec §14): initial JS ≤ 70 KB gzip; Three.js chunk ≤ 180 KB gzip; hero poster AVIF ≤ 60 KB; LCP ≤ 2.0 s (mobile, simulated 4G); CLS ≤ 0.02.
- Placeholders (`[…]`, `example.com`, `yourdomain.com`, `#`) never reach structured data.
- Pages that should not be indexed (404) carry `noindex` and no canonical, hreflang or structured data.
- Social cards, the touch icon and the posters are rendered by the dev studio from the real scene, never drawn by hand.
- Tests never send data to external services. Web3Forms is always intercepted.
- No `style=""` attributes except data-carrying custom properties.
- Commit after each task with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.

## File Map

```text
astro.config.ts                          sitemap integration; site overridable by SITE_URL
package.json                             + @astrojs/sitemap, + @playwright/test; test:e2e script
src/config/site.ts                       address.countryCode
src/config/media.ts                      optional team photo and project screenshots (new)
src/lib/seo.ts                           isPlaceholder, structuredData (new)
src/layouts/Base.astro                   title/description/index props, social cards, JSON-LD, touch icon, sitemap link
src/pages/404.astro                      bilingual "the page came apart" (new)
src/pages/robots.txt.ts                  robots.txt endpoint (new)
src/i18n/types.ts, en.ts, bs.ts          notFound strings, principles.photoAlt
src/components/Work.astro                screenshot when media.projects[id] is set
src/components/Principles.astro          team photo when media.team is set
src/scripts/motion/principles.ts         photo parallax (only with a real photo)
src/scripts/motion/rings.ts              WebGL check before the pin and before importing three.js
src/scripts/rings/index.ts               takes the canvas and context from the loader
src/scripts/motion/header.ts             night tone also on <html> and theme-color (bottom overscroll)
src/styles/base.css                      body is paper again, as its own stacking context
src/dev/posters-integration.ts           more outputs: fallen poster, og-en/bs.jpg, apple-touch-icon.png
src/dev/posters.astro, posters.ts        social cards, touch icon, previews
src/assets/posters/fallen.png            new (studio)
public/og-en.jpg, og-bs.jpg              new (studio)
public/apple-touch-icon.png              new (studio)
public/_headers                          cache + security headers (Cloudflare Pages, Netlify)
playwright.config.ts                     e2e config (new)
tests/unit/seo.test.ts                   (new)
tests/dist/seo.test.ts                   social cards, JSON-LD, sitemap, robots, 404 (new)
tests/dist/helpers.ts                    + readDist()
tests/e2e/site.spec.ts                   cross-browser scenarios (new)
README.md                                (new)
.gitignore                               + test-results, playwright-report, .lighthouse
```

---

### Task 1: Studio outputs — fallen poster, social cards, touch icon

**Files:**
- Modify: `src/dev/posters-integration.ts`, `src/dev/posters.astro`, `src/dev/posters.ts`
- Create (by the studio): `src/assets/posters/fallen.png`, `public/og-en.jpg`, `public/og-bs.jpg`, `public/apple-touch-icon.png`

**Interfaces:**
- Consumes: `createRingsScene`, `QUALITY` (scene), `tokenColors` (materials), `storyState` (story), `getDictionary` (i18n), `site` (config).
- Produces: files at the paths above. `POST /__posters?name=hero|approach|fallen|og-en|og-bs|apple-touch-icon` writes each output.

- [ ] **Step 1: Let the dev endpoint write every output** — replace `src/dev/posters-integration.ts`

```ts
import { writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';

/** What the studio may write, by name: stage and 404 posters, the social cards and the touch icon. */
const OUTPUTS: Record<string, string> = {
  hero: 'src/assets/posters/hero.png',
  approach: 'src/assets/posters/approach.png',
  fallen: 'src/assets/posters/fallen.png',
  'og-en': 'public/og-en.jpg',
  'og-bs': 'public/og-bs.jpg',
  'apple-touch-icon': 'public/apple-touch-icon.png',
};

/**
 * Dev-only poster studio (spec §9.6). `/dev/posters` renders the rings with the real scene and offers a story
 * scrubber; its Save button posts the images to `/__posters`, which writes them into the project. Neither the page
 * nor the endpoint exists outside `astro dev`.
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
          const target = Object.hasOwn(OUTPUTS, name) ? OUTPUTS[name] : undefined;
          if (req.method !== 'POST' || !target) {
            res.statusCode = 400;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            writeFile(new URL(`./${target}`, root), Buffer.concat(chunks))
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

- [ ] **Step 2: Load the brand font and show previews** — replace `src/dev/posters.astro`

```astro
---
import { Font } from 'astro:assets';
import '../styles/tokens.css';
import '../styles/base.css';

const controls = [
  { name: 'intro', label: 'Intro (s; 2 = done)', min: 0, max: 2, step: 0.01, value: 2 },
  { name: 'spin', label: 'Spin (rad)', min: 0, max: 6.283, step: 0.01, value: 0 },
  { name: 'journey', label: 'Journey', min: 0, max: 1, step: 0.001, value: 0 },
  { name: 'sequence', label: 'Take one away', min: 0, max: 1, step: 0.001, value: 0 },
  { name: 'symmetry', label: 'Symmetry', min: 0, max: 3, step: 1, value: 0 },
];
const previews = ['og-en', 'og-bs', 'apple-touch-icon', 'fallen'];
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <title>Rings poster studio (dev)</title>
    <Font cssVariable="--font-sans" />
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
        <button type="button" data-save>Save posters, social cards and touch icon</button>
        <output data-status></output>
      </form>
      <div class="previews">
        {previews.map((name) => <img data-preview={name} alt={name} />)}
      </div>
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
      .previews {
        display: flex;
        flex-wrap: wrap;
        gap: 16px;
        grid-column: 1 / -1;
      }
      .previews img {
        max-width: 600px;
        outline: 1px solid var(--line);
      }
      .previews img:not([src]) {
        display: none;
      }
    </style>
  </body>
</html>
```

- [ ] **Step 3: Compose the cards and the icon** — replace `src/dev/posters.ts`

```ts
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

async function upload(name: string, blob: Blob): Promise<void> {
  const response = await fetch(`/__posters?name=${name}`, { method: 'POST', body: blob });
  if (!response.ok) throw new Error(`saving ${name} failed: ${response.status}`);
  const preview = document.querySelector<HTMLImageElement>(`[data-preview="${name}"]`);
  if (preview) preview.src = URL.createObjectURL(blob);
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
  await Promise.all([document.fonts.load(`300 60px ${font}`), document.fonts.load(`500 26px ${font}`)]);
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
  ctx.fillText(`${t.hero.studio} · ${t.hero.location}`.toLocaleUpperCase(lang), 72, CARD.height - 64);
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
  // The docked knot spans about 0.2–0.8 of the render around (0.5, 0.455): crop a square just around it.
  const side = SIZE * 0.66;
  ctx.drawImage(canvas, SIZE * 0.5 - side / 2, SIZE * 0.455 - side / 2, side, side, 0, 0, ICON, ICON);
  return toBlob(out);
}

async function saveAll(): Promise<void> {
  status.value = 'Saving…';
  try {
    for (const name of Object.keys(POSTERS) as Array<keyof typeof POSTERS>) {
      draw(POSTERS[name]);
      await upload(name, await toBlob(canvas));
    }
    for (const lang of ['en', 'bs'] as const) await upload(`og-${lang}`, await card(lang));
    await upload('apple-touch-icon', await icon());
    status.value = 'Saved posters, social cards and the touch icon';
  } catch (error) {
    status.value = String(error);
  }
  draw(fromForm());
}

form.addEventListener('input', () => draw(fromForm()));
document.querySelector('[data-save]')?.addEventListener('click', () => void saveAll());
draw(fromForm());
if (new URLSearchParams(window.location.search).has('save')) void saveAll();
```

- [ ] **Step 4: Type-check**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check`
Expected: `0 errors`.

- [ ] **Step 5: Render everything**

Start `npm run dev -- --host 127.0.0.1 --port 4322` in the background if it is not running, open `http://127.0.0.1:4322/dev/posters?save` with the Playwright MCP tools and wait for `Saved posters, social cards and the touch icon`. Then:

```bash
file public/og-en.jpg public/og-bs.jpg public/apple-touch-icon.png src/assets/posters/fallen.png
```

Expected: two `JPEG image data … 1200x630`, `PNG image data, 180 x 180`, `PNG image data, 1360 x 1360`. Look at all four (Read tool): the card text uses Host Grotesk (not a fallback serif) and never touches the knot; the headline is in the page's language; the icon's knot is centred with a margin; the fallen poster shows two rings lying apart.

- [ ] **Step 6: Commit**

```bash
git add src/dev src/assets/posters/fallen.png public/og-en.jpg public/og-bs.jpg public/apple-touch-icon.png
git commit -m "feat: render social cards, touch icon and a fallen-rings poster in the studio

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Social cards and structured data in the head

**Files:**
- Create: `src/lib/seo.ts`, `tests/unit/seo.test.ts`, `tests/dist/seo.test.ts`
- Modify: `src/config/site.ts`, `src/layouts/Base.astro`, `astro.config.ts`, `tests/dist/helpers.ts`

**Interfaces:**
- Consumes: `SiteConfig`, `site` (config), `Locale`, `ogLocale`, `localePath`, `locales`, `getDictionary` (i18n).
- Produces:
  - `isPlaceholder(value: string): boolean`
  - `structuredData({ site, lang, pageUrl, imageUrl, description }): Record<string, unknown>`
  - `Base` props: `{ lang; title?: string; description?: string; index?: boolean }`
  - `SiteConfig.address.countryCode`
  - `readDist(path)` in the dist helpers.

- [ ] **Step 1: Write the failing unit test** — `tests/unit/seo.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { site, type SiteConfig } from '../../src/config/site';
import { isPlaceholder, structuredData } from '../../src/lib/seo';

const studio: SiteConfig = {
  ...site,
  name: 'Kvadrat',
  url: 'https://kvadrat.ba',
  email: 'hello@kvadrat.ba',
  phone: '+387 33 000 000',
  address: { ...site.address, street: { en: 'Ferhadija 1', bs: 'Ferhadija 1a' } },
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/kvadrat' },
    { label: 'GitHub', href: '#' },
  ],
};
const page = { pageUrl: 'https://kvadrat.ba/', imageUrl: 'https://kvadrat.ba/og-en.jpg', description: 'A studio.' };

describe('isPlaceholder', () => {
  it('spots the template values', () => {
    for (const value of ['[NAME]', 'hello@yourdomain.com', 'https://example.com/', '#', '  ']) expect(isPlaceholder(value), value).toBe(true);
  });

  it('accepts real values', () => {
    for (const value of ['Kvadrat', 'https://kvadrat.ba/', '+387 33 000 000']) expect(isPlaceholder(value), value).toBe(false);
  });
});

describe('structuredData', () => {
  it('describes a filled-in studio as a ProfessionalService', () => {
    expect(structuredData({ site: studio, lang: 'en', ...page })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      '@id': 'https://kvadrat.ba/#studio',
      name: 'Kvadrat',
      url: 'https://kvadrat.ba/',
      image: 'https://kvadrat.ba/og-en.jpg',
      description: 'A studio.',
      email: 'hello@kvadrat.ba',
      telephone: '+387 33 000 000',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Ferhadija 1',
        postalCode: '71000',
        addressLocality: 'Sarajevo',
        addressCountry: 'BA',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 43.8563, longitude: 18.4131 },
      areaServed: 'Bosnia and Herzegovina',
      knowsLanguage: ['en', 'bs'],
      sameAs: ['https://www.linkedin.com/company/kvadrat'],
    });
  });

  it('uses the street name of the page language', () => {
    const data = structuredData({ site: studio, lang: 'bs', ...page }) as { address: { streetAddress: string } };
    expect(data.address.streetAddress).toBe('Ferhadija 1a');
  });

  it('leaves out every value that is still a placeholder', () => {
    const data = structuredData({ site, lang: 'en', ...page, pageUrl: 'https://example.com/', imageUrl: 'https://example.com/og-en.jpg' });
    expect(JSON.stringify(data)).not.toMatch(/"\[|yourdomain|example\.com/);
    for (const key of ['@id', 'name', 'url', 'image', 'email', 'telephone', 'sameAs']) expect(data, key).not.toHaveProperty(key);
    expect(data).toMatchObject({ '@type': 'ProfessionalService', address: { postalCode: '71000', addressLocality: 'Sarajevo' } });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/seo.test.ts`
Expected: FAIL — cannot resolve `../../src/lib/seo`.

- [ ] **Step 3: Add the country code** — `src/config/site.ts`

In `SiteConfig`, change the address line to:

```ts
  address: { street: Localized; city: string; country: Localized; /** ISO 3166-1 alpha-2, e.g. "BA". */ countryCode: string };
```

and in `site.address` add `countryCode: 'BA',` after the `country` entry.

- [ ] **Step 4: Write `src/lib/seo.ts`**

```ts
import type { SiteConfig } from '../config/site';
import type { Locale } from '../i18n/locales';

const PLACEHOLDER_HOSTS = ['example.com', 'yourdomain.com'];

/** Template values — `[…]`, example domains, `#` links, blanks — that must never be published as facts. */
export function isPlaceholder(value: string): boolean {
  const text = value.trim();
  return text === '' || text === '#' || /^\[.*\]$/.test(text) || PLACEHOLDER_HOSTS.some((host) => text.includes(host));
}

const real = (value: string): string | undefined => (isPlaceholder(value) ? undefined : value);

/** "43.8563° N, 18.4131° E" → signed decimal degrees. */
function coordinates(text: string): { latitude: number; longitude: number } | undefined {
  const match = /([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])/.exec(text);
  if (!match) return undefined;
  const [, lat, ns, long, ew] = match;
  return { latitude: Number(lat) * (ns === 'S' ? -1 : 1), longitude: Number(long) * (ew === 'W' ? -1 : 1) };
}

/** Drops keys whose value is undefined (JSON-LD should not carry empty facts). */
function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export interface StructuredDataInput {
  site: SiteConfig;
  lang: Locale;
  /** Absolute URL of the page (from Astro's configured `site`). */
  pageUrl: string;
  /** Absolute URL of the page's social card. */
  imageUrl: string;
  description: string;
}

/** schema.org ProfessionalService for the studio (spec §12). Values still in template form are left out. */
export function structuredData({ site, lang, pageUrl, imageUrl, description }: StructuredDataInput): Record<string, unknown> {
  const url = real(pageUrl);
  const city = /^(\d{4,6})\s+(.+)$/.exec(site.address.city);
  const geo = coordinates(site.coordinates);
  const sameAs = site.socials.map((social) => social.href).filter((href) => !isPlaceholder(href));
  return compact({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': url ? `${new URL('/', url).href}#studio` : undefined,
    name: real(site.name),
    url,
    image: url ? real(imageUrl) : undefined,
    description,
    email: real(site.email),
    telephone: real(site.phone),
    address: compact({
      '@type': 'PostalAddress',
      streetAddress: real(site.address.street[lang]),
      postalCode: city?.[1],
      addressLocality: city?.[2] ?? site.address.city,
      addressCountry: site.address.countryCode,
    }),
    geo: geo ? { '@type': 'GeoCoordinates', ...geo } : undefined,
    areaServed: site.address.country.en,
    knowsLanguage: ['en', 'bs'],
    sameAs: sameAs.length ? sameAs : undefined,
  });
}
```

- [ ] **Step 5: Run the unit test and see it pass**

Run: `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx vitest run tests/unit/seo.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Let `SITE_URL` override the site** — `astro.config.ts`

Change `site: site.url,` to:

```ts
  // SITE_URL lets a preview deployment (or a local Lighthouse run) publish its own absolute URLs.
  site: process.env.SITE_URL || site.url,
```

- [ ] **Step 7: Rewrite the head** — replace `src/layouts/Base.astro`

```astro
---
import { Font } from 'astro:assets';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/motion.css';
import '../styles/rings.css';
import { site } from '../config/site';
import { getDictionary, localePath, locales, ogLocale, type Locale } from '../i18n';
import { structuredData } from '../lib/seo';

interface Props {
  lang: Locale;
  /** Defaults to "<studio> — <dictionary title>". */
  title?: string;
  description?: string;
  /** false keeps a page out of search (404): noindex, and no canonical, hreflang or structured data. */
  index?: boolean;
}

const t = getDictionary(Astro.props.lang);
const { lang, title = `${site.name} — ${t.meta.title}`, description = t.meta.description, index = true } = Astro.props;
const origin = Astro.site ?? new URL(site.url);
const href = (l: Locale) => new URL(localePath(l), origin).href;
const card = new URL(`/og-${lang}.jpg`, origin).href;
const ld = index ? JSON.stringify(structuredData({ site, lang, pageUrl: href(lang), imageUrl: card, description })).replace(/</g, '\\u003c') : '';
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
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
    <title>{title}</title>
    <meta name="description" content={description} />
    {
      index ? (
        <>
          <link rel="canonical" href={href(lang)} />
          {locales.map((l) => <link rel="alternate" hreflang={l} href={href(l)} />)}
          <link rel="alternate" hreflang="x-default" href={href('en')} />
          <meta property="og:url" content={href(lang)} />
        </>
      ) : (
        <meta name="robots" content="noindex" />
      )
    }
    <meta name="theme-color" content="#ebe9e4" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content={site.name} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:locale" content={ogLocale[lang]} />
    {locales.filter((l) => l !== lang).map((l) => <meta property="og:locale:alternate" content={ogLocale[l]} />)}
    <meta property="og:image" content={card} />
    <meta property="og:image:type" content="image/jpeg" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content={title} />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={card} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <Font cssVariable="--font-sans" preload={[{ subset: 'latin', weight: '300' }]} />
    {index && <script type="application/ld+json" set:html={ld} />}
  </head>
  <body>
    <a class="skip-link" href="#main">{t.a11y.skip}</a>
    <slot />
    <script>
      import '../scripts/motion/index';
    </script>
  </body>
</html>
```

- [ ] **Step 8: Add a raw-file helper** — `tests/dist/helpers.ts`

Append:

```ts
/** A built file as text (sitemaps, robots.txt, headers). */
export function readDist(path: string): string {
  return readFileSync(new URL(`../../dist/${path}`, import.meta.url), 'utf8');
}
```

- [ ] **Step 9: Write the dist test** — `tests/dist/seo.test.ts`

```ts
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { ogLocale, type Locale } from '../../src/i18n';
import { loadPage, pages } from './helpers';

const inDist = (path: string): boolean => existsSync(new URL(`../../dist/${path}`, import.meta.url));

describe.each(pages)('$path social cards and structured data', ({ path, lang }) => {
  const doc = loadPage(path);
  const meta = (key: string) => doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content');

  it('shares the card of the page language', () => {
    const card = new URL(`/og-${lang}.jpg`, site.url).href;
    expect(meta('og:image')).toBe(card);
    expect(meta('twitter:image')).toBe(card);
    expect(inDist(`og-${lang}.jpg`)).toBe(true);
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
    expect(meta('twitter:card')).toBe('summary_large_image');
    expect(meta('og:site_name')).toBe(site.name);
    const other: Locale = lang === 'en' ? 'bs' : 'en';
    expect(meta('og:locale:alternate')).toBe(ogLocale[other]);
  });

  it('describes the studio as structured data, without placeholders', () => {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    const data = JSON.parse(scripts[0]?.textContent ?? '{}') as Record<string, unknown>;
    expect(data['@type']).toBe('ProfessionalService');
    expect(data.knowsLanguage).toEqual(['en', 'bs']);
    expect(JSON.stringify(data)).not.toMatch(/"\[|yourdomain/);
  });

  it('offers a touch icon', () => {
    expect(doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/apple-touch-icon.png');
    expect(inDist('apple-touch-icon.png')).toBe(true);
  });

  it('stays indexable', () => {
    expect(doc.querySelector('meta[name="robots"]')).toBeNull();
    expect(doc.querySelector('link[rel="canonical"]')).not.toBeNull();
  });
});
```

- [ ] **Step 10: Build and run everything**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist
```

Expected: 0 errors; all unit tests pass (including `seo.test.ts`); build completes; all dist tests pass (including `seo.test.ts`).

- [ ] **Step 11: Commit**

```bash
git add src/lib/seo.ts src/config/site.ts src/layouts/Base.astro astro.config.ts tests/unit/seo.test.ts tests/dist/seo.test.ts tests/dist/helpers.ts
git commit -m "feat: add social cards, structured data and a touch icon to the head

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Sitemap, robots.txt and the 404 page

**Files:**
- Modify: `package.json`, `package-lock.json`, `astro.config.ts`, `src/layouts/Base.astro`, `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/bs.ts`, `tests/dist/seo.test.ts`
- Create: `src/pages/robots.txt.ts`, `src/pages/404.astro`

**Interfaces:**
- Consumes: `Base` props from Task 2, `fallen.png` from Task 1, `Brand`, `Button`.
- Produces:
  - `dist/sitemap-index.xml` and `dist/sitemap-0.xml`
  - `dist/robots.txt`
  - `dist/404.html`
  - `Dictionary.notFound { title, body, home }`

- [ ] **Step 1: Install the sitemap integration**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npm install @astrojs/sitemap@^3.7.4
```

- [ ] **Step 2: Extend the dist test first** — append to `tests/dist/seo.test.ts` (and add `readDist` to its helpers import)

```ts
describe('sitemap and robots.txt', () => {
  it('lists both languages with their alternates, and nothing else', () => {
    expect(readDist('sitemap-index.xml')).toContain('sitemap-0.xml');
    const map = readDist('sitemap-0.xml');
    const locs = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([new URL('/', site.url).href, new URL('/bs/', site.url).href]);
    expect(map).toContain('hreflang="bs"');
    expect(map).toContain('hreflang="en"');
    expect(map).not.toContain('404');
  });

  it('allows crawling and points at the sitemap', () => {
    const robots = readDist('robots.txt');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${new URL('/sitemap-index.xml', site.url).href}`);
  });

  it('links the sitemap from every page', () => {
    for (const { path } of pages) expect(loadPage(path).querySelector('link[rel="sitemap"]')?.getAttribute('href')).toBe('/sitemap-index.xml');
  });
});

describe('404 page', () => {
  const doc = loadPage('404.html');

  it('stays out of search', () => {
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('explains itself in both languages and leads home', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('[lang="bs"]')).not.toBeNull();
    const links = Array.from(doc.querySelectorAll('main a')).map((a) => a.getAttribute('href'));
    expect(links).toContain('/');
    expect(links).toContain('/bs/');
  });

  it('shows the fallen rings', () => {
    expect(doc.querySelector('main picture source[type="image/avif"]')).not.toBeNull();
  });
});
```

- [ ] **Step 3: Register the sitemap** — `astro.config.ts`

Add `import sitemap from '@astrojs/sitemap';` and change the integrations line to:

```ts
  integrations: [
    devPosters(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', bs: 'bs' } },
      filter: (page) => !new URL(page).pathname.startsWith('/404'),
    }),
  ],
```

- [ ] **Step 4: Link it from the head** — `src/layouts/Base.astro`

After the `apple-touch-icon` link add:

```astro
    <link rel="sitemap" href="/sitemap-index.xml" />
```

- [ ] **Step 5: Serve robots.txt** — `src/pages/robots.txt.ts`

```ts
import type { APIRoute } from 'astro';
import { site as config } from '../config/site';

/** Everything may be crawled; the sitemap lists both languages (spec §12). */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site ?? config.url).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
```

- [ ] **Step 6: Add the 404 strings**

`src/i18n/types.ts` — after the `contact: { … };` block, before the closing `}` of `Dictionary`:

```ts
  notFound: { title: string; body: string; home: string };
```

`src/i18n/en.ts` — after the `contact` object (before the final `};`):

```ts
  notFound: {
    title: 'This page came apart.',
    body: 'Like the rings on our homepage: take one piece away and the rest cannot hold. The page you were looking for is not here — it may have moved.',
    home: 'Back to the homepage',
  },
```

`src/i18n/bs.ts` — in the same place:

```ts
  notFound: {
    title: 'Ova stranica se raspala.',
    body: 'Kao prstenovi na našoj početnoj: ukloni jedan dio i ostalo ne može opstati. Stranica koju tražite nije ovdje — možda je premještena.',
    home: 'Nazad na početnu',
  },
```

- [ ] **Step 7: Write the page** — `src/pages/404.astro`

```astro
---
import { Picture } from 'astro:assets';
import fallen from '../assets/posters/fallen.png';
import Brand from '../components/Brand.astro';
import Button from '../components/ui/Button.astro';
import { site } from '../config/site';
import { getDictionary, localePath } from '../i18n';
import Base from '../layouts/Base.astro';

const en = getDictionary('en');
const bs = getDictionary('bs');
---

<Base lang="en" title={`404 — ${site.name}`} description={en.notFound.body} index={false}>
  <main id="main" class="nf container">
    <Brand lang="en" class="nf-brand" />
    <div class="nf-body">
      <figure class="nf-stage" aria-hidden="true">
        <Picture src={fallen} alt="" formats={['avif', 'webp']} widths={[420, 640, 900]} sizes="(min-width: 64rem) 40vw, 90vw" />
      </figure>
      <div class="nf-text">
        <p class="label">404</p>
        <h1 class="nf-title">{en.notFound.title}</h1>
        <p class="nf-copy">{en.notFound.body}</p>
        <p class="nf-copy nf-copy--bs" lang="bs"><strong>{bs.notFound.title}</strong> {bs.notFound.body}</p>
        <div class="nf-actions">
          <Button href={localePath('en')}>{en.notFound.home}</Button>
          <Button href={localePath('bs')} variant="ghost" hreflang="bs" lang="bs">{bs.notFound.home}</Button>
        </div>
      </div>
    </div>
  </main>
</Base>

<style>
  .nf {
    display: grid;
    align-content: start;
    gap: 40px;
    min-height: 100svh;
    padding-block: 28px 64px;
  }
  .nf-body {
    display: grid;
    gap: 32px;
  }
  .nf-stage {
    width: min(100%, 30rem);
    justify-self: center;
  }
  .nf-stage :global(img) {
    display: block;
    width: 100%;
    height: auto;
  }
  .nf-text {
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 34rem;
  }
  .nf-title {
    font-size: var(--fs-h2);
    font-weight: 300;
    line-height: 1.02;
    letter-spacing: -0.04em;
    text-wrap: balance;
  }
  .nf-copy {
    font-size: var(--fs-body-l);
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .nf-copy--bs {
    padding-top: 20px;
    border-top: 1px solid var(--line);
  }
  .nf-copy--bs strong {
    font-weight: 500;
    color: var(--ink);
  }
  .nf-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 8px;
  }
  @media (min-width: 64rem) {
    .nf {
      align-content: center;
    }
    .nf-body {
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
      align-items: center;
    }
    .nf-stage {
      grid-column: 1 / span 6;
      width: 100%;
    }
    .nf-text {
      grid-column: 8 / span 5;
    }
  }
</style>
```

- [ ] **Step 8: Build and run everything**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist
```

Expected: 0 errors; unit tests pass (the i18n completeness test now also covers `notFound`); build lists `sitemap-index.xml`; dist tests pass.

- [ ] **Step 9: Look at the 404 page**

With the preview server restarted, open `http://127.0.0.1:4321/nowhere` at 1440×900 and 390×844 (Playwright MCP). The response status must be 404; the two rings lie apart on the left (top on phones); the English and Bosnian copy read cleanly; both buttons work; there are no console errors.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json astro.config.ts src/layouts/Base.astro src/pages src/i18n tests/dist/seo.test.ts
git commit -m "feat: add sitemap, robots.txt and a bilingual 404 page

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Slots for real photography

**Files:**
- Create: `src/config/media.ts`
- Modify: `src/components/Work.astro`, `src/components/Principles.astro`, `src/scripts/motion/principles.ts`, `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/bs.ts`, `tests/dist/principles.test.ts`

**Interfaces:**
- Consumes: `ProjectItem['id']` (`'portal' | 'shop'`), `fill` (i18n).
- Produces:
  - `media: Media { team?: ImageMetadata; projects: Partial<Record<ProjectItem['id'], ImageMetadata>> }`
  - `.pj-shot` in a card when a screenshot is set, `.pr-img` in the photo frame when a team photo is set
  - `Dictionary.principles.photoAlt`

- [ ] **Step 1: Pin the placeholder behaviour in a dist test** — add inside the `describe.each(pages)('$path principles', …)` block of `tests/dist/principles.test.ts`

```ts
  it('keeps the drawn placeholders while no photography is configured', () => {
    expect(doc.querySelector('.pr-photo')?.getAttribute('aria-hidden')).toBe('true');
    expect(doc.querySelector('.pr-photo img')).toBeNull();
    expect(doc.querySelectorAll('.pj-card svg.pj-art')).toHaveLength(2);
    expect(doc.querySelector('.pj-shot')).toBeNull();
  });
```


- [ ] **Step 2: Write `src/config/media.ts`**

```ts
import type { ImageMetadata } from 'astro';
import type { ProjectItem } from '../i18n/types';

/**
 * Real photography, when the studio has it. Leave a slot undefined to keep the drawn placeholder.
 * To fill one, put the file in src/assets/ and import it here, for example:
 *
 *   import team from '../assets/team.jpg';
 *   import shop from '../assets/projects/shop.png';
 *   export const media: Media = { team, projects: { shop } };
 */
export interface Media {
  /** "Before you hire us" photo: portrait, at least 1000 × 1250 px. It drifts gently while the list scrolls. */
  team?: ImageMetadata;
  /** Project card screenshots, 16 : 10, at least 1600 × 1000 px. */
  projects: Partial<Record<ProjectItem['id'], ImageMetadata>>;
}

export const media: Media = { projects: {} };
```

- [ ] **Step 3: Use a screenshot when there is one** — `src/components/Work.astro`

Add to the frontmatter imports:

```astro
import { Picture } from 'astro:assets';
import { media } from '../config/media';
```

Replace `<Art />` inside the card link with:

```astro
            {
              media.projects[p.id] ? (
                <div class="pj-shot pj-parallax">
                  <Picture
                    src={media.projects[p.id]!}
                    alt=""
                    formats={['avif', 'webp']}
                    widths={[640, 960, 1280, 1600]}
                    sizes="(min-width: 64rem) 60vw, 100vw"
                  />
                </div>
              ) : (
                <Art />
              )
            }
```

Add to its styles (after `.pj-card :global(svg)`):

```css
  .pj-card {
    position: relative;
  }
  /* Taller than the card, so the parallax (±80 px) never shows an edge. */
  .pj-shot {
    position: absolute;
    inset: -15% 0;
  }
  .pj-shot :global(img) {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
```

- [ ] **Step 4: Use the team photo when there is one** — `src/components/Principles.astro`

Add to the frontmatter imports:

```astro
import { Picture } from 'astro:assets';
import { media } from '../config/media';
```

Replace the `<figure class="pr-photo" …>…</figure>` element with:

```astro
    {
      media.team ? (
        <figure class="pr-photo">
          <div class="pr-frame pr-frame--photo">
            <Picture
              src={media.team}
              alt={fill(t.principles.photoAlt, { name: site.name })}
              class="pr-img"
              formats={['avif', 'webp']}
              widths={[480, 720, 1000]}
              sizes="(min-width: 64rem) 30vw, 100vw"
            />
          </div>
        </figure>
      ) : (
        <figure class="pr-photo" aria-hidden="true">
          <div class="pr-frame">
            <span class="label">{t.principles.photo}</span>
          </div>
        </figure>
      )
    }
```

Add to its styles (after `.pr-frame .label`):

```css
  .pr-frame--photo {
    position: relative;
    padding: 0;
    overflow: hidden;
  }
  /* A little taller than the frame, so the scroll drift never shows an edge. */
  .pr-frame--photo :global(.pr-img) {
    position: absolute;
    inset: -8% 0;
    width: 100%;
    height: 116%;
    object-fit: cover;
  }
```

- [ ] **Step 5: Add the photo's alt text**

`src/i18n/types.ts`, in `principles`, after `photo: string;`:

```ts
    photoAlt: string;
```

`src/i18n/en.ts`, after `photo: '[ Photo — the people you will work with ]',`:

```ts
    photoAlt: 'The people you will work with at {name}',
```

`src/i18n/bs.ts`, after `photo: '[ Fotografija — ljudi s kojima ćete raditi ]',`:

```ts
    photoAlt: 'Ljudi s kojima ćete raditi u {name}',
```

- [ ] **Step 6: Drift the real photo (spec §8.7)** — `src/scripts/motion/principles.ts`

Before `return () => {` add:

```ts
  // Only a real photo drifts; the drawn placeholder stays put.
  const photo = document.querySelector<HTMLElement>('.pr-frame--photo');
  const image = photo?.querySelector('.pr-img');
  const drift =
    photo && image
      ? gsap.fromTo(image, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: photo, start: 'top bottom', end: 'bottom top', scrub: true } })
      : null;
```

and inside the returned cleanup, before the `for` loop:

```ts
    drift?.scrollTrigger?.kill();
    drift?.kill();
```

- [ ] **Step 7: Check both branches**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist
```

Expected: 0 errors, all tests pass (placeholder branch).

Then set `export const media: Media = { team: approachPoster, projects: { shop: heroPoster } };` temporarily, importing `approachPoster` and `heroPoster` from `../assets/posters/`. Build, and in the browser (1440×900) check the three things below. Finally revert the temporary change and rebuild.

1. The principles photo fills its frame, carries its alt text and drifts while scrolling, without showing an edge.
2. The shop card shows the image edge to edge, and its parallax never shows a gap.
3. The portal card still shows the drawn mockup.

- [ ] **Step 8: Commit**

```bash
git add src/config/media.ts src/components/Work.astro src/components/Principles.astro src/scripts/motion/principles.ts src/i18n tests/dist
git commit -m "feat: add slots for the team photo and project screenshots

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Check WebGL before the pin and before downloading three.js

**Files:**
- Modify: `src/scripts/motion/rings.ts`, `src/scripts/rings/index.ts`

**Interfaces:**
- Consumes: `startRings` from Plan 3.
- Produces: `RingsOptions` gains `canvas: HTMLCanvasElement` and `context: WebGL2RenderingContext`; `initRings()` returns early, with `data-rings="off"` and no pin, when no fast WebGL2 context is available.

Why: today, devices without fast WebGL still download and evaluate the 142 KB rings chunk before falling back. They also get the Approach pin, and have it removed again, after `load`. Headless audit browsers render in software, so Lighthouse measures exactly that path.

- [ ] **Step 1: Take the canvas from the loader** — `src/scripts/rings/index.ts`

In `RingsOptions` add:

```ts
  /** Canvas with a WebGL2 context already created by the loader (who checked it is fast enough). */
  canvas: HTMLCanvasElement;
  context: WebGL2RenderingContext;
```

Change the signature to `export async function startRings({ pin, intro, onLost, canvas, context }: RingsOptions): Promise<RingsHandle> {` and replace the lines from `const canvas = document.createElement('canvas');` through `if (!context) throw new Error('rings: no fast WebGL2');` with:

```ts
  canvas.className = 'rings-canvas';
  canvas.setAttribute('aria-hidden', 'true');
```

- [ ] **Step 2: Check first, then pin and load** — `src/scripts/motion/rings.ts`

Replace the start of `initRings` (from `const root = document.documentElement;` through the `ScrollTrigger.create({…});` call) with:

```ts
  const root = document.documentElement;
  if (root.dataset.rings !== 'pending' && root.dataset.rings !== 'poster') return () => {};
  const grid = document.querySelector<HTMLElement>('#approach .approach-grid');
  if (!grid) return () => {};

  // Software rendering (and three.js' download) is not worth it: decide before pinning or importing anything.
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', { alpha: true, antialias: true, failIfMajorPerformanceCaveat: true });
  if (!context) {
    root.dataset.rings = 'off';
    return () => {};
  }

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
```

and change the import call to pass them:

```ts
      .then(({ startRings }) => startRings({ pin, intro, canvas, context, onLost: () => giveUp() }))
```

- [ ] **Step 3: Check, build, test**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist
```

Expected: 0 errors; all tests pass.

- [ ] **Step 4: Verify both paths in the browser**

Restart the preview server. Then check both paths:

- **Normal load at 1440×900:** it goes live as before.
- **With an init script that makes `getContext('webgl2')` return `null`:**
  - `data-rings` is `off` about as soon as the motion bundle boots, and the hero poster is visible.
  - The approach grid is never wrapped in a `.pin-spacer`.
  - The network log has no request for the `rings.*.js` chunk.
  - There are no console messages.

- [ ] **Step 5: Commit**

```bash
git add src/scripts
git commit -m "perf: check WebGL before pinning the approach or downloading three.js

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Hosting readiness — overscroll colours, headers, README

**Files:**
- Modify: `src/styles/base.css`, `src/scripts/motion/header.ts`, `.gitignore`
- Create: `public/_headers`, `README.md`
- Test: `tests/dist/seo.test.ts` (headers file)

**Interfaces:**
- Consumes: the header's contact tone trigger (Plan 2).
- Produces: `html[data-tone="night"]` while the contact section or footer fills the view; `meta[name="theme-color"]` follows it.

- [ ] **Step 1: Test for the headers file** — append to `tests/dist/seo.test.ts`

```ts
describe('hosting headers', () => {
  it('caches hashed assets forever and sets the basic security headers', () => {
    const headers = readDist('_headers');
    expect(headers).toMatch(/\/_astro\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
    for (const header of ['X-Content-Type-Options: nosniff', 'Referrer-Policy: strict-origin-when-cross-origin', 'X-Frame-Options: DENY']) {
      expect(headers).toContain(header);
    }
  });
});
```

- [ ] **Step 2: Write `public/_headers`** (read by Cloudflare Pages and Netlify)

```text
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()
  Strict-Transport-Security: max-age=31536000

/_astro/*
  Cache-Control: public, max-age=31536000, immutable
```

- [ ] **Step 3: Paper on the body, night below the footer** — `src/styles/base.css`

In the `body` rule add:

```css
    /* Paper lives on the body again, as its own stacking context: the fixed rings canvas (z-index -1) stays above it,
       and <html> is free to show night in the rubber-band area below the footer (see header.ts). */
    position: relative;
    z-index: 0;
    background: var(--paper);
```

and after the `html` rule add:

```css
  html[data-tone='night'] {
    background: var(--night);
  }
```

- [ ] **Step 4: Follow the tone on the root and in theme-color** — `src/scripts/motion/header.ts`

Replace the `onToggle` body of the `tone` trigger with:

```ts
        onToggle: (self) => {
          const dark = self.isActive;
          header.dataset.tone = dark ? 'dark' : 'light';
          // Over the contact section and footer, overscroll and the browser chrome turn night too.
          document.documentElement.dataset.tone = dark ? 'night' : 'paper';
          document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#121211' : '#ebe9e4');
        },
```

- [ ] **Step 5: Ignore test and audit output** — `.gitignore`

Append:

```text
/test-results/
/playwright-report/
/.lighthouse/
```

- [ ] **Step 6: Write `README.md`**

````markdown
# [NAME] — studio website

The bilingual website (English `/`, Bosnian `/bs/`) of a design and engineering studio in Sarajevo. It is a static
Astro site with one set piece — three Borromean rings rendered live with Three.js that assemble, travel down the page
and act out "take one away and the whole thing falls apart" — and a restrained motion layer around it.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Astro 7, static output, i18n routing, `astro:assets` (AVIF/WebP), Fonts API (Host Grotesk) |
| Language | TypeScript (strict), vanilla CSS with design tokens |
| Motion | GSAP 3 (ScrollTrigger, SplitText), Lenis smooth scrolling on mouse and trackpad |
| 3D | Three.js r186, loaded lazily; posters rendered from the same scene stand in when 3D should not run |
| Form | Web3Forms (swappable), `mailto:` fallback |
| Tests | Vitest (logic and built HTML), Playwright (Chromium, Firefox, WebKit), Lighthouse |

## Requirements

Node 24.21 (see `.nvmrc`). npm 11.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server on http://localhost:4321 (also serves the poster studio, below) |
| `npm run build` | Static build into `dist/` |
| `npm run preview` | Serves `dist/` locally |
| `npm run check` | Type-checks `.astro` and `.ts` files |
| `npm test` | Unit tests (geometry, story, SEO, form, i18n …) |
| `npm run test:dist` | Tests the built HTML (run `npm run build` first) |
| `npm run test:e2e` | Builds, then runs the browser tests in Chromium, Firefox and WebKit |

## Before launch

1. Fill in `src/config/site.ts`: name, URL, e-mail, phone, street, hours, "booking from" month, social links, call link.
   Values in `[brackets]`, `example.com`/`yourdomain.com` addresses and `#` links count as placeholders: they show on
   the page but are kept out of structured data.
2. Create a free access key at web3forms.com and set it as `PUBLIC_WEB3FORMS_KEY` (see `.env.example`). Without it
   the form opens the visitor's e-mail app instead.
3. Re-render the social cards, since they carry the studio name. Run `npm run dev`, open `/dev/posters` and press
   **Save**.
4. Optional: add real photography in `src/config/media.ts` (team photo, project screenshots).

## Editing content

- **Text:** `src/i18n/en.ts` and `src/i18n/bs.ts`. Both implement the same `Dictionary` type, so a missing translation
  fails the build.
- **Studio details:** `src/config/site.ts`.
- **Photography:** `src/config/media.ts`.
- **Colours and type:** `src/styles/tokens.css`. The 3D rings read their colours from the same tokens.

## The rings

`src/lib/rings/` holds the geometry and the whole story as pure functions of time and scroll (unit-tested, including a
check that no ring ever passes through another). `src/scripts/rings/` renders them into one fixed canvas behind the
page. `src/scripts/motion/rings.ts` pins the Approach section and loads the 3D once the page is idle.

The 3D runs only with JavaScript, without `prefers-reduced-motion` and without Save-Data, and only on a GPU that
renders WebGL2 without a major performance caveat. Everywhere else, and if the GPU drops the context, visitors get
posters rendered from the same scene.

**Poster studio:** with `npm run dev`, open `/dev/posters`. Sliders scrub through the intro, the journey and "take one
away". **Save** re-renders the stage posters (`src/assets/posters/`), the 404 poster, the social cards
(`public/og-*.jpg`) and the touch icon. Do this after any change to colours, lighting or framing.

## Deploying

The site is plain static files. Any static host works; build command `npm run build`, output directory `dist`,
Node 24.

| Host | Notes |
| --- | --- |
| Cloudflare Pages | Framework preset "Astro". `public/_headers` sets caching and security headers. |
| Netlify | Build `npm run build`, publish `dist`. `_headers` works as is. |
| Vercel | Framework "Astro". Move the rules from `_headers` into `vercel.json` if you want them. |
| Any server | Upload `dist/`. Serve `404.html` for unknown paths and cache `/_astro/*` for a year. |

Environment variables: `PUBLIC_WEB3FORMS_KEY` (the form), and optionally `SITE_URL`. `SITE_URL` overrides the site
URL from `site.ts` for canonical links, social cards and the sitemap, which is useful for preview deployments.

## Testing and audits

- `npm test` and `npm run test:dist` run in seconds and need no browser.
- `npm run test:e2e` needs the Playwright browsers once: `npx playwright install chromium firefox webkit`. The tests
  intercept Web3Forms, so nothing is ever sent.
- Lighthouse: `npm run build`, then `npm run preview`, then in a second terminal
  `npx lighthouse@13.5.0 http://localhost:4321/ --view`. Add `--preset=desktop` for desktop.

## Documentation

`docs/superpowers/specs/` holds the design spec (in Bosnian). `docs/superpowers/plans/` holds the four implementation
plans, each with notes on what changed during execution.
````

- [ ] **Step 7: Build, test, look**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist
```

Expected: 0 errors; all tests pass. Then check the live page at 1440×900:

- The rings still render over the paper: hero, journey and pin.
- Scrolled to the footer, `document.documentElement.dataset.tone === 'night'`, the computed `html` background is `rgb(18, 18, 17)` and theme-color is `#121211`.
- Back up at the hero, the tone is `paper`.
- No console errors.

- [ ] **Step 8: Commit**

```bash
git add public/_headers README.md src/styles/base.css src/scripts/motion/header.ts .gitignore tests/dist/seo.test.ts
git commit -m "chore: prepare hosting — headers, night overscroll, README

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: End-to-end tests in Chromium, Firefox and WebKit

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `playwright.config.ts`, `tests/e2e/site.spec.ts`

**Interfaces:**
- Consumes: the built site (`astro preview`), the markup hooks listed above.
- Produces: `npm run test:e2e`.

- [ ] **Step 1: Install Playwright and its browsers**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npm install -D @playwright/test@^1.63.0 && npx playwright install chromium firefox webkit
```

Add the script to `package.json`:

```json
    "test:e2e": "npm run build && playwright test",
```

- [ ] **Step 2: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

const PORT = 4400;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'retain-on-failure' },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
});
```

- [ ] **Step 3: Write `tests/e2e/site.spec.ts`**

```ts
import { expect, test, type Page } from '@playwright/test';

/** Collects page errors and console errors (three's informational logs are not errors). */
function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on('pageerror', (error) => problems.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });
  return problems;
}

const rings = (page: Page) => page.evaluate(() => document.documentElement.dataset.rings ?? 'none');

for (const { path, lang } of [
  { path: '/', lang: 'en' },
  { path: '/bs/', lang: 'bs' },
]) {
  test(`${path} loads cleanly and settles the rings`, async ({ page }) => {
    const problems = watch(page);
    await page.goto(path);
    await expect(page.locator('html')).toHaveAttribute('lang', lang);
    await expect(page.locator('h1')).toBeVisible();
    // 3D where the GPU allows it, posters otherwise — never stuck waiting.
    await expect.poll(() => rings(page), { timeout: 10_000 }).toMatch(/^(live|off)$/);
    expect(problems).toEqual([]);
  });
}

test('reduced motion shows posters and never pins', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const problems = watch(page);
  await page.goto('/');
  expect(await rings(page)).toBe('none');
  await expect(page.locator('canvas')).toHaveCount(0);
  const hero = page.locator('[data-stage="hero"] img');
  await expect(hero).toBeVisible();
  expect(await hero.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  expect(await page.locator('#approach .approach-grid').evaluate((grid) => grid.parentElement?.classList.contains('pin-spacer'))).toBe(false);
  expect(problems).toEqual([]);
});

test('without WebGL the rings stay posters and three.js is never downloaded', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    // @ts-expect-error — narrowing the overloads is not the point of this stub
    HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
      return type === 'webgl2' ? null : original.call(this, type as '2d', ...(rest as []));
    };
  });
  const chunks: string[] = [];
  page.on('request', (request) => {
    if (/\/rings\.[\w-]+\.js$/.test(request.url())) chunks.push(request.url());
  });
  await page.goto('/');
  await expect.poll(() => rings(page)).toBe('off');
  await page.waitForTimeout(1500);
  expect(chunks).toEqual([]);
  await expect(page.locator('[data-stage="hero"] img')).toBeVisible();
});

test('switches language and keeps the page', async ({ page, isMobile }) => {
  test.skip(isMobile, 'the switch lives in the menu on phones (covered below)');
  await page.goto('/');
  await page.locator('.site-header a[hreflang="bs"]').click();
  await expect(page).toHaveURL(/\/bs\/$/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'bs');
});

test('the phone menu opens, traps focus and closes with Escape', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'desktop has no menu');
  await page.goto('/');
  const toggle = page.locator('[data-menu-open]');
  await toggle.click();
  const menu = page.locator('dialog[data-menu]');
  await expect(menu).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(toggle).toBeFocused();
});

test('the contact form validates and sends (intercepted)', async ({ page }) => {
  let sent: Record<string, unknown> | null = null;
  await page.route('https://api.web3forms.com/**', async (route) => {
    sent = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.goto('/#contact');
  const form = page.locator('form[data-contact-form]');
  await form.locator('button[type="submit"]').click();
  await expect(form.locator('[data-error-for="name"]')).toBeVisible();
  await expect(form.locator('#cf-name')).toHaveAttribute('aria-invalid', 'true');

  await form.locator('#cf-name').fill('Test Person');
  await form.locator('#cf-email').fill('test@example.org');
  await form.locator('#cf-message').fill('We need a small online shop with invoicing.');
  await form.locator('input[name="access_key"]').evaluate((input: HTMLInputElement) => (input.value = 'test-key'));
  await form.locator('button[type="submit"]').click();
  await expect(form).toHaveAttribute('data-state', 'success');
  await expect(form.locator('[data-form-status]')).not.toBeEmpty();
  expect(sent).toMatchObject({ name: 'Test Person', email: 'test@example.org', access_key: 'test-key' });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('the whole page is there, with posters and labels', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-stage="hero"] img')).toBeVisible();
    await expect(page.locator('.stage-label')).toHaveCount(3);
    await expect(page.locator('form[data-contact-form]')).toHaveAttribute('action', /web3forms/);
  });
});

test('the skip link jumps to the content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard navigation');
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skip-link');
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused({ timeout: 5000 });
});

test('unknown pages answer 404 with the fallen rings', async ({ page }) => {
  const problems = watch(page);
  const response = await page.goto('/nowhere-at-all');
  expect(response?.status()).toBe(404);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await page.locator('main a[href="/"]').first().click();
  await expect(page).toHaveURL(/\/$/);
  expect(problems).toEqual([]);
});
```

- [ ] **Step 4: Run it**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npm run test:e2e
```

Expected: every test passes, or is skipped as marked, in all five projects. If an engine disagrees, the error is the product's to fix: find the cause in the site, fix it, and record it. Never loosen a test to hide a real difference.

- [ ] **Step 5: Type-check and commit**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check
git add package.json package-lock.json playwright.config.ts tests/e2e
git commit -m "test: add cross-browser end-to-end tests (Chromium, Firefox, WebKit)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Lighthouse audits, fixes and implementation notes

**Files:**
- Modify: whatever the audits show needs fixing
- Modify: `docs/superpowers/plans/2026-09-24-plan-4-launch-polish.md` (implementation notes)

- [ ] **Step 1: Build for the local origin and serve it**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; SITE_URL=http://127.0.0.1:4500 npm run build && npm run preview -- --host 127.0.0.1 --port 4500
```

Run the preview in the background. Canonical URLs, social cards and the sitemap now point at the audited origin.

- [ ] **Step 2: Audit both languages, mobile and desktop**

```bash
mkdir -p .lighthouse
for page in "" "bs/"; do
  name=$([ -z "$page" ] && echo en || echo bs)
  npx -y lighthouse@13.5.0 "http://127.0.0.1:4500/$page" --quiet --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=".lighthouse/mobile-$name.json"
  npx -y lighthouse@13.5.0 "http://127.0.0.1:4500/$page" --quiet --preset=desktop --chrome-flags="--headless=new" --only-categories=performance,accessibility,best-practices,seo --output=json --output-path=".lighthouse/desktop-$name.json"
done
node -e "const p=require('path');for(const f of require('fs').readdirSync('.lighthouse')){const r=require(p.resolve('.lighthouse',f));const s=Object.fromEntries(Object.entries(r.categories).map(([k,v])=>[k,Math.round(v.score*100)]));const a=r.audits;console.log(f,s,'LCP',Math.round(a['largest-contentful-paint'].numericValue),'TBT',Math.round(a['total-blocking-time'].numericValue),'CLS',a['cumulative-layout-shift'].numericValue.toFixed(3));}"
```

Expected targets:

| Setting | Performance | Accessibility | Best practices | SEO | LCP | CLS |
| --- | --- | --- | --- | --- | --- | --- |
| Mobile | ≥ 90 | ≥ 95 | ≥ 95 | 100 | ≤ 2.0 s | ≤ 0.02 |
| Desktop | ≥ 95 | ≥ 95 | ≥ 95 | 100 | — | ≤ 0.02 |

- [ ] **Step 3: Fix what falls short**

For every audit below 100 in accessibility, best practices or SEO, and for every performance opportunity worth more than 100 ms, read the failing items in the JSON (`audits[id].details`). Fix the cause in the site, rebuild with `SITE_URL`, and re-run only the affected audit. Keep a row per fix for the notes. Stop when the targets hold on both languages.

- [ ] **Step 4: Rebuild for the real configuration and re-run every test**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"; npx astro check && npm test && npm run build && npm run test:dist && npx playwright test
```

Expected: everything passes.

- [ ] **Step 5: Write the implementation notes**

Append `## Implementation notes (deviations found during execution)` to this plan:

- a `| Where | Change | Why |` table of every deviation and fix;
- the final Lighthouse table (both languages, mobile and desktop);
- bundle sizes;
- the e2e results per engine.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "docs: record Lighthouse results and implementation notes for plan 4

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
