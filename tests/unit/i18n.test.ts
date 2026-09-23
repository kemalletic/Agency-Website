import { describe, expect, it } from 'vitest';
import { fill, getDictionary, isLocale, localePath, pad2 } from '../../src/i18n';
import { bs } from '../../src/i18n/bs';
import { en } from '../../src/i18n/en';

type Shape = string | Shape[] | { [key: string]: Shape };

function shape(value: unknown): Shape {
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) return value.map(shape);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => [key, shape(v)]),
    );
  }
  return typeof value;
}

function strings(value: unknown, path = ''): Array<[string, string]> {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value)) return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, v]) => strings(v, path ? `${path}.${key}` : key));
  }
  return [];
}

describe('dictionaries', () => {
  it('have the same structure in English and Bosnian', () => {
    expect(shape(bs)).toEqual(shape(en));
  });

  it('contain no empty strings', () => {
    for (const dict of [en, bs]) {
      for (const [path, s] of strings(dict)) expect(s.trim(), path).not.toBe('');
    }
  });

  it('mark all three rings, in order, in the approach lead', () => {
    for (const dict of [en, bs]) {
      const rings = dict.approach.lead.flatMap((seg) => (typeof seg === 'object' && 'ring' in seg ? [seg.ring] : []));
      expect(rings).toEqual(['design', 'engineering', 'automation']);
    }
  });

  it('are returned per locale', () => {
    expect(getDictionary('en')).toBe(en);
    expect(getDictionary('bs')).toBe(bs);
  });
});

describe('locale helpers', () => {
  it('maps locales to their home paths', () => {
    expect(localePath('en')).toBe('/');
    expect(localePath('bs')).toBe('/bs/');
  });

  it('recognises supported locales only', () => {
    expect(isLocale('bs')).toBe(true);
    expect(isLocale('de')).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it('fills named placeholders and keeps unknown ones', () => {
    expect(fill('{name} is in {city}', { name: 'Studio' })).toBe('Studio is in {city}');
  });

  it('pads numbers to two digits', () => {
    expect(pad2(3)).toBe('03');
    expect(pad2(12)).toBe('12');
  });
});
