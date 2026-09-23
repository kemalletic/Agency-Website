import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { site } from '../../src/config/site';
import { ogLocale, type Locale } from '../../src/i18n';
import { loadPage, pages, readDist } from './helpers';

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
describe('sitemap and robots.txt', () => {
  it('lists both languages with their alternates, and nothing else', () => {
    expect(readDist('sitemap-index.xml')).toContain('sitemap-0.xml');
    const map = readDist('sitemap-0.xml');
    const locs = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual([new URL('/', site.url).href, new URL('/bs/', site.url).href]);
    expect(map).toContain('hreflang="bs"');
    expect(map).toContain('hreflang="en"');
    expect(map).not.toContain('404');
  });

  it('allows crawling and points at the sitemap', () => {
    const robots = readDist('robots.txt');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    expect(robots).toContain(`Sitemap: ${new URL('/sitemap-index.xml', site.url).href}`);
  });

  it('links the sitemap from every page', () => {
    for (const { path } of pages) expect(loadPage(path).querySelector('link[rel="sitemap"]')?.getAttribute('href')).toBe('/sitemap-index.xml');
  });
});

describe('404 page', () => {
  const doc = loadPage('404.html');

  it('stays out of search', () => {
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex');
    expect(doc.querySelector('link[rel="canonical"]')).toBeNull();
    expect(doc.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('explains itself in both languages and leads home', () => {
    expect(doc.querySelectorAll('h1')).toHaveLength(1);
    expect(doc.querySelector('[lang="bs"]')).not.toBeNull();
    const links = Array.from(doc.querySelectorAll('main a')).map((a) => a.getAttribute('href'));
    expect(links).toContain('/');
    expect(links).toContain('/bs/');
  });

  it('shows the fallen rings', () => {
    expect(doc.querySelector('main picture source[type="image/avif"]')).not.toBeNull();
  });
});
