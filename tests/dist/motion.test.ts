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
