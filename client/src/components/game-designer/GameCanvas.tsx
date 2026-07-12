import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { createInitialState, updateGame, commandMove, commandAttack, commandHarvest, commandBuild, commandTrain, commandSummonHero, commandUpgradeTownHall } from '@/lib/rts-engine/engine';
import { renderGame } from '@/lib/rts-engine/renderer';
import { MAPS } from '@/lib/rts-engine/maps';
import { BUILDING_CONFIGS, HERO_CONFIGS, UNIT_CONFIGS } from '@/lib/rts-engine/constants';
import type { GameState, Vec2, BuildingType, UnitType } from '@/lib/rts-engine/types';

const CANVAS_W = 1200;
const CANVAS_H = 700;

type GamePhase = 'menu' | 'playing' | 'paused';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const animRef = useRef(0);
  const lastTimeRef = useRef(0);

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [selectedMap, setSelectedMap] = useState(0);
  const [selectedFaction, setSelectedFaction] = useState<'kingdom' | 'legion'>('kingdom');
  const [buildMode, setBuildMode] = useState<BuildingType | null>(null);
  const [fps, setFps] = useState(0);

  // ── Start game ─────────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    const mapDef = MAPS[selectedMap];
    stateRef.current = createInitialState(mapDef, selectedFaction);
    setPhase('playing');
    lastTimeRef.current = performance.now();
  }, [selectedMap, selectedFaction]);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let fpsCounter = 0;
    let fpsTimer = 0;

    const loop = (now: number) => {
      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = now;

      if (stateRef.current) {
        // Update animation elapsed on all units
        for (const [, u] of stateRef.current.units) {
          if (u.state !== 'dead') u.anim.elapsed += dt;
        }
        updateGame(stateRef.current, dt);
        renderGame(ctx, stateRef.current, CANVAS_W, CANVAS_H, dt);
      }

      fpsCounter++;
      fpsTimer += dt;
      if (fpsTimer >= 1) {
        setFps(fpsCounter);
        fpsCounter = 0;
        fpsTimer = 0;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [phase]);

  // ── Screen → world coordinate conversion ───────────────────────────────────
  const screenToWorld = useCallback((e: React.MouseEvent): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas || !stateRef.current) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const { camera, zoom } = stateRef.current;
    return { x: sx / zoom + camera.x, y: sy / zoom + camera.y };
  }, []);

  // ── Mouse handlers ─────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!stateRef.current || phase !== 'playing') return;
    const state = stateRef.current;
    const world = screenToWorld(e);

    if (e.button === 0) {
      // Left click — select or build
      if (buildMode) {
        commandBuild(state, buildMode, world);
        setBuildMode(null);
        return;
      }
      // Box select start
      state.dragStart = { ...world };
      state.dragEnd = { ...world };
    }

    if (e.button === 2) {
      // Right click — context command
      e.preventDefault();
      if (state.selected.size === 0) return;

      // Check if clicking on enemy unit
      for (const [, u] of state.units) {
        if (u.state === 'dead') continue;
        if (Math.hypot(u.pos.x - world.x, u.pos.y - world.y) < 24) {
          if (u.faction !== 'blue') {
            commandAttack(state, u.id);
            return;
          }
        }
      }

      // Check if clicking on resource
      for (const [, r] of state.resources) {
        if (r.amount <= 0) continue;
        if (Math.hypot(r.pos.x - world.x, r.pos.y - world.y) < 40) {
          commandHarvest(state, r.id);
          return;
        }
      }

      // Move command
      commandMove(state, world);
    }
  }, [phase, buildMode, screenToWorld]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!stateRef.current || !stateRef.current.dragStart) return;
    stateRef.current.dragEnd = screenToWorld(e);
  }, [screenToWorld]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!stateRef.current) return;
    const state = stateRef.current;
    if (e.button === 0 && state.dragStart && state.dragEnd) {
      const x1 = Math.min(state.dragStart.x, state.dragEnd.x);
      const y1 = Math.min(state.dragStart.y, state.dragEnd.y);
      const x2 = Math.max(state.dragStart.x, state.dragEnd.x);
      const y2 = Math.max(state.dragStart.y, state.dragEnd.y);
      const boxW = x2 - x1;
      const boxH = y2 - y1;

      // Clear previous selection
      for (const [, u] of state.units) u.selected = false;
      state.selected.clear();

      if (boxW < 5 && boxH < 5) {
        // Click select
        const world = screenToWorld(e);
        for (const [, u] of state.units) {
          if (u.faction === 'blue' && u.state !== 'dead' && Math.hypot(u.pos.x - world.x, u.pos.y - world.y) < 24) {
            u.selected = true;
            state.selected.add(u.id);
            break;
          }
        }
      } else {
        // Box select
        for (const [, u] of state.units) {
          if (u.faction === 'blue' && u.state !== 'dead' && u.pos.x >= x1 && u.pos.x <= x2 && u.pos.y >= y1 && u.pos.y <= y2) {
            u.selected = true;
            state.selected.add(u.id);
          }
        }
      }
      state.dragStart = null;
      state.dragEnd = null;
    }
  }, [screenToWorld]);

  // ── Keyboard: camera pan, hotkeys ──────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;
    const keys = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      keys.add(e.key.toLowerCase());
      if (!stateRef.current) return;

      // Build hotkeys
      if (e.key === 'b') setBuildMode('barracks');
      if (e.key === 'h') setBuildMode('house');
      if (e.key === 't') setBuildMode('tower');
      if (e.key === 'a') setBuildMode('altar');
      if (e.key === 'k') setBuildMode('blacksmith');

      // Train hotkeys (when building selected)
      const selectedBld = [...stateRef.current.buildings.values()].find(b => {
        if (b.faction !== 'blue' || b.underConstruction) return false;
        for (const uid of stateRef.current!.selected) {
          const u = stateRef.current!.units.get(uid);
          if (u) return false; // unit selected, not building
        }
        return true;
      });

      // Hero summon: 1-4 at altar
      if (e.key >= '1' && e.key <= '4') {
        const heroIdx = parseInt(e.key) - 1;
        if (heroIdx < HERO_CONFIGS.length) {
          commandSummonHero(stateRef.current, HERO_CONFIGS[heroIdx].type);
        }
      }

      // Upgrade town hall: U
      if (e.key === 'u') commandUpgradeTownHall(stateRef.current);

      // Escape: cancel build mode
      if (e.key === 'Escape') setBuildMode(null);
    };

    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());

    // Camera pan tick
    const panInterval = setInterval(() => {
      if (!stateRef.current) return;
      const spd = 8;
      if (keys.has('arrowleft') || keys.has('a')) stateRef.current.camera.x -= spd;
      if (keys.has('arrowright') || keys.has('d')) stateRef.current.camera.x += spd;
      if (keys.has('arrowup') || keys.has('w')) stateRef.current.camera.y -= spd;
      if (keys.has('arrowdown') || keys.has('s')) stateRef.current.camera.y += spd;
    }, 16);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      clearInterval(panInterval);
    };
  }, [phase]);

  // ── Context menu prevent ───────────────────────────────────────────────────
  const handleContextMenu = useCallback((e: React.MouseEvent) => e.preventDefault(), []);

  // ── Quick train buttons ────────────────────────────────────────────────────
  const trainUnit = (type: UnitType) => {
    if (!stateRef.current) return;
    const bld = [...stateRef.current.buildings.values()].find(
      b => b.faction === 'blue' && !b.underConstruction &&
        BUILDING_CONFIGS[b.type as keyof typeof BUILDING_CONFIGS]?.trains.includes(type)
    );
    if (bld) commandTrain(stateRef.current, bld.id, type);
  };

  // ══════════════════════════════════════════════════════════════════════════════
  // MENU SCREEN
  // ══════════════════════════════════════════════════════════════════════════════
  if (phase === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-white p-8">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500">
          Grudge Warlords RTS
        </h1>
        <p className="text-zinc-400 mb-8">WC3-Style Real-Time Strategy</p>

        {/* Map selection */}
        <div className="flex gap-4 mb-6">
          {MAPS.map((m, i) => (
            <Card key={m.id} className={`cursor-pointer w-48 ${i === selectedMap ? 'border-amber-500 bg-zinc-800' : 'border-zinc-700 bg-zinc-900'}`}
              onClick={() => setSelectedMap(i)}>
              <CardContent className="pt-4 text-center">
                <div className="text-3xl mb-2">{m.thumbnail}</div>
                <div className="font-bold text-sm">{m.name}</div>
                <div className="text-xs text-zinc-400">{m.subtitle}</div>
                <div className="text-[10px] text-zinc-500 mt-2">{m.description.slice(0, 80)}...</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Faction selection */}
        <div className="flex gap-4 mb-8">
          {(['kingdom', 'legion'] as const).map(f => (
            <Button key={f} size="lg" variant={selectedFaction === f ? 'default' : 'outline'}
              onClick={() => setSelectedFaction(f)}
              className={selectedFaction === f ? 'bg-blue-600' : ''}>
              {f === 'kingdom' ? '🏰 Kingdom' : '💀 Legion'}
            </Button>
          ))}
        </div>

        <Button size="lg" onClick={startGame} className="bg-green-600 hover:bg-green-700 text-lg px-8">
          <Play className="h-5 w-5 mr-2" /> Start Game
        </Button>

        <div className="mt-6 text-xs text-zinc-500 max-w-md text-center">
          WASD/Arrows to pan camera · Left-click to select · Right-click to move/attack/harvest · B/H/T/A/K to build · 1-4 to summon heroes · U to upgrade town hall
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // GAME SCREEN
  // ══════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full bg-black">
      {/* Top controls */}
      <div className="flex items-center gap-2 p-1 bg-zinc-900 border-b border-zinc-800">
        <Button size="sm" variant="ghost" onClick={() => { setPhase('menu'); cancelAnimationFrame(animRef.current); }}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Menu
        </Button>
        <Badge variant="secondary" className="text-[10px]">{fps} FPS</Badge>
        <div className="flex-1" />

        {/* Build buttons */}
        <div className="flex gap-1">
          {(['house', 'barracks', 'archery', 'tower', 'altar', 'blacksmith', 'chapel', 'workshop'] as BuildingType[]).map(bt => (
            <Button key={bt} size="sm" variant={buildMode === bt ? 'default' : 'ghost'}
              onClick={() => setBuildMode(buildMode === bt ? null : bt)} title={`Build ${bt}`}
              className="text-[10px] px-2 h-7">
              {bt === 'house' ? '🏠' : bt === 'barracks' ? '⚔️' : bt === 'archery' ? '🏹' :
               bt === 'tower' ? '🗼' : bt === 'altar' ? '🪦' : bt === 'blacksmith' ? '⚒️' :
               bt === 'chapel' ? '⛪' : '🔧'}
            </Button>
          ))}
        </div>

        <div className="w-px h-5 bg-zinc-700 mx-1" />

        {/* Train buttons */}
        <div className="flex gap-1">
          {(['pawn', 'swordsman', 'bowman', 'mage', 'knight', 'ballista'] as UnitType[]).map(ut => (
            <Button key={ut} size="sm" variant="ghost" onClick={() => trainUnit(ut)}
              title={`Train ${ut}`} className="text-[10px] px-2 h-7">
              {ut === 'pawn' ? '⛏️' : ut === 'swordsman' ? '⚔️' : ut === 'bowman' ? '🏹' :
               ut === 'mage' ? '✨' : ut === 'knight' ? '🐴' : '💣'}
            </Button>
          ))}
        </div>

        <div className="w-px h-5 bg-zinc-700 mx-1" />

        {/* Hero summon */}
        <div className="flex gap-1">
          {HERO_CONFIGS.map((h, i) => (
            <Button key={h.type} size="sm" variant="ghost"
              onClick={() => stateRef.current && commandSummonHero(stateRef.current, h.type)}
              title={`Summon ${h.name} (${h.title})`} className="text-[10px] px-2 h-7">
              {h.type === 'arthax' ? '🗡️' : h.type === 'kanji' ? '🔮' : h.type === 'katan' ? '🏹' : '🛡️'}
            </Button>
          ))}
        </div>

        {buildMode && <Badge variant="default" className="ml-2 text-xs bg-amber-600">Building: {buildMode} (click to place, ESC to cancel)</Badge>}
      </div>

      {/* Canvas */}
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        className="flex-1 w-full"
        style={{ imageRendering: 'pixelated' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
      />
    </div>
  );
}
