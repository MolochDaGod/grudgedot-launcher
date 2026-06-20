---
title: Sprite System Overview
nav_order: 5
---
# Sprite Animation System - Technical Overview

## Architecture

The sprite animation system is built in layers to support efficient loading, caching, and rendering of complex multi-layer sprites with effects and projectiles.

### Layer 1: Asset Organization
- **Location**: `client/public/assets/sprites/grudge-swarm/`
- **Structure**: Per-character folders with organized subfolders
- **Sync**: Automated via `scripts/asset-sync.js` from Google Drive
- **Mapping**: GrudgeRPGAssets2d automatically mapped to grudge-swarm/sprites/characters/

### Layer 2: Sprite Loader (`sprite-loader.ts`)
Low-level sprite loading and animation management:
- **loadImage()**: Caches individual PNG files with URL encoding for spaces
- **loadUnitSprite()**: Loads character main sprites
- **loadEffectSprite()**: Loads overlaid effects from `(Split Effects)` folders
- **loadProjectileSprite()**: Loads projectile sprites from `(projectile)` folders
- **updateAnimation()**: Frame-by-frame animation updates
- **setAnimation()**: Switch between animations
- **render functions**: Canvas-based sprite rendering

### Layer 3: Character Loader (`character-loader.ts`)
High-level character asset management:
- **CharacterLoader singleton**: Central registry for all loaded characters
- **loadCharacter()**: Loads unit + all effects and projectiles for a character
- **getEffect()**: Access specific effects
- **getProjectile()**: Access specific projectiles
- **Cache management**: Prevents redundant loading

### Layer 4: Configuration (`characters.config.json`)
Static character definitions:
- Animation frame counts and timing
- Effect definitions and folders
- Projectile definitions and folders
- Character metadata (names, folder paths)

## File Structure

```
client/
├── public/assets/sprites/grudge-swarm/
│   ├── sprites/characters/
│   │   ├── Archer/
│   │   │   ├── Archer-Idle.png
│   │   │   ├── Archer-Walk-1.png
│   │   │   ├── Archer-Walk-2.png
│   │   │   ├── Archer-Attack01-1.png
│   │   │   ├── (Split%20Effects)/
│   │   │   │   ├── attack-aura-Active.png
│   │   │   │   └── attack-aura.png
│   │   │   └── (projectile)/
│   │   │       ├── arrow-Travel.png
│   │   │       └── arrow.png
│   │   ├── Knight/
│   │   ├── Mage/
│   │   └── [more characters...]
│   └── characters.config.json
│
└── src/
    └── lib/
        ├── sprite-loader.ts (core sprite system)
        ├── character-loader.ts (character registry)
        └── sprite-effects-usage.md (examples)
```

## Sprite Sheet Organization

### Main Character Sprite
- Named: `{CharacterName}-{AnimationName}.png`
- Examples: `Archer-Idle.png`, `Archer-Attack01.png`
- Can include numbered variants for multi-frame animations
- Examples: `Archer-Walk-1.png`, `Archer-Walk-2.png`, `Archer-Walk-3.png`

### Effect Sprites
- Location: `{Character}/(Split Effects)/`
- Named: `{EffectName}-{AnimationName}.png`
- Example: `attack-aura-Active.png`
- Typically:
  - Non-looping animations
  - Faster frame duration (0.05s)
  - Rendered on top of unit sprite
  - Updated synchronously with unit animation

### Projectile Sprites
- Location: `{Character}/(projectile)/`
- Named: `{ProjectileId}-{AnimationName}.png`
- Example: `arrow-Travel.png`
- Typically:
  - Looping animations
  - Consistent frame timing (0.05s)
  - Rendered on top of unit sprite
  - Synchronized with attack animations

## Usage Examples

### Basic Unit Loading and Rendering

```typescript
import { characterLoader } from '@/lib/character-loader';
import { renderUnitSprite } from '@/lib/sprite-loader';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// Load a character
const archer = await characterLoader.loadCharacter('archer');
if (archer) {
  // Render
  renderUnitSprite(ctx, archer.unit, 100, 100, 64, false);
}
```

### Rendering with Effects

