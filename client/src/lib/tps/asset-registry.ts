/**
 * TPS Asset Registry
 *
 * Maps weapon definitions to their FBX model paths, character animations,
 * and VFX glTF assets. Provides loaders for BabylonJS SceneLoader.
 */

import * as BABYLON from '@babylonjs/core';
import '@babylonjs/loaders'; // registers FBX / glTF loaders

// ── Base paths ──

const TPS_ASSETS = '/assets/tps';
const GUNS = `${TPS_ASSETS}/guns`;
const CHARACTER = `${TPS_ASSETS}/character`;
const ANIMS = `${CHARACTER}/animations`;
const VFX = `${TPS_ASSETS}/vfx`;

// ── Gun Model Registry ──

export interface GunModelDef {
  /** Display name */
  name: string;
  /** Weapon key matching weapons.ts WEAPONS record */
  weaponKey: string;
  /** Path to FBX file */
  modelPath: string;
  /** Scale factor (Quaternius models are small) */
  scale: number;
  /** Rotation offset in radians [x, y, z] */
  rotationOffset: [number, number, number];
  /** Position offset from hand bone [x, y, z] */
  positionOffset: [number, number, number];
  /** Optional accessories */
  accessories?: string[];
}

export const GUN_MODELS: Record<string, GunModelDef> = {
  // Assault Rifles
  'assault-rifle-1': {
    name: 'Assault Rifle',
    weaponKey: 'rifle',
    modelPath: `${GUNS}/assault-rifle/AssaultRifle_1.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },
  'assault-rifle-2': {
    name: 'Assault Rifle Mk2',
    weaponKey: 'rifle',
    modelPath: `${GUNS}/assault-rifle/AssaultRifle_2.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },
  'assault-rifle-3': {
    name: 'Assault Rifle Mk3',
    weaponKey: 'rifle',
    modelPath: `${GUNS}/assault-rifle/AssaultRifle_3.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },
  'assault-rifle-tactical': {
    name: 'Tactical Rifle',
    weaponKey: 'rifle',
    modelPath: `${GUNS}/assault-rifle/AssaultRifle2_1.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },

  // Pistols
  'pistol-1': {
    name: 'Pistol',
    weaponKey: 'pistol',
    modelPath: `${GUNS}/pistol/Pistol_1.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },
  'pistol-2': {
    name: 'Heavy Pistol',
    weaponKey: 'pistol',
    modelPath: `${GUNS}/pistol/Pistol_3.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },
  'revolver-1': {
    name: 'Revolver',
    weaponKey: 'pistol',
    modelPath: `${GUNS}/revolver/Revolver_1.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },

  // Shotguns
  'shotgun-1': {
    name: 'Shotgun',
    weaponKey: 'shotgun',
    modelPath: `${GUNS}/shotgun/Shotgun_1.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },
  'shotgun-sawed': {
    name: 'Sawed-Off',
    weaponKey: 'shotgun',
    modelPath: `${GUNS}/shotgun/Shotgun_SawedOff.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },

  // Snipers
  'sniper-1': {
    name: 'Sniper Rifle',
    weaponKey: 'sniper',
    modelPath: `${GUNS}/sniper/SniperRifle_1.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },
  'sniper-heavy': {
    name: 'Heavy Sniper',
    weaponKey: 'sniper',
    modelPath: `${GUNS}/sniper/SniperRifle_5.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },

  // SMGs (used as secondary / rapid-fire variant)
  'smg-1': {
    name: 'SMG',
    weaponKey: 'rifle',
    modelPath: `${GUNS}/smg/SubmachineGun_1.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },

  // Bullpup (compact rifle variant)
  'bullpup-1': {
    name: 'Bullpup Rifle',
    weaponKey: 'rifle',
    modelPath: `${GUNS}/bullpup/Bullpup_1.fbx`,
    scale: 0.01,
    rotationOffset: [0, Math.PI, 0],
    positionOffset: [0, 0, 0],
  },
};

// ── Accessories ──

