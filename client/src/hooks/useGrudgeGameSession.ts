/**
 * useGrudgeGameSession — Drop-in Grudge backend integration for ANY game tab.
 *
 * Combines account loading, character selection, score/XP reporting,
 * leaderboard fetching, and gold rewards into a single hook.
 *
 * Usage in any game page:
 *   const session = useGrudgeGameSession('crown-clash');
 *   // session.character — the active WCS character (or null for guest)
 *   // session.account   — the full Grudge account
 *   // session.reportScore(1500)  — save score + earn XP
 *   // session.addGold(50)        — reward gold
 *   // session.leaderboard        — top scores for this game
 *   // session.isGuest            — true if not logged in
 *   // session.wcsStats           — derived WCS stats for the active character
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGrudgeAccount, type GrudgeCharacterLocal } from './useGrudgeAccount';
import { apiFetch } from '@/lib/grudgeBackendApi';
// `computeDerivedStats` / `WCSHeroAttributes` are not exported by the canonical
// `@shared/wcs` index yet. Local stubs keep this hook compiling and rely on the
// existing `try/catch` fallback to GUEST_STATS at runtime. Restore the real
// import once `shared/wcs/index.ts` re-exports these symbols from
// `attributeSystem`/`gameConstants`.
type WCSHeroAttributes = Record<string, number>;
function computeDerivedStats(_attrs: WCSHeroAttributes, _level: number): Record<string, number> {
  throw new Error('computeDerivedStats not yet exported from @shared/wcs');
}

// ── Types ──

export interface GameScore {
  id: number;
  grudge_id: string;
  username: string;
  game_slug: string;
  score: number;
  wave?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface WCSDerivedStats {
  maxHealth: number;
  maxMana: number;
  maxStamina: number;
  physicalDamage: number;
  magicDamage: number;
  armor: number;
  magicResist: number;
  critChance: number;
  dodgeChance: number;
  attackSpeed: number;
  moveSpeed: number;
  healthRegen: number;
  manaRegen: number;
}

export interface GrudgeGameSession {
  // Account & Character
  account: ReturnType<typeof useGrudgeAccount>['account'];
  accountLoading: boolean;
  characters: GrudgeCharacterLocal[];
  character: GrudgeCharacterLocal | null;
  selectCharacter: (id: string) => void;
  isGuest: boolean;

  // WCS Stats (derived from active character)
  wcsStats: WCSDerivedStats | null;
  rawAttributes: WCSHeroAttributes | null;

  // Scoring
  reportScore: (score: number, meta?: Record<string, any>) => Promise<void>;
  addGold: (amount: number) => Promise<void>;
  addXP: (amount: number) => Promise<void>;

  // Leaderboard
  leaderboard: GameScore[];
  leaderboardLoading: boolean;
  refetchLeaderboard: () => void;

  // Game slug
  gameSlug: string;
}

// ── Default WCS stats for guests ──
const GUEST_STATS: WCSDerivedStats = {
  maxHealth: 100,
  maxMana: 50,
  maxStamina: 100,
  physicalDamage: 10,
  magicDamage: 5,
  armor: 5,
  magicResist: 3,
  critChance: 0.05,
  dodgeChance: 0.03,
  attackSpeed: 1.0,
  moveSpeed: 5.0,
  healthRegen: 1.0,
  manaRegen: 0.5,
};

// ── Hook ──

export function useGrudgeGameSession(gameSlug: string): GrudgeGameSession {
  const {
    account,
    accountLoading,
    characters,
    charactersLoading,
  } = useGrudgeAccount();

  const qc = useQueryClient();
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  // Auto-select first active character
  useEffect(() => {
    if (!selectedCharId && characters.length > 0) {
      const active = characters.find(c => c.isActive) || characters[0];
      setSelectedCharId(active.id);
    }
  }, [characters, selectedCharId]);

  const character = useMemo(
    () => characters.find(c => c.id === selectedCharId) ?? null,
    [characters, selectedCharId]
  );

  const isGuest = !account || account.isGuest;

  // ── Derive WCS stats from character attributes ──
  const { wcsStats, rawAttributes } = useMemo(() => {
    if (!character?.attributes) return { wcsStats: GUEST_STATS, rawAttributes: null };

    const attrs = character.attributes as unknown as WCSHeroAttributes;
    try {
      const derived = computeDerivedStats(attrs, character.level || 1);
      return {
        wcsStats: {
          maxHealth: derived.maxHealth ?? 100,
          maxMana: derived.maxMana ?? 50,
          maxStamina: derived.maxStamina ?? 100,
          physicalDamage: derived.physicalDamage ?? 10,
          magicDamage: derived.magicDamage ?? 5,
          armor: derived.armor ?? 5,
          magicResist: derived.magicResist ?? 3,
          critChance: derived.critChance ?? 0.05,
          dodgeChance: derived.dodgeChance ?? 0.03,
          attackSpeed: derived.attackSpeed ?? 1.0,
          moveSpeed: derived.moveSpeed ?? 5.0,
          healthRegen: derived.healthRegen ?? 1.0,
          manaRegen: derived.manaRegen ?? 0.5,
        },
        rawAttributes: attrs,
      };
    } catch {
      return { wcsStats: GUEST_STATS, rawAttributes: null };
    }
  }, [character]);

  // ── Leaderboard ──
  const leaderboardQuery = useQuery<GameScore[]>({
    queryKey: ['grudge', 'leaderboard', gameSlug],
    queryFn: async () => {
      const data = await apiFetch<{ scores: GameScore[] }>(`/api/games/${gameSlug}/leaderboard`);
      return data?.scores ?? [];
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // ── Report Score ──
  const scoreMutation = useMutation({
    mutationFn: async ({ score, meta }: { score: number; meta?: Record<string, any> }) => {
      return apiFetch(`/api/games/${gameSlug}/scores`, {
        method: 'POST',
        body: JSON.stringify({
          score,
          char_id: character?.id,
          metadata: meta,
        }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grudge', 'leaderboard', gameSlug] });
    },
  });

  const reportScore = useCallback(async (score: number, meta?: Record<string, any>) => {
    if (isGuest) {
      // Guest scores saved to localStorage only
      const key = `${gameSlug}-highscore`;
      const prev = parseInt(localStorage.getItem(key) || '0');
      if (score > prev) localStorage.setItem(key, String(score));
      return;
    }
    await scoreMutation.mutateAsync({ score, meta });
  }, [isGuest, gameSlug, scoreMutation]);

  // ── Add Gold ──
  const addGold = useCallback(async (amount: number) => {
    if (isGuest || !character) return;
    await apiFetch(`/api/grudge/game/characters/${character.id}/gold`, {
      method: 'PATCH',
      body: JSON.stringify({ amount }),
    });
    qc.invalidateQueries({ queryKey: ['grudge', 'account', 'characters'] });
  }, [isGuest, character, qc]);

  // ── Add XP ──
  const addXP = useCallback(async (amount: number) => {
    if (isGuest || !character) return;
    await apiFetch(`/api/grudge/game/characters/${character.id}/xp`, {
      method: 'PATCH',
      body: JSON.stringify({ xp: amount }),
    });
    qc.invalidateQueries({ queryKey: ['grudge', 'account', 'characters'] });
  }, [isGuest, character, qc]);

  return {
    account,
    accountLoading,
    characters,
    character,
    selectCharacter: setSelectedCharId,
    isGuest,
    wcsStats,
    rawAttributes,
    reportScore,
    addGold,
    addXP,
    leaderboard: leaderboardQuery.data ?? [],
    leaderboardLoading: leaderboardQuery.isLoading,
    refetchLeaderboard: leaderboardQuery.refetch,
    gameSlug,
  };
}
