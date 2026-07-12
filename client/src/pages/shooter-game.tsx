import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';
import {
  Play,
  Pause,
  Home,
  RotateCcw,
  Trophy,
  Heart,
  Zap,
  Rocket,
  Shield,
  Crosshair,
} from "lucide-react";

// ── Sprite Sheet Definitions ──
const SPRITE_SHEETS = {
  ships: { src: "/assets/sprites/SpaceShooterAssetPack_Ships.png", fw: 16, fh: 16, cols: 5, rows: 8 },
  projectiles: { src: "/assets/sprites/SpaceShooterAssetPack_Projectiles.png", fw: 16, fh: 16, cols: 8, rows: 6 },
  misc: { src: "/assets/sprites/SpaceShooterAssetPack_Miscellaneous.png", fw: 16, fh: 16, cols: 8, rows: 4 },
  ui: { src: "/assets/sprites/SpaceShooterAssetPack_IU.png", fw: 16, fh: 16, cols: 16, rows: 12 },
  bgs: { src: "/assets/sprites/SpaceShooterAssetPack_BackGrounds.png", fw: 128, fh: 192, cols: 3, rows: 2 },
  characters: { src: "/assets/sprites/SpaceShooterAssetPack_Characters.png", fw: 16, fh: 16, cols: 8, rows: 12 },
};

type SheetKey = keyof typeof SPRITE_SHEETS;

// ── Types ──
interface Vec2 { x: number; y: number; }

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  type: "spark" | "explosion" | "trail" | "ring" | "debris";
}

interface Bullet {
  x: number; y: number;
  vx: number; vy: number;
  isPlayer: boolean;
  damage: number;
  type: "normal" | "spread" | "laser" | "missile" | "enemy";
  spriteCol: number; spriteRow: number;
  width: number; height: number;
  life: number;
  target?: Enemy | null;
}

interface Enemy {
  x: number; y: number;
  width: number; height: number;
  health: number; maxHealth: number;
  type: "scout" | "fighter" | "bomber" | "cruiser" | "boss";
  spriteCol: number; spriteRow: number;
  shootCooldown: number;
  shootRate: number;
  points: number;
  vx: number; vy: number;
  movePattern: "straight" | "sine" | "zigzag" | "circle" | "swoop";
  moveTimer: number;
  originX: number;
  flash: number;
}

interface Powerup {
  x: number; y: number;
  type: "health" | "weapon" | "shield" | "bomb" | "score";
  spriteCol: number; spriteRow: number;
  vy: number;
  pulse: number;
}

interface StarLayer {
  stars: { x: number; y: number; size: number; brightness: number }[];
  speed: number;
}

interface Player {
  x: number; y: number;
  width: number; height: number;
  health: number; maxHealth: number;
  shootCooldown: number;
  weapon: "normal" | "spread" | "laser" | "missile";
  weaponLevel: number;
  shield: number; maxShield: number;
  shieldRegenDelay: number;
  invincible: number;
  thrustAnim: number;
  tilt: number;
  bombs: number;
}

interface GameData {
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  powerups: Powerup[];
  particles: Particle[];
  starLayers: StarLayer[];
  keys: Set<string>;
  mouse: { x: number; y: number; down: boolean };
  wave: number;
  enemiesKilled: number;
  totalKilled: number;
  waveEnemyCount: number;
  waveSpawnTimer: number;
  waveSpawned: number;
  bossActive: boolean;
  combo: number;
  comboTimer: number;
  maxCombo: number;
  screenShake: number;
  shakeX: number; shakeY: number;
  bgScrollY: number;
  time: number;
  difficulty: number;
}

