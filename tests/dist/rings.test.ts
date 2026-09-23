import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadPage, pages } from './helpers';

describe.each(pages)('$path rings hooks', ({ path }) => {
  const doc = loadPage(path);

  it('decides before first paint whether the 3D rings are worth waiting for', () => {
    const inline = Array.from(doc.querySelectorAll('head script:not([src])')).map((s) => s.textContent ?? '');
    expect(inline.some((code) => code.includes('WebGL2RenderingContext') && code.includes('saveData') && code.includes('rings'))).toBe(true);
  });

  it('ships no canvas — the 3D module adds one only when it runs', () => {
    expect(doc.querySelector('canvas')).toBeNull();
  });

  it('keeps both ring stages as labelled images with posters', () => {
    for (const name of ['hero', 'approach']) {
      const stage = doc.querySelector(`[data-stage="${name}"]`);
      expect(stage?.getAttribute('role'), name).toBe('img');
      expect(stage?.querySelector('picture.stage-poster'), name).not.toBeNull();
    }
  });
});

describe('build output', () => {
  it('leaves the dev poster studio out', () => {
    expect(existsSync(new URL('../../dist/dev/posters/index.html', import.meta.url))).toBe(false);
  });
});
