// ── Grudge Warlords RTS — WC3-Style Type Definitions ──────────────────────────

export type Faction = 'blue' | 'red' | 'neutral';

// ── Unit classification (WC3-style roles) ──────────────────────────────────────
export type UnitRole = 'worker' | 'melee' | 'ranged' | 'caster' | 'siege' | 'hero';

// ── Unit types from Miniworld ──────────────────────────────────────────────────
export type HeroType = 'warrior' | 'lancer' | 'archer' | 'priest' | 'pawn';
export type LegionType = 'orcPawn' | 'orcWarrior' | 'orcSpearman' | 'orcArcher' | 'orcHealer';
export type ChampionType = 'arthax' | 'gangblanc' | 'grum' | 'kanji' | 'katan' | 'okomo' | 'zhinja' | 'borg';
export type SoldierType =
  | 'swordsman' | 'spearman' | 'axeman' | 'assasin'
  | 'bowman' | 'mage' | 'musketeer' | 'knight'
  | 'farmer' | 'ballista';
export type MonsterType =
  | 'orc' | 'goblin' | 'spearGoblin' | 'archerGoblin' | 'orcMage' | 'orcShaman' | 'farmerGoblin' | 'kamikazeGoblin' | 'minotaur'
  | 'demon' | 'armouredDemon' | 'purpleDemon'
  | 'skeleton' | 'necromancer'
  | 'yeti' | 'wendigo' | 'mammoth'
  | 'pirate' | 'pirateGunner' | 'pirateCaptain'
  | 'slime' | 'slimeBlue' | 'megaSlime' | 'megaSlimeBlue' | 'kingSlime' | 'kingSlimeGreen'
  | 'dragon' | 'blackDragon' | 'blueDragon' | 'whiteDragon' | 'yellowDragon'
  | 'giantCrab';
export type NeutralCreatureType =
  | 'desertScorpio' | 'desertVulture' | 'fireElemental' | 'mimic'
  | 'mineElemental' | 'ogreBoss' | 'pirateCaptainHero' | 'steampunkMech';

export type UnitType = HeroType | LegionType | ChampionType | SoldierType | MonsterType | NeutralCreatureType;

// ── Building types ─────────────────────────────────────────────────────────────
export type BuildingType =
  | 'castle' | 'keep' | 'fortress'  // Town Hall line (tech tiers 1/2/3)
  | 'barracks' | 'archery' | 'chapel' | 'workshop' | 'sanctum'
  | 'tower' | 'house' | 'market' | 'tavern' | 'docks'
  | 'blacksmith' | 'altar' | 'goldmine';

export type TechTier = 1 | 2 | 3;

// ── Resource types ─────────────────────────────────────────────────────────────
export type ResourceType = 'tree' | 'goldmine';

// ── Unit/Animation state ───────────────────────────────────────────────────────
export type UnitState = 'idle' | 'moving' | 'attacking' | 'harvesting' | 'returning' | 'dead' | 'stunned' | 'building' | 'casting';
export type AnimAction = 'idle' | 'run' | 'attack' | 'interact' | 'cast' | 'death';

// ── Abilities (WC3-style) ──────────────────────────────────────────────────────
export type AbilityTargetType = 'none' | 'unit' | 'point' | 'unit_or_point';

export interface AbilityDef {
  id: string;
  name: string;
  icon: string;  // emoji or sprite path
  description: string;
  targetType: AbilityTargetType;
  cooldown: number;
  manaCost: number;
  /** Level required to unlock (1 = available at hero level 1) */
  levelRequired: number;
  /** Max ranks for this ability */
  maxRank: number;
  /** Is this the ultimate (only 1 point allowed before hero level 6)? */
  isUltimate: boolean;
  /** Damage/heal per rank */
  effectPerRank: number[];
}

export interface AbilityState {
  abilityId: string;
  rank: number;
  cooldownRemaining: number;
}

// ── Items (WC3-style drops from creeps) ────────────────────────────────────────
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type ItemSlot = 'consumable' | 'permanent' | 'artifact';

export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  rarity: ItemRarity;
  slot: ItemSlot;
  description: string;
  /** Stat bonuses when equipped/used */
  bonusHp?: number;
  bonusDamage?: number;
  bonusArmor?: number;
  bonusSpeed?: number;
  bonusMana?: number;
  /** For consumables: heal amount */
  healAmount?: number;
  /** For consumables: mana restore */
  manaRestore?: number;
  /** Gold value for selling */
  goldValue: number;
}

export interface ItemInstance {
  id: string;
  defId: string;
  charges?: number;
}

