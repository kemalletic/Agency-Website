import { describe, expect, it } from 'vitest';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path services', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const rows = Array.from(doc.querySelectorAll('section#services details'));

  it('renders one exclusive accordion row per service', () => {
    expect(rows).toHaveLength(t.services.items.length);
    expect(rows.every((d) => d.getAttribute('name') === 'services')).toBe(true);
  });

  it('opens only the first row', () => {
    expect(rows.map((d) => d.hasAttribute('open'))).toEqual([true, false, false]);
  });

  it('uses the service titles as h3 inside each summary', () => {
    expect(rows.map((d) => text(d.querySelector('summary h3')))).toEqual(t.services.items.map((i) => i.title));
  });

  it('lists what each service includes', () => {
    expect(rows.map((d) => d.querySelectorAll('.svc-chips li').length)).toEqual(
      t.services.items.map((i) => i.includes.length),
    );
  });

  it('draws one illustration per service', () => {
    expect(rows.every((d) => d.querySelector('.svc-art svg') !== null)).toBe(true);
  });

  it('localizes the automation flow labels', () => {
    const labels = Array.from(rows[2]?.querySelectorAll('.node-label') ?? []).map(text);
    expect(labels).toEqual(Object.values(t.services.flow));
  });

  it('shows the section count', () => {
    expect(text(doc.querySelector('#services-title .sh-count'))).toBe('(03)');
  });
});
