/**
 * ObjectStore Types — Shared between Grudge Engine Web editor and GDevelop Assistant.
 * 
 * These types define the bridge format for:
 * 1. ObjectStore R2 model references used in engine scenes
 * 2. Scene export format that GDevelop can consume for deployment
 * 3. Engine connection config for embedding/linking the editor
 */

import { z } from "zod";
import { vector3Schema, transformSchema, componentSchema } from "./engine-schema";

// ─── ObjectStore Model Reference ───
// Used when a scene object references a model from ObjectStore R2

export const objectStoreModelRefSchema = z.object({
  /** R2 asset key (e.g. "models/characters/warrior.glb") */
  key: z.string(),
  /** Display name */
  name: z.string(),
  /** Model format */
  format: z.enum(["GLB", "GLTF", "FBX", "OBJ", "BLEND"]),
  /** Source: R2 storage or static GitHub Pages */
  source: z.enum(["r2", "static"]),
  /** Category for organization */
  category: z.string().default("uncategorized"),
  /** Direct R2 download URL */
  r2Url: z.string().optional(),
  /** File size in KB */
  sizeKB: z.number().default(0),
  /** Whether this was converted from another format */
  convertedFrom: z.string().optional(),
});

export type ObjectStoreModelRef = z.infer<typeof objectStoreModelRefSchema>;

// ─── Scene Export Format ───
// The format the Grudge Engine editor exports for GDevelop to consume

export const sceneObjectExportSchema = z.object({
  id: z.string(),
  name: z.string(),
  transform: transformSchema,
  components: z.array(componentSchema),
  tags: z.array(z.string()).default([]),
  /** If this object uses an ObjectStore model */
  objectStoreRef: objectStoreModelRefSchema.optional(),
  /** Static flag for optimization */
  isStatic: z.boolean().default(false),
  /** Visibility */
  visible: z.boolean().default(true),
  /** Child object IDs */
  children: z.array(z.string()).default([]),
  /** Parent object ID */
  parentId: z.string().nullable().default(null),
});

export type SceneObjectExport = z.infer<typeof sceneObjectExportSchema>;

export const sceneExportSchema = z.object({
  /** Unique scene ID */
  id: z.string(),
  /** Scene display name */
  name: z.string(),
  /** All objects in the scene */
  objects: z.array(sceneObjectExportSchema),
  /** Scene environment settings */
  settings: z.object({
    ambientColor: z.string().default("#1a1a2e"),
    fogEnabled: z.boolean().default(false),
    fogColor: z.string().default("#888888"),
    fogDensity: z.number().default(0.01),
    gravity: vector3Schema.default({ x: 0, y: -9.81, z: 0 }),
    skybox: z.string().optional(),
  }),
  /** ObjectStore models referenced by this scene (for preloading) */
  objectStoreModels: z.array(objectStoreModelRefSchema).default([]),
  /** Export metadata */
  exportedAt: z.string(),
  /** Engine version that exported this scene */
  engineVersion: z.string().default("1.0.0"),
});

export type SceneExport = z.infer<typeof sceneExportSchema>;

// ─── Engine Connection Config ───
// Configuration for GDevelop to connect to / embed the Grudge Engine editor

export const engineConnectionSchema = z.object({
  /** Grudge Engine Web editor URL */
  editorUrl: z.string().default("https://grudge-engine-web.vercel.app"),
  /** ObjectStore R2 worker URL */
  objectStoreUrl: z.string().default("https://objectstore.grudge-studio.com"),
  /** Grudge backend URL */
  backendUrl: z.string().default("https://api.grudge-studio.com"),
  /** Whether the engine editor is available */
  available: z.boolean().default(false),
});

export type EngineConnection = z.infer<typeof engineConnectionSchema>;

// ─── API Types ───
// Request/response types for the /api/engine/scenes endpoint

export const saveSceneRequestSchema = z.object({
  /** Project ID in GDevelop */
  projectId: z.string(),
  /** Scene data exported from the engine */
  scene: sceneExportSchema,
});

export type SaveSceneRequest = z.infer<typeof saveSceneRequestSchema>;

export const loadSceneResponseSchema = z.object({
  scene: sceneExportSchema,
  /** When the scene was last saved */
  savedAt: z.string(),
});

export type LoadSceneResponse = z.infer<typeof loadSceneResponseSchema>;
