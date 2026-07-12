import type { UnitType, BuildingType, UnitConfig, BuildingConfig, HeroConfig, AbilityDef, ItemDef, SpriteConfig, UpgradeDef } from './types';

// ── Display constants ──────────────────────────────────────────────────────────
export const TILE_SIZE = 64;
export const UNIT_DISPLAY = 48;
export const WATER_SPEED_MULT = 0.22;
export const WATER_DAMAGE_RATE = 8;
export const DAY_DURATION = 300;   // 5 min day
export const NIGHT_DURATION = 300; // 5 min night
export const CYCLE_LENGTH = DAY_DURATION + NIGHT_DURATION;
export const NIGHT_VISION_MULT = 0.6;  // 40% reduction at night

// ── Upkeep thresholds (WC3) ────────────────────────────────────────────────────
export const UPKEEP_NONE_MAX = 50;
export const UPKEEP_LOW_MAX = 80;
export const UPKEEP_NONE_RATE = 1.0;
export const UPKEEP_LOW_RATE = 0.7;
export const UPKEEP_HIGH_RATE = 0.4;

// ── Sprite CDN ─────────────────────────────────────────────────────────────────
const CDN = 'https://molochdagod.github.io/ObjectStore';

// ── Unit Configs (WC3 roles mapped from Miniworld data) ────────────────────────
export const UNIT_CONFIGS: Record<string, UnitConfig> = {
  // ── WORKERS ──────────────────────────────────────────────────────────────────
  pawn:     { hp:50,  speed:80,  damage:6,  armor:0, range:40,  attackSpeed:2.0, role:'worker', foodCost:1, harvestSpeed:12, carryCapacity:40, trainCost:{wood:0,  gold:75},  trainTime:5,  trainedAt:'castle', requiredTier:1 },
  orcPawn:  { hp:60,  speed:78,  damage:8,  armor:0, range:42,  attackSpeed:2.0, role:'worker', foodCost:1, harvestSpeed:10, carryCapacity:35, trainCost:{wood:0,  gold:75},  trainTime:5,  trainedAt:'castle', requiredTier:1 },
  farmer:   { hp:30,  speed:75,  damage:4,  armor:0, range:35,  attackSpeed:2.0, role:'worker', foodCost:1, harvestSpeed:10, carryCapacity:30, trainCost:{wood:0,  gold:50},  trainTime:4,  trainedAt:'castle', requiredTier:1 },

  // ── MELEE (Barracks T1) ──────────────────────────────────────────────────────
  swordsman:    { hp:90,  speed:82,  damage:12, armor:1, range:48,  attackSpeed:1.2, role:'melee', foodCost:2, trainCost:{wood:0,   gold:135}, trainTime:8,  trainedAt:'barracks', requiredTier:1 },
  spearman:     { hp:100, speed:78,  damage:15, armor:1, range:60,  attackSpeed:1.0, role:'melee', foodCost:2, trainCost:{wood:30,  gold:120}, trainTime:9,  trainedAt:'barracks', requiredTier:1 },
  axeman:       { hp:120, speed:76,  damage:18, armor:2, range:50,  attackSpeed:0.9, role:'melee', foodCost:3, trainCost:{wood:40,  gold:150}, trainTime:10, trainedAt:'barracks', requiredTier:1 },
  orcWarrior:   { hp:280, speed:88,  damage:38, armor:3, range:52,  attackSpeed:1.0, role:'melee', foodCost:4, trainCost:{wood:90,  gold:200}, trainTime:15, trainedAt:'barracks', requiredTier:2 },
  orcSpearman:  { hp:180, speed:82,  damage:22, armor:2, range:65,  attackSpeed:1.1, role:'melee', foodCost:3, trainCost:{wood:35,  gold:160}, trainTime:12, trainedAt:'barracks', requiredTier:1 },
  knight:       { hp:200, speed:115, damage:25, armor:4, range:55,  attackSpeed:1.3, role:'melee', foodCost:4, trainCost:{wood:60,  gold:250}, trainTime:18, trainedAt:'barracks', requiredTier:2 },
  assasin:      { hp:65,  speed:105, damage:28, armor:0, range:44,  attackSpeed:1.8, role:'melee', foodCost:2, trainCost:{wood:30,  gold:180}, trainTime:12, trainedAt:'barracks', requiredTier:2 },

  // ── RANGED (Archery T1) ──────────────────────────────────────────────────────
  bowman:       { hp:55,  speed:80,  damage:16, armor:0, range:170, attackSpeed:1.4, role:'ranged', foodCost:2, trainCost:{wood:30,  gold:130}, trainTime:8,  trainedAt:'archery', requiredTier:1 },
  musketeer:    { hp:70,  speed:78,  damage:32, armor:1, range:210, attackSpeed:0.8, role:'ranged', foodCost:3, trainCost:{wood:50,  gold:200}, trainTime:14, trainedAt:'archery', requiredTier:2 },
  orcArcher:    { hp:100, speed:80,  damage:30, armor:0, range:210, attackSpeed:1.4, role:'ranged', foodCost:3, trainCost:{wood:30,  gold:170}, trainTime:12, trainedAt:'archery', requiredTier:1 },

  // ── CASTERS (Chapel T2) ──────────────────────────────────────────────────────
  mage:         { hp:50,  mana:200, speed:72,  damage:24, armor:0, range:200, attackSpeed:1.0, role:'caster', foodCost:3, trainCost:{wood:20,  gold:220}, trainTime:16, trainedAt:'chapel', requiredTier:2 },
  orcHealer:    { hp:90,  mana:180, speed:74,  damage:15, armor:0, range:170, attackSpeed:1.6, role:'caster', foodCost:2, trainCost:{wood:60,  gold:190}, trainTime:14, trainedAt:'chapel', requiredTier:2 },
  necromancer:  { hp:55,  mana:250, speed:65,  damage:26, armor:0, range:200, attackSpeed:0.8, role:'caster', foodCost:3, trainCost:{wood:30,  gold:250}, trainTime:18, trainedAt:'chapel', requiredTier:2 },
  orcMage:      { hp:65,  mana:200, speed:70,  damage:28, armor:0, range:190, attackSpeed:0.9, role:'caster', foodCost:3, trainCost:{wood:25,  gold:230}, trainTime:16, trainedAt:'chapel', requiredTier:2 },

  // ── SIEGE (Workshop T2) ──────────────────────────────────────────────────────
  ballista:     { hp:150, speed:40,  damage:70, armor:2, range:300, attackSpeed:0.4, role:'siege', foodCost:4, trainCost:{wood:120, gold:200}, trainTime:22, trainedAt:'workshop', requiredTier:2 },

  // ── ELITE (Sanctum T3 — Champions) ──────────────────────────────────────────
  minotaur:     { hp:350, speed:90,  damage:45, armor:4, range:55,  attackSpeed:0.9, role:'melee', foodCost:5, trainCost:{wood:100, gold:300}, trainTime:25, trainedAt:'sanctum', requiredTier:3 },
  demon:        { hp:200, speed:95,  damage:35, armor:3, range:50,  attackSpeed:1.1, role:'melee', foodCost:4, trainCost:{wood:80,  gold:280}, trainTime:20, trainedAt:'sanctum', requiredTier:3 },
  mammoth:      { hp:500, speed:60,  damage:60, armor:5, range:65,  attackSpeed:0.6, role:'siege', foodCost:6, trainCost:{wood:200, gold:350}, trainTime:30, trainedAt:'sanctum', requiredTier:3 },
  dragon:       { hp:600, speed:120, damage:85, armor:5, range:200, attackSpeed:0.8, role:'ranged',foodCost:8, trainCost:{wood:300, gold:400}, trainTime:40, trainedAt:'sanctum', requiredTier:3 },

  // ── CREEP-ONLY (not trainable, used for neutral camps) ───────────────────────
  goblin:           { hp:40,  speed:100, damage:10, armor:0, range:40,  attackSpeed:1.5, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  spearGoblin:      { hp:55,  speed:90,  damage:14, armor:0, range:55,  attackSpeed:1.2, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  archerGoblin:     { hp:35,  speed:95,  damage:12, armor:0, range:140, attackSpeed:1.4, role:'ranged', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  skeleton:         { hp:60,  speed:70,  damage:16, armor:1, range:48,  attackSpeed:1.0, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  slime:            { hp:40,  speed:60,  damage:10, armor:0, range:36,  attackSpeed:1.0, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  orc:              { hp:100, speed:85,  damage:20, armor:1, range:50,  attackSpeed:1.0, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  yeti:             { hp:220, speed:80,  damage:35, armor:3, range:52,  attackSpeed:0.9, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  fireElemental:    { hp:250, speed:70,  damage:40, armor:2, range:50,  attackSpeed:0.9, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  desertScorpio:    { hp:180, speed:85,  damage:30, armor:2, range:55,  attackSpeed:1.0, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  ogreBoss:         { hp:700, speed:65,  damage:65, armor:5, range:65,  attackSpeed:0.7, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  steampunkMech:    { hp:900, speed:55,  damage:85, armor:6, range:100, attackSpeed:0.6, role:'siege',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  desertVulture:    { hp:90,  speed:130, damage:20, armor:0, range:80,  attackSpeed:1.4, role:'ranged', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  mimic:            { hp:200, speed:30,  damage:50, armor:3, range:48,  attackSpeed:0.7, role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  mineElemental:    { hp:180, speed:60,  damage:35, armor:3, range:52,  attackSpeed:0.85,role:'melee',  foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
  pirateCaptainHero:{ hp:400, speed:95,  damage:55, armor:4, range:200, attackSpeed:1.0, role:'ranged', foodCost:0, trainCost:{wood:0,gold:0}, trainTime:0, trainedAt:'castle', requiredTier:1 },
};

// ── Building Configs (WC3 tech tree) ───────────────────────────────────────────
export const BUILDING_CONFIGS: Record<BuildingType, BuildingConfig> = {
  // Town Hall line
  castle:    { hp:1500, w:128, h:128, cost:{wood:0,   gold:0  }, buildTime:0,  foodProvided:12, techTier:1, requiredTier:1, prerequisites:[],                canAttack:false, trains:['pawn','orcPawn','farmer'] },
  keep:      { hp:2000, w:128, h:128, cost:{wood:200, gold:500}, buildTime:60, foodProvided:12, techTier:2, requiredTier:1, prerequisites:['castle'],         canAttack:false, trains:['pawn','orcPawn','farmer'] },
  fortress:  { hp:2500, w:128, h:128, cost:{wood:300, gold:700}, buildTime:80, foodProvided:12, techTier:3, requiredTier:2, prerequisites:['keep'],           canAttack:false, trains:['pawn','orcPawn','farmer'] },

  // Military
  barracks:  { hp:500,  w:96,  h:96,  cost:{wood:200, gold:0  }, buildTime:25, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:['swordsman','spearman','axeman','orcSpearman','knight','assasin','orcWarrior'] },
  archery:   { hp:450,  w:96,  h:96,  cost:{wood:150, gold:50 }, buildTime:25, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:['bowman','orcArcher','musketeer'] },
  chapel:    { hp:500,  w:96,  h:96,  cost:{wood:200, gold:100}, buildTime:30, foodProvided:0, techTier:2, requiredTier:2, prerequisites:['barracks'],        canAttack:false, trains:['mage','orcHealer','necromancer','orcMage'] },
  workshop:  { hp:400,  w:96,  h:64,  cost:{wood:200, gold:100}, buildTime:28, foodProvided:0, techTier:2, requiredTier:2, prerequisites:['barracks'],        canAttack:false, trains:['ballista'] },
  sanctum:   { hp:600,  w:96,  h:96,  cost:{wood:300, gold:250}, buildTime:50, foodProvided:0, techTier:3, requiredTier:3, prerequisites:['chapel','fortress'],canAttack:false, trains:['minotaur','demon','mammoth','dragon'] },

  // Defense
  tower:     { hp:400,  w:64,  h:96,  cost:{wood:100, gold:80 }, buildTime:18, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:true,  attackDamage:30, attackRange:220, trains:[] },

  // Economy
  house:     { hp:200,  w:48,  h:64,  cost:{wood:50,  gold:0  }, buildTime:10, foodProvided:10, techTier:1, requiredTier:1, prerequisites:[],                canAttack:false, trains:[] },
  market:    { hp:300,  w:64,  h:64,  cost:{wood:200, gold:50 }, buildTime:18, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:[] },
  tavern:    { hp:300,  w:64,  h:64,  cost:{wood:200, gold:50 }, buildTime:20, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:[] },
  docks:     { hp:400,  w:96,  h:64,  cost:{wood:200, gold:100}, buildTime:22, foodProvided:0, techTier:2, requiredTier:2, prerequisites:[],                 canAttack:false, trains:[] },

  // Upgrades & Heroes
  blacksmith:{ hp:400,  w:64,  h:64,  cost:{wood:200, gold:80 }, buildTime:20, foodProvided:0, techTier:1, requiredTier:1, prerequisites:['barracks'],       canAttack:false, trains:[] },
  altar:     { hp:600,  w:96,  h:96,  cost:{wood:200, gold:150}, buildTime:30, foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:[] },
  goldmine:  { hp:999,  w:64,  h:64,  cost:{wood:0,   gold:0  }, buildTime:0,  foodProvided:0, techTier:1, requiredTier:1, prerequisites:[],                 canAttack:false, trains:[] },
};

// ── Hero Ability Definitions ───────────────────────────────────────────────────
export const ABILITY_DEFS: Record<string, AbilityDef> = {
  // Warrior Hero (Arthax — Blade Master)
  storm_bolt:      { id:'storm_bolt',      name:'Storm Bolt',      icon:'⚡', description:'Hurls a bolt of lightning that stuns and damages a target.',            targetType:'unit',          cooldown:8,  manaCost:75,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[100,175,250] },
  cleave_strike:   { id:'cleave_strike',   name:'Cleave Strike',   icon:'⚔️', description:'Each attack hits nearby enemies for bonus damage.',                    targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[15,25,35] },
  war_stomp:       { id:'war_stomp',       name:'War Stomp',       icon:'💥', description:'Slams the ground, stunning nearby enemies.',                           targetType:'none',          cooldown:12, manaCost:90,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[50,80,110] },
  avatar:          { id:'avatar',          name:'Avatar',          icon:'🗡️', description:'Transforms into a giant, gaining massive HP and damage.',              targetType:'none',          cooldown:120,manaCost:150, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[500] },

  // Mage Hero (Kanji — Archmage)
  arcane_blast:    { id:'arcane_blast',    name:'Arcane Blast',    icon:'✨', description:'Fires a bolt of arcane energy at a target.',                           targetType:'unit',          cooldown:6,  manaCost:60,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[120,200,280] },
  blizzard:        { id:'blizzard',        name:'Blizzard',        icon:'❄️', description:'Calls down ice shards in an area, damaging and slowing enemies.',      targetType:'point',         cooldown:10, manaCost:90,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[50,80,110] },
  brilliance_aura: { id:'brilliance_aura', name:'Brilliance Aura', icon:'💎', description:'Nearby allies regenerate mana faster.',                                targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[1,2,3] },
  mass_teleport:   { id:'mass_teleport',   name:'Mass Teleport',   icon:'🌀', description:'Teleports all nearby units to a friendly building.',                   targetType:'point',         cooldown:180,manaCost:200, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[0] },

  // Ranger Hero (Katan — Dark Ranger)
  multishot:       { id:'multishot',       name:'Multi-Shot',      icon:'🏹', description:'Fires arrows at multiple targets simultaneously.',                     targetType:'none',          cooldown:8,  manaCost:75,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[60,100,140] },
  shadow_strike:   { id:'shadow_strike',   name:'Shadow Strike',   icon:'🗡️', description:'Throws a poisoned dagger that slows and damages over time.',           targetType:'unit',          cooldown:10, manaCost:65,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[75,125,175] },
  evasion:         { id:'evasion',         name:'Evasion',         icon:'💨', description:'Chance to dodge incoming attacks.',                                    targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[15,25,35] },
  rain_of_arrows:  { id:'rain_of_arrows',  name:'Rain of Arrows',  icon:'🌧️', description:'Fires a massive volley of arrows in a target area.',                   targetType:'point',         cooldown:120,manaCost:175, levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[300] },

  // Tank Hero (Grum — Mountain King)
  thunder_clap:    { id:'thunder_clap',    name:'Thunder Clap',    icon:'⚡', description:'Slams the ground, damaging and slowing nearby enemies.',                targetType:'none',          cooldown:8,  manaCost:80,  levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[60,100,140] },
  bash:            { id:'bash',            name:'Bash',            icon:'🔨', description:'Each attack has a chance to stun the target.',                          targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[15,25,35] },
  devotion_aura:   { id:'devotion_aura',   name:'Devotion Aura',   icon:'🛡️', description:'Nearby allied units gain bonus armor.',                                targetType:'none',          cooldown:0,  manaCost:0,   levelRequired:1, maxRank:3, isUltimate:false, effectPerRank:[2,4,6] },
  reincarnation:   { id:'reincarnation',   name:'Reincarnation',   icon:'♻️', description:'Upon death, automatically revives at full health after a short delay.', targetType:'none',          cooldown:240,manaCost:0,   levelRequired:6, maxRank:1, isUltimate:true,  effectPerRank:[0] },
};

// ── Hero Configs (WC3 heroes — max 3 per match) ───────────────────────────────
export const HERO_CONFIGS: HeroConfig[] = [
  {
    type: 'arthax', name: 'Arthax', title: 'Blade Master',
    hp: 650, mana: 200, damage: 35, armor: 3, speed: 95, range: 55, attackSpeed: 1.2,
    hpPerLevel: 50, manaPerLevel: 15, damagePerLevel: 4, armorPerLevel: 0.5,
    abilities: ['storm_bolt', 'cleave_strike', 'war_stomp', 'avatar'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'kanji', name: 'Kanji', title: 'Archmage',
    hp: 400, mana: 350, damage: 22, armor: 1, speed: 80, range: 250, attackSpeed: 1.0,
    hpPerLevel: 30, manaPerLevel: 25, damagePerLevel: 3, armorPerLevel: 0.3,
    abilities: ['arcane_blast', 'blizzard', 'brilliance_aura', 'mass_teleport'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'katan', name: 'Katan', title: 'Dark Ranger',
    hp: 450, mana: 250, damage: 30, armor: 2, speed: 110, range: 200, attackSpeed: 1.5,
    hpPerLevel: 35, manaPerLevel: 18, damagePerLevel: 4, armorPerLevel: 0.4,
    abilities: ['multishot', 'shadow_strike', 'evasion', 'rain_of_arrows'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
  {
    type: 'grum', name: 'Grum', title: 'Mountain King',
    hp: 800, mana: 200, damage: 28, armor: 5, speed: 75, range: 50, attackSpeed: 0.9,
    hpPerLevel: 60, manaPerLevel: 12, damagePerLevel: 3, armorPerLevel: 0.6,
    abilities: ['thunder_clap', 'bash', 'devotion_aura', 'reincarnation'],
    summonedAt: 'altar', reviveTime: 55, reviveCost: 425,
  },
];

// ── Item Definitions (WC3-style drops) ─────────────────────────────────────────
export const ITEM_DEFS: Record<string, ItemDef> = {
  // Consumables
  healing_salve:     { id:'healing_salve',     name:'Healing Salve',        icon:'🧪', rarity:'common',   slot:'consumable', description:'Restores 200 HP.',                           healAmount:200,  goldValue:50  },
  mana_potion:       { id:'mana_potion',       name:'Mana Potion',          icon:'💧', rarity:'common',   slot:'consumable', description:'Restores 100 mana.',                         manaRestore:100, goldValue:50  },
  scroll_healing:    { id:'scroll_healing',    name:'Scroll of Healing',    icon:'📜', rarity:'uncommon', slot:'consumable', description:'Heals all nearby units for 150 HP.',           healAmount:150,  goldValue:100 },
  potion_invuln:     { id:'potion_invuln',     name:'Potion of Invuln.',    icon:'🛡️', rarity:'rare',     slot:'consumable', description:'Grants invulnerability for 5 seconds.',        goldValue:200 },

  // Permanent stat items
  claws_of_attack:   { id:'claws_of_attack',   name:'Claws of Attack +6',   icon:'🗡️', rarity:'uncommon', slot:'permanent', description:'+6 damage.',                                   bonusDamage:6,  goldValue:150 },
  ring_of_protection:{ id:'ring_of_protection', name:'Ring of Protection +3',icon:'💍', rarity:'uncommon', slot:'permanent', description:'+3 armor.',                                    bonusArmor:3,   goldValue:150 },
  boots_of_speed:    { id:'boots_of_speed',     name:'Boots of Speed',       icon:'👢', rarity:'uncommon', slot:'permanent', description:'+50 movement speed.',                          bonusSpeed:50,  goldValue:150 },
  periapt_of_vitality:{ id:'periapt_of_vitality',name:'Periapt of Vitality', icon:'❤️', rarity:'uncommon', slot:'permanent', description:'+150 max HP.',                                  bonusHp:150,    goldValue:175 },
  tome_of_power:     { id:'tome_of_power',      name:'Tome of Power',        icon:'📕', rarity:'rare',     slot:'permanent', description:'+12 damage.',                                  bonusDamage:12, goldValue:300 },
  amulet_of_mana:    { id:'amulet_of_mana',     name:'Amulet of Mana',       icon:'🔮', rarity:'rare',     slot:'permanent', description:'+100 max mana.',                               bonusMana:100,  goldValue:250 },

  // Artifacts (rare boss drops)
  crown_of_kings:    { id:'crown_of_kings',    name:'Crown of Kings',       icon:'👑', rarity:'epic',      slot:'artifact',  description:'+250 HP, +5 armor, +10 damage.',              bonusHp:250, bonusArmor:5, bonusDamage:10, goldValue:600 },
  orb_of_fire:       { id:'orb_of_fire',       name:'Orb of Fire',          icon:'🔥', rarity:'epic',      slot:'artifact',  description:'+20 damage, attacks burn for splash damage.',  bonusDamage:20, goldValue:500 },
  dragon_heart:      { id:'dragon_heart',      name:'Dragon Heart',         icon:'💜', rarity:'legendary', slot:'artifact',  description:'+500 HP, +5 HP regen/sec.',                   bonusHp:500, goldValue:900 },
};

// ── Upgrade Definitions ────────────────────────────────────────────────────────
export const UPGRADE_DEFS: Record<string, UpgradeDef> = {
  melee_attack_1:  { id:'melee_attack_1',  name:'Iron Forged Swords',  icon:'⚔️', description:'+2 damage to melee units.',  cost:{gold:150,wood:50},  researchTime:30, building:'blacksmith', requiredTier:1, bonusDamage:2 },
  melee_attack_2:  { id:'melee_attack_2',  name:'Steel Forged Swords', icon:'⚔️', description:'+4 damage to melee units.',  cost:{gold:250,wood:100}, researchTime:45, building:'blacksmith', requiredTier:2, bonusDamage:4 },
  melee_armor_1:   { id:'melee_armor_1',   name:'Iron Plating',        icon:'🛡️', description:'+2 armor to melee units.',   cost:{gold:150,wood:75},  researchTime:30, building:'blacksmith', requiredTier:1, bonusArmor:2 },
  melee_armor_2:   { id:'melee_armor_2',   name:'Steel Plating',       icon:'🛡️', description:'+4 armor to melee units.',   cost:{gold:250,wood:125}, researchTime:45, building:'blacksmith', requiredTier:2, bonusArmor:4 },
  ranged_attack_1: { id:'ranged_attack_1', name:'Improved Bows',       icon:'🏹', description:'+2 damage to ranged units.', cost:{gold:150,wood:50},  researchTime:30, building:'blacksmith', requiredTier:1, bonusDamage:2 },
  ranged_attack_2: { id:'ranged_attack_2', name:'Reinforced Bows',     icon:'🏹', description:'+4 damage to ranged units.', cost:{gold:250,wood:100}, researchTime:45, building:'blacksmith', requiredTier:2, bonusDamage:4 },
};

// ── Priest heal config ─────────────────────────────────────────────────────────
export const PRIEST_HEAL_RANGE = 140;
export const PRIEST_HEAL_AMOUNT = 18;
export const PRIEST_HEAL_PULSE = 2.5;

// ── Legion CDN sprites ─────────────────────────────────────────────────────────
function legionSprite(path: string, frames = 4, msPerFrame = 120): SpriteConfig {
  return { src: `${CDN}${path}`, frameW: 48, frameH: 48, frames, msPerFrame };
}

export function getLegionSprites(type: UnitType): Record<string, SpriteConfig> {
  switch (type) {
    case 'orcPawn':
      return {
        idle: legionSprite('/sprites/characters/orc/idle.png', 4, 200),
        run: legionSprite('/sprites/characters/orc/run.png', 4, 130),
        attack: legionSprite('/sprites/characters/orc/attack.png', 4, 110),
      };
    case 'orcWarrior':
      return {
        idle: legionSprite('/sprites/enemies/armored-orc/idle.png', 4, 200),
        run: legionSprite('/sprites/enemies/armored-orc/run.png', 4, 130),
        attack: legionSprite('/sprites/enemies/armored-orc/attack.png', 4, 110),
      };
    case 'orcSpearman':
      return {
        idle: legionSprite('/sprites/characters/elite-orc/idle.png', 4, 200),
        run: legionSprite('/sprites/characters/elite-orc/run.png', 4, 130),
        attack: legionSprite('/sprites/characters/elite-orc/attack.png', 4, 110),
      };
    case 'orcArcher':
      return {
        idle: legionSprite('/sprites/enemies/skeleton-archer/idle.png', 4, 200),
        run: legionSprite('/sprites/enemies/skeleton-archer/run.png', 4, 130),
        attack: legionSprite('/sprites/enemies/skeleton-archer/attack.png', 6, 90),
      };
    case 'orcHealer':
      return {
        idle: legionSprite('/sprites/enemies/evil-wizard-2/idle.png', 4, 200),
        run: legionSprite('/sprites/enemies/evil-wizard-2/run.png', 4, 130),
        attack: legionSprite('/sprites/enemies/evil-wizard-2/attack.png', 6, 80),
      };
    default:
      return {};
  }
}

export function getUnitSprites(faction: 'blue' | 'red', type: UnitType): Record<string, SpriteConfig> {
  const color = faction === 'blue' ? 'Blue' : 'Red';
  const base = `/assets/Units/${color}_Units/`;
  if (type === 'warrior' || type === 'arthax') {
    return {
      idle:   { src: `${base}Warrior/Warrior_Idle.png`, frameW: 192, frameH: 192, frames: 8, msPerFrame: 300 },
      run:    { src: `${base}Warrior/Warrior_Run.png`, frameW: 192, frameH: 192, frames: 6, msPerFrame: 200 },
      attack: { src: `${base}Warrior/Warrior_Attack1.png`, frameW: 192, frameH: 192, frames: 4, msPerFrame: 100 },
    };
  }
  if (type === 'archer' || type === 'katan') {
    return {
      idle:   { src: `${base}Archer/Archer_Idle.png`, frameW: 192, frameH: 192, frames: 6, msPerFrame: 300 },
      run:    { src: `${base}Archer/Archer_Run.png`, frameW: 192, frameH: 192, frames: 4, msPerFrame: 200 },
      attack: { src: `${base}Archer/Archer_Shoot.png`, frameW: 192, frameH: 192, frames: 8, msPerFrame: 100 },
    };
  }
  if (type === 'pawn' || type === 'farmer') {
    return {
      idle:    { src: `${base}Pawn/Pawn_Idle.png`, frameW: 192, frameH: 192, frames: 8, msPerFrame: 300 },
      run:     { src: `${base}Pawn/Pawn_Run.png`, frameW: 192, frameH: 192, frames: 6, msPerFrame: 200 },
      attack:  { src: `${base}Pawn/Pawn_Attack.png`, frameW: 192, frameH: 192, frames: 4, msPerFrame: 100 },
      interact:{ src: `${base}Pawn/Pawn_Chop.png`, frameW: 192, frameH: 192, frames: 4, msPerFrame: 120 },
    };
  }
  if (type === 'lancer' || type === 'grum') {
    return {
      idle:   { src: `${base}Lancer/Lancer_Idle.png`, frameW: 320, frameH: 320, frames: 4, msPerFrame: 300 },
      run:    { src: `${base}Lancer/Lancer_Run.png`, frameW: 320, frameH: 320, frames: 6, msPerFrame: 200 },
      attack: { src: `${base}Lancer/Lancer_Attack.png`, frameW: 320, frameH: 320, frames: 4, msPerFrame: 100 },
    };
  }
  if (type === 'priest' || type === 'kanji') {
    return {
      idle:   { src: `${base}Archer/Archer_Idle.png`, frameW: 192, frameH: 192, frames: 6, msPerFrame: 300 },
      run:    { src: `${base}Archer/Archer_Run.png`, frameW: 192, frameH: 192, frames: 4, msPerFrame: 200 },
      attack: { src: `${base}Archer/Archer_Shoot.png`, frameW: 192, frameH: 192, frames: 8, msPerFrame: 100 },
    };
  }
  // fallback — generic soldier
  return {
    idle:   { src: `${base}Warrior/Warrior_Idle.png`, frameW: 192, frameH: 192, frames: 8, msPerFrame: 300 },
    run:    { src: `${base}Warrior/Warrior_Run.png`, frameW: 192, frameH: 192, frames: 6, msPerFrame: 200 },
    attack: { src: `${base}Warrior/Warrior_Attack1.png`, frameW: 192, frameH: 192, frames: 4, msPerFrame: 100 },
  };
}
