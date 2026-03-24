/**
 * ============================================================================
 * GRUDGE ENGINE — Animation Library
 * ============================================================================
 * Ported from Online-Multiplayer-Game animation system.
 *
 * Central catalog of all available animations with:
 * - Category-based filtering (combat, movement, magic, emotes, reactions)
 * - Emote hotkey bindings (6-0 keys)
 * - Ability animation bindings (Q/E/R/F/P)
 * - Gamepad controller support
 * - Fallback chain: RaceAnimationConfig → AnimationLibrary → emotes → clips
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnimationCategory = 'combat' | 'movement' | 'magic' | 'emotes' | 'reactions' | 'general';

export interface AnimationEntry {
  name: string;
  file: string;
  category: AnimationCategory;
  /** Grudge backend URL path */
  path: string;
}

export interface EmoteBinding {
  key: string;
  name: string;
  animationName: string;
}

export interface AbilityBinding {
  key: string;
  animationName: string;
}

export interface ControllerMapping {
  button: number;
  /** Standard gamepad button name */
  label: string;
  animationName: string;
}

// ---------------------------------------------------------------------------
// Animation Catalog
// ---------------------------------------------------------------------------

const ANIM_BASE = '/public-objects/animations';

/**
 * Full animation catalog — all animations available across all weapon styles
 * and KayKit packs. 242+ entries in the OMP project; this is the canonical subset.
 */
export const ANIMATION_CATALOG: AnimationEntry[] = [
  // Movement
  { name: 'Idle', file: 'Idle.glb', category: 'movement', path: `${ANIM_BASE}/Idle.glb` },
  { name: 'Walking', file: 'Walking.glb', category: 'movement', path: `${ANIM_BASE}/Walking.glb` },
  { name: 'Running', file: 'Running.glb', category: 'movement', path: `${ANIM_BASE}/Running.glb` },
  { name: 'Swagger Walk', file: 'Swagger_Walk.glb', category: 'movement', path: `${ANIM_BASE}/Swagger_Walk.glb` },
  { name: 'Jump', file: 'Jump.glb', category: 'movement', path: `${ANIM_BASE}/Jump.glb` },
  { name: 'Dodge', file: 'Dodge.glb', category: 'movement', path: `${ANIM_BASE}/Dodge.glb` },
  { name: 'Sprint', file: 'Sprint.glb', category: 'movement', path: `${ANIM_BASE}/Sprint.glb` },

  // Combat — Melee
  { name: 'Sword And Shield Attack', file: 'Sword_And_Shield_Attack.glb', category: 'combat', path: `${ANIM_BASE}/Sword_And_Shield_Attack.glb` },
  { name: 'Two Hand Club Combo', file: 'Two_Hand_Club_Combo.glb', category: 'combat', path: `${ANIM_BASE}/Two_Hand_Club_Combo.glb` },
  { name: 'Northern Soul Spin Combo', file: 'Northern_Soul_Spin_Combo.glb', category: 'combat', path: `${ANIM_BASE}/Northern_Soul_Spin_Combo.glb` },
  { name: 'Kick', file: 'Kick.glb', category: 'combat', path: `${ANIM_BASE}/Kick.glb` },
  { name: 'Block', file: 'Block.glb', category: 'combat', path: `${ANIM_BASE}/Block.glb` },
  { name: 'Parry', file: 'Parry.glb', category: 'combat', path: `${ANIM_BASE}/Parry.glb` },
  { name: 'Death', file: 'Death.glb', category: 'combat', path: `${ANIM_BASE}/Death.glb` },

  // Combat — Ranged
  { name: 'Bow Attack', file: 'Bow_Attack.glb', category: 'combat', path: `${ANIM_BASE}/Bow_Attack.glb` },
  { name: 'Rifle Shoot', file: 'Rifle_Shoot.glb', category: 'combat', path: `${ANIM_BASE}/Rifle_Shoot.glb` },

  // Magic
  { name: 'Standing 2H Cast Spell 01', file: 'Standing_2H_Cast_Spell_01.glb', category: 'magic', path: `${ANIM_BASE}/Standing_2H_Cast_Spell_01.glb` },
  { name: 'Standing 2H Magic Area Attack 02', file: 'Standing_2H_Magic_Area_Attack_02.glb', category: 'magic', path: `${ANIM_BASE}/Standing_2H_Magic_Area_Attack_02.glb` },
  { name: 'Summon', file: 'Summon.glb', category: 'magic', path: `${ANIM_BASE}/Summon.glb` },

  // Reactions
  { name: 'Hit React', file: 'Hit_React.glb', category: 'reactions', path: `${ANIM_BASE}/Hit_React.glb` },
  { name: 'Stun', file: 'Stun.glb', category: 'reactions', path: `${ANIM_BASE}/Stun.glb` },
  { name: 'Knockdown', file: 'Knockdown.glb', category: 'reactions', path: `${ANIM_BASE}/Knockdown.glb` },

  // Emotes
  { name: 'Hip Hop Dance', file: 'Hip_Hop_Dance.glb', category: 'emotes', path: `${ANIM_BASE}/Hip_Hop_Dance.glb` },
  { name: 'Silly Dancing', file: 'Silly_Dancing.glb', category: 'emotes', path: `${ANIM_BASE}/Silly_Dancing.glb` },
  { name: 'Taunt', file: 'Taunt.glb', category: 'emotes', path: `${ANIM_BASE}/Taunt.glb` },
  { name: 'Victory', file: 'Victory.glb', category: 'emotes', path: `${ANIM_BASE}/Victory.glb` },
  { name: 'Defeat', file: 'Defeat.glb', category: 'emotes', path: `${ANIM_BASE}/Defeat.glb` },
  { name: 'Wave', file: 'Wave.glb', category: 'emotes', path: `${ANIM_BASE}/Wave.glb` },

  // General / KayKit packs
  { name: 'Collect', file: 'Collect.glb', category: 'general', path: `${ANIM_BASE}/Collect.glb` },
  { name: 'Dive', file: 'Dive.glb', category: 'general', path: `${ANIM_BASE}/Dive.glb` },
  { name: 'Limp', file: 'Limp.glb', category: 'general', path: `${ANIM_BASE}/Limp.glb` },
];

