/**
 * Spector.js Debug Integration — WebGL frame debugger for the Grudge Engine editor.
 *
 * Provides a toggle to capture and inspect individual WebGL frames,
 * showing draw calls, state changes, shader programs, and textures.
 *
 * Usage:
 *   import { initSpector, captureFrame, toggleSpectorUI } from '@/lib/spector-debug';
 *   initSpector(canvas);          // attach to the engine canvas
 *   captureFrame();               // capture the next rendered frame
 *   toggleSpectorUI();            // show/hide the built-in Spector UI
 */

let spectorInstance: any = null;
let isUIVisible = false;

/**
 * Lazy-load and initialize Spector.js on the given canvas.
 * Call once after the BabylonJS engine is created.
 */
export async function initSpector(canvas: HTMLCanvasElement): Promise<void> {
  if (spectorInstance) return;

  try {
    const { Spector } = await import('spectorjs');
    spectorInstance = new Spector();
    spectorInstance.displayUI();
    spectorInstance.spyCanvas(canvas);
    // Hide UI by default — user toggles it
    spectorInstance.hideUI();
    isUIVisible = false;
    console.log('[Spector.js] Initialized on canvas');
  } catch (err) {
    console.warn('[Spector.js] Failed to initialize:', err);
  }
}

/**
 * Capture the next WebGL frame and open the Spector inspector.
 */
export function captureFrame(): void {
  if (!spectorInstance) {
    console.warn('[Spector.js] Not initialized — call initSpector(canvas) first');
    return;
  }
  spectorInstance.captureNextFrame();
}

/**
 * Toggle the Spector.js built-in overlay UI.
 */
export function toggleSpectorUI(): boolean {
  if (!spectorInstance) return false;

  if (isUIVisible) {
    spectorInstance.hideUI();
    isUIVisible = false;
  } else {
    spectorInstance.displayUI();
    isUIVisible = true;
  }
  return isUIVisible;
}

/**
 * Check if Spector is initialized and ready.
 */
export function isSpectorReady(): boolean {
  return !!spectorInstance;
}

/**
 * Dispose Spector.js instance.
 */
export function disposeSpector(): void {
  if (spectorInstance) {
    try { spectorInstance.hideUI(); } catch {}
    spectorInstance = null;
    isUIVisible = false;
  }
}
