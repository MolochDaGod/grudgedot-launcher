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
// GRD-17 AI Legion Core Definitions
// Source: https://github.com/GrudgeDaDev/gruda_grd-17
// ============================================================

export const GRD17_REPO = "https://github.com/GrudgeDaDev/gruda_grd-17";
export const GRD17_DEPLOYMENT_ID = "gruda_ou5krlm6yy8";

/** All GRD-17 AI core model IDs */
export const GRD17_MODELS = {
  /** GRD1.7 Primary Core — System architecture & foundation logic */
  grd17: "grd17",
  /** GRD2.7 Deep Logic — Advanced reasoning & analysis */
  grd27: "grd27",
  /** DANGRD — Chaos engineering & creative disruption */
  dangrd: "dangrd",
  /** GRDVIZ — Visual design & data presentation */
  grdviz: "grdviz",
  /** NoRightAnswerGRD — Paradox resolution & alternative logic */
  norightanswergrd: "norightanswergrd",
  /** GRDSPRINT — Performance optimization & speed enhancement */
  grdsprint: "grdsprint",
  /** ALEofThought — Reasoning chains & thought processes */
  aleofthought: "aleofthought",
  /** ALE — Rapid response & emergency processing */
  ale: "ale",
  /** ALEBOSS — Resource coordination & boss-level oversight */
  aleboss: "aleboss",
} as const;

export type GRD17ModelId = (typeof GRD17_MODELS)[keyof typeof GRD17_MODELS];

/** GRD-17 AI core metadata */
export const GRD17_CORES: Record<GRD17ModelId, {
  realName: string;
  bestAt: string;
  specializations: string[];
}> = {
  grd17: {
    realName: "Gabriel Rodrigo Dominguez (GRD1.7)",
    bestAt: "System Core & Foundation Logic",
    specializations: ["System architecture design", "Foundation logic implementation", "Security protocols"],
  },
  grd27: {
    realName: "Gabriel Rodrigo Dominguez (GRD2.7)",
    bestAt: "Deep Logic & Advanced Reasoning",
    specializations: ["Deep reasoning and analysis", "Complex problem solving", "Multi-step inference"],
  },
  dangrd: {
    realName: "Daniel Antonio (DANGRD)",
    bestAt: "Chaos Engineering & Creative Disruption",
    specializations: ["Chaos theory application", "Creative problem disruption", "Unconventional solutions"],
  },
  grdviz: {
    realName: "Gustavo Ricardo De Viera (GRDVIZ)",
    bestAt: "Visual Design & Data Presentation",
    specializations: ["Advanced visualization techniques", "Data representation", "UI/UX design systems"],
  },
  norightanswergrd: {
    realName: "Nicolás Oscar (NoRightAnswerGRD)",
    bestAt: "Paradox Resolution & Alternative Logic",
    specializations: ["Paradox identification and resolution", "Edge case handling", "Alternative approach generation"],
  },
  grdsprint: {
    realName: "Gerardo Rodriguez (GRDSPRINT)",
    bestAt: "Performance Optimization & Speed Enhancement",
    specializations: ["Performance optimization algorithms", "Speed enhancement systems", "Throughput maximization"],
  },
  aleofthought: {
    realName: "Alejandro Luis Eduardo (ALEofThought)",
    bestAt: "Reasoning Chains & Thought Processes",
    specializations: ["Complex reasoning chain construction", "Thought process modeling", "Logical flow design"],
  },
  ale: {
    realName: "Alejandro Luis Eduardo (ALE)",
    bestAt: "Rapid Response & Emergency Processing",
    specializations: ["Ultra-fast response systems", "Emergency protocol execution", "Crisis management"],
  },
  aleboss: {
    realName: "Alejandro Luis Eduardo (ALEBOSS)",
    bestAt: "Resource Coordination & Boss-Level Oversight",
    specializations: ["Resource allocation", "Multi-agent coordination", "Strategic oversight"],
  },
};

/** GRD-17 Automation API endpoints (routed via Grudge Studio VPS) */
export const GRD17_API = {
  automationStatus: `${GRUDACHAIN_URL}/api/grd17/automation/status`,
  automationEnable: (ruleId: string) => `${GRUDACHAIN_URL}/api/grd17/automation/enable/${ruleId}`,
  automationDisable: (ruleId: string) => `${GRUDACHAIN_URL}/api/grd17/automation/disable/${ruleId}`,
  automationExecute: (ruleId: string) => `${GRUDACHAIN_URL}/api/grd17/automation/execute/${ruleId}`,
  automationTestCondition: `${GRUDACHAIN_URL}/api/grd17/automation/test-condition`,
  nodeStatus: `${GRUDACHAIN_URL}/api/node/status`,
  networkInfo: `${GRUDACHAIN_URL}/api/network/info`,
  miningStats: `${GRUDACHAIN_URL}/api/mining/stats`,
  validatorStatus: `${GRUDACHAIN_URL}/api/validator/status`,
  modelInfo: `${GRUDACHAIN_URL}/api/grd17/model-info`,
  blockchainStats: `${GRUDACHAIN_URL}/api/blockchain/stats`,
  blockchainWalletInfo: `${GRUDACHAIN_URL}/api/blockchain/wallet-info`,
  blockchainCreateWallet: `${GRUDACHAIN_URL}/api/blockchain/create-wallet`,
  blockchainAirdrop: `${GRUDACHAIN_URL}/api/blockchain/airdrop`,
  blockchainMintGbux: `${GRUDACHAIN_URL}/api/blockchain/mint-gbux`,
  blockchainTransfer: `${GRUDACHAIN_URL}/api/blockchain/transfer`,
} as const;

// ============================================================
// Babylon AI Workers (Cloudflare Workers — BabylonJS 9 + Havok specialists)
// Source: D:\GrudgeStudio\babylon-ai-workers
// ============================================================

export const BABYLON_AI_URL = process.env.BABYLON_AI_URL || "https://babylon-ai-workers.grudge.workers.dev";

/** Babylon AI Workers endpoints — domain-specialist RAG over BabylonJS 9 API docs */
export const BABYLON_AI_API = {
  /** Havok Scholar — physics, character controllers, collision, constraints */
  havok: `${BABYLON_AI_URL}/havok`,
  /** Babylon Sage — rendering, materials, animations, terrain, VFX */
  sage: `${BABYLON_AI_URL}/sage`,
  /** Semantic search across all ingested BabylonJS docs */
  search: `${BABYLON_AI_URL}/search`,
  /** Ingest new API docs into the knowledge base */
  learn: `${BABYLON_AI_URL}/learn`,
  /** Health check */
  health: `${BABYLON_AI_URL}/health`,
} as const;

/** Puter.js KV prefixes for GRD-17 data (Grudge account linked) */
export const GRD17_PUTER_KEYS = {
  automationConfig: "grudge_grd17_automation_",
  modelPreference: "grudge_grd17_model_",
  walletData: "grudge_grd17_wallet_",
  nodeConfig: "grudge_grd17_node_",
  lastSync: "grudge_grd17_sync_",
} as const;

/** Puter.js FS paths for GRD-17 data */
export const GRD17_PUTER_FS = {
  base: "/GRUDA/grd17",
  automation: "/GRUDA/grd17/automation",
  wallets: "/GRUDA/grd17/wallets",
  nodeConfig: "/GRUDA/grd17/node",
  models: "/GRUDA/grd17/models",
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
