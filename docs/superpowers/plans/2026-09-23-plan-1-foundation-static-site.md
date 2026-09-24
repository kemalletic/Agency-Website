# Plan 1 — Foundation & Static Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Claude Design mockup with a production Astro 7 site — bilingual (`/` English, `/bs/` Bosnian), responsive from 360 px to 2560 px, every section built from clean components and design tokens, with a working contact form. No scroll motion or WebGL yet (Plans 2 and 3).

**Architecture:** Static Astro site. All copy lives in typed dictionaries (`src/i18n/en.ts`, `src/i18n/bs.ts`); studio facts live in `src/config/site.ts`. Section components call `getDictionary(lang)` and render semantic HTML styled by scoped `<style>` blocks on top of global tokens (`src/styles/tokens.css`). Pure logic (time, form validation, i18n helpers) sits in `src/lib` and `src/i18n` with Vitest unit tests; DOM wiring sits in small `src/scripts/*.ts` modules imported from component `<script>` tags. Built HTML is verified by "dist tests" that parse `dist/*.html` with linkedom.

**Tech Stack:** Node 24.21.0 · Astro 7.3 (static output, i18n routing, Fonts API, `astro:assets`, `astro:env`) · TypeScript 6 (strict) · Vitest 5 · linkedom · vanilla CSS.

**Spec:** `docs/superpowers/specs/2026-09-23-studio-site-redesign-design.md` (sections 4–8, 11, 13). This is plan 1 of 4: (1) foundation & static site, (2) motion system, (3) WebGL rings, (4) launch polish (SEO extras, 404, audits, deploy docs). Plans 2–4 are written after this one ships, against the real markup.

**Deferred on purpose (not in this plan):** header hide/show and every scroll or entrance animation (Plan 2); the WebGL rings, real posters rendered from the 3D scene and the approach-stage overlay (Plan 3); optional real project screenshots and team photo in `site.ts`, OG image, JSON-LD, sitemap, robots.txt, 404 page, cross-browser and Lighthouse audits, README (Plan 4).

## Global Constraints

