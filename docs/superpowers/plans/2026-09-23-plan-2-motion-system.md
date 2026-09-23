# Plan 2 — Motion System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Plan-1 site its motion layer — smooth scrolling, restrained scroll reveals, a header that gets out of the way, an animated services accordion, living project cards, the scroll-scrubbed Process timeline (second set piece), the reading-fill on the principles, the dark contact "sheet" — all of it switched off cleanly for `prefers-reduced-motion`.

**Architecture:** One module entry (`src/scripts/motion/index.ts`) loaded from `Base.astro` registers GSAP (ScrollTrigger, SplitText) and starts feature modules inside `gsap.matchMedia('(prefers-reduced-motion: no-preference)')`, so reverting is automatic. Declarative `data-reveal` attributes in the markup drive a single reveal module. The hero intro is pure CSS (runs at first paint, never waits for JS, keeps LCP fast). Small pure helpers live in `src/lib/motion.ts` and `src/lib/process.ts` with Vitest tests; everything visual is verified in the browser with the Playwright MCP tools.

**Tech Stack:** GSAP 3.15 (ScrollTrigger, SplitText — free for commercial use), Lenis 1.3, Astro 7 scoped CSS, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-09-23-studio-site-redesign-design.md` §8, §10, §13, §14. Plan 2 of 4; the rings (hero → approach story) are Plan 3.

## Global Constraints

- Run every `npm`/`npx` command with Node 24.21.0 (`export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH";` in Git Bash).
- Versions: `gsap@^3.15.0`, `lenis@^1.3.26`.
- Motion runs only under `(prefers-reduced-motion: no-preference)`. Under `reduce`: no Lenis, no reveals, no pins, no scrubs; the header never hides; the accordion opens instantly; content is in its final state.
- Lenis only for `(pointer: fine)`; touch devices keep native scrolling.
- At most two pinned sections on the page: Process (this plan) and the rings (Plan 3).
- Animate only `transform`, `opacity`, `clip-path` (plus text `color` for the principles fill). No layout-property tweens except the accordion `height`.
- Easing vocabulary: `expo.out` for reveals, `expo.inOut` for the accordion, `none` for scrubs; CSS uses `--ease-out` / `--ease-std`.
- The hero intro is CSS-only and must not depend on JS.
- Anything hidden before JS runs is hidden only under `html.js-motion:not(.motion-ready)`; the inline head guard removes `js-motion` after 3 s if the motion bundle never initialises.
- Initial JS (GSAP core + ScrollTrigger + SplitText + Lenis + app code) ≤ 70 KB gzip.
- No `style=""` attributes except data-carrying custom properties (`--i`, `--start`, …).
- Commit after each task with the `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` trailer.

## File Map

```text
package.json                              + gsap, lenis
src/lib/motion.ts                         parseReveal, nextHeaderHidden, headerIsSolid, clamp, magneticOffset
src/lib/process.ts                        GO_LIVE, PROCESS_BARS, barLength, barSchedule (shared by component + script)
src/styles/motion.css                     pre-JS hiding guard, SplitText mask padding
src/layouts/Base.astro                    inline guard script, motion.css, motion entry script
src/scripts/motion/index.ts               bootstrap
src/scripts/motion/lenis.ts               smooth scroll + accessible same-page anchors
src/scripts/motion/reveal.ts              data-reveal → animations
src/scripts/motion/header.ts              solid / hidden / dark-tone states
src/scripts/motion/services.ts            animated exclusive accordion + illustration timelines
src/scripts/motion/work.ts                mockup parallax + cursor pill
src/scripts/motion/process.ts             pinned, scrubbed Gantt
src/scripts/motion/principles.ts          word-by-word colour fill
src/scripts/motion/contact.ts             dark sheet + page dim
src/scripts/motion/magnetic.ts            magnetic CTAs
src/components/*                          data-reveal attributes and small markup hooks (listed per task)
src/i18n/types.ts, en.ts, bs.ts           + projects[].cursor, contact.sent
tests/unit/motion.test.ts, tests/unit/process.test.ts, tests/dist/motion.test.ts
```

---

### Task 1: Motion foundation — dependencies, pure helpers, guard, bootstrap, Lenis

**Files:**
- Modify: `package.json` (via npm), `src/layouts/Base.astro`
- Create: `src/lib/motion.ts`, `src/styles/motion.css`, `src/scripts/motion/lenis.ts`, `src/scripts/motion/index.ts` (starts only Lenis for now; each later task registers its own module there)
- Test: `tests/unit/motion.test.ts`, `tests/dist/motion.test.ts`

**Interfaces:**
- Produces: `parseReveal(dataset: { reveal?: string; revealDelay?: string }): { type: RevealType; delay: number } | null`; `REVEAL_TYPES`; `nextHeaderHidden(s: { y: number; lastY: number; hidden: boolean; locked: boolean }, minY = 240, threshold = 6): boolean`; `headerIsSolid(y: number, limit = 80): boolean`; `clamp(v, min, max)`; `magneticOffset(px, py, box: Box, strength = 0.25, max = 14): { x: number; y: number }`; type `Box = { left; top; width; height }`.
- Produces: `initSmoothScroll(): () => void` (no-op cleanup for coarse pointers).
- Produces: `html.js-motion` (set before first paint when motion is allowed) and `html.motion-ready` (set by the bootstrap).

- [ ] **Step 1: Install the libraries**

```bash
export PATH="/c/Users/letic/AppData/Roaming/nvm/v24.21.0:$PATH"
cd /c/projects/nice
npm install gsap@^3.15.0 lenis@^1.3.26
```

Expected: `added 2 packages`.

- [ ] **Step 2: Write the failing unit tests**

`tests/unit/motion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { clamp, headerIsSolid, magneticOffset, nextHeaderHidden, parseReveal } from '../../src/lib/motion';

describe('parseReveal', () => {
  it('reads a known type with no delay', () => {
    expect(parseReveal({ reveal: 'lines' })).toEqual({ type: 'lines', delay: 0 });
  });

  it('reads a positive delay in seconds', () => {
    expect(parseReveal({ reveal: 'fade-up', revealDelay: '0.25' })).toEqual({ type: 'fade-up', delay: 0.25 });
  });

  it('ignores unknown or missing types', () => {
    expect(parseReveal({ reveal: 'spin' })).toBeNull();
    expect(parseReveal({})).toBeNull();
  });

  it('treats negative or malformed delays as zero', () => {
    expect(parseReveal({ reveal: 'fade', revealDelay: '-1' })?.delay).toBe(0);
    expect(parseReveal({ reveal: 'fade', revealDelay: 'soon' })?.delay).toBe(0);
  });
});

describe('nextHeaderHidden', () => {
  const base = { y: 1000, lastY: 1000, hidden: false, locked: false };

  it('never hides near the top of the page', () => {
    expect(nextHeaderHidden({ ...base, y: 120, lastY: 60 })).toBe(false);
  });

  it('hides on a deliberate scroll down', () => {
    expect(nextHeaderHidden({ ...base, y: 1012 })).toBe(true);
  });

  it('shows again on a deliberate scroll up', () => {
    expect(nextHeaderHidden({ ...base, y: 990, hidden: true })).toBe(false);
  });

  it('keeps its state for tiny movements', () => {
    expect(nextHeaderHidden({ ...base, y: 1003, hidden: true })).toBe(true);
    expect(nextHeaderHidden({ ...base, y: 997, hidden: false })).toBe(false);
  });

  it('stays visible while locked (focus inside or menu open)', () => {
    expect(nextHeaderHidden({ ...base, y: 1200, locked: true })).toBe(false);
  });
});

describe('headerIsSolid', () => {
  it('is transparent at the very top and solid after 80px', () => {
    expect(headerIsSolid(0)).toBe(false);
    expect(headerIsSolid(80)).toBe(false);
    expect(headerIsSolid(81)).toBe(true);
  });
});

describe('magneticOffset', () => {
  const box = { left: 100, top: 100, width: 200, height: 56 };

  it('does not move when the pointer is at the centre', () => {
    expect(magneticOffset(200, 128, box)).toEqual({ x: 0, y: 0 });
  });

  it('pulls by a quarter of the distance', () => {
    expect(magneticOffset(220, 136, box)).toEqual({ x: 5, y: 2 });
  });

  it('caps the pull in both directions', () => {
    expect(magneticOffset(900, -400, box)).toEqual({ x: 14, y: -14 });
  });
});

describe('clamp', () => {
  it('keeps values inside the range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });
});
```

- [ ] **Step 3: Run to see it fail**

Run: `npm test`
Expected: FAIL — `Failed to resolve import "../../src/lib/motion"`.

- [ ] **Step 4: Implement `src/lib/motion.ts`**

