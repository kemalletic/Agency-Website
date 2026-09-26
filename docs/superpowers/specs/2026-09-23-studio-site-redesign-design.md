# Redizajn sajta studija — dizajn (spec)

- **Datum:** 2026-09-23
- **Status:** dizajn odobren u razgovoru; ovaj dokument čeka review
- **Polazište:** `Minimal.dc.html` (export iz Claude Design-a) → seli se u `reference/`

---

## 1. Cilj

Pretvoriti mockup u pravi, produkcijski sajt studija koji izgleda „brutalno dobro“, a zadržava
minimalizam i skup, editorijalni izgled originala. Glavni vizuelni motiv — Borromejevi prstenovi
(dizajn + inženjering + automatizacija) — postaje priča koja se odvija dok korisnik skroluje.
Sve ostalo je suzdržano: jedna ideja, urađena savršeno.

### Kriteriji uspjeha

1. Sajt radi na svim širinama od 360 px do 2560 px, na engleskom (`/`) i bosanskom (`/bs/`).
2. Prstenovi: intro sklapanje, putovanje hero → Approach, pinovana sekvenca „Take one away“.
3. Process: pinovani, scroll-scrub Gantt sa kursorom vremena.
4. `prefers-reduced-motion`, bez WebGL-a i bez JS-a — sajt je i dalje kompletan i lijep.
5. Lighthouse: performanse ≥ 90 (mobile) / ≥ 95 (desktop); pristupačnost, best practices ≥ 95; SEO 100.
6. Nula grešaka u konzoli; 60 fps tokom scroll sekvenci na prosječnom laptopu.

## 2. Polazno stanje

| Problem | Posljedica |
| --- | --- |
| Fiksno platno 1440 × 8466 px, `overflow: hidden` | nema mobilne verzije |
| Sve je inline `style` (113 KB), komponente kopirane ručno | neodrživo |
| Render kroz Claude Design runtime (`support.js` + React) | nije produkcijski kod |
| Forma ima `preventDefault` i ništa ne šalje | nema kontakta |
| Nema meta tagova, OG slike, sitemapa | loš SEO |
| Hero raymarcher: 110 koraka + 56 za sjene po pikselu | spor na slabijim GPU-ovima |

Što zadržavamo: paletu, Host Grotesk (300 za display), 12-kolonski grid, „Fig. N“ editorijalni
jezik, sadržaj i redoslijed sekcija, mikro-interakcije (strelice, podvlačenje, pomjeranje naslova).

## 3. Principi

- **Suzdržanost:** najviše dva pinovana trenutka na stranici (prstenovi, Process). Ostalo su kratki
  reveal-i i mikro-interakcije.
- **Istinitost:** animacije prstenova poštuju topologiju — nijedan prsten ne prolazi kroz drugi.
  Borromejevi prstenovi se ne mogu sklopiti bez „otvaranja“ jednog, pa se treći prsten *iscrtava*.
- **Sadržaj prvi:** LCP element je h1 ili hero poster (poster je površinom veći od naslova na
  desktopu), pa poster ide kao AVIF ≤ 60 KB s `fetchpriority="high"`, bez lazy-loada. 3D se učitava
  poslije i nikad ne blokira sadržaj.
- **Jedan izvor istine:** boje i tipografija u CSS tokenima; 3D čita boje iz istih tokena; sav tekst
  u rječnicima po jeziku; lični podaci studija u jednom config fajlu.

## 4. Tech stack

| Sloj | Izbor | Napomena |
| --- | --- | --- |
| Runtime | Node 24.21.0 LTS | instaliran uz postojeće verzije u nvm; `.nvmrc` u projektu |
| Framework | Astro 7.x, statički output | islands; i18n routing; `astro:assets`; Fonts API |
| Jezik | TypeScript (strict) | `astro check` |
| Stilovi | Vanilla CSS: tokeni (custom properties), `@layer`, scoped `<style>` po komponenti | bez Tailwinda |
| Font | Host Grotesk variable preko Astro Fonts API (provider: fontsource; ako ne podrži variable raspon 300–800 → local provider s woff2 fajlovima iz `@fontsource-variable/host-grotesk`), subseti `latin` + `latin-ext` | self-hosted, preload, automatski fallback metrics |
| Animacije | GSAP 3.15: ScrollTrigger, SplitText, DrawSVGPlugin | svi pluginovi besplatni |
| Smooth scroll | Lenis 1.3.x, sinhron sa ScrollTriggerom | samo desktop (pointer: fine), isključen za reduced-motion |
| 3D | Three.js r186 (`WebGLRenderer`, WebGL2) | dinamički import poslije `load` + idle |
| Forma | Web3Forms (fetch, JSON) | ključ u `PUBLIC_WEB3FORMS_KEY`; zamjenjivo |
| SEO | `@astrojs/sitemap`, JSON-LD, OG slika | |
| Testovi | Vitest (čiste funkcije), Playwright (vizuelno, scenariji), Lighthouse | |

