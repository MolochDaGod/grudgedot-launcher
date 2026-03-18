/**
 * SpriteEffects2D — Canvas-based 2D effect rendering system
 * Overlays animated sprite effects on top of game viewports
 */

export type SpriteEffectType =
  | 'slash'
  | 'impact'
  | 'fire'
  | 'frost'
  | 'lightning'
  | 'magic'
  | 'shockwave'
  | 'heal'
  | 'blood'
  | 'spark';

export interface SpriteEffect2DConfig {
  type: SpriteEffectType;
  x: number;
  y: number;
  color: string;
  colorSecondary?: string;
  scale?: number;
  duration?: number;
  rotation?: number;
  screenShake?: boolean;
}

interface ActiveEffect {
  config: SpriteEffect2DConfig;
  startTime: number;
  duration: number;
  progress: number;
}

// Seeded random for reproducible effects
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export class SpriteEffects2DManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private effects: ActiveEffect[] = [];
  private animationId: number = 0;
  private running: boolean = false;
  private shakeOffset = { x: 0, y: 0 };
  private shakeDecay = 0;
  private seedCounter = 0;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '10';
    container.style.position = 'relative';
    container.appendChild(this.canvas);

    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.resize();
    this.start();

    const resizeObserver = new ResizeObserver(() => this.resize());
    resizeObserver.observe(container);
  }

  private resize() {
    const rect = this.canvas.parentElement?.getBoundingClientRect();
    if (rect) {
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  public spawn(config: SpriteEffect2DConfig): void {
    const duration = config.duration ?? this.getDefaultDuration(config.type);
    this.effects.push({
      config,
      startTime: performance.now(),
      duration: duration * 1000,
      progress: 0,
    });
    if (config.screenShake) {
      this.shakeDecay = 0.3;
      this.shakeOffset.x = (Math.random() - 0.5) * 12;
      this.shakeOffset.y = (Math.random() - 0.5) * 12;
    }
  }

  public spawnAt(type: SpriteEffectType, x: number, y: number, color: string, opts?: Partial<SpriteEffect2DConfig>): void {
    this.spawn({ type, x, y, color, ...opts });
  }

  private getDefaultDuration(type: SpriteEffectType): number {
    switch (type) {
      case 'slash': return 0.3;
      case 'impact': return 0.4;
      case 'fire': return 0.6;
      case 'frost': return 0.5;
      case 'lightning': return 0.25;
      case 'magic': return 0.5;
      case 'shockwave': return 0.5;
      case 'heal': return 0.8;
      case 'blood': return 0.4;
      case 'spark': return 0.3;
      default: return 0.4;
    }
  }

  private start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private update() {
    const now = performance.now();
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      const elapsed = now - fx.startTime;
      fx.progress = Math.min(1, elapsed / fx.duration);
      if (fx.progress >= 1) {
        this.effects.splice(i, 1);
      }
    }

    // Decay screen shake
    if (this.shakeDecay > 0) {
      this.shakeDecay -= 0.016;
      this.shakeOffset.x *= 0.85;
      this.shakeOffset.y *= 0.85;
      if (this.shakeDecay <= 0) {
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
      }
    }
  }

  private render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.shakeDecay > 0) {
      ctx.save();
      ctx.translate(this.shakeOffset.x, this.shakeOffset.y);
    }

    for (const fx of this.effects) {
      ctx.save();
      this.renderEffect(fx);
      ctx.restore();
    }

    if (this.shakeDecay > 0) {
      ctx.restore();
    }
  }

  private renderEffect(fx: ActiveEffect) {
    const { ctx } = this;
    const { type, x, y, color, colorSecondary, scale = 1, rotation = 0 } = fx.config;
    const t = fx.progress;

    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    switch (type) {
      case 'slash': this.drawSlash(ctx, t, color, colorSecondary); break;
      case 'impact': this.drawImpact(ctx, t, color, colorSecondary); break;
      case 'fire': this.drawFire(ctx, t, color, colorSecondary); break;
      case 'frost': this.drawFrost(ctx, t, color, colorSecondary); break;
      case 'lightning': this.drawLightning(ctx, t, color, colorSecondary); break;
      case 'magic': this.drawMagic(ctx, t, color, colorSecondary); break;
      case 'shockwave': this.drawShockwave(ctx, t, color); break;
      case 'heal': this.drawHeal(ctx, t, color); break;
      case 'blood': this.drawBlood(ctx, t, color); break;
      case 'spark': this.drawSpark(ctx, t, color); break;
    }
  }

  // --- Slash: sweeping arc ---
  private drawSlash(ctx: CanvasRenderingContext2D, t: number, color: string, secondary?: string) {
    const alpha = 1 - t;
    const sweepAngle = t * Math.PI * 0.8;
    const radius = 40 + t * 20;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 6 - t * 4;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;

    // Main arc
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI * 0.5 - sweepAngle * 0.5, -Math.PI * 0.5 + sweepAngle * 0.5);
    ctx.stroke();

    // Inner glow arc
    ctx.globalAlpha = alpha * 0.5;
    ctx.strokeStyle = secondary || '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, -Math.PI * 0.5 - sweepAngle * 0.4, -Math.PI * 0.5 + sweepAngle * 0.4);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  // --- Impact: expanding burst ---
  private drawImpact(ctx: CanvasRenderingContext2D, t: number, color: string, secondary?: string) {
    const alpha = 1 - t;
    const radius = t * 50;
    const rays = 8;

    // Central flash
    ctx.globalAlpha = alpha * 0.8;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    gradient.addColorStop(0, secondary || '#ffffff');
    gradient.addColorStop(0.4, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Rays
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 - t * 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    for (let i = 0; i < rays; i++) {
      const angle = (i / rays) * Math.PI * 2;
      const len = radius * (0.8 + seededRandom(i + this.seedCounter) * 0.6);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
      ctx.stroke();
    }
    this.seedCounter++;
    ctx.shadowBlur = 0;
  }

  // --- Fire: flame column ---
  private drawFire(ctx: CanvasRenderingContext2D, t: number, color: string, secondary?: string) {
    const alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    const flames = 6;

    for (let i = 0; i < flames; i++) {
      const seed = seededRandom(i * 7 + this.seedCounter);
      const flameT = (t + seed * 0.3) % 1;
      const flameAlpha = alpha * (1 - flameT);
      const flameY = -flameT * 60;
      const flameX = (seed - 0.5) * 20;
      const size = 12 * (1 - flameT * 0.5);

      ctx.globalAlpha = flameAlpha * 0.7;
      const grad = ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, size);
      grad.addColorStop(0, secondary || '#ffff00');
      grad.addColorStop(0.5, color);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(flameX, flameY, size, 0, Math.PI * 2);
      ctx.fill();
    }
    this.seedCounter++;
  }

  // --- Frost: expanding ice ring ---
  private drawFrost(ctx: CanvasRenderingContext2D, t: number, color: string, secondary?: string) {
    const alpha = 1 - t;
    const radius = 10 + t * 45;
    const spikes = 12;

    // Outer ring
    ctx.globalAlpha = alpha * 0.6;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Ice crystals around ring
    ctx.globalAlpha = alpha * 0.8;
    ctx.fillStyle = secondary || '#ffffff';
    for (let i = 0; i < spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2 + t * 0.5;
      const cx = Math.cos(angle) * radius;
      const cy = Math.sin(angle) * radius;
      const size = 4 * (1 - t * 0.5);

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.4, 0);
      ctx.lineTo(0, size);
      ctx.lineTo(-size * 0.4, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.shadowBlur = 0;
  }

  // --- Lightning: jagged bolt ---
  private drawLightning(ctx: CanvasRenderingContext2D, t: number, color: string, secondary?: string) {
    const alpha = t < 0.1 ? 1 : 1 - (t - 0.1) / 0.9;
    const bolts = 3;

    for (let b = 0; b < bolts; b++) {
      ctx.globalAlpha = alpha * (0.5 + seededRandom(b + this.seedCounter) * 0.5);
      ctx.strokeStyle = b === 0 ? (secondary || '#ffffff') : color;
      ctx.lineWidth = b === 0 ? 3 : 1.5;
      ctx.shadowColor = color;
      ctx.shadowBlur = b === 0 ? 20 : 8;

      ctx.beginPath();
      let px = 0, py = -50;
      ctx.moveTo(px, py);

      const segments = 8;
      for (let s = 1; s <= segments; s++) {
        const sy = -50 + (100 * s) / segments;
        const sx = (seededRandom(b * 100 + s + this.seedCounter) - 0.5) * 40;
        ctx.lineTo(sx, sy);
        px = sx;
        py = sy;
      }
      ctx.stroke();
    }
    this.seedCounter++;
    ctx.shadowBlur = 0;
  }

  // --- Magic: spiraling particles ---
  private drawMagic(ctx: CanvasRenderingContext2D, t: number, color: string, secondary?: string) {
    const alpha = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;
    const particles = 16;

    for (let i = 0; i < particles; i++) {
      const angle = (i / particles) * Math.PI * 2 + t * Math.PI * 4;
      const dist = 15 + t * 35;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      const size = 4 * (1 - t * 0.6);

      ctx.globalAlpha = alpha * (0.4 + seededRandom(i) * 0.6);
      const grad = ctx.createRadialGradient(px, py, 0, px, py, size);
      grad.addColorStop(0, secondary || '#ffffff');
      grad.addColorStop(1, color);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center glow
    ctx.globalAlpha = alpha * 0.5;
    const centerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 20);
    centerGrad.addColorStop(0, color);
    centerGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = centerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- Shockwave: expanding ring ---
  private drawShockwave(ctx: CanvasRenderingContext2D, t: number, color: string) {
    const alpha = 1 - t;
    const radius = t * 80;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 * (1 - t);
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner ring
    ctx.globalAlpha = alpha * 0.4;
    ctx.lineWidth = 2 * (1 - t);
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // --- Heal: rising particles ---
  private drawHeal(ctx: CanvasRenderingContext2D, t: number, color: string) {
    const alpha = t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7;
    const particles = 10;

    for (let i = 0; i < particles; i++) {
      const seed = seededRandom(i * 13);
      const px = (seed - 0.5) * 40;
      const py = -t * 60 * (0.5 + seed * 0.5);
      const size = 3 + seed * 3;

      ctx.globalAlpha = alpha * (0.5 + seed * 0.5);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      // Cross/plus shape
      ctx.fillRect(px - size / 4, py - size / 2, size / 2, size);
      ctx.fillRect(px - size / 2, py - size / 4, size, size / 2);
    }
    ctx.shadowBlur = 0;
  }

  // --- Blood: splatter ---
  private drawBlood(ctx: CanvasRenderingContext2D, t: number, color: string) {
    const alpha = 1 - t * 0.7;
    const drops = 8;

    for (let i = 0; i < drops; i++) {
      const angle = seededRandom(i * 31 + this.seedCounter) * Math.PI * 2;
      const speed = 20 + seededRandom(i * 17) * 40;
      const dist = t * speed;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist + t * t * 30; // gravity
      const size = 3 + seededRandom(i) * 4;

      ctx.globalAlpha = alpha * (1 - t * 0.3);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, size * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    this.seedCounter++;
  }

  // --- Spark: tiny fast particles ---
  private drawSpark(ctx: CanvasRenderingContext2D, t: number, color: string) {
    const alpha = 1 - t;
    const sparks = 12;

    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    for (let i = 0; i < sparks; i++) {
      const angle = seededRandom(i * 23 + this.seedCounter) * Math.PI * 2;
      const speed = 30 + seededRandom(i * 7) * 50;
      const dist = t * speed;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;

      ctx.globalAlpha = alpha * (0.6 + seededRandom(i) * 0.4);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    this.seedCounter++;
    ctx.shadowBlur = 0;
  }

  // --- Utility: project 3D world position to 2D screen coords ---
  public projectToScreen(
    worldX: number, worldY: number, worldZ: number,
    camera: { projectionMatrix: { elements: number[] }; matrixWorldInverse: { elements: number[] } },
    canvasWidth: number, canvasHeight: number
  ): { x: number; y: number } | null {
    // Manual MVP projection
    const mv = camera.matrixWorldInverse.elements;
    const p = camera.projectionMatrix.elements;

    // View transform
    const vx = mv[0] * worldX + mv[4] * worldY + mv[8] * worldZ + mv[12];
    const vy = mv[1] * worldX + mv[5] * worldY + mv[9] * worldZ + mv[13];
    const vz = mv[2] * worldX + mv[6] * worldY + mv[10] * worldZ + mv[14];
    const vw = mv[3] * worldX + mv[7] * worldY + mv[11] * worldZ + mv[15];

    // Projection transform
    const cx = p[0] * vx + p[4] * vy + p[8] * vz + p[12] * vw;
    const cy = p[1] * vx + p[5] * vy + p[9] * vz + p[13] * vw;
    const cw = p[3] * vx + p[7] * vy + p[11] * vz + p[15] * vw;

    if (cw <= 0) return null; // Behind camera

    const ndcX = cx / cw;
    const ndcY = cy / cw;

    return {
      x: (ndcX * 0.5 + 0.5) * canvasWidth,
      y: (-ndcY * 0.5 + 0.5) * canvasHeight,
    };
  }

  public getShakeOffset(): { x: number; y: number } {
    return { ...this.shakeOffset };
  }

  public isShaking(): boolean {
    return this.shakeDecay > 0;
  }

  public dispose(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    this.effects = [];
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
