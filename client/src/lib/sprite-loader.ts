/**
 * Sprite Loading and Animation System for Swarm RTS
 * Handles loading, caching, and animating sprite sheets for all faction units
 */

export interface SpriteAnimation {
  frames: HTMLImageElement[];
  frameDuration: number;
  loop: boolean;
}

export interface UnitSprite {
  id: string;
  animations: Map<string, SpriteAnimation>;
  currentAnimation: string;
  currentFrame: number;
  animationTime: number;
}

export interface EffectSprite {
  id: string;
  animations: Map<string, SpriteAnimation>;
  currentAnimation: string;
  currentFrame: number;
  animationTime: number;
}

export interface ProjectileSprite {
  id: string;
  animations: Map<string, SpriteAnimation>;
  currentAnimation: string;
  currentFrame: number;
  animationTime: number;
}

export interface SpriteLoadResult {
  success: boolean;
  error?: string;
  sprite?: UnitSprite;
}

class SpriteLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();
  private basePath: string = '/';

  setBasePath(path: string) {
    this.basePath = path.endsWith('/') ? path : `${path}/`;
  }

  /**
   * Load a single image and cache it
   */
  async loadImage(path: string): Promise<HTMLImageElement> {
    const fullPath = `${this.basePath}${path}`;
    
    // Return cached image if available
    if (this.cache.has(fullPath)) {
      return this.cache.get(fullPath)!;
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(fullPath)) {
      return this.loadingPromises.get(fullPath)!;
    }

    // Create new load promise
    const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(fullPath, img);
        this.loadingPromises.delete(fullPath);
        resolve(img);
      };
      img.onerror = () => {
        this.loadingPromises.delete(fullPath);
        reject(new Error(`Failed to load image: ${fullPath}`));
      };
      // Encode URI to safely handle spaces and special characters
      img.src = encodeURI(fullPath);
    });

    this.loadingPromises.set(fullPath, loadPromise);
    return loadPromise;
  }

  /**
   * Load all animation frames for a unit
   */
  async loadUnitSprite(unitId: string, spritePath: string, animations: string[]): Promise<SpriteLoadResult> {
    try {
      const unitSprite: UnitSprite = {
        id: unitId,
        animations: new Map(),
        currentAnimation: animations[0] || 'Idle',
        currentFrame: 0,
        animationTime: 0,
      };

      // Normalize path from historical locations to current /assets layout
      // Examples input: 'docs/MiniWorldSprites/Characters/Heros/GrudgeRPGAssets2d/Archer'
      // Primary attempt:  'sprites/default/Archer-<Anim>.png'
      // Secondary:       'sprites/Characters/Heros/GrudgeRPGAssets2d/Archer-<Anim>.png'
      // Fallbacks:       single-sheet PNGs such as
      //                  'sprites/characters/Archer.png', 'sprites/Characters/Archer.png',
      //                  'sprites/grudge-swarm/characters/Archer.png'
      const leafName = (spritePath.split(/[\\/]/).pop() || spritePath).replace(/\.(png|webp)$/i, '');
      let stripped = spritePath.replace(/^docs\//i, '');
      stripped = stripped.replace(/^MiniWorldSprites\//i, '');
      const structuredBase = `sprites/${stripped}`; // e.g., sprites/Characters/Heros/.../Archer
      const defaultBase = `sprites/default/${leafName}`; // e.g., sprites/default/Archer

      // Pre-build single-sheet fallbacks (case variants)
      const singleSheetFallbacks = [
        `sprites/characters/${leafName}.png`,
        `sprites/Characters/${leafName}.png`,
        `sprites/grudge-swarm/characters/${leafName}.png`,
      ];

      // Try to load each animation as its own file; otherwise fall back to single-sheet
      for (const anim of animations) {
        const animName = anim; // keep original case
        const candidates = [
          `${defaultBase}-${animName}.png`,
          `${structuredBase}-${animName}.png`,
          ...singleSheetFallbacks,
        ];

        let loadedImg: HTMLImageElement | null = null;
        let lastErr: unknown = null;
        for (const candidate of candidates) {
          try {
            loadedImg = await this.loadImage(candidate);
            break;
          } catch (err) {
            lastErr = err;
          }
        }
        
        if (loadedImg) {
          unitSprite.animations.set(animName, {
            frames: [loadedImg],
            frameDuration: /attack/i.test(animName) ? 0.08 : /walk/i.test(animName) ? 0.12 : 0.1,
            loop: !/death|hurt/i.test(animName),
          });
        } else {
          console.warn(`Could not load animation ${animName} for ${unitId}. Tried:`, candidates, lastErr);
        }
      }

      // If still nothing loaded, try a final generic fallback by leaf name only once
      if (unitSprite.animations.size === 0) {
        for (const candidate of singleSheetFallbacks) {
          try {
            const img = await this.loadImage(candidate);
            // Map the same image to all provided animations so rendering works
            for (const anim of animations) {
              unitSprite.animations.set(anim, {
                frames: [img],
                frameDuration: 0.1,
                loop: !/death|hurt/i.test(anim),
              });
            }
            break;
          } catch (_) {}
        }
      }

      // Ensure at least one animation loaded
      if (unitSprite.animations.size === 0) {
        return {
          success: false,
          error: `No animations loaded for unit ${unitId}`,
        };
      }

      return {
        success: true,
        sprite: unitSprite,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update animation state
   */
  updateAnimation(sprite: UnitSprite, deltaTime: number) {
    const anim = sprite.animations.get(sprite.currentAnimation);
    if (!anim) return;

    sprite.animationTime += deltaTime;
    if (sprite.animationTime >= anim.frameDuration) {
      sprite.animationTime = 0;
      sprite.currentFrame++;
      
      if (sprite.currentFrame >= anim.frames.length) {
        if (anim.loop) {
          sprite.currentFrame = 0;
        } else {
          sprite.currentFrame = anim.frames.length - 1;
        }
      }
    }
  }

  /**
   * Change current animation
   */
  setAnimation(sprite: UnitSprite, animationName: string) {
    if (sprite.currentAnimation === animationName) return;
    
    if (sprite.animations.has(animationName)) {
      sprite.currentAnimation = animationName;
      sprite.currentFrame = 0;
      sprite.animationTime = 0;
    }
  }

  /**
   * Get current frame image
   */
  getCurrentFrame(sprite: UnitSprite): HTMLImageElement | null {
    const anim = sprite.animations.get(sprite.currentAnimation);
    if (!anim || anim.frames.length === 0) return null;
    
    const frameIndex = Math.min(sprite.currentFrame, anim.frames.length - 1);
    return anim.frames[frameIndex];
  }

  /**
   * Load numbered animation frames for effect/projectile sprites.
   * Uses literal spaces in paths — loadImage() applies encodeURI once.
   */
  private async loadSplitAnimationFrames(
    basePath: string,
    animName: string,
    frameCount: number,
  ): Promise<HTMLImageElement[]> {
    const frames: HTMLImageElement[] = [];
    const count = Math.max(1, frameCount);

    if (count === 1) {
      for (const candidate of [`${basePath}-${animName}.png`, `${basePath}.png`]) {
        try {
          frames.push(await this.loadImage(candidate));
          return frames;
        } catch { /* try next */ }
      }
      return frames;
    }

    for (let i = 1; i <= count; i++) {
      const padded = String(i).padStart(2, '0');
      const candidates = [
        `${basePath}-${animName}-${i}.png`,
        `${basePath}-${animName}-${padded}.png`,
      ];
      let loaded: HTMLImageElement | null = null;
      for (const candidate of candidates) {
        try {
          loaded = await this.loadImage(candidate);
          break;
        } catch { /* try next */ }
      }
      if (loaded) {
        frames.push(loaded);
      } else if (i === 1) {
        // Fall back to a single combined sheet for this animation
        try {
          frames.push(await this.loadImage(`${basePath}-${animName}.png`));
        } catch { /* no frames */ }
        break;
      }
    }

    return frames;
  }

  /**
   * Load effect sprite from (Split Effects) subfolder
   */
  async loadEffectSprite(effectId: string, characterPath: string, animationFrames: Record<string, number>): Promise<SpriteLoadResult> {
    try {
      const effectSprite: EffectSprite = {
        id: effectId,
        animations: new Map(),
        currentAnimation: Object.keys(animationFrames)[0] || 'default',
        currentFrame: 0,
        animationTime: 0,
      };

      // Map character path to effect folder (literal space — encodeURI runs in loadImage)
      // e.g., sprites/characters/Archer -> sprites/characters/Archer/(Split Effects)/attack-aura
      const effectBase = `${characterPath}/(Split Effects)/${effectId}`;

      for (const [animName, frameCount] of Object.entries(animationFrames)) {
        const frames = await this.loadSplitAnimationFrames(effectBase, animName, frameCount);

        if (frames.length > 0) {
          effectSprite.animations.set(animName, {
            frames,
            frameDuration: 0.05,
            loop: false,
          });
        } else {
          console.warn(`Could not load effect animation ${animName} for ${effectId}`);
        }
      }

      if (effectSprite.animations.size === 0) {
        return {
          success: false,
          error: `No effect animations loaded for ${effectId}`,
        };
      }

      return {
        success: true,
        sprite: effectSprite as any,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load projectile sprite from (projectile) subfolder
   */
  async loadProjectileSprite(projectileId: string, characterPath: string, animationFrames: Record<string, number>): Promise<SpriteLoadResult> {
    try {
      const projectileSprite: ProjectileSprite = {
        id: projectileId,
        animations: new Map(),
        currentAnimation: Object.keys(animationFrames)[0] || 'default',
        currentFrame: 0,
        animationTime: 0,
      };

      // Map character path to projectile folder:
      // e.g., sprites/characters/Archer -> sprites/characters/Archer/(projectile)/
      const projectileBase = `${characterPath}/(projectile)/${projectileId}`;

      for (const [animName, frameCount] of Object.entries(animationFrames)) {
        const frames = await this.loadSplitAnimationFrames(projectileBase, animName, frameCount);

        if (frames.length > 0) {
          projectileSprite.animations.set(animName, {
            frames,
            frameDuration: 0.05,
            loop: true,
          });
        } else {
          console.warn(`Could not load projectile animation ${animName} for ${projectileId}`);
        }
      }

      if (projectileSprite.animations.size === 0) {
        return {
          success: false,
          error: `No projectile animations loaded for ${projectileId}`,
        };
      }

      return {
        success: true,
        sprite: projectileSprite as any,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear all cached sprites
   */
  clearCache() {
    this.cache.clear();
    this.loadingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedImages: this.cache.size,
      loading: this.loadingPromises.size,
    };
  }
}

// Singleton instance
export const spriteLoader = new SpriteLoader();

/**
 * Render a unit sprite on canvas
 */
export function renderUnitSprite(
  ctx: CanvasRenderingContext2D,
  sprite: UnitSprite,
  x: number,
  y: number,
  size: number,
  flipX: boolean = false
) {
  const frame = spriteLoader.getCurrentFrame(sprite);
  if (!frame) return;

  ctx.save();
  ctx.translate(x, y);
  
  if (flipX) {
    ctx.scale(-1, 1);
  }

  // Draw centered
  ctx.drawImage(
    frame,
    -size / 2,
    -size / 2,
    size,
    size
  );

  ctx.restore();
}

/**
 * Render an effect sprite overlay on canvas
 */
export function renderEffectSprite(
  ctx: CanvasRenderingContext2D,
  sprite: EffectSprite,
  x: number,
  y: number,
  size: number,
  flipX: boolean = false
) {
  const anim = sprite.animations.get(sprite.currentAnimation);
  if (!anim || anim.frames.length === 0) return;

  const frame = anim.frames[Math.min(sprite.currentFrame, anim.frames.length - 1)];

  ctx.save();
  ctx.translate(x, y);
  
  if (flipX) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    frame,
    -size / 2,
    -size / 2,
    size,
    size
  );

  ctx.restore();
}

/**
 * Render a projectile sprite overlay on canvas
 */
export function renderProjectileSprite(
  ctx: CanvasRenderingContext2D,
  sprite: ProjectileSprite,
  x: number,
  y: number,
  size: number,
  flipX: boolean = false
) {
  const anim = sprite.animations.get(sprite.currentAnimation);
  if (!anim || anim.frames.length === 0) return;

  const frame = anim.frames[Math.min(sprite.currentFrame, anim.frames.length - 1)];

  ctx.save();
  ctx.translate(x, y);
  
  if (flipX) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    frame,
    -size / 2,
    -size / 2,
    size,
    size
  );

  ctx.restore();
}

/**
 * Render a unit with effect overlay
 */
export function renderUnitWithEffect(
  ctx: CanvasRenderingContext2D,
  unitSprite: UnitSprite,
  effectSprite: EffectSprite | null,
  x: number,
  y: number,
  size: number,
  flipX: boolean = false
) {
  renderUnitSprite(ctx, unitSprite, x, y, size, flipX);
  if (effectSprite) {
    renderEffectSprite(ctx, effectSprite, x, y, size, flipX);
  }
}

/**
 * Render a unit with projectile overlay
 */
export function renderUnitWithProjectile(
  ctx: CanvasRenderingContext2D,
  unitSprite: UnitSprite,
  projectileSprite: ProjectileSprite | null,
  x: number,
  y: number,
  size: number,
  flipX: boolean = false
) {
  renderUnitSprite(ctx, unitSprite, x, y, size, flipX);
  if (projectileSprite) {
    renderProjectileSprite(ctx, projectileSprite, x, y, size, flipX);
  }
}

/**
 * Update animation state with synchronized effect/projectile overlays
 */
export function updateAnimationWithOverlays(
  unitSprite: UnitSprite,
  effectSprite: EffectSprite | null,
  projectileSprite: ProjectileSprite | null,
  deltaTime: number
) {
  spriteLoader.updateAnimation(unitSprite, deltaTime);
  if (effectSprite) {
    spriteLoader.updateAnimation(effectSprite as any, deltaTime);
  }
  if (projectileSprite) {
    spriteLoader.updateAnimation(projectileSprite as any, deltaTime);
  }
}

/**
 * Change animation on unit and optionally sync overlays
 */
export function setAnimationWithOverlays(
  unitSprite: UnitSprite,
  effectSprite: EffectSprite | null,
  projectileSprite: ProjectileSprite | null,
  animationName: string
) {
  spriteLoader.setAnimation(unitSprite, animationName);
  // Effects and projectiles typically have their own animation names
  // but you can sync them here if needed
}

/**
 * Determine animation state based on unit state
 */
export function getUnitAnimationState(unit: {
  isMoving: boolean;
  isAttacking: boolean;
  isDead: boolean;
  isHurt: boolean;
}): string {
  if (unit.isDead) return 'Death';
  if (unit.isHurt) return 'Hurt';
  if (unit.isAttacking) return 'Attack01'; // or randomly choose attack animation
  if (unit.isMoving) return 'Walk';
  return 'Idle';
}