Razmatrano i odbačeno: WebGPU (`three/webgpu`) — veći bundle, bez vidljive koristi za tri prstena;
React Three Fiber — zahtijeva React; Tailwind — dizajn je unikatan, markup bi bio pun klasa;
GSAP ScrollSmoother — Lenis je lakši i koristi native scroll.

## 5. Struktura projekta

```
nice/
├─ reference/                  # originalni export, nepromijenjen (samo za poređenje)
├─ docs/superpowers/specs/     # ovaj dokument
├─ public/                     # favicon, robots.txt, og-*.png
├─ src/
│  ├─ config/site.ts           # ime, email, telefon, adresa, sati, booking mjesec, linkovi, accent
│  ├─ i18n/
│  │  ├─ types.ts              # tip Dictionary (oba jezika moraju biti kompletna)
│  │  ├─ en.ts, bs.ts          # sav tekst + nizovi (usluge, projekti, faze, principi)
│  │  └─ index.ts              # locales, getDictionary(), helpers za URL i formatiranje vremena
│  ├─ styles/
│  │  ├─ tokens.css            # boje, tipografska skala, razmaci, radijusi, easing
│  │  ├─ base.css              # reset, tipografija, fokus, grid utilitiji
│  │  └─ motion.css            # početna (skrivena) stanja za reveal-e, samo pod html.js-motion
│  ├─ layouts/Base.astro       # <head>: meta, hreflang, OG, JSON-LD, Font, inline motion guard
│  ├─ components/
│  │  ├─ Header.astro, MobileMenu.astro, LangSwitch.astro, Clock.astro
│  │  ├─ Hero.astro, Approach.astro, Services.astro, Work.astro,
│  │  │  Process.astro, Principles.astro, Contact.astro, Footer.astro
│  │  ├─ art/                  # SVG/HTML ilustracije: ServiceWeb, ServiceApps, ServiceFlow,
│  │  │                        # ProjectPortal, ProjectShop
│  │  └─ ui/                   # Button, SectionHeading, FigCaption, Chip
│  ├─ scripts/
│  │  ├─ motion/               # lenis, reveals, header, services, work, process,
│  │  │                        # principles, contact, magnetic, cursor-pill
│  │  ├─ rings/                # Three.js: curve, geometry, materials, shadows, stages,
│  │  │                        # story (čiste funkcije stanja), renderer, loader
│  │  ├─ form.ts               # validacija + slanje
│  │  └─ main.ts               # ulazna tačka, lazy-load prstenova
│  ├─ assets/posters/          # hero + approach poster (izvorni PNG iz rendera)
│  └─ pages/
│     ├─ index.astro           # en
│     ├─ bs/index.astro        # bs
│     └─ 404.astro
├─ tests/                      # vitest + playwright
├─ astro.config.mjs, tsconfig.json, package.json, .nvmrc, .env.example, README.md
```

## 6. Sadržaj i jezici

- **Rute:** `i18n: { defaultLocale: 'en', locales: ['en', 'bs'], routing: { prefixDefaultLocale: false } }`
  → `/` engleski, `/bs/` bosanski. Obje stranice renderuju istu `Home` kompoziciju s drugim rječnikom.
- **Rječnici:** `en.ts` i `bs.ts` implementiraju isti `Dictionary` tip; TypeScript ne dozvoljava
  build ako prevod fali. Bosanski: ijekavica, latinica, prirodan ton (ne doslovan prevod).
  Primjeri lokalizacije: „Fig. 1“ → „Sl. 1“; „Borromean rings“ → „Borromejevi prstenovi“;
  DESIGN / ENGINEERING / AUTOMATION → DIZAJN / INŽENJERING / AUTOMATIZACIJA.
