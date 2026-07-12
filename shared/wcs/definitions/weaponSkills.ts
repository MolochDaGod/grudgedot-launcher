// ── Weapon Mastery System ──────────────────────────────────────────────────
// 20 mastery levels per weapon type, unlocked through use (not class-gated).
// Each level scales: damage %, attack speed %, crit chance %.
// Classes receive a head-start bonus on their specialty weapons.

export interface MasteryLevel {
  level: number;
  damagePct: number;      // cumulative % damage bonus at this level
  attackSpeedPct: number; // cumulative % attack speed bonus
  critPct: number;        // cumulative % crit chance bonus
  label: string;          // title for this tier
}

// Per-level gain by tier (1-5, 6-10, 11-15, 16-20)
const MASTERY_GAINS: Array<{ dmg: number; spd: number; crit: number }> = [
  { dmg: 2, spd: 1.0, crit: 0.5 },  // levels 1-5
  { dmg: 3, spd: 1.5, crit: 1.0 },  // levels 6-10
  { dmg: 4, spd: 2.0, crit: 1.5 },  // levels 11-15
  { dmg: 5, spd: 2.5, crit: 2.0 },  // levels 16-20
];

const MASTERY_TIER_LABELS = [
  'Novice',     // 1
  'Apprentice', // 2
  'Adept',      // 3
  'Journeyman', // 4
  'Skilled',    // 5
  'Proficient', // 6
  'Expert',     // 7
  'Veteran',    // 8
  'Master',     // 9
  'Elite',      // 10
  'Champion',   // 11
  'Hero',       // 12
  'Legend',     // 13
  'Warlord',    // 14
  'Conqueror',  // 15
  'Warbringer', // 16
  'Berserker',  // 17
  'Dreadlord',  // 18
  'Warchief',   // 19
  'Grandmaster',// 20
];

/** Generate all 20 mastery levels for any weapon type. */
export function generateMasteryLevels(): MasteryLevel[] {
  let dmg = 0, spd = 0, crit = 0;
  return Array.from({ length: 20 }, (_, i) => {
    const lvl = i + 1;
    const tierIdx = Math.floor(i / 5);
    const gain = MASTERY_GAINS[tierIdx];
    dmg  += gain.dmg;
    spd  += gain.spd;
    crit += gain.crit;
    return {
      level: lvl,
      damagePct: Math.round(dmg * 10) / 10,
      attackSpeedPct: Math.round(spd * 10) / 10,
      critPct: Math.round(crit * 10) / 10,
      label: MASTERY_TIER_LABELS[i],
    };
  });
}

export const MASTERY_LEVELS = generateMasteryLevels();

/** Mastery level at which each class starts for their specialty weapons (head-start bonus). */
export const CLASS_MASTERY_HEADSTART: Record<string, Record<string, number>> = {
  warrior: { SWORD: 4, HAMMER: 4, AXE: 3, SPEAR: 2 },
  mage:    { STAFF: 4, WAND: 4, MACE: 3 },
  ranger:  { BOW: 4, DAGGER: 4, SPEAR: 3 },
  worge:   { STAFF: 3, SPEAR: 3, DAGGER: 3, BOW: 3, HAMMER: 2, MACE: 2 },
};

/** Class specialty weapons used to display 'Class Bonus' label in the UI. */
export const CLASS_SPECIALTY_WEAPONS: Record<string, string[]> = {
  warrior: ['SWORD', 'AXE', 'HAMMER', 'SPEAR'],
  mage:    ['STAFF', 'WAND', 'MACE'],
  ranger:  ['BOW', 'DAGGER', 'SPEAR'],
  worge:   ['STAFF', 'SPEAR', 'DAGGER', 'BOW', 'HAMMER', 'MACE'],
};

/** Get which classes have a mastery head-start for a given weapon type. */
export function getClassBonusesForWeapon(weaponType: string): Array<{ cls: string; headstart: number }> {
  return Object.entries(CLASS_MASTERY_HEADSTART)
    .filter(([, weapons]) => weaponType in weapons)
    .map(([cls, weapons]) => ({ cls, headstart: weapons[weaponType] }));
}

// ── Weapon Skill interfaces ────────────────────────────────────────────────

/**
 * A weapon skill entry.
 *
 * Slots map to in-combat hotkeys 1–5:
 *   slot 1  — Standard Attack (hotkey 1). Each weapon exposes exactly TWO
 *            skills here with `isStandardAttack: true`; the player picks ONE
 *            in the build screen as their basic auto-attack.
 *   slot 2  — Basic     (hotkey 2)
 *   slot 3  — Power     (hotkey 3)
 *   slot 4  — Utility   (hotkey 4)
 *   slot 5  — Ultimate  (hotkey 5)
 */
export interface WeaponSkill {
  id: string;
  name: string;
  description: string;
  icon: string;
  slot: 1 | 2 | 3 | 4 | 5;
  /** True for the two slot-1 "standard attack" options. Player picks one. */
  isStandardAttack?: boolean;
  maxUpgrades: number;
  baseDamage: number;
  damagePerUpgrade: number;
  cooldown: number;
  cooldownReductionPerUpgrade: number;
  manaCost: number;
  effects: string[];
  upgradeEffects: string[];
}

export interface WeaponSkillTree {
  weaponType: string;
  skills: WeaponSkill[];
}

export interface CharacterSkillSlot {
  skillId: string | null;
  upgradeLevel: number;
}

export interface CharacterSkillLoadout {
  weaponType: string;
  /** Slot 1 stores the player's chosen standard-attack skillId (of 2 options). */
  slots: {
    1: CharacterSkillSlot;
    2: CharacterSkillSlot;
    3: CharacterSkillSlot;
    4: CharacterSkillSlot;
    5: CharacterSkillSlot;
  };
}

export interface StoredSkillLoadout {
  slots: {
    1: CharacterSkillSlot;
    2: CharacterSkillSlot;
    3: CharacterSkillSlot;
    4: CharacterSkillSlot;
    5: CharacterSkillSlot;
  };
}

