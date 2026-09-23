import { bs } from './bs';
import { en } from './en';
import type { Locale } from './locales';
import type { Dictionary } from './types';

export * from './locales';
export type { Dictionary, MarkKey, ProjectItem, RichSegment, RichText, RingKey, ServiceItem } from './types';

const dictionaries: Record<Locale, Dictionary> = { en, bs };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function fill(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
