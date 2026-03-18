/**
 * Grudge Studio Backend API Client
 *
 * Typed client for all Grudge backend services, routed through the local
 * Express proxy at /api/grudge/* to avoid CORS issues.
 *
 * All calls include the Grudge JWT from localStorage automatically.
 * If the backend is unreachable, methods return null / empty arrays gracefully.
 */

// ── Base URL — proxy routes defined in server/routes/grudgeProxy.ts ──
const GAME    = '/api/grudge/game';    // → api.grudgestudio.com
const ACCOUNT = '/api/grudge/account'; // → account.grudgestudio.com
const ID      = '/api/grudge/id';      // → id.grudgestudio.com
const LAUNCHER = '/api/grudge/launcher'; // → launcher.grudgestudio.com

// ── Auth helper ──
export function getToken(): string | null {
  return localStorage.getItem('grudge_auth_token');
}

export function authHeaders(): Record<string, string> {
  const token = getToken();
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/** Generic fetch wrapper with auth + error handling. Returns null on failure. */
export async function apiFetch<T = any>(
  url: string,
  opts: RequestInit = {},
): Promise<T | null> {
  try {
    const res = await fetch(url, {
      ...opts,
      headers: { ...authHeaders(), ...(opts.headers as Record<string, string> || {}) },
    });
    if (res.status === 401) {
      // Token expired — let auth layer handle redirect
      console.warn('[grudgeApi] 401 — token may be expired');
      return null;
    }
    if (!res.ok) {
      console.warn(`[grudgeApi] ${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) return res.json();
    return null;
  } catch (err: any) {
    console.warn(`[grudgeApi] fetch error (${url}):`, err.message);
    return null;
  }
}

/** Same as apiFetch but returns an empty array on failure. */
export async function apiFetchList<T = any>(url: string, opts?: RequestInit): Promise<T[]> {
  const data = await apiFetch<T[]>(url, opts);
  return Array.isArray(data) ? data : [];
}

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export interface GrudgeCharacter {
  id: number;
  grudge_id: string;
  name: string;
  race: string;
  class: string;
  faction?: string;
  level: number;
  xp: number;
  gold: number;
  health: number;
  max_health: number;
  island?: string;
  created_at: string;
}

export interface GrudgeFaction {
  name: string;
  description: string;
  color: string;
  leader?: string;
  total_xp: number;
  member_count: number;
}

export interface GrudgeMission {
  id: number;
  grudge_id: string;
  char_id: number;
  title: string;
  type: 'harvesting' | 'fighting' | 'sailing' | 'competing';
  description?: string;
  reward_gold: number;
  reward_xp: number;
  status: 'active' | 'completed' | 'failed';
  created_at: string;
}

export interface GrudgeCrew {
  id: number;
  name: string;
  faction?: string;
  captain_grudge_id: string;
  island?: string;
  member_count: number;
  created_at: string;
}

export interface GrudgeInventoryItem {
  id: number;
  char_id: number;
  item_type: string;
  item_key: string;
  tier: number;
  slot?: string;
  equipped: boolean;
  metadata?: Record<string, any>;
}

export interface GrudgeProfession {
  profession: string;
  level: number;
  xp: number;
  tier: number;
  next_milestone: number;
}

export interface GrudgeGouldstone {
  id: number;
  grudge_id: string;
  name: string;
  source_char_id: number;
  behavior_profile: string;
  deployed_island?: string;
  stats: Record<string, any>;
}

export interface GrudgeProfile {
  grudge_id: string;
  username: string;
  bio?: string;
  avatar_url?: string;
  social_links?: Record<string, string>;
  country?: string;
  created_at: string;
}

export interface GrudgeFriend {
  id: number;
  grudge_id: string;
  friend_grudge_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  username?: string;
}

export interface GrudgeNotification {
  id: number;
  grudge_id: string;
  type: string;
  payload?: Record<string, any>;
  read: boolean;
  created_at: string;
}

export interface GrudgeAchievementDef {
  key: string;
  name: string;
  description: string;
  icon?: string;
  points: number;
  category: string;
}

export interface GrudgePlayerAchievement {
  achievement_key: string;
  earned_at: string;
}

export interface GrudgeIsland {
  id: number;
  name: string;
  type: string;
  faction?: string;
  description?: string;
  level_range?: string;
}

export interface GrudgePvPMatch {
  id: number;
  status: string;
  winner_grudge_id?: string;
  participants: any[];
}

export interface GrudgeDungeonRun {
  id: number;
  char_id: number;
  dungeon_key: string;
  status: string;
  floor: number;
  loot: any[];
}

export interface GrudgeCraftingRecipe {
  id: number;
  result_key: string;
  result_type: string;
  materials: Array<{ item_key: string; quantity: number }>;
  profession?: string;
  min_level: number;
}

// AI types
export interface AICodeReview {
  review: string;
  suggestions: string[];
  severity: string;
  provider: string;
  model: string;
}

export interface AIGeneratedCode {
  code: string;
  explanation: string;
  provider: string;
  model: string;
}

export interface AILore {
  title: string;
  content: string;
  tags: string[];
  provider: string;
  model: string;
}

export interface AIBalanceAnalysis {
  analysis: string;
  suggestions: string[];
  data_points: any;
  provider: string;
  model: string;
}

export interface AICompanionDialogue {
  dialogue: string;
  action_hint: string;
  emote: string;
  context: string;
  source: 'llm' | 'fallback';
}

export interface AIGeneratedMission {
  title: string;
  type: string;
  description: string;
  reward_gold: number;
  reward_xp: number;
  difficulty: number;
}

// ════════════════════════════════════════════════════════════════
// GAME API CLIENT — api.grudgestudio.com
// ════════════════════════════════════════════════════════════════

export const grudgeGameApi = {
  // ── Characters ──
  async listCharacters(): Promise<GrudgeCharacter[]> {
    return apiFetchList(`${GAME}/characters`);
  },
  async getCharacter(id: number): Promise<GrudgeCharacter | null> {
    return apiFetch(`${GAME}/characters/${id}`);
  },
  async createCharacter(data: { name: string; race: string; class: string }): Promise<GrudgeCharacter | null> {
    return apiFetch(`${GAME}/characters`, { method: 'POST', body: JSON.stringify(data) });
  },
  async deleteCharacter(id: number): Promise<boolean> {
    return (await apiFetch(`${GAME}/characters/${id}`, { method: 'DELETE' })) !== null;
  },

  // ── Factions ──
  async listFactions(): Promise<GrudgeFaction[]> {
    return apiFetchList(`${GAME}/factions/list`);
  },
  async getFaction(name: string): Promise<GrudgeFaction | null> {
    return apiFetch(`${GAME}/factions/${encodeURIComponent(name)}`);
  },
  async joinFaction(name: string): Promise<any> {
    return apiFetch(`${GAME}/factions/${encodeURIComponent(name)}/join`, { method: 'POST' });
  },
  async factionLeaderboard(): Promise<GrudgeFaction[]> {
    return apiFetchList(`${GAME}/factions/leaderboard`);
  },

  // ── Missions ──
  async listMissions(): Promise<GrudgeMission[]> {
    return apiFetchList(`${GAME}/missions`);
  },
  async createMission(data: { title: string; type: string; char_id: number }): Promise<GrudgeMission | null> {
    return apiFetch(`${GAME}/missions`, { method: 'POST', body: JSON.stringify(data) });
  },
  async completeMission(id: number): Promise<any> {
    return apiFetch(`${GAME}/missions/${id}/complete`, { method: 'PATCH' });
  },
  async failMission(id: number): Promise<any> {
    return apiFetch(`${GAME}/missions/${id}/fail`, { method: 'PATCH' });
  },

  // ── Crews ──
  async listCrews(): Promise<GrudgeCrew[]> {
    return apiFetchList(`${GAME}/crews`);
  },
  async getCrew(id: number): Promise<GrudgeCrew | null> {
    return apiFetch(`${GAME}/crews/${id}`);
  },
  async createCrew(data: { name: string; faction?: string }): Promise<GrudgeCrew | null> {
    return apiFetch(`${GAME}/crews`, { method: 'POST', body: JSON.stringify(data) });
  },
  async joinCrew(id: number): Promise<any> {
    return apiFetch(`${GAME}/crews/${id}/join`, { method: 'POST' });
  },
  async leaveCrew(id: number): Promise<any> {
    return apiFetch(`${GAME}/crews/${id}/leave`, { method: 'DELETE' });
  },
  async claimBase(id: number, island: string): Promise<any> {
    return apiFetch(`${GAME}/crews/${id}/claim-base`, { method: 'PATCH', body: JSON.stringify({ island }) });
  },

  // ── Inventory ──
  async listInventory(charId?: number): Promise<GrudgeInventoryItem[]> {
    const q = charId ? `?char_id=${charId}` : '';
    return apiFetchList(`${GAME}/inventory${q}`);
  },
  async addItem(data: { char_id: number; item_type: string; item_key: string; tier?: number; slot?: string }): Promise<GrudgeInventoryItem | null> {
    return apiFetch(`${GAME}/inventory`, { method: 'POST', body: JSON.stringify(data) });
  },
  async equipItem(id: number): Promise<any> {
    return apiFetch(`${GAME}/inventory/${id}/equip`, { method: 'PATCH' });
  },
  async unequipItem(id: number): Promise<any> {
    return apiFetch(`${GAME}/inventory/${id}/unequip`, { method: 'PATCH' });
  },
  async removeItem(id: number): Promise<boolean> {
    return (await apiFetch(`${GAME}/inventory/${id}`, { method: 'DELETE' })) !== null;
  },

  // ── Professions ──
  async getProfessions(charId: number): Promise<GrudgeProfession[]> {
    return apiFetchList(`${GAME}/professions/${charId}`);
  },
  async addProfessionXP(charId: number, profession: string, xp: number): Promise<any> {
    return apiFetch(`${GAME}/professions/${charId}/xp`, { method: 'POST', body: JSON.stringify({ profession, xp }) });
  },

  // ── Gouldstones ──
  async listGouldstones(): Promise<GrudgeGouldstone[]> {
    return apiFetchList(`${GAME}/gouldstones`);
  },
  async cloneGouldstone(charId: number, name?: string): Promise<GrudgeGouldstone | null> {
    return apiFetch(`${GAME}/gouldstones/clone`, { method: 'POST', body: JSON.stringify({ char_id: charId, name }) });
  },
  async setGouldBehavior(id: number, behavior: string): Promise<any> {
    return apiFetch(`${GAME}/gouldstones/${id}/behavior`, { method: 'PATCH', body: JSON.stringify({ behavior_profile: behavior }) });
  },
  async deployGouldstone(id: number, island: string): Promise<any> {
    return apiFetch(`${GAME}/gouldstones/${id}/deploy`, { method: 'PATCH', body: JSON.stringify({ island }) });
  },
  async recallGouldstone(id: number): Promise<any> {
    return apiFetch(`${GAME}/gouldstones/${id}/recall`, { method: 'PATCH' });
  },

  // ── Economy ──
  async getEconomy(): Promise<any> {
    return apiFetch(`${GAME}/economy`);
  },

  // ── Crafting ──
  async listRecipes(): Promise<GrudgeCraftingRecipe[]> {
    return apiFetchList(`${GAME}/crafting`);
  },
  async craft(recipeId: number, charId: number): Promise<any> {
    return apiFetch(`${GAME}/crafting/${recipeId}/craft`, { method: 'POST', body: JSON.stringify({ char_id: charId }) });
  },

  // ── Combat ──
  async getCombatLog(charId: number): Promise<any[]> {
    return apiFetchList(`${GAME}/combat?char_id=${charId}`);
  },

  // ── Islands ──
  async listIslands(): Promise<GrudgeIsland[]> {
    return apiFetchList(`${GAME}/islands`);
  },

  // ── PvP ──
  async getPvPQueue(): Promise<any> {
    return apiFetch(`${GAME}/pvp/queue`);
  },
  async joinPvPQueue(charId: number): Promise<any> {
    return apiFetch(`${GAME}/pvp/queue`, { method: 'POST', body: JSON.stringify({ char_id: charId }) });
  },
  async getPvPLeaderboard(): Promise<any[]> {
    return apiFetchList(`${GAME}/pvp/leaderboard`);
  },

  // ── Dungeon ──
  async startDungeon(charId: number, dungeonKey: string): Promise<GrudgeDungeonRun | null> {
    return apiFetch(`${GAME}/dungeon`, { method: 'POST', body: JSON.stringify({ char_id: charId, dungeon_key: dungeonKey }) });
  },
  async getDungeonRun(id: number): Promise<GrudgeDungeonRun | null> {
    return apiFetch(`${GAME}/dungeon/${id}`);
  },

  // ── AI ──
  async aiCodeReview(code: string, language?: string, focus?: string): Promise<AICodeReview | null> {
    return apiFetch(`${GAME}/ai/dev/review`, { method: 'POST', body: JSON.stringify({ code, language, focus }) });
  },
  async aiCodeGenerate(description: string, language?: string, framework?: string): Promise<AIGeneratedCode | null> {
    return apiFetch(`${GAME}/ai/dev/generate`, { method: 'POST', body: JSON.stringify({ description, language, framework }) });
  },
  async aiBalanceAnalyze(area: string, context?: string): Promise<AIBalanceAnalysis | null> {
    return apiFetch(`${GAME}/ai/balance/analyze`, { method: 'POST', body: JSON.stringify({ area, context }) });
  },
  async aiLoreGenerate(type: string, context: string, tone?: string): Promise<AILore | null> {
    return apiFetch(`${GAME}/ai/lore/generate`, { method: 'POST', body: JSON.stringify({ type, context, tone }) });
  },
  async aiArtPrompt(description: string, engine: string, style?: string): Promise<any> {
    return apiFetch(`${GAME}/ai/art/prompt`, { method: 'POST', body: JSON.stringify({ description, engine, style }) });
  },
  async aiGenerateMission(grudgeId: string, faction: string, level: number): Promise<AIGeneratedMission[]> {
    return apiFetchList(`${GAME}/ai/mission/generate`, {
      method: 'POST', body: JSON.stringify({ grudge_id: grudgeId, faction, level, useLLM: true }),
    });
  },
  async aiCompanionInteract(data: {
    class: string; style?: string; faction?: string;
    situation: string; context?: string; player_name?: string;
  }): Promise<AICompanionDialogue | null> {
    return apiFetch(`${GAME}/ai/companion/interact`, { method: 'POST', body: JSON.stringify(data) });
  },
  async aiGameContext(): Promise<any> {
    return apiFetch(`${GAME}/ai/context`, { method: 'GET' });
  },
  async aiLLMStatus(): Promise<any> {
    return apiFetch(`${GAME}/ai/llm/status`, { method: 'GET' });
  },
  async aiFactionIntel(): Promise<any> {
    return apiFetch(`${GAME}/ai/faction/intel`, { method: 'GET' });
  },
};

// ════════════════════════════════════════════════════════════════
// ACCOUNT API CLIENT — account.grudgestudio.com
// ════════════════════════════════════════════════════════════════

export const grudgeAccountApi = {
  // ── Profile ──
  async getProfile(grudgeId: string): Promise<GrudgeProfile | null> {
    return apiFetch(`${ACCOUNT}/profile/${grudgeId}`);
  },
  async updateProfile(grudgeId: string, data: { bio?: string; social_links?: Record<string, string>; country?: string }): Promise<any> {
    return apiFetch(`${ACCOUNT}/profile/${grudgeId}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  // ── Friends ──
  async listFriends(): Promise<GrudgeFriend[]> {
    return apiFetchList(`${ACCOUNT}/friends`);
  },
  async sendFriendRequest(grudgeId: string): Promise<any> {
    return apiFetch(`${ACCOUNT}/friends/request`, { method: 'POST', body: JSON.stringify({ grudge_id: grudgeId }) });
  },
  async respondFriend(id: number, action: 'accept' | 'decline' | 'block'): Promise<any> {
    return apiFetch(`${ACCOUNT}/friends/${id}`, { method: 'PATCH', body: JSON.stringify({ action }) });
  },
  async removeFriend(grudgeId: string): Promise<boolean> {
    return (await apiFetch(`${ACCOUNT}/friends/${grudgeId}`, { method: 'DELETE' })) !== null;
  },

  // ── Notifications ──
  async listNotifications(unreadOnly = false): Promise<GrudgeNotification[]> {
    const q = unreadOnly ? '?unread=1' : '';
    return apiFetchList(`${ACCOUNT}/notifications${q}`);
  },
  async markRead(id: number): Promise<any> {
    return apiFetch(`${ACCOUNT}/notifications/${id}/read`, { method: 'PATCH' });
  },
  async markAllRead(): Promise<any> {
    return apiFetch(`${ACCOUNT}/notifications/read-all`, { method: 'PATCH' });
  },

  // ── Achievements ──
  async getAchievementDefs(): Promise<GrudgeAchievementDef[]> {
    return apiFetchList(`${ACCOUNT}/achievements/defs`);
  },
  async getMyAchievements(): Promise<{ achievements: GrudgePlayerAchievement[]; total_points: number } | null> {
    return apiFetch(`${ACCOUNT}/achievements/mine`);
  },
  async getUserAchievements(grudgeId: string): Promise<{ achievements: GrudgePlayerAchievement[]; total_points: number } | null> {
    return apiFetch(`${ACCOUNT}/achievements/${grudgeId}`);
  },

  // ── Sessions ──
  async listSessions(): Promise<any[]> {
    return apiFetchList(`${ACCOUNT}/sessions`);
  },
  async renameSession(computerId: string, label: string): Promise<any> {
    return apiFetch(`${ACCOUNT}/sessions/${computerId}/label`, { method: 'PATCH', body: JSON.stringify({ label }) });
  },
  async revokeSession(computerId: string): Promise<boolean> {
    return (await apiFetch(`${ACCOUNT}/sessions/${computerId}`, { method: 'DELETE' })) !== null;
  },

  // ── Puter Cloud ──
  async getPuterLink(): Promise<any> {
    return apiFetch(`${ACCOUNT}/puter/link`, { method: 'GET' });
  },
};

// ════════════════════════════════════════════════════════════════
// IDENTITY API CLIENT — id.grudgestudio.com
// ════════════════════════════════════════════════════════════════

export const grudgeIdApi = {
  async getMe(): Promise<any> {
    return apiFetch(`${ID}/identity/me`, { method: 'GET' });
  },
  async updateMe(data: { username?: string; faction?: string; race?: string; class?: string }): Promise<any> {
    return apiFetch(`${ID}/identity/me`, { method: 'PATCH', body: JSON.stringify(data) });
  },
};

// ════════════════════════════════════════════════════════════════
// LAUNCHER API CLIENT — launcher.grudgestudio.com
// ════════════════════════════════════════════════════════════════

export const grudgeLauncherApi = {
  async getManifest(channel = 'stable'): Promise<any> {
    return apiFetch(`${LAUNCHER}/manifest?channel=${channel}`, { method: 'GET' });
  },
  async getEntitlement(): Promise<any> {
    return apiFetch(`${LAUNCHER}/entitlement`, { method: 'GET' });
  },
  async getVersionHistory(): Promise<any[]> {
    return apiFetchList(`${LAUNCHER}/manifest/history`, { method: 'GET' });
  },
};

// ════════════════════════════════════════════════════════════════
// COMBINED EXPORT
// ════════════════════════════════════════════════════════════════

const grudgeApi = {
  game: grudgeGameApi,
  account: grudgeAccountApi,
  id: grudgeIdApi,
  launcher: grudgeLauncherApi,
};

export default grudgeApi;
