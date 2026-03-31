/**
 * GRUDGE WARLORDS - Centralized Game Constants
 * 
 * Single source of truth for all balance values, caps, and multipliers.
 * Both server and client should import from here — never hardcode these values.
 */

// ============================================
// TIER SYSTEM
// ============================================

/** Price multiplier per crafting tier (T1=base, T8=endgame) */
export const TIER_PRICE_MULTIPLIERS: Record<number, number> = {
  0: 0.5,
  1: 1,
  2: 2.5,
  3: 5,
  4: 10,
  5: 20,
  6: 40,
  7: 80,
  8: 160,
};

/** Sell price as a fraction of buy price */
export const SELL_PRICE_RATIO = 0.3;

/** Tier level requirements */
export const TIER_LEVEL_REQUIREMENTS: Record<number, number> = {
  0: 0,
  1: 1,
  2: 5,
  3: 10,
  4: 15,
  5: 25,
  6: 35,
  7: 45,
  8: 55,
};

/** Tier stat multipliers for weapon scaling */
export const TIER_STAT_MULTIPLIERS: Record<number, number> = {
  0: 0.7,
  1: 1.0,
  2: 1.1,
  3: 1.2,
  4: 1.35,
  5: 1.5,
  6: 1.7,
  7: 1.9,
  8: 2.2,
};

// ============================================
// COMBAT CAPS
// ============================================

/** Maximum values for combat stats (percentage-based stored as decimals) */
export const COMBAT_CAPS = {
  /** Block chance cap (75%) */
  blockChance: 0.75,
  /** Block damage reduction cap (90%) */
  blockFactor: 0.90,
  /** Critical hit chance cap (75%) */
  criticalChance: 0.75,
  /** Critical damage multiplier cap (300%) */
  criticalFactor: 3.0,
  /** Accuracy cap (95%) */
  accuracy: 0.95,
  /** Resistance cap (95%) */
  resistance: 0.95,
  /** Elemental resistance cap (75%) */
  elementalResistance: 0.75,
  /** Elemental vulnerability floor (-50%) */
  elementalVulnerability: -0.50,
  /** Lifesteal cap (50%) */
  drainHealth: 0.50,
  /** Manasteal cap (50%) */
  drainMana: 0.50,
  /** Damage reflect cap (50%) */
  reflectFactor: 0.50,
  /** Health absorb cap (50%) */
  absorbHealth: 0.50,
  /** Mana absorb cap (50%) */
  absorbMana: 0.50,
  /** Defense penetration cap (75%) */
  defenseBreak: 0.75,
  /** Block penetration cap (75%) */
  blockBreak: 0.75,
  /** Crit evasion cap (50%) */
  critEvasion: 0.50,
  /** Evasion/dodge cap (50%) */
  evasion: 0.50,
} as const;

/** Damage variance range: final damage is multiplied by (1 - VARIANCE) to (1 + VARIANCE) */
export const DAMAGE_VARIANCE = 0.25;

// ============================================
// DIMINISHING RETURNS
// ============================================

export const DIMINISHING_RETURNS = {
  /** Whether DR is active */
  enabled: true,
  /** Points before DR kicks in */
  threshold: 25,
  /** Efficiency for points 26-50 */
  tier1Efficiency: 0.5,
  /** Efficiency for points 51+ */
  tier2Efficiency: 0.25,
} as const;

// ============================================
// CHARACTER PROGRESSION
// ============================================

/** Base stats before any attributes are applied */
export const BASE_CHARACTER_STATS = {
  hp: 100,
  mana: 50,
  stamina: 100,
  damage: 10,
  defense: 10,
  speed: 10,
  movement: 3,
  range: 1,
} as const;

/** Per-level stat scaling */
export const LEVEL_SCALING = {
  hpPerLevel: 10,
  manaPerLevel: 5,
  staminaPerLevel: 5,
  attributePointsPerLevel: 1,
} as const;

/** Maximum character level */
export const MAX_CHARACTER_LEVEL = 100;

/** Starting gold for new characters */
export const STARTING_GOLD = 1000;

// ============================================
// PROFESSION SYSTEM
// ============================================

