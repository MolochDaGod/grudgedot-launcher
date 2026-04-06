/**
 * Post-Process Pipeline — Viewport rendering effects for the Grudge Engine editor.
 *
 * Provides a configurable rendering pipeline with:
 *  - Bloom (glow on bright surfaces)
 *  - SSAO (screen-space ambient occlusion for depth)
 *  - Depth of Field
 *  - Tone Mapping
 *  - Vignette
 *  - Chromatic Aberration
 *
 * All effects are lazy-loaded and toggleable at runtime via the editor UI.
 *
 * Usage:
 *   import { createEditorPipeline, type PipelineConfig } from '@/lib/post-process-pipeline';
 *   const pipeline = createEditorPipeline(scene, camera);
 *   pipeline.setBloom(true, 0.5);
 */

import {
  Scene,
  Camera,
  DefaultRenderingPipeline,
  SSAORenderingPipeline,
  SSAO2RenderingPipeline,
  ImageProcessingConfiguration,
} from '@babylonjs/core';

export interface PipelineConfig {
  bloom?: { enabled: boolean; intensity?: number; threshold?: number; scale?: number };
  ssao?: { enabled: boolean; radius?: number; samples?: number; strength?: number };
  dof?: { enabled: boolean; focalLength?: number; fStop?: number; focusDistance?: number };
  toneMapping?: { enabled: boolean; type?: number; exposure?: number; contrast?: number };
  vignette?: { enabled: boolean; weight?: number; stretch?: number };
  chromaticAberration?: { enabled: boolean; amount?: number };
  antialiasing?: { enabled: boolean; samples?: number };
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  bloom: { enabled: true, intensity: 0.3, threshold: 0.8, scale: 0.5 },
  ssao: { enabled: false, radius: 2, samples: 16, strength: 1 },
  dof: { enabled: false, focalLength: 50, fStop: 1.4, focusDistance: 2000 },
  toneMapping: { enabled: true, type: ImageProcessingConfiguration.TONEMAPPING_ACES, exposure: 1, contrast: 1.2 },
  vignette: { enabled: false, weight: 1.5, stretch: 0.5 },
  chromaticAberration: { enabled: false, amount: 30 },
  antialiasing: { enabled: true, samples: 4 },
};

export interface EditorPipeline {
  pipeline: DefaultRenderingPipeline;
  ssaoPipeline: SSAO2RenderingPipeline | SSAORenderingPipeline | null;
  applyConfig(config: Partial<PipelineConfig>): void;
  setBloom(enabled: boolean, intensity?: number): void;
  setSSAO(enabled: boolean, radius?: number): void;
  setDOF(enabled: boolean, focusDistance?: number): void;
  setToneMapping(enabled: boolean, exposure?: number): void;
  setVignette(enabled: boolean): void;
  setChromaticAberration(enabled: boolean): void;
  getConfig(): PipelineConfig;
  dispose(): void;
}

/**
 * Create the editor viewport post-processing pipeline.
 * Attach to the active scene camera.
 */
