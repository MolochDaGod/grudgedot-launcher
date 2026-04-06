/**
 * MMO Systems — Combat, Equipment, Crafting, Professions
 *
 * Built on the shared WCS 8-stat hero system from `shared/grudachain.ts`.
 * Heroes are the SAME across Gruda Wars, MMO World, and future games.
 * Stats: strength, vitality, endurance, intellect, wisdom, dexterity, agility, tactics
 * Equipment uses the GRUDA tier ID system (T0–T5).
 */

import type { WCSHeroAttributes, GDAAbility } from "../../../shared/grudachain";

// ── Derived Stats (computed from 8 WCS attributes) ─────────────────────

export interface DerivedStats {
  maxHp: number;
  maxMana: number;
  physicalDamage: number;
  spellDamage: number;
  defense: number;
  critChance: number;      // 0-60
  dodgeChance: number;     // 0-40
  attackSpeed: number;     // attacks per second
  castSpeedBonus: number;  // percentage reduction
  moveSpeed: number;
}

export function deriveCombatStats(attrs: WCSHeroAttributes, level: number): DerivedStats {
  const levelBonus = (level - 1) * 0.05; // 5% per level
  return {
    maxHp:          Math.round((attrs.vitality * 10 + attrs.endurance * 5) * (1 + levelBonus)),
    maxMana:        Math.round((attrs.intellect * 8 + attrs.wisdom * 4) * (1 + levelBonus)),
    physicalDamage: Math.round((attrs.strength * 2 + attrs.dexterity * 0.5) * (1 + levelBonus)),
    spellDamage:    Math.round((attrs.intellect * 2.5 + attrs.wisdom * 0.5) * (1 + levelBonus)),
    defense:        Math.round((attrs.endurance * 2 + attrs.vitality + attrs.wisdom * 0.5) * (1 + levelBonus)),
    critChance:     Math.min(60, Math.round(attrs.dexterity * 1.5 + attrs.agility * 0.5)),
    dodgeChance:    Math.min(40, Math.round(attrs.agility * 2 + attrs.dexterity * 0.5)),
    attackSpeed:    parseFloat((1.0 + attrs.agility * 0.02).toFixed(2)),
    castSpeedBonus: parseFloat((attrs.wisdom * 1.5).toFixed(1)),
    moveSpeed:      Math.round(200 + attrs.agility * 4 + attrs.dexterity * 2),
  };
}

// ── Combat Formulas ─────────────────────────────────────────────────────

export function calcPhysicalDamage(
  attackerPhys: number, weaponBase: number, defenderDef: number
): number {
  const raw = weaponBase + attackerPhys;
  return Math.max(1, Math.round(raw - defenderDef * 0.6));
}

export function calcSpellDamage(
  attackerSpell: number, spellBase: number, defenderDef: number
): number {
  const raw = spellBase + attackerSpell;
  return Math.max(1, Math.round(raw - defenderDef * 0.3));
}

export function rollCrit(critChance: number): boolean {
  return Math.random() * 100 < critChance;
}

export function rollDodge(dodgeChance: number): boolean {
  return Math.random() * 100 < dodgeChance;
}

export function calcCritMultiplier(dexterity: number): number {
  return 1.5 + dexterity * 0.01; // 1.5x base, +1% per dex
}

// ── Equipment Tier System (T0–T5) ───────────────────────────────────────

export type EquipmentTier = 0 | 1 | 2 | 3 | 4 | 5;

export const TIER_NAMES: Record<EquipmentTier, string> = {
  0: "Starter",
  1: "Common",
  2: "Uncommon",
  3: "Rare",
  4: "Epic",
  5: "Legendary",
};

export const TIER_COLORS: Record<EquipmentTier, number> = {
  0: 0x888888,
  1: 0xffffff,
  2: 0x22cc44,
  3: 0x3388ff,
  4: 0xaa44ff,
  5: 0xff8800,
};

/** Base stat multiplier per tier. T0 = 1.0, each tier +30% */
export function tierMultiplier(tier: EquipmentTier): number {
  return 1.0 + tier * 0.3;
}

// ── Equipment Slots ─────────────────────────────────────────────────────

