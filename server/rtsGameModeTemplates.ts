// Warcraft 3-inspired Medieval RTS Game Mode Templates
// Medieval Warfare (PvP) and Grudge Wars (Campaign)

import type { GrudgedotTools } from "../shared/schema";

export interface GameModeTemplate {
  name: string;
  description: string;
  gameMode: "pvp" | "campaign";
  thumbnailUrl?: string;
  grudgedotTools: GrudgedotTools;
  mapData: {
    width: number;
    height: number;
    tiles: any[];
    units: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      team: number;
      stats?: any;
    }>;
    buildings: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      team: number;
    }>;
    resources: Array<{
      id: string;
      type: "gold" | "wood" | "food";
      position: { x: number; y: number };
      amount: number;
    }>;
  };
  gameSettings: {
    startingResources: { gold: number; wood: number; food: number };
    maxPlayers: number;
    fogOfWar: boolean;
    winConditions: string[];
    gameSpeed: number;
    populationLimit: number;
    heroesEnabled: boolean;
    creepsEnabled: boolean;
  };
  campaignData?: {
    missionNumber: number;
    missionName: string;
    storyline: string;
    objectives: Array<{
      id: string;
      type: "destroy" | "build" | "collect" | "survive" | "defend";
      description: string;
      targetCount?: number;
      targetType?: string;
      timeLimit?: number;
      isOptional: boolean;
      isCompleted: boolean;
    }>;
    dialogues: Array<{
      trigger: "start" | "objective_complete" | "halfway" | "end";
      character: string;
      text: string;
    }>;
    difficulty: "easy" | "medium" | "hard";
    rewards: {
      gold: number;
      experience: number;
      unlockedUnits?: string[];
    };
  };
  unitTemplates: Array<{
    name: string;
    type: "infantry" | "ranged" | "cavalry" | "siege" | "hero";
    stats: {
      health: number;
      damage: number;
      armor: number;
      moveSpeed: number;
      attackSpeed: number;
      attackRange: number;
      isHero?: boolean;
    };
    cost: {
      gold: number;
      wood: number;
      food: number;
      buildTime: number;
    };
    abilities: Array<{
      name: string;
      description: string;
      cooldown: number;
      manaCost?: number;
    }>;
  }>;
  buildingTemplates: Array<{
    name: string;
    type: "production" | "defense" | "resource" | "upgrade" | "special";
    stats: {
      health: number;
      armor: number;
      buildTime: number;
      supplyProvided?: number;
    };
    cost: {
      gold: number;
      wood: number;
    };
    produces: string[];
  }>;
}

