/**
 * Headless and GPU-less browsers can hand out a software WebGL context (SwiftShader, llvmpipe) even with
 * failIfMajorPerformanceCaveat; a slideshow is worse than a poster, so these count as no WebGL.
 */
export const isSoftwareRenderer = (name: string): boolean => /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);

/** The GPU's name. Chromium masks RENDERER ("WebKit WebGL") and needs the debug extension; Firefox answers directly (and warns if asked). */
export function rendererName(gl: WebGL2RenderingContext): string {
  const name = String(gl.getParameter(gl.RENDERER));
  if (!/webkit webgl/i.test(name)) return name;
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  return info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : name;
}
