/**
 * Dungeon Crawler API Client
 *
 * Talks to the Grudge Backend game-api service at api.grudge-studio.com
 * for hero data, dungeon runs, match results, and leaderboards.
 *
 * Uses the shared grudge_auth_token from localStorage for auth.
 */

const GAME_API_BASE =
  import.meta.env.VITE_GAME_API_URL || 'https://api.grudge-studio.com';

function getToken(): string | null {
  return localStorage.getItem('grudge_auth_token');
}

async function dungeonFetch<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${GAME_API_BASE}/dungeon${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }

  return res.json();
}

// ── Heroes ────────────────────────────────────────────────────

export async function fetchHeroes() {
  return dungeonFetch<any[]>('/heroes');
}

export async function fetchHero(id: number) {
  return dungeonFetch<any>(`/heroes/${id}`);
}

// ── Abilities ─────────────────────────────────────────────────

export async function fetchAbilities(heroClass: string) {
  return dungeonFetch<any[]>(`/abilities/${encodeURIComponent(heroClass)}`);
}

// ── Items ─────────────────────────────────────────────────────

export async function fetchItems() {
  return dungeonFetch<any[]>('/items');
}

// ── Dungeon Runs ──────────────────────────────────────────────

export interface DungeonRunPayload {
  hero_id: number;
  hero_name: string;
  hero_class: string;
  floors_reached: number;
  kills: number;
  gold_earned: number;
  duration_ms: number;
  outcome: 'cleared' | 'died' | 'abandoned';
  run_data?: any;
}

export async function logDungeonRun(payload: DungeonRunPayload) {
  return dungeonFetch<{ id: number; logged: boolean }>('/runs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchDungeonRuns() {
  return dungeonFetch<any[]>('/runs');
}

// ── MOBA Match Results ────────────────────────────────────────

export interface MatchResultPayload {
  hero: string;
  heroClass: string;
  kills: number;
  deaths: number;
  assists: number;
  duration: number;
  win: boolean;
}

export async function logMatchResult(payload: MatchResultPayload) {
  return dungeonFetch<{ id: number; logged: boolean }>('/results', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchMatchResults() {
  return dungeonFetch<any[]>('/results');
}

// ── Leaderboard ───────────────────────────────────────────────

export async function fetchLeaderboard(type: 'dungeon' | 'moba' = 'dungeon', limit = 10) {
  return dungeonFetch<{ type: string; leaderboard: any[] }>(
    `/leaderboard?type=${type}&limit=${limit}`,
  );
}
