/**
 * WCS Canonical Game Data — Single Source of Truth
 *
 * Copied from Warlord-Crafting-Suite/shared/ — the authoritative definitions
 * for all Grudge Warlords game systems. Used by GDevelop, WCS, and all Grudge games.
 */

// Core systems
export * from './gameConstants';
export * from './attributeSystem';
export * from './classWeaponRestrictions';

// Definitions
export * from './definitions/classSkillTrees';
export * from './definitions/weaponSkills';
export { CLOTH_EQUIPMENT, LEATHER_EQUIPMENT, METAL_EQUIPMENT, EQUIPMENT_SETS, EQUIPMENT_SLOTS, ARMOR_MATERIALS } from './definitions/equipmentData';
export type { EquipmentItem, EquipmentStats } from './definitions/equipmentData';

// Game definitions
export * from './gameDefinitions/professions';