const SWORD_SKILLS: WeaponSkill[] = [
  { id: "sword_slash", name: "Slash", description: "A quick horizontal slash dealing physical damage.", icon: "/icons/icons/weapons/Sword_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 1.5, cooldownReductionPerUpgrade: 0.1, manaCost: 10, effects: ["Physical Damage"], upgradeEffects: ["+8 Damage", "+8 Damage, -0.1s CD", "+8 Damage, Bleed 2s", "+8 Damage, -0.1s CD", "+8 Damage, 10% Armor Pen"] },
  { id: "sword_thrust", name: "Piercing Thrust", description: "A powerful thrust that pierces armor.", icon: "/icons/icons/weapons/Sword_04.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 18, effects: ["Armor Penetration 15%"], upgradeEffects: ["+10 Damage", "+5% Armor Pen", "+10 Damage", "Stun 0.5s", "+15% Armor Pen"] },
  { id: "sword_parry", name: "Parry", description: "Block incoming attack and counter.", icon: "/icons/icons/weapons/shield_01.png", slot: 2, maxUpgrades: 5, baseDamage: 15, damagePerUpgrade: 5, cooldown: 4, cooldownReductionPerUpgrade: 0.3, manaCost: 15, effects: ["Block Next Attack", "Counter Attack"], upgradeEffects: ["+Block Duration", "+5 Counter Damage", "Reflect 20%", "+Block Duration", "Stun on Counter"] },
  
  { id: "sword_whirlwind", name: "Whirlwind", description: "Spin attack hitting all nearby enemies.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 6, cooldownReductionPerUpgrade: 0.3, manaCost: 30, effects: ["AoE 360°", "3m Radius"], upgradeEffects: ["+12 Damage", "+0.5m Radius", "+12 Damage, Slow 20%", "+1m Radius", "Pull Enemies In"] },
  { id: "sword_charge", name: "Heroic Charge", description: "Dash forward dealing damage and stunning.", icon: "/icons/icons/misc/CircleW.png", slot: 3, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 8, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 25, effects: ["Dash 5m", "Stun 1s"], upgradeEffects: ["+2m Dash", "+8 Damage", "Stun +0.5s", "+8 Damage", "Leave Fire Trail"] },
  { id: "sword_execute", name: "Execute", description: "Powerful strike, bonus damage to low HP.", icon: "/icons/icons/misc/Chaos_2.png", slot: 3, maxUpgrades: 5, baseDamage: 50, damagePerUpgrade: 15, cooldown: 10, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["2x Damage below 30% HP"], upgradeEffects: ["+15 Damage", "Threshold 35%", "+15 Damage", "Threshold 40%", "Reset CD on Kill"] },

  { id: "sword_defensive_stance", name: "Defensive Stance", description: "Take reduced damage for 5 seconds.", icon: "/icons/icons/weapons/shield_05.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 35, effects: ["30% Damage Reduction", "5s Duration"], upgradeEffects: ["+5% DR", "+1s Duration", "+5% DR", "Reflect 10%", "Immunity to CC"] },
  { id: "sword_battle_cry", name: "Battle Cry", description: "Boost attack damage for you and allies.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.5, manaCost: 40, effects: ["+20% Damage", "5s Duration", "10m Range"], upgradeEffects: ["+5% Damage Buff", "+2s Duration", "+5% Damage Buff", "+Attack Speed 15%", "+Crit Chance 10%"] },
  { id: "sword_riposte", name: "Riposte", description: "Counter next attack with devastating blow.", icon: "/icons/icons/misc/CircleL.png", slot: 4, maxUpgrades: 5, baseDamage: 60, damagePerUpgrade: 20, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 30, effects: ["Counter Window 2s", "Guaranteed Crit"], upgradeEffects: ["+20 Damage", "+0.5s Window", "+20 Damage", "Stun 1.5s", "Reset All CDs on Counter"] },

  { id: "sword_bladestorm", name: "Bladestorm", description: "Ultimate: Become a whirlwind of blades.", icon: "/icons/icons/misc/CircleF.png", slot: 5, maxUpgrades: 3, baseDamage: 80, damagePerUpgrade: 30, cooldown: 45, cooldownReductionPerUpgrade: 5, manaCost: 80, effects: ["Channel 4s", "Immune to CC", "AoE 5m"], upgradeEffects: ["+30 Damage, +1s Duration", "+30 Damage, Pull Enemies", "+50 Damage, Heals 2% per hit"] },
  { id: "sword_avatar", name: "Avatar of War", description: "Ultimate: Transform into an unstoppable warrior.", icon: "/icons/icons/misc/CircleE.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["+50% All Stats", "8s Duration", "Immune to Death"], upgradeEffects: ["+10% Stats, +2s Duration", "+10% Stats, Reset CDs", "+20% Stats, Explode on End"] },
];

const AXE_SKILLS: WeaponSkill[] = [
  { id: "axe_cleave", name: "Cleave", description: "Heavy overhead swing cleaving through armor.", icon: "/icons/icons/weapons/Axe_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 15, effects: ["25% Armor Ignore"], upgradeEffects: ["+10 Damage", "+10% Armor Ignore", "+10 Damage", "Bleed 3s", "+15% Armor Ignore"] },
  { id: "axe_rend", name: "Rending Strike", description: "Tear through flesh causing bleeding.", icon: "/icons/icons/misc/Burns.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 6, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 12, effects: ["Bleed 5s", "8 DPS"], upgradeEffects: ["+2 Bleed DPS", "+6 Damage", "+2 Bleed DPS", "+2s Duration", "Spread to Nearby"] },
  { id: "axe_crush", name: "Crushing Blow", description: "Smash down reducing enemy defenses.", icon: "/icons/icons/weapons/Axe_05.png", slot: 2, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 8, cooldown: 3, cooldownReductionPerUpgrade: 0.2, manaCost: 18, effects: ["Reduce Armor 20%", "3s Duration"], upgradeEffects: ["+8 Damage", "+10% Armor Reduce", "+8 Damage", "+2s Duration", "Shatter Shields"] },

  { id: "axe_frenzy", name: "Blood Frenzy", description: "Attack rapidly, gaining speed with each hit.", icon: "/icons/icons/misc/CircleF.png", slot: 2, maxUpgrades: 5, baseDamage: 15, damagePerUpgrade: 5, cooldown: 8, cooldownReductionPerUpgrade: 0.5, manaCost: 35, effects: ["5 Rapid Hits", "+10% Speed per Hit"], upgradeEffects: ["+1 Hit", "+5 Damage", "+1 Hit", "Lifesteal 5%", "+2 Hits, Crit Chance"] },
  { id: "axe_leap", name: "Savage Leap", description: "Leap to target location slamming down.", icon: "/icons/icons/misc/CircleW.png", slot: 3, maxUpgrades: 5, baseDamage: 45, damagePerUpgrade: 12, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 30, effects: ["Leap 8m", "AoE 3m", "Slow 30%"], upgradeEffects: ["+12 Damage", "+2m Leap", "+1m AoE", "+20% Slow", "Stun on Land"] },
  { id: "axe_rampage", name: "Rampage", description: "Go berserk dealing massive damage.", icon: "/icons/icons/misc/Chaos.png", slot: 3, maxUpgrades: 5, baseDamage: 55, damagePerUpgrade: 15, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 45, effects: ["3 Heavy Swings", "+30% Damage Taken"], upgradeEffects: ["+15 Damage", "Reduce Penalty to 20%", "+15 Damage", "Heal 10% on Kill", "No Penalty"] },

  { id: "axe_bloodlust", name: "Bloodlust", description: "Gain power from dealing damage.", icon: "/icons/icons/potions/P_Red03.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 40, effects: ["Stack Damage +5%", "Max 10 Stacks", "8s Duration"], upgradeEffects: ["+2% per Stack", "+2 Max Stacks", "+2s Duration", "Lifesteal at Max", "+3 Max Stacks"] },
  { id: "axe_berserker_rage", name: "Berserker Rage", description: "Enter rage state, immune to pain.", icon: "/icons/icons/misc/Chaos_2.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 2, manaCost: 50, effects: ["Cannot Die for 4s", "Take Damage After"], upgradeEffects: ["+1s Duration", "Heal 20% After", "+1s Duration", "Reduce Damage Taken After 50%", "Heal 50% After"] },
  { id: "axe_intimidate", name: "Intimidating Shout", description: "Fear nearby enemies reducing their damage.", icon: "/icons/icons/misc/CircleN.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.5, manaCost: 35, effects: ["-25% Enemy Damage", "5s Duration", "8m Range"], upgradeEffects: ["-5% More", "+2s Duration", "-5% More", "Slow 30%", "Root 2s"] },

  { id: "axe_annihilation", name: "Annihilation", description: "Ultimate: Devastating combo destroying all.", icon: "/icons/icons/misc/CircleE.png", slot: 5, maxUpgrades: 3, baseDamage: 120, damagePerUpgrade: 40, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 90, effects: ["5 Hit Combo", "Final Hit 3x Damage"], upgradeEffects: ["+40 Damage, +1 Hit", "+40 Damage, Armor Shred", "+60 Damage, Execute Below 25%"] },
  { id: "axe_warlord", name: "Warlord's Fury", description: "Ultimate: Become an unstoppable berserker.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["+100% Attack Speed", "+50% Damage", "10s Duration"], upgradeEffects: ["+2s Duration, Lifesteal 10%", "+3s Duration, No Mana Cost", "+5s Duration, Cleave All Attacks"] },
];

const BOW_SKILLS: WeaponSkill[] = [
  { id: "bow_quickshot", name: "Quick Shot", description: "Rapid arrow dealing physical damage.", icon: "/icons/icons/weapons/Bow_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 6, cooldown: 1, cooldownReductionPerUpgrade: 0.05, manaCost: 8, effects: ["Range 25m"], upgradeEffects: ["+6 Damage", "-0.1s CD", "+6 Damage", "Pierce 1 Target", "+6 Damage, +5m Range"] },
  { id: "bow_aimed", name: "Aimed Shot", description: "Charged shot with guaranteed critical.", icon: "/icons/icons/weapons/Bow_05.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 3, cooldownReductionPerUpgrade: 0.2, manaCost: 20, effects: ["Guaranteed Crit", "1s Channel"], upgradeEffects: ["+12 Damage", "+25% Crit Damage", "+12 Damage", "-0.3s Channel", "+50% Crit Damage"] },
  { id: "bow_poison", name: "Poison Arrow", description: "Arrow coated in deadly poison.", icon: "/icons/icons/potions/P_Green03.png", slot: 2, maxUpgrades: 5, baseDamage: 15, damagePerUpgrade: 4, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 15, effects: ["Poison 6s", "5 DPS", "Slow 15%"], upgradeEffects: ["+2 Poison DPS", "+5% Slow", "+2 Poison DPS", "+3s Duration", "Spread on Death"] },

  { id: "bow_multishot", name: "Multishot", description: "Fire multiple arrows in a cone.", icon: "/icons/icons/weapons/Arrow_01.png", slot: 2, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 6, cooldownReductionPerUpgrade: 0.3, manaCost: 30, effects: ["5 Arrows", "60° Cone"], upgradeEffects: ["+1 Arrow", "+8 Damage", "+1 Arrow", "+15° Cone", "+2 Arrows, Pierce"] },
  { id: "bow_explosive", name: "Explosive Arrow", description: "Arrow that explodes on impact.", icon: "/icons/icons/misc/Burns.png", slot: 3, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 35, effects: ["AoE 4m", "Knockback"], upgradeEffects: ["+10 Damage", "+1m AoE", "+10 Damage", "Burn 3s", "Stun 1s"] },
  { id: "bow_volley", name: "Arrow Volley", description: "Rain arrows on target area.", icon: "/icons/icons/weapons/Arrow_05.png", slot: 3, maxUpgrades: 5, baseDamage: 50, damagePerUpgrade: 15, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 45, effects: ["AoE 6m", "3s Duration", "30m Range"], upgradeEffects: ["+15 Damage", "+1s Duration", "+2m AoE", "Slow 40%", "Root Final Wave"] },

  { id: "bow_evasion", name: "Evasive Roll", description: "Roll away gaining attack speed.", icon: "/icons/icons/misc/CircleW.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 10, cooldownReductionPerUpgrade: 0.8, manaCost: 20, effects: ["Dash 6m", "Invincible During", "+20% Attack Speed 3s"], upgradeEffects: ["+2m Dash", "+10% Attack Speed", "+1s Duration", "2 Charges", "+1 Charge"] },
  { id: "bow_trap", name: "Hunter's Trap", description: "Place trap that roots enemies.", icon: "/icons/icons/resources/Cog.png", slot: 4, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 8, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 30, effects: ["Root 3s", "Reveal Stealth"], upgradeEffects: ["+8 Damage", "+1s Root", "+8 Damage", "+1 Trap Active", "Poison 5s"] },
  { id: "bow_camouflage", name: "Camouflage", description: "Become invisible and gain crit.", icon: "/icons/icons/misc/CircleN.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.5, manaCost: 40, effects: ["Stealth 5s", "+50% Crit from Stealth", "+30% Move Speed"], upgradeEffects: ["+2s Duration", "+10% Crit Bonus", "+10% Move Speed", "No CD Break on Attack", "+20% Crit Bonus"] },

  { id: "bow_sniper", name: "Sniper Shot", description: "Ultimate: Devastating long-range shot.", icon: "/icons/icons/weapons/Bow_10.png", slot: 5, maxUpgrades: 3, baseDamage: 150, damagePerUpgrade: 50, cooldown: 40, cooldownReductionPerUpgrade: 5, manaCost: 70, effects: ["50m Range", "2s Channel", "Ignore 50% Armor"], upgradeEffects: ["+50 Damage, Pierce All", "+50 Damage, -0.5s Channel", "+75 Damage, Reset on Kill"] },
  { id: "bow_rain", name: "Rain of Arrows", description: "Ultimate: Carpet bomb an area.", icon: "/icons/icons/weapons/Arrow_10.png", slot: 5, maxUpgrades: 3, baseDamage: 80, damagePerUpgrade: 25, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 90, effects: ["AoE 10m", "5s Duration", "Slow 50%"], upgradeEffects: ["+25 Damage, +2m AoE", "+25 Damage, +2s Duration", "+40 Damage, Root Last Wave, Burn"] },
];

const STAFF_SKILLS: WeaponSkill[] = [
  { id: "staff_fireball", name: "Fireball", description: "Hurl a ball of fire at enemies.", icon: "/icons/icons/misc/CircleF.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 20, effects: ["Magic Damage", "Small AoE"], upgradeEffects: ["+10 Damage", "+1m AoE", "+10 Damage", "Burn 3s", "+10 Damage, Explode"] },
  { id: "staff_frostbolt", name: "Frost Bolt", description: "Freeze enemies with ice magic.", icon: "/icons/icons/misc/CircleW.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 18, effects: ["Slow 30%", "3s Duration"], upgradeEffects: ["+8 Damage", "+10% Slow", "+8 Damage", "+2s Duration", "Chance to Freeze"] },
  { id: "staff_lightning", name: "Lightning Bolt", description: "Strike with pure electrical energy.", icon: "/icons/icons/misc/CircleL.png", slot: 2, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 12, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 22, effects: ["Chain to 2 Targets"], upgradeEffects: ["+12 Damage", "+1 Chain Target", "+12 Damage", "Stun 0.5s", "+2 Chain, +Damage per Chain"] },

  { id: "staff_meteor", name: "Meteor Strike", description: "Call down a devastating meteor.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 60, damagePerUpgrade: 20, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 50, effects: ["AoE 5m", "1.5s Delay", "Stun 1s"], upgradeEffects: ["+20 Damage", "+1m AoE", "+20 Damage", "Burn Ground 5s", "Instant Cast"] },
  { id: "staff_blizzard", name: "Blizzard", description: "Create a freezing storm.", icon: "/icons/icons/misc/AquaCircle.png", slot: 3, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 45, effects: ["AoE 6m", "4s Duration", "Slow 50%"], upgradeEffects: ["+12 Damage", "+1s Duration", "+2m AoE", "Freeze Chance 20%", "+10% Freeze Chance"] },
  { id: "staff_chain_lightning", name: "Chain Lightning", description: "Lightning that bounces between enemies.", icon: "/icons/icons/misc/CircleE.png", slot: 3, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 8, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["Bounces 5 Times", "+10% Damage per Bounce"], upgradeEffects: ["+2 Bounces", "+10 Damage", "+2 Bounces", "Stun Final Target", "+3 Bounces, Paralyze"] },

  { id: "staff_shield", name: "Arcane Shield", description: "Protect yourself with magical barrier.", icon: "/icons/icons/weapons/shield_05.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 40, effects: ["Absorb 200 Damage", "6s Duration"], upgradeEffects: ["+50 Absorb", "+2s Duration", "+50 Absorb", "Reflect 20%", "Explode on Break"] },
  { id: "staff_teleport", name: "Blink", description: "Teleport to target location.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 30, effects: ["Teleport 15m", "Invincible During"], upgradeEffects: ["+5m Range", "-1s CD", "+5m Range", "2 Charges", "+1 Charge"] },
  { id: "staff_mana_surge", name: "Mana Surge", description: "Regenerate mana rapidly.", icon: "/icons/icons/misc/AquaCore.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 2, manaCost: 0, effects: ["Restore 50% Mana", "+30% Cast Speed 5s"], upgradeEffects: ["+10% Mana", "+5% Cast Speed", "+10% Mana", "+2s Duration", "Instant All Spells 3s"] },

  { id: "staff_armageddon", name: "Armageddon", description: "Ultimate: Rain fire and destruction.", icon: "/icons/icons/misc/Chaos_2.png", slot: 5, maxUpgrades: 3, baseDamage: 100, damagePerUpgrade: 35, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 100, effects: ["AoE 12m", "6s Duration", "Random Meteors"], upgradeEffects: ["+35 Damage, +3m AoE", "+35 Damage, +2s Duration", "+50 Damage, Guaranteed Stun Each Hit"] },
  { id: "staff_arcane_form", name: "Arcane Ascension", description: "Ultimate: Become pure arcane energy.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 120, effects: ["+100% Spell Damage", "No Mana Cost", "8s Duration", "Floating"], upgradeEffects: ["+2s Duration, +20% Damage", "+3s Duration, CD Reset", "+5s Duration, Immune to Damage"] },
];

const DAGGER_SKILLS: WeaponSkill[] = [
  { id: "dagger_stab", name: "Backstab", description: "Quick stab from behind for bonus damage.", icon: "/icons/icons/weapons/Dagger_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 1.5, cooldownReductionPerUpgrade: 0.1, manaCost: 12, effects: ["+50% from Behind"], upgradeEffects: ["+10 Damage", "+10% Behind Bonus", "+10 Damage", "Guaranteed Crit from Behind", "+20% Behind Bonus"] },
  { id: "dagger_flurry", name: "Blade Flurry", description: "Rapid series of stabs.", icon: "/icons/icons/weapons/Dagger_05.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 18, damagePerUpgrade: 5, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 15, effects: ["4 Rapid Hits"], upgradeEffects: ["+1 Hit", "+5 Damage", "+1 Hit", "Poison Each Hit", "+2 Hits"] },
  { id: "dagger_throw", name: "Throwing Knife", description: "Throw a knife at range.", icon: "/icons/icons/weapons/Dagger_10.png", slot: 2, maxUpgrades: 5, baseDamage: 22, damagePerUpgrade: 7, cooldown: 2, cooldownReductionPerUpgrade: 0.12, manaCost: 10, effects: ["Range 15m", "Slow 20%"], upgradeEffects: ["+7 Damage", "+5m Range", "+7 Damage", "+15% Slow", "Bounce to 2nd Target"] },

  { id: "dagger_assassinate", name: "Assassinate", description: "Powerful strike from stealth.", icon: "/icons/icons/misc/Chaos_2.png", slot: 2, maxUpgrades: 5, baseDamage: 70, damagePerUpgrade: 20, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 40, effects: ["Requires Stealth", "3x Damage"], upgradeEffects: ["+20 Damage", "+0.5x Multiplier", "+20 Damage", "Silence 3s", "+1x Multiplier, Reset Stealth"] },
  { id: "dagger_shadowstep", name: "Shadow Step", description: "Teleport behind target.", icon: "/icons/icons/misc/CircleN.png", slot: 3, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 8, cooldownReductionPerUpgrade: 0.5, manaCost: 25, effects: ["Teleport Behind", "15m Range"], upgradeEffects: ["+8 Damage", "+5m Range", "+8 Damage", "Slow 40%", "2 Charges"] },
  { id: "dagger_fan", name: "Fan of Knives", description: "Throw knives in all directions.", icon: "/icons/icons/weapons/Dagger_15.png", slot: 3, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 6, cooldownReductionPerUpgrade: 0.3, manaCost: 30, effects: ["360° AoE", "5m Range"], upgradeEffects: ["+10 Damage", "+1m Range", "+10 Damage", "Poison 4s", "Cripple -30% Move"] },

  { id: "dagger_vanish", name: "Vanish", description: "Become invisible instantly.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.5, manaCost: 35, effects: ["Stealth 6s", "Break All Targeting", "+40% Move Speed"], upgradeEffects: ["+2s Duration", "Heal 15%", "+10% Move Speed", "Remove Debuffs", "+3s Duration"] },
  { id: "dagger_poison_blade", name: "Envenom", description: "Coat blades in deadly poison.", icon: "/icons/icons/potions/P_Green05.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 30, effects: ["Next 5 Attacks Poison", "8 DPS for 5s"], upgradeEffects: ["+2 DPS", "+2 Attacks", "+2 DPS", "+2s Duration", "Instant Kill Below 10%"] },
  { id: "dagger_evasion", name: "Evasion", description: "Dodge all attacks briefly.", icon: "/icons/icons/misc/CircleW.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 2, manaCost: 40, effects: ["100% Dodge", "3s Duration"], upgradeEffects: ["+1s Duration", "Counter Attack on Dodge", "+1s Duration", "+50% Attack Speed After", "+2s Duration"] },

  { id: "dagger_death_mark", name: "Death Mark", description: "Ultimate: Mark target for death.", icon: "/icons/icons/misc/Chaos.png", slot: 5, maxUpgrades: 3, baseDamage: 200, damagePerUpgrade: 60, cooldown: 45, cooldownReductionPerUpgrade: 5, manaCost: 80, effects: ["Mark 6s", "All Damage +30%", "Execute at End"], upgradeEffects: ["+60 Damage, +10% Amp", "+60 Damage, +2s Duration", "+100 Damage, Spread to Nearby on Kill"] },
  { id: "dagger_shadow_dance", name: "Shadow Dance", description: "Ultimate: Become one with shadows.", icon: "/icons/icons/misc/CircleE.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["Permanent Stealth 8s", "No CD on Abilities", "+100% Crit"], upgradeEffects: ["+3s Duration, +20% Crit Damage", "+3s Duration, Heal on Kill", "+4s Duration, All Kills Reset Duration"] },
];

// ══════════════════════════════════════════════════════════════════════════
// Unique trees replacing earlier SWORD/AXE/STAFF aliases
// ══════════════════════════════════════════════════════════════════════════

const MACE_SKILLS: WeaponSkill[] = [
  { id: "mace_bash", name: "Mace Bash", description: "Heavy blunt strike that staggers.", icon: "/icons/icons/weapons/Mace_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 28, damagePerUpgrade: 9, cooldown: 1.8, cooldownReductionPerUpgrade: 0.1, manaCost: 12, effects: ["Stagger 0.3s"], upgradeEffects: ["+9 Damage", "+0.2s Stagger", "+9 Damage, -0.1s CD", "+9 Damage", "+10% Armor Ignore"] },
  { id: "mace_smite", name: "Holy Smite", description: "Channel light into a radiant blow.", icon: "/icons/icons/misc/Core.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 32, damagePerUpgrade: 10, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 18, effects: ["Holy Damage"], upgradeEffects: ["+10 Damage", "Blind 0.5s", "+10 Damage", "+2x vs Undead", "Heal 5% on Hit"] },
  { id: "mace_shatter", name: "Shatter", description: "Crack enemy armor with a weighted blow.", icon: "/icons/icons/weapons/Mace_05.png", slot: 2, maxUpgrades: 5, baseDamage: 26, damagePerUpgrade: 8, cooldown: 3, cooldownReductionPerUpgrade: 0.2, manaCost: 16, effects: ["Reduce Armor 25%", "4s"], upgradeEffects: ["+8 Damage", "+5% Armor Reduce", "+2s Duration", "+8 Damage", "Shatter Shields"] },
  { id: "mace_judgement", name: "Judgement", description: "A righteous overhead strike in an area.", icon: "/icons/icons/misc/CircleL.png", slot: 2, maxUpgrades: 5, baseDamage: 45, damagePerUpgrade: 13, cooldown: 7, cooldownReductionPerUpgrade: 0.35, manaCost: 32, effects: ["AoE 3m", "Holy"], upgradeEffects: ["+13 Damage", "+1m AoE", "+13 Damage", "Stun 0.5s", "Cleanse Debuff on Self"] },
  { id: "mace_heavens_hammer", name: "Heaven's Hammer", description: "Crash down with divine weight.", icon: "/icons/icons/misc/Chaos.png", slot: 3, maxUpgrades: 5, baseDamage: 55, damagePerUpgrade: 16, cooldown: 9, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["AoE 4m", "Knockdown 1s"], upgradeEffects: ["+16 Damage", "+1m AoE", "+16 Damage", "+0.5s Knockdown", "Second Strike after 1s"] },
  { id: "mace_pursuit", name: "Pursuit Strike", description: "Close distance and hammer down.", icon: "/icons/icons/misc/CircleW.png", slot: 3, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 28, effects: ["Dash 6m", "Slow 30%"], upgradeEffects: ["+10 Damage", "+2m Dash", "+10 Damage", "Reset CD on Kill", "Stun 0.5s"] },
  { id: "mace_consecration", name: "Consecration", description: "Sanctify ground that burns foes.", icon: "/icons/icons/misc/CircleF.png", slot: 3, maxUpgrades: 5, baseDamage: 18, damagePerUpgrade: 6, cooldown: 14, cooldownReductionPerUpgrade: 1, manaCost: 36, effects: ["5m Ward", "6s Tick", "+10% Heal Received Inside"], upgradeEffects: ["+6 DPS", "+1m Radius", "+6 DPS", "+2s Duration", "Cleanse on Enter"] },
  { id: "mace_divine_shield", name: "Divine Shield", description: "Cloak yourself in protective light.", icon: "/icons/icons/weapons/shield_05.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 40, effects: ["Absorb 250", "5s Duration"], upgradeEffects: ["+50 Absorb", "+1s Duration", "Reflect 10%", "+50 Absorb", "Immune to Stuns"] },
  { id: "mace_avengers_wrath", name: "Avenger's Wrath", description: "Strike faster as the battle rages on.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 22, cooldownReductionPerUpgrade: 1.6, manaCost: 42, effects: ["+25% Attack Speed", "+15% Holy Damage", "6s Duration"], upgradeEffects: ["+5% Speed", "+2s Duration", "+5% Speed", "+5% Holy Damage", "Refresh on Kill"] },
  { id: "mace_divine_storm", name: "Divine Storm", description: "Ultimate: Swirling holy blades strike all.", icon: "/icons/icons/misc/CircleE.png", slot: 5, maxUpgrades: 3, baseDamage: 90, damagePerUpgrade: 32, cooldown: 48, cooldownReductionPerUpgrade: 6, manaCost: 85, effects: ["AoE 6m", "5 Hits"], upgradeEffects: ["+32 Damage, +1m AoE", "+32 Damage, Heal 5% per Hit", "+40 Damage, Deals 2x to Evil"] },
  { id: "mace_retribution", name: "Retribution", description: "Ultimate: Reflect all damage taken.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["Reflect 150% Damage 6s", "Immune to Death"], upgradeEffects: ["+2s Duration, Reflect 180%", "+2s Duration, Heal from Reflects", "+3s Duration, Reflect 220%"] },
];

const HAMMER_SKILLS: WeaponSkill[] = [
  { id: "hammer_crush", name: "Crush", description: "Hammer down with blunt force.", icon: "/icons/icons/weapons/Hammer_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 32, damagePerUpgrade: 11, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 15, effects: ["Knockback 2m"], upgradeEffects: ["+11 Damage", "+1m Knockback", "+11 Damage", "Stun 0.3s", "+15% Armor Ignore"] },
  { id: "hammer_shockwave", name: "Shockwave", description: "Send a cone of kinetic force.", icon: "/icons/icons/misc/CircleW.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 26, damagePerUpgrade: 8, cooldown: 3, cooldownReductionPerUpgrade: 0.15, manaCost: 20, effects: ["Cone 6m", "Slow 20%"], upgradeEffects: ["+8 Damage", "+2m Cone", "+8 Damage", "+10% Slow", "Interrupt Casts"] },
  { id: "hammer_thunderclap", name: "Thunderclap", description: "Slam ground for lightning damage.", icon: "/icons/icons/misc/CircleL.png", slot: 2, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 3.5, cooldownReductionPerUpgrade: 0.2, manaCost: 22, effects: ["AoE 3m", "Shock Chain to 1"], upgradeEffects: ["+10 Damage", "+1 Chain Target", "+10 Damage", "+1m AoE", "Stun Chained Target"] },
  { id: "hammer_earthquake", name: "Earthquake", description: "Ground ruptures around you.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 42, damagePerUpgrade: 13, cooldown: 10, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["AoE 5m", "3s Rumble", "Slow 40%"], upgradeEffects: ["+13 Damage", "+1m AoE", "+13 Damage", "+1s Duration", "Knockdown Periodically"] },
  { id: "hammer_ground_slam", name: "Ground Slam", description: "Vault up then crash down.", icon: "/icons/icons/misc/CircleF.png", slot: 3, maxUpgrades: 5, baseDamage: 55, damagePerUpgrade: 16, cooldown: 11, cooldownReductionPerUpgrade: 0.6, manaCost: 38, effects: ["AoE 4m", "Airtime 0.7s"], upgradeEffects: ["+16 Damage", "+1m AoE", "+16 Damage", "Launch Enemies", "Chain on Kill"] },
  { id: "hammer_throw", name: "Hammer Throw", description: "Hurl your hammer like a boomerang.", icon: "/icons/icons/misc/CircleE.png", slot: 3, maxUpgrades: 5, baseDamage: 45, damagePerUpgrade: 14, cooldown: 9, cooldownReductionPerUpgrade: 0.5, manaCost: 30, effects: ["Range 18m", "Returns"], upgradeEffects: ["+14 Damage", "+5m Range", "+14 Damage", "Pierces Targets", "Armor Shred on Hit"] },
  { id: "hammer_stonewall", name: "Stonewall", description: "Harden skin into stone.", icon: "/icons/icons/weapons/shield_05.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 16, cooldownReductionPerUpgrade: 1, manaCost: 35, effects: ["+30% Defense", "-15% Move Speed", "6s Duration"], upgradeEffects: ["+5% Defense", "+1s Duration", "+5% Defense", "Move Penalty Halved", "Immune to Knockback"] },
  { id: "hammer_mountain_stance", name: "Mountain Stance", description: "Root yourself, hit harder.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.4, manaCost: 40, effects: ["+35% Damage", "Cannot Move", "8s Duration"], upgradeEffects: ["+5% Damage", "Short Steps Allowed", "+5% Damage", "+2s Duration", "Immune to CC"] },
  { id: "hammer_battle_shout", name: "Battle Shout", description: "Rally allies with a thunderous roar.", icon: "/icons/icons/misc/CircleN.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 22, cooldownReductionPerUpgrade: 1.5, manaCost: 38, effects: ["+15% Damage Aura", "10m Range", "5s"], upgradeEffects: ["+3% Aura", "+1s Duration", "+3% Aura", "+Attack Speed 10%", "Fear Enemies 1s"] },
  { id: "hammer_titans_wrath", name: "Titan's Wrath", description: "Ultimate: Swing with the force of a titan.", icon: "/icons/icons/misc/Chaos_2.png", slot: 5, maxUpgrades: 3, baseDamage: 130, damagePerUpgrade: 45, cooldown: 55, cooldownReductionPerUpgrade: 7, manaCost: 95, effects: ["AoE 8m", "Ignore All Armor"], upgradeEffects: ["+45 Damage, +2m AoE", "+45 Damage, Shatter Shields", "+60 Damage, Double Swing"] },
  { id: "hammer_seismic_finale", name: "Seismic Finale", description: "Ultimate: Rupture the battlefield.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 80, damagePerUpgrade: 30, cooldown: 65, cooldownReductionPerUpgrade: 8, manaCost: 110, effects: ["AoE 12m", "5 Aftershocks", "Knockdown"], upgradeEffects: ["+30 Damage, +2 Shocks", "+30 Damage, +3m AoE", "+50 Damage, Aftershocks Chain Enemies"] },
];

const SPEAR_SKILLS: WeaponSkill[] = [
  { id: "spear_thrust", name: "Spear Thrust", description: "Precise thrust with reach.", icon: "/icons/icons/weapons/Spear_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 24, damagePerUpgrade: 8, cooldown: 1.2, cooldownReductionPerUpgrade: 0.05, manaCost: 8, effects: ["Range 3m"], upgradeEffects: ["+8 Damage", "+1m Range", "+8 Damage", "-0.1s CD", "Bleed 2s"] },
  { id: "spear_skewer", name: "Skewer", description: "Impale and pierce through line.", icon: "/icons/icons/weapons/Spear_05.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 16, effects: ["Pierce 2", "Armor Pen 15%"], upgradeEffects: ["+10 Damage", "+1 Pierce", "+10 Damage", "+5% Armor Pen", "Bleed on Pierce"] },
  { id: "spear_harpoon", name: "Harpoon", description: "Snag and pull the target in.", icon: "/icons/icons/misc/CircleW.png", slot: 2, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 6, cooldown: 4, cooldownReductionPerUpgrade: 0.25, manaCost: 20, effects: ["Pull 6m", "Range 10m"], upgradeEffects: ["+6 Damage", "+2m Pull", "+6 Damage", "+3m Range", "Stun on Arrival"] },
  { id: "spear_phalanx", name: "Phalanx Charge", description: "Charge forward, spearing everything.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 28, effects: ["Dash 10m", "Knockback"], upgradeEffects: ["+12 Damage", "+2m Dash", "+12 Damage", "Pierce All", "Root Targets 1s"] },
  { id: "spear_sweep", name: "Polearm Sweep", description: "Wide sweep around you.", icon: "/icons/icons/misc/CircleN.png", slot: 3, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 11, cooldown: 7, cooldownReductionPerUpgrade: 0.35, manaCost: 26, effects: ["360° AoE 3m"], upgradeEffects: ["+11 Damage", "+0.5m Radius", "+11 Damage", "Slow 25%", "Knockdown 1s"] },
  { id: "spear_impale", name: "Impale", description: "Lift enemy helpless into air.", icon: "/icons/icons/misc/Burns.png", slot: 3, maxUpgrades: 5, baseDamage: 50, damagePerUpgrade: 15, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 35, effects: ["Lift 2s", "Disable"], upgradeEffects: ["+15 Damage", "+0.5s Lift", "+15 Damage", "Bleed 4s", "Execute Below 20%"] },
  { id: "spear_defensive_line", name: "Defensive Line", description: "Hold position, boost defense and range.", icon: "/icons/icons/weapons/shield_01.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 32, effects: ["+25% Defense", "+1m Range", "6s"], upgradeEffects: ["+5% Defense", "+1s Duration", "+5% Defense", "Reflect 15%", "Parry Chance 30%"] },
  { id: "spear_throw", name: "Throw Spear", description: "Hurl spear instantly from range.", icon: "/icons/icons/misc/CircleE.png", slot: 4, maxUpgrades: 5, baseDamage: 45, damagePerUpgrade: 14, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 25, effects: ["Range 25m", "Pierce 2"], upgradeEffects: ["+14 Damage", "+5m Range", "+14 Damage", "Refund Mana on Hit", "Returns to Hand"] },
  { id: "spear_stance", name: "Polearm Stance", description: "Counter-attack anyone who hits you.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 18, damagePerUpgrade: 6, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 40, effects: ["Auto-Counter 5s", "+Counter Damage"], upgradeEffects: ["+6 Counter Damage", "+1s Duration", "+6 Counter Damage", "Reflect Projectiles", "AoE Counter"] },
  { id: "spear_dragon_lance", name: "Dragon Lance", description: "Ultimate: Dragon-fire enchanted thrust.", icon: "/icons/icons/misc/Chaos_2.png", slot: 5, maxUpgrades: 3, baseDamage: 140, damagePerUpgrade: 50, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 90, effects: ["Pierce Line", "Burn 5s", "Range 15m"], upgradeEffects: ["+50 Damage, +3m Range", "+50 Damage, Pierce All", "+75 Damage, Fire Aftershock"] },
  { id: "spear_storm_barrage", name: "Stormspear Barrage", description: "Ultimate: Rain of spears from the sky.", icon: "/icons/icons/misc/CircleL.png", slot: 5, maxUpgrades: 3, baseDamage: 70, damagePerUpgrade: 25, cooldown: 55, cooldownReductionPerUpgrade: 7, manaCost: 95, effects: ["AoE 8m", "10 Spears", "3s Duration"], upgradeEffects: ["+25 Damage, +2 Spears", "+25 Damage, +1s Duration", "+40 Damage, Final Spear Stuns All"] },
];

const WAND_SKILLS: WeaponSkill[] = [
  { id: "wand_arcane_bolt", name: "Arcane Bolt", description: "Fast auto-cast arcane missile.", icon: "/icons/icons/misc/CircleE.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 16, damagePerUpgrade: 5, cooldown: 0.6, cooldownReductionPerUpgrade: 0.05, manaCost: 6, effects: ["Magic", "Instant Cast"], upgradeEffects: ["+5 Damage", "-0.1s CD", "+5 Damage", "+Pierce", "Chain 1 Target"] },
  { id: "wand_quick_spark", name: "Quick Spark", description: "Rapid lightning jolt.", icon: "/icons/icons/misc/CircleL.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 14, damagePerUpgrade: 4, cooldown: 0.8, cooldownReductionPerUpgrade: 0.06, manaCost: 5, effects: ["Shock Chain 1"], upgradeEffects: ["+4 Damage", "+1 Chain", "+4 Damage", "Interrupt Cast", "+2 Chain"] },
  { id: "wand_prismatic_shard", name: "Prismatic Shard", description: "Multi-element shard strike.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 2, maxUpgrades: 5, baseDamage: 22, damagePerUpgrade: 7, cooldown: 1.5, cooldownReductionPerUpgrade: 0.1, manaCost: 12, effects: ["Random Element"], upgradeEffects: ["+7 Damage", "Element Chance Doubles", "+7 Damage", "Burst on Crit", "All Elements Trigger"] },
  { id: "wand_mana_stream", name: "Mana Stream", description: "Channel continuous energy beam.", icon: "/icons/icons/misc/AquaCircle.png", slot: 2, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 6, cooldownReductionPerUpgrade: 0.3, manaCost: 28, effects: ["Channel 3s", "Sustained Damage"], upgradeEffects: ["+12 Damage", "+0.5s Channel", "+12 Damage", "Slow 25%", "Refund 20% Mana"] },
  { id: "wand_arcane_barrage", name: "Arcane Barrage", description: "Fire all pending arcane charges.", icon: "/icons/icons/misc/Chaos.png", slot: 3, maxUpgrades: 5, baseDamage: 48, damagePerUpgrade: 14, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 32, effects: ["Consume Charges", "+10% per Charge"], upgradeEffects: ["+14 Damage", "+3 Charge Cap", "+14 Damage", "+5% per Charge", "Crit per Charge"] },
  { id: "wand_elemental_mix", name: "Elemental Mix", description: "Release 3 random elements at once.", icon: "/icons/icons/misc/CircleF.png", slot: 3, maxUpgrades: 5, baseDamage: 36, damagePerUpgrade: 11, cooldown: 7, cooldownReductionPerUpgrade: 0.35, manaCost: 30, effects: ["3 Random Spells"], upgradeEffects: ["+11 Damage", "+1 Extra Spell", "+11 Damage", "No Duplicates", "All Spells Crit"] },
  { id: "wand_mana_shield", name: "Mana Shield", description: "Damage drains mana instead of HP.", icon: "/icons/icons/weapons/shield_05.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 30, effects: ["80% Damage → Mana", "8s"], upgradeEffects: ["+5% Conversion", "+1s Duration", "+5% Conversion", "Refund on Break", "Convert 100%"] },
  { id: "wand_rapid_cast", name: "Rapid Cast", description: "Halve all cast times briefly.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 22, cooldownReductionPerUpgrade: 1.5, manaCost: 40, effects: ["+50% Cast Speed", "5s"], upgradeEffects: ["+5% Speed", "+1s Duration", "+5% Speed", "Clear All CDs", "Spell Echo 20%"] },
  { id: "wand_focus", name: "Arcane Focus", description: "Next spell crits and hits twice.", icon: "/icons/icons/misc/AquaCore.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 25, effects: ["Next Spell: Crit + Double Hit"], upgradeEffects: ["Bonus Crit +25%", "Triple Hit", "Bonus Crit +25%", "AoE Echo", "Reset All CDs on Kill"] },
  { id: "wand_prismatic_cannon", name: "Prismatic Cannon", description: "Ultimate: Massive rainbow beam.", icon: "/icons/icons/misc/CircleE.png", slot: 5, maxUpgrades: 3, baseDamage: 110, damagePerUpgrade: 40, cooldown: 45, cooldownReductionPerUpgrade: 6, manaCost: 85, effects: ["Beam 30m", "Channel 2s", "All Elements"], upgradeEffects: ["+40 Damage, +10m Range", "+40 Damage, +1s Channel", "+60 Damage, Beam Splits at End"] },
  { id: "wand_archmage_channel", name: "Archmage Channel", description: "Ultimate: Infinite mana for 6s.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 90, effects: ["No Mana Cost 6s", "No Cooldowns"], upgradeEffects: ["+1s Duration", "+30% Spell Damage", "+2s Duration", "+50% Damage, Immune to Silence"] },
];

const SCYTHE_SKILLS: WeaponSkill[] = [
  { id: "scythe_reap", name: "Reap", description: "Pull the scythe through foes.", icon: "/icons/icons/weapons/Scythe_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 28, damagePerUpgrade: 9, cooldown: 1.8, cooldownReductionPerUpgrade: 0.1, manaCost: 12, effects: ["Cleave 2 Targets"], upgradeEffects: ["+9 Damage", "+1 Cleave Target", "+9 Damage", "Lifesteal 5%", "Bleed 3s"] },
  { id: "scythe_death_slash", name: "Death Slash", description: "Dark crescent of withering energy.", icon: "/icons/icons/misc/Chaos_2.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 26, damagePerUpgrade: 8, cooldown: 2.2, cooldownReductionPerUpgrade: 0.12, manaCost: 16, effects: ["Shadow Damage"], upgradeEffects: ["+8 Damage", "Shadow Explosion", "+8 Damage", "Fear 0.5s", "Spread to Nearby"] },
  { id: "scythe_soul_drain", name: "Soul Drain", description: "Leech life force from target.", icon: "/icons/icons/potions/P_Purple03.png", slot: 2, maxUpgrades: 5, baseDamage: 22, damagePerUpgrade: 7, cooldown: 3, cooldownReductionPerUpgrade: 0.15, manaCost: 18, effects: ["Heal 100% of Damage"], upgradeEffects: ["+7 Damage", "+25% Heal Bonus", "+7 Damage", "Restore Mana Too", "Apply Curse 3s"] },
  { id: "scythe_harvest", name: "Harvest", description: "Sweep all enemies in wide arc.", icon: "/icons/icons/misc/CircleN.png", slot: 2, maxUpgrades: 5, baseDamage: 45, damagePerUpgrade: 13, cooldown: 7, cooldownReductionPerUpgrade: 0.4, manaCost: 30, effects: ["AoE 5m", "Cleave All"], upgradeEffects: ["+13 Damage", "+1m AoE", "+13 Damage", "Lifesteal on Kill", "Refresh CD on Kill"] },
  { id: "scythe_reaping_wind", name: "Reaping Wind", description: "Spiral of blades around you.", icon: "/icons/icons/misc/CircleW.png", slot: 3, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 10, cooldown: 9, cooldownReductionPerUpgrade: 0.5, manaCost: 34, effects: ["Channel 3s", "Continuous Damage"], upgradeEffects: ["+10 DPS", "+0.5s Channel", "+10 DPS", "Pull Enemies In", "Ramping Damage"] },
  { id: "scythe_curse_decay", name: "Curse of Decay", description: "Apply withering affliction.", icon: "/icons/icons/potions/P_Green03.png", slot: 3, maxUpgrades: 5, baseDamage: 15, damagePerUpgrade: 5, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 28, effects: ["DoT 8s", "10 DPS", "-20% Healing"], upgradeEffects: ["+3 DPS", "+2s Duration", "+3 DPS", "-10% Healing More", "Spread on Death"] },
  { id: "scythe_spirit_form", name: "Spirit Form", description: "Fade into the spirit world briefly.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 35, effects: ["Intangible 4s", "+Move Speed"], upgradeEffects: ["+1s Duration", "+Move Speed 20%", "+1s Duration", "Phase Through Walls", "Attack While Intangible"] },
  { id: "scythe_soul_collector", name: "Soul Collector", description: "Hold souls from kills; empower yourself.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 1.8, manaCost: 40, effects: ["+3% Damage per Soul", "Max 10 Souls"], upgradeEffects: ["+1% per Soul", "+2 Max Souls", "+1% per Soul", "Heal on Max", "+5 Max Souls"] },
  { id: "scythe_life_pact", name: "Life Pact", description: "Trade HP for massive damage boost.", icon: "/icons/icons/potions/P_Red03.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 28, cooldownReductionPerUpgrade: 2, manaCost: 0, effects: ["-30% HP", "+60% Damage", "10s Duration"], upgradeEffects: ["+5% Damage", "+1s Duration", "+5% Damage", "Lifesteal 10%", "Heal After End"] },
  { id: "scythe_grim_reaper", name: "Grim Reaper", description: "Ultimate: Instant-kill low-HP enemies.", icon: "/icons/icons/misc/Chaos.png", slot: 5, maxUpgrades: 3, baseDamage: 100, damagePerUpgrade: 35, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 85, effects: ["Execute Below 25%", "AoE 5m"], upgradeEffects: ["+35 Damage, +5% Threshold", "+35 Damage, Heal 30% on Execute", "+50 Damage, Threshold 40%"] },
  { id: "scythe_eternal", name: "Eternal Scythe", description: "Ultimate: Death's avatar manifests.", icon: "/icons/icons/misc/CircleE.png", slot: 5, maxUpgrades: 3, baseDamage: 80, damagePerUpgrade: 30, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["10s Duration", "+50% Damage", "All Hits Lifesteal 20%"], upgradeEffects: ["+2s Duration", "+3s Duration, +10% Damage", "+5s Duration, Kills Reset Duration"] },
];

// ══════════════════════════════════════════════════════════════════════════
// Previously-missing weapon trees
// ══════════════════════════════════════════════════════════════════════════

const TWO_H_SWORD_SKILLS: WeaponSkill[] = [
  { id: "2hs_overhead", name: "Overhead Strike", description: "Massive vertical cleave.", icon: "/icons/icons/weapons/Sword_10.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 13, cooldown: 2.5, cooldownReductionPerUpgrade: 0.1, manaCost: 16, effects: ["Knockdown on Crit"], upgradeEffects: ["+13 Damage", "+10% Crit", "+13 Damage", "-0.2s CD", "+20% Armor Pen"] },
  { id: "2hs_sweep", name: "Horizontal Sweep", description: "Wide arc that hits multiple foes.", icon: "/icons/icons/weapons/Sword_15.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 32, damagePerUpgrade: 10, cooldown: 3, cooldownReductionPerUpgrade: 0.15, manaCost: 18, effects: ["Arc 4m", "Hits 3"], upgradeEffects: ["+10 Damage", "+1m Arc", "+10 Damage", "+1 Target", "Bleed All"] },
  { id: "2hs_lunge", name: "Lunge Pierce", description: "Step forward and pierce line.", icon: "/icons/icons/weapons/Sword_04.png", slot: 2, maxUpgrades: 5, baseDamage: 38, damagePerUpgrade: 11, cooldown: 3.5, cooldownReductionPerUpgrade: 0.2, manaCost: 22, effects: ["Dash 3m", "Pierce 2"], upgradeEffects: ["+11 Damage", "+1m Dash", "+11 Damage", "+1 Pierce", "+25% Armor Pen"] },
  { id: "2hs_great_cleave", name: "Great Cleave", description: "360° swing with full weight.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 55, damagePerUpgrade: 17, cooldown: 9, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["360° AoE 4m"], upgradeEffects: ["+17 Damage", "+0.5m Radius", "+17 Damage", "Knockback All", "Crit on Flanked Targets"] },
  { id: "2hs_whirlblade", name: "Whirlblade", description: "Spin continuously dealing damage.", icon: "/icons/icons/misc/CircleW.png", slot: 3, maxUpgrades: 5, baseDamage: 38, damagePerUpgrade: 12, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 42, effects: ["Channel 3s", "AoE 3m"], upgradeEffects: ["+12 Damage", "+0.5s Channel", "+12 Damage", "+1m AoE", "Moveable Channel"] },
  { id: "2hs_executioner", name: "Executioner", description: "Powerful finishing blow.", icon: "/icons/icons/misc/Chaos_2.png", slot: 3, maxUpgrades: 5, baseDamage: 65, damagePerUpgrade: 20, cooldown: 11, cooldownReductionPerUpgrade: 0.7, manaCost: 45, effects: ["2x Damage Below 40% HP"], upgradeEffects: ["+20 Damage", "Threshold 45%", "+20 Damage", "Reset CD on Kill", "Threshold 55%"] },
  { id: "2hs_warbreaker", name: "Warbreaker", description: "Taunt shout — forces attention.", icon: "/icons/icons/misc/CircleN.png", slot: 3, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 14, cooldownReductionPerUpgrade: 1, manaCost: 30, effects: ["Taunt 5s", "AoE 8m"], upgradeEffects: ["+8 Damage", "+1s Taunt", "+8 Damage", "+2m AoE", "-20% Target Damage"] },
  { id: "2hs_heroic_stance", name: "Heroic Stance", description: "Damage buff at cost of defense.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.3, manaCost: 30, effects: ["+40% Damage", "-20% Defense", "8s"], upgradeEffects: ["+5% Damage", "Defense Penalty Halved", "+5% Damage", "+2s Duration", "Immune to Fear"] },
  { id: "2hs_grim_resolve", name: "Grim Resolve", description: "Gain damage as HP drops.", icon: "/icons/icons/potions/P_Red05.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.4, manaCost: 32, effects: ["+1% Damage per % HP Missing", "10s"], upgradeEffects: ["+0.2% Scale", "+2s Duration", "+0.2% Scale", "Lifesteal 5%", "Immune to Death"] },
  { id: "2hs_devastator", name: "Devastator", description: "Ultimate: Blade of pure carnage.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 150, damagePerUpgrade: 55, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 90, effects: ["Single Target", "Ignore All Defense"], upgradeEffects: ["+55 Damage, Cleave 2", "+55 Damage, +50% Crit Bonus", "+80 Damage, Reset All CDs on Kill"] },
  { id: "2hs_legendary_stroke", name: "Legendary Stroke", description: "Ultimate: One strike, massive area.", icon: "/icons/icons/misc/CircleE.png", slot: 5, maxUpgrades: 3, baseDamage: 100, damagePerUpgrade: 40, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 110, effects: ["AoE 10m", "1.5s Windup"], upgradeEffects: ["+40 Damage, +1m AoE", "+40 Damage, -0.3s Windup", "+60 Damage, Double Strike"] },
];

const TWO_H_AXE_SKILLS: WeaponSkill[] = [
  { id: "2ha_heavy_hew", name: "Heavy Hew", description: "Chop with enormous weight.", icon: "/icons/icons/weapons/Axe_10.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 42, damagePerUpgrade: 14, cooldown: 2.5, cooldownReductionPerUpgrade: 0.1, manaCost: 18, effects: ["Knockdown 0.3s"], upgradeEffects: ["+14 Damage", "+0.2s Knockdown", "+14 Damage", "+Armor Pen 15%", "Chain Target on Crit"] },
  { id: "2ha_sunder", name: "Sunder Armor", description: "Rip apart enemy plating.", icon: "/icons/icons/weapons/Axe_15.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 9, cooldown: 3, cooldownReductionPerUpgrade: 0.15, manaCost: 20, effects: ["-30% Armor 6s"], upgradeEffects: ["+9 Damage", "-5% More Armor", "+2s Duration", "+9 Damage", "Stacks 3 Times"] },
  { id: "2ha_cleaving", name: "Cleaving Blow", description: "Hit multiple targets in line.", icon: "/icons/icons/misc/Burns.png", slot: 2, maxUpgrades: 5, baseDamage: 36, damagePerUpgrade: 11, cooldown: 3.5, cooldownReductionPerUpgrade: 0.2, manaCost: 22, effects: ["Line Cleave 5m"], upgradeEffects: ["+11 Damage", "+1m Line", "+11 Damage", "Bleed 4s", "+20% Armor Ignore"] },
  { id: "2ha_berserker_swing", name: "Berserker Swing", description: "Unhinged sweep AoE.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 50, damagePerUpgrade: 16, cooldown: 9, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["AoE 5m", "-10% Defense Self 4s"], upgradeEffects: ["+16 Damage", "+0.5m AoE", "+16 Damage", "Defense Penalty Halved", "Crit vs Low HP"] },
  { id: "2ha_avalanche", name: "Avalanche", description: "3 consecutive smashes.", icon: "/icons/icons/misc/CircleF.png", slot: 3, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 45, effects: ["3 Hits", "Final Hit Stuns"], upgradeEffects: ["+10 per Hit", "+1 Hit", "+10 per Hit", "All Hits Stun", "Hits Spread AoE"] },
  { id: "2ha_throwing_axe", name: "Throwing Axe", description: "Hurl your axe at range.", icon: "/icons/icons/misc/CircleE.png", slot: 3, maxUpgrades: 5, baseDamage: 44, damagePerUpgrade: 14, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 30, effects: ["Range 15m", "Bleed 3s"], upgradeEffects: ["+14 Damage", "+5m Range", "+14 Damage", "Returns to Hand", "Stack Bleed"] },
  { id: "2ha_blood_pact", name: "Blood Pact", description: "Boost damage by spilling your own blood.", icon: "/icons/icons/potions/P_Red03.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 0, effects: ["-15% HP", "+40% Damage", "10s"], upgradeEffects: ["+5% Damage", "HP Cost Halved", "+5% Damage", "Lifesteal 10%", "Refresh on Kill"] },
  { id: "2ha_savage_instinct", name: "Savage Instinct", description: "Attack speed ramps with each hit.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.4, manaCost: 35, effects: ["+10% Attack Speed per Hit", "Max 5 Stacks", "8s"], upgradeEffects: ["+2% per Stack", "+1 Max Stack", "+2% per Stack", "Crit at Max", "+2 Max Stacks"] },
  { id: "2ha_rally_roar", name: "Rally Roar", description: "Inspire nearby allies.", icon: "/icons/icons/misc/CircleN.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 22, cooldownReductionPerUpgrade: 1.5, manaCost: 40, effects: ["+20% Damage Aura", "10m", "5s"], upgradeEffects: ["+5% Aura", "+1s Duration", "+5% Aura", "Fear Enemies 1s", "Heal Allies 10%"] },
  { id: "2ha_world_ender", name: "World-Ender", description: "Ultimate: Apocalyptic swing.", icon: "/icons/icons/misc/Chaos_2.png", slot: 5, maxUpgrades: 3, baseDamage: 160, damagePerUpgrade: 55, cooldown: 55, cooldownReductionPerUpgrade: 7, manaCost: 100, effects: ["AoE 8m", "Knockdown All"], upgradeEffects: ["+55 Damage, +2m AoE", "+55 Damage, Shatter All Armor", "+80 Damage, Second Swing after 2s"] },
  { id: "2ha_primal_onslaught", name: "Primal Onslaught", description: "Ultimate: Frenzied non-stop attacks.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 110, effects: ["+150% Attack Speed", "8s", "Immune to CC"], upgradeEffects: ["+2s Duration, Lifesteal 15%", "+3s Duration, +30% Damage", "+5s Duration, Attacks Cleave"] },
];

const CROSSBOW_SKILLS: WeaponSkill[] = [
  { id: "xbow_heavy_bolt", name: "Heavy Bolt", description: "Slow, armor-piercing bolt.", icon: "/icons/icons/weapons/Crossbow_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 38, damagePerUpgrade: 12, cooldown: 2.5, cooldownReductionPerUpgrade: 0.1, manaCost: 14, effects: ["Range 28m", "Pierce 1"], upgradeEffects: ["+12 Damage", "+3m Range", "+12 Damage", "+20% Armor Pen", "+1 Pierce"] },
  { id: "xbow_piercing", name: "Piercing Shot", description: "Goes through all enemies in line.", icon: "/icons/icons/weapons/Crossbow_05.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 32, damagePerUpgrade: 10, cooldown: 3.5, cooldownReductionPerUpgrade: 0.15, manaCost: 22, effects: ["Pierce All", "Range 30m"], upgradeEffects: ["+10 Damage", "+5m Range", "+10 Damage", "Damage Grows per Pierce", "Crit on Final Target"] },
  { id: "xbow_steady_aim", name: "Steady Aim", description: "Charge a precise shot.", icon: "/icons/icons/misc/CircleN.png", slot: 2, maxUpgrades: 5, baseDamage: 50, damagePerUpgrade: 15, cooldown: 4, cooldownReductionPerUpgrade: 0.2, manaCost: 18, effects: ["1.5s Channel", "Guaranteed Crit"], upgradeEffects: ["+15 Damage", "-0.2s Channel", "+15 Damage", "+50% Crit Damage", "Ignore Armor"] },
  { id: "xbow_multi_bolt", name: "Multi-Bolt", description: "Fire 3 bolts in spread.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 7, cooldownReductionPerUpgrade: 0.35, manaCost: 35, effects: ["3 Bolts", "45° Spread"], upgradeEffects: ["+8 Damage", "+1 Bolt", "+8 Damage", "+1 Bolt", "All Pierce"] },
  { id: "xbow_siege", name: "Siege Bolt", description: "Massive single bolt.", icon: "/icons/icons/misc/Burns.png", slot: 3, maxUpgrades: 5, baseDamage: 75, damagePerUpgrade: 22, cooldown: 12, cooldownReductionPerUpgrade: 0.7, manaCost: 45, effects: ["2s Channel", "AoE on Impact 3m"], upgradeEffects: ["+22 Damage", "-0.3s Channel", "+22 Damage", "+1m AoE", "Knockdown"] },
  { id: "xbow_hook", name: "Retracting Hook", description: "Pull yourself to target.", icon: "/icons/icons/misc/CircleW.png", slot: 3, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 6, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 28, effects: ["Pull Self 15m", "Or Pull Enemy"], upgradeEffects: ["+6 Damage", "+3m Range", "+6 Damage", "No Cooldown on Miss", "Stun on Contact"] },
  { id: "xbow_trap", name: "Crossbow Trap", description: "Place a bolt trap.", icon: "/icons/icons/resources/Cog.png", slot: 3, maxUpgrades: 5, baseDamage: 40, damagePerUpgrade: 12, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 30, effects: ["Root 3s on Trigger"], upgradeEffects: ["+12 Damage", "+1s Root", "+12 Damage", "+1 Trap Active", "Poison on Trigger"] },
  { id: "xbow_hunters_mark", name: "Hunter's Mark", description: "Mark target for extra damage.", icon: "/icons/icons/misc/CircleE.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 22, effects: ["+25% Damage to Target", "10s"], upgradeEffects: ["+5% Damage", "+2s Duration", "+5% Damage", "Reveal Stealth", "Spreads on Kill"] },
  { id: "xbow_reload_mastery", name: "Reload Mastery", description: "Boost reload/attack speed.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 32, effects: ["+40% Attack Speed", "6s"], upgradeEffects: ["+5% Speed", "+1s Duration", "+5% Speed", "No Reload Delay", "Refresh on Kill"] },
  { id: "xbow_ballista", name: "Ballista Shot", description: "Ultimate: Huge siege bolt.", icon: "/icons/icons/misc/Chaos_2.png", slot: 5, maxUpgrades: 3, baseDamage: 180, damagePerUpgrade: 60, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 85, effects: ["Pierce All", "Range 60m", "2s Channel"], upgradeEffects: ["+60 Damage, -0.3s Channel", "+60 Damage, AoE on Impact", "+90 Damage, Stun All Pierced"] },
  { id: "xbow_chain_harpoon", name: "Chain Harpoon", description: "Ultimate: Pull & stun cluster of foes.", icon: "/icons/icons/misc/CircleL.png", slot: 5, maxUpgrades: 3, baseDamage: 60, damagePerUpgrade: 22, cooldown: 55, cooldownReductionPerUpgrade: 7, manaCost: 95, effects: ["Pull 5 Enemies", "Stun 2s"], upgradeEffects: ["+22 Damage, +1 Target", "+22 Damage, +0.5s Stun", "+35 Damage, +2 Targets"] },
];

const GUN_SKILLS: WeaponSkill[] = [
  { id: "gun_pistol_shot", name: "Pistol Shot", description: "Quick accurate firearm shot.", icon: "/icons/icons/weapons/Pistol_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 22, damagePerUpgrade: 7, cooldown: 0.9, cooldownReductionPerUpgrade: 0.05, manaCost: 8, effects: ["Range 22m"], upgradeEffects: ["+7 Damage", "-0.1s CD", "+7 Damage", "+5m Range", "+10% Crit"] },
  { id: "gun_triple_tap", name: "Triple-Tap", description: "Burst-fire 3 shots.", icon: "/icons/icons/misc/CircleE.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 15, damagePerUpgrade: 4, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 14, effects: ["3 Rapid Shots"], upgradeEffects: ["+4 per Shot", "+1 Shot", "+4 per Shot", "Final Shot Crits", "+2 Shots"] },
  { id: "gun_headshot", name: "Headshot", description: "Precise shot aimed at weak point.", icon: "/icons/icons/misc/Chaos_2.png", slot: 2, maxUpgrades: 5, baseDamage: 45, damagePerUpgrade: 14, cooldown: 3.5, cooldownReductionPerUpgrade: 0.2, manaCost: 22, effects: ["Guaranteed Crit", "Silence 1s"], upgradeEffects: ["+14 Damage", "+0.5s Silence", "+14 Damage", "+25% Crit Damage", "Ignore Armor"] },
  { id: "gun_fan_hammer", name: "Fanning the Hammer", description: "Unload all chambers rapidly.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 18, damagePerUpgrade: 5, cooldown: 7, cooldownReductionPerUpgrade: 0.35, manaCost: 35, effects: ["6 Shots", "Random Spread"], upgradeEffects: ["+5 per Shot", "+1 Shot", "+5 per Shot", "+1 Shot, Tighter Spread", "All Shots Crit"] },
  { id: "gun_grenade", name: "Grenade Toss", description: "Lob an explosive.", icon: "/icons/icons/misc/Burns.png", slot: 3, maxUpgrades: 5, baseDamage: 48, damagePerUpgrade: 15, cooldown: 10, cooldownReductionPerUpgrade: 0.6, manaCost: 40, effects: ["AoE 4m", "Burn 3s"], upgradeEffects: ["+15 Damage", "+1m AoE", "+15 Damage", "+2s Burn", "Cluster: 3 Smaller Grenades"] },
  { id: "gun_volley", name: "Flintlock Volley", description: "Line of shots from waist.", icon: "/icons/icons/misc/CircleF.png", slot: 3, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 9, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 32, effects: ["Line 20m", "5 Shots"], upgradeEffects: ["+9 per Shot", "+1 Shot", "+9 per Shot", "+5m Range", "Penetrate Line"] },
  { id: "gun_gunslinger", name: "Gunslinger Stance", description: "Boost draw speed and crit.", icon: "/icons/icons/misc/Core.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.2, manaCost: 30, effects: ["+30% Attack Speed", "+15% Crit", "6s"], upgradeEffects: ["+5% Speed", "+5% Crit", "+5% Speed", "+1s Duration", "CD Resets on Crit Kill"] },
  { id: "gun_reload_dash", name: "Reload Dash", description: "Roll while reloading ammunition.", icon: "/icons/icons/misc/CircleW.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 10, cooldownReductionPerUpgrade: 0.7, manaCost: 18, effects: ["Dash 6m", "Instant Reload", "Invincible 0.3s"], upgradeEffects: ["+2m Dash", "+0.1s i-Frames", "+2m Dash", "+20% Next Shot Damage", "2 Charges"] },
  { id: "gun_cover_fire", name: "Cover Fire", description: "Suppress enemies near target.", icon: "/icons/icons/misc/CircleN.png", slot: 4, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 6, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 30, effects: ["Channel 4s", "AoE Slow 30%"], upgradeEffects: ["+6 DPS", "+10% Slow", "+6 DPS", "+1s Channel", "Root Chance 20%"] },
  { id: "gun_high_noon", name: "High Noon", description: "Ultimate: Instant-kill weak foes at range.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 200, damagePerUpgrade: 70, cooldown: 45, cooldownReductionPerUpgrade: 5, manaCost: 85, effects: ["Single Target", "Range 40m", "Execute Below 30%"], upgradeEffects: ["+70 Damage, Threshold 35%", "+70 Damage, Chain to 2", "+100 Damage, No Range Limit"] },
  { id: "gun_gatling", name: "Gatling Frenzy", description: "Ultimate: Non-stop firing for 6s.", icon: "/icons/icons/misc/Chaos.png", slot: 5, maxUpgrades: 3, baseDamage: 15, damagePerUpgrade: 6, cooldown: 55, cooldownReductionPerUpgrade: 7, manaCost: 100, effects: ["Channel 6s", "10 Shots/sec"], upgradeEffects: ["+6 per Shot, +1s Duration", "+6 per Shot, Cannot Move Penalty Gone", "+10 per Shot, AoE Radius"] },
];

const LANCE_SKILLS: WeaponSkill[] = [
  { id: "lance_thrust", name: "Lance Thrust", description: "Long-reach thrust.", icon: "/icons/icons/weapons/Lance_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 32, damagePerUpgrade: 10, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 14, effects: ["Range 4m"], upgradeEffects: ["+10 Damage", "+1m Range", "+10 Damage", "-0.1s CD", "Bleed 3s"] },
  { id: "lance_skewer", name: "Skewer Strike", description: "Pierce multiple foes in line.", icon: "/icons/icons/weapons/Lance_05.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 38, damagePerUpgrade: 12, cooldown: 3, cooldownReductionPerUpgrade: 0.15, manaCost: 20, effects: ["Pierce 3"], upgradeEffects: ["+12 Damage", "+1 Pierce", "+12 Damage", "+25% Armor Pen", "Bleed Stack"] },
  { id: "lance_knockdown", name: "Knockdown Jab", description: "Sweeping jab that floors foes.", icon: "/icons/icons/misc/CircleW.png", slot: 2, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 4, cooldownReductionPerUpgrade: 0.25, manaCost: 22, effects: ["Knockdown 1s"], upgradeEffects: ["+8 Damage", "+0.3s Knockdown", "+8 Damage", "AoE Sweep 2m", "Stun Armored Targets"] },
  { id: "lance_joust", name: "Jousting Charge", description: "Charge forward at high speed.", icon: "/icons/icons/misc/Chaos.png", slot: 2, maxUpgrades: 5, baseDamage: 48, damagePerUpgrade: 15, cooldown: 9, cooldownReductionPerUpgrade: 0.5, manaCost: 35, effects: ["Dash 12m", "Damage Scales with Distance"], upgradeEffects: ["+15 Damage", "+2m Dash", "+15 Damage", "Pierce All in Path", "Knockdown on Arrival"] },
  { id: "lance_pike_sweep", name: "Pike Sweep", description: "Sweep lance in wide arc.", icon: "/icons/icons/misc/CircleN.png", slot: 3, maxUpgrades: 5, baseDamage: 36, damagePerUpgrade: 11, cooldown: 7, cooldownReductionPerUpgrade: 0.4, manaCost: 30, effects: ["180° Cone 5m"], upgradeEffects: ["+11 Damage", "+1m Cone", "+11 Damage", "+Arc to 270°", "Knockback"] },
  { id: "lance_impale_throw", name: "Impale Throw", description: "Throw lance, pin target to wall.", icon: "/icons/icons/misc/Burns.png", slot: 3, maxUpgrades: 5, baseDamage: 55, damagePerUpgrade: 16, cooldown: 11, cooldownReductionPerUpgrade: 0.6, manaCost: 40, effects: ["Range 15m", "Root 2s"], upgradeEffects: ["+16 Damage", "+1s Root", "+16 Damage", "+5m Range", "Returns to Hand"] },
  { id: "lance_heroic_stand", name: "Heroic Stand", description: "Brace to counter charges.", icon: "/icons/icons/weapons/shield_05.png", slot: 3, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 16, cooldownReductionPerUpgrade: 1, manaCost: 35, effects: ["Counter Charge", "+50% Counter Damage"], upgradeEffects: ["+10 Counter", "+25% Counter Damage", "+10 Counter", "Reflect Projectiles", "AoE Counter"] },
  { id: "lance_warhorse", name: "Warhorse Stance", description: "Mount stance: boost charge damage.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.4, manaCost: 40, effects: ["+40% Charge Damage", "+20% Move Speed", "10s"], upgradeEffects: ["+5% Damage", "+5% Move Speed", "+5% Damage", "+2s Duration", "Trample Enemies"] },
  { id: "lance_guards_ward", name: "Guard's Ward", description: "Protect an ally with your lance.", icon: "/icons/icons/misc/CircleE.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 22, cooldownReductionPerUpgrade: 1.6, manaCost: 38, effects: ["Absorb 150 for Ally", "8s"], upgradeEffects: ["+30 Absorb", "+1s Duration", "+30 Absorb", "Also Absorbs Self", "Reflect Damage"] },
  { id: "lance_tournament", name: "Tournament Champion", description: "Ultimate: Grand sweeping charge.", icon: "/icons/icons/misc/Chaos_2.png", slot: 5, maxUpgrades: 3, baseDamage: 140, damagePerUpgrade: 48, cooldown: 52, cooldownReductionPerUpgrade: 6, manaCost: 95, effects: ["Dash 20m", "Pierce All", "Immune to CC"], upgradeEffects: ["+48 Damage, +5m Dash", "+48 Damage, Knockdown All", "+70 Damage, Chain to 2nd Target"] },
  { id: "lance_legendary_charge", name: "Legendary Charge", description: "Ultimate: Focused charge that obliterates.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 200, damagePerUpgrade: 65, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 110, effects: ["Single Target", "Ignore All Defense"], upgradeEffects: ["+65 Damage, +5m Reach", "+65 Damage, Reset on Kill", "+100 Damage, Execute <25%"] },
];

const TOME_SKILLS: WeaponSkill[] = [
  { id: "tome_invoke", name: "Invoke Page", description: "Fling ancient inked page that burns.", icon: "/icons/icons/misc/CircleF.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 24, damagePerUpgrade: 8, cooldown: 1.5, cooldownReductionPerUpgrade: 0.08, manaCost: 14, effects: ["Magic", "Burn 3s"], upgradeEffects: ["+8 Damage", "+1s Burn", "+8 Damage", "Spread on Death", "+10% Spell Damage to Burning"] },
  { id: "tome_arcane_script", name: "Arcane Script", description: "Inscribe damaging runes in air.", icon: "/icons/icons/misc/CircleE.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 28, damagePerUpgrade: 9, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 16, effects: ["AoE 2m", "Linger 2s"], upgradeEffects: ["+9 Damage", "+1s Linger", "+9 Damage", "+0.5m AoE", "Pulls Foes Center"] },
  { id: "tome_scholar", name: "Scholar's Insight", description: "Reveal weak point for bonus damage.", icon: "/icons/icons/misc/CircleN.png", slot: 2, maxUpgrades: 5, baseDamage: 14, damagePerUpgrade: 4, cooldown: 3, cooldownReductionPerUpgrade: 0.15, manaCost: 20, effects: ["+30% Magic Damage vs Target 5s"], upgradeEffects: ["+5% Damage Amp", "+1s Duration", "+5% Damage Amp", "Reveal Stealth", "Spread on Kill"] },
  { id: "tome_curse_weaving", name: "Curse Weaving", description: "Multi-debuff curse.", icon: "/icons/icons/potions/P_Purple03.png", slot: 2, maxUpgrades: 5, baseDamage: 30, damagePerUpgrade: 10, cooldown: 8, cooldownReductionPerUpgrade: 0.4, manaCost: 35, effects: ["Slow 25%", "-15% Damage Dealt", "6s"], upgradeEffects: ["+10 Damage", "+5% Slow", "+10 Damage", "+5% Damage Reduction", "Spread on Death"] },
  { id: "tome_burden", name: "Wisdom's Burden", description: "Drain target intellect to yourself.", icon: "/icons/icons/misc/AquaCore.png", slot: 3, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 6, cooldown: 10, cooldownReductionPerUpgrade: 0.5, manaCost: 30, effects: ["Steal 20% INT", "8s"], upgradeEffects: ["+6 Damage", "+5% Steal", "+6 Damage", "+2s Duration", "Affects Spells Too"] },
  { id: "tome_forbidden_chant", name: "Forbidden Chant", description: "Dark incantation mass-damages.", icon: "/icons/icons/misc/Chaos_2.png", slot: 3, maxUpgrades: 5, baseDamage: 42, damagePerUpgrade: 13, cooldown: 9, cooldownReductionPerUpgrade: 0.5, manaCost: 40, effects: ["Channel 2s", "AoE 6m"], upgradeEffects: ["+13 Damage", "-0.3s Channel", "+13 Damage", "+1m AoE", "Silence Targets"] },
  { id: "tome_knowledge_buff", name: "Knowledge Buff", description: "Boost INT and spell damage.", icon: "/icons/icons/misc/Core.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 20, cooldownReductionPerUpgrade: 1.4, manaCost: 35, effects: ["+25% Spell Damage", "+20% Mana Regen", "10s"], upgradeEffects: ["+5% Spell Damage", "+1s Duration", "+5% Spell Damage", "Includes Allies", "-30% Cast Times"] },
  { id: "tome_runic_ward", name: "Runic Ward", description: "Inscribe protective rune.", icon: "/icons/icons/weapons/shield_05.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 16, cooldownReductionPerUpgrade: 1, manaCost: 32, effects: ["Absorb 220 Magic Damage", "6s"], upgradeEffects: ["+50 Absorb", "+1s Duration", "+50 Absorb", "Reflect 15%", "Explode on Break"] },
  { id: "tome_meditation", name: "Meditation", description: "Restore mana quickly.", icon: "/icons/icons/misc/AquaCircle.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 2, manaCost: 0, effects: ["Restore 40% Mana", "+20% Cast Speed 5s"], upgradeEffects: ["+10% Mana", "+5% Cast Speed", "+10% Mana", "+2s Duration", "Instant Next 3 Spells"] },
  { id: "tome_forbidden_chapter", name: "Forbidden Chapter", description: "Ultimate: Read the unspeakable.", icon: "/icons/icons/misc/Chaos.png", slot: 5, maxUpgrades: 3, baseDamage: 110, damagePerUpgrade: 40, cooldown: 50, cooldownReductionPerUpgrade: 6, manaCost: 95, effects: ["AoE 10m", "Silence All 3s"], upgradeEffects: ["+40 Damage, +1s Silence", "+40 Damage, +2m AoE", "+60 Damage, Applies All Debuffs"] },
  { id: "tome_grand_invocation", name: "Grand Invocation", description: "Ultimate: Summon ancient power.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 110, effects: ["+80% Spell Damage", "No Mana Cost", "10s"], upgradeEffects: ["+2s Duration, +10% Damage", "+3s Duration, +20% Damage", "+5s Duration, Echo All Spells"] },
];

const SHIELD_SKILLS: WeaponSkill[] = [
  { id: "shield_bash", name: "Shield Bash", description: "Slam target with shield.", icon: "/icons/icons/weapons/shield_01.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 20, damagePerUpgrade: 7, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 12, effects: ["Stun 0.5s"], upgradeEffects: ["+7 Damage", "+0.2s Stun", "+7 Damage", "Interrupts Cast", "Knockback 3m"] },
  { id: "shield_block_counter", name: "Block Counter", description: "Block & riposte next attack.", icon: "/icons/icons/weapons/shield_05.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 25, damagePerUpgrade: 8, cooldown: 4, cooldownReductionPerUpgrade: 0.2, manaCost: 16, effects: ["Block + Counter 3s Window"], upgradeEffects: ["+8 Damage", "+1s Window", "+8 Damage", "Stun on Counter", "Counter AoE"] },
  { id: "shield_taunt", name: "Taunt", description: "Force enemy to attack you.", icon: "/icons/icons/misc/CircleN.png", slot: 2, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 6, cooldownReductionPerUpgrade: 0.3, manaCost: 10, effects: ["Taunt 4s", "Range 15m"], upgradeEffects: ["+1s Taunt", "+5m Range", "+1s Taunt", "AoE Taunt 5m", "+30% Threat"] },
  { id: "shield_slam", name: "Shield Slam", description: "Slam shield into ground AoE.", icon: "/icons/icons/misc/CircleF.png", slot: 2, maxUpgrades: 5, baseDamage: 35, damagePerUpgrade: 11, cooldown: 8, cooldownReductionPerUpgrade: 0.5, manaCost: 30, effects: ["AoE 4m", "Knockdown 1s"], upgradeEffects: ["+11 Damage", "+1m AoE", "+11 Damage", "+0.5s Knockdown", "Stun Armored Targets 1s"] },
  { id: "shield_sentinel", name: "Sentinel Stance", description: "Group buff: allies take reduced damage.", icon: "/icons/icons/misc/Core.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 14, cooldownReductionPerUpgrade: 1, manaCost: 40, effects: ["-25% Damage to Allies 10m", "6s"], upgradeEffects: ["+5% Reduction", "+1s Duration", "+5% Reduction", "+2m Range", "Include Self"] },
  { id: "shield_spell_reflect", name: "Spell Reflection", description: "Reflect next incoming spell.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 12, cooldownReductionPerUpgrade: 0.8, manaCost: 25, effects: ["Reflect Next Spell", "5s Window"], upgradeEffects: ["+1s Window", "Reflect 2 Spells", "+1s Window", "+20% Reflected Damage", "Reflects AoE Spells"] },
  { id: "shield_guardian_aura", name: "Guardian Aura", description: "Passive-style aura heals allies.", icon: "/icons/icons/potions/P_Red05.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 18, cooldownReductionPerUpgrade: 1.3, manaCost: 35, effects: ["HoT 5 HP/s to Allies 10m", "8s"], upgradeEffects: ["+2 HP/s", "+1s Duration", "+2 HP/s", "+3m Range", "Cleanse Debuffs"] },
  { id: "shield_indomitable", name: "Indomitable", description: "Immune to crowd control briefly.", icon: "/icons/icons/misc/Core.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 25, cooldownReductionPerUpgrade: 1.8, manaCost: 40, effects: ["Immune to CC 4s"], upgradeEffects: ["+1s Duration", "+20% Defense", "+1s Duration", "Cleanse on Activate", "+2s Duration"] },
  { id: "shield_rally", name: "Rally", description: "Heal all nearby allies.", icon: "/icons/icons/misc/CircleN.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 30, cooldownReductionPerUpgrade: 2, manaCost: 50, effects: ["Heal Allies 20%", "10m Range"], upgradeEffects: ["+5% Heal", "+3m Range", "+5% Heal", "Cleanse Debuffs", "+Shield Absorb 10%"] },
  { id: "shield_bulwark", name: "Bulwark of Ages", description: "Ultimate: Massive shield wall.", icon: "/icons/icons/misc/Chaos_2.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 60, cooldownReductionPerUpgrade: 8, manaCost: 100, effects: ["Block 90% Damage 8s", "Self + Allies 10m"], upgradeEffects: ["+1s Duration", "Reflect 30%", "+2s Duration, Reflect 50%", "+3s Duration, Also Heal"] },
  { id: "shield_unbreakable", name: "Unbreakable", description: "Ultimate: Cannot be reduced below 1 HP.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 55, cooldownReductionPerUpgrade: 7, manaCost: 90, effects: ["Immune to Death 6s"], upgradeEffects: ["+2s Duration, Heal 30% After", "+2s Duration, Explode on End", "+4s Duration, Heal 60% After"] },
];

const OFF_HAND_RELIC_SKILLS: WeaponSkill[] = [
  { id: "relic_invoke", name: "Invoke Relic", description: "Activate relic's latent power.", icon: "/icons/icons/misc/CircleE.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 22, damagePerUpgrade: 7, cooldown: 2, cooldownReductionPerUpgrade: 0.1, manaCost: 12, effects: ["Holy Damage"], upgradeEffects: ["+7 Damage", "-0.1s CD", "+7 Damage", "Chance to Reset CD", "Heal 5% on Hit"] },
  { id: "relic_blessing", name: "Blessing", description: "Short-cd buff on self or ally.", icon: "/icons/icons/misc/Core.png", slot: 1, isStandardAttack: true, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 3, cooldownReductionPerUpgrade: 0.15, manaCost: 10, effects: ["+10% Damage 4s"], upgradeEffects: ["+2% Damage", "+1s Duration", "+2% Damage", "Targets Up to 3", "+5% More to Critical Hits"] },
  { id: "relic_minor_heal", name: "Minor Heal", description: "Quick low-mana heal.", icon: "/icons/icons/potions/P_Red05.png", slot: 2, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 2.5, cooldownReductionPerUpgrade: 0.15, manaCost: 14, effects: ["Heal 15% HP"], upgradeEffects: ["+3% Heal", "-0.2s CD", "+3% Heal", "Heal 1 Ally", "Remove 1 Debuff"] },
  { id: "relic_pulse", name: "Relic Pulse", description: "Short burst AoE around you.", icon: "/icons/icons/misc/AquaCircle.png", slot: 2, maxUpgrades: 5, baseDamage: 32, damagePerUpgrade: 10, cooldown: 7, cooldownReductionPerUpgrade: 0.4, manaCost: 28, effects: ["AoE 4m"], upgradeEffects: ["+10 Damage", "+1m AoE", "+10 Damage", "Heal Allies Hit", "Silence Enemies 1s"] },
  { id: "relic_soul_link", name: "Soul Link", description: "Share 30% damage with ally.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 10, cooldownReductionPerUpgrade: 0.5, manaCost: 30, effects: ["Redirect 30% Damage 8s"], upgradeEffects: ["+5% Redirect", "+1s Duration", "+5% Redirect", "Heal from Redirect", "Link Multiple Allies"] },
  { id: "relic_totem", name: "Totem Drop", description: "Place a buff totem on ground.", icon: "/icons/icons/resources/Cog.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 12, cooldownReductionPerUpgrade: 0.7, manaCost: 32, effects: ["Totem +15% Damage", "8s", "5m Aura"], upgradeEffects: ["+3% Buff", "+1s Duration", "+3% Buff", "+1m Aura", "Totem Attacks Nearby Enemies"] },
  { id: "relic_aura_might", name: "Aura of Might", description: "Persistent party-wide damage buff.", icon: "/icons/icons/misc/Core.png", slot: 3, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 15, cooldownReductionPerUpgrade: 1, manaCost: 35, effects: ["+20% Damage Aura", "10m", "Persistent"], upgradeEffects: ["+3% Aura", "+2m Range", "+3% Aura", "Include Self Crit +10%", "Refresh on Kill"] },
  { id: "relic_sanctuary", name: "Sanctuary", description: "Zone where allies can't die.", icon: "/icons/icons/misc/CircleN.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 30, cooldownReductionPerUpgrade: 2, manaCost: 50, effects: ["5m Zone", "Cannot Die 3s"], upgradeEffects: ["+1s Duration", "+1m Zone", "+1s Duration", "Heal Allies Inside", "Silence Enemies Inside"] },
  { id: "relic_time_echo", name: "Time Echo", description: "Rewind 2s — return to past HP.", icon: "/icons/icons/misc/ChaosCircle.png", slot: 4, maxUpgrades: 5, baseDamage: 0, damagePerUpgrade: 0, cooldown: 40, cooldownReductionPerUpgrade: 3, manaCost: 60, effects: ["Rewind 2s"], upgradeEffects: ["Rewind 3s", "-5s CD", "Rewind 4s", "Apply to Ally", "Rewind 6s"] },
  { id: "relic_avatar", name: "Avatar of Relic", description: "Ultimate: Channel full relic power.", icon: "/icons/icons/misc/Chaos_2.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 55, cooldownReductionPerUpgrade: 7, manaCost: 100, effects: ["+60% All Stats", "8s", "No Cooldowns"], upgradeEffects: ["+2s Duration, +10% Stats", "+2s Duration, Cleanse Self", "+4s Duration, +20% Stats"] },
  { id: "relic_grand_sanctuary", name: "Grand Sanctuary", description: "Ultimate: Divine zone heals and wards.", icon: "/icons/icons/misc/Core.png", slot: 5, maxUpgrades: 3, baseDamage: 0, damagePerUpgrade: 0, cooldown: 65, cooldownReductionPerUpgrade: 8, manaCost: 110, effects: ["10m Zone", "Heal 8% HP/s", "Immune to CC Inside", "10s"], upgradeEffects: ["+2% Heal, +2m Zone", "+2% Heal, +2s Duration", "+4% Heal, Reflect All Damage Inside"] },
];

export const WEAPON_SKILL_TREES: Record<string, WeaponSkillTree> = {
  SWORD:          { weaponType: "SWORD",          skills: SWORD_SKILLS },
  TWO_H_SWORD:    { weaponType: "TWO_H_SWORD",    skills: TWO_H_SWORD_SKILLS },
  AXE:            { weaponType: "AXE",            skills: AXE_SKILLS },
  TWO_H_AXE:      { weaponType: "TWO_H_AXE",      skills: TWO_H_AXE_SKILLS },
  BOW:            { weaponType: "BOW",            skills: BOW_SKILLS },
  CROSSBOW:       { weaponType: "CROSSBOW",       skills: CROSSBOW_SKILLS },
  GUN:            { weaponType: "GUN",            skills: GUN_SKILLS },
  STAFF:          { weaponType: "STAFF",          skills: STAFF_SKILLS },
  DAGGER:         { weaponType: "DAGGER",         skills: DAGGER_SKILLS },
  MACE:           { weaponType: "MACE",           skills: MACE_SKILLS },
  HAMMER:         { weaponType: "HAMMER",         skills: HAMMER_SKILLS },
  SPEAR:          { weaponType: "SPEAR",          skills: SPEAR_SKILLS },
  LANCE:          { weaponType: "LANCE",          skills: LANCE_SKILLS },
  WAND:           { weaponType: "WAND",           skills: WAND_SKILLS },
  TOME:           { weaponType: "TOME",           skills: TOME_SKILLS },
  SCYTHE:         { weaponType: "SCYTHE",         skills: SCYTHE_SKILLS },
  SHIELD:         { weaponType: "SHIELD",         skills: SHIELD_SKILLS },
  OFF_HAND_RELIC: { weaponType: "OFF_HAND_RELIC", skills: OFF_HAND_RELIC_SKILLS },
};

export function getSkillsForSlot(weaponType: string, slot: 1 | 2 | 3 | 4 | 5): WeaponSkill[] {
  const tree = WEAPON_SKILL_TREES[weaponType];
  if (!tree) return [];
  return tree.skills.filter(s => s.slot === slot);
}

/**
 * Max upgrade count per slot tier:
 *   slot 1 standards — 5 upgrades (still ranked for scaling)
 *   slots 2–4 actives — 5 upgrades
 *   slot 5 ultimates  — 3 upgrades (fewer, higher impact per rank)
 */
export function getMaxUpgradesForSlot(slot: 1 | 2 | 3 | 4 | 5): number {
  return slot === 5 ? 3 : 5;
}

/** Return the two standard-attack options for a weapon (slot 1). */
export function getStandardAttackOptions(weaponType: string): WeaponSkill[] {
  return getSkillsForSlot(weaponType, 1).filter(s => s.isStandardAttack === true);
}

/** Validate that the chosen standard-attack is a legal pick for this weapon. */
export function isValidStandardAttack(weaponType: string, skillId: string): boolean {
  return getStandardAttackOptions(weaponType).some(s => s.id === skillId);
}

export function calculateSkillDamage(skill: WeaponSkill, upgradeLevel: number): number {
  return skill.baseDamage + (skill.damagePerUpgrade * upgradeLevel);
}

export function calculateSkillCooldown(skill: WeaponSkill, upgradeLevel: number): number {
  return Math.max(0.5, skill.cooldown - (skill.cooldownReductionPerUpgrade * upgradeLevel));
}

export function getUpgradeEffect(skill: WeaponSkill, level: number): string {
  if (level < 1 || level > skill.upgradeEffects.length) return "";
  return skill.upgradeEffects[level - 1];
}