- Run every `npm`/`npx` command with Node 24.21.0. In Git Bash prefix commands with `export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH";` (the machine default stays Node 20).
- Versions: `astro@^7.3.4`, `typescript@^6.0.3`, `@astrojs/check@^0.9.10`, `vitest@^5.0.1`, `linkedom@^0.18.13`, `@types/node@^24`.
- Routes: `/` = English, `/bs/` = Bosnian; `i18n.routing.prefixDefaultLocale: false`.
- No Tailwind. Styling = global tokens + Astro scoped `<style>`. No `style=""` attributes except data-carrying CSS custom properties (e.g. `style="--start: 22.857%"`).
- Colors exactly: paper `#ebe9e4`, paper-2 `#f3f2ee`, paper-3 `#fbfaf8`, porcelain `#f4f2ee`, ink `#121211`, graphite `#2a2a2c`, muted `#55534e`, label `#66645f`, faint `#8c8983`, line `#d3d0c9`, accent `#1e4636`, night `#121211`, night-line `#34332f`, night-muted `#a9a69f`.
- Font: Host Grotesk variable (weights 300–800) via Astro Fonts API, subsets `latin` + `latin-ext`, CSS variable `--font-sans`.
- Layout: 4 columns below 48rem (768 px), 8 columns from 48rem, 12 columns from 64rem (1024 px); gutter 16 px / 24 px (from 768 px); side padding `clamp(1.25rem, 4.4444vw, 4rem)`; container max 1680 px.
- All visible text comes from the dictionaries; all studio facts from `src/config/site.ts`.
- Bosnian copy: ijekavica, Latin script.
- Exactly one `<h1>` per page; skip link to `#main`; visible focus (2 px outline, 4 px offset).
- No JS animation in this plan. CSS hover transitions from the original design are allowed.
- Components that accept a `class` prop also spread `...rest` onto their root element (Astro passes the parent's scope attribute through props).
- Commit after each task; every commit message ends with the line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## File Map

```text
reference/                          original export (moved, unchanged)
package.json · astro.config.ts · tsconfig.json · vitest.config.ts · vitest.dist.config.ts
.nvmrc · .gitattributes · .env.example · .vscode/extensions.json
public/favicon.svg
src/
  config/site.ts                    studio facts (name, email, phone, address, hours, booking month, socials)
  i18n/locales.ts                   locales, localePath(), isLocale(), languageNames
  i18n/types.ts                     Dictionary + RichText types
  i18n/en.ts · i18n/bs.ts           all copy
  i18n/index.ts                     getDictionary(), fill(), pad2(), re-exports
  lib/time.ts                       Sarajevo clock formatting
  lib/form.ts                       contact validation, mailto, payload
  scripts/clock.ts                  updates <time data-clock> every minute
  scripts/lang-switch.ts            keeps the current section when switching language
  scripts/menu.ts                   mobile menu dialog
  scripts/contact-form.ts           validation UI + Web3Forms submit
  styles/tokens.css · styles/base.css
  layouts/Base.astro                <head>, fonts, meta, hreflang, skip link
  components/Home.astro             page composition
  components/Brand.astro · Clock.astro · LangSwitch.astro · Header.astro · MobileMenu.astro
  components/Hero.astro · Approach.astro · Services.astro · Work.astro
  components/Process.astro · Principles.astro · Contact.astro · Footer.astro
  components/ui/Button.astro · ui/SectionHeading.astro · ui/RingDot.astro
  components/art/ApproachDiagram.astro · ServiceWeb.astro · ServiceApps.astro · ServiceFlow.astro
  components/art/ProjectPortal.astro · ProjectShop.astro · Bottle.astro
  assets/posters/hero.png           copied from reference/assets (replaced in Plan 3)
  pages/index.astro · pages/bs/index.astro
tests/unit/time.test.ts · i18n.test.ts · form.test.ts
tests/dist/helpers.ts · document.test.ts · header.test.ts · hero.test.ts · approach.test.ts
tests/dist/services.test.ts · work.test.ts · process.test.ts · principles.test.ts · contact.test.ts · page.test.ts
```

---

### Task 1: Scaffold the Astro project and Sarajevo time helpers

**Files:**

- Move: `Minimal.dc.html`, `README.md`, `assets/`, `support.js`, `vendor/` → `reference/`
- Create: `package.json`, `astro.config.ts`, `tsconfig.json`, `vitest.config.ts`, `vitest.dist.config.ts`, `.nvmrc`, `.gitattributes`, `.env.example`, `.vscode/extensions.json`, `public/favicon.svg`, `src/pages/index.astro` (temporary), `src/lib/time.ts`
- Modify: `.gitignore`
- Test: `tests/unit/time.test.ts`

**Interfaces:**

- Produces: `formatTime(date: Date, locale: 'en' | 'bs'): string` → `"17:59"`; `formatOffset(date: Date): string` → `"UTC+1"` / `"UTC+2"`; `msUntilNextMinute(date: Date): number`; type `ClockLocale = 'en' | 'bs'`. npm scripts `dev`, `build`, `preview`, `check`, `test`, `test:dist`.

- [x] **Step 1: Move the original export into `reference/`**

```bash
cd /c/projects/nice
mkdir -p reference
git mv Minimal.dc.html README.md assets support.js vendor reference/
git status --short
```

Expected: five `R` (renamed) entries pointing into `reference/`.

- [x] **Step 2: Create project config files**

`package.json`:

```json
{
  "name": "studio-site",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "check": "astro check",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:dist": "vitest run --config vitest.dist.config.ts",
    "astro": "astro"
  },
  "allowScripts": {
    "esbuild": true
  }
}
```

`astro.config.ts`:

```ts
import { defineConfig, envField, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://example.com',
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'bs'],
    routing: { prefixDefaultLocale: false },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Host Grotesk',
      cssVariable: '--font-sans',
      weights: ['300 800'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
    },
  ],
  env: {
    schema: {
      PUBLIC_WEB3FORMS_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
  devToolbar: { enabled: false },
});
```

`tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "reference", "node_modules"]
}
```

`vitest.config.ts`:

```ts
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
```

`vitest.dist.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/dist/**/*.test.ts'],
  },
});
```

`.nvmrc`:

```text
24.21.0
```

`.gitattributes`:

```text
* text=auto eol=lf
*.png binary
*.jpg binary
*.avif binary
*.webp binary
*.woff2 binary
*.ico binary
```

`.env.example`:

```text
# Public access key from https://web3forms.com (safe to expose in the browser).
# Leave empty to fall back to a mailto: link.
PUBLIC_WEB3FORMS_KEY=
```

`.vscode/extensions.json`:

```json
{
  "recommendations": ["astro-build.astro-vscode"]
}
```

Append to `.gitignore`:

```text
.idea/
npm-debug.log*
```

`public/favicon.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="#ebe9e4"/>
  <g fill="none" stroke-width="3.2">
    <circle cx="16" cy="12" r="6.2" stroke="#b9b5ad"/>
    <circle cx="12.4" cy="18.4" r="6.2" stroke="#2a2a2c"/>
    <circle cx="19.6" cy="18.4" r="6.2" stroke="#1e4636"/>
  </g>
</svg>
```

Temporary `src/pages/index.astro` (replaced in Task 3):

```astro
---
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Scaffold</title></head>
  <body><p>Scaffold</p></body>
</html>
```

- [x] **Step 3: Install dependencies**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"
cd /c/projects/nice
npm install astro@^7.3.4
npm install -D typescript@^6.0.3 @astrojs/check@^0.9.10 vitest@^5.0.1 linkedom@^0.18.13 @types/node@^24
```

Expected: both commands finish with `added N packages`, no `ERR!`.

- [x] **Step 4: Write the failing time test**

`tests/unit/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { formatOffset, formatTime, msUntilNextMinute } from '../../src/lib/time';

describe('formatTime', () => {
  it('shows Sarajevo winter time (UTC+1) as 24h', () => {
    expect(formatTime(new Date('2026-01-15T16:59:30Z'), 'en')).toBe('17:59');
  });

  it('shows Sarajevo summer time (UTC+2)', () => {
    expect(formatTime(new Date('2026-07-15T15:59:00Z'), 'en')).toBe('17:59');
  });

  it('pads hours for Bosnian', () => {
    expect(formatTime(new Date('2026-07-15T06:05:00Z'), 'bs')).toBe('08:05');
  });
});

describe('formatOffset', () => {
  it('is UTC+1 in winter', () => {
    expect(formatOffset(new Date('2026-01-15T12:00:00Z'))).toBe('UTC+1');
  });

  it('is UTC+2 in summer', () => {
    expect(formatOffset(new Date('2026-07-15T12:00:00Z'))).toBe('UTC+2');
  });
});

describe('msUntilNextMinute', () => {
  it('counts what is left of the current minute', () => {
    expect(msUntilNextMinute(new Date('2026-01-15T16:59:30.250Z'))).toBe(29_750);
  });

  it('returns a full minute on the boundary', () => {
    expect(msUntilNextMinute(new Date('2026-01-15T17:00:00.000Z'))).toBe(60_000);
  });
});
```

- [x] **Step 5: Run it to see it fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../../src/lib/time"`.

- [x] **Step 6: Implement `src/lib/time.ts`**

```ts
export type ClockLocale = 'en' | 'bs';

const TIME_ZONE = 'Europe/Sarajevo';
const INTL_LOCALE: Record<ClockLocale, string> = { en: 'en-GB', bs: 'bs-BA' };

export function formatTime(date: Date, locale: ClockLocale): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

export function formatOffset(date: Date): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName');
  return part ? part.value.replace('GMT', 'UTC') : 'CET';
}

export function msUntilNextMinute(date: Date): number {
  return 60_000 - (date.getTime() % 60_000);
}
```

- [x] **Step 7: Run the tests and the build**

Run: `npm test`
Expected: PASS — `Tests 7 passed (7)`.

Run: `npm run build`
Expected: ends with `[build] Complete!` and `dist/index.html` exists.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro 7 project and Sarajevo time helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Studio config, dictionaries and i18n helpers

**Files:**

- Create: `src/i18n/locales.ts`, `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/bs.ts`, `src/i18n/index.ts`, `src/config/site.ts`
- Modify: `astro.config.ts` (use `site.url`)
- Test: `tests/unit/i18n.test.ts`

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces:
  - `locales: readonly ['en', 'bs']`, `type Locale = 'en' | 'bs'`, `defaultLocale`, `isLocale(v: string | undefined): v is Locale`, `localePath(l: Locale): '/' | '/bs/'`, `languageNames: Record<Locale, string>`, `ogLocale: Record<Locale, string>`.
  - `getDictionary(l: Locale): Dictionary`, `fill(template: string, values: Record<string, string>): string`, `pad2(n: number): string`.
  - Types `Dictionary`, `RichText`, `RichSegment`, `RingKey = 'design' | 'engineering' | 'automation'`, `MarkKey = 'take' | 'fall'`.
  - `site` object: `name`, `url`, `email`, `phone`, `address.street[l]`, `address.city`, `address.country[l]`, `hours[l]`, `bookingFrom[l]`, `coordinates`, `socials[]`, `callUrl`.

- [x] **Step 1: Write the failing i18n test**

`tests/unit/i18n.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fill, getDictionary, isLocale, localePath, pad2 } from '../../src/i18n';
import { bs } from '../../src/i18n/bs';
import { en } from '../../src/i18n/en';

type Shape = string | Shape[] | { [key: string]: Shape };

function shape(value: unknown): Shape {
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => [key, shape(v)]),
    );
  }
  return typeof value;
}

function strings(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) => strings(v, path ? `${path}.${key}` : key));
  }
  return [];
}

describe('dictionaries', () => {
  it('have the same structure in English and Bosnian', () => {
    expect(shape(bs)).toEqual(shape(en));
  });

  it('contain no empty strings', () => {
    for (const dict of [en, bs]) {
      for (const [path, s] of strings(dict)) expect(s.trim(), path).not.toBe('');
    }
  });

  it('mark all three rings, in order, in the approach lead', () => {
    for (const dict of [en, bs]) {
      const rings = dict.approach.lead.flatMap((seg) => (typeof seg === 'object' && 'ring' in seg ? [seg.ring] : []));
      expect(rings).toEqual(['design', 'engineering', 'automation']);
    }
  });

  it('are returned per locale', () => {
    expect(getDictionary('en')).toBe(en);
    expect(getDictionary('bs')).toBe(bs);
  });
});

describe('locale helpers', () => {
  it('maps locales to their home paths', () => {
    expect(localePath('en')).toBe('/');
    expect(localePath('bs')).toBe('/bs/');
  });

  it('recognises supported locales only', () => {
    expect(isLocale('bs')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('fills named placeholders and keeps unknown ones', () => {
    expect(fill('{name} is in {city}', { name: 'Studio' })).toBe('Studio is in {city}');
  });

  it('pads numbers to two digits', () => {
    expect(pad2(3)).toBe('03');
    expect(pad2(12)).toBe('12');
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../../src/i18n"`.

- [x] **Step 3: Create `src/i18n/locales.ts`**

```ts
export const locales = ['en', 'bs'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const languageNames: Record<Locale, string> = { en: 'English', bs: 'Bosanski' };

export const ogLocale: Record<Locale, string> = { en: 'en_US', bs: 'bs_BA' };

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

export function localePath(locale: Locale): string {
  return locale === defaultLocale ? '/' : `/${locale}/`;
}
```

- [x] **Step 4: Create `src/i18n/types.ts`**

```ts
export type RingKey = 'design' | 'engineering' | 'automation';
export type MarkKey = 'take' | 'fall';
export type RichSegment = string | { text: string; ring: RingKey } | { text: string; mark: MarkKey };
export type RichText = readonly RichSegment[];

export interface ServiceItem {
  id: 'web' | 'apps' | 'systems';
  title: string;
  tagline: string;
  body: string;
  bring: string;
  includes: readonly string[];
}

export interface ProjectItem {
  id: 'portal' | 'shop';
  name: string;
  summary: string;
  client: string;
  scope: string;
  status: string;
  cta: string;
  cardLabel: string;
}

export interface Dictionary {
  meta: { title: string; description: string };
  a11y: {
    skip: string;
    mainNav: string;
    footerNav: string;
    menu: string;
    close: string;
    language: string;
    home: string;
    newTab: string;
  };
  nav: { work: string; services: string; process: string; studio: string };
  cta: { start: string };
  clockCity: string;
  hero: {
    studio: string;
    location: string;
    booking: string;
    title: string;
    lead: string;
    fig: string;
    caption: string;
    ringsAlt: string;
  };
  approach: {
    label: string;
    lead: RichText;
    body: string;
    fig: string;
    caption: string;
    diagramAlt: string;
    rings: Record<RingKey, string>;
  };
  services: {
    title: string;
    intro: string;
    bring: string;
    includes: string;
    items: readonly ServiceItem[];
    flow: { shop: string; inbox: string; accounting: string; warehouse: string; invoice: string };
  };
  work: {
    title: string;
    intro: string;
    client: string;
    scope: string;
    status: string;
    projects: readonly ProjectItem[];
    next: { title: string; body: string; start: string };
  };
  process: {
    title: string;
    intro: string;
    stage: string;
    out: string;
    axis: { kickoff: string; golive: string; ongoing: string };
    stages: ReadonlyArray<{ title: string; body: string; out: string }>;
    fig: string;
    captionBefore: string;
    pillAlt: string;
    captionAfter: string;
  };
  principles: {
    title: string;
    intro: string;
    photo: string;
    items: ReadonlyArray<{ lead: string; body: string }>;
  };
  contact: {
    label: string;
    title: string;
    lead: string;
    needs: { legend: string; web: string; app: string; sys: string; unsure: string };
    fields: {
      name: string;
      namePh: string;
      email: string;
      emailPh: string;
      company: string;
      companyPh: string;
      message: string;
      messagePh: string;
    };
    note: string;
    submit: string;
    sending: string;
    success: string;
    error: string;
    subject: string;
    errors: { required: string; email: string; messageShort: string };
    info: { phone: string; studio: string; hours: string; call: string };
  };
}
```

- [x] **Step 5: Create `src/i18n/en.ts`**

```ts
import type { Dictionary } from './types';

export const en: Dictionary = {
  meta: {
    title: 'Design & engineering studio in Sarajevo',
    description:
      'Websites, web and mobile apps, and the systems and automations behind them — designed, built and looked after by one studio in Sarajevo.',
  },
  a11y: {
    skip: 'Skip to content',
    mainNav: 'Main',
    footerNav: 'Social',
    menu: 'Menu',
    close: 'Close',
    language: 'Language',
    home: 'home',
    newTab: '(opens in a new tab)',
  },
  nav: { work: 'Work', services: 'Services', process: 'Process', studio: 'Studio' },
  cta: { start: 'Start a project' },
  clockCity: 'Sarajevo',
  hero: {
    studio: 'Design & engineering studio',
    location: 'Sarajevo, Bosnia and Herzegovina',
    booking: 'Booking from',
    title: 'We design and build the software your business runs on.',
    lead: 'Websites, web and mobile apps, and the systems and automations behind them — designed, built and looked after by one studio in Sarajevo.',
    fig: 'Fig. 1',
    caption:
      'Borromean rings, rendered live in your browser. No two are linked, yet take any one away and the other two fall apart.',
    ringsAlt: 'Three rings — porcelain, graphite and green — linked so that no two of them are linked on their own.',
  },
  approach: {
    label: 'Approach',
    lead: [
      { ring: 'design', text: 'Design' },
      ', ',
      { ring: 'engineering', text: 'engineering' },
      ' and ',
      { ring: 'automation', text: 'automation' },
      ' under one roof. Like the three rings, each holds the other two — ',
      { mark: 'take', text: 'take one away' },
      ' and ',
      { mark: 'fall', text: 'the whole thing falls apart' },
      '.',
    ],
    body: 'One team from the first sketch to the system that runs every day. Nobody hands your project over the fence to someone who was not in the room.',
    fig: 'Fig. 2',
    caption: 'The same rings, flattened. Take one away and the other two come apart.',
    diagramAlt: 'Diagram of the three rings, flattened: design, engineering and automation.',
    rings: { design: 'Design', engineering: 'Engineering', automation: 'Automation' },
  },
  services: {
    title: 'Services',
    intro: 'Three kinds of work that usually end up connected. Most clients start with one and add the others as they grow.',
    bring: 'You bring',
    includes: 'Includes',
    items: [
      {
        id: 'web',
        title: 'Websites',
        tagline: 'A fast site your team edits on its own',
        body: 'Company sites, landing pages and web shops that load fast, show up in search, and that your team can update without calling us.',
        bring: 'Your brand, content and goals',
        includes: ['Design and content structure', 'CMS or web shop', 'SEO, analytics, hosting'],
      },
      {
        id: 'apps',
        title: 'Web & mobile apps',
        tagline: 'An app people actually use every day',
        body: 'Customer portals, ordering and booking apps, internal tools — in the browser and on iOS and Android.',
        bring: 'Work stuck in spreadsheets and calls',
        includes: ['UX research and prototypes', 'Web app and API', 'iOS and Android'],
      },
      {
        id: 'systems',
        title: 'Systems & automation',
        tagline: 'Flows that run on their own, with logs',
        body: 'Connections between your shop, accounting, warehouse and inbox. E-invoicing. AI steps where they save real hours — not where they only look good in a demo.',
        bring: 'Work that moves between tools by hand',
        includes: ['Integrations and APIs', 'E-invoicing', 'AI-assisted document handling'],
      },
    ],
    flow: { shop: 'Web shop', inbox: 'Inbox', accounting: 'Accounting', warehouse: 'Warehouse', invoice: 'E-invoice' },
  },
  work: {
    title: 'Selected work',
    intro: 'Two projects we can show in public. We are happy to walk you through others on a call.',
    client: 'Client',
    scope: 'Scope',
    status: 'Status',
    projects: [
      {
        id: 'portal',
        name: 'B2B ordering portal',
        summary:
          'Ordering and customer management for a dairy distributor. Shops order online from their own account; the team manages customers and orders in one place.',
        client: 'Dairy distributor, BiH',
        scope: 'Web app · System',
        status: 'In production',
        cta: 'Ask about this project',
        cardLabel: 'B2B ordering portal — ask us about this project',
      },
      {
        id: 'shop',
        name: 'ADA Parfemi',
        summary: 'Web shop for a perfume retailer that sells online and through Instagram.',
        client: 'Perfume retailer',
        scope: 'Website · E-commerce',
        status: 'Live',
        cta: 'Visit the shop',
        cardLabel: 'ADA Parfemi web shop (opens in a new tab)',
      },
    ],
    next: { title: 'Your project', body: 'This space is kept for the next one.', start: 'Next start:' },
  },
  process: {
    title: 'Process',
    intro: 'Five stages, the same every time. They overlap on purpose, so you see working software early and often — not just at the end.',
    stage: 'Stage',
    out: 'Out —',
    axis: { kickoff: 'Kick-off', golive: 'Go-live', ongoing: 'Ongoing' },
    stages: [
      {
        title: 'Discover',
        body: 'We sit with the people who do the work and map it: what comes in, what gets retyped, where things wait.',
        out: 'Scope and estimate',
      },
      {
        title: 'Design',
        body: 'A clickable prototype of the key screens, tried out by the people who will use them.',
        out: 'Prototype',
      },
      {
        title: 'Build',
        body: 'Short cycles, each ending in something you can click. Your feedback goes straight into the next one.',
        out: 'Test version online',
      },
      {
        title: 'Launch',
        body: 'Data moved over, your team trained, go-live planned for a quiet day — never a Friday.',
        out: 'Live system',
      },
      {
        title: 'Run',
        body: 'We monitor, fix and improve. You get a plain-language log of what changed and why.',
        out: 'Support and changelog',
      },
    ],
    fig: 'Fig. 3',
    captionBefore: 'How the stages overlap on a typical project. Each',
    pillAlt: 'dot',
    captionAfter: 'is a working demo you can click through.',
  },
  principles: {
    title: 'Before you hire us',
    intro: '{name} is a design and engineering studio in Sarajevo, Bosnia and Herzegovina. Five things worth knowing up front.',
    photo: '[ Photo — the people you will work with ]',
    items: [
      { lead: 'You own it.', body: 'Code, data, domains and accounts are in your name from day one.' },
      {
        lead: 'No lock-in.',
        body: 'Everything is documented so another team could take over. We would rather you stay because you want to.',
      },
      {
        lead: 'Proven tools.',
        body: '.NET, Angular, React, Node and PostgreSQL. Boring on purpose — your business is not our experiment.',
      },
      {
        lead: 'A direct line.',
        body: 'You talk to the people who design and write the code. No account managers in between.',
      },
      {
        lead: 'Your time zone.',
        body: 'Sarajevo runs on CET, the same working day as most of Europe. We work in English and Bosnian / Croatian / Serbian.',
      },
    ],
  },
  contact: {
    label: 'Contact',
    title: 'Start a project',
    lead: 'Tell us what you need built — or what keeps getting done by hand. We reply within one working day, with questions or a time to talk.',
    needs: {
      legend: 'What do you need?',
      web: 'Website',
      app: 'Web or mobile app',
      sys: 'System or automation',
      unsure: 'Not sure yet',
    },
    fields: {
      name: 'Name',
      namePh: 'Your name',
      email: 'Email',
      emailPh: 'you@company.com',
      company: 'Company (optional)',
      companyPh: 'Company name',
      message: 'What should it do?',
      messagePh: 'Orders come in by phone and get retyped into accounting…',
    },
    note: 'Goes straight to the people who will build it.',
    submit: 'Send',
    sending: 'Sending…',
    success: 'Thank you — we will reply within one working day.',
    error: 'Something went wrong. Please write to us directly:',
    subject: 'New project inquiry',
    errors: {
      required: 'Please fill this in.',
      email: 'Please enter a valid email address.',
      messageShort: 'A sentence or two, please — at least 10 characters.',
    },
    info: { phone: 'Phone', studio: 'Studio', hours: 'Hours', call: 'Book a 30-min call' },
  },
};
```

- [x] **Step 6: Create `src/i18n/bs.ts`**

```ts
import type { Dictionary } from './types';

export const bs: Dictionary = {
  meta: {
    title: 'Studio za dizajn i razvoj softvera u Sarajevu',
    description:
      'Web stranice, web i mobilne aplikacije te sistemi i automatizacije iza njih — dizajnira ih, gradi i održava jedan studio u Sarajevu.',
  },
  a11y: {
    skip: 'Preskoči na sadržaj',
    mainNav: 'Glavna navigacija',
    footerNav: 'Društvene mreže',
    menu: 'Meni',
    close: 'Zatvori',
    language: 'Jezik',
    home: 'početna',
    newTab: '(otvara se u novoj kartici)',
  },
  nav: { work: 'Radovi', services: 'Usluge', process: 'Proces', studio: 'Studio' },
  cta: { start: 'Započnimo projekat' },
  clockCity: 'Sarajevo',
  hero: {
    studio: 'Studio za dizajn i inženjering',
    location: 'Sarajevo, Bosna i Hercegovina',
    booking: 'Primamo projekte od',
    title: 'Dizajniramo i gradimo softver na kojem radi vaše poslovanje.',
    lead: 'Web stranice, web i mobilne aplikacije te sistemi i automatizacije iza njih — dizajnira ih, gradi i održava jedan studio u Sarajevu.',
    fig: 'Sl. 1',
    caption:
      'Borromejevi prstenovi, renderovani uživo u vašem pregledniku. Nijedna dva nisu spojena, a ipak — ukloni li se bilo koji, druga dva se raspadnu.',
    ringsAlt: 'Tri prstena — porculanski, grafitni i zeleni — povezana tako da nijedna dva nisu spojena sama po sebi.',
  },
  approach: {
    label: 'Pristup',
    lead: [
      { ring: 'design', text: 'Dizajn' },
      ', ',
      { ring: 'engineering', text: 'inženjering' },
      ' i ',
      { ring: 'automation', text: 'automatizacija' },
      ' pod jednim krovom. Kao tri prstena, svaki drži druga dva — ',
      { mark: 'take', text: 'ukloni jedan' },
      ' i ',
      { mark: 'fall', text: 'sve se raspadne' },
      '.',
    ],
    body: 'Jedan tim od prve skice do sistema koji radi svaki dan. Niko vaš projekat ne prebacuje preko ograde nekome ko nije bio u prostoriji.',
    fig: 'Sl. 2',
    caption: 'Isti prstenovi, spljošteni. Ukloni jedan i druga dva se razdvoje.',
    diagramAlt: 'Dijagram tri spljoštena prstena: dizajn, inženjering i automatizacija.',
    rings: { design: 'Dizajn', engineering: 'Inženjering', automation: 'Automatizacija' },
  },
  services: {
    title: 'Usluge',
    intro: 'Tri vrste posla koje se obično na kraju povežu. Većina klijenata počne s jednom, a ostale doda kako raste.',
    bring: 'Vi donosite',
    includes: 'Uključuje',
    items: [
      {
        id: 'web',
        title: 'Web stranice',
        tagline: 'Brz sajt koji vaš tim sam uređuje',
        body: 'Firmine stranice, landing stranice i web shopovi koji se brzo učitavaju, vide se u pretrazi i koje vaš tim može ažurirati bez da nas zove.',
        bring: 'Vaš brend, sadržaj i ciljevi',
        includes: ['Dizajn i struktura sadržaja', 'CMS ili web shop', 'SEO, analitika, hosting'],
      },
      {
        id: 'apps',
        title: 'Web i mobilne aplikacije',
        tagline: 'Aplikacija koju ljudi zaista koriste svaki dan',
        body: 'Portali za kupce, aplikacije za narudžbe i rezervacije, interni alati — u pregledniku te na iOS-u i Androidu.',
        bring: 'Posao zaglavljen u tabelama i pozivima',
        includes: ['UX istraživanje i prototipovi', 'Web aplikacija i API', 'iOS i Android'],
      },
      {
        id: 'systems',
        title: 'Sistemi i automatizacija',
        tagline: 'Tokovi koji rade sami, uz evidenciju',
        body: 'Veze između vašeg shopa, računovodstva, skladišta i e-pošte. E-fakturisanje. AI koraci tamo gdje štede stvarne sate — ne tamo gdje samo lijepo izgledaju na demu.',
        bring: 'Posao koji se ručno prebacuje između alata',
        includes: ['Integracije i API-ji', 'E-fakturisanje', 'Obrada dokumenata uz pomoć AI-ja'],
      },
    ],
    flow: { shop: 'Web shop', inbox: 'E-pošta', accounting: 'Računovodstvo', warehouse: 'Skladište', invoice: 'E-faktura' },
  },
  work: {
    title: 'Odabrani radovi',
    intro: 'Dva projekta koja možemo javno pokazati. Rado ćemo vas kroz ostale provesti na pozivu.',
    client: 'Klijent',
    scope: 'Obim',
    status: 'Status',
    projects: [
      {
        id: 'portal',
        name: 'B2B portal za narudžbe',
        summary:
          'Narudžbe i upravljanje kupcima za distributera mliječnih proizvoda. Prodavnice naručuju online sa svog računa; tim upravlja kupcima i narudžbama na jednom mjestu.',
        client: 'Distributer mliječnih proizvoda, BiH',
        scope: 'Web aplikacija · Sistem',
        status: 'U produkciji',
        cta: 'Pitajte nas o ovom projektu',
        cardLabel: 'B2B portal za narudžbe — pitajte nas o ovom projektu',
      },
      {
        id: 'shop',
        name: 'ADA Parfemi',
        summary: 'Web shop za prodavca parfema koji prodaje online i preko Instagrama.',
        client: 'Prodavac parfema',
        scope: 'Web stranica · E-commerce',
        status: 'Online',
        cta: 'Posjetite shop',
        cardLabel: 'ADA Parfemi web shop (otvara se u novoj kartici)',
      },
    ],
    next: { title: 'Vaš projekat', body: 'Ovo mjesto čuvamo za sljedeći.', start: 'Sljedeći početak:' },
  },
  process: {
    title: 'Proces',
    intro: 'Pet faza, svaki put iste. Namjerno se preklapaju, pa radni softver vidite rano i često — ne tek na kraju.',
    stage: 'Faza',
    out: 'Rezultat —',
    axis: { kickoff: 'Početak', golive: 'Lansiranje', ongoing: 'Dalje' },
    stages: [
      {
        title: 'Istraživanje',
        body: 'Sjednemo s ljudima koji rade posao i mapiramo ga: šta ulazi, šta se prekucava, gdje stvari čekaju.',
        out: 'Obim i procjena',
      },
      {
        title: 'Dizajn',
        body: 'Klikabilni prototip ključnih ekrana, isproban s ljudima koji će ga koristiti.',
        out: 'Prototip',
      },
      {
        title: 'Razvoj',
        body: 'Kratki ciklusi, svaki završava nečim što možete kliknuti. Vaše povratne informacije idu pravo u sljedeći.',
        out: 'Test verzija online',
      },
      {
        title: 'Lansiranje',
        body: 'Podaci prebačeni, tim obučen, puštanje u rad planirano za miran dan — nikad u petak.',
        out: 'Sistem uživo',
      },
      {
        title: 'Održavanje',
        body: 'Pratimo, popravljamo i unapređujemo. Dobijate jasan zapisnik šta se promijenilo i zašto.',
        out: 'Podrška i zapisnik promjena',
      },
    ],
    fig: 'Sl. 3',
    captionBefore: 'Kako se faze preklapaju na tipičnom projektu. Svaka',
    pillAlt: 'tačka',
    captionAfter: 'je radni demo kroz koji možete klikati.',
  },
  principles: {
    title: 'Prije nego nas angažujete',
    intro: '{name} je studio za dizajn i inženjering u Sarajevu, Bosna i Hercegovina. Pet stvari koje vrijedi znati unaprijed.',
    photo: '[ Fotografija — ljudi s kojima ćete raditi ]',
    items: [
      { lead: 'Vaše je.', body: 'Kod, podaci, domene i nalozi su na vaše ime od prvog dana.' },
      {
        lead: 'Bez zaključavanja.',
        body: 'Sve je dokumentovano tako da bi drugi tim mogao preuzeti. Radije bismo da ostanete zato što to želite.',
      },
      {
        lead: 'Provjereni alati.',
        body: '.NET, Angular, React, Node i PostgreSQL. Namjerno dosadno — vaš posao nije naš eksperiment.',
      },
      {
        lead: 'Direktna linija.',
        body: 'Razgovarate s ljudima koji dizajniraju i pišu kod. Bez account menadžera između.',
      },
      {
        lead: 'Vaša vremenska zona.',
        body: 'Sarajevo radi po CET-u, isti radni dan kao većina Evrope. Radimo na engleskom i bosanskom / hrvatskom / srpskom.',
      },
    ],
  },
  contact: {
    label: 'Kontakt',
    title: 'Započnimo projekat',
    lead: 'Recite nam šta treba izgraditi — ili šta se stalno radi ručno. Odgovaramo u roku od jednog radnog dana, s pitanjima ili terminom za razgovor.',
    needs: {
      legend: 'Šta vam treba?',
      web: 'Web stranica',
      app: 'Web ili mobilna aplikacija',
      sys: 'Sistem ili automatizacija',
      unsure: 'Još ne znam',
    },
    fields: {
      name: 'Ime',
      namePh: 'Vaše ime',
      email: 'Email',
      emailPh: 'vi@firma.ba',
      company: 'Firma (opciono)',
      companyPh: 'Naziv firme',
      message: 'Šta treba da radi?',
      messagePh: 'Narudžbe stižu telefonom i prekucavaju se u računovodstvo…',
    },
    note: 'Ide direktno ljudima koji će to graditi.',
    submit: 'Pošalji',
    sending: 'Šaljem…',
    success: 'Hvala — odgovorit ćemo u roku od jednog radnog dana.',
    error: 'Nešto nije u redu. Pišite nam direktno:',
    subject: 'Novi upit za projekat',
    errors: {
      required: 'Molimo popunite ovo polje.',
      email: 'Unesite ispravnu email adresu.',
      messageShort: 'Rečenica-dvije, molimo — najmanje 10 znakova.',
    },
    info: { phone: 'Telefon', studio: 'Studio', hours: 'Radno vrijeme', call: 'Zakažite poziv od 30 min' },
  },
};
```

- [x] **Step 7: Create `src/i18n/index.ts`**

```ts
import { bs } from './bs';
import { en } from './en';
import type { Locale } from './locales';
import type { Dictionary } from './types';

export * from './locales';
export type { Dictionary, MarkKey, ProjectItem, RichSegment, RichText, RingKey, ServiceItem } from './types';

const dictionaries: Record<Locale, Dictionary> = { en, bs };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
```

- [x] **Step 8: Create `src/config/site.ts`**

```ts
import type { Locale } from '../i18n/locales';

type Localized = Record<Locale, string>;

export interface SiteConfig {
  /** Studio name. Shown in the header, footer, page titles and form e-mails. */
  name: string;
  /** Public URL of the site (used for canonical and hreflang links). */
  url: string;
  email: string;
  phone: string;
  address: { street: Localized; city: string; country: Localized };
  hours: Localized;
  /** Month the next project can start, e.g. "October 2026" / "oktobar 2026". */
  bookingFrom: Localized;
  coordinates: string;
  socials: ReadonlyArray<{ label: string; href: string }>;
  /** Target of "Book a 30-min call" (e.g. a Cal.com link). */
  callUrl: string;
}

// Values in [brackets] are placeholders — replace them with the studio's real details.
export const site: SiteConfig = {
  name: '[NAME]',
  url: 'https://example.com',
  email: 'hello@yourdomain.com',
  phone: '[+387 00 000 000]',
  address: {
    street: { en: '[Street and number]', bs: '[Ulica i broj]' },
    city: '71000 Sarajevo',
    country: { en: 'Bosnia and Herzegovina', bs: 'Bosna i Hercegovina' },
  },
  hours: { en: '[Mon–Fri, 9:00–17:00 CET]', bs: '[pon–pet, 9:00–17:00 CET]' },
  bookingFrom: { en: '[MONTH YEAR]', bs: '[MJESEC GODINA]' },
  coordinates: '43.8563° N, 18.4131° E',
  socials: [
    { label: 'LinkedIn', href: '#' },
    { label: 'GitHub', href: '#' },
    { label: 'Instagram', href: '#' },
  ],
  callUrl: '#contact',
};
```

- [x] **Step 9: Point `astro.config.ts` at the site config**

Replace the first two lines and the `site` property so the file reads:

```ts
import { defineConfig, envField, fontProviders } from 'astro/config';
import { site } from './src/config/site';

export default defineConfig({
  site: site.url,
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'bs'],
    routing: { prefixDefaultLocale: false },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Host Grotesk',
      cssVariable: '--font-sans',
      weights: ['300 800'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
    },
  ],
  env: {
    schema: {
      PUBLIC_WEB3FORMS_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
  devToolbar: { enabled: false },
});
```

- [x] **Step 10: Run tests and type check**

Run: `npm test`
Expected: PASS — `Tests 15 passed (15)`.

Run: `npm run check`
Expected: `0 errors`.

- [x] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: add studio config and English/Bosnian dictionaries

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Design tokens, base styles, layout and pages

**Files:**

- Create: `src/styles/tokens.css`, `src/styles/base.css`, `src/layouts/Base.astro`, `src/components/Home.astro`, `src/pages/bs/index.astro`, `tests/dist/helpers.ts`
- Modify: `src/pages/index.astro` (replace scaffold)
- Test: `tests/dist/document.test.ts`

**Interfaces:**

- Consumes: `getDictionary`, `locales`, `localePath`, `ogLocale`, `type Locale` (Task 2); `site` (Task 2).
- Produces:
  - `<Base lang>` layout with `<slot />` inside `<body>`; `<Home lang>` renders `<Base>` + `<main id="main">`.
  - Global CSS classes: `.container`, `.label`, `.fig-caption`, `.fig-num`, `.art-frame`, `.acc`, `.visually-hidden`, `.skip-link`.
  - Tokens: `--paper … --night-error`, `--fs-*`, `--page-max`, `--pad-x`, `--cols`, `--gutter`, `--header-h`, `--section-y`, `--ease-out`, `--ease-std`.
  - Test helpers: `pages`, `loadPage(path)`, `text(el)`.

- [x] **Step 1: Write the dist test helpers and the failing document test**

`tests/dist/helpers.ts`:

```ts
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import type { Locale } from '../../src/i18n';

export const pages: ReadonlyArray<{ path: string; lang: Locale }> = [
  { path: 'index.html', lang: 'en' },
  { path: 'bs/index.html', lang: 'bs' },
];

export function loadPage(path: string): Document {
  const html = readFileSync(new URL(`../../dist/${path}`, import.meta.url), 'utf8');
  return parseHTML(html).document as unknown as Document;
}

/** Text content with all whitespace (including no-break spaces) collapsed to single spaces. */
export function text(el: Element | null | undefined): string {
  return norm(el?.textContent ?? '');
}

export function norm(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
```

`tests/dist/document.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages } from './helpers';

describe.each(pages)('$path document', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);

  it('declares the page language', () => {
    expect(doc.documentElement.getAttribute('lang')).toBe(lang);
  });

  it('uses the dictionary title and description', () => {
    expect(doc.querySelector('title')?.textContent).toBe(`${site.name} — ${t.meta.title}`);
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(t.meta.description);
  });

  it('links canonical, both languages and x-default', () => {
    const expected = lang === 'en' ? `${site.url}/` : `${site.url}/bs/`;
    expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(expected);
    const alternates = Array.from(doc.querySelectorAll('link[rel="alternate"][hreflang]')).map((l) => [
      l.getAttribute('hreflang'),
      l.getAttribute('href'),
    ]);
    expect(alternates).toEqual([
      ['en', `${site.url}/`],
      ['bs', `${site.url}/bs/`],
      ['x-default', `${site.url}/`],
    ]);
  });

  it('preloads the Latin font file', () => {
    expect(doc.querySelector('link[rel="preload"][as="font"]')).not.toBeNull();
  });

  it('offers a skip link to the main landmark', () => {
    expect(doc.querySelector('a.skip-link')?.getAttribute('href')).toBe('#main');
    expect(doc.querySelector('main#main')).not.toBeNull();
  });
});
```

- [x] **Step 2: Build and run the dist test to see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — `ENOENT … dist/bs/index.html` and the English assertions fail (no title/meta yet).

- [x] **Step 3: Create `src/styles/tokens.css`**

```css
:root {
  /* Color */
  --paper: #ebe9e4;
  --paper-2: #f3f2ee;
  --paper-3: #fbfaf8;
  --porcelain: #f4f2ee;
  --ink: #121211;
  --graphite: #2a2a2c;
  --muted: #55534e;
  --label: #66645f;
  --faint: #8c8983;
  --line: #d3d0c9;
  --line-dash: #a9a59d;
  --accent: #1e4636;
  --night: #121211;
  --night-line: #34332f;
  --night-muted: #a9a69f;
  --night-faint: #8c8983;
  --night-chip: #5b5954;
  --night-error: #e6a898;

  /* Type — fluid between 390px and 1440px viewports */
  --fs-hero: clamp(2.75rem, 1.6357rem + 4.5714vw, 5.75rem);
  --fs-display: clamp(3.5rem, 2.2rem + 5.3333vw, 7rem);
  --fs-h2: clamp(2.75rem, 2.0071rem + 3.0476vw, 4.75rem);
  --fs-service: clamp(2rem, 1.4893rem + 2.0952vw, 3.375rem);
  --fs-next: clamp(2.25rem, 1.7857rem + 1.9048vw, 3.5rem);
  --fs-lead: clamp(1.75rem, 1.3321rem + 1.7143vw, 2.875rem);
  --fs-project: clamp(1.875rem, 1.6429rem + 0.9524vw, 2.5rem);
  --fs-mail: clamp(1.5rem, 1.2679rem + 0.9524vw, 2.125rem);
  --fs-h3: clamp(1.375rem, 1.1893rem + 0.7619vw, 1.875rem);
  --fs-body-xl: clamp(1.125rem, 1.0554rem + 0.2857vw, 1.3125rem);
  --fs-body-l: clamp(1.0625rem, 1.0393rem + 0.0952vw, 1.125rem);
  --fs-body-m: clamp(1rem, 0.9768rem + 0.0952vw, 1.0625rem);
  --fs-input: clamp(1.125rem, 1.0786rem + 0.1905vw, 1.25rem);

  /* Layout */
  --page-max: 105rem;
  --pad-x: clamp(1.25rem, 4.4444vw, 4rem);
  --cols: 4;
  --gutter: 1rem;
  --header-h: 4rem;
  --section-y: clamp(6rem, 4.1429rem + 7.619vw, 11rem);

  /* Motion */
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-std: cubic-bezier(0.2, 0.7, 0.2, 1);
}

@media (min-width: 48rem) {
  :root {
    --cols: 8;
    --gutter: 1.5rem;
  }
}

@media (min-width: 64rem) {
  :root {
    --cols: 12;
    --header-h: 6rem;
  }
}
```

- [x] **Step 4: Create `src/styles/base.css`**

```css
@layer reset, base;

@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }
  body,
  h1,
  h2,
  h3,
  h4,
  p,
  figure,
  blockquote,
  dl,
  dd,
  ol,
  ul {
    margin: 0;
  }
  fieldset,
  legend {
    margin: 0;
    padding: 0;
    border: 0;
    min-width: 0;
  }
  img,
  picture,
  svg,
  video,
  canvas {
    display: block;
    max-width: 100%;
  }
  input,
  button,
  textarea,
  select {
    font: inherit;
    color: inherit;
    letter-spacing: inherit;
  }
  button {
    background: none;
    border: 0;
    padding: 0;
    cursor: pointer;
  }
}

@layer base {
  html {
    background: var(--paper);
    color: var(--ink);
    scroll-padding-top: var(--header-h);
  }
  @media (prefers-reduced-motion: no-preference) {
    html {
      scroll-behavior: smooth;
    }
  }
  body {
    min-height: 100vh;
    overflow-x: clip;
    background: var(--paper);
    font-family: var(--font-sans);
    font-size: 1rem;
    line-height: 1.5;
    font-feature-settings: 'ss01' on;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }
  a {
    color: inherit;
  }
  ::selection {
    background: var(--ink);
    color: var(--paper);
  }
  :focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 4px;
  }

  .container {
    width: 100%;
    max-width: calc(var(--page-max) + 2 * var(--pad-x));
    margin-inline: auto;
    padding-inline: var(--pad-x);
  }
  .label {
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--label);
  }
  .fig-caption {
    font-size: 0.8125rem;
    line-height: 1.55;
    color: var(--muted);
  }
  .fig-num {
    color: var(--ink);
    font-weight: 500;
  }
  .art-frame {
    position: relative;
    aspect-ratio: 16 / 10;
    border-radius: 10px;
    background: var(--paper-2);
    overflow: hidden;
  }
  .art-frame > svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .acc {
    fill: var(--accent);
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
  .skip-link {
    position: fixed;
    left: 16px;
    top: -100px;
    z-index: 100;
    padding: 10px 18px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
  }
  .skip-link:focus {
    top: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [x] **Step 5: Create `src/layouts/Base.astro`**

```astro
---
import { Font } from 'astro:assets';
import '../styles/tokens.css';
import '../styles/base.css';
import { site } from '../config/site';
import { getDictionary, localePath, locales, ogLocale, type Locale } from '../i18n';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);
const title = `${site.name} — ${t.meta.title}`;
const href = (l: Locale) => new URL(localePath(l), site.url).href;
---