- **Prekidač jezika:** „EN / BS“ u headeru i mobilnom meniju; vodi na isti hash sekcije u drugom jeziku.
- **`<head>`:** `lang`, `hreflang` (en, bs, x-default → `/`), canonical.
- **Vrijeme:** `Intl.DateTimeFormat` sa `timeZone: 'Europe/Sarajevo'` (en-GB / bs-BA), osvježava se
  svake minute (poravnato na početak minute).
- **Config (`site.ts`):** `name`, `email`, `phone`, `address`, `hours`, `bookingFrom`, `socials`,
  `siteUrl`, `callUrl` (link za „Book a 30-min call“), `accent`, `teamPhoto` (opciono).
  Dok nisu popunjeni, prikazuju se placeholderi kao u dizajnu (`[NAME]`, `[hello@yourdomain.com]`…).

## 7. Vizuelni sistem

### Boje (tokeni)

| Token | Vrijednost | Upotreba |
| --- | --- | --- |
| `--paper` | `#ebe9e4` | pozadina |
| `--paper-2` | `#f3f2ee` | pozadine ilustracija, hover |
| `--paper-3` | `#fbfaf8` | površine mockupa |
| `--porcelain` | `#f4f2ee` | prsten „dizajn“ |
| `--ink` | `#121211` | tekst, linije sekcija |
| `--graphite` | `#2a2a2c` | prsten „inženjering“ |
| `--muted` | `#55534e` | sekundarni tekst |
| `--label` | `#66645f` | etikete, brojevi |
| `--faint` | `#8c8983` | placeholderi |
| `--line` | `#d3d0c9` | tanke linije |
| `--accent` | `#1e4636` | prsten „automatizacija“, tačke, Run traka |
| `--night` / `--night-line` / `--night-muted` | `#121211` / `#34332f` / `#a9a69f` | kontakt sekcija |

### Tipografija

Host Grotesk variable; fluidno između 390 px i 1440 px viewporta (`clamp()`),
iznad 1440 px ostaje na maksimumu.

| Stil | 390 px → 1440 px | Težina / tracking |
| --- | --- | --- |
| Hero h1 | 44 → 92 px, lh 0.97 | 300 / −0.047em |
| Contact h2 | 56 → 112 px, lh 0.95 | 300 / −0.05em |
| Section h2 | 44 → 76 px, lh 0.95 | 300 / −0.05em |
| Service naslov | 32 → 54 px | 300 / −0.04em |
| Approach lead | 28 → 46 px, lh 1.14 | 300 / −0.032em |
| Projekat h3 | 30 → 40 px | 300 / −0.035em |
| Princip / faza h3 | 22 → 30 px | 300 / −0.028em |
| Body L / body / small | 17→18 / 16 / 13–14 px | 400 |
| Label | 11–12 px, uppercase | 500 / 0.14em |

**Layout:** kontejner max 1680 px, bočni padding `clamp(20px, 4.4vw, 64px)`; grid 12 kolona
(≥ 1024 px), 8 (≥ 768 px), 4 (< 768 px); gutter 24 px (16 px na mobitelu). Vertikalni razmak sekcija
fluidno 96 → 176 px. Radijusi 10–12 px za kartice, 999 px za dugmad i chipove.

**Motion tokeni:** `--ease-out: cubic-bezier(.16, 1, .3, 1)` (expo.out), `--ease-std: cubic-bezier(.2, .7, .2, 1)`
(iz originala); trajanja: mikro 0.35 s, reveal 0.9–1.1 s, stagger 0.06–0.08 s.

## 8. Sekcije

### 8.1 Header

- Fiksiran; visina 96 px desktop / 64 px mobitel. Transparentan na vrhu; nakon 80 px skrola dobija
  `--paper` na 85 % + `backdrop-filter: blur(12px)` + donju liniju.
- Sakrije se pri skrolu nadole (translateY −100 %), vrati pri skrolu nagore; nikad se ne sakriva dok
  je fokus unutra ili je meni otvoren.
- Desktop: logo · nav (Work, Services, Process, Studio) · sat „Sarajevo 17:59“ · EN/BS · CTA.
- < 1024 px: logo + dugme „Menu“ → meni preko cijelog ekrana (`--paper`), veliki linkovi (stagger),
  EN/BS, CTA, email, sat. Semantika dijaloga, focus trap, Esc zatvara, pozadina `inert`, Lenis stop.

### 8.2 Hero (Sl./Fig. 1)