```ts
export const REVEAL_TYPES = ['lines', 'chars', 'fade-up', 'fade', 'figure', 'rule', 'clip'] as const;
export type RevealType = (typeof REVEAL_TYPES)[number];

export interface RevealOptions {
  type: RevealType;
  delay: number;
}

export function parseReveal(dataset: { reveal?: string; revealDelay?: string }): RevealOptions | null {
  const type = dataset.reveal;
  if (!type || !(REVEAL_TYPES as readonly string[]).includes(type)) return null;
  const delay = Number.parseFloat(dataset.revealDelay ?? '');
  return { type: type as RevealType, delay: Number.isFinite(delay) && delay > 0 ? delay : 0 };
}

export interface HeaderScroll {
  y: number;
  lastY: number;
  hidden: boolean;
  locked: boolean;
}

/** Hide on a deliberate scroll down past the hero area, show again on any deliberate scroll up. */
export function nextHeaderHidden({ y, lastY, hidden, locked }: HeaderScroll, minY = 240, threshold = 6): boolean {
  if (locked || y < minY) return false;
  const dy = y - lastY;
  if (dy > threshold) return true;
  if (dy < -threshold) return false;
  return hidden;
}

export function headerIsSolid(y: number, limit = 80): boolean {
  return y > limit;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Offset that pulls an element toward the pointer: a share of the distance from its centre, capped. */
export function magneticOffset(pointerX: number, pointerY: number, box: Box, strength = 0.25, max = 14): { x: number; y: number } {
  const dx = pointerX - (box.left + box.width / 2);
  const dy = pointerY - (box.top + box.height / 2);
  return { x: clamp(dx * strength, -max, max), y: clamp(dy * strength, -max, max) };
}
```

- [ ] **Step 5: Run the unit tests**

Run: `npm test`
Expected: PASS — `Tests 35 passed (35)`.

- [ ] **Step 6: Create `src/styles/motion.css`**

```css
/* Before the motion bundle has set start states, keep reveal targets invisible (only when motion is allowed). */
.js-motion:not(.motion-ready) [data-reveal] {
  opacity: 0;
}

/* SplitText masks clip; give descenders room without moving the layout. */
.split-line-mask,
.split-char-mask {
  padding-bottom: 0.12em;
  margin-bottom: -0.12em;
}

/* Sections focused after an in-page jump should not draw a focus ring around the whole block. */
[tabindex='-1']:focus {
  outline: none;
}
```

- [ ] **Step 7: Create `src/scripts/motion/lenis.ts`**

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

/**
 * Smooth wheel scrolling for mouse and trackpad users; touch keeps native scrolling.
 * Lenis already subtracts html's scroll-padding-top (the header height) for element targets.
 */
export function initSmoothScroll(): () => void {
  if (!window.matchMedia('(pointer: fine)').matches) return () => {};

  const lenis = new Lenis({ autoRaf: false, autoToggle: true, stopInertiaOnNavigate: true });
  const tick = (time: number): void => lenis.raf(time * 1000);
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // Same-page links glide to their target, then move focus there like a native jump does.
  const onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]');
    if (!link) return;
    const id = decodeURIComponent(link.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    if (id && !target) return;
    event.preventDefault();
    history.pushState(null, '', link.hash || '#');
    lenis.scrollTo(target ?? 0, {
      force: true,
      onComplete: () => {
        if (!target) return;
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      },
    });
  };
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}
```

- [ ] **Step 8: Create `src/scripts/motion/index.ts`**

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { initSmoothScroll } from './lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

type Cleanup = () => void;

async function boot(): Promise<void> {
  await document.fonts.ready;
  const root = document.documentElement;

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Un-hide reveal targets in the same task in which the modules set their start states (no flash).
    root.classList.add('motion-ready');
    const cleanups: Cleanup[] = [initSmoothScroll()];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });

  root.classList.add('motion-ready');
  ScrollTrigger.refresh();
}

void boot();
```

- [ ] **Step 9: Wire the guard, stylesheet and entry into `src/layouts/Base.astro`**

Add `import '../styles/motion.css';` after the `base.css` import. Directly after `<meta name="viewport" …/>` add:

```astro
    <script is:inline>
      (function () {
        var root = document.documentElement;
        if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
        root.classList.add('js-motion');
        window.setTimeout(function () {
          if (!root.classList.contains('motion-ready')) root.classList.remove('js-motion');
        }, 3000);
      })();
    </script>
```

and just before `</body>` add:

```astro
    <script>
      import '../scripts/motion/index';
    </script>
```

- [ ] **Step 10: Write the dist test**

`tests/dist/motion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { parseReveal } from '../../src/lib/motion';
import { loadPage, pages } from './helpers';

describe.each(pages)('$path motion hooks', ({ path }) => {
  const doc = loadPage(path);

  it('adds the motion guard before first paint', () => {
    const inline = Array.from(doc.querySelectorAll('head script:not([src])')).map((s) => s.textContent ?? '');
    expect(inline.some((code) => code.includes('js-motion') && code.includes('motion-ready'))).toBe(true);
  });

  it('loads the motion bundle as a module', () => {
    expect(doc.querySelector('script[type="module"]')).not.toBeNull();
  });

  it('only uses known reveal types', () => {
    for (const el of Array.from(doc.querySelectorAll('[data-reveal]'))) {
      const dataset = { reveal: el.getAttribute('data-reveal') ?? undefined, revealDelay: el.getAttribute('data-reveal-delay') ?? undefined };
      expect(parseReveal(dataset), el.outerHTML.slice(0, 80)).not.toBeNull();
    }
  });
});
```

- [ ] **Step 11: Build, test, check in the browser**

Run: `npm run build && npm run test:dist && npm test && npm run check`
Expected: dist 114 passed; unit 35 passed; `0 errors`.

Preview (`npm run preview -- --host 127.0.0.1 --port 4321` in the background), open `/` at 1440×900 with the Playwright MCP tools and run:

```js
() => ({ classes: document.documentElement.className, lenis: document.documentElement.classList.contains('lenis') })
```

Expected: classes contain `js-motion` and `motion-ready`; `lenis` is `true`. Scroll with `browser_run_code_unsafe` (`await page.mouse.wheel(0, 800)`) and confirm `window.scrollY` grows smoothly over ~1 s. Click the "Services" nav link: the page glides to `#services`, `location.hash === '#services'` and `document.activeElement.id === 'services'`. Console has no errors.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: add motion foundation with smooth scroll and pre-JS guard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Reveal system and the CSS hero intro

**Files:**
- Create: `src/scripts/motion/reveal.ts`
- Modify: `src/scripts/motion/index.ts`, `src/components/Hero.astro`, `src/components/ui/SectionHeading.astro`, `src/components/Approach.astro`, `src/components/Services.astro`, `src/components/Work.astro`, `src/components/Contact.astro`
- Test: `tests/dist/motion.test.ts` (extend)

**Interfaces:**
- Consumes: `parseReveal` (Task 1).
- Produces: `initReveals(): () => void`. Reveal vocabulary (`data-reveal` + optional `data-reveal-delay` in seconds): `lines` (SplitText lines rise from masks), `chars` (characters rise, headings only), `fade-up`, `fade`, `figure` (fade + scale 0.96→1), `rule` (scaleX draw from left), `clip` (clip-path opens from the bottom). Classes created by SplitText: `split-line`, `split-line-mask`, `split-char`, `split-char-mask`.

- [ ] **Step 1: Extend the dist test (fails first)**

Append to `tests/dist/motion.test.ts`:

```ts
describe.each(pages)('$path reveal markup', ({ path }) => {
  const doc = loadPage(path);
  const reveal = (sel: string) => doc.querySelector(sel)?.getAttribute('data-reveal');

  it('splits every section heading into lines and draws its rule', () => {
    for (const id of ['services-title', 'work-title', 'process-title', 'studio-title']) {
      expect(reveal(`#${id}`), id).toBe('lines');
      expect(doc.querySelector(`#${id}`)?.parentElement?.querySelector('.sh-rule')?.getAttribute('data-reveal'), id).toBe('rule');
    }
  });

  it('opens the project cards with a clip', () => {
    expect(Array.from(doc.querySelectorAll('.pj-card')).map((c) => c.getAttribute('data-reveal'))).toEqual(['clip', 'clip']);
  });

  it('builds the contact title from characters', () => {
    expect(reveal('#contact-title')).toBe('chars');
  });

  it('animates the hero with CSS words, not with data-reveal', () => {
    expect(doc.querySelectorAll('#top [data-reveal]')).toHaveLength(0);
    expect(doc.querySelectorAll('.hero-title .hero-word').length).toBeGreaterThan(5);
  });
});
```

Run: `npm run build && npm run test:dist` → Expected: FAIL (no `data-reveal` on headings, no `.hero-word`).

- [ ] **Step 2: Create `src/scripts/motion/reveal.ts`**

```ts
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { parseReveal } from '../../lib/motion';

