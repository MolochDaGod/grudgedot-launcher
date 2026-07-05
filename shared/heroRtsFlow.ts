/**
 * Hero Commander RTS — organization & game-flow reference for launcher.grudge-studio.com/rts-builder.
 * Mirrors artifacts/hero-rts manifests (RtsAssetMap, UnitsCatalog, hotkeys, production).
 */

export const HERO_RTS_DEPLOY = {
  url: 'https://hero-rts-grudgenexus.vercel.app',
  vercelProject: 'hero-commander-rts',
  repo: 'grudge-studio-games',
  root: 'artifacts/hero-rts',
  workflow: '.github/workflows/deploy-hero-rts.yml',
} as const;

export const HERO_RTS_LINKS = {
  play: `${HERO_RTS_DEPLOY.url}/?play=1`,
  menu: HERO_RTS_DEPLOY.url,
  showcase: `${HERO_RTS_DEPLOY.url}/?showcase=1`,
  editor: `${HERO_RTS_DEPLOY.url}/?editor=1`,
} as const;

export const SOURCE_TREE = [
  { path: 'src/main.tsx', role: 'Vite entry → mounts App' },
  { path: 'src/App.tsx', role: 'Menu / showcase / editor routing; wires HUD + GameScene + hotkeys' },
  { path: 'src/game/useGameEngine.ts', role: 'React hook: selection, commands, camera, tick bridge' },
  { path: 'src/game/gameLogic.ts', role: 'initGame, production queue, combat, towers, research tick' },
  { path: 'src/game/GameController.ts', role: 'Keyboard + gamepad command routing (S/M/A/P/B, 1–0, F1–F3)' },
  { path: 'src/game/production.ts', role: 'BUILDING_ROSTER — which buildings queue which units' },
  { path: 'src/game/factions.ts', role: 'FACTION_THEME, DEFAULT_ENEMY_FOR, hero per house' },
  { path: 'src/game/upgrades.ts', role: 'Lab research defs + effective stat multipliers' },
  { path: 'src/game/UnitsCatalog.ts', role: 'Mesh catalog, UNIT_TYPE_ASSET, RTS_BUILDINGS' },
  { path: 'src/game/RtsAssetMap.ts', role: 'Deploy + mesh/icon reference export for verify scripts' },
  { path: 'src/game/IconManifest.ts', role: 'Unit/building/command PNG icons (local or R2 CDN)' },
  { path: 'src/game/gameHooks.ts', role: 'Event bus for custom scripts / integrations' },
  { path: 'src/components/game/GameScene.tsx', role: 'R3F scene: terrain, units, buildings, projectiles' },
  { path: 'src/components/game/HUD.tsx', role: 'RTS bottom bar, minimap, production panel' },
] as const;

export const BOOT_FLOW = [
  { step: 1, label: 'Boot', detail: 'main.tsx → App.tsx; optional ?play=1 / ?showcase=1 / ?editor=1 deep links' },
  { step: 2, label: 'Main menu', detail: 'Pick faction (Orange Star, Blue Moon, Green Earth, Yellow Comet) + map preset' },
  { step: 3, label: 'initGame()', detail: 'gameLogic spawns HQ, workers, faction hero; AI opponent from DEFAULT_ENEMY_FOR' },
  { step: 4, label: 'Economy', detail: 'Workers harvest → resourceBay storage; B opens hire/build panel' },
  { step: 5, label: 'Build', detail: 'Place structures (theme from FACTION_THEME: scifi / medieval / fantasy)' },
  { step: 6, label: 'Production', detail: 'Select producer → queue units (BUILDING_ROSTER); 1–0 quick-purchase' },
  { step: 7, label: 'Combat', detail: 'S/M/A/P commands; projectiles + VFX; towers auto-fire with upgrade range' },
  { step: 8, label: 'Research', detail: 'Lab queues UPGRADE_DEFS (infantry weapons → vehicle armor chain, etc.)' },
  { step: 9, label: 'Victory', detail: 'Destroy enemy HQ / eliminate forces; gameHooks emit events for extensions' },
] as const;

