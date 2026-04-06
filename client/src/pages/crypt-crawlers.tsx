import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skull, ArrowLeft, Sword, Shield, Wand2, Footprints } from 'lucide-react';
import { Link } from 'wouter';
// SpriteEffects2DManager removed (Three.js) — 2D effects will be rebuilt
type SpriteEffects2DManager = { spawnAt: (type: string, x: number, y: number, color: string, opts?: any) => void; dispose: () => void };

// ── Tile types ─────────────────────────────────────────────────────

const enum Tile {
  Wall = 0, Floor = 1, Door = 2, LockedDoor = 3, StairsDown = 4,
  Trap = 5, Water = 6, Lava = 7, BreakableWall = 8, Chest = 9, Shrine = 10,
}

const TILE_COLORS: Record<number, string> = {
  [Tile.Wall]: '#1a1a2e', [Tile.Floor]: '#2a2a3a', [Tile.Door]: '#886633',
  [Tile.LockedDoor]: '#cc8833', [Tile.StairsDown]: '#44aa44',
  [Tile.Trap]: '#aa3333', [Tile.Water]: '#224466', [Tile.Lava]: '#cc4400',
  [Tile.BreakableWall]: '#3a3a4e', [Tile.Chest]: '#ccaa33', [Tile.Shrine]: '#9966ff',
};

// ── Seeded RNG ─────────────────────────────────────────────────────

class SeededRNG {
  private s: number;
  constructor(seed: number) { this.s = seed; }
  next(): number {
    this.s = (this.s * 16807 + 0) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  nextInt(min: number, max: number): number { return Math.floor(this.next() * (max - min + 1)) + min; }
}

// ── Dungeon generation ─────────────────────────────────────────────

const MAP_W = 48;
const MAP_H = 36;

interface Room { x: number; y: number; w: number; h: number; type: 'normal' | 'treasure' | 'boss' | 'trap' | 'crypt' }

function generateDungeon(floor: number): { tiles: number[][]; rooms: Room[]; spawnX: number; spawnY: number; stairsX: number; stairsY: number } {
  const rng = new SeededRNG(floor * 7919 + 1337);
  const tiles: number[][] = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(Tile.Wall));
  const rooms: Room[] = [];

  // BSP room generation
  const roomCount = Math.min(6 + floor, 12);
  const minSize = 4, maxSize = Math.min(8 + Math.floor(floor / 3), 12);
  let attempts = 0;

  while (rooms.length < roomCount && attempts < 200) {
    attempts++;
    const rw = rng.nextInt(minSize, maxSize);
    const rh = rng.nextInt(minSize, maxSize);
    const rx = rng.nextInt(2, MAP_W - rw - 2);
    const ry = rng.nextInt(2, MAP_H - rh - 2);

    // Check overlap
    let overlap = false;
    for (const r of rooms) {
      if (rx < r.x + r.w + 2 && rx + rw + 2 > r.x && ry < r.y + r.h + 2 && ry + rh + 2 > r.y) {
        overlap = true; break;
      }
    }
    if (overlap) continue;

    // Assign room type
    let type: Room['type'] = 'normal';
    if (rooms.length === roomCount - 1 && floor % 3 === 0) type = 'boss';
    else if (rng.next() < 0.15) type = 'treasure';
    else if (rng.next() < 0.1 + floor * 0.02) type = 'trap';
    else if (rng.next() < 0.1) type = 'crypt';

    rooms.push({ x: rx, y: ry, w: rw, h: rh, type });

    // Carve room
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        tiles[y][x] = Tile.Floor;
      }
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1], b = rooms[i];
    const ax = Math.floor(a.x + a.w / 2), ay = Math.floor(a.y + a.h / 2);
    const bx = Math.floor(b.x + b.w / 2), by = Math.floor(b.y + b.h / 2);

    let cx = ax, cy = ay;
    while (cx !== bx) {
      if (cy >= 0 && cy < MAP_H && cx >= 0 && cx < MAP_W) {
        tiles[cy][cx] = Tile.Floor;
        // Widen corridor
        if (cy > 0) tiles[cy - 1][cx] = tiles[cy - 1][cx] === Tile.Wall ? Tile.Floor : tiles[cy - 1][cx];
      }
      cx += cx < bx ? 1 : -1;
    }
    while (cy !== by) {
      if (cy >= 0 && cy < MAP_H && cx >= 0 && cx < MAP_W) {
        tiles[cy][cx] = Tile.Floor;
        if (cx > 0) tiles[cy][cx - 1] = tiles[cy][cx - 1] === Tile.Wall ? Tile.Floor : tiles[cy][cx - 1];
      }
      cy += cy < by ? 1 : -1;
    }

    // Add door at corridor entrance
    if (rng.next() < 0.3) {
      const doorX = Math.floor((ax + bx) / 2);
      const doorY = Math.floor((ay + by) / 2);
      if (doorX > 0 && doorX < MAP_W - 1 && doorY > 0 && doorY < MAP_H - 1) {
        tiles[doorY][doorX] = rng.next() < 0.2 ? Tile.LockedDoor : Tile.Door;
      }
    }
  }

  // Cellular automata pass for organic feel
  for (let pass = 0; pass < 2; pass++) {
    const copy = tiles.map(r => [...r]);
    for (let y = 1; y < MAP_H - 1; y++) {
      for (let x = 1; x < MAP_W - 1; x++) {
        if (copy[y][x] !== Tile.Floor) continue;
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          if (copy[y + dy][x + dx] === Tile.Wall) walls++;
        }
        // Fill in isolated floor tiles
        if (walls >= 6) tiles[y][x] = Tile.Wall;
      }
    }
  }

  // Place special tiles in rooms
  for (const room of rooms) {
    if (room.type === 'treasure') {
      const cx = Math.floor(room.x + room.w / 2);
      const cy = Math.floor(room.y + room.h / 2);
      tiles[cy][cx] = Tile.Chest;
    } else if (room.type === 'trap') {
      for (let i = 0; i < Math.min(3 + floor, 6); i++) {
        const tx = rng.nextInt(room.x + 1, room.x + room.w - 2);
        const ty = rng.nextInt(room.y + 1, room.y + room.h - 2);
        if (tiles[ty][tx] === Tile.Floor) tiles[ty][tx] = Tile.Trap;
      }
    } else if (room.type === 'crypt') {
      // Add breakable walls
      for (let i = 0; i < 3; i++) {
        const bx = rng.nextInt(room.x, room.x + room.w - 1);
        const by = rng.nextInt(room.y, room.y + room.h - 1);
        if (tiles[by][bx] === Tile.Floor) tiles[by][bx] = Tile.BreakableWall;
      }
    }
  }

  // Place shrines (1 per 3 floors)
  if (floor % 3 === 2 && rooms.length > 2) {
    const sr = rooms[rng.nextInt(1, rooms.length - 2)];
    const sx = Math.floor(sr.x + sr.w / 2);
    const sy = Math.floor(sr.y + sr.h / 2);
    tiles[sy][sx] = Tile.Shrine;
  }

  // Spawn in first room, stairs in last
  const spawn = rooms[0];
  const stairsRoom = rooms[rooms.length - 1];
  const stairsX = Math.floor(stairsRoom.x + stairsRoom.w / 2);
  const stairsY = Math.floor(stairsRoom.y + stairsRoom.h / 2);
  tiles[stairsY][stairsX] = Tile.StairsDown;

  return {
    tiles, rooms,
    spawnX: Math.floor(spawn.x + spawn.w / 2),
    spawnY: Math.floor(spawn.y + spawn.h / 2),
    stairsX, stairsY,
  };
}

