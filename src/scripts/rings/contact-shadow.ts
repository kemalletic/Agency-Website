import {
  Group,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  UniformsUtils,
  Vector2,
  WebGLRenderTarget,
  type Color,
  type Scene,
  type Vector3,
  type WebGLRenderer,
} from 'three';
import { HorizontalBlurShader } from 'three/addons/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/addons/shaders/VerticalBlurShader.js';

/** Floor area the shadow covers (world units, centred under the knot) and how high above it objects still mark it. */
const SIZE = 6;
const REACH = 2.4;

const blurMaterial = (shader: typeof HorizontalBlurShader | typeof VerticalBlurShader): ShaderMaterial =>
  new ShaderMaterial({ ...shader, uniforms: UniformsUtils.clone(shader.uniforms), depthTest: false });

/**
 * Soft floor shadows, after three.js' webgl_shadow_contact example but cast along the key light: every surface is
 * projected down the light ray onto the floor (a parallel projection), the lowest one wins and marks the floor darker
 * the closer it is; the result is blurred twice and laid on the floor as a warm, dark stain.
 * `update` re-renders it — call it only when something moved.
 */
export class ContactShadow {
  readonly group = new Group();
  // Only frames the blur passes; the depth pass projects along the light by itself.
  private readonly camera = new OrthographicCamera(-SIZE / 2, SIZE / 2, SIZE / 2, -SIZE / 2, 0, REACH);
  private readonly target: WebGLRenderTarget;
  private readonly blurred: WebGLRenderTarget;
  private readonly depth: ShaderMaterial;
  private readonly horizontal = blurMaterial(HorizontalBlurShader);
  private readonly vertical = blurMaterial(VerticalBlurShader);
  private readonly plane = new PlaneGeometry(SIZE, SIZE).rotateX(Math.PI / 2);
  private readonly blurPlane: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly floor: Mesh<PlaneGeometry, ShaderMaterial>;

  /** `light` points towards the key light (unit length); `floorY` is the floor's height in world space. */
  constructor(resolution: number, color: Color, light: Vector3, floorY: number) {
    this.target = new WebGLRenderTarget(resolution, resolution);
    this.blurred = new WebGLRenderTarget(resolution, resolution);
    this.target.texture.generateMipmaps = false;
    this.blurred.texture.generateMipmaps = false;
    const slant = new Vector2(light.x / light.y, light.z / light.y);
    this.depth = new ShaderMaterial({
      uniforms: { slant: { value: slant }, floorY: { value: floorY } },
      vertexShader: `
        uniform vec2 slant;
        uniform float floorY;
        varying float vHeight;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vHeight = world.y - floorY;
          // Follow the light ray down to the floor; x and z map to the texture's u and v.
          vec2 spot = world.xz - slant * vHeight;
          gl_Position = vec4(spot / ${(SIZE / 2).toFixed(1)}, vHeight / ${REACH.toFixed(1)} * 2.0 - 1.0, 1.0);
        }`,
      // Opaque with a depth test, so the surface nearest the floor wins; high parts still leave a lighter mark.
      fragmentShader: `
        varying float vHeight;
        void main() {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0 - 0.5 * clamp(vHeight / ${REACH.toFixed(1)}, 0.0, 1.0));
        }`,
    });
    this.floor = new Mesh(
      this.plane,
      new ShaderMaterial({
        uniforms: {
          map: { value: this.target.texture },
          color: { value: color },
          opacity: { value: 1 },
          spread: { value: 1 },
          // The knot's centre seen down the light ray: the stain fades out around it.
          center: { value: slant.clone().multiplyScalar(floorY) },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform sampler2D map;
          uniform vec3 color;
          uniform float opacity;
          uniform float spread;
          uniform vec2 center;
          varying vec2 vUv;
          void main() {
            vec2 p = (vUv - 0.5) * ${SIZE.toFixed(1)} - center;
            float falloff = exp(-0.5 * dot(p, p) / (spread * spread));
            gl_FragColor = vec4(color, texture2D(map, vUv).a * opacity * falloff);
            #include <colorspace_fragment>
          }`,
        transparent: true,
        depthWrite: false,
      }),
    );
    // The plane was turned to face the camera below; a mirror in y makes it face up without flipping the texture.
    this.floor.scale.y = -1;
    this.floor.renderOrder = -1;
    this.blurPlane = new Mesh(this.plane, this.horizontal);
    this.blurPlane.visible = false;
    this.camera.rotation.x = Math.PI / 2;
    this.group.add(this.floor, this.blurPlane, this.camera);
  }

  /** Strength (0..1) of the stain and the radius (world units) over which it fades out around the knot. */
  set(opacity: number, spread: number): void {
    this.floor.material.uniforms.opacity.value = opacity;
    this.floor.material.uniforms.spread.value = spread;
  }

  update(renderer: WebGLRenderer, scene: Scene, blur: number): void {
    const previousTarget = renderer.getRenderTarget();
    const previousOverride = scene.overrideMaterial;
    this.floor.visible = false;
    scene.overrideMaterial = this.depth;
    scene.updateMatrixWorld();
    renderer.setRenderTarget(this.target);
    renderer.render(scene, this.camera);
    scene.overrideMaterial = previousOverride;
    this.floor.visible = true;
    this.blur(renderer, blur);
    this.blur(renderer, blur * 0.4);
    renderer.setRenderTarget(previousTarget);
  }

  private blur(renderer: WebGLRenderer, amount: number): void {
    this.blurPlane.visible = true;
    this.blurPlane.material = this.horizontal;
    this.horizontal.uniforms.tDiffuse.value = this.target.texture;
    this.horizontal.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(this.blurred);
    renderer.render(this.blurPlane, this.camera);
    this.blurPlane.material = this.vertical;
    this.vertical.uniforms.tDiffuse.value = this.blurred.texture;
    this.vertical.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(this.target);
    renderer.render(this.blurPlane, this.camera);
    this.blurPlane.visible = false;
  }

  dispose(): void {
    this.target.dispose();
    this.blurred.dispose();
    this.plane.dispose();
    this.depth.dispose();
    this.horizontal.dispose();
    this.vertical.dispose();
    this.floor.material.dispose();
  }
}