export const HOTKEYS = [
  { keys: 'S / M / A / P', action: 'Stop / Move / Attack / Patrol (selected units)' },
  { keys: 'B', action: 'Toggle hire & build panel' },
  { keys: '1–0', action: 'Quick-purchase unit from roster' },
  { keys: 'F1–F3', action: 'Select commander hero' },
  { keys: 'Tab / V', action: 'Cycle camera (RTS ↔ third ↔ first person)' },
  { keys: '`', action: 'Focus RTS map camera' },
  { keys: 'Ctrl+A', action: 'Select all friendly units' },
  { keys: 'WASD', action: 'Pan RTS camera (RTSCamera)' },
] as const;

export const FACTIONS = [
  { id: 'OrangeStar', label: 'Orange Star', theme: 'scifi', hero: 'toon:scout', infantry: 'toon:scout', enemy: 'BlackHole' },
  { id: 'BlueMoon', label: 'Blue Moon', theme: 'scifi', hero: 'toon:sniper', infantry: 'toon:sniper', enemy: 'YellowComet' },
  { id: 'GreenEarth', label: 'Green Earth', theme: 'medieval', hero: 'toon:medic', infantry: 'toon:infantry', enemy: 'BlackHole' },
  { id: 'YellowComet', label: 'Yellow Comet', theme: 'fantasy', hero: 'toon:gunner', infantry: 'toon:gunner', enemy: 'BlueMoon' },
  { id: 'BlackHole', label: 'Black Hole', theme: 'fantasy', hero: 'toon:engineer', infantry: 'toon:engineer', enemy: 'OrangeStar' },
] as const;

export const GLB_PACKS = [
  { key: 'toonSoldiers', file: 'toon_soliders_chicken_gun.glb', role: 'Heroes, infantry, workers (Toon skinned rigs)' },
  { key: 'dune1', file: 'emperor_battle_for_dune_-_models_part_1.glb', role: 'Atreides vehicles, air, workers, FX beams' },
  { key: 'dune2', file: 'emperor_battle_for_dune_-_models_part_2.glb', role: 'Harkonnen tanks, air, explosions' },
  { key: 'dune3', file: 'emperor_battle_for_dune_-_models_part_3.glb', role: 'Ordos stealth, artillery, naval proxies' },
  { key: 'necronBld', file: 'necron_build.glb', role: 'Sci-fi buildings (Orange Star / Blue Moon)' },
  { key: 'chaosBld', file: 'buld_chaos.glb', role: 'Medieval buildings (Green Earth)' },
  { key: 'chaos2Bld', file: 'buld_chao2s.glb', role: 'Fantasy buildings (Yellow Comet / Black Hole)' },
  { key: 'turret', file: 'animated_game-ready_turret.glb', role: 'Defense tower + antiAir mesh' },
] as const;

export const UNIT_MESH_MAP = [
  { unitType: 'hero', assetId: '(per faction)', glb: 'toon_soliders_chicken_gun.glb' },
  { unitType: 'worker', assetId: 'toon:engineer', glb: 'toon_soliders_chicken_gun.glb' },
  { unitType: 'infantry', assetId: '(per faction)', glb: 'toon_soliders_chicken_gun.glb' },
  { unitType: 'mech', assetId: 'dune:minotaurus', glb: 'emperor_battle_for_dune_-_models_part_1.glb' },
  { unitType: 'tank', assetId: 'dune:hk-assault', glb: 'emperor_battle_for_dune_-_models_part_2.glb' },
  { unitType: 'medTank', assetId: 'dune:hk-devastator', glb: 'emperor_battle_for_dune_-_models_part_2.glb' },
  { unitType: 'neoTank', assetId: 'dune:or-kobra', glb: 'emperor_battle_for_dune_-_models_part_3.glb' },
  { unitType: 'apc', assetId: 'dune:at-apc', glb: 'emperor_battle_for_dune_-_models_part_1.glb' },
  { unitType: 'artillery', assetId: 'dune:or-mortar', glb: 'emperor_battle_for_dune_-_models_part_3.glb' },
  { unitType: 'rocket', assetId: 'dune:hk-missile', glb: 'emperor_battle_for_dune_-_models_part_2.glb' },
  { unitType: 'antiAir', assetId: 'def:turret', glb: 'animated_game-ready_turret.glb' },
  { unitType: 'fighter', assetId: 'dune:at-orni', glb: 'emperor_battle_for_dune_-_models_part_1.glb' },
  { unitType: 'bomber', assetId: 'dune:hk-airgun', glb: 'emperor_battle_for_dune_-_models_part_2.glb' },
  { unitType: 'bCopter', assetId: 'dune:at-drone', glb: 'emperor_battle_for_dune_-_models_part_1.glb' },
  { unitType: 'tCopter', assetId: 'dune:hk-carryall', glb: 'emperor_battle_for_dune_-_models_part_2.glb' },
  { unitType: 'stealth', assetId: 'dune:or-deviator', glb: 'emperor_battle_for_dune_-_models_part_3.glb' },
  { unitType: 'battleship', assetId: 'dune:or-kobra', glb: 'emperor_battle_for_dune_-_models_part_3.glb' },
  { unitType: 'cruiser', assetId: 'dune:or-raider', glb: 'emperor_battle_for_dune_-_models_part_3.glb' },
  { unitType: 'submarine', assetId: 'dune:or-dustscout', glb: 'emperor_battle_for_dune_-_models_part_3.glb' },
  { unitType: 'carrier', assetId: 'dune:or-carryall', glb: 'emperor_battle_for_dune_-_models_part_3.glb' },
  { unitType: 'lander', assetId: 'dune:at-trike', glb: 'emperor_battle_for_dune_-_models_part_1.glb' },
] as const;

