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
