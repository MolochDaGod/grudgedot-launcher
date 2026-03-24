/**
 * GRUDGE ENGINE — Barrel Export
 * Import everything from '@/lib/grudge-engine'
 */

// ECS Core
export { Entity, World, System, Components } from './ecs';
export type {
  GameEvent,
  TransformData,
  VelocityData,
  HealthData,
  ShieldData,
  ResourcePool,
  ResourcesData,
  ColliderData,
  MovementData,
  WeaponStateData,
  AbilityStateData,
  ProjectileData,
  AIData,
  RenderMeshData,
  AnimatorData,
  PlayerInputData,
} from './ecs';

// Race Configuration
export { RACES, RACE_IDS, ANIMATION_SLOTS, CHARACTER_FILE_MAP } from './race-config';
export type { RaceId, AnimationSlot, RaceDefinition } from './race-config';

// Shader Library
export { ShaderLibrary, createShaderMaterial, updateShaderTime } from './shader-library';
export type { ShaderDef } from './shader-library';

// Weapon System
export { WEAPON_DEFINITIONS, WEAPON_TYPES, ABILITY_KEYS, getWeapon, getAbility } from './weapon-system';
export type { WeaponType, AbilityKey, ResourceType, AbilityDefinition, WeaponDefinition } from './weapon-system';

// Collision System
export { CollisionSystem, CollisionLayer } from './collision-system';
export type { CollisionLayerName, ColliderEntry, RaycastHit, RaycastMiss, RaycastResult } from './collision-system';

// Camera System
export { ChaseCamera } from './camera-system';
export type { ChaseCameraConfig } from './camera-system';

// Character System
export { CharacterSystem } from './character-system';
export type { CharacterData, CreateCharacterOptions } from './character-system';

// Animation Library
export {
  ANIMATION_CATALOG,
  EMOTE_BINDINGS,
  ABILITY_BINDINGS,
  CONTROLLER_DEADZONE,
  CONTROLLER_MAPPINGS,
  getAnimationsByCategory,
  findAnimation,
  getCategories,
  resolveAnimationPath,
} from './animation-library';
export type { AnimationCategory, AnimationEntry, EmoteBinding, AbilityBinding, ControllerMapping } from './animation-library';

// Elo Rating System
export {
  K_FACTOR,
  DEFAULT_RATING,
  ARENA_RANKS,
  expectedScore,
  calculateNewRating,
  getRank,
  loadArenaStats,
  saveArenaStats,
  processMatchResult,
  generateOpponent,
  simulateQueueSearch,
} from './elo-rating';
export type { ArenaRank, ArenaStats, QueuedOpponent } from './elo-rating';

// Dev Inspector
export { DevInspector } from './DevInspector';
export type { DevInspectorProps } from './DevInspector';

// MMO UI Components
export {
  UnitFrame,
  CastBar,
  AbilityBar,
  CombatLog,
  ArenaTeamPanel,
  ArenaRatingDisplay,
} from './MMOUI';
export type {
  UnitFrameProps,
  BuffIcon,
  CastBarProps,
  AbilityBarProps,
  CombatLogEntry,
  ArenaPlayer,
  TowerStatus,
  ArenaTeamPanelProps,
} from './MMOUI';

// MOBA System
export {
  createTowerLayout,
  LANE_WAYPOINTS,
  LANE_IDS,
  xpForLevel,
  createLevelData,
  addXP,
  getWaveConfig,
  spawnCreepWave,
  towerAttack,
  moveCreep,
} from './moba-system';
export type {
  TeamSide,
  LaneId,
  Tower,
  Creep,
  LevelData,
  WaveConfig,
} from './moba-system';
