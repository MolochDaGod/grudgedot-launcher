---
title: Sprite Effects Usage
nav_order: 4
---
# Sprite Effects & Projectile Usage Guide

This document explains how to use the enhanced sprite loader system to render units with effect and projectile overlays.

## Loading Sprites

### Basic Unit Sprite

```typescript
import { spriteLoader } from '@/lib/sprite-loader';

// Load a unit's main sprite sheet
const result = await spriteLoader.loadUnitSprite(
  'archer-01',
  'sprites/characters/Archer', // Character folder path
  ['Idle', 'Walk', 'Attack01', 'Attack02', 'Hurt', 'Death']
);

if (result.success) {
  const unitSprite = result.sprite;
} else {
  console.error('Failed to load unit:', result.error);
}
```

### Effect Sprite

Effects are typically stored in a `(Split Effects)` subfolder within the character directory:

```typescript
// Load an effect sprite (e.g., attack aura, damage burst)
const effectResult = await spriteLoader.loadEffectSprite(
  'attack-aura',
  'sprites/characters/Archer', // Character folder path
  {
    'Idle': 1,
    'Active': 8,
    'Burst': 6,
  }
);

if (effectResult.success) {
  const effectSprite = effectResult.sprite;
}
```

### Projectile Sprite

Projectiles are stored in a `(projectile)` subfolder:

```typescript
// Load a projectile sprite
const projResult = await spriteLoader.loadProjectileSprite(
  'arrow',
  'sprites/characters/Archer',
  {
    'Travel': 4,
    'Impact': 3,
  }
);

if (projResult.success) {
  const projectileSprite = projResult.sprite;
}
```

## Rendering

### Basic Rendering

```typescript
import { renderUnitSprite } from '@/lib/sprite-loader';

const ctx = canvas.getContext('2d');

// Render just the unit
renderUnitSprite(ctx, unitSprite, x, y, size, flipX);
```

### Rendering with Effects

```typescript
import { renderUnitWithEffect } from '@/lib/sprite-loader';

// Render unit + effect overlay
renderUnitWithEffect(ctx, unitSprite, effectSprite, x, y, size, flipX);
```

### Rendering with Projectiles

```typescript
import { renderUnitWithProjectile } from '@/lib/sprite-loader';

// Render unit + projectile overlay
renderUnitWithProjectile(ctx, unitSprite, projectileSprite, x, y, size, flipX);
```

## Animation Updates

### Single Sprite Update

```typescript
import { spriteLoader } from '@/lib/sprite-loader';

// Update per frame (deltaTime in seconds)
spriteLoader.updateAnimation(unitSprite, deltaTime);

// Change animation
spriteLoader.setAnimation(unitSprite, 'Attack01');
```

### Synchronized Updates (Unit + Overlays)

```typescript
import { updateAnimationWithOverlays, setAnimationWithOverlays } from '@/lib/sprite-loader';

// Update all sprites in sync
updateAnimationWithOverlays(unitSprite, effectSprite, projectileSprite, deltaTime);

// Change animation on all
setAnimationWithOverlays(unitSprite, effectSprite, projectileSprite, 'Attack01');
```

## Complete Example

```typescript
import {
  spriteLoader,
  renderUnitWithEffect,
  updateAnimationWithOverlays,
  setAnimationWithOverlays,
  getUnitAnimationState,
} from '@/lib/sprite-loader';

class UnitRenderer {
  unitSprite: any;
  effectSprite: any;
  projectileSprite: any;
  
  async init(characterName: string) {
    // Load all sprites
    const unitRes = await spriteLoader.loadUnitSprite(
      `unit-${characterName}`,
      `sprites/characters/${characterName}`,
      ['Idle', 'Walk', 'Attack01', 'Attack02', 'Hurt', 'Death']
    );
    
    const effectRes = await spriteLoader.loadEffectSprite(
      `${characterName}-aura`,
      `sprites/characters/${characterName}`,
      { 'Active': 4 }
    );
    
    const projRes = await spriteLoader.loadProjectileSprite(
      `${characterName}-projectile`,
      `sprites/characters/${characterName}`,
      { 'Travel': 6 }
    );
    
    this.unitSprite = unitRes.sprite;
    this.effectSprite = effectRes.sprite;
    this.projectileSprite = projRes.sprite;
  }
  
  update(deltaTime: number, unitState: any) {
    // Update animation based on unit state
    const nextAnim = getUnitAnimationState(unitState);
    setAnimationWithOverlays(this.unitSprite, this.effectSprite, this.projectileSprite, nextAnim);
    
    // Update frames
    updateAnimationWithOverlays(this.unitSprite, this.effectSprite, this.projectileSprite, deltaTime);
  }
  
  render(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
    renderUnitWithEffect(ctx, this.unitSprite, this.effectSprite, x, y, size, false);
  }
}
```

## Folder Structure Reference

Sprites are organized as follows in the per-tab asset structure:

```
client/public/assets/grudge-swarm/
├── sprites/
│   └── characters/
│       └── Archer/
│           ├── Archer-Idle.png
│           ├── Archer-Walk.png
│           ├── Archer-Attack01.png
│           ├── (Split Effects)/
│           │   ├── attack-aura-Active.png
│           │   └── attack-aura.png
│           └── (projectile)/
│               ├── arrow-Travel.png
│               └── arrow.png
```

## Notes

- Effects typically use faster frame durations (0.05s) and don't loop
- Projectiles also animate quickly but usually loop
- Spaces in folder names are URL-encoded as `%20`
- The sprite loader caches images to avoid reloading
- Overlays render on top of the unit sprite at the same position
