/**
 * Scene Serializer — Export scenes from the Grudge Engine editor.
 *
 * Uses @babylonjs/serializers for GLTF/GLB export and
 * @babylonjs/core SceneSerializer for native .babylon format.
 *
 * Usage:
 *   import { exportSceneAsGLB, exportSceneAsGLTF, exportSceneAsBabylon } from '@/lib/scene-serializer';
 *   await exportSceneAsGLB(scene, 'my-level');
 */

import type { Scene, AbstractMesh } from '@babylonjs/core';

// Lazy-load serializers to avoid bloating initial bundle
async function getGLTF2Export() {
  const mod = await import('@babylonjs/serializers/glTF/2.0');
  return mod.GLTF2Export;
}

/**
 * Export entire scene as .glb (binary GLTF).
 * Triggers a browser download.
 */
export async function exportSceneAsGLB(
  scene: Scene,
  filename = 'scene',
  options?: { shouldExportNode?: (node: any) => boolean },
): Promise<Blob> {
  const GLTF2Export = await getGLTF2Export();
  const result = await GLTF2Export.GLBAsync(scene, filename, {
    shouldExportNode: options?.shouldExportNode,
  });

  // Trigger download
  const blob = result.glTFFiles[`${filename}.glb`] as Blob;
  downloadBlob(blob, `${filename}.glb`);
  return blob;
}

/**
 * Export entire scene as .gltf (JSON + separate .bin).
 * Triggers a download of a zip or individual files.
 */
export async function exportSceneAsGLTF(
  scene: Scene,
  filename = 'scene',
  options?: { shouldExportNode?: (node: any) => boolean },
): Promise<Record<string, Blob>> {
  const GLTF2Export = await getGLTF2Export();
  const result = await GLTF2Export.GLTFAsync(scene, filename, {
    shouldExportNode: options?.shouldExportNode,
  });
  return result.glTFFiles as Record<string, Blob>;
}

/**
 * Export specific meshes as .glb.
 */
export async function exportMeshesAsGLB(
  scene: Scene,
  meshes: AbstractMesh[],
  filename = 'mesh-export',
): Promise<Blob> {
  return exportSceneAsGLB(scene, filename, {
    shouldExportNode: (node) => meshes.includes(node),
  });
}

/**
 * Export scene in native .babylon JSON format.
 * Preserves all BabylonJS-specific features (actions, physics bodies, etc.)
 */
export function exportSceneAsBabylon(scene: Scene, filename = 'scene'): string {
  const { SceneSerializer } = require('@babylonjs/core');
  const json = SceneSerializer.Serialize(scene);
  const str = JSON.stringify(json, null, 2);
  downloadBlob(new Blob([str], { type: 'application/json' }), `${filename}.babylon`);
  return str;
}

/**
 * Get scene as a serializable JSON object (for saving to backend / object storage).
 */
export function serializeSceneToJSON(scene: Scene): Record<string, unknown> {
  const { SceneSerializer } = require('@babylonjs/core');
  return SceneSerializer.Serialize(scene);
}

// ── Helpers ──

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
