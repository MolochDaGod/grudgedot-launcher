/**
 * Procedural Textures — Generate terrain and material textures in the editor.
 *
 * Uses @babylonjs/procedural-textures for runtime-generated textures.
 * All textures are created on the GPU — no external image files needed.
 *
 * Usage:
 *   import { createProceduralTexture } from '@/lib/procedural-textures';
 *   const grass = createProceduralTexture(scene, 'grass');
 *   mesh.material = grass.material;
 */

import { Scene, StandardMaterial, Color3 } from '@babylonjs/core';

export type ProceduralTextureType =
  | 'grass' | 'wood' | 'marble' | 'brick' | 'fire' | 'cloud'
  | 'road' | 'starfield' | 'noise';

export interface ProceduralTextureResult {
  texture: any;
  material: StandardMaterial;
  type: ProceduralTextureType;
}

// Lazy-load individual procedural texture classes to avoid importing the entire package
const TEXTURE_LOADERS: Record<ProceduralTextureType, () => Promise<any>> = {
  grass: () => import('@babylonjs/procedural-textures/grass/grassProceduralTexture').then(m => m.GrassProceduralTexture),
  wood: () => import('@babylonjs/procedural-textures/wood/woodProceduralTexture').then(m => m.WoodProceduralTexture),
  marble: () => import('@babylonjs/procedural-textures/marble/marbleProceduralTexture').then(m => m.MarbleProceduralTexture),
  brick: () => import('@babylonjs/procedural-textures/brick/brickProceduralTexture').then(m => m.BrickProceduralTexture),
  fire: () => import('@babylonjs/procedural-textures/fire/fireProceduralTexture').then(m => m.FireProceduralTexture),
  cloud: () => import('@babylonjs/procedural-textures/cloud/cloudProceduralTexture').then(m => m.CloudProceduralTexture),
  road: () => import('@babylonjs/procedural-textures/road/roadProceduralTexture').then(m => m.RoadProceduralTexture),
  starfield: () => import('@babylonjs/procedural-textures/starfield/starfieldProceduralTexture').then(m => m.StarfieldProceduralTexture),
  noise: () => import('@babylonjs/procedural-textures').then((m: any) => {
    // Try NoiseProceduralTexture first, fall back to PerlinNoiseProceduralTexture or CloudProceduralTexture
    return m.NoiseProceduralTexture || m.PerlinNoiseProceduralTexture || m.CloudProceduralTexture;
  }),
};

/**
 * Create a procedural texture and wrap it in a StandardMaterial.
 * Returns both the raw texture and a ready-to-use material.
 */
export async function createProceduralTexture(
  scene: Scene,
  type: ProceduralTextureType,
  size = 512,
  name?: string,
): Promise<ProceduralTextureResult> {
  const loader = TEXTURE_LOADERS[type];
  if (!loader) throw new Error(`Unknown procedural texture type: ${type}`);

  const TextureClass = await loader();
  const textureName = name || `${type}_proc_${Date.now()}`;
  const texture = new TextureClass(textureName, size, scene);

  const material = new StandardMaterial(`${textureName}_mat`, scene);
  material.diffuseTexture = texture;

  return { texture, material, type };
}

/** List all available procedural texture types for the editor UI. */
export const PROCEDURAL_TEXTURE_CATALOG: Array<{
  type: ProceduralTextureType;
  label: string;
  description: string;
  category: 'terrain' | 'environment' | 'effect';
}> = [
  { type: 'grass', label: 'Grass', description: 'Natural grass pattern for terrain', category: 'terrain' },
  { type: 'wood', label: 'Wood', description: 'Wood grain pattern for props and structures', category: 'terrain' },
  { type: 'marble', label: 'Marble', description: 'Marble veins for floors and columns', category: 'terrain' },
  { type: 'brick', label: 'Brick', description: 'Brick wall pattern', category: 'terrain' },
  { type: 'road', label: 'Road', description: 'Asphalt road surface', category: 'terrain' },
  { type: 'fire', label: 'Fire', description: 'Animated fire texture', category: 'effect' },
  { type: 'cloud', label: 'Cloud', description: 'Animated cloud pattern for skyboxes', category: 'environment' },
  { type: 'starfield', label: 'Starfield', description: 'Space background with stars', category: 'environment' },
  { type: 'noise', label: 'Noise', description: 'Perlin noise for terrain heightmaps and blending', category: 'effect' },
];
