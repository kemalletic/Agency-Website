import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path principles', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const section = doc.querySelector('section#studio');
  const items = Array.from(section?.querySelectorAll('.pr-item') ?? []);

  it('lists five principles with their lead-ins', () => {
    expect(items.map((li) => text(li.querySelector('.pr-lead')))).toEqual(t.principles.items.map((i) => i.lead));
  });

  it('keeps each full sentence readable', () => {
    expect(items.map((li) => text(li.querySelector('.pr-text')))).toEqual(
      t.principles.items.map((i) => `${i.lead} ${i.body}`),
    );
  });

  it('names the studio in the intro', () => {
    expect(text(section?.querySelector('.sh-intro'))).toContain(site.name);
  });
});
