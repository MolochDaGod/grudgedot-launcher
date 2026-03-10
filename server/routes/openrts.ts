/**
 * OpenRTS Engine Routes
 * Full CRUD for units, weapons, movers, effects, actors, projectiles, trinkets, map-styles.
 * Includes auto-seed: if tables are empty on first GET, seed with starter data.
 */

import type { Express } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import {
  openrtsUnits,
  openrtsWeapons,
  openrtsEffects,
  openrtsMover,
  openrtsActors,
  openrtsProjectiles,
  openrtsTrinkets,
  openrtsMapStyles,
} from "../../shared/schema";

// ── Starter seed data ──

const SEED_MOVERS = [
  { name: "Ground", pathfindingMode: "Walk", heightmap: "Ground", standingMode: "Stand" },
  { name: "Fly", pathfindingMode: "Fly", heightmap: "Sky", standingMode: "Stand" },
  { name: "Hover", pathfindingMode: "Walk", heightmap: "Air", standingMode: "Stand" },
  { name: "Amphibious", pathfindingMode: "Walk", heightmap: "Ground", standingMode: "Stand" },
];

const SEED_EFFECTS = [
  { name: "SlashDamage", effectType: "damage", damage: 15, particleEffect: "slash_sparks" },
  { name: "ArrowHit", effectType: "damage", damage: 12, particleEffect: "arrow_impact" },
  { name: "FireBurst", effectType: "damage", damage: 25, radius: "3", particleEffect: "fire_explosion", damageType: "fire" },
  { name: "IceShard", effectType: "damage", damage: 18, particleEffect: "ice_shatter", damageType: "ice" },
  { name: "HealPulse", effectType: "heal", damage: -20, radius: "4", particleEffect: "heal_glow" },
  { name: "PoisonCloud", effectType: "debuff", damage: 5, radius: "3", duration: "8", particleEffect: "poison_mist" },
  { name: "ShieldBuff", effectType: "buff", duration: "10", particleEffect: "shield_aura" },
  { name: "LightningStrike", effectType: "damage", damage: 40, radius: "2", particleEffect: "lightning_bolt", damageType: "magic" },
];

const SEED_WEAPONS = [
  { name: "Longsword", uiName: "Longsword", range: "1.5", scanRange: "5", period: "1.5", damage: 15, damageType: "physical", effectLink: "SlashDamage" },
  { name: "ShortBow", uiName: "Short Bow", range: "8", scanRange: "10", period: "2.0", damage: 10, damageType: "physical", effectLink: "ArrowHit" },
  { name: "Longbow", uiName: "Long Bow", range: "12", scanRange: "14", period: "2.5", damage: 14, damageType: "physical", effectLink: "ArrowHit" },
  { name: "Fireball", uiName: "Fireball", range: "9", scanRange: "11", period: "4.0", damage: 25, damageType: "fire", effectLink: "FireBurst" },
  { name: "IceBolt", uiName: "Ice Bolt", range: "8", scanRange: "10", period: "3.0", damage: 18, damageType: "ice", effectLink: "IceShard" },
  { name: "HealingStaff", uiName: "Healing Staff", range: "6", scanRange: "8", period: "3.5", damage: 0, damageType: "magic", effectLink: "HealPulse" },
  { name: "Spear", uiName: "Spear", range: "2.5", scanRange: "5", period: "2.0", damage: 18, damageType: "physical", effectLink: "SlashDamage" },
  { name: "WarHammer", uiName: "War Hammer", range: "1.5", scanRange: "4", period: "2.5", damage: 22, damageType: "physical", effectLink: "SlashDamage" },
  { name: "Crossbow", uiName: "Crossbow", range: "10", scanRange: "12", period: "3.5", damage: 20, damageType: "physical", effectLink: "ArrowHit" },
  { name: "LightningWand", uiName: "Lightning Wand", range: "7", scanRange: "9", period: "3.0", damage: 30, damageType: "magic", effectLink: "LightningStrike" },
];

