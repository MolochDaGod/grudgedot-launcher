import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Sword, Shield, Heart, Coins, Star, Flame, Snowflake, Zap, Cross, DoorOpen, BookOpen, AlertCircle, Package } from "lucide-react";
import { Link } from "wouter";
import { mmoApi } from "@/lib/gameApi";
import { TelegraphManager } from "@/lib/mmo-indicators";
import {
  deriveCombatStats,
  calcPhysicalDamage,
  calcSpellDamage,
  rollCrit,
  rollDodge,
  calcCritMultiplier,
  abilityToSpell,
  generateLootDrop,
  createGatheringNodes,
  TIER_COLORS,
  type DerivedStats,
  type MMOSpell,
  type InventoryItem as MMOInventoryItem,
  type GatheringNode,
} from "@/lib/mmo-systems";
import { GRUDA_WARS_HEROES } from "../../../shared/grudaWarsHeroes";
import type { WCSHeroAttributes } from "../../../shared/grudachain";
import type { GrudaWarsHero } from "../../../shared/grudaWarsHeroes";

const WORLD_WIDTH = 4800;
const WORLD_HEIGHT = 3600;
const TILE_SIZE = 32;

type Biome = "forest" | "desert" | "snow" | "swamp" | "plains";

/**
 * 9 zones matching Dungeon-Crawler-Quest world layout (3×3 grid):
 *   [NW Wilds]     [Crusade Coast] [NE Wilds]
 *   [Fabled Shore] [Travelers Town][Sloarscorth]
 *   [SW Wilds]     [Pirate Bay]    [SE Wilds]
 */
type DifficultyZone =
  | "travelers_town"   // 0 — Center safe hub
  | "crusade_coast"    // 1 — N, Human/Barbarian, easy
  | "fabled_shore"     // 2 — W, Elf/Dwarf, easy-med
  | "sloarscorth"      // 3 — E, Frozen crystal highlands, medium
  | "pirate_bay"       // 4 — S, PvP waters, hard
  | "nw_wilds"         // 5 — NW, Jungle PvP, medium
  | "ne_wilds"         // 6 — NE, Mountain crags, hard
  | "sw_wilds"         // 7 — SW, Volcanic badlands, hard+
  | "se_wilds";        // 8 — SE, Graveyard/boss arena, endgame

/** 3×3 grid — ZONE_GRID[row][col] */
const ZONE_GRID: DifficultyZone[][] = [
  ["nw_wilds",       "crusade_coast",  "ne_wilds"   ],  // row 0 (north)
  ["fabled_shore",   "travelers_town", "sloarscorth"],  // row 1 (center)
  ["sw_wilds",       "pirate_bay",     "se_wilds"   ],  // row 2 (south)
];

/** Biome for each grid cell */
const BIOME_GRID: Biome[][] = [
  ["forest",  "plains", "snow"   ],
  ["forest",  "plains", "snow"   ],
  ["desert",  "swamp",  "plains" ],
];

/** Enemy power multiplier per zone */
const ZONE_MULT: Record<DifficultyZone, number> = {
  travelers_town: 0,
  crusade_coast:  1,
  fabled_shore:   1.2,
  sloarscorth:    1.8,
  pirate_bay:     2.5,
  nw_wilds:       1.5,
  ne_wilds:       2.5,
  sw_wilds:       3.5,
  se_wilds:       5,
};

/** Chance of spawning a boss in this zone (0–1) */
const ZONE_BOSS_CHANCE: Record<DifficultyZone, number> = {
  travelers_town: 0,
  crusade_coast:  0,
  fabled_shore:   0,
  sloarscorth:    0.1,
  pirate_bay:     0.6,
  nw_wilds:       0.3,
  ne_wilds:       0.7,
  sw_wilds:       0.8,
  se_wilds:       0.9,
};

/** Spell type now uses MMOSpell from mmo-systems (mapped from hero abilities) */
interface Spell {
  id: string;
  name: string;
  key: string;
  manaCost: number;
  cooldown: number;
  damage: number;
  range: number;
  color: number;
  icon: string;
}

/** Default spells — overridden when a hero is selected */
const DEFAULT_SPELLS: Spell[] = [
  { id: "fireball", name: "Fireball", key: "1", manaCost: 15, cooldown: 1500, damage: 25, range: 280, color: 0xff4400, icon: "fire" },
  { id: "iceShard", name: "Ice Shard", key: "2", manaCost: 12, cooldown: 1000, damage: 18, range: 250, color: 0x00ccff, icon: "ice" },
  { id: "lightning", name: "Lightning", key: "3", manaCost: 20, cooldown: 2500, damage: 40, range: 320, color: 0xffff00, icon: "zap" },
  { id: "heal", name: "Heal", key: "4", manaCost: 25, cooldown: 4000, damage: -30, range: 0, color: 0x00ff88, icon: "heal" },
];

/** Convert MMOSpell → scene Spell format */
function mmoSpellToSceneSpell(s: MMOSpell): Spell {
  let icon = "fire";
  if (s.color === 0x00ccff) icon = "ice";
  else if (s.color === 0xffff00) icon = "zap";
  else if (s.isHeal || s.color === 0x00ff88) icon = "heal";
  return { id: s.id, name: s.name, key: s.key, manaCost: s.manaCost, cooldown: s.cooldownMs, damage: s.damage, range: s.range, color: s.color, icon };
}

let SPELLS: Spell[] = [...DEFAULT_SPELLS];

interface PlayerStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  xp: number;
  xpToLevel: number;
  level: number;
  gold: number;
  attack: number;
  defense: number;
  // WCS 8-stat attributes (shared across games)
  wcsAttributes?: WCSHeroAttributes;
  derived?: DerivedStats;
  heroName?: string;
  classId?: string;
}

interface SpellCooldown {
  [key: string]: number;
}

interface InventoryItem {
  id: string;
  name: string;
  type: "weapon" | "armor" | "potion" | "gold";
  value: number;
  icon: string;
}

class MMOScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private spellKeys!: { [key: string]: Phaser.Input.Keyboard.Key };
  private enemies!: Phaser.Physics.Arcade.Group;
  private loot!: Phaser.Physics.Arcade.Group;
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private stats: PlayerStats = {
    health: 100,
    maxHealth: 100,
    mana: 80,
    maxMana: 80,
    xp: 0,
    xpToLevel: 100,
    level: 1,
    gold: 0,
    attack: 10,
    defense: 5,
  };
  private inventory: InventoryItem[] = [];
  private lastAttackTime = 0;
  private spellCooldowns: SpellCooldown = {};
  private healthBar!: Phaser.GameObjects.Graphics;
  private manaBar!: Phaser.GameObjects.Graphics;
  private onStatsUpdate?: (stats: PlayerStats) => void;
  private onInventoryUpdate?: (items: InventoryItem[]) => void;
  private onSpellCooldownUpdate?: (cooldowns: SpellCooldown) => void;
  private onGameStateChange?: (inBuilding: boolean, zone: DifficultyZone) => void;
  private minimapGraphics!: Phaser.GameObjects.Graphics;
  private worldGraphics!: Phaser.GameObjects.Graphics;
  private inStartBuilding = true;
  private buildingGroup!: Phaser.Physics.Arcade.StaticGroup;
  private buildingExitZone!: Phaser.GameObjects.Zone;
  private currentZone: DifficultyZone = "travelers_town";
  private mousePointer!: Phaser.Input.Pointer;
  private crosshair!: Phaser.GameObjects.Graphics;
  private telegraphManager!: TelegraphManager;
  private selectedHero: GrudaWarsHero | null = null;
  private gatheringNodes: GatheringNode[] = [];
  private spriteKeys: Map<string, boolean> = new Map();

  constructor() {
    super({ key: "MMOScene" });
  }

  /** Set the active hero (called before scene starts) */
  setHero(hero: GrudaWarsHero) {
    this.selectedHero = hero;
    // Map hero abilities to scene spells
    const heroSpells = hero.gdaAbilities.map((ability, i) => {
      const mmoSpell = abilityToSpell(ability, i);
      return mmoSpellToSceneSpell(mmoSpell);
    });
    SPELLS = heroSpells.length > 0 ? heroSpells : [...DEFAULT_SPELLS];
  }

  setCallbacks(
    onStats: (stats: PlayerStats) => void, 
    onInventory: (items: InventoryItem[]) => void,
    onSpellCooldown: (cooldowns: SpellCooldown) => void,
    onGameStateChange: (inBuilding: boolean, zone: DifficultyZone) => void
  ) {
    this.onStatsUpdate = onStats;
    this.onInventoryUpdate = onInventory;
    this.onSpellCooldownUpdate = onSpellCooldown;
    this.onGameStateChange = onGameStateChange;
  }

  preload() {
    this.load.setBaseURL("");
  }

  create() {
    this.telegraphManager = new TelegraphManager(this);
    this.createWorld();
    this.createPlayer();         // Must exist before createStartBuilding (it references this.player)
    this.createStartBuilding();
    this.createCrosshair();
    this.createEnemies();
    this.createObstacles();
    this.setupInput();
    this.setupCamera();
    this.setupCollisions();
    this.createMinimap();
    this.createGatheringNodes();

    this.loot = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();

    // Apply hero stats if a hero was selected
    if (this.selectedHero) {
      const derived = deriveCombatStats(this.selectedHero.wcsAttributes, this.selectedHero.level);
      this.stats.maxHealth = derived.maxHp;
      this.stats.health = derived.maxHp;
      this.stats.maxMana = derived.maxMana;
      this.stats.mana = derived.maxMana;
      this.stats.attack = derived.physicalDamage;
      this.stats.defense = derived.defense;
    }

    this.physics.add.overlap(this.player, this.loot, (_player, lootItem) => {
      this.collectLoot(lootItem as Phaser.Physics.Arcade.Sprite);
    });

    this.physics.add.overlap(this.player, this.enemyProjectiles, (_player, projectile) => {
      this.handleEnemyProjectileHit(projectile as Phaser.Physics.Arcade.Sprite);
    });

    this.time.addEvent({
      delay: 5000,
      callback: this.spawnEnemy,
      callbackScope: this,
      loop: true,
    });

    this.time.addEvent({
      delay: 100,
      callback: () => {
        this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + 1);
        this.notifyStats();
      },
      callbackScope: this,
      loop: true,
    });

    this.onGameStateChange?.(true, "travelers_town");
    this.notifyStats();
  }

  /** Create gathering nodes in each biome zone */
  createGatheringNodes() {
    const biomes = ["forest", "desert", "snow", "swamp", "plains"];
    for (const biome of biomes) {
      const nodes = createGatheringNodes(biome, WORLD_WIDTH, WORLD_HEIGHT, 8);
      this.gatheringNodes.push(...nodes);
    }

    // Draw gathering nodes on the world
    for (const node of this.gatheringNodes) {
      const g = this.add.graphics();
      g.setDepth(4);
      const tierColor = TIER_COLORS[node.tier] ?? 0xffffff;
      g.fillStyle(tierColor, 0.7);
      g.fillCircle(node.x, node.y, 10);
      g.lineStyle(2, tierColor, 1);
      g.strokeCircle(node.x, node.y, 14);
      // Pulsing sparkle
      g.fillStyle(0xffffff, 0.5);
      g.fillCircle(node.x - 3, node.y - 3, 3);
    }
  }

  /** Compute biome directly from 3×3 world grid */
  getBiomeAt(x: number, y: number): Biome {
    const col = Math.min(2, Math.floor(x / (WORLD_WIDTH / 3)));
    const row = Math.min(2, Math.floor(y / (WORLD_HEIGHT / 3)));
    return BIOME_GRID[row]?.[col] ?? "plains";
  }

  /** Compute zone directly from 3×3 world grid */
  getZoneAt(x: number, y: number): DifficultyZone {
    const col = Math.min(2, Math.floor(x / (WORLD_WIDTH / 3)));
    const row = Math.min(2, Math.floor(y / (WORLD_HEIGHT / 3)));
    return ZONE_GRID[row]?.[col] ?? "crusade_coast";
  }

  getBiomeColors(biome: Biome): { ground: number; accent: number; tree: number } {
    switch (biome) {
      case "forest":
        return { ground: 0x2d5a27, accent: 0x1a3d15, tree: 0x0d260a };
      case "desert":
        return { ground: 0xc2a666, accent: 0xa88c4a, tree: 0x8b7355 };
      case "snow":
        return { ground: 0xe8e8f0, accent: 0xc8d0e0, tree: 0x4a6670 };
      case "swamp":
        return { ground: 0x3d4a35, accent: 0x2a3328, tree: 0x4a5540 };
      case "plains":
      default:
        return { ground: 0x4a7c3f, accent: 0x3a6830, tree: 0x228b22 };
    }
  }

  getZoneColor(zone: DifficultyZone): number {
    switch (zone) {
      case "travelers_town": return 0x88ff88;  // safe green
      case "crusade_coast":  return 0xdaa520;  // gold
      case "fabled_shore":   return 0x2aaa6a;  // teal
      case "sloarscorth":    return 0x88aaff;  // ice blue
      case "pirate_bay":     return 0x2266bb;  // ocean
      case "nw_wilds":       return 0x226622;  // dark jungle
      case "ne_wilds":       return 0x7a7a9a;  // grey mountain
      case "sw_wilds":       return 0xcc4422;  // volcanic
      case "se_wilds":       return 0x550055;  // dark graveyard
      default:               return 0x888888;
    }
  }

  createWorld() {
    this.worldGraphics = this.add.graphics();
    
    for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
      for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
        const biome = this.getBiomeAt(x, y);
        const zone = this.getZoneAt(x, y);
        const colors = this.getBiomeColors(biome);
        
        const distToCenter = Math.sqrt(
          Math.pow((x - WORLD_WIDTH / 2) / WORLD_WIDTH, 2) + 
          Math.pow((y - WORLD_HEIGHT / 2) / WORLD_HEIGHT, 2)
        );
        const isPath = distToCenter < 0.06 || 
          (Math.abs(x - WORLD_WIDTH / 2) < 60 && y > WORLD_HEIGHT * 0.35 && y < WORLD_HEIGHT * 0.65) ||
          (Math.abs(y - WORLD_HEIGHT / 2) < 60 && x > WORLD_WIDTH * 0.35 && x < WORLD_WIDTH * 0.65);

        const noise = Math.sin(x * 0.015 + y * 0.01) * Math.cos(y * 0.02 - x * 0.008);
        const isWater = biome === "swamp" ? noise > 0.3 : 
          (noise > 0.75 && !isPath && x > 400 && y > 400 && x < WORLD_WIDTH - 400 && y < WORLD_HEIGHT - 400);

        if (isPath) {
          this.worldGraphics.fillStyle(0x8b7355, 1);
        } else if (isWater) {
          const waterColor = biome === "swamp" ? 0x3a4a30 : 0x4a90d9;
          this.worldGraphics.fillStyle(waterColor, 1);
        } else {
          let variation = 0.85 + Math.random() * 0.3;
          const zm = ZONE_MULT[zone];
          if (zm >= 3.5) variation *= 0.85;       // volcanic / endgame — darker
          else if (zm >= 1.8) variation *= 0.92;  // medium zones — slightly darker
          
          const r = ((colors.ground >> 16) & 0xff) * variation;
          const g = ((colors.ground >> 8) & 0xff) * variation;
          const b = (colors.ground & 0xff) * variation;
          this.worldGraphics.fillStyle(Phaser.Display.Color.GetColor(
            Math.floor(Math.min(255, r)),
            Math.floor(Math.min(255, g)),
            Math.floor(Math.min(255, b))
          ), 1);
        }
        this.worldGraphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        if (!isPath && !isWater && Math.random() > 0.95) {
          this.worldGraphics.fillStyle(colors.accent, 0.4);
          const size = 2 + Math.random() * 4;
          this.worldGraphics.fillCircle(x + TILE_SIZE / 2, y + TILE_SIZE / 2, size);
        }
      }
    }

    this.worldGraphics.lineStyle(8, 0x2a1a0a, 1);
    this.worldGraphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // ── Zone grid border lines ──────────────────────────────────────
    const ZW = WORLD_WIDTH  / 3;
    const ZH = WORLD_HEIGHT / 3;
    this.worldGraphics.lineStyle(4, 0x000000, 0.6);
    this.worldGraphics.moveTo(ZW,     0);          this.worldGraphics.lineTo(ZW,     WORLD_HEIGHT);
    this.worldGraphics.moveTo(ZW * 2, 0);          this.worldGraphics.lineTo(ZW * 2, WORLD_HEIGHT);
    this.worldGraphics.moveTo(0,      ZH);         this.worldGraphics.lineTo(WORLD_WIDTH, ZH);
    this.worldGraphics.moveTo(0,      ZH * 2);     this.worldGraphics.lineTo(WORLD_WIDTH, ZH * 2);
    this.worldGraphics.strokePath();

    // ── One town per zone ──────────────────────────────────────────
    const cx = (col: number) => ZW * col + ZW / 2;
    const cy = (row: number) => ZH * row + ZH / 2;
    this.createTown(cx(1), cy(0), "Crusade Coast",  "plains");
    this.createTown(cx(0), cy(1), "Fabled Shore",   "forest");
    this.createTown(cx(1), cy(1), "Travelers Town", "plains");
    this.createTown(cx(2), cy(1), "Sloarscorth",    "snow");
    this.createTown(cx(1), cy(2), "Pirate Bay",     "swamp");
    // Wild zones — smaller markers
    const wildLabel = (x: number, y: number, name: string) => {
      const g = this.add.graphics();
      g.setDepth(2);
      g.fillStyle(0x1a1a2a, 0.7);
      g.fillRoundedRect(x - 55, y - 18, 110, 36, 4);
      const t = this.add.text(x, y, name, { fontSize: "11px", color: "#cc8844", fontStyle: "bold", stroke: "#000", strokeThickness: 2 });
      t.setOrigin(0.5);
      t.setDepth(100);
    };
    wildLabel(cx(0), cy(0), "NW Wilds");
    wildLabel(cx(2), cy(0), "NE Wilds");
    wildLabel(cx(0), cy(2), "SW Wilds");
    wildLabel(cx(2), cy(2), "SE Wilds");
  }

  createStartBuilding() {
    this.buildingGroup = this.physics.add.staticGroup();
    
    const buildingX = WORLD_WIDTH / 2;
    const buildingY = WORLD_HEIGHT / 2;
    const buildingWidth = 400;
    const buildingHeight = 300;
    
    const buildingGraphics = this.add.graphics();
    buildingGraphics.setDepth(2);
    
    buildingGraphics.fillStyle(0x3a3a4a, 1);
    buildingGraphics.fillRoundedRect(buildingX - buildingWidth/2, buildingY - buildingHeight/2, buildingWidth, buildingHeight, 8);
    
    buildingGraphics.fillStyle(0x4a4a5a, 1);
    buildingGraphics.fillRoundedRect(buildingX - buildingWidth/2 + 10, buildingY - buildingHeight/2 + 10, buildingWidth - 20, buildingHeight - 20, 6);
    
    buildingGraphics.fillStyle(0x5a5a6a, 1);
    buildingGraphics.fillRoundedRect(buildingX - buildingWidth/2 + 20, buildingY - buildingHeight/2 + 20, buildingWidth - 40, buildingHeight - 40, 4);

    const floorGraphics = this.add.graphics();
    floorGraphics.setDepth(1);
    floorGraphics.fillStyle(0x6a5a4a, 1);
    for (let fx = buildingX - buildingWidth/2 + 25; fx < buildingX + buildingWidth/2 - 25; fx += 30) {
      for (let fy = buildingY - buildingHeight/2 + 25; fy < buildingY + buildingHeight/2 - 25; fy += 30) {
        floorGraphics.fillRect(fx, fy, 28, 28);
      }
    }

    const doorWidth = 60;
    const doorHeight = 20;
    const doorX = buildingX;
    const doorY = buildingY + buildingHeight/2;
    
    buildingGraphics.fillStyle(0x2a6a3a, 1);
    buildingGraphics.fillRect(doorX - doorWidth/2, doorY - doorHeight/2, doorWidth, doorHeight);
    
    const exitLabel = this.add.text(doorX, doorY + 25, "EXIT", {
      fontSize: "14px",
      color: "#88ff88",
      fontStyle: "bold",
      backgroundColor: "#000000aa",
      padding: { x: 8, y: 4 },
    });
    exitLabel.setOrigin(0.5);
    exitLabel.setDepth(100);

    const wallThickness = 15;
    
    const topWall = this.buildingGroup.create(buildingX, buildingY - buildingHeight/2, undefined) as Phaser.Physics.Arcade.Sprite;
    topWall.setVisible(false);
    topWall.body!.setSize(buildingWidth, wallThickness);
    topWall.setPosition(buildingX, buildingY - buildingHeight/2 + wallThickness/2);
    
    const bottomLeftWall = this.buildingGroup.create(buildingX - doorWidth, doorY, undefined) as Phaser.Physics.Arcade.Sprite;
    bottomLeftWall.setVisible(false);
    bottomLeftWall.body!.setSize(buildingWidth/2 - doorWidth/2, wallThickness);
    bottomLeftWall.setPosition(buildingX - buildingWidth/4 - doorWidth/4, doorY);
    
    const bottomRightWall = this.buildingGroup.create(buildingX + doorWidth, doorY, undefined) as Phaser.Physics.Arcade.Sprite;
    bottomRightWall.setVisible(false);
    bottomRightWall.body!.setSize(buildingWidth/2 - doorWidth/2, wallThickness);
    bottomRightWall.setPosition(buildingX + buildingWidth/4 + doorWidth/4, doorY);
    
    const leftWall = this.buildingGroup.create(buildingX - buildingWidth/2, buildingY, undefined) as Phaser.Physics.Arcade.Sprite;
    leftWall.setVisible(false);
    leftWall.body!.setSize(wallThickness, buildingHeight);
    leftWall.setPosition(buildingX - buildingWidth/2 + wallThickness/2, buildingY);
    
    const rightWall = this.buildingGroup.create(buildingX + buildingWidth/2, buildingY, undefined) as Phaser.Physics.Arcade.Sprite;
    rightWall.setVisible(false);
    rightWall.body!.setSize(wallThickness, buildingHeight);
    rightWall.setPosition(buildingX + buildingWidth/2 - wallThickness/2, buildingY);

    this.buildingExitZone = this.add.zone(doorX, doorY + 30, doorWidth, 30);
    this.physics.world.enable(this.buildingExitZone);
    (this.buildingExitZone.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
    (this.buildingExitZone.body as Phaser.Physics.Arcade.Body).moves = false;

    this.physics.add.overlap(this.player, this.buildingExitZone, () => {
      if (this.inStartBuilding) {
        this.exitBuilding();
      }
    });
  }

  exitBuilding() {
    this.inStartBuilding = false;
    this.player.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 200);
    this.cameras.main.flash(300, 255, 255, 255);
    this.onGameStateChange?.(false, "travelers_town");
  }

  createTown(x: number, y: number, name: string, biome: Biome) {
    const graphics = this.add.graphics();
    graphics.setDepth(2);
    
    graphics.fillStyle(0x4a3a2a, 0.9);
    graphics.fillRoundedRect(x - 80, y - 60, 160, 120, 8);
    
    graphics.fillStyle(0xdaa520, 1);
    graphics.fillRoundedRect(x - 70, y - 50, 140, 100, 6);
    
    graphics.fillStyle(0x654321, 1);
    graphics.fillRoundedRect(x - 15, y + 20, 30, 30, 4);
    
    graphics.fillStyle(0x87ceeb, 0.9);
    graphics.fillRoundedRect(x - 50, y - 30, 25, 20, 3);
    graphics.fillRoundedRect(x + 25, y - 30, 25, 20, 3);
    
    const label = this.add.text(x, y - 80, name, {
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
      backgroundColor: "#000000cc",
      padding: { x: 8, y: 4 },
    });
    label.setOrigin(0.5);
    label.setDepth(100);
  }

  createPlayer() {
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    
    playerGraphics.fillStyle(0x1a1a2e, 1);
    playerGraphics.fillCircle(24, 40, 10);
    playerGraphics.fillCircle(32, 40, 10);
    
    playerGraphics.fillStyle(0x3498db, 1);
    playerGraphics.fillRoundedRect(16, 20, 24, 28, 4);
    
    playerGraphics.fillStyle(0x2980b9, 1);
    playerGraphics.fillRoundedRect(18, 22, 20, 12, 2);
    
    playerGraphics.fillStyle(0xf5deb3, 1);
    playerGraphics.fillCircle(28, 12, 10);
    
    playerGraphics.fillStyle(0x2c3e50, 1);
    playerGraphics.fillCircle(25, 10, 2);
    playerGraphics.fillCircle(31, 10, 2);
    
    playerGraphics.fillStyle(0x4a3728, 1);
    playerGraphics.fillRoundedRect(18, 2, 20, 8, 3);
    
    playerGraphics.generateTexture("player", 56, 56);
    playerGraphics.destroy();

    this.player = this.physics.add.sprite(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
    this.player.body?.setSize(32, 40);
    this.player.body?.setOffset(12, 16);

    this.healthBar = this.add.graphics();
    this.healthBar.setDepth(100);
    this.manaBar = this.add.graphics();
    this.manaBar.setDepth(100);
  }

  createCrosshair() {
    this.crosshair = this.add.graphics();
    this.crosshair.setDepth(1000);
    this.mousePointer = this.input.activePointer;

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.mousePointer = pointer;
    });

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.leftButtonDown() && !this.inStartBuilding) {
        this.performRangedAttack(pointer);
      }
    });
  }

  updateCrosshair() {
    this.crosshair.clear();
    
    const worldPoint = this.cameras.main.getWorldPoint(this.mousePointer.x, this.mousePointer.y);
    
    this.crosshair.lineStyle(2, 0xffffff, 0.8);
    this.crosshair.strokeCircle(worldPoint.x, worldPoint.y, 12);
    this.crosshair.moveTo(worldPoint.x - 18, worldPoint.y);
    this.crosshair.lineTo(worldPoint.x - 8, worldPoint.y);
    this.crosshair.moveTo(worldPoint.x + 8, worldPoint.y);
    this.crosshair.lineTo(worldPoint.x + 18, worldPoint.y);
    this.crosshair.moveTo(worldPoint.x, worldPoint.y - 18);
    this.crosshair.lineTo(worldPoint.x, worldPoint.y - 8);
    this.crosshair.moveTo(worldPoint.x, worldPoint.y + 8);
    this.crosshair.lineTo(worldPoint.x, worldPoint.y + 18);
    this.crosshair.strokePath();
  }

  performRangedAttack(pointer: Phaser.Input.Pointer) {
    const now = this.time.now;
    if (now - this.lastAttackTime < 300) return;
    this.lastAttackTime = now;

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);
    
    this.createPlayerProjectile(angle, this.stats.attack, 0xffaa44, 350);
  }

  createPlayerProjectile(angle: number, damage: number, color: number, range: number) {
    const startX = this.player.x + Math.cos(angle) * 30;
    const startY = this.player.y + Math.sin(angle) * 30;
    
    const projectile = this.add.graphics();
    projectile.setDepth(15);
    projectile.fillStyle(color, 1);
    projectile.fillCircle(0, 0, 8);
    projectile.fillStyle(0xffffff, 0.6);
    projectile.fillCircle(-2, -2, 3);
    projectile.setPosition(startX, startY);

    const speed = 450;
    const endX = startX + Math.cos(angle) * range;
    const endY = startY + Math.sin(angle) * range;
    const duration = (range / speed) * 1000;

    const trail = this.add.graphics();
    trail.setDepth(14);
    const trailPoints: { x: number; y: number }[] = [];

    this.tweens.add({
      targets: projectile,
      x: endX,
      y: endY,
      duration: duration,
      onUpdate: () => {
        trailPoints.push({ x: projectile.x, y: projectile.y });
        if (trailPoints.length > 12) trailPoints.shift();
        
        trail.clear();
        trailPoints.forEach((point, i) => {
          const alpha = (i / trailPoints.length) * 0.4;
          trail.fillStyle(color, alpha);
          trail.fillCircle(point.x, point.y, 6 * (i / trailPoints.length));
        });

        this.enemies.getChildren().forEach((enemy) => {
          const e = enemy as Phaser.Physics.Arcade.Sprite;
          const dist = Phaser.Math.Distance.Between(projectile.x, projectile.y, e.x, e.y);
          
          if (dist < 30) {
            const finalDamage = damage + Math.floor(Math.random() * 5);
            this.damageEnemy(e, finalDamage, color);
            projectile.destroy();
            trail.destroy();
          }
        });
      },
      onComplete: () => {
        projectile.destroy();
        this.time.delayedCall(200, () => trail.destroy());
      },
    });
  }

  damageEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number, color: number) {
    const health = enemy.getData("health") - damage;
    enemy.setData("health", health);

    this.showFloatingText(enemy.x, enemy.y - 20, `-${damage}`, Phaser.Display.Color.IntegerToColor(color).rgba);

    this.tweens.add({
      targets: enemy,
      tint: color,
      duration: 100,
      yoyo: true,
    });

    if (health <= 0) {
      const xpValue = enemy.getData("xpValue");
      const goldValue = enemy.getData("goldValue");
      const healthBar = enemy.getData("healthBar");
      const castBar = enemy.getData("castBar");
      if (healthBar) healthBar.destroy();
      if (castBar) castBar.destroy();
      this.gainXP(xpValue);
      this.spawnLoot(enemy.x, enemy.y, goldValue);
      enemy.destroy();
    }
  }

  createEnemyTextures() {
    const goblinGraphics = this.make.graphics({ x: 0, y: 0 });
    goblinGraphics.fillStyle(0x4a8c3a, 1);
    goblinGraphics.fillCircle(20, 22, 14);
    goblinGraphics.fillStyle(0x3a7030, 1);
    goblinGraphics.fillRoundedRect(10, 28, 20, 16, 3);
    goblinGraphics.fillStyle(0xffcc00, 1);
    goblinGraphics.fillCircle(15, 18, 3);
    goblinGraphics.fillCircle(25, 18, 3);
    goblinGraphics.generateTexture("goblin", 40, 48);
    goblinGraphics.destroy();

    const skeletonGraphics = this.make.graphics({ x: 0, y: 0 });
    skeletonGraphics.fillStyle(0xe8e0d0, 1);
    skeletonGraphics.fillCircle(20, 14, 12);
    skeletonGraphics.fillStyle(0x1a1a1a, 1);
    skeletonGraphics.fillCircle(15, 12, 3);
    skeletonGraphics.fillCircle(25, 12, 3);
    skeletonGraphics.fillRect(16, 18, 8, 2);
    skeletonGraphics.fillStyle(0xd8d0c0, 1);
    skeletonGraphics.fillRect(17, 26, 6, 20);
    skeletonGraphics.generateTexture("skeleton", 40, 48);
    skeletonGraphics.destroy();

    const mageGraphics = this.make.graphics({ x: 0, y: 0 });
    mageGraphics.fillStyle(0x6a2a8a, 1);
    mageGraphics.fillRoundedRect(12, 20, 24, 30, 4);
    mageGraphics.fillStyle(0xf5deb3, 1);
    mageGraphics.fillCircle(24, 14, 10);
    mageGraphics.fillStyle(0x4a1a6a, 1);
    mageGraphics.fillTriangle(24, 0, 10, 18, 38, 18);
    mageGraphics.fillStyle(0xaa44ff, 1);
    mageGraphics.fillCircle(20, 12, 2);
    mageGraphics.fillCircle(28, 12, 2);
    mageGraphics.generateTexture("mage", 48, 52);
    mageGraphics.destroy();

    const archerGraphics = this.make.graphics({ x: 0, y: 0 });
    archerGraphics.fillStyle(0x5a7a4a, 1);
    archerGraphics.fillRoundedRect(14, 22, 20, 26, 3);
    archerGraphics.fillStyle(0xf5deb3, 1);
    archerGraphics.fillCircle(24, 14, 9);
    archerGraphics.fillStyle(0x8b4513, 1);
    archerGraphics.fillRect(36, 18, 4, 28);
    archerGraphics.lineStyle(2, 0x4a3a2a, 1);
    archerGraphics.strokeCircle(38, 32, 12);
    archerGraphics.generateTexture("archer", 48, 52);
    archerGraphics.destroy();

    const bossGraphics = this.make.graphics({ x: 0, y: 0 });
    bossGraphics.fillStyle(0x8a2a2a, 1);
    bossGraphics.fillCircle(32, 28, 26);
    bossGraphics.fillStyle(0x6a1a1a, 1);
    bossGraphics.fillRoundedRect(12, 40, 40, 30, 5);
    bossGraphics.fillStyle(0xffaa00, 1);
    bossGraphics.fillCircle(22, 24, 5);
    bossGraphics.fillCircle(42, 24, 5);
    bossGraphics.fillStyle(0x4a0a0a, 1);
    bossGraphics.fillTriangle(20, 8, 26, 0, 32, 8);
    bossGraphics.fillTriangle(32, 8, 38, 0, 44, 8);
    bossGraphics.generateTexture("boss", 64, 72);
    bossGraphics.destroy();
  }

  createEnemies() {
    this.createEnemyTextures();

    this.enemies = this.physics.add.group({
      collideWorldBounds: true,
    });

    for (let i = 0; i < 35; i++) {
      this.spawnEnemy();
    }
  }

  spawnEnemy() {
    if (this.enemies.countActive(true) >= 60) return;

    let x = 0, y = 0;
    let zone: DifficultyZone;
    let attempts = 0;

    do {
      x = 300 + Math.random() * (WORLD_WIDTH - 600);
      y = 300 + Math.random() * (WORLD_HEIGHT - 600);
      zone = this.getZoneAt(x, y);
      attempts++;
    } while (
      attempts < 30 && (
        ZONE_MULT[zone] === 0 ||
        Phaser.Math.Distance.Between(x, y, this.player?.x || WORLD_WIDTH / 2, this.player?.y || WORLD_HEIGHT / 2) < 250
      )
    );

    if (ZONE_MULT[zone] === 0) return;

    const biome = this.getBiomeAt(x, y);
    let enemyType: string;
    let baseHealth: number;
    let baseAttack: number;
    let xpMultiplier: number;
    let isRanged = false;
    let hasAoE = false;

    const zoneMultiplier = ZONE_MULT[zone];
    const bossChance = ZONE_BOSS_CHANCE[zone];

    if (Math.random() < bossChance) {
      enemyType = "boss";
      baseHealth = 200;
      baseAttack = 20;
      xpMultiplier = 5;
      isRanged = true;
      hasAoE = true;
    } else if (Math.random() > 0.7) {
      enemyType = Math.random() > 0.5 ? "mage" : "archer";
      baseHealth = 25;
      baseAttack = 8;
      xpMultiplier = 1.3;
      isRanged = true;
      hasAoE = enemyType === "mage";
    } else {
      switch (biome) {
        case "snow":
          enemyType = "skeleton";
          baseHealth = 30;
          baseAttack = 7;
          xpMultiplier = 1.1;
          break;
        case "desert":
          enemyType = "skeleton";
          baseHealth = 28;
          baseAttack = 6;
          xpMultiplier = 1.0;
          break;
        case "swamp":
          enemyType = "goblin";
          baseHealth = 40;
          baseAttack = 9;
          xpMultiplier = 1.3;
          break;
        case "forest":
          enemyType = "goblin";
          baseHealth = 32;
          baseAttack = 7;
          xpMultiplier = 1.1;
          break;
        default:
          enemyType = Math.random() > 0.5 ? "goblin" : "skeleton";
          baseHealth = 28;
          baseAttack = 6;
          xpMultiplier = 1.0;
      }
    }

    const enemy = this.enemies.create(x, y, enemyType) as Phaser.Physics.Arcade.Sprite;
    const levelBonus = this.stats.level - 1;
    const scaledHealth = Math.floor((baseHealth + levelBonus * 10) * zoneMultiplier);
    const scaledAttack = Math.floor((baseAttack + levelBonus * 2) * zoneMultiplier);
    
    enemy.setData("health", scaledHealth);
    enemy.setData("maxHealth", scaledHealth);
    enemy.setData("attack", scaledAttack);
    enemy.setData("xpValue", Math.floor((15 + levelBonus * 5) * xpMultiplier * zoneMultiplier));
    enemy.setData("goldValue", Math.floor((5 + Math.random() * 10) * zoneMultiplier));
    enemy.setData("patrolX", x);
    enemy.setData("patrolY", y);
    enemy.setData("state", "patrol");
    enemy.setData("lastAttack", 0);
    enemy.setData("type", enemyType);
    enemy.setData("isRanged", isRanged);
    enemy.setData("hasAoE", hasAoE);
    enemy.setData("castTime", 0);
    enemy.setData("isCasting", false);
    enemy.setData("zone", zone);
    enemy.setDepth(5);
    
    if (enemyType === "boss") {
      enemy.setScale(1.3);
      enemy.body?.setSize(50, 56);
    } else {
      enemy.body?.setSize(28, 36);
    }
  }

  createObstacles() {
    const rockGraphics = this.make.graphics({ x: 0, y: 0 });
    rockGraphics.fillStyle(0x6a6a6a, 1);
    rockGraphics.fillCircle(24, 28, 22);
    rockGraphics.fillStyle(0x8a8a8a, 1);
    rockGraphics.fillCircle(18, 20, 10);
    rockGraphics.generateTexture("rock", 48, 52);
    rockGraphics.destroy();

    const treeGraphics = this.make.graphics({ x: 0, y: 0 });
    treeGraphics.fillStyle(0x6b4423, 1);
    treeGraphics.fillRect(22, 50, 16, 30);
    treeGraphics.fillStyle(0x228b22, 1);
    treeGraphics.fillCircle(30, 30, 26);
    treeGraphics.fillStyle(0x1a7a1a, 1);
    treeGraphics.fillCircle(22, 36, 16);
    treeGraphics.generateTexture("tree", 60, 80);
    treeGraphics.destroy();

    this.obstacles = this.physics.add.staticGroup();

    for (let i = 0; i < 80; i++) {
      let x, y;
      let attempts = 0;
      do {
        x = 200 + Math.random() * (WORLD_WIDTH - 400);
        y = 200 + Math.random() * (WORLD_HEIGHT - 400);
        attempts++;
      } while (
        attempts < 15 && (
          Phaser.Math.Distance.Between(x, y, WORLD_WIDTH / 2, WORLD_HEIGHT / 2) < 250 ||
          Math.abs(x - WORLD_WIDTH / 2) < 120 ||
          Math.abs(y - WORLD_HEIGHT / 2) < 120
        )
      );

      const isTree = Math.random() > 0.4;
      const obstacle = this.obstacles.create(x, y, isTree ? "tree" : "rock");
      obstacle.setDepth(isTree ? 8 : 3);
      
      if (isTree) {
        obstacle.body.setSize(20, 20);
        obstacle.body.setOffset(20, 55);
      } else {
        obstacle.body.setSize(36, 36);
        obstacle.body.setOffset(6, 10);
      }
    }
  }

  setupInput() {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    
    this.spellKeys = {
      "1": this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      "2": this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      "3": this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      "4": this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
    };
  }

  setupCamera() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.15);
  }

  setupCollisions() {
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.player, this.buildingGroup);
    this.physics.add.collider(this.enemies, this.obstacles);
    this.physics.add.collider(this.enemies, this.enemies);
  }

  createMinimap() {
    this.minimapGraphics = this.add.graphics();
    this.minimapGraphics.setScrollFactor(0);
    this.minimapGraphics.setDepth(1000);
  }

  updateMinimap() {
    const mapSize = 130;
    const mapX = 10;
    const mapY = 10;
    const scaleX = mapSize / WORLD_WIDTH;
    const scaleY = (mapSize * (WORLD_HEIGHT / WORLD_WIDTH)) / WORLD_HEIGHT;

    this.minimapGraphics.clear();
    
    this.minimapGraphics.fillStyle(0x000000, 0.8);
    this.minimapGraphics.fillRoundedRect(mapX - 4, mapY - 4, mapSize + 8, mapSize * (WORLD_HEIGHT / WORLD_WIDTH) + 8, 6);
    
    this.minimapGraphics.fillStyle(0x4a7c3f, 1);
    this.minimapGraphics.fillRect(mapX, mapY, mapSize, mapSize * (WORLD_HEIGHT / WORLD_WIDTH));
    
    const safeZoneX = mapX + (WORLD_WIDTH / 2 - 300) * scaleX;
    const safeZoneY = mapY + (WORLD_HEIGHT / 2 - 300) * scaleY;
    this.minimapGraphics.fillStyle(0x88ff88, 0.3);
    this.minimapGraphics.fillCircle(mapX + mapSize / 2, mapY + (mapSize * (WORLD_HEIGHT / WORLD_WIDTH)) / 2, 15);
    
    this.minimapGraphics.fillStyle(0x3498db, 1);
    const playerMapX = mapX + (this.player.x * scaleX);
    const playerMapY = mapY + (this.player.y * scaleY);
    this.minimapGraphics.fillCircle(playerMapX, playerMapY, 4);
    
    // Zone grid on minimap
    const mmW = mapSize;
    const mmH = mapSize * (WORLD_HEIGHT / WORLD_WIDTH);
    this.minimapGraphics.lineStyle(1, 0x444444, 0.8);
    this.minimapGraphics.moveTo(mapX + mmW / 3,     mapY);           this.minimapGraphics.lineTo(mapX + mmW / 3,     mapY + mmH);
    this.minimapGraphics.moveTo(mapX + mmW * 2 / 3, mapY);           this.minimapGraphics.lineTo(mapX + mmW * 2 / 3, mapY + mmH);
    this.minimapGraphics.moveTo(mapX,               mapY + mmH / 3); this.minimapGraphics.lineTo(mapX + mmW,         mapY + mmH / 3);
    this.minimapGraphics.moveTo(mapX,               mapY + mmH * 2 / 3); this.minimapGraphics.lineTo(mapX + mmW, mapY + mmH * 2 / 3);
    this.minimapGraphics.strokePath();

    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite;
      const zone = e.getData("zone") as DifficultyZone;
      const color = this.getZoneColor(zone);
      this.minimapGraphics.fillStyle(color, 0.9);
      const ex = mapX + (e.x * scaleX);
      const ey = mapY + (e.y * scaleY);
      this.minimapGraphics.fillCircle(ex, ey, 2);
    });
  }

  handleEnemyProjectileHit(projectile: Phaser.Physics.Arcade.Sprite) {
    const damage = projectile.getData("damage") as number;
    const isAoE = projectile.getData("isAoE") as boolean;
    
    if (isAoE) {
      this.createAoEEffect(projectile.x, projectile.y, projectile.getData("color") as number);
    }
    
    const finalDamage = Math.max(1, damage - this.stats.defense);
    this.stats.health -= finalDamage;
    this.showFloatingText(this.player.x, this.player.y - 20, `-${finalDamage}`, "#ff4444");
    
    this.tweens.add({
      targets: this.player,
      tint: 0xff0000,
      duration: 100,
      yoyo: true,
    });
    
    this.cameras.main.shake(80, 0.01);
    
    if (this.stats.health <= 0) {
      this.respawnPlayer();
    }
    
    projectile.destroy();
    this.notifyStats();
  }

  createAoEEffect(x: number, y: number, color: number) {
    const aoe = this.add.graphics();
    aoe.setDepth(12);
    aoe.fillStyle(color, 0.4);
    aoe.fillCircle(x, y, 60);
    aoe.lineStyle(3, color, 0.8);
    aoe.strokeCircle(x, y, 60);
    
    this.tweens.add({
      targets: aoe,
      alpha: 0,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 400,
      onComplete: () => aoe.destroy(),
    });

    const dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    if (dist < 70) {
      const aoeDamage = Math.max(1, 15 - this.stats.defense);
      this.stats.health -= aoeDamage;
      this.showFloatingText(this.player.x, this.player.y - 30, `-${aoeDamage} AoE`, "#ff8800");
      this.notifyStats();
    }
  }

  collectLoot(sprite: Phaser.Physics.Arcade.Sprite) {
    const lootType = sprite.getData("type") as string;
    const value = sprite.getData("value") as number;

    if (lootType === "gold") {
      this.stats.gold += value;
      this.showFloatingText(sprite.x, sprite.y, `+${value} Gold`, "#ffd700");
    } else if (lootType === "health") {
      this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + value);
      this.showFloatingText(sprite.x, sprite.y, `+${value} HP`, "#00ff00");
    } else if (lootType === "mana") {
      this.stats.mana = Math.min(this.stats.maxMana, this.stats.mana + value);
      this.showFloatingText(sprite.x, sprite.y, `+${value} MP`, "#00aaff");
    }

    sprite.destroy();
    this.notifyStats();
  }

  showFloatingText(x: number, y: number, text: string, color: string) {
    const floatText = this.add.text(x, y, text, {
      fontSize: "16px",
      color: color,
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    });
    floatText.setOrigin(0.5);
    floatText.setDepth(200);

    this.tweens.add({
      targets: floatText,
      y: y - 50,
      alpha: 0,
      scale: 1.2,
      duration: 1000,
      ease: "Power2",
      onComplete: () => floatText.destroy(),
    });
  }

  gainXP(amount: number) {
    this.stats.xp += amount;
    this.showFloatingText(this.player.x, this.player.y - 30, `+${amount} XP`, "#9b59b6");

    while (this.stats.xp >= this.stats.xpToLevel) {
      this.stats.xp -= this.stats.xpToLevel;
      this.stats.level++;
      this.stats.xpToLevel = Math.floor(this.stats.xpToLevel * 1.4);
      this.stats.maxHealth += 25;
      this.stats.health = this.stats.maxHealth;
      this.stats.maxMana += 15;
      this.stats.mana = this.stats.maxMana;
      this.stats.attack += 4;
      this.stats.defense += 2;

      this.showFloatingText(this.player.x, this.player.y - 60, `LEVEL UP! ${this.stats.level}`, "#ffff00");
      this.cameras.main.flash(400, 255, 215, 0);
    }
    
    this.notifyStats();
  }

  spawnLoot(x: number, y: number, goldAmount: number) {
    const goldGraphics = this.make.graphics({ x: 0, y: 0 });
    goldGraphics.fillStyle(0xffd700, 1);
    goldGraphics.fillCircle(10, 10, 8);
    goldGraphics.fillStyle(0xffea00, 1);
    goldGraphics.fillCircle(8, 8, 4);
    goldGraphics.generateTexture("goldLoot", 20, 20);
    goldGraphics.destroy();

    const gold = this.loot.create(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 30, "goldLoot");
    gold.setData("type", "gold");
    gold.setData("value", goldAmount);
    gold.setDepth(4);

    if (Math.random() > 0.5) {
      const healthGraphics = this.make.graphics({ x: 0, y: 0 });
      healthGraphics.fillStyle(0xff3333, 1);
      healthGraphics.fillRoundedRect(3, 8, 14, 4, 1);
      healthGraphics.fillRoundedRect(8, 3, 4, 14, 1);
      healthGraphics.generateTexture("healthLoot", 20, 20);
      healthGraphics.destroy();

      const health = this.loot.create(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, "healthLoot");
      health.setData("type", "health");
      health.setData("value", 25);
      health.setDepth(4);
    }

    if (Math.random() > 0.65) {
      const manaGraphics = this.make.graphics({ x: 0, y: 0 });
      manaGraphics.fillStyle(0x4488ff, 1);
      manaGraphics.fillRoundedRect(6, 2, 8, 16, 3);
      manaGraphics.fillStyle(0x66aaff, 1);
      manaGraphics.fillCircle(10, 5, 4);
      manaGraphics.generateTexture("manaLoot", 20, 20);
      manaGraphics.destroy();

      const mana = this.loot.create(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40, "manaLoot");
      mana.setData("type", "mana");
      mana.setData("value", 20);
      mana.setDepth(4);
    }
  }

  castSpell(spell: Spell) {
    const now = this.time.now;
    const cooldownEnd = this.spellCooldowns[spell.id] || 0;
    
    if (now < cooldownEnd) return;
    if (this.stats.mana < spell.manaCost) {
      this.showFloatingText(this.player.x, this.player.y - 20, "No Mana!", "#ff4444");
      return;
    }

    this.stats.mana -= spell.manaCost;
    this.spellCooldowns[spell.id] = now + spell.cooldown;
    this.notifyStats();
    this.onSpellCooldownUpdate?.({ ...this.spellCooldowns });

    if (spell.id === "heal") {
      const healAmount = Math.abs(spell.damage) + this.stats.level * 5;
      this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + healAmount);
      this.showFloatingText(this.player.x, this.player.y - 40, `+${healAmount} HP`, "#00ff88");
      this.createHealEffect();
      this.notifyStats();
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(this.mousePointer.x, this.mousePointer.y);
    const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, worldPoint.x, worldPoint.y);
    this.createSpellProjectile(spell, angle);
  }

  createSpellProjectile(spell: Spell, angle: number) {
    const startX = this.player.x + Math.cos(angle) * 30;
    const startY = this.player.y + Math.sin(angle) * 30;
    
    const projectile = this.add.graphics();
    projectile.setDepth(15);
    
    const size = spell.id === "lightning" ? 10 : 14;
    projectile.fillStyle(spell.color, 1);
    projectile.fillCircle(0, 0, size);
    projectile.fillStyle(0xffffff, 0.7);
    projectile.fillCircle(-3, -3, size * 0.4);
    
    projectile.setPosition(startX, startY);

    const speed = spell.id === "lightning" ? 650 : 480;
    const endX = startX + Math.cos(angle) * spell.range;
    const endY = startY + Math.sin(angle) * spell.range;
    const duration = (spell.range / speed) * 1000;

    const trail = this.add.graphics();
    trail.setDepth(14);
    const trailPoints: { x: number; y: number }[] = [];

    this.tweens.add({
      targets: projectile,
      x: endX,
      y: endY,
      duration: duration,
      onUpdate: () => {
        trailPoints.push({ x: projectile.x, y: projectile.y });
        if (trailPoints.length > 18) trailPoints.shift();
        
        trail.clear();
        trailPoints.forEach((point, i) => {
          const alpha = (i / trailPoints.length) * 0.5;
          trail.fillStyle(spell.color, alpha);
          trail.fillCircle(point.x, point.y, size * (i / trailPoints.length) * 0.7);
        });

        this.enemies.getChildren().forEach((enemy) => {
          const e = enemy as Phaser.Physics.Arcade.Sprite;
          const dist = Phaser.Math.Distance.Between(projectile.x, projectile.y, e.x, e.y);
          
          if (dist < 35) {
            const damage = spell.damage + this.stats.attack * 0.5 + Math.floor(Math.random() * 8);
            this.damageEnemy(e, damage, spell.color);
            projectile.destroy();
            trail.destroy();
          }
        });
      },
      onComplete: () => {
        projectile.destroy();
        this.time.delayedCall(250, () => trail.destroy());
      },
    });
  }

  createHealEffect() {
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const particle = this.add.graphics();
      particle.fillStyle(0x00ff88, 1);
      particle.fillCircle(0, 0, 5);
      particle.setPosition(
        this.player.x + Math.cos(angle) * 20,
        this.player.y + Math.sin(angle) * 20
      );
      particle.setDepth(20);
      
      this.tweens.add({
        targets: particle,
        x: this.player.x + Math.cos(angle) * 50,
        y: this.player.y + Math.sin(angle) * 50 - 25,
        alpha: 0,
        scale: 0.3,
        duration: 700,
        ease: "Power2",
        onComplete: () => particle.destroy(),
      });
    }
  }

  updateEnemyAI(delta: number) {
    const now = this.time.now;
    
    this.enemies.getChildren().forEach((enemy) => {
      const e = enemy as Phaser.Physics.Arcade.Sprite;
      const distToPlayer = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
      const state = e.getData("state");
      const isRanged = e.getData("isRanged");
      const hasAoE = e.getData("hasAoE");
      const isCasting = e.getData("isCasting");
      const enemyType = e.getData("type");

      const aggroRange = isRanged ? 320 : 200;
      const attackRange = isRanged ? 280 : 45;
      const moveSpeed = enemyType === "boss" ? 60 : (isRanged ? 70 : 85);

      if (isCasting) {
        e.setVelocity(0, 0);
        const castProgress = (now - e.getData("castStartTime")) / e.getData("castDuration");
        
        this.updateCastBar(e, castProgress);
        
        if (castProgress >= 1) {
          e.setData("isCasting", false);
          this.enemyCastSpell(e, hasAoE);
        }
        return;
      }

      if (distToPlayer < aggroRange && !this.inStartBuilding) {
        e.setData("state", "chase");
        
        if (distToPlayer > attackRange) {
          const angle = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
          e.setVelocity(Math.cos(angle) * moveSpeed, Math.sin(angle) * moveSpeed);
        } else {
          e.setVelocity(0, 0);
          
          const lastAttack = e.getData("lastAttack") || 0;
          const attackCooldown = isRanged ? 2500 : 1000;
          
          if (now - lastAttack > attackCooldown) {
            if (isRanged) {
              e.setData("isCasting", true);
              e.setData("castStartTime", now);
              e.setData("castDuration", hasAoE ? 1500 : 800);
              this.showCastBar(e);
              // Souls-like: show telegraph for ranged/AoE attacks
              if (hasAoE) {
                this.telegraphManager.aoeCircle(
                  this.player.x, this.player.y, 70,
                  hasAoE ? 1500 : 800
                );
              } else {
                this.telegraphManager.rangedLine(
                  e.x, e.y, this.player.x, this.player.y, 800
                );
              }
            } else {
              // Souls-like: show melee telegraph before hit lands
              const meleeDir = Phaser.Math.Angle.Between(e.x, e.y, this.player.x, this.player.y);
              const windUpMs = enemyType === "boss" ? 800 : 500;
              this.telegraphManager.meleeCone(
                e.x, e.y, attackRange + 15, meleeDir, Math.PI / 3, windUpMs,
                () => {
                  // Damage lands after telegraph completes
                  if (!e.active) return;
                  // Check if player dodged (was in dodge window + moved out)
                  const playerDist = Phaser.Math.Distance.Between(e.x, e.y, this.player.x, this.player.y);
                  if (playerDist > attackRange + 20) {
                    this.showFloatingText(this.player.x, this.player.y - 20, "DODGED!", "#00ff66");
                    return;
                  }
                  const damage = Math.max(1, e.getData("attack") - this.stats.defense);
                  this.stats.health -= damage;
                  this.showFloatingText(this.player.x, this.player.y - 20, `-${damage}`, "#ff0000");
                  this.tweens.add({ targets: this.player, tint: 0xff0000, duration: 100, yoyo: true });
                  this.cameras.main.shake(60, 0.008);
                  if (this.stats.health <= 0) this.respawnPlayer();
                  this.notifyStats();
                }
              );
              e.setData("lastAttack", now);
            }
          }
        }
      } else if (state === "chase" && distToPlayer > aggroRange + 100) {
        e.setData("state", "patrol");
      } else if (state === "patrol") {
        const patrolX = e.getData("patrolX");
        const patrolY = e.getData("patrolY");
        const distToPatrol = Phaser.Math.Distance.Between(e.x, e.y, patrolX, patrolY);

        if (distToPatrol > 60) {
          const angle = Phaser.Math.Angle.Between(e.x, e.y, patrolX, patrolY);
          e.setVelocity(Math.cos(angle) * 30, Math.sin(angle) * 30);
        } else {
          if (Math.random() < 0.01) {
            const newX = Phaser.Math.Clamp(patrolX + (Math.random() - 0.5) * 200, 200, WORLD_WIDTH - 200);
            const newY = Phaser.Math.Clamp(patrolY + (Math.random() - 0.5) * 200, 200, WORLD_HEIGHT - 200);
            e.setData("patrolX", newX);
            e.setData("patrolY", newY);
          }
          e.setVelocity(0, 0);
        }
      }

      const health = e.getData("health");
      const maxHealth = e.getData("maxHealth");
      if (health < maxHealth) {
        const barWidth = enemyType === "boss" ? 50 : 32;
        const barHeight = 5;
        const healthPercent = health / maxHealth;
        
        if (!e.getData("healthBar")) {
          const bar = this.add.graphics();
          e.setData("healthBar", bar);
        }
        
        const bar = e.getData("healthBar") as Phaser.GameObjects.Graphics;
        bar.clear();
        bar.fillStyle(0x000000, 0.8);
        bar.fillRoundedRect(e.x - barWidth / 2 - 2, e.y - 32, barWidth + 4, barHeight + 4, 2);
        bar.fillStyle(0xcc2222, 1);
        bar.fillRoundedRect(e.x - barWidth / 2, e.y - 30, barWidth * healthPercent, barHeight, 2);
        bar.setDepth(50);
      }
    });
  }

  showCastBar(enemy: Phaser.Physics.Arcade.Sprite) {
    const castBar = this.add.graphics();
    enemy.setData("castBar", castBar);
  }

  updateCastBar(enemy: Phaser.Physics.Arcade.Sprite, progress: number) {
    const castBar = enemy.getData("castBar") as Phaser.GameObjects.Graphics;
    if (!castBar) return;
    
    const barWidth = 40;
    const barHeight = 6;
    const enemyType = enemy.getData("type");
    const yOffset = enemyType === "boss" ? -50 : -42;
    
    castBar.clear();
    castBar.fillStyle(0x000000, 0.9);
    castBar.fillRoundedRect(enemy.x - barWidth / 2 - 2, enemy.y + yOffset, barWidth + 4, barHeight + 4, 2);
    castBar.fillStyle(0xaa44ff, 1);
    castBar.fillRoundedRect(enemy.x - barWidth / 2, enemy.y + yOffset + 2, barWidth * Math.min(1, progress), barHeight, 2);
    castBar.setDepth(51);
  }

  enemyCastSpell(enemy: Phaser.Physics.Arcade.Sprite, isAoE: boolean) {
    const castBar = enemy.getData("castBar") as Phaser.GameObjects.Graphics;
    if (castBar) {
      castBar.destroy();
      enemy.setData("castBar", null);
    }
    
    enemy.setData("lastAttack", this.time.now);
    
    // Boss special: use boss slam/sweep telegraphs
    const enemyType = enemy.getData("type");
    if (enemyType === "boss" && isAoE) {
      if (Math.random() > 0.5) {
        const dir = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        this.telegraphManager.bossSweep(enemy.x, enemy.y, 120, dir, 1200);
      } else {
        this.telegraphManager.bossSlam(this.player.x, this.player.y, 90, 1500);
      }
    }
    
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const startX = enemy.x + Math.cos(angle) * 25;
    const startY = enemy.y + Math.sin(angle) * 25;
    
    const color = isAoE ? 0xaa44ff : 0xff4444;
    const damage = enemy.getData("attack");
    
    const projectile = this.physics.add.sprite(startX, startY, "");
    projectile.setVisible(false);
    projectile.setData("damage", damage);
    projectile.setData("isAoE", isAoE);
    projectile.setData("color", color);
    
    this.enemyProjectiles.add(projectile);
    
    const visualProjectile = this.add.graphics();
    visualProjectile.setDepth(15);
    visualProjectile.fillStyle(color, 1);
    visualProjectile.fillCircle(0, 0, isAoE ? 12 : 8);
    visualProjectile.fillStyle(0xffffff, 0.5);
    visualProjectile.fillCircle(-2, -2, isAoE ? 5 : 3);
    visualProjectile.setPosition(startX, startY);
    
    const speed = 300;
    const range = 350;
    const endX = startX + Math.cos(angle) * range;
    const endY = startY + Math.sin(angle) * range;
    const duration = (range / speed) * 1000;
    
    const trail = this.add.graphics();
    trail.setDepth(14);
    const trailPoints: { x: number; y: number }[] = [];
    
    this.tweens.add({
      targets: [projectile, visualProjectile],
      x: endX,
      y: endY,
      duration: duration,
      onUpdate: () => {
        trailPoints.push({ x: visualProjectile.x, y: visualProjectile.y });
        if (trailPoints.length > 12) trailPoints.shift();
        
        trail.clear();
        trailPoints.forEach((point, i) => {
          const alpha = (i / trailPoints.length) * 0.4;
          trail.fillStyle(color, alpha);
          trail.fillCircle(point.x, point.y, (isAoE ? 10 : 6) * (i / trailPoints.length));
        });
      },
      onComplete: () => {
        visualProjectile.destroy();
        projectile.destroy();
        this.time.delayedCall(150, () => trail.destroy());
      },
    });
  }

  respawnPlayer() {
    this.stats.health = this.stats.maxHealth;
    this.stats.mana = this.stats.maxMana;
    this.stats.gold = Math.floor(this.stats.gold * 0.85);
    
    this.inStartBuilding = true;
    this.player.setPosition(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.onGameStateChange?.(true, "travelers_town");
    
    this.cameras.main.fade(400, 0, 0, 0, false, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        this.cameras.main.fadeIn(400);
      }
    });
    
    this.showFloatingText(this.player.x, this.player.y - 40, "Respawned in Safe Zone!", "#ffffff");
    this.notifyStats();
  }

  notifyStats() {
    if (this.onStatsUpdate) {
      this.onStatsUpdate({ ...this.stats });
    }
  }

  update(_time: number, delta: number) {
    if (!this.player || !this.player.body) return;

    const speed = 200;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      vx = -speed;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      vx = speed;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      vy = -speed;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      vy = speed;
    }

    if (vx !== 0 && vy !== 0) {
      vx *= 0.707;
      vy *= 0.707;
    }

    this.player.setVelocity(vx, vy);

    if (!this.inStartBuilding) {
      SPELLS.forEach((spell) => {
        if (Phaser.Input.Keyboard.JustDown(this.spellKeys[spell.key])) {
          this.castSpell(spell);
        }
      });

      const newZone = this.getZoneAt(this.player.x, this.player.y);
      if (newZone !== this.currentZone) {
        this.currentZone = newZone;
        this.onGameStateChange?.(false, newZone);
      }
    }

    this.updateEnemyAI(delta);
    this.telegraphManager.update();
    this.updateMinimap();
    this.updateCrosshair();

    this.healthBar.clear();
    this.manaBar.clear();
    
    const healthPercent = this.stats.health / this.stats.maxHealth;
    this.healthBar.fillStyle(0x000000, 0.8);
    this.healthBar.fillRoundedRect(this.player.x - 26, this.player.y - 38, 52, 10, 3);
    this.healthBar.fillStyle(healthPercent > 0.3 ? 0x22cc44 : 0xcc2222, 1);
    this.healthBar.fillRoundedRect(this.player.x - 24, this.player.y - 36, 48 * healthPercent, 6, 2);

    const manaPercent = this.stats.mana / this.stats.maxMana;
    this.manaBar.fillStyle(0x000000, 0.8);
    this.manaBar.fillRoundedRect(this.player.x - 22, this.player.y - 28, 44, 6, 2);
    this.manaBar.fillStyle(0x3388ff, 1);
    this.manaBar.fillRoundedRect(this.player.x - 20, this.player.y - 26, 40 * manaPercent, 4, 1);
  }
}

