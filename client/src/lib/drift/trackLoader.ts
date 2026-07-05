import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import {
  buildStreetNavMesh,
  extractLapRoute,
  isRoadMaterial,
  type RaceRoute,
  type StreetNavMesh,
} from './streetPathfinder';

export type { RaceRoute, StreetNavMesh };

const RVP_TRACK_CDN =
  'https://assets.grudge-studio.com/game-assets/drift/chicken_gun_rvp_track2.glb';
const RVP_TRACK_LOCAL = '/assets/drift/chicken_gun_rvp_track2.glb';

/** CDN first; local public copy as fallback when CDN is unreachable. */
export const RVP_TRACK_URL = RVP_TRACK_CDN;
export const RVP_TRACK_FALLBACK = RVP_TRACK_LOCAL;
export const TRACK_WORLD_SCALE = 0.14;

export interface LoadedRaceTrack {
  root: THREE.Group;
  meshes: THREE.Mesh[];
  bounds: THREE.Box3;
  nav: StreetNavMesh;
  route: RaceRoute;
  groundMeshes: THREE.Mesh[];
  scale: number;
  center: THREE.Vector3;
}

export interface LoadedTrackModel {
  root: THREE.Group;
  meshes: THREE.Mesh[];
  bounds: THREE.Box3;
  groundMeshes: THREE.Mesh[];
  scale: number;
  center: THREE.Vector3;
}

async function loadGltfWithFallback(
  loader: GLTFLoader,
  primary: string,
  fallback: string,
  onProgress?: (pct: number) => void,
): Promise<GLTF> {
  const tryLoad = (url: string) =>
    new Promise<GLTF>((resolve, reject) => {
      loader.load(
        url,
        resolve,
        (ev) => {
          if (ev.total) onProgress?.(ev.loaded / ev.total);
        },
        reject,
      );
    });
  try {
    return await tryLoad(primary);
  } catch {
    return tryLoad(fallback);
  }
}

export async function loadRvpTrackModel(
  onProgress?: (pct: number) => void,
): Promise<LoadedTrackModel> {
  const loader = new GLTFLoader();
  const gltf = await loadGltfWithFallback(loader, RVP_TRACK_URL, RVP_TRACK_FALLBACK, onProgress);

  const root = new THREE.Group();
  root.name = 'RVP_RaceTrack';
  root.add(gltf.scene);

  root.updateMatrixWorld(true);
  const rawBounds = new THREE.Box3().setFromObject(root);
  const center = new THREE.Vector3();
  rawBounds.getCenter(center);

  const scale = TRACK_WORLD_SCALE;
  root.position.set(-center.x * scale, -center.y * scale, -center.z * scale);
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(root);
  const meshes: THREE.Mesh[] = [];
  const groundMeshes: THREE.Mesh[] = [];

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    meshes.push(obj);
    if (isRoadMaterial(obj.material)) groundMeshes.push(obj);
  });

  return { root, meshes, bounds, groundMeshes, scale, center };
}

export async function loadRvpRaceTrack(
  onProgress?: (pct: number) => void,
): Promise<LoadedRaceTrack> {
  const model = await loadRvpTrackModel(onProgress);
  const { nav, route } = buildRaceRouteFromTrack(model.meshes, model.bounds);
  return { ...model, nav, route };
}

export function buildRaceRouteFromTrack(
  meshes: THREE.Mesh[],
  bounds: THREE.Box3,
): { nav: StreetNavMesh; route: RaceRoute } {
  const nav = buildStreetNavMesh(meshes, bounds);
  const route = extractLapRoute(nav);
  return { nav, route };
}

export function snapToTrackSurface(
  meshes: THREE.Mesh[],
  x: number,
  z: number,
  rayHeight = 80,
): THREE.Vector3 | null {
  const raycaster = new THREE.Raycaster();
  raycaster.set(new THREE.Vector3(x, rayHeight, z), new THREE.Vector3(0, -1, 0));
  const hits = raycaster.intersectObjects(meshes, false);
  if (!hits.length) return null;
  return hits[0].point.clone();
}