<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={t.meta.description} />
    <link rel="canonical" href={href(lang)} />
    {locales.map((l) => <link rel="alternate" hreflang={l} href={href(l)} />)}
    <link rel="alternate" hreflang="x-default" href={href('en')} />
    <meta name="theme-color" content="#ebe9e4" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={t.meta.description} />
    <meta property="og:url" content={href(lang)} />
    <meta property="og:locale" content={ogLocale[lang]} />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <Font cssVariable="--font-sans" preload={[{ subset: 'latin', weight: '300' }]} />
  </head>
  <body>
    <a class="skip-link" href="#main">{t.a11y.skip}</a>
    <slot />
  </body>
</html>
```

- [x] **Step 6: Create `src/components/Home.astro` and both pages**

`src/components/Home.astro`:

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <main id="main"></main>
</Base>
```

`src/pages/index.astro` (replace the scaffold):

```astro
---
import Home from '../components/Home.astro';
---

<Home lang="en" />
```

`src/pages/bs/index.astro`:

```astro
---
import Home from '../../components/Home.astro';
---

<Home lang="bs" />
```

- [x] **Step 7: Build and run all tests**

Run: `npm run build && npm run test:dist && npm test && npm run check`
Expected: dist `Tests 10 passed (10)`; unit `Tests 15 passed (15)`; check `0 errors`.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add design tokens, base layout and localized pages

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: UI primitives, header, language switch, clock and mobile menu

**Files:**

- Create: `src/components/ui/Button.astro`, `src/components/ui/SectionHeading.astro`, `src/components/ui/RingDot.astro`, `src/components/Brand.astro`, `src/components/Clock.astro`, `src/components/LangSwitch.astro`, `src/components/Header.astro`, `src/components/MobileMenu.astro`, `src/scripts/clock.ts`, `src/scripts/lang-switch.ts`, `src/scripts/menu.ts`
- Modify: `src/components/Home.astro`
- Test: `tests/dist/header.test.ts`

**Interfaces:**

- Consumes: `formatTime`, `formatOffset`, `msUntilNextMinute`, `ClockLocale` (Task 1); `getDictionary`, `localePath`, `locales`, `languageNames`, `RingKey`, `Locale` (Task 2); `site` (Task 2).
- Produces:
  - `<Button href? as? type? variant? size? icon? class? …rest>` — variants `dark | light | ghost | text`, sizes `s | m | l`, icons `arrow | external | none`; renders `<a>`, `<button>` or `<span>` with class `btn`; label inside `.btn-label`; arrow `svg.arr`.
  - `<SectionHeading id title count intro />` — renders `.sh`, `h2.sh-title#id`, `p.sh-intro`.
  - `<RingDot ring />` — `span.ring-dot.ring-dot--{ring}`.
  - `<Brand lang size? tone? link? />` — `.brand` with `.brand-name` and `.brand-dot`.
  - `<Clock lang withOffset? class? />` — `<time data-clock data-locale data-with-offset?>`.
  - `<LangSwitch lang class? />`; `<Header lang />` (contains `<MobileMenu>` = `dialog#site-menu[data-menu]`, opener `[data-menu-open]`).

- [x] **Step 1: Write the failing header test**

`tests/dist/header.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path header', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const header = doc.querySelector('header.site-header');

  it('shows the studio name', () => {
    expect(text(header?.querySelector('.brand-name'))).toBe(site.name);
  });

  it('links to every section', () => {
    const links = Array.from(header?.querySelectorAll('nav.nav a') ?? []);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#work', '#services', '#process', '#studio']);
    expect(links.map(text)).toEqual([t.nav.work, t.nav.services, t.nav.process, t.nav.studio]);
  });

  it('marks the current language', () => {
    const current = header?.querySelector('.lang a[aria-current="page"]');
    expect(current?.getAttribute('hreflang')).toBe(lang);
  });

  it('wires the menu button to the menu dialog', () => {
    const button = header?.querySelector('[data-menu-open]');
    expect(button?.getAttribute('aria-controls')).toBe('site-menu');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(doc.querySelector('dialog#site-menu[data-menu]')).not.toBeNull();
  });

  it('renders a live Sarajevo clock', () => {
    expect(header?.querySelector('time[data-clock]')?.getAttribute('data-locale')).toBe(lang);
  });

  it('has a start-a-project call to action', () => {
    const cta = header?.querySelector('a.btn[href="#contact"]');
    expect(text(cta)).toBe(t.cta.start);
  });
});
```

- [x] **Step 2: Build and see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — header assertions (`header` is null).

- [x] **Step 3: Create `src/components/ui/Button.astro`**

```astro
---
import type { HTMLAttributes } from 'astro/types';

interface Props extends Omit<HTMLAttributes<'a'>, 'type'> {
  as?: 'a' | 'button' | 'span';
  type?: 'button' | 'submit';
  variant?: 'dark' | 'light' | 'ghost' | 'text';
  size?: 's' | 'm' | 'l';
  icon?: 'arrow' | 'external' | 'none';
}

const {
  as,
  href,
  type = 'button',
  variant = 'dark',
  size = 'm',
  icon = 'arrow',
  class: className,
  ...rest
} = Astro.props;

const Tag = as ?? (href ? 'a' : 'button');
const iconSize = size === 'l' ? 15 : 14;
const path = icon === 'external' ? 'M3 11L11 3M5 3H11V9' : 'M2 7H12M8 3L12 7L8 11';
---

<Tag
  class:list={['btn', `btn--${variant}`, variant !== 'text' && `btn--${size}`, className]}
  href={Tag === 'a' ? href : undefined}
  type={Tag === 'button' ? type : undefined}
  {...rest}
>
  <span class="btn-label"><slot /></span>
  {
    icon !== 'none' && (
      <svg class={`arr arr--${icon}`} width={iconSize} height={iconSize} viewBox="0 0 14 14" aria-hidden="true">
        <path d={path} />
      </svg>
    )
  }
</Tag>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    border-radius: 999px;
    font-weight: 500;
    line-height: 1;
    white-space: nowrap;
    text-decoration: none;
    cursor: pointer;
    transition:
      background-color 0.3s var(--ease-std),
      color 0.3s var(--ease-std),
      border-color 0.3s var(--ease-std);
  }
  .btn--s {
    height: 44px;
    padding: 0 20px 0 22px;
    font-size: 14px;
  }
  .btn--m {
    height: 48px;
    padding: 0 20px 0 22px;
    font-size: 15px;
  }
  .btn--l {
    height: 56px;
    padding: 0 26px 0 28px;
    font-size: 16px;
    gap: 14px;
  }
  .btn--dark {
    background: var(--ink);
    color: var(--paper);
  }
  .btn--dark:hover {
    background: #000;
  }
  .btn--light {
    background: var(--paper);
    color: var(--ink);
  }
  .btn--light:hover {
    background: #fff;
  }
  .btn--ghost {
    border: 1px solid var(--night-line);
    color: var(--paper);
  }
  .btn--ghost:hover {
    border-color: var(--night-muted);
  }
  .btn--text {
    gap: 10px;
    font-size: 15px;
    color: var(--ink);
  }
  .btn:disabled {
    cursor: progress;
    opacity: 0.7;
  }
  .arr {
    flex-shrink: 0;
    transition: transform 0.35s var(--ease-std);
  }
  .arr path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .btn:hover .arr--arrow {
    transform: translateX(4px);
  }
  .btn:hover .arr--external {
    transform: translate(2px, -2px);
  }
</style>
```

- [x] **Step 4: Create `src/components/ui/SectionHeading.astro` and `src/components/ui/RingDot.astro`**

`src/components/ui/SectionHeading.astro`:

```astro
---
interface Props {
  id: string;
  title: string;
  count: string;
  intro: string;
}

const { id, title, count, intro } = Astro.props;
---

<div class="sh">
  <h2 id={id} class="sh-title">{title}<span class="sh-count" aria-hidden="true">({count})</span></h2>
  <p class="sh-intro">{intro}</p>
</div>

<style>
  .sh {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
    row-gap: 20px;
    align-items: end;
    padding-bottom: 36px;
    border-bottom: 1px solid var(--ink);
  }
  .sh-title {
    grid-column: 1 / -1;
    font-size: var(--fs-h2);
    line-height: 0.95;
    letter-spacing: -0.05em;
    font-weight: 300;
  }
  .sh-count {
    display: inline-block;
    vertical-align: top;
    margin: 0.12em 0 0 0.3em;
    font-size: 15px;
    line-height: 1;
    letter-spacing: 0;
    font-weight: 400;
    color: var(--label);
    font-variant-numeric: tabular-nums;
  }
  .sh-intro {
    grid-column: 1 / -1;
    max-width: 34rem;
    font-size: var(--fs-body-m);
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  @media (min-width: 64rem) {
    .sh-title {
      grid-column: span 8;
    }
    .sh-intro {
      grid-column: 9 / span 4;
      margin-bottom: 4px;
    }
  }
</style>
```

`src/components/ui/RingDot.astro`:

```astro
---
import type { RingKey } from '../../i18n';

interface Props {
  ring: RingKey;
}

const { ring } = Astro.props;
---

<span class={`ring-dot ring-dot--${ring}`} aria-hidden="true"></span>

<style>
  .ring-dot {
    display: inline-block;
    width: 0.34em;
    height: 0.34em;
    margin: 0 0.2em 0 0.04em;
    border-radius: 50%;
    vertical-align: 0.12em;
  }
  .ring-dot--design {
    margin-left: 0;
    background: var(--porcelain);
    box-shadow: inset 0 0 0 1px #b9b5ad;
  }
  .ring-dot--engineering {
    background: var(--graphite);
  }
  .ring-dot--automation {
    background: var(--accent);
  }
</style>
```

- [x] **Step 5: Create `src/components/Brand.astro`**

```astro
---
import type { HTMLAttributes } from 'astro/types';
import { site } from '../config/site';
import { getDictionary, localePath, type Locale } from '../i18n';

interface Props extends HTMLAttributes<'a'> {
  lang: Locale;
  size?: 's' | 'm';
  tone?: 'ink' | 'paper';
  link?: boolean;
}

const { lang, size = 'm', tone = 'ink', link = true, class: className, ...rest } = Astro.props;
const t = getDictionary(lang);
const Tag = link ? 'a' : 'span';
---

<Tag
  class:list={['brand', `brand--${size}`, `brand--${tone}`, className]}
  href={link ? localePath(lang) : undefined}
  aria-label={link ? `${site.name} — ${t.a11y.home}` : undefined}
  {...rest}
>
  <span class="brand-name">{site.name}</span><span class="brand-dot" aria-hidden="true"></span>
</Tag>

<style>
  .brand {
    display: inline-flex;
    align-items: center;
    color: var(--ink);
    text-decoration: none;
  }
  .brand--paper {
    color: var(--paper);
  }
  .brand-name {
    font-size: 19px;
    font-weight: 500;
    line-height: 1;
    letter-spacing: -0.02em;
  }
  .brand--s .brand-name {
    font-size: 17px;
  }
  .brand-dot {
    width: 7px;
    height: 7px;
    margin: 0 0 1px 3px;
    align-self: flex-end;
    border-radius: 50%;
    background: var(--accent);
  }
</style>
```

- [x] **Step 6: Create the clock (`src/scripts/clock.ts`, `src/components/Clock.astro`)**

`src/scripts/clock.ts`:

```ts
import { formatOffset, formatTime, msUntilNextMinute, type ClockLocale } from '../lib/time';

export function initClocks(): void {
  const clocks = Array.from(document.querySelectorAll<HTMLTimeElement>('time[data-clock]'));
  if (clocks.length === 0) return;

  const tick = (): void => {
    const now = new Date();
    for (const el of clocks) {
      const locale: ClockLocale = el.dataset.locale === 'bs' ? 'bs' : 'en';
      const time = formatTime(now, locale);
      el.textContent = el.dataset.withOffset ? `${time} ${formatOffset(now)}` : time;
      el.dateTime = now.toISOString();
    }
    window.setTimeout(tick, msUntilNextMinute(now) + 50);
  };

  tick();
}
```

`src/components/Clock.astro`:

```astro
---
import type { HTMLAttributes } from 'astro/types';
import type { Locale } from '../i18n';

interface Props extends HTMLAttributes<'time'> {
  lang: Locale;
  withOffset?: boolean;
}

const { lang, withOffset = false, class: className, ...rest } = Astro.props;
---

<time class:list={['clock', className]} data-clock data-locale={lang} data-with-offset={withOffset ? 'true' : undefined} {...rest}>--:--</time>

<script>
  import { initClocks } from '../scripts/clock';
  initClocks();
</script>

<style>
  .clock {
    font-variant-numeric: tabular-nums;
  }
</style>
```

- [x] **Step 7: Create the language switch (`src/scripts/lang-switch.ts`, `src/components/LangSwitch.astro`)**

`src/scripts/lang-switch.ts`:

```ts
/** Id of the last section whose top edge has passed 35% of the viewport height. */
function currentSectionId(): string | null {
  const probe = window.innerHeight * 0.35;
  let current: string | null = null;
  for (const section of document.querySelectorAll<HTMLElement>('main > section[id]')) {
    if (section.getBoundingClientRect().top <= probe) current = section.id;
  }
  return current;
}

export function initLangSwitch(): void {
  for (const link of document.querySelectorAll<HTMLAnchorElement>('a[data-lang-link]')) {
    link.addEventListener('click', () => {
      const id = currentSectionId();
      link.hash = id && id !== 'top' ? `#${id}` : '';
    });
  }
}
```

`src/components/LangSwitch.astro`:

```astro
---
import type { HTMLAttributes } from 'astro/types';
import { getDictionary, languageNames, localePath, locales, type Locale } from '../i18n';

interface Props extends HTMLAttributes<'nav'> {
  lang: Locale;
}

const { lang, class: className, ...rest } = Astro.props;
const t = getDictionary(lang);
---

<nav class:list={['lang', className]} aria-label={t.a11y.language} {...rest}>
  {
    locales.map((l, i) => (
      <>
        {i > 0 && (
          <span class="lang-sep" aria-hidden="true">
            /
          </span>
        )}
        <a
          href={localePath(l)}
          hreflang={l}
          lang={l}
          aria-label={languageNames[l]}
          aria-current={l === lang ? 'page' : undefined}
          data-lang-link
        >
          {l.toUpperCase()}
        </a>
      </>
    ))
  }
</nav>

<script>
  import { initLangSwitch } from '../scripts/lang-switch';
  initLangSwitch();
</script>

<style>
  .lang {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    letter-spacing: 0.04em;
  }
  .lang a {
    color: var(--label);
    text-decoration: none;
    transition: color 0.25s var(--ease-std);
  }
  .lang a:hover,
  .lang a[aria-current='page'] {
    color: var(--ink);
  }
  .lang a[aria-current='page'] {
    font-weight: 500;
  }
  .lang-sep {
    color: var(--line);
  }
</style>
```

- [x] **Step 8: Create the mobile menu (`src/scripts/menu.ts`, `src/components/MobileMenu.astro`)**

`src/scripts/menu.ts`:

```ts
export function initMenu(): void {
  const dialog = document.querySelector<HTMLDialogElement>('dialog[data-menu]');
  const opener = document.querySelector<HTMLButtonElement>('[data-menu-open]');
  if (!dialog || !opener) return;

  const close = (): void => dialog.close();

  opener.addEventListener('click', () => {
    dialog.showModal();
    opener.setAttribute('aria-expanded', 'true');
  });
  dialog.addEventListener('close', () => opener.setAttribute('aria-expanded', 'false'));
  dialog.querySelector('[data-menu-close]')?.addEventListener('click', close);
  for (const link of dialog.querySelectorAll('[data-menu-link]')) link.addEventListener('click', close);

  const desktop = window.matchMedia('(min-width: 64rem)');
  desktop.addEventListener('change', (event) => {
    if (event.matches && dialog.open) close();
  });
}
```

`src/components/MobileMenu.astro`:

```astro
---
import { site } from '../config/site';
import { getDictionary, type Locale } from '../i18n';
import Brand from './Brand.astro';
import Clock from './Clock.astro';
import LangSwitch from './LangSwitch.astro';
import Button from './ui/Button.astro';

interface Props {
  lang: Locale;
  links: ReadonlyArray<{ href: string; label: string }>;
}

const { lang, links } = Astro.props;
const t = getDictionary(lang);
---