export const GUN_ACCESSORIES: Record<string, string> = {
  scope1: `${GUNS}/accessories/Scope_1.fbx`,
  scope2: `${GUNS}/accessories/Scope_2.fbx`,
  scope3: `${GUNS}/accessories/Scope_3.fbx`,
  silencer1: `${GUNS}/accessories/Silencer_1.fbx`,
  silencer2: `${GUNS}/accessories/Silencer_2.fbx`,
  silencerLong: `${GUNS}/accessories/Silencer_long.fbx`,
  silencerShort: `${GUNS}/accessories/Silencer_Short.fbx`,
  flashlight: `${GUNS}/accessories/Flashlight.fbx`,
  grip: `${GUNS}/accessories/Grip.fbx`,
  bipod: `${GUNS}/accessories/Bipod.fbx`,
  bayonet: `${GUNS}/accessories/Bayonet.fbx`,
  bayonet2: `${GUNS}/accessories/Bayonet_2.fbx`,
  stock: `${GUNS}/accessories/Stock.fbx`,
  tripod: `${GUNS}/accessories/Tripod.fbx`,
};

// ── Character Animations ──

export interface AnimationClipDef {
  name: string;
  path: string;
  /** Maps to animation system keys: idle, walk, run, cover, jump, etc. */
  category: string;
}

export const CHARACTER_MODEL = `${CHARACTER}/Meshy_AI_Captain_Rcalvin_The_P_0331051233_texture_fbx.fbx`;

export const CHARACTER_ANIMATIONS: AnimationClipDef[] = [
  { name: 'idle', path: `${ANIMS}/idle.fbx`, category: 'idle' },
  { name: 'idle2', path: `${ANIMS}/idle (2).fbx`, category: 'idle' },
  { name: 'idle3', path: `${ANIMS}/idle (3).fbx`, category: 'idle' },
  { name: 'idle4', path: `${ANIMS}/idle (4).fbx`, category: 'idle' },
  { name: 'idle5', path: `${ANIMS}/idle (5).fbx`, category: 'idle' },
  { name: 'walking', path: `${ANIMS}/walking.fbx`, category: 'walk' },
  { name: 'running', path: `${ANIMS}/running.fbx`, category: 'run' },
  { name: 'runToStop', path: `${ANIMS}/run to stop.fbx`, category: 'run' },
  { name: 'jumpingUp', path: `${ANIMS}/jumping up.fbx`, category: 'jump' },
  { name: 'fallingIdle', path: `${ANIMS}/falling idle.fbx`, category: 'fall' },
  { name: 'fallingToRoll', path: `${ANIMS}/falling to roll.fbx`, category: 'fall' },
  { name: 'hardLanding', path: `${ANIMS}/hard landing.fbx`, category: 'land' },
  { name: 'standToCover', path: `${ANIMS}/stand to cover.fbx`, category: 'cover' },
  { name: 'standToCover2', path: `${ANIMS}/stand to cover (2).fbx`, category: 'cover' },
  { name: 'coverToStand', path: `${ANIMS}/cover to stand.fbx`, category: 'cover' },
  { name: 'coverToStand2', path: `${ANIMS}/cover to stand (2).fbx`, category: 'cover' },
  { name: 'crouchedSneakLeft', path: `${ANIMS}/crouched sneaking left.fbx`, category: 'sneak' },
  { name: 'crouchedSneakRight', path: `${ANIMS}/crouched sneaking right.fbx`, category: 'sneak' },
  { name: 'leftCoverSneak', path: `${ANIMS}/left cover sneak.fbx`, category: 'sneak' },
  { name: 'rightCoverSneak', path: `${ANIMS}/right cover sneak.fbx`, category: 'sneak' },
  { name: 'leftTurn', path: `${ANIMS}/left turn.fbx`, category: 'turn' },
  { name: 'rightTurn', path: `${ANIMS}/right turn.fbx`, category: 'turn' },
];

// ── VFX Assets ──

export const VFX_ASSETS = {
  attackSlashes: {
    gltf: `${VFX}/slashes/scene.gltf`,
    description: 'Animated melee slash effects with emissive textures',
  },
  explosion: {
    gltf: `${VFX}/explosion/scene.gltf`,
    description: 'Stylized explosion simulation effect',
  },
};

// ── Loaders ──

/**
 * Load a gun FBX model and attach it to a parent node (e.g. hand bone).
 * Returns the root mesh of the loaded gun.
 */