const EASE = 'expo.out';

export function initReveals(): () => void {
  const splits: SplitText[] = [];

  for (const el of document.querySelectorAll<HTMLElement>('[data-reveal]')) {
    const options = parseReveal(el.dataset);
    if (!options) continue;
    const { delay } = options;
    const scrollTrigger = { trigger: el, start: 'top 88%', once: true };

    switch (options.type) {
      case 'lines':
        splits.push(
          SplitText.create(el, {
            type: 'lines',
            mask: 'lines',
            tag: 'span',
            linesClass: 'split-line',
            aria: 'none',
            autoSplit: true,
            onSplit: (self) =>
              gsap.fromTo(self.lines, { yPercent: 110 }, { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.08, delay, scrollTrigger }),
          }),
        );
        break;
      case 'chars':
        splits.push(
          SplitText.create(el, {
            type: 'words,chars',
            mask: 'chars',
            tag: 'span',
            charsClass: 'split-char',
            aria: 'auto',
            autoSplit: true,
            onSplit: (self) =>
              gsap.fromTo(self.chars, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: EASE, stagger: 0.022, delay, scrollTrigger }),
          }),
        );
        break;
      case 'fade-up':
        gsap.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 1, ease: EASE, delay, scrollTrigger });
        break;
      case 'fade':
        gsap.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'power2.out', delay, scrollTrigger });
        break;
      case 'figure':
        gsap.fromTo(el, { autoAlpha: 0, scale: 0.96 }, { autoAlpha: 1, scale: 1, duration: 1.6, ease: EASE, delay, scrollTrigger });
        break;
      case 'rule':
        gsap.fromTo(el, { scaleX: 0 }, { scaleX: 1, transformOrigin: '0% 50%', duration: 1.4, ease: EASE, delay, scrollTrigger });
        break;
      case 'clip':
        gsap.fromTo(
          el,
          { clipPath: 'inset(100% 0% 0% 0% round 12px)' },
          { clipPath: 'inset(0% 0% 0% 0% round 12px)', duration: 1.4, ease: EASE, delay, scrollTrigger },
        );
        break;
    }
  }

  return () => {
    for (const split of splits) split.revert();
  };
}
```

- [ ] **Step 3: Register it in `src/scripts/motion/index.ts`**

Add `import { initReveals } from './reveal';` and change the cleanup list to:

```ts
    const cleanups: Cleanup[] = [initSmoothScroll(), initReveals()];
```

- [ ] **Step 4: Hero — split the headline into words and add the CSS intro**

In `src/components/Hero.astro` frontmatter add after `const t = getDictionary(lang);`:

```ts
const words = t.hero.title.split(' ');
```

Replace `<h1 id="hero-title" class="hero-title">{t.hero.title}</h1>` with:

```astro
    <h1 id="hero-title" class="hero-title">
      {words.map((word, i) => (<><span class="hero-word"><span style={`--i: ${i}`}>{word}</span></span>{i < words.length - 1 && ' '}</>))}
    </h1>
```

Add to the end of the component's `<style>` block (before `</style>`):

```css
  .hero-word {
    display: inline-block;
    padding-bottom: 0.12em;
    margin-bottom: -0.12em;
    overflow: clip;
    vertical-align: top;
  }
  .hero-word > span {
    display: inline-block;
  }
  @media (prefers-reduced-motion: no-preference) {
    .hero-meta > * {
      animation: hero-fade 0.9s var(--ease-std) both;
    }
    .hero-meta > :nth-child(2) {
      animation-delay: 0.06s;
    }
    .hero-meta > :nth-child(3) {
      animation-delay: 0.12s;
    }
    .hero-word > span {
      animation: hero-rise 1.1s var(--ease-out) both;
      animation-delay: calc(0.12s + var(--i) * 0.045s);
    }
    .hero-stage {
      animation: hero-figure 1.6s var(--ease-out) 0.3s both;
    }
    .hero-actions {
      animation: hero-fade-up 1s var(--ease-out) 0.55s both;
    }
    .hero-caption {
      animation: hero-fade 1s var(--ease-std) 0.8s both;
    }
  }
  @keyframes hero-rise {
    from {
      transform: translateY(105%);
    }
  }
  @keyframes hero-fade {
    from {
      opacity: 0;
    }
  }
  @keyframes hero-fade-up {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
  }
  @keyframes hero-figure {
    from {
      opacity: 0;
      transform: scale(0.96);
    }
  }
```

- [ ] **Step 5: Section headings — split title, fade intro, drawn rule**

Replace `src/components/ui/SectionHeading.astro` with:

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
  <h2 id={id} class="sh-title" data-reveal="lines">{title}<span class="sh-count" aria-hidden="true">({count})</span></h2>
  <p class="sh-intro" data-reveal="fade-up" data-reveal-delay="0.15">{intro}</p>
  <span class="sh-rule" data-reveal="rule" aria-hidden="true"></span>
</div>

<style>
  .sh {
    position: relative;
    display: grid;
    grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
    column-gap: var(--gutter);
    row-gap: 20px;
    align-items: end;
    padding-bottom: 36px;
  }
  .sh-rule {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    height: 1px;
    background: var(--ink);
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

- [ ] **Step 6: Reveal attributes in the other sections**

`src/components/Approach.astro` — change the four opening tags:

```astro
    <figure class="approach-figure" data-reveal="figure">
```

```astro
      <h2 id="approach-label" class="label" data-reveal="fade">{t.approach.label}</h2>
      <p class="approach-lead" data-reveal="fade-up">
```

```astro
      <p class="approach-body" data-reveal="fade-up" data-reveal-delay="0.12">{t.approach.body}</p>
```

`src/components/Services.astro` — the `<details>` opening tag becomes:

```astro
          <details class="svc" name="services" open={i === 0} data-service={item.id} data-reveal="fade-up" data-reveal-delay={String(i * 0.08)}>
```

`src/components/Work.astro` — card, info and next-slot tags become:

```astro
          <a class="pj-card" href={link.href} aria-label={p.cardLabel} data-reveal="clip" {...extra}>
```

```astro
          <div class="pj-info" data-reveal="fade-up" data-reveal-delay="0.1">
```

```astro
  <a class="pj-next" href="#contact" data-reveal="fade-up">
```

`src/components/Contact.astro` — intro, form and info tags become:

```astro
        <span class="label ct-label" data-reveal="fade">{c.label}</span>
        <h2 id="contact-title" class="ct-title" data-reveal="chars">{c.title}</h2>
        <p class="ct-lead" data-reveal="fade-up" data-reveal-delay="0.1">{c.lead}</p>
        <a class="ct-mail" href={`mailto:${site.email}`} data-reveal="fade-up" data-reveal-delay="0.2">{site.email}</a>
```

```astro
      <form
        class="cf"
        data-reveal="fade-up"
        data-reveal-delay="0.15"
```

(keep all the other form attributes as they are)

```astro
    <div class="ct-info" data-reveal="fade-up">
```

- [ ] **Step 7: Build and run all tests**

Run: `npm run build && npm run test:dist && npm test && npm run check`
Expected: dist 122 passed; unit 35 passed; `0 errors`.

- [ ] **Step 8: Browser check**

At 1440×900, reload `/`. Within 1.6 s the hero words rise, the rings poster fades/scales in, the lead and CTA fade up — screenshot at 200 ms (`t2-hero-early.png`, words partly risen) and at 2 s (`t2-hero-done.png`, identical to Plan 1's hero). Then:

```js
() => getComputedStyle(document.querySelector('#services .sh-intro')).opacity
```

Expected `"0"` before scrolling. Wheel-scroll until `#services` is in view, wait 1.5 s, run it again → `"1"`; the heading lines are fully risen and the rule spans the full width. Scroll to `#contact`: the title builds from characters. Emulate `prefers-reduced-motion: reduce` (`browser_emulate_media`), reload: nothing animates, everything is visible immediately, `document.documentElement.classList.contains('js-motion') === false`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add scroll reveals and CSS hero intro

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Header states and mobile-menu entrance

**Files:**
- Create: `src/scripts/motion/header.ts`
- Modify: `src/scripts/motion/index.ts`, `src/components/Header.astro`, `src/components/MobileMenu.astro`

**Interfaces:**
- Consumes: `nextHeaderHidden`, `headerIsSolid` (Task 1).
- Produces: `initHeader(options: { allowHide: boolean }): () => void`; header attributes `data-solid="true|false"`, `data-hidden="true|false"`, `data-tone="light|dark"`.

- [ ] **Step 1: Create `src/scripts/motion/header.ts`**

