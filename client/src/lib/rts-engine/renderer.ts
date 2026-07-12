import type { GameState, Unit, Building, Resource, Island, Projectile, VfxEffect } from './types';
import { UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ITEM_DEFS, getUnitSprites, getLegionSprites, DAY_DURATION, CYCLE_LENGTH } from './constants';
import { VFX_CONFIGS } from './vfx';

// ── Image cache ────────────────────────────────────────────────────────────────
const _imgCache = new Map<string, HTMLImageElement>();
function loadImg(src: string): HTMLImageElement | null {
  if (_imgCache.has(src)) {
    const img = _imgCache.get(src)!;
    return img.complete && img.naturalWidth > 0 ? img : null;
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  _imgCache.set(src, img);
  return null;
}

// ── Colors ─────────────────────────────────────────────────────────────────────
const FACTION_COLORS = { blue: '#3b82f6', red: '#ef4444', neutral: '#f59e0b' };
const WATER_COLOR = '#1e6091';
const ISLAND_COLOR = '#4a7c59';
const GOLD_MINE_COLOR = '#fbbf24';
const TREE_COLOR = '#166534';
const GRID_COLOR = 'rgba(255,255,255,0.04)';

// ── Sprite rendering helper ────────────────────────────────────────────────────
function drawSprite(
  ctx: CanvasRenderingContext2D, src: string,
  frameIdx: number, frameW: number, frameH: number,
  dx: number, dy: number, dw: number, dh: number, flipX = false,
) {
  const img = loadImg(src);
  if (!img) return;
  ctx.save();
  if (flipX) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    ctx.drawImage(img, frameIdx * frameW, 0, frameW, frameH, 0, 0, dw, dh);
  } else {
    ctx.drawImage(img, frameIdx * frameW, 0, frameW, frameH, dx, dy, dw, dh);
  }
  ctx.restore();
}