- Meta red s gornjom linijom: „Design & engineering studio“ · „Sarajevo, Bosnia and Herzegovina“ ·
  ● „Booking from [MONTH YEAR]“ (na mobitelu samo prvi i treći).
- Desktop: h1 u kolonama 1–7 poravnat dole; bina prstenova kolone 6–12 (kvadrat, ≤ 720 px);
  opis Fig. 1 u kolonama 10–12 dole. Mobitel: meta → h1 → bina (kvadrat, ≤ 520 px) → tekst → CTA → opis.
- Učitavanje (≤ 1.6 s): meta fade; h1 redovi izlaze iz maske (SplitText lines, stagger 0.08, 1.1 s);
  tekst + CTA fade-up od 0.5 s. Intro prstenova počinje čim je 3D spreman — ne čeka ga ništa.
- Bina: `<figure data-stage="hero" role="img" aria-label="…">` s posterom (`<picture>` AVIF/WebP/PNG,
  fiksne dimenzije) i opisom. Pokazivač: nagib prema mišu i prevlačenje (vidi §9).

### 8.3 Approach (Fig. 2)

- Desktop: bina kolone 1–5; tekst kolone 7–12 (etiketa, lead, manji paragraf). Mobitel: bina iznad teksta.
- Nad binom SVG overlay (DOM, lokalizovan): tri tanke linije-vodilice s tačkom i etiketom
  DESIGN / ENGINEERING / AUTOMATION, pozicionirane po projekciji finalnog izometrijskog pogleda.
- Sekvenca „Take one away“ se jednom odvrti sama kad čvor sjedne u binu — detalji u §9.5. Paralelno se u lead tekstu fraze
  „take one away“ i „the whole thing falls apart“ boje iz `--label` u `--ink` u trenucima kad se to
  dešava prstenovima.
- Na kraju putovanja čvora riječi design, engineering, automation u lead tekstu se jedna za drugom
  oboje iz `--label` u `--ink` i takve ostaju. Etikete (tačka, linija, tekst) čekaju sekvencu: crtaju
  se jedna za drugom tek kad se čvor na njenom kraju ponovo sastavi. Riječi nemaju tačke ni druge
  oznake.
- Isticanje jednog prstena (samo u 3D modu, dok je čvor usidren i etikete iscrtane, tj. nakon
  sekvence): mišem preko samog prstena
  (raycast), njegove etikete ili njegove riječi; na dodir tapom na bilo koje od toga (drugi tap
  ili tap drugdje pušta). Ostala dva prstena idu na 15 % opaciteta, njihove etikete na 30 %, a
  riječ istaknutog prstena se podvuče kao link. U poster modu ništa od ovoga ne radi.
- Opis: „Fig. 2 — The same rings, flattened. Take one away and the other two come apart.“ /
  „Sl. 2 — Isti prstenovi, spljošteni. Makni jedan i druga dva se razdvoje.“ Manji paragraf
  („One team from the first sketch…“) je van pina.

### 8.4 Services (03)

- Zaglavlje sekcije (komponenta `SectionHeading`): h2 + broj „(03)“ + uvodni tekst + puna linija.
- Tri reda kao `<details name="services">` (radi bez JS-a, ekskluzivno otvaranje); prvi otvoren.
  JS pojačanje: glatka animacija visine (GSAP), ikona + → − (vertikalna crta scaleY 0), naslov se
  pomjera 10 px na hover.
- Ilustracije (SVG) „ožive“ pri otvaranju, jednom (ponovo pri novom otvaranju):
  - *Websites:* blokovi stranice se slažu, kursor klizne do CTA i „klikne“.
  - *Apps:* stavke liste se redom štikliraju (tačke se pune accentom), stubići grafikona rastu.
  - *Automation:* tačke teku kroz veze (postojeća animacija), čvorovi se redom osvijetle kad tačka stigne.
  Animacije se pauziraju kad red nije vidljiv.
- Reveal: gornja linija svakog reda se iscrta (scaleX), naslovi izlaze iz maske.

### 8.5 Selected work (02)

- Projekat 1 (kartica kolone 1–8, accent pozadina, mockup portala) + info (kolone 10–12).
  Projekat 2 (info kolone 1–3, kartica kolone 5–12, grafit, desktop + telefon mockup).
- Oznake „Placeholder — …“ se uklanjaju; kartica prima ili pravi screenshot (`image` u rječniku/configu)
  ili ugrađenu mockup ilustraciju (trenutni dizajn).
