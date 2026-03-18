/**
 * useGrudgePlayer — shared hook to load and manage the current player's
 * Grudge backend data (characters, inventory, professions, factions).
 *
 * Used by Featured Games, Warlord Suite, and any page that needs player context.
 */

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import {
  grudgeGameApi,
  grudgeIdApi,
  type GrudgeCharacter,
  type GrudgeFaction,
  type GrudgeInventoryItem,
  type GrudgeProfession,
  type GrudgeGouldstone,
  type GrudgeIsland,
} from "@/lib/grudgeBackendApi";

export interface GrudgePlayerState {
  isAuthenticated: boolean;
  isLoading: boolean;

  // Identity
  grudgeId: string;
  identity: any | null;

  // Characters
  characters: GrudgeCharacter[];
  activeChar: GrudgeCharacter | null;
  setActiveChar: (char: GrudgeCharacter | null) => void;

  // Inventory & professions for active character
  inventory: GrudgeInventoryItem[];
  professions: GrudgeProfession[];

  // World data
  factions: GrudgeFaction[];
  islands: GrudgeIsland[];
  gouldstones: GrudgeGouldstone[];

  // Refetch helpers
  refetchCharacters: () => void;
  refetchInventory: () => void;
}

export function useGrudgePlayer(): GrudgePlayerState {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [activeChar, setActiveChar] = useState<GrudgeCharacter | null>(null);

  // Identity
  const { data: identity } = useQuery({
    queryKey: ["grudge", "identity"],
    queryFn: () => grudgeIdApi.getMe(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  const grudgeId = identity?.grudge_id || identity?.grudgeId || "";

  // Characters
  const {
    data: characters = [],
    isLoading: charsLoading,
    refetch: refetchCharacters,
  } = useQuery<GrudgeCharacter[]>({
    queryKey: ["grudge", "characters"],
    queryFn: () => grudgeGameApi.listCharacters(),
    enabled: isAuthenticated,
    staleTime: 2 * 60_000,
  });

  // Auto-select first character
  useEffect(() => {
    if (characters.length > 0 && !activeChar) {
      setActiveChar(characters[0]);
    }
  }, [characters, activeChar]);

  // Inventory for active character
  const { data: inventory = [], refetch: refetchInventory } = useQuery<
    GrudgeInventoryItem[]
  >({
    queryKey: ["grudge", "inventory", activeChar?.id],
    queryFn: () => grudgeGameApi.listInventory(activeChar!.id),
    enabled: !!activeChar,
    staleTime: 60_000,
  });

  // Professions for active character
  const { data: professions = [] } = useQuery<GrudgeProfession[]>({
    queryKey: ["grudge", "professions", activeChar?.id],
    queryFn: () => grudgeGameApi.getProfessions(activeChar!.id),
    enabled: !!activeChar,
    staleTime: 60_000,
  });

  // World data
  const { data: factions = [] } = useQuery<GrudgeFaction[]>({
    queryKey: ["grudge", "factions"],
    queryFn: () => grudgeGameApi.listFactions(),
    staleTime: 10 * 60_000,
  });

  const { data: islands = [] } = useQuery<GrudgeIsland[]>({
    queryKey: ["grudge", "islands"],
    queryFn: () => grudgeGameApi.listIslands(),
    staleTime: 10 * 60_000,
  });

  const { data: gouldstones = [] } = useQuery<GrudgeGouldstone[]>({
    queryKey: ["grudge", "gouldstones"],
    queryFn: () => grudgeGameApi.listGouldstones(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  return {
    isAuthenticated,
    isLoading: authLoading || charsLoading,
    grudgeId,
    identity,
    characters,
    activeChar,
    setActiveChar,
    inventory,
    professions,
    factions,
    islands,
    gouldstones,
    refetchCharacters,
    refetchInventory,
  };
}
