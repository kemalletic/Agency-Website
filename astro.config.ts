import { defineConfig, envField, fontProviders } from 'astro/config';

export default defineConfig({
  site: 'https://example.com',
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
