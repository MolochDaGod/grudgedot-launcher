/**
 * Model Registry API Routes
 *
 * Serves the scanned model registry via REST API endpoints.
 * Models are indexed by Grudge UUID and can be filtered, searched,
 * and streamed to editors/game clients.
 */

import type { Express } from "express";
import fs from "fs/promises";
import { existsSync, createReadStream, statSync } from "fs";
import path from "path";
import type { ModelRegistry, ModelRegistryEntry } from "../scripts/scan-models";

// Registry is loaded from model-registry.json at startup
let registry: ModelRegistry | null = null;
let modelIndex: Map<string, ModelRegistryEntry> = new Map();

const REGISTRY_PATH = path.join(process.cwd(), "model-registry.json");

async function loadRegistry(): Promise<ModelRegistry | null> {
  try {
    if (!existsSync(REGISTRY_PATH)) {
      console.log("[models] No model-registry.json found. Run: npx tsx server/scripts/scan-models.ts");
      return null;
    }
    const raw = await fs.readFile(REGISTRY_PATH, "utf8");
    const data: ModelRegistry = JSON.parse(raw);

    // Build lookup index
    modelIndex.clear();
    for (const model of data.models) {
      modelIndex.set(model.grudgeId, model);
    }

    console.log(`[models] Loaded ${data.models.length} models from registry`);
    return data;
  } catch (err: any) {
    console.error("[models] Failed to load registry:", err.message);
    return null;
  }
}

// Content type mapping for model files
const MODEL_CONTENT_TYPES: Record<string, string> = {
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
  fbx: "application/octet-stream",
  obj: "model/obj",
};

