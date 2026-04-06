import { aiChat, isPuterAvailable } from './puter';

export interface SceneAsset {
  name: string;
  path: string;
  category: string;
  subcategory: string;
  tags: string[];
  animations?: string[];
  scale?: number;
  isAnimated?: boolean;
}

export interface SceneObject {
  id: string;
  name: string;
  assetPath: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  animation?: string;
  tags?: string[];
}

export interface GeneratedScene {
  name: string;
  description: string;
  theme: string;
  objects: SceneObject[];
  lighting: {
    ambient: { color: string; intensity: number };
    directional: { color: string; intensity: number; direction: { x: number; y: number; z: number } };
  };
  environment: {
    skyColor: string;
    groundColor: string;
    fogEnabled: boolean;
    fogColor?: string;
    fogDensity?: number;
  };
}

export const ASSET_DATABASE: SceneAsset[] = [
  // Kenney Pirate Kit (66 assets)
  { name: "Barrel", path: "/assets/kenney-pirate/barrel.glb", category: "props", subcategory: "containers", tags: ["pirate", "storage", "wood", "dock"] },
  { name: "Barrel Group", path: "/assets/kenney-pirate/barrel-group.glb", category: "props", subcategory: "containers", tags: ["pirate", "storage", "wood", "dock", "group"] },
  { name: "Boat Large", path: "/assets/kenney-pirate/boat-large.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "water", "transport", "boat"] },
  { name: "Boat Row", path: "/assets/kenney-pirate/boat-row.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "water", "transport", "small"] },
  { name: "Boat Small", path: "/assets/kenney-pirate/boat-small.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "water", "transport", "small"] },
  { name: "Cannon", path: "/assets/kenney-pirate/cannon.glb", category: "weapons", subcategory: "artillery", tags: ["pirate", "combat", "ship", "defense"] },
  { name: "Cannon Balls", path: "/assets/kenney-pirate/cannon-balls.glb", category: "props", subcategory: "ammunition", tags: ["pirate", "combat", "ammunition"] },
  { name: "Chest", path: "/assets/kenney-pirate/chest.glb", category: "props", subcategory: "containers", tags: ["pirate", "treasure", "storage", "loot"] },
  { name: "Chest Gold", path: "/assets/kenney-pirate/chest-gold.glb", category: "props", subcategory: "containers", tags: ["pirate", "treasure", "gold", "loot", "valuable"] },
  { name: "Crate", path: "/assets/kenney-pirate/crate.glb", category: "props", subcategory: "containers", tags: ["pirate", "storage", "cargo", "wood"] },
  { name: "Dock Corner", path: "/assets/kenney-pirate/dock-corner.glb", category: "structures", subcategory: "docks", tags: ["pirate", "water", "platform", "corner"] },
  { name: "Dock Straight", path: "/assets/kenney-pirate/dock-straight.glb", category: "structures", subcategory: "docks", tags: ["pirate", "water", "platform"] },
  { name: "Flag Pirate", path: "/assets/kenney-pirate/flag-pirate.glb", category: "props", subcategory: "flags", tags: ["pirate", "decoration", "skull", "banner"] },
  { name: "Palm Tree", path: "/assets/kenney-pirate/palm-tree.glb", category: "nature", subcategory: "trees", tags: ["tropical", "island", "beach", "vegetation"] },
  { name: "Palm Tree Bent", path: "/assets/kenney-pirate/palm-tree-bent.glb", category: "nature", subcategory: "trees", tags: ["tropical", "island", "beach", "vegetation"] },
  { name: "Rock Formation", path: "/assets/kenney-pirate/rock-formation.glb", category: "nature", subcategory: "rocks", tags: ["island", "terrain", "environment"] },
  { name: "Ship Dark", path: "/assets/kenney-pirate/ship-dark.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "large", "transport", "ocean"] },
  { name: "Ship Light", path: "/assets/kenney-pirate/ship-light.glb", category: "vehicles", subcategory: "ships", tags: ["pirate", "large", "transport", "ocean"] },
  { name: "Ship Wreck", path: "/assets/kenney-pirate/ship-wreck.glb", category: "structures", subcategory: "ruins", tags: ["pirate", "destroyed", "beach", "abandoned"] },
  { name: "Sword", path: "/assets/kenney-pirate/sword.glb", category: "weapons", subcategory: "melee", tags: ["pirate", "combat", "blade"] },
  
  // Racalvin Warrior (52 Mixamo animations - player character)
  { name: "Orc Warrior", path: "/assets/racalvin-warrior/character-model.glb", category: "characters", subcategory: "player", tags: ["warrior", "orc", "player", "combat", "melee", "fantasy", "hero"], animations: ["idle","walk","run","sprint","jump","slash","heavy-attack","block","crouch","dodge","kick","cast","power-up","draw-sword","sheath-sword","death"], isAnimated: true },

  // Quaternius Monsters (4 animated)
  { name: "Bat", path: "/assets/quaternius-monsters/Bat.glb", category: "characters", subcategory: "monsters", tags: ["flying", "enemy", "creature", "cave", "night"], animations: ["Bat_Attack", "Bat_Attack2", "Bat_Death", "Bat_Flying", "Bat_Hit"], isAnimated: true },
  { name: "Dragon", path: "/assets/quaternius-monsters/Dragon.glb", category: "characters", subcategory: "monsters", tags: ["flying", "boss", "creature", "fantasy", "fire"], animations: ["Dragon_Attack", "Dragon_Attack2", "Dragon_Death", "Dragon_Flying", "Dragon_Hit"], isAnimated: true },
  { name: "Skeleton", path: "/assets/quaternius-monsters/Skeleton.glb", category: "characters", subcategory: "undead", tags: ["enemy", "undead", "dungeon", "warrior"], animations: ["Skeleton_Attack", "Skeleton_Death", "Skeleton_Idle", "Skeleton_Running", "Skeleton_Spawn"], isAnimated: true },
  { name: "Slime", path: "/assets/quaternius-monsters/Slime.glb", category: "characters", subcategory: "monsters", tags: ["enemy", "creature", "simple", "dungeon"], animations: ["Slime_Attack", "Slime_Death", "Slime_Idle", "Slime_Walk"], isAnimated: true },

  // Easy Enemies (6 animated)
  { name: "Frog", path: "/assets/easy-enemies/Frog.glb", category: "characters", subcategory: "creatures", tags: ["animal", "swamp", "enemy", "nature"], animations: ["Frog_Attack", "Frog_Death", "Frog_Idle", "Frog_Jump"], isAnimated: true },
  { name: "Rat", path: "/assets/easy-enemies/Rat.glb", category: "characters", subcategory: "creatures", tags: ["animal", "dungeon", "enemy", "pest"], animations: ["Rat_Attack", "Rat_Death", "Rat_Idle", "Rat_Jump", "Rat_Run", "Rat_Walk"], isAnimated: true },
  { name: "Snake", path: "/assets/easy-enemies/Snake.glb", category: "characters", subcategory: "creatures", tags: ["animal", "enemy", "desert", "nature"], animations: ["Snake_Attack", "Snake_Idle", "Snake_Jump", "Snake_Walk"], isAnimated: true },
  { name: "Snake Angry", path: "/assets/easy-enemies/Snake_angry.glb", category: "characters", subcategory: "creatures", tags: ["animal", "enemy", "aggressive", "desert"], animations: ["Snake_Attack", "Snake_Idle", "Snake_Jump", "Snake_Walk"], isAnimated: true },
  { name: "Spider", path: "/assets/easy-enemies/Spider.glb", category: "characters", subcategory: "creatures", tags: ["animal", "enemy", "cave", "dungeon", "creepy"], animations: ["Spider_Attack", "Spider_Death", "Spider_Idle", "Spider_Jump", "Spider_Walk"], isAnimated: true },
  { name: "Wasp", path: "/assets/easy-enemies/Wasp.glb", category: "characters", subcategory: "creatures", tags: ["flying", "enemy", "insect", "nature"], animations: ["Wasp_Attack", "Wasp_Death", "Wasp_Flying"], isAnimated: true },

  // Men Characters (8 animated)
  { name: "Male Casual", path: "/assets/men-characters/Male_Casual.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Male Long Sleeve", path: "/assets/men-characters/Male_LongSleeve.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Male Shirt", path: "/assets/men-characters/Male_Shirt.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Male Suit", path: "/assets/men-characters/Male_Suit.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "businessman", "formal"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Smooth Male Casual", path: "/assets/men-characters/Smooth_Male_Casual.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern", "highpoly"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Smooth Male Long Sleeve", path: "/assets/men-characters/Smooth_Male_LongSleeve.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern", "highpoly"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Smooth Male Shirt", path: "/assets/men-characters/Smooth_Male_Shirt.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "civilian", "modern", "highpoly"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },
  { name: "Smooth Male Suit", path: "/assets/men-characters/Smooth_Male_Suit.glb", category: "characters", subcategory: "humans", tags: ["human", "npc", "businessman", "formal", "highpoly"], animations: ["Man_Clapping", "Man_Death", "Man_Idle", "Man_Jump", "Man_Punch", "Man_Run", "Man_RunningJump", "Man_Sitting", "Man_Standing", "Man_SwordSlash", "Man_Walk"], isAnimated: true },

  // Survival Props (selection of key items)
  { name: "Axe", path: "/assets/survival-props/Axe.glb", category: "weapons", subcategory: "tools", tags: ["survival", "tool", "wood", "chop"] },
  { name: "Bow", path: "/assets/survival-props/Bow.glb", category: "weapons", subcategory: "ranged", tags: ["survival", "hunting", "combat"] },
  { name: "Campfire", path: "/assets/survival-props/Fire.glb", category: "props", subcategory: "effects", tags: ["survival", "camping", "light", "warmth"] },
  { name: "Tent", path: "/assets/survival-props/Tent.glb", category: "structures", subcategory: "camping", tags: ["survival", "shelter", "camping"] },
  { name: "Knife", path: "/assets/survival-props/Knife.glb", category: "weapons", subcategory: "melee", tags: ["survival", "tool", "combat"] },
  { name: "Lantern", path: "/assets/survival-props/Lantern.glb", category: "props", subcategory: "lighting", tags: ["survival", "light", "night"] },
  { name: "Hammock", path: "/assets/survival-props/Hammock.glb", category: "props", subcategory: "furniture", tags: ["survival", "rest", "camping"] },
  { name: "Fishing Rod", path: "/assets/survival-props/Fishing_Rod.glb", category: "props", subcategory: "tools", tags: ["survival", "fishing", "food"] },
  { name: "Compass", path: "/assets/survival-props/Compass.glb", category: "props", subcategory: "navigation", tags: ["survival", "exploration", "navigation"] },
  { name: "Map", path: "/assets/survival-props/Map.glb", category: "props", subcategory: "navigation", tags: ["survival", "exploration", "navigation"] },

  // Environment Scenes
  { name: "Floating Town", path: "/assets/environments/floating-town/scene.gltf", category: "environments", subcategory: "fantasy", tags: ["town", "floating", "fantasy", "complete"] },
  { name: "Pirate Adventure Map", path: "/assets/environments/pirate-map/scene.gltf", category: "environments", subcategory: "adventure", tags: ["pirate", "island", "adventure", "complete"] },
  { name: "Pirate Hunter Character", path: "/assets/environments/pirate-hunter/scene.gltf", category: "characters", subcategory: "humans", tags: ["pirate", "hunter", "viking", "medieval"] },
  { name: "Fantasy Island", path: "/assets/environments/fantasy-island/scene.gltf", category: "environments", subcategory: "fantasy", tags: ["island", "fantasy", "nature", "complete"] },

  // Kenney Prototype Kit (145 assets)
  { name: "Animal Bison", path: "/assets/kenney-prototype/animal-bison.glb", category: "characters", subcategory: "animals", tags: ["prototype", "animal"] },
  { name: "Animal Dog", path: "/assets/kenney-prototype/animal-dog.glb", category: "characters", subcategory: "animals", tags: ["prototype", "animal"] },
  { name: "Animal Horse", path: "/assets/kenney-prototype/animal-horse.glb", category: "characters", subcategory: "animals", tags: ["prototype", "animal"] },
  { name: "Button Floor Round", path: "/assets/kenney-prototype/button-floor-round.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Button Floor Round Small", path: "/assets/kenney-prototype/button-floor-round-small.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Button Floor Square", path: "/assets/kenney-prototype/button-floor-square.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Button Floor Square Small", path: "/assets/kenney-prototype/button-floor-square-small.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Coin", path: "/assets/kenney-prototype/coin.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Column", path: "/assets/kenney-prototype/column.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Low", path: "/assets/kenney-prototype/column-low.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Rounded", path: "/assets/kenney-prototype/column-rounded.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Rounded Low", path: "/assets/kenney-prototype/column-rounded-low.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Triangle", path: "/assets/kenney-prototype/column-triangle.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Column Triangle Low", path: "/assets/kenney-prototype/column-triangle-low.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Crate", path: "/assets/kenney-prototype/crate.glb", category: "props", subcategory: "containers", tags: ["prototype", "storage"] },
  { name: "Crate Color", path: "/assets/kenney-prototype/crate-color.glb", category: "props", subcategory: "containers", tags: ["prototype", "storage"] },
  { name: "Door Garage", path: "/assets/kenney-prototype/door-garage.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Rotate", path: "/assets/kenney-prototype/door-rotate.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Sliding", path: "/assets/kenney-prototype/door-sliding.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Sliding Double", path: "/assets/kenney-prototype/door-sliding-double.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Sliding Double Round", path: "/assets/kenney-prototype/door-sliding-double-round.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Door Sliding Double Wide", path: "/assets/kenney-prototype/door-sliding-double-wide.glb", category: "structures", subcategory: "doors", tags: ["prototype", "building", "interactive"] },
  { name: "Figurine", path: "/assets/kenney-prototype/figurine.glb", category: "characters", subcategory: "npcs", tags: ["prototype", "character"] },
  { name: "Figurine Cube", path: "/assets/kenney-prototype/figurine-cube.glb", category: "characters", subcategory: "npcs", tags: ["prototype", "character"] },
  { name: "Figurine Cube Detailed", path: "/assets/kenney-prototype/figurine-cube-detailed.glb", category: "characters", subcategory: "npcs", tags: ["prototype", "character"] },
  { name: "Figurine Large", path: "/assets/kenney-prototype/figurine-large.glb", category: "characters", subcategory: "npcs", tags: ["prototype", "character"] },
  { name: "Flag", path: "/assets/kenney-prototype/flag.glb", category: "props", subcategory: "decorations", tags: ["prototype", "flag"] },
  { name: "Floor Diagonal", path: "/assets/kenney-prototype/floor-diagonal.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Small Diagonal", path: "/assets/kenney-prototype/floor-small-diagonal.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Small Square", path: "/assets/kenney-prototype/floor-small-square.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Square", path: "/assets/kenney-prototype/floor-square.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Thick", path: "/assets/kenney-prototype/floor-thick.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Thick Corner Diagonal", path: "/assets/kenney-prototype/floor-thick-corner-diagonal.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Thick Corner Round", path: "/assets/kenney-prototype/floor-thick-corner-round.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Floor Thick Corner Rounded", path: "/assets/kenney-prototype/floor-thick-corner-rounded.glb", category: "structures", subcategory: "floors", tags: ["prototype", "building", "floor"] },
  { name: "Hat Cap", path: "/assets/kenney-prototype/hat-cap.glb", category: "props", subcategory: "clothing", tags: ["prototype", "wearable"] },
  { name: "Hat Hard", path: "/assets/kenney-prototype/hat-hard.glb", category: "props", subcategory: "clothing", tags: ["prototype", "wearable"] },
  { name: "Indicator Doorway", path: "/assets/kenney-prototype/indicator-doorway.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round A", path: "/assets/kenney-prototype/indicator-round-a.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round B", path: "/assets/kenney-prototype/indicator-round-b.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round C", path: "/assets/kenney-prototype/indicator-round-c.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round D", path: "/assets/kenney-prototype/indicator-round-d.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round E", path: "/assets/kenney-prototype/indicator-round-e.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Round F", path: "/assets/kenney-prototype/indicator-round-f.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Special Area", path: "/assets/kenney-prototype/indicator-special-area.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Special Arrow", path: "/assets/kenney-prototype/indicator-special-arrow.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Special Cross", path: "/assets/kenney-prototype/indicator-special-cross.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Special Lines", path: "/assets/kenney-prototype/indicator-special-lines.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square A", path: "/assets/kenney-prototype/indicator-square-a.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square B", path: "/assets/kenney-prototype/indicator-square-b.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square C", path: "/assets/kenney-prototype/indicator-square-c.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square D", path: "/assets/kenney-prototype/indicator-square-d.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square E", path: "/assets/kenney-prototype/indicator-square-e.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Indicator Square F", path: "/assets/kenney-prototype/indicator-square-f.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Ladder", path: "/assets/kenney-prototype/ladder.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "climbing"] },
  { name: "Ladder Color", path: "/assets/kenney-prototype/ladder-color.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "climbing"] },
  { name: "Ladder Top", path: "/assets/kenney-prototype/ladder-top.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "climbing"] },
  { name: "Lever Double", path: "/assets/kenney-prototype/lever-double.glb", category: "props", subcategory: "interactive", tags: ["prototype", "mechanism"] },
  { name: "Lever Single", path: "/assets/kenney-prototype/lever-single.glb", category: "props", subcategory: "interactive", tags: ["prototype", "mechanism"] },
  { name: "Number 0", path: "/assets/kenney-prototype/number-0.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 1", path: "/assets/kenney-prototype/number-1.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 2", path: "/assets/kenney-prototype/number-2.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 3", path: "/assets/kenney-prototype/number-3.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 4", path: "/assets/kenney-prototype/number-4.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 5", path: "/assets/kenney-prototype/number-5.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 6", path: "/assets/kenney-prototype/number-6.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 7", path: "/assets/kenney-prototype/number-7.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 8", path: "/assets/kenney-prototype/number-8.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number 9", path: "/assets/kenney-prototype/number-9.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 0", path: "/assets/kenney-prototype/number-double-0.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 1", path: "/assets/kenney-prototype/number-double-1.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 2", path: "/assets/kenney-prototype/number-double-2.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 3", path: "/assets/kenney-prototype/number-double-3.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 4", path: "/assets/kenney-prototype/number-double-4.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 5", path: "/assets/kenney-prototype/number-double-5.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 6", path: "/assets/kenney-prototype/number-double-6.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 7", path: "/assets/kenney-prototype/number-double-7.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 8", path: "/assets/kenney-prototype/number-double-8.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Number Double 9", path: "/assets/kenney-prototype/number-double-9.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Pipe", path: "/assets/kenney-prototype/pipe.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Corner", path: "/assets/kenney-prototype/pipe-corner.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Half", path: "/assets/kenney-prototype/pipe-half.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Half Section", path: "/assets/kenney-prototype/pipe-half-section.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Section", path: "/assets/kenney-prototype/pipe-section.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Pipe Split", path: "/assets/kenney-prototype/pipe-split.glb", category: "structures", subcategory: "support", tags: ["prototype", "building"] },
  { name: "Shape Cube", path: "/assets/kenney-prototype/shape-cube.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cube Half", path: "/assets/kenney-prototype/shape-cube-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cube Rounded", path: "/assets/kenney-prototype/shape-cube-rounded.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cylinder", path: "/assets/kenney-prototype/shape-cylinder.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cylinder Detailed", path: "/assets/kenney-prototype/shape-cylinder-detailed.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cylinder Half", path: "/assets/kenney-prototype/shape-cylinder-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Cylinder Half Detailed", path: "/assets/kenney-prototype/shape-cylinder-half-detailed.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hexagon", path: "/assets/kenney-prototype/shape-hexagon.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hexagon Half", path: "/assets/kenney-prototype/shape-hexagon-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Cylinder", path: "/assets/kenney-prototype/shape-hollow-cylinder.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Cylinder Detailed", path: "/assets/kenney-prototype/shape-hollow-cylinder-detailed.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Cylinder Half", path: "/assets/kenney-prototype/shape-hollow-cylinder-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Cylinder Half Detailed", path: "/assets/kenney-prototype/shape-hollow-cylinder-half-detailed.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Hexagon", path: "/assets/kenney-prototype/shape-hollow-hexagon.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Hollow Hexagon Half", path: "/assets/kenney-prototype/shape-hollow-hexagon-half.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Slope", path: "/assets/kenney-prototype/shape-slope.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Triangular Prism", path: "/assets/kenney-prototype/shape-triangular-prism.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Shape Triangular Prism Low", path: "/assets/kenney-prototype/shape-triangular-prism-low.glb", category: "structures", subcategory: "primitives", tags: ["prototype", "shape", "building"] },
  { name: "Stairs", path: "/assets/kenney-prototype/stairs.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Diagonal", path: "/assets/kenney-prototype/stairs-diagonal.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Diagonal Narrow", path: "/assets/kenney-prototype/stairs-diagonal-narrow.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Diagonal Small", path: "/assets/kenney-prototype/stairs-diagonal-small.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Diagonal Small Narrow", path: "/assets/kenney-prototype/stairs-diagonal-small-narrow.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Narrow", path: "/assets/kenney-prototype/stairs-narrow.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Small", path: "/assets/kenney-prototype/stairs-small.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Stairs Small Narrow", path: "/assets/kenney-prototype/stairs-small-narrow.glb", category: "structures", subcategory: "traversal", tags: ["prototype", "building", "stairs"] },
  { name: "Target A Round", path: "/assets/kenney-prototype/target-a-round.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Target A Square", path: "/assets/kenney-prototype/target-a-square.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Target B Round", path: "/assets/kenney-prototype/target-b-round.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Target B Square", path: "/assets/kenney-prototype/target-b-square.glb", category: "props", subcategory: "markers", tags: ["prototype", "marker", "level-design"] },
  { name: "Vehicle", path: "/assets/kenney-prototype/vehicle.glb", category: "vehicles", subcategory: "ground", tags: ["prototype", "vehicle"] },
  { name: "Vehicle Convertible", path: "/assets/kenney-prototype/vehicle-convertible.glb", category: "vehicles", subcategory: "ground", tags: ["prototype", "vehicle"] },
  { name: "Wall", path: "/assets/kenney-prototype/wall.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Corner", path: "/assets/kenney-prototype/wall-corner.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Corner Low", path: "/assets/kenney-prototype/wall-corner-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Corner Rounded", path: "/assets/kenney-prototype/wall-corner-rounded.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Corner Rounded Low", path: "/assets/kenney-prototype/wall-corner-rounded-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Diagonal", path: "/assets/kenney-prototype/wall-diagonal.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Diagonal Low", path: "/assets/kenney-prototype/wall-diagonal-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway", path: "/assets/kenney-prototype/wall-doorway.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Garage", path: "/assets/kenney-prototype/wall-doorway-garage.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Round", path: "/assets/kenney-prototype/wall-doorway-round.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Sliding", path: "/assets/kenney-prototype/wall-doorway-sliding.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Wide", path: "/assets/kenney-prototype/wall-doorway-wide.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Doorway Wide Sliding", path: "/assets/kenney-prototype/wall-doorway-wide-sliding.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Low", path: "/assets/kenney-prototype/wall-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Round", path: "/assets/kenney-prototype/wall-round.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Round Low", path: "/assets/kenney-prototype/wall-round-low.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Barred Large", path: "/assets/kenney-prototype/wall-window-barred-large.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Barred Medium", path: "/assets/kenney-prototype/wall-window-barred-medium.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Barred Small", path: "/assets/kenney-prototype/wall-window-barred-small.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Cutout Large", path: "/assets/kenney-prototype/wall-window-cutout-large.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Cutout Medium", path: "/assets/kenney-prototype/wall-window-cutout-medium.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Cutout Small", path: "/assets/kenney-prototype/wall-window-cutout-small.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Large", path: "/assets/kenney-prototype/wall-window-large.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Medium", path: "/assets/kenney-prototype/wall-window-medium.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Wall Window Small", path: "/assets/kenney-prototype/wall-window-small.glb", category: "structures", subcategory: "walls", tags: ["prototype", "building", "wall"] },
  { name: "Weapon Shield", path: "/assets/kenney-prototype/weapon-shield.glb", category: "weapons", subcategory: "melee", tags: ["prototype", "combat"] },
  { name: "Weapon Sword", path: "/assets/kenney-prototype/weapon-sword.glb", category: "weapons", subcategory: "melee", tags: ["prototype", "combat"] },
  { name: "Wheelchair", path: "/assets/kenney-prototype/wheelchair.glb", category: "vehicles", subcategory: "ground", tags: ["prototype", "vehicle"] },

  // Kenney Medieval Kit (105 assets)
  { name: "Barrels", path: "/assets/kenney-medieval/barrels.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Battlement", path: "/assets/kenney-medieval/battlement.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "defense"] },
  { name: "Battlement Corner Inner", path: "/assets/kenney-medieval/battlement-corner-inner.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "defense"] },
  { name: "Battlement Corner Outer", path: "/assets/kenney-medieval/battlement-corner-outer.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "defense"] },
  { name: "Battlement Half", path: "/assets/kenney-medieval/battlement-half.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "defense"] },
  { name: "Bricks", path: "/assets/kenney-medieval/bricks.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column", path: "/assets/kenney-medieval/column.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column Damaged", path: "/assets/kenney-medieval/column-damaged.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column Paint", path: "/assets/kenney-medieval/column-paint.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column Paint Damaged", path: "/assets/kenney-medieval/column-paint-damaged.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Column Wood", path: "/assets/kenney-medieval/column-wood.glb", category: "structures", subcategory: "support", tags: ["medieval", "building"] },
  { name: "Detail Barrel", path: "/assets/kenney-medieval/detail-barrel.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Detail Crate", path: "/assets/kenney-medieval/detail-crate.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Detail Crate Ropes", path: "/assets/kenney-medieval/detail-crate-ropes.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Detail Crate Small", path: "/assets/kenney-medieval/detail-crate-small.glb", category: "props", subcategory: "containers", tags: ["medieval", "storage"] },
  { name: "Dock Corner", path: "/assets/kenney-medieval/dock-corner.glb", category: "structures", subcategory: "docks", tags: ["medieval", "water", "dock"] },
  { name: "Dock Side", path: "/assets/kenney-medieval/dock-side.glb", category: "structures", subcategory: "docks", tags: ["medieval", "water", "dock"] },
  { name: "Fence", path: "/assets/kenney-medieval/fence.glb", category: "structures", subcategory: "fences", tags: ["medieval", "boundary"] },
  { name: "Fence Top", path: "/assets/kenney-medieval/fence-top.glb", category: "structures", subcategory: "fences", tags: ["medieval", "boundary"] },
  { name: "Fence Wood", path: "/assets/kenney-medieval/fence-wood.glb", category: "structures", subcategory: "fences", tags: ["medieval", "boundary"] },
  { name: "Floor", path: "/assets/kenney-medieval/floor.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Flat", path: "/assets/kenney-medieval/floor-flat.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Stairs", path: "/assets/kenney-medieval/floor-stairs.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Stairs Corner Inner", path: "/assets/kenney-medieval/floor-stairs-corner-inner.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Stairs Corner Outer", path: "/assets/kenney-medieval/floor-stairs-corner-outer.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Steps", path: "/assets/kenney-medieval/floor-steps.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Steps Corner Inner", path: "/assets/kenney-medieval/floor-steps-corner-inner.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Floor Steps Corner Outer", path: "/assets/kenney-medieval/floor-steps-corner-outer.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building"] },
  { name: "Ladder", path: "/assets/kenney-medieval/ladder.glb", category: "structures", subcategory: "traversal", tags: ["medieval", "building"] },
  { name: "Overhang", path: "/assets/kenney-medieval/overhang.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Overhang Fence", path: "/assets/kenney-medieval/overhang-fence.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Overhang Round", path: "/assets/kenney-medieval/overhang-round.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Overhang Round Railing", path: "/assets/kenney-medieval/overhang-round-railing.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Pulley", path: "/assets/kenney-medieval/pulley.glb", category: "props", subcategory: "mechanism", tags: ["medieval", "interactive"] },
  { name: "Pulley Crate", path: "/assets/kenney-medieval/pulley-crate.glb", category: "props", subcategory: "mechanism", tags: ["medieval", "interactive"] },
  { name: "Roof", path: "/assets/kenney-medieval/roof.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Corner", path: "/assets/kenney-medieval/roof-corner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Edge", path: "/assets/kenney-medieval/roof-edge.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof High Side", path: "/assets/kenney-medieval/roof-high-side.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof High Side Corner", path: "/assets/kenney-medieval/roof-high-side-corner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof High Side Corner Inner", path: "/assets/kenney-medieval/roof-high-side-corner-inner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Side", path: "/assets/kenney-medieval/roof-side.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Side Corner", path: "/assets/kenney-medieval/roof-side-corner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Roof Side Corner Inner", path: "/assets/kenney-medieval/roof-side-corner-inner.glb", category: "structures", subcategory: "roofing", tags: ["medieval", "building"] },
  { name: "Stairs Corner", path: "/assets/kenney-medieval/stairs-corner.glb", category: "structures", subcategory: "traversal", tags: ["medieval", "building"] },
  { name: "Stairs Stone", path: "/assets/kenney-medieval/stairs-stone.glb", category: "structures", subcategory: "traversal", tags: ["medieval", "building"] },
  { name: "Stairs Wood", path: "/assets/kenney-medieval/stairs-wood.glb", category: "structures", subcategory: "traversal", tags: ["medieval", "building"] },
  { name: "Structure", path: "/assets/kenney-medieval/structure.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Cross", path: "/assets/kenney-medieval/structure-cross.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Pole", path: "/assets/kenney-medieval/structure-pole.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Poles", path: "/assets/kenney-medieval/structure-poles.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Wall", path: "/assets/kenney-medieval/structure-wall.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Structure Wall Cross", path: "/assets/kenney-medieval/structure-wall-cross.glb", category: "structures", subcategory: "framework", tags: ["medieval", "building"] },
  { name: "Tower", path: "/assets/kenney-medieval/tower.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Base", path: "/assets/kenney-medieval/tower-base.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Edge", path: "/assets/kenney-medieval/tower-edge.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Paint", path: "/assets/kenney-medieval/tower-paint.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Paint Base", path: "/assets/kenney-medieval/tower-paint-base.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tower Top", path: "/assets/kenney-medieval/tower-top.glb", category: "structures", subcategory: "fortification", tags: ["medieval", "castle", "tower"] },
  { name: "Tree Large", path: "/assets/kenney-medieval/tree-large.glb", category: "environments", subcategory: "vegetation", tags: ["medieval", "nature"] },
  { name: "Tree Shrub", path: "/assets/kenney-medieval/tree-shrub.glb", category: "environments", subcategory: "vegetation", tags: ["medieval", "nature"] },
  { name: "Wall", path: "/assets/kenney-medieval/wall.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Detail", path: "/assets/kenney-medieval/wall-detail.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Door", path: "/assets/kenney-medieval/wall-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Flat Gate", path: "/assets/kenney-medieval/wall-flat-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified", path: "/assets/kenney-medieval/wall-fortified.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Door", path: "/assets/kenney-medieval/wall-fortified-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Gate", path: "/assets/kenney-medieval/wall-fortified-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Gate Half", path: "/assets/kenney-medieval/wall-fortified-gate-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Half", path: "/assets/kenney-medieval/wall-fortified-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint", path: "/assets/kenney-medieval/wall-fortified-paint.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint Door", path: "/assets/kenney-medieval/wall-fortified-paint-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint Gate", path: "/assets/kenney-medieval/wall-fortified-paint-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint Half", path: "/assets/kenney-medieval/wall-fortified-paint-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Paint Window", path: "/assets/kenney-medieval/wall-fortified-paint-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Fortified Window", path: "/assets/kenney-medieval/wall-fortified-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Gate", path: "/assets/kenney-medieval/wall-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Gate Half", path: "/assets/kenney-medieval/wall-gate-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Half", path: "/assets/kenney-medieval/wall-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Low", path: "/assets/kenney-medieval/wall-low.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint", path: "/assets/kenney-medieval/wall-paint.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Detail", path: "/assets/kenney-medieval/wall-paint-detail.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Door", path: "/assets/kenney-medieval/wall-paint-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Flat", path: "/assets/kenney-medieval/wall-paint-flat.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Gate", path: "/assets/kenney-medieval/wall-paint-gate.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Half", path: "/assets/kenney-medieval/wall-paint-half.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Paint Window", path: "/assets/kenney-medieval/wall-paint-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane", path: "/assets/kenney-medieval/wall-pane.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Door", path: "/assets/kenney-medieval/wall-pane-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Paint", path: "/assets/kenney-medieval/wall-pane-paint.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Paint Door", path: "/assets/kenney-medieval/wall-pane-paint-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Painted Wood", path: "/assets/kenney-medieval/wall-pane-painted-wood.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Painted Wood Door", path: "/assets/kenney-medieval/wall-pane-painted-wood-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Painted Wood Window", path: "/assets/kenney-medieval/wall-pane-painted-wood-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Paint Window", path: "/assets/kenney-medieval/wall-pane-paint-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Window", path: "/assets/kenney-medieval/wall-pane-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Wood", path: "/assets/kenney-medieval/wall-pane-wood.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Wood Door", path: "/assets/kenney-medieval/wall-pane-wood-door.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Pane Wood Window", path: "/assets/kenney-medieval/wall-pane-wood-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Wall Window", path: "/assets/kenney-medieval/wall-window.glb", category: "structures", subcategory: "walls", tags: ["medieval", "building", "wall"] },
  { name: "Water", path: "/assets/kenney-medieval/water.glb", category: "environments", subcategory: "water", tags: ["medieval", "water"] },
  { name: "Wood Floor", path: "/assets/kenney-medieval/wood-floor.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building", "wood"] },
  { name: "Wood Floor Half", path: "/assets/kenney-medieval/wood-floor-half.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building", "wood"] },
  { name: "Wood Floor Quarter", path: "/assets/kenney-medieval/wood-floor-quarter.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building", "wood"] },
  { name: "Wood Floor Railing", path: "/assets/kenney-medieval/wood-floor-railing.glb", category: "structures", subcategory: "floors", tags: ["medieval", "building", "wood"] },

  // Kenney Dungeon Kit (37 assets)
  { name: "Corridor", path: "/assets/kenney-dungeon/corridor.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Corner", path: "/assets/kenney-dungeon/corridor-corner.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor End", path: "/assets/kenney-dungeon/corridor-end.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Intersection", path: "/assets/kenney-dungeon/corridor-intersection.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Junction", path: "/assets/kenney-dungeon/corridor-junction.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Transition", path: "/assets/kenney-dungeon/corridor-transition.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide", path: "/assets/kenney-dungeon/corridor-wide.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide Corner", path: "/assets/kenney-dungeon/corridor-wide-corner.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide End", path: "/assets/kenney-dungeon/corridor-wide-end.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide Intersection", path: "/assets/kenney-dungeon/corridor-wide-intersection.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Corridor Wide Junction", path: "/assets/kenney-dungeon/corridor-wide-junction.glb", category: "structures", subcategory: "corridors", tags: ["dungeon", "corridor", "underground"] },
  { name: "Gate", path: "/assets/kenney-dungeon/gate.glb", category: "structures", subcategory: "doors", tags: ["dungeon", "gate", "entrance"] },
  { name: "Gate Door", path: "/assets/kenney-dungeon/gate-door.glb", category: "structures", subcategory: "doors", tags: ["dungeon", "gate", "entrance"] },
  { name: "Gate Door Window", path: "/assets/kenney-dungeon/gate-door-window.glb", category: "structures", subcategory: "doors", tags: ["dungeon", "gate", "entrance"] },
  { name: "Room Corner", path: "/assets/kenney-dungeon/room-corner.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Large", path: "/assets/kenney-dungeon/room-large.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Large Variation", path: "/assets/kenney-dungeon/room-large-variation.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Small", path: "/assets/kenney-dungeon/room-small.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Small Variation", path: "/assets/kenney-dungeon/room-small-variation.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Wide", path: "/assets/kenney-dungeon/room-wide.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Room Wide Variation", path: "/assets/kenney-dungeon/room-wide-variation.glb", category: "structures", subcategory: "rooms", tags: ["dungeon", "room", "underground"] },
  { name: "Stairs", path: "/assets/kenney-dungeon/stairs.glb", category: "structures", subcategory: "traversal", tags: ["dungeon", "stairs", "underground"] },
  { name: "Stairs Wide", path: "/assets/kenney-dungeon/stairs-wide.glb", category: "structures", subcategory: "traversal", tags: ["dungeon", "stairs", "underground"] },
  { name: "Template Corner", path: "/assets/kenney-dungeon/template-corner.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Detail", path: "/assets/kenney-dungeon/template-detail.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor", path: "/assets/kenney-dungeon/template-floor.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Big", path: "/assets/kenney-dungeon/template-floor-big.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Detail", path: "/assets/kenney-dungeon/template-floor-detail.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Detail A", path: "/assets/kenney-dungeon/template-floor-detail-a.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Layer", path: "/assets/kenney-dungeon/template-floor-layer.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Floor Layer Raised", path: "/assets/kenney-dungeon/template-floor-layer-raised.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall", path: "/assets/kenney-dungeon/template-wall.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Corner", path: "/assets/kenney-dungeon/template-wall-corner.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Detail A", path: "/assets/kenney-dungeon/template-wall-detail-a.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Half", path: "/assets/kenney-dungeon/template-wall-half.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Stairs", path: "/assets/kenney-dungeon/template-wall-stairs.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
  { name: "Template Wall Top", path: "/assets/kenney-dungeon/template-wall-top.glb", category: "structures", subcategory: "modular", tags: ["dungeon", "template", "building"] },
];

export const SCENE_THEMES = {
  pirate: {
    name: "Pirate Adventure",
    keywords: ["pirate", "ship", "treasure", "island", "ocean", "dock", "cannon", "sail"],
    skyColor: "#87CEEB",
    groundColor: "#C2B280",
    lighting: { ambient: 0.4, directional: 0.8 },
    fogColor: "#B0C4DE"
  },
  dungeon: {
    name: "Dark Dungeon",
    keywords: ["dungeon", "cave", "skeleton", "spider", "dark", "torch", "underground"],
    skyColor: "#1a1a2e",
    groundColor: "#2d2d2d",
    lighting: { ambient: 0.2, directional: 0.3 },
    fogColor: "#1a1a2e"
  },
  forest: {
    name: "Enchanted Forest",
    keywords: ["forest", "tree", "nature", "animal", "frog", "snake", "green", "woodland"],
    skyColor: "#228B22",
    groundColor: "#355E3B",
    lighting: { ambient: 0.5, directional: 0.7 },
    fogColor: "#90EE90"
  },
  medieval: {
    name: "Medieval Village",
    keywords: ["medieval", "castle", "knight", "village", "stone", "fortress", "kingdom"],
    skyColor: "#87CEEB",
    groundColor: "#8B4513",
    lighting: { ambient: 0.45, directional: 0.75 },
    fogColor: "#D3D3D3"
  },
  survival: {
    name: "Survival Camp",
    keywords: ["survival", "camping", "wilderness", "tent", "fire", "hunting", "shelter"],
    skyColor: "#FF8C00",
    groundColor: "#556B2F",
    lighting: { ambient: 0.35, directional: 0.6 },
    fogColor: "#FFA07A"
  },
  fantasy: {
    name: "Fantasy Realm",
    keywords: ["fantasy", "dragon", "magic", "floating", "mystical", "enchanted"],
    skyColor: "#9370DB",
    groundColor: "#4B0082",
    lighting: { ambient: 0.5, directional: 0.65 },
    fogColor: "#DDA0DD"
  }
};

export function searchAssets(query: string): SceneAsset[] {
  const terms = query.toLowerCase().split(/\s+/);
  return ASSET_DATABASE.filter(asset => {
    const searchText = `${asset.name} ${asset.category} ${asset.subcategory} ${asset.tags.join(' ')}`.toLowerCase();
    return terms.some(term => searchText.includes(term));
  });
}

export function getAssetsByCategory(category: string): SceneAsset[] {
  return ASSET_DATABASE.filter(a => a.category === category);
}

export function getAssetsByTags(tags: string[]): SceneAsset[] {
  return ASSET_DATABASE.filter(asset => 
    tags.some(tag => asset.tags.includes(tag.toLowerCase()))
  );
}

export function getAnimatedAssets(): SceneAsset[] {
  return ASSET_DATABASE.filter(a => a.isAnimated);
}

function detectTheme(prompt: string): keyof typeof SCENE_THEMES {
  const lowerPrompt = prompt.toLowerCase();
  let bestMatch: keyof typeof SCENE_THEMES = 'fantasy';
  let bestScore = 0;

  for (const [themeKey, theme] of Object.entries(SCENE_THEMES)) {
    const score = theme.keywords.filter(kw => lowerPrompt.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = themeKey as keyof typeof SCENE_THEMES;
    }
  }

  return bestMatch;
}

function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function selectAssetsForPrompt(prompt: string, count: number = 10): SceneAsset[] {
  const terms = prompt.toLowerCase().split(/\s+/);
  const scored = ASSET_DATABASE.map(asset => {
    const searchText = `${asset.name} ${asset.category} ${asset.subcategory} ${asset.tags.join(' ')}`.toLowerCase();
    const score = terms.filter(term => searchText.includes(term)).length;
    return { asset, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, count).map(s => s.asset);
}

function arrangeAssetsInScene(assets: SceneAsset[]): SceneObject[] {
  const objects: SceneObject[] = [];
  const usedPositions: Set<string> = new Set();

  const getRandomPosition = (radius: number = 10): { x: number; y: number; z: number } => {
    let attempts = 0;
    while (attempts < 100) {
      const x = (Math.random() - 0.5) * radius * 2;
      const z = (Math.random() - 0.5) * radius * 2;
      const key = `${Math.round(x)}_${Math.round(z)}`;
      if (!usedPositions.has(key)) {
        usedPositions.add(key);
        return { x, y: 0, z };
      }
      attempts++;
    }
    return { x: Math.random() * radius, y: 0, z: Math.random() * radius };
  };

  assets.forEach((asset, index) => {
    const position = getRandomPosition(15);
    
    if (asset.category === 'characters') {
      position.y = 0;
    } else if (asset.subcategory === 'trees') {
      position.y = 0;
    } else if (asset.category === 'vehicles' && asset.subcategory === 'ships') {
      position.y = -0.5;
    }

    const sceneObject: SceneObject = {
      id: generateId(),
      name: asset.name,
      assetPath: asset.path,
      position,
      rotation: { x: 0, y: Math.random() * Math.PI * 2, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      tags: asset.tags
    };

    if (asset.isAnimated && asset.animations && asset.animations.length > 0) {
      const idleAnim = asset.animations.find(a => a.toLowerCase().includes('idle'));
      sceneObject.animation = idleAnim || asset.animations[0];
    }

    objects.push(sceneObject);
  });

  return objects;
}

export function generateSceneFromPrompt(prompt: string): GeneratedScene {
  const theme = detectTheme(prompt);
  const themeConfig = SCENE_THEMES[theme];
  const selectedAssets = selectAssetsForPrompt(prompt, 12);
  const objects = arrangeAssetsInScene(selectedAssets);

  return {
    name: `Generated: ${prompt.slice(0, 30)}...`,
    description: prompt,
    theme,
    objects,
    lighting: {
      ambient: { color: "#ffffff", intensity: themeConfig.lighting.ambient },
      directional: { 
        color: "#ffffff", 
        intensity: themeConfig.lighting.directional,
        direction: { x: -1, y: -2, z: -1 }
      }
    },
    environment: {
      skyColor: themeConfig.skyColor,
      groundColor: themeConfig.groundColor,
      fogEnabled: true,
      fogColor: themeConfig.fogColor,
      fogDensity: 0.02
    }
  };
}

export async function generateSceneWithAI(prompt: string): Promise<GeneratedScene> {
  if (!isPuterAvailable()) {
    console.log("Puter.js not available, using local generation");
    return generateSceneFromPrompt(prompt);
  }

  try {
    const assetSummary = ASSET_DATABASE.map(a => 
      `${a.name} (${a.category}/${a.subcategory}): ${a.tags.join(', ')}`
    ).join('\n');

    const aiPrompt = `You are a 3D scene designer for a game engine. Given this user request and available assets, create a scene configuration.

USER REQUEST: "${prompt}"

AVAILABLE ASSETS:
${assetSummary}

THEMES: ${Object.keys(SCENE_THEMES).join(', ')}

Return a JSON object with:
{
  "selectedAssets": ["asset names to use"],
  "theme": "theme name",
  "arrangement": "description of how to arrange objects",
  "lighting": "bright/dim/dark",
  "atmosphere": "description"
}

Be creative but only use assets from the list above.`;

    const response = await aiChat(aiPrompt, 'gpt-4o');
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const aiConfig = JSON.parse(jsonMatch[0]);
        const selectedAssetNames = aiConfig.selectedAssets || [];
        const selectedAssets = ASSET_DATABASE.filter(a => 
          selectedAssetNames.some((name: string) => 
            a.name.toLowerCase().includes(name.toLowerCase())
          )
        );

        if (selectedAssets.length > 0) {
          const theme = (aiConfig.theme?.toLowerCase() as keyof typeof SCENE_THEMES) || detectTheme(prompt);
          const themeConfig = SCENE_THEMES[theme] || SCENE_THEMES.fantasy;
          const objects = arrangeAssetsInScene(selectedAssets);

          return {
            name: `AI Generated: ${prompt.slice(0, 25)}...`,
            description: `${prompt}\n\nAI Notes: ${aiConfig.atmosphere || ''}`,
            theme,
            objects,
            lighting: {
              ambient: { 
                color: "#ffffff", 
                intensity: aiConfig.lighting === 'dark' ? 0.2 : aiConfig.lighting === 'dim' ? 0.35 : 0.5 
              },
              directional: { 
                color: "#ffffff", 
                intensity: aiConfig.lighting === 'dark' ? 0.3 : aiConfig.lighting === 'dim' ? 0.5 : 0.8,
                direction: { x: -1, y: -2, z: -1 }
              }
            },
            environment: {
              skyColor: themeConfig.skyColor,
              groundColor: themeConfig.groundColor,
              fogEnabled: true,
              fogColor: themeConfig.fogColor,
              fogDensity: 0.02
            }
          };
        }
      }
    } catch (parseError) {
      console.warn("Failed to parse AI response, using local generation:", parseError);
    }
  } catch (error) {
    console.error("AI scene generation failed:", error);
  }

  return generateSceneFromPrompt(prompt);
}

export function getAssetCatalogSummary(): string {
  const categories: Record<string, number> = {};
  const animatedCount = ASSET_DATABASE.filter(a => a.isAnimated).length;
  
  ASSET_DATABASE.forEach(asset => {
    categories[asset.category] = (categories[asset.category] || 0) + 1;
  });

  return `Asset Library Summary:
Total Assets: ${ASSET_DATABASE.length}
Animated Assets: ${animatedCount}

By Category:
${Object.entries(categories).map(([cat, count]) => `  - ${cat}: ${count}`).join('\n')}

Themes Available: ${Object.keys(SCENE_THEMES).join(', ')}`;
}

export const EXAMPLE_PROMPTS = [
  "Create a pirate island with ships, treasure chests, and palm trees",
  "Build a dark dungeon with skeletons, spiders, and torches",
  "Design a survival camp in the forest with a tent and campfire",
  "Make a medieval village scene with buildings and NPCs",
  "Create a fantasy dragon lair with treasure",
  "Build a tropical beach with boats and a dock"
];
