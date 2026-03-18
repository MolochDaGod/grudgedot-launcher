// ============================================================
// GRUDA WARS HEROES
// Canonical hero roster synced from Warlord-Crafting-Suite
// These map directly into the GDA `characters` table
// ============================================================

import {
  type WCSHeroAttributes,
  type GDABaseStats,
  type GDAAbility,
  wcsToGDAStats,
  wcsClassToGDAType,
  heroLevelToRarity,
} from "./grudachain";

// ============================================================
// WCS Hero Source Data (mirrors WCS starterHeroes.ts)
// ============================================================

export interface GrudaWarsHero {
  /** Stable ID for upsert */
  syncId: string;
  name: string;
  title: string;
  description: string;
  lore: string;

  // WCS source data
  raceId: string;
  classId: string;
  level: number;
  wcsAttributes: WCSHeroAttributes;
  equipment: Record<string, string>;
  playstyle: string;
  strengths: string[];
  weaknesses: string[];

  // Derived GDA fields
  gdaType: string;
  gdaRarity: string;
  gdaBaseStats: GDABaseStats;
  gdaAbilities: GDAAbility[];
  portraitUrl: string;
}

// ============================================================
// THE FOUR GRUDA WARS HEROES
// ============================================================

const HERO_DEFINITIONS: Omit<GrudaWarsHero, "gdaType" | "gdaRarity" | "gdaBaseStats">[] = [
  {
    syncId: "gruda_wars_thane",
    name: "Thane Ironshield",
    title: "The Mountain Guardian",
    description: "A stalwart defender from the northern mountains, Thane specializes in protecting allies and holding the line.",
    lore: "Forged in the harsh peaks of the Frostspire Mountains, Thane learned early that survival meant standing firm when others fled. His shield has turned aside countless blows, and his resolve has never wavered.",
    raceId: "orc",
    classId: "warrior",
    level: 5,
    wcsAttributes: {
      strength: 12, vitality: 14, endurance: 13,
      intellect: 4, wisdom: 5, dexterity: 6,
      agility: 5, tactics: 8,
    },
    equipment: {
      MainHand: "GRUDA_WPN_SWORD_T2",
      OffHand: "GRUDA_ARM_SHIELD_T2",
      Head: "GRUDA_ARM_HEAD_T2",
      Chest: "GRUDA_ARM_CHEST_T2",
      Legs: "GRUDA_ARM_LEGS_T2",
      Feet: "GRUDA_ARM_FEET_T1",
      Shoulder: "GRUDA_ARM_SHOULDER_T2",
    },
    playstyle: "Tank - High defense, blocks damage, protects team",
    strengths: ["Extreme durability", "High block chance", "Team protection"],
    weaknesses: ["Low mobility", "Moderate damage output", "Weak to magic"],
    portraitUrl: "/icons/icons/weapons/Sword_01.png",
    gdaAbilities: [
      { id: "thane_shield_wall", name: "Shield Wall", description: "Raise shield, reducing incoming damage by 50% for 3 turns", cooldown: 4, type: "active" },
      { id: "thane_taunt", name: "Warlord's Taunt", description: "Force all enemies to target Thane for 2 turns", cooldown: 3, type: "active" },
      { id: "thane_fortify", name: "Fortify", description: "Passively gain +15% defense when below 50% HP", type: "passive" },
      { id: "thane_cleave", name: "Iron Cleave", description: "Heavy melee strike dealing 150% weapon damage", damage: 45, cooldown: 2, manaCost: 15, type: "active" },
    ],
  },
  {
    syncId: "gruda_wars_lyra",
    name: "Lyra Stormweaver",
    title: "The Storm Weaver",
    description: "A brilliant elementalist who commands lightning and ice with devastating precision.",
    lore: "Born during a violent thunderstorm, Lyra discovered her affinity for elemental magic at a young age. The arcane academies could barely contain her potential, and she now seeks to master the primal forces of nature.",
    raceId: "elf",
    classId: "mage",
    level: 5,
    wcsAttributes: {
      strength: 4, vitality: 7, endurance: 5,
      intellect: 15, wisdom: 12, dexterity: 6,
      agility: 6, tactics: 8,
    },
    equipment: {
      MainHand: "GRUDA_WPN_STAFF_T2",
      Head: "GRUDA_ARM_HEAD_T1",
      Chest: "GRUDA_ARM_ROBE_T2",
      Legs: "GRUDA_ARM_LEGS_T1",
      Back: "GRUDA_ARM_CLOAK_T2",
      Accessory1: "GRUDA_ACC_RING_T2",
      Accessory2: "GRUDA_ACC_AMULET_T1",
    },
    playstyle: "Ranged Magic DPS - High burst damage, area effects",
    strengths: ["Devastating spell damage", "Area of effect spells", "High critical chance"],
    weaknesses: ["Low HP and defense", "Mana dependent", "Vulnerable when isolated"],
    portraitUrl: "/icons/icons/weapons/Staff_01.png",
    gdaAbilities: [
      { id: "lyra_chain_lightning", name: "Chain Lightning", description: "Lightning arcs between up to 3 enemies", damage: 60, cooldown: 3, manaCost: 30, type: "active" },
      { id: "lyra_frost_nova", name: "Frost Nova", description: "Freeze all nearby enemies for 1 turn", cooldown: 4, manaCost: 25, type: "active" },
      { id: "lyra_arcane_surge", name: "Arcane Surge", description: "Passively increase spell damage by 10% per consecutive cast", type: "passive" },
      { id: "lyra_meteor", name: "Meteor Strike", description: "Call down a meteor dealing massive AoE damage", damage: 100, cooldown: 6, manaCost: 50, type: "active" },
    ],
  },
  {
    syncId: "gruda_wars_kael",
    name: "Kael Shadowblade",
    title: "The Shadow Blade",
    description: "A master of precision strikes and deadly aim, Kael eliminates targets before they know he's there.",
    lore: "Trained in the wild frontier beyond the Frostspire Mountains, Kael has honed his skills to perfection. His arrows strike from impossible distances, and his blades finish the job up close.",
    raceId: "human",
    classId: "ranger",
    level: 5,
    wcsAttributes: {
      strength: 8, vitality: 8, endurance: 6,
      intellect: 6, wisdom: 5, dexterity: 15,
      agility: 14, tactics: 11,
    },
    equipment: {
      MainHand: "GRUDA_WPN_DAGGER_T2",
      OffHand: "GRUDA_WPN_DAGGER_T1",
      Head: "GRUDA_ARM_HOOD_T2",
      Chest: "GRUDA_ARM_LEATHER_T2",
      Legs: "GRUDA_ARM_LEGS_T2",
      Feet: "GRUDA_ARM_BOOTS_T2",
      Hands: "GRUDA_ARM_GLOVES_T2",
      Back: "GRUDA_ARM_CLOAK_T1",
    },
    playstyle: "Agile Ranged/Melee DPS - High crits, evasion, burst damage",
    strengths: ["Extreme critical damage", "High evasion", "Fast attacks", "Mobile"],
    weaknesses: ["Low defense", "Weak in prolonged fights", "Needs positioning"],
    portraitUrl: "/icons/icons/weapons/Dagger_01.png",
    gdaAbilities: [
      { id: "kael_shadowstrike", name: "Shadowstrike", description: "Teleport behind target and deal 200% damage from stealth", damage: 80, cooldown: 3, manaCost: 20, type: "active" },
      { id: "kael_evasion", name: "Smoke Bomb", description: "Become untargetable for 1 turn, resetting stealth", cooldown: 5, manaCost: 15, type: "active" },
      { id: "kael_blade_flurry", name: "Blade Flurry", description: "Strike 4 times rapidly, each hit dealing 40% weapon damage", damage: 50, cooldown: 2, manaCost: 20, type: "active" },
      { id: "kael_opportunist", name: "Opportunist", description: "Passively deal 25% bonus damage to stunned or slowed targets", type: "passive" },
    ],
  },
  {
    syncId: "gruda_wars_mira",
    name: "Mira Dawnbringer",
    title: "The Sacred Flame",
    description: "A devoted healer who brings light to the darkest battles and restores hope to the wounded.",
    lore: "Blessed by the divine at birth, Mira has dedicated her life to healing the sick and protecting the innocent. Her prayers can turn the tide of battle, and her presence brings courage to even the most fearful warriors.",
    raceId: "human",
    classId: "mage",
    level: 5,
    wcsAttributes: {
      strength: 6, vitality: 10, endurance: 8,
      intellect: 10, wisdom: 15, dexterity: 6,
      agility: 7, tactics: 10,
    },
    equipment: {
      MainHand: "GRUDA_WPN_MACE_T2",
      OffHand: "GRUDA_ARM_SHIELD_T1",
      Head: "GRUDA_ARM_HEAD_T2",
      Chest: "GRUDA_ARM_PLATE_T2",
      Legs: "GRUDA_ARM_LEGS_T2",
      Feet: "GRUDA_ARM_FEET_T1",
      Accessory1: "GRUDA_ACC_HOLY_SYMBOL_T2",
      Accessory2: "GRUDA_ACC_RING_T1",
    },
    playstyle: "Support Mage/Healer - Sustain team, buff allies, light offense",
    strengths: ["Powerful healing", "Team buffs", "Balanced survivability", "Mana efficient"],
    weaknesses: ["Lower personal damage", "Support role dependent", "Vulnerable when solo"],
    portraitUrl: "/icons/icons/weapons/Mace_01.png",
    gdaAbilities: [
      { id: "mira_divine_heal", name: "Divine Heal", description: "Restore 40% HP to an ally", cooldown: 2, manaCost: 25, type: "active" },
      { id: "mira_sanctuary", name: "Sanctuary", description: "Shield all allies, absorbing damage equal to 20% of Mira's max HP for 2 turns", cooldown: 5, manaCost: 35, type: "active" },
      { id: "mira_smite", name: "Holy Smite", description: "Deal holy damage and reduce target's attack by 15%", damage: 35, cooldown: 2, manaCost: 20, type: "active" },
      { id: "mira_blessed_aura", name: "Blessed Aura", description: "Passively regenerate 5% HP per turn for all nearby allies", type: "passive" },
    ],
  },
];