```ts
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { headerIsSolid, nextHeaderHidden } from '../../lib/motion';

export function initHeader({ allowHide }: { allowHide: boolean }): () => void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return () => {};
  const menu = document.querySelector<HTMLDialogElement>('dialog[data-menu]');
  let lastY = window.scrollY;
  let hidden = false;

  const update = (y: number): void => {
    const locked = !allowHide || header.matches(':focus-within') || Boolean(menu?.open);
    hidden = nextHeaderHidden({ y, lastY, hidden, locked });
    lastY = y;
    header.dataset.solid = String(headerIsSolid(y));
    header.dataset.hidden = String(hidden);
  };

  const scroll = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => update(self.scroll()) });

  // Over the dark contact section and footer the header switches to its night palette.
  const contact = document.getElementById('contact');
  const tone = contact
    ? ScrollTrigger.create({
        trigger: contact,
        start: () => `top ${Math.round(header.offsetHeight / 2)}px`,
        end: 'max',
        onToggle: (self) => {
          header.dataset.tone = self.isActive ? 'dark' : 'light';
        },
      })
    : null;

  update(window.scrollY);
  return () => {
    scroll.kill();
    tone?.kill();
  };
}
```

- [ ] **Step 2: Start it from `index.ts` for every motion preference**

In `src/scripts/motion/index.ts` add `import { initHeader } from './header';` and, right after `const root = document.documentElement;`, add:

```ts
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  initHeader({ allowHide: !reduced });
```

- [ ] **Step 3: Header CSS for the three states and the magnetic CTA hook**

In `src/components/Header.astro` change the CTA to `<Button href="#contact" size="s" data-magnetic>{t.cta.start}</Button>` and replace the `.site-header { … }` rule with:

```css
  .site-header {
    position: sticky;
    top: 0;
    z-index: 50;
    background: color-mix(in srgb, var(--paper) 86%, transparent);
    -webkit-backdrop-filter: saturate(1.3) blur(14px);
    backdrop-filter: saturate(1.3) blur(14px);
    box-shadow: 0 1px 0 color-mix(in srgb, var(--line) 80%, transparent);
    transition:
      transform 0.5s var(--ease-out),
      background-color 0.35s var(--ease-std),
      box-shadow 0.35s var(--ease-std),
      color 0.35s var(--ease-std);
  }
  .site-header[data-solid='false'] {
    background: transparent;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
  .site-header[data-hidden='true'] {
    transform: translateY(-100%);
  }
  .site-header[data-tone='dark'] {
    color: var(--paper);
    background: color-mix(in srgb, var(--night) 84%, transparent);
    box-shadow: 0 1px 0 var(--night-line);
  }
  .site-header[data-tone='dark'] .header-brand :global(.brand) {
    color: var(--paper);
  }
  .site-header[data-tone='dark'] .header-clock {
    color: var(--night-muted);
  }
  .site-header[data-tone='dark'] .header-lang :global(.lang a) {
    color: var(--night-muted);
  }
  .site-header[data-tone='dark'] .header-lang :global(.lang a[aria-current='page']) {
    color: var(--paper);
  }
  .site-header[data-tone='dark'] .header-cta :global(.btn) {
    background: var(--paper);
    color: var(--ink);
  }
  .site-header[data-tone='dark'] .menu-toggle {
    border-color: var(--night-line);
  }
```

- [ ] **Step 4: Mobile menu entrance (CSS only)**

In `src/components/MobileMenu.astro` give each nav link its index:

```astro
      links.map((l, i) => (
        <a href={l.href} data-menu-link style={`--i: ${i}`}>
          {l.label}
        </a>
      ))
```

and append to its `<style>`:

```css
  @media (prefers-reduced-motion: no-preference) {
    .menu[open] {
      animation: menu-fade 0.35s var(--ease-std) both;
    }
    .menu[open] .menu-nav a {
      animation: menu-rise 0.7s var(--ease-out) both;
      animation-delay: calc(0.08s + var(--i) * 0.055s);
    }
    .menu[open] .menu-foot {
      animation: menu-fade 0.6s var(--ease-std) 0.35s both;
    }
  }
  @keyframes menu-fade {
    from {
      opacity: 0;
    }
  }
  @keyframes menu-rise {
    from {
      opacity: 0;
      transform: translateY(24px);
    }
  }
```

- [ ] **Step 5: Build, test, browser check**

Run: `npm run build && npm run test:dist && npm run check` → all green (dist 122, `0 errors`).

At 1440×900 on `/`: at the top `header.dataset.solid === 'false'` (no hairline, transparent). Wheel down 600 px → `data-hidden="true"`, header slides up. Wheel up 100 px → `data-hidden="false"`. Scroll into `#contact` → `data-tone="dark"`, screenshot `t3-header-dark.png` (night header, light CTA). Press Tab once while the header is hidden → header returns (focus lock). At 390×844 open the menu: links rise one after another; with reduced motion emulated they appear instantly.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: hide the header on scroll and darken it over contact

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Animated services accordion and living illustrations

**Files:**
- Create: `src/scripts/motion/services.ts`
- Modify: `src/scripts/motion/index.ts`, `src/components/Services.astro`, `src/components/art/ServiceApps.astro`

**Interfaces:**
- Produces: `initServices(options: { animated: boolean }): () => void`. Markup hook: each panel is wrapped in `.svc-collapse` (the element whose height animates). Illustration hooks: `.art-cursor`, `.art-cta` (web), `.app-row`, `.app-toast`, `.app-bar` (apps), `.node` (systems).

- [ ] **Step 1: Wrap each panel in a collapse box**

In `src/components/Services.astro` replace the whole `<div class="svc-panel"> … </div>` block with:

```astro
            <div class="svc-collapse">
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
            </div>
```

and add to the `<style>`:

```css
  .svc-collapse {
    overflow: clip;
  }
```

- [ ] **Step 2: Tag the chart bars in `src/components/art/ServiceApps.astro`**

Change the bar markup to:

```astro
      {bars.map((b) => <rect class="app-bar" x={b.x} y={b.y} width="12" height={b.h} rx="3" fill="#cfcbc4" />)}
      <rect class="acc app-bar" x="484" y="178" width="12" height="76" rx="3" />
```

- [ ] **Step 3: Create `src/scripts/motion/services.ts`**

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const DURATION = 0.75;
const EASE = 'expo.inOut';