<dialog id="site-menu" class="menu" aria-label={t.a11y.menu} data-menu>
  <div class="container menu-bar">
    <Brand lang={lang} />
    <button class="menu-close" type="button" data-menu-close>{t.a11y.close}</button>
  </div>
  <nav class="container menu-nav" aria-label={t.a11y.mainNav}>
    {
      links.map((l) => (
        <a href={l.href} data-menu-link>
          {l.label}
        </a>
      ))
    }
  </nav>
  <div class="container menu-foot">
    <Button href="#contact" size="l" data-menu-link>{t.cta.start}</Button>
    <a class="menu-mail" href={`mailto:${site.email}`}>{site.email}</a>
    <div class="menu-meta">
      <LangSwitch lang={lang} />
      <span>{t.clockCity} <Clock lang={lang} /></span>
    </div>
  </div>
</dialog>

<script>
  import { initMenu } from '../scripts/menu';
  initMenu();
</script>

<style>
  .menu {
    position: fixed;
    inset: 0;
    width: 100%;
    max-width: 100%;
    height: 100dvh;
    max-height: 100dvh;
    margin: 0;
    padding: 0;
    border: 0;
    background: var(--paper);
    color: var(--ink);
  }
  .menu[open] {
    display: flex;
    flex-direction: column;
  }
  .menu::backdrop {
    background: var(--paper);
  }
  .menu-bar {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    height: var(--header-h);
    border-bottom: 1px solid var(--line);
  }
  .menu-close {
    height: 40px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-size: 14px;
    font-weight: 500;
  }
  .menu-nav {
    display: flex;
    flex-direction: column;
    padding-block: 28px;
  }
  .menu-nav a {
    padding-block: 6px;
    font-size: clamp(2.5rem, 11vw, 3.75rem);
    font-weight: 300;
    line-height: 1.1;
    letter-spacing: -0.045em;
    text-decoration: none;
  }
  .menu-foot {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    margin-top: auto;
    padding-bottom: 28px;
  }
  .menu-mail {
    font-size: 15px;
    color: var(--muted);
    text-decoration: underline;
    text-decoration-color: var(--line);
    text-underline-offset: 4px;
  }
  .menu-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    font-size: 13px;
    color: var(--muted);
  }
  :global(html:has(dialog[data-menu][open])) {
    overflow: hidden;
  }
</style>
```

- [x] **Step 9: Create `src/components/Header.astro`**

```astro
---
import { getDictionary, type Locale } from '../i18n';
import Brand from './Brand.astro';
import Clock from './Clock.astro';
import LangSwitch from './LangSwitch.astro';
import MobileMenu from './MobileMenu.astro';
import Button from './ui/Button.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);
const links = [
  { href: '#work', label: t.nav.work },
  { href: '#services', label: t.nav.services },
  { href: '#process', label: t.nav.process },
  { href: '#studio', label: t.nav.studio },
];
---

<header class="site-header" data-header>
  <div class="container header-inner">
    <div class="header-brand"><Brand lang={lang} /></div>
    <nav class="nav" aria-label={t.a11y.mainNav}>
      {links.map((l) => <a href={l.href}>{l.label}</a>)}
    </nav>
    <div class="header-end">
      <span class="header-clock">{t.clockCity} <Clock lang={lang} /></span>
      <div class="header-lang"><LangSwitch lang={lang} /></div>
      <div class="header-cta"><Button href="#contact" size="s">{t.cta.start}</Button></div>
      <button class="menu-toggle" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="site-menu" data-menu-open>{t.a11y.menu}</button>
    </div>
  </div>
  <MobileMenu lang={lang} links={links} />
</header>

<style>
  .site-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: color-mix(in srgb, var(--paper) 86%, transparent);
    -webkit-backdrop-filter: saturate(1.3) blur(14px);
    backdrop-filter: saturate(1.3) blur(14px);
  }
  .header-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-h);
  }
  .nav {
    display: none;
    gap: 36px;
    font-size: 15px;
  }
  .nav a {
    text-decoration: none;
    background-image: linear-gradient(currentColor, currentColor);
    background-position: 0 100%;
    background-repeat: no-repeat;
    background-size: 0 1px;
    transition: background-size 0.35s var(--ease-std);
  }
  .nav a:hover {
    background-size: 100% 1px;
  }
  .header-end {
    display: flex;
    align-items: center;
    gap: 28px;
  }
  .header-clock,
  .header-lang,
  .header-cta {
    display: none;
  }
  .header-clock {
    font-size: 13px;
    color: var(--muted);
  }
  .menu-toggle {
    height: 40px;
    padding: 0 16px;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-size: 14px;
    font-weight: 500;
  }
  @media (min-width: 64rem) {
    .header-inner {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
    }
    .header-brand {
      grid-column: span 3;
    }
    .nav {
      display: flex;
      grid-column: 5 / span 4;
    }
    .header-end {
      grid-column: 9 / span 4;
      justify-self: end;
    }
    .header-clock,
    .header-lang,
    .header-cta {
      display: block;
    }
    .menu-toggle {
      display: none;
    }
  }
</style>
```

- [x] **Step 10: Render the header from `Home.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';
import Header from './Header.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <Header lang={lang} />
  <main id="main"></main>
</Base>
```

- [x] **Step 11: Build and run all tests**

Run: `npm run build && npm run test:dist && npm test && npm run check`
Expected: dist `Tests 22 passed (22)`; unit 15 passed; check `0 errors`.

- [x] **Step 12: Visual check (desktop + mobile)**

Start the preview server in the background: `npm run preview -- --host 127.0.0.1 --port 4321`.
With the Playwright MCP tools: resize to 1440×900, open `http://127.0.0.1:4321/`, screenshot to `.playwright-mcp/t4-header-1440.png`; resize to 390×844, screenshot `.playwright-mcp/t4-header-390.png`; click the "Menu" button, screenshot `.playwright-mcp/t4-menu-390.png`; press Escape.
Expected: desktop header matches `reference/Minimal.dc.html` (logo left, nav centered at columns 5–8, clock + EN/BS + CTA right); mobile shows logo + "Menu"; the menu fills the screen with large links; Escape closes it; `browser_console_messages` at level `error` is empty.

- [x] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add header, language switch, clock and mobile menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Hero section

**Files:**

- Create: `src/components/Hero.astro`, `src/assets/posters/hero.png` (copy of `reference/assets/abeb259b406b12574d07a6266a687771.png`)
- Modify: `src/components/Home.astro`
- Test: `tests/dist/hero.test.ts`

**Interfaces:**

- Consumes: `Button` (Task 4), `getDictionary`, `Locale`, `site`.
- Produces: `section#top.hero` with `h1#hero-title`, `figure[data-stage="hero"][role="img"]` wrapping `<picture class="stage-picture">` (Plan 3 attaches the WebGL rings to this stage), `.hero-caption`.

- [x] **Step 1: Write the failing hero test**

`tests/dist/hero.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path hero', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const hero = doc.querySelector('section#top');

  it('holds the only h1, with the headline', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(text(hero?.querySelector('h1'))).toBe(t.hero.title);
  });

  it('labels the rings stage for screen readers', () => {
    const stage = hero?.querySelector('[data-stage="hero"]');
    expect(stage?.getAttribute('role')).toBe('img');
    expect(stage?.getAttribute('aria-label')).toBe(t.hero.ringsAlt);
  });

  it('serves the poster as AVIF and WebP, loaded eagerly with high priority', () => {
    const types = Array.from(hero?.querySelectorAll('picture source') ?? []).map((s) => s.getAttribute('type'));
    expect(types).toEqual(['image/avif', 'image/webp']);
    const img = hero?.querySelector('picture img');
    expect(img?.getAttribute('fetchpriority')).toBe('high');
    expect(img?.getAttribute('loading')).toBe('eager');
  });

  it('shows the meta row with the booking month', () => {
    expect(text(hero?.querySelector('.hero-meta'))).toContain(`${t.hero.booking} ${site.bookingFrom[lang]}`);
  });

  it('captions the figure', () => {
    expect(text(hero?.querySelector('.hero-caption'))).toBe(`${t.hero.fig} — ${t.hero.caption}`);
  });

  it('sends the CTA to contact and offers the e-mail', () => {
    expect(hero?.querySelector('a.btn')?.getAttribute('href')).toBe('#contact');
    expect(hero?.querySelector('a.hero-mail')?.getAttribute('href')).toBe(`mailto:${site.email}`);
  });
});
```

- [x] **Step 2: Build and see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — `expected [] to have a length of 1` (no h1).

- [x] **Step 3: Copy the poster**

```bash
mkdir -p src/assets/posters
cp reference/assets/abeb259b406b12574d07a6266a687771.png src/assets/posters/hero.png
```

- [x] **Step 4: Create `src/components/Hero.astro`**

```astro
---
import { Picture } from 'astro:assets';
import heroPoster from '../assets/posters/hero.png';
import { site } from '../config/site';
import { getDictionary, type Locale } from '../i18n';
import Button from './ui/Button.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);
---

<section id="top" class="hero container" aria-labelledby="hero-title">
  <div class="hero-meta">
    <span class="label">{t.hero.studio}</span>
    <span class="label hero-location">{t.hero.location}</span>
    <span class="label hero-booking"><span class="hero-dot" aria-hidden="true"></span>{t.hero.booking} {site.bookingFrom[lang]}</span>
  </div>
  <div class="hero-body">
    <h1 id="hero-title" class="hero-title">{t.hero.title}</h1>
    <figure class="hero-stage" data-stage="hero" role="img" aria-label={t.hero.ringsAlt}>
      <Picture
        src={heroPoster}
        alt=""
        formats={['avif', 'webp']}
        widths={[520, 720, 1040, 1360]}
        sizes="(min-width: 64rem) min(50vw, 720px), min(100vw, 520px)"
        loading="eager"
        fetchpriority="high"
        pictureAttributes={{ class: 'stage-picture' }}
      />
    </figure>
    <div class="hero-actions">
      <p class="hero-lead">{t.hero.lead}</p>
      <div class="hero-ctas">
        <Button href="#contact" size="l">{t.cta.start}</Button>
        <a class="hero-mail" href={`mailto:${site.email}`}>{site.email}</a>
      </div>
    </div>
    <p class="hero-caption fig-caption"><span class="fig-num">{t.hero.fig}</span> — {t.hero.caption}</p>
  </div>
</section>

<style>
  .hero {
    padding-bottom: 32px;
  }
  .hero-meta {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 8px 24px;
    padding-block: 18px;
    border-top: 1px solid var(--line);
  }
  .hero-location {
    display: none;
  }
  .hero-booking {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    color: var(--muted);
  }
  .hero-dot {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--accent);
  }
  .hero-body {
    display: flex;
    flex-direction: column;
    gap: 32px;
    padding-top: 16px;
  }
  .hero-title {
    font-size: var(--fs-hero);
    font-weight: 300;
    line-height: 0.97;
    letter-spacing: -0.047em;
    text-wrap: balance;
  }
  .hero-stage {
    position: relative;
    width: min(100%, 520px);
    aspect-ratio: 1;
    align-self: center;
    -webkit-mask-image: linear-gradient(90deg, transparent 0%, #000 6%, #000 94%, transparent 100%);
    mask-image: linear-gradient(90deg, transparent 0%, #000 6%, #000 94%, transparent 100%);
  }
  .hero-stage :global(.stage-picture),
  .hero-stage :global(img) {
    display: block;
    width: 100%;
    height: 100%;
  }
  .hero-actions {
    display: flex;
    flex-direction: column;
    gap: 28px;
  }
  .hero-lead {
    max-width: 25rem;
    font-size: var(--fs-body-l);
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .hero-ctas {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }
  .hero-mail {
    font-size: 14px;
    color: var(--muted);
    text-decoration: underline;
    text-decoration-color: var(--line);
    text-underline-offset: 4px;
    transition: color 0.25s var(--ease-std);
  }
  .hero-mail:hover {
    color: var(--ink);
  }
  .hero-caption {
    max-width: 22rem;
  }
  @media (min-width: 48rem) {
    .hero-actions {
      flex-direction: row;
      align-items: flex-end;
      gap: 48px;
    }
    .hero-ctas {
      flex-shrink: 0;
    }
  }
  @media (min-width: 64rem) {
    .hero-meta {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
      align-items: center;
      min-height: 64px;
      padding-block: 0;
    }
    .hero-meta > :first-child {
      grid-column: span 4;
    }
    .hero-location {
      display: block;
      grid-column: 5 / span 4;
    }
    .hero-booking {
      grid-column: 9 / span 4;
      justify-self: end;
    }
    .hero-body {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      grid-template-rows: 1fr auto auto;
      gap: 0 var(--gutter);
      padding-top: 0;
    }
    .hero-stage {
      grid-column: 6 / span 7;
      grid-row: 1 / -1;
      justify-self: end;
      align-self: start;
      width: min(100%, 720px);
      margin-right: calc(-1 * var(--gutter));
    }
    .hero-title {
      position: relative;
      z-index: 1;
      grid-column: 1 / span 7;
      grid-row: 2;
    }
    .hero-actions {
      position: relative;
      z-index: 1;
      grid-column: 1 / span 7;
      grid-row: 3;
      margin-top: 48px;
      padding-bottom: 8px;
    }
    .hero-caption {
      position: relative;
      z-index: 1;
      grid-column: 10 / span 3;
      grid-row: 3;
      align-self: end;
      margin-bottom: 12px;
    }
  }
</style>
```

- [x] **Step 5: Render the hero from `Home.astro`**

Replace `src/components/Home.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';
import Header from './Header.astro';
import Hero from './Hero.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <Header lang={lang} />
  <main id="main">
    <Hero lang={lang} />
  </main>
</Base>
```

- [x] **Step 6: Build and run tests**

Run: `npm run build && npm run test:dist && npm run check`
Expected: dist `Tests 34 passed (34)`; `0 errors`.

- [x] **Step 7: Visual check against the reference**

Preview at 1440×900 and 390×844; screenshot `.playwright-mcp/t5-hero-1440.png` and `t5-hero-390.png`. With `browser_evaluate` run:

```js
() => ({
  h1: getComputedStyle(document.querySelector('h1')).fontSize,
  stage: document.querySelector('[data-stage="hero"]').getBoundingClientRect().width,
})
```

Expected at 1440: `h1` = `92px`, `stage` = `720`. At 390: `h1` = `44px`, stage ≤ 350. Headline wraps into four lines at 1440 like `reference/`; rings sit right, caption bottom-right.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add hero section with responsive poster

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Approach section and flattened-rings diagram

**Files:**

- Create: `src/components/Approach.astro`, `src/components/art/ApproachDiagram.astro`
- Modify: `src/components/Home.astro`
- Test: `tests/dist/approach.test.ts`

**Interfaces:**

- Consumes: `RingDot` (Task 4), `getDictionary`, `RingKey`, `Locale`.
- Produces: `section#approach` with `[data-stage="approach"][role="img"]` (Plan 3 replaces its content with the WebGL stage), `.approach-lead` containing `span.hl[data-ring]` ×3 and `span.mark[data-mark]` ×2, SVG `.diagram` with `g.ring[data-ring]` groups and `.diagram-label text`.

- [x] **Step 1: Write the failing test**

`tests/dist/approach.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getDictionary } from '../../src/i18n';
import { loadPage, norm, pages, text } from './helpers';

describe.each(pages)('$path approach', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const section = doc.querySelector('section#approach');
  const lead = section?.querySelector('.approach-lead');

  it('reads the whole lead sentence', () => {
    const expected = t.approach.lead.map((seg) => (typeof seg === 'string' ? seg : seg.text)).join('');
    expect(text(lead)).toBe(norm(expected));
  });

  it('marks the three rings and the two story phrases', () => {
    expect(Array.from(lead?.querySelectorAll('[data-ring]') ?? []).map((e) => e.getAttribute('data-ring'))).toEqual([
      'design',
      'engineering',
      'automation',
    ]);
    expect(Array.from(lead?.querySelectorAll('[data-mark]') ?? []).map((e) => e.getAttribute('data-mark'))).toEqual([
      'take',
      'fall',
    ]);
  });

  it('labels the diagram in the page language', () => {
    const labels = Array.from(section?.querySelectorAll('.diagram-label text') ?? []).map(text);
    const r = t.approach.rings;
    expect(labels).toEqual([r.design, r.engineering, r.automation].map((s) => s.toLocaleUpperCase(lang)));
  });

  it('gives the stage an accessible description and caption', () => {
    expect(section?.querySelector('[data-stage="approach"]')?.getAttribute('aria-label')).toBe(t.approach.diagramAlt);
    expect(text(section?.querySelector('figcaption'))).toBe(`${t.approach.fig} — ${t.approach.caption}`);
  });

  it('uses the section label as its heading', () => {
    expect(text(section?.querySelector('h2'))).toBe(t.approach.label);
  });
});
```

- [x] **Step 2: Build and see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — approach assertions (`section` is null).

- [x] **Step 3: Create `src/components/art/ApproachDiagram.astro`**

```astro
---
import { getDictionary, type Locale, type RingKey } from '../../i18n';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);

interface Stroke {
  r: number;
  opacity: number;
  width: number;
}
interface Ring {
  key: RingKey;
  cx: number;
  cy: number;
  shade: Stroke;
  shine: Stroke;
}

const rings: Ring[] = [
  { key: 'design', cx: 0, cy: -73.9, shade: { r: 125.2, opacity: 0.07, width: 5.72 }, shine: { r: 114.28, opacity: 0.9, width: 3.12 } },
  { key: 'engineering', cx: -64, cy: 36.95, shade: { r: 126.24, opacity: 0.18, width: 3.12 }, shine: { r: 114.8, opacity: 0.15, width: 3.64 } },
  { key: 'automation', cx: 64, cy: 36.95, shade: { r: 126.24, opacity: 0.18, width: 3.12 }, shine: { r: 114.8, opacity: 0.2, width: 3.64 } },
];

// Each ring passes over one neighbour at two crossings; these patches redraw it on top there.
const patches = [
  { ring: 0, cx: -119.91, cy: -69.23 },
  { ring: 0, cx: 55.91, cy: 32.28 },
  { ring: 1, cx: 0, cy: 138.46 },
  { ring: 1, cx: 0, cy: -64.56 },
  { ring: 2, cx: 119.91, cy: -69.23 },
  { ring: 2, cx: -55.91, cy: 32.28 },
];

const labels: Array<{ key: RingKey; x: number; y1: number; y2: number; ty: number }> = [
  { key: 'design', x: 0, y1: -211.9, y2: -236.9, ty: -245.18 },
  { key: 'engineering', x: -64, y1: 174.95, y2: 199.95, ty: 214.21 },
  { key: 'automation', x: 64, y1: 174.95, y2: 199.95, ty: 214.21 },
];
---

<svg class="diagram" viewBox="-212 -258.98 424 481.01" aria-hidden="true">
  <defs>
    {
      patches.map((p, i) => (
        <mask id={`approach-x${i}`}>
          <circle cx={p.cx} cy={p.cy} r="36" fill="#fff" />
        </mask>
      ))
    }
  </defs>
  {
    rings.map((r) => (
      <g class={`ring ring--${r.key}`} data-ring={r.key}>
        <circle class="ring-edge" cx={r.cx} cy={r.cy} r="120" />
        <circle class="ring-body" cx={r.cx} cy={r.cy} r="120" />
        <circle cx={r.cx} cy={r.cy} r={r.shade.r} fill="none" stroke="#000" stroke-opacity={r.shade.opacity} stroke-width={r.shade.width} />
        <circle cx={r.cx} cy={r.cy} r={r.shine.r} fill="none" stroke="#fff" stroke-opacity={r.shine.opacity} stroke-width={r.shine.width} />
      </g>
    ))
  }
  {
    patches.map((p, i) => {
      const r = rings[p.ring]!;
      return (
        <g class={`ring ring--${r.key}`} data-ring={r.key} mask={`url(#approach-x${i})`}>
          <circle class="ring-gap" cx={r.cx} cy={r.cy} r="120" />
          <circle class="ring-edge" cx={r.cx} cy={r.cy} r="120" />
          <circle class="ring-body" cx={r.cx} cy={r.cy} r="120" />
          <circle cx={r.cx} cy={r.cy} r={r.shade.r} fill="none" stroke="#000" stroke-opacity={r.shade.opacity} stroke-width={r.shade.width} />
          <circle cx={r.cx} cy={r.cy} r={r.shine.r} fill="none" stroke="#fff" stroke-opacity={r.shine.opacity} stroke-width={r.shine.width} />
        </g>
      );
    })
  }
  {
    labels.map((l) => (
      <g class="diagram-label">
        <path d={`M${l.x} ${l.y1}V${l.y2}`} />
        <circle cx={l.x} cy={l.y1} r="2.2" />
        <text x={l.x} y={l.ty}>{t.approach.rings[l.key].toLocaleUpperCase(lang)}</text>
      </g>
    ))
  }
</svg>