// ── Main render function ───────────────────────────────────────────────────────
export function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  canvasW: number, canvasH: number,
  dt: number,
) {
  const { camera, zoom } = state;

  // Night overlay alpha
  const nightAlpha = state.timeOfDay === 'night'
    ? 0.3 * Math.min(1, (state.dayNightCycle - DAY_DURATION) / 30)
    : 0;

  ctx.save();
  ctx.translate(-camera.x * zoom, -camera.y * zoom);
  ctx.scale(zoom, zoom);

  // ── Water background ─────────────────────────────────────────────────────
  const sx = Math.floor(camera.x);
  const sy = Math.floor(camera.y);
  const ew = Math.ceil(canvasW / zoom) + 128;
  const eh = Math.ceil(canvasH / zoom) + 128;
  ctx.fillStyle = WATER_COLOR;
  ctx.fillRect(sx, sy, ew, eh);
  // Water grid
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 0.5;
  for (let x = sx - (sx % 64); x < sx + ew; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, sy); ctx.lineTo(x, sy + eh); ctx.stroke();
  }
  for (let y = sy - (sy % 64); y < sy + eh; y += 64) {
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx + ew, y); ctx.stroke();
  }

  // ── Islands ──────────────────────────────────────────────────────────────
  for (const isl of state.islands) {
    ctx.fillStyle = ISLAND_COLOR;
    ctx.beginPath();
    roundRect(ctx, isl.x, isl.y, isl.w, isl.h, 16);
    ctx.fill();
    // Island border
    ctx.strokeStyle = '#2d5a3e';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Island label
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '10px sans-serif';
    ctx.fillText(isl.id, isl.x + 8, isl.y + 16);
  }

  // ── Y-sorted rendering: resources, buildings, units ──────────────────────
  type Renderable = { y: number; draw: () => void };
  const renderables: Renderable[] = [];

  // Resources
  for (const [, res] of state.resources) {
    if (res.amount <= 0) continue;
    renderables.push({ y: res.pos.y, draw: () => drawResource(ctx, res) });
  }

  // Buildings
  for (const [, bld] of state.buildings) {
    renderables.push({ y: bld.pos.y + 64, draw: () => drawBuilding(ctx, bld) });
  }

  // Units
  for (const [, unit] of state.units) {
    if (unit.state === 'dead') continue;
    renderables.push({ y: unit.pos.y + 32, draw: () => drawUnit(ctx, unit, state) });
  }

  renderables.sort((a, b) => a.y - b.y);
  for (const r of renderables) r.draw();

  // ── Projectiles ──────────────────────────────────────────────────────────
  for (const [, proj] of state.projectiles) {
    drawProjectile(ctx, proj);
  }

  // ── VFX ──────────────────────────────────────────────────────────────────
  for (const [, vfx] of state.vfxEffects) {
    drawVfx(ctx, vfx);
  }

  // ── Floating texts ───────────────────────────────────────────────────────
  for (const ft of state.floatingTexts) {
    ctx.globalAlpha = Math.max(0, 1 - ft.age / ft.maxAge);
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(ft.text, ft.pos.x, ft.pos.y);
    ctx.globalAlpha = 1;
  }

  // ── Selection box ────────────────────────────────────────────────────────
  if (state.dragStart && state.dragEnd) {
    const x1 = Math.min(state.dragStart.x, state.dragEnd.x);
    const y1 = Math.min(state.dragStart.y, state.dragEnd.y);
    const w = Math.abs(state.dragEnd.x - state.dragStart.x);
    const h = Math.abs(state.dragEnd.y - state.dragStart.y);
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1;
    ctx.strokeRect(x1, y1, w, h);
    ctx.fillStyle = 'rgba(34,197,94,0.1)';
    ctx.fillRect(x1, y1, w, h);
  }

  ctx.restore();

  // ── Night overlay ────────────────────────────────────────────────────────
  if (nightAlpha > 0) {
    ctx.fillStyle = `rgba(10,10,40,${nightAlpha})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // ── HUD ──────────────────────────────────────────────────────────────────
  drawHUD(ctx, state, canvasW, canvasH);
  drawMinimap(ctx, state, canvasW, canvasH);
}

// ── Draw individual elements ───────────────────────────────────────────────────
function drawResource(ctx: CanvasRenderingContext2D, res: Resource) {
  const isGold = res.type === 'goldmine';
  const size = isGold ? 40 : 28;
  ctx.fillStyle = isGold ? GOLD_MINE_COLOR : TREE_COLOR;
  if (isGold) {
    ctx.beginPath();
    ctx.arc(res.pos.x, res.pos.y, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💰', res.pos.x, res.pos.y + 6);
    ctx.textAlign = 'left';
  } else {
    ctx.beginPath();
    ctx.moveTo(res.pos.x, res.pos.y - size);
    ctx.lineTo(res.pos.x - size / 2, res.pos.y);
    ctx.lineTo(res.pos.x + size / 2, res.pos.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5b3a1a';
    ctx.fillRect(res.pos.x - 3, res.pos.y, 6, 10);
  }
  // Amount label
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(res.amount)}`, res.pos.x, res.pos.y + (isGold ? 28 : 20));
  ctx.textAlign = 'left';
}