// ---------------------------------------------------------------------------
// Hotkey / Controller Bindings
// ---------------------------------------------------------------------------

/** Emote bindings (keys 6-0) matching OMP's emote hotkey system. */
export const EMOTE_BINDINGS: EmoteBinding[] = [
  { key: '6', name: 'Hip Hop Dance', animationName: 'Hip Hop Dance' },
  { key: '7', name: 'Silly Dancing', animationName: 'Silly Dancing' },
  { key: '8', name: 'Taunt', animationName: 'Taunt' },
  { key: '9', name: 'Victory', animationName: 'Victory' },
  { key: '0', name: 'Wave', animationName: 'Wave' },
];

/** Ability animation bindings (Q/E/R/F/P) — these map to weapon-specific anims at runtime. */
export const ABILITY_BINDINGS: AbilityBinding[] = [
  { key: 'Q', animationName: 'attack_1' },
  { key: 'E', animationName: 'attack_combo' },
  { key: 'R', animationName: 'cast_spell' },
  { key: 'F', animationName: 'attack_2' },
  { key: 'P', animationName: 'channel' },
];

/**
 * Gamepad controller mapping (Xbox/PS standard layout).
 * OMP uses deadzone 0.15 for analog sticks.
 */
export const CONTROLLER_DEADZONE = 0.15;

export const CONTROLLER_MAPPINGS: ControllerMapping[] = [
  { button: 0, label: 'A / Cross', animationName: 'jump' },
  { button: 1, label: 'B / Circle', animationName: 'dodge' },
  { button: 2, label: 'X / Square', animationName: 'attack_1' },
  { button: 3, label: 'Y / Triangle', animationName: 'attack_combo' },
  { button: 4, label: 'LB / L1', animationName: 'block' },
  { button: 5, label: 'RB / R1', animationName: 'cast_spell' },
  { button: 6, label: 'LT / L2', animationName: 'parry' },
  { button: 7, label: 'RT / R2', animationName: 'attack_2' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Filter the catalog by category. */
export function getAnimationsByCategory(category: AnimationCategory): AnimationEntry[] {
  return ANIMATION_CATALOG.filter((a) => a.category === category);
}

/** Find an animation entry by name (case-insensitive). */
export function findAnimation(name: string): AnimationEntry | undefined {
  return ANIMATION_CATALOG.find((a) => a.name.toLowerCase() === name.toLowerCase());
}

/** Get all unique categories. */
export function getCategories(): AnimationCategory[] {
  return [...new Set(ANIMATION_CATALOG.map((a) => a.category))];
}

/**
 * Resolve an animation name through the fallback chain:
 * 1. Race-specific animation clips (loaded on character)
 * 2. Animation Library catalog
 * 3. Emote animations
 * 4. Return null if not found
 */
export function resolveAnimationPath(
  name: string,
  characterClips?: Map<string, any>,
): string | null {
  // 1. Check character's loaded clips
  if (characterClips?.has(name)) return name;

  // 2. Check animation catalog
  const catalogEntry = findAnimation(name);
  if (catalogEntry) return catalogEntry.path;

  // 3. Check emote bindings
  const emote = EMOTE_BINDINGS.find((e) => e.animationName === name);
  if (emote) {
    const emoteEntry = findAnimation(emote.animationName);
    if (emoteEntry) return emoteEntry.path;
  }

  return null;
}
