import type { Express } from "express";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { characters } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { isDatabaseConfigured } from "../db";
import {
  GRUDACHAIN_URL,
  WCS_URL,
  WCS_PAGES,
  GRUDACHAIN_API,
  type GrudaWarsStatus,
} from "../../shared/grudachain";
import {
  GRUDA_WARS_HEROES,
  heroToCharacterInsert,
  type GrudaWarsHero,
} from "../../shared/grudaWarsHeroes";

export function registerGrudaWarsRoutes(app: Express) {
  // ─── GET /api/gruda-wars/heroes ───
  // Returns the full synced hero roster with WCS + GDA data
  app.get("/api/gruda-wars/heroes", (_req, res) => {
    res.json({
      heroes: GRUDA_WARS_HEROES,
      count: GRUDA_WARS_HEROES.length,
      source: "wcs-starter-heroes",
    });
  });

  // ─── POST /api/gruda-wars/heroes/sync ───
  // Upserts all Gruda Wars heroes into the GDA characters table
  app.post("/api/gruda-wars/heroes/sync", async (_req, res) => {
    if (!isDatabaseConfigured()) {
      return res.status(503).json({
        error: "Database not configured",
        heroes: GRUDA_WARS_HEROES.map(heroToCharacterInsert),
        message: "Returning hero data without persisting — no database connection",
      });
    }

    try {
      const results: Array<{ hero: string; action: "created" | "updated"; id: string }> = [];

      for (const hero of GRUDA_WARS_HEROES) {
        const insertData = heroToCharacterInsert(hero);

        // Check if hero already exists by name
        const existing = await db
          .select()
          .from(characters)
          .where(eq(characters.name, hero.name))
          .limit(1);

        if (existing.length > 0) {
          // Update existing
          await db
            .update(characters)
            .set({
              type: insertData.type,
              rarity: insertData.rarity,
              baseStats: insertData.baseStats,
              abilities: insertData.abilities,
              portraitUrl: insertData.portraitUrl,
            })
            .where(eq(characters.id, existing[0].id));

          results.push({ hero: hero.name, action: "updated", id: existing[0].id });
        } else {
          // Insert new
          const newId = randomUUID();
          await db
            .insert(characters)
            .values({ ...insertData, id: newId });

          results.push({ hero: hero.name, action: "created", id: newId });
        }
      }

      res.json({
        success: true,
        synced: results,
        count: results.length,
      });
    } catch (error: any) {
      console.error("Hero sync error:", error);
      res.status(500).json({ error: "Failed to sync heroes", details: error.message });
    }
  });

  // ─── GET /api/gruda-wars/status ───
  // Aggregated health check: GRUDACHAIN + WCS + local GGE
  app.get("/api/gruda-wars/status", async (_req, res) => {
    const status: GrudaWarsStatus = {
      grudachain: { status: "unreachable", error: "Not checked yet" },
      wcs: { available: false, url: WCS_URL, lastChecked: new Date().toISOString() },
      gge: { status: "running", heroCount: GRUDA_WARS_HEROES.length },
    };

    // Check GRUDACHAIN
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(GRUDACHAIN_API.health, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        status.grudachain = await resp.json();
      }
    } catch (err: any) {
      status.grudachain = { status: "unreachable", error: err.message };
    }

    // Check WCS
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(WCS_URL, { method: "HEAD", signal: controller.signal });
      clearTimeout(timeout);
      status.wcs.available = resp.ok;
      status.wcs.lastChecked = new Date().toISOString();
    } catch {
      status.wcs.available = false;
      status.wcs.lastChecked = new Date().toISOString();
    }

    res.json(status);
  });

  // ─── GET /api/gruda-wars/config ───
  // Returns deployment URLs for client-side iframe embedding
  app.get("/api/gruda-wars/config", (_req, res) => {
    res.json({
      grudachainUrl: GRUDACHAIN_URL,
      wcsUrl: WCS_URL,
      wcsPages: WCS_PAGES,
      grudachainApi: GRUDACHAIN_API,
      heroes: GRUDA_WARS_HEROES.map((h) => ({
        syncId: h.syncId,
        name: h.name,
        title: h.title,
        classId: h.classId,
        raceId: h.raceId,
      })),
    });
  });
}