export const EQUIPMENT_SLOTS = [
  "MainHand", "OffHand", "Head", "Chest", "Legs", "Feet",
  "Shoulder", "Back", "Hands", "Accessory1", "Accessory2",
] as const;
export type EquipmentSlot = typeof EQUIPMENT_SLOTS[number];

// ── Weapon Definitions ──────────────────────────────────────────────────

export interface WeaponDef {
  id: string;
  name: string;
  type: string;
  tier: EquipmentTier;
  baseDamage: number;
  attackSpeed: number; // attacks/sec
  range: number;       // pixels
  classes: string[];   // allowed classIds
  spriteKey?: string;
}

export const WEAPON_TYPES = [
  "sword", "shield", "2h_sword", "staff", "tome", "wand",
  "mace", "dagger", "bow", "crossbow", "spear", "hammer",
] as const;

export const CLASS_WEAPON_RESTRICTIONS: Record<string, string[]> = {
  warrior: ["sword", "shield", "2h_sword", "mace", "hammer", "spear"],
  mage:    ["staff", "tome", "wand", "mace"],
  ranger:  ["bow", "crossbow", "dagger", "spear", "2h_sword"],
  worge:   ["staff", "spear", "dagger", "bow", "hammer", "mace"],
};

/** Generate weapon stats from type + tier. Base values scale with tier. */
export function makeWeapon(type: string, tier: EquipmentTier, nameOverride?: string): WeaponDef {
  const bases: Record<string, { dmg: number; spd: number; rng: number }> = {
    sword:     { dmg: 12, spd: 1.2, rng: 45 },
    "2h_sword":{ dmg: 22, spd: 0.8, rng: 55 },
    dagger:    { dmg: 8,  spd: 1.8, rng: 35 },
    mace:      { dmg: 14, spd: 1.0, rng: 40 },
    hammer:    { dmg: 20, spd: 0.7, rng: 50 },
    staff:     { dmg: 10, spd: 1.0, rng: 280 },
    wand:      { dmg: 8,  spd: 1.4, rng: 250 },
    tome:      { dmg: 6,  spd: 1.0, rng: 0 },   // off-hand, no direct attack
    bow:       { dmg: 14, spd: 1.0, rng: 320 },
    crossbow:  { dmg: 18, spd: 0.7, rng: 350 },
    spear:     { dmg: 16, spd: 0.9, rng: 60 },
    shield:    { dmg: 4,  spd: 0,   rng: 0 },    // off-hand, block item
  };

  const b = bases[type] || bases.sword;
  const m = tierMultiplier(tier);
  const id = `GRUDA_WPN_${type.toUpperCase()}_T${tier}`;

  return {
    id,
    name: nameOverride || `${TIER_NAMES[tier]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    type,
    tier,
    baseDamage: Math.round(b.dmg * m),
    attackSpeed: parseFloat((b.spd * (1 + tier * 0.05)).toFixed(2)),
    range: b.rng,
    classes: Object.entries(CLASS_WEAPON_RESTRICTIONS)
      .filter(([, weapons]) => weapons.includes(type))
      .map(([cls]) => cls),
  };
}

// ── Armor Definitions ───────────────────────────────────────────────────

export type ArmorWeight = "cloth" | "leather" | "metal";

export interface ArmorDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  weight: ArmorWeight;
  tier: EquipmentTier;
  defense: number;
  bonusStats?: Partial<WCSHeroAttributes>;
  classes: string[];
}

export const CLASS_ARMOR_RESTRICTIONS: Record<string, ArmorWeight[]> = {
  warrior: ["metal", "leather"],
  mage:    ["cloth"],
  ranger:  ["leather", "cloth"],
  worge:   ["leather"],
};

export function makeArmor(
  slot: EquipmentSlot, weight: ArmorWeight, tier: EquipmentTier
): ArmorDef {
  const baseDefense: Record<ArmorWeight, number> = { cloth: 4, leather: 8, metal: 14 };
  const m = tierMultiplier(tier);
  const slotMultiplier: Record<string, number> = {
    Head: 0.7, Chest: 1.3, Legs: 1.0, Feet: 0.5,
    Shoulder: 0.6, Hands: 0.5, Back: 0.4,
  };

  const id = `GRUDA_ARM_${slot.toUpperCase()}_${weight.toUpperCase()}_T${tier}`;
  return {
    id,
    name: `${TIER_NAMES[tier]} ${weight.charAt(0).toUpperCase() + weight.slice(1)} ${slot}`,
    slot,
    weight,
    tier,
    defense: Math.round(baseDefense[weight] * m * (slotMultiplier[slot] || 1.0)),
    classes: Object.entries(CLASS_ARMOR_RESTRICTIONS)
      .filter(([, weights]) => weights.includes(weight))
      .map(([cls]) => cls),
  };
}

// ── Gathering & Professions ─────────────────────────────────────────────

export const PROFESSIONS = [
  { id: "mining",       name: "Mining",       biomes: ["snow", "desert"] as const,  icon: "⛏️" },
  { id: "herbalism",    name: "Herbalism",    biomes: ["swamp", "forest"] as const, icon: "🌿" },
  { id: "woodcutting",  name: "Woodcutting",  biomes: ["forest", "plains"] as const,icon: "🪓" },
  { id: "skinning",     name: "Skinning",     biomes: ["plains", "swamp"] as const, icon: "🗡️" },
  { id: "gem_cutting",  name: "Gem Cutting",  biomes: ["desert", "snow"] as const,  icon: "💎" },
] as const;

export type ProfessionId = typeof PROFESSIONS[number]["id"];

export interface GatheringNode {
  id: string;
  professionId: ProfessionId;
  name: string;
  tier: EquipmentTier;
  requiredLevel: number; // profession level
  biome: string;
  x: number;
  y: number;
  respawnMs: number;
  materials: { id: string; name: string; quantity: [number, number] }[];
}

export interface CraftingMaterial {
  id: string;
  name: string;
  tier: EquipmentTier;
  professionSource: ProfessionId;
  icon: string;
}

export const MATERIALS: CraftingMaterial[] = [
  { id: "iron_ore",      name: "Iron Ore",       tier: 1, professionSource: "mining",      icon: "🪨" },
  { id: "mithril_ore",   name: "Mithril Ore",    tier: 2, professionSource: "mining",      icon: "🪨" },
  { id: "starstone_ore", name: "Starstone Ore",   tier: 3, professionSource: "mining",      icon: "🪨" },
  { id: "heal_herb",     name: "Heal Herb",      tier: 1, professionSource: "herbalism",   icon: "🌿" },
  { id: "arcane_root",   name: "Arcane Root",    tier: 2, professionSource: "herbalism",   icon: "🌿" },
  { id: "lifeblossom",   name: "Lifeblossom",    tier: 3, professionSource: "herbalism",   icon: "🌿" },
  { id: "oak_wood",      name: "Oak Wood",       tier: 1, professionSource: "woodcutting", icon: "🪵" },
  { id: "ironwood",      name: "Ironwood",       tier: 2, professionSource: "woodcutting", icon: "🪵" },
  { id: "spiritwood",    name: "Spiritwood",     tier: 3, professionSource: "woodcutting", icon: "🪵" },
  { id: "rough_hide",    name: "Rough Hide",     tier: 1, professionSource: "skinning",    icon: "🧶" },
  { id: "thick_hide",    name: "Thick Hide",     tier: 2, professionSource: "skinning",    icon: "🧶" },
  { id: "dragon_hide",   name: "Dragon Hide",    tier: 3, professionSource: "skinning",    icon: "🧶" },
  { id: "rough_gem",     name: "Rough Gem",      tier: 1, professionSource: "gem_cutting", icon: "💎" },
  { id: "polished_gem",  name: "Polished Gem",   tier: 2, professionSource: "gem_cutting", icon: "💎" },
  { id: "prismatic_gem", name: "Prismatic Gem",  tier: 3, professionSource: "gem_cutting", icon: "💎" },
];

export interface CraftingRecipe {
  id: string;
  name: string;
  professionId: ProfessionId;
  requiredLevel: number;
  materials: { materialId: string; quantity: number }[];
  output: { type: "weapon" | "armor" | "potion" | "relic"; itemId: string };
  craftTimeMs: number;
}

export const RECIPES: CraftingRecipe[] = [
  {
    id: "craft_iron_sword", name: "Iron Sword", professionId: "mining", requiredLevel: 5,
    materials: [{ materialId: "iron_ore", quantity: 4 }, { materialId: "oak_wood", quantity: 2 }],
    output: { type: "weapon", itemId: "GRUDA_WPN_SWORD_T1" },
    craftTimeMs: 3000,
  },
  {
    id: "craft_leather_chest", name: "Leather Chestpiece", professionId: "skinning", requiredLevel: 10,
    materials: [{ materialId: "rough_hide", quantity: 6 }, { materialId: "oak_wood", quantity: 1 }],
    output: { type: "armor", itemId: "GRUDA_ARM_CHEST_LEATHER_T1" },
    craftTimeMs: 4000,
  },
  {
    id: "craft_heal_potion", name: "Healing Potion", professionId: "herbalism", requiredLevel: 1,
    materials: [{ materialId: "heal_herb", quantity: 3 }],
    output: { type: "potion", itemId: "GRUDA_POT_HEAL_T1" },
    craftTimeMs: 2000,
  },
  {
    id: "craft_mana_potion", name: "Mana Potion", professionId: "herbalism", requiredLevel: 8,
    materials: [{ materialId: "arcane_root", quantity: 3 }],
    output: { type: "potion", itemId: "GRUDA_POT_MANA_T1" },
    craftTimeMs: 2000,
  },
  {
    id: "craft_mithril_sword", name: "Mithril Sword", professionId: "mining", requiredLevel: 25,
    materials: [{ materialId: "mithril_ore", quantity: 6 }, { materialId: "ironwood", quantity: 3 }, { materialId: "polished_gem", quantity: 1 }],
    output: { type: "weapon", itemId: "GRUDA_WPN_SWORD_T2" },
    craftTimeMs: 6000,
  },
  {
    id: "craft_arcane_staff", name: "Arcane Staff", professionId: "woodcutting", requiredLevel: 20,
    materials: [{ materialId: "ironwood", quantity: 4 }, { materialId: "arcane_root", quantity: 3 }, { materialId: "polished_gem", quantity: 2 }],
    output: { type: "weapon", itemId: "GRUDA_WPN_STAFF_T2" },
    craftTimeMs: 5000,
  },
  {
    id: "craft_gem_relic", name: "Gem Relic", professionId: "gem_cutting", requiredLevel: 15,
    materials: [{ materialId: "polished_gem", quantity: 4 }, { materialId: "iron_ore", quantity: 2 }],
    output: { type: "relic", itemId: "GRUDA_ACC_RELIC_T2" },
    craftTimeMs: 5000,
  },
];

// ── Gathering Node Factory ──────────────────────────────────────────────

export function createGatheringNodes(
  biome: string, mapWidth: number, mapHeight: number, count: number
): GatheringNode[] {
  const nodes: GatheringNode[] = [];
  const professions = PROFESSIONS.filter(p => (p.biomes as readonly string[]).includes(biome));
  if (professions.length === 0) return nodes;

  for (let i = 0; i < count; i++) {
    const prof = professions[Math.floor(Math.random() * professions.length)];
    const tier = (Math.random() > 0.7 ? 2 : Math.random() > 0.4 ? 1 : 0) as EquipmentTier;
    const mats = MATERIALS.filter(m => m.professionSource === prof.id && m.tier <= tier + 1);
    if (mats.length === 0) continue;

    const mat = mats[Math.floor(Math.random() * mats.length)];
    nodes.push({
      id: `node_${biome}_${prof.id}_${i}`,
      professionId: prof.id,
      name: `${mat.name} Node`,
      tier,
      requiredLevel: tier * 15,
      biome,
      x: 200 + Math.random() * (mapWidth - 400),
      y: 200 + Math.random() * (mapHeight - 400),
      respawnMs: 30000 + tier * 15000,
      materials: [{ id: mat.id, name: mat.name, quantity: [1 + tier, 3 + tier * 2] }],
    });
  }
  return nodes;
}

// ── Ability → Phaser Spell Mapping ──────────────────────────────────────

export interface MMOSpell {
  id: string;
  name: string;
  key: string;       // keyboard key (1-8)
  manaCost: number;
  cooldownMs: number;
  damage: number;
  range: number;
  color: number;
  isHeal: boolean;
  isAoE: boolean;
  description: string;
}

const SPELL_COLORS: Record<string, number> = {
  fire: 0xff4400, ice: 0x00ccff, lightning: 0xffff00,
  holy: 0x00ff88, shadow: 0x8800aa, physical: 0xffaa44,
};

/** Map a GDA ability to a Phaser-ready spell definition */
export function abilityToSpell(ability: GDAAbility, index: number): MMOSpell {
  const isHeal = (ability.damage ?? 0) < 0 ||
    ability.name.toLowerCase().includes("heal") ||
    ability.name.toLowerCase().includes("sanctuary");

  const isAoE = ability.description.toLowerCase().includes("area") ||
    ability.description.toLowerCase().includes("aoe") ||
    ability.description.toLowerCase().includes("all nearby") ||
    ability.description.toLowerCase().includes("all allies");

  let color = SPELL_COLORS.physical;
  const nameLower = ability.name.toLowerCase();
  if (nameLower.includes("lightning") || nameLower.includes("chain")) color = SPELL_COLORS.lightning;
  else if (nameLower.includes("frost") || nameLower.includes("ice")) color = SPELL_COLORS.ice;
  else if (nameLower.includes("fire") || nameLower.includes("meteor")) color = SPELL_COLORS.fire;
  else if (nameLower.includes("holy") || nameLower.includes("divine") || nameLower.includes("blessed") || isHeal) color = SPELL_COLORS.holy;
  else if (nameLower.includes("shadow") || nameLower.includes("smoke")) color = SPELL_COLORS.shadow;

  return {
    id: ability.id,
    name: ability.name,
    key: String(index + 1),
    manaCost: ability.manaCost ?? 20,
    cooldownMs: (ability.cooldown ?? 3) * 1000,
    damage: Math.abs(ability.damage ?? 30),
    range: isHeal ? 0 : (nameLower.includes("melee") || nameLower.includes("cleave") || nameLower.includes("strike") ? 50 : 280),
    color,
    isHeal,
    isAoE,
    description: ability.description,
  };
}

// ── Inventory / Loot ────────────────────────────────────────────────────

export interface InventoryItem {
  id: string;
  name: string;
  type: "weapon" | "armor" | "potion" | "relic" | "material" | "gold";
  tier: EquipmentTier;
  quantity: number;
  icon: string;
  equippable: boolean;
  slot?: EquipmentSlot;
  stats?: Partial<WCSHeroAttributes>;
}

export interface LootDrop {
  items: InventoryItem[];
  gold: number;
  xp: number;
}

/** Generate loot from a killed enemy based on zone difficulty */
export function generateLootDrop(
  zone: string, enemyType: string, playerLevel: number
): LootDrop {
  const zoneMultiplier = zone === "easy" ? 1 : zone === "medium" ? 1.8 : 3;
  const gold = Math.floor((5 + Math.random() * 10) * zoneMultiplier);
  const xp = Math.floor((15 + playerLevel * 5) * zoneMultiplier);
  const items: InventoryItem[] = [];

  // Material drops
  if (Math.random() > 0.4) {
    const mat = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
    items.push({
      id: mat.id, name: mat.name, type: "material",
      tier: mat.tier as EquipmentTier, quantity: 1 + Math.floor(Math.random() * 2),
      icon: mat.icon, equippable: false,
    });
  }

  // Potion drops
  if (Math.random() > 0.6) {
    items.push({
      id: "GRUDA_POT_HEAL_T1", name: "Healing Potion", type: "potion",
      tier: 1, quantity: 1, icon: "❤️", equippable: false,
    });
  }

  // Boss gear drops
  if (enemyType === "boss" && Math.random() > 0.3) {
    const tier = (Math.min(3, Math.floor(playerLevel / 5) + 1)) as EquipmentTier;
    const weaponType = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    const weapon = makeWeapon(weaponType, tier);
    items.push({
      id: weapon.id, name: weapon.name, type: "weapon",
      tier, quantity: 1, icon: "⚔️", equippable: true, slot: "MainHand",
    });
  }

  return { items, gold, xp };
}