export function registerModelRoutes(app: Express) {
  // Load registry on startup
  loadRegistry().then((r) => {
    registry = r;
  });

  /**
   * GET /api/models
   * List all models with optional filtering
   * Query params: category, subcategory, format, tag, search, limit, offset, threeJsOnly
   */
  app.get("/api/models", async (req, res) => {
    if (!registry) {
      registry = await loadRegistry();
      if (!registry) {
        return res.status(503).json({
          error: "Model registry not available",
          hint: "Run: npx tsx server/scripts/scan-models.ts",
        });
      }
    }

    let models = [...registry.models];

    // Filters
    const { category, subcategory, format, tag, search, threeJsOnly, limit, offset } = req.query;

    if (subcategory && typeof subcategory === "string") {
      models = models.filter((m) => m.subcategory === subcategory);
    }

    if (format && typeof format === "string") {
      models = models.filter((m) => m.format === format.replace(".", ""));
    }

    if (tag && typeof tag === "string") {
      const tagLower = tag.toLowerCase();
      models = models.filter((m) => m.tags.some((t) => t.toLowerCase().includes(tagLower)));
    }

    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      models = models.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.filename.toLowerCase().includes(q) ||
          m.subcategory.includes(q) ||
          m.tags.some((t) => t.includes(q))
      );
    }

    if (threeJsOnly === "true") {
      models = models.filter((m) => m.threeJsCompatible);
    }

    // Pagination
    const offsetNum = Math.max(0, parseInt(String(offset)) || 0);
    const limitNum = Math.min(Math.max(1, parseInt(String(limit)) || 50), 200);
    const total = models.length;
    models = models.slice(offsetNum, offsetNum + limitNum);

    res.json({
      total,
      offset: offsetNum,
      limit: limitNum,
      filters: { category, subcategory, format, tag, search, threeJsOnly },
      formatCounts: registry.formatCounts,
      categoryCounts: registry.categoryCounts,
      models: models.map((m) => ({
        grudgeId: m.grudgeId,
        name: m.name,
        filename: m.filename,
        format: m.format,
        fileSize: m.fileSize,
        subcategory: m.subcategory,
        tags: m.tags,
        threeJsCompatible: m.threeJsCompatible,
        metadata: m.metadata,
        fileUrl: `/api/models/${m.grudgeId}/file`,
        metadataUrl: `/api/models/${m.grudgeId}/metadata`,
      })),
    });
  });

  /**
   * GET /api/models/stats
   * Summary stats about the registry
   */
  app.get("/api/models/stats", async (_req, res) => {
    if (!registry) {
      registry = await loadRegistry();
    }
    if (!registry) {
      return res.status(503).json({ error: "Registry not loaded" });
    }

    const animated = registry.models.filter(
      (m) => m.metadata.animationCount && m.metadata.animationCount > 0
    );
    const threeJsReady = registry.models.filter((m) => m.threeJsCompatible);

    res.json({
      totalModels: registry.totalModels,
      totalSizeMB: +(registry.totalSizeBytes / 1024 / 1024).toFixed(1),
      generatedAt: registry.generatedAt,
      scanDirectory: registry.scanDirectory,
      formatCounts: registry.formatCounts,
      categoryCounts: registry.categoryCounts,
      animatedModels: animated.length,
      threeJsReady: threeJsReady.length,
      needsConversion: registry.totalModels - threeJsReady.length,
    });
  });

  /**
   * GET /api/models/search?q=knight&format=glb
   * Full-text search with format filter
   */
  app.get("/api/models/search", async (req, res) => {
    if (!registry) {
      registry = await loadRegistry();
    }
    if (!registry) {
      return res.status(503).json({ error: "Registry not loaded" });
    }

    const { q, format, limit } = req.query;
    if (!q || typeof q !== "string") {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const query = q.toLowerCase();
    const limitNum = Math.min(parseInt(String(limit)) || 20, 100);

    let results = registry.models.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.filename.toLowerCase().includes(query) ||
        m.subcategory.includes(query) ||
        m.tags.some((t) => t.includes(query)) ||
        m.metadata.sceneName?.toLowerCase().includes(query) ||
        m.metadata.animationNames?.some((a) => a.toLowerCase().includes(query))
    );

    if (format && typeof format === "string") {
      const fmt = format.replace(".", "").toLowerCase();
      results = results.filter((m) => m.format === fmt);
    }

    results = results.slice(0, limitNum);

    res.json({
      query: q,
      count: results.length,
      results: results.map((m) => ({
        grudgeId: m.grudgeId,
        name: m.name,
        filename: m.filename,
        format: m.format,
        fileSize: m.fileSize,
        subcategory: m.subcategory,
        tags: m.tags,
        threeJsCompatible: m.threeJsCompatible,
        metadata: m.metadata,
        fileUrl: `/api/models/${m.grudgeId}/file`,
      })),
    });
  });

  /**
   * GET /api/models/:grudgeId
   * Get full model entry by Grudge UUID
   */
  app.get("/api/models/:grudgeId", async (req, res) => {
    if (!registry) {
      registry = await loadRegistry();
    }

    const model = modelIndex.get(req.params.grudgeId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    res.json({
      ...model,
      fileUrl: `/api/models/${model.grudgeId}/file`,
      metadataUrl: `/api/models/${model.grudgeId}/metadata`,
    });
  });

  /**
   * GET /api/models/:grudgeId/file
   * Stream the actual model file for use in Three.js / editors
   */
  app.get("/api/models/:grudgeId/file", async (req, res) => {
    if (!registry) {
      registry = await loadRegistry();
    }

    const model = modelIndex.get(req.params.grudgeId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    const filePath = model.filePath;
    if (!existsSync(filePath)) {
      return res.status(404).json({
        error: "Model file not found on disk",
        path: filePath,
      });
    }

    try {
      const stat = statSync(filePath);
      const contentType = MODEL_CONTENT_TYPES[model.format] || "application/octet-stream";

      res.set({
        "Content-Type": contentType,
        "Content-Length": String(stat.size),
        "Content-Disposition": `inline; filename="${model.filename}"`,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      });

      const stream = createReadStream(filePath);
      stream.pipe(res);
      stream.on("error", (err) => {
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/models/:grudgeId/metadata
   * Get GLTF scene metadata (meshes, materials, animations)
   */
  app.get("/api/models/:grudgeId/metadata", async (req, res) => {
    if (!registry) {
      registry = await loadRegistry();
    }

    const model = modelIndex.get(req.params.grudgeId);
    if (!model) {
      return res.status(404).json({ error: "Model not found" });
    }

    res.json({
      grudgeId: model.grudgeId,
      name: model.name,
      format: model.format,
      fileSize: model.fileSize,
      threeJsCompatible: model.threeJsCompatible,
      ...model.metadata,
    });
  });

  /**
   * POST /api/models/reload
   * Reload the registry from disk (after re-scanning)
   */
  app.post("/api/models/reload", async (_req, res) => {
    registry = await loadRegistry();
    if (!registry) {
      return res.status(503).json({ error: "Failed to reload registry" });
    }
    res.json({
      success: true,
      totalModels: registry.totalModels,
      generatedAt: registry.generatedAt,
    });
  });

  /**
   * POST /api/models/ingest
   * Trigger a scan of a directory (runs scan-models inline)
   */
  app.post("/api/models/ingest", async (req, res) => {
    const { directory } = req.body;
    const scanDir = directory || "D:/Games/Models";

    if (!existsSync(scanDir)) {
      return res.status(400).json({ error: `Directory not found: ${scanDir}` });
    }

    try {
      // Dynamic import to avoid bundling the scanner
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const cmd = `npx tsx server/scripts/scan-models.ts --dir "${scanDir}" --output "${REGISTRY_PATH}"`;
      const { stdout, stderr } = await execAsync(cmd, {
        cwd: process.cwd(),
        timeout: 120000,
      });

      // Reload registry
      registry = await loadRegistry();

      res.json({
        success: true,
        totalModels: registry?.totalModels || 0,
        output: stdout.slice(-500),
      });
    } catch (err: any) {
      res.status(500).json({ error: "Ingestion failed", details: err.message });
    }
  });

  /**
   * GET /api/models/categories
   * List all available categories with counts
   */
  app.get("/api/models/categories", async (_req, res) => {
    if (!registry) {
      registry = await loadRegistry();
    }
    if (!registry) {
      return res.status(503).json({ error: "Registry not loaded" });
    }

    // Build tag frequency map
    const tagCounts: Record<string, number> = {};
    for (const model of registry.models) {
      for (const tag of model.tags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      }
    }

    res.json({
      subcategories: registry.categoryCounts,
      formats: registry.formatCounts,
      topTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([tag, count]) => ({ tag, count })),
    });
  });
}