// ── A* Pathfinding ─────────────────────────────────────────────────

function astar(tiles: number[][], sx: number, sy: number, gx: number, gy: number): { x: number; y: number }[] | null {
  if (sx === gx && sy === gy) return [];
  const key = (x: number, y: number) => `${x},${y}`;
  const open: { x: number; y: number; f: number; g: number }[] = [{ x: sx, y: sy, f: 0, g: 0 }];
  const closed = new Set<string>();
  const parent = new Map<string, string>();
  const gScore = new Map<string, number>();
  gScore.set(key(sx, sy), 0);

  while (open.length > 0) {
    open.sort((a, b) => a.f - b.f);
    const cur = open.shift()!;
    const ck = key(cur.x, cur.y);
    if (cur.x === gx && cur.y === gy) {
      const path: { x: number; y: number }[] = [];
      let k = ck;
      while (k !== key(sx, sy)) {
        const [px, py] = k.split(',').map(Number);
        path.unshift({ x: px, y: py });
        k = parent.get(k)!;
      }
      return path;
    }
    closed.add(ck);

    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = cur.x + dx, ny = cur.y + dy;
      if (nx < 0 || nx >= MAP_W || ny < 0 || ny >= MAP_H) continue;
      const t = tiles[ny][nx];
      if (t === Tile.Wall || t === Tile.Lava || t === Tile.LockedDoor) continue;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      const ng = cur.g + 1;
      if (!gScore.has(nk) || ng < gScore.get(nk)!) {
        gScore.set(nk, ng);
        parent.set(nk, ck);
        const h = Math.abs(nx - gx) + Math.abs(ny - gy);
        open.push({ x: nx, y: ny, f: ng + h, g: ng });
      }
    }
  }
  return null;
}

// ── Enemy types ────────────────────────────────────────────────────

type EnemyType = 'skeleton' | 'zombie' | 'mage' | 'boss';
type AIState = 'idle' | 'patrol' | 'chase' | 'attack' | 'flee';

interface Enemy {
  type: EnemyType;
  x: number; y: number;
  health: number; maxHealth: number;
  attack: number; speed: number;
  aiState: AIState;
  patrolTarget: { x: number; y: number } | null;
  path: { x: number; y: number }[] | null;
  pathTimer: number;
  attackCooldown: number;
  color: string;
  sightRange: number;
  bossPhase?: number;
}

const ENEMY_DEFS: Record<EnemyType, { health: number; attack: number; speed: number; color: string; sightRange: number }> = {
  skeleton: { health: 40, attack: 8, speed: 3, color: '#ccccaa', sightRange: 6 },
  zombie: { health: 60, attack: 12, speed: 1.5, color: '#668844', sightRange: 4 },
  mage: { health: 30, attack: 15, speed: 2.5, color: '#8866cc', sightRange: 8 },
  boss: { health: 200, attack: 25, speed: 2, color: '#ff4444', sightRange: 10 },
};

