import { ASSETS_CDN } from '@/lib/grudgeConfig';

const LOCAL_BASE = '/assets/velocity/vehicles';

/** Ordered fallbacks: bundled public copy, then R2 CDN mirrors. */
export function vehicleGlbUrls(filename: string): string[] {
  const name = filename.endsWith('.glb') ? filename : `${filename}.glb`;
  return [
    `${LOCAL_BASE}/${name}`,
    `${ASSETS_CDN}/game-assets/velocity/vehicles/${name}`,
    `${ASSETS_CDN}/models/vehicles/${name}`,
  ];
}

/** Map catalog assetId (`vehicles/minecraft-car`) to load candidates. */
export function assetIdToUrls(assetId: string): string[] {
  const file = assetId.replace(/^vehicles\//, '');
  return vehicleGlbUrls(file);
}