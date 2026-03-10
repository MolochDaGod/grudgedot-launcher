#!/usr/bin/env tsx
/**
 * scan-models.ts — Local 3D Model Scanner & Registry Builder
 *
 * Scans a directory for 3D model files (.glb, .gltf, .fbx, .obj),
 * extracts metadata, auto-tags, generates Grudge UUIDs, and outputs
 * a model-registry.json manifest for the asset API.
 *
 * Usage:
 *   npx tsx server/scripts/scan-models.ts --dir "D:/Games/Models" --output model-registry.json
 *   npx tsx server/scripts/scan-models.ts  (uses defaults)
 */

import fs from "fs/promises";
import path from "path";
import { createHash, randomUUID } from "crypto";
import { existsSync, createReadStream } from "fs";

// ── Types ──────────────────────────────────────────────────────────
export interface ModelRegistryEntry {
  grudgeId: string;
  filename: string;
  name: string;
  filePath: string;
  relativePath: string;
  format: string;
  fileSize: number;
  contentHash: string;
  category: string;
  subcategory: string;
  tags: string[];
  assetType: "model";
  threeJsCompatible: boolean;
  metadata: {
    meshCount?: number;
    materialCount?: number;
    animationCount?: number;
    animationNames?: string[];
    sceneName?: string;
    hasTextures?: boolean;
    boundingBox?: { min: number[]; max: number[] };
  };
  source: string;
  license: string;
  scannedAt: string;
}

export interface ModelRegistry {
  version: string;
  generatedAt: string;
  scanDirectory: string;
  totalModels: number;
  totalSizeBytes: number;
  formatCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  models: ModelRegistryEntry[];
}

// ── Config ─────────────────────────────────────────────────────────
const MODEL_EXTENSIONS = new Set([".glb", ".gltf", ".fbx", ".obj"]);
const ARCHIVE_EXTENSIONS = new Set([".zip"]);
const THREEJS_NATIVE = new Set([".glb", ".gltf"]);

const DEFAULT_SCAN_DIR = "D:/Games/Models";
const DEFAULT_OUTPUT = "model-registry.json";

// ── Filename-based classification ──────────────────────────────────
const SUBCATEGORY_PATTERNS: Record<string, RegExp[]> = {
  characters: [
    /character/i, /player/i, /npc/i, /hero/i, /villain/i, /warrior/i,
    /knight/i, /wizard/i, /archer/i, /mage/i, /rogue/i, /skeleton/i,
    /zombie/i, /goblin/i, /orc/i, /elf/i, /dwarf/i, /pirate/i,
    /captain/i, /adventurer/i, /human/i, /ogre/i, /dragon/i,
    /base.*mesh/i, /animated.*character/i, /body/i, /cavalry/i,
  ],
  buildings: [
    /house/i, /castle/i, /tower/i, /wall/i, /building/i, /forge/i,
    /barn/i, /dock/i, /port/i, /boathouse/i, /bridge/i, /gate/i,
    /fort/i, /shrine/i, /temple/i, /church/i, /tavern/i,
  ],
  vehicles: [
    /ship/i, /boat/i, /sail/i, /raft/i, /cart/i, /wagon/i,
    /vehicle/i, /car(?!p)/i, /truck/i, /plane/i,
  ],
  weapons: [
    /sword/i, /axe/i, /bow/i, /gun/i, /dagger/i, /staff/i,
    /spear/i, /shield/i, /weapon/i, /mace/i, /hammer/i,
    /crossbow/i, /wand/i, /daedric/i,
  ],
  nature: [
    /tree/i, /rock/i, /bush/i, /flower/i, /grass/i, /mountain/i,
    /forest/i, /water/i, /ocean/i, /sea/i, /shark/i, /tentacle/i,
    /monster.*scene/i,
  ],
  props: [
    /treasure/i, /crate/i, /barrel/i, /chest/i, /table/i,
    /chair/i, /lamp/i, /modular/i, /kit/i, /floor/i, /wreck/i,
    /map/i, /trailer/i,
  ],
};

function classifySubcategory(filename: string): string {
  const name = path.basename(filename, path.extname(filename));
  for (const [subcat, patterns] of Object.entries(SUBCATEGORY_PATTERNS)) {
    if (patterns.some((p) => p.test(name))) {
      return subcat;
    }
  }
  return "misc";
}

