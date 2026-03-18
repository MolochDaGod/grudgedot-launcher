// ============================================================
// PROFESSION SYSTEM
// ============================================================

export const MAX_PROFESSION_LEVEL = 100;

export type ProfessionType = 'gathering' | 'crafting';

export type GatheringProfession = 
  | 'Mining'
  | 'Logging' 
  | 'Herbalism'
  | 'Fishing'
  | 'Skinning';

export type CraftingProfession =
  | 'Blacksmithing'
  | 'Woodworking'
  | 'Enchanting'
  | 'Alchemy'
  | 'Engineering';

export type ProfessionName = GatheringProfession | CraftingProfession;

// ============================================================
// PROFESSION DEFINITIONS
// ============================================================

export interface Profession {
  id: string;
  name: ProfessionName;
  type: ProfessionType;
  description: string;
  icon: string;
  primaryStat?: string; // Attribute that gives bonus
  relatedProfessions?: string[]; // Synergies
}

export const GATHERING_PROFESSIONS: Record<GatheringProfession, Profession> = {
  Mining: {
    id: 'mining',
    name: 'Mining',
    type: 'gathering',
    description: 'Extract ore and gems from mineral deposits. Required for metalworking.',
    icon: 'pickaxe',
    primaryStat: 'strength',
    relatedProfessions: ['Blacksmithing', 'Jewelcrafting', 'Engineering'],
  },
  
  Logging: {
    id: 'logging',
    name: 'Logging',
    type: 'gathering',
    description: 'Harvest wood from trees. Essential for construction and crafting.',
    icon: 'axe',
    primaryStat: 'strength',
    relatedProfessions: ['Engineering', 'Blacksmithing'],
  },
  
  Herbalism: {
    id: 'herbalism',
    name: 'Herbalism',
    type: 'gathering',
    description: 'Collect herbs, flowers, and magical essences for potions and cooking.',
    icon: 'leaf',
    primaryStat: 'wisdom',
    relatedProfessions: ['Alchemy', 'Cooking'],
  },
  
  Fishing: {
    id: 'fishing',
    name: 'Fishing',
    type: 'gathering',
    description: 'Catch fish from water sources. Provides food and rare aquatic materials.',
    icon: 'fish',
    primaryStat: 'dexterity',
    relatedProfessions: ['Cooking', 'Alchemy'],
  },
  
  Skinning: {
    id: 'skinning',
    name: 'Skinning',
    type: 'gathering',
    description: 'Harvest leather and hides from defeated creatures.',
    icon: 'scissors',
    primaryStat: 'dexterity',
    relatedProfessions: ['Tailoring'],
  },
};

export const CRAFTING_PROFESSIONS: Record<CraftingProfession, Profession> = {
  Blacksmithing: {
    id: 'blacksmithing',
    name: 'Blacksmithing',
    type: 'crafting',
    description: 'Forge weapons and heavy armor from metal. Craft powerful melee equipment.',
    icon: 'hammer',
    primaryStat: 'strength',
    relatedProfessions: ['Mining'],
  },
  
  Woodworking: {
    id: 'woodworking',
    name: 'Woodworking',
    type: 'crafting',
    description: 'Craft bows, arrows, and leather armor. Master of ranged weapons and light armor.',
    icon: 'bow',
    primaryStat: 'dexterity',
    relatedProfessions: ['Logging', 'Skinning'],
  },
  
  Enchanting: {
    id: 'enchanting',
    name: 'Enchanting',
    type: 'crafting',
    description: 'Create magical staves, enchant items, and weave cloth armor. Master of arcane crafts.',
    icon: 'wand',
    primaryStat: 'intellect',
    relatedProfessions: ['Herbalism', 'Mining'],
  },
  
  Alchemy: {
    id: 'alchemy',
    name: 'Alchemy',
    type: 'crafting',
    description: 'Brew potions, cook food, and transmute materials. Master of transformation and sustenance.',
    icon: 'flask',
    primaryStat: 'wisdom',
    relatedProfessions: ['Herbalism', 'Fishing'],
  },
  
  Engineering: {
    id: 'engineering',
    name: 'Engineering',
    type: 'crafting',
    description: 'Build crossbows, guns, and mechanical devices. Master of technology and siege weapons.',
    icon: 'gear',
    primaryStat: 'intellect',
    relatedProfessions: ['Mining', 'Logging'],
  },
};

export const ALL_PROFESSIONS: Profession[] = [
  ...Object.values(GATHERING_PROFESSIONS),
  ...Object.values(CRAFTING_PROFESSIONS),
];