export const BUILDING_MESH_MAP = [
  { type: 'hq', scifi: 'necron buld.001_2', medieval: 'buld.004_5', fantasy: 'buld.007_9' },
  { type: 'city', scifi: 'necron buld.003_4', medieval: 'buld.005_6', fantasy: 'buld.002_4' },
  { type: 'factory', scifi: 'necron buld.004_5', medieval: 'buld2.003_10', fantasy: 'buld.010_12' },
  { type: 'airport', scifi: 'necron buld.005_6', medieval: 'buld2.006_13', fantasy: 'buld.004_6' },
  { type: 'port', scifi: 'necron buld.006_7', medieval: 'buld.003_4', fantasy: 'buld.003_5' },
  { type: 'lab', scifi: 'necron buld.007_8', medieval: 'buld.002_3', fantasy: 'buld.011_13' },
  { type: 'starport', scifi: 'necron buld.008_9', medieval: 'buld2.009_16', fantasy: 'buld.015_17' },
  { type: 'resourceBay', scifi: 'necron buld.009_10', medieval: 'buld.001_2', fantasy: 'buld.001_3' },
  { type: 'tower', scifi: 'animated_game-ready_turret (RootNode)', medieval: '—', fantasy: '—' },
] as const;

export const PRODUCTION_ROSTER = [
  { building: 'hq', units: 'worker, infantry' },
  { building: 'city', units: 'infantry, mech' },
  { building: 'factory', units: 'infantry, mech, tank, apc, artillery, antiAir, rocket, medTank' },
  { building: 'airport', units: 'bCopter, tCopter, fighter, bomber' },
  { building: 'port', units: 'battleship, cruiser, submarine, lander, blackBoat' },
  { building: 'starport', units: 'stealth, blackBomb, spaceship' },
] as const;

export const UPGRADES = [
  { id: 'infantryWeapons', label: 'Infantry Weapons', cost: 1200, effect: '+15% infantry/mech/hero damage' },
  { id: 'vehicleArmor', label: 'Vehicle Plating', cost: 1800, effect: '+20% tank/mech HP (requires Infantry Weapons)' },
  { id: 'airSpeed', label: 'Jet Fuel', cost: 2000, effect: '+12% air unit speed' },
  { id: 'harvestRate', label: 'Harvest Drones', cost: 900, effect: '+25% worker harvest' },
  { id: 'towerRange', label: 'Turret Optics', cost: 1100, effect: '+25% tower range' },
] as const;

export const TEXTURE_SOURCES = [
  { layer: 'RTS meshes', source: 'Embedded PBR inside each GLB; normalized at runtime via glbMaterials.fixPbrMaterials' },
  { layer: 'Environment', source: '/models/converted/environment/ 2k glTF packs (MODEL_BASE)' },
  { layer: 'UI icons', source: 'public/icons/ + public/ui/ — local or assets.grudge-studio.com when VITE_USE_R2=true' },
] as const;