export function createEditorPipeline(
  scene: Scene,
  camera: Camera,
  config: PipelineConfig = DEFAULT_PIPELINE_CONFIG,
): EditorPipeline {
  const pipeline = new DefaultRenderingPipeline(
    'editorPipeline',
    true, // HDR
    scene,
    [camera],
  );

  // ── Bloom ──
  pipeline.bloomEnabled = config.bloom?.enabled ?? true;
  pipeline.bloomWeight = config.bloom?.intensity ?? 0.3;
  pipeline.bloomThreshold = config.bloom?.threshold ?? 0.8;
  pipeline.bloomScale = config.bloom?.scale ?? 0.5;

  // ── DOF ──
  pipeline.depthOfFieldEnabled = config.dof?.enabled ?? false;
  if (pipeline.depthOfField) {
    pipeline.depthOfField.focalLength = config.dof?.focalLength ?? 50;
    pipeline.depthOfField.fStop = config.dof?.fStop ?? 1.4;
    pipeline.depthOfField.focusDistance = config.dof?.focusDistance ?? 2000;
  }

  // ── Tone Mapping ──
  if (config.toneMapping?.enabled) {
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType =
      config.toneMapping.type ?? ImageProcessingConfiguration.TONEMAPPING_ACES;
    pipeline.imageProcessing.exposure = config.toneMapping.exposure ?? 1;
    pipeline.imageProcessing.contrast = config.toneMapping.contrast ?? 1.2;
  }

  // ── Vignette ──
  if (config.vignette?.enabled) {
    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.vignetteEnabled = true;
    pipeline.imageProcessing.vignetteWeight = config.vignette.weight ?? 1.5;
    pipeline.imageProcessing.vignetteStretch = config.vignette.stretch ?? 0.5;
  }

  // ── Chromatic Aberration ──
  pipeline.chromaticAberrationEnabled = config.chromaticAberration?.enabled ?? false;
  if (pipeline.chromaticAberration) {
    pipeline.chromaticAberration.aberrationAmount = config.chromaticAberration?.amount ?? 30;
  }

  // ── Anti-Aliasing ──
  pipeline.fxaaEnabled = config.antialiasing?.enabled ?? true;
  pipeline.samples = config.antialiasing?.samples ?? 4;

  // ── SSAO (separate pipeline) ──
  let ssaoPipeline: SSAO2RenderingPipeline | SSAORenderingPipeline | null = null;
  if (config.ssao?.enabled) {
    try {
      ssaoPipeline = new SSAO2RenderingPipeline('ssao', scene, {
        ssaoRatio: 0.5,
        blurRatio: 1,
      });
      ssaoPipeline.radius = config.ssao.radius ?? 2;
      ssaoPipeline.totalStrength = config.ssao.strength ?? 1;
      ssaoPipeline.samples = config.ssao.samples ?? 16;
      scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', camera);
    } catch {
      // SSAO2 not supported, try SSAO1 fallback
      ssaoPipeline = new SSAORenderingPipeline('ssao', scene, { ssaoRatio: 0.5, combineRatio: 1 });
      scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', camera);
    }
  }

  // ── Current config state ──
  let currentConfig: PipelineConfig = { ...config };

  const api: EditorPipeline = {
    pipeline,
    ssaoPipeline,

    applyConfig(updates: Partial<PipelineConfig>) {
      currentConfig = { ...currentConfig, ...updates };
      if (updates.bloom) api.setBloom(updates.bloom.enabled, updates.bloom.intensity);
      if (updates.dof) api.setDOF(updates.dof.enabled, updates.dof.focusDistance);
      if (updates.toneMapping) api.setToneMapping(updates.toneMapping.enabled, updates.toneMapping.exposure);
      if (updates.vignette) api.setVignette(updates.vignette.enabled);
      if (updates.chromaticAberration) api.setChromaticAberration(updates.chromaticAberration.enabled);
    },

    setBloom(enabled, intensity) {
      pipeline.bloomEnabled = enabled;
      if (intensity !== undefined) pipeline.bloomWeight = intensity;
    },

    setSSAO(enabled, radius) {
      if (enabled && !ssaoPipeline) {
        try {
          ssaoPipeline = new SSAO2RenderingPipeline('ssao', scene, { ssaoRatio: 0.5, blurRatio: 1 });
          if (radius) ssaoPipeline.radius = radius;
          scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline('ssao', camera);
          api.ssaoPipeline = ssaoPipeline;
        } catch { /* not supported */ }
      } else if (!enabled && ssaoPipeline) {
        scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline('ssao', camera);
        ssaoPipeline.dispose();
        ssaoPipeline = null;
        api.ssaoPipeline = null;
      }
    },

    setDOF(enabled, focusDistance) {
      pipeline.depthOfFieldEnabled = enabled;
      if (focusDistance !== undefined && pipeline.depthOfField) {
        pipeline.depthOfField.focusDistance = focusDistance;
      }
    },

    setToneMapping(enabled, exposure) {
      pipeline.imageProcessingEnabled = enabled;
      pipeline.imageProcessing.toneMappingEnabled = enabled;
      if (exposure !== undefined) pipeline.imageProcessing.exposure = exposure;
    },

    setVignette(enabled) {
      pipeline.imageProcessingEnabled = true;
      pipeline.imageProcessing.vignetteEnabled = enabled;
    },

    setChromaticAberration(enabled) {
      pipeline.chromaticAberrationEnabled = enabled;
    },

    getConfig() {
      return { ...currentConfig };
    },

    dispose() {
      pipeline.dispose();
      if (ssaoPipeline) {
        ssaoPipeline.dispose();
      }
    },
  };

  return api;
}
