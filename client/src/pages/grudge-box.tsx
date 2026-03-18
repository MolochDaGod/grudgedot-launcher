import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gamepad2, Swords, RotateCcw, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { SpriteEffects2DManager } from '@/lib/game-effects';

// ── Types ──────────────────────────────────────────────────────────

type AnimState = 'idle' | 'walk' | 'jump' | 'punch' | 'kick' | 'special' | 'block' | 'hit' | 'knockdown' | 'victory';

interface FighterDef {
  id: string;
  name: string;
  color: string;
  colorLight: string;
  stats: { health: number; attack: number; speed: number; special: number };
}

interface Fighter {
  def: FighterDef;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  facingRight: boolean;
  anim: AnimState;
  animFrame: number;
  animTimer: number;
  blocking: boolean;
  comboCount: number;
  comboTimer: number;
  hitStun: number;
  specialMeter: number;
  attackHitRegistered: boolean;
}

interface GState {
  phase: 'select' | 'fight' | 'roundEnd' | 'matchEnd';
  round: number;
  maxRounds: number;
  timer: number;
  p1Wins: number;
  p2Wins: number;
  winner: string | null;
  roundCountdown: number;
}

// ── Constants ──────────────────────────────────────────────────────

const CANVAS_W = 960;
const CANVAS_H = 540;
const GROUND_Y = 420;
const GRAVITY = 1800;
const JUMP_FORCE = -600;
const FIGHTER_W = 60;
const FIGHTER_H = 100;

const ANIM_DURATIONS: Record<AnimState, number> = {
  idle: 0.6, walk: 0.4, jump: 0.5, punch: 0.25, kick: 0.35,
  special: 0.5, block: 0.1, hit: 0.3, knockdown: 0.8, victory: 2.0,
};

const FIGHTERS: FighterDef[] = [
  { id: 'grudge-fist', name: 'Grudge Fist', color: '#cc3333', colorLight: '#ff6666', stats: { health: 1000, attack: 80, speed: 300, special: 150 } },
  { id: 'bone-crusher', name: 'Bone Crusher', color: '#886633', colorLight: '#ccaa66', stats: { health: 1200, attack: 70, speed: 250, special: 130 } },
  { id: 'shadow-strike', name: 'Shadow Strike', color: '#333366', colorLight: '#6666cc', stats: { health: 800, attack: 90, speed: 380, special: 170 } },
  { id: 'iron-jaw', name: 'Iron Jaw', color: '#666666', colorLight: '#aaaaaa', stats: { health: 1400, attack: 60, speed: 220, special: 110 } },
  { id: 'flame-fury', name: 'Flame Fury', color: '#cc6600', colorLight: '#ff9933', stats: { health: 900, attack: 85, speed: 340, special: 200 } },
  { id: 'frost-bite', name: 'Frost Bite', color: '#3388cc', colorLight: '#66bbee', stats: { health: 950, attack: 75, speed: 310, special: 160 } },
];

// ── Hitbox config ──────────────────────────────────────────────────

interface HitboxDef { x: number; y: number; w: number; h: number; dmgMul: number; kb: number; activeStart: number; activeEnd: number }

const ATTACK_HITBOXES: Record<'punch' | 'kick' | 'special', HitboxDef> = {
  punch:   { x: 40, y: -40, w: 45, h: 30, dmgMul: 1, kb: 150, activeStart: 0.1, activeEnd: 0.2 },
  kick:    { x: 35, y: -20, w: 50, h: 35, dmgMul: 1.2, kb: 200, activeStart: 0.15, activeEnd: 0.3 },
  special: { x: 30, y: -50, w: 60, h: 60, dmgMul: 2.0, kb: 350, activeStart: 0.2, activeEnd: 0.45 },
};

// ── Helpers ────────────────────────────────────────────────────────

function createFighter(def: FighterDef, x: number, facingRight: boolean): Fighter {
  return {
    def, x, y: GROUND_Y, vx: 0, vy: 0,
    health: def.stats.health, maxHealth: def.stats.health,
    facingRight, anim: 'idle', animFrame: 0, animTimer: 0,
    blocking: false, comboCount: 0, comboTimer: 0,
    hitStun: 0, specialMeter: 0, attackHitRegistered: false,
  };
}

