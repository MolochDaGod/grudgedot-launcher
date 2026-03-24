/**
 * ============================================================================
 * GRUDGE ENGINE — Elo Rating System
 * ============================================================================
 * Ported from Online-Multiplayer-Game arena 1v1 system.
 *
 * WoW-style Elo with K_FACTOR=32:
 *   expectedScore = 1/(1+10^((opponentRating-myRating)/400))
 *
 * Ranks: Gladiator 2400+ | Duelist 2200+ | Rival 2000+ |
 *        Challenger 1800+ | Combatant 1600+ | Unranked <1600
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const K_FACTOR = 32;
export const DEFAULT_RATING = 1500;

export interface ArenaRank {
  name: string;
  minRating: number;
  color: string;
}

export const ARENA_RANKS: ArenaRank[] = [
  { name: 'Gladiator',  minRating: 2400, color: '#ffd700' },
  { name: 'Duelist',    minRating: 2200, color: '#ff6600' },
  { name: 'Rival',      minRating: 2000, color: '#aa44ff' },
  { name: 'Challenger', minRating: 1800, color: '#4488ff' },
  { name: 'Combatant',  minRating: 1600, color: '#44cc44' },
  { name: 'Unranked',   minRating: 0,    color: '#888888' },
];

// ---------------------------------------------------------------------------
// Rating Calculation
// ---------------------------------------------------------------------------

/** Calculate expected score (probability of winning). */
export function expectedScore(myRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - myRating) / 400));
}

/** Calculate new rating after a match. */
export function calculateNewRating(
  myRating: number,
  opponentRating: number,
  won: boolean,
): { newRating: number; change: number } {
  const expected = expectedScore(myRating, opponentRating);
  const actual = won ? 1 : 0;
  const change = Math.round(K_FACTOR * (actual - expected));
  return {
    newRating: Math.max(0, myRating + change),
    change,
  };
}

/** Get rank name and color for a given rating. */
export function getRank(rating: number): ArenaRank {
  for (const rank of ARENA_RANKS) {
    if (rating >= rank.minRating) return rank;
  }
  return ARENA_RANKS[ARENA_RANKS.length - 1];
}

// ---------------------------------------------------------------------------
// Arena Stats (localStorage-persisted)
// ---------------------------------------------------------------------------

export interface ArenaStats {
  rating: number;
  rank: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  highestRating: number;
  currentStreak: number;
}

const STORAGE_KEY = 'grudge_arena_stats';

export function loadArenaStats(): ArenaStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {
    rating: DEFAULT_RATING,
    rank: 'Unranked',
    wins: 0,
    losses: 0,
    gamesPlayed: 0,
    highestRating: DEFAULT_RATING,
    currentStreak: 0,
  };
}

export function saveArenaStats(stats: ArenaStats): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch { /* ignore */ }
}

/**
 * Process match result and return updated stats.
 */
export function processMatchResult(
  stats: ArenaStats,
  opponentRating: number,
  won: boolean,
): ArenaStats {
  const { newRating, change } = calculateNewRating(stats.rating, opponentRating, won);
  const rank = getRank(newRating);

  const updated: ArenaStats = {
    rating: newRating,
    rank: rank.name,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (won ? 0 : 1),
    gamesPlayed: stats.gamesPlayed + 1,
    highestRating: Math.max(stats.highestRating, newRating),
    currentStreak: won ? stats.currentStreak + 1 : 0,
  };

  saveArenaStats(updated);
  return updated;
}

// ---------------------------------------------------------------------------
// Queue Simulation
// ---------------------------------------------------------------------------

export interface QueuedOpponent {
  name: string;
  rating: number;
  race: string;
  weaponClass: string;
}

const OPPONENT_NAMES = [
  'ShadowBlade', 'IronFist', 'FrostMage', 'DarkKnight', 'StormArcher',
  'HolyPaladin', 'VenomStrike', 'ThunderClap', 'SilentDeath', 'BloodRaven',
  'CrimsonBlade', 'SteelWolf', 'NightStalker', 'FlameWarden', 'IceQueen',
];

const OPPONENT_RACES = ['human', 'barbarian', 'elf', 'dwarf', 'orc', 'undead'];
const OPPONENT_WEAPONS = ['greatsword', 'bow', 'sabres', 'scythe', 'runeblade'];

/**
 * Generate a simulated opponent near the player's rating.
 * Rating varies ±200 from the player's current rating.
 */
export function generateOpponent(playerRating: number): QueuedOpponent {
  const ratingVariance = Math.floor(Math.random() * 400) - 200;
  return {
    name: OPPONENT_NAMES[Math.floor(Math.random() * OPPONENT_NAMES.length)],
    rating: Math.max(800, playerRating + ratingVariance),
    race: OPPONENT_RACES[Math.floor(Math.random() * OPPONENT_RACES.length)],
    weaponClass: OPPONENT_WEAPONS[Math.floor(Math.random() * OPPONENT_WEAPONS.length)],
  };
}

/**
 * Simulate a queue search with a delay (1-4 seconds).
 * Returns a promise that resolves with an opponent.
 */
export function simulateQueueSearch(playerRating: number): Promise<QueuedOpponent> {
  const delay = 1000 + Math.random() * 3000;
  return new Promise((resolve) => {
    setTimeout(() => resolve(generateOpponent(playerRating)), delay);
  });
}
