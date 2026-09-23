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