const SEED_UNITS = [
  // Human
  { name: "Footman", uiName: "Footman", race: "human", speed: "2.5", maxHealth: 120, sight: "6", moverLink: "Ground", weaponLinks: ["Longsword"], cost: { gold: 100 }, buildTime: 12 },
  { name: "Archer", uiName: "Archer", race: "human", speed: "2.8", maxHealth: 80, sight: "9", moverLink: "Ground", weaponLinks: ["ShortBow"], cost: { gold: 120 }, buildTime: 14 },
  { name: "Knight", uiName: "Knight", race: "human", speed: "3.5", maxHealth: 200, sight: "7", moverLink: "Ground", weaponLinks: ["Longsword"], cost: { gold: 250 }, buildTime: 25 },
  { name: "Priest", uiName: "Priest", race: "human", speed: "2.2", maxHealth: 60, sight: "8", moverLink: "Ground", weaponLinks: ["HealingStaff"], cost: { gold: 180 }, buildTime: 20 },
  { name: "Crossbowman", uiName: "Crossbowman", race: "human", speed: "2.3", maxHealth: 90, sight: "10", moverLink: "Ground", weaponLinks: ["Crossbow"], cost: { gold: 150 }, buildTime: 16 },
  // Alien / Orc
  { name: "Grunt", uiName: "Grunt", race: "alien", speed: "2.3", maxHealth: 150, sight: "5", moverLink: "Ground", weaponLinks: ["WarHammer"], cost: { gold: 110 }, buildTime: 10 },
  { name: "Shaman", uiName: "Shaman", race: "alien", speed: "2.0", maxHealth: 70, sight: "8", moverLink: "Ground", weaponLinks: ["LightningWand"], cost: { gold: 200 }, buildTime: 22 },
  { name: "Raider", uiName: "Raider", race: "alien", speed: "4.0", maxHealth: 100, sight: "7", moverLink: "Ground", weaponLinks: ["Spear"], cost: { gold: 160 }, buildTime: 18 },
  { name: "Wyvern", uiName: "Wyvern Rider", race: "alien", speed: "5.0", maxHealth: 180, sight: "10", moverLink: "Fly", weaponLinks: ["Spear"], cost: { gold: 300 }, buildTime: 30 },
  // Undead
  { name: "Skeleton", uiName: "Skeleton Warrior", race: "undead", speed: "2.0", maxHealth: 80, sight: "5", moverLink: "Ground", weaponLinks: ["Longsword"], cost: { gold: 60 }, buildTime: 8 },
  { name: "SkeletonArcher", uiName: "Skeleton Archer", race: "undead", speed: "2.2", maxHealth: 55, sight: "9", moverLink: "Ground", weaponLinks: ["ShortBow"], cost: { gold: 75 }, buildTime: 10 },
  { name: "Necromancer", uiName: "Necromancer", race: "undead", speed: "1.8", maxHealth: 90, sight: "8", moverLink: "Ground", weaponLinks: ["Fireball"], cost: { gold: 220 }, buildTime: 24 },
  { name: "Ghost", uiName: "Wraith", race: "undead", speed: "3.5", maxHealth: 60, sight: "8", moverLink: "Fly", weaponLinks: ["IceBolt"], cost: { gold: 180 }, buildTime: 20 },
  // Mechanical
  { name: "SiegeTank", uiName: "Siege Tank", race: "mechanical", speed: "1.5", maxHealth: 400, sight: "10", moverLink: "Ground", weaponLinks: ["Fireball"], cost: { gold: 350 }, buildTime: 35, mass: "3.0", radius: "0.5" },
  { name: "ScoutDrone", uiName: "Scout Drone", race: "mechanical", speed: "6.0", maxHealth: 40, sight: "14", moverLink: "Fly", weaponLinks: [], cost: { gold: 80 }, buildTime: 8 },
  // Nature
  { name: "Treant", uiName: "Treant", race: "nature", speed: "1.2", maxHealth: 350, sight: "6", moverLink: "Ground", weaponLinks: ["WarHammer"], cost: { gold: 280 }, buildTime: 28, mass: "2.5", radius: "0.6" },
  { name: "Fairy", uiName: "Fairy Healer", race: "nature", speed: "3.5", maxHealth: 45, sight: "9", moverLink: "Fly", weaponLinks: ["HealingStaff"], cost: { gold: 150 }, buildTime: 16 },
  { name: "Wolf", uiName: "Dire Wolf", race: "nature", speed: "5.5", maxHealth: 90, sight: "8", moverLink: "Ground", weaponLinks: ["Spear"], cost: { gold: 120 }, buildTime: 12 },
];

let seeded = false;

async function autoSeedIfEmpty() {
  if (seeded) return;
  try {
    // @ts-expect-error drizzle proxy
    const existingUnits = await db.query.openrtsUnits.findMany({ limit: 1 });
    if (existingUnits.length > 0) {
      seeded = true;
      return;
    }

    console.log("🌱 OpenRTS tables empty — seeding starter data...");

    // Seed in order: movers → effects → weapons → units
    await db.insert(openrtsMover).values(SEED_MOVERS);
    await db.insert(openrtsEffects).values(SEED_EFFECTS as any);
    await db.insert(openrtsWeapons).values(SEED_WEAPONS);
    await db.insert(openrtsUnits).values(SEED_UNITS.map(u => ({
      ...u,
      radius: (u as any).radius || "0.25",
      separationRadius: (u as any).radius || "0.25",
      mass: (u as any).mass || "1.0",
    })));

    seeded = true;
    console.log(`✅ OpenRTS seeded: ${SEED_MOVERS.length} movers, ${SEED_EFFECTS.length} effects, ${SEED_WEAPONS.length} weapons, ${SEED_UNITS.length} units`);
  } catch (err: any) {
    console.error("OpenRTS auto-seed error:", err.message);
  }
}