export async function loadGunModel(
  scene: BABYLON.Scene,
  gunKey: string,
  parent?: BABYLON.TransformNode
): Promise<BABYLON.AbstractMesh | null> {
  const def = GUN_MODELS[gunKey];
  if (!def) {
    console.warn(`[AssetRegistry] Unknown gun key: ${gunKey}`);
    return null;
  }

  try {
    const dir = def.modelPath.substring(0, def.modelPath.lastIndexOf('/') + 1);
    const file = def.modelPath.substring(def.modelPath.lastIndexOf('/') + 1);

    const result = await BABYLON.SceneLoader.ImportMeshAsync('', dir, file, scene);

    if (result.meshes.length === 0) return null;

    const root = result.meshes[0];
    root.scaling = new BABYLON.Vector3(def.scale, def.scale, def.scale);
    root.rotation = new BABYLON.Vector3(...def.rotationOffset);
    root.position = new BABYLON.Vector3(...def.positionOffset);

    if (parent) {
      root.parent = parent;
    }

    // Disable picking on gun meshes
    result.meshes.forEach(m => { m.isPickable = false; });

    console.log(`[AssetRegistry] Loaded gun: ${def.name} (${result.meshes.length} meshes)`);
    return root;
  } catch (err) {
    console.warn(`[AssetRegistry] Failed to load gun ${gunKey}:`, err);
    return null;
  }
}

/**
 * Load the player character FBX model.
 */
export async function loadCharacterModel(
  scene: BABYLON.Scene
): Promise<{ root: BABYLON.AbstractMesh; animationGroups: BABYLON.AnimationGroup[] } | null> {
  try {
    const dir = CHARACTER + '/';
    const file = 'Meshy_AI_Captain_Rcalvin_The_P_0331051233_texture_fbx.fbx';

    const result = await BABYLON.SceneLoader.ImportMeshAsync('', dir, file, scene);

    if (result.meshes.length === 0) return null;

    console.log(`[AssetRegistry] Loaded character: ${result.meshes.length} meshes, ${result.animationGroups.length} animations`);
    return { root: result.meshes[0], animationGroups: result.animationGroups };
  } catch (err) {
    console.warn('[AssetRegistry] Failed to load character:', err);
    return null;
  }
}

/**
 * Load an animation clip and retarget it onto an existing skeleton.
 */
export async function loadAnimationClip(
  scene: BABYLON.Scene,
  clipDef: AnimationClipDef
): Promise<BABYLON.AnimationGroup | null> {
  try {
    const dir = clipDef.path.substring(0, clipDef.path.lastIndexOf('/') + 1);
    const file = clipDef.path.substring(clipDef.path.lastIndexOf('/') + 1);

    const result = await BABYLON.SceneLoader.ImportMeshAsync('', dir, file, scene);

    // Hide the imported mesh — we only want the animation
    result.meshes.forEach(m => {
      m.isVisible = false;
      m.isPickable = false;
    });

    if (result.animationGroups.length > 0) {
      const ag = result.animationGroups[0];
      ag.name = clipDef.name;
      console.log(`[AssetRegistry] Loaded animation: ${clipDef.name}`);
      return ag;
    }

    return null;
  } catch (err) {
    console.warn(`[AssetRegistry] Failed to load animation ${clipDef.name}:`, err);
    return null;
  }
}

/**
 * Load a VFX glTF model (slashes or explosion).
 */
export async function loadVFXModel(
  scene: BABYLON.Scene,
  vfxKey: 'attackSlashes' | 'explosion'
): Promise<{ meshes: BABYLON.AbstractMesh[]; animationGroups: BABYLON.AnimationGroup[] } | null> {
  const asset = VFX_ASSETS[vfxKey];
  if (!asset) return null;

  try {
    const dir = asset.gltf.substring(0, asset.gltf.lastIndexOf('/') + 1);
    const file = asset.gltf.substring(asset.gltf.lastIndexOf('/') + 1);

    const result = await BABYLON.SceneLoader.ImportMeshAsync('', dir, file, scene);

    console.log(`[AssetRegistry] Loaded VFX ${vfxKey}: ${result.meshes.length} meshes, ${result.animationGroups.length} animations`);
    return { meshes: result.meshes, animationGroups: result.animationGroups };
  } catch (err) {
    console.warn(`[AssetRegistry] Failed to load VFX ${vfxKey}:`, err);
    return null;
  }
}

/**
 * Get a random gun model key for a given weapon type.
 */
export function getRandomGunForWeapon(weaponKey: string): string | null {
  const matches = Object.entries(GUN_MODELS)
    .filter(([_, def]) => def.weaponKey === weaponKey)
    .map(([key]) => key);
  if (matches.length === 0) return null;
  return matches[Math.floor(Math.random() * matches.length)];
}

/**
 * Get all gun model keys organized by weapon type.
 */
export function getGunsByWeaponType(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, def] of Object.entries(GUN_MODELS)) {
    if (!result[def.weaponKey]) result[def.weaponKey] = [];
    result[def.weaponKey].push(key);
  }
  return result;
}