```typescript
import { renderUnitWithEffect } from '@/lib/sprite-loader';

const archer = await characterLoader.loadCharacter('archer');
if (archer) {
  const aura = archer.effects.get('attack-aura');
  renderUnitWithEffect(ctx, archer.unit, aura, 100, 100, 64, false);
}
```

### Animation Loop

```typescript
import { updateAnimationWithOverlays } from '@/lib/sprite-loader';

const archer = await characterLoader.loadCharacter('archer');
if (archer) {
  let lastTime = performance.now();
  
  function animate(time: number) {
    const deltaTime = (time - lastTime) / 1000; // Convert to seconds
    lastTime = time;
    
    // Update all sprites
    updateAnimationWithOverlays(
      archer.unit,
      archer.effects.get('attack-aura') || null,
      archer.projectiles.get('arrow') || null,
      deltaTime
    );
    
    // Render
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderUnitWithEffect(ctx, archer.unit, archer.effects.get('attack-aura') || null, 100, 100, 64);
    
    requestAnimationFrame(animate);
  }
  
  requestAnimationFrame(animate);
}
```

## Asset Sync Pipeline

The `asset-sync.js` script handles several key mappings:

1. **Per-tab organization**: Assets in `attached_assets/tabs/{slug}/` automatically go to that tab
2. **Legacy mapping**: `GrudgeRPGAssets2d` → `grudge-swarm/sprites/characters/`
3. **Category routing**: Sprites go to `sprites/`, models to `models/`, etc.
4. **Manifest generation**: Creates `manifest.json` tracking all synced assets

### Running Asset Sync

```bash
# Development (from local attached_assets)
npm run sync-assets

# Production (runs during CI/CD from Google Drive)
# Controlled by GitHub Actions workflow
```

## Animation Timing

Frame durations are defined in seconds:
- **Unit animations**: 0.1-0.15s per frame (normal speed)
- **Effect animations**: 0.05s per frame (faster, snappier)
- **Projectile animations**: 0.05s per frame (matches effects)

Adjust these values in `characters.config.json` as needed.

## Performance Considerations

1. **Image Caching**: All loaded images are cached at the SpriteLoader level
2. **Character Caching**: Loaded character assets are cached at the CharacterLoader level
3. **Lazy Loading**: Characters load on-demand, not all at startup
4. **URL Encoding**: Spaces in paths are properly encoded to avoid 404s

### Cache Stats

```typescript
import { characterLoader } from '@/lib/character-loader';

const stats = characterLoader.getCacheStats();
console.log(`Loaded characters: ${stats.loadedCharacters}`);
console.log(`Cached images: ${stats.spriteLoaderCache.cachedImages}`);
```

## Adding New Characters

1. Add sprite PNGs to `attached_assets/GrudgeRPGAssets2d/{CharacterName}/`
2. Add effect sprites to `{CharacterName}/(Split Effects)/`
3. Add projectile sprites to `{CharacterName}/(projectile)/`
4. Run `npm run sync-assets` to organize assets
5. Update `client/public/assets/sprites/grudge-swarm/characters.config.json` with:
   - Animation definitions
   - Effect configurations
   - Projectile configurations

## Adding New Effects or Projectiles

1. Create `(Split Effects)` or `(projectile)` subfolder in character directory
2. Add sprite PNGs following naming convention: `{EffectId}-{AnimationName}.png`
3. Update `characters.config.json` to list animations and frame counts
4. Test with CharacterLoader and render functions

## URL Encoding Notes

Folder names with spaces are URL-encoded:
- `(Split Effects)` → `(Split%20Effects)`
- `(projectile)` → `(projectile)` (no spaces, no encoding needed)

The sprite loader automatically handles this encoding via `encodeURI()`.

## Debugging

Enable verbose output:

```typescript
// Monitor loading progress
import { spriteLoader } from '@/lib/sprite-loader';

const stats = spriteLoader.getCacheStats();
console.log('Current cache:', stats);

// Load with error handling
const result = await spriteLoader.loadUnitSprite('archer', 'sprites/characters/Archer', ['Idle']);
if (!result.success) {
  console.error('Load failed:', result.error);
}
```

Check browser console for warnings about failed image loads - these typically indicate missing sprite files in the expected path.
