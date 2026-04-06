/**
 * Character Customization System
 *
 * Defines the body customization schema, per-race defaults,
 * bone-name mappings for skeleton-based transforms, and
 * the race → model mapping for KayKit GLTF characters.
 */

import * as THREE from "three";

// ── Customization Schema ────────────────────────────────────────────────────

export interface CharacterCustomization {
  // Body proportions (0.7 – 1.3 multipliers, 1.0 = default)
  height: number;
  headSize: number;
  shoulderWidth: number;
  chestDepth: number;
  armLength: number;
  legLength: number;
  // Appearance
  skinColor: string;   // hex e.g. "#d4a574"
  hairColor: string;   // hex
  eyeColor: string;    // hex
  scarIndex: number;   // 0 = none, 1-5 = scar variants (future)
  // Armor tint
  primaryColor: string;
  secondaryColor: string;
}

export const DEFAULT_CUSTOMIZATION: CharacterCustomization = {
  height: 1.0,
  headSize: 1.0,
  shoulderWidth: 1.0,
  chestDepth: 1.0,
  armLength: 1.0,
  legLength: 1.0,
  skinColor: "#d4a574",
  hairColor: "#3a2a1a",
  eyeColor: "#4a7a9b",
  scarIndex: 0,
  primaryColor: "#555568",
  secondaryColor: "#888899",
};

// ── Race Defaults ───────────────────────────────────────────────────────────

export const RACE_DEFAULTS: Record<string, Partial<CharacterCustomization>> = {
  barbarian: {
    height: 1.15,
    shoulderWidth: 1.2,
    chestDepth: 1.15,
    armLength: 1.05,
    skinColor: "#c4956a",
    hairColor: "#8b4513",
    primaryColor: "#6b4226",
    secondaryColor: "#a0522d",
  },
  dwarf: {
    height: 0.75,
    headSize: 1.15,
    shoulderWidth: 1.25,
    chestDepth: 1.2,
    armLength: 0.9,
    legLength: 0.8,
    skinColor: "#dba47a",
    hairColor: "#cd853f",
    primaryColor: "#8b7355",
    secondaryColor: "#daa520",
  },
  elf: {
    height: 1.05,
    headSize: 0.95,
    shoulderWidth: 0.9,
    chestDepth: 0.9,
    armLength: 1.05,
    legLength: 1.1,
    skinColor: "#f5e6d3",
    hairColor: "#e8d5b7",
    eyeColor: "#66bb6a",
    primaryColor: "#2e7d32",
    secondaryColor: "#c0ca33",
  },
  human: {
    height: 1.0,
    skinColor: "#d4a574",
    hairColor: "#3a2a1a",
    primaryColor: "#555568",
    secondaryColor: "#888899",
  },
  orc: {
    height: 1.15,
    headSize: 1.1,
    shoulderWidth: 1.3,
    chestDepth: 1.2,
    armLength: 1.1,
    legLength: 1.0,
    skinColor: "#4a6741",
    hairColor: "#1a1a1a",
    eyeColor: "#ff6600",
    primaryColor: "#3e2723",
    secondaryColor: "#5d4037",
  },
  undead: {
    height: 0.95,
    headSize: 1.05,
    shoulderWidth: 0.85,
    chestDepth: 0.85,
    armLength: 1.05,
    legLength: 0.95,
    skinColor: "#8a9a7b",
    hairColor: "#2a2a2a",
    eyeColor: "#7fff00",
    primaryColor: "#3a3a4a",
    secondaryColor: "#5a5a6a",
  },
};

export function getCustomizationForRace(raceId: string): CharacterCustomization {
  return { ...DEFAULT_CUSTOMIZATION, ...(RACE_DEFAULTS[raceId.toLowerCase()] || {}) };
}

export function mergeCustomization(
  saved: Partial<CharacterCustomization> | null | undefined,
  raceId: string,
): CharacterCustomization {
  const raceDefault = getCustomizationForRace(raceId);
  if (!saved) return raceDefault;
  return { ...raceDefault, ...saved };
}

// ── Race → GLTF Model Mapping ───────────────────────────────────────────────

export const RACE_MODEL_MAP: Record<string, string> = {
  barbarian: "/models/characters/Viking_Male.gltf",
  dwarf: "/models/characters/Soldier_Male.gltf",
  elf: "/models/characters/Elf.gltf",
  human: "/models/characters/Knight_Male.gltf",
  orc: "/models/characters/Pirate_Male.gltf",
  undead: "/models/characters/Zombie_Male.gltf",
};

export function getModelUrlForRace(raceId: string): string | null {
  return RACE_MODEL_MAP[raceId.toLowerCase()] ?? null;
}

// ── Bone Name Patterns ──────────────────────────────────────────────────────
// These match common Mixamo / KayKit / generic humanoid bone names.

const BONE_PATTERNS = {
  head: [/head/i, /skull/i],
  spine: [/spine/i, /torso/i, /chest/i],
  shoulder_l: [/leftshoulder/i, /shoulder.*l/i, /l.*shoulder/i],
  shoulder_r: [/rightshoulder/i, /shoulder.*r/i, /r.*shoulder/i],
  upperarm_l: [/leftupperarm/i, /upperarm.*l/i, /l.*upperarm/i, /leftarm/i],
  upperarm_r: [/rightupperarm/i, /upperarm.*r/i, /r.*upperarm/i, /rightarm/i],
  forearm_l: [/leftforearm/i, /forearm.*l/i, /l.*forearm/i],
  forearm_r: [/rightforearm/i, /forearm.*r/i, /r.*forearm/i],
  upperleg_l: [/leftupperleg/i, /upperleg.*l/i, /l.*upperleg/i, /leftleg/i, /thigh.*l/i],
  upperleg_r: [/rightupperleg/i, /upperleg.*r/i, /r.*upperleg/i, /rightleg/i, /thigh.*r/i],
  lowerleg_l: [/leftlowerleg/i, /lowerleg.*l/i, /l.*lowerleg/i, /shin.*l/i, /calf.*l/i],
  lowerleg_r: [/rightlowerleg/i, /lowerleg.*r/i, /r.*lowerleg/i, /shin.*r/i, /calf.*r/i],
  hips: [/hips/i, /pelvis/i, /root/i],
};

