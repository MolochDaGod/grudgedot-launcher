/**
 * GrudgeGameWrapper — Drop-in wrapper for any game tab.
 *
 * Provides:
 *  - Grudge auth awareness (guest or logged-in)
 *  - Character selector overlay (if logged in with multiple characters)
 *  - Persistent HUD bar with character name, level, gold
 *  - Leaderboard sidebar (toggle with 'L')
 *  - Auto XP/gold rewards on game end
 *  - Score reporting to Grudge backend
 *
 * Usage:
 *   <GrudgeGameWrapper gameSlug="crown-clash" gameName="Crown Clash">
 *     {(session) => <CrownClashInner session={session} />}
 *   </GrudgeGameWrapper>
 */

import { useState, useEffect, type ReactNode } from 'react';
import { useGrudgeGameSession, type GrudgeGameSession, type GameScore } from '@/hooks/useGrudgeGameSession';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, User, Coins, Swords, Star, ChevronDown, X } from 'lucide-react';
import { Link } from 'wouter';

interface GrudgeGameWrapperProps {
  gameSlug: string;
  gameName: string;
  children: (session: GrudgeGameSession) => ReactNode;
  /** XP reward multiplier per 1000 score (default 10) */
  xpPerThousand?: number;
  /** Gold reward per game completion (default 5) */
  goldPerGame?: number;
  /** Hide the top HUD bar */
  hideHud?: boolean;
}

export function GrudgeGameWrapper({
  gameSlug,
  gameName,
  children,
  xpPerThousand = 10,
  goldPerGame = 5,
  hideHud = false,
}: GrudgeGameWrapperProps) {
  const session = useGrudgeGameSession(gameSlug);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showCharPicker, setShowCharPicker] = useState(false);

  // Keyboard shortcut: L = toggle leaderboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'l' || e.key === 'L') {
        // Don't toggle if typing in an input
        if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
        setShowLeaderboard(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* ── Top HUD Bar ── */}
      {!hideHud && (
        <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-3 py-1.5 bg-black/70 backdrop-blur-sm border-b border-white/10 text-xs">
          <div className="flex items-center gap-3">
            <Link href="/games">
              <span className="text-white/40 hover:text-white cursor-pointer">← Games</span>
            </Link>
            <span className="text-amber-400 font-bold uppercase tracking-wider">{gameName}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Character info */}
            {session.character ? (
              <button
                onClick={() => setShowCharPicker(!showCharPicker)}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 transition"
              >
                <User className="w-3 h-3 text-amber-400" />
                <span className="text-white/80">{session.character.name}</span>
                <Badge variant="outline" className="text-[10px] px-1 py-0 border-amber-400/30 text-amber-400">
                  Lv.{session.character.level}
                </Badge>
                <ChevronDown className="w-3 h-3 text-white/30" />
              </button>
            ) : (
              <span className="text-white/40 flex items-center gap-1">
                <User className="w-3 h-3" /> Guest
              </span>
            )}

            {/* Gold */}
            {session.character && (
              <span className="flex items-center gap-1 text-yellow-400">
                <Coins className="w-3 h-3" />
                {session.character.gold ?? 0}
              </span>
            )}

            {/* WCS stats summary */}
            {session.wcsStats && !session.isGuest && (
              <span className="flex items-center gap-1 text-red-400">
                <Swords className="w-3 h-3" />
                {session.wcsStats.physicalDamage}
              </span>
            )}

            {/* Leaderboard toggle */}
            <button
              onClick={() => setShowLeaderboard(!showLeaderboard)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded transition ${
                showLeaderboard ? 'bg-amber-400/20 text-amber-400' : 'bg-white/5 text-white/50 hover:text-white'
              }`}
            >
              <Trophy className="w-3 h-3" />
              <span className="hidden sm:inline">Leaderboard</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Character Picker Dropdown ── */}
      {showCharPicker && session.characters.length > 1 && (
        <div className="absolute top-10 right-4 z-[60] w-56 bg-gray-900/95 border border-white/10 rounded-lg shadow-xl p-2 backdrop-blur-sm">
          <div className="text-xs text-white/40 px-2 pb-1 mb-1 border-b border-white/10">Select Character</div>
          {session.characters.map(c => (
            <button
              key={c.id}
              onClick={() => { session.selectCharacter(c.id); setShowCharPicker(false); }}
              className={`w-full text-left px-2 py-1.5 rounded text-xs flex items-center justify-between transition ${
                c.id === session.character?.id ? 'bg-amber-400/20 text-amber-400' : 'text-white/70 hover:bg-white/5'
              }`}
            >
              <span>{c.name}</span>
              <span className="text-white/30">Lv.{c.level} {c.raceId}/{c.classId}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Leaderboard Sidebar ── */}
      {showLeaderboard && (
        <div className="absolute top-10 right-0 bottom-0 z-[55] w-64 bg-gray-900/95 border-l border-white/10 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
              <Trophy className="w-4 h-4" /> Top Scores
            </span>
            <button onClick={() => setShowLeaderboard(false)} className="text-white/30 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {session.leaderboardLoading ? (
              <div className="text-center text-white/30 text-xs py-8">Loading...</div>
            ) : session.leaderboard.length === 0 ? (
              <div className="text-center text-white/30 text-xs py-8">No scores yet. Be the first!</div>
            ) : (
              session.leaderboard.map((entry, i) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded text-xs ${
                    i === 0 ? 'bg-amber-400/10 border border-amber-400/20' :
                    i === 1 ? 'bg-gray-400/5 border border-gray-400/10' :
                    i === 2 ? 'bg-orange-400/5 border border-orange-400/10' :
                    'bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`font-bold w-5 text-center ${
                      i === 0 ? 'text-amber-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-white/30'
                    }`}>
                      {i + 1}
                    </span>
                    <span className="text-white/80 truncate max-w-[100px]">{entry.username}</span>
                  </div>
                  <span className="text-white/60 font-mono">{entry.score.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Game Content ── */}
      <div className={`w-full h-full ${!hideHud ? 'pt-8' : ''}`}>
        {children(session)}
      </div>
    </div>
  );
}
