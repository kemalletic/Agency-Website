import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import type { Locale } from '../../src/i18n';

export const pages: ReadonlyArray<{ path: string; lang: Locale }> = [
  { path: 'index.html', lang: 'en' },
  { path: 'bs/index.html', lang: 'bs' },
];

export function loadPage(path: string): Document {
  const html = readFileSync(new URL(`../../dist/${path}`, import.meta.url), 'utf8');
  return parseHTML(html).document as unknown as Document;
}

/** Text content with all whitespace (including no-break spaces) collapsed to single spaces. */
export function text(el: Element | null | undefined): string {
  return norm(el?.textContent ?? '');
}

export function norm(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