- Reveal kartice: `clip-path: inset(100% 0 0 0 round 12px)` → `inset(0 round 12px)` (1.2 s);
  unutrašnji mockup: parallax translateY 60 px → 0 kroz viewport (scrub).
- Hover (desktop): mockup se podigne (−6 px, −8 px); tamna „pilula“ prati kursor unutar kartice
  („Ask about this project →“ / „Visit the shop ↗“), lerp 0.18.
- Kartica „Your project“: isprekidani okvir kao SVG `rect` čije crtice polako teku na hover;
  pozadina `--paper-2` na hover.

### 8.6 Process (05) — Fig. 3

- Desktop geometrija kao u originalu: opis faza kolone 1–4, Gantt kolone 5–12; jedinica vremena
  = 11.429 % širine; Go-live na 85.714 %; Run traka izlazi van grida do ruba stranice.
- Scroll scrub (pin kada je ≥ 1024 × 820 px; inače bez pina, start `top 70%` → end `bottom 60%`):
  - Početak: mreža vidljiva; trake `scaleX(0)` (origin lijevo); oznake „Out — …“ skrivene; tekst faza `--faint`.
  - Kursor vremena (vertikalna ink linija s tačkom na vrhu) ide 0 % → 100 %.
  - Svaka traka raste tačno do pozicije kursora; faza postaje `--ink` kad je kursor dostigne i ostaje.
  - Demo tačke u Build traci iskaču (scale 0 → 1) kad kursor prođe.
  - „Out — …“ se pojavi kad traka završi.
  - Na Go-live isprekidana linija postaje puna; accent Run traka se izvuče do ruba.
- < 768 px: vertikalni raspored — svaka faza ima mini traku preko cijele širine s istim proporcijama;
  trake rastu pri revealu (bez scruba, bez pina).
- Reduced motion: sve nacrtano, sav tekst `--ink`.

### 8.7 Before you hire us (05)

- Foto (kolone 1–4) `position: sticky; top: 120px` dok lista skroluje; parallax slike samo ako je
  pravi `teamPhoto` postavljen; inače ostaje gradijent-placeholder iz dizajna.
- Lista (kolone 6–12): podebljana uvodna fraza je `--ink`; ostatak rečenice se boji iz `--label`
  u `--ink` riječ po riječ dok red prolazi kroz viewport (scrub, `top 85%` → `top 45%`).
- Linije redova se iscrtavaju pri revealu.

### 8.8 Contact + footer

- Tamni „list“ se podiže preko stranice: gornji radijus 28 px → 0 i blagi scale 0.97 → 1 dok ulazi;
  sloj iza (fiksni, `--night`, pointer-events: none) raste do ~35 % opaciteta — stranica iza blago
  potamni. Kad kontakt popuni ekran, sloj je prekriven.
- „Start a project“ izlazi slovo po slovo iz maske (jednom).
- Forma: chipovi (`aria-pressed`), Name, Email, Company (opciono), Message; validacija (§11);
  dugme: strelica → spinner → kvačica.
- Red s kontaktima: telefon, adresa, radno vrijeme, „Book a 30-min call“ (`callUrl`).
- Footer: logo + accent tačka, © godina, društvene mreže, koordinate + živo vrijeme + UTC offset.
- Mikro (cijeli sajt): magnetna CTA dugmad (jačina 0.25, samo pointer: fine), strelica se pomjera
  na hover, podvlačenje linkova (postojeće).

## 9. Prstenovi (WebGL)

### 9.1 Učitavanje i rezerve

- Uslovi za 3D: WebGL2 dostupan, nije `prefers-reduced-motion`, nije `navigator.connection.saveData`.
  Inače: posteri (statične slike iz istog rendera) u obje bine — kompletno iskustvo bez GPU troška.
- `import()` modula nakon `window.load` + `requestIdleCallback` (timeout 1500 ms). Posteri su vidljivi
  do prvog frejma; zatim fade 0.4 s. Kadriranje canvasa i postera je identično (nema skoka).
- Greška pri inicijalizaciji ili `webglcontextlost` → posteri ostaju / vraćaju se.

### 9.2 Canvas i renderer

- Jedan `<canvas>` `position: fixed; inset: 0; height: 100lvh`, z-index ispod sadržaja,
  `pointer-events: none`, `aria-hidden="true"` (bine nose `role="img"` i opis).
