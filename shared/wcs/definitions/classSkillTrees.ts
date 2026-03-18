/**
 * Class Skill Trees — Single Source of Truth
 *
 * Used by Warlord Crafting Suite, GRUDA Wars, and all future Grudge games.
 * Each class has a special ability and 6 tiers (levels 0, 1, 5, 10, 15, 20).
 * Players pick ONE skill per tier — this choice is persisted to the DB.
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface ClassSkillChoice {
  id: string;
  name: string;
  description: string;
  icon: string;
  effectType: "passive" | "active" | "ultimate";
  effects: string[];
  cooldown?: number;
  manaCost?: number;
  staminaCost?: number;
}

export interface ClassSkillTier {
  level: number;
  tierName: string;
  description: string;
  choices: ClassSkillChoice[];
}

export interface ClassSkillTree {
  classId: string;
  className: string;
  classIcon: string;
  color: string;
  specialAbility: ClassSkillChoice;
  tiers: ClassSkillTier[];
}

// ============================================================================
// CLASS SKILL TREES
// ============================================================================

export const CLASS_SKILL_TREES: Record<string, ClassSkillTree> = {

  // WARRIOR
  warrior: {
    classId: "warrior", className: "Warrior", classIcon: "/icons/entities/Human Warrior.png", color: "#ef4444",
    specialAbility: { id: "warrior_invincibility", name: "Invincibility", description: "Become completely immune to all damage. Break free from CC.", icon: "/icons/misc/Glow.png", effectType: "ultimate", effects: ["1-4s immunity", "Duration scales with level", "Break free from CC"], cooldown: 60, staminaCost: 30 },
    tiers: [
      { level: 0, tierName: "Starting Ability", description: "Innate combat training", choices: [
        { id: "warrior_0_strike", name: "Power Strike", description: "Heavy melee attack with knockback.", icon: "/icons/weapons/Sword_01.png", effectType: "active", effects: ["+50% weapon damage", "Can knock back enemies"], cooldown: 6, staminaCost: 15 },
      ]},
      { level: 1, tierName: "Combat Basics", description: "Choose your foundational combat style", choices: [
        { id: "warrior_1_taunt", name: "Taunt", description: "Force nearby enemies to attack you for 3s.", icon: "/icons/misc/Burns.png", effectType: "active", effects: ["AoE threat generation", "3s forced targeting", "+20% damage reduction"], cooldown: 8, staminaCost: 10 },
        { id: "warrior_1_quickstrike", name: "Quick Strike", description: "Fast attack combo with speed bonus.", icon: "/icons/misc/Slash_07.png", effectType: "active", effects: ["3 rapid strikes", "+15% attack speed for 4s"], cooldown: 4, staminaCost: 8 },
      ]},
      { level: 5, tierName: "Specialization", description: "Define your battlefield role", choices: [
        { id: "warrior_5_damage_surge", name: "Damage Surge", description: "Empower attacks with raw fury.", icon: "/icons/misc/Fires.png", effectType: "active", effects: ["+40% damage for 6s", "+25% crit chance", "Attacks cause bleed"], cooldown: 20, staminaCost: 25 },
        { id: "warrior_5_guardian_aura", name: "Guardian's Aura", description: "Protective field for nearby allies.", icon: "/icons/armor/Shield_01.png", effectType: "active", effects: ["+30% defense for allies within 5m", "8s duration", "You take 15% of ally damage"], cooldown: 25, staminaCost: 20 },
      ]},
      { level: 10, tierName: "Advanced Techniques", description: "Master powerful combat abilities", choices: [
        { id: "warrior_10_whirlwind", name: "Whirlwind", description: "Spin striking all nearby foes.", icon: "/icons/misc/CircleF.png", effectType: "active", effects: ["360° AoE damage", "3s channel", "+10% damage per enemy hit"], cooldown: 12, staminaCost: 35 },
        { id: "warrior_10_shield_wall", name: "Shield Wall", description: "Impenetrable shield defense.", icon: "/icons/weapons/shield_01.png", effectType: "active", effects: ["Block 90% damage from front", "Cannot attack", "Reflects 25% damage"], cooldown: 18, staminaCost: 30 },
        { id: "warrior_10_execute", name: "Execute", description: "Devastating finisher against wounded foes.", icon: "/icons/misc/Chaos_2.png", effectType: "active", effects: ["3x damage below 30% HP", "Instant kill below 10% HP", "Reset cooldown on kill"], cooldown: 15, staminaCost: 40 },
      ]},
      { level: 15, tierName: "Elite Training", description: "Devastating combat mastery", choices: [
        { id: "warrior_15_berserker", name: "Berserker Rage", description: "Unstoppable fury state.", icon: "/icons/misc/Firestar.png", effectType: "active", effects: ["+60% damage, +30% attack speed", "-25% defense", "Cannot be stunned", "8s duration"], cooldown: 45, staminaCost: 50 },
        { id: "warrior_15_paladin", name: "Divine Blessing", description: "Holy power to protect and heal.", icon: "/icons/misc/Lights.png", effectType: "active", effects: ["Heal 30% HP to self and allies", "+50% holy damage for 10s", "Purge all debuffs"], cooldown: 40, manaCost: 35 },
      ]},
      { level: 20, tierName: "Ultimate Mastery", description: "Pinnacle combat ability", choices: [
        { id: "warrior_20_avatar", name: "Avatar of War", description: "Transform into an unstoppable avatar.", icon: "/icons/entities/heavy barb merc.PNG", effectType: "ultimate", effects: ["+100% all stats for 10s", "Immune to death", "All cooldowns reset"], cooldown: 120, staminaCost: 100 },
        { id: "warrior_20_champion", name: "Champion's Stand", description: "Plant banner and inspire allies.", icon: "/icons/misc/Flag Icon.png", effectType: "ultimate", effects: ["Allies gain +50% damage/defense", "Enemies slowed 50%", "15s duration"], cooldown: 90, staminaCost: 80 },
      ]},
    ],
  },

  // MAGE PRIEST
  mage: {
    classId: "mage", className: "Mage Priest", classIcon: "/icons/entities/elf mage.png", color: "#8b5cf6",
    specialAbility: { id: "mage_mana_shield", name: "Arcane Affinity", description: "Passive mana shield. Activate for massive spell power boost.", icon: "/icons/misc/AquaCircle.png", effectType: "passive", effects: ["Shield = 50% current mana", "Active: +75% spell damage 15s", "Charges over 5s without damage"], cooldown: 45, manaCost: 0 },
    tiers: [
      { level: 0, tierName: "Starting Ability", description: "Innate magical talent", choices: [
        { id: "mage_0_missile", name: "Magic Missile", description: "Seeking missiles of arcane energy.", icon: "/icons/misc/Core.png", effectType: "active", effects: ["5 missiles", "Cannot miss", "15 arcane damage each"], cooldown: 3, manaCost: 15 },
      ]},
      { level: 1, tierName: "Basic Arts", description: "Choose your foundational magical path", choices: [
        { id: "mage_1_fireball", name: "Fireball", description: "Exploding ball of fire.", icon: "/icons/misc/Fires.png", effectType: "active", effects: ["AoE fire damage", "Burns 3s", "+50% damage to frozen targets"], cooldown: 6, manaCost: 20 },
        { id: "mage_1_heal", name: "Healing Light", description: "Divine energy restores health.", icon: "/icons/misc/Lights.png", effectType: "active", effects: ["Heal 25% max HP", "Remove 1 debuff", "1.5s cast time"], cooldown: 8, manaCost: 25 },
      ]},
      { level: 5, tierName: "Specialization", description: "Define your magical identity", choices: [
        { id: "mage_5_meteor", name: "Meteor Strike", description: "Devastating meteor from the sky.", icon: "/icons/misc/Firestar.png", effectType: "active", effects: ["Massive AoE damage", "Stuns 2s", "2s delay"], cooldown: 20, manaCost: 45 },
        { id: "mage_5_greater_heal", name: "Greater Heal", description: "Powerful single-target heal.", icon: "/icons/misc/Life.png", effectType: "active", effects: ["Heal 60% max HP", "Absorption shield", "2s cast time"], cooldown: 15, manaCost: 40 },
      ]},
      { level: 10, tierName: "Advanced Arts", description: "Complex magical techniques", choices: [
        { id: "mage_10_blizzard", name: "Blizzard", description: "Freezing storm in target area.", icon: "/icons/misc/Flow.png", effectType: "active", effects: ["AoE ice damage 6s", "Slows 50%", "Can freeze solid"], cooldown: 25, manaCost: 50 },
        { id: "mage_10_chain_heal", name: "Chain Heal", description: "Healing jumps between allies.", icon: "/icons/misc/AquaCore.png", effectType: "active", effects: ["Heals up to 5 targets", "80% of previous per jump", "Smart targeting"], cooldown: 12, manaCost: 35 },
        { id: "mage_10_blink", name: "Blink", description: "Instant teleport.", icon: "/icons/misc/Effect.png", effectType: "active", effects: ["15m teleport", "Removes movement impairments", "Brief invulnerability"], cooldown: 15, manaCost: 25 },
      ]},
      { level: 15, tierName: "Elite Magic", description: "Devastating arcane power", choices: [
        { id: "mage_15_armageddon", name: "Armageddon", description: "Rain fire and destruction.", icon: "/icons/misc/Firestar.png", effectType: "active", effects: ["12m AoE", "8s duration", "Random meteor impacts"], cooldown: 60, manaCost: 80 },
        { id: "mage_15_divine_intervention", name: "Divine Intervention", description: "Save an ally from certain death.", icon: "/icons/misc/Glow.png", effectType: "active", effects: ["Target invulnerable 3s", "Heals to full HP", "Purges all debuffs"], cooldown: 90, manaCost: 100 },
      ]},
      { level: 20, tierName: "Ultimate Mastery", description: "Pinnacle magical ability", choices: [
        { id: "mage_20_arcane_form", name: "Arcane Ascension", description: "Become pure arcane energy.", icon: "/icons/misc/Glow.png", effectType: "ultimate", effects: ["+100% spell damage", "Spells cost no mana", "Immune to ground effects", "12s duration"], cooldown: 120, manaCost: 0 },
        { id: "mage_20_mass_resurrect", name: "Mass Resurrection", description: "Revive all fallen allies.", icon: "/icons/misc/Life.png", effectType: "ultimate", effects: ["Resurrect all dead allies", "Full HP restoration", "+50% damage 30s"], cooldown: 180, manaCost: 150 },
      ]},
    ],
  },

  // RANGER SCOUT
  ranger: {
    classId: "ranger", className: "Ranger Scout", classIcon: "/icons/entities/elf archer.png", color: "#22c55e",
    specialAbility: { id: "ranger_precision", name: "Hunter's Instinct", description: "Passive accuracy and crit. Enhanced tracking.", icon: "/icons/weapons/Bow_01.png", effectType: "passive", effects: ["+15% accuracy", "+10% crit chance", "+25% move speed in nature", "Track enemies"], cooldown: 0 },
    tiers: [
      { level: 0, tierName: "Starting Ability", description: "Natural hunting instincts", choices: [
        { id: "ranger_0_powershot", name: "Power Shot", description: "Charged arrow with massive damage.", icon: "/icons/weapons/Bow_02.png", effectType: "active", effects: ["+100% weapon damage", "Pierces enemies", "1s charge"], cooldown: 8, staminaCost: 20 },
      ]},
      { level: 1, tierName: "Basic Training", description: "Choose your combat approach", choices: [
        { id: "ranger_1_multishot", name: "Multi-Shot", description: "Volley of arrows at multiple targets.", icon: "/icons/weapons/Crossbow_01.png", effectType: "active", effects: ["5 arrows in cone", "60% damage each"], cooldown: 6, staminaCost: 15 },
        { id: "ranger_1_stealth_strike", name: "Stealth Strike", description: "Attack from shadows with lethal precision.", icon: "/icons/misc/ChaosCircle.png", effectType: "active", effects: ["+200% damage from stealth", "Guaranteed crit"], cooldown: 4, staminaCost: 12 },
      ]},
      { level: 5, tierName: "Specialization", description: "Ranged mastery or melee assassin?", choices: [
        { id: "ranger_5_explosive_arrow", name: "Explosive Arrow", description: "Arrow explodes on impact.", icon: "/icons/weapons/Crossbow_03.png", effectType: "active", effects: ["4m AoE", "Knockback", "Burns 4s"], cooldown: 12, staminaCost: 25 },
        { id: "ranger_5_shadow_step", name: "Shadow Step", description: "Teleport behind target.", icon: "/icons/misc/Chaos.png", effectType: "active", effects: ["15m teleport", "2s stealth", "+50% next attack"], cooldown: 15, staminaCost: 20 },
      ]},
      { level: 10, tierName: "Advanced Techniques", description: "Master your chosen path", choices: [
        { id: "ranger_10_arrow_volley", name: "Arrow Volley", description: "Rain arrows on target area.", icon: "/icons/misc/Flow.png", effectType: "active", effects: ["8m AoE", "5s duration", "Slows 40%"], cooldown: 20, staminaCost: 40 },
        { id: "ranger_10_vanish", name: "Vanish", description: "Disappear from sight.", icon: "/icons/misc/Chaos.png", effectType: "active", effects: ["6s stealth", "+40% move speed", "Break targeting"], cooldown: 25, staminaCost: 30 },
        { id: "ranger_10_trap", name: "Hunter's Trap", description: "Trap that roots and poisons.", icon: "/icons/misc/Loot_27.png", effectType: "active", effects: ["Root 4s", "Reveals stealth", "Poison damage"], cooldown: 18, staminaCost: 20 },
      ]},
      { level: 15, tierName: "Elite Skills", description: "Deadly mastery techniques", choices: [
        { id: "ranger_15_sniper", name: "Sniper Shot", description: "Long-range devastating shot.", icon: "/icons/weapons/Crossbow_05.png", effectType: "active", effects: ["50m range", "Ignore 50% armor", "+300% damage", "2s channel"], cooldown: 30, staminaCost: 50 },
        { id: "ranger_15_death_mark", name: "Death Mark", description: "Mark target for death.", icon: "/icons/misc/Chaos_2.png", effectType: "active", effects: ["+40% damage from all sources", "6s duration", "Execute below 20% HP"], cooldown: 35, staminaCost: 40 },
      ]},
      { level: 20, tierName: "Ultimate Mastery", description: "Pinnacle ability", choices: [
        { id: "ranger_20_rain_of_arrows", name: "Rain of Arrows", description: "Endless barrage of arrows.", icon: "/icons/misc/Flow.png", effectType: "ultimate", effects: ["12m AoE", "8s duration", "Roots on final wave", "Burns"], cooldown: 90, staminaCost: 80 },
        { id: "ranger_20_shadow_dance", name: "Shadow Dance", description: "Become one with the shadows.", icon: "/icons/misc/ChaosCircle.png", effectType: "ultimate", effects: ["10s perma-stealth", "No cooldowns", "+100% crit damage"], cooldown: 120, staminaCost: 100 },
      ]},
    ],
  },

  // WORGE SHAPESHIFTER
  worge: {
    classId: "worge", className: "Worge Shapeshifter", classIcon: "/icons/entities/Heavy Orc Merc.PNG", color: "#d97706",
    specialAbility: { id: "worge_primal_shift", name: "Primal Shift", description: "Transform into Bear Form. Massive HP and defense.", icon: "/icons/misc/NatureFlower.png", effectType: "active", effects: ["+100% HP", "+50% damage reduction", "Threat aura", "Cannot be polymorphed"], cooldown: 30, staminaCost: 40 },
    tiers: [
      { level: 0, tierName: "Starting Ability", description: "Your primal connection", choices: [
        { id: "worge_0_maul", name: "Savage Maul", description: "Brutal attack that shreds armor.", icon: "/icons/misc/Lava.png", effectType: "active", effects: ["+75% weapon damage", "-25% target armor", "Causes bleed"], cooldown: 6, staminaCost: 18 },
      ]},
      { level: 1, tierName: "Pack Instincts", description: "Choose your pack role", choices: [
        { id: "worge_1_howl", name: "Primal Howl", description: "Terrifying howl that fears enemies.", icon: "/icons/misc/Burns.png", effectType: "active", effects: ["AoE fear 3s", "-20% enemy damage", "8m radius"], cooldown: 15, staminaCost: 20 },
        { id: "worge_1_pack_hunt", name: "Pack Hunt", description: "Coordinate with allies for bonus damage.", icon: "/icons/misc/NatureFlower.png", effectType: "passive", effects: ["+5% damage per ally", "Max +25%", "Share 10% lifesteal"] },
      ]},
      { level: 5, tierName: "Primal Mastery", description: "Embrace your bestial nature", choices: [
        { id: "worge_5_feral_rage", name: "Feral Rage", description: "Savage frenzy.", icon: "/icons/misc/Firestar.png", effectType: "active", effects: ["+50% attack speed", "+30% damage", "5% lifesteal", "8s"], cooldown: 25, staminaCost: 35 },
        { id: "worge_5_alpha_call", name: "Alpha's Call", description: "Summon spectral wolves.", icon: "/icons/misc/Chaos.png", effectType: "active", effects: ["3 wolf spirits", "30% your damage each", "15s duration"], cooldown: 30, manaCost: 40 },
      ]},
      { level: 10, tierName: "Form Mastery", description: "Unlock additional beast forms", choices: [
        { id: "worge_10_raptor_form", name: "Raptor Form", description: "Swift and deadly. Stealth and crit.", icon: "/icons/misc/Effect.png", effectType: "active", effects: ["+50% move speed", "+30% crit", "Stealth on demand"], cooldown: 30, staminaCost: 30 },
        { id: "worge_10_turtle_form", name: "Turtle Form", description: "Armored and immovable.", icon: "/icons/armor/Shield_01.png", effectType: "active", effects: ["+200% armor", "Damage reflection", "Immune to CC, cannot move"], cooldown: 45, staminaCost: 40 },
        { id: "worge_10_bird_form", name: "Bird Form", description: "Flyable. Mountable by allies.", icon: "/icons/misc/Leaf.png", effectType: "active", effects: ["Flight", "+100% move speed", "Cannot attack", "Mountable by allies"], cooldown: 60, staminaCost: 25 },
      ]},
      { level: 15, tierName: "Alpha Dominance", description: "Lead with overwhelming power", choices: [
        { id: "worge_15_dire_form", name: "Dire Beast Form", description: "Massive dire beast.", icon: "/icons/misc/Firestar.png", effectType: "active", effects: ["+150% size", "+75% damage", "+100% HP", "Terrify nearby"], cooldown: 60, staminaCost: 60 },
        { id: "worge_15_pack_alpha", name: "Pack Alpha Aura", description: "Presence empowers all allies.", icon: "/icons/misc/Glow.png", effectType: "passive", effects: ["Allies +20% all stats", "Forms buff allies", "15m aura"] },
      ]},
      { level: 20, tierName: "Ultimate Mastery", description: "Pinnacle form", choices: [
        { id: "worge_20_primal_avatar", name: "Primal Avatar", description: "Avatar of nature. All forms combined.", icon: "/icons/misc/NatureFlower.png", effectType: "ultimate", effects: ["Combine all forms", "+200% all stats", "Nature damage aura", "15s"], cooldown: 180, staminaCost: 100 },
        { id: "worge_20_pack_master", name: "Pack Master", description: "Command an army of beasts.", icon: "/icons/misc/Chaos.png", effectType: "ultimate", effects: ["6 beast spirits", "60% your damage each", "30s"], cooldown: 120, manaCost: 80, staminaCost: 50 },
      ]},
    ],
  },
};

// ============================================================================
// HELPERS
// ============================================================================

export const SKILL_TIER_LEVELS = [0, 1, 5, 10, 15, 20] as const;
export const CLASS_IDS = ["warrior", "mage", "ranger", "worge"] as const;
export type ClassId = typeof CLASS_IDS[number];

export function getClassSkillTree(classId: string): ClassSkillTree | undefined {
  return CLASS_SKILL_TREES[classId];
}

export function getSkillTierAtLevel(classId: string, level: number): ClassSkillTier | undefined {
  const tree = CLASS_SKILL_TREES[classId];
  if (!tree) return undefined;
  return tree.tiers.find(t => t.level === level);
}

export function getUnlockedTiers(classId: string, characterLevel: number): ClassSkillTier[] {
  const tree = CLASS_SKILL_TREES[classId];
  if (!tree) return [];
  return tree.tiers.filter(t => t.level <= characterLevel);
}

export function getLockedTiers(classId: string, characterLevel: number): ClassSkillTier[] {
  const tree = CLASS_SKILL_TREES[classId];
  if (!tree) return [];
  return tree.tiers.filter(t => t.level > characterLevel);
}

/** Resolve tier selections map into full ClassSkillChoice objects */
export function resolveSelectedSkills(
  classId: string,
  tierSelections: Record<string, string>
): ClassSkillChoice[] {
  const tree = CLASS_SKILL_TREES[classId];
  if (!tree) return [];
  const resolved: ClassSkillChoice[] = [];
  for (const tier of tree.tiers) {
    const selectedId = tierSelections[String(tier.level)];
    if (selectedId) {
      const skill = tier.choices.find(c => c.id === selectedId);
      if (skill) resolved.push(skill);
    }
  }
  return resolved;
}

/** Validate tier selections are legal for a character level */
export function validateTierSelections(
  classId: string,
  characterLevel: number,
  tierSelections: Record<string, string>
): { valid: boolean; errors: string[] } {
  const tree = CLASS_SKILL_TREES[classId];
  if (!tree) return { valid: false, errors: [`Unknown class: ${classId}`] };
  const errors: string[] = [];
  for (const [tierLevel, skillId] of Object.entries(tierSelections)) {
    const level = parseInt(tierLevel);
    if (level > characterLevel) {
      errors.push(`Tier ${level} requires level ${level}, character is level ${characterLevel}`);
      continue;
    }
    const tier = tree.tiers.find(t => t.level === level);
    if (!tier) { errors.push(`Invalid tier level: ${level}`); continue; }
    if (!tier.choices.find(c => c.id === skillId)) {
      errors.push(`Invalid skill "${skillId}" for tier ${level}`);
    }
  }
  return { valid: errors.length === 0, errors };
}
