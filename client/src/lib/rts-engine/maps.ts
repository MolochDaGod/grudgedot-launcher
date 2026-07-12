import type { Island, CreepCamp, UnitType } from './types';

export interface ResourceDef { type: 'tree' | 'goldmine'; pos: { x: number; y: number }; amount?: number; }
export interface UnitDef { faction: 'blue' | 'red'; type: UnitType; pos: { x: number; y: number }; }

export interface MapDef {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  worldW: number;
  worldH: number;
  islands: Omit<Island, never>[];
  blueCastle: { x: number; y: number };
  redCastle: { x: number; y: number };
  startingUnits: UnitDef[];
  resources: ResourceDef[];
  creepCamps: Omit<CreepCamp, 'id'>[];
  startingResources: { gold: number; wood: number };
  aiAttackInterval: number;
  thumbnail: string;
}

export const MAPS: MapDef[] = [
  // ── SKIRMISH (4 islands) — fast WC3 duel ──────────────────────────────────
  {
    id: 'skirmish',
    name: 'Skirmish',
    subtitle: '4-Island Clash',
    description: 'A fast duel. Two contested islands between home bases — creep camps guard the gold mines. First to tier 3 wins.',
    worldW: 3550, worldH: 1100,
    thumbnail: '⚔️',
    islands: [
      { id: 'blue',    x: 80,   y: 80,  w: 860, h: 900, faction: 'blue' },
      { id: 'grudge1', x: 1050, y: 150, w: 640, h: 810, faction: 'neutral' },
      { id: 'grudge2', x: 1800, y: 150, w: 640, h: 810, faction: 'neutral' },
      { id: 'red',     x: 2550, y: 80,  w: 860, h: 900, faction: 'red' },
    ],
    blueCastle: { x: 200, y: 320 },
    redCastle:  { x: 3120, y: 320 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 90,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 380 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 420, y: 450 } },
      { faction: 'blue', type: 'pawn', pos: { x: 300, y: 500 } },
      { faction: 'blue', type: 'pawn', pos: { x: 440, y: 500 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2940, y: 380 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2970, y: 460 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2900, y: 450 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2880, y: 500 } },
      { faction: 'red',  type: 'pawn', pos: { x: 2960, y: 500 } },
    ],
    resources: [
      // Blue island — trees + gold mine
      { type: 'tree', pos: { x: 700, y: 180 } }, { type: 'tree', pos: { x: 780, y: 260 } },
      { type: 'tree', pos: { x: 840, y: 170 } }, { type: 'tree', pos: { x: 660, y: 720 } },
      { type: 'tree', pos: { x: 740, y: 790 } }, { type: 'tree', pos: { x: 800, y: 700 } },
      { type: 'tree', pos: { x: 880, y: 620 } }, { type: 'tree', pos: { x: 910, y: 750 } },
      { type: 'goldmine', pos: { x: 600, y: 500 }, amount: 12500 },
      // Grudge 1 — gold mine + trees
      { type: 'tree', pos: { x: 1110, y: 240 } }, { type: 'tree', pos: { x: 1220, y: 310 } },
      { type: 'tree', pos: { x: 1400, y: 220 } }, { type: 'tree', pos: { x: 1540, y: 300 } },
      { type: 'tree', pos: { x: 1620, y: 800 } },
      { type: 'goldmine', pos: { x: 1350, y: 480 }, amount: 10000 },
      // Grudge 2 — gold mine + trees
      { type: 'tree', pos: { x: 1860, y: 240 } }, { type: 'tree', pos: { x: 1970, y: 310 } },
      { type: 'tree', pos: { x: 2150, y: 220 } }, { type: 'tree', pos: { x: 2300, y: 300 } },
      { type: 'tree', pos: { x: 2380, y: 800 } },
      { type: 'goldmine', pos: { x: 2100, y: 480 }, amount: 10000 },
      // Red island
      { type: 'tree', pos: { x: 2620, y: 180 } }, { type: 'tree', pos: { x: 2700, y: 260 } },
      { type: 'tree', pos: { x: 2640, y: 170 } }, { type: 'tree', pos: { x: 2660, y: 720 } },
      { type: 'tree', pos: { x: 2720, y: 790 } }, { type: 'tree', pos: { x: 2680, y: 700 } },
      { type: 'tree', pos: { x: 2590, y: 620 } }, { type: 'tree', pos: { x: 2610, y: 750 } },
      { type: 'goldmine', pos: { x: 2860, y: 500 }, amount: 12500 },
    ],
    creepCamps: [
      // Grudge 1 — easy camp guarding gold mine
      { pos: { x: 1300, y: 400 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 150, difficulty: 1 },
      // Grudge 1 — hard camp
      { pos: { x: 1400, y: 700 }, creeps: [{ type: 'orc', level: 3 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.6 }, { itemId: 'mana_potion', chance: 1.0 }],
        cleared: false, xpReward: 250, difficulty: 2 },
      // Grudge 2 — easy camp
      { pos: { x: 2050, y: 400 }, creeps: [{ type: 'skeleton', level: 1 }, { type: 'skeleton', level: 1 }, { type: 'skeleton', level: 2 }],
        dropTable: [{ itemId: 'boots_of_speed', chance: 0.4 }, { itemId: 'healing_salve', chance: 1.0 }],
        cleared: false, xpReward: 150, difficulty: 1 },
      // Grudge 2 — hard camp
      { pos: { x: 2200, y: 700 }, creeps: [{ type: 'fireElemental', level: 4 }],
        dropTable: [{ itemId: 'tome_of_power', chance: 0.5 }, { itemId: 'periapt_of_vitality', chance: 0.3 }],
        cleared: false, xpReward: 350, difficulty: 3 },
    ],
  },

  // ── ARCHIPELAGO (6 islands) — WC3-style macro map ─────────────────────────
  {
    id: 'archipelago',
    name: 'Archipelago',
    subtitle: '6-Island War',
    description: 'Six islands with a rich bonus island reachable from the center. Control expansions, clear creep camps, and scale to late game.',
    worldW: 5100, worldH: 2100,
    thumbnail: '🌊',
    islands: [
      { id: 'blue',    x: 80,   y: 100, w: 900, h: 900, faction: 'blue' },
      { id: 'grudge1', x: 1090, y: 200, w: 700, h: 750, faction: 'neutral' },
      { id: 'grudge2', x: 1900, y: 100, w: 960, h: 900, faction: 'neutral' },
      { id: 'grudge3', x: 2970, y: 200, w: 700, h: 750, faction: 'neutral' },
      { id: 'red',     x: 3780, y: 100, w: 900, h: 900, faction: 'red' },
      { id: 'grudge4', x: 1900, y: 1110, w: 960, h: 800, faction: 'neutral' },
    ],
    blueCastle: { x: 230, y: 390 },
    redCastle:  { x: 4350, y: 390 },
    startingResources: { gold: 500, wood: 150 },
    aiAttackInterval: 120,
    startingUnits: [
      { faction: 'blue', type: 'pawn', pos: { x: 410, y: 460 } },
      { faction: 'blue', type: 'pawn', pos: { x: 380, y: 540 } },
      { faction: 'blue', type: 'pawn', pos: { x: 450, y: 540 } },
      { faction: 'blue', type: 'pawn', pos: { x: 350, y: 500 } },
      { faction: 'blue', type: 'pawn', pos: { x: 460, y: 480 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4170, y: 460 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4200, y: 540 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4130, y: 540 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4100, y: 500 } },
      { faction: 'red',  type: 'pawn', pos: { x: 4220, y: 480 } },
    ],
    resources: [
      // Blue island
      { type: 'tree', pos: { x: 750, y: 200 } }, { type: 'tree', pos: { x: 840, y: 290 } },
      { type: 'tree', pos: { x: 900, y: 190 } }, { type: 'tree', pos: { x: 720, y: 800 } },
      { type: 'tree', pos: { x: 800, y: 860 } }, { type: 'tree', pos: { x: 870, y: 780 } },
      { type: 'goldmine', pos: { x: 650, y: 550 }, amount: 12500 },
      // Grudge 1
      { type: 'tree', pos: { x: 1150, y: 290 } }, { type: 'tree', pos: { x: 1280, y: 370 } },
      { type: 'tree', pos: { x: 1450, y: 270 } }, { type: 'tree', pos: { x: 1680, y: 340 } },
      { type: 'goldmine', pos: { x: 1400, y: 580 }, amount: 8000 },
      // Grudge 2 center
      { type: 'tree', pos: { x: 1980, y: 200 } }, { type: 'tree', pos: { x: 2100, y: 300 } },
      { type: 'tree', pos: { x: 2500, y: 250 } }, { type: 'tree', pos: { x: 2800, y: 310 } },
      { type: 'goldmine', pos: { x: 2380, y: 500 }, amount: 10000 },
      // Grudge 3
      { type: 'tree', pos: { x: 3030, y: 290 } }, { type: 'tree', pos: { x: 3160, y: 370 } },
      { type: 'tree', pos: { x: 3330, y: 270 } }, { type: 'tree', pos: { x: 3560, y: 340 } },
      { type: 'goldmine', pos: { x: 3300, y: 580 }, amount: 8000 },
      // Red island
      { type: 'tree', pos: { x: 3840, y: 200 } }, { type: 'tree', pos: { x: 3900, y: 290 } },
      { type: 'tree', pos: { x: 3870, y: 800 } }, { type: 'tree', pos: { x: 3910, y: 860 } },
      { type: 'goldmine', pos: { x: 4100, y: 550 }, amount: 12500 },
      // Grudge 4 bonus island — rich
      { type: 'tree', pos: { x: 1970, y: 1200 } }, { type: 'tree', pos: { x: 2120, y: 1310 } },
      { type: 'tree', pos: { x: 2300, y: 1180 } }, { type: 'tree', pos: { x: 2480, y: 1280 } },
      { type: 'tree', pos: { x: 2640, y: 1210 } }, { type: 'tree', pos: { x: 2780, y: 1320 } },
      { type: 'goldmine', pos: { x: 2380, y: 1500 }, amount: 15000 },
    ],
    creepCamps: [
      // Grudge 1 easy
      { pos: { x: 1350, y: 350 }, creeps: [{ type: 'goblin', level: 1 }, { type: 'goblin', level: 1 }],
        dropTable: [{ itemId: 'healing_salve', chance: 1.0 }], cleared: false, xpReward: 100, difficulty: 1 },
      // Grudge 1 medium
      { pos: { x: 1500, y: 700 }, creeps: [{ type: 'orc', level: 3 }, { type: 'spearGoblin', level: 2 }],
        dropTable: [{ itemId: 'claws_of_attack', chance: 0.5 }], cleared: false, xpReward: 250, difficulty: 2 },
      // Grudge 2 center hard
      { pos: { x: 2300, y: 350 }, creeps: [{ type: 'yeti', level: 5 }, { type: 'orc', level: 3 }],
        dropTable: [{ itemId: 'tome_of_power', chance: 0.6 }, { itemId: 'amulet_of_mana', chance: 0.3 }],
        cleared: false, xpReward: 400, difficulty: 3 },
      // Grudge 3 easy
      { pos: { x: 3200, y: 350 }, creeps: [{ type: 'skeleton', level: 1 }, { type: 'skeleton', level: 1 }],
        dropTable: [{ itemId: 'mana_potion', chance: 1.0 }], cleared: false, xpReward: 100, difficulty: 1 },
      // Grudge 3 medium
      { pos: { x: 3400, y: 700 }, creeps: [{ type: 'desertScorpio', level: 4 }, { type: 'archerGoblin', level: 2 }],
        dropTable: [{ itemId: 'ring_of_protection', chance: 0.5 }], cleared: false, xpReward: 280, difficulty: 2 },
      // Grudge 4 BOSS — Ogre Boss guards rich island
      { pos: { x: 2380, y: 1400 }, creeps: [{ type: 'ogreBoss', level: 8 }, { type: 'orc', level: 4 }, { type: 'orc', level: 4 }],
        dropTable: [{ itemId: 'crown_of_kings', chance: 0.8 }, { itemId: 'orb_of_fire', chance: 0.4 }],
        cleared: false, xpReward: 800, difficulty: 5 },
    ],
  },
];