// ── Vectors ────────────────────────────────────────────────────────────────────
export interface Vec2 { x: number; y: number; }

// ── Animation ──────────────────────────────────────────────────────────────────
export interface Animation {
  action: AnimAction;
  frame: number;
  elapsed: number;
  flipX: boolean;
}

// ── Unit (WC3-style: includes hero fields) ─────────────────────────────────────
export interface Unit {
  id: string;
  faction: Faction;
  type: UnitType;
  role: UnitRole;
  pos: Vec2;
  target: Vec2 | null;
  waypoints: Vec2[];
  attackTargetId: string | null;
  harvestTargetId: string | null;
  returnToId: string | null;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  armor: number;
  state: UnitState;
  anim: Animation;
  carryType: 'wood' | 'gold' | null;
  carryAmount: number;
  attackCooldown: number;
  selected: boolean;
  inWater: boolean;
  slowTimer: number;
  healTimer: number;
  stunTimer: number;
  aoeTimer: number;
  buildTargetId: string | null;
  // ── Hero-specific fields ──────────────────────────────────────────────────
  isHero: boolean;
  heroLevel: number;
  heroXp: number;
  heroXpToNext: number;
  abilityPoints: number;
  abilities: AbilityState[];
  inventory: (ItemInstance | null)[];  // 6 slots
  /** Control group (1-9) or 0 for none */
  controlGroup: number;
  /** Food cost for this unit */
  foodCost: number;
  /** Kill count for stats */
  kills: number;
}

// ── Building (WC3-style: tech tier, prerequisites, training, upgrades) ─────────
export interface Building {
  id: string;
  faction: Faction;
  type: BuildingType;
  pos: Vec2;
  hp: number;
  maxHp: number;
  trainingQueue: UnitType[];
  trainingProgress: number;
  rallyPoint: Vec2 | null;
  constructionProgress: number;
  underConstruction: boolean;
  attackCooldown: number;
  /** Current tech tier of this building (for town hall line) */
  techTier: TechTier;
  /** Is this building currently researching an upgrade? */
  upgrading: boolean;
  upgradeProgress: number;
  upgradeTarget: string | null;
}

// ── Resource (gold mines are depletable, trees are chopable) ───────────────────
export interface Resource {
  id: string;
  type: ResourceType;
  pos: Vec2;
  amount: number;
  maxAmount: number;
  frame: number;
  frameElapsed: number;
  harvesting: boolean;
  /** For gold mines: max workers that can mine simultaneously */
  workerSlots?: number;
  activeWorkers?: number;
}

// ── Island ─────────────────────────────────────────────────────────────────────
export interface Island {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  faction: Faction | 'neutral';
}

// ── Creep Camp (WC3 neutral monsters) ──────────────────────────────────────────
export interface CreepCamp {
  id: string;
  pos: Vec2;
  /** Unit types + levels in this camp */
  creeps: { type: UnitType; level: number }[];
  /** Item drop table when camp is cleared */
  dropTable: { itemId: string; chance: number }[];
  /** Has this camp been cleared? */
  cleared: boolean;
  /** XP reward for clearing */
  xpReward: number;
  /** Difficulty tier 1-5 */
  difficulty: number;
}

// ── Projectile ─────────────────────────────────────────────────────────────────
export interface Projectile {
  id: string;
  pos: Vec2;
  vel: Vec2;
  targetId: string;
  damage: number;
  faction: Faction;
  isSlowing?: boolean;
  attackerType?: string;
}

// ── VFX ────────────────────────────────────────────────────────────────────────
export interface VfxEffect {
  id: string;
  pos: Vec2;
  type: string;
  age: number;
  duration: number;
}

export interface GroundEffect {
  id: string;
  pos: Vec2;
  radius: number;
  vfxType: string;
  age: number;
  duration: number;
  dotDamage: number;
  dotInterval: number;
  dotTimer: number;
  casterFaction: Faction;
}

export interface FloatingText {
  id: string;
  pos: Vec2;
  text: string;
  color: string;
  age: number;
  maxAge: number;
}

// ── Day/Night ──────────────────────────────────────────────────────────────────
export type TimeOfDay = 'day' | 'night';

// ── Upkeep ─────────────────────────────────────────────────────────────────────
export type UpkeepLevel = 'none' | 'low' | 'high';

// ── Player Resources ───────────────────────────────────────────────────────────
export interface PlayerResources {
  gold: number;
  wood: number;
  food: number;
  maxFood: number;
}

