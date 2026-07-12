#!/usr/bin/env node

/**
 * Asset Sync Script
 * Copies/syncs assets to public folder for Vercel deployment
 * 
 * This script handles:
 * 1. Copies existing assets from docs/ and attached_assets/ to client/public/assets/
 * 2. Organizes them by category (sprites, models, animations)
 * 3. Generates asset manifest for client-side loading
 * 
 * For production: Assets should be stored in Google Drive and pulled during CI/CD
 * For development: Copies from local attached_assets folder
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const assetsOutputDir = path.resolve(rootDir, "client/public/assets");
const sourceAssetsDirs = [
  path.resolve(rootDir, "docs"),
  path.resolve(rootDir, "attached_assets"),
  path.resolve(rootDir, "client/src/assets"),
];

// Asset categories and their source patterns
const assetCategories = {
  sprites: {
    patterns: ["**/*.png", "**/*.webp"],
    outputDir: "sprites",
  },
  models: {
    patterns: ["**/*.glb", "**/*.gltf"],
    outputDir: "models",
  },
  animations: {
    patterns: ["**/animations/**/*.json", "**/*-animation.json"],
    outputDir: "animations",
  },
  audio: {
    patterns: ["**/*.mp3", "**/*.wav", "**/*.ogg"],
    outputDir: "audio",
  },
};

/**
 * Copy file with directory creation
 */
function copyFileSync(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
}

/**
 * Find files matching patterns recursively
 */
function findFiles(dir, patterns) {
  const results = [];

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) return;

    const files = fs.readdirSync(currentPath);

    for (const file of files) {
      const filePath = path.join(currentPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // Skip node_modules and hidden/system directories
        if (!file.startsWith(".") && file !== "node_modules") {
          walk(filePath);
        }
      } else if (stat.isFile()) {
        // Normalize to POSIX separators for pattern matching
        const normalizedPath = filePath.replace(/\\/g, "/");
        for (const pattern of patterns) {
          const regex = patternToRegex(pattern);
          if (regex.test(normalizedPath)) {
            results.push(filePath);
            break;
          }
        }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Convert glob pattern to regex (supports both "/" and "\\" separators)
 */
function patternToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  // Ensure path separators are platform-agnostic
  const sepAgnostic = escaped.replace(/\//g, "[\\/]");
  return new RegExp(`(${sepAgnostic})$`, "i");
}

/**
 * Get relative subcategory path (e.g., "characters" from "src/models/characters/knight.glb")
 */
function getSubcategoryPath(filePath, sourceDir) {
  const relativePath = path.relative(sourceDir, filePath);
  const dirPath = path.dirname(relativePath);
  const parts = dirPath.split(path.sep);

  // 1) Per-tab grouping: attached_assets/tabs/<slug>/...
  const tabsIdx = parts.indexOf('tabs');
  if (tabsIdx >= 0 && parts.length > tabsIdx + 1) {
    const slug = parts[tabsIdx + 1];
    return slug || 'default';
  }

  // 2) Special-case legacy GrudgeRPGAssets2d -> grudge-swarm/sprites/characters/{rest}
  const grudgeIdx = parts.indexOf('GrudgeRPGAssets2d');
  if (grudgeIdx >= 0) {
    const rest = parts.slice(grudgeIdx + 1).join(path.sep); // e.g., Archer/Archer
    const mapped = path.join('grudge-swarm', 'sprites', 'characters', rest);
    return mapped || 'grudge-swarm/sprites/characters';
  }

  // 3) Extract meaningful subcategory (first folder after known patterns)
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (
      part === 'sprites' ||
      part === 'models' ||
      part === 'characters' ||
      part === 'buildings' ||
      part === 'hero-units'
    ) {
      return parts.slice(i).join(path.sep) || 'default';
    }
  }

  return 'default';
}

/**
 * Main sync function
 */
async function syncAssets() {
  console.log("🔄 Starting asset sync...\n");

  // Create output directory
  if (!fs.existsSync(assetsOutputDir)) {
    fs.mkdirSync(assetsOutputDir, { recursive: true });
    console.log(`✅ Created assets output directory: ${assetsOutputDir}`);
  }

  const manifestData = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    categories: {},
    assets: [],
  };

  let totalFilesCopied = 0;

  // Process each asset category
  for (const [categoryName, categoryConfig] of Object.entries(
    assetCategories
  )) {
    console.log(`\n📦 Processing ${categoryName}...`);

    const categoryOutputDir = path.join(assetsOutputDir, categoryConfig.outputDir);
    if (!fs.existsSync(categoryOutputDir)) {
      fs.mkdirSync(categoryOutputDir, { recursive: true });
    }

    let categoryFileCount = 0;
    const categoryAssets = [];

    // Search for files in all source directories
    for (const sourceDir of sourceAssetsDirs) {
      if (!fs.existsSync(sourceDir)) {
        continue;
      }

      const files = findFiles(sourceDir, categoryConfig.patterns);

      for (const sourceFile of files) {
        try {
          // Get subcategory (e.g., "characters", "hero-units")
          const subcategory = getSubcategoryPath(sourceFile, sourceDir);
          const fileName = path.basename(sourceFile);

          // Destination: output/category/subcategory/filename
          const destPath = path.join(categoryOutputDir, subcategory, fileName);

          // Copy file
          copyFileSync(sourceFile, destPath);
          categoryFileCount++;
          totalFilesCopied++;

          // Track in manifest
          const relativePath = path.relative(assetsOutputDir, destPath);
          categoryAssets.push({
            name: fileName,
            path: relativePath.replace(/\\/g, "/"),
            size: fs.statSync(destPath).size,
          });

          console.log(
            `  ✓ ${path.relative(rootDir, sourceFile)} → ${categoryConfig.outputDir}/${subcategory}`
          );
        } catch (error) {
          console.error(`  ✗ Failed to copy ${sourceFile}:`, error.message);
        }
      }
    }

    if (categoryFileCount > 0) {
      manifestData.categories[categoryName] = {
        count: categoryFileCount,
        directory: categoryConfig.outputDir,
        assets: categoryAssets,
      };
      console.log(`  📊 Total ${categoryName}: ${categoryFileCount} files`);
    }
  }

  // Write manifest file
  const manifestPath = path.join(assetsOutputDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifestData, null, 2));
  console.log(`\n✅ Asset manifest generated: ${path.relative(rootDir, manifestPath)}`);

  // Summary
  console.log(`\n✨ Asset sync complete!`);
  console.log(`   Total files synced: ${totalFilesCopied}`);
  console.log(`   Output directory: ${path.relative(rootDir, assetsOutputDir)}`);
  console.log(`   Manifest location: ${path.relative(rootDir, manifestPath)}`);
  console.log(`\n🚀 Ready for deployment to Vercel!`);

  return {
    success: totalFilesCopied > 0,
    filesCopied: totalFilesCopied,
    manifestPath,
  };
}

// Run sync
syncAssets().catch((error) => {
  console.error("❌ Asset sync failed:", error);
  process.exit(1);
});
