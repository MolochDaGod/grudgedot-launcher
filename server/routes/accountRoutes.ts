/**
 * Account & Character Routes (GGE)
 * Operates on the local `accounts` + `grudgeCharacters` tables.
 * All routes require a valid Grudge JWT (requireAuth middleware).
 */

import type { Express } from "express";
import { requireAuth } from "../middleware/grudgeJwt";
import { db } from "../db";
import { accounts, grudgeCharacters } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

export function registerAccountRoutes(app: Express) {
  // ─── GET /api/account/me ───
  // Returns the caller's Grudge account (from local DB)
  app.get("/api/account/me", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "No grudgeId in token" });

      const [acct] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.grudgeId, grudgeId))
        .limit(1);

      if (!acct) {
        return res.status(404).json({ error: "Account not found" });
      }

      // Strip sensitive fields
      const { passwordHash, ...safe } = acct;
      return res.json({ account: safe });
    } catch (err: any) {
      console.error("GET /api/account/me error:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── GET /api/account/characters ───
  // Returns all characters belonging to the caller's account
  app.get("/api/account/characters", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "No grudgeId in token" });

      const [acct] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.grudgeId, grudgeId))
        .limit(1);

      if (!acct) {
        return res.status(404).json({ error: "Account not found" });
      }

      const chars = await db
        .select()
        .from(grudgeCharacters)
        .where(eq(grudgeCharacters.accountId, acct.id));

      return res.json({ characters: chars });
    } catch (err: any) {
      console.error("GET /api/account/characters error:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── POST /api/account/characters ───
  // Create a new character for the caller's account
  app.post("/api/account/characters", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "No grudgeId in token" });

      const [acct] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.grudgeId, grudgeId))
        .limit(1);

      if (!acct) {
        return res.status(404).json({ error: "Account not found" });
      }

      const { name, classId, raceId, faction } = req.body;
      if (!name) {
        return res.status(400).json({ error: "name is required" });
      }

      // Count existing characters for slot index
      const existing = await db
        .select()
        .from(grudgeCharacters)
        .where(eq(grudgeCharacters.accountId, acct.id));

      const [newChar] = await db
        .insert(grudgeCharacters)
        .values({
          accountId: acct.id,
          grudgeId,
          name,
          classId: classId || null,
          raceId: raceId || null,
          faction: faction || acct.faction || null,
          slotIndex: existing.length,
          isGuest: acct.isGuest ?? false,
        })
        .returning();

      // Bump totalCharacters on account
      await db
        .update(accounts)
        .set({
          totalCharacters: existing.length + 1,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, acct.id));

      return res.status(201).json({ character: newChar });
    } catch (err: any) {
      console.error("POST /api/account/characters error:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── GET /api/account/wallet ───
  // Returns the caller's wallet info (Crossmint custodial or external)
  app.get("/api/account/wallet", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "No grudgeId in token" });

      const [acct] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.grudgeId, grudgeId))
        .limit(1);

      if (!acct) {
        return res.status(404).json({ error: "Account not found" });
      }

      return res.json({
        wallet: {
          walletAddress: acct.walletAddress || null,
          walletType: acct.walletType || null,
          crossmintWalletId: acct.crossmintWalletId || null,
        },
        balances: {
          gold: acct.gold,
          gbux: acct.gbuxBalance,
        },
      });
    } catch (err: any) {
      console.error("GET /api/account/wallet error:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  console.log("✅ Account routes registered (/api/account/*)");
}
