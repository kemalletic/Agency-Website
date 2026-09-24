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

The 3D runs only with JavaScript, without `prefers-reduced-motion` and without Save-Data, and only on a real GPU
that renders WebGL2 (no major performance caveat, no software renderer such as SwiftShader). A small worker checks
the GPU after `load`, so three.js is never downloaded where it would not run. Everywhere else, and if the GPU drops
the context, visitors get posters rendered from the same scene.

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
