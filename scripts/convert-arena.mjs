/**
 * Convert Gladiator Arena FBX → GLB
 * 
 * Uses Three.js FBXLoader (via jsdom) to parse FBX, then GLTFExporter to emit GLB.
 * Alternative: if Three.js headless fails, falls back to obj2gltf if an OBJ exists.
 * 
 * Usage: node scripts/convert-arena.mjs
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, basename } from 'path';

const SRC_DIR = 'D:\\Grudge\\GRUDGE-NEW-GooglePlay\\FRESH GRUDGE\\Assets\\!MAP Assets\\FST\\Gladiators Low Poly Arena';
const OUT_DIR = join(process.cwd(), 'public', 'models', 'scenes', 'arena');
const FBX_FILE = join(SRC_DIR, 'Gladiator Low Poly Arena.fbx');

// Ensure output dir
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

// Copy textures (already done but ensure)
const TEX_DIR = join(SRC_DIR, 'Textures');
import { readdirSync } from 'fs';
const texFiles = readdirSync(TEX_DIR).filter(f => !f.endsWith('.meta'));
for (const f of texFiles) {
  const dest = join(OUT_DIR, f);
  if (!existsSync(dest)) {
    copyFileSync(join(TEX_DIR, f), dest);
    console.log(`  Copied texture: ${f}`);
  }
}

// Three.js FBX conversion requires a DOM (TextureLoader, ImageLoader).
// In Node.js headless we can't use FBXLoader directly without jsdom + canvas polyfills.
// Instead, we'll use the obj2gltf package (already in deps) if we can extract an OBJ,
// or we'll create a manifest that tells the client to load the FBX directly via the
// Three.js FBXLoader in the browser.

// Strategy: Create an arena scene manifest that the Grudge Engine / Three Engine
// can load. The FBX will be copied to public/ and loaded client-side.

console.log(`\nCopying arena FBX to public...`);
const fbxDest = join(OUT_DIR, 'gladiator-arena.fbx');
copyFileSync(FBX_FILE, fbxDest);
console.log(`  → ${fbxDest}`);

// Create scene manifest
const manifest = {
  id: "gladiator-arena",
  name: "Gladiator Low Poly Arena",
  description: "Low-poly gladiator arena scene for PvP combat and editor use",
  type: "scene",
  format: "fbx",
  modelPath: "/models/scenes/arena/gladiator-arena.fbx",
  textures: {
    arena: {
      albedo: "/models/scenes/arena/Arena-Albedo.png",
      normal: "/models/scenes/arena/Arena-NM.png",
      ao: "/models/scenes/arena/Arena-AO.png",
    },
    flagPole: {
      albedo: "/models/scenes/arena/FlagPole-Albedo.png",
      normal: "/models/scenes/arena/FlagPole-NM.png",
      ao: "/models/scenes/arena/FlagPole-AO.png",
    },
    flags: {
      albedo: "/models/scenes/arena/Flags-Albedo.png",
      normal: "/models/scenes/arena/Flags-NM.png",
      ao: "/models/scenes/arena/Flags-AO.png",
    },
    gate: {
      albedo: "/models/scenes/arena/GateArena-Albedo.png",
      normal: "/models/scenes/arena/GateArena-NM.png",
      ao: "/models/scenes/arena/GateArena-AO.png",
    },
    mechanism: {
      albedo: "/models/scenes/arena/Mechanism-Albedo.png",
      normal: "/models/scenes/arena/Mechanism-NM.png",
      ao: "/models/scenes/arena/Mechanism-AO.png",
    },
    pillars: {
      albedo: "/models/scenes/arena/Pillars-Albedo.png",
      normal: "/models/scenes/arena/Pillars-NM.png",
      ao: "/models/scenes/arena/Pillars-AO.png",
    },
    woodSpikes: {
      albedo: "/models/scenes/arena/WoodSpikes-Albedo.png",
      normal: "/models/scenes/arena/WoodSpikes-NM.png",
      ao: "/models/scenes/arena/WoodSpikes-AO.png",
    },
  },
  materials: [
    "ArenaMaterial", "ArenaGate", "Flag", "Flag 1",
    "FlagPoleMaterial", "MechanismMaterial", "PillarsMaterial",
    "plane", "WoodSpike"
  ],
  tags: ["arena", "pvp", "gladiator", "scene", "low-poly"],
  source: "GRUDGE-NEW-GooglePlay/FRESH GRUDGE/Assets/!MAP Assets/FST/Gladiators Low Poly Arena",
};

const manifestPath = join(OUT_DIR, 'arena-manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`  → ${manifestPath}`);

console.log(`\n✅ Arena assets ready at /models/scenes/arena/`);
console.log(`   FBX: gladiator-arena.fbx`);
console.log(`   Textures: ${texFiles.length} PNG files (Albedo + Normal + AO)`);
console.log(`   Manifest: arena-manifest.json`);
console.log(`\n   Load in Three Engine: GLTFLoader won't read FBX — use FBXLoader instead.`);
console.log(`   Load in Grudge Web Engine (BabylonJS): SceneLoader.ImportMesh supports FBX via plugins.`);
