// ============================================================
// GRUDACHAIN Integration Config
// Connects GDevelopAssistant (GGE) to GRUDACHAIN AI nodes
// and Warlord-Crafting-Suite (WCS) game systems
// ============================================================

// Deployment URLs (overridable via env)
// GRUDA Legion production runs on the Grudge Studio VPS via Coolify/Traefik.
// grudachain.grudgestudio.com is the GrudaChain *frontend* (Cloudflare Pages) — NOT the backend.
export const GRUDACHAIN_URL = process.env.GRUDACHAIN_URL || "https://api.grudge-studio.com";
export const WCS_URL = process.env.WCS_URL || "https://warlord-crafting-suite.vercel.app";

// GAME_API_GRUDA is the canonical Grudge Studio API endpoint
export const GAME_API_GRUDA = process.env.GAME_API_GRUDA || GRUDACHAIN_URL;

// Vercel deployment (static landing page + serverless functions)
export const GRUDACHAIN_VERCEL_URL = "https://grudachain.vercel.app";

// WCS pages available for iframe embedding
export const WCS_PAGES = {
  dungeon: `${WCS_URL}/dungeon`,
  battle: `${WCS_URL}/battle`,
  crafting: `${WCS_URL}/crafting`,
  arsenal: `${WCS_URL}/arsenal`,
  islandHub: `${WCS_URL}/island-hub`,
  worldMap: `${WCS_URL}/world-map`,
  character: `${WCS_URL}/character`,
  characterCreation: `${WCS_URL}/character-creation`,
  dashboard: `${WCS_URL}/dashboard`,
} as const;

// GRUDACHAIN API endpoints
// Source: https://github.com/MolochDaGod/grudge-studio-backend → VPS auto-deploy via Coolify
export const GRUDACHAIN_API = {
  health: `${GRUDACHAIN_URL}/health`,
  status: `${GRUDACHAIN_URL}/api/status`,
  chat: `${GRUDACHAIN_URL}/api/chat`,
  generateCode: `${GRUDACHAIN_URL}/api/generate-code`,
  analyzeFile: `${GRUDACHAIN_URL}/api/analyze-file`,
  networkDiscover: `${GRUDACHAIN_URL}/api/network/discover`,
  // Vibe AI — served from Grudge Studio VPS
  vibeProviders: `${GRUDACHAIN_URL}/api/vibe/providers`,
  vibeChat: `${GRUDACHAIN_URL}/api/vibe/chat`,
  // SDK & Storage
  sdkInfo: `${GRUDACHAIN_URL}/api/sdk/info`,
  storageInfo: `${GRUDACHAIN_URL}/api/storage/info`,
  storageList: `${GRUDACHAIN_URL}/api/storage/list`,
  // Grudge Studio integration
  grudgeStudioConfig: `${GRUDACHAIN_URL}/api/grudge-studio/config`,
  grudgeStudioLinks: `${GRUDACHAIN_URL}/api/grudge-studio/links`,
  // Admin
  adminStats: `${GRUDACHAIN_URL}/api/admin/stats`,
  adminEcosystem: `${GRUDACHAIN_URL}/api/admin/ecosystem`,
  // WebSocket: connect via Socket.IO at GRUDACHAIN_URL root for real-time AI chat
} as const;

// Source repository for the VPS deployment
export const GRUDACHAIN_SOURCE = {
  repo: "MolochDaGod/grudge-studio-backend",
  branch: "main",
  service: "game-api",
  github: "https://github.com/MolochDaGod/grudge-studio-backend",
} as const;

// ============================================================
// Type Definitions
// ============================================================

/** WCS hero attribute system (8 stats) */
export interface WCSHeroAttributes {
  strength: number;
  vitality: number;
  endurance: number;
  intellect: number;
  wisdom: number;
  dexterity: number;
  agility: number;
  tactics: number;
}

/** GDA character base stats (simplified 4-stat) */
export interface GDABaseStats {
  health: number;
  attack: number;
  defense: number;
  speed: number;
}

/** GDA character ability format */
export interface GDAAbility {
  id: string;
  name: string;
  description: string;
  damage?: number;
  cooldown?: number;
  manaCost?: number;
  type: "active" | "passive";
}

/** GRUDACHAIN service health response */
export interface GrudachainHealth {
  status: string;
  uptime: number;
  services: Record<string, { enabled: boolean; status: string; models?: string[] }>;
  system: {
    server: string;
    ai: string;
    network: string;
    storage: string;
  };
  timestamp: string;
}

/** WCS service status */
export interface WCSStatus {
  available: boolean;
  url: string;
  lastChecked: string;
}

/** Combined Gruda Wars status */
export interface GrudaWarsStatus {
  grudachain: GrudachainHealth | { status: "unreachable"; error: string };
  wcs: WCSStatus;
  gge: { status: string; heroCount: number };
}

// ============================================================
// Stat Mapping: WCS 8-stat → GDA 4-stat
// ============================================================

/**
 * Convert WCS HeroAttributes (8 stats) to GDA BaseStats (4 stats).
 * - health = vitality * 10 + endurance * 5
 * - attack = strength * 2 + intellect * 1.5 + dexterity
 * - defense = endurance * 2 + vitality + wisdom * 0.5
 * - speed = agility * 2 + dexterity
 */
export function wcsToGDAStats(attrs: WCSHeroAttributes): GDABaseStats {
  return {
    health: Math.round(attrs.vitality * 10 + attrs.endurance * 5),
    attack: Math.round(attrs.strength * 2 + attrs.intellect * 1.5 + attrs.dexterity),
    defense: Math.round(attrs.endurance * 2 + attrs.vitality + attrs.wisdom * 0.5),
    speed: Math.round(attrs.agility * 2 + attrs.dexterity),
  };
}

/**
 * Map WCS class IDs to GDA character types
 */
export function wcsClassToGDAType(classId: string): string {
  const classMap: Record<string, string> = {
    warrior: "warrior",
    mage: "mage",
    rogue: "ranger", // WCS rogue → GDA ranger archetype
    cleric: "mage",  // WCS cleric → GDA mage (support caster)
    ranger: "ranger",
    worge: "warrior", // Worge forms → warrior archetype
  };
  return classMap[classId] || classId;
}

/**
 * Map WCS rarity from hero level
 */
export function heroLevelToRarity(level: number): string {
  if (level >= 20) return "legendary";
  if (level >= 15) return "epic";
  if (level >= 10) return "rare";
  if (level >= 5) return "uncommon";
  return "common";
}