// ============================================================
// Build full hero objects with derived stats
// ============================================================

export const GRUDA_WARS_HEROES: GrudaWarsHero[] = HERO_DEFINITIONS.map((def) => ({
  ...def,
  gdaType: wcsClassToGDAType(def.classId),
  gdaRarity: heroLevelToRarity(def.level),
  gdaBaseStats: wcsToGDAStats(def.wcsAttributes),
}));

// ============================================================
// Helpers
// ============================================================

export function getHeroBySyncId(syncId: string): GrudaWarsHero | undefined {
  return GRUDA_WARS_HEROES.find((h) => h.syncId === syncId);
}

export function getHeroByName(name: string): GrudaWarsHero | undefined {
  return GRUDA_WARS_HEROES.find((h) => h.name.toLowerCase() === name.toLowerCase());
}

/**
 * Convert a GrudaWarsHero to a GDA `characters` table insert payload
 */
export function heroToCharacterInsert(hero: GrudaWarsHero) {
  return {
    name: hero.name,
    type: hero.gdaType,
    rarity: hero.gdaRarity,
    baseStats: hero.gdaBaseStats,
    abilities: hero.gdaAbilities,
    portraitUrl: hero.portraitUrl,
    unlockLevel: 1,
    unlockCost: { gold: 0, gems: 0 },
  };
}

/**
 * Get all heroes as GDA character insert payloads
 */
export function allHeroesAsCharacterInserts() {
  return GRUDA_WARS_HEROES.map(heroToCharacterInsert);
}