// ============================================================
// PROFESSION LEVELING
// ============================================================

/**
 * XP required to reach each profession level
 * More lenient curve than hero leveling - meant to be grindable
 */
export function getProfessionXPForLevel(level: number): number {
  if (level < 1) return 0;
  if (level === 1) return 0;
  
  // Exponential curve: level^2 * 10
  return Math.floor(Math.pow(level - 1, 2) * 10);
}

/**
 * Calculate profession level from total XP
 */
export function getProfessionLevelFromXP(totalXP: number): number {
  for (let level = MAX_PROFESSION_LEVEL; level >= 1; level--) {
    if (totalXP >= getProfessionXPForLevel(level)) {
      return level;
    }
  }
  return 1;
}

/**
 * Get XP needed for next profession level
 */
export function getXPToNextProfessionLevel(currentLevel: number, currentXP: number): number {
  if (currentLevel >= MAX_PROFESSION_LEVEL) {
    return 0;
  }
  
  const nextLevelXP = getProfessionXPForLevel(currentLevel + 1);
  return nextLevelXP - currentXP;
}

// ============================================================
// PROFESSION STATE
// ============================================================

export interface ProfessionState {
  profession: ProfessionName;
  level: number;
  experience: number;
  specializations?: string[]; // Unlocked at level 50, 75, 100
}

export const DEFAULT_PROFESSION_STATE: ProfessionState = {
  profession: 'Mining',
  level: 1,
  experience: 0,
  specializations: [],
};

/**
 * Initialize all professions at level 1
 */
export function initializeProfessions(): Record<string, ProfessionState> {
  const professions: Record<string, ProfessionState> = {};
  
  ALL_PROFESSIONS.forEach(prof => {
    professions[prof.name] = {
      profession: prof.name,
      level: 1,
      experience: 0,
      specializations: [],
    };
  });
  
  return professions;
}

// ============================================================
// PROFESSION BONUSES
// ============================================================

/**
 * Calculate success bonus from profession level
 * Higher level = better harvest success rate, quality, and rare drops
 */
export function getProfessionBonus(professionLevel: number, requiredLevel: number): {
  successBonus: number;
  qualityBonus: number;
  rarityBonus: number;
} {
  const levelDiff = Math.max(0, professionLevel - requiredLevel);
  
  return {
    successBonus: Math.min(levelDiff * 0.02, 0.5), // +2% per level, cap 50%
    qualityBonus: Math.min(levelDiff * 0.01, 0.3), // +1% per level, cap 30%
    rarityBonus: Math.min(levelDiff * 0.005, 0.15), // +0.5% per level, cap 15%
  };
}

/**
 * Calculate harvest speed bonus from profession level
 */
export function getHarvestSpeedBonus(professionLevel: number): number {
  // -1% harvest time per 5 levels (max -20% at level 100)
  const speedBonus = Math.floor(professionLevel / 5) * 0.01;
  return Math.min(speedBonus, 0.20);
}

// ============================================================
// TIER REQUIREMENTS
// ============================================================

/**
 * Get required profession level for resource tier
 */
export function getRequiredLevelForTier(tier: number): number {
  const tierRequirements: Record<number, number> = {
    0: 0,    // Tier 0: Level 0 (Starter items)
    1: 1,    // Tier 1: Level 1 (Basic items)
    2: 10,   // Tier 2: Level 10
    3: 20,   // Tier 3: Level 20
    4: 35,   // Tier 4: Level 35
    5: 50,   // Tier 5: Level 50
    6: 65,   // Tier 6: Level 65
    7: 80,   // Tier 7: Level 80
    8: 95,   // Tier 8: Level 95 (Legendary items)
  };
  
  return tierRequirements[tier] || 0;
}

/**
 * Check if profession level meets tier requirement
 */
export function canHarvestTier(professionLevel: number, tier: number): boolean {
  return professionLevel >= getRequiredLevelForTier(tier);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Get profession by name
 */
export function getProfessionByName(name: string): Profession | undefined {
  return ALL_PROFESSIONS.find(p => p.name === name || p.id === name);
}

/**
 * Check if profession is gathering type
 */
export function isGatheringProfession(name: string): boolean {
  return Object.keys(GATHERING_PROFESSIONS).includes(name);
}

/**
 * Check if profession is crafting type
 */
export function isCraftingProfession(name: string): boolean {
  return Object.keys(CRAFTING_PROFESSIONS).includes(name);
}

/**
 * Get related professions (synergies)
 */
export function getRelatedProfessions(professionName: string): string[] {
  const profession = getProfessionByName(professionName);
  return profession?.relatedProfessions || [];
}