function isAttacking(f: Fighter): boolean { return f.anim === 'punch' || f.anim === 'kick' || f.anim === 'special'; }
function isInterruptible(f: Fighter): boolean { return f.anim === 'idle' || f.anim === 'walk' || f.anim === 'block'; }

function getHurtbox(f: Fighter) { return { x: f.x - FIGHTER_W / 2, y: f.y - FIGHTER_H, w: FIGHTER_W, h: FIGHTER_H }; }

function getAttackHitbox(f: Fighter) {
  if (!isAttacking(f)) return null;
  const def = ATTACK_HITBOXES[f.anim as 'punch' | 'kick' | 'special'];
  if (!def) return null;
  const t = f.animTimer / ANIM_DURATIONS[f.anim];
  if (t < def.activeStart || t > def.activeEnd) return null;
  const dir = f.facingRight ? 1 : -1;
  return {
    x: f.x + def.x * dir - (f.facingRight ? 0 : def.w),
    y: f.y + def.y, w: def.w, h: def.h,
    damage: def.dmgMul * f.def.stats.attack, knockback: def.kb,
  };
}

function rectsOverlap(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// ── Drawing ────────────────────────────────────────────────────────

function drawBg(ctx: CanvasRenderingContext2D) {
  const skyGrad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  skyGrad.addColorStop(0, '#0a0a2e');
  skyGrad.addColorStop(0.5, '#1a1a3e');
  skyGrad.addColorStop(1, '#2a1a1a');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, CANVAS_W, GROUND_Y);

  // Pillars
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(30, 200, 30, GROUND_Y - 200);
  ctx.fillRect(CANVAS_W - 60, 200, 30, GROUND_Y - 200);

  // Ground
  const gGrad = ctx.createLinearGradient(0, GROUND_Y, 0, CANVAS_H);
  gGrad.addColorStop(0, '#3a2a1a');
  gGrad.addColorStop(1, '#1a1a0a');
  ctx.fillStyle = gGrad;
  ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
  ctx.strokeStyle = '#554433';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(CANVAS_W, GROUND_Y); ctx.stroke();
}

