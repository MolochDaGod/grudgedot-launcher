/**
 * Leaderboard Routes
 *
 * Global leaderboard system that works across all Grudge games.
 * Scores are proxied to api.grudge-studio.com for persistence.
 * Falls back to in-memory cache when backend is unavailable.
 *
 * Endpoints:
 *   POST /api/leaderboard/submit   — Submit a score
 *   GET  /api/leaderboard/:game    — Get top scores for a game
 *   GET  /api/leaderboard/player/:grudgeId — Get a player's scores across all games
 *   GET  /api/leaderboard/global   — Global rankings (all games combined)
 */

import type { Express, Request, Response } from "express";

const BACKEND = process.env.GRUDGE_BACKEND_URL || "https://api.grudge-studio.com";

// ── In-memory cache (fallback when backend is down) ────────────────────────────
interface LeaderboardEntry {
  grudgeId: string;
  username: string;
  game: string;
  score: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const _cache = new Map<string, LeaderboardEntry[]>();
const MAX_PER_GAME = 100;

function getCachedBoard(game: string): LeaderboardEntry[] {
  if (!_cache.has(game)) _cache.set(game, []);
  return _cache.get(game)!;
}

function insertScore(entry: LeaderboardEntry): void {
  const board = getCachedBoard(entry.game);
  board.push(entry);
  board.sort((a, b) => b.score - a.score);
  if (board.length > MAX_PER_GAME) board.length = MAX_PER_GAME;
}

// ── Try backend, fallback to cache ─────────────────────────────────────────────
async function tryBackend(method: string, path: string, body?: unknown): Promise<{ ok: boolean; data: any; status: number }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const opts: RequestInit = { method, headers };
    if (body && method !== "GET") opts.body = JSON.stringify(body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${BACKEND}${path}`, { ...opts, signal: controller.signal });
    clearTimeout(timeout);

    const data = await res.json();
    return { ok: res.ok, data, status: res.status };
  } catch {
    return { ok: false, data: null, status: 0 };
  }
}

export function registerLeaderboardRoutes(app: Express) {
  // ── Submit score ─────────────────────────────────────────────────────────
  app.post("/api/leaderboard/submit", async (req: Request, res: Response) => {
    const { grudgeId, username, game, score, metadata } = req.body;

    if (!grudgeId || !game || score == null) {
      return res.status(400).json({ error: "grudgeId, game, and score are required" });
    }

    const entry: LeaderboardEntry = {
      grudgeId,
      username: username || "Player",
      game,
      score: Number(score),
      metadata,
      timestamp: new Date().toISOString(),
    };

    // Try backend first
    const backend = await tryBackend("POST", "/leaderboard", entry);
    if (backend.ok) {
      return res.status(201).json(backend.data);
    }

    // Fallback: cache locally
    insertScore(entry);
    res.status(201).json({ success: true, cached: true, entry });
  });

  // ── Get scores for a game ────────────────────────────────────────────────
  app.get("/api/leaderboard/:game", async (req: Request, res: Response) => {
    const { game } = req.params;
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    // Try backend
    const backend = await tryBackend("GET", `/leaderboard/${game}?limit=${limit}`);
    if (backend.ok && Array.isArray(backend.data)) {
      return res.json(backend.data);
    }

    // Fallback: cache
    const board = getCachedBoard(game).slice(0, limit);
    res.json(board);
  });

  // ── Get a player's scores ────────────────────────────────────────────────
  app.get("/api/leaderboard/player/:grudgeId", async (req: Request, res: Response) => {
    const { grudgeId } = req.params;

    const backend = await tryBackend("GET", `/leaderboard/player/${grudgeId}`);
    if (backend.ok) {
      return res.json(backend.data);
    }

    // Fallback: scan cache
    const results: LeaderboardEntry[] = [];
    for (const [, entries] of _cache) {
      results.push(...entries.filter(e => e.grudgeId === grudgeId));
    }
    results.sort((a, b) => b.score - a.score);
    res.json(results);
  });

  // ── Global rankings (all games) ──────────────────────────────────────────
  app.get("/api/leaderboard/global", async (req: Request, res: Response) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);

    const backend = await tryBackend("GET", `/leaderboard/global?limit=${limit}`);
    if (backend.ok) {
      return res.json(backend.data);
    }

    // Fallback: aggregate cache
    const all: LeaderboardEntry[] = [];
    for (const [, entries] of _cache) {
      all.push(...entries);
    }
    // Group by player, sum scores
    const playerScores = new Map<string, { grudgeId: string; username: string; totalScore: number; games: number }>();
    for (const e of all) {
      const existing = playerScores.get(e.grudgeId);
      if (existing) {
        existing.totalScore += e.score;
        existing.games++;
      } else {
        playerScores.set(e.grudgeId, { grudgeId: e.grudgeId, username: e.username, totalScore: e.score, games: 1 });
      }
    }
    const ranked = Array.from(playerScores.values()).sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);
    res.json(ranked);
  });

  // ── Available games list ─────────────────────────────────────────────────
  app.get("/api/leaderboard/games", async (_req: Request, res: Response) => {
    const games = Array.from(_cache.keys()).map(game => ({
      game,
      entries: _cache.get(game)?.length ?? 0,
      topScore: _cache.get(game)?.[0]?.score ?? 0,
    }));
    res.json(games);
  });

  console.log("✅ Leaderboard routes registered → /api/leaderboard/*");
}
