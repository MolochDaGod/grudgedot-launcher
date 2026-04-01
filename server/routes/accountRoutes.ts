/**
 * Account & Character Routes (GGE)
 * Operates on the local `accounts` + `grudgeCharacters` tables.
 * All routes require a valid Grudge JWT (requireAuth middleware).
 */

import type { Express } from "express";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/grudgeJwt";
import { db } from "../db";
import { accounts, grudgeCharacters } from "../../shared/schema";
import { eq, and } from "drizzle-orm";

const CROSSMINT_API = "https://www.crossmint.com/api/2025-06-09";
const CROSSMINT_KEY = process.env.CROSSMINT_SERVER_API_KEY || "";

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

      const newCharId = randomUUID();
      await db
        .insert(grudgeCharacters)
        .values({
          id: newCharId,
          accountId: acct.id,
          grudgeId,
          name,
          classId: classId || null,
          raceId: raceId || null,
          faction: faction || acct.faction || null,
          slotIndex: existing.length,
          isGuest: acct.isGuest ?? false,
        });

      const [newChar] = await db
        .select()
        .from(grudgeCharacters)
        .where(eq(grudgeCharacters.id, newCharId))
        .limit(1);

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

  // ─── PATCH /api/account/characters/:id ───
  // Update character fields (name, customization, faction, etc.)
  app.patch("/api/account/characters/:id", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "No grudgeId in token" });

      const [acct] = await db
        .select()
        .from(accounts)
        .where(eq(accounts.grudgeId, grudgeId))
        .limit(1);

      if (!acct) return res.status(404).json({ error: "Account not found" });

      const charId = req.params.id;
      const [char] = await db
        .select()
        .from(grudgeCharacters)
        .where(and(eq(grudgeCharacters.id, charId), eq(grudgeCharacters.accountId, acct.id)))
        .limit(1);

      if (!char) return res.status(404).json({ error: "Character not found" });

      // Build update payload — only allow safe fields
      const updates: Record<string, any> = { updatedAt: new Date() };
      const { name, faction, customization, avatarUrl } = req.body;
      if (name !== undefined) updates.name = String(name).slice(0, 50);
      if (faction !== undefined) updates.faction = faction;
      if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
      if (customization !== undefined) {
        // Store as jsonb — we trust the client schema but strip obviously bad keys
        if (typeof customization === "object" && customization !== null) {
          updates.customization = customization;
        }
      }

      await db
        .update(grudgeCharacters)
        .set(updates)
        .where(eq(grudgeCharacters.id, charId));

      const [updated] = await db
        .select()
        .from(grudgeCharacters)
        .where(eq(grudgeCharacters.id, charId))
        .limit(1);

      return res.json({ character: updated });
    } catch (err: any) {
      console.error("PATCH /api/account/characters/:id error:", err.message);
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

  // ─── POST /api/account/wallet/ensure ───
  // Ensures the caller has a Crossmint server-side Solana wallet.
  // If one already exists, returns it. Otherwise creates one.
  app.post("/api/account/wallet/ensure", requireAuth, async (req, res) => {
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

      // Already has a wallet
      if (acct.crossmintWalletId && acct.walletAddress) {
        return res.json({
          wallet: {
            walletAddress: acct.walletAddress,
            walletType: acct.walletType,
            crossmintWalletId: acct.crossmintWalletId,
          },
          created: false,
        });
      }

      // Create wallet via Crossmint
      if (!CROSSMINT_KEY) {
        return res.status(503).json({ error: "Crossmint API key not configured" });
      }

      const owner = acct.email
        ? `email:${acct.email}`
        : `userId:grudge-${grudgeId}`;

      const cmRes = await fetch(`${CROSSMINT_API}/wallets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": CROSSMINT_KEY,
        },
        body: JSON.stringify({
          chainType: "solana",
          type: "mpc",
          owner,
        }),
      });

      if (!cmRes.ok) {
        const errText = await cmRes.text();
        console.error("Crossmint wallet ensure failed:", cmRes.status, errText);
        return res.status(502).json({ error: "Wallet creation failed", details: errText });
      }

      const data = await cmRes.json();
      const walletAddress = data.address || data.publicKey || "";
      const crossmintWalletId = data.locator || data.id || "";

      // Persist to account
      await db
        .update(accounts)
        .set({
          walletAddress,
          walletType: "crossmint-custodial",
          crossmintWalletId,
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, acct.id));

      console.log(`✅ Wallet ensured for ${grudgeId}: ${walletAddress}`);

      return res.status(201).json({
        wallet: {
          walletAddress,
          walletType: "crossmint-custodial",
          crossmintWalletId,
        },
        created: true,
      });
    } catch (err: any) {
      console.error("POST /api/account/wallet/ensure error:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── DELETE /api/account/characters/:id ───
  // Delete a character belonging to the caller's account
  app.delete("/api/account/characters/:id", requireAuth, async (req, res) => {
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

      const charId = req.params.id;
      const [char] = await db
        .select()
        .from(grudgeCharacters)
        .where(and(eq(grudgeCharacters.id, charId), eq(grudgeCharacters.accountId, acct.id)))
        .limit(1);

      if (!char) {
        return res.status(404).json({ error: "Character not found" });
      }

      await db.delete(grudgeCharacters).where(eq(grudgeCharacters.id, charId));

      // Decrement totalCharacters
      await db
        .update(accounts)
        .set({
          totalCharacters: Math.max(0, (acct.totalCharacters ?? 1) - 1),
          updatedAt: new Date(),
        })
        .where(eq(accounts.id, acct.id));

      return res.json({ success: true });
    } catch (err: any) {
      console.error("DELETE /api/account/characters/:id error:", err.message);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  console.log("✅ Account routes registered (/api/account/*)");
}
