import { describe, expect, it } from 'vitest';
import { isSoftwareRenderer, rendererName } from '../../src/lib/rings/gpu';

/** Just enough of a WebGL context for rendererName. */
function fakeContext(renderer: string, unmasked?: string) {
  const RENDERER = 0x1f01;
  const UNMASKED_RENDERER_WEBGL = 0x9246;
  const asked: string[] = [];
  const gl = {
    RENDERER,
    getParameter: (parameter: number) => (parameter === RENDERER ? renderer : parameter === UNMASKED_RENDERER_WEBGL ? unmasked : null),
    getExtension: (name: string) => {
      asked.push(name);
      return unmasked === undefined ? null : { UNMASKED_RENDERER_WEBGL };
    },
  };
  return { gl: gl as unknown as WebGL2RenderingContext, asked };
}

describe('isSoftwareRenderer', () => {
  it.each([
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'softpipe',
    'Microsoft Basic Render Driver',
    'Software Adapter',
  ])('rejects %s', (name) => {
    expect(isSoftwareRenderer(name)).toBe(true);
  });

  it.each([
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x00002504) Direct3D11 vs_5_0 ps_5_0, D3D11)',
    'Apple GPU',
    'Mali-G78',
    'Adreno (TM) 650',
    'Intel(R) UHD Graphics 620',
  ])('accepts %s', (name) => {
    expect(isSoftwareRenderer(name)).toBe(false);
  });
});

describe('rendererName', () => {
  it('unmasks the name behind Chromium’s "WebKit WebGL"', () => {
    const { gl } = fakeContext('WebKit WebGL', 'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device))');
    expect(rendererName(gl)).toContain('SwiftShader');
  });

  it('keeps a name that is not masked, without asking for the debug extension', () => {
    const { gl, asked } = fakeContext('Apple GPU', 'unused');
    expect(rendererName(gl)).toBe('Apple GPU');
    expect(asked).toEqual([]);
  });

  it('falls back to the masked name when the debug extension is missing', () => {
    const { gl } = fakeContext('WebKit WebGL');
    expect(rendererName(gl)).toBe('WebKit WebGL');
  });
});