// ── Auto-tagging ───────────────────────────────────────────────────
const TAG_PATTERNS: Record<string, RegExp> = {
  medieval: /medieval|knight|castle|sword|shield|forge/i,
  fantasy: /dragon|wizard|mage|elf|dwarf|orc|goblin|skeleton|magic/i,
  pirate: /pirate|ship|sail|treasure|captain|dock|port|boat/i,
  scifi: /robot|space|laser|cyber|mech|sci-?fi|futur/i,
  animated: /animated|animation|anim/i,
  character: /character|player|npc|hero|human|body/i,
  weapon: /sword|axe|bow|gun|dagger|staff|weapon|spear|daedric/i,
  nature: /tree|rock|bush|flower|grass|mountain|forest/i,
  building: /house|castle|tower|wall|building|forge|dock|port/i,
  vehicle: /ship|boat|sail|raft|cart|wagon/i,
  lowpoly: /low.?poly|simple|basic/i,
  meshy: /meshy/i,
  kaykit: /kaykit/i,
  kenney: /kenney/i,
};

function autoTag(filename: string): string[] {
  const name = path.basename(filename, path.extname(filename));
  const tags: Set<string> = new Set(["3d-model"]);

  // Extension-based tags
  const ext = path.extname(filename).toLowerCase();
  if (THREEJS_NATIVE.has(ext)) tags.add("threejs-ready");
  tags.add(ext.replace(".", ""));

  // Pattern matching
  for (const [tag, pattern] of Object.entries(TAG_PATTERNS)) {
    if (pattern.test(name)) {
      tags.add(tag);
    }
  }

  // Split camelCase and spaces for additional context
  const words = name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-%.@]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.toLowerCase());

  for (const word of words) {
    if (word.length > 3 && !word.match(/^\d+$/)) {
      tags.add(word);
    }
  }

  return Array.from(tags);
}

// ── Display name from filename ─────────────────────────────────────
function toDisplayName(filename: string): string {
  const name = path.basename(filename, path.extname(filename));
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase
    .replace(/[_\-%.@]/g, " ") // separators
    .replace(/\s+/g, " ") // collapse spaces
    .replace(/\((\d+)\)/g, " v$1") // (1) → v1
    .trim();
}

// ── GLB/GLTF metadata extraction ───────────────────────────────────
async function extractGltfMetadata(filePath: string): Promise<ModelRegistryEntry["metadata"]> {
  const ext = path.extname(filePath).toLowerCase();
  const metadata: ModelRegistryEntry["metadata"] = {};

  try {
    if (ext === ".glb") {
      // Read GLB header to extract JSON chunk
      const buffer = await fs.readFile(filePath);
      if (buffer.length < 12) return metadata;

      const magic = buffer.readUInt32LE(0);
      if (magic !== 0x46546c67) return metadata; // "glTF" magic

      const jsonChunkLength = buffer.readUInt32LE(12);
      const jsonChunkType = buffer.readUInt32LE(16);
      if (jsonChunkType !== 0x4e4f534a) return metadata; // "JSON"

      const jsonStr = buffer.slice(20, 20 + jsonChunkLength).toString("utf8");
      const gltf = JSON.parse(jsonStr);

      metadata.meshCount = gltf.meshes?.length || 0;
      metadata.materialCount = gltf.materials?.length || 0;
      metadata.animationCount = gltf.animations?.length || 0;
      metadata.animationNames = gltf.animations?.map((a: any) => a.name || "unnamed") || [];
      metadata.sceneName = gltf.scenes?.[0]?.name || undefined;
      metadata.hasTextures = (gltf.textures?.length || 0) > 0;
    } else if (ext === ".gltf") {
      const content = await fs.readFile(filePath, "utf8");
      const gltf = JSON.parse(content);

      metadata.meshCount = gltf.meshes?.length || 0;
      metadata.materialCount = gltf.materials?.length || 0;
      metadata.animationCount = gltf.animations?.length || 0;
      metadata.animationNames = gltf.animations?.map((a: any) => a.name || "unnamed") || [];
      metadata.sceneName = gltf.scenes?.[0]?.name || undefined;
      metadata.hasTextures = (gltf.textures?.length || 0) > 0;
    }
  } catch (err) {
    // Silently skip parse errors — metadata is best-effort
  }

  return metadata;
}

// ── File hash ──────────────────────────────────────────────────────
async function hashFile(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
    stream.on("error", reject);
  });
}