- `WebGLRenderer({ antialias: true, alpha: true })`, `outputColorSpace = SRGB`,
  `toneMapping = NeutralToneMapping` (brand boje ostaju tačne), transparentna pozadina
  (kroz canvas se vidi `--paper`).
- DPR cap: 1.75 desktop, 1.5 mobitel. Render petlja radi samo kad je bina vidljiva
  (IntersectionObserver) **i** kad se nešto mijenja (idle rotacija, inercija, skrol, intro).
  Skriven tab → stop. Resize debounce 150 ms; na touch uređajima ignoriši promjene samo visine < 120 px.

### 9.3 Geometrija i materijali

- Tri zatvorene krivulje: zaobljeni pravougaonik polu-veličine (φ/2, 1/2), radijus ugla 0.3, u
  ravnima XY (dugi po X), YZ (dugi po Y), ZX (dugi po Z) — kao u originalnom shaderu. Vlastita
  `Curve` klasa s analitičkom parametrizacijom po dužini luka (prave + četvrt-krugovi) → ravnomjerna
  cijev i tačno „odcrtavanje“.
- `TubeGeometry`, radijus 0.076; segmenti 256 × 32 (mobitel 160 × 20).
- Odcrtavanje: `geometry.setDrawRange` po segmentima + dvije sferne kapice na krajevima
  (kao `stroke-linecap: round`) koje prate krajeve.
- Materijali (`MeshPhysicalMaterial`, boje čitane iz CSS tokena):
  - Porculan `--porcelain`: roughness 0.38, clearcoat 1.0, clearcoatRoughness 0.12.
  - Grafit `--graphite`: roughness 0.5, clearcoat 0.3, clearcoatRoughness 0.4 (saten).
  - Accent `--accent`: roughness 0.32, clearcoat 0.8, clearcoatRoughness 0.1 (glazirana keramika).
- Svjetlo: `RoomEnvironment` → PMREM kao `scene.environment`; jedno directional svjetlo iz smjera
  originala (−0.34, 1, 0.5) sa shadow mapom 1024 (PCFSoft) za sjene između prstenova.
- Sjena na podu: tehnika *contact shadows* (ortho kamera ispod, depth u 512² render target,
  dva prolaza blura, ravan s toplom tamnom bojom na ~55 % opaciteta). Ažurira se samo kad se objekti pomjere.

### 9.4 Bine i sinhronizacija s DOM-om

- `data-stage="hero"` i `data-stage="approach"`; njihovi dokument-rectovi se keširaju na resize i
  `ScrollTrigger.refresh`; ekranski rect = keširani rect − trenutni scroll (bez layout čitanja po frejmu).
- Objekat se skalira tako da njegov projektovani obuhvat (radijus ≈ 1.1) popuni binu; pod se
  pomjera s objektom.

### 9.5 Stanja (sve čiste funkcije vremena ili progresa → reverzibilno)
1. **Intro** (vremenski, 1.8 s, prvi put u hero bini): porculanski i grafitni prsten uklize iz
   pomjerenih pozicija (nisu spojeni — nema presijecanja); accent se iscrtava 0 → 1 od 0.6 s
   (1.0 s, expo.out); blago „slijeganje“.
2. **Idle** (hero): rotacija oko Y 0.14 rad/s; nagib prema mišu (lerp 0.07); prevlačenje dodaje
   ugaonu brzinu s prigušenjem ~0.95/frejm; `touch-action: pan-y` (horizontalni swipe rotira,
   vertikalni skroluje).
3. **Putovanje** (scrub: Approach od `top bottom` do `top top`): pozicija = lerp(hero rect,
   approach rect); orijentacija = slerp(idle, izometrijska) — dijagonala (1,1,1) prema kameri,
   simetrija 3 reda; dolly-zoom fov 30° → 10° uz korekciju udaljenosti (perspektiva se spljošti);
   riječi u leadu se oboje pri kraju (etikete tek nakon sekvence).
