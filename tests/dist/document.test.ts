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
