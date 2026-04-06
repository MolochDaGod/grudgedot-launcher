#!/usr/bin/env node
/**
 * Crown Clash Asset Pipeline
 * 
 * Unzips, organizes, and registers all assets for the Orcs vs Elves 3D RTS game.
 * Run: node scripts/crown-clash-assets.mjs
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const OUT = path.resolve('client/public/models/crown-clash');
const MANIFEST_PATH = path.resolve('client/public/models/crown-clash/crown-clash-assets.json');

// Source archives
const SOURCES = {
  environment: 'C:\\Users\\nugye\\Documents\\enviroment_clash_royal.zip',
  elves3d: 'C:\\Users\\nugye\\Documents\\craftpix-net-788035-elves-3d-low-poly-model-pack.zip',
  orcs3d: 'C:\\Users\\nugye\\Documents\\craftpix-net-201889-orc-3d-low-poly-models-pack.zip',
  tcgElves: 'C:\\Users\\nugye\\Documents\\craftpix-net-517559-civilian-elves-tcg-pixel-art-pack.zip',
  tcgUndead: 'C:\\Users\\nugye\\Documents\\craftpix-net-290387-undead-tcg-cards-pixel-art-asset-pack.zip',
  tcgFantasy: 'C:\\Users\\nugye\\Documents\\craftpix-net-746299-fantasy-tcg-cards-pixel-art.zip',
};

// Shared animation GLBs from Online-Multiplayer-Game
const ANIM_SRC = 'F:\\Online-Multiplayer-Game\\Online-Multiplayer-Game\\client\\models\\animations';

const ANIM_FILES = [
  'idle.glb', 'run.glb', 'attack.glb', 'hit.glb', 'dodge.glb',
  'spell.glb', 'jump.glb', 'collect.glb', 'limp.glb', 'dive.glb',
  'AnimationLibrary.glb', 'GodotLibrary.glb'
];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function unzip(zipPath, destDir, filter) {
  // Use PowerShell Expand-Archive for basic extraction, then filter
  const tempDir = path.join(destDir, '__temp_extract');
  ensureDir(tempDir);
  
  console.log(`  Extracting: ${path.basename(zipPath)}`);
  try {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tempDir}' -Force"`,
      { stdio: 'pipe', timeout: 120000 }
    );
  } catch (e) {
    console.error(`  ERROR extracting ${zipPath}: ${e.message}`);
    return;
  }

  // Move files according to filter function
  if (filter) {
    filter(tempDir, destDir);
  } else {
    // Move everything
    moveAll(tempDir, destDir);
  }

  // Cleanup temp
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function moveAll(src, dest) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      ensureDir(destPath);
      moveAll(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function findFiles(dir, ext, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findFiles(full, ext, results);
    } else if (ext.some(e => entry.name.toLowerCase().endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function copyFilesFlat(files, destDir) {
  ensureDir(destDir);
  for (const f of files) {
    const dest = path.join(destDir, path.basename(f));
    fs.copyFileSync(f, dest);
  }
}

// ============================================================================
// PIPELINE STEPS
// ============================================================================

function step1_environment() {
  console.log('\n[1/7] Environment (Clash Royale Arena)...');
  const dest = path.join(OUT, 'environment');
  ensureDir(dest);
  
  unzip(SOURCES.environment, dest, (tempDir, destDir) => {
    // Copy scene.gltf, scene.bin, and textures/
    const files = findFiles(tempDir, ['.gltf', '.bin', '.png', '.jpeg']);
    for (const f of files) {
      const rel = path.relative(tempDir, f);
      const target = path.join(destDir, rel);
      ensureDir(path.dirname(target));
      fs.copyFileSync(f, target);
    }
    // Also copy license
    const license = findFiles(tempDir, ['.txt']);
    for (const f of license) {
      fs.copyFileSync(f, path.join(destDir, path.basename(f)));
    }
  });
  
  return findFiles(dest, ['.gltf', '.bin', '.png', '.jpeg']).map(f => path.relative(OUT, f).replace(/\\/g, '/'));
}

function step2_elves3d() {
  console.log('\n[2/7] Elves 3D Models...');
  const fbxDest = path.join(OUT, 'elves', 'fbx');
  const texDest = path.join(OUT, 'elves', 'texture');
  ensureDir(fbxDest);
  ensureDir(texDest);
  
  unzip(SOURCES.elves3d, path.join(OUT, 'elves'), (tempDir, destDir) => {
    // Get Unity FBX variants (smaller, better for web)
    const fbxFiles = findFiles(tempDir, ['.fbx']).filter(f => f.includes('elfs_unity'));
    copyFilesFlat(fbxFiles, fbxDest);
    
    // Get texture atlas
    const texFiles = findFiles(tempDir, ['.png']);
    copyFilesFlat(texFiles, texDest);
  });
  
  const models = fs.readdirSync(fbxDest).filter(f => f.endsWith('.fbx'));
  console.log(`  Found ${models.length} elf FBX models`);
  return models.map(m => `elves/fbx/${m}`);
}

function step3_orcs3d() {
  console.log('\n[3/7] Orcs 3D Models...');
  const fbxDest = path.join(OUT, 'orcs', 'fbx');
  const texDest = path.join(OUT, 'orcs', 'texture');
  ensureDir(fbxDest);
  ensureDir(texDest);
  
  unzip(SOURCES.orcs3d, path.join(OUT, 'orcs'), (tempDir, destDir) => {
    // Get Unity FBX variants
    const fbxFiles = findFiles(tempDir, ['.fbx']).filter(f => f.includes('unity_fbx'));
    copyFilesFlat(fbxFiles, fbxDest);
    
    // Get texture atlas
    const texFiles = findFiles(tempDir, ['.png']);
    copyFilesFlat(texFiles, texDest);
  });
  
  const models = fs.readdirSync(fbxDest).filter(f => f.endsWith('.fbx'));
  console.log(`  Found ${models.length} orc FBX models`);
  return models.map(m => `orcs/fbx/${m}`);
}

function step4_animations() {
  console.log('\n[4/7] Shared Animation Library...');
  const dest = path.join(OUT, 'animations');
  ensureDir(dest);
  
  let copied = 0;
  for (const file of ANIM_FILES) {
    const src = path.join(ANIM_SRC, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(dest, file));
      copied++;
    } else {
      console.log(`  WARN: Animation not found: ${file}`);
    }
  }
  console.log(`  Copied ${copied}/${ANIM_FILES.length} animation GLBs`);
  return ANIM_FILES.filter(f => fs.existsSync(path.join(dest, f))).map(f => `animations/${f}`);
}

function extractTCG(zipPath, destSubdir, label) {
  const dest = path.join(OUT, 'cards', destSubdir);
  ensureDir(dest);
  
  unzip(zipPath, dest, (tempDir, destDir) => {
    // Only extract PNG files from Cards_color1 (best/default variant) + Illustrations
    const allPngs = findFiles(tempDir, ['.png']);
    
    for (const f of allPngs) {
      const relPath = path.relative(tempDir, f).replace(/\\/g, '/');
      
      // Only Cards_color1 and Illustrations
      if (relPath.startsWith('PNG/Cards_color1/') || relPath.startsWith('PNG/Illustrations/')) {
        // Flatten to: cards/{destSubdir}/{category}/{filename}
        const parts = relPath.replace('PNG/', '').replace('Cards_color1/', '').split('/');
        const targetDir = path.join(destDir, ...parts.slice(0, -1));
        ensureDir(targetDir);
        fs.copyFileSync(f, path.join(targetDir, parts[parts.length - 1]));
      }
    }
  });
  
  const files = findFiles(dest, ['.png']);
  console.log(`  ${label}: ${files.length} PNGs extracted`);
  return files.map(f => path.relative(OUT, f).replace(/\\/g, '/'));
}

function step5_tcgCards() {
  console.log('\n[5/7] TCG Card Art (Elves)...');
  const elfCards = extractTCG(SOURCES.tcgElves, 'elves', 'Elves TCG');
  
  console.log('\n[6/7] TCG Card Art (Orc/Undead)...');
  const orcCards = extractTCG(SOURCES.tcgUndead, 'orc', 'Orc/Undead TCG');
  
  console.log('\n[7/7] TCG Card Art (Hero/Fantasy)...');
  const heroCards = extractTCG(SOURCES.tcgFantasy, 'hero', 'Hero/Fantasy TCG');
  
  return { elfCards, orcCards, heroCards };
}

function generateManifest(data) {
  console.log('\nGenerating asset manifest...');
  
  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    basePath: '/models/crown-clash',
    environment: {
      scene: 'environment/scene.gltf',
      files: data.envFiles,
    },
    factions: {
      elves: {
        models: data.elfModels.map(m => ({
          path: m,
          name: path.basename(m, '.fbx').replace(/^_/, ''),
          type: classifyElfModel(path.basename(m)),
        })),
        textureAtlas: 'elves/texture/Texture_MAp_ELfs.png',
        cardArt: {
          back: 'cards/elves/Elves_card_back/Elves_card_back.png',
          versions: [
            'cards/elves/Elves_card_version1/Elves_version1.png',
            'cards/elves/Elves_card_version2/Elves_card_version2.png',
            'cards/elves/Elves_card_version3/Elves_card_version3.png',
          ],
          objects: data.cardData.elfCards.filter(p => p.includes('/Objects/')),
          illustrations: data.cardData.elfCards.filter(p => p.includes('/Illustrations/')),
        }
      },
      orcs: {
        models: data.orcModels.map(m => ({
          path: m,
          name: path.basename(m, '.fbx').replace(/^_/, ''),
          type: classifyOrcModel(path.basename(m)),
        })),
        textureAtlas: 'orcs/texture/Texture_MAp.png',
        cardArt: {
          back: 'cards/orc/Undead_card_back/Undead_card_back.png',
          versions: [
            'cards/orc/Undead_card_version1/Undead_card_version1.png',
            'cards/orc/Undead_card_version2/Undead_card_version2.png',
            'cards/orc/Undead_card_version3/Undead_card_version3.png',
          ],
          objects: data.cardData.orcCards.filter(p => p.includes('/Objects/')),
          illustrations: data.cardData.orcCards.filter(p => p.includes('/Illustrations/')),
        }
      }
    },
    heroCardArt: {
      versions: [
        'cards/hero/Dark_elf_card_version1/Dark_elf_card_version1.png',
        'cards/hero/Dark_elf_card_version2/Dark_elf_card_version2.png',
        'cards/hero/Dark_elf_card_version3/Dark_elf_card_version3.png',
      ],
      back: 'cards/hero/Dark_elf_card_back/Dark_elf_card_back.png',
      objects: data.cardData.heroCards.filter(p => p.includes('/Objects/')),
      illustrations: data.cardData.heroCards.filter(p => p.includes('/Illustrations/')),
    },
    animations: data.animFiles.map(a => ({
      path: a,
      name: path.basename(a, '.glb'),
      type: path.basename(a, '.glb').includes('Library') ? 'library' : 'clip',
    })),
    unitRoles: {
      elves: {
        melee: ['elf_commoner_1', 'elf_commoner_2', 'elf_commoner_3'],
        ranged: ['elf_commoner_4', 'elf_commoner_5', 'elf_commoner_6'],
        elite_melee: ['elf_upper_class_1', 'elf_upper_class_2', 'elf_upper_class_3'],
        elite_ranged: ['elf_upper_class_4', 'elf_upper_class_5', 'elf_upper_class_6'],
        hero_king: ['king'],
        hero_queen: ['queen'],
      },
      orcs: {
        melee: ['orcs_city_dwellers_1', 'orcs_city_dwellers_2', 'orcs_city_dwellers_3'],
        ranged: ['orcs_city_dwellers_4', 'orcs_dwellers_6', 'city_dwellers_5_test'],
        elite_melee: ['peasant_1', 'peasant_2', 'peasant_3'],
        elite_ranged: ['peasant_4', 'peasant_5', 'peasant_6'],
        hero_king: ['king'],
        hero_queen: ['queen'],
      }
    }
  };
  
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  console.log(`  Manifest written: ${MANIFEST_PATH}`);
  return manifest;
}

function classifyElfModel(filename) {
  const name = filename.toLowerCase();
  if (name.includes('king')) return 'hero';
  if (name.includes('queen')) return 'hero';
  if (name.includes('upper_class')) return 'elite';
  return 'basic';
}

function classifyOrcModel(filename) {
  const name = filename.toLowerCase();
  if (name.includes('king')) return 'hero';
  if (name.includes('queen')) return 'hero';
  if (name.includes('city_dwellers') || name.includes('dwellers')) return 'elite';
  return 'basic';
}

// ============================================================================
// MAIN
// ============================================================================

console.log('=== Crown Clash Asset Pipeline ===');
console.log(`Output: ${OUT}\n`);

// Verify sources exist
let missing = false;
for (const [key, src] of Object.entries(SOURCES)) {
  if (!fs.existsSync(src)) {
    console.error(`MISSING: ${key} -> ${src}`);
    missing = true;
  }
}
if (!fs.existsSync(ANIM_SRC)) {
  console.error(`MISSING: animations -> ${ANIM_SRC}`);
  missing = true;
}
if (missing) {
  console.error('\nCannot proceed with missing source files.');
  process.exit(1);
}

// Clean output
if (fs.existsSync(OUT)) {
  console.log('Cleaning previous output...');
  fs.rmSync(OUT, { recursive: true, force: true });
}
ensureDir(OUT);

// Run pipeline
const envFiles = step1_environment();
const elfModels = step2_elves3d();
const orcModels = step3_orcs3d();
const animFiles = step4_animations();
const cardData = step5_tcgCards();

const manifest = generateManifest({ envFiles, elfModels, orcModels, animFiles, cardData });

// Summary
console.log('\n=== Pipeline Complete ===');
console.log(`  Environment files: ${envFiles.length}`);
console.log(`  Elf models: ${elfModels.length}`);
console.log(`  Orc models: ${orcModels.length}`);
console.log(`  Animations: ${animFiles.length}`);
console.log(`  Card art (elves): ${cardData.elfCards.length}`);
console.log(`  Card art (orc): ${cardData.orcCards.length}`);
console.log(`  Card art (hero): ${cardData.heroCards.length}`);
console.log(`  Manifest: ${MANIFEST_PATH}`);