// MEDIEVAL WARFARE - PVP MODE (like Warcraft 3 multiplayer)
export const medievalWarfarePVP: GameModeTemplate = {
  name: "Medieval Warfare - PvP",
  description: "Classic competitive multiplayer RTS. Build your base, train armies, and destroy your opponents in epic medieval battles. Inspired by Warcraft 3.",
  gameMode: "pvp",
  grudgedotTools: {
    behaviors: [
      {
        name: "Top-down Movement",
        description: "Allows objects to move in 4 or 8 directions with keyboard, gamepad, or virtual stick controls",
        docUrl: "https://wiki.gdevelop.io/gdevelop5/behaviors/topdown/",
        isBuiltIn: true,
      },
      {
        name: "Pathfinding",
        description: "Smart navigation around obstacles for units",
        docUrl: "https://wiki.gdevelop.io/gdevelop5/behaviors/pathfinding/",
        isBuiltIn: true,
      },
    ],
    extensions: [
      {
        name: "RTS-like Unit Selection",
        description: "Draw selection areas and manage unit selection with click or drag-box controls",
        docUrl: "https://wiki.gdevelop.io/gdevelop5/extensions/rtsunit-selection/",
        author: "VictrisGames & Slash",
      },
      {
        name: "Top-down Movement Animator",
        description: "Changes animation based on movement direction for directional sprites",
        docUrl: "https://wiki.gdevelop.io/gdevelop5/extensions/top-down-movement-animator/",
        author: "Community",
      },
    ],
    templates: [
      {
        name: "RTS Template by VegeTato",
        description: "Premium RTS template with units selecting/moving/attacking, AI, pathfinding, fog of war, and mini map",
        url: "https://gdevelop.io/en-gb/game-example/premium/real-time-strategy-84a6fcf9-ecb6-4613-9a36-191df54d8fbc",
      },
      {
        name: "RTS Game Units Management Example",
        description: "Free modular and annotated RTS units management example",
        url: "https://forum.gdevelop.io/t/example-rts-game-units-management/50652",
      },
    ],
  },
  mapData: {
    width: 64,
    height: 64,
    tiles: [],
    units: [
      // Player 1 starting units (Blue team)
      { id: "p1_worker1", type: "peasant", position: { x: -25, y: -25 }, team: 0 },
      { id: "p1_worker2", type: "peasant", position: { x: -24, y: -25 }, team: 0 },
      { id: "p1_worker3", type: "peasant", position: { x: -26, y: -25 }, team: 0 },
      { id: "p1_worker4", type: "peasant", position: { x: -25, y: -24 }, team: 0 },
      { id: "p1_worker5", type: "peasant", position: { x: -25, y: -26 }, team: 0 },
      { id: "p1_hero", type: "knight_hero", position: { x: -25, y: -23 }, team: 0, stats: { level: 1 } },
      
      // Player 2 starting units (Red team)
      { id: "p2_worker1", type: "peasant", position: { x: 25, y: 25 }, team: 1 },
      { id: "p2_worker2", type: "peasant", position: { x: 24, y: 25 }, team: 1 },
      { id: "p2_worker3", type: "peasant", position: { x: 26, y: 25 }, team: 1 },
      { id: "p2_worker4", type: "peasant", position: { x: 25, y: 24 }, team: 1 },
      { id: "p2_worker5", type: "peasant", position: { x: 25, y: 26 }, team: 1 },
      { id: "p2_hero", type: "paladin_hero", position: { x: 25, y: 23 }, team: 1, stats: { level: 1 } },
      
      // Neutral creeps for experience and items
      { id: "creep1", type: "ogre", position: { x: 0, y: 10 }, team: 2 },
      { id: "creep2", type: "ogre", position: { x: 1, y: 10 }, team: 2 },
      { id: "creep3", type: "troll", position: { x: 0, y: -10 }, team: 2 },
      { id: "creep4", type: "troll", position: { x: -1, y: -10 }, team: 2 },
    ],
    buildings: [
      // Player 1 base
      { id: "p1_townhall", type: "town_hall", position: { x: -25, y: -25 }, team: 0 },
      
      // Player 2 base
      { id: "p2_townhall", type: "town_hall", position: { x: 25, y: 25 }, team: 1 },
    ],
    resources: [
      // Gold mines
      { id: "gold1", type: "gold", position: { x: -20, y: -20 }, amount: 15000 },
      { id: "gold2", type: "gold", position: { x: 20, y: 20 }, amount: 15000 },
      { id: "gold3", type: "gold", position: { x: 0, y: 0 }, amount: 10000 },
      
      // Wood forests
      { id: "forest1", type: "wood", position: { x: -15, y: -15 }, amount: 20000 },
      { id: "forest2", type: "wood", position: { x: 15, y: 15 }, amount: 20000 },
      { id: "forest3", type: "wood", position: { x: -10, y: 10 }, amount: 15000 },
      { id: "forest4", type: "wood", position: { x: 10, y: -10 }, amount: 15000 },
    ],
  },
  gameSettings: {
    startingResources: { gold: 500, wood: 150, food: 5 },
    maxPlayers: 2,
    fogOfWar: true,
    winConditions: ["eliminate_enemies", "capture_relics"],
    gameSpeed: 1.0,
    populationLimit: 100,
    heroesEnabled: true,
    creepsEnabled: true,
  },
  unitTemplates: [
    {
      name: "Peasant",
      type: "infantry",
      stats: {
        health: 220,
        damage: 5,
        armor: 0,
        moveSpeed: 190,
        attackSpeed: 1.5,
        attackRange: 1,
      },
      cost: { gold: 75, wood: 0, food: 1, buildTime: 15 },
      abilities: [
        { name: "Gather Resources", description: "Collect gold from mines and wood from trees", cooldown: 0 },
        { name: "Repair", description: "Repair damaged buildings", cooldown: 0 },
      ],
    },
    {
      name: "Footman",
      type: "infantry",
      stats: {
        health: 420,
        damage: 12,
        armor: 2,
        moveSpeed: 270,
        attackSpeed: 1.35,
        attackRange: 1,
      },
      cost: { gold: 135, wood: 0, food: 2, buildTime: 20 },
      abilities: [
        { name: "Defend", description: "Increases armor by 3 for 15 seconds", cooldown: 40 },
      ],
    },
    {
      name: "Archer",
      type: "ranged",
      stats: {
        health: 245,
        damage: 15,
        armor: 0,
        moveSpeed: 270,
        attackSpeed: 1.5,
        attackRange: 5,
      },
      cost: { gold: 130, wood: 10, food: 2, buildTime: 20 },
      abilities: [],
    },
    {
      name: "Knight",
      type: "cavalry",
      stats: {
        health: 835,
        damage: 34,
        armor: 4,
        moveSpeed: 320,
        attackSpeed: 1.4,
        attackRange: 1,
      },
      cost: { gold: 245, wood: 60, food: 4, buildTime: 30 },
      abilities: [
        { name: "Charge", description: "Increases movement speed by 50% for 5 seconds", cooldown: 30 },
      ],
    },
    {
      name: "Catapult",
      type: "siege",
      stats: {
        health: 325,
        damage: 85,
        armor: 0,
        moveSpeed: 140,
        attackSpeed: 3.0,
        attackRange: 7,
      },
      cost: { gold: 280, wood: 100, food: 3, buildTime: 45 },
      abilities: [
        { name: "Siege Damage", description: "Deals 50% bonus damage to buildings", cooldown: 0 },
      ],
    },
    {
      name: "Knight Hero",
      type: "hero",
      stats: {
        health: 700,
        damage: 28,
        armor: 3,
        moveSpeed: 300,
        attackSpeed: 1.3,
        attackRange: 1,
        isHero: true,
      },
      cost: { gold: 425, wood: 100, food: 5, buildTime: 55 },
      abilities: [
        { name: "Divine Shield", description: "Become invulnerable for 5 seconds", cooldown: 60, manaCost: 100 },
        { name: "Devotion Aura", description: "Increases nearby allies armor by 2", cooldown: 0 },
        { name: "Holy Light", description: "Heal target for 200 HP", cooldown: 10, manaCost: 65 },
      ],
    },
    {
      name: "Paladin Hero",
      type: "hero",
      stats: {
        health: 925,
        damage: 35,
        armor: 5,
        moveSpeed: 290,
        attackSpeed: 1.4,
        attackRange: 1,
        isHero: true,
      },
      cost: { gold: 425, wood: 100, food: 5, buildTime: 55 },
      abilities: [
        { name: "Resurrection", description: "Revive up to 6 dead units", cooldown: 180, manaCost: 150 },
        { name: "Devotion Aura", description: "Increases nearby allies armor by 3", cooldown: 0 },
        { name: "Holy Light", description: "Heal target for 300 HP", cooldown: 8, manaCost: 65 },
      ],
    },
  ],
  buildingTemplates: [
    {
      name: "Town Hall",
      type: "production",
      stats: { health: 1500, armor: 5, buildTime: 0, supplyProvided: 10 },
      cost: { gold: 385, wood: 205 },
      produces: ["peasant"],
    },
    {
      name: "Barracks",
      type: "production",
      stats: { health: 800, armor: 5, buildTime: 60 },
      cost: { gold: 180, wood: 50 },
      produces: ["footman", "archer"],
    },
    {
      name: "Blacksmith",
      type: "upgrade",
      stats: { health: 700, armor: 5, buildTime: 50 },
      cost: { gold: 180, wood: 80 },
      produces: [],
    },
    {
      name: "Stables",
      type: "production",
      stats: { health: 700, armor: 5, buildTime: 60 },
      cost: { gold: 225, wood: 135 },
      produces: ["knight"],
    },
    {
      name: "Workshop",
      type: "production",
      stats: { health: 500, armor: 5, buildTime: 60 },
      cost: { gold: 210, wood: 90 },
      produces: ["catapult"],
    },
    {
      name: "Guard Tower",
      type: "defense",
      stats: { health: 500, armor: 5, buildTime: 45 },
      cost: { gold: 110, wood: 40 },
      produces: [],
    },
    {
      name: "Farm",
      type: "resource",
      stats: { health: 400, armor: 0, buildTime: 30, supplyProvided: 6 },
      cost: { gold: 80, wood: 20 },
      produces: [],
    },
    {
      name: "Altar of Kings",
      type: "special",
      stats: { health: 900, armor: 5, buildTime: 60 },
      cost: { gold: 180, wood: 50 },
      produces: ["knight_hero", "paladin_hero"],
    },
  ],
};

