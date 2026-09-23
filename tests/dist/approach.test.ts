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

  it('labels the rings in the page language, placed from the 3D view', () => {
    const labels = Array.from(section?.querySelectorAll('.stage-labels .stage-label') ?? []);
    expect(labels.map((label) => label.getAttribute('data-ring'))).toEqual(['design', 'engineering', 'automation']);
    const r = t.approach.rings;
    expect(labels.map((label) => text(label))).toEqual([r.design, r.engineering, r.automation].map((s) => s.toLocaleUpperCase(lang)));
    expect(section?.querySelector('.stage-labels')?.getAttribute('aria-hidden')).toBe('true');
    for (const label of labels) {
      const style = label.getAttribute('style') ?? '';
      for (const axis of ['x', 'y']) {
        const value = Number(new RegExp(`--${axis}:\\s*([\\d.]+)%`).exec(style)?.[1]);
        expect(value, `${label.getAttribute('data-ring')} ${axis}`).toBeGreaterThan(5);
        expect(value, `${label.getAttribute('data-ring')} ${axis}`).toBeLessThan(95);
      }
    }
  });

  it('shows a poster of the approach view until the 3D takes over', () => {
    const stage = section?.querySelector('[data-stage="approach"]');
    expect(Array.from(stage?.querySelectorAll('picture source') ?? []).map((s) => s.getAttribute('type'))).toEqual([
      'image/avif',
      'image/webp',
    ]);
    expect(stage?.querySelector('picture')?.classList.contains('stage-poster')).toBe(true);
    expect(stage?.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    expect(section?.querySelector('.diagram')).toBeNull();
  });

  it('gives the stage an accessible description and caption', () => {
    expect(section?.querySelector('[data-stage="approach"]')?.getAttribute('aria-label')).toBe(t.approach.diagramAlt);
    expect(text(section?.querySelector('figcaption'))).toBe(`${t.approach.fig} — ${t.approach.caption}`);
  });

  it('uses the section label as its heading', () => {
    expect(text(section?.querySelector('h2'))).toBe(t.approach.label);
  });
});
