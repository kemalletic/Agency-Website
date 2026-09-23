import { describe, expect, it } from 'vitest';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path process', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const rows = Array.from(doc.querySelectorAll('section#process ol.proc-list > li'));

  it('lists the five stages in order', () => {
    expect(rows.map((li) => text(li.querySelector('h3')))).toEqual(t.process.stages.map((s) => s.title));
  });

  it('states what each stage delivers', () => {
    expect(rows.map((li) => text(li.querySelector('.proc-out')))).toEqual(
      t.process.stages.map((s) => `${t.process.out} ${s.out}`),
    );
  });

  it('draws one bar per stage and four demos in Build', () => {
    expect(rows.map((li) => li.querySelectorAll('.proc-bar').length)).toEqual([1, 1, 1, 1, 1]);
    expect(rows[2]?.querySelectorAll('.proc-demo')).toHaveLength(4);
    expect(rows[4]?.querySelector('.proc-bar--accent')).not.toBeNull();
  });

  it('hides the drawing from screen readers but not the deliverables', () => {
    expect(rows.every((li) => li.querySelector('.proc-track')?.getAttribute('aria-hidden') === 'true')).toBe(true);
    expect(rows.every((li) => li.querySelector('.proc-out')?.closest('[aria-hidden]') === null)).toBe(true);
  });

  it('explains the demo dot in the caption', () => {
    const caption = text(doc.querySelector('section#process figcaption'));
    expect(caption).toContain(t.process.fig);
    expect(caption).toContain(`${t.process.captionBefore} ${t.process.pillAlt} ${t.process.captionAfter}`);
  });
});
