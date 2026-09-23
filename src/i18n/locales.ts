export const locales = ['en', 'bs'] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const languageNames: Record<Locale, string> = { en: 'English', bs: 'Bosanski' };

export const ogLocale: Record<Locale, string> = { en: 'en_US', bs: 'bs_BA' };

export function isLocale(value: string | undefined): value is Locale {
  return value !== undefined && (locales as readonly string[]).includes(value);
}

export function localePath(locale: Locale): string {
  return locale === defaultLocale ? '/' : `/${locale}/`;
}
