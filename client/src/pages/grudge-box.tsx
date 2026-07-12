/**
 * GrudgeBox — 2D Sprite Fighting Game
 *
 * Full canvas fighting game using animated sprite sheets from ObjectStore CDN.
 * Features:
 * - 6 fighters with unique sprite animations from ObjectStore
 * - Character select screen
 * - Canvas-rendered combat with sprite sheet animation
 * - Arena backgrounds from arena-pack
 * - Combo system, HP bars, round tracking
 * - Punch / Kick / Special / Block controls
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

// ── ObjectStore CDN base ──
const CDN = 'https://assets.grudge-studio.com/sprites/characters';

// ── Fighter Roster (best animated characters from ObjectStore) ──

interface FighterDef {
  id: string;
  name: string;
  title: string;
  color: string;
  anims: Record<string, { file: string; frames: number; fps: number; loop: boolean }>;
}

// ── Hotkey Bindings (persisted to localStorage) ──

interface Hotkeys {
  moveLeft: string;
  moveRight: string;
  punch: string;
  kick: string;
  heavy: string;
  special: string;
  block: string;
  roll: string;
}

const DEFAULT_HOTKEYS: Hotkeys = {
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  punch: 'KeyJ',
  kick: 'KeyK',
  heavy: 'KeyL',
  special: 'KeyU',
  block: 'KeyS',
  roll: 'Space',
};

const HOTKEY_LABELS: Record<keyof Hotkeys, string> = {
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  punch: 'Punch',
  kick: 'Kick',
  heavy: 'Heavy',
  special: 'Special',
  block: 'Block',
  roll: 'Roll',
};

function loadHotkeys(): Hotkeys {
  try {
    const saved = localStorage.getItem('grudgebox-hotkeys');
    if (saved) return { ...DEFAULT_HOTKEYS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_HOTKEYS };
}

function saveHotkeys(hk: Hotkeys) {
  try { localStorage.setItem('grudgebox-hotkeys', JSON.stringify(hk)); } catch {}
}

function keyCodeToLabel(code: string): string {
  if (code === 'Space') return 'Space';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return '↑↓←→'[['Up','Down','Left','Right'].indexOf(code.slice(5))] || code.slice(5);
  return code.replace('Left', '').replace('Right', '');
}

const FIGHTERS: FighterDef[] = [
  {
    id: 'wind-hashashin', name: 'Sandstorm Vizier', title: 'The Desert Blade', color: '#6ee7b7',
    anims: {
      idle:    { file: 'idle.png',     frames: 8,  fps: 10, loop: true },
      run:     { file: 'run.png',      frames: 8,  fps: 12, loop: true },
      attack1: { file: 'attack1.png',  frames: 6,  fps: 14, loop: false },
      attack2: { file: 'attack2.png',  frames: 6,  fps: 14, loop: false },
      attack3: { file: 'attack3.png',  frames: 8,  fps: 14, loop: false },
      special: { file: 'special.png',  frames: 10, fps: 14, loop: false },
      defend:  { file: 'defend.png',   frames: 4,  fps: 8,  loop: true },
      roll:    { file: 'roll.png',     frames: 6,  fps: 14, loop: false },
      hurt:    { file: 'take_hit.png', frames: 3,  fps: 10, loop: false },
      death:   { file: 'death.png',    frames: 7,  fps: 10, loop: false },
    },
  },
  {
    id: 'fire-knight', name: 'Scourge Faith', title: 'Flame of Judgement', color: '#f97316',
    anims: {
      idle:    { file: 'idle.png',    frames: 8,  fps: 10, loop: true },
      run:     { file: 'run.png',     frames: 8,  fps: 12, loop: true },
      attack1: { file: 'attack1.png', frames: 4,  fps: 12, loop: false },
      attack2: { file: 'attack2.png', frames: 4,  fps: 12, loop: false },
      attack3: { file: 'attack3.png', frames: 4,  fps: 12, loop: false },
      special: { file: 'special.png', frames: 8,  fps: 14, loop: false },
      defend:  { file: 'block.png',   frames: 4,  fps: 8,  loop: true },
      roll:    { file: 'roll.png',    frames: 6,  fps: 14, loop: false },
      hurt:    { file: 'hurt.png',    frames: 3,  fps: 10, loop: false },
      death:   { file: 'death.png',   frames: 7,  fps: 10, loop: false },
    },
  },
  {
    id: 'pirate-captain', name: 'Racalvin', title: 'The Pirate King', color: '#a855f7',
    anims: {
      idle:    { file: 'idle.png',    frames: 8,  fps: 10, loop: true },
      run:     { file: 'walk.png',    frames: 8,  fps: 10, loop: true },
      attack1: { file: 'attack1.png', frames: 6,  fps: 14, loop: false },
      attack2: { file: 'attack2.png', frames: 6,  fps: 14, loop: false },
      attack3: { file: 'attack3.png', frames: 8,  fps: 14, loop: false },
      special: { file: 'special.png', frames: 10, fps: 14, loop: false },
      defend:  { file: 'idle.png',    frames: 8,  fps: 6,  loop: true },
      roll:    { file: 'walk.png',    frames: 8,  fps: 16, loop: false },
      hurt:    { file: 'hurt.png',    frames: 3,  fps: 10, loop: false },
      death:   { file: 'death.png',   frames: 7,  fps: 10, loop: false },
    },
  },
  {
    id: 'water-priestess', name: 'Nyxara', title: 'Abyssal Tide', color: '#38bdf8',
    anims: {
      idle:    { file: 'idle.png',    frames: 8,  fps: 10, loop: true },
      run:     { file: 'walk.png',    frames: 8,  fps: 10, loop: true },
      attack1: { file: 'attack1.png', frames: 6,  fps: 14, loop: false },
      attack2: { file: 'attack2.png', frames: 6,  fps: 14, loop: false },
      attack3: { file: 'attack3.png', frames: 8,  fps: 14, loop: false },
      special: { file: 'cast.png',    frames: 8,  fps: 12, loop: false },
      defend:  { file: 'block.png',   frames: 4,  fps: 8,  loop: true },
      roll:    { file: 'surf.png',    frames: 6,  fps: 14, loop: false },
      hurt:    { file: 'hurt.png',    frames: 3,  fps: 10, loop: false },
      death:   { file: 'death.png',   frames: 7,  fps: 10, loop: false },
    },
  },
  {
    id: 'leaf-ranger', name: 'Thornveil', title: 'The Silent Fang', color: '#4ade80',
    anims: {
      idle:    { file: 'idle.png',     frames: 8,  fps: 10, loop: true },
      run:     { file: 'run.png',      frames: 8,  fps: 12, loop: true },
      attack1: { file: 'attack1.png',  frames: 6,  fps: 14, loop: false },
      attack2: { file: 'attack2.png',  frames: 6,  fps: 14, loop: false },
      attack3: { file: 'attack3.png',  frames: 8,  fps: 14, loop: false },
      special: { file: 'special.png',  frames: 10, fps: 14, loop: false },
      defend:  { file: 'defend.png',   frames: 4,  fps: 8,  loop: true },
      roll:    { file: 'roll.png',     frames: 6,  fps: 14, loop: false },
      hurt:    { file: 'take_hit.png', frames: 3,  fps: 10, loop: false },
      death:   { file: 'death.png',    frames: 7,  fps: 10, loop: false },
    },
  },
  {
    id: 'barbarian-mage', name: 'Gorthak', title: 'The Runebreaker', color: '#ef4444',
    anims: {
      idle:    { file: 'idle.png',    frames: 8,  fps: 10, loop: true },
      run:     { file: 'run.png',     frames: 8,  fps: 12, loop: true },
      attack1: { file: 'attack1.png', frames: 6,  fps: 14, loop: false },
      attack2: { file: 'attack2.png', frames: 6,  fps: 14, loop: false },
      attack3: { file: 'charge1.png', frames: 8,  fps: 14, loop: false },
      special: { file: 'charge2.png', frames: 8,  fps: 14, loop: false },
      defend:  { file: 'idle.png',    frames: 8,  fps: 6,  loop: true },
      roll:    { file: 'jump.png',    frames: 6,  fps: 14, loop: false },
      hurt:    { file: 'hurt.png',    frames: 3,  fps: 10, loop: false },
      death:   { file: 'death.png',   frames: 7,  fps: 10, loop: false },
    },
  },
];

const ARENAS = [
  { name: 'Day Arena', bg: `${CDN}/arena-pack/3-background/day/backgroundday.png`, ground: '#5a4a3a', sky: '#4a6080' },
  { name: 'Night Arena', bg: `${CDN}/arena-pack/3-background/night/backgroundnight.png`, ground: '#2a2040', sky: '#0f0a20' },
];

// ── Sprite Sheet Loader ──

type SpriteCache = Map<string, HTMLImageElement>;

async function loadImage(url: string, cache: SpriteCache): Promise<HTMLImageElement> {
  if (cache.has(url)) return cache.get(url)!;
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { cache.set(url, img); resolve(img); };
    img.onerror = () => reject(new Error(`Failed: ${url}`));
    img.src = url;
  });
}

// ── Game State Types ──

type Phase = 'select' | 'fight' | 'ko' | 'victory';
type FighterState = 'idle' | 'run' | 'attack1' | 'attack2' | 'attack3' | 'special' | 'defend' | 'roll' | 'hurt' | 'death';

interface Fighter {
  def: FighterDef;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: FighterState;
  frame: number;
  frameTimer: number;
  facingRight: boolean;
  stun: number;
  combo: number;
  specialMeter: number;
  sheets: Map<string, HTMLImageElement>;
}

// ── Component ──

export default function GrudgeBox() {
  return (
    <GrudgeGameWrapper gameSlug="grudge-box" gameName="GrudgeBox" xpPerThousand={15} goldPerGame={10}>
      {(session) => <GrudgeBoxInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function GrudgeBoxInner({ session }: { session: GrudgeGameSession }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('select');
  const [p1Pick, setP1Pick] = useState(0);
  const [p2Pick, setP2Pick] = useState(1);
  const [arenaIdx, setArenaIdx] = useState(0);
  const [p1HP, setP1HP] = useState(100);
  const [p2HP, setP2HP] = useState(100);
  const [round, setRound] = useState(1);
  const [p1Wins, setP1Wins] = useState(0);
  const [p2Wins, setP2Wins] = useState(0);
  const [combo, setCombo] = useState(0);
  const [specialReady, setSpecialReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hotkeys, setHotkeys] = useState<Hotkeys>(loadHotkeys);
  const [showSettings, setShowSettings] = useState(false);
  const [rebinding, setRebinding] = useState<keyof Hotkeys | null>(null);
  const hotkeysRef = useRef<Hotkeys>(hotkeys);

  const gameRef = useRef<{ p1: Fighter; p2: Fighter; keys: Set<string>; bgImg: HTMLImageElement | null; cache: SpriteCache; running: boolean } | null>(null);
  const frameRef = useRef(0);

  // Keep ref in sync
  useEffect(() => { hotkeysRef.current = hotkeys; }, [hotkeys]);

  // Listen for rebind
  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const newHK = { ...hotkeys, [rebinding]: e.code };
      setHotkeys(newHK);
      saveHotkeys(newHK);
      setRebinding(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, hotkeys]);

  // ── Load fighter sprites ──
  const loadFighter = useCallback(async (def: FighterDef, cache: SpriteCache): Promise<Map<string, HTMLImageElement>> => {
    const sheets = new Map<string, HTMLImageElement>();
    const promises = Object.entries(def.anims).map(async ([key, anim]) => {
      try {
        const img = await loadImage(`${CDN}/${def.id}/${anim.file}`, cache);
        sheets.set(key, img);
      } catch { /* skip failed */ }
    });
    await Promise.allSettled(promises);
    return sheets;
  }, []);

  // ── Start fight ──
  const startFight = useCallback(async () => {
    setLoading(true);
    const cache: SpriteCache = gameRef.current?.cache || new Map();
    const f1Def = FIGHTERS[p1Pick];
    const f2Def = FIGHTERS[p2Pick];
    const arena = ARENAS[arenaIdx];

    const [sheets1, sheets2] = await Promise.all([
      loadFighter(f1Def, cache),
      loadFighter(f2Def, cache),
    ]);

    let bgImg: HTMLImageElement | null = null;
    try { bgImg = await loadImage(arena.bg, cache); } catch { /* fallback */ }

    const makeFighter = (def: FighterDef, x: number, facingRight: boolean, sheets: Map<string, HTMLImageElement>): Fighter => ({
      def, x, y: 0, hp: 100, maxHp: 100, state: 'idle', frame: 0, frameTimer: 0,
      facingRight, stun: 0, combo: 0, specialMeter: 0, sheets,
    });

    gameRef.current = {
      p1: makeFighter(f1Def, 150, true, sheets1),
      p2: makeFighter(f2Def, 650, false, sheets2),
      keys: new Set(), bgImg, cache, running: true,
    };

    setP1HP(100); setP2HP(100); setCombo(0); setSpecialReady(false);
    setPhase('fight');
    setLoading(false);
  }, [p1Pick, p2Pick, arenaIdx, loadFighter]);

  // ── Canvas game loop ──
  useEffect(() => {
    if (phase !== 'fight' && phase !== 'ko') return;
    const canvas = canvasRef.current;
    if (!canvas || !gameRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const g = gameRef.current;
    const W = 800, H = 450;
    canvas.width = W; canvas.height = H;

    const keys = g.keys;
    const onKeyDown = (e: KeyboardEvent) => { keys.add(e.code); e.preventDefault(); };
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const GROUND_Y = H - 100;
    const SPRITE_W = 200; // render size
    const SPRITE_H = 200;

    function setState(f: Fighter, s: FighterState) {
      if (f.state === 'death') return;
      if (f.state === s) return;
      f.state = s; f.frame = 0; f.frameTimer = 0;
    }

    function isActing(f: Fighter) {
      return ['attack1','attack2','attack3','special','roll','hurt'].includes(f.state);
    }

    function drawFighter(f: Fighter) {
      const animDef = f.def.anims[f.state] || f.def.anims.idle;
      const sheet = f.sheets.get(f.state) || f.sheets.get('idle');
      if (!sheet || !animDef) {
        // Colored box fallback
        ctx!.fillStyle = f.def.color;
        ctx!.fillRect(f.x - 30, GROUND_Y - 80, 60, 80);
        return;
      }

      const frameW = sheet.width / animDef.frames;
      const frameH = sheet.height;
      const sx = Math.min(f.frame, animDef.frames - 1) * frameW;

      ctx!.save();
      if (!f.facingRight) {
        ctx!.translate(f.x, 0);
        ctx!.scale(-1, 1);
        ctx!.translate(-f.x, 0);
      }
      ctx!.drawImage(sheet, sx, 0, frameW, frameH, f.x - SPRITE_W / 2, GROUND_Y - SPRITE_H + 20, SPRITE_W, SPRITE_H);
      ctx!.restore();
    }

    function updateAnim(f: Fighter, dt: number) {
      const animDef = f.def.anims[f.state] || f.def.anims.idle;
      if (!animDef) return;
      f.frameTimer += dt;
      if (f.frameTimer >= 1 / animDef.fps) {
        f.frameTimer = 0;
        f.frame++;
        if (f.frame >= animDef.frames) {
          if (animDef.loop) {
            f.frame = 0;
          } else {
            f.frame = animDef.frames - 1;
            if (f.state !== 'death') setState(f, 'idle');
          }
        }
      }
    }

    function dealDamage(attacker: Fighter, defender: Fighter, dmg: number) {
      if (defender.state === 'defend') dmg = Math.floor(dmg * 0.2);
      if (defender.state === 'roll') return;
      defender.hp = Math.max(0, defender.hp - dmg);
      attacker.combo++;
      attacker.specialMeter = Math.min(100, attacker.specialMeter + dmg * 2);
      if (defender.hp > 0) setState(defender, 'hurt');
      else setState(defender, 'death');
    }

    function checkHit(attacker: Fighter, defender: Fighter) {
      if (!['attack1','attack2','attack3','special'].includes(attacker.state)) return;
      const animDef = attacker.def.anims[attacker.state];
      if (!animDef) return;
      const hitFrame = Math.floor(animDef.frames * 0.5);
      if (attacker.frame !== hitFrame) return;
      const dist = Math.abs(attacker.x - defender.x);
      if (dist > 130) return;
      const dmg = attacker.state === 'special' ? 20 : attacker.state === 'attack3' ? 12 : attacker.state === 'attack2' ? 10 : 8;
      dealDamage(attacker, defender, dmg);
    }

    let lastTime = performance.now();

    const animate = () => {
      if (!g.running) return;
      frameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;

      const { p1, p2 } = g;
      const arena = ARENAS[arenaIdx];

      // ── Draw background ──
      if (g.bgImg) {
        ctx!.drawImage(g.bgImg, 0, 0, W, H);
      } else {
        ctx!.fillStyle = arena.sky;
        ctx!.fillRect(0, 0, W, H);
      }
      // Ground
      ctx!.fillStyle = arena.ground;
      ctx!.fillRect(0, GROUND_Y, W, H - GROUND_Y);
      // Ground line glow
      const grad = ctx!.createLinearGradient(0, GROUND_Y - 2, 0, GROUND_Y + 4);
      grad.addColorStop(0, 'rgba(255,107,107,0.4)');
      grad.addColorStop(1, 'transparent');
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, GROUND_Y - 2, W, 6);

      // ── P1 Input (uses rebindable hotkeys) ──
      const hk = hotkeysRef.current;
      if (p1.state !== 'death' && p1.hp > 0) {
        if (!isActing(p1)) {
          if (keys.has(hk.moveLeft)) { p1.x = Math.max(40, p1.x - 200 * dt); setState(p1, 'run'); p1.facingRight = false; }
          else if (keys.has(hk.moveRight)) { p1.x = Math.min(W - 40, p1.x + 200 * dt); setState(p1, 'run'); p1.facingRight = true; }
          else if (keys.has(hk.punch)) setState(p1, 'attack1');
          else if (keys.has(hk.kick)) setState(p1, 'attack2');
          else if (keys.has(hk.heavy)) setState(p1, 'attack3');
          else if (keys.has(hk.special) && p1.specialMeter >= 100) { setState(p1, 'special'); p1.specialMeter = 0; }
          else if (keys.has(hk.block)) setState(p1, 'defend');
          else if (keys.has(hk.roll)) setState(p1, 'roll');
          else if (p1.state !== 'idle') setState(p1, 'idle');
        }
        // Face opponent
        if (!isActing(p1) && p1.state !== 'defend') p1.facingRight = p1.x < p2.x;
      }

      // ── P2 AI ──
      if (p2.state !== 'death' && p2.hp > 0) {
        if (!isActing(p2)) {
          const dist = Math.abs(p1.x - p2.x);
          p2.facingRight = p2.x < p1.x;
          if (dist > 140) {
            p2.x += (p1.x > p2.x ? 1 : -1) * 120 * dt;
            setState(p2, 'run');
          } else {
            const r = Math.random();
            if (r < 0.03) setState(p2, 'attack1');
            else if (r < 0.05) setState(p2, 'attack2');
            else if (r < 0.06) setState(p2, 'attack3');
            else if (r < 0.065 && p2.specialMeter >= 100) { setState(p2, 'special'); p2.specialMeter = 0; }
            else if (r < 0.09) setState(p2, 'defend');
            else if (r < 0.095) setState(p2, 'roll');
            else if (p2.state !== 'idle') setState(p2, 'idle');
          }
        }
      }

      // ── Update ──
      updateAnim(p1, dt);
      updateAnim(p2, dt);
      checkHit(p1, p2);
      checkHit(p2, p1);

      // ── Draw fighters ──
      drawFighter(p1);
      drawFighter(p2);

      // ── Update React state ──
      setP1HP(p1.hp); setP2HP(p2.hp);
      setCombo(p1.combo); setSpecialReady(p1.specialMeter >= 100);

      // ── KO check ──
      if ((p1.hp <= 0 || p2.hp <= 0) && phase === 'fight') {
        g.running = false;
        if (p1.hp <= 0) setP2Wins(w => w + 1);
        else setP1Wins(w => w + 1);
        setPhase('ko');
      }
    };
    animate();

    return () => {
      g.running = false;
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [phase, arenaIdx]);

  const nextRound = () => {
    setRound(r => r + 1);
    if (p1Wins >= 2 || p2Wins >= 2) {
      setPhase('victory');
    } else {
      startFight();
    }
  };

  const resetGame = () => {
    setPhase('select'); setRound(1); setP1Wins(0); setP2Wins(0);
    if (gameRef.current) gameRef.current.running = false;
  };

  // ── Character Select ──
  if (phase === 'select') {
    return (
      <div className="h-full flex flex-col bg-black overflow-hidden" data-testid="page-grudge-box">
        <style>{`
          .gbox-select { min-height:100vh; background: radial-gradient(ellipse at center, #1a0a2e 0%, #000 70%); display:flex; flex-direction:column; align-items:center; padding:2rem 1rem; }
          .gbox-title { font-size:2.5rem; font-weight:900; text-transform:uppercase; letter-spacing:4px; background:linear-gradient(45deg,#ff6b6b,#ffa726,#ff6b6b); -webkit-background-clip:text; -webkit-text-fill-color:transparent; margin-bottom:0.5rem; text-align:center; }
          .gbox-sub { color:rgba(255,255,255,0.4); font-size:0.85rem; margin-bottom:2rem; }
          .gbox-roster { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; max-width:700px; width:100%; margin-bottom:2rem; }
          .gbox-card { background:rgba(20,20,30,0.9); border-radius:12px; padding:1rem; cursor:pointer; border:2px solid rgba(255,255,255,0.08); transition:all 0.3s; text-align:center; position:relative; overflow:hidden; }
          .gbox-card:hover { transform:translateY(-4px); border-color:rgba(255,107,107,0.4); box-shadow:0 8px 25px rgba(255,107,107,0.2); }
          .gbox-card.sel { border-color:#ff6b6b; box-shadow:0 0 20px rgba(255,107,107,0.3); }
          .gbox-card.sel2 { border-color:#38bdf8; box-shadow:0 0 20px rgba(56,189,248,0.3); }
          .gbox-card-img { width:100%; height:120px; display:flex; align-items:center; justify-content:center; margin-bottom:0.5rem; image-rendering: pixelated; }
          .gbox-card-img img { max-height:100px; image-rendering:pixelated; }
          .gbox-card-name { color:#fff; font-weight:700; font-size:0.9rem; }
          .gbox-card-title { color:rgba(255,255,255,0.4); font-size:0.7rem; }
          .gbox-arenas { display:flex; gap:0.75rem; margin-bottom:2rem; }
          .gbox-arena-btn { padding:0.5rem 1.25rem; border-radius:20px; border:1px solid rgba(255,255,255,0.15); background:rgba(20,20,20,0.8); color:rgba(255,255,255,0.5); font-size:0.8rem; cursor:pointer; transition:all 0.3s; }
          .gbox-arena-btn.active { background:linear-gradient(45deg,#ff9500,#ff4d00); color:#fff; border-color:transparent; }
          .gbox-fight-btn { padding:1rem 3rem; border-radius:30px; background:linear-gradient(45deg,#ff6b6b,#ff4d00); color:#fff; font-size:1.2rem; font-weight:800; text-transform:uppercase; letter-spacing:3px; border:none; cursor:pointer; transition:all 0.3s; }
          .gbox-fight-btn:hover { transform:scale(1.05); box-shadow:0 0 30px rgba(255,107,107,0.5); }
          .gbox-labels { display:flex; gap:2rem; margin-bottom:0.5rem; }
          .gbox-labels span { font-size:0.75rem; font-weight:600; }
        `}</style>
        <div className="gbox-select">
          <div className="gbox-title">GrudgeBox</div>
          <div className="gbox-sub">Select your fighter</div>
          <div className="gbox-labels">
            <span style={{color:'#ff6b6b'}}>P1 — Click</span>
            <span style={{color:'#38bdf8'}}>P2 — Right-Click (AI)</span>
          </div>
          <div className="gbox-roster">
            {FIGHTERS.map((f, i) => (
              <div
                key={f.id}
                className={`gbox-card ${i === p1Pick ? 'sel' : ''} ${i === p2Pick ? 'sel2' : ''}`}
                onClick={() => setP1Pick(i)}
                onContextMenu={(e) => { e.preventDefault(); setP2Pick(i); }}
              >
                <div className="gbox-card-img">
                  <img src={`${CDN}/${f.id}/${f.anims.idle.file}`} alt={f.name} />
                </div>
                <div className="gbox-card-name" style={{color: f.color}}>{f.name}</div>
                <div className="gbox-card-title">{f.title}</div>
                <div style={{display:'flex',gap:'3px',justifyContent:'center',marginTop:'4px',flexWrap:'wrap'}}>
                  {Object.keys(f.anims).filter(k=>k.startsWith('attack')||k==='special').map(k=>(
                    <span key={k} style={{fontSize:'8px',padding:'1px 4px',borderRadius:'4px',background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.4)'}}>{k}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="gbox-arenas">
            {ARENAS.map((a, i) => (
              <button key={i} className={`gbox-arena-btn ${i === arenaIdx ? 'active' : ''}`} onClick={() => setArenaIdx(i)}>{a.name}</button>
            ))}
          </div>
          <div style={{display:'flex',gap:'0.75rem',alignItems:'center'}}>
            <button className="gbox-fight-btn" onClick={startFight} disabled={loading}>
              {loading ? 'Loading Sprites...' : 'FIGHT!'}
            </button>
            <button className="gbox-arena-btn" onClick={() => setShowSettings(true)}>⚙ Hotkeys</button>
          </div>

          {/* Hotkey Settings on Select Screen */}
          {showSettings && (
            <div style={{position:'fixed',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.7)',zIndex:100}}>
              <div style={{background:'#0a0a1a',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'1.5rem',width:'320px'}}>
                <h3 style={{fontSize:'14px',fontWeight:700,color:'#fff',marginBottom:'16px'}}>Hotkey Settings</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                  {(Object.keys(HOTKEY_LABELS) as (keyof Hotkeys)[]).map(action => (
                    <div key={action} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:'12px',color:'rgba(255,255,255,0.5)'}}>{HOTKEY_LABELS[action]}</span>
                      <button
                        style={{
                          fontSize:'12px',fontFamily:'monospace',padding:'4px 12px',borderRadius:'6px',minWidth:'60px',textAlign:'center',cursor:'pointer',
                          border: rebinding === action ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)',
                          background: rebinding === action ? 'rgba(245,158,11,0.2)' : 'rgba(30,30,30,0.9)',
                          color: rebinding === action ? '#fbbf24' : '#fff',
                        }}
                        onClick={() => setRebinding(rebinding === action ? null : action)}
                      >
                        {rebinding === action ? 'Press key...' : keyCodeToLabel(hotkeys[action])}
                      </button>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:'8px',marginTop:'16px'}}>
                  <button className="gbox-arena-btn" style={{flex:1}} onClick={() => {
                    const def = { ...DEFAULT_HOTKEYS }; setHotkeys(def); saveHotkeys(def); setRebinding(null);
                  }}>Reset</button>
                  <button className="gbox-arena-btn active" style={{flex:1}} onClick={() => { setShowSettings(false); setRebinding(null); }}>Done</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Victory Screen ──
  if (phase === 'victory') {
    const winner = p1Wins > p2Wins ? FIGHTERS[p1Pick] : FIGHTERS[p2Pick];
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-4" data-testid="page-grudge-box">
        <h1 className="text-4xl font-black uppercase tracking-widest" style={{color: winner.color}}>{winner.name}</h1>
        <p className="text-2xl font-bold text-amber-400">WINS!</p>
        <p className="text-muted-foreground">Score: {p1Wins} - {p2Wins}</p>
        <Button onClick={resetGame} className="mt-4">Back to Select</Button>
      </div>
    );
  }

  // ── Fight / KO Screen ──
  const f1 = FIGHTERS[p1Pick];
  const f2 = FIGHTERS[p2Pick];

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden" data-testid="page-grudge-box">
      {/* Canvas */}
      <div ref={containerRef} className="flex-1 min-h-0 flex items-center justify-center bg-black">
        <canvas ref={canvasRef} className="max-w-full max-h-full" style={{ imageRendering: 'pixelated' }} />
      </div>

      {/* HUD Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2">
          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-0 text-xs font-mono">ObjectStore Sprites</Badge>
          <span className="text-xs text-muted-foreground font-mono">Round {round}</span>
        </div>

        {/* HP Bars */}
        <div className="flex items-center gap-2 px-4 mt-1">
          {/* P1 HP */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold" style={{color: f1.color}}>{f1.name}</span>
              <span className="text-[10px] text-muted-foreground">{p1HP}/100</span>
            </div>
            <div className="w-full h-4 bg-stone-900 rounded-full overflow-hidden border border-white/10">
              <div className="h-full rounded-full transition-all duration-200" style={{width:`${p1HP}%`, background:`linear-gradient(90deg, ${f1.color}, ${f1.color}88)`}} />
            </div>
            <div className="flex items-center gap-2 mt-1">
              {Array.from({length: p1Wins}).map((_,i) => <div key={i} className="w-2 h-2 rounded-full bg-amber-400" />)}
              {Array.from({length: 2 - p1Wins}).map((_,i) => <div key={i} className="w-2 h-2 rounded-full bg-stone-700" />)}
              {combo > 1 && <span className="text-[9px] text-amber-400 font-mono ml-2">{combo} COMBO</span>}
              {specialReady && <span className="text-[9px] text-yellow-300 font-mono ml-1 animate-pulse">★ SPECIAL</span>}
            </div>
          </div>

          <span className="text-lg font-black text-white/20 mx-2">VS</span>

          {/* P2 HP */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">{p2HP}/100</span>
              <span className="text-[10px] font-bold" style={{color: f2.color}}>{f2.name}</span>
            </div>
            <div className="w-full h-4 bg-stone-900 rounded-full overflow-hidden border border-white/10 rotate-180">
              <div className="h-full rounded-full transition-all duration-200" style={{width:`${p2HP}%`, background:`linear-gradient(90deg, ${f2.color}, ${f2.color}88)`}} />
            </div>
            <div className="flex items-center gap-2 mt-1 justify-end">
              {Array.from({length: p2Wins}).map((_,i) => <div key={i} className="w-2 h-2 rounded-full bg-amber-400" />)}
              {Array.from({length: 2 - p2Wins}).map((_,i) => <div key={i} className="w-2 h-2 rounded-full bg-stone-700" />)}
            </div>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground bg-black/60 rounded px-3 py-1.5 flex gap-3 pointer-events-auto">
          <span>{keyCodeToLabel(hotkeys.moveLeft)}/{keyCodeToLabel(hotkeys.moveRight)} — Move</span>
          <span>{keyCodeToLabel(hotkeys.punch)} — Punch</span>
          <span>{keyCodeToLabel(hotkeys.kick)} — Kick</span>
          <span>{keyCodeToLabel(hotkeys.heavy)} — Heavy</span>
          <span>{keyCodeToLabel(hotkeys.special)} — Special</span>
          <span>{keyCodeToLabel(hotkeys.block)} — Block</span>
          <span>{keyCodeToLabel(hotkeys.roll)} — Roll</span>
          <button className="text-amber-400 hover:text-amber-300 ml-2" onClick={() => setShowSettings(true)}>⚙ Keys</button>
        </div>

        {/* Hotkey Settings Modal */}
        {showSettings && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 pointer-events-auto z-50">
            <div className="bg-stone-950 border border-white/10 rounded-xl p-6 w-80">
              <h3 className="text-sm font-bold text-white mb-4">Hotkey Settings</h3>
              <div className="space-y-2">
                {(Object.keys(HOTKEY_LABELS) as (keyof Hotkeys)[]).map(action => (
                  <div key={action} className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{HOTKEY_LABELS[action]}</span>
                    <button
                      className={`text-xs font-mono px-3 py-1.5 rounded border transition-all min-w-[60px] text-center ${
                        rebinding === action
                          ? 'border-amber-500 bg-amber-500/20 text-amber-300 animate-pulse'
                          : 'border-white/10 bg-stone-900 text-white hover:border-white/30'
                      }`}
                      onClick={() => setRebinding(rebinding === action ? null : action)}
                    >
                      {rebinding === action ? '...' : keyCodeToLabel(hotkeys[action])}
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => {
                  const def = { ...DEFAULT_HOTKEYS };
                  setHotkeys(def); saveHotkeys(def); setRebinding(null);
                }}>Reset Defaults</Button>
                <Button size="sm" className="flex-1 text-xs" onClick={() => { setShowSettings(false); setRebinding(null); }}>Done</Button>
              </div>
            </div>
          </div>
        )}

        {/* KO overlay */}
        {phase === 'ko' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-auto">
            <div className="text-center">
              <h2 className="text-5xl font-black text-red-500 mb-2" style={{textShadow:'0 0 30px rgba(255,0,0,0.5)'}}>K.O.</h2>
              <p className="text-lg font-bold mb-4" style={{color: p1HP > 0 ? f1.color : f2.color}}>
                {p1HP > 0 ? f1.name : f2.name} wins the round!
              </p>
              <Button onClick={nextRound} className="bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-500 hover:to-orange-400">
                {p1Wins >= 2 || p2Wins >= 2 ? 'Final Result' : 'Next Round'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
