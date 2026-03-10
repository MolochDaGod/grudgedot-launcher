/**
 * Asset Tagger Worker
 *
 * Background worker that enhances model registry entries with:
 * - Richer tags from GLTF metadata (mesh names, material names, animation names)
 * - AI-generated descriptions via xAI/Grok
 * - Subcategory confidence scoring
 * - Related model suggestions
 *
 * Uses a simple in-memory job queue with SSE for progress notifications.
 */

import { EventEmitter } from "events";
import type { ModelRegistryEntry } from "../scripts/scan-models";

// ── Types ──────────────────────────────────────────────────────────

export interface TaggingJob {
  id: string;
  grudgeId: string;
  status: "queued" | "processing" | "complete" | "error";
  model: ModelRegistryEntry;
  result?: TaggingResult;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaggingResult {
  enhancedTags: string[];
  aiDescription?: string;
  subcategoryConfidence: number;
  suggestedSubcategory: string;
  relatedModels: string[];  // grudgeIds of related models
  enrichedMetadata: Record<string, any>;
}

// ── Enhanced tagging logic ─────────────────────────────────────────

const MESH_NAME_TAGS: Record<string, string[]> = {
  armor: ["armor", "armored", "combat", "defense"],
  sword: ["sword", "weapon", "blade", "melee"],
  bow: ["bow", "ranged", "weapon", "archery"],
  shield: ["shield", "defense", "blocking", "tank"],
  staff: ["staff", "magic", "mage", "caster"],
  helm: ["helmet", "head", "armor", "headgear"],
  cape: ["cape", "cloak", "accessory", "cloth"],
  hair: ["hair", "head", "character", "customizable"],
  eye: ["face", "head", "character", "expression"],
  hand: ["hand", "arm", "body", "character"],
  foot: ["foot", "leg", "body", "character"],
  body: ["body", "torso", "character", "humanoid"],
  wing: ["wing", "flying", "creature", "fantasy"],
  tail: ["tail", "creature", "animal", "fantasy"],
  wheel: ["wheel", "vehicle", "mechanical"],
  sail: ["sail", "ship", "vehicle", "nautical"],
  mast: ["mast", "ship", "vehicle", "nautical"],
  hull: ["hull", "ship", "vehicle", "nautical"],
  door: ["door", "building", "architecture", "entrance"],
  roof: ["roof", "building", "architecture", "structure"],
  wall: ["wall", "building", "architecture", "structure"],
  window: ["window", "building", "architecture", "glass"],
  tree: ["tree", "nature", "vegetation", "environment"],
  rock: ["rock", "nature", "terrain", "environment"],
  water: ["water", "nature", "liquid", "environment"],
};

function extractTagsFromMeshNames(metadata: ModelRegistryEntry["metadata"]): string[] {
  const tags = new Set<string>();

  // We don't have individual mesh names in the current metadata structure,
  // but we can infer from scene name and animation names
  const sceneName = metadata.sceneName?.toLowerCase() || "";
  const animNames = (metadata.animationNames || []).map((n) => n.toLowerCase());

  const allNames = [sceneName, ...animNames].join(" ");

  for (const [keyword, keywordTags] of Object.entries(MESH_NAME_TAGS)) {
    if (allNames.includes(keyword)) {
      keywordTags.forEach((t) => tags.add(t));
    }
  }

  // Animation-based tags
  if (animNames.some((n) => n.includes("walk") || n.includes("run"))) {
    tags.add("animated");
    tags.add("locomotion");
  }
  if (animNames.some((n) => n.includes("attack") || n.includes("slash"))) {
    tags.add("combat");
    tags.add("animated");
  }
  if (animNames.some((n) => n.includes("idle"))) {
    tags.add("animated");
    tags.add("idle");
  }
  if (animNames.some((n) => n.includes("death") || n.includes("die"))) {
    tags.add("animated");
    tags.add("death");
  }
  if (animNames.some((n) => n.includes("cast") || n.includes("spell"))) {
    tags.add("magic");
    tags.add("caster");
  }

  // Mesh count-based tags
  if (metadata.meshCount && metadata.meshCount > 20) {
    tags.add("detailed");
    tags.add("high-poly");
  } else if (metadata.meshCount && metadata.meshCount <= 5) {
    tags.add("simple");
    tags.add("low-poly");
  }

  // Texture tags
  if (metadata.hasTextures) {
    tags.add("textured");
  }

  return Array.from(tags);
}

// ── Subcategory confidence ─────────────────────────────────────────

const SUBCATEGORY_SIGNALS: Record<string, { keywords: string[]; weight: number }[]> = {
  characters: [
    { keywords: ["walk", "run", "idle", "attack"], weight: 0.3 },
    { keywords: ["body", "arm", "leg", "head", "hand"], weight: 0.2 },
    { keywords: ["character", "player", "npc", "hero"], weight: 0.5 },
  ],
  buildings: [
    { keywords: ["wall", "roof", "door", "window", "floor"], weight: 0.3 },
    { keywords: ["house", "castle", "tower", "building"], weight: 0.5 },
    { keywords: ["structure", "architecture"], weight: 0.2 },
  ],
  vehicles: [
    { keywords: ["wheel", "hull", "sail", "mast"], weight: 0.3 },
    { keywords: ["ship", "boat", "car", "vehicle"], weight: 0.5 },
    { keywords: ["transport", "ride", "mount"], weight: 0.2 },
  ],
  weapons: [
    { keywords: ["blade", "handle", "guard", "pommel"], weight: 0.3 },
    { keywords: ["sword", "axe", "bow", "gun", "weapon"], weight: 0.5 },
    { keywords: ["combat", "damage", "attack"], weight: 0.2 },
  ],
  nature: [
    { keywords: ["leaf", "branch", "trunk", "petal"], weight: 0.3 },
    { keywords: ["tree", "rock", "bush", "flower"], weight: 0.5 },
    { keywords: ["environment", "terrain", "landscape"], weight: 0.2 },
  ],
};

function calculateSubcategoryConfidence(
  model: ModelRegistryEntry
): { subcategory: string; confidence: number } {
  const allText = [
    model.name,
    model.filename,
    ...(model.tags || []),
    model.metadata.sceneName || "",
    ...(model.metadata.animationNames || []),
  ]
    .join(" ")
    .toLowerCase();

  let bestCategory = model.subcategory;
  let bestScore = 0;

  for (const [category, signals] of Object.entries(SUBCATEGORY_SIGNALS)) {
    let score = 0;
    for (const signal of signals) {
      const matches = signal.keywords.filter((kw) => allText.includes(kw)).length;
      score += (matches / signal.keywords.length) * signal.weight;
    }
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return { subcategory: bestCategory, confidence: Math.min(bestScore, 1) };
}

// ── Related model finder ───────────────────────────────────────────

function findRelatedModels(
  model: ModelRegistryEntry,
  allModels: ModelRegistryEntry[],
  maxResults = 5
): string[] {
  const modelTags = new Set(model.tags);

  const scored = allModels
    .filter((m) => m.grudgeId !== model.grudgeId)
    .map((m) => {
      let score = 0;
      // Tag overlap
      const overlap = m.tags.filter((t) => modelTags.has(t)).length;
      score += overlap * 2;
      // Same subcategory bonus
      if (m.subcategory === model.subcategory) score += 3;
      // Same format bonus
      if (m.format === model.format) score += 1;
      return { grudgeId: m.grudgeId, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored.map((s) => s.grudgeId);
}

// ── AI Description Generator ───────────────────────────────────────

async function generateAiDescription(model: ModelRegistryEntry): Promise<string | undefined> {
  // Only generate if xAI API key is available
  if (!process.env.XAI_API_KEY) return undefined;

  try {
    const OpenAI = (await import("openai")).default;
    const xai = new OpenAI({
      baseURL: "https://api.x.ai/v1",
      apiKey: process.env.XAI_API_KEY,
    });

    const prompt = `Describe this 3D model asset for a game asset library in 1-2 sentences.
Model name: ${model.name}
Format: ${model.format}
Category: ${model.subcategory}
Tags: ${model.tags.slice(0, 10).join(", ")}
Meshes: ${model.metadata.meshCount || "unknown"}
Animations: ${model.metadata.animationNames?.join(", ") || "none"}
Scene: ${model.metadata.sceneName || "unnamed"}

Write a concise, useful description for game developers browsing an asset library.`;

    const response = await xai.chat.completions.create({
      model: "grok-2-1212",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || undefined;
  } catch (err) {
    // Silently fail — AI description is optional
    return undefined;
  }
}

// ── Job Queue ──────────────────────────────────────────────────────

class AssetTaggerQueue extends EventEmitter {
  private queue: TaggingJob[] = [];
  private processing = false;
  private allModels: ModelRegistryEntry[] = [];

  /** Set the full model list for related-model lookup */
  setModelList(models: ModelRegistryEntry[]) {
    this.allModels = models;
  }

  /** Add a model to the tagging queue */
  enqueue(model: ModelRegistryEntry): TaggingJob {
    const job: TaggingJob = {
      id: `tag-${Date.now()}-${model.grudgeId.slice(0, 8)}`,
      grudgeId: model.grudgeId,
      status: "queued",
      model,
    };
    this.queue.push(job);
    this.emit("job:queued", job);
    this.processNext();
    return job;
  }

  /** Enqueue all models in the registry */
  enqueueAll(models: ModelRegistryEntry[]): TaggingJob[] {
    this.setModelList(models);
    return models.map((m) => this.enqueue(m));
  }

  /** Get queue status */
  getStatus() {
    return {
      total: this.queue.length,
      queued: this.queue.filter((j) => j.status === "queued").length,
      processing: this.queue.filter((j) => j.status === "processing").length,
      complete: this.queue.filter((j) => j.status === "complete").length,
      errors: this.queue.filter((j) => j.status === "error").length,
    };
  }

  /** Get results for completed jobs */
  getResults(): TaggingJob[] {
    return this.queue.filter((j) => j.status === "complete");
  }

  private async processNext() {
    if (this.processing) return;
    const job = this.queue.find((j) => j.status === "queued");
    if (!job) return;

    this.processing = true;
    job.status = "processing";
    job.startedAt = new Date().toISOString();
    this.emit("job:processing", job);

    try {
      // Extract enhanced tags from metadata
      const metadataTags = extractTagsFromMeshNames(job.model.metadata);

      // Calculate subcategory confidence
      const { subcategory, confidence } = calculateSubcategoryConfidence(job.model);

      // Find related models
      const relatedModels = findRelatedModels(job.model, this.allModels);

      // Generate AI description (optional, async)
      const aiDescription = await generateAiDescription(job.model);

      // Merge tags (existing + enhanced, deduplicated)
      const enhancedTags = Array.from(
        new Set([...job.model.tags, ...metadataTags])
      );

      job.result = {
        enhancedTags,
        aiDescription,
        subcategoryConfidence: confidence,
        suggestedSubcategory: subcategory,
        relatedModels,
        enrichedMetadata: {
          meshCount: job.model.metadata.meshCount,
          materialCount: job.model.metadata.materialCount,
          animationCount: job.model.metadata.animationCount,
          animationNames: job.model.metadata.animationNames,
          hasTextures: job.model.metadata.hasTextures,
        },
      };

      job.status = "complete";
      job.completedAt = new Date().toISOString();
      this.emit("job:complete", job);
    } catch (err: any) {
      job.status = "error";
      job.error = err.message;
      job.completedAt = new Date().toISOString();
      this.emit("job:error", job);
    }

    this.processing = false;
    // Process next in queue
    setTimeout(() => this.processNext(), 50);
  }
}

// ── Singleton ──────────────────────────────────────────────────────

export const assetTagger = new AssetTaggerQueue();

// ── Express route handler for SSE ──────────────────────────────────

export function registerAssetTaggerRoutes(app: any) {
  /**
   * POST /api/tagger/start
   * Start tagging all models in the registry
   */
  app.post("/api/tagger/start", async (req: any, res: any) => {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      const registryPath = path.join(process.cwd(), "model-registry.json");
      const raw = await fs.readFile(registryPath, "utf8");
      const registry = JSON.parse(raw);

      const jobs = assetTagger.enqueueAll(registry.models);
      res.json({
        success: true,
        jobCount: jobs.length,
        status: assetTagger.getStatus(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  /**
   * GET /api/tagger/status
   * Get current queue status
   */
  app.get("/api/tagger/status", (_req: any, res: any) => {
    res.json(assetTagger.getStatus());
  });

  /**
   * GET /api/tagger/results
   * Get completed tagging results
   */
  app.get("/api/tagger/results", (_req: any, res: any) => {
    const results = assetTagger.getResults();
    res.json({
      count: results.length,
      results: results.map((j) => ({
        grudgeId: j.grudgeId,
        ...j.result,
      })),
    });
  });

  /**
   * GET /api/tagger/events
   * SSE stream of tagging progress
   */
  app.get("/api/tagger/events", (req: any, res: any) => {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    const onQueued = (job: TaggingJob) =>
      sendEvent("queued", { id: job.id, grudgeId: job.grudgeId });
    const onProcessing = (job: TaggingJob) =>
      sendEvent("processing", { id: job.id, grudgeId: job.grudgeId });
    const onComplete = (job: TaggingJob) =>
      sendEvent("complete", {
        id: job.id,
        grudgeId: job.grudgeId,
        result: job.result,
      });
    const onError = (job: TaggingJob) =>
      sendEvent("error", { id: job.id, grudgeId: job.grudgeId, error: job.error });

    assetTagger.on("job:queued", onQueued);
    assetTagger.on("job:processing", onProcessing);
    assetTagger.on("job:complete", onComplete);
    assetTagger.on("job:error", onError);

    // Send initial status
    sendEvent("status", assetTagger.getStatus());

    req.on("close", () => {
      assetTagger.off("job:queued", onQueued);
      assetTagger.off("job:processing", onProcessing);
      assetTagger.off("job:complete", onComplete);
      assetTagger.off("job:error", onError);
    });
  });
}
