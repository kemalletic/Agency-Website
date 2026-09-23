import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  Vector3,
  type MeshPhysicalMaterial,
  type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FLOOR_Y, LIGHT_DIRECTION } from '../../lib/rings/config';
import { cameraDistance, viewOffset, type Stage } from '../../lib/rings/layout';
import { lerp } from '../../lib/rings/math';
import { RING_KEYS, towardCamera, type RingKey, type SceneState } from '../../lib/rings/story';
import { ContactShadow } from './contact-shadow';
import { DrawableRing, ringTube, type TubeDetail } from './geometry';
import { ringMaterial } from './materials';

export interface Quality {
  tube: TubeDetail;
  shadowMap: number;
  contact: number;
}

export const QUALITY = {
  high: { tube: { segments: 256, radial: 32 }, shadowMap: 1024, contact: 512 },
  low: { tube: { segments: 160, radial: 20 }, shadowMap: 512, contact: 256 },
} satisfies Record<string, Quality>;

export interface Viewport {
  width: number;
  height: number;
}

/** Per-ring opacity; below 1 while a word in the approach lead points at another ring. */
export type Weights = Record<RingKey, number>;

/** The floor stain: warm dark ink at about 55 % (spec §9.3). */
const STAIN = '#2e2822';
const STAIN_OPACITY = 0.7;

export interface RingsScene {
  readonly camera: PerspectiveCamera;
  readonly scene: Scene;
  /** Puts rings, camera and floor into `state`, framed in `stage` (viewport pixels). */
  apply(state: SceneState, stage: Stage, viewport: Viewport, weights: Weights): void;
  render(): void;
  dispose(): void;
}

/** Builds the scene on `renderer`; `pause` lets the page breathe after the heaviest step (prefiltering the environment). */
export async function createRingsScene(
  renderer: WebGLRenderer,
  colors: Record<RingKey, string>,
  quality: Quality,
  pause: () => Promise<void> = () => Promise.resolve(),
): Promise<RingsScene> {
  renderer.setClearColor(0x000000, 0);
  // Shader error checks cost a synchronous GPU round trip per program and only log in production.
  renderer.debug.checkShaderErrors = import.meta.env.DEV;
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  renderer.shadowMap.autoUpdate = false;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  scene.environment = environment;
  scene.environmentIntensity = 0.5;
  await pause();

  // Key light from the original shader's direction; its shadow map carries the shadows the rings cast on each other.
  const key = new DirectionalLight(new Color(1, 0.972, 0.935), 2.3);
  key.position.set(...LIGHT_DIRECTION).normalize().multiplyScalar(6);
  key.castShadow = true;
  key.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
  key.shadow.radius = 4;
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 1, far: 11 });
  key.shadow.camera.updateProjectionMatrix();
  // Top-lit ambient with a paper-coloured bounce from below, like the original's sky and bounce terms.
  scene.add(key, key.target, new HemisphereLight(0xffffff, new Color('#ebe9e4').multiplyScalar(0.45), 0.5));

  const materials: Record<RingKey, MeshPhysicalMaterial> = {
    design: ringMaterial('design', colors.design),
    engineering: ringMaterial('engineering', colors.engineering),
    automation: ringMaterial('automation', colors.automation),
  };
  const accent = new DrawableRing('zx', quality.tube, materials.automation);
  const meshes: Record<RingKey, Mesh> = {
    design: new Mesh(ringTube('xy', quality.tube), materials.design),
    engineering: new Mesh(ringTube('yz', quality.tube), materials.engineering),
    automation: accent.mesh,
  };
  for (const mesh of [...Object.values(meshes), ...accent.caps]) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }
  scene.add(meshes.design, meshes.engineering, meshes.automation);

  const floor = new ContactShadow(quality.contact, new Color(STAIN), new Vector3(...LIGHT_DIRECTION).normalize(), FLOOR_Y);
  floor.group.position.y = FLOOR_Y;
  scene.add(floor.group);

  const camera = new PerspectiveCamera(30, 1, 0.1, 100);
  let moved = true;
  let blur = -1;

  return {
    camera,
    scene,
    apply(state, stage, viewport, weights) {
      for (const ring of RING_KEYS) {
        const mesh = meshes[ring];
        const pose = state.poses[ring];
        if (!mesh.position.equals(pose.position) || !mesh.quaternion.equals(pose.quaternion)) {
          mesh.position.copy(pose.position);
          mesh.quaternion.copy(pose.quaternion);
          moved = true;
        }
        // A dimmed ring draws after the others and leaves the depth buffer alone, so what it covers shows through.
        materials[ring].opacity = weights[ring];
        materials[ring].depthWrite = weights[ring] >= 1;
        mesh.renderOrder = weights[ring] >= 1 ? 0 : 1;
      }
      if (accent.show(state.accent.from, state.accent.to)) moved = true;

      const view = state.camera;
      const distance = cameraDistance(view.fov, view.fill);
      camera.fov = view.fov;
      camera.near = Math.max(distance - 5, 0.1);
      camera.far = distance + 6;
      camera.position.copy(view.target).addScaledVector(towardCamera(view.pitch), distance);
      camera.lookAt(view.target);
      const offset = viewOffset(stage, view.anchor, viewport);
      camera.setViewOffset(offset.fullWidth, offset.fullHeight, offset.x, offset.y, offset.width, offset.height);

      floor.set(state.floor.opacity * STAIN_OPACITY, state.floor.spread);
      const sharp = lerp(2, 0.7, state.floor.sharpness);
      if (sharp !== blur) {
        blur = sharp;
        moved = true;
      }
    },
    render() {
      if (moved) {
        renderer.shadowMap.needsUpdate = true;
        floor.update(renderer, scene, blur);
        moved = false;
      }
      renderer.render(scene, camera);
    },
    dispose() {
      for (const ring of RING_KEYS) materials[ring].dispose();
      meshes.design.geometry.dispose();
      meshes.engineering.geometry.dispose();
      accent.dispose();
      floor.dispose();
      environment.dispose();
    },
  };
}
