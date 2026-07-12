import { spriteLoader, UnitSprite, EffectSprite, ProjectileSprite, SpriteLoadResult } from './sprite-loader';
// characters.config.json may not exist in all environments; use dynamic require with fallback
const characterConfig: { characters: Record<string, any> } =
  (() => { try { return require('@/assets/sprites/grudge-swarm/characters.config.json'); } catch { return { characters: {} }; } })();

export interface CharacterAssets {
  unit: UnitSprite;
  effects: Map<string, EffectSprite>;
  projectiles: Map<string, ProjectileSprite>;
}

export interface CharacterDef {
  name: string;
  folderName: string;
  basePath: string;
  animations: Record<string, { frames: number; frameDuration: number }>;
  effects: Array<{
    id: string;
    folderPath: string;
    animations: Record<string, number>;
  }>;
  projectiles: Array<{
    id: string;
    folderPath: string;
    animations: Record<string, number>;
  }>;
}

/**
 * Character Loader - loads all sprites for a character including effects and projectiles
 */
export class CharacterLoader {
  private loadedCharacters: Map<string, CharacterAssets> = new Map();

  /**
   * Get character definition from config
   */
  getCharacterDef(characterKey: string): CharacterDef | null {
    const charConfig = (characterConfig as any).characters[characterKey];
    return charConfig || null;
  }

  /**
   * Load all sprites for a character
   */
  async loadCharacter(characterKey: string): Promise<CharacterAssets | null> {
    // Return cached if already loaded
    if (this.loadedCharacters.has(characterKey)) {
      return this.loadedCharacters.get(characterKey)!;
    }

    const charDef = this.getCharacterDef(characterKey);
    if (!charDef) {
      console.error(`Character not found in config: ${characterKey}`);
      return null;
    }

    try {
      // Load main unit sprite
      const animNames = Object.keys(charDef.animations).map(
        (k) => k.charAt(0).toUpperCase() + k.slice(1)
      );
      const unitResult = await spriteLoader.loadUnitSprite(
        characterKey,
        charDef.basePath,
        animNames
      );

      if (!unitResult.success) {
        console.error(`Failed to load unit sprite for ${characterKey}:`, unitResult.error);
        return null;
      }

      const assets: CharacterAssets = {
        unit: unitResult.sprite!,
        effects: new Map(),
        projectiles: new Map(),
      };

      // Load effects
      for (const effect of charDef.effects) {
        const effectResult = await spriteLoader.loadEffectSprite(
          effect.id,
          charDef.basePath,
          effect.animations
        );
        if (effectResult.success) {
          assets.effects.set(effect.id, effectResult.sprite as any as EffectSprite);
        } else {
          console.warn(`Failed to load effect ${effect.id} for ${characterKey}`);
        }
      }

      // Load projectiles
      for (const projectile of charDef.projectiles) {
        const projResult = await spriteLoader.loadProjectileSprite(
          projectile.id,
          charDef.basePath,
          projectile.animations
        );
        if (projResult.success) {
          assets.projectiles.set(projectile.id, projResult.sprite as any as ProjectileSprite);
        } else {
          console.warn(`Failed to load projectile ${projectile.id} for ${characterKey}`);
        }
      }

      // Cache
      this.loadedCharacters.set(characterKey, assets);
      return assets;
    } catch (error) {
      console.error(`Error loading character ${characterKey}:`, error);
      return null;
    }
  }

  /**
   * Get loaded character assets
   */
  getCharacter(characterKey: string): CharacterAssets | null {
    return this.loadedCharacters.get(characterKey) || null;
  }

  /**
   * Get effect sprite for character
   */
  getEffect(characterKey: string, effectId: string): EffectSprite | null {
    const assets = this.getCharacter(characterKey);
    return assets?.effects.get(effectId) || null;
  }

  /**
   * Get projectile sprite for character
   */
  getProjectile(characterKey: string, projectileId: string): ProjectileSprite | null {
    const assets = this.getCharacter(characterKey);
    return assets?.projectiles.get(projectileId) || null;
  }

  /**
   * Clear all loaded characters
   */
  clearCache() {
    this.loadedCharacters.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      loadedCharacters: this.loadedCharacters.size,
      spriteLoaderCache: spriteLoader.getCacheStats(),
    };
  }
}

// Singleton instance
export const characterLoader = new CharacterLoader();