4. **Sekvenca „Take one away“** (vremenska, bez pina, jednom po učitavanju stranice). Kreće odmah
   kad čvor (skoro) sjedne u approach binu — od 95 % putovanja (`PLAY.dock`), da je ne zaustavi skrol
   koji stane koji piksel prije — i bina je na ekranu; počinje od 0.12 (mirna faza se preskače) i
   traje 3.6 s (`PLAY.duration`). Završena ostaje takva: sljedeći dolasci pokazuju cijeli čvor, a
   etikete se crtaju pri kraju putovanja. Ako čitalac ode nazad dok još traje, čvor se sastavi usput
   (kraćim putem, prateći skrol), a etikete i riječi prate putovanje; vraćen unazad do 0 sekvenca se
   kasnije pušta ponovo. Mišem/trackpadom (Lenis), prvi skrol nadolje koji bi prošao sekciju tu stane
   koliko god jak bio zamah (`motion/hold.ts`): Lenis se preusmjeri i uspori tačno na nju, proguta se
   samo ostatak tog zamaha (dok ne zastane 180 ms, najviše 2.5 s); sljedeći skrol, tipke za skrol ili
   scrollbar nastavljaju odmah, skrol nazad gore uvijek. Na dodirnim ekranima se ne hvata (nativna
   inercija se iz skripte ne da pouzdano zaustaviti).

   | Progres | Događaj |
   |---|---|
   | 0.00–0.12 | pogled miruje (preskače se) |
   | 0.12–0.30 | accent prsten se odcrtava (procjep se otvara naprijed i širi u oba smjera); u tekstu „take one away“ → ink |
   | 0.30–0.45 | porculanski i grafitni kliznu jedan iz drugog duž slobodne ose (relativno ±X) |
   | 0.45–0.62 | padnu na pod i polegnu uz mali odskok; kontaktne sjene se izoštre; „the whole thing falls apart“ → ink |
   | 0.62–0.70 | pauza |
   | 0.70–0.88 | podignu se i vrate istim putem |
   | 0.88–0.94 | accent se ponovo iscrta, čvor se vrati u početni položaj |
   | 0.94–1.00 | tek sa cijelim čvorom etikete se iscrtaju jedna za drugom; čvor zaključan |

5. **Završeno:** statičan izometrijski pogled s etiketama; hover isticanje riječi ↔ prsten aktivno.

Provjera putanja: porculanski (XY) i grafitni (YZ) prsten nisu međusobno spojeni; relativno
klizanje duž X drži razmak između cijevi ≥ 0.3 > 2 × 0.076, pa nema presijecanja. Sekvenca
iscrtavanja accent prstena prati njegovu vlastitu putanju, koja ne siječe ostala dva.

### 9.6 Posteri

- Dev stranica `/dev/posters` (ruta se ubacuje lokalnom Astro integracijom samo kad je komanda
  `dev`, pa ne postoji u produkcijskom buildu) renderuje finalna stanja hero i
  approach bine s transparentnom pozadinom; Playwright skripta ih snima (1360 × 1360) u
  `src/assets/posters/`; `astro:assets` generiše AVIF/WebP. Ista stranica generiše OG sliku
  (1200 × 630) za oba jezika.

## 10. Motion sistem

- `scripts/motion/index.ts`: registracija pluginova; Lenis (samo `pointer: fine` i bez reduced-motion):
  `lenis.on('scroll', ScrollTrigger.update)`, `gsap.ticker.add(t => lenis.raf(t * 1000))`,
  `gsap.ticker.lagSmoothing(0)`; sidra idu kroz `lenis.scrollTo(target, { offset: −header })`.
- `gsap.matchMedia()`: sve animacije pod `(prefers-reduced-motion: no-preference)`; u suprotnom se
  odmah postavljaju finalna stanja.
- Deklarativni reveal-i preko data atributa (markup ostaje čist): `data-reveal="lines" | "chars" |
  "rule" | "fade-up" | "clip"`; jedna funkcija skenira DOM.
- Bez FOUC-a: inline skripta u `<head>` dodaje `html.js-motion` (ako nije reduced-motion);
  početna skrivena stanja postoje samo pod tom klasom; fail-safe uklanja klasu nakon 3 s ako se
  motion ne inicijalizuje.
- SplitText tek nakon `document.fonts.ready`; `autoSplit` za ponovni split na resize.
- Hijerarhija: **Nivo 1** (pin + scrub): prstenovi, Process. **Nivo 2** (reveal/scrub bez pina):
  naslovi, linije, kartice, principi, kontakt list. **Nivo 3** (mikro): dugmad, strelice, chipovi,
  accordion, pilula kursora.

## 11. Kontakt forma

- Polja: `needs[]` (chipovi), `name` (obavezno), `email` (obavezno, format), `company`, `message`
  (obavezno, ≥ 10 znakova), honeypot `botcheck` (skriven), `access_key`, `subject`, jezik stranice.
