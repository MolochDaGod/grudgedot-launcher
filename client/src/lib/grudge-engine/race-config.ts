/**
 * ============================================================================
 * GRUDGE ENGINE — Race Configuration
 * ============================================================================
 * 6 playable races, each with a GLB model served from Grudge backend and
 * a standardized 20-animation set.
 *
 * All model/animation URLs resolve through the Grudge backend proxy:
 *   /public-objects/characters/:filename
 *   /public-objects/animations/:filename
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RaceId = 'human' | 'barbarian' | 'elf' | 'dwarf' | 'orc' | 'undead';

export type AnimationSlot =
  // Movement (5)
  | 'idle' | 'walk' | 'run' | 'jump' | 'dodge'
  // Combat (6)
  | 'attack_1' | 'attack_2' | 'attack_combo' | 'block' | 'parry' | 'death'
  // Magic (3)
  | 'cast_spell' | 'channel' | 'summon'
  // Reactions (3)
  | 'hit_react' | 'stun' | 'knockdown'
  // Emotes (3)
  | 'taunt' | 'victory' | 'defeat';

export interface RaceDefinition {
  id: RaceId;
  name: string;
  modelUrl: string;
  /** Mapping of animation slot → GLB file served by Grudge backend */
  animations: Record<AnimationSlot, string>;
  /** Base scale factor (Babylon.js 3.7 → Three.js 0.037) */
  scaleFactor: number;
  /** Character reference height in world units */
  referenceHeight: number;
  /** Race-specific tint for UI borders */
  uiColor: string;
}

// ---------------------------------------------------------------------------
// Shared animation base (KayKit / Mixamo files on Grudge storage)
// ---------------------------------------------------------------------------

const CHAR_BASE = '/public-objects/characters';
const ANIM_BASE = '/public-objects/animations';

/** Default animation files — used when a race has no race-specific version */
const DEFAULT_ANIMATIONS: Record<AnimationSlot, string> = {
  // Movement
  idle:         `${ANIM_BASE}/Idle.glb`,
  walk:         `${ANIM_BASE}/Walking.glb`,
  run:          `${ANIM_BASE}/Running.glb`,
  jump:         `${ANIM_BASE}/Jump.glb`,
  dodge:        `${ANIM_BASE}/Dodge.glb`,
  // Combat
  attack_1:     `${ANIM_BASE}/Sword_And_Shield_Attack.glb`,
  attack_2:     `${ANIM_BASE}/Two_Hand_Club_Combo.glb`,
  attack_combo: `${ANIM_BASE}/Northern_Soul_Spin_Combo.glb`,
  block:        `${ANIM_BASE}/Block.glb`,
  parry:        `${ANIM_BASE}/Parry.glb`,
  death:        `${ANIM_BASE}/Death.glb`,
  // Magic
  cast_spell:   `${ANIM_BASE}/Standing_2H_Cast_Spell_01.glb`,
  channel:      `${ANIM_BASE}/Standing_2H_Magic_Area_Attack_02.glb`,
  summon:       `${ANIM_BASE}/Summon.glb`,
  // Reactions
  hit_react:    `${ANIM_BASE}/Hit_React.glb`,
  stun:         `${ANIM_BASE}/Stun.glb`,
  knockdown:    `${ANIM_BASE}/Knockdown.glb`,
  // Emotes
  taunt:        `${ANIM_BASE}/Taunt.glb`,
  victory:      `${ANIM_BASE}/Victory.glb`,
  defeat:       `${ANIM_BASE}/Defeat.glb`,
};

// ---------------------------------------------------------------------------
// Race Definitions
// ---------------------------------------------------------------------------

export const RACES: Record<RaceId, RaceDefinition> = {
  human: {
    id: 'human',
    name: 'Human',
    modelUrl: `${CHAR_BASE}/human_animated.glb`,
    animations: { ...DEFAULT_ANIMATIONS },
    scaleFactor: 0.037,
    referenceHeight: 2.0,
    uiColor: '#4488ff',
  },

  barbarian: {
    id: 'barbarian',
    name: 'Barbarian',
    modelUrl: `${CHAR_BASE}/barbarian_animated.glb`,
    animations: { ...DEFAULT_ANIMATIONS },
    scaleFactor: 0.037,
    referenceHeight: 2.2,
    uiColor: '#ff6633',
  },

  elf: {
    id: 'elf',
    name: 'Elf',
    modelUrl: `${CHAR_BASE}/elf_animated.glb`,
    animations: { ...DEFAULT_ANIMATIONS },
    scaleFactor: 0.037,
    referenceHeight: 1.95,
    uiColor: '#44ff88',
  },

  dwarf: {
    id: 'dwarf',
    name: 'Dwarf',
    modelUrl: `${CHAR_BASE}/dwarf_animated.glb`,
    animations: { ...DEFAULT_ANIMATIONS },
    scaleFactor: 0.037,
    referenceHeight: 1.5,
    uiColor: '#cc8844',
  },

  orc: {
    id: 'orc',
    name: 'Orc',
    modelUrl: `${CHAR_BASE}/orc_animated.glb`,
    animations: { ...DEFAULT_ANIMATIONS },
    scaleFactor: 0.037,
    referenceHeight: 2.3,
    uiColor: '#44cc44',
  },

  undead: {
    id: 'undead',
    name: 'Undead',
    modelUrl: `${CHAR_BASE}/undead_animated.glb`,
    animations: { ...DEFAULT_ANIMATIONS },
    scaleFactor: 0.037,
    referenceHeight: 1.9,
    uiColor: '#aa44ff',
  },
};

/** All available race IDs */
export const RACE_IDS: RaceId[] = Object.keys(RACES) as RaceId[];

/** All standard animation slots (20 total) */
export const ANIMATION_SLOTS: AnimationSlot[] = Object.keys(DEFAULT_ANIMATIONS) as AnimationSlot[];

/**
 * OMP character-name → local model file mapping.
 * Used by the Grudge backend /public-objects/characters/ endpoint.
 */
export const CHARACTER_FILE_MAP: Record<string, string> = {
  'human_animated.glb':     'humananimations.glb',
  'barbarian_animated.glb': 'barbanimations.glb',
  'elf_animated.glb':       'elfanimations.glb',
  'dwarf_animated.glb':     'dwarfanimations.glb',
  'orc_animated.glb':       'orcanimations.glb',
  'undead_animated.glb':    'undeadanimations.glb',
};
