/**
 * ============================================================================
 * GRUDGE ENGINE — Character System
 * ============================================================================
 * Ported from Online-Multiplayer-Game CharacterSystem + hero.js.
 *
 * Handles:
 * - Loading race-specific GLB models via Grudge backend
 * - Applying correct scale (0.037 factor from Babylon → Three)
 * - Root motion zeroing to prevent model drift
 * - Animation mixer setup with crossfade blending (0.15s)
 * - Modular mesh/texture swapping
 */

import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RACES, type RaceId, type AnimationSlot } from './race-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CharacterData {
  group: THREE.Group;
  model: THREE.Object3D | null;
  mixer: THREE.AnimationMixer | null;
  clips: Map<string, THREE.AnimationClip>;
  actions: Map<string, THREE.AnimationAction>;
  currentAction: THREE.AnimationAction | null;
  race: RaceId;
  skeleton: THREE.Skeleton | null;
}

export interface CreateCharacterOptions {
  race: RaceId;
  position?: THREE.Vector3;
  /** Override scale factor (default: race definition's scaleFactor) */
  scale?: number;
}

// ---------------------------------------------------------------------------
// Shared Loader
// ---------------------------------------------------------------------------

const gltfLoader = new GLTFLoader();

function loadGLTF(url: string): Promise<GLTF> {
  return new Promise((resolve, reject) => {
    gltfLoader.load(url, resolve, undefined, reject);
  });
}

// ---------------------------------------------------------------------------
// CharacterSystem
// ---------------------------------------------------------------------------

export class CharacterSystem {
  /** Blend speed for animation crossfade (matching OMP's 0.15). */
  static BLEND_SPEED = 0.15;

  /** Reference height used by applyModel auto-scaling. */
  static REFERENCE_HEIGHT = 2.0;

  /**
   * Create a character entity group.
   * Loads the race GLB, scales it, zeros root motion, and sets up the mixer.
   */
  static async createCharacter(
    scene: THREE.Scene,
    options: CreateCharacterOptions,
  ): Promise<CharacterData> {
    const raceDef = RACES[options.race];
    const group = new THREE.Group();
    group.position.copy(options.position ?? new THREE.Vector3(0, 0, 0));
    scene.add(group);

    const data: CharacterData = {
      group,
      model: null,
      mixer: null,
      clips: new Map(),
      actions: new Map(),
      currentAction: null,
      race: options.race,
      skeleton: null,
    };

    try {
      const gltf = await loadGLTF(raceDef.modelUrl);
      const model = gltf.scene;

      // Scale: OMP uses scaleFactor 0.037 (Babylon 3.7 → Three.js units)
      const scaleFactor = options.scale ?? raceDef.scaleFactor;
      model.scale.setScalar(scaleFactor);

      // Root motion zeroing: prevent model from drifting
      CharacterSystem.zeroRootMotion(model);

      // Shadow setup
      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      group.add(model);
      data.model = model;

      // Extract skeleton if present
      model.traverse((child) => {
        if ((child as THREE.SkinnedMesh).isSkinnedMesh && !data.skeleton) {
          data.skeleton = (child as THREE.SkinnedMesh).skeleton;
        }
      });

      // Setup animation mixer from embedded clips
      if (gltf.animations.length > 0) {
        data.mixer = new THREE.AnimationMixer(model);
        for (const clip of gltf.animations) {
          data.clips.set(clip.name, clip);
          const action = data.mixer.clipAction(clip);
          data.actions.set(clip.name, action);
        }
      }
    } catch (err) {
      console.error(`[CharacterSystem] Failed to load model for ${options.race}:`, err);
    }

    return data;
  }

  /**
   * Auto-scale any model to the target reference height.
   */
  static applyModel(
    model: THREE.Object3D,
    targetHeight = CharacterSystem.REFERENCE_HEIGHT,
  ): void {
    const box = new THREE.Box3().setFromObject(model);
    const currentHeight = box.max.y - box.min.y;
    if (currentHeight > 0) {
      const scale = targetHeight / currentHeight;
      model.scale.setScalar(scale);
    }
  }

  /**
   * Zero root bone motion to prevent character drift.
   * Matches OMP's hero.js root bone zeroing pattern.
   */
  static zeroRootMotion(model: THREE.Object3D): void {
    model.traverse((child) => {
      if ((child as THREE.Bone).isBone && child.parent?.type === 'Object3D') {
        // This is likely a root bone — zero its position tracks
        child.position.set(0, 0, 0);
      }
    });
  }

  /**
   * Setup animation mixer with crossfade blending.
   * Loads external animation GLBs and registers them on the mixer.
   */
  static async loadAnimation(
    character: CharacterData,
    slotName: string,
    url: string,
  ): Promise<THREE.AnimationClip | null> {
    if (!character.model) return null;

    try {
      const gltf = await loadGLTF(url);
      if (gltf.animations.length > 0) {
        const clip = gltf.animations[0];
        clip.name = slotName;
        character.clips.set(slotName, clip);

        if (!character.mixer) {
          character.mixer = new THREE.AnimationMixer(character.model);
        }

        const action = character.mixer.clipAction(clip);
        character.actions.set(slotName, action);
        return clip;
      }
    } catch (err) {
      console.warn(`[CharacterSystem] Failed to load animation ${slotName} from ${url}:`, err);
    }

    return null;
  }

  /**
   * Load all 20 standard animations for a character from its race config.
   */
  static async loadRaceAnimations(character: CharacterData): Promise<void> {
    const raceDef = RACES[character.race];
    const animEntries = Object.entries(raceDef.animations) as [AnimationSlot, string][];

    const loadPromises = animEntries.map(([slot, url]) =>
      CharacterSystem.loadAnimation(character, slot, url),
    );

    await Promise.allSettled(loadPromises);
  }

  /**
   * Play an animation with crossfade blending.
   * Supports lock for one-shot animations (attacks, spells).
   */
  static playAnimation(
    character: CharacterData,
    name: string,
    options: { loop?: boolean; lock?: boolean; blendTime?: number } = {},
  ): void {
    const action = character.actions.get(name);
    if (!action) return;

    const blendTime = options.blendTime ?? CharacterSystem.BLEND_SPEED;

    if (character.currentAction && character.currentAction !== action) {
      character.currentAction.fadeOut(blendTime);
    }

    action.reset();
    action.fadeIn(blendTime);

    if (options.loop === false) {
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.setLoop(THREE.LoopRepeat, Infinity);
    }

    action.play();
    character.currentAction = action;
  }

  /**
   * Swap the visible mesh (e.g. equipment change).
   */
  static swapMesh(character: CharacterData, newModel: THREE.Object3D): void {
    if (character.model) {
      character.group.remove(character.model);
    }
    character.group.add(newModel);
    character.model = newModel;
  }

  /**
   * Apply a texture to all meshes in the character.
   */
  static applyTexture(character: CharacterData, texture: THREE.Texture): void {
    character.model?.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material && (mesh.material as THREE.MeshStandardMaterial).map !== undefined) {
          (mesh.material as THREE.MeshStandardMaterial).map = texture;
          (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
        }
      }
    });
  }

  /**
   * Update the animation mixer. Call every frame.
   */
  static update(character: CharacterData, delta: number): void {
    character.mixer?.update(delta);
  }

  /**
   * Dispose character resources.
   */
  static dispose(character: CharacterData, scene: THREE.Scene): void {
    character.mixer?.stopAllAction();
    if (character.group.parent) {
      scene.remove(character.group);
    }
    character.model?.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });
  }
}