<style>
  .diagram {
    width: 100%;
    height: auto;
    overflow: visible;
  }
  .ring-edge,
  .ring-body,
  .ring-gap {
    fill: none;
  }
  .ring-gap {
    stroke: var(--paper);
    stroke-width: 40;
  }
  .ring-edge {
    stroke: var(--ink);
    stroke-width: 26;
  }
  .ring-body {
    stroke-width: 23.5;
  }
  .ring--design .ring-body {
    stroke: var(--porcelain);
  }
  .ring--engineering .ring-body {
    stroke: var(--graphite);
  }
  .ring--automation .ring-body {
    stroke: var(--accent);
  }
  .diagram-label path {
    fill: none;
    stroke: var(--label);
    stroke-width: 1;
  }
  .diagram-label circle {
    fill: var(--ink);
  }
  .diagram-label text {
    font-family: var(--font-sans);
    font-size: 9.2px;
    font-weight: 500;
    letter-spacing: 0.14em;
    fill: var(--label);
    text-anchor: middle;
  }
</style>
```

- [x] **Step 4: Create `src/components/Approach.astro`**

```astro
---
import { getDictionary, type Locale } from '../i18n';
import ApproachDiagram from './art/ApproachDiagram.astro';
import RingDot from './ui/RingDot.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);
---

<section id="approach" class="approach container" aria-labelledby="approach-label">
  <div class="approach-grid">
    <figure class="approach-figure">
      <div class="approach-stage" data-stage="approach" role="img" aria-label={t.approach.diagramAlt}>
        <ApproachDiagram lang={lang} />
      </div>
      <figcaption class="fig-caption"><span class="fig-num">{t.approach.fig}</span> — {t.approach.caption}</figcaption>
    </figure>
    <div class="approach-text">
      <h2 id="approach-label" class="label">{t.approach.label}</h2>
      <p class="approach-lead">
        {
          t.approach.lead.map((seg) =>
            typeof seg === 'string' ? seg
            : 'ring' in seg ? <span class="hl" data-ring={seg.ring}><RingDot ring={seg.ring} />{seg.text}</span>
            : <span class="mark" data-mark={seg.mark}>{seg.text}</span>,
          )
        }
      </p>
      <p class="approach-body">{t.approach.body}</p>
    </div>
  </div>
</section>