// ── Recursive file scanner ─────────────────────────────────────────
async function scanDirectory(dir: string, maxDepth = 5): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string, depth: number) {
    if (depth > maxDepth) return;

    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return; // Skip unreadable directories
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath, depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (MODEL_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  await walk(dir, 0);
  return results;
}

// ── Main scanner ───────────────────────────────────────────────────
async function scanModels(scanDir: string, outputPath: string): Promise<ModelRegistry> {
  console.log(`\n🔍 Scanning: ${scanDir}`);
  console.log(`📄 Output:   ${outputPath}\n`);

  if (!existsSync(scanDir)) {
    console.error(`❌ Directory not found: ${scanDir}`);
    process.exit(1);
  }

  // Find all model files
  const modelFiles = await scanDirectory(scanDir);
  console.log(`📦 Found ${modelFiles.length} model files\n`);

  if (modelFiles.length === 0) {
    console.log("No models found. Check the scan directory.");
    process.exit(0);
  }

  const models: ModelRegistryEntry[] = [];
  const seenHashes = new Set<string>();
  let totalSize = 0;
  const formatCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  for (let i = 0; i < modelFiles.length; i++) {
    const filePath = modelFiles[i];
    const filename = path.basename(filePath);
    const ext = path.extname(filename).toLowerCase();
    const relativePath = path.relative(scanDir, filePath).replace(/\\/g, "/");

    process.stdout.write(`  [${i + 1}/${modelFiles.length}] ${filename}...`);

    try {
      // File stats
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      totalSize += fileSize;

      // Content hash for dedup
      const contentHash = await hashFile(filePath);
      if (seenHashes.has(contentHash)) {
        console.log(" ⏭ duplicate (skipped)");
        continue;
      }
      seenHashes.add(contentHash);

      // Classification
      const subcategory = classifySubcategory(filename);
      const tags = autoTag(filename);
      const name = toDisplayName(filename);

      // Extract GLTF/GLB metadata
      const metadata = ext === ".glb" || ext === ".gltf"
        ? await extractGltfMetadata(filePath)
        : {};

      // Grudge UUID
      const grudgeId = randomUUID();

      // Format stats
      const format = ext.replace(".", "");
      formatCounts[format] = (formatCounts[format] || 0) + 1;
      categoryCounts[subcategory] = (categoryCounts[subcategory] || 0) + 1;

      const entry: ModelRegistryEntry = {
        grudgeId,
        filename,
        name,
        filePath: filePath.replace(/\\/g, "/"),
        relativePath,
        format,
        fileSize,
        contentHash,
        category: "models",
        subcategory,
        tags,
        assetType: "model",
        threeJsCompatible: THREEJS_NATIVE.has(ext),
        metadata,
        source: "local-scan",
        license: "unknown",
        scannedAt: new Date().toISOString(),
      };

      models.push(entry);

      const metaInfo = metadata.meshCount
        ? ` (${metadata.meshCount} meshes, ${metadata.animationCount || 0} anims)`
        : "";
      console.log(` ✅ ${subcategory}${metaInfo}`);
    } catch (err: any) {
      console.log(` ❌ ${err.message}`);
    }
  }

  const registry: ModelRegistry = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    scanDirectory: scanDir,
    totalModels: models.length,
    totalSizeBytes: totalSize,
    formatCounts,
    categoryCounts,
    models,
  };

  // Write output
  await fs.writeFile(outputPath, JSON.stringify(registry, null, 2), "utf8");

  // Summary
  console.log("\n" + "═".repeat(50));
  console.log(`✅ Registry built: ${models.length} models indexed`);
  console.log(`📁 Total size: ${(totalSize / 1024 / 1024).toFixed(1)} MB`);
  console.log(`📝 Output: ${outputPath}`);
  console.log("\nFormat breakdown:");
  for (const [fmt, count] of Object.entries(formatCounts)) {
    console.log(`  .${fmt}: ${count} files`);
  }
  console.log("\nCategory breakdown:");
  for (const [cat, count] of Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count} files`);
  }
  console.log("═".repeat(50) + "\n");

  return registry;
}

// ── CLI ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dirIdx = args.indexOf("--dir");
const outIdx = args.indexOf("--output");

const scanDir = dirIdx >= 0 && args[dirIdx + 1] ? args[dirIdx + 1] : DEFAULT_SCAN_DIR;
const outputPath = outIdx >= 0 && args[outIdx + 1]
  ? args[outIdx + 1]
  : path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..", DEFAULT_OUTPUT);

scanModels(scanDir, outputPath).catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
