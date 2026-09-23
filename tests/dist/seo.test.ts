import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { ogLocale, type Locale } from '../../src/i18n';
import { loadPage, pages } from './helpers';

const inDist = (path: string): boolean => existsSync(new URL(`../../dist/${path}`, import.meta.url));

describe.each(pages)('$path social cards and structured data', ({ path, lang }) => {
  const doc = loadPage(path);
  const meta = (key: string) => doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content');

  it('shares the card of the page language', () => {
    const card = new URL(`/og-${lang}.jpg`, site.url).href;
    expect(meta('og:image')).toBe(card);
    expect(meta('twitter:image')).toBe(card);
    expect(inDist(`og-${lang}.jpg`)).toBe(true);
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
    expect(meta('twitter:card')).toBe('summary_large_image');
    expect(meta('og:site_name')).toBe(site.name);
    const other: Locale = lang === 'en' ? 'bs' : 'en';
    expect(meta('og:locale:alternate')).toBe(ogLocale[other]);
  });

  it('describes the studio as structured data, without placeholders', () => {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
    const data = JSON.parse(scripts[0]?.textContent ?? '{}') as Record<string, unknown>;
    expect(data['@type']).toBe('ProfessionalService');
    expect(data.knowsLanguage).toEqual(['en', 'bs']);
    expect(JSON.stringify(data)).not.toMatch(/"\[|yourdomain/);
  });

  it('offers a touch icon', () => {
    expect(doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href')).toBe('/apple-touch-icon.png');
    expect(inDist('apple-touch-icon.png')).toBe(true);
  });

  it('stays indexable', () => {
    expect(doc.querySelector('meta[name="robots"]')).toBeNull();
    expect(doc.querySelector('link[rel="canonical"]')).not.toBeNull();
  });
});
