import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path header', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const header = doc.querySelector('header.site-header');

  it('shows the studio name', () => {
    expect(text(header?.querySelector('.brand-name'))).toBe(site.name);
  });

  it('links to every section', () => {
    const links = Array.from(header?.querySelectorAll('nav.nav a') ?? []);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['#work', '#services', '#process', '#studio']);
    expect(links.map(text)).toEqual([t.nav.work, t.nav.services, t.nav.process, t.nav.studio]);
  });

  it('marks the current language', () => {
    const current = header?.querySelector('.lang a[aria-current="page"]');
    expect(current?.getAttribute('hreflang')).toBe(lang);
  });

  it('wires the menu button to the menu dialog', () => {
    const button = header?.querySelector('[data-menu-open]');
    expect(button?.getAttribute('aria-controls')).toBe('site-menu');
    expect(button?.getAttribute('aria-expanded')).toBe('false');
    expect(doc.querySelector('dialog#site-menu[data-menu]')).not.toBeNull();
  });

  it('renders a live Sarajevo clock', () => {
    expect(header?.querySelector('time[data-clock]')?.getAttribute('data-locale')).toBe(lang);
  });

  it('has a start-a-project call to action', () => {
    const cta = header?.querySelector('a.btn[href="#contact"]');
    expect(text(cta)).toBe(t.cta.start);
  });
});
