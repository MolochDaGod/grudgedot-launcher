import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { CarDef } from './cars';
import { VEHICLE_LENGTH } from './constants';
import { assetIdToUrls } from './vehicleAssets';

export interface CarCosmetics {
  paintColor?: string;
  mods?: string[];
}

export interface PreparedVehicle {
  root: THREE.Group;
  body: THREE.Group;
}

const loader = new GLTFLoader();
const cache = new Map<string, THREE.Group>();

async function loadVehicleScene(assetId: string): Promise<THREE.Group> {
  const cached = cache.get(assetId);
  if (cached) return cached.clone(true);

  const urls = assetIdToUrls(assetId);
  let gltf: { scene: THREE.Group } | null = null;
  let lastErr: unknown;
  for (const url of urls) {
    try {
      gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
      break;
    } catch (err) {
      lastErr = err;
    }
  }
  if (!gltf) throw lastErr ?? new Error(`Failed to load vehicle ${assetId}`);

  gltf.scene.traverse((node) => {
    if (node instanceof THREE.Mesh && node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial) {
          mat.map && (mat.map.magFilter = THREE.NearestFilter);
          mat.map && (mat.map.minFilter = THREE.NearestFilter);
        }
      }
    }
  });

  cache.set(assetId, gltf.scene);
  return gltf.scene.clone(true);
}

function cloneMaterials(root: THREE.Object3D) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    if (Array.isArray(node.material)) {
      node.material = node.material.map((m) => m.clone());
    } else if (node.material) {
      node.material = node.material.clone();
    }
  });
}

function addVisualMods(
  body: THREE.Group,
  dims: { width: number; length: number; height: number },
  accent: THREE.Color,
  mods: string[],
) {
  if (mods.includes('spoiler')) {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x16181f, roughness: 0.6, metalness: 0.3 });
    const wing = new THREE.Mesh(new THREE.BoxGeometry(dims.width * 0.92, 0.16, dims.length * 0.18), wingMat);
    wing.position.set(0, dims.height * 0.92, -dims.length * 0.46);
    body.add(wing);
  }
  if (mods.includes('roofscoop')) {
    const scoopMat = new THREE.MeshStandardMaterial({ color: 0x202430, roughness: 0.7 });
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(dims.width * 0.3, dims.height * 0.16, dims.length * 0.22), scoopMat);
    scoop.position.set(0, dims.height * 0.96, dims.length * 0.04);
    body.add(scoop);
  }
  if (mods.includes('underglow')) {
    const glowMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 1.4,
      transparent: true,
      opacity: 0.75,
    });
    const glow = new THREE.Mesh(new THREE.BoxGeometry(dims.width * 0.96, 0.06, dims.length * 0.94), glowMat);
    glow.position.set(0, 0.04, 0);
    body.add(glow);
  }
}

export async function prepareVehicle(
  def: CarDef,
  cosmetics?: CarCosmetics,
): Promise<PreparedVehicle> {
  const clone = await loadVehicleScene(def.assetId);
  cloneMaterials(clone);

  const paint = cosmetics?.paintColor;
  if (paint) {
    const col = new THREE.Color(paint);
    clone.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const mat of mats) {
        if (mat instanceof THREE.MeshStandardMaterial && mat.color) mat.color.copy(col);
      }
    });
  }

  const box0 = new THREE.Box3().setFromObject(clone);
  const size0 = box0.getSize(new THREE.Vector3());
  const longest = Math.max(size0.x, size0.z) || 1;
  clone.scale.multiplyScalar(VEHICLE_LENGTH / longest);

  if (size0.x > size0.z) clone.rotation.y = Math.PI / 2;
  clone.rotation.y += Math.PI + (def.modelYaw ?? 0);

  const box1 = new THREE.Box3().setFromObject(clone);
  const center = box1.getCenter(new THREE.Vector3());
  clone.position.x -= center.x;
  clone.position.z -= center.z;
  clone.position.y -= box1.min.y;

  const fitted = new THREE.Box3().setFromObject(clone);
  const dims = {
    width: fitted.max.x - fitted.min.x,
    length: fitted.max.z - fitted.min.z,
    height: fitted.max.y - fitted.min.y,
  };

  const root = new THREE.Group();
  const body = new THREE.Group();
  body.add(clone);
  root.add(body);

  const mods = cosmetics?.mods ?? [];
  if (mods.length > 0) {
    addVisualMods(body, dims, new THREE.Color(def.accent), mods);
  }

  root.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });

  return { root, body };
}