<style>
  .approach {
    padding-block: var(--section-y);
  }
  .approach-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
    row-gap: 56px;
    align-items: center;
  }
  .approach-figure {
    display: flex;
    flex-direction: column;
    gap: 28px;
    grid-column: 1 / -1;
    justify-self: center;
    width: min(100%, 26rem);
  }
  .approach-figure .fig-caption {
    max-width: 24rem;
  }
  .approach-text {
    display: flex;
    flex-direction: column;
    gap: 32px;
    grid-column: 1 / -1;
  }
  .approach-lead {
    font-size: var(--fs-lead);
    font-weight: 300;
    line-height: 1.14;
    letter-spacing: -0.032em;
    text-wrap: pretty;
  }
  .hl {
    cursor: default;
  }
  .approach-body {
    max-width: 29.5rem;
    font-size: var(--fs-body-l);
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  @media (min-width: 64rem) {
    .approach-figure {
      grid-column: 1 / span 5;
      justify-self: stretch;
      width: auto;
      margin-left: -8px;
    }
    .approach-text {
      grid-column: 7 / span 6;
      gap: 40px;
    }
  }
</style>
```

- [x] **Step 5: Render the section from `Home.astro`**

Replace `src/components/Home.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';
import Approach from './Approach.astro';
import Header from './Header.astro';
import Hero from './Hero.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <Header lang={lang} />
  <main id="main">
    <Hero lang={lang} />
    <Approach lang={lang} />
  </main>
</Base>
```

- [x] **Step 6: Build and run tests**

Run: `npm run build && npm run test:dist && npm run check`
Expected: dist `Tests 44 passed (44)`; `0 errors`.

- [x] **Step 7: Visual check**

Screenshot the section at 1440 (`.playwright-mcp/t6-approach-1440.png`, element `section#approach`) and 390. Expected at 1440: diagram left (columns 1–5) with labels DESIGN / ENGINEERING / AUTOMATION, lead text 46 px on the right, each ring woven over one neighbour and under the other exactly like the reference.

- [x] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add approach section with flattened rings diagram

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Services accordion and illustrations

**Files:**

- Create: `src/components/Services.astro`, `src/components/art/ServiceWeb.astro`, `src/components/art/ServiceApps.astro`, `src/components/art/ServiceFlow.astro`
- Modify: `src/components/Home.astro`
- Test: `tests/dist/services.test.ts`

**Interfaces:**

- Consumes: `SectionHeading` (Task 4), `getDictionary`, `pad2`, `Locale`.
- Produces: `section#services` with three `details.svc[name="services"][data-service]` (first `open`); `summary.svc-summary` > `h3.svc-title`; `.svc-art` holding an `.art-frame` SVG. Plan 2 hooks: `.art-cta`, `.art-cursor` (web), `.app-row`, `.app-toast`, `.app-chart` (apps), `.flow`, `.node` (systems).

- [x] **Step 1: Write the failing test**

`tests/dist/services.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path services', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const rows = Array.from(doc.querySelectorAll('section#services details'));

  it('renders one exclusive accordion row per service', () => {
    expect(rows).toHaveLength(t.services.items.length);
    expect(rows.every((d) => d.getAttribute('name') === 'services')).toBe(true);
  });

  it('opens only the first row', () => {
    expect(rows.map((d) => d.hasAttribute('open'))).toEqual([true, false, false]);
  });

  it('uses the service titles as h3 inside each summary', () => {
    expect(rows.map((d) => text(d.querySelector('summary h3')))).toEqual(t.services.items.map((i) => i.title));
  });

  it('lists what each service includes', () => {
    expect(rows.map((d) => d.querySelectorAll('.svc-chips li').length)).toEqual(
      t.services.items.map((i) => i.includes.length),
    );
  });

  it('draws one illustration per service', () => {
    expect(rows.every((d) => d.querySelector('.svc-art svg') !== null)).toBe(true);
  });

  it('localizes the automation flow labels', () => {
    const labels = Array.from(rows[2]?.querySelectorAll('.node-label') ?? []).map(text);
    expect(labels).toEqual(Object.values(t.services.flow));
  });

  it('shows the section count', () => {
    expect(text(doc.querySelector('#services-title .sh-count'))).toBe('(03)');
  });
});
```

- [x] **Step 2: Build and see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — `expected [] to have a length of 3`.

- [x] **Step 3: Create `src/components/art/ServiceWeb.astro`**

```astro
---
import type { Locale } from '../../i18n';

interface Props {
  lang: Locale;
}

const cards = [84, 220, 356];
---

<div class="art-frame">
  <svg viewBox="0 0 560 350" aria-hidden="true">
    <rect x="56" y="40" width="448" height="340" rx="12" fill="#fbfaf8" stroke="#d9d5ce" />
    <path d="M56 74H504" stroke="#e6e3dd" />
    <rect x="206" y="50" width="148" height="14" rx="7" fill="#f0eee9" />
    <circle cx="76" cy="57" r="3.2" fill="#e6e3dd" />
    <circle cx="90" cy="57" r="3.2" fill="#e6e3dd" />
    <circle cx="104" cy="57" r="3.2" fill="#e6e3dd" />
    <rect x="84" y="96" width="38" height="8" rx="2" fill="#121211" />
    <rect x="360" y="98" width="26" height="4" rx="2" fill="#cfcbc4" />
    <rect x="398" y="98" width="26" height="4" rx="2" fill="#cfcbc4" />
    <rect x="436" y="98" width="26" height="4" rx="2" fill="#cfcbc4" />
    <rect x="84" y="132" width="188" height="14" rx="3" fill="#121211" />
    <rect x="84" y="154" width="146" height="14" rx="3" fill="#121211" />
    <rect x="84" y="184" width="170" height="5" rx="2.5" fill="#cfcbc4" />
    <rect x="84" y="195" width="132" height="5" rx="2.5" fill="#cfcbc4" />
    <rect class="acc art-cta" x="84" y="214" width="70" height="22" rx="11" />
    <rect x="300" y="124" width="180" height="118" rx="8" fill="#e0dcd5" />
    <path d="M300 212L352 176L398 206L430 186L480 218V234A8 8 0 0 1 472 242H308A8 8 0 0 1 300 234Z" fill="#d2cdc4" />
    <circle cx="440" cy="158" r="12" fill="#fbfaf8" opacity="0.85" />
    {
      cards.map((x) => (
        <g>
          <rect x={x} y="266" width="124" height="90" rx="8" fill="#f4f2ee" stroke="#e6e3dd" />
          <rect x={x + 14} y="282" width="52" height="6" rx="3" fill="#8c8983" />
          <rect x={x + 14} y="296" width="82" height="4" rx="2" fill="#cfcbc4" />
        </g>
      ))
    }
    <path
      class="art-cursor"
      d="M138 226V246L143 241L147 250L150.5 248.5L146.5 239.8L153 239.5Z"
      fill="#121211"
      stroke="#fbfaf8"
      stroke-width="1.4"
      stroke-linejoin="round"
    />
  </svg>
</div>
```

- [x] **Step 4: Create `src/components/art/ServiceApps.astro`**

```astro
---
import type { Locale } from '../../i18n';

interface Props {
  lang: Locale;
}

const rows = [
  { y: 136, name: 58, meta: 40, status: 'accent' },
  { y: 180, name: 50, meta: 52, status: 'dark' },
  { y: 224, name: 42, meta: 40, status: 'open' },
  { y: 268, name: 58, meta: 52, status: 'accent' },
  { y: 312, name: 50, meta: 40, status: 'open' },
] as const;

const bars = [
  { x: 396, y: 220, h: 34 },
  { x: 418, y: 202, h: 52 },
  { x: 440, y: 214, h: 40 },
  { x: 462, y: 190, h: 64 },
];
---

<div class="art-frame">
  <svg viewBox="0 0 560 350" aria-hidden="true">
    <rect x="206" y="28" width="150" height="340" rx="26" fill="#fbfaf8" stroke="#d9d5ce" />
    <rect x="261" y="40" width="40" height="7" rx="3.5" fill="#e6e3dd" />
    <rect x="224" y="66" width="64" height="10" rx="2.5" fill="#121211" />
    <rect x="224" y="88" width="114" height="20" rx="10" fill="#f0eee9" />
    <rect x="226" y="90" width="56" height="16" rx="8" fill="#fbfaf8" />
    {
      rows.map((row, i) => (
        <g class="app-row">
          <circle cx="238" cy={row.y} r="10" fill="#e6e3dd" />
          <rect x="256" y={row.y - 8} width={row.name} height="6" rx="3" fill="#2a2a2c" />
          <rect x="256" y={row.y + 4} width={row.meta} height="4" rx="2" fill="#cfcbc4" />
          {row.status === 'open' ? (
            <circle cx="338" cy={row.y} r="3.6" fill="none" stroke="#8c8983" />
          ) : (
            <circle
              class={row.status === 'accent' ? 'acc' : undefined}
              cx="338"
              cy={row.y}
              r="3.6"
              fill={row.status === 'dark' ? '#2a2a2c' : undefined}
            />
          )}
          {i < rows.length - 1 && <path d={`M224 ${row.y + 22}H338`} stroke="#efede8" />}
        </g>
      ))
    }
    <g class="app-toast">
      <rect x="58" y="116" width="180" height="58" rx="14" fill="#fbfaf8" stroke="#d9d5ce" />
      <circle class="acc" cx="82" cy="145" r="6" />
      <rect x="98" y="134" width="96" height="7" rx="3.5" fill="#121211" />
      <rect x="98" y="149" width="118" height="5" rx="2.5" fill="#cfcbc4" />
    </g>
    <g class="app-chart">
      <rect x="378" y="150" width="136" height="120" rx="12" fill="#fbfaf8" stroke="#d9d5ce" />
      <rect x="394" y="166" width="50" height="6" rx="3" fill="#8c8983" />
      {bars.map((b) => <rect x={b.x} y={b.y} width="12" height={b.h} rx="3" fill="#cfcbc4" />)}
      <rect class="acc" x="484" y="178" width="12" height="76" rx="3" />
    </g>
  </svg>
</div>
```

- [x] **Step 5: Create `src/components/art/ServiceFlow.astro`**

```astro
---
import { getDictionary, type Locale } from '../../i18n';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const flow = getDictionary(lang).services.flow;

const links = [
  'M164 100C224 100 190 175 250 175',
  'M164 250C224 250 190 175 250 175',
  'M310 175C370 175 338 64 398 64',
  'M310 175C370 175 338 175 398 175',
  'M310 175C370 175 338 286 398 286',
];

const nodes = [
  { x: 40, y: 82, label: flow.shop },
  { x: 40, y: 232, label: flow.inbox },
  { x: 398, y: 46, label: flow.accounting },
  { x: 398, y: 157, label: flow.warehouse },
  { x: 398, y: 268, label: flow.invoice },
];
---

<div class="art-frame">
  <svg viewBox="0 0 560 350" aria-hidden="true">
    {links.map((d) => <path class="link" d={d} />)}
    {links.map((d) => <path class="flow" d={d} />)}
    {
      nodes.map((n) => (
        <g class="node">
          <rect x={n.x + 0.5} y={n.y + 0.5} width="123" height="35" rx="17.5" fill="#fbfaf8" stroke="#d9d5ce" />
          <circle cx={n.x + 18} cy={n.y + 18} r="3.4" fill="#8c8983" />
          <text class="node-label" x={n.x + 30} y={n.y + 22.2}>
            {n.label}
          </text>
        </g>
      ))
    }
    <circle cx="280" cy="175" r="30" fill="#121211" />
    <g fill="none" stroke-width="2.2">
      <circle cx="280" cy="170" r="7.4" stroke="#f4f2ee" />
      <circle cx="275.4" cy="178" r="7.4" stroke="#8c8983" />
      <circle class="hub-accent" cx="284.6" cy="178" r="7.4" />
    </g>
  </svg>
</div>

<style>
  .link {
    fill: none;
    stroke: #cfcbc4;
    stroke-width: 1.2;
  }
  .flow {
    fill: none;
    stroke: var(--accent);
    stroke-width: 3.6;
    stroke-linecap: round;
    stroke-dasharray: 0.1 17;
    animation: flow 1.5s linear infinite;
  }
  .node-label {
    font-family: var(--font-sans);
    font-size: 12px;
    fill: var(--ink);
  }
  .hub-accent {
    stroke: var(--accent);
  }
  @keyframes flow {
    to {
      stroke-dashoffset: -34.2;
    }
  }
</style>
```

- [x] **Step 6: Create `src/components/Services.astro`**

```astro
---
import { getDictionary, pad2, type Locale } from '../i18n';
import ServiceApps from './art/ServiceApps.astro';
import ServiceFlow from './art/ServiceFlow.astro';
import ServiceWeb from './art/ServiceWeb.astro';
import SectionHeading from './ui/SectionHeading.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);
const art = { web: ServiceWeb, apps: ServiceApps, systems: ServiceFlow } as const;
---

<section id="services" class="services container" aria-labelledby="services-title">
  <SectionHeading id="services-title" title={t.services.title} count={pad2(t.services.items.length)} intro={t.services.intro} />
  <div class="svc-list">
    {
      t.services.items.map((item, i) => {
        const Art = art[item.id];
        return (
          <details class="svc" name="services" open={i === 0} data-service={item.id}>
            <summary class="svc-summary">
              <span class="svc-num">{pad2(i + 1)}</span>
              <h3 class="svc-title">{item.title}</h3>
              <span class="svc-tagline">{item.tagline}</span>
              <span class="svc-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path d="M1 7H13" />
                  <path class="svc-icon-v" d="M7 1V13" />
                </svg>
              </span>
            </summary>
            <div class="svc-panel">
              <div class="svc-text">
                <p class="svc-body">{item.body}</p>
                <div class="svc-meta">
                  <span class="label">{t.services.bring}</span>
                  <span class="svc-bring">{item.bring}</span>
                </div>
                <div class="svc-meta svc-meta--list">
                  <span class="label">{t.services.includes}</span>
                  <ul class="svc-chips">
                    {item.includes.map((x) => (
                      <li>{x}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div class="svc-art">
                <Art lang={lang} />
              </div>
            </div>
          </details>
        );
      })
    }
  </div>
</section>

<style>
  .services {
    padding-bottom: var(--section-y);
  }
  .svc {
    border-bottom: 1px solid var(--line);
  }
  .svc-summary {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'num icon' 'title icon' 'tag icon';
    column-gap: 16px;
    row-gap: 10px;
    align-items: center;
    padding-block: 26px;
    list-style: none;
    cursor: pointer;
  }
  .svc-summary::-webkit-details-marker {
    display: none;
  }
  .svc-summary::marker {
    content: '';
  }
  .svc-num {
    grid-area: num;
    font-size: 14px;
    color: var(--label);
    font-variant-numeric: tabular-nums;
  }
  .svc-title {
    grid-area: title;
    font-size: var(--fs-service);
    font-weight: 300;
    line-height: 1;
    letter-spacing: -0.04em;
    transition: transform 0.5s var(--ease-std);
  }
  .svc-tagline {
    grid-area: tag;
    font-size: 16px;
    line-height: 1.45;
    color: var(--muted);
  }
  .svc-icon {
    display: grid;
    grid-area: icon;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid var(--line);
    border-radius: 50%;
    transition: border-color 0.3s var(--ease-std);
  }
  .svc-icon path {
    fill: none;
    stroke: var(--ink);
    stroke-width: 1.4;
    stroke-linecap: round;
  }
  .svc-icon-v {
    transform-box: fill-box;
    transform-origin: center;
    transition: transform 0.35s var(--ease-std);
  }
  .svc[open] .svc-icon-v {
    transform: scaleY(0);
  }
  .svc-summary:hover .svc-title {
    transform: translateX(10px);
  }
  .svc-summary:hover .svc-icon {
    border-color: var(--ink);
  }
  .svc-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    row-gap: 40px;
    padding: 4px 0 48px;
  }
  .svc-text {
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .svc-body {
    font-size: var(--fs-body-xl);
    font-weight: 300;
    line-height: 1.5;
    letter-spacing: -0.01em;
    text-wrap: pretty;
  }
  .svc-meta {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .svc-meta--list {
    gap: 14px;
  }
  .svc-bring {
    font-size: 16px;
    line-height: 1.5;
    color: var(--muted);
  }
  .svc-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0;
    list-style: none;
  }
  .svc-chips li {
    display: flex;
    align-items: center;
    height: 36px;
    padding: 0 15px;
    border: 1px solid var(--line);
    border-radius: 999px;
    font-size: 14px;
  }
  @media (min-width: 64rem) {
    .svc-summary {
      grid-template-columns: repeat(12, minmax(0, 1fr));
      grid-template-areas: none;
      column-gap: var(--gutter);
      min-height: 128px;
      padding-block: 0;
    }
    .svc-num {
      grid-area: auto;
      grid-column: 1;
    }
    .svc-title {
      grid-area: auto;
      grid-column: 2 / span 6;
    }
    .svc-tagline {
      grid-area: auto;
      grid-column: 8 / span 4;
    }
    .svc-icon {
      grid-area: auto;
      grid-column: 12;
      justify-self: end;
    }
    .svc-panel {
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
      align-items: start;
      padding-bottom: 64px;
    }
    .svc-text {
      grid-column: 2 / span 5;
      gap: 36px;
      padding-right: 24px;
    }
    .svc-art {
      grid-column: 8 / span 5;
    }
  }
</style>
```

- [x] **Step 7: Render the section from `Home.astro`**

Replace `src/components/Home.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';
import Approach from './Approach.astro';
import Header from './Header.astro';
import Hero from './Hero.astro';
import Services from './Services.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <Header lang={lang} />
  <main id="main">
    <Hero lang={lang} />
    <Approach lang={lang} />
    <Services lang={lang} />
  </main>
</Base>
```

- [x] **Step 8: Build and run tests**

Run: `npm run build && npm run test:dist && npm run check`
Expected: dist `Tests 58 passed (58)`; `0 errors`.

- [x] **Step 9: Visual check**

Screenshot `section#services` at 1440 and 390 (`t7-services-*.png`). Click the second summary: the first row closes and the second opens (native exclusive accordion). Expected at 1440: rows 128 px tall, title 54 px, tagline at column 8, round +/− icon right; open panel shows text (columns 2–6) and the illustration (columns 8–12) like the reference; the automation flow dots move.

- [x] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add services accordion with illustrations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Selected work

**Files:**

- Create: `src/components/Work.astro`, `src/components/art/ProjectPortal.astro`, `src/components/art/ProjectShop.astro`, `src/components/art/Bottle.astro`
- Modify: `src/components/Home.astro`
- Test: `tests/dist/work.test.ts`

**Interfaces:**

- Consumes: `SectionHeading`, `Button` (Task 4); `getDictionary`, `pad2`, `Locale`; `site`.
- Produces: `section#work` with `article.pj.pj--portal` and `article.pj.pj--shop`, each with `a.pj-card` (SVG art whose moving part is `g.pj-mock`) and `.pj-info`; `a.pj-next` card. Plan 2 hooks: `.pj-card`, `.pj-mock`, `.pj-next`.

- [x] **Step 1: Write the failing test**

`tests/dist/work.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path work', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const section = doc.querySelector('section#work');
  const cards = Array.from(section?.querySelectorAll('article .pj-card') ?? []);

  it('shows both projects by name', () => {
    expect(Array.from(section?.querySelectorAll('article h3') ?? []).map(text)).toEqual(t.work.projects.map((p) => p.name));
  });

  it('links the portal to contact and the shop to its site in a new tab', () => {
    expect(cards[0]?.getAttribute('href')).toBe('#contact');
    expect(cards[1]?.getAttribute('href')).toBe('https://adaparfemi.ba');
    expect(cards[1]?.getAttribute('target')).toBe('_blank');
    expect(cards[1]?.getAttribute('rel')).toContain('noopener');
  });

  it('gives each card an accessible name', () => {
    expect(cards.map((c) => c.getAttribute('aria-label'))).toEqual(t.work.projects.map((p) => p.cardLabel));
  });

  it('lists client, scope and status for each project', () => {
    const terms = Array.from(section?.querySelectorAll('article dl dt') ?? []).map(text);
    expect(terms).toEqual([t.work.client, t.work.scope, t.work.status, t.work.client, t.work.scope, t.work.status]);
  });

  it('keeps a slot for the next project', () => {
    const next = section?.querySelector('a.pj-next');
    expect(next?.getAttribute('href')).toBe('#contact');
    expect(text(next)).toContain(t.work.next.title);
    expect(text(next)).toContain(site.bookingFrom[lang]);
  });
});
```

- [x] **Step 2: Build and see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — work assertions.

- [x] **Step 3: Create `src/components/art/Bottle.astro`**

```astro
---
interface Props {
  x: number;
  y: number;
  scale: number;
  tone: 'gold' | 'sage' | 'rose';
}

const { x, y, scale, tone } = Astro.props;
---

<g transform={`translate(${x} ${y}) scale(${scale})`}>
  <rect x="20.48" y="190.08" width="87.04" height="11.52" rx="5.76" fill="#000" fill-opacity="0.1"></rect>
  <rect x="25.6" y="64" width="76.8" height="130.56" rx="14.08" fill={`url(#bottle-${tone})`}></rect>
  <rect x="35.84" y="76.8" width="8.96" height="104.96" rx="4.48" fill="#fff" fill-opacity="0.35"></rect>
  <rect x="44.8" y="110.08" width="38.4" height="28.16" rx="2.56" fill="#fff" fill-opacity="0.55"></rect>
  <rect x="52.48" y="48.64" width="23.04" height="17.92" rx="2.56" fill="#d8cfc2"></rect>
  <rect x="42.24" y="12.8" width="43.52" height="38.4" rx="6.4" fill="#121211"></rect>
  <rect x="47.36" y="17.92" width="5.12" height="28.16" rx="2.56" fill="#fff" fill-opacity="0.18"></rect>
</g>
```

- [x] **Step 4: Create `src/components/art/ProjectPortal.astro`**

```astro
---
const sidebar = [64, 52, 70, 58, 66, 48];
const kpis = [72, 54, 88];
const columns = [210, 286, 496, 576, 686];
const headWidths = [30, 44, 30, 34, 40];
const rows = [
  { name: 132, amount: 66, note: 54, status: 'accent' },
  { name: 168, amount: 58, note: 48, status: 'accent' },
  { name: 112, amount: 72, note: 60, status: 'dark' },
  { name: 150, amount: 60, note: 50, status: 'open' },
  { name: 124, amount: 64, note: 56, status: 'dark' },
  { name: 140, amount: 54, note: 46, status: 'open' },
] as const;
---

<svg class="pj-art" viewBox="0 0 866 541" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
  <defs>
    <filter id="pj-portal-shadow" x="-10%" y="-10%" width="130%" height="140%">
      <feDropShadow dx="0" dy="34" stdDeviation="26" flood-color="#000" flood-opacity="0.32"></feDropShadow>
    </filter>
  </defs>
  <g class="pj-mock">
    <g transform="translate(64 60)">
      <rect width="900" height="580" rx="12" fill="#fbfaf8" filter="url(#pj-portal-shadow)"></rect>
      <path d="M0 50.5H900M180.5 51V580" stroke="#ebe8e2"></path>
      <rect class="acc" x="20" y="15" width="20" height="20" rx="6"></rect>
      <rect x="54" y="21" width="84" height="8" rx="4" fill="#2a2a2c"></rect>
      <rect x="208" y="10" width="250" height="30" rx="15" fill="#f0eee9"></rect>
      <circle cx="865" cy="25" r="15" fill="#e2ded7"></circle>
      {
        sidebar.map((w, i) => {
          const y = 68 + i * 40;
          const active = i === 1;
          return (
            <g>
              {active && <rect x="12" y={y} width="156" height="34" rx="8" fill="#f0eee9" />}
              <rect class={active ? 'acc' : undefined} x="22" y={y + 10} width="14" height="14" rx="4" fill={active ? undefined : '#dcd8d1'} />
              <rect x="46" y={y + 14} width={w} height="6" rx="3" fill={active ? '#2a2a2c' : '#cfcbc4'} />
            </g>
          );
        })
      }
      <rect x="210" y="83" width="150" height="18" rx="4" fill="#121211"></rect>
      <rect x="380" y="76" width="96" height="32" rx="16" fill="#121211"></rect>
      {
        kpis.map((w, i) => {
          const x = 210 + i * 178;
          return (
            <g>
              <rect x={x + 0.5} y="130.5" width="163" height="85" rx="10" fill="#f5f3ef" stroke="#ebe8e2" />
              <rect x={x + 16} y="146" width="56" height="6" rx="3" fill="#cfcbc4" />
              <rect x={x + 16} y="166" width={w} height="16" rx="4" fill="#121211" />
            </g>
          );
        })
      }
      <path d="M210 272.5H900" stroke="#e6e3dd"></path>
      {headWidths.map((w, i) => <rect x={columns[i]} y="252.5" width={w} height="5" rx="2.5" fill="#cfcbc4" />)}
      {
        rows.map((row, r) => {
          const c = 272 + r * 48 + 24;
          return (
            <g>
              <path d={`M210 ${c + 24.5}H900`} stroke="#f0eee9" />
              <rect x="210" y={c - 3.5} width="40" height="7" rx="3.5" fill="#8c8983" />
              <rect x="286" y={c - 3.5} width={row.name} height="7" rx="3.5" fill="#3a3a3c" />
              <rect x="496" y={c - 3.5} width="26" height="7" rx="3.5" fill="#bdb9b1" />
              <rect x="576" y={c - 3.5} width={row.amount} height="7" rx="3.5" fill="#3a3a3c" />
              {row.status === 'open' ? (
                <circle cx="690" cy={c} r="3.3" fill="none" stroke="#8c8983" stroke-width="1.4" />
              ) : (
                <circle
                  class={row.status === 'accent' ? 'acc' : undefined}
                  cx="690"
                  cy={c}
                  r="4"
                  fill={row.status === 'dark' ? '#2a2a2c' : undefined}
                />
              )}
              <rect x="702" y={c - 3} width={row.note} height="6" rx="3" fill="#bdb9b1" />
            </g>
          );
        })
      }
    </g>
  </g>
</svg>
```

- [x] **Step 5: Create `src/components/art/ProjectShop.astro`**

```astro
---
import Bottle from './Bottle.astro';

const tiles = [
  { x: 16, y: 112, tone: 'gold' },
  { x: 114, y: 112, tone: 'sage' },
  { x: 16, y: 271, tone: 'rose' },
  { x: 114, y: 271, tone: 'gold' },
] as const;

const gradients = [
  { id: 'gold', from: '#e3b778', to: '#b87a35' },
  { id: 'sage', from: '#d9dcd6', to: '#9ea59b' },
  { id: 'rose', from: '#e8c9c0', to: '#b98474' },
];
---

<svg class="pj-art" viewBox="0 0 866 541" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
  <defs>
    {
      gradients.map((g) => (
        <linearGradient id={`bottle-${g.id}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color={g.from} />
          <stop offset="1" stop-color={g.to} />
        </linearGradient>
      ))
    }
    <clipPath id="shop-desktop-clip"><rect width="640" height="540" rx="12"></rect></clipPath>
    <clipPath id="shop-phone-clip"><rect width="218" height="450" rx="32"></rect></clipPath>
    <filter id="pj-shop-shadow" x="-15%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="34" stdDeviation="26" flood-color="#000" flood-opacity="0.42"></feDropShadow>
    </filter>
  </defs>
  <g class="pj-mock">
    <g transform="translate(48 60)">
      <rect width="640" height="540" rx="12" fill="#fbfaf8" filter="url(#pj-shop-shadow)"></rect>
      <g clip-path="url(#shop-desktop-clip)">
        <path d="M0 54.5H640" stroke="#ebe8e2"></path>
        <rect x="22" y="24" width="34" height="6" rx="3" fill="#cfcbc4"></rect>
        <rect x="72" y="24" width="30" height="6" rx="3" fill="#cfcbc4"></rect>
        <rect x="118" y="24" width="40" height="6" rx="3" fill="#cfcbc4"></rect>
        <rect x="278" y="21.5" width="84" height="11" rx="2" fill="#121211"></rect>
        <circle cx="573" cy="27" r="10.3" fill="none" stroke="#8c8983" stroke-width="1.4"></circle>
        <rect x="596.7" y="16.7" width="20.6" height="20.6" rx="5.3" fill="none" stroke="#8c8983" stroke-width="1.4"></rect>
        <circle class="acc" cx="617.5" cy="16.5" r="4.5"></circle>
        <rect y="55" width="330" height="485" fill="#efe9e0"></rect>
        <Bottle x={101} y={194.6} scale={1} tone="gold" />
        <rect x="362" y="94" width="70" height="6" rx="3" fill="#cfcbc4"></rect>
        <rect x="362" y="118" width="190" height="17" rx="4" fill="#121211"></rect>
        <rect x="362" y="144" width="128" height="17" rx="4" fill="#121211"></rect>
        <rect x="362" y="187" width="64" height="10" rx="3" fill="#2a2a2c"></rect>
        <rect x="362.5" y="225.5" width="55" height="29" rx="14.5" fill="none" stroke="#cfcbc4"></rect>
        <rect x="426" y="225" width="56" height="30" rx="15" fill="#121211"></rect>
        <rect x="490.5" y="225.5" width="55" height="29" rx="14.5" fill="none" stroke="#cfcbc4"></rect>
        <rect x="362" y="277" width="206" height="44" rx="22" fill="#121211"></rect>
        <path d="M362 349.5H568M362 389.5H568" stroke="#ebe8e2"></path>
        <rect x="362" y="366" width="64" height="6" rx="3" fill="#8c8983"></rect>
        <rect x="558" y="368" width="10" height="2" rx="1" fill="#8c8983"></rect>
        <rect x="362" y="406" width="80" height="6" rx="3" fill="#8c8983"></rect>
        <rect x="558" y="408" width="10" height="2" rx="1" fill="#8c8983"></rect>
      </g>
    </g>
    <g transform="translate(606 120)">
      <rect x="-7" y="-7" width="232" height="464" rx="39" fill="#3a3a3d" filter="url(#pj-shop-shadow)"></rect>
      <rect width="218" height="450" rx="32" fill="#fbfaf8"></rect>
      <g clip-path="url(#shop-phone-clip)">
        <rect x="16" y="41.5" width="66" height="9" rx="2" fill="#121211"></rect>
        <rect x="182.7" y="36.7" width="18.6" height="18.6" rx="5.3" fill="none" stroke="#8c8983" stroke-width="1.4"></rect>
        <circle class="acc" cx="202" cy="36" r="4"></circle>
        <rect x="16" y="72" width="46" height="24" rx="12" fill="#121211"></rect>
        <rect x="68.5" y="72.5" width="51" height="23" rx="11.5" fill="none" stroke="#cfcbc4"></rect>
        <rect x="126.5" y="72.5" width="39" height="23" rx="11.5" fill="none" stroke="#cfcbc4"></rect>
        {
          tiles.map((tile) => (
            <g>
              <rect x={tile.x} y={tile.y} width="88" height="118" rx="12" fill="#efe9e0" />
              <Bottle x={tile.x + 20} y={tile.y + 20.6} scale={0.375} tone={tile.tone} />
              <rect x={tile.x} y={tile.y + 126} width="62" height="6" rx="3" fill="#2a2a2c" />
              <rect x={tile.x} y={tile.y + 140} width="38" height="5" rx="2.5" fill="#cfcbc4" />
            </g>
          ))
        }
      </g>
    </g>
  </g>
</svg>
```

- [x] **Step 6: Create `src/components/Work.astro`**

```astro
---
import { site } from '../config/site';
import { getDictionary, pad2, type Locale } from '../i18n';
import ProjectPortal from './art/ProjectPortal.astro';
import ProjectShop from './art/ProjectShop.astro';
import Button from './ui/Button.astro';
import SectionHeading from './ui/SectionHeading.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);

const links = {
  portal: { href: '#contact', external: false },
  shop: { href: 'https://adaparfemi.ba', external: true },
} as const;
const art = { portal: ProjectPortal, shop: ProjectShop } as const;
const newTab = { target: '_blank', rel: 'noopener' };
---

<section id="work" class="work container" aria-labelledby="work-title">
  <SectionHeading id="work-title" title={t.work.title} count={pad2(t.work.projects.length)} intro={t.work.intro} />
  {
    t.work.projects.map((p, i) => {
      const link = links[p.id];
      const Art = art[p.id];
      const extra = link.external ? newTab : {};
      return (
        <article class={`pj pj--${p.id}`} aria-labelledby={`pj-${p.id}`}>
          <a class="pj-card" href={link.href} aria-label={p.cardLabel} {...extra}>
            <Art />
          </a>
          <div class="pj-info">
            <span class="pj-num">{pad2(i + 1)}</span>
            <h3 id={`pj-${p.id}`} class="pj-name">
              {p.name}
            </h3>
            <p class="pj-summary">{p.summary}</p>
            <dl class="pj-facts">
              <div>
                <dt>{t.work.client}</dt>
                <dd>{p.client}</dd>
              </div>
              <div>
                <dt>{t.work.scope}</dt>
                <dd>{p.scope}</dd>
              </div>
              <div>
                <dt>{t.work.status}</dt>
                <dd>
                  <span class="pj-status"><span class="pj-dot" aria-hidden="true" />{p.status}</span>
                </dd>
              </div>
            </dl>
            <Button
              href={link.href}
              variant="text"
              icon={link.external ? 'external' : 'arrow'}
              aria-label={link.external ? `${p.cta} ${t.a11y.newTab}` : undefined}
              {...extra}
            >
              {p.cta}
            </Button>
          </div>
        </article>
      );
    })
  }
  <a class="pj-next" href="#contact">
    <span class="pj-num">{pad2(t.work.projects.length + 1)}</span>
    <span class="pj-next-title">{t.work.next.title}</span>
    <span class="pj-next-body">{t.work.next.body}<br />{t.work.next.start} {site.bookingFrom[lang]}</span>
    <span class="pj-next-cta"><Button as="span" size="m">{t.cta.start}</Button></span>
  </a>
</section>

<style>
  .work {
    padding-bottom: var(--section-y);
  }
  .pj {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
    row-gap: 32px;
    align-items: end;
    margin-top: 64px;
  }
  .pj + .pj {
    margin-top: clamp(80px, 8vw, 120px);
  }
  .pj-card {
    display: block;
    grid-column: 1 / -1;
    aspect-ratio: 16 / 10;
    border-radius: 12px;
    overflow: hidden;
  }
  .pj--portal .pj-card {
    background: var(--accent);
  }
  .pj--shop .pj-card {
    background: var(--graphite);
  }
  .pj-card :global(svg) {
    display: block;
    width: 100%;
    height: 100%;
  }
  .pj-card :global(.pj-mock) {
    transition: transform 0.9s var(--ease-std);
  }
  .pj-card:hover :global(.pj-mock) {
    transform: translate(-6px, -8px);
  }
  .pj-info {
    display: flex;
    flex-direction: column;
    gap: 22px;
    grid-column: 1 / -1;
  }
  .pj-num {
    font-size: 14px;
    color: var(--label);
    font-variant-numeric: tabular-nums;
  }
  .pj-name {
    font-size: var(--fs-project);
    font-weight: 300;
    line-height: 1.02;
    letter-spacing: -0.035em;
  }
  .pj-summary {
    font-size: 16px;
    line-height: 1.6;
    color: var(--muted);
    text-wrap: pretty;
  }
  .pj-facts {
    margin-top: 4px;
    border-top: 1px solid var(--line);
  }
  .pj-facts div {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 13px 0;
    border-bottom: 1px solid var(--line);
    font-size: 14px;
    line-height: 1.4;
  }
  .pj-facts dt {
    color: var(--label);
  }
  .pj-facts dd {
    text-align: right;
  }
  .pj-status {
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .pj-dot {
    width: 7px;
    height: 7px;
    flex-shrink: 0;
    border-radius: 50%;
    background: var(--accent);
  }
  .pj-next {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
    margin-top: clamp(80px, 8vw, 120px);
    padding: 32px 24px;
    border: 1px dashed var(--line-dash);
    border-radius: 12px;
    text-decoration: none;
    transition: background-color 0.35s ease;
  }
  .pj-next:hover {
    background: var(--paper-2);
  }
  .pj-next:hover :global(.arr) {
    transform: translateX(4px);
  }
  .pj-next-title {
    font-size: var(--fs-next);
    font-weight: 300;
    line-height: 1;
    letter-spacing: -0.04em;
  }
  .pj-next-body {
    font-size: 16px;
    line-height: 1.5;
    color: var(--muted);
  }
  @media (min-width: 48rem) {
    .pj-info {
      grid-column: 1 / span 5;
    }
  }
  @media (min-width: 64rem) {
    .pj--portal .pj-card {
      grid-column: 1 / span 8;
    }
    .pj--portal .pj-info {
      grid-column: 10 / span 3;
    }
    .pj--shop .pj-info {
      grid-column: 1 / span 3;
      grid-row: 1;
    }
    .pj--shop .pj-card {
      grid-column: 5 / span 8;
      grid-row: 1;
    }
    .pj-next {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
      align-items: center;
      min-height: 184px;
      padding: 0 36px;
    }
    .pj-next .pj-num {
      grid-column: 1;
    }
    .pj-next-title {
      grid-column: 2 / span 6;
    }
    .pj-next-body {
      grid-column: 8 / span 3;
    }
    .pj-next-cta {
      grid-column: 11 / span 2;
      justify-self: end;
    }
  }
</style>
```

- [x] **Step 7: Render the section from `Home.astro`**

Replace `src/components/Home.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';
import Approach from './Approach.astro';
import Header from './Header.astro';
import Hero from './Hero.astro';
import Services from './Services.astro';
import Work from './Work.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <Header lang={lang} />
  <main id="main">
    <Hero lang={lang} />
    <Approach lang={lang} />
    <Services lang={lang} />
    <Work lang={lang} />
  </main>
</Base>
```

- [x] **Step 8: Build and run tests**

Run: `npm run build && npm run test:dist && npm run check`
Expected: dist `Tests 68 passed (68)`; `0 errors`.

- [x] **Step 9: Visual check**

Screenshot `section#work` at 1440 and 390 (`t8-work-*.png`); compare with `.playwright-mcp/orig-part2.jpeg`. Expected: portal card (green) left with info right; shop card (graphite) right with info left; mockups cropped by the card edge the same way; hovering a card lifts the mockup; "Your project" dashed card below.

- [x] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add selected work with SVG project mockups

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Process timeline (Fig. 3)

**Files:**

- Create: `src/components/Process.astro`
- Modify: `src/components/Home.astro`
- Test: `tests/dist/process.test.ts`

**Interfaces:**

- Consumes: `SectionHeading`; `getDictionary`, `pad2`, `Locale`.
- Produces: `section#process` > `figure.proc` with `.proc-axis`, `ol.proc-list > li.proc-row` ×5 (each `.proc-info`, `.proc-lane` > `.proc-track[aria-hidden]` > `.proc-bar.proc-bar--{outline|solid|accent}` with `--start`/`--len`, `.proc-demo` with `--x`, and `p.proc-out`). Plan 2 animates these (scrub).

- [x] **Step 1: Write the failing test**

`tests/dist/process.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path process', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const rows = Array.from(doc.querySelectorAll('section#process ol.proc-list > li'));

  it('lists the five stages in order', () => {
    expect(rows.map((li) => text(li.querySelector('h3')))).toEqual(t.process.stages.map((s) => s.title));
  });

  it('states what each stage delivers', () => {
    expect(rows.map((li) => text(li.querySelector('.proc-out')))).toEqual(
      t.process.stages.map((s) => `${t.process.out} ${s.out}`),
    );
  });

  it('draws one bar per stage and four demos in Build', () => {
    expect(rows.map((li) => li.querySelectorAll('.proc-bar').length)).toEqual([1, 1, 1, 1, 1]);
    expect(rows[2]?.querySelectorAll('.proc-demo')).toHaveLength(4);
    expect(rows[4]?.querySelector('.proc-bar--accent')).not.toBeNull();
  });

  it('hides the drawing from screen readers but not the deliverables', () => {
    expect(rows.every((li) => li.querySelector('.proc-track')?.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(rows.every((li) => li.querySelector('.proc-out')?.closest('[aria-hidden]') === null)).toBe(true);
  });

  it('explains the demo dot in the caption', () => {
    const caption = text(doc.querySelector('section#process figcaption'));
    expect(caption).toContain(t.process.fig);
    expect(caption).toContain(`${t.process.captionBefore} ${t.process.pillAlt} ${t.process.captionAfter}`);
  });
});
```

- [x] **Step 2: Build and see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — process assertions.

- [x] **Step 3: Create `src/components/Process.astro`**

```astro
---
import { getDictionary, pad2, type Locale } from '../i18n';
import SectionHeading from './ui/SectionHeading.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);

/** Timeline geometry in % of the track width (1 unit = 11.4286 %, go-live at 7.5 units). */
const GO_LIVE = 85.714;

interface Bar {
  start: number;
  end: number | null;
  tone: 'outline' | 'solid' | 'accent';
  demos?: number[];
  outAlign?: 'start' | 'end' | 'edge';
}

const bars: Bar[] = [
  { start: 0, end: 11.429, tone: 'outline' },
  { start: 8.571, end: 28.571, tone: 'outline' },
  { start: 22.857, end: 77.143, tone: 'solid', demos: [34.286, 45.714, 57.143, 68.571] },
  { start: 77.143, end: GO_LIVE, tone: 'solid', outAlign: 'end' },
  { start: GO_LIVE, end: null, tone: 'accent', outAlign: 'edge' },
];

const barStyle = (bar: Bar) =>
  bar.end === null ? `--start: ${bar.start}%` : `--start: ${bar.start}%; --len: ${(bar.end - bar.start).toFixed(3)}%`;
---

<section id="process" class="process container" aria-labelledby="process-title">
  <SectionHeading id="process-title" title={t.process.title} count={pad2(t.process.stages.length)} intro={t.process.intro} />
  <figure class="proc">
    <div class="proc-axis" aria-hidden="true">
      <span class="label proc-axis-stage">{t.process.stage}</span>
      <div class="proc-axis-lane">
        <span class="label proc-axis-kick">{t.process.axis.kickoff}</span>
        <span class="label proc-axis-live">{t.process.axis.golive}</span>
        <span class="label proc-axis-ongoing">{t.process.axis.ongoing}</span>
      </div>
    </div>
    <ol class="proc-list">
      {
        t.process.stages.map((stage, i) => {
          const bar = bars[i]!;
          return (
            <li class="proc-row">
              <div class="proc-info">
                <span class="proc-num">{pad2(i + 1)}</span>
                <div>
                  <h3 class="proc-title">{stage.title}</h3>
                  <p class="proc-body">{stage.body}</p>
                </div>
              </div>
              <div class="proc-lane">
                <div class="proc-track" aria-hidden="true">
                  <span class={`proc-bar proc-bar--${bar.tone}`} style={barStyle(bar)} />
                  {bar.demos?.map((x) => (
                    <span class="proc-demo" style={`--x: ${x}%`} />
                  ))}
                </div>
                <p class={`proc-out proc-out--${bar.outAlign ?? 'start'}`} style={`--start: ${bar.start}%`}>
                  <span class="proc-out-label">{t.process.out}</span> {stage.out}
                </p>
              </div>
            </li>
          );
        })
      }
    </ol>
    <figcaption class="fig-caption proc-caption">
      <span class="fig-num">{t.process.fig}</span> — {t.process.captionBefore}
      <span class="proc-pill"><span class="visually-hidden">{t.process.pillAlt}</span></span>
      {t.process.captionAfter}
    </figcaption>
  </figure>
</section>

<style>
  .process {
    padding-bottom: var(--section-y);
  }
  .proc {
    margin-top: 40px;
  }
  .proc-axis {
    padding-bottom: 12px;
    border-bottom: 1px solid var(--ink);
  }
  .proc-axis-stage,
  .proc-axis-ongoing {
    display: none;
  }
  .proc-axis-lane {
    position: relative;
    height: 18px;
    margin-left: 40px;
  }
  .proc-axis-lane > * {
    position: absolute;
    bottom: 0;
    white-space: nowrap;
  }
  .proc-axis-kick {
    left: 0;
  }
  .proc-axis-live {
    left: 85.714%;
    transform: translateX(calc(-100% - 6px));
    color: var(--ink);
  }
  .proc-axis-ongoing {
    right: 0;
  }
  .proc-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .proc-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    row-gap: 18px;
    padding-block: 24px;
    border-bottom: 1px solid var(--line);
  }
  .proc-info {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr);
  }
  .proc-num {
    padding-top: 7px;
    font-size: 14px;
    color: var(--label);
    font-variant-numeric: tabular-nums;
  }
  .proc-title {
    font-size: var(--fs-h3);
    font-weight: 300;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }
  .proc-body {
    margin-top: 10px;
    font-size: 15px;
    line-height: 1.55;
    color: var(--muted);
    text-wrap: pretty;
  }
  .proc-lane {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-left: 40px;
  }
  .proc-track {
    position: relative;
    height: 20px;
    background-image: linear-gradient(90deg, var(--line) 1px, transparent 1px);
    background-repeat: repeat-x;
    background-size: 11.4286% 100%;
  }
  .proc-track::after {
    content: '';
    position: absolute;
    top: -4px;
    bottom: -4px;
    left: 85.714%;
    border-left: 1px dashed var(--label);
  }
  .proc-bar {
    position: absolute;
    top: 4px;
    left: var(--start);
    width: var(--len);
    height: 12px;
    border-radius: 6px;
  }
  .proc-bar--outline {
    background: var(--paper);
    border: 1.2px solid var(--ink);
  }
  .proc-bar--solid {
    background: var(--ink);
  }
  .proc-bar--accent {
    width: 100vw;
    background: var(--accent);
  }
  .proc-demo {
    position: absolute;
    top: 8px;
    left: var(--x);
    width: 4px;
    height: 4px;
    margin-left: -2px;
    border-radius: 50%;
    background: var(--paper);
  }
  .proc-out {
    font-size: 14px;
    line-height: 1.4;
  }
  .proc-out-label {
    color: var(--label);
  }
  .proc-caption {
    margin-top: 24px;
  }
  .proc-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 12px;
    margin: 0 2px;
    border-radius: 6px;
    background: var(--ink);
    vertical-align: -1px;
  }
  .proc-pill::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--paper);
  }
  @media (min-width: 64rem) {
    .proc {
      margin-top: 56px;
    }
    .proc-axis {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
      align-items: end;
      height: 44px;
      padding-bottom: 0;
    }
    .proc-axis-stage {
      display: block;
      grid-column: span 4;
      padding-bottom: 14px;
    }
    .proc-axis-lane {
      grid-column: 5 / span 8;
      height: 100%;
      margin-left: 0;
    }
    .proc-axis-lane > * {
      bottom: 14px;
    }
    .proc-axis-live {
      transform: translateX(-50%);
    }
    .proc-axis-ongoing {
      display: block;
    }
    .proc-row {
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
      row-gap: 0;
      min-height: 140px;
      padding-block: 0;
    }
    .proc-info {
      grid-column: 1 / span 4;
      grid-template-columns: 52px minmax(0, 1fr);
      align-content: start;
      padding: 28px 32px 28px 0;
    }
    .proc-num {
      padding-top: 9px;
    }
    .proc-lane {
      position: relative;
      display: block;
      grid-column: 5 / span 8;
      margin-left: 0;
    }
    .proc-track {
      position: absolute;
      inset: 0;
      height: auto;
    }
    .proc-track::after {
      top: 0;
      bottom: 0;
    }
    .proc-bar {
      top: calc(50% - 30px);
      height: 32px;
      border-radius: 16px;
    }
    .proc-demo {
      top: calc(50% - 18px);
      width: 8px;
      height: 8px;
      margin-left: -4px;
    }
    .proc-out {
      position: absolute;
      top: calc(50% + 12px);
      left: var(--start);
      margin-left: -6px;
      padding: 2px 6px;
      background: var(--paper);
      white-space: nowrap;
    }
    .proc-out--end {
      right: calc(14.286% + 8px);
      left: auto;
      text-align: right;
    }
    .proc-out--edge {
      right: 0;
      left: auto;
      text-align: right;
    }
  }
</style>
```

- [x] **Step 4: Render the section from `Home.astro`**

Replace `src/components/Home.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';
import Approach from './Approach.astro';
import Header from './Header.astro';
import Hero from './Hero.astro';
import Process from './Process.astro';
import Services from './Services.astro';
import Work from './Work.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <Header lang={lang} />
  <main id="main">
    <Hero lang={lang} />
    <Approach lang={lang} />
    <Services lang={lang} />
    <Work lang={lang} />
    <Process lang={lang} />
  </main>
</Base>
```

- [x] **Step 5: Build and run tests**

Run: `npm run build && npm run test:dist && npm run check`
Expected: dist `Tests 78 passed (78)`; `0 errors`.

- [x] **Step 6: Visual check**

Screenshot `section#process` at 1440 (compare with `.playwright-mcp/orig-part3.jpeg`) and 390. Expected at 1440: identical bar geometry (Discover outline 0–11.4 %, Design outline 8.6–28.6 %, Build solid 22.9–77.1 % with four dots, Launch solid 77.1–85.7 %, Run green from the dashed go-live line to the page edge), "Out —" labels under the bars. At 390: stacked stages, each with a thin full-width mini track; no horizontal scrollbar (`document.documentElement.scrollWidth === 390`).

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add process timeline with responsive gantt

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: "Before you hire us" principles

**Files:**

- Create: `src/components/Principles.astro`
- Modify: `src/components/Home.astro`
- Test: `tests/dist/principles.test.ts`

**Interfaces:**

- Consumes: `SectionHeading`; `getDictionary`, `fill`, `pad2`, `Locale`; `site`.
- Produces: `section#studio` with sticky `figure.pr-photo` and `ol.pr-list > li.pr-item` ×5 (`strong.pr-lead` + body text inside `p.pr-text`). Plan 2 animates `.pr-text` colour fill.

- [x] **Step 1: Write the failing test**

`tests/dist/principles.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path principles', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const section = doc.querySelector('section#studio');
  const items = Array.from(section?.querySelectorAll('.pr-item') ?? []);

  it('lists five principles with their lead-ins', () => {
    expect(items.map((li) => text(li.querySelector('.pr-lead')))).toEqual(t.principles.items.map((i) => i.lead));
  });

  it('keeps each full sentence readable', () => {
    expect(items.map((li) => text(li.querySelector('.pr-text')))).toEqual(
      t.principles.items.map((i) => `${i.lead} ${i.body}`),
    );
  });

  it('names the studio in the intro', () => {
    expect(text(section?.querySelector('.sh-intro'))).toContain(site.name);
  });
});
```

- [x] **Step 2: Build and see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — principles assertions.

- [x] **Step 3: Create `src/components/Principles.astro`**

```astro
---
import { site } from '../config/site';
import { fill, getDictionary, pad2, type Locale } from '../i18n';
import SectionHeading from './ui/SectionHeading.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);
---

<section id="studio" class="principles container" aria-labelledby="studio-title">
  <SectionHeading
    id="studio-title"
    title={t.principles.title}
    count={pad2(t.principles.items.length)}
    intro={fill(t.principles.intro, { name: site.name })}
  />
  <div class="pr-grid">
    <figure class="pr-photo" aria-hidden="true">
      <div class="pr-frame"><span class="label">{t.principles.photo}</span></div>
    </figure>
    <ol class="pr-list">
      {
        t.principles.items.map((item, i) => (
          <li class="pr-item">
            <span class="pr-num">{pad2(i + 1)}</span>
            <p class="pr-text">
              <strong class="pr-lead">{item.lead}</strong> {item.body}
            </p>
          </li>
        ))
      }
    </ol>
  </div>
</section>

<style>
  .principles {
    padding-bottom: var(--section-y);
  }
  .pr-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
    align-items: start;
    margin-top: 8px;
  }
  .pr-photo {
    grid-column: 1 / -1;
    margin-top: 32px;
  }
  .pr-frame {
    display: flex;
    align-items: flex-end;
    aspect-ratio: 16 / 10;
    padding: 18px;
    border-radius: 12px;
    background: radial-gradient(120% 90% at 26% 18%, #f7f5f1 0%, #e6e2db 46%, #d2cdc4 100%);
  }
  .pr-frame .label {
    font-size: 11px;
  }
  .pr-list {
    grid-column: 1 / -1;
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }
  .pr-item {
    display: grid;
    grid-template-columns: 40px minmax(0, 1fr);
    padding: 26px 0 28px;
    border-bottom: 1px solid var(--line);
  }
  .pr-num {
    padding-top: 9px;
    font-size: 14px;
    color: var(--label);
    font-variant-numeric: tabular-nums;
  }
  .pr-text {
    font-size: var(--fs-h3);
    font-weight: 300;
    line-height: 1.26;
    letter-spacing: -0.028em;
    color: var(--label);
    text-wrap: pretty;
  }
  .pr-lead {
    font-weight: 400;
    color: var(--ink);
  }
  @media (min-width: 64rem) {
    .pr-photo {
      position: sticky;
      top: calc(var(--header-h) + 24px);
      grid-column: span 4;
      margin-top: 40px;
    }
    .pr-frame {
      aspect-ratio: 4 / 5;
    }
    .pr-list {
      grid-column: 6 / span 7;
      margin-top: 0;
    }
    .pr-item {
      grid-template-columns: 56px minmax(0, 1fr);
      padding: 30px 0 32px;
    }
    .pr-num {
      padding-top: 11px;
    }
  }
</style>
```

- [x] **Step 4: Render the section from `Home.astro`**

Replace `src/components/Home.astro` with:

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';
import Approach from './Approach.astro';
import Header from './Header.astro';
import Hero from './Hero.astro';
import Principles from './Principles.astro';
import Process from './Process.astro';
import Services from './Services.astro';
import Work from './Work.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <Header lang={lang} />
  <main id="main">
    <Hero lang={lang} />
    <Approach lang={lang} />
    <Services lang={lang} />
    <Work lang={lang} />
    <Process lang={lang} />
    <Principles lang={lang} />
  </main>
</Base>
```

- [x] **Step 5: Build and run tests**

Run: `npm run build && npm run test:dist && npm run check`
Expected: dist `Tests 84 passed (84)`; `0 errors`.

- [x] **Step 6: Visual check**

Screenshot `section#studio` at 1440 and 390. Expected at 1440: photo placeholder left (columns 1–4) staying pinned while the list scrolls; list right (columns 6–12), 30 px text, ink lead-ins, grey body, hairlines between items.

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add principles section with sticky photo

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Contact form, contact details and footer

**Files:**

- Create: `src/lib/form.ts`, `src/scripts/contact-form.ts`, `src/components/Contact.astro`, `src/components/Footer.astro`
- Modify: `src/components/Home.astro`
- Test: `tests/unit/form.test.ts`, `tests/dist/contact.test.ts`

**Interfaces:**

- Consumes: `Button`, `Brand`, `Clock` (Task 4); `getDictionary`, `Locale`; `site`; `PUBLIC_WEB3FORMS_KEY` from `astro:env/client`.
- Produces:
  - `validateContact(values: ContactValues, messages: ValidationMessages): FieldErrors`, `buildMailto(to: string, subject: string, values: ContactValues): string`, `toPayload(values: ContactValues, meta: Record<string, string>): Record<string, string>`, `MIN_MESSAGE_LENGTH = 10`, types `ContactValues`, `ValidationMessages`, `FieldErrors`, `FieldName`.
  - `initContactForm(): void` (sets `form[data-state]` to `idle | sending | success | error`).
  - `section#contact.contact` (dark) with `form[data-contact-form]`; `footer.site-footer`.

- [x] **Step 1: Write the failing unit test**

`tests/unit/form.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { buildMailto, toPayload, validateContact, type ContactValues } from '../../src/lib/form';

const messages = { required: 'REQ', email: 'EMAIL', messageShort: 'SHORT' };
const valid: ContactValues = {
  name: 'Ana',
  email: 'ana@firma.ba',
  company: '',
  message: 'Treba nam portal za narudžbe.',
  needs: ['Website'],
};

describe('validateContact', () => {
  it('accepts a complete inquiry', () => {
    expect(validateContact(valid, messages)).toEqual({});
  });

  it('requires name, email and message', () => {
    expect(validateContact({ ...valid, name: '  ', email: '', message: '' }, messages)).toEqual({
      name: 'REQ',
      email: 'REQ',
      message: 'REQ',
    });
  });

  it('rejects a malformed email', () => {
    expect(validateContact({ ...valid, email: 'ana@firma' }, messages)).toEqual({ email: 'EMAIL' });
  });

  it('asks for at least ten characters of message', () => {
    expect(validateContact({ ...valid, message: 'Hi there' }, messages)).toEqual({ message: 'SHORT' });
  });
});

describe('buildMailto', () => {
  it('prefills subject and a signed body', () => {
    const body = 'Treba nam portal za narudžbe.\n\n— Ana · ana@firma.ba\n\nWebsite';
    expect(buildMailto('hello@x.com', 'New inquiry', valid)).toBe(
      `mailto:hello@x.com?subject=${encodeURIComponent('New inquiry')}&body=${encodeURIComponent(body)}`,
    );
  });
});

describe('toPayload', () => {
  it('trims fields, joins needs and keeps meta fields', () => {
    expect(toPayload({ ...valid, name: ' Ana ', needs: ['Website', 'App'] }, { access_key: 'k' })).toEqual({
      access_key: 'k',
      name: 'Ana',
      email: 'ana@firma.ba',
      company: '',
      message: 'Treba nam portal za narudžbe.',
      needs: 'Website, App',
    });
  });
});
```

- [x] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../../src/lib/form"`.

- [x] **Step 3: Implement `src/lib/form.ts`**

```ts
export type FieldName = 'name' | 'email' | 'message';

export interface ContactValues {
  name: string;
  email: string;
  company: string;
  message: string;
  needs: string[];
}

export interface ValidationMessages {
  required: string;
  email: string;
  messageShort: string;
}

export type FieldErrors = Partial<Record<FieldName, string>>;

export const MIN_MESSAGE_LENGTH = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContact(values: ContactValues, messages: ValidationMessages): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const email = values.email.trim();
  const message = values.message.trim();

  if (!name) errors.name = messages.required;
  if (!email) errors.email = messages.required;
  else if (!EMAIL.test(email)) errors.email = messages.email;
  if (!message) errors.message = messages.required;
  else if (message.length < MIN_MESSAGE_LENGTH) errors.message = messages.messageShort;

  return errors;
}

export function buildMailto(to: string, subject: string, values: ContactValues): string {
  const signature = [values.name, values.company, values.email]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' · ');
  const needs = values.needs.length > 0 ? `\n\n${values.needs.join(', ')}` : '';
  const body = `${values.message.trim()}\n\n— ${signature}${needs}`;
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function toPayload(values: ContactValues, meta: Record<string, string>): Record<string, string> {
  return {
    ...meta,
    name: values.name.trim(),
    email: values.email.trim(),
    company: values.company.trim(),
    message: values.message.trim(),
    needs: values.needs.join(', '),
  };
}
```

- [x] **Step 4: Run the unit tests**

Run: `npm test`
Expected: PASS — `Tests 21 passed (21)`.

- [x] **Step 5: Write the failing contact dist test**

`tests/dist/contact.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path contact', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const section = doc.querySelector('section#contact');
  const form = section?.querySelector('form[data-contact-form]');

  it('posts to Web3Forms', () => {
    expect(form?.getAttribute('action')).toBe('https://api.web3forms.com/submit');
    expect(form?.getAttribute('method')?.toLowerCase()).toBe('post');
  });

  it('offers the four needs as checkboxes', () => {
    const values = Array.from(form?.querySelectorAll('input[type="checkbox"][name="needs"]') ?? []).map((i) =>
      i.getAttribute('value'),
    );
    const n = t.contact.needs;
    expect(values).toEqual([n.web, n.app, n.sys, n.unsure]);
  });

  it('requires name, email and message and links each to its error slot', () => {
    for (const name of ['name', 'email', 'message']) {
      const input = form?.querySelector(`[name="${name}"]`);
      expect(input?.hasAttribute('required'), name).toBe(true);
      const errorId = input?.getAttribute('aria-describedby');
      expect(form?.querySelector(`#${errorId}`)?.getAttribute('data-error-for'), name).toBe(name);
    }
  });

  it('has a hidden honeypot and a polite status region', () => {
    expect(form?.querySelector('input[name="botcheck"]')?.hasAttribute('hidden')).toBe(true);
    expect(form?.querySelector('[data-form-status]')?.getAttribute('role')).toBe('status');
  });

  it('carries localized messages for the script', () => {
    expect(form?.getAttribute('data-msg-required')).toBe(t.contact.errors.required);
    expect(form?.getAttribute('data-mail-to')).toBe(site.email);
  });

  it('shows phone, address and hours', () => {
    const info = text(section?.querySelector('.ct-info'));
    expect(info).toContain(site.phone);
    expect(info).toContain(site.address.country[lang]);
    expect(info).toContain(site.hours[lang]);
  });
});

describe.each(pages)('$path footer', ({ path, lang }) => {
  const doc = loadPage(path);
  const footer = doc.querySelector('footer.site-footer');

  it('lists the social links', () => {
    expect(Array.from(footer?.querySelectorAll('nav a') ?? []).map(text)).toEqual(site.socials.map((s) => s.label));
  });

  it('shows the coordinates with a live clock and UTC offset', () => {
    expect(text(footer)).toContain(site.coordinates);
    expect(footer?.querySelector('time[data-clock][data-with-offset="true"]')?.getAttribute('data-locale')).toBe(lang);
  });
});
```

- [x] **Step 6: Build and see it fail**

Run: `npm run build && npm run test:dist`
Expected: FAIL — contact and footer assertions.

- [x] **Step 7: Create `src/scripts/contact-form.ts`**

```ts
import {
  buildMailto,
  toPayload,
  validateContact,
  type ContactValues,
  type FieldErrors,
  type FieldName,
} from '../lib/form';

const ENDPOINT = 'https://api.web3forms.com/submit';
const FIELDS: FieldName[] = ['name', 'email', 'message'];

type FormState = 'idle' | 'sending' | 'success' | 'error';

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('form[data-contact-form]');
  if (!form) return;

  const d = form.dataset;
  const status = form.querySelector<HTMLElement>('[data-form-status]');
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const submitLabel = submit?.querySelector<HTMLElement>('.btn-label');
  const idleLabel = submitLabel?.textContent ?? '';
  const messages = { required: d.msgRequired ?? '', email: d.msgEmail ?? '', messageShort: d.msgShort ?? '' };
  let attempted = false;

  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;

  const read = (): ContactValues => {
    const data = new FormData(form);
    const str = (key: string) => String(data.get(key) ?? '');
    return {
      name: str('name'),
      email: str('email'),
      company: str('company'),
      message: str('message'),
      needs: data.getAll('needs').map(String),
    };
  };

  const showErrors = (errors: FieldErrors): void => {
    for (const name of FIELDS) {
      const message = errors[name];
      field(name)?.setAttribute('aria-invalid', message ? 'true' : 'false');
      const slot = form.querySelector<HTMLElement>(`[data-error-for="${name}"]`);
      if (slot) {
        slot.textContent = message ?? '';
        slot.hidden = !message;
      }
    }
  };

  const setState = (state: FormState): void => {
    form.dataset.state = state;
    if (submit) submit.disabled = state === 'sending';
    if (submitLabel) submitLabel.textContent = state === 'sending' ? (d.msgSending ?? idleLabel) : idleLabel;
  };

  const showStatus = (message: string, mailto?: string): void => {
    if (!status) return;
    status.replaceChildren(document.createTextNode(message));
    if (mailto) {
      const link = document.createElement('a');
      link.href = mailto;
      link.textContent = d.mailTo ?? '';
      status.append(' ', link);
    }
  };

  form.addEventListener('focusout', () => {
    if (attempted) showErrors(validateContact(read(), messages));
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    attempted = true;
    const values = read();
    const errors = validateContact(values, messages);
    showErrors(errors);
    const firstInvalid = FIELDS.find((name) => errors[name]);
    if (firstInvalid) {
      field(firstInvalid)?.focus();
      return;
    }
    if ((field('botcheck') as HTMLInputElement | null)?.checked) return;

    const subject = d.subject ?? '';
    const mailto = buildMailto(d.mailTo ?? '', subject, values);
    const key = field('access_key')?.value ?? '';
    if (!key) {
      if (import.meta.env.DEV) console.warn('PUBLIC_WEB3FORMS_KEY is not set — the contact form falls back to mailto:.');
      window.location.href = mailto;
      return;
    }

    setState('sending');
    showStatus('');
    try {
      const meta = { access_key: key, subject, from_name: d.fromName ?? '', locale: document.documentElement.lang };
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(toPayload(values, meta)),
      });
      const result = (await response.json()) as { success?: boolean };
      if (!response.ok || !result.success) throw new Error('Submission rejected');
      form.reset();
      attempted = false;
      showErrors({});
      setState('success');
      showStatus(d.msgSuccess ?? '');
    } catch {
      setState('error');
      showStatus(d.msgError ?? '', mailto);
    }
  });
}
```

- [x] **Step 8: Create `src/components/Contact.astro`**

```astro
---
import { PUBLIC_WEB3FORMS_KEY } from 'astro:env/client';
import { site } from '../config/site';
import { getDictionary, type Locale } from '../i18n';
import Button from './ui/Button.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const c = getDictionary(lang).contact;
const needs = [c.needs.web, c.needs.app, c.needs.sys, c.needs.unsure];
---

<section id="contact" class="contact" aria-labelledby="contact-title">
  <div class="container">
    <div class="ct-grid">
      <div class="ct-intro">
        <span class="label ct-label">{c.label}</span>
        <h2 id="contact-title" class="ct-title">{c.title}</h2>
        <p class="ct-lead">{c.lead}</p>
        <a class="ct-mail" href={`mailto:${site.email}`}>{site.email}</a>
      </div>

      <form
        class="cf"
        action="https://api.web3forms.com/submit"
        method="POST"
        novalidate
        data-contact-form
        data-state="idle"
        data-mail-to={site.email}
        data-subject={c.subject}
        data-from-name={site.name}
        data-msg-required={c.errors.required}
        data-msg-email={c.errors.email}
        data-msg-short={c.errors.messageShort}
        data-msg-sending={c.sending}
        data-msg-success={c.success}
        data-msg-error={c.error}
      >
        <input type="hidden" name="access_key" value={PUBLIC_WEB3FORMS_KEY ?? ''} />
        <input type="hidden" name="subject" value={c.subject} />
        <input type="hidden" name="from_name" value={site.name} />
        <input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" hidden />

        <fieldset class="cf-needs">
          <legend class="label cf-legend">{c.needs.legend}</legend>
          <div class="cf-chips">
            {
              needs.map((label) => (
                <label class="cf-chip">
                  <input type="checkbox" name="needs" value={label} />
                  <span>{label}</span>
                </label>
              ))
            }
          </div>
        </fieldset>

        <div class="cf-field">
          <label class="label cf-label" for="cf-name">{c.fields.name}</label>
          <input class="cf-input" id="cf-name" type="text" name="name" autocomplete="name" placeholder={c.fields.namePh} required aria-describedby="cf-err-name" />
          <p class="cf-error" id="cf-err-name" data-error-for="name" hidden></p>
        </div>
        <div class="cf-field">
          <label class="label cf-label" for="cf-email">{c.fields.email}</label>
          <input class="cf-input" id="cf-email" type="email" name="email" autocomplete="email" inputmode="email" placeholder={c.fields.emailPh} required aria-describedby="cf-err-email" />
          <p class="cf-error" id="cf-err-email" data-error-for="email" hidden></p>
        </div>
        <div class="cf-field cf-field--wide">
          <label class="label cf-label" for="cf-company">{c.fields.company}</label>
          <input class="cf-input" id="cf-company" type="text" name="company" autocomplete="organization" placeholder={c.fields.companyPh} />
        </div>
        <div class="cf-field cf-field--wide">
          <label class="label cf-label" for="cf-message">{c.fields.message}</label>
          <textarea class="cf-input cf-textarea" id="cf-message" name="message" rows="3" placeholder={c.fields.messagePh} required minlength="10" aria-describedby="cf-err-message"></textarea>
          <p class="cf-error" id="cf-err-message" data-error-for="message" hidden></p>
        </div>

        <div class="cf-foot">
          <p class="cf-note">{c.note}</p>
          <Button type="submit" variant="light" size="l">{c.submit}</Button>
        </div>
        <p class="cf-status" role="status" aria-live="polite" data-form-status></p>
      </form>
    </div>

    <div class="ct-info">
      <div class="ct-item">
        <span class="label">{c.info.phone}</span>
        <span>{site.phone}</span>
      </div>
      <div class="ct-item">
        <span class="label">{c.info.studio}</span>
        <span>{site.address.street[lang]}<br />{site.address.city}, {site.address.country[lang]}</span>
      </div>
      <div class="ct-item">
        <span class="label">{c.info.hours}</span>
        <span>{site.hours[lang]}</span>
      </div>
      <div class="ct-call"><Button href={site.callUrl} variant="ghost" size="s">{c.info.call}</Button></div>
    </div>
  </div>
