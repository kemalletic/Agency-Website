import type { Locale } from '../i18n/locales';

type Localized = Record<Locale, string>;

export interface SiteConfig {
  /** Studio name. Shown in the header, footer, page titles and form e-mails. */
  name: string;
  /** Public URL of the site (used for canonical and hreflang links). */
  url: string;
  email: string;
  phone: string;
  address: { street: Localized; city: string; country: Localized; /** ISO 3166-1 alpha-2, e.g. "BA". */ countryCode: string };
  hours: Localized;
  /** Month the next project can start, e.g. "October 2026" / "oktobar 2026". */
  bookingFrom: Localized;
  coordinates: string;
  socials: ReadonlyArray<{ label: string; href: string }>;
  /** Target of "Book a 30-min call" (e.g. a Cal.com link). */
  callUrl: string;
}

// Values in [brackets] are placeholders — replace them with the studio's real details.
export const site: SiteConfig = {
  name: '[NAME]',
  url: 'https://example.com',
  email: 'hello@yourdomain.com',
  phone: '[+387 00 000 000]',
  address: {
    street: { en: '[Street and number]', bs: '[Ulica i broj]' },
    city: '71000 Sarajevo',
    country: { en: 'Bosnia and Herzegovina', bs: 'Bosna i Hercegovina' },
    countryCode: 'BA',
  },
  hours: { en: '[Mon–Fri, 9:00–17:00 CET]', bs: '[pon–pet, 9:00–17:00 CET]' },
  bookingFrom: { en: '[MONTH YEAR]', bs: '[MJESEC GODINA]' },
  coordinates: '43.8563° N, 18.4131° E',
  socials: [
    { label: 'LinkedIn', href: '#' },
    { label: 'GitHub', href: '#' },
    { label: 'Instagram', href: '#' },
  ],
  callUrl: '#contact',
};
