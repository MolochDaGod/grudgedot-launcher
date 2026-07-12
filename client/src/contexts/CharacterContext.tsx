/**
 * CharacterContext — Real VPS Character Data
 *
 * Fetches the authenticated user's characters from api.grudge-studio.com.
 * Provides active character selection that persists across all tabs.
 * Syncs with grudge-builder / WCS: same characters, same backend.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { grudgeGameApi, type GrudgeCharacter } from '@/lib/grudgeBackendApi';
import { useAuth } from '@/hooks/useAuth';

// ── Class colors ──────────────────────────────────────────────────────────────
export const CLASS_COLOR: Record<string, string> = {
  warrior: '#d97706',   // amber
  mage:    '#7c3aed',   // purple
  ranger:  '#16a34a',   // green
  worge:   '#0891b2',   // cyan
};

export const CLASS_BG: Record<string, string> = {
  warrior: 'from-amber-900/60 to-amber-950/40 border-amber-700/30',
  mage:    'from-purple-900/60 to-purple-950/40 border-purple-700/30',
  ranger:  'from-green-900/60 to-green-950/40 border-green-700/30',
  worge:   'from-cyan-900/60 to-cyan-950/40 border-cyan-700/30',
};

export const FACTION_COLOR: Record<string, string> = {
  crusade: '#3b82f6',
  legion:  '#dc2626',
  fabled:  '#16a34a',
};

// ── Context types ─────────────────────────────────────────────────────────────
interface CharacterContextValue {
  characters: GrudgeCharacter[];
  activeCharacter: GrudgeCharacter | null;
  setActiveCharacter: (char: GrudgeCharacter) => void;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const CharacterContext = createContext<CharacterContextValue>({
  characters: [],
  activeCharacter: null,
  setActiveCharacter: () => {},
  isLoading: false,
  refetch: async () => {},
});

const STORAGE_KEY = 'grudge_active_char_id';

export function CharacterProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [characters, setCharacters] = useState<GrudgeCharacter[]>([]);
  const [activeCharacter, setActiveCharacterState] = useState<GrudgeCharacter | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadCharacters = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const chars = await grudgeGameApi.listCharacters();
      setCharacters(chars);

      // Restore previously selected character, or default to first
      const savedId = localStorage.getItem(STORAGE_KEY);
      const saved = savedId ? chars.find(c => String(c.id) === savedId) : null;
      setActiveCharacterState(saved || chars[0] || null);
    } catch (err) {
      console.warn('[CharacterContext] fetch failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const setActiveCharacter = useCallback((char: GrudgeCharacter) => {
    setActiveCharacterState(char);
    localStorage.setItem(STORAGE_KEY, String(char.id));
  }, []);

  return (
    <CharacterContext.Provider value={{
      characters,
      activeCharacter,
      setActiveCharacter,
      isLoading,
      refetch: loadCharacters,
    }}>
      {children}
    </CharacterContext.Provider>
  );
}

export function useCharacter() {
  return useContext(CharacterContext);
}

/** Get a short display label for a character: "Ragnar (Orc Warrior · Lv12)" */
export function charLabel(c: GrudgeCharacter): string {
  return `${c.name} — ${c.race} ${c.class} · Lv${c.level}`;
}
