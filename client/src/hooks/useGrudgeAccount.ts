/**
 * useGrudgeAccount — Unified Grudge Studio account hook.
 *
 * Returns the full account from the local `accounts` table
 * (wallet, balances, faction, characters, NFT state, etc.)
 *
 * All pages that need more than basic auth identity should use this
 * instead of mixing useAuth + manual fetches.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getAuthData } from "@/lib/auth";

// ── Account shape (matches server/routes/accountRoutes.ts) ──

export interface GrudgeAccount {
  id: string;
  grudgeId: string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  faction?: string;
  walletAddress?: string;
  walletType?: string;
  crossmintWalletId?: string;
  puterUuid?: string;
  puterUsername?: string;
  isPremium: boolean;
  isGuest: boolean;
  gold: number;
  gbuxBalance: number;
  totalCharacters: number;
  totalIslands: number;
  homeIslandId?: string;
  hasCompletedTutorial: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface GrudgeCharacterLocal {
  id: string;
  accountId: string;
  grudgeId?: string;
  name: string;
  classId?: string;
  raceId?: string;
  profession?: string;
  faction?: string;
  level: number;
  experience: number;
  gold: number;
  skillPoints: number;
  attributePoints: number;
  attributes: Record<string, number>;
  equipment: Record<string, string | null>;
  professionProgression: Record<string, { level: number; xp: number; pointsSpent: number }>;
  inventory: any[];
  abilities: any[];
  skillTree: Record<string, any>;
  currentHealth?: number;
  currentMana?: number;
  currentStamina?: number;
  avatarUrl?: string;
  customization?: Record<string, any> | null;
  isNft: boolean;
  nftMintAddress?: string;
  nftCollection?: string;
  nftMintedAt?: string;
  isActive: boolean;
  slotIndex: number;
  isGuest: boolean;
  createdAt: string;
  updatedAt?: string;
}

// ── Helpers ──

function authHeaders(): Record<string, string> {
  const auth = getAuthData();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (auth?.token) h["Authorization"] = `Bearer ${auth.token}`;
  return h;
}

async function accountFetch<T>(path: string, opts?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(path, { ...opts, headers: { ...authHeaders(), ...(opts?.headers as Record<string, string> || {}) } });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Hook ──

export function useGrudgeAccount() {
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();

  // Account
  const account = useQuery({
    queryKey: ["grudge", "account"],
    queryFn: async () => {
      const data = await accountFetch<{ account: GrudgeAccount }>("/api/account/me");
      return data?.account ?? null;
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  // Characters
  const characters = useQuery({
    queryKey: ["grudge", "account", "characters"],
    queryFn: async () => {
      const data = await accountFetch<{ characters: GrudgeCharacterLocal[] }>("/api/account/characters");
      return data?.characters ?? [];
    },
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  // Create character
  const createCharacter = useMutation({
    mutationFn: async (payload: { name: string; raceId: string; classId: string; faction?: string }) => {
      const res = await fetch("/api/account/characters", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to create character" }));
        throw new Error(err.error || "Failed to create character");
      }
      return res.json() as Promise<{ character: GrudgeCharacterLocal }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grudge", "account", "characters"] });
      qc.invalidateQueries({ queryKey: ["grudge", "account"] });
    },
  });

  // Update character (name, customization, faction, avatarUrl)
  const updateCharacter = useMutation({
    mutationFn: async (payload: { id: string; customization?: any; name?: string; faction?: string; avatarUrl?: string }) => {
      const { id, ...body } = payload;
      const res = await fetch(`/api/account/characters/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Update failed" }));
        throw new Error(err.error || "Update failed");
      }
      return res.json() as Promise<{ character: GrudgeCharacterLocal }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grudge", "account", "characters"] });
    },
  });

  // Delete character
  const deleteCharacter = useMutation({
    mutationFn: async (characterId: string) => {
      const res = await fetch(`/api/account/characters/${characterId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["grudge", "account", "characters"] });
      qc.invalidateQueries({ queryKey: ["grudge", "account"] });
    },
  });

  return {
    account: account.data ?? null,
    accountLoading: account.isLoading,
    hasWallet: !!(account.data?.walletAddress),
    characters: characters.data ?? [],
    charactersLoading: characters.isLoading,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    refetchAccount: account.refetch,
    refetchCharacters: characters.refetch,
  };
}
