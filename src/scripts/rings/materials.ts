import { Color, MeshPhysicalMaterial } from 'three';
import type { RingKey } from '../../lib/rings/story';

/** Ring colours from the design tokens, so the scene and the page share one palette. */
export function tokenColors(root: Element = document.documentElement): Record<RingKey, string> {
  const style = getComputedStyle(root);
  const read = (name: string, fallback: string): string => style.getPropertyValue(name).trim() || fallback;
  return {
    design: read('--porcelain', '#f4f2ee'),
    engineering: read('--graphite', '#2a2a2c'),
    automation: read('--accent', '#1e4636'),
  };
}

/** Porcelain, satin graphite and glazed green ceramic (spec §9.3). */
const FINISH: Record<RingKey, { roughness: number; clearcoat: number; clearcoatRoughness: number }> = {
  design: { roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.35 },
  engineering: { roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.45 },
  automation: { roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.35 },
};

export function ringMaterial(key: RingKey, color: string): MeshPhysicalMaterial {
  // Transparent from the start (at full opacity), so dimming a ring for the hover highlight never recompiles its shader.
  return new MeshPhysicalMaterial({ color: new Color(color), ...FINISH[key], transparent: true });
}