function spawnEnemies(rooms: Room[], floor: number, rng: SeededRNG): Enemy[] {
  const enemies: Enemy[] = [];
  const density = 1 + floor * 0.5;

  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    const count = room.type === 'boss' ? 1 : Math.min(Math.floor(density + rng.next() * 2), 4);
    for (let j = 0; j < count; j++) {
      let type: EnemyType;
      if (room.type === 'boss') type = 'boss';
      else if (rng.next() < 0.15 + floor * 0.03) type = 'mage';
      else if (rng.next() < 0.4) type = 'zombie';
      else type = 'skeleton';

      const def = ENEMY_DEFS[type];
      const hpScale = 1 + floor * 0.2;
      enemies.push({
        type,
        x: rng.nextInt(room.x + 1, room.x + room.w - 2),
        y: rng.nextInt(room.y + 1, room.y + room.h - 2),
        health: Math.floor(def.health * hpScale),
        maxHealth: Math.floor(def.health * hpScale),
        attack: Math.floor(def.attack * (1 + floor * 0.15)),
        speed: def.speed,
        aiState: 'idle',
        patrolTarget: null,
        path: null,
        pathTimer: 0,
        attackCooldown: 0,
        color: def.color,
        sightRange: def.sightRange,
        bossPhase: type === 'boss' ? 0 : undefined,
      });
    }
  }
  return enemies;
}

// ── Player classes ─────────────────────────────────────────────────

interface PlayerClass { id: string; name: string; icon: typeof Sword; color: string; health: number; mana: number; attack: number; defense: number; speed: number; special: string }

const CLASSES: PlayerClass[] = [
  { id: 'warrior', name: 'Warrior', icon: Sword, color: '#cc4444', health: 150, mana: 30, attack: 18, defense: 12, speed: 4, special: 'Whirlwind (area dmg)' },
  { id: 'mage', name: 'Mage', icon: Wand2, color: '#6644cc', health: 80, mana: 120, attack: 22, defense: 5, speed: 3.5, special: 'Fireball (ranged)' },
  { id: 'ranger', name: 'Ranger', icon: Footprints, color: '#44aa44', health: 100, mana: 60, attack: 16, defense: 8, speed: 5, special: 'Arrow Burst (line)' },
  { id: 'worge', name: 'Worge', icon: Shield, color: '#cc8833', health: 130, mana: 50, attack: 20, defense: 10, speed: 4.5, special: 'Transform (AoE)' },
];

// ── Items ──────────────────────────────────────────────────────────

interface Item { type: 'health_potion' | 'mana_potion' | 'key' | 'gold' | 'equipment'; value: number; name: string }

// ── Constants ──────────────────────────────────────────────────────

const TILE_SIZE = 16;
const VIEW_TILES_X = 25;
const VIEW_TILES_Y = 19;
const CANVAS_W = VIEW_TILES_X * TILE_SIZE;
const CANVAS_H = VIEW_TILES_Y * TILE_SIZE;

// ── Component ──────────────────────────────────────────────────────

