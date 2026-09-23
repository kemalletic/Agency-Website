import { writeFile } from 'node:fs/promises';
import type { AstroIntegration } from 'astro';

const POSTERS = new Set(['hero', 'approach']);

/**
 * Dev-only poster studio (spec §9.6). `/dev/posters` renders the rings' resting states with the real scene and offers a
 * story scrubber; its Save button posts PNGs to `/__posters`, which writes them to src/assets/posters/. Neither the
 * page nor the endpoint exists outside `astro dev`.
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
          if (req.method !== 'POST' || !POSTERS.has(name)) {
            res.statusCode = 400;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            writeFile(new URL(`./src/assets/posters/${name}.png`, root), Buffer.concat(chunks))
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