// ── Constants ──
const EXPLOSION_COLORS = ["#ff6b35", "#ff9f1c", "#ffdc5e", "#fff", "#ff4444", "#ff8800"];
const COMBO_COLORS = ["#fff", "#ffdc5e", "#ff9f1c", "#ff6b35", "#ff3366", "#cc00ff"];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function rand(min: number, max: number) { return Math.random() * (max - min) + min; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function dist(a: Vec2, b: Vec2) { return Math.hypot(b.x - a.x, b.y - a.y); }

const CW = 700;
const CH = 900;

export default function ShooterGame() {
  return (
    <GrudgeGameWrapper gameSlug="shooter" gameName="Space Assault" xpPerThousand={12} goldPerGame={8}>
      {(session) => <ShooterGameInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function ShooterGameInner({ session }: { session: GrudgeGameSession }) {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const dataRef = useRef<GameData | null>(null);
  const sheetsRef = useRef<Record<string, HTMLImageElement>>({});
  const sheetsLoadedRef = useRef(false);
  const lastTimeRef = useRef(0);

  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "gameover" | "victory">("menu");
  const [score, setScore] = useState(0);
  const [displayWave, setDisplayWave] = useState(1);
  const [displayHealth, setDisplayHealth] = useState(100);
  const [displayShield, setDisplayShield] = useState(50);
  const [displayCombo, setDisplayCombo] = useState(0);
  const [displayWeapon, setDisplayWeapon] = useState<string>("normal");
  const [displayBombs, setDisplayBombs] = useState(3);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem("shooter-highscore-v2");
    return saved ? parseInt(saved) : 0;
  });

  // ── Load sprite sheets ──
  useEffect(() => {
    let loaded = 0;
    const total = Object.keys(SPRITE_SHEETS).length;
    for (const [key, def] of Object.entries(SPRITE_SHEETS)) {
      const img = new Image();
      img.src = def.src;
      img.onload = () => {
        sheetsRef.current[key] = img;
        loaded++;
        if (loaded >= total) sheetsLoadedRef.current = true;
      };
      img.onerror = () => {
        loaded++;
        if (loaded >= total) sheetsLoadedRef.current = true;
      };
    }
  }, []);

  // ── Draw sprite helper ──
  const drawSprite = useCallback((
    ctx: CanvasRenderingContext2D,
    sheet: SheetKey,
    col: number, row: number,
    x: number, y: number,
    w: number, h: number,
    _flip = false,
    rotation = 0,
    _alpha = 1,
  ) => {
    const img = sheetsRef.current[sheet];
    const def = SPRITE_SHEETS[sheet];
    if (!img) {
      ctx.fillStyle = "#ff00ff";
      ctx.fillRect(x, y, w, h);
      return;
    }
    ctx.save();
    ctx.globalAlpha = _alpha;
    ctx.translate(x + w / 2, y + h / 2);
    if (rotation) ctx.rotate(rotation);
    if (_flip) ctx.scale(-1, 1);
    ctx.drawImage(img, col * def.fw, row * def.fh, def.fw, def.fh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, []);

  // ── Particle spawners ──
  const spawnExplosion = useCallback((x: number, y: number, size: number, count = 20) => {
    const d = dataRef.current;
    if (!d) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(50, 250) * (size / 30);
      d.particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: rand(0.2, 0.8), maxLife: rand(0.2, 0.8),
        size: rand(2, 6) * (size / 20),
        color: EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)],
        type: Math.random() > 0.5 ? "spark" : "explosion",
      });
    }
    d.particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, size: size * 0.3, color: "#fff", type: "ring" });
  }, []);

  const spawnTrail = useCallback((x: number, y: number, color: string) => {
    const d = dataRef.current;
    if (!d) return;
    d.particles.push({
      x: x + rand(-3, 3), y, vx: rand(-20, 20), vy: rand(30, 100),
      life: rand(0.1, 0.3), maxLife: 0.3, size: rand(2, 5), color, type: "trail",
    });
  }, []);

  // ── Spawn enemies ──
  const spawnEnemy = useCallback((type: Enemy["type"], x?: number) => {
    const d = dataRef.current;
    if (!d) return;
    const configs: Record<Enemy["type"], { w: number; h: number; health: number; points: number; shootRate: number; spriteCol: number; spriteRow: number; movePattern: Enemy["movePattern"] }> = {
      scout:   { w: 36, h: 36, health: 1,  points: 100,  shootRate: 120, spriteCol: 0, spriteRow: 2, movePattern: "sine" },
      fighter: { w: 44, h: 44, health: 3,  points: 200,  shootRate: 80,  spriteCol: 1, spriteRow: 2, movePattern: "zigzag" },
      bomber:  { w: 52, h: 52, health: 5,  points: 350,  shootRate: 60,  spriteCol: 2, spriteRow: 2, movePattern: "straight" },
      cruiser: { w: 60, h: 48, health: 10, points: 500,  shootRate: 40,  spriteCol: 3, spriteRow: 2, movePattern: "swoop" },
      boss:    { w: 128, h: 96, health: 50 + d.wave * 15, points: 2000, shootRate: 15, spriteCol: 0, spriteRow: 4, movePattern: "circle" },
    };
    const c = configs[type];
    const spawnX = x ?? rand(c.w, CW - c.w);
    d.enemies.push({
      x: spawnX, y: -c.h - rand(0, 60), width: c.w, height: c.h,
      health: c.health, maxHealth: c.health, type,
      spriteCol: c.spriteCol, spriteRow: c.spriteRow,
      shootCooldown: rand(20, c.shootRate), shootRate: c.shootRate,
      points: c.points, vx: 0, vy: type === "boss" ? 0.5 : rand(0.5, 1.5) + d.difficulty * 0.15,
      movePattern: c.movePattern, moveTimer: rand(0, Math.PI * 2),
      originX: spawnX, flash: 0,
    });
  }, []);

  // ── Start game ──
  const startGame = useCallback(() => {
    const starLayers: StarLayer[] = [];
    for (let layer = 0; layer < 4; layer++) {
      const stars: StarLayer["stars"] = [];
      for (let i = 0; i < 40 + layer * 30; i++) {
        stars.push({ x: Math.random() * CW, y: Math.random() * CH, size: rand(0.5, 1.5 + layer * 0.5), brightness: rand(0.2, 0.8) });
      }
      starLayers.push({ stars, speed: 20 + layer * 30 });
    }
    dataRef.current = {
      player: {
        x: CW / 2 - 24, y: CH - 100, width: 48, height: 48,
        health: 100, maxHealth: 100, shootCooldown: 0,
        weapon: "normal", weaponLevel: 1,
        shield: 50, maxShield: 50, shieldRegenDelay: 0,
        invincible: 60, thrustAnim: 0, tilt: 0, bombs: 3,
      },
      bullets: [], enemies: [], powerups: [], particles: [], starLayers,
      keys: new Set(), mouse: { x: CW / 2, y: CH / 2, down: false },
      wave: 1, enemiesKilled: 0, totalKilled: 0,
      waveEnemyCount: 8, waveSpawnTimer: 0, waveSpawned: 0, bossActive: false,
      combo: 0, comboTimer: 0, maxCombo: 0,
      screenShake: 0, shakeX: 0, shakeY: 0, bgScrollY: 0, time: 0, difficulty: 1,
    };
    setScore(0); setDisplayWave(1); setDisplayHealth(100); setDisplayShield(50);
    setDisplayCombo(0); setDisplayWeapon("normal"); setDisplayBombs(3);
    setGameState("playing"); lastTimeRef.current = performance.now();
  }, []);

  // ── Bomb ──
  const useBomb = useCallback(() => {
    const d = dataRef.current;
    if (!d || d.player.bombs <= 0) return;
    d.player.bombs--;
    d.screenShake = 15;
    for (let i = d.enemies.length - 1; i >= 0; i--) {
      const e = d.enemies[i];
      e.health -= 20; e.flash = 8;
      spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.width, 10);
      if (e.health <= 0) {
        d.enemiesKilled++; d.totalKilled++;
        setScore(prev => prev + e.points);
        spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.width * 1.5, 30);
        d.enemies.splice(i, 1);
      }
    }
    d.bullets = d.bullets.filter(b => b.isPlayer);
    for (let i = 0; i < 80; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(100, 500);
      d.particles.push({
        x: d.player.x + d.player.width / 2, y: d.player.y + d.player.height / 2,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: rand(0.5, 1.5), maxLife: 1.5, size: rand(3, 10),
        color: EXPLOSION_COLORS[Math.floor(Math.random() * EXPLOSION_COLORS.length)],
        type: "explosion",
      });
    }
  }, [spawnExplosion]);

  // ── Main game loop ──
  useEffect(() => {
    if (gameState !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const d = dataRef.current; if (!d) return;
      d.keys.add(e.key.toLowerCase());
      if (e.key.toLowerCase() === "b" || e.key.toLowerCase() === "q") useBomb();
      if (e.key === "Escape") setGameState("paused");
    };
    const handleKeyUp = (e: KeyboardEvent) => { dataRef.current?.keys.delete(e.key.toLowerCase()); };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (dataRef.current) { dataRef.current.mouse.x = e.clientX - rect.left; dataRef.current.mouse.y = e.clientY - rect.top; }
    };
    const handleMouseDown = () => { if (dataRef.current) dataRef.current.mouse.down = true; };
    const handleMouseUp = () => { if (dataRef.current) dataRef.current.mouse.down = false; };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);

    const playerShoot = (d: GameData) => {
      const p = d.player;
      const cx = p.x + p.width / 2;
      const cy = p.y;
      const lvl = p.weaponLevel;
      switch (p.weapon) {
        case "normal": {
          const spread = lvl >= 3 ? 3 : lvl >= 2 ? 2 : 1;
          for (let i = 0; i < spread; i++) {
            const offset = (i - (spread - 1) / 2) * 12;
            d.bullets.push({ x: cx + offset - 3, y: cy, vx: 0, vy: -14, isPlayer: true, damage: 1 + Math.floor(lvl / 2), type: "normal", spriteCol: 0, spriteRow: 0, width: 6, height: 18, life: 200 });
          }
          p.shootCooldown = Math.max(4, 12 - lvl * 2);
          break;
        }
        case "spread": {
          const count = 3 + lvl;
          const arc = Math.PI * 0.35;
          for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (i / (count - 1) - 0.5) * arc;
            d.bullets.push({ x: cx - 3, y: cy, vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12, isPlayer: true, damage: 1, type: "spread", spriteCol: 1, spriteRow: 0, width: 8, height: 8, life: 120 });
          }
          p.shootCooldown = Math.max(8, 18 - lvl * 2);
          break;
        }
        case "laser": {
          d.bullets.push({ x: cx - 4, y: cy, vx: 0, vy: -20, isPlayer: true, damage: 2 + lvl, type: "laser", spriteCol: 2, spriteRow: 0, width: 8, height: 40, life: 100 });
          p.shootCooldown = Math.max(2, 6 - lvl);
          break;
        }
        case "missile": {
          const nearest = d.enemies.reduce<Enemy | null>((best, e) => {
            const dd = dist({ x: cx, y: cy }, { x: e.x + e.width / 2, y: e.y + e.height / 2 });
            if (!best || dd < dist({ x: cx, y: cy }, { x: best.x + best.width / 2, y: best.y + best.height / 2 })) return e;
            return best;
          }, null);
          d.bullets.push({ x: cx - 5, y: cy, vx: rand(-2, 2), vy: -8, isPlayer: true, damage: 4 + lvl * 2, type: "missile", spriteCol: 3, spriteRow: 0, width: 10, height: 20, life: 200, target: nearest });
          p.shootCooldown = Math.max(15, 30 - lvl * 3);
          break;
        }
      }
    };

    const gameLoop = (timestamp: number) => {
      if (gameState !== "playing" || !dataRef.current) return;
      const d = dataRef.current;
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;
      d.time += dt;
      const p = d.player;
      const keys = d.keys;

      // ── Input ──
      const speed = 7;
      let dx = 0, dy = 0;
      if (keys.has("a") || keys.has("arrowleft")) dx -= speed;
      if (keys.has("d") || keys.has("arrowright")) dx += speed;
      if (keys.has("w") || keys.has("arrowup")) dy -= speed;
      if (keys.has("s") || keys.has("arrowdown")) dy += speed;
      p.x = clamp(p.x + dx, 0, CW - p.width);
      p.y = clamp(p.y + dy, CH * 0.15, CH - p.height - 10);
      p.tilt = lerp(p.tilt, clamp(dx * 0.06, -0.3, 0.3), 0.15);
      p.thrustAnim += dt * 12;

      if (p.shootCooldown > 0) p.shootCooldown--;
      if ((keys.has(" ") || d.mouse.down) && p.shootCooldown <= 0) playerShoot(d);

      if (p.shieldRegenDelay > 0) p.shieldRegenDelay -= dt;
      else p.shield = Math.min(p.maxShield, p.shield + dt * 5);
      if (p.invincible > 0) p.invincible--;

      if (Math.random() > 0.3) {
        spawnTrail(p.x + p.width / 2, p.y + p.height, "#3af");
        spawnTrail(p.x + p.width / 2 - 8, p.y + p.height - 4, "#08f");
        spawnTrail(p.x + p.width / 2 + 8, p.y + p.height - 4, "#08f");
      }

      if (d.comboTimer > 0) { d.comboTimer -= dt; if (d.comboTimer <= 0) d.combo = 0; }

      // ── Wave spawning ──
      if (!d.bossActive) {
        d.waveSpawnTimer -= dt;
        if (d.waveSpawnTimer <= 0 && d.waveSpawned < d.waveEnemyCount) {
          const roll = Math.random();
          let type: Enemy["type"];
          if (d.wave >= 5 && roll < 0.1) type = "cruiser";
          else if (d.wave >= 3 && roll < 0.25) type = "bomber";
          else if (roll < 0.5) type = "fighter";
          else type = "scout";
          spawnEnemy(type);
          d.waveSpawned++;
          d.waveSpawnTimer = rand(0.3, 1.2) / (1 + d.difficulty * 0.1);
        }
        if (d.waveSpawned >= d.waveEnemyCount && d.enemies.length === 0) {
          if (d.wave % 5 === 0) {
            spawnEnemy("boss", CW / 2 - 64);
            d.bossActive = true;
          } else {
            d.wave++; d.difficulty = 1 + (d.wave - 1) * 0.2;
            d.waveEnemyCount = 6 + d.wave * 3; d.waveSpawned = 0; d.waveSpawnTimer = 2;
            setDisplayWave(d.wave);
            if (d.wave > 20) {
              if (score > highScore) { setHighScore(score); localStorage.setItem("shooter-highscore-v2", score.toString()); }
              setGameState("victory"); return;
            }
          }
        }
      } else if (d.enemies.length === 0) {
        d.bossActive = false; d.wave++; d.difficulty = 1 + (d.wave - 1) * 0.2;
        d.waveEnemyCount = 6 + d.wave * 3; d.waveSpawned = 0; d.waveSpawnTimer = 3;
        setDisplayWave(d.wave);
      }

      // ── Update enemies ──
      for (let i = d.enemies.length - 1; i >= 0; i--) {
        const e = d.enemies[i];
        e.moveTimer += dt * 2;
        if (e.flash > 0) e.flash--;
        switch (e.movePattern) {
          case "straight": e.y += e.vy * 60 * dt; break;
          case "sine": e.y += e.vy * 60 * dt; e.x = e.originX + Math.sin(e.moveTimer * 2) * 80; break;
          case "zigzag": e.y += e.vy * 60 * dt; e.x += Math.sign(Math.sin(e.moveTimer * 3)) * 2; break;
          case "swoop": e.y += e.vy * 60 * dt; e.x += Math.cos(e.moveTimer) * 3; break;
          case "circle": if (e.y < 100) e.y += 60 * dt; e.x = CW / 2 - e.width / 2 + Math.sin(e.moveTimer) * 200; break;
        }
        e.x = clamp(e.x, 0, CW - e.width);

        e.shootCooldown -= dt * 60;
        if (e.shootCooldown <= 0) {
          const ecx = e.x + e.width / 2, ecy = e.y + e.height;
          if (e.type === "boss") {
            for (let b = 0; b < 5; b++) {
              const angle = Math.PI / 2 + (b - 2) * 0.25;
              d.bullets.push({ x: ecx, y: ecy, vx: Math.cos(angle) * 6, vy: Math.sin(angle) * 6, isPlayer: false, damage: 15, type: "enemy", spriteCol: 4, spriteRow: 1, width: 8, height: 8, life: 300 });
            }
          } else {
            const angle = Math.atan2(p.y - ecy, (p.x + p.width / 2) - ecx);
            const spd = 4 + d.difficulty * 0.5;
            d.bullets.push({ x: ecx, y: ecy, vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd, isPlayer: false, damage: 10, type: "enemy", spriteCol: 4, spriteRow: 0, width: 6, height: 6, life: 300 });
          }
          e.shootCooldown = e.shootRate;
        }
        if (e.y > CH + 50) d.enemies.splice(i, 1);
      }

      // ── Update bullets ──
      for (let i = d.bullets.length - 1; i >= 0; i--) {
        const b = d.bullets[i];
        b.life--;
        if (b.type === "missile" && b.target && b.target.health > 0) {
          const tx = b.target.x + b.target.width / 2 - b.x;
          const ty = b.target.y + b.target.height / 2 - b.y;
          const angle = Math.atan2(ty, tx);
          b.vx = lerp(b.vx, Math.cos(angle) * 10, 0.08);
          b.vy = lerp(b.vy, Math.sin(angle) * 10, 0.08);
        }
        b.x += b.vx; b.y += b.vy;
        if (b.life <= 0 || b.x < -20 || b.x > CW + 20 || b.y < -40 || b.y > CH + 40) { d.bullets.splice(i, 1); continue; }

        if (b.isPlayer) {
          for (let j = d.enemies.length - 1; j >= 0; j--) {
            const e = d.enemies[j];
            if (b.x + b.width > e.x && b.x < e.x + e.width && b.y + b.height > e.y && b.y < e.y + e.height) {
              e.health -= b.damage; e.flash = 4;
              d.bullets.splice(i, 1);
              for (let s = 0; s < 4; s++) d.particles.push({ x: b.x, y: b.y, vx: rand(-80, 80), vy: rand(-80, 80), life: 0.15, maxLife: 0.15, size: 3, color: "#fff", type: "spark" });
              if (e.health <= 0) {
                d.combo++; d.comboTimer = 2;
                if (d.combo > d.maxCombo) d.maxCombo = d.combo;
                const pts = Math.floor(e.points * (1 + Math.floor(d.combo / 5) * 0.5));
                setScore(prev => prev + pts);
                d.enemiesKilled++; d.totalKilled++;
                spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.width, e.type === "boss" ? 60 : 20);
                d.screenShake = e.type === "boss" ? 20 : 5;
                if (Math.random() < (e.type === "boss" ? 0.9 : 0.12)) {
                  const types: Powerup["type"][] = ["health", "weapon", "shield", "bomb", "score"];
                  d.powerups.push({ x: e.x + e.width / 2, y: e.y + e.height / 2, type: types[Math.floor(Math.random() * types.length)], spriteCol: 0, spriteRow: 0, vy: 1.5, pulse: 0 });
                }
                d.enemies.splice(j, 1);
              }
              break;
            }
          }
        } else {
          if (b.x + b.width > p.x + 6 && b.x < p.x + p.width - 6 && b.y + b.height > p.y + 6 && b.y < p.y + p.height - 6 && p.invincible <= 0) {
            let dmg = b.damage;
            if (p.shield > 0) { const absorbed = Math.min(p.shield, dmg); p.shield -= absorbed; dmg -= absorbed; p.shieldRegenDelay = 3; }
            if (dmg > 0) { p.health -= dmg; d.screenShake = 8; p.invincible = 30; }
            d.bullets.splice(i, 1);
            if (p.health <= 0) {
              spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, 80, 50);
              if (score > highScore) { setHighScore(score); localStorage.setItem("shooter-highscore-v2", score.toString()); }
              setGameState("gameover"); return;
            }
          }
        }
      }

      // ── Enemy body collision ──
      for (let i = d.enemies.length - 1; i >= 0; i--) {
        const e = d.enemies[i];
        if (p.x + p.width - 8 > e.x && p.x + 8 < e.x + e.width && p.y + p.height - 8 > e.y && p.y + 8 < e.y + e.height && p.invincible <= 0) {
          let dmg = 25;
          if (p.shield > 0) { const absorbed = Math.min(p.shield, dmg); p.shield -= absorbed; dmg -= absorbed; p.shieldRegenDelay = 3; }
          p.health -= dmg; p.invincible = 45; d.screenShake = 12;
          spawnExplosion(e.x + e.width / 2, e.y + e.height / 2, e.width, 15);
          if (e.type !== "boss") { d.enemies.splice(i, 1); d.enemiesKilled++; d.totalKilled++; } else e.health -= 5;
          if (p.health <= 0) {
            spawnExplosion(p.x + p.width / 2, p.y + p.height / 2, 80, 50);
            if (score > highScore) { setHighScore(score); localStorage.setItem("shooter-highscore-v2", score.toString()); }
            setGameState("gameover"); return;
          }
        }
      }

      // ── Powerups ──
      for (let i = d.powerups.length - 1; i >= 0; i--) {
        const pw = d.powerups[i]; pw.y += pw.vy; pw.pulse += dt * 4;
        if (pw.y > CH + 30) { d.powerups.splice(i, 1); continue; }
        if (p.x + p.width > pw.x - 20 && p.x < pw.x + 20 && p.y + p.height > pw.y - 20 && p.y < pw.y + 20) {
          switch (pw.type) {
            case "health": p.health = Math.min(p.maxHealth, p.health + 30); break;
            case "weapon": {
              const weapons: Player["weapon"][] = ["normal", "spread", "laser", "missile"];
              if (p.weaponLevel < 5) p.weaponLevel++;
              else { p.weapon = weapons[(weapons.indexOf(p.weapon) + 1) % weapons.length]; p.weaponLevel = 1; }
              break;
            }
            case "shield": p.shield = p.maxShield; break;
            case "bomb": p.bombs = Math.min(5, p.bombs + 1); break;
            case "score": setScore(prev => prev + 500); break;
          }
          d.powerups.splice(i, 1);
        }
      }

      // ── Particles ──
      for (let i = d.particles.length - 1; i >= 0; i--) {
        const pt = d.particles[i]; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
        if (pt.type === "explosion") { pt.vx *= 0.96; pt.vy *= 0.96; }
        if (pt.life <= 0) d.particles.splice(i, 1);
      }

      // ── Screen shake ──
      if (d.screenShake > 0) {
        d.screenShake *= 0.85;
        d.shakeX = (Math.random() - 0.5) * d.screenShake;
        d.shakeY = (Math.random() - 0.5) * d.screenShake;
        if (d.screenShake < 0.5) d.screenShake = 0;
      } else { d.shakeX = 0; d.shakeY = 0; }

      setDisplayHealth(p.health); setDisplayShield(Math.floor(p.shield));
      setDisplayCombo(d.combo); setDisplayWeapon(p.weapon); setDisplayBombs(p.bombs);

      // ═══════ RENDER ═══════
      ctx.save();
      ctx.translate(d.shakeX, d.shakeY);

      // BG
      d.bgScrollY += dt * 30;
      const bgImg = sheetsRef.current["bgs"];
      if (bgImg) {
        const bgDef = SPRITE_SHEETS.bgs;
        const sy = d.bgScrollY % CH;
        ctx.drawImage(bgImg, 0, 0, bgDef.fw, bgDef.fh, 0, sy - CH, CW, CH);
        ctx.drawImage(bgImg, 0, 0, bgDef.fw, bgDef.fh, 0, sy, CW, CH);
      } else { ctx.fillStyle = "#06060f"; ctx.fillRect(0, 0, CW, CH); }

      // Stars
      for (const layer of d.starLayers) {
        for (const star of layer.stars) {
          star.y += layer.speed * dt;
          if (star.y > CH) { star.y = -2; star.x = Math.random() * CW; }
          ctx.fillStyle = `rgba(200, 220, 255, ${star.brightness * (0.5 + Math.sin(d.time * 3 + star.x) * 0.3)})`;
          ctx.fillRect(star.x, star.y, star.size, star.size);
        }
      }

      // Particles
      for (const pt of d.particles) {
        const alpha = pt.life / pt.maxLife;
        if (pt.type === "ring") {
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size + (1 - alpha) * 50, 0, Math.PI * 2); ctx.stroke();
        } else {
          ctx.globalAlpha = alpha; ctx.fillStyle = pt.color;
          const s = pt.size * (pt.type === "explosion" ? (0.5 + alpha * 0.5) : 1);
          ctx.fillRect(pt.x - s / 2, pt.y - s / 2, s, s); ctx.globalAlpha = 1;
        }
      }

      // Powerups
      for (const pw of d.powerups) {
        const pulseScale = 1 + Math.sin(pw.pulse) * 0.15;
        const size = 28 * pulseScale;
        const colors: Record<string, string> = { health: "#2ecc71", weapon: "#f39c12", shield: "#3498db", bomb: "#e74c3c", score: "#f1c40f" };
        const icons: Record<string, string> = { health: "+", weapon: "W", shield: "S", bomb: "B", score: "$" };
        ctx.shadowBlur = 15; ctx.shadowColor = colors[pw.type];
        ctx.fillStyle = colors[pw.type]; ctx.beginPath(); ctx.arc(pw.x, pw.y, size / 2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(icons[pw.type], pw.x, pw.y);
      }

      // Enemies
      for (const e of d.enemies) {
        ctx.save();
        if (e.flash > 0) { ctx.globalAlpha = 0.5 + Math.sin(e.flash * 3) * 0.5; ctx.filter = "brightness(3)"; }
        drawSprite(ctx, "ships", e.spriteCol, e.spriteRow, e.x, e.y, e.width, e.height, false, Math.PI);
        ctx.filter = "none"; ctx.globalAlpha = 1; ctx.restore();
        if (e.maxHealth > 1) {
          const barW = e.width * 0.8, barH = 4, bx = e.x + (e.width - barW) / 2, by = e.y - 8;
          ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
          const hp = e.health / e.maxHealth;
          ctx.fillStyle = hp > 0.5 ? "#2ecc71" : hp > 0.25 ? "#f39c12" : "#e74c3c";
          ctx.fillRect(bx, by, barW * hp, barH);
        }
      }

      // Bullets
      for (const b of d.bullets) {
        if (b.isPlayer) {
          if (b.type === "laser") {
            ctx.fillStyle = "#0ff"; ctx.shadowBlur = 8; ctx.shadowColor = "#0ff";
            ctx.fillRect(b.x, b.y, b.width, b.height); ctx.shadowBlur = 0;
          } else if (b.type === "missile") {
            ctx.fillStyle = "#ff6600"; ctx.beginPath();
            ctx.moveTo(b.x + b.width / 2, b.y); ctx.lineTo(b.x, b.y + b.height);
            ctx.lineTo(b.x + b.width, b.y + b.height); ctx.closePath(); ctx.fill();
            spawnTrail(b.x + b.width / 2, b.y + b.height, "#f80");
          } else if (b.type === "spread") {
            ctx.fillStyle = "#ff0"; ctx.shadowBlur = 6; ctx.shadowColor = "#ff0";
            ctx.beginPath(); ctx.arc(b.x + b.width / 2, b.y + b.height / 2, b.width / 2, 0, Math.PI * 2);
            ctx.fill(); ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = "#3af"; ctx.shadowBlur = 6; ctx.shadowColor = "#3af";
            ctx.fillRect(b.x, b.y, b.width, b.height); ctx.shadowBlur = 0;
          }
        } else {
          ctx.fillStyle = "#f44"; ctx.shadowBlur = 5; ctx.shadowColor = "#f44";
          ctx.beginPath(); ctx.arc(b.x, b.y, b.width / 2 + 1, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        }
      }

      // Player
      if (p.invincible <= 0 || Math.floor(p.invincible) % 4 < 2) {
        ctx.save(); ctx.translate(p.x + p.width / 2, p.y + p.height / 2); ctx.rotate(p.tilt);
        drawSprite(ctx, "ships", 0, 0, -p.width / 2, -p.height / 2, p.width, p.height);
        const glowSize = 12 + Math.sin(p.thrustAnim) * 4;
        ctx.fillStyle = "rgba(0, 150, 255, 0.3)";
        ctx.beginPath(); ctx.ellipse(0, p.height / 2 + 4, 10, glowSize, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        if (p.shield > 0) {
          const sa = p.shield / p.maxShield * 0.4;
          ctx.strokeStyle = `rgba(0, 180, 255, ${sa + 0.1})`; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.7, 0, Math.PI * 2);
          ctx.stroke(); ctx.fillStyle = `rgba(0, 180, 255, ${sa * 0.3})`; ctx.fill();
        }
      }

      // HUD
      if (d.combo >= 3) {
        const ci = Math.min(Math.floor(d.combo / 5), COMBO_COLORS.length - 1);
        ctx.fillStyle = COMBO_COLORS[ci]; ctx.font = `bold ${20 + Math.min(d.combo, 20)}px monospace`;
        ctx.textAlign = "center"; ctx.shadowBlur = 10; ctx.shadowColor = COMBO_COLORS[ci];
        ctx.fillText(`${d.combo}x COMBO`, CW / 2, 60); ctx.shadowBlur = 0;
      }
      if (d.waveSpawned === 0 && d.waveSpawnTimer > 1) {
        ctx.globalAlpha = Math.min(1, d.waveSpawnTimer - 1);
        ctx.fillStyle = "#fff"; ctx.font = "bold 36px monospace"; ctx.textAlign = "center";
        ctx.fillText(`WAVE ${d.wave}`, CW / 2, CH / 2 - 20);
        ctx.font = "16px monospace"; ctx.fillStyle = "#aaa";
        ctx.fillText("incoming hostiles", CW / 2, CH / 2 + 15); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = "#fff"; ctx.font = "12px monospace"; ctx.textAlign = "left";
      ctx.fillText("[B] BOMBS:", 10, CH - 14);
      for (let i = 0; i < p.bombs; i++) { ctx.fillStyle = "#e74c3c"; ctx.beginPath(); ctx.arc(100 + i * 18, CH - 18, 6, 0, Math.PI * 2); ctx.fill(); }
      ctx.fillStyle = "#fff"; ctx.font = "12px monospace"; ctx.textAlign = "right";
      ctx.fillText(`${p.weapon.toUpperCase()} ${"★".repeat(p.weaponLevel)}${"☆".repeat(5 - p.weaponLevel)}`, CW - 10, CH - 14);

      ctx.restore();
      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mouseup", handleMouseUp);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameState, score, highScore, drawSprite, spawnExplosion, spawnTrail, spawnEnemy, useBomb]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      {gameState === "menu" && (
        <Card className="w-full max-w-lg border-2 border-primary/30">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-4xl font-bold flex items-center justify-center gap-3">
              <Rocket className="h-10 w-10 text-blue-400" />
              SPACE ASSAULT
            </CardTitle>
            <p className="text-muted-foreground text-lg">Obliterate the alien armada</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <Badge variant="secondary" className="text-lg px-6 py-2">
                <Trophy className="h-4 w-4 mr-2 text-yellow-500" />
                High Score: {highScore.toLocaleString()}
              </Badge>
            </div>
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold text-base mb-2">Controls</p>
              <div className="grid grid-cols-2 gap-2">
                <p><kbd className="px-1 bg-background rounded">WASD</kbd> Move</p>
                <p><kbd className="px-1 bg-background rounded">Space</kbd> / Click — Shoot</p>
                <p><kbd className="px-1 bg-background rounded">B</kbd> / <kbd className="px-1 bg-background rounded">Q</kbd> — Bomb</p>
                <p><kbd className="px-1 bg-background rounded">Esc</kbd> Pause</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                <Badge variant="outline" className="bg-green-500/20"><Heart className="h-3 w-3 mr-1" /> Health</Badge>
                <Badge variant="outline" className="bg-yellow-500/20"><Zap className="h-3 w-3 mr-1" /> Weapon</Badge>
                <Badge variant="outline" className="bg-blue-500/20"><Shield className="h-3 w-3 mr-1" /> Shield</Badge>
                <Badge variant="outline" className="bg-red-500/20"><Crosshair className="h-3 w-3 mr-1" /> Bomb</Badge>
              </div>
            </div>
            <Button onClick={startGame} className="w-full text-lg" size="lg" data-testid="button-start-shooter">
              <Play className="h-6 w-6 mr-2" /> Launch
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full" data-testid="button-back-home">
              <Home className="h-5 w-5 mr-2" /> Back to Home
            </Button>
          </CardContent>
        </Card>
      )}

      {gameState === "playing" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4 px-2 min-w-[700px]">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="flex items-center gap-1 text-base px-3 py-1">
                <Trophy className="h-4 w-4 text-yellow-500" />{score.toLocaleString()}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1"><Zap className="h-4 w-4" /> Wave {displayWave}</Badge>
              {displayCombo >= 3 && <Badge className="bg-orange-500 text-white animate-pulse">{displayCombo}x</Badge>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1"><Heart className="h-4 w-4 text-red-500" /><Progress value={displayHealth} className="w-24 h-2" /></div>
              <div className="flex items-center gap-1"><Shield className="h-4 w-4 text-blue-400" /><Progress value={(displayShield / 50) * 100} className="w-16 h-2" /></div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setGameState("paused")} data-testid="button-pause-shooter"><Pause className="h-4 w-4" /></Button>
          </div>
          <canvas ref={canvasRef} width={CW} height={CH} className="border-2 border-border rounded-lg shadow-2xl cursor-crosshair" style={{ imageRendering: "pixelated" }} data-testid="canvas-shooter" />
        </div>
      )}

      {gameState === "paused" && (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Paused</CardTitle>
            <p className="text-muted-foreground">Score: {score.toLocaleString()}</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => { setGameState("playing"); lastTimeRef.current = performance.now(); }} className="w-full" data-testid="button-resume-shooter"><Play className="h-5 w-5 mr-2" /> Resume</Button>
            <Button variant="outline" onClick={startGame} className="w-full" data-testid="button-restart-shooter"><RotateCcw className="h-5 w-5 mr-2" /> Restart</Button>
            <Button variant="ghost" onClick={() => setGameState("menu")} className="w-full"><Home className="h-5 w-5 mr-2" /> Main Menu</Button>
          </CardContent>
        </Card>
      )}

      {gameState === "gameover" && (
        <Card className="w-full max-w-md border-2 border-red-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-red-500">DESTROYED</CardTitle>
            <div className="space-y-1 pt-2">
              <p className="text-xl font-bold">{score.toLocaleString()} pts</p>
              <p className="text-muted-foreground">Wave {displayWave} • Max Combo: {dataRef.current?.maxCombo ?? 0}x</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {score >= highScore && score > 0 && <div className="text-center"><Badge className="bg-yellow-500 text-yellow-900 text-base px-4 py-1">NEW HIGH SCORE!</Badge></div>}
            <Button onClick={startGame} className="w-full" data-testid="button-try-again"><RotateCcw className="h-5 w-5 mr-2" /> Try Again</Button>
            <Button variant="outline" onClick={() => setGameState("menu")} className="w-full"><Home className="h-5 w-5 mr-2" /> Main Menu</Button>
          </CardContent>
        </Card>
      )}

      {gameState === "victory" && (
        <Card className="w-full max-w-md border-2 border-green-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-green-500 flex items-center justify-center gap-2"><Trophy className="h-8 w-8" /> VICTORY</CardTitle>
            <p className="text-muted-foreground">All waves obliterated!</p>
            <p className="text-2xl font-bold pt-2">{score.toLocaleString()} pts</p>
            <p className="text-sm text-muted-foreground">Max Combo: {dataRef.current?.maxCombo ?? 0}x</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {score >= highScore && <div className="text-center"><Badge className="bg-yellow-500 text-yellow-900 text-base px-4 py-1">NEW HIGH SCORE!</Badge></div>}
            <Button onClick={startGame} className="w-full" data-testid="button-play-again"><Play className="h-5 w-5 mr-2" /> Play Again</Button>
            <Button variant="outline" onClick={() => setGameState("menu")} className="w-full"><Home className="h-5 w-5 mr-2" /> Main Menu</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