- Validacija: native constraint API + lokalizovane poruke ispod polja (`aria-describedby`,
  `aria-invalid`); poruke se prikazuju na submit, a nakon prvog pokušaja i na blur.
- Slanje: `fetch` POST (JSON) na `https://api.web3forms.com/submit`; stanja idle → sending →
  success (poruka zahvale, forma se resetuje) → error (poruka + `mailto:` link s popunjenim tekstom).
- Bez JS-a: klasičan POST na isti endpoint (Web3Forms vraća svoju stranicu potvrde).
- Bez ključa (`PUBLIC_WEB3FORMS_KEY` prazan): dugme otvara `mailto:` s popunjenim sadržajem;
  u dev modu upozorenje u konzoli.

## 12. SEO

- Title i description po jeziku; canonical; `hreflang`; OG/Twitter meta s OG slikom po jeziku.
- JSON-LD `ProfessionalService`: ime, URL, email, telefon, adresa (Sarajevo), `areaServed`,
  `knowsLanguage` (en, bs).
- `@astrojs/sitemap` s i18n; `robots.txt`; `404.astro`.

## 13. Pristupačnost

- Semantički landmarki, jedan `h1`, ispravan redoslijed naslova, „Skip to content“ link.
- Vidljiv fokus (2 px outline, offset 4 px) na svemu interaktivnom.
- Accordion na `details/summary`; mobilni meni kao dijalog (focus trap, Esc, `inert`).
- Canvas `aria-hidden`; bine `role="img"` s lokalizovanim opisom.
- SplitText zadržava čitljiv tekst za čitače ekrana (aria-label na roditelju).
- Kontrast AA za sav tekst (provjereno: `--label` na `--paper` ≈ 4.8:1).
- Reduced motion poštovan svuda; mikro-interakcije bez pomjeranja sadržaja.

## 14. Performanse (budžet)

| Metrika | Cilj |
| --- | --- |
| Početni JS (GSAP core + ScrollTrigger + SplitText + DrawSVG + Lenis + app) | ≤ 70 KB gz |
| Three.js chunk (lazy) | ≤ 180 KB gz |
| Font (latin + latin-ext, woff2) | ≤ 70 KB |
| LCP (mobile, simulirani 4G) | ≤ 2.0 s |
| CLS | ≤ 0.02 |
| INP | ≤ 200 ms |
| Scroll sekvence | 60 fps na prosječnom laptopu; bez long taskova > 50 ms |

## 15. Testiranje i verifikacija

- **Vitest (TDD za čiste funkcije):** parametrizacija krivulje po dužini luka; funkcije stanja
  sekvence (pozicije/rotacije/draw progress za dati progres, uključujući razmak između cijevi
  kroz cijelu sekvencu); mapiranje rect → world; formatiranje vremena; validacija forme;
  kompletnost rječnika.
- **Build:** `astro check` bez grešaka; `astro build` uspješan.
- **Playwright:** screenshotovi na 390 × 844, 768 × 1024, 1024 × 768, 1440 × 900, 1920 × 1080 za
  `/` i `/bs/`; scenariji reduced-motion (posteri, finalna stanja), bez WebGL-a, bez JS-a;
  tastatura (tab redoslijed, accordion, meni, forma); nula grešaka u konzoli.
- **Lighthouse:** mobile i desktop, ciljevi iz §1.
- **Ručno:** poređenje s `reference/` na 1440 px (tipografija, razmaci, boje).

## 16. Van obima

Stranice pojedinačnih projekata (case study), CMS, blog, analitika, cookie banner (nema praćenja),
tamna tema, backend za formu na vlastitom serveru (Web3Forms je privremeno rješenje).

## 17. Pretpostavke i stvari koje korisnik popunjava

- Ime studija, email, telefon, adresa, radno vrijeme, mjesec „Booking from“, linkovi društvenih
  mreža, URL sajta, link za poziv, Web3Forms ključ, fotografija tima, screenshotovi projekata —
  sve u `src/config/site.ts` / `.env`; do tada placeholderi.
- Bosanski tekst pišem ja; korisnik ga pregleda.
- Hosting nije odlučen: output je statički (`dist/`) i radi na Cloudflare Pages, Netlify, Vercel ili
  bilo kojem statičkom hostingu; README opisuje deploy.
