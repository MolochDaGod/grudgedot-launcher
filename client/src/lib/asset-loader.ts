/**
 * Asset Loader Utility
 * Shared across all Grudge Studio projects
 * Handles loading, caching, and fallback for assets deployed via Google Drive → Vercel pipeline
 */

export interface AssetLoadOptions {
  /** Timeout in ms (default: 10000) */
  timeout?: number;
  /** Enable console logging for debugging */
  debug?: boolean;
  /** Use cached version if available */
  useCache?: boolean;
}

export interface LoadedAsset<T> {
  url: string;
  data: T;
  cached: boolean;
  loadedAt: number;
}

class AssetLoader {
  private cache = new Map<string, unknown>();
  private baseUrl = "/assets";
  private manifest: Record<string, unknown> | null = null;
  private manifestLoaded = false;
  private debug = false;

  /**
   * Initialize asset loader with optional base URL
   */
  async init(baseUrl?: string, debug = false): Promise<void> {
    if (baseUrl) this.baseUrl = baseUrl;
    this.debug = debug;
    
    if (this.debug) {
      console.log("[AssetLoader] Initialized with baseUrl:", this.baseUrl);
    }
  }

  /**
   * Load asset manifest from public folder
   */
  async loadManifest(): Promise<Record<string, unknown>> {
    if (this.manifestLoaded && this.manifest) {
      return this.manifest;
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/manifest.json`,
        5000
      );
      this.manifest = await response.json();
      this.manifestLoaded = true;
      
      if (this.debug) {
        console.log("[AssetLoader] Manifest loaded:", this.manifest);
      }
      
      return this.manifest!;
    } catch (error) {
      if (this.debug) {
        console.warn("[AssetLoader] Failed to load manifest:", error);
      }
      this.manifest = {};
      return this.manifest;
    }
  }

  /**
   * Build asset URL from path
   */
  private buildUrl(path: string): string {
    // Normalize path (remove leading /)
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.baseUrl}/${normalizedPath}`;
  }

  /**
   * Load image asset
   */
  async loadImage(
    path: string,
    options: AssetLoadOptions = {}
  ): Promise<LoadedAsset<HTMLImageElement>> {
    const url = this.buildUrl(path);
    const cacheKey = `image:${url}`;
    const { timeout = 10000, debug = this.debug, useCache = true } = options;

    // Check cache
    if (useCache && this.cache.has(cacheKey)) {
      if (debug) console.log("[AssetLoader] Image from cache:", url);
      return {
        url,
        data: this.cache.get(cacheKey) as HTMLImageElement,
        cached: true,
        loadedAt: Date.now(),
      };
    }

    try {
      const img = await this.loadImageElement(url, timeout);
      this.cache.set(cacheKey, img);

      if (debug) console.log("[AssetLoader] Image loaded:", url);

      return {
        url,
        data: img,
        cached: false,
        loadedAt: Date.now(),
      };
    } catch (error) {
      if (debug) console.error("[AssetLoader] Failed to load image:", url, error);
      throw error;
    }
  }

  /**
   * Load GLB/GLTF 3D model (returns URL, actual loading done by Three.js/Babylon.js)
   */
  async loadModel(
    path: string,
    options: AssetLoadOptions = {}
  ): Promise<LoadedAsset<string>> {
    const url = this.buildUrl(path);
    const { debug = this.debug } = options;

    // Just validate the URL exists
    try {
      const response = await this.fetchWithTimeout(url, options.timeout || 10000);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (debug) console.log("[AssetLoader] Model URL ready:", url);

      return {
        url,
        data: url,
        cached: false,
        loadedAt: Date.now(),
      };
    } catch (error) {
      if (debug) console.error("[AssetLoader] Failed to load model:", url, error);
      throw error;
    }
  }

  /**
   * Load JSON asset (sprite data, configs, etc.)
   */
  async loadJSON<T extends Record<string, unknown>>(
    path: string,
    options: AssetLoadOptions = {}
  ): Promise<LoadedAsset<T>> {
    const url = this.buildUrl(path);
    const cacheKey = `json:${url}`;
    const { timeout = 10000, debug = this.debug, useCache = true } = options;

    // Check cache
    if (useCache && this.cache.has(cacheKey)) {
      if (debug) console.log("[AssetLoader] JSON from cache:", url);
      return {
        url,
        data: this.cache.get(cacheKey) as T,
        cached: true,
        loadedAt: Date.now(),
      };
    }

    try {
      const response = await this.fetchWithTimeout(url, timeout);
      const data = (await response.json()) as T;
      this.cache.set(cacheKey, data);

      if (debug) console.log("[AssetLoader] JSON loaded:", url);

      return {
        url,
        data,
        cached: false,
        loadedAt: Date.now(),
      };
    } catch (error) {
      if (debug) console.error("[AssetLoader] Failed to load JSON:", url, error);
      throw error;
    }
  }

  /**
   * Load sprite asset by name (for hero units, UI sprites, etc.)
   * Looks in assets/sprites/{category}/{name}.png
   */
  async loadSprite(
    name: string,
    category = "hero-units",
    options: AssetLoadOptions = {}
  ): Promise<LoadedAsset<HTMLImageElement>> {
    const path = `sprites/${category}/${name}.png`;
    return this.loadImage(path, options);
  }

  /**
   * Load 3D model by name
   * Looks in assets/models/{category}/{name}.glb
   */
  async loadModelByName(
    name: string,
    category = "characters",
    options: AssetLoadOptions = {}
  ): Promise<LoadedAsset<string>> {
    const path = `models/${category}/${name}.glb`;
    return this.loadModel(path, options);
  }

  /**
   * Get sprite URLs for animation sequence
   * Example: getAnimationFrames("archer", "walk", 4) returns URLs for 4 frames
   */
  getAnimationFrames(
    unitName: string,
    animationState: string,
    frameCount = 4
  ): string[] {
    const frames: string[] = [];
    for (let i = 1; i <= frameCount; i++) {
      const path = `sprites/hero-units/${unitName}-${animationState}-${String(
        i
      ).padStart(2, "0")}.png`;
      frames.push(this.buildUrl(path));
    }
    return frames;
  }

  /**
   * Preload assets for faster access later
   */
  async preload(paths: string[], options: AssetLoadOptions = {}): Promise<void> {
    if (this.debug) {
      console.log("[AssetLoader] Preloading", paths.length, "assets");
    }

    const promises = paths.map((path) => {
      if (path.endsWith(".png")) {
        return this.loadImage(path, options).catch((err) => {
          if (this.debug) console.warn("[AssetLoader] Preload failed:", path, err);
        });
      } else if (path.endsWith(".glb") || path.endsWith(".gltf")) {
        return this.loadModel(path, options).catch((err) => {
          if (this.debug) console.warn("[AssetLoader] Preload failed:", path, err);
        });
      } else if (path.endsWith(".json")) {
        return this.loadJSON(path, options).catch((err) => {
          if (this.debug) console.warn("[AssetLoader] Preload failed:", path, err);
        });
      }
      return Promise.resolve();
    });

    await Promise.all(promises);
    if (this.debug) console.log("[AssetLoader] Preload complete");
  }

  /**
   * Clear all cached assets
   */
  clearCache(): void {
    this.cache.clear();
    if (this.debug) console.log("[AssetLoader] Cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; items: string[] } {
    return {
      size: this.cache.size,
      items: Array.from(this.cache.keys()),
    };
  }

  /**
   * Helper: Fetch with timeout
   */
  private fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    return Promise.race([
      fetch(url),
      new Promise<Response>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Fetch timeout: ${url}`)),
          timeout
        )
      ),
    ]);
  }

  /**
   * Helper: Load image element
   */
  private loadImageElement(
    url: string,
    timeout: number
  ): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => {
        reject(new Error(`Image load timeout: ${url}`));
      }, timeout);

      img.onload = () => {
        clearTimeout(timer);
        resolve(img);
      };

      img.onerror = () => {
        clearTimeout(timer);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }
}

// Export singleton instance
export const assetLoader = new AssetLoader();

/**
 * Usage examples:
 *
 * // Initialize once at app startup
 * await assetLoader.init("/assets", true);
 *
 * // Load image
 * const { data: img } = await assetLoader.loadImage("ui/emblem-fabled.png");
 *
 * // Load sprite by name
 * const { data: sprite } = await assetLoader.loadSprite("archer", "hero-units");
 *
 * // Load 3D model
 * const { data: modelUrl } = await assetLoader.loadModelByName("knight", "characters");
 *
 * // Get animation frame URLs
 * const frames = assetLoader.getAnimationFrames("archer", "walk", 4);
 * // Returns: ["/assets/sprites/hero-units/archer-walk-01.png", ...]
 *
 * // Preload assets
 * await assetLoader.preload([
 *   "sprites/hero-units/archer-idle-01.png",
 *   "models/characters/knight.glb"
 * ]);
 *
 * // Check cache
 * const stats = assetLoader.getCacheStats();
 * console.log(`${stats.size} items cached`);
 */