function playArt(row: HTMLDetailsElement): void {
  const art = row.querySelector<SVGSVGElement>('.svc-art svg');
  if (!art) return;
  const service = row.dataset.service;

  if (service === 'web') {
    const cursor = art.querySelector('.art-cursor');
    const cta = art.querySelector('.art-cta');
    if (!cursor || !cta) return;
    gsap
      .timeline({ delay: 0.25 })
      .fromTo(cursor, { x: 120, y: 70, opacity: 0 }, { x: 0, y: 0, opacity: 1, duration: 1.1, ease: 'power3.out' })
      .to(cursor, { scale: 0.86, transformOrigin: '0% 0%', duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' })
      .fromTo(cta, { opacity: 1 }, { opacity: 0.55, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.inOut' }, '<');
  } else if (service === 'apps') {
    gsap
      .timeline({ delay: 0.2 })
      .from(art.querySelectorAll('.app-row'), { opacity: 0, x: -10, duration: 0.6, stagger: 0.08, ease: 'power3.out' })
      .from(art.querySelector('.app-toast'), { opacity: 0, x: -24, duration: 0.7, ease: 'expo.out' }, 0.15)
      .from(art.querySelectorAll('.app-bar'), { scaleY: 0, transformOrigin: '50% 100%', duration: 0.8, stagger: 0.07, ease: 'expo.out' }, 0.25);
  } else if (service === 'systems') {
    gsap.from(art.querySelectorAll('.node'), {
      opacity: 0,
      scale: 0.92,
      transformOrigin: '50% 50%',
      duration: 0.6,
      stagger: 0.09,
      ease: 'back.out(1.6)',
      delay: 0.2,
    });
  }
}

export function initServices({ animated }: { animated: boolean }): () => void {
  const rows = Array.from(document.querySelectorAll<HTMLDetailsElement>('details.svc'));
  if (rows.length === 0) return () => {};
  // The script keeps rows exclusive itself: the native `name` group would snap the old row shut before it can animate.
  for (const row of rows) row.removeAttribute('name');

  const boxOf = (row: HTMLDetailsElement) => row.querySelector<HTMLElement>('.svc-collapse');

  const close = (row: HTMLDetailsElement): void => {
    const box = boxOf(row);
    if (!animated || !box) {
      row.open = false;
      ScrollTrigger.refresh();
      return;
    }
    gsap.fromTo(
      box,
      { height: box.offsetHeight },
      {
        height: 0,
        duration: DURATION,
        ease: EASE,
        onComplete: () => {
          row.open = false;
          gsap.set(box, { clearProps: 'height' });
          ScrollTrigger.refresh();
        },
      },
    );
  };

  const open = (row: HTMLDetailsElement): void => {
    row.open = true;
    const box = boxOf(row);
    if (!animated || !box) {
      ScrollTrigger.refresh();
      return;
    }
    gsap.fromTo(
      box,
      { height: 0 },
      {
        height: box.scrollHeight,
        duration: DURATION,
        ease: EASE,
        onComplete: () => {
          gsap.set(box, { clearProps: 'height' });
          ScrollTrigger.refresh();
        },
      },
    );
    playArt(row);
  };

  const onClick = (event: Event): void => {
    const summary = (event.target as Element | null)?.closest('summary');
    const row = summary?.parentElement;
    if (!(row instanceof HTMLDetailsElement) || !rows.includes(row)) return;
    event.preventDefault();
    const box = boxOf(row);
    if (box && gsap.isTweening(box)) return;
    if (row.open) {
      close(row);
      return;
    }
    for (const other of rows) if (other !== row && other.open) close(other);
    open(row);
  };
  document.addEventListener('click', onClick);

  const intros = animated
    ? rows.filter((row) => row.open).map((row) => ScrollTrigger.create({ trigger: row, start: 'top 75%', once: true, onEnter: () => playArt(row) }))
    : [];

  return () => {
    document.removeEventListener('click', onClick);
    for (const intro of intros) intro.kill();
  };
}
```

- [ ] **Step 4: Start it from `index.ts`**

Add `import { initServices } from './services';` and after the `initHeader(…)` line:

```ts
  initServices({ animated: !reduced });
```

- [ ] **Step 5: Build, test, browser check**

Run: `npm run build && npm run test:dist && npm run check` → green. (The static HTML keeps `name="services"`, so the Plan-1 test still passes; the script removes it at runtime.)

At 1440: scroll to `#services` — the open "Websites" illustration plays (cursor glides to the green button and clicks). Click "Web & mobile apps": the first panel collapses while the second expands over 0.75 s, list rows slide in, bars grow. Check:

```js
() => ({ open: [...document.querySelectorAll('details.svc')].map((d) => d.open), name: document.querySelector('details.svc').getAttribute('name') })
```

Expected after 1 s: `{ open: [false, true, false], name: null }`. Keyboard: focus the third summary and press Enter → it animates open. With reduced motion emulated, rows switch instantly.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: animate the services accordion and its illustrations

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Project cards — parallax, cursor pill, marching border

**Files:**
- Create: `src/scripts/motion/work.ts`
- Modify: `src/scripts/motion/index.ts`, `src/components/Work.astro`, `src/components/art/ProjectPortal.astro`, `src/components/art/ProjectShop.astro`, `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/bs.ts`

**Interfaces:**
- Produces: `initWork(): () => void`; markup hooks `.pj-parallax` (outer SVG group the scroll moves), `.pj-mock` (inner group the hover moves), `.cursor-pill` / `.cursor-pill-label`, card attributes `data-cursor`, `data-cursor-icon`.
- Dictionary: `ProjectItem.cursor: string`.

- [ ] **Step 1: Dictionary — cursor labels**

`src/i18n/types.ts`: add `cursor: string;` to `ProjectItem` (after `cardLabel`).
`src/i18n/en.ts`: portal gets `cursor: 'Ask about it'`, shop gets `cursor: 'Visit'`.
`src/i18n/bs.ts`: portal gets `cursor: 'Pitajte nas'`, shop gets `cursor: 'Posjetite'`.

Run `npm test` → 35 passed (the parity test covers the new keys).

- [ ] **Step 2: Separate scroll parallax from hover lift in both mockups**

In both `src/components/art/ProjectPortal.astro` and `src/components/art/ProjectShop.astro`: insert `<g class="pj-parallax">` on the line directly before `<g class="pj-mock">`, and insert one more `</g>` directly before `</svg>` (it closes the new group). Nothing else changes.

- [ ] **Step 3: Work markup — cursor hooks, pill, SVG dashed border**

In `src/components/Work.astro`:

Card tag:

```astro
          <a
            class="pj-card"
            href={link.href}
            aria-label={p.cardLabel}
            data-reveal="clip"
            data-cursor={p.cursor}
            data-cursor-icon={link.external ? 'external' : 'arrow'}
            {...extra}
          >
```

Replace the next-slot anchor's first line and add the border as its first child:

```astro
  <a class="pj-next" href="#contact" data-reveal="fade-up">
    <svg class="pj-next-border" aria-hidden="true"><rect width="100%" height="100%" rx="12" ry="12"></rect></svg>
```

Before `</section>` add the pill:

```astro
  <div class="cursor-pill" aria-hidden="true" data-icon="arrow">
    <span class="cursor-pill-label"></span>
    <svg class="cursor-pill-icon" width="12" height="12" viewBox="0 0 14 14">
      <path class="icon-arrow" d="M2 7H12M8 3L12 7L8 11"></path>
      <path class="icon-external" d="M3 11L11 3M5 3H11V9"></path>
    </svg>
  </div>
```

In its `<style>` remove `border: 1px dashed var(--line-dash);` from `.pj-next`, add `position: relative;` to `.pj-next`, and append:

```css
  .pj-next-border {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 12px;
    pointer-events: none;
  }
  .pj-next-border rect {
    fill: none;
    stroke: var(--line-dash);
    stroke-width: 2;
    stroke-dasharray: 5 5;
  }
  @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
    .pj-next:hover .pj-next-border rect {
      animation: dash-march 1.4s linear infinite;
    }
  }
  @keyframes dash-march {
    to {
      stroke-dashoffset: -20;
    }
  }
  .cursor-pill {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 60;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 14px;
    border-radius: 999px;
    background: var(--ink);
    color: var(--paper);
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    visibility: hidden;
    opacity: 0;
  }
  .cursor-pill-icon path {
    fill: none;
    stroke: currentColor;
    stroke-width: 1.4;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .cursor-pill[data-icon='arrow'] .icon-external,
  .cursor-pill[data-icon='external'] .icon-arrow {
    display: none;
  }
```

- [ ] **Step 4: Create `src/scripts/motion/work.ts`**

```ts
import { gsap } from 'gsap';

const OFFSET = 18;

export function initWork(): () => void {
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.pj-card'));

  // The mockup drifts a little slower than the card as it passes through the viewport.
  for (const card of cards) {
    const layer = card.querySelector('.pj-parallax');
    if (!layer) continue;
    gsap.fromTo(layer, { y: 70 }, { y: -30, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  const pill = document.querySelector<HTMLElement>('.cursor-pill');
  const label = pill?.querySelector<HTMLElement>('.cursor-pill-label');
  if (!pill || !label || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};

  const xTo = gsap.quickTo(pill, 'x', { duration: 0.45, ease: 'power3' });
  const yTo = gsap.quickTo(pill, 'y', { duration: 0.45, ease: 'power3' });
  gsap.set(pill, { autoAlpha: 0, scale: 0.6 });

  const enter = (event: PointerEvent): void => {
    const card = event.currentTarget as HTMLElement;
    label.textContent = card.dataset.cursor ?? '';
    pill.dataset.icon = card.dataset.cursorIcon ?? 'arrow';
    gsap.set(pill, { x: event.clientX + OFFSET, y: event.clientY + OFFSET });
    gsap.to(pill, { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' });
  };
  const move = (event: PointerEvent): void => {
    xTo(event.clientX + OFFSET);
    yTo(event.clientY + OFFSET);
  };
  const leave = (): void => {
    gsap.to(pill, { autoAlpha: 0, scale: 0.6, duration: 0.25, ease: 'power2.in' });
  };

  for (const card of cards) {
    card.addEventListener('pointerenter', enter);
    card.addEventListener('pointermove', move);
    card.addEventListener('pointerleave', leave);
  }
  return () => {
    for (const card of cards) {
      card.removeEventListener('pointerenter', enter);
      card.removeEventListener('pointermove', move);
      card.removeEventListener('pointerleave', leave);
    }
  };
}
```

- [ ] **Step 5: Register it**

`index.ts`: `import { initWork } from './work';` and extend the list: `[initSmoothScroll(), initReveals(), initWork()]`.

- [ ] **Step 6: Build, test, browser check**

Run: `npm run build && npm run test:dist && npm test && npm run check` → green.

At 1440: scroll to `#work`; the cards open from the bottom edge upward and the mockups drift as you scroll (compare `.pj-parallax` transform at two scroll positions — the `y` differs). Hover the portal card: a dark pill "Ask about it →" follows the pointer 18 px below-right; the mockup still lifts on hover. Hover the shop card: "Visit ↗". Hover "Your project": dashes march. At 390 no pill appears (coarse pointer emulation via `browser_run_code_unsafe` with `page.emulateMedia` is not needed — resize alone keeps `pointer: fine`, so verify only that the page still has no horizontal overflow).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add project card parallax, cursor pill and marching border

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Process — pinned, scroll-scrubbed Gantt (set piece 2)

**Files:**
- Create: `src/lib/process.ts`, `src/scripts/motion/process.ts`
- Modify: `src/components/Process.astro`, `src/scripts/motion/index.ts`
- Test: `tests/unit/process.test.ts`

**Interfaces:**
- Produces: `GO_LIVE = 85.714`; `PROCESS_BARS: readonly ProcessBar[]` (`{ start; end: number | null; tone; demos?; outAlign? }`); `barLength(bar): number | null`; `barSchedule(bar): { at: number; duration: number }` (fractions of a 0–1 timeline in which a cursor sweeps the track linearly); `initProcess(): () => void`.
- Markup hooks: `.proc-body` wrapper around the list, `.proc-overlay > .proc-overlay-lane > .proc-golive-solid, .proc-cursor > .proc-cursor-dot`.

- [ ] **Step 1: Failing unit test**

`tests/unit/process.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { GO_LIVE, PROCESS_BARS, barLength, barSchedule } from '../../src/lib/process';

describe('process geometry', () => {
  it('has five bars and hands over to Run at go-live', () => {
    expect(PROCESS_BARS).toHaveLength(5);
    expect(PROCESS_BARS[3]?.end).toBe(GO_LIVE);
    expect(PROCESS_BARS[4]?.start).toBe(GO_LIVE);
    expect(PROCESS_BARS[4]?.end).toBeNull();
  });

  it('measures closed bars and leaves the open one unbounded', () => {
    expect(barLength(PROCESS_BARS[0]!)).toBe(11.429);
    expect(barLength(PROCESS_BARS[2]!)).toBe(54.286);
    expect(barLength(PROCESS_BARS[4]!)).toBeNull();
  });

  it('schedules a bar to grow while the cursor crosses it', () => {
    const build = barSchedule(PROCESS_BARS[2]!);
    expect(build.at).toBeCloseTo(0.22857, 5);
    expect(build.duration).toBeCloseTo(0.54286, 5);
  });

  it('lets the open-ended bar grow until the end of the timeline', () => {
    const run = barSchedule(PROCESS_BARS[4]!);
    expect(run.at).toBeCloseTo(0.85714, 5);
    expect(run.at + run.duration).toBeCloseTo(1, 5);
  });
});
```

Run `npm test` → FAIL (`Failed to resolve import "../../src/lib/process"`).

- [ ] **Step 2: Implement `src/lib/process.ts`**

```ts
/** Timeline geometry in % of the track width (1 unit = 11.4286 %, go-live at 7.5 units). */
export const GO_LIVE = 85.714;

export interface ProcessBar {
  start: number;
  end: number | null;
  tone: 'outline' | 'solid' | 'accent';
  demos?: readonly number[];
  outAlign?: 'start' | 'end' | 'edge';
}

export const PROCESS_BARS: readonly ProcessBar[] = [
  { start: 0, end: 11.429, tone: 'outline' },
  { start: 8.571, end: 28.571, tone: 'outline' },
  { start: 22.857, end: 77.143, tone: 'solid', demos: [34.286, 45.714, 57.143, 68.571] },
  { start: 77.143, end: GO_LIVE, tone: 'solid', outAlign: 'end' },
  { start: GO_LIVE, end: null, tone: 'accent', outAlign: 'edge' },
];

export function barLength(bar: ProcessBar): number | null {
  return bar.end === null ? null : Number((bar.end - bar.start).toFixed(3));
}

/** Where (0–1) a bar starts growing and for how long, when a cursor sweeps the track linearly from 0 to 1. */
export function barSchedule(bar: ProcessBar): { at: number; duration: number } {
  const at = bar.start / 100;
  const end = bar.end === null ? 1 : bar.end / 100;
  return { at, duration: Math.max(end - at, 0.001) };
}
```

Run `npm test` → PASS (39).

- [ ] **Step 3: Use the shared geometry and add the overlay in `src/components/Process.astro`**

Frontmatter: delete the local `GO_LIVE`, `Bar` interface and `bars` array; import instead:

```ts
import { PROCESS_BARS, barLength, type ProcessBar } from '../lib/process';

const barStyle = (bar: ProcessBar) => {
  const len = barLength(bar);
  return len === null ? `--start: ${bar.start}%` : `--start: ${bar.start}%; --len: ${len}%`;
};
```

and use `PROCESS_BARS[i]!` where the template read `bars[i]!`.

Wrap the `<ol class="proc-list"> … </ol>` in `<div class="proc-body"> … </div>` and, inside that wrapper after `</ol>`, add:

```astro
        <div class="proc-overlay" aria-hidden="true">
          <div class="proc-overlay-lane">
            <span class="proc-golive-solid"></span>
            <span class="proc-cursor"><span class="proc-cursor-dot"></span></span>
          </div>
        </div>
```

Append to the `<style>`:

```css
  .proc-body {
    position: relative;
  }
  .proc-overlay {
    display: none;
  }
  @media (min-width: 64rem) {
    .proc-overlay {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-columns: repeat(12, minmax(0, 1fr));
      column-gap: var(--gutter);
      pointer-events: none;
    }
    .proc-overlay-lane {
      position: relative;
      grid-column: 5 / span 8;
    }
    .proc-golive-solid {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 85.714%;
      border-left: 1px solid var(--ink);
      opacity: 0;
    }
    .proc-cursor {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      width: 1px;
      background: var(--ink);
      opacity: 0;
    }
    .proc-cursor-dot {
      position: absolute;
      top: -4px;
      left: -3.5px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ink);
    }
  }
```

- [ ] **Step 4: Create `src/scripts/motion/process.ts`**

```ts
import { gsap } from 'gsap';
import { PROCESS_BARS, barSchedule } from '../../lib/process';

const OPEN = 'inset(0% 0% 0% 0% round 16px)';
const SHUT = 'inset(0% 100% 0% 0% round 16px)';

export function initProcess(): () => void {
  const figure = document.querySelector<HTMLElement>('figure.proc');
  if (!figure) return () => {};
  const rows = Array.from(figure.querySelectorAll<HTMLElement>('.proc-row'));
  const bars = rows.map((row) => row.querySelector<HTMLElement>('.proc-bar'));
  const mm = gsap.matchMedia();

  // Phones and tablets: each mini bar grows once as its stage comes into view.
  mm.add('(max-width: 63.99rem)', () => {
    rows.forEach((row, i) => {
      const bar = bars[i];
      if (!bar) return;
      gsap.fromTo(bar, { clipPath: SHUT }, { clipPath: OPEN, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: row, start: 'top 85%', once: true } });
    });
  });

  // Desktop: a time cursor sweeps the chart; pinned when the whole figure fits the viewport.
  mm.add({ tall: '(min-width: 64rem) and (min-height: 51.25rem)', short: '(min-width: 64rem) and (max-height: 51.24rem)' }, (context) => {
    const { tall } = context.conditions as { tall: boolean; short: boolean };
    const lane = figure.querySelector<HTMLElement>('.proc-overlay-lane');
    const cursor = figure.querySelector<HTMLElement>('.proc-cursor');
    const golive = figure.querySelector<HTMLElement>('.proc-golive-solid');
    if (!lane || !cursor || !golive) return;

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: tall
        ? { trigger: figure, start: 'center center', end: () => `+=${Math.round(window.innerHeight * 1.4)}`, pin: true, scrub: 0.6, invalidateOnRefresh: true }
        : { trigger: figure, start: 'top 70%', end: 'bottom 45%', scrub: 0.6, invalidateOnRefresh: true },
    });

    tl.fromTo(cursor, { x: 0, autoAlpha: 1 }, { x: () => lane.offsetWidth, duration: 1 }, 0);

    rows.forEach((row, i) => {
      const geometry = PROCESS_BARS[i];
      const bar = bars[i];
      if (!geometry || !bar) return;
      const { at, duration } = barSchedule(geometry);
      tl.fromTo(bar, { clipPath: SHUT }, { clipPath: OPEN, duration }, at);
      const info = row.querySelector('.proc-info');
      if (info) tl.fromTo(info, { opacity: 0.28 }, { opacity: 1, duration: 0.04 }, Math.max(at - 0.02, 0));
      const out = row.querySelector('.proc-out');
      if (out) tl.fromTo(out, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04 }, Math.min(at + duration, 0.96));
      const dots = row.querySelectorAll('.proc-demo');
      (geometry.demos ?? []).forEach((x, d) => {
        const dot = dots[d];
        if (dot) tl.fromTo(dot, { scale: 0 }, { scale: 1, duration: 0.03, ease: 'back.out(3)' }, x / 100);
      });
    });

    tl.fromTo(golive, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.02 }, 0.857);
    tl.to(cursor, { autoAlpha: 0, duration: 0.03 }, 0.97);
  });

  return () => mm.revert();
}
```

- [ ] **Step 5: Register it**

`index.ts`: `import { initProcess } from './process';` → list `[initSmoothScroll(), initReveals(), initWork(), initProcess()]`.

- [ ] **Step 6: Build, test, browser check**

Run: `npm run build && npm run test:dist && npm test && npm run check` → dist 122, unit 39, `0 errors`.

At 1440×900 scroll until the Process figure is centred: it pins. Record progress by wheel steps and run:

```js
() => {
  const lane = document.querySelector('.proc-overlay-lane').getBoundingClientRect();
  const cursor = document.querySelector('.proc-cursor').getBoundingClientRect();
  return {
    pinned: Boolean(document.querySelector('.pin-spacer figure.proc')),
    cursor: Math.round(((cursor.left - lane.left) / lane.width) * 100),
    build: getComputedStyle(document.querySelectorAll('.proc-bar')[2]).clipPath,
  };
}
```

Expected: `pinned: true`; `cursor` climbs 0 → 100 as you scroll; the Build bar's clip-path opens while the cursor crosses 23–77 %; the demo dots pop at 34/46/57/69 %; at 86 % the dashed go-live line turns solid; the green Run bar sweeps to the window edge at the end; then the page continues. Scroll back up: everything reverses. At 1440×700 the figure does not pin but still scrubs. At 390 each mini bar grows when its row enters.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add the pinned, scrubbed process timeline

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Principles — word-by-word reading fill

**Files:**
- Create: `src/scripts/motion/principles.ts`
- Modify: `src/scripts/motion/index.ts`

**Interfaces:**
- Produces: `initPrinciples(): () => void` — every word of each `.pr-text` that is not inside `.pr-lead` tweens from `--label` to `--ink`, scrubbed from `top 82%` to `bottom 52%` of the paragraph.

- [ ] **Step 1: Create `src/scripts/motion/principles.ts`**

```ts
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

export function initPrinciples(): () => void {
  const styles = getComputedStyle(document.documentElement);
  const from = styles.getPropertyValue('--label').trim();
  const to = styles.getPropertyValue('--ink').trim();

  const splits = Array.from(document.querySelectorAll<HTMLElement>('.pr-text')).map((text) =>
    SplitText.create(text, {
      type: 'words',
      tag: 'span',
      aria: 'none',
      autoSplit: true,
      onSplit: (self) => {
        const words = self.words.filter((word) => !word.closest('.pr-lead'));
        return gsap.fromTo(
          words,
          { color: from },
          { color: to, ease: 'none', stagger: 0.08, scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 52%', scrub: true } },
        );
      },
    }),
  );

  return () => {
    for (const split of splits) split.revert();
  };
}
```

- [ ] **Step 2: Register it**

`index.ts`: `import { initPrinciples } from './principles';` → add `initPrinciples()` to the list.

- [ ] **Step 3: Build, test, browser check**

Run: `npm run build && npm run test:dist && npm run check` → green.

At 1440 scroll slowly through `#studio`; the grey part of each principle turns ink word by word as the line rises through the lower half of the viewport; the lead-ins stay ink throughout. Check the first principle's last word at two scroll positions:

```js
() => { const words = document.querySelectorAll('.pr-item:first-child .pr-text > span'); return getComputedStyle(words[words.length - 1]).color; }
```

Expected: `rgb(102, 100, 95)` before, `rgb(18, 18, 17)` after. Screen readers still get the full sentence (`aria: 'none'` keeps plain text).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: fill the principles word by word while reading

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Contact sheet, page dim, send-button states, magnetic CTAs

**Files:**
- Create: `src/scripts/motion/contact.ts`, `src/scripts/motion/magnetic.ts`
- Modify: `src/scripts/motion/index.ts`, `src/components/Contact.astro`, `src/components/Hero.astro`, `src/scripts/contact-form.ts`, `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/bs.ts`
- Test: `tests/dist/motion.test.ts` (extend)

**Interfaces:**
- Consumes: `magneticOffset`, `Box` (Task 1).
- Produces: `initContact(): () => void`, `initMagnetic(): () => void`; `.page-dim` overlay; `data-magnetic` hook; form attribute `data-msg-sent`; dictionary `contact.sent`.

- [ ] **Step 1: Dictionary — sent label**

`types.ts`: add `sent: string;` to `contact` (after `sending`). `en.ts`: `sent: 'Sent',`. `bs.ts`: `sent: 'Poslano',`.

- [ ] **Step 2: Extend the dist test (fails first)**

Append to `tests/dist/motion.test.ts`:

```ts
describe.each(pages)('$path contact motion hooks', ({ path, lang }) => {
  const doc = loadPage(path);

  it('places a page-dim layer before the contact section', () => {
    expect(doc.querySelector('.page-dim')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('marks the main calls to action as magnetic', () => {
    expect(doc.querySelectorAll('[data-magnetic]').length).toBeGreaterThanOrEqual(4);
  });

  it('knows how to say "sent"', async () => {
    const { getDictionary } = await import('../../src/i18n');
    expect(doc.querySelector('form[data-contact-form]')?.getAttribute('data-msg-sent')).toBe(getDictionary(lang).contact.sent);
  });
});
```

Run `npm run build && npm run test:dist` → FAIL (no `.page-dim`, too few `[data-magnetic]`, no `data-msg-sent`).

- [ ] **Step 3: Contact markup and styles**

In `src/components/Contact.astro`:

Put the dim layer first in the template (before `<section id="contact" …>`):

```astro
<div class="page-dim" aria-hidden="true"></div>
```

Add `data-msg-sent={c.sent}` to the `<form …>` attributes (next to `data-msg-sending`).

Wrap the submit button and make it magnetic:

```astro
          <span class="cf-submit"><Button type="submit" variant="light" size="l" data-magnetic>{c.submit}</Button></span>
```

Make "Book a call" magnetic: `<Button href={site.callUrl} variant="ghost" size="s" data-magnetic>{c.info.call}</Button>`.

Append to the `<style>`:

```css
  .page-dim {
    position: fixed;
    inset: 0;
    z-index: 1;
    background: var(--night);
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
  }
  .contact {
    position: relative;
    z-index: 2;
  }
  .cf-submit {
    display: inline-flex;
  }
  .cf-submit :global(.btn) {
    position: relative;
  }
  .cf-submit :global(.arr) {
    transition: opacity 0.2s var(--ease-std);
  }
  .cf[data-state='sending'] .cf-submit :global(.arr),
  .cf[data-state='success'] .cf-submit :global(.arr) {
    opacity: 0;
  }
  .cf[data-state='sending'] .cf-submit :global(.btn)::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 26px;
    width: 14px;
    height: 14px;
    margin-top: -7px;
    border: 1.5px solid currentColor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: cf-spin 0.7s linear infinite;
  }
  .cf[data-state='success'] .cf-submit :global(.btn)::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 27px;
    width: 12px;
    height: 6px;
    margin-top: -5px;
    border-bottom: 1.6px solid currentColor;
    border-left: 1.6px solid currentColor;
    transform: rotate(-45deg);
  }
  @keyframes cf-spin {
    to {
      transform: rotate(360deg);
    }
  }
```

In `src/components/Footer.astro` add `position: relative; z-index: 2;` to `.site-footer` (so the dim layer never covers it).

In `src/components/Hero.astro` make the hero CTA magnetic: `<Button href="#contact" size="l" data-magnetic>{t.cta.start}</Button>`.

- [ ] **Step 4: Sent label and reset in `src/scripts/contact-form.ts`**

Replace `setState` with:

```ts
  const setState = (state: FormState): void => {
    form.dataset.state = state;
    if (submit) submit.disabled = state === 'sending';
    if (!submitLabel) return;
    if (state === 'sending') submitLabel.textContent = d.msgSending ?? idleLabel;
    else if (state === 'success') submitLabel.textContent = d.msgSent ?? idleLabel;
    else submitLabel.textContent = idleLabel;
  };
```

and after the `focusout` listener add:

```ts
  form.addEventListener('input', () => {
    if (form.dataset.state === 'success' || form.dataset.state === 'error') setState('idle');
  });
```

- [ ] **Step 5: Create `src/scripts/motion/contact.ts`**

```ts
import { gsap } from 'gsap';

/** The dark contact section rises like a sheet (rounded top, slightly inset) while the page behind it dims. */
export function initContact(): () => void {
  const section = document.getElementById('contact');
  if (!section) return () => {};
  const dim = document.querySelector<HTMLElement>('.page-dim');

  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: section, start: 'top bottom', end: 'top 20%', scrub: true } });
  tl.fromTo(
    section,
    { clipPath: 'inset(0% 3% 0% 3% round 32px 32px 0px 0px)' },
    { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)' },
    0,
  );
  if (dim) tl.fromTo(dim, { autoAlpha: 0 }, { autoAlpha: 0.4 }, 0);

  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
  };
}
```

- [ ] **Step 6: Create `src/scripts/motion/magnetic.ts`**

```ts
import { gsap } from 'gsap';
import { magneticOffset } from '../../lib/motion';

export function initMagnetic(): () => void {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return () => {};
  const detach: Array<() => void> = [];

  for (const el of document.querySelectorAll<HTMLElement>('[data-magnetic]')) {
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });

    const move = (event: PointerEvent): void => {
      // Measure the resting box: subtract the pull already applied.
      const rect = el.getBoundingClientRect();
      const box = {
        left: rect.left - Number(gsap.getProperty(el, 'x')),
        top: rect.top - Number(gsap.getProperty(el, 'y')),
        width: rect.width,
        height: rect.height,
      };
      const { x, y } = magneticOffset(event.clientX, event.clientY, box);
      xTo(x);
      yTo(y);
    };
    const leave = (): void => {
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.45)' });
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    detach.push(() => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      gsap.set(el, { clearProps: 'transform' });
    });
  }

  return () => {
    for (const off of detach) off();
  };
}
```

- [ ] **Step 7: Register both and review the bootstrap**

`src/scripts/motion/index.ts` final version:

```ts
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { initContact } from './contact';
import { initHeader } from './header';
import { initSmoothScroll } from './lenis';
import { initMagnetic } from './magnetic';
import { initPrinciples } from './principles';
import { initProcess } from './process';
import { initReveals } from './reveal';
import { initServices } from './services';
import { initWork } from './work';

gsap.registerPlugin(ScrollTrigger, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

type Cleanup = () => void;

async function boot(): Promise<void> {
  await document.fonts.ready;
  const root = document.documentElement;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  initHeader({ allowHide: !reduced });
  initServices({ animated: !reduced });

  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Un-hide reveal targets in the same task in which the modules set their start states (no flash).
    root.classList.add('motion-ready');
    const cleanups: Cleanup[] = [
      initSmoothScroll(),
      initReveals(),
      initWork(),
      initProcess(),
      initPrinciples(),
      initContact(),
      initMagnetic(),
    ];
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  });

  root.classList.add('motion-ready');
  ScrollTrigger.refresh();
}

void boot();
```

- [ ] **Step 8: Build, test, browser check**

Run: `npm run build && npm run test:dist && npm test && npm run check` → dist 128, unit 39, `0 errors`.

At 1440 scroll from `#studio` into `#contact`: the dark section enters narrower with rounded top corners and widens to full bleed; the paper page behind dims up to 40 %; the header turns dark. Hover "Start a project" in the hero: the pill leans toward the pointer (≤ 14 px) and springs back on leave. Submit the form with a fake key to see states: in the console run `document.querySelector('[name=access_key]').value = 'test'`, fill valid values, click Send → spinner, then (Web3Forms rejects the key) error text with a mailto link; type in any field → back to idle. Screenshots: `t8-sheet-mid.png` (half-risen sheet), `t8-contact.png`.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add contact sheet, page dim, send states and magnetic CTAs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Motion verification — reduced motion, no JS, budget, polish

**Files:**
- Modify: only what the checks below reveal.

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Reduced motion**

With `browser_emulate_media` `reducedMotion: 'reduce'`, reload `/` and `/bs/` at 1440 and 390. Check:

```js
() => ({
  jsMotion: document.documentElement.classList.contains('js-motion'),
  lenis: document.documentElement.classList.contains('lenis'),
  pins: document.querySelectorAll('.pin-spacer').length,
  hiddenReveals: [...document.querySelectorAll('[data-reveal]')].filter((el) => getComputedStyle(el).opacity !== '1').length,
  barClips: [...document.querySelectorAll('.proc-bar')].map((b) => getComputedStyle(b).clipPath),
})
```

Expected: `jsMotion false`, `lenis false`, `pins 0`, `hiddenReveals 0`, every `barClips` entry `"none"`. Scrolling down never hides the header.

- [ ] **Step 2: No JavaScript**

With `browser_run_code_unsafe` (the MCP browser uses a persistent context, so script execution is switched off through CDP; the page's own scripts never run during this load):

```js
async (page) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: true });
  await page.goto('http://127.0.0.1:4321/?nojs=1');
  await page.screenshot({ path: '.playwright-mcp/t9-nojs.jpeg', fullPage: true, type: 'jpeg', quality: 80 });
  await cdp.send('Emulation.setScriptExecutionDisabled', { value: false });
  const hidden = await page.$$eval('[data-reveal]', (els) => els.filter((el) => getComputedStyle(el).opacity !== '1').length);
  const guard = await page.evaluate(() => document.documentElement.classList.contains('js-motion'));
  await cdp.detach();
  return { hidden, guard };
}
```

Expected: `hidden: 0`, `guard: false`; the screenshot shows the complete Plan-1 page.

- [ ] **Step 3: Fail-safe when the bundle never loads**

With `browser_run_code_unsafe`: `await page.route('**/_astro/*.js', (r) => r.abort()); await page.goto('http://127.0.0.1:4321/'); await page.waitForTimeout(3300);` then count hidden reveal targets as above → `0` (the guard removed `js-motion`). Afterwards `await page.unroute('**/_astro/*.js')`.

- [ ] **Step 4: JavaScript budget**

```bash
cd /c/projects/nice && for f in dist/_astro/*.js; do printf "%7d  %s\n" "$(gzip -c "$f" | wc -c)" "$f"; done | sort -n
```

Expected: the sum is ≤ 71 680 bytes (70 KB). If it is larger, list the heaviest chunk and report it before continuing.

- [ ] **Step 5: Smoothness spot-check**

At 1440×900 with `browser_run_code_unsafe`, record a performance trace while wheel-scrolling through Process and Principles:

```js
async (page) => {
  await page.goto('http://127.0.0.1:4321/');
  await page.evaluate(() => { window.__long = []; new PerformanceObserver((l) => window.__long.push(...l.getEntries().map((e) => Math.round(e.duration)))).observe({ type: 'longtask', buffered: true }); });
  for (let i = 0; i < 40; i += 1) { await page.mouse.wheel(0, 250); await page.waitForTimeout(60); }
  return page.evaluate(() => window.__long);
}
```

Expected: no entry above 50 ms after the initial load; if one appears, identify the tween (usually SplitText re-splitting) and fix it.

- [ ] **Step 6: Full visual pass with motion settled**

For 390, 1024, 1440 and both languages: navigate, wheel through the whole page in 400 px steps with 150 ms pauses (so every reveal fires), scroll back to top, then take a full-page screenshot (scrollbar hidden with `html{scrollbar-width:none}` as in Plan 1). Every section must look exactly like its Plan-1 counterpart (reveals finished, bars fully drawn, principles fully inked). Console errors: none.

- [ ] **Step 7: Run everything and commit**

Run: `npm test && npm run build && npm run test:dist && npm run check` → unit 39, dist 128, `0 errors`.

```bash
git add -A
git commit -m "test: verify motion under reduced motion, without JS and on budget

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Implementation notes (deviations found during execution)

| Where | Change | Why |
| --- | --- | --- |
| `src/scripts/motion/lenis.ts` | Anchor targets are measured as `rect.top + window.scrollY − scroll-padding-top` and passed to `lenis.scrollTo` as a number. | A native scroll Lenis has not processed yet (same frame) made element targets land ~450 px off. |
| `src/styles/motion.css` | `.split-line(-mask)` get `display: block`; `.split-word` `inline-block` + `nowrap`; `.split-char(-mask)` `inline-block`. | With `tag: 'span'` SplitText sets no display, and transforms/clipping do nothing on inline spans. |
| `src/scripts/motion/reveal.ts` | `chars` splits also set `wordsClass: 'split-word'`. | Keeps the characters of a word on one line. |
| `src/components/Process.astro` | The chart wrapper is `.proc-chart`, not `.proc-body`. | `.proc-body` already styles the stage description paragraph. |
| `src/scripts/motion/process.ts`, `header.ts` | The pinned chart toggles `html.is-pinned`; the header stays hidden while it is set (unless it has focus). | On scroll-up during the pin the returning header covered the axis labels. |
| `src/components/Header.astro` | Dark tone also dims the EN/BS separator. | The light separator glared on the night header. |
| `src/scripts/motion/work.ts` | The cursor pill hides on `scroll` when the pointer is no longer over a card. | Scrolling moves a card from under a resting pointer without a `pointerleave`. |
| `src/layouts/Base.astro`, `src/styles/base.css` | The head guard always adds `html.js`; `time[data-clock]` is hidden without it. | Without JavaScript the clock showed `--:--`. |

Verification results: unit 39, dist 128, `astro check` 0 errors; reduced motion and no-JS show complete, static pages; the fail-safe un-hides content after 3 s; JavaScript is 55 KB gzip; no long tasks while scrolling the whole page.
