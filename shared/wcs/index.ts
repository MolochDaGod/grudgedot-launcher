/**
 * WCS Canonical Game Data — Single Source of Truth
 *
 * Copied from Warlord-Crafting-Suite/shared/ — the authoritative definitions
 * for all Grudge Warlords game systems. Used by GDevelop, WCS, and all Grudge games.
 */

// Core systems
export * from './gameConstants';
// attributeSystem re-exports DIMINISHING_RETURNS from gameConstants; exclude to avoid conflict
export {
  ATTRIBUTE_IDS, ATTRIBUTES, SECONDARY_STAT_IDS, STAT_CAPS,
  getEffectivePoints,
} from './attributeSystem';
export type {
  AttributeId, AttributeDefinition, StatEffect,
  SecondaryStatId, StatDefinition,
} from './attributeSystem';
export * from './classWeaponRestrictions';

// Definitions — CLASS_IDS and ClassId already exported from gameConstants,
// so exclude the duplicate re-exports from classSkillTrees.
export {
  CLASS_SKILL_TREES,
  SKILL_TIER_LEVELS,
  getClassSkillTree,
  getSkillTierAtLevel,
  getUnlockedTiers,
  getLockedTiers,
  resolveSelectedSkills,
  validateTierSelections,
} from './definitions/classSkillTrees';
export type {
  ClassSkillTree,
  ClassSkillTier,
  ClassSkillChoice,
} from './definitions/classSkillTrees';
export * from './definitions/weaponSkills';
export { CLOTH_EQUIPMENT, LEATHER_EQUIPMENT, METAL_EQUIPMENT, EQUIPMENT_SETS, EQUIPMENT_SLOTS, ARMOR_MATERIALS } from './definitions/equipmentData';
export type { EquipmentItem, EquipmentStats } from './definitions/equipmentData';

// Game definitions
export * from './gameDefinitions/professions';