export const PROFESSION_CONSTANTS = {
  /** Maximum profession level */
  maxLevel: 100,
  /** Points earned at level 1 */
  startingPoints: 1,
  /** Early milestone interval (levels 5-45) */
  earlyMilestoneInterval: 5,
  /** Late milestone interval (levels 50-100) */
  lateMilestoneInterval: 10,
  /** Total points at max level */
  maxPoints: 16,
} as const;

// ============================================
// ECONOMY
// ============================================

export const ECONOMY = {
  /** Default recipe price if no category match */
  defaultRecipePrice: 500,
  /** Recipe prices by category */
  recipePriceByCategory: {
    weapon: 750,
    armor: 600,
    consumable: 400,
    material: 300,
  } as Record<string, number>,
  /** Material buy base price */
  materialBasePrice: 100,
} as const;

// ============================================
// FACTION SYSTEM
// ============================================

export const FACTIONS = ['crusade', 'legion', 'fabled'] as const;
export type FactionId = typeof FACTIONS[number];

/** Faction → allied races */
export const FACTION_RACES: Record<FactionId, readonly RaceId[]> = {
  crusade: ['human', 'barbarian'],
  legion:  ['orc', 'undead'],
  fabled:  ['elf', 'dwarf'],
};

// ============================================
// CLASSES & RACES
// ============================================

export const CLASS_IDS = ['warrior', 'mage', 'ranger', 'worge'] as const;
export type ClassId = typeof CLASS_IDS[number];

export const CLASS_DISPLAY_NAMES: Record<ClassId, string> = {
  warrior: 'Warrior',
  mage: 'Mage Priest',
  ranger: 'Ranger Scout',
  worge: 'Worge Shapeshifter',
};

export const RACE_IDS = ['human', 'orc', 'elf', 'undead', 'barbarian', 'dwarf'] as const;
export type RaceId = typeof RACE_IDS[number];

// ============================================
// CREW & AI FACTION SYSTEM
// ============================================

export const CREW_CONSTANTS = {
  /** Minimum crew size */
  minCrewSize: 3,
  /** Maximum crew size */
  maxCrewSize: 5,
  /** Daily crew rotation time (CST) */
  rotationHour: 23,
  /** Key events per day to complete */
  dailyEventTarget: 11,
  /** Event types crews must complete */
  eventTypes: ['harvesting', 'fighting', 'sailing', 'competing'] as const,
} as const;

// ============================================
// GOULDSTONE (AI COMPANION CLONING)
// ============================================

export const GOULDSTONE_CONSTANTS = {
  /** Maximum Gouldstone allies a player can deploy */
  maxAllies: 15,
} as const;

// ============================================
// HOTBAR LAYOUT
// ============================================

export const HOTBAR_LAYOUT = {
  /** Slots 1-4: Skills */
  skillSlots: [1, 2, 3, 4] as const,
  /** Slot 5: Empty/unused */
  emptySlot: 5,
  /** Slots 6-8: Consumables (food, potions, on-use relics) */
  consumableSlots: [6, 7, 8] as const,
  /** Total hotbar slots */
  totalSlots: 8,
} as const;

// ============================================
// BASE COMBAT FACTORS (starting values before attributes)
// ============================================

/** Default combat factor values for a new character (before any attribute bonuses) */
export const BASE_COMBAT_FACTORS = {
  blockChance: 0.05,
  blockFactor: 0.30,
  criticalChance: 0.05,
  criticalFactor: 1.5,
  accuracy: 0.85,
  resistance: 0.10,
  drainHealth: 0,
  drainMana: 0,
  reflectFactor: 0,
  absorbHealth: 0,
  absorbMana: 0,
  defenseBreak: 0,
  blockBreak: 0,
  critEvasion: 0,
  evasion: 0,
} as const;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/** Calculate buy price for an item based on tier */
export function calculateBuyPrice(basePrice: number, tier: number = 1): number {
  return Math.floor(basePrice * (TIER_PRICE_MULTIPLIERS[tier] || 1));
}

/** Calculate sell price from buy price */
export function calculateSellPrice(buyPrice: number): number {
  return Math.floor(buyPrice * SELL_PRICE_RATIO);
}

/** Clamp a stat to its combat cap */
export function clampStat(stat: keyof typeof COMBAT_CAPS, value: number): number {
  return Math.min(COMBAT_CAPS[stat], Math.max(0, value));
}