export default function MMOWorld() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MMOScene | null>(null);
  const spritesLoadedRef = useRef(false);

  const [selectedHero, setSelectedHero] = useState<GrudaWarsHero | null>(null);
  const [showHeroSelect, setShowHeroSelect] = useState(true);

  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    mana: 80,
    maxMana: 80,
    xp: 0,
    xpToLevel: 100,
    level: 1,
    gold: 0,
    attack: 10,
    defense: 5,
  });

  const [spellCooldowns, setSpellCooldowns] = useState<SpellCooldown>({});
  const [inBuilding, setInBuilding] = useState(true);
  const [currentZone, setCurrentZone] = useState<DifficultyZone>("travelers_town");
  const [spritesLoading, setSpritesLoading] = useState(true);
  const [spriteError, setSpriteError] = useState<string | null>(null);

  // Game uses procedurally generated textures - no sprite loading needed
  useEffect(() => {
    setSpritesLoading(false);
    spritesLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!containerRef.current || gameRef.current || showHeroSelect) return;

    const scene = new MMOScene();
    sceneRef.current = scene;

    // Apply selected hero before scene initializes
    if (selectedHero) {
      scene.setHero(selectedHero);
    }

    scene.setCallbacks(
      (newStats) => setStats(_prev => ({
        ...newStats,
        heroName: selectedHero?.name,
        classId: selectedHero?.classId,
        wcsAttributes: selectedHero?.wcsAttributes,
      })),
      () => {},
      (cooldowns) => setSpellCooldowns(cooldowns),
      (building, zone) => {
        setInBuilding(building);
        setCurrentZone(zone);
      }
    );

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 1100,
      height: 700,
      parent: containerRef.current,
      backgroundColor: "#0a0a12",
      physics: {
        default: "arcade",
        arcade: {
          gravity: { x: 0, y: 0 },
          debug: false,
        },
      },
      scene: scene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, [selectedHero, showHeroSelect]);

  const getSpellCooldownPercent = (spellId: string): number => {
    const spell = SPELLS.find(s => s.id === spellId);
    if (!spell) return 0;
    const cooldownEnd = spellCooldowns[spellId] || 0;
    const now = Date.now();
    if (now >= cooldownEnd) return 100;
    const remaining = cooldownEnd - now;
    return Math.max(0, 100 - (remaining / spell.cooldown) * 100);
  };

  const getSpellIcon = (iconType: string) => {
    switch (iconType) {
      case "fire": return <Flame className="w-5 h-5 text-orange-400" />;
      case "ice": return <Snowflake className="w-5 h-5 text-cyan-400" />;
      case "zap": return <Zap className="w-5 h-5 text-yellow-400" />;
      case "heal": return <Cross className="w-5 h-5 text-green-400" />;
      default: return null;
    }
  };

  const getZoneDisplay = () => {
    const MAP: Record<DifficultyZone, { text: string; color: string; bg: string }> = {
      travelers_town: { text: "Travelers Town ✦ Safe",    color: "text-green-400",    bg: "bg-green-900/30" },
      crusade_coast:  { text: "Zone 1 — Crusade Coast",   color: "text-yellow-400",   bg: "bg-yellow-900/30" },
      fabled_shore:   { text: "Zone 2 — Fabled Shore",    color: "text-emerald-400",  bg: "bg-emerald-900/30" },
      sloarscorth:    { text: "Zone 3 — Sloarscorth",     color: "text-blue-300",     bg: "bg-blue-900/30" },
      pirate_bay:     { text: "Zone 4 — Pirate Bay ⚔ PvP",color: "text-blue-400",    bg: "bg-blue-950/30" },
      nw_wilds:       { text: "Zone 5 — NW Wilds ⚔ PvP",  color: "text-lime-400",    bg: "bg-lime-900/30" },
      ne_wilds:       { text: "Zone 6 — NE Wilds ⚔ PvP",  color: "text-slate-300",   bg: "bg-slate-900/30" },
      sw_wilds:       { text: "Zone 7 — SW Wilds ⚔ PvP",  color: "text-orange-400",  bg: "bg-orange-950/30" },
      se_wilds:       { text: "Zone 8 — SE Wilds ⚔ Boss", color: "text-red-500",     bg: "bg-red-950/30" },
    };
    return MAP[currentZone] ?? { text: "Unknown", color: "text-gray-400", bg: "bg-gray-900/30" };
  };

  const zoneInfo = getZoneDisplay();

  const handleSelectHero = (hero: GrudaWarsHero) => {
    // Destroy existing game if any so the effect can re-create it with the new hero
    if (gameRef.current) {
      gameRef.current.destroy(true);
      gameRef.current = null;
    }
    sceneRef.current = null;
    setSelectedHero(hero);
    setShowHeroSelect(false);
  };

  // Hero selection screen
  if (showHeroSelect) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-[1000px] mx-auto pt-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Choose Your Hero</h1>
            <p className="text-muted-foreground">Your Gruda Wars hero enters the MMO World — same stats, same gear, same legend.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {GRUDA_WARS_HEROES.map((hero) => {
              const derived = deriveCombatStats(hero.wcsAttributes, hero.level);
              return (
                <Card
                  key={hero.syncId}
                  className="cursor-pointer transition-all hover:scale-[1.02] hover:border-primary"
                  onClick={() => handleSelectHero(hero)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{hero.classId === "warrior" ? "⚔️" : hero.classId === "mage" ? "🔮" : hero.classId === "ranger" ? "🏹" : "🐺"}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{hero.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">{hero.title} — {hero.raceId} {hero.classId} Lv.{hero.level}</p>
                        <div className="grid grid-cols-4 gap-1 text-xs">
                          <span>HP: {derived.maxHp}</span>
                          <span>MP: {derived.maxMana}</span>
                          <span>ATK: {derived.physicalDamage}</span>
                          <span>DEF: {derived.defense}</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-xs text-muted-foreground mt-1">
                          <span>STR {hero.wcsAttributes.strength}</span>
                          <span>VIT {hero.wcsAttributes.vitality}</span>
                          <span>INT {hero.wcsAttributes.intellect}</span>
                          <span>AGI {hero.wcsAttributes.agility}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {hero.gdaAbilities.filter(a => a.type === "active").map(a => (
                            <span key={a.id} className="text-[10px] px-1.5 py-0.5 bg-primary/20 rounded">{a.name}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">Heroes are shared across all Grudge Studio games — your progress carries everywhere.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-[1500px] mx-auto">
        {spriteError && (
          <div className="mb-4 p-4 bg-red-950/30 border border-red-500/50 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-red-200">{spriteError}</p>
          </div>
        )}
        
        {spritesLoading && (
          <div className="mb-4 p-4 bg-amber-950/30 border border-amber-500/50 rounded-lg">
            <p className="text-amber-200">Loading game assets...</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Link href="/games">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">MMO World</h1>
            <div className={`px-3 py-1 rounded-full ${zoneInfo.bg} border border-current`}>
              <span className={`text-sm font-semibold ${zoneInfo.color}`} data-testid="zone-indicator">
                {inBuilding ? "Tutorial Building" : zoneInfo.text}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              <span className="font-bold text-lg">Level {stats.level}</span>
            </div>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="text-lg">{stats.gold}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex flex-col gap-3">
            <div
              ref={containerRef}
              className="rounded-lg overflow-hidden border border-border"
              style={{ width: '1100px', height: '700px' }}
              data-testid="game-container"
            />
            
            <div className="flex items-center justify-center gap-3 p-3 bg-card rounded-lg border border-border">
              <span className="text-sm text-muted-foreground mr-2">Spells:</span>
              {SPELLS.map((spell) => {
                const cooldownPercent = getSpellCooldownPercent(spell.id);
                const isReady = cooldownPercent >= 100;
                const hasEnoughMana = stats.mana >= spell.manaCost;
                
                return (
                  <div
                    key={spell.id}
                    className={`relative flex flex-col items-center p-2 rounded-lg border-2 transition-all ${
                      isReady && hasEnoughMana 
                        ? "border-primary bg-primary/10" 
                        : "border-muted bg-muted/20 opacity-60"
                    }`}
                    data-testid={`spell-${spell.id}`}
                  >
                    <div className="relative">
                      {getSpellIcon(spell.icon)}
                      {!isReady && (
                        <div 
                          className="absolute inset-0 bg-black/60 rounded"
                          style={{ clipPath: `inset(${cooldownPercent}% 0 0 0)` }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-bold mt-1">[{spell.key}]</span>
                    <span className="text-xs text-muted-foreground">{spell.manaCost} MP</span>
                  </div>
                );
              })}
            </div>
          </div>

          <Card className="w-72 shrink-0">
            <CardContent className="p-4 space-y-4">
              {inBuilding && (
                <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-sm">Tutorial</span>
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Move with WASD or Arrow keys</li>
                    <li>Left-click to shoot toward cursor</li>
                    <li>Press 1-4 to cast spells at cursor</li>
                    <li>Walk through the green EXIT door</li>
                  </ul>
                  <div className="flex items-center gap-2 mt-2 text-green-400">
                    <DoorOpen className="w-4 h-4" />
                    <span className="text-xs font-medium">Exit to begin adventure</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium">Health</span>
                  </div>
                  <span className="text-sm font-bold">{stats.health}/{stats.maxHealth}</span>
                </div>
                <Progress value={(stats.health / stats.maxHealth) * 100} className="h-3 bg-red-950" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">Mana</span>
                  </div>
                  <span className="text-sm font-bold">{stats.mana}/{stats.maxMana}</span>
                </div>
                <Progress value={(stats.mana / stats.maxMana) * 100} className="h-3 bg-blue-950" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium">Experience</span>
                  </div>
                  <span className="text-sm font-bold">{stats.xp}/{stats.xpToLevel}</span>
                </div>
                <Progress value={(stats.xp / stats.xpToLevel) * 100} className="h-3 bg-amber-950" />
              </div>

              <div className="border-t pt-4 space-y-3">
                <h3 className="font-semibold">Stats</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <Sword className="w-4 h-4 text-orange-400" />
                    <span className="font-medium">ATK: {stats.attack}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                    <Shield className="w-4 h-4 text-blue-400" />
                    <span className="font-medium">DEF: {stats.defense}</span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Controls</h3>
                <div className="text-sm text-muted-foreground space-y-1.5">
                  <p className="flex justify-between"><span>Move:</span><span className="font-mono">WASD</span></p>
                  <p className="flex justify-between"><span>Shoot:</span><span className="font-mono">Left Click</span></p>
                  <p className="flex justify-between"><span>Spells:</span><span className="font-mono">1 2 3 4</span></p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">9 World Zones</h3>
                <div className="space-y-1 text-xs">
                  {([
                    { color: "bg-green-400",   label: "0 · Travelers Town — Safe hub" },
                    { color: "bg-yellow-500",  label: "1 · Crusade Coast — Easy" },
                    { color: "bg-emerald-400", label: "2 · Fabled Shore — Easy+" },
                    { color: "bg-blue-300",    label: "3 · Sloarscorth — Medium" },
                    { color: "bg-blue-500",    label: "4 · Pirate Bay — Hard PvP" },
                    { color: "bg-lime-600",    label: "5 · NW Wilds — Medium PvP" },
                    { color: "bg-slate-400",   label: "6 · NE Wilds — Hard PvP" },
                    { color: "bg-orange-500",  label: "7 · SW Wilds — Volcanic PvP" },
                    { color: "bg-red-700",     label: "8 · SE Wilds — Endgame Boss" },
                  ] as const).map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
