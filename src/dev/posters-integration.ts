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

/** Writes every image in a multipart form to its output; unknown names reject the whole form. */
async function save(root: URL, body: Uint8Array<ArrayBuffer>, type: string): Promise<void> {
  const form = await new Response(body, { headers: { 'content-type': type } }).formData();
  const files = [...form].map(([name, value]) => {
    const target = Object.hasOwn(OUTPUTS, name) ? OUTPUTS[name] : undefined;
    if (!target || typeof value === 'string') throw new Error(`not an output: ${name}`);
    return { target, value };
  });
  await Promise.all(files.map(async ({ target, value }) => writeFile(new URL(`./${target}`, root), Buffer.from(await value.arrayBuffer()))));
}

/**
 * Dev-only poster studio (spec §9.6). `/dev/posters` renders the rings with the real scene and offers a story
 * scrubber; its Save button posts all images in one form to `/__posters`, which writes them into the project (one
 * request, because the first poster written makes the dev server reload the page). Neither the page nor the endpoint
 * exists outside `astro dev`.
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
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end();
            return;
          }
          const chunks: Buffer[] = [];
          req.on('data', (chunk: Buffer) => chunks.push(chunk));
          req.on('end', () => {
            save(root, new Uint8Array(Buffer.concat(chunks)), req.headers['content-type'] ?? '')
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
