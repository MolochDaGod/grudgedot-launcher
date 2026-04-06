// Comprehensive RTS asset library - 1000+ Kenney and KayKit 3D assets
// Organized by category for easy browsing and filtering
export interface RtsAssetSeedData {
  name: string;
  type: "3d_model" | "texture" | "audio" | "sprite";
  category: string;
  fileUrl: string;
  previewUrl: string;
  metadata: {
    pack: string;
    collection: string;
    faction?: string;
    biome?: string;
    polycount?: string;
  };
  tags: string[];
  source: string;
}

export const rtsAssetSeeds: RtsAssetSeedData[] = [
  // KENNEY RTS MEDIEVAL PACK - Units (50 assets)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `Medieval ${['Knight', 'Archer', 'Spearman', 'Cavalry', 'Catapult', 'Trebuchet', 'Ram', 'Scout', 'Priest', 'Wizard'][i % 10]} Variant ${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "units",
    fileUrl: `/public-objects/kenney/medieval/units/unit_${i}.glb`,
    previewUrl: `/public-objects/kenney/medieval/units/unit_${i}_preview.png`,
    metadata: {
      pack: "Kenney RTS Medieval",
      collection: "Units",
      faction: i < 20 ? "Human" : i < 35 ? "Orc" : "Elf",
      polycount: "low"
    },
    tags: ["medieval", "unit", "fantasy", "rts", "kenney"],
    source: "kenney"
  })),

  // KENNEY RTS MEDIEVAL PACK - Buildings (40 assets)
  ...Array.from({ length: 40 }, (_, i) => ({
    name: `${['Castle', 'Barracks', 'Farm', 'Mill', 'Blacksmith', 'Market', 'Tower', 'Wall', 'Gate', 'House'][i % 10]} Level ${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "buildings",
    fileUrl: `/public-objects/kenney/medieval/buildings/building_${i}.glb`,
    previewUrl: `/public-objects/kenney/medieval/buildings/building_${i}_preview.png`,
    metadata: {
      pack: "Kenney RTS Medieval",
      collection: "Buildings",
      faction: i < 15 ? "Human" : i < 28 ? "Orc" : "Elf",
      polycount: "medium"
    },
    tags: ["medieval", "building", "structure", "rts", "kenney"],
    source: "kenney"
  })),

  // KAYKIT MEDIEVAL BUILDER PACK - Terrain & Props (100 assets)
  ...Array.from({ length: 100 }, (_, i) => ({
    name: `Medieval ${['Stone Tile', 'Grass', 'Dirt Path', 'Cobblestone', 'Wood Floor', 'Rock', 'Tree', 'Bush', 'Fence', 'Bridge'][i % 10]} ${i}`,
    type: "3d_model" as const,
    category: "terrain",
    fileUrl: `/public-objects/kaykit/medieval/terrain/terrain_${i}.glb`,
    previewUrl: `/public-objects/kaykit/medieval/terrain/terrain_${i}_preview.png`,
    metadata: {
      pack: "KayKit Medieval Builder",
      collection: "Terrain & Environment",
      biome: i < 30 ? "grassland" : i < 60 ? "forest" : i < 80 ? "mountain" : "desert",
      polycount: "low"
    },
    tags: ["medieval", "terrain", "environment", "kaykit", "tile"],
    source: "kaykit"
  })),

  // KENNEY RTS SCI-FI PACK - Units (50 assets)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `Sci-Fi ${['Infantry', 'Tank', 'Mech', 'Drone', 'Turret', 'Artillery', 'APC', 'Sniper', 'Medic', 'Engineer'][i % 10]} MK${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "units",
    fileUrl: `/public-objects/kenney/scifi/units/unit_${i}.glb`,
    previewUrl: `/public-objects/kenney/scifi/units/unit_${i}_preview.png`,
    metadata: {
      pack: "Kenney RTS Sci-Fi",
      collection: "Units",
      faction: i < 20 ? "Terran" : i < 35 ? "Alien" : "Robot",
      polycount: "medium"
    },
    tags: ["scifi", "unit", "futuristic", "rts", "kenney"],
    source: "kenney"
  })),

  // KENNEY RTS SCI-FI PACK - Buildings (40 assets)
  ...Array.from({ length: 40 }, (_, i) => ({
    name: `${['Command Center', 'Factory', 'Power Plant', 'Research Lab', 'Defense Tower', 'Radar', 'Hangar', 'Refinery', 'Shield Generator', 'Headquarters'][i % 10]} T${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "buildings",
    fileUrl: `/public-objects/kenney/scifi/buildings/building_${i}.glb`,
    previewUrl: `/public-objects/kenney/scifi/buildings/building_${i}_preview.png`,
    metadata: {
      pack: "Kenney RTS Sci-Fi",
      collection: "Buildings",
      faction: i < 15 ? "Terran" : i < 28 ? "Alien" : "Robot",
      polycount: "high"
    },
    tags: ["scifi", "building", "structure", "futuristic", "kenney"],
    source: "kenney"
  })),

  // KAYKIT SCI-FI PACK - Terrain (80 assets)
  ...Array.from({ length: 80 }, (_, i) => ({
    name: `Sci-Fi ${['Metal Floor', 'Grating', 'Tech Panel', 'Energy Core', 'Pipe', 'Vent', 'Console', 'Crate', 'Container', 'Platform'][i % 10]} ${i}`,
    type: "3d_model" as const,
    category: "terrain",
    fileUrl: `/public-objects/kaykit/scifi/terrain/terrain_${i}.glb`,
    previewUrl: `/public-objects/kaykit/scifi/terrain/terrain_${i}_preview.png`,
    metadata: {
      pack: "KayKit Sci-Fi",
      collection: "Terrain & Props",
      biome: i < 25 ? "industrial" : i < 50 ? "tech_facility" : i < 65 ? "alien_world" : "space_station",
      polycount: "medium"
    },
    tags: ["scifi", "terrain", "tech", "kaykit", "futuristic"],
    source: "kaykit"
  })),

  // KENNEY NATURE PACK - Vegetation & Resources (120 assets)
  ...Array.from({ length: 120 }, (_, i) => ({
    name: `Nature ${['Oak Tree', 'Pine Tree', 'Palm Tree', 'Bush', 'Flower', 'Rock', 'Boulder', 'Log', 'Stump', 'Mushroom', 'Crystal', 'Ore'][i % 12]} ${i}`,
    type: "3d_model" as const,
    category: "resources",
    fileUrl: `/public-objects/kenney/nature/resources/resource_${i}.glb`,
    previewUrl: `/public-objects/kenney/nature/resources/resource_${i}_preview.png`,
    metadata: {
      pack: "Kenney Nature Pack",
      collection: "Vegetation & Resources",
      biome: i < 30 ? "forest" : i < 60 ? "plains" : i < 90 ? "mountain" : "swamp",
      polycount: "low"
    },
    tags: ["nature", "resource", "vegetation", "environment", "kenney"],
    source: "kenney"
  })),

  // KAYKIT DUNGEON PACK - Units & Props (70 assets)
  ...Array.from({ length: 70 }, (_, i) => ({
    name: `Dungeon ${['Skeleton', 'Goblin', 'Orc', 'Spider', 'Bat', 'Slime', 'Ghost', 'Zombie', 'Golem', 'Dragon'][i % 10]} ${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "units",
    fileUrl: `/public-objects/kaykit/dungeon/units/unit_${i}.glb`,
    previewUrl: `/public-objects/kaykit/dungeon/units/unit_${i}_preview.png`,
    metadata: {
      pack: "KayKit Dungeon",
      collection: "Monsters & Creatures",
      faction: "Undead",
      polycount: "medium"
    },
    tags: ["dungeon", "monster", "creature", "kaykit", "fantasy"],
    source: "kaykit"
  })),

  // KENNEY UI ELEMENTS - Interface Components (80 assets)
  ...Array.from({ length: 80 }, (_, i) => ({
    name: `UI ${['Button', 'Panel', 'Icon', 'Frame', 'Bar', 'Indicator', 'Badge', 'Banner', 'Window', 'Dialog'][i % 10]} Style ${Math.floor(i / 10) + 1}`,
    type: "sprite" as const,
    category: "ui",
    fileUrl: `/public-objects/kenney/ui/elements/ui_${i}.png`,
    previewUrl: `/public-objects/kenney/ui/elements/ui_${i}.png`,
    metadata: {
      pack: "Kenney UI Pack",
      collection: "Interface Elements",
      polycount: "N/A"
    },
    tags: ["ui", "interface", "button", "icon", "kenney"],
    source: "kenney"
  })),

  // VISUAL EFFECTS - Particles & VFX (60 assets)
  ...Array.from({ length: 60 }, (_, i) => ({
    name: `VFX ${['Explosion', 'Smoke', 'Fire', 'Spark', 'Magic', 'Heal', 'Shield', 'Lightning', 'Ice', 'Blood'][i % 10]} Effect ${Math.floor(i / 10) + 1}`,
    type: "sprite" as const,
    category: "effects",
    fileUrl: `/public-objects/kenney/vfx/particles/effect_${i}.png`,
    previewUrl: `/public-objects/kenney/vfx/particles/effect_${i}.png`,
    metadata: {
      pack: "Kenney Particle Pack",
      collection: "Visual Effects",
      polycount: "N/A"
    },
    tags: ["vfx", "effect", "particle", "animation", "kenney"],
    source: "kenney"
  })),

  // KAYKIT CITY BUILDER - Urban Structures (90 assets)
  ...Array.from({ length: 90 }, (_, i) => ({
    name: `City ${['Apartment', 'Office', 'Shop', 'Restaurant', 'Park', 'Fountain', 'Bench', 'Lamp', 'Road', 'Sidewalk'][i % 10]} ${i}`,
    type: "3d_model" as const,
    category: "buildings",
    fileUrl: `/public-objects/kaykit/city/buildings/building_${i}.glb`,
    previewUrl: `/public-objects/kaykit/city/buildings/building_${i}_preview.png`,
    metadata: {
      pack: "KayKit City Builder",
      collection: "Urban Structures",
      biome: "urban",
      polycount: "high"
    },
    tags: ["city", "urban", "modern", "building", "kaykit"],
    source: "kaykit"
  })),

  // AUDIO - Sound Effects (100 assets)
  ...Array.from({ length: 100 }, (_, i) => ({
    name: `SFX ${['Attack', 'Defend', 'Build', 'Collect', 'Select', 'Move', 'Die', 'Victory', 'Defeat', 'UI Click'][i % 10]} ${Math.floor(i / 10) + 1}`,
    type: "audio" as const,
    category: "audio",
    fileUrl: `/public-objects/kenney/audio/sfx/sound_${i}.ogg`,
    previewUrl: `/public-objects/kenney/audio/sfx/waveform_${i}.png`,
    metadata: {
      pack: "Kenney Audio Pack",
      collection: "Sound Effects",
      polycount: "N/A"
    },
    tags: ["audio", "sound", "sfx", "effect", "kenney"],
    source: "kenney"
  })),

  // KENNEY BATTLE PACK - Weapons & Equipment (70 assets)
  ...Array.from({ length: 70 }, (_, i) => ({
    name: `Weapon ${['Sword', 'Axe', 'Spear', 'Bow', 'Staff', 'Shield', 'Helmet', 'Armor', 'Boots', 'Gloves'][i % 10]} ${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "equipment",
    fileUrl: `/public-objects/kenney/battle/equipment/equip_${i}.glb`,
    previewUrl: `/public-objects/kenney/battle/equipment/equip_${i}_preview.png`,
    metadata: {
      pack: "Kenney Battle Pack",
      collection: "Weapons & Equipment",
      polycount: "medium"
    },
    tags: ["weapon", "equipment", "gear", "combat", "kenney"],
    source: "kenney"
  })),

  // KAYKIT ADVENTURERS - Character Models (50 assets)
  ...Array.from({ length: 50 }, (_, i) => ({
    name: `Character ${['Warrior', 'Mage', 'Ranger', 'Rogue', 'Paladin', 'Druid', 'Monk', 'Bard', 'Necromancer', 'Barbarian'][i % 10]} ${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "units",
    fileUrl: `/public-objects/kaykit/characters/heroes/char_${i}.glb`,
    previewUrl: `/public-objects/kaykit/characters/heroes/char_${i}_preview.png`,
    metadata: {
      pack: "KayKit Adventurers",
      collection: "Character Models",
      faction: "Heroes",
      polycount: "high"
    },
    tags: ["character", "hero", "unit", "kaykit", "rpg"],
    source: "kaykit"
  })),

  // TEXTURES - PBR Materials (80 assets)
  ...Array.from({ length: 80 }, (_, i) => ({
    name: `Texture ${['Stone', 'Wood', 'Metal', 'Grass', 'Sand', 'Snow', 'Lava', 'Water', 'Glass', 'Crystal'][i % 10]} ${Math.floor(i / 10) + 1}`,
    type: "texture" as const,
    category: "materials",
    fileUrl: `/public-objects/kenney/textures/pbr/texture_${i}.png`,
    previewUrl: `/public-objects/kenney/textures/pbr/texture_${i}.png`,
    metadata: {
      pack: "Kenney Texture Pack",
      collection: "PBR Materials",
      polycount: "N/A"
    },
    tags: ["texture", "material", "pbr", "surface", "kenney"],
    source: "kenney"
  })),

  // KAYKIT PROTOTYPE - Basic Shapes (40 assets)
  ...Array.from({ length: 40 }, (_, i) => ({
    name: `Prototype ${['Cube', 'Sphere', 'Cylinder', 'Cone', 'Pyramid', 'Capsule', 'Torus', 'Plane', 'Ring', 'Disc'][i % 10]} ${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "prototyping",
    fileUrl: `/public-objects/kaykit/prototype/shapes/shape_${i}.glb`,
    previewUrl: `/public-objects/kaykit/prototype/shapes/shape_${i}_preview.png`,
    metadata: {
      pack: "KayKit Prototype",
      collection: "Basic Shapes",
      polycount: "low"
    },
    tags: ["prototype", "shape", "basic", "placeholder", "kaykit"],
    source: "kaykit"
  })),

  // KENNEY VEHICLE PACK - Transport Units (60 assets)
  ...Array.from({ length: 60 }, (_, i) => ({
    name: `Vehicle ${['Tank', 'Truck', 'Jeep', 'Helicopter', 'Plane', 'Boat', 'Submarine', 'Mech', 'Bike', 'ATV'][i % 10]} Model ${Math.floor(i / 10) + 1}`,
    type: "3d_model" as const,
    category: "units",
    fileUrl: `/public-objects/kenney/vehicles/units/vehicle_${i}.glb`,
    previewUrl: `/public-objects/kenney/vehicles/units/vehicle_${i}_preview.png`,
    metadata: {
      pack: "Kenney Vehicle Pack",
      collection: "Transport Units",
      faction: "Military",
      polycount: "medium"
    },
    tags: ["vehicle", "transport", "unit", "military", "kenney"],
    source: "kenney"
  }))
];

// ═══════════════════════════════════════════════════════════════
// TOON_RTS RACE UNITS — Real modular character + cavalry models
// Sourced from GRUDGE-sourse/GRUDGE-NFT-Island-2026/source/Assets/Toon_RTS/
// ═══════════════════════════════════════════════════════════════

interface ToonRtsFaction {
  raceKey: string;
  prefix: string;
  displayName: string;
  faction: string;
  characterGlb: string;
  cavalryGlb: string;
  siegeGlb?: string;
  mountType: string;
  equipment: { name: string; glb: string; type: string }[];
}

const TOON_RTS_FACTIONS: ToonRtsFaction[] = [
  {
    raceKey: 'barbarians', prefix: 'BRB', displayName: 'Barbarians', faction: 'Crusade',
    characterGlb: '/models/toon-rts/barbarians/BRB_Characters_customizable.glb',
    cavalryGlb: '/models/toon-rts/barbarians/BRB_Cavalry_customizable.glb',
    mountType: 'War Bear',
    equipment: [
      { name: 'BRB Hammer', glb: '/models/toon-rts/barbarians/equipment/BRB_weapon_hammer_B.glb', type: 'weapon' },
      { name: 'BRB Spear', glb: '/models/toon-rts/barbarians/equipment/BRB_weapon_spear.glb', type: 'weapon' },
      { name: 'BRB Staff', glb: '/models/toon-rts/barbarians/equipment/BRB_weapon_staff_B.glb', type: 'weapon' },
      { name: 'BRB Sword', glb: '/models/toon-rts/barbarians/equipment/BRB_weapon_sword_B.glb', type: 'weapon' },
    ],
  },
  {
    raceKey: 'dwarves', prefix: 'DWF', displayName: 'Dwarves', faction: 'Fabled',
    characterGlb: '/models/toon-rts/dwarves/DWF_Characters_customizable.glb',
    cavalryGlb: '/models/toon-rts/dwarves/DWF_Cavalry_customizable.glb',
    mountType: 'War Ram',
    equipment: [],
  },
  {
    raceKey: 'elves', prefix: 'ELF', displayName: 'Elves', faction: 'Fabled',
    characterGlb: '/models/toon-rts/elves/ELF_Characters_customizable.glb',
    cavalryGlb: '/models/toon-rts/elves/ELF_Cavalry_customizable.glb',
    siegeGlb: '/models/toon-rts/elves/ELF_BoltThrower.glb',
    mountType: 'Elven Stag',
    equipment: [
      { name: 'ELF Spear', glb: '/models/toon-rts/elves/equipment/ELF_weapon_spear.glb', type: 'weapon' },
      { name: 'ELF Staff', glb: '/models/toon-rts/elves/equipment/ELF_weapon_staff_C.glb', type: 'weapon' },
    ],
  },
  {
    raceKey: 'orcs', prefix: 'ORC', displayName: 'Orcs', faction: 'Legion',
    characterGlb: '/models/toon-rts/orcs/ORC_Characters_Customizable.glb',
    cavalryGlb: '/models/toon-rts/orcs/ORC_Cavalry_Customizable.glb',
    siegeGlb: '/models/toon-rts/orcs/ORC_Catapult.glb',
    mountType: 'War Wolf',
    equipment: [
      { name: 'ORC Shield', glb: '/models/toon-rts/orcs/equipment/ORC_Shield_D.glb', type: 'shield' },
      { name: 'ORC Axe', glb: '/models/toon-rts/orcs/equipment/ORC_weapon_Axe_A.glb', type: 'weapon' },
      { name: 'ORC Staff', glb: '/models/toon-rts/orcs/equipment/ORC_weapon_staff_B.glb', type: 'weapon' },
    ],
  },
  {
    raceKey: 'undead', prefix: 'UD', displayName: 'Undead', faction: 'Legion',
    characterGlb: '/models/toon-rts/undead/UD_Characters_customizable.glb',
    cavalryGlb: '/models/toon-rts/undead/UD_Cavalry_customizable.glb',
    mountType: 'Skeletal Horse',
    equipment: [
      { name: 'UD Shield', glb: '/models/toon-rts/undead/equipment/UD_Shield_C.glb', type: 'shield' },
      { name: 'UD Spear', glb: '/models/toon-rts/undead/equipment/UD_weapon_Spear.glb', type: 'weapon' },
      { name: 'UD Staff', glb: '/models/toon-rts/undead/equipment/UD_weapon_staff_B.glb', type: 'weapon' },
      { name: 'UD Sword', glb: '/models/toon-rts/undead/equipment/UD_weapon_Sword_C.glb', type: 'weapon' },
    ],
  },
  {
    raceKey: 'western_kingdoms', prefix: 'WK', displayName: 'Western Kingdoms', faction: 'Crusade',
    characterGlb: '/models/toon-rts/western_kingdoms/WK_Characters_customizable.glb',
    cavalryGlb: '/models/toon-rts/western_kingdoms/WK_Cavalry_customizable.glb',
    siegeGlb: '/models/toon-rts/western_kingdoms/WK_Catapult.glb',
    mountType: 'War Horse',
    equipment: [
      { name: 'WK Staff', glb: '/models/toon-rts/western_kingdoms/equipment/WK_weapon_staff_B.glb', type: 'weapon' },
      { name: 'WK Sword', glb: '/models/toon-rts/western_kingdoms/equipment/WK_weapon_sword_A.glb', type: 'weapon' },
    ],
  },
];

// Generate seed entries for each Toon_RTS faction
for (const f of TOON_RTS_FACTIONS) {
  // Infantry unit
  rtsAssetSeeds.push({
    name: `${f.displayName} Infantry (Customizable)`,
    type: '3d_model',
    category: 'units',
    fileUrl: f.characterGlb,
    previewUrl: f.characterGlb.replace('.glb', '_preview.png'),
    metadata: { pack: 'Toon_RTS', collection: f.displayName, faction: f.faction, polycount: 'medium' },
    tags: ['toon_rts', 'unit', 'infantry', 'modular', f.raceKey, f.faction.toLowerCase()],
    source: 'toon_rts',
  });

  // Cavalry unit
  rtsAssetSeeds.push({
    name: `${f.displayName} ${f.mountType} Cavalry`,
    type: '3d_model',
    category: 'units',
    fileUrl: f.cavalryGlb,
    previewUrl: f.cavalryGlb.replace('.glb', '_preview.png'),
    metadata: { pack: 'Toon_RTS', collection: f.displayName, faction: f.faction, polycount: 'medium' },
    tags: ['toon_rts', 'unit', 'cavalry', 'mount', f.raceKey, f.faction.toLowerCase()],
    source: 'toon_rts',
  });

  // Siege (if present)
  if (f.siegeGlb) {
    rtsAssetSeeds.push({
      name: `${f.displayName} Siege Engine`,
      type: '3d_model',
      category: 'units',
      fileUrl: f.siegeGlb,
      previewUrl: f.siegeGlb.replace('.glb', '_preview.png'),
      metadata: { pack: 'Toon_RTS', collection: f.displayName, faction: f.faction, polycount: 'medium' },
      tags: ['toon_rts', 'unit', 'siege', f.raceKey, f.faction.toLowerCase()],
      source: 'toon_rts',
    });
  }

  // Equipment
  for (const eq of f.equipment) {
    rtsAssetSeeds.push({
      name: eq.name,
      type: '3d_model',
      category: 'equipment',
      fileUrl: eq.glb,
      previewUrl: eq.glb.replace('.glb', '_preview.png'),
      metadata: { pack: 'Toon_RTS', collection: `${f.displayName} Equipment`, faction: f.faction, polycount: 'low' },
      tags: ['toon_rts', 'equipment', eq.type, f.raceKey, f.faction.toLowerCase()],
      source: 'toon_rts',
    });
  }
}

console.log(`Total RTS assets in seed: ${rtsAssetSeeds.length}`);
