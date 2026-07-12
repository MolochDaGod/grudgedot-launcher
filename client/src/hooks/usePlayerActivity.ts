/**
 * usePlayerActivity — Tracks player activity across all grudgeDot game tabs.
 *
 * - Records which game was played, when, and with which character
 * - Aggregates cross-game stats (total plays, best scores per game)
 * - Detects resumable sessions (<24h old)
 * - Syncs to backend when authenticated, falls back to localStorage for guests
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiFetch } from '@/lib/grudgeBackendApi';
import { useAuth } from './useAuth';

// ── Types ──

export interface GameActivity {
  gameSlug: string;
  gameName: string;
  lastPlayedAt: string;       // ISO timestamp
  characterId?: string;
  characterName?: string;
  bestScore: number;
  totalPlays: number;
  totalPlaytimeMs: number;
  lastWave?: number;          // for wave-based games
  lastScore?: number;
}

export interface ActivitySummary {
  recentGames: GameActivity[];       // last 3 played, sorted by recency
  allGames: GameActivity[];          // all games with activity
  totalGamesPlayed: number;          // unique game count
  totalSessions: number;             // sum of totalPlays
  totalPlaytimeMs: number;
  resumableGame: GameActivity | null; // most recent if <24h
}

const STORAGE_KEY = 'grudge_player_activity';
const RESUME_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// ── Local storage helpers ──

function loadLocal(): Record<string, GameActivity> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocal(data: Record<string, GameActivity>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* quota exceeded — ignore */ }
}

// ── Hook ──

export function usePlayerActivity() {
  const { isAuthenticated } = useAuth();
  const [activities, setActivities] = useState<Record<string, GameActivity>>(loadLocal);

  // Sync from backend on mount (merge with local)
  const backendQuery = useQuery({
    queryKey: ['grudge', 'player-activity'],
    queryFn: async () => {
      const data = await apiFetch<{ activities: GameActivity[] }>('/api/account/activity');
      return data?.activities ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  // Merge backend data into local state on fetch
  useEffect(() => {
    if (!backendQuery.data?.length) return;
    setActivities(prev => {
      const merged = { ...prev };
      for (const remote of backendQuery.data!) {
        const local = merged[remote.gameSlug];
        if (!local || new Date(remote.lastPlayedAt) > new Date(local.lastPlayedAt)) {
          merged[remote.gameSlug] = {
            ...remote,
            bestScore: Math.max(remote.bestScore, local?.bestScore ?? 0),
            totalPlays: Math.max(remote.totalPlays, local?.totalPlays ?? 0),
            totalPlaytimeMs: Math.max(remote.totalPlaytimeMs, local?.totalPlaytimeMs ?? 0),
          };
        }
      }
      saveLocal(merged);
      return merged;
    });
  }, [backendQuery.data]);

  // Push to backend
  const syncMutation = useMutation({
    mutationFn: async (activity: GameActivity) => {
      return apiFetch('/api/account/activity', {
        method: 'POST',
        body: JSON.stringify(activity),
      });
    },
  });

  // ── Record a game session start ──
  const recordGameStart = useCallback((gameSlug: string, gameName: string, characterId?: string, characterName?: string) => {
    setActivities(prev => {
      const existing = prev[gameSlug] || {
        gameSlug,
        gameName,
        lastPlayedAt: new Date().toISOString(),
        bestScore: 0,
        totalPlays: 0,
        totalPlaytimeMs: 0,
      };

      const updated: GameActivity = {
        ...existing,
        gameName,
        lastPlayedAt: new Date().toISOString(),
        totalPlays: existing.totalPlays + 1,
        characterId,
        characterName,
      };

      const next = { ...prev, [gameSlug]: updated };
      saveLocal(next);

      // Async sync to backend
      if (isAuthenticated) {
        syncMutation.mutate(updated);
      }

      return next;
    });
  }, [isAuthenticated, syncMutation]);

  // ── Record a game session end with score ──
  const recordGameEnd = useCallback((gameSlug: string, score: number, playtimeMs: number, wave?: number) => {
    setActivities(prev => {
      const existing = prev[gameSlug];
      if (!existing) return prev;

      const updated: GameActivity = {
        ...existing,
        lastScore: score,
        bestScore: Math.max(existing.bestScore, score),
        totalPlaytimeMs: existing.totalPlaytimeMs + playtimeMs,
        lastWave: wave ?? existing.lastWave,
      };

      const next = { ...prev, [gameSlug]: updated };
      saveLocal(next);

      if (isAuthenticated) {
        syncMutation.mutate(updated);
      }

      return next;
    });
  }, [isAuthenticated, syncMutation]);

  // ── Get activity for a specific game ──
  const getGameActivity = useCallback((gameSlug: string): GameActivity | null => {
    return activities[gameSlug] ?? null;
  }, [activities]);

  // ── Computed summary ──
  const summary: ActivitySummary = useMemo(() => {
    const allGames = Object.values(activities).sort(
      (a, b) => new Date(b.lastPlayedAt).getTime() - new Date(a.lastPlayedAt).getTime()
    );

    const recentGames = allGames.slice(0, 3);

    const now = Date.now();
    const resumableGame = allGames.length > 0 &&
      (now - new Date(allGames[0].lastPlayedAt).getTime()) < RESUME_THRESHOLD_MS
      ? allGames[0]
      : null;

    return {
      recentGames,
      allGames,
      totalGamesPlayed: allGames.length,
      totalSessions: allGames.reduce((sum, g) => sum + g.totalPlays, 0),
      totalPlaytimeMs: allGames.reduce((sum, g) => sum + g.totalPlaytimeMs, 0),
      resumableGame,
    };
  }, [activities]);

  return {
    activities,
    summary,
    recordGameStart,
    recordGameEnd,
    getGameActivity,
    isLoading: backendQuery.isLoading,
  };
}

/** Format milliseconds to human-readable playtime */
export function formatPlaytime(ms: number): string {
  if (ms < 60_000) return '<1m';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
