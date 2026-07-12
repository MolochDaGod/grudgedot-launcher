/**
 * GRUDGE WARLORDS - Class-Weapon Restriction System
 * 
 * Defines which weapon and equipment types each class can use.
 * This is the authoritative source — all equip checks must go through here.
 */

import { type ClassId, CLASS_IDS } from './gameConstants';

// ============================================
// WEAPON CATEGORIES
// ============================================

export const WEAPON_TYPES = [
  'sword', '2h_sword', 'axe', '2h_axe', 'mace', 'hammer',
  'dagger', 'spear', 'lance', 'bow', 'crossbow', 'gun',
  'staff', 'wand', 'tome', 'shield', 'off_hand_relic',
] as const;

export type WeaponTypeId = typeof WEAPON_TYPES[number];

// ============================================
// ARMOR CATEGORIES
// ============================================

export const ARMOR_TYPES = ['cloth', 'leather', 'metal'] as const;
export type ArmorTypeId = typeof ARMOR_TYPES[number];

// ============================================
// CLASS → ALLOWED WEAPONS
// ============================================

/**
 * Warrior: shields, swords, 2h weapons (swords, axes, hammers)
 * Mage:    staffs, tomes, maces, off-hand relics, wands
 * Ranger:  bows, crossbows, guns, daggers, 2h swords, spears
 * Worge:   staffs, spears, daggers, bows, hammers, maces, off-hand relics
 */
export const CLASS_ALLOWED_WEAPONS: Record<ClassId, readonly WeaponTypeId[]> = {
  warrior: ['sword', '2h_sword', 'axe', '2h_axe', 'hammer', 'shield', 'mace', 'lance', 'spear'],
  mage:    ['staff', 'tome', 'mace', 'wand', 'off_hand_relic'],
  ranger:  ['bow', 'crossbow', 'gun', 'dagger', '2h_sword', 'spear'],
  worge:   ['staff', 'spear', 'dagger', 'bow', 'hammer', 'mace', 'off_hand_relic'],
};

// ============================================
// CLASS → ALLOWED ARMOR
// ============================================

/**
 * Warrior: can wear all armor types (cloth, leather, metal)
 * Mage:    cloth only
 * Ranger:  cloth and leather
 * Worge:   cloth and leather
 */
export const CLASS_ALLOWED_ARMOR: Record<ClassId, readonly ArmorTypeId[]> = {
  warrior: ['cloth', 'leather', 'metal'],
  mage:    ['cloth'],
  ranger:  ['cloth', 'leather'],
  worge:   ['cloth', 'leather'],
};

// ============================================
// SHIELD TYPES (6 total, warrior-focused)
// ============================================

export const SHIELD_TYPES = [
  'buckler',      // Light, fast block recovery
  'kite',         // Balanced defense/mobility
  'tower',        // Maximum block, slow movement
  'spiked',       // Block + reflect damage
  'magic',        // Spell-enhanced blocking
  'relic',        // Unique effects, boss drops
] as const;
export type ShieldTypeId = typeof SHIELD_TYPES[number];

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Check if a class can equip a specific weapon type
 */
export function canClassEquipWeapon(classId: ClassId, weaponType: WeaponTypeId): boolean {
  const allowed = CLASS_ALLOWED_WEAPONS[classId];
  if (!allowed) return false;
  return allowed.includes(weaponType);
}

/**
 * Check if a class can wear a specific armor type
 */
export function canClassEquipArmor(classId: ClassId, armorType: ArmorTypeId): boolean {
  const allowed = CLASS_ALLOWED_ARMOR[classId];
  if (!allowed) return false;
  return allowed.includes(armorType);
}

/**
 * Get all weapon types a class can use
 */
export function getClassWeapons(classId: ClassId): readonly WeaponTypeId[] {
  return CLASS_ALLOWED_WEAPONS[classId] || [];
}

/**
 * Get all armor types a class can wear
 */
export function getClassArmor(classId: ClassId): readonly ArmorTypeId[] {
  return CLASS_ALLOWED_ARMOR[classId] || [];
}

/**
 * Get all classes that can use a specific weapon type
 */
export function getClassesForWeapon(weaponType: WeaponTypeId): ClassId[] {
  return CLASS_IDS.filter(classId => canClassEquipWeapon(classId, weaponType)) as ClassId[];
}

/**
 * Validate a full equipment loadout for a class.
 * Returns list of invalid items with reasons.
 */
export function validateEquipmentForClass(
  classId: ClassId,
  equipment: { slot: string; weaponType?: WeaponTypeId; armorType?: ArmorTypeId }[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const item of equipment) {
    if (item.weaponType && !canClassEquipWeapon(classId, item.weaponType)) {
      errors.push(`${classId} cannot equip ${item.weaponType} in ${item.slot}`);
    }
    if (item.armorType && !canClassEquipArmor(classId, item.armorType)) {
      errors.push(`${classId} cannot wear ${item.armorType} armor in ${item.slot}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