</section>

<script>
  import { initContactForm } from '../scripts/contact-form';
  initContactForm();
</script>

<style>
  .contact {
    padding-top: var(--section-y);
    padding-bottom: 40px;
    background: var(--night);
    color: var(--paper);
  }
  .contact .label {
    color: var(--night-muted);
  }
  .ct-grid {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
    row-gap: 64px;
    align-items: start;
  }
  .ct-intro {
    display: flex;
    flex-direction: column;
    gap: 28px;
    grid-column: 1 / -1;
  }
  .ct-title {
    font-size: var(--fs-display);
    font-weight: 300;
    line-height: 0.95;
    letter-spacing: -0.05em;
  }
  .ct-lead {
    max-width: 28.75rem;
    font-size: var(--fs-body-l);
    line-height: 1.6;
    color: var(--night-muted);
    text-wrap: pretty;
  }
  .ct-mail {
    align-self: flex-start;
    margin-top: 12px;
    font-size: var(--fs-mail);
    font-weight: 300;
    line-height: 1.2;
    letter-spacing: -0.03em;
    text-decoration: underline;
    text-decoration-color: var(--night-line);
    text-decoration-thickness: 1px;
    text-underline-offset: 8px;
    overflow-wrap: anywhere;
  }
  .ct-mail:hover {
    text-decoration-color: var(--paper);
  }
  .cf {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-column: 1 / -1;
    gap: 36px 24px;
  }
  .cf-legend {
    margin-bottom: 16px;
    font-size: 11px;
  }
  .cf-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .cf-chip {
    position: relative;
    display: inline-flex;
    align-items: center;
    height: 44px;
    padding: 0 18px;
    border: 1px solid var(--night-chip);
    border-radius: 999px;
    font-size: 15px;
    cursor: pointer;
    user-select: none;
    transition:
      background-color 0.25s var(--ease-std),
      color 0.25s var(--ease-std),
      border-color 0.25s var(--ease-std);
  }
  .cf-chip input {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    cursor: pointer;
  }
  .cf-chip:hover {
    border-color: var(--night-muted);
  }
  .cf-chip:has(input:checked) {
    border-color: var(--paper);
    background: var(--paper);
    color: var(--ink);
  }
  .cf-chip:has(input:focus-visible) {
    outline: 2px solid var(--paper);
    outline-offset: 4px;
  }
  .cf-field {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .cf-label {
    font-size: 11px;
  }
  .cf-input {
    width: 100%;
    height: 44px;
    padding: 0 0 12px;
    border: 0;
    border-bottom: 1px solid var(--night-line);
    border-radius: 0;
    background: transparent;
    color: var(--paper);
    font-size: var(--fs-input);
    font-weight: 300;
    transition: border-color 0.25s var(--ease-std);
  }
  .cf-textarea {
    height: auto;
    min-height: 5.5em;
    line-height: 1.5;
    resize: vertical;
  }
  .cf-input::placeholder {
    color: var(--night-faint);
  }
  .cf-input:focus {
    outline: none;
    border-bottom-color: var(--paper);
  }
  .cf-input[aria-invalid='true'] {
    border-bottom-color: var(--night-error);
  }
  .cf-input:-webkit-autofill {
    -webkit-text-fill-color: var(--paper);
    transition: background-color 9999s ease-out 0s;
  }
  .cf-error {
    font-size: 13px;
    line-height: 1.4;
    color: var(--night-error);
  }
  .cf-foot {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 20px 24px;
  }
  .cf-note {
    font-size: 14px;
    line-height: 1.5;
    color: var(--night-muted);
  }
  .cf-status {
    min-height: 1.5em;
    font-size: 15px;
    line-height: 1.5;
  }
  .cf-status :global(a) {
    color: var(--paper);
    text-underline-offset: 4px;
  }
  .ct-info {
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
    row-gap: 28px;
    margin-top: 96px;
    padding-top: 32px;
    border-top: 1px solid var(--night-line);
  }
  .ct-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    grid-column: 1 / -1;
    font-size: 16px;
    line-height: 1.55;
  }
  .ct-item .label {
    font-size: 11px;
    color: var(--night-faint);
  }
  .ct-call {
    grid-column: 1 / -1;
  }
  @media (min-width: 48rem) {
    .cf {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 40px 24px;
    }
    .cf-needs,
    .cf-field--wide,
    .cf-foot,
    .cf-status {
      grid-column: span 2;
    }
    .ct-item {
      grid-column: span 4;
    }
  }
  @media (min-width: 64rem) {
    .ct-intro {
      grid-column: span 6;
      gap: 32px;
    }
    .cf {
      grid-column: 8 / span 5;
      margin-top: 8px;
    }
    .ct-info {
      margin-top: 128px;
    }
    .ct-item {
      grid-column: span 3;
    }
    .ct-call {
      grid-column: 10 / span 3;
      justify-self: end;
      align-self: start;
    }
  }
</style>
```

- [x] **Step 9: Create `src/components/Footer.astro`**

```astro
---
import { site } from '../config/site';
import { getDictionary, type Locale } from '../i18n';
import Brand from './Brand.astro';
import Clock from './Clock.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
const t = getDictionary(lang);
const year = new Date().getFullYear();
---

<footer class="site-footer">
  <div class="container">
    <div class="footer-inner">
      <div class="footer-brand">
        <Brand lang={lang} size="s" tone="paper" link={false} />
        <span>© {year}</span>
      </div>
      <nav class="footer-nav" aria-label={t.a11y.footerNav}>
        {site.socials.map((s) => <a href={s.href}>{s.label}</a>)}
      </nav>
      <p class="footer-geo">{t.clockCity} · {site.coordinates} · <Clock lang={lang} withOffset /></p>
    </div>
  </div>
</footer>

<style>
  .site-footer {
    padding: clamp(96px, 11vw, 160px) 0 40px;
    background: var(--night);
    color: var(--night-muted);
    font-size: 13px;
  }
  .footer-inner {
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-top: 28px;
    border-top: 1px solid var(--night-line);
  }
  .footer-brand {
    display: flex;
    align-items: center;
    gap: 18px;
  }
  .footer-nav {
    display: flex;
    gap: 28px;
  }
  .footer-nav a {
    color: var(--paper);
    text-decoration: none;
    background-image: linear-gradient(currentColor, currentColor);
    background-position: 0 100%;
    background-repeat: no-repeat;
    background-size: 0 1px;
    transition: background-size 0.35s var(--ease-std);
  }
  .footer-nav a:hover {
    background-size: 100% 1px;
  }
  .footer-geo {
    font-variant-numeric: tabular-nums;
  }
  @media (min-width: 64rem) {
    .footer-inner {
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
      align-items: center;
    }
    .footer-brand {
      grid-column: span 4;
    }
    .footer-nav {
      grid-column: 5 / span 4;
    }
    .footer-geo {
      grid-column: 9 / span 4;
      justify-self: end;
    }
  }
</style>
```

- [x] **Step 10: Finish `Home.astro`**

```astro
---
import Base from '../layouts/Base.astro';
import type { Locale } from '../i18n';
import Approach from './Approach.astro';
import Contact from './Contact.astro';
import Footer from './Footer.astro';
import Header from './Header.astro';
import Hero from './Hero.astro';
import Principles from './Principles.astro';
import Process from './Process.astro';
import Services from './Services.astro';
import Work from './Work.astro';

interface Props {
  lang: Locale;
}

const { lang } = Astro.props;
---

<Base lang={lang}>
  <Header lang={lang} />
  <main id="main">
    <Hero lang={lang} />
    <Approach lang={lang} />
    <Services lang={lang} />
    <Work lang={lang} />
    <Process lang={lang} />
    <Principles lang={lang} />
    <Contact lang={lang} />
  </main>
  <Footer lang={lang} />
</Base>
```

- [x] **Step 11: Build and run everything**

Run: `npm run build && npm run test:dist && npm test && npm run check`
Expected: dist `Tests 100 passed (100)`; unit `Tests 21 passed (21)`; check `0 errors`.

- [x] **Step 12: Behaviour check in the browser**

Preview at 1440×900, scroll to `#contact`. With the Playwright MCP tools:
1. Click "Send" with empty fields → three error messages appear, focus moves to Name, inputs get `aria-invalid="true"`.
2. Fill Name `Test`, Email `test@example.com`, Message `Testiramo formu.` → click Send → with no `PUBLIC_WEB3FORMS_KEY` the browser navigates to a `mailto:` URL (check with `browser_network_requests` / console that no request went to Web3Forms).
3. Click two chips → they turn light; Tab moves focus through chips with a visible outline.
Screenshot `t11-contact-1440.png` and `t11-contact-390.png`.

- [x] **Step 13: Commit**

```bash
git add -A
git commit -m "feat: add contact form with validation and footer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: Whole-page verification and fixes

**Files:**

- Test: `tests/dist/page.test.ts`
- Modify: any component whose rendering deviates (fixes go in the component's own `<style>`)

**Interfaces:**

- Consumes: everything above.
- Produces: a verified Plan-1 site; screenshots in `.playwright-mcp/` (git-ignored).

- [x] **Step 1: Write the whole-page test**

`tests/dist/page.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadPage, pages } from './helpers';

describe.each(pages)('$path page', ({ path }) => {
  const doc = loadPage(path);

  it('renders every section in order', () => {
    expect(Array.from(doc.querySelectorAll('main > section')).map((s) => s.id)).toEqual([
      'top',
      'approach',
      'services',
      'work',
      'process',
      'studio',
      'contact',
    ]);
  });

  it('keeps headings in order: one h1, then h2 sections', () => {
    const levels = Array.from(doc.querySelectorAll('main h1, main h2, main h3')).map((h) => Number(h.tagName[1]));
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1);
  });

  it('uses no inline styles except data custom properties', () => {
    const styled = Array.from(doc.querySelectorAll('[style]')).map((el) => el.getAttribute('style') ?? '');
    for (const style of styled) {
      for (const declaration of style.split(';').map((s) => s.trim()).filter(Boolean)) {
        expect(declaration.startsWith('--'), declaration).toBe(true);
      }
    }
  });

  it('gives every image an alt attribute', () => {
    expect(Array.from(doc.querySelectorAll('img')).every((img) => img.hasAttribute('alt'))).toBe(true);
  });
});
```

- [x] **Step 2: Run it**

Run: `npm run build && npm run test:dist`
Expected: PASS — `Tests 108 passed (108)`. If the inline-style test fails, find the element (the failing declaration is printed) and move that style into the component's `<style>` block, then re-run.

- [x] **Step 3: Measure key sizes at 1440 and 390**

Preview server running. At 1440×900 run with `browser_evaluate`:

```js
() => {
  const fs = (sel) => getComputedStyle(document.querySelector(sel)).fontSize;
  return {
    h1: fs('.hero-title'),
    h2: fs('#services-title'),
    service: fs('.svc-title'),
    lead: fs('.approach-lead'),
    contact: fs('.ct-title'),
    scrollWidth: document.documentElement.scrollWidth,
  };
}
```

Expected at 1440: `h1 92px`, `h2 76px`, `service 54px`, `lead 46px`, `contact 112px`, `scrollWidth 1440`.
At 390×844 expected: `h1 44px`, `h2 44px`, `service 32px`, `lead 28px`, `contact 56px`, `scrollWidth 390`.

- [x] **Step 4: Full-page screenshots in both languages**

For widths 390, 768, 1024, 1440, 1920 and paths `/` and `/bs/`: `browser_resize` (height 900), `browser_navigate`, `browser_take_screenshot` with `fullPage: true`, `type: 'jpeg'`, filename `.playwright-mcp/p1-{lang}-{width}.jpeg`. Split tall captures into 1500 px slices with Python/PIL (as done for the reference) and review each slice.

Check list (fix in the owning component, rebuild, re-shoot until all hold):
- Nothing overflows horizontally; no text overlaps (e.g. the Process axis labels at 1024; long Bosnian headings).
- 1440 matches `reference/` slices (`.playwright-mcp/orig-part0…5.jpeg`) in spacing, sizes and colours.
- 390: every section is single-column and readable; hero order = title → rings → lead → CTA → caption.
- Bosnian page shows no English leftovers and no clipped words.
- `browser_console_messages` level `error` is empty on both pages.

- [x] **Step 5: Keyboard pass**

At 1440: press Tab from the top — order is skip link → logo → nav links → EN/BS → CTA → hero CTA → e-mail → … → form fields → Send → footer links. Every focused element shows a visible outline. On 390: Tab reaches "Menu"; Enter opens the dialog; Tab cycles inside it; Escape closes and focus returns to "Menu".

- [x] **Step 6: Run the complete suite**

Run: `npm test && npm run build && npm run test:dist && npm run check`
Expected: unit 21 passed, dist 108 passed, `0 errors`.

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "test: verify full page structure and fix layout details

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Implementation notes (deviations found during execution)

| Where | Change | Why |
| --- | --- | --- |
| `.gitignore` | `dist/` → `/dist/`, `.astro/` → `/.astro/`. | The unanchored rule also ignored `tests/dist/`, so the built-page tests were never committed. |
| `Approach.astro` | `.hl { white-space: nowrap }`. | The ring dot before "automation" dangled at the end of a line (also in the mockup). |
| `Services.astro`, `Work.astro` | Hover shifts wrapped in `@media (hover: hover) and (pointer: fine)`. | A tap on a phone left the hover state stuck. |
| `Process.astro` | Section is full-bleed (`overflow-x: clip`) with an inner `.container`; caption spaces are explicit `{' '}`. | The run bar widened the page; Astro dropped the spaces around the demo pill ("Eachdotis"). |
| `Footer.astro` | `box-shadow: 0 -2px 0 var(--night)`. | A hairline of paper showed where contact ends on a fractional pixel. |
| Header, Hero, Process, Work, Footer | Extra rules for 1024–1279 px (hero up to 1439 px): no header clock, tighter nav, rings one column right, single-line meta row, no "Ongoing" label, shifted "Your project" and footer columns. | Overlaps that only appear on small laptops. |