// ── Upgrades ───────────────────────────────────────────────────────────────────
export interface UpgradeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  cost: { gold: number; wood: number };
  researchTime: number;
  /** Which building researches this */
  building: BuildingType;
  /** Required tech tier */
  requiredTier: TechTier;
  /** Effect */
  bonusDamage?: number;
  bonusArmor?: number;
  bonusHp?: number;
}

// ── AI State (WC3-style phases) ────────────────────────────────────────────────
export interface AIState {
  phase: 'early' | 'creep' | 'expand' | 'harass' | 'push';
  phaseTimer: number;
  attackTimer: number;
  lastAction: string;
  heroLevel: number;
  techTier: TechTier;
}

// ── Control Groups ─────────────────────────────────────────────────────────────
export type ControlGroups = Record<number, Set<string>>;

// ── Full Game State ────────────────────────────────────────────────────────────
export interface GameState {
  tick: number;
  timeElapsed: number;
  units: Map<string, Unit>;
  buildings: Map<string, Building>;
  resources: Map<string, Resource>;
  projectiles: Map<string, Projectile>;
  vfxEffects: Map<string, VfxEffect>;
  groundEffects: Map<string, GroundEffect>;
  floatingTexts: FloatingText[];
  creepCamps: CreepCamp[];
  islands: Island[];
  camera: Vec2;
  zoom: number;
  playerResources: PlayerResources;
  enemyResources: PlayerResources;
  selected: Set<string>;
  dragStart: Vec2 | null;
  dragEnd: Vec2 | null;
  buildMode: BuildingType | null;
  winner: Faction | null;
  aiState: AIState;
  // ── WC3 mechanics ──────────────────────────────────────────────────────────
  dayNightCycle: number;     // 0-600 seconds (5 min day + 5 min night)
  timeOfDay: TimeOfDay;
  upkeepLevel: UpkeepLevel;
  techTier: TechTier;        // Player's current tech tier
  controlGroups: ControlGroups;
  completedUpgrades: Set<string>;
  /** Dead heroes waiting for revival */
  deadHeroes: { unitId: string; reviveTimer: number; reviveCost: number }[];
  playerFaction: 'kingdom' | 'legion';
  popCap: number;
  mapId: string;
  gameStatus: 'menu' | 'playing' | 'paused' | 'won' | 'lost';
}

// ── Config types ───────────────────────────────────────────────────────────────
export interface UnitConfig {
  hp: number;
  mana?: number;
  speed: number;
  damage: number;
  armor: number;
  range: number;
  attackSpeed: number;
  role: UnitRole;
  foodCost: number;
  harvestSpeed?: number;
  carryCapacity?: number;
  trainCost: { wood: number; gold: number };
  trainTime: number;
  /** Which building trains this unit */
  trainedAt: BuildingType;
  /** Required tech tier to train */
  requiredTier: TechTier;
}

export interface BuildingConfig {
  hp: number;
  w: number;
  h: number;
  cost: { wood: number; gold: number };
  buildTime: number;
  /** Food provided by this building */
  foodProvided: number;
  /** Tech tier of this building */
  techTier: TechTier;
  /** Required tech tier to construct */
  requiredTier: TechTier;
  /** Required buildings before this can be built */
  prerequisites: BuildingType[];
  /** Can this building attack? */
  canAttack: boolean;
  attackDamage?: number;
  attackRange?: number;
  /** Trains units at this building */
  trains: UnitType[];
}

export interface HeroConfig {
  type: UnitType;
  name: string;
  title: string;
  hp: number;
  mana: number;
  damage: number;
  armor: number;
  speed: number;
  range: number;
  attackSpeed: number;
  /** HP gained per level */
  hpPerLevel: number;
  /** Mana gained per level */
  manaPerLevel: number;
  /** Damage gained per level */
  damagePerLevel: number;
  /** Armor gained per level */
  armorPerLevel: number;
  abilities: string[];  // ability def IDs
  /** Which building summons this hero */
  summonedAt: BuildingType;
  reviveTime: number;
  reviveCost: number;
}

export interface SpriteConfig {
  src: string;
  frameW: number;
  frameH: number;
  frames: number;
  msPerFrame: number;
}

// ── XP table (WC3-style) ──────────────────────────────────────────────────────
export const HERO_XP_TABLE: number[] = [
  0,     // Level 1 (start)
  200,   // Level 2
  500,   // Level 3
  900,   // Level 4
  1400,  // Level 5
  2000,  // Level 6 (ultimate unlocks)
  2700,  // Level 7
  3500,  // Level 8
  4400,  // Level 9
  5400,  // Level 10 (max)
];
