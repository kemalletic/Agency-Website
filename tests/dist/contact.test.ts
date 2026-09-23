import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { getDictionary } from '../../src/i18n';
import { loadPage, pages, text } from './helpers';

describe.each(pages)('$path contact', ({ path, lang }) => {
  const doc = loadPage(path);
  const t = getDictionary(lang);
  const section = doc.querySelector('section#contact');
  const form = section?.querySelector('form[data-contact-form]');

  it('posts to Web3Forms', () => {
    expect(form?.getAttribute('action')).toBe('https://api.web3forms.com/submit');
    expect(form?.getAttribute('method')?.toLowerCase()).toBe('post');
  });

  it('offers the four needs as checkboxes', () => {
    const values = Array.from(form?.querySelectorAll('input[type="checkbox"][name="needs"]') ?? []).map((i) =>
      i.getAttribute('value'),
    );
    const n = t.contact.needs;
    expect(values).toEqual([n.web, n.app, n.sys, n.unsure]);
  });

  it('requires name, email and message and links each to its error slot', () => {
    for (const name of ['name', 'email', 'message']) {
      const input = form?.querySelector(`[name="${name}"]`);
      expect(input?.hasAttribute('required'), name).toBe(true);
      const errorId = input?.getAttribute('aria-describedby');
      expect(form?.querySelector(`#${errorId}`)?.getAttribute('data-error-for'), name).toBe(name);
    }
  });

  it('has a hidden honeypot and a polite status region', () => {
    expect(form?.querySelector('input[name="botcheck"]')?.hasAttribute('hidden')).toBe(true);
    expect(form?.querySelector('[data-form-status]')?.getAttribute('role')).toBe('status');
  });

  it('carries localized messages for the script', () => {
    expect(form?.getAttribute('data-msg-required')).toBe(t.contact.errors.required);
    expect(form?.getAttribute('data-mail-to')).toBe(site.email);
  });

  it('shows phone, address and hours', () => {
    const info = text(section?.querySelector('.ct-info'));
    expect(info).toContain(site.phone);
    expect(info).toContain(site.address.country[lang]);
    expect(info).toContain(site.hours[lang]);
  });
});

describe.each(pages)('$path footer', ({ path, lang }) => {
  const doc = loadPage(path);
  const footer = doc.querySelector('footer.site-footer');

  it('lists the social links', () => {
    expect(Array.from(footer?.querySelectorAll('nav a') ?? []).map(text)).toEqual(site.socials.map((s) => s.label));
  });

  it('shows the coordinates with a live clock and UTC offset', () => {
    expect(text(footer)).toContain(site.coordinates);
    expect(footer?.querySelector('time[data-clock][data-with-offset="true"]')?.getAttribute('data-locale')).toBe(lang);
  });
});
