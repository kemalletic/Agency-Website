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
    expect(hero?.querySelector('picture')?.classList.contains('stage-poster')).toBe(true);
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
