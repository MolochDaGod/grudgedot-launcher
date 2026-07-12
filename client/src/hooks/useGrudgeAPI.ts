/**
 * useGrudgeAPI — Extended React Query hooks for Warlord Suite pages.
 *
 * Builds on grudgeBackendApi + useGrudgePlayer. Adds crafting queue,
 * crafting recipes, game-data categories, and mutation hooks.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  grudgeGameApi,
  apiFetch,
  type GrudgeCharacter,
  type GrudgeInventoryItem,
} from "@/lib/grudgeBackendApi";

const GAME = '/api/grudge/game';

// ── Crafting Queue Item ──
export interface CraftingQueueItem {
  id: number;
  recipe_key: string;
  recipe_name: string;
  output_item_key: string;
  output_item_type: string;
  output_tier: number;
  status: 'queued' | 'complete' | 'cancelled';
  started_at: string;
  completes_at: string;
  is_ready: boolean;
  time_left_s: number;
}

// ── Crafting Recipe (from backend) ──
export interface BackendCraftingRecipe {
  recipe_key: string;
  name: string;
  class_restriction: string | null;
  required_profession: string | null;
  required_level: number;
  cost_gold: number;
  craft_time_seconds: number;
  output_item_type: string;
  output_item_key: string;
  output_tier: number;
}

// ═════════════════════════════════════════════════
// QUERY HOOKS
// ═════════════════════════════════════════════════

/** Fetch crafting recipes filtered by class/profession/tier */
export function useCraftingRecipes(classId?: string, profession?: string, tier?: number) {
  const { isAuthenticated } = useAuth();
  return useQuery<BackendCraftingRecipe[]>({
    queryKey: ['grudge', 'crafting-recipes', classId, profession, tier],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (classId) params.set('class', classId);
      if (profession) params.set('profession', profession);
      if (tier) params.set('tier', String(tier));
      const url = `${GAME}/crafting/recipes${params.toString() ? '?' + params : ''}`;
      const data = await apiFetch<BackendCraftingRecipe[]>(url);
      return data || [];
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });
}

/** Fetch crafting queue for a character */
export function useCraftingQueue(charId?: number) {
  const { isAuthenticated } = useAuth();
  return useQuery<CraftingQueueItem[]>({
    queryKey: ['grudge', 'crafting-queue', charId],
    queryFn: async () => {
      const data = await apiFetch<CraftingQueueItem[]>(`${GAME}/crafting/queue?char_id=${charId}`);
      return data || [];
    },
    enabled: isAuthenticated && !!charId,
    staleTime: 10_000, // refresh often for timers
    refetchInterval: 15_000,
  });
}

/** Fetch public game-data from ObjectStore (weapons, armor, skills, etc.) */
export function useGameData<T = any>(category: string) {
  return useQuery<T | null>({
    queryKey: ['grudge', 'game-data', category],
    queryFn: async () => {
      const data = await apiFetch<{ success: boolean; data: T }>(`${GAME.replace('/game', '')}/game-data/${category}`);
      return data?.data || null;
    },
    staleTime: 10 * 60_000,
  });
}

// ═════════════════════════════════════════════════
// MUTATION HOOKS
// ═════════════════════════════════════════════════

/** Create a new character */
export function useCreateCharacter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; raceId: string; classId: string }) =>
      grudgeGameApi.createCharacter(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grudge', 'characters'] }),
  });
}

/** Equip an inventory item */
export function useEquipItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, equipped, slot }: { itemId: number; equipped: boolean; slot?: string }) =>
      apiFetch(`${GAME}/inventory/${itemId}/equip`, {
        method: 'PATCH',
        body: JSON.stringify({ equipped, slot }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grudge', 'inventory'] }),
  });
}

/** Start a craft */
export function useStartCraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ charId, recipeKey }: { charId: number; recipeKey: string }) =>
      apiFetch(`${GAME}/crafting/start`, {
        method: 'POST',
        body: JSON.stringify({ char_id: charId, recipe_key: recipeKey }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grudge', 'crafting-queue'] });
      qc.invalidateQueries({ queryKey: ['grudge', 'characters'] }); // gold changed
    },
  });
}

/** Complete a ready craft */
export function useCompleteCraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (craftId: number) =>
      apiFetch(`${GAME}/crafting/${craftId}/complete`, { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grudge', 'crafting-queue'] });
      qc.invalidateQueries({ queryKey: ['grudge', 'inventory'] });
    },
  });
}

/** Add profession XP */
export function useAddProfessionXP() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ charId, profession, xp }: { charId: number; profession: string; xp: number }) =>
      grudgeGameApi.addProfessionXP(charId, profession, xp),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grudge', 'professions'] }),
  });
}

/** Update character stats */
export function useUpdateCharacterStats() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ charId, stats }: { charId: number; stats: Record<string, number> }) =>
      apiFetch(`${GAME}/characters/${charId}/stats`, {
        method: 'PATCH',
        body: JSON.stringify(stats),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['grudge', 'characters'] }),
  });
}