function drawBuilding(ctx: CanvasRenderingContext2D, bld: Building) {
  const cfg = BUILDING_CONFIGS[bld.type as keyof typeof BUILDING_CONFIGS];
  if (!cfg) return;
  const w = cfg.w;
  const h = cfg.h;
  const alpha = bld.underConstruction ? 0.5 + 0.5 * bld.constructionProgress : 1;
  ctx.globalAlpha = alpha;

  // Building body
  ctx.fillStyle = bld.faction === 'blue' ? '#1e3a5f' : bld.faction === 'red' ? '#5f1e1e' : '#3f3f3f';
  ctx.beginPath();
  roundRect(ctx, bld.pos.x, bld.pos.y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = FACTION_COLORS[bld.faction];
  ctx.lineWidth = 2;
  ctx.stroke();

  // Construction progress bar
  if (bld.underConstruction) {
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(bld.pos.x, bld.pos.y + h + 2, w * bld.constructionProgress, 4);
    ctx.strokeStyle = '#333';
    ctx.strokeRect(bld.pos.x, bld.pos.y + h + 2, w, 4);
  }

  // Building name
  ctx.fillStyle = '#e4e4e7';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(bld.type.toUpperCase(), bld.pos.x + w / 2, bld.pos.y + h / 2 + 4);
  ctx.textAlign = 'left';

  // HP bar
  const hpPct = bld.hp / bld.maxHp;
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(bld.pos.x, bld.pos.y - 6, w * hpPct, 4);
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(bld.pos.x, bld.pos.y - 6, w, 4);

  // Training progress
  if (bld.trainingQueue.length > 0) {
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(bld.pos.x, bld.pos.y + h + 8, w * bld.trainingProgress, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Training: ${bld.trainingQueue[0]}`, bld.pos.x + w / 2, bld.pos.y + h + 20);
    ctx.textAlign = 'left';
  }

  ctx.globalAlpha = 1;
}

function drawUnit(ctx: CanvasRenderingContext2D, unit: Unit, state: GameState) {
  const size = unit.isHero ? 48 : 32;
  const half = size / 2;

  // Try sprite rendering
  const faction = unit.faction === 'blue' ? 'blue' : 'red';
  const sprites = unit.faction === 'neutral' ? null : getUnitSprites(faction as 'blue' | 'red', unit.type);
  const animKey = unit.anim.action === 'run' ? 'run' : unit.anim.action === 'attack' ? 'attack' : 'idle';
  const sprCfg = sprites?.[animKey];

  if (sprCfg) {
    const elapsed = unit.anim.elapsed * 1000;
    const frameIdx = Math.floor(elapsed / sprCfg.msPerFrame) % sprCfg.frames;
    drawSprite(ctx, sprCfg.src, frameIdx, sprCfg.frameW, sprCfg.frameH,
      unit.pos.x - half, unit.pos.y - half, size, size, unit.anim.flipX);
  } else {
    // Fallback: colored circle
    ctx.fillStyle = FACTION_COLORS[unit.faction] || '#888';
    ctx.beginPath();
    ctx.arc(unit.pos.x, unit.pos.y, half * 0.7, 0, Math.PI * 2);
    ctx.fill();
    // Role icon
    ctx.fillStyle = '#fff';
    ctx.font = `${unit.isHero ? 18 : 12}px sans-serif`;
    ctx.textAlign = 'center';
    const icon = unit.role === 'worker' ? '⛏️' : unit.role === 'melee' ? '⚔️' :
      unit.role === 'ranged' ? '🏹' : unit.role === 'caster' ? '✨' :
      unit.role === 'siege' ? '💣' : unit.role === 'hero' ? '👑' : '•';
    ctx.fillText(icon, unit.pos.x, unit.pos.y + 5);
    ctx.textAlign = 'left';
  }

  // Selection ring
  if (unit.selected) {
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(unit.pos.x, unit.pos.y + half * 0.3, half * 0.8, 0, Math.PI * 2);
    ctx.stroke();
  }

  // HP bar
  const barW = size * 0.8;
  const hpPct = unit.hp / unit.maxHp;
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#f59e0b' : '#ef4444';
  ctx.fillRect(unit.pos.x - barW / 2, unit.pos.y - half - 8, barW * hpPct, 3);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 0.5;
  ctx.strokeRect(unit.pos.x - barW / 2, unit.pos.y - half - 8, barW, 3);

  // Hero level badge
  if (unit.isHero) {
    ctx.fillStyle = '#7c3aed';
    ctx.beginPath();
    ctx.arc(unit.pos.x + half * 0.6, unit.pos.y - half * 0.6, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${unit.heroLevel}`, unit.pos.x + half * 0.6, unit.pos.y - half * 0.6 + 3);
    ctx.textAlign = 'left';

    // Mana bar
    if (unit.maxMana > 0) {
      const manaPct = unit.mana / unit.maxMana;
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(unit.pos.x - barW / 2, unit.pos.y - half - 4, barW * manaPct, 2);
    }

    // XP bar
    if (unit.heroLevel < 10) {
      const xpPct = unit.heroXp / unit.heroXpToNext;
      ctx.fillStyle = '#a855f7';
      ctx.fillRect(unit.pos.x - barW / 2, unit.pos.y - half - 1, barW * xpPct, 1);
    }
  }

  // Carry indicator
  if (unit.carryAmount > 0) {
    ctx.fillStyle = unit.carryType === 'gold' ? '#fbbf24' : '#22c55e';
    ctx.beginPath();
    ctx.arc(unit.pos.x - half * 0.5, unit.pos.y - half * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  ctx.fillStyle = proj.faction === 'blue' ? '#60a5fa' : '#f87171';
  ctx.beginPath();
  ctx.arc(proj.pos.x, proj.pos.y, 3, 0, Math.PI * 2);
  ctx.fill();
  // Trail
  ctx.strokeStyle = proj.faction === 'blue' ? 'rgba(96,165,250,0.3)' : 'rgba(248,113,113,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(proj.pos.x, proj.pos.y);
  ctx.lineTo(proj.pos.x - proj.vel.x * 0.03, proj.pos.y - proj.vel.y * 0.03);
  ctx.stroke();
}

function drawVfx(ctx: CanvasRenderingContext2D, vfx: VfxEffect) {
  const cfg = VFX_CONFIGS[vfx.type as keyof typeof VFX_CONFIGS];
  if (!cfg) return;
  const progress = vfx.age / vfx.duration;
  const alpha = Math.max(0, 1 - progress);
  const size = cfg.growing ? cfg.displaySize * progress : cfg.displaySize;

  ctx.globalAlpha = alpha;
  const img = loadImg(cfg.src);
  if (img) {
    const frameIdx = cfg.singleFrame ? 0 : Math.floor(progress * cfg.cols) % cfg.cols;
    ctx.drawImage(img, frameIdx * cfg.frameW, 0, cfg.frameW, cfg.frameH,
      vfx.pos.x - size / 2, vfx.pos.y - size / 2, size, size);
  } else {
    // Fallback glow
    ctx.fillStyle = '#ff0';
    ctx.beginPath();
    ctx.arc(vfx.pos.x, vfx.pos.y, size / 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ── HUD ────────────────────────────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number) {
  const res = state.playerResources;

  // Top bar
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fillRect(0, 0, cw, 32);

  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(`🪙 ${res.gold}`, 16, 22);
  ctx.fillStyle = '#22c55e';
  ctx.fillText(`🪵 ${res.wood}`, 120, 22);
  ctx.fillStyle = '#f97316';
  ctx.fillText(`🍗 ${res.food}/${res.maxFood}`, 224, 22);

  // Upkeep
  const upkeepColor = state.upkeepLevel === 'none' ? '#22c55e' : state.upkeepLevel === 'low' ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = upkeepColor;
  ctx.fillText(`Upkeep: ${state.upkeepLevel.toUpperCase()}`, 350, 22);

  // Day/Night
  const dayIcon = state.timeOfDay === 'day' ? '☀️' : '🌙';
  const cycleProgress = state.dayNightCycle / CYCLE_LENGTH;
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText(`${dayIcon} ${Math.floor(state.timeElapsed / 60)}:${String(Math.floor(state.timeElapsed % 60)).padStart(2, '0')}`, cw - 120, 22);

  // Tech tier
  ctx.fillStyle = '#a855f7';
  ctx.fillText(`T${state.techTier}`, cw - 200, 22);

  // ── Hero portraits (top-left under resource bar) ─────────────────────────
  let heroX = 16;
  for (const [, u] of state.units) {
    if (u.faction !== 'blue' || !u.isHero || u.state === 'dead') continue;
    const heroCfg = HERO_CONFIGS.find(h => h.type === u.type);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(heroX, 38, 50, 50);
    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = 2;
    ctx.strokeRect(heroX, 38, 50, 50);
    // Hero icon
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(u.type === 'arthax' ? '🗡️' : u.type === 'kanji' ? '🔮' : u.type === 'katan' ? '🏹' : '🛡️', heroX + 25, 65);
    ctx.textAlign = 'left';
    // Level
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px sans-serif';
    ctx.fillText(`Lv${u.heroLevel}`, heroX + 2, 84);
    // HP bar
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(heroX, 88, 50 * (u.hp / u.maxHp), 3);
    // Mana bar
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(heroX, 92, 50 * (u.mana / u.maxMana), 2);
    heroX += 56;
  }

  // ── Selected unit info (bottom center) ───────────────────────────────────
  const selected = [...state.selected].map(id => state.units.get(id)).filter(u => u && u.state !== 'dead');
  if (selected.length === 1) {
    const u = selected[0]!;
    const panelW = 280;
    const panelH = 80;
    const px = (cw - panelW) / 2;
    const py = ch - panelH - 8;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(px, py, panelW, panelH);
    ctx.strokeStyle = '#3f3f46';
    ctx.strokeRect(px, py, panelW, panelH);

    ctx.fillStyle = '#e4e4e7';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`${u.type}${u.isHero ? ` (Lv${u.heroLevel})` : ''}`, px + 8, py + 18);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#a1a1aa';
    ctx.fillText(`HP: ${Math.round(u.hp)}/${u.maxHp}  DMG: ${UNIT_CONFIGS[u.type]?.damage ?? '?'}  ARM: ${u.armor}  SPD: ${UNIT_CONFIGS[u.type]?.speed ?? '?'}`, px + 8, py + 34);
    if (u.isHero) {
      ctx.fillText(`Mana: ${Math.round(u.mana)}/${u.maxMana}  XP: ${u.heroXp}/${u.heroXpToNext}  Kills: ${u.kills}`, px + 8, py + 48);
      // Inventory
      let ix = px + 8;
      for (let s = 0; s < 6; s++) {
        ctx.fillStyle = u.inventory[s] ? '#1e3a5f' : '#18181b';
        ctx.fillRect(ix, py + 54, 20, 20);
        ctx.strokeStyle = '#3f3f46';
        ctx.strokeRect(ix, py + 54, 20, 20);
        if (u.inventory[s]) {
          const def = ITEM_DEFS[u.inventory[s]!.defId];
          if (def) {
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(def.icon, ix + 10, py + 68);
            ctx.textAlign = 'left';
          }
        }
        ix += 24;
      }
    }
  } else if (selected.length > 1) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect((cw - 120) / 2, ch - 30, 120, 24);
    ctx.fillStyle = '#e4e4e7';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${selected.length} units selected`, cw / 2, ch - 14);
    ctx.textAlign = 'left';
  }

  // Win/Lose overlay
  if (state.gameStatus === 'won' || state.gameStatus === 'lost') {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = state.gameStatus === 'won' ? '#22c55e' : '#ef4444';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.gameStatus === 'won' ? 'VICTORY' : 'DEFEAT', cw / 2, ch / 2);
    ctx.textAlign = 'left';
  }
}

// ── Minimap ────────────────────────────────────────────────────────────────────
function drawMinimap(ctx: CanvasRenderingContext2D, state: GameState, cw: number, ch: number) {
  const mw = 160;
  const mh = 100;
  const mx = 8;
  const my = ch - mh - 8;

  // Find world bounds
  let worldW = 3600, worldH = 2100;
  for (const isl of state.islands) {
    worldW = Math.max(worldW, isl.x + isl.w + 100);
    worldH = Math.max(worldH, isl.y + isl.h + 100);
  }

  const scaleX = mw / worldW;
  const scaleY = mh / worldH;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#3f3f46';
  ctx.strokeRect(mx, my, mw, mh);

  // Islands
  for (const isl of state.islands) {
    ctx.fillStyle = '#2d5a3e';
    ctx.fillRect(mx + isl.x * scaleX, my + isl.y * scaleY, isl.w * scaleX, isl.h * scaleY);
  }

  // Units as dots
  for (const [, u] of state.units) {
    if (u.state === 'dead') continue;
    ctx.fillStyle = FACTION_COLORS[u.faction] || '#888';
    const dotSize = u.isHero ? 4 : 2;
    ctx.fillRect(mx + u.pos.x * scaleX - dotSize / 2, my + u.pos.y * scaleY - dotSize / 2, dotSize, dotSize);
  }

  // Buildings
  for (const [, b] of state.buildings) {
    ctx.fillStyle = FACTION_COLORS[b.faction] || '#888';
    ctx.fillRect(mx + b.pos.x * scaleX, my + b.pos.y * scaleY, 4, 4);
  }

  // Camera viewport
  const vx = mx + state.camera.x * scaleX;
  const vy = my + state.camera.y * scaleY;
  const vw = (cw / state.zoom) * scaleX;
  const vh = (ch / state.zoom) * scaleY;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.strokeRect(vx, vy, vw, vh);
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}
