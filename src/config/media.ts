import type { ImageMetadata } from 'astro';
import type { ProjectItem } from '../i18n/types';

/**
 * Real photography, when the studio has it. Leave a slot undefined to keep the drawn placeholder.
 * To fill one, put the file in src/assets/ and import it here, for example:
 *
 *   import team from '../assets/team.jpg';
 *   import shop from '../assets/projects/shop.png';
 *   export const media: Media = { team, projects: { shop } };
 */
export interface Media {
  /** "Before you hire us" photo: portrait, at least 1000 × 1250 px. It drifts gently while the list scrolls. */
  team?: ImageMetadata;
  /** Project card screenshots, 16 : 10, at least 1600 × 1000 px. */
  projects: Partial<Record<ProjectItem['id'], ImageMetadata>>;
}

export const media: Media = { projects: {} };
