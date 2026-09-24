// Worker: answers whether WebGL2 runs on a real GPU — true, false, or null when it cannot tell from here (no WebGL on
// OffscreenCanvas). Creating the first WebGL context also sets up the GPU side (up to ~100 ms, a synchronous wait);
// here that wait happens off the page's main thread, and the page's own context afterwards comes quickly.
import { isSoftwareRenderer, rendererName } from '../../lib/rings/gpu';

let verdict: boolean | null = null;
try {
  const gl = new OffscreenCanvas(1, 1).getContext('webgl2', { failIfMajorPerformanceCaveat: true });
  if (gl) {
    verdict = !isSoftwareRenderer(rendererName(gl));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  }
} catch {
  verdict = null;
}
postMessage(verdict);
