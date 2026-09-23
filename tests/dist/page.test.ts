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
