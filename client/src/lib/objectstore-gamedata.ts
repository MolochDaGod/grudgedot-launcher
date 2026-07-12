/**
 * ObjectStore Game Data Client — Browser-side
 *
 * Fetches static JSON game-data files from the ObjectStore GitHub Pages API.
 * All reads are public (no auth). Uses React Query for caching.
 *
 * Usage:
 *   import { useRtsModels, useEffects2D, use3DFx, useOsWeapons } from '@/lib/objectstore-gamedata';
 *
 *   const { data: rtsModels } = useRtsModels();
 *   const { data: fx2d }      = useEffects2D();
 */

import { useQuery } from "@tanstack/react-query";

// ── Base URL ────────────────────────────────────────────────────────

const OS_BASE =
  (import.meta.env.VITE_OBJECTSTORE_DATA_URL ||
    "https://molochdagod.github.io/ObjectStore"
  ).replace(/\/$/, "");

const API_V1 = `${OS_BASE}/api/v1`;

// ── Types ───────────────────────────────────────────────────────────

/** Single RTS 3D model entry */
export interface RtsModel {
  grudgeId: string;
  grudgeType: string;
  name: string;
  displayName: string;
  file: string;
  category: string;
  unitType: string;
  sizeBytes?: number;
  hasAnimations?: boolean;
  customizable?: boolean;
  tags: string[];
  url: string;
}

/** Race group inside rtsModels.json */
export interface RtsRace {
  id: string;
  name: string;
  faction: string;
  color: string;
  emoji: string;
  objectStoreRace: string;
  models: RtsModel[];
}

/** Top-level rtsModels.json */
export interface RtsModelsData {
  version: string;
  totalModels: number;
  total: number;
  baseUrl: string;
  races: Record<string, RtsRace>;
}

/** Single 3D model from models3d.json */
export interface Model3D {
  name: string;
  format: string;
  path: string;
  category: string;
  sizeKB: number;
}

/** models3d.json */
export interface Models3DData {
  models: Model3D[];
}

/** 2D effect sprite from effects-registry.json */
export interface Effect2D {
  src: string;
  sourceUrl: string;
  filename: string;
  ext: string;
  subcategory: string;
  sizeKB: number;
  categories: string[];
}

/** effects-registry.json */
export interface Effects2DData {
  version: string;
  totalEffects: number;
  subcategories: Record<string, number>;
  effects: Record<string, Effect2D>;
}

/** 3D VFX effect from 3dfx-registry.json */
export interface Effect3D {
  id: string;
  name: string;
  category: string;
  source: string;
  description: string;
  colors: { primary: string; secondary: string };
  timing: { duration: number; loop: boolean; speed: number };
  shader: string | null;
  particles: Record<string, unknown>;
  geometry?: Record<string, unknown>;
  bloom?: { strength: number; radius: number; threshold: number };
  light?: { color: string; intensity: number; distance: number };
  tags: string[];
}

/** 3dfx-registry.json */
export interface Effects3DData {
  version: string;
  totalEffects: number;
  categories: Record<string, { name: string; icon: string; color: string; count: number }>;
  shaderFiles: Record<string, { vertex: string; fragment: string }>;
  effects: Record<string, Effect3D>;
}

/** ObjectStore weapon item */
export interface OsWeaponItem {
  id: string;
  name: string;
  primaryStat: string;
  secondaryStat: string;
  emoji: string;
  grudgeType: string;
  lore: string;
  category: string;
  stats: Record<string, number>;
  basicAbility: string;
  abilities: string[];
  signatureAbility: string;
  passives: string[];
  craftedBy: string;
  spritePath: string;
}

/** weapons.json */
export interface OsWeaponsData {
  version: string;
  total: number;
  tiers: number;
  categories: Record<string, {
    iconBase: string;
    iconMax: number;
    items: OsWeaponItem[];
  }>;
}

/** Single 2D sprite from sprites2d.json */
export interface Sprite2D {
  uuid: string;
  id: string;
  name: string;
  category: string;
  subcategory: string;
  src: string;
  frameCount?: number;
  animated?: boolean;
}

/** sprites2d.json */
export interface Sprites2DData {
  version: string;
  totalSprites: number;
  categories: Record<string, {
    count: number;
    items: Sprite2D[];
  }>;
}

/** Animation source pack from animations.json */
export interface AnimationSource {
  pack: string;
  format: string;
  path: string;
  count: number;
  skeleton: string;
}

/** Weapon pack from animations.json */
export interface WeaponPack {
  prefix: string;
  count: number;
  class: string;
}

/** animations.json */
export interface OsAnimationsData {
  version: string;
  total: number;
  description: string;
  skeletonConventions: string[];
  riggingGuide: {
    overview: string;
    minimumBones: string[];
    fullBoneCount: number;
    pipeline: Record<string, string>;
    skeletonOptions: Record<string, string>;
  };
  categories: Record<string, { count: number }>;
  weaponPacks: Record<string, WeaponPack>;
  classDefaults: Record<string, Record<string, string>>;
  characterModels: string[];
  animationSources: AnimationSource[];
  sprites2d?: Record<string, unknown>;
}

