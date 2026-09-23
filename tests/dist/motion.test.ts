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
