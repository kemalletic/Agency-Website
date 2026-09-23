import type { SiteConfig } from '../config/site';
import type { Locale } from '../i18n/locales';

const PLACEHOLDER_HOSTS = ['example.com', 'yourdomain.com'];

/** Template values — `[…]`, example domains, `#` links, blanks — that must never be published as facts. */
export function isPlaceholder(value: string): boolean {
  const text = value.trim();
  return text === '' || text === '#' || /^\[.*\]$/.test(text) || PLACEHOLDER_HOSTS.some((host) => text.includes(host));
}

const real = (value: string): string | undefined => (isPlaceholder(value) ? undefined : value);

/** "43.8563° N, 18.4131° E" → signed decimal degrees. */
function coordinates(text: string): { latitude: number; longitude: number } | undefined {
  const match = /([\d.]+)°\s*([NS]),\s*([\d.]+)°\s*([EW])/.exec(text);
  if (!match) return undefined;
  const [, lat, ns, long, ew] = match;
  return { latitude: Number(lat) * (ns === 'S' ? -1 : 1), longitude: Number(long) * (ew === 'W' ? -1 : 1) };
}

/** Drops keys whose value is undefined (JSON-LD should not carry empty facts). */
function compact<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as Partial<T>;
}

export interface StructuredDataInput {
  site: SiteConfig;
  lang: Locale;
  /** Absolute URL of the page (from Astro's configured `site`). */
  pageUrl: string;
  /** Absolute URL of the page's social card. */
  imageUrl: string;
  description: string;
}

/** schema.org ProfessionalService for the studio (spec §12). Values still in template form are left out. */
export function structuredData({ site, lang, pageUrl, imageUrl, description }: StructuredDataInput): Record<string, unknown> {
  const url = real(pageUrl);
  const city = /^(\d{4,6})\s+(.+)$/.exec(site.address.city);
  const geo = coordinates(site.coordinates);
  const sameAs = site.socials.map((social) => social.href).filter((href) => !isPlaceholder(href));
  return compact({
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': url ? `${new URL('/', url).href}#studio` : undefined,
    name: real(site.name),
    url,
    image: url ? real(imageUrl) : undefined,
    description,
    email: real(site.email),
    telephone: real(site.phone),
    address: compact({
      '@type': 'PostalAddress',
      streetAddress: real(site.address.street[lang]),
      postalCode: city?.[1],
      addressLocality: city?.[2] ?? site.address.city,
      addressCountry: site.address.countryCode,
    }),
    geo: geo ? { '@type': 'GeoCoordinates', ...geo } : undefined,
    areaServed: site.address.country.en,
    knowsLanguage: ['en', 'bs'],
    sameAs: sameAs.length ? sameAs : undefined,
  });
}