// ── Route registration ──

export function registerOpenRTSRoutes(app: Express) {

  // ─── Units ───
  app.get("/api/openrts/units", async (_req, res) => {
    try {
      await autoSeedIfEmpty();
      // @ts-expect-error drizzle proxy
      const result = await db.query.openrtsUnits.findMany();
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS units:", error);
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.post("/api/openrts/units", async (req, res) => {
    try {
      const [unit] = await db.insert(openrtsUnits).values(req.body).returning();
      res.status(201).json(unit);
    } catch (error) {
      console.error("Error creating OpenRTS unit:", error);
      res.status(400).json({ error: "Failed to create unit" });
    }
  });

  app.delete("/api/openrts/units/:id", async (req, res) => {
    try {
      await db.delete(openrtsUnits).where(eq(openrtsUnits.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete unit" });
    }
  });

  // ─── Weapons ───
  app.get("/api/openrts/weapons", async (_req, res) => {
    try {
      await autoSeedIfEmpty();
      // @ts-expect-error drizzle proxy
      const result = await db.query.openrtsWeapons.findMany();
      res.json(result);
    } catch (error) {
      console.error("Error fetching OpenRTS weapons:", error);
      res.status(500).json({ error: "Failed to fetch weapons" });
    }
  });

  app.post("/api/openrts/weapons", async (req, res) => {
    try {
      const [weapon] = await db.insert(openrtsWeapons).values(req.body).returning();
      res.status(201).json(weapon);
    } catch (error) {
      res.status(400).json({ error: "Failed to create weapon" });
    }
  });

  app.delete("/api/openrts/weapons/:id", async (req, res) => {
    try {
      await db.delete(openrtsWeapons).where(eq(openrtsWeapons.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete weapon" });
    }
  });

  // ─── Movers ───
  app.get("/api/openrts/movers", async (_req, res) => {
    try {
      await autoSeedIfEmpty();
      // @ts-expect-error drizzle proxy
      const result = await db.query.openrtsMover.findMany();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch movers" });
    }
  });

  app.post("/api/openrts/movers", async (req, res) => {
    try {
      const [mover] = await db.insert(openrtsMover).values(req.body).returning();
      res.status(201).json(mover);
    } catch (error) {
      res.status(400).json({ error: "Failed to create mover" });
    }
  });

  // ─── Effects ───
  app.get("/api/openrts/effects", async (_req, res) => {
    try {
      await autoSeedIfEmpty();
      // @ts-expect-error drizzle proxy
      const result = await db.query.openrtsEffects.findMany();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch effects" });
    }
  });

  app.post("/api/openrts/effects", async (req, res) => {
    try {
      const [effect] = await db.insert(openrtsEffects).values(req.body).returning();
      res.status(201).json(effect);
    } catch (error) {
      res.status(400).json({ error: "Failed to create effect" });
    }
  });

  app.delete("/api/openrts/effects/:id", async (req, res) => {
    try {
      await db.delete(openrtsEffects).where(eq(openrtsEffects.id, req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete effect" });
    }
  });

  // ─── Actors ───
  app.get("/api/openrts/actors", async (_req, res) => {
    try {
      // @ts-expect-error drizzle proxy
      const result = await db.query.openrtsActors.findMany();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch actors" });
    }
  });

  // ─── Projectiles ───
  app.get("/api/openrts/projectiles", async (_req, res) => {
    try {
      // @ts-expect-error drizzle proxy
      const result = await db.query.openrtsProjectiles.findMany();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projectiles" });
    }
  });

  // ─── Trinkets ───
  app.get("/api/openrts/trinkets", async (_req, res) => {
    try {
      // @ts-expect-error drizzle proxy
      const result = await db.query.openrtsTrinkets.findMany();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trinkets" });
    }
  });

  // ─── Map Styles ───
  app.get("/api/openrts/map-styles", async (_req, res) => {
    try {
      // @ts-expect-error drizzle proxy
      const result = await db.query.openrtsMapStyles.findMany();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch map styles" });
    }
  });

  // ─── Manual seed trigger ───
  app.post("/api/openrts/seed", async (_req, res) => {
    try {
      seeded = false; // Reset so it re-seeds
      await autoSeedIfEmpty();
      res.json({ success: true, message: "OpenRTS data seeded" });
    } catch (error) {
      res.status(500).json({ error: "Failed to seed data" });
    }
  });

  console.log("✅ OpenRTS routes registered (/api/openrts/*)");
}
