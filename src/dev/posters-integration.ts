import { writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';

/** What the studio may write, by name: stage and 404 posters, the social cards and the touch icon. */
const OUTPUTS: Record<string, string> = {
  hero: 'src/assets/posters/hero.png',
  approach: 'src/assets/posters/approach.png',
  fallen: 'src/assets/posters/fallen.png',
  'og-en': 'public/og-en.jpg',
  'og-bs': 'public/og-bs.jpg',
  'apple-touch-icon': 'public/apple-touch-icon.png',
};

/**
 * Dev-only poster studio (spec §9.6). `/dev/posters` renders the rings with the real scene and offers a story
 * scrubber; its Save button posts the images to `/__posters`, which writes them into the project. Neither the page
 * nor the endpoint exists outside `astro dev`.
 */
export function devPosters(): AstroIntegration {
  let root = new URL('file:///');
  return {
    name: 'dev-posters',
    hooks: {
      'astro:config:setup': ({ command, config, injectRoute }) => {
        root = config.root;
        if (command === 'dev') injectRoute({ pattern: '/dev/posters', entrypoint: new URL('./src/dev/posters.astro', root) });
      },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/__posters', (req, res) => {
          const name = new URL(req.url ?? '/', 'http://localhost').searchParams.get('name') ?? '';
          const target = Object.hasOwn(OUTPUTS, name) ? OUTPUTS[name] : undefined;
          if (req.method !== 'POST' || !target) {
            res.statusCode = 400;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            writeFile(new URL(`./${target}`, root), Buffer.concat(chunks))
              .then(() => res.end('ok'))
              .catch((error: unknown) => {
                res.statusCode = 500;
                res.end(String(error));
              });
          });
        });
      },
    },
  };
}
