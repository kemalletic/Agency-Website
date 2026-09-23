import { describe, expect, it } from 'vitest';
import { site, type SiteConfig } from '../../src/config/site';
import { isPlaceholder, structuredData } from '../../src/lib/seo';

const studio: SiteConfig = {
  ...site,
  name: 'Kvadrat',
  url: 'https://kvadrat.ba',
  email: 'hello@kvadrat.ba',
  phone: '+387 33 000 000',
  address: { ...site.address, street: { en: 'Ferhadija 1', bs: 'Ferhadija 1a' } },
  socials: [
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/kvadrat' },
    { label: 'GitHub', href: '#' },
  ],
};
const page = { pageUrl: 'https://kvadrat.ba/', imageUrl: 'https://kvadrat.ba/og-en.jpg', description: 'A studio.' };

describe('isPlaceholder', () => {
  it('spots the template values', () => {
    for (const value of ['[NAME]', 'hello@yourdomain.com', 'https://example.com/', '#', '  ']) expect(isPlaceholder(value), value).toBe(true);
  });

  it('accepts real values', () => {
    for (const value of ['Kvadrat', 'https://kvadrat.ba/', '+387 33 000 000']) expect(isPlaceholder(value), value).toBe(false);
  });
});

describe('structuredData', () => {
  it('describes a filled-in studio as a ProfessionalService', () => {
    expect(structuredData({ site: studio, lang: 'en', ...page })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfessionalService',
      '@id': 'https://kvadrat.ba/#studio',
      name: 'Kvadrat',
      url: 'https://kvadrat.ba/',
      image: 'https://kvadrat.ba/og-en.jpg',
      description: 'A studio.',
      email: 'hello@kvadrat.ba',
      telephone: '+387 33 000 000',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Ferhadija 1',
        postalCode: '71000',
        addressLocality: 'Sarajevo',
        addressCountry: 'BA',
      },
      geo: { '@type': 'GeoCoordinates', latitude: 43.8563, longitude: 18.4131 },
      areaServed: 'Bosnia and Herzegovina',
      knowsLanguage: ['en', 'bs'],
      sameAs: ['https://www.linkedin.com/company/kvadrat'],
    });
  });

  it('uses the street name of the page language', () => {
    const data = structuredData({ site: studio, lang: 'bs', ...page }) as { address: { streetAddress: string } };
    expect(data.address.streetAddress).toBe('Ferhadija 1a');
  });

  it('leaves out every value that is still a placeholder', () => {
    const data = structuredData({ site, lang: 'en', ...page, pageUrl: 'https://example.com/', imageUrl: 'https://example.com/og-en.jpg' });
    expect(JSON.stringify(data)).not.toMatch(/"\[|yourdomain|example\.com/);
    for (const key of ['@id', 'name', 'url', 'image', 'email', 'telephone', 'sameAs']) expect(data, key).not.toHaveProperty(key);
    expect(data).toMatchObject({ '@type': 'ProfessionalService', address: { postalCode: '71000', addressLocality: 'Sarajevo' } });
  });
});