/** Single animation frame data from sprite-characters.json */
export interface SpriteAnimation {
  uuid: string;
  id: string;
  name: string;
  path: string;
  filename: string;
  width: number;
  height: number;
  frameCount: number;
  frameW: number;
  frameH: number;
  layout: string;
  cols: number;
  rows: number;
}

/** Single sprite character from sprite-characters.json */
export interface SpriteCharacter {
  name: string;
  category: string;
  source: string;
  animations: SpriteAnimation[];
  uuid: string;
  animationCount: number;
}

/** sprite-characters.json */
export interface SpriteCharactersData {
  version: string;
  totalCharacters: number;
  totalAnimations: number;
  characters: SpriteCharacter[];
}

// ── Generic fetcher ─────────────────────────────────────────────────

async function fetchOsJson<T>(endpoint: string): Promise<T> {
  const url = `${API_V1}/${endpoint}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ObjectStore fetch failed: ${res.status} ${url}`);
  }
  return res.json();
}

// ── React Query Hooks ───────────────────────────────────────────────

const STALE_TIME = 5 * 60 * 1000; // 5 min — static data doesn't change often

/**
 * Generic hook for any ObjectStore JSON endpoint.
 * Caches by endpoint path.
 */
export function useObjectStoreJson<T>(endpoint: string, enabled = true) {
  return useQuery<T>({
    queryKey: ["os-gamedata", endpoint],
    queryFn: () => fetchOsJson<T>(endpoint),
    enabled,
    staleTime: STALE_TIME,
    retry: 2,
  });
}

/** RTS GLB models organized by race (rtsModels.json) */
export function useRtsModels(enabled = true) {
  return useObjectStoreJson<RtsModelsData>("rtsModels.json", enabled);
}

/** Full 3D model registry — FBX, GLB, OBJ (models3d.json) */
export function useModels3D(enabled = true) {
  return useObjectStoreJson<Models3DData>("models3d.json", enabled);
}

/** 2D effect sprite sheets (effects-registry.json) */
export function useEffects2D(enabled = true) {
  return useObjectStoreJson<Effects2DData>("effects-registry.json", enabled);
}

/** 3D VFX effect definitions (3dfx-registry.json) */
export function use3DFx(enabled = true) {
  return useObjectStoreJson<Effects3DData>("3dfx-registry.json", enabled);
}

/** Grudge Warlords weapons with full stats (weapons.json) */
export function useOsWeapons(enabled = true) {
  return useObjectStoreJson<OsWeaponsData>("weapons.json", enabled);
}

/** 2D sprites with UUIDs and frame data (sprites2d.json) */
export function useOsSprites(enabled = true) {
  return useObjectStoreJson<Sprites2DData>("sprites2d.json", enabled);
}

/** Animation library with character models & weapon packs (animations.json) */
export function useOsAnimations(enabled = true) {
  return useObjectStoreJson<OsAnimationsData>("animations.json", enabled);
}

/** Sprite characters with frame-level animation data (sprite-characters.json) */
export function useOsSpriteCharacters(enabled = true) {
  return useObjectStoreJson<SpriteCharactersData>("sprite-characters.json", enabled);
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Build a full URL for a 2D effect sprite */
export function getEffect2DUrl(effect: Effect2D): string {
  return effect.sourceUrl || `${OS_BASE}${effect.src}`;
}

/** Build a full URL for a 2D sprite */
export function getSpriteUrl(sprite: Sprite2D): string {
  if (sprite.src.startsWith("http")) return sprite.src;
  return `${OS_BASE}${sprite.src}`;
}

/** Flatten all RTS models from the races map into a single array */
export function flattenRtsModels(data: RtsModelsData): (RtsModel & { race: string })[] {
  const all: (RtsModel & { race: string })[] = [];
  for (const [raceId, race] of Object.entries(data.races)) {
    for (const model of race.models) {
      all.push({ ...model, race: raceId });
    }
  }
  return all;
}

/** Flatten all 2D effects into an array */
export function flattenEffects2D(data: Effects2DData): (Effect2D & { key: string })[] {
  return Object.entries(data.effects).map(([key, effect]) => ({ ...effect, key }));
}

/** Flatten all 3D VFX into an array */
export function flatten3DFx(data: Effects3DData): Effect3D[] {
  return Object.values(data.effects);
}

/** Flatten all ObjectStore weapons into a single array */
export function flattenOsWeapons(data: OsWeaponsData): (OsWeaponItem & { weaponCategory: string })[] {
  const all: (OsWeaponItem & { weaponCategory: string })[] = [];
  for (const [cat, catData] of Object.entries(data.categories)) {
    for (const item of catData.items) {
      all.push({ ...item, weaponCategory: cat });
    }
  }
  return all;
}

/** Build a URL for a character GLB model from animations.json characterModels list */
export function getCharacterModelUrl(filename: string): string {
  return `${OS_BASE}/models/characters/${filename}`;
}

/** Build a URL for a sprite character animation frame */
export function getSpriteCharacterUrl(animation: SpriteAnimation): string {
  if (animation.path.startsWith("http")) return animation.path;
  return `${OS_BASE}${animation.path}`;
}

/** Get the ObjectStore base URL (for building custom URLs) */
export function getOsBaseUrl(): string {
  return OS_BASE;
}
