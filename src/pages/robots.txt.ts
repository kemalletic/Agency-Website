import type { APIRoute } from 'astro';
import { site as config } from '../config/site';

/** Everything may be crawled; the sitemap lists both languages (spec §12). */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site ?? config.url).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