// GRUDGE WARS - CAMPAIGN MODE (like Warcraft 3 single-player)
export const grudgeWarsCampaign: GameModeTemplate = {
  name: "Grudge Wars - Campaign Mission 1",
  description: "Story-driven single-player campaign. Complete objectives, level up your hero, and unravel an epic medieval tale of betrayal and redemption.",
  gameMode: "campaign",
  grudgedotTools: {
    behaviors: [
      {
        name: "Top-down Movement",
        description: "Allows objects to move in 4 or 8 directions with keyboard, gamepad, or virtual stick controls",
        docUrl: "https://wiki.gdevelop.io/gdevelop5/behaviors/topdown/",
        isBuiltIn: true,
      },
      {
        name: "Pathfinding",
        description: "Smart navigation around obstacles for units",
        docUrl: "https://wiki.gdevelop.io/gdevelop5/behaviors/pathfinding/",
        isBuiltIn: true,
      },
    ],
    extensions: [
      {
        name: "RTS-like Unit Selection",
        description: "Draw selection areas and manage unit selection with click or drag-box controls",
        docUrl: "https://wiki.gdevelop.io/gdevelop5/extensions/rtsunit-selection/",
        author: "VictrisGames & Slash",
      },
      {
        name: "Top-down Movement Animator",
        description: "Changes animation based on movement direction for directional sprites",
        docUrl: "https://wiki.gdevelop.io/gdevelop5/extensions/top-down-movement-animator/",
        author: "Community",
      },
    ],
    templates: [
      {
        name: "RTS Template by VegeTato",
        description: "Premium RTS template with units selecting/moving/attacking, AI, pathfinding, fog of war, and mini map",
        url: "https://gdevelop.io/en-gb/game-example/premium/real-time-strategy-84a6fcf9-ecb6-4613-9a36-191df54d8fbc",
      },
      {
        name: "RTS Game Units Management Example",
        description: "Free modular and annotated RTS units management example",
        url: "https://forum.gdevelop.io/t/example-rts-game-units-management/50652",
      },
    ],
  },
  mapData: {
    width: 48,
    height: 48,
    tiles: [],
    units: [
      // Player starting forces (smaller army for campaign)
      { id: "hero", type: "knight_hero", position: { x: -20, y: -20 }, team: 0, stats: { level: 1 } },
      { id: "footman1", type: "footman", position: { x: -19, y: -20 }, team: 0 },
      { id: "footman2", type: "footman", position: { x: -21, y: -20 }, team: 0 },
      { id: "archer1", type: "archer", position: { x: -20, y: -19 }, team: 0 },
      { id: "archer2", type: "archer", position: { x: -20, y: -21 }, team: 0 },
      
      // Enemy forces (Orc raiders)
      { id: "enemy1", type: "grunt", position: { x: 15, y: 15 }, team: 1 },
      { id: "enemy2", type: "grunt", position: { x: 16, y: 15 }, team: 1 },
      { id: "enemy3", type: "grunt", position: { x: 15, y: 16 }, team: 1 },
      { id: "enemy4", type: "raider", position: { x: 17, y: 15 }, team: 1 },
      { id: "enemy5", type: "raider", position: { x: 15, y: 17 }, team: 1 },
      { id: "enemy_boss", type: "orc_chieftain", position: { x: 18, y: 18 }, team: 1, stats: { level: 3 } },
      
      // Villagers to rescue (neutral)
      { id: "villager1", type: "villager", position: { x: 0, y: 5 }, team: 2 },
      { id: "villager2", type: "villager", position: { x: 1, y: 5 }, team: 2 },
      { id: "villager3", type: "villager", position: { x: 0, y: 6 }, team: 2 },
    ],
    buildings: [
      // Player base (limited)
      { id: "base", type: "camp", position: { x: -20, y: -20 }, team: 0 },
      
      // Enemy stronghold
      { id: "enemy_hall", type: "great_hall", position: { x: 18, y: 18 }, team: 1 },
      { id: "enemy_barracks", type: "orc_barracks", position: { x: 16, y: 18 }, team: 1 },
      
      // Village buildings (to defend)
      { id: "village_hall", type: "village_hall", position: { x: 0, y: 5 }, team: 2 },
    ],
    resources: [
      // Limited resources for campaign
      { id: "gold1", type: "gold", position: { x: -15, y: -15 }, amount: 2500 },
      { id: "forest1", type: "wood", position: { x: -12, y: -12 }, amount: 3000 },
    ],
  },
  gameSettings: {
    startingResources: { gold: 300, wood: 200, food: 5 },
    maxPlayers: 1,
    fogOfWar: true,
    winConditions: ["complete_objectives"],
    gameSpeed: 1.0,
    populationLimit: 40,
    heroesEnabled: true,
    creepsEnabled: false,
  },
  campaignData: {
    missionNumber: 1,
    missionName: "The Grudge Begins",
    storyline: "The peaceful village of Ashenvale has been attacked by Orc raiders. As a young knight, you must rescue the villagers and defeat the Orc chieftain to prove your worth.",
    objectives: [
      {
        id: "obj1",
        type: "defend",
        description: "Protect the Village Hall from destruction",
        targetType: "village_hall",
        isOptional: false,
        isCompleted: false,
      },
      {
        id: "obj2",
        type: "collect",
        description: "Rescue 3 villagers",
        targetCount: 3,
        targetType: "villager",
        isOptional: false,
        isCompleted: false,
      },
      {
        id: "obj3",
        type: "destroy",
        description: "Defeat the Orc Chieftain",
        targetCount: 1,
        targetType: "orc_chieftain",
        isOptional: false,
        isCompleted: false,
      },
      {
        id: "obj4",
        type: "destroy",
        description: "Destroy the Orc Stronghold (Optional)",
        targetCount: 1,
        targetType: "great_hall",
        isOptional: true,
        isCompleted: false,
      },
    ],
    dialogues: [
      {
        trigger: "start",
        character: "Knight Commander",
        text: "The village is under attack! We must move quickly to save the innocent. Remember your training, young knight!",
      },
      {
        trigger: "objective_complete",
        character: "Village Elder",
        text: "Thank you, brave knight! You have saved our people. But the Orc chieftain still threatens our lands...",
      },
      {
        trigger: "halfway",
        character: "Knight Hero",
        text: "These Orcs fight with surprising coordination. There must be a leader commanding them...",
      },
      {
        trigger: "end",
        character: "Knight Commander",
        text: "Well done! You have proven yourself worthy. But this is only the beginning - darker forces are gathering...",
      },
    ],
    difficulty: "medium",
    rewards: {
      gold: 500,
      experience: 1000,
      unlockedUnits: ["knight"],
    },
  },
  unitTemplates: [
    // Re-use PvP templates plus campaign-specific units
    ...medievalWarfarePVP.unitTemplates,
    {
      name: "Villager",
      type: "infantry",
      stats: {
        health: 150,
        damage: 3,
        armor: 0,
        moveSpeed: 200,
        attackSpeed: 2.0,
        attackRange: 1,
      },
      cost: { gold: 0, wood: 0, food: 0, buildTime: 0 },
      abilities: [],
    },
    {
      name: "Orc Grunt",
      type: "infantry",
      stats: {
        health: 550,
        damage: 19,
        armor: 2,
        moveSpeed: 280,
        attackSpeed: 1.4,
        attackRange: 1,
      },
      cost: { gold: 0, wood: 0, food: 0, buildTime: 0 },
      abilities: [],
    },
    {
      name: "Orc Raider",
      type: "cavalry",
      stats: {
        health: 750,
        damage: 31,
        armor: 3,
        moveSpeed: 330,
        attackSpeed: 1.5,
        attackRange: 1,
      },
      cost: { gold: 0, wood: 0, food: 0, buildTime: 0 },
      abilities: [
        { name: "Pillage", description: "Destroys buildings faster", cooldown: 0 },
      ],
    },
    {
      name: "Orc Chieftain",
      type: "hero",
      stats: {
        health: 1200,
        damage: 45,
        armor: 6,
        moveSpeed: 300,
        attackSpeed: 1.2,
        attackRange: 1,
        isHero: true,
      },
      cost: { gold: 0, wood: 0, food: 0, buildTime: 0 },
      abilities: [
        { name: "War Stomp", description: "Stuns nearby enemies for 2 seconds", cooldown: 25, manaCost: 75 },
        { name: "Command Aura", description: "Increases nearby allies damage by 15%", cooldown: 0 },
        { name: "Critical Strike", description: "Chance to deal 3x damage", cooldown: 0 },
      ],
    },
  ],
  buildingTemplates: [
    ...medievalWarfarePVP.buildingTemplates,
    {
      name: "Camp",
      type: "production",
      stats: { health: 800, armor: 3, buildTime: 0, supplyProvided: 5 },
      cost: { gold: 0, wood: 0 },
      produces: ["footman", "archer"],
    },
    {
      name: "Village Hall",
      type: "special",
      stats: { health: 1000, armor: 2, buildTime: 0 },
      cost: { gold: 0, wood: 0 },
      produces: [],
    },
  ],
};

export const gameModeTemplates = {
  medievalWarfarePVP,
  grudgeWarsCampaign,
};