function findBone(skeleton: THREE.Skeleton | null, patterns: RegExp[]): THREE.Bone | null {
  if (!skeleton) return null;
  for (const bone of skeleton.bones) {
    for (const p of patterns) {
      if (p.test(bone.name)) return bone;
    }
  }
  return null;
}

// ── Apply Customization to Model ────────────────────────────────────────────

export function applyCustomization(
  root: THREE.Object3D,
  custom: CharacterCustomization,
): void {
  // 1. Global height scale
  root.scale.setScalar(custom.height);

  // 2. Find skeleton
  let skeleton: THREE.Skeleton | null = null;
  root.traverse((child) => {
    if (child instanceof THREE.SkinnedMesh && child.skeleton) {
      skeleton = child.skeleton;
    }
  });

  if (skeleton) {
    // Head
    const head = findBone(skeleton, BONE_PATTERNS.head);
    if (head) head.scale.setScalar(custom.headSize);

    // Shoulders
    const shoulderL = findBone(skeleton, BONE_PATTERNS.shoulder_l);
    const shoulderR = findBone(skeleton, BONE_PATTERNS.shoulder_r);
    if (shoulderL) shoulderL.scale.x = custom.shoulderWidth;
    if (shoulderR) shoulderR.scale.x = custom.shoulderWidth;

    // Chest / Spine
    const spine = findBone(skeleton, BONE_PATTERNS.spine);
    if (spine) {
      spine.scale.z = custom.chestDepth;
      spine.scale.x = custom.shoulderWidth;
    }

    // Arms
    const armL = findBone(skeleton, BONE_PATTERNS.upperarm_l);
    const armR = findBone(skeleton, BONE_PATTERNS.upperarm_r);
    if (armL) armL.scale.y = custom.armLength;
    if (armR) armR.scale.y = custom.armLength;

    // Legs
    const legL = findBone(skeleton, BONE_PATTERNS.upperleg_l);
    const legR = findBone(skeleton, BONE_PATTERNS.upperleg_r);
    if (legL) legL.scale.y = custom.legLength;
    if (legR) legR.scale.y = custom.legLength;
  }

  // 3. Skin tint + armor colors
  const skinCol = new THREE.Color(custom.skinColor);
  const primaryCol = new THREE.Color(custom.primaryColor);
  const secondaryCol = new THREE.Color(custom.secondaryColor);

  root.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const mat of mats) {
        if (!(mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhongMaterial)) continue;
        const name = (mat.name || child.name).toLowerCase();
        // Heuristic: skin materials often named "skin", "body", "face", or have warm/beige colors
        if (name.includes("skin") || name.includes("body") || name.includes("face")) {
          mat.color.copy(skinCol);
        } else if (name.includes("cloth") || name.includes("fabric") || name.includes("primary")) {
          mat.color.copy(primaryCol);
        } else if (name.includes("metal") || name.includes("armor") || name.includes("secondary")) {
          mat.color.copy(secondaryCol);
        }
      }
    }
  });
}

// ── Customization slider definitions (for UI) ──────────────────────────────

export const CUSTOMIZATION_SLIDERS = [
  { key: "height",         label: "Height",           min: 0.7, max: 1.3, step: 0.01, icon: "📏" },
  { key: "headSize",       label: "Head Size",        min: 0.7, max: 1.3, step: 0.01, icon: "🗣️" },
  { key: "shoulderWidth",  label: "Shoulder Width",   min: 0.7, max: 1.3, step: 0.01, icon: "💪" },
  { key: "chestDepth",     label: "Chest Depth",      min: 0.7, max: 1.3, step: 0.01, icon: "🫁" },
  { key: "armLength",      label: "Arm Length",        min: 0.7, max: 1.3, step: 0.01, icon: "🤲" },
  { key: "legLength",      label: "Leg Length",        min: 0.7, max: 1.3, step: 0.01, icon: "🦵" },
] as const;

export const CUSTOMIZATION_COLORS = [
  { key: "skinColor",      label: "Skin Color" },
  { key: "hairColor",      label: "Hair Color" },
  { key: "eyeColor",       label: "Eye Color" },
  { key: "primaryColor",   label: "Primary Armor" },
  { key: "secondaryColor", label: "Secondary Armor" },
] as const;

// ── Body Presets ────────────────────────────────────────────────────────────

export const BODY_PRESETS: Record<string, { label: string; values: Partial<CharacterCustomization> }> = {
  stocky: {
    label: "Stocky",
    values: { height: 0.85, shoulderWidth: 1.2, chestDepth: 1.15, legLength: 0.85 },
  },
  tall: {
    label: "Tall",
    values: { height: 1.2, shoulderWidth: 0.95, legLength: 1.15, armLength: 1.1 },
  },
  lean: {
    label: "Lean",
    values: { height: 1.05, shoulderWidth: 0.85, chestDepth: 0.85, armLength: 1.05 },
  },
  bulky: {
    label: "Bulky",
    values: { height: 1.1, shoulderWidth: 1.25, chestDepth: 1.2, armLength: 1.05, headSize: 1.05 },
  },
  default: {
    label: "Default",
    values: { height: 1.0, headSize: 1.0, shoulderWidth: 1.0, chestDepth: 1.0, armLength: 1.0, legLength: 1.0 },
  },
};