export default function CryptCrawlers() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sfxRef = useRef<SpriteEffects2DManager | null>(null);
  const animRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());

  const [phase, setPhase] = useState<'select' | 'play'>('select');
  const [selClass, setSelClass] = useState(0);

  // Game state refs
  const floorRef = useRef(1);
  const tilesRef = useRef<number[][]>([]);
  const roomsRef = useRef<Room[]>([]);
  const playerRef = useRef({ x: 0, y: 0, health: 100, maxHealth: 100, mana: 50, maxMana: 50, attack: 15, defense: 8, speed: 4, facing: 0, attackTimer: 0, specialCooldown: 0, gold: 0, keys: 0, exp: 0, level: 1 });
  const classRef = useRef<PlayerClass>(CLASSES[0]);
  const enemiesRef = useRef<Enemy[]>([]);
  const itemsRef = useRef<{ x: number; y: number; item: Item }[]>([]);
  const fogRef = useRef<boolean[][]>([]);
  const logRef = useRef<string[]>([]);
  const [, forceUpdate] = useState(0);

  const addLog = useCallback((msg: string) => {
    logRef.current = [...logRef.current.slice(-4), msg];
  }, []);

  // ── Initialize floor ─────────────────────────────────────────

  const initFloor = useCallback((floor: number) => {
    const dungeon = generateDungeon(floor);
    tilesRef.current = dungeon.tiles;
    roomsRef.current = dungeon.rooms;
    playerRef.current.x = dungeon.spawnX;
    playerRef.current.y = dungeon.spawnY;
    fogRef.current = Array.from({ length: MAP_H }, () => Array(MAP_W).fill(false));

    const rng = new SeededRNG(floor * 4231 + 999);
    enemiesRef.current = spawnEnemies(dungeon.rooms, floor, rng);

    // Spawn items in rooms
    const items: { x: number; y: number; item: Item }[] = [];
    for (const room of dungeon.rooms) {
      if (room.type === 'treasure') {
        items.push({ x: Math.floor(room.x + room.w / 2) + 1, y: Math.floor(room.y + room.h / 2), item: { type: 'gold', value: 50 + floor * 20, name: 'Gold Pile' } });
        if (rng.next() < 0.5) items.push({ x: Math.floor(room.x + room.w / 2) - 1, y: Math.floor(room.y + room.h / 2), item: { type: 'equipment', value: 5 + floor * 2, name: 'Enchanted Gear' } });
      }
      // Random potions
      if (rng.next() < 0.3) {
        const px = rng.nextInt(room.x + 1, room.x + room.w - 2);
        const py = rng.nextInt(room.y + 1, room.y + room.h - 2);
        if (dungeon.tiles[py][px] === Tile.Floor) {
          items.push({ x: px, y: py, item: rng.next() < 0.5 ? { type: 'health_potion', value: 30 + floor * 5, name: 'Health Potion' } : { type: 'mana_potion', value: 20 + floor * 3, name: 'Mana Potion' } });
        }
      }
      // Keys near locked doors
      if (rng.next() < 0.2) {
        const kx = rng.nextInt(room.x, room.x + room.w - 1);
        const ky = rng.nextInt(room.y, room.y + room.h - 1);
        if (dungeon.tiles[ky][kx] === Tile.Floor) {
          items.push({ x: kx, y: ky, item: { type: 'key', value: 1, name: 'Rusty Key' } });
        }
      }
    }
    itemsRef.current = items;

    addLog(`Descended to floor ${floor}...`);
    floorRef.current = floor;
  }, [addLog]);

  // ── Start game ───────────────────────────────────────────────

  const startGame = useCallback(() => {
    const cls = CLASSES[selClass];
    classRef.current = cls;
    playerRef.current = {
      x: 0, y: 0, health: cls.health, maxHealth: cls.health,
      mana: cls.mana, maxMana: cls.mana, attack: cls.attack, defense: cls.defense,
      speed: cls.speed, facing: 0, attackTimer: 0, specialCooldown: 0, gold: 0, keys: 0, exp: 0, level: 1,
    };
    initFloor(1);
    setPhase('play');
  }, [selClass, initFloor]);

  // ── Reveal fog ───────────────────────────────────────────────

  const revealFog = useCallback((px: number, py: number) => {
    const fog = fogRef.current;
    const range = 5;
    for (let dy = -range; dy <= range; dy++) {
      for (let dx = -range; dx <= range; dx++) {
        const nx = px + dx, ny = py + dy;
        if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H) {
          if (dx * dx + dy * dy <= range * range) {
            fog[ny][nx] = true;
          }
        }
      }
    }
  }, []);

  // ── Line of sight ────────────────────────────────────────────

  const hasLineOfSight = useCallback((x1: number, y1: number, x2: number, y2: number): boolean => {
    const tiles = tilesRef.current;
    const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
    let err = dx - dy, cx = x1, cy = y1;
    while (cx !== x2 || cy !== y2) {
      if (tiles[cy]?.[cx] === Tile.Wall) return false;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
    return true;
  }, []);

  // ── Input ────────────────────────────────────────────────────

  useEffect(() => {
    const kd = (e: KeyboardEvent) => { keysRef.current.add(e.key.toLowerCase()); e.preventDefault(); };
    const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  // ── Game loop ────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'play') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // SpriteEffects2DManager removed — 2D VFX disabled until rebuild

    lastRef.current = performance.now();
    let moveTimer = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;

      const p = playerRef.current;
      const tiles = tilesRef.current;
      const enemies = enemiesRef.current;
      const keys = keysRef.current;
      const sfx = sfxRef.current;

      if (p.health <= 0) {
        // Death screen
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.textAlign = 'center'; ctx.font = 'bold 24px monospace'; ctx.fillStyle = '#cc3333';
        ctx.fillText('YOU DIED', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.font = '14px monospace'; ctx.fillStyle = '#888';
        ctx.fillText(`Floor ${floorRef.current} | Level ${p.level}`, CANVAS_W / 2, CANVAS_H / 2 + 10);
        ctx.fillText('Press ENTER to restart', CANVAS_W / 2, CANVAS_H / 2 + 35);
        if (keys.has('enter')) { keys.delete('enter'); startGame(); }
        animRef.current = requestAnimationFrame(loop);
        return;
      }

      // ── Player movement (grid-based, with move timer) ──
      moveTimer -= dt;
      if (moveTimer <= 0) {
        let dx = 0, dy = 0;
        if (keys.has('w') || keys.has('arrowup')) { dy = -1; p.facing = 3; }
        else if (keys.has('s') || keys.has('arrowdown')) { dy = 1; p.facing = 1; }
        else if (keys.has('a') || keys.has('arrowleft')) { dx = -1; p.facing = 2; }
        else if (keys.has('d') || keys.has('arrowright')) { dx = 1; p.facing = 0; }

        if (dx !== 0 || dy !== 0) {
          const nx = p.x + dx, ny = p.y + dy;
          if (nx >= 0 && nx < MAP_W && ny >= 0 && ny < MAP_H) {
            const tile = tiles[ny][nx];
            if (tile === Tile.Floor || tile === Tile.Door || tile === Tile.StairsDown || tile === Tile.Trap || tile === Tile.Water || tile === Tile.Chest || tile === Tile.Shrine) {
              p.x = nx; p.y = ny;
              moveTimer = 1 / p.speed;
            } else if (tile === Tile.LockedDoor && p.keys > 0) {
              p.keys--; tiles[ny][nx] = Tile.Floor; addLog('Unlocked a door!');
              moveTimer = 1 / p.speed;
            } else if (tile === Tile.BreakableWall) {
              tiles[ny][nx] = Tile.Floor; addLog('Broke through a wall!');
              if (sfx) sfx.spawnAt('impact', CANVAS_W / 2, CANVAS_H / 2, '#888888', { scale: 0.6 });
              moveTimer = 1 / p.speed;
            }

            // Tile interactions
            if (tile === Tile.Trap) {
              const dmg = 10 + floorRef.current * 3;
              p.health -= Math.max(1, dmg - p.defense);
              addLog(`Stepped on a trap! -${dmg} HP`);
              if (sfx) sfx.spawnAt('fire', CANVAS_W / 2, CANVAS_H / 2, '#ff4400', { scale: 0.5 });
              tiles[ny][nx] = Tile.Floor;
            } else if (tile === Tile.Shrine) {
              p.health = p.maxHealth; p.mana = p.maxMana;
              addLog('Healed at shrine!');
              if (sfx) sfx.spawnAt('heal', CANVAS_W / 2, CANVAS_H / 2, '#9966ff', { scale: 0.8 });
            }

            // Pick up items
            const itemIdx = itemsRef.current.findIndex(it => it.x === p.x && it.y === p.y);
            if (itemIdx >= 0) {
              const { item } = itemsRef.current[itemIdx];
              itemsRef.current.splice(itemIdx, 1);
              if (item.type === 'health_potion') { p.health = Math.min(p.maxHealth, p.health + item.value); addLog(`Used ${item.name}! +${item.value} HP`); }
              else if (item.type === 'mana_potion') { p.mana = Math.min(p.maxMana, p.mana + item.value); addLog(`Used ${item.name}! +${item.value} MP`); }
              else if (item.type === 'key') { p.keys += item.value; addLog('Found a key!'); }
              else if (item.type === 'gold') { p.gold += item.value; addLog(`Found ${item.value} gold!`); }
              else if (item.type === 'equipment') { p.attack += item.value; addLog(`${item.name}: +${item.value} ATK`); }
              if (sfx) sfx.spawnAt('magic', CANVAS_W / 2, CANVAS_H / 2, '#ffcc00', { scale: 0.4 });
            }
          }
        }
      }

      // Interact key (E) — stairs
      if (keys.has('e')) {
        keys.delete('e');
        if (tiles[p.y]?.[p.x] === Tile.StairsDown) {
          initFloor(floorRef.current + 1);
          forceUpdate(n => n + 1);
          if (sfx) sfx.spawnAt('magic', CANVAS_W / 2, CANVAS_H / 2, '#44aa44', { scale: 1.0, screenShake: true });
        }
      }

      // Attack (J)
      p.attackTimer = Math.max(0, p.attackTimer - dt);
      if (keys.has('j') && p.attackTimer <= 0) {
        keys.delete('j');
        p.attackTimer = 0.3;
        const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
        const [adx, ady] = dirs[p.facing];
        const ax = p.x + adx, ay = p.y + ady;

        for (const e of enemies) {
          if (Math.round(e.x) === ax && Math.round(e.y) === ay) {
            const dmg = Math.max(1, p.attack + Math.floor(p.level * 1.5));
            e.health -= dmg;
            addLog(`Hit ${e.type} for ${dmg}!`);
            if (sfx) {
              const sx = (ax - p.x + VIEW_TILES_X / 2) * TILE_SIZE * (containerRef.current!.clientWidth / CANVAS_W);
              const sy = (ay - p.y + VIEW_TILES_Y / 2) * TILE_SIZE * (containerRef.current!.clientHeight / CANVAS_H);
              sfx.spawnAt('slash', sx, sy, classRef.current.color, { scale: 0.5, rotation: Math.random() * Math.PI });
            }
            break;
          }
        }
      }

      // Special (K)
      p.specialCooldown = Math.max(0, p.specialCooldown - dt);
      if (keys.has('k') && p.specialCooldown <= 0 && p.mana >= 20) {
        keys.delete('k');
        p.mana -= 20;
        p.specialCooldown = 2;
        const range = classRef.current.id === 'mage' ? 4 : 2;
        let hits = 0;
        for (const e of enemies) {
          const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
          if (dist <= range) {
            const dmg = Math.max(1, Math.floor(p.attack * 1.5));
            e.health -= dmg; hits++;
          }
        }
        addLog(`Special: hit ${hits} enemies!`);
        if (sfx) sfx.spawnAt('shockwave', CANVAS_W / 2, CANVAS_H / 2, classRef.current.color, { scale: 0.8, screenShake: true });
      }

      // ── Enemy AI ──
      for (const e of enemies) {
        if (e.health <= 0) continue;
        e.attackCooldown = Math.max(0, e.attackCooldown - dt);
        e.pathTimer -= dt;

        const dist = Math.abs(e.x - p.x) + Math.abs(e.y - p.y);
        const canSee = dist <= e.sightRange && hasLineOfSight(Math.round(e.x), Math.round(e.y), p.x, p.y);

        // State transitions
        if (canSee && dist <= 1.5) e.aiState = 'attack';
        else if (canSee) e.aiState = 'chase';
        else if (e.aiState === 'chase') e.aiState = 'patrol';
        else if (e.aiState === 'idle' && Math.random() < 0.01) e.aiState = 'patrol';

        // Boss multi-phase
        if (e.type === 'boss' && e.bossPhase !== undefined) {
          const hpPct = e.health / e.maxHealth;
          e.bossPhase = hpPct < 0.3 ? 2 : hpPct < 0.6 ? 1 : 0;
          if (e.bossPhase >= 1) e.speed = ENEMY_DEFS.boss.speed * 1.5;
          if (e.bossPhase >= 2) e.attack = Math.floor(ENEMY_DEFS.boss.attack * (1 + floorRef.current * 0.15) * 1.5);
        }

        // Actions
        if (e.aiState === 'attack' && e.attackCooldown <= 0) {
          e.attackCooldown = 1.0;
          const dmg = Math.max(1, e.attack - p.defense);
          p.health -= dmg;
          addLog(`${e.type} hits you for ${dmg}!`);
          if (sfx) sfx.spawnAt('blood', CANVAS_W / 2, CANVAS_H / 2, '#cc0000', { scale: 0.4 });
          forceUpdate(n => n + 1);
        } else if (e.aiState === 'chase' || e.aiState === 'patrol') {
          // Pathfinding
          if (e.pathTimer <= 0 || !e.path || e.path.length === 0) {
            e.pathTimer = 0.5;
            const gx = e.aiState === 'chase' ? p.x : (e.patrolTarget?.x ?? Math.round(e.x) + Math.floor(Math.random() * 6 - 3));
            const gy = e.aiState === 'chase' ? p.y : (e.patrolTarget?.y ?? Math.round(e.y) + Math.floor(Math.random() * 6 - 3));
            e.path = astar(tiles, Math.round(e.x), Math.round(e.y), Math.max(0, Math.min(MAP_W - 1, gx)), Math.max(0, Math.min(MAP_H - 1, gy)));
          }
          if (e.path && e.path.length > 0) {
            const next = e.path[0];
            const mdx = next.x - e.x, mdy = next.y - e.y;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < 0.1) { e.x = next.x; e.y = next.y; e.path.shift(); }
            else {
              const spd = e.speed * dt;
              e.x += (mdx / mDist) * Math.min(spd, mDist);
              e.y += (mdy / mDist) * Math.min(spd, mDist);
            }
          }
        }
      }

      // Remove dead enemies, grant XP
      for (let i = enemies.length - 1; i >= 0; i--) {
        if (enemies[i].health <= 0) {
          const e = enemies[i];
          p.exp += e.type === 'boss' ? 100 : e.type === 'mage' ? 30 : 15;
          p.gold += e.type === 'boss' ? 50 : 10;
          addLog(`Defeated ${e.type}! +${e.type === 'boss' ? 100 : 15} XP`);
          if (sfx) {
            const sx = (e.x - p.x + VIEW_TILES_X / 2) * TILE_SIZE * (containerRef.current!.clientWidth / CANVAS_W);
            const sy = (e.y - p.y + VIEW_TILES_Y / 2) * TILE_SIZE * (containerRef.current!.clientHeight / CANVAS_H);
            sfx.spawnAt('fire', sx, sy, e.color, { scale: 0.6 });
          }
          enemies.splice(i, 1);
        }
      }

      // Level up
      const xpNeeded = p.level * 50;
      if (p.exp >= xpNeeded) {
        p.exp -= xpNeeded; p.level++;
        p.maxHealth += 10; p.health = p.maxHealth;
        p.maxMana += 5; p.mana = p.maxMana;
        p.attack += 2; p.defense += 1;
        addLog(`LEVEL UP! Now level ${p.level}`);
        if (sfx) sfx.spawnAt('magic', CANVAS_W / 2, CANVAS_H / 2, '#ffcc00', { scale: 1.0, screenShake: true });
      }

      // ── Reveal fog ──
      revealFog(p.x, p.y);

      // ── Render ──
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      const camX = p.x - Math.floor(VIEW_TILES_X / 2);
      const camY = p.y - Math.floor(VIEW_TILES_Y / 2);

      // Draw tiles
      for (let vy = 0; vy < VIEW_TILES_Y; vy++) {
        for (let vx = 0; vx < VIEW_TILES_X; vx++) {
          const wx = camX + vx, wy = camY + vy;
          if (wx < 0 || wx >= MAP_W || wy < 0 || wy >= MAP_H) continue;
          if (!fogRef.current[wy][wx]) continue;

          const tile = tiles[wy][wx];
          ctx.fillStyle = TILE_COLORS[tile] || '#000';
          ctx.fillRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          // Tile details
          if (tile === Tile.Door) {
            ctx.fillStyle = '#554422';
            ctx.fillRect(vx * TILE_SIZE + 2, vy * TILE_SIZE + 1, TILE_SIZE - 4, TILE_SIZE - 2);
          } else if (tile === Tile.StairsDown) {
            ctx.fillStyle = '#228822';
            ctx.font = '12px monospace'; ctx.textAlign = 'center';
            ctx.fillText('▼', vx * TILE_SIZE + TILE_SIZE / 2, vy * TILE_SIZE + TILE_SIZE - 2);
          } else if (tile === Tile.Chest) {
            ctx.fillStyle = '#aa8822';
            ctx.fillRect(vx * TILE_SIZE + 3, vy * TILE_SIZE + 5, TILE_SIZE - 6, TILE_SIZE - 7);
            ctx.fillStyle = '#ffcc33';
            ctx.fillRect(vx * TILE_SIZE + 6, vy * TILE_SIZE + 7, 4, 4);
          } else if (tile === Tile.Trap) {
            ctx.fillStyle = '#661111';
            ctx.fillRect(vx * TILE_SIZE + 4, vy * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          }
        }
      }

      // Draw items
      for (const it of itemsRef.current) {
        const sx = (it.x - camX) * TILE_SIZE, sy = (it.y - camY) * TILE_SIZE;
        if (sx < -TILE_SIZE || sx > CANVAS_W || sy < -TILE_SIZE || sy > CANVAS_H) continue;
        if (!fogRef.current[it.y]?.[it.x]) continue;
        ctx.fillStyle = it.item.type === 'health_potion' ? '#ff4444' : it.item.type === 'mana_potion' ? '#4444ff' : it.item.type === 'key' ? '#ffcc00' : it.item.type === 'gold' ? '#ddaa00' : '#cc66ff';
        ctx.beginPath(); ctx.arc(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2, 4, 0, Math.PI * 2); ctx.fill();
      }

      // Draw enemies
      for (const e of enemies) {
        if (e.health <= 0) continue;
        const sx = (e.x - camX) * TILE_SIZE, sy = (e.y - camY) * TILE_SIZE;
        if (sx < -TILE_SIZE || sx > CANVAS_W || sy < -TILE_SIZE || sy > CANVAS_H) continue;
        if (!fogRef.current[Math.round(e.y)]?.[Math.round(e.x)]) continue;

        ctx.fillStyle = e.color;
        const eSize = e.type === 'boss' ? TILE_SIZE - 2 : TILE_SIZE - 4;
        ctx.fillRect(sx + (TILE_SIZE - eSize) / 2, sy + (TILE_SIZE - eSize) / 2, eSize, eSize);

        // Health bar
        if (e.health < e.maxHealth) {
          ctx.fillStyle = '#333'; ctx.fillRect(sx, sy - 3, TILE_SIZE, 2);
          ctx.fillStyle = e.health / e.maxHealth > 0.3 ? '#44cc44' : '#cc4444';
          ctx.fillRect(sx, sy - 3, TILE_SIZE * (e.health / e.maxHealth), 2);
        }
      }

      // Draw player
      const px = Math.floor(VIEW_TILES_X / 2) * TILE_SIZE;
      const py = Math.floor(VIEW_TILES_Y / 2) * TILE_SIZE;
      ctx.fillStyle = classRef.current.color;
      ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);

      // Facing indicator
      ctx.fillStyle = '#fff';
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      const [fdx, fdy] = dirs[p.facing];
      ctx.fillRect(px + TILE_SIZE / 2 + fdx * 5 - 1, py + TILE_SIZE / 2 + fdy * 5 - 1, 3, 3);

      // Attack animation
      if (p.attackTimer > 0.15) {
        ctx.fillStyle = classRef.current.color;
        ctx.globalAlpha = 0.5;
        ctx.fillRect((px + fdx * TILE_SIZE) + 2, (py + fdy * TILE_SIZE) + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.globalAlpha = 1;
      }

      // ── HUD overlay ──
      // Health bar
      ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(4, CANVAS_H - 50, 150, 46);
      ctx.fillStyle = '#333'; ctx.fillRect(8, CANVAS_H - 46, 100, 8);
      ctx.fillStyle = '#cc3333'; ctx.fillRect(8, CANVAS_H - 46, 100 * (p.health / p.maxHealth), 8);
      ctx.fillStyle = '#333'; ctx.fillRect(8, CANVAS_H - 34, 100, 6);
      ctx.fillStyle = '#3366cc'; ctx.fillRect(8, CANVAS_H - 34, 100 * (p.mana / p.maxMana), 6);

      ctx.font = '9px monospace'; ctx.fillStyle = '#ccc'; ctx.textAlign = 'left';
      ctx.fillText(`HP ${Math.ceil(p.health)}/${p.maxHealth}`, 112, CANVAS_H - 40);
      ctx.fillText(`MP ${Math.ceil(p.mana)}/${p.maxMana}`, 112, CANVAS_H - 30);
      ctx.fillText(`Lv${p.level} F${floorRef.current}`, 8, CANVAS_H - 10);
      ctx.fillText(`G:${p.gold} K:${p.keys}`, 70, CANVAS_H - 10);

      // XP bar
      ctx.fillStyle = '#333'; ctx.fillRect(8, CANVAS_H - 22, 100, 4);
      ctx.fillStyle = '#ccaa00'; ctx.fillRect(8, CANVAS_H - 22, 100 * (p.exp / (p.level * 50)), 4);

      // Combat log
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(CANVAS_W - 160, 4, 156, 60);
      ctx.font = '8px monospace'; ctx.fillStyle = '#aaa'; ctx.textAlign = 'right';
      logRef.current.forEach((msg, i) => {
        ctx.fillText(msg.substring(0, 24), CANVAS_W - 8, 14 + i * 11);
      });

      // Controls hint
      ctx.fillStyle = '#555'; ctx.font = '8px monospace'; ctx.textAlign = 'left';
      ctx.fillText('WASD:move J:atk K:spc E:use', 4, 10);

      // ── Minimap ──
      const mini = miniRef.current;
      if (mini) {
        const mctx = mini.getContext('2d');
        if (mctx) {
          const mScale = 2;
          mini.width = MAP_W * mScale;
          mini.height = MAP_H * mScale;
          mctx.fillStyle = '#000'; mctx.fillRect(0, 0, mini.width, mini.height);

          for (let my = 0; my < MAP_H; my++) {
            for (let mx = 0; mx < MAP_W; mx++) {
              if (!fogRef.current[my][mx]) continue;
              const t = tiles[my][mx];
              mctx.fillStyle = t === Tile.Wall ? '#222' : t === Tile.StairsDown ? '#44aa44' : '#444';
              mctx.fillRect(mx * mScale, my * mScale, mScale, mScale);
            }
          }
          // Enemies on minimap
          for (const e of enemies) {
            if (e.health <= 0) continue;
            if (!fogRef.current[Math.round(e.y)]?.[Math.round(e.x)]) continue;
            mctx.fillStyle = '#ff4444';
            mctx.fillRect(Math.round(e.x) * mScale, Math.round(e.y) * mScale, mScale, mScale);
          }
          // Player
          mctx.fillStyle = '#44ff44';
          mctx.fillRect(p.x * mScale - 1, p.y * mScale - 1, mScale + 2, mScale + 2);
        }
      }

      forceUpdate(n => n + 1);
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      if (sfxRef.current) { sfxRef.current.dispose(); sfxRef.current = null; }
    };
  }, [phase, revealFog, hasLineOfSight, startGame, initFloor, addLog]);

  // ── Class Select ─────────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900" data-testid="page-crypt-crawlers">
        <div className="p-4 border-b border-primary/20 bg-black/40">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div className="p-2 rounded-lg bg-primary/20"><Skull className="h-6 w-6 text-primary" /></div>
            <div><h1 className="text-xl font-bold">Crypt Crawlers</h1><p className="text-sm text-muted-foreground">Dungeon Crawler — Descend the Crypts</p></div>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Choose Your Class</h2>
              <p className="text-muted-foreground text-sm">Each class has unique stats and a special ability</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {CLASSES.map((cls, i) => {
                const Icon = cls.icon;
                return (
                  <Card key={cls.id} className={`cursor-pointer transition-all ${selClass === i ? 'ring-2 ring-primary bg-primary/10' : 'bg-card/50 hover:bg-card/80'}`} onClick={() => setSelClass(i)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg" style={{ background: cls.color + '33' }}>
                          <Icon className="h-5 w-5" style={{ color: cls.color }} />
                        </div>
                        <div>
                          <p className="font-bold">{cls.name}</p>
                          <p className="text-xs text-muted-foreground">{cls.special}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">HP {cls.health}</Badge>
                        <Badge variant="outline" className="text-[10px]">MP {cls.mana}</Badge>
                        <Badge variant="outline" className="text-[10px]">ATK {cls.attack}</Badge>
                        <Badge variant="outline" className="text-[10px]">DEF {cls.defense}</Badge>
                        <Badge variant="outline" className="text-[10px]">SPD {cls.speed}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <div className="text-center">
              <Button size="lg" onClick={startGame} className="gap-2"><Skull className="h-5 w-5" /> Enter the Crypt</Button>
            </div>
            <Card className="bg-card/30"><CardContent className="p-4">
              <h4 className="font-bold mb-2">Controls</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>WASD / Arrows — Move</p>
                <p>J — Attack | K — Special Ability</p>
                <p>E — Interact (doors, stairs, chests)</p>
              </div>
            </CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  // ── Play Screen ──────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-black" data-testid="page-crypt-crawlers">
      <div ref={containerRef} className="flex-1 flex items-center justify-center" style={{ position: 'relative' }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ width: '100%', maxHeight: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
        <canvas ref={miniRef} className="absolute top-2 right-2 border border-gray-700" style={{ width: '96px', height: '72px', imageRendering: 'pixelated' }} />
      </div>
      <div className="p-1 bg-black/80 flex justify-center gap-4 text-xs text-muted-foreground">
        <span>WASD:move J:atk K:special E:interact</span>
        <span>|</span>
        <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={() => setPhase('select')}>Quit</Button>
      </div>
    </div>
  );
}
