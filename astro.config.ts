import sitemap from '@astrojs/sitemap';
import { defineConfig, envField, fontProviders } from 'astro/config';
import { site } from './src/config/site';
import { devPosters } from './src/dev/posters-integration';

export default defineConfig({
  // SITE_URL lets a preview deployment (or a local Lighthouse run) publish its own absolute URLs.
  site: process.env.SITE_URL || site.url,
  integrations: [
    devPosters(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', bs: 'bs' } },
      filter: (page) => !new URL(page).pathname.startsWith('/404'),
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'bs'],
    routing: { prefixDefaultLocale: false },
  },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Host Grotesk',
      cssVariable: '--font-sans',
      weights: ['300 800'],
      styles: ['normal'],
      subsets: ['latin', 'latin-ext'],
      fallbacks: ['Helvetica Neue', 'Arial', 'sans-serif'],
    },
  ],
  env: {
    schema: {
      PUBLIC_WEB3FORMS_KEY: envField.string({ context: 'client', access: 'public', optional: true }),
    },
  },
  devToolbar: { enabled: false },
});