function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter) {
  ctx.save();
  ctx.translate(f.x, f.y);
  if (!f.facingRight) ctx.scale(-1, 1);

  const bc = f.hitStun > 0 ? '#ffffff' : f.def.color;
  const lc = f.hitStun > 0 ? '#ffffff' : f.def.colorLight;
  const t = f.animTimer / ANIM_DURATIONS[f.anim];

  // Shadow
  ctx.globalAlpha = 0.3; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(0, 0, 25, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  // Legs
  ctx.fillStyle = bc;
  if (f.anim === 'walk') {
    const s = Math.sin(t * Math.PI * 4) * 15;
    ctx.fillRect(-12, -40, 10, 40);
    ctx.save(); ctx.translate(4, -40); ctx.rotate(s * Math.PI / 180);
    ctx.fillRect(-5, 0, 10, 40); ctx.restore();
  } else if (f.anim === 'kick') {
    ctx.fillRect(-12, -40, 10, 40);
    const ke = t < 0.5 ? t * 2 : 2 - t * 2;
    ctx.save(); ctx.translate(4, -40); ctx.rotate(-ke * 70 * Math.PI / 180);
    ctx.fillRect(-5, 0, 10, 45); ctx.restore();
  } else if (f.anim === 'knockdown') {
    ctx.save(); ctx.rotate(Math.PI / 2 * Math.min(1, t * 3));
    ctx.fillRect(-12, -40, 10, 40); ctx.fillRect(4, -40, 10, 40); ctx.restore();
  } else {
    ctx.fillRect(-12, -40, 10, f.anim === 'jump' ? 35 : 40);
    ctx.fillRect(4, -40, 10, f.anim === 'jump' ? 35 : 40);
  }

  // Body
  ctx.fillStyle = bc;
  if (f.anim === 'knockdown') {
    ctx.save(); ctx.rotate(Math.PI / 2 * Math.min(1, t * 3));
    ctx.fillRect(-15, -90, 30, 50); ctx.restore();
  } else if (f.anim === 'block') {
    ctx.fillRect(-15, -90, 30, 50);
    ctx.fillStyle = lc; ctx.fillRect(-5, -85, 25, 10); ctx.fillRect(-5, -75, 25, 10);
  } else {
    ctx.fillRect(-15, -90, 30, 50);
  }

  // Arms
  ctx.fillStyle = lc;
  if (f.anim === 'punch') {
    const pe = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6;
    ctx.fillRect(-20, -85, 8, 25);
    ctx.save(); ctx.translate(15, -80); ctx.rotate(-pe * 30 * Math.PI / 180);
    ctx.fillRect(0, -4, 15 + pe * 30, 8);
    ctx.fillStyle = f.def.color; ctx.fillRect(15 + pe * 30, -6, 12, 12);
    ctx.restore();
  } else if (f.anim === 'special') {
    const st = Math.min(1, t / 0.4);
    ctx.save(); ctx.translate(0, -80);
    ctx.fillRect(15, -4, 20 + st * 25, 8); ctx.fillRect(-20, -4, 8, 25);
    ctx.fillStyle = f.def.colorLight; ctx.shadowColor = f.def.colorLight; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.arc(40 + st * 25, 0, 10 * st, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0; ctx.restore();
  } else if (f.anim !== 'block' && f.anim !== 'knockdown') {
    ctx.fillRect(-20, -85, 8, 25); ctx.fillRect(15, -85, 8, 25);
  }

  // Head
  ctx.fillStyle = lc;
  if (f.anim === 'knockdown') {
    ctx.save(); ctx.rotate(Math.PI / 2 * Math.min(1, t * 3));
    ctx.beginPath(); ctx.arc(0, -100, 15, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  } else {
    ctx.beginPath(); ctx.arc(0, -100, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(4, -105, 5, 4); ctx.fillRect(-2, -105, 5, 4);
    ctx.fillStyle = '#000'; ctx.fillRect(6, -104, 2, 2); ctx.fillRect(0, -104, 2, 2);
  }

  ctx.restore();
}

function drawHUD(ctx: CanvasRenderingContext2D, p1: Fighter, p2: Fighter, gs: GState) {
  const bW = 350, bH = 24, bY = 20;

  // P1 bar
  ctx.fillStyle = '#222'; ctx.fillRect(30, bY, bW, bH);
  const p1P = Math.max(0, p1.health / p1.maxHealth);
  const p1G = ctx.createLinearGradient(30, 0, 30 + bW * p1P, 0);
  p1G.addColorStop(0, p1.def.color); p1G.addColorStop(1, p1.def.colorLight);
  ctx.fillStyle = p1G; ctx.fillRect(30, bY, bW * p1P, bH);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(30, bY, bW, bH);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px monospace'; ctx.textAlign = 'left';
  ctx.fillText(p1.def.name, 30, bY + bH + 16);
  ctx.fillStyle = '#111'; ctx.fillRect(30, bY + bH + 22, bW * 0.6, 6);
  ctx.fillStyle = '#ffcc00'; ctx.fillRect(30, bY + bH + 22, bW * 0.6 * Math.min(1, p1.specialMeter / 100), 6);

  // P2 bar
  const p2X = CANVAS_W - 30 - bW;
  ctx.fillStyle = '#222'; ctx.fillRect(p2X, bY, bW, bH);
  const p2P = Math.max(0, p2.health / p2.maxHealth);
  const p2G = ctx.createLinearGradient(p2X + bW, 0, p2X + bW - bW * p2P, 0);
  p2G.addColorStop(0, p2.def.color); p2G.addColorStop(1, p2.def.colorLight);
  ctx.fillStyle = p2G; ctx.fillRect(p2X + bW * (1 - p2P), bY, bW * p2P, bH);
  ctx.strokeStyle = '#fff'; ctx.strokeRect(p2X, bY, bW, bH);
  ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(p2.def.name, CANVAS_W - 30, bY + bH + 16);
  ctx.fillStyle = '#111'; ctx.fillRect(p2X + bW * 0.4, bY + bH + 22, bW * 0.6, 6);
  const p2SW = bW * 0.6 * Math.min(1, p2.specialMeter / 100);
  ctx.fillStyle = '#ffcc00'; ctx.fillRect(p2X + bW - p2SW, bY + bH + 22, p2SW, 6);

  // Timer
  ctx.textAlign = 'center'; ctx.font = 'bold 28px monospace';
  ctx.fillStyle = gs.timer <= 10 ? '#ff4444' : '#ffffff';
  ctx.fillText(Math.ceil(gs.timer).toString(), CANVAS_W / 2, 44);
  ctx.font = '12px monospace'; ctx.fillStyle = '#888';
  ctx.fillText(`ROUND ${gs.round}`, CANVAS_W / 2, 16);

  // Win markers
  for (let i = 0; i < gs.maxRounds; i++) {
    ctx.beginPath(); ctx.arc(CANVAS_W / 2 - 40 - i * 16, 56, 5, 0, Math.PI * 2);
    ctx.fillStyle = i < gs.p1Wins ? '#ffcc00' : '#333'; ctx.fill(); ctx.strokeStyle = '#666'; ctx.stroke();
    ctx.beginPath(); ctx.arc(CANVAS_W / 2 + 40 + i * 16, 56, 5, 0, Math.PI * 2);
    ctx.fillStyle = i < gs.p2Wins ? '#ffcc00' : '#333'; ctx.fill(); ctx.stroke();
  }

  // Combos
  if (p1.comboCount > 1) {
    ctx.textAlign = 'left'; ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 10;
    ctx.fillText(`${p1.comboCount} HIT COMBO!`, 30, CANVAS_H - 60); ctx.shadowBlur = 0;
  }
  if (p2.comboCount > 1) {
    ctx.textAlign = 'right'; ctx.font = 'bold 20px monospace'; ctx.fillStyle = '#ffcc00';
    ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 10;
    ctx.fillText(`${p2.comboCount} HIT COMBO!`, CANVAS_W - 30, CANVAS_H - 60); ctx.shadowBlur = 0;
  }

  // Countdown
  if (gs.roundCountdown > 0) {
    ctx.textAlign = 'center'; ctx.font = 'bold 60px monospace'; ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffcc00'; ctx.shadowBlur = 20;
    ctx.fillText(gs.roundCountdown > 1 ? Math.ceil(gs.roundCountdown - 1).toString() : 'FIGHT!', CANVAS_W / 2, CANVAS_H / 2);
    ctx.shadowBlur = 0;
  }
}

// ── Component ──────────────────────────────────────────────────────

export default function GrudgeBox() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sfxRef = useRef<SpriteEffects2DManager | null>(null);
  const animRef = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const keysRef = useRef<Set<string>>(new Set());
  const gpRef = useRef<{ [i: number]: Gamepad }>({});
  const p1Ref = useRef<Fighter | null>(null);
  const p2Ref = useRef<Fighter | null>(null);
  const gsRef = useRef<GState>({ phase: 'select', round: 1, maxRounds: 2, timer: 99, p1Wins: 0, p2Wins: 0, winner: null, roundCountdown: 0 });

  const [phase, setPhase] = useState<'select' | 'fight'>('select');
  const [p1Sel, setP1Sel] = useState(0);
  const [p2Sel, setP2Sel] = useState(1);

  useEffect(() => {
    const kd = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const ku = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, []);

  const pollGP = useCallback(() => {
    const gps = navigator.getGamepads();
    for (let i = 0; i < gps.length; i++) { if (gps[i]) gpRef.current[i] = gps[i]!; }
  }, []);

  const startFight = useCallback(() => {
    p1Ref.current = createFighter(FIGHTERS[p1Sel], 250, true);
    p2Ref.current = createFighter(FIGHTERS[p2Sel], CANVAS_W - 250, false);
    gsRef.current = { phase: 'fight', round: 1, maxRounds: 2, timer: 99, p1Wins: 0, p2Wins: 0, winner: null, roundCountdown: 3 };
    setPhase('fight');
  }, [p1Sel, p2Sel]);

  const processInput = useCallback((f: Fighter, l: boolean, r: boolean, u: boolean, pu: boolean, ki: boolean, sp: boolean, bl: boolean) => {
    if (gsRef.current.roundCountdown > 0 || f.hitStun > 0 || f.anim === 'knockdown') return;
    f.blocking = bl && isInterruptible(f);
    if (f.blocking) { f.anim = 'block'; f.vx = 0; return; }
    if (isInterruptible(f) || (f.anim === 'jump' && f.y < GROUND_Y)) {
      if (sp && f.specialMeter >= 100) { f.anim = 'special'; f.animTimer = 0; f.specialMeter = 0; f.attackHitRegistered = false; return; }
      if (pu && isInterruptible(f)) { f.anim = 'punch'; f.animTimer = 0; f.attackHitRegistered = false; return; }
      if (ki && isInterruptible(f)) { f.anim = 'kick'; f.animTimer = 0; f.attackHitRegistered = false; return; }
    }
    if (isAttacking(f)) return;
    if (u && f.y >= GROUND_Y) { f.vy = JUMP_FORCE; f.anim = 'jump'; f.animTimer = 0; }
    if (l) { f.vx = -f.def.stats.speed; if (f.y >= GROUND_Y && !isAttacking(f)) f.anim = 'walk'; }
    else if (r) { f.vx = f.def.stats.speed; if (f.y >= GROUND_Y && !isAttacking(f)) f.anim = 'walk'; }
    else { f.vx = 0; if (f.y >= GROUND_Y && !isAttacking(f) && f.anim !== 'hit') f.anim = 'idle'; }
  }, []);

  useEffect(() => {
    if (phase !== 'fight') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (containerRef.current && !sfxRef.current) {
      sfxRef.current = new SpriteEffects2DManager(containerRef.current);
    }

    lastRef.current = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastRef.current) / 1000);
      lastRef.current = now;
      const p1 = p1Ref.current!, p2 = p2Ref.current!, gs = gsRef.current;

      pollGP();

      if (gs.roundCountdown > 0) { gs.roundCountdown = Math.max(0, gs.roundCountdown - dt); }

      if (gs.phase === 'fight' && gs.roundCountdown <= 0) {
        const k = keysRef.current;
        const g0 = gpRef.current[0];
        processInput(p1,
          k.has('a') || !!(g0 && (g0.axes[0] < -0.3 || g0.buttons[14]?.pressed)),
          k.has('d') || !!(g0 && (g0.axes[0] > 0.3 || g0.buttons[15]?.pressed)),
          k.has('w') || !!(g0 && (g0.buttons[12]?.pressed || g0.axes[1] < -0.3)),
          k.has('j') || !!(g0 && g0.buttons[0]?.pressed),
          k.has('k') || !!(g0 && g0.buttons[1]?.pressed),
          k.has('l') || !!(g0 && g0.buttons[2]?.pressed),
          k.has('shift') || !!(g0 && g0.buttons[3]?.pressed),
        );

        const g1 = gpRef.current[1];
        processInput(p2,
          k.has('arrowleft') || !!(g1 && (g1.axes[0] < -0.3 || g1.buttons[14]?.pressed)),
          k.has('arrowright') || !!(g1 && (g1.axes[0] > 0.3 || g1.buttons[15]?.pressed)),
          k.has('arrowup') || !!(g1 && (g1.buttons[12]?.pressed || g1.axes[1] < -0.3)),
          k.has('1') || !!(g1 && g1.buttons[0]?.pressed),
          k.has('2') || !!(g1 && g1.buttons[1]?.pressed),
          k.has('3') || !!(g1 && g1.buttons[2]?.pressed),
          k.has('0') || k.has('arrowdown') || !!(g1 && g1.buttons[3]?.pressed),
        );

        gs.timer = Math.max(0, gs.timer - dt);
      }

      // Physics
      for (const f of [p1, p2]) {
        if (f.y < GROUND_Y) f.vy += GRAVITY * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        if (f.y >= GROUND_Y) { f.y = GROUND_Y; f.vy = 0; if (f.anim === 'jump' && !isAttacking(f)) f.anim = 'idle'; }
        f.x = Math.max(FIGHTER_W / 2 + 10, Math.min(CANVAS_W - FIGHTER_W / 2 - 10, f.x));

        f.animTimer += dt;
        const ad = ANIM_DURATIONS[f.anim];
        if (f.animTimer >= ad) {
          if (isAttacking(f) || f.anim === 'hit' || f.anim === 'knockdown') { f.anim = 'idle'; f.animTimer = 0; }
          else f.animTimer %= ad;
        }
        if (f.hitStun > 0) { f.hitStun = Math.max(0, f.hitStun - dt); }
        if (f.comboTimer > 0) { f.comboTimer -= dt; if (f.comboTimer <= 0) { f.comboCount = 0; f.comboTimer = 0; } }
        if (f.specialMeter < 100) f.specialMeter += dt * 3;
      }

      // Face each other
      p1.facingRight = p1.x < p2.x;
      p2.facingRight = p2.x < p1.x;

      // Push apart
      const pushD = FIGHTER_W * 0.8;
      const ddx = p2.x - p1.x;
      if (Math.abs(ddx) < pushD) {
        const ov = pushD - Math.abs(ddx);
        const s = ddx > 0 ? 1 : -1;
        p1.x -= s * ov * 0.5; p2.x += s * ov * 0.5;
      }

      // Attack collision
      const sfx = sfxRef.current;
      const sX = containerRef.current ? containerRef.current.clientWidth / CANVAS_W : 1;
      const sY = containerRef.current ? containerRef.current.clientHeight / CANVAS_H : 1;

      for (const [atk, def] of [[p1, p2], [p2, p1]] as [Fighter, Fighter][]) {
        if (atk.attackHitRegistered) continue;
        const hb = getAttackHitbox(atk);
        if (!hb) continue;
        if (!rectsOverlap(hb, getHurtbox(def))) continue;

        atk.attackHitRegistered = true;
        let dmg = hb.damage, kb = hb.knockback;

        if (def.blocking) {
          dmg *= 0.2; kb *= 0.3;
          if (sfx) sfx.spawnAt('spark', def.x * sX, (def.y - 50) * sY, '#ffffff', { scale: 0.5 * sX });
        } else {
          atk.comboCount++; atk.comboTimer = 1.5;
          dmg *= 1 + (atk.comboCount - 1) * 0.1;
          def.hitStun = 0.2;
          if (dmg > def.def.stats.attack * 1.5) {
            def.anim = 'knockdown'; def.animTimer = 0; def.vy = -300;
          } else {
            def.anim = 'hit'; def.animTimer = 0;
          }
          atk.specialMeter = Math.min(100, atk.specialMeter + 8);

          if (sfx) {
            const hx = def.x * sX, hy = (def.y - 50) * sY;
            if (atk.anim === 'special') {
              sfx.spawnAt('fire', hx, hy, atk.def.colorLight, { scale: 1.2 * sX, screenShake: true });
              sfx.spawnAt('shockwave', hx, hy, atk.def.color, { scale: 0.8 * sX });
            } else if (atk.anim === 'kick') {
              sfx.spawnAt('impact', hx, hy, atk.def.colorLight, { scale: 0.7 * sX });
            } else {
              sfx.spawnAt('slash', hx, hy, atk.def.colorLight, { scale: 0.5 * sX, rotation: Math.random() * Math.PI });
            }
            sfx.spawnAt('blood', hx, hy, '#cc0000', { scale: 0.4 * sX });
          }
        }

        def.health -= dmg;
        const kDir = def.x > atk.x ? 1 : -1;
        def.vx = kDir * kb;
        if (def.anim === 'knockdown') def.vy = -250;
        setTimeout(() => { def.vx *= 0.3; }, 150);
      }

      // Round end
      if (gs.phase === 'fight' && gs.roundCountdown <= 0) {
        let rw: 'p1' | 'p2' | null = null;
        if (p1.health <= 0) rw = 'p2';
        else if (p2.health <= 0) rw = 'p1';
        else if (gs.timer <= 0) rw = p1.health > p2.health ? 'p1' : 'p2';

        if (rw) {
          gs.phase = 'roundEnd';
          if (rw === 'p1') gs.p1Wins++; else gs.p2Wins++;
          (rw === 'p1' ? p1 : p2).anim = 'victory';
          (rw === 'p1' ? p1 : p2).animTimer = 0;

          const wn = Math.ceil((gs.maxRounds + 1) / 2);
          if (gs.p1Wins >= wn || gs.p2Wins >= wn) {
            gs.phase = 'matchEnd';
            gs.winner = (rw === 'p1' ? p1 : p2).def.name;
          } else {
            setTimeout(() => {
              gs.round++; gs.timer = 99; gs.roundCountdown = 3; gs.phase = 'fight';
              p1.health = p1.maxHealth; p2.health = p2.maxHealth;
              p1.x = 250; p2.x = CANVAS_W - 250;
              p1.y = p2.y = GROUND_Y; p1.vx = p1.vy = p2.vx = p2.vy = 0;
              p1.anim = p2.anim = 'idle'; p1.animTimer = p2.animTimer = 0;
              p1.specialMeter = p2.specialMeter = 0;
              p1.comboCount = p2.comboCount = 0;
            }, 2000);
          }
        }
      }

      // Render
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBg(ctx);
      drawFighter(ctx, p1);
      drawFighter(ctx, p2);
      drawHUD(ctx, p1, p2, gs);

      if (gs.phase === 'matchEnd' && gs.winner) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.textAlign = 'center'; ctx.font = 'bold 48px monospace'; ctx.fillStyle = '#ffcc00';
        ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 20;
        ctx.fillText(`${gs.winner.toUpperCase()} WINS!`, CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.shadowBlur = 0;
        ctx.font = '18px monospace'; ctx.fillStyle = '#aaa';
        ctx.fillText('Press ENTER to rematch', CANVAS_W / 2, CANVAS_H / 2 + 30);
      }

      if (gs.phase === 'matchEnd' && keysRef.current.has('enter')) {
        keysRef.current.delete('enter');
        setPhase('select');
        return;
      }

      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animRef.current);
      if (sfxRef.current) { sfxRef.current.dispose(); sfxRef.current = null; }
    };
  }, [phase, pollGP, processInput]);

  // ── Select Screen ────────────────────────────────────────────

  if (phase === 'select') {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 via-red-900/20 to-gray-900" data-testid="page-grudge-box">
        <div className="p-4 border-b border-primary/20 bg-black/40">
          <div className="flex items-center gap-3">
            <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
            <div className="p-2 rounded-lg bg-primary/20"><Swords className="h-6 w-6 text-primary" /></div>
            <div><h1 className="text-xl font-bold">Grudge Box</h1><p className="text-sm text-muted-foreground">2D Fighting Arena</p></div>
          </div>
        </div>
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Select Fighters</h2>
              <p className="text-muted-foreground text-sm">P1: WASD + J/K/L/Shift | P2: Arrows + 1/2/3/Down</p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="text-center font-bold mb-3 text-blue-400">Player 1</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FIGHTERS.map((f, i) => (
                    <Card key={f.id} className={`cursor-pointer transition-all ${p1Sel === i ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'bg-card/50 hover:bg-card/80'}`} onClick={() => setP1Sel(i)}>
                      <CardContent className="p-3 text-center">
                        <div className="w-8 h-8 rounded-full mx-auto mb-1" style={{ background: f.color }} />
                        <p className="text-xs font-bold">{f.name}</p>
                        <div className="flex gap-1 justify-center mt-1">
                          <Badge variant="outline" className="text-[10px] px-1">ATK {f.stats.attack}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1">HP {f.stats.health}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-center font-bold mb-3 text-red-400">Player 2</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FIGHTERS.map((f, i) => (
                    <Card key={f.id} className={`cursor-pointer transition-all ${p2Sel === i ? 'ring-2 ring-red-500 bg-red-500/10' : 'bg-card/50 hover:bg-card/80'}`} onClick={() => setP2Sel(i)}>
                      <CardContent className="p-3 text-center">
                        <div className="w-8 h-8 rounded-full mx-auto mb-1" style={{ background: f.color }} />
                        <p className="text-xs font-bold">{f.name}</p>
                        <div className="flex gap-1 justify-center mt-1">
                          <Badge variant="outline" className="text-[10px] px-1">ATK {f.stats.attack}</Badge>
                          <Badge variant="outline" className="text-[10px] px-1">HP {f.stats.health}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
            <div className="text-center">
              <Button size="lg" onClick={startFight} className="gap-2"><Gamepad2 className="h-5 w-5" /> Start Fight</Button>
            </div>
            <Card className="bg-card/30"><CardContent className="p-4">
              <h4 className="font-bold mb-2">Controls</h4>
              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div><p className="font-semibold text-blue-400">Player 1</p><p>Move: WASD</p><p>Punch: J | Kick: K | Special: L</p><p>Block: Shift</p></div>
                <div><p className="font-semibold text-red-400">Player 2 / Gamepad</p><p>Move: Arrow Keys</p><p>Punch: 1 | Kick: 2 | Special: 3</p><p>Block: Down Arrow</p></div>
              </div>
            </CardContent></Card>
          </div>
        </div>
      </div>
    );
  }

  // ── Fight Screen ─────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-black" data-testid="page-grudge-box">
      <div ref={containerRef} className="flex-1 flex items-center justify-center" style={{ position: 'relative' }}>
        <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} style={{ width: '100%', maxHeight: '100%', objectFit: 'contain', imageRendering: 'pixelated' }} />
      </div>
      <div className="p-2 bg-black/80 flex justify-center gap-4 text-xs text-muted-foreground">
        <span>P1: WASD + J/K/L</span><span>|</span><span>P2: Arrows + 1/2/3</span><span>|</span>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setPhase('select')}><RotateCcw className="h-3 w-3" /> Back</Button>
      </div>
    </div>
  );
}
