/**
 * Grudge Auth Routes (GGE) — Direct DB Authentication
 *
 * All auth flows hit the shared Neon `accounts` table directly.
 * Same pattern as WCS (Warlord Crafting Suite).
 * No external gateway proxy — one fewer point of failure.
 *
 * JWT payload: { grudgeId, username, userId }
 * Signed with SESSION_SECRET, expires in 30 days.
 */

import type { Express } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { requireAuth } from "./middleware/grudgeJwt";
import { db } from "./db";
import { accounts } from "../shared/schema";
import { eq, or } from "drizzle-orm";

const SESSION_SECRET = process.env.SESSION_SECRET || "grudge-default-secret";
const JWT_EXPIRY = "30d";

const CROSSMINT_API = "https://www.crossmint.com/api/2025-06-09";
const CROSSMINT_KEY = process.env.CROSSMINT_SERVER_API_KEY || "";

// ── Helpers ──

function generateGrudgeId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `GRUDGE-${timestamp}-${random}`;
}

function signToken(account: { grudgeId: string; username: string; id: string }): string {
  return jwt.sign(
    { grudgeId: account.grudgeId, username: account.username, userId: account.id },
    SESSION_SECRET,
    { expiresIn: JWT_EXPIRY },
  );
}

function buildUserPayload(account: any) {
  return {
    id: account.id,
    grudgeId: account.grudgeId,
    username: account.username,
    displayName: account.displayName,
    email: account.email,
    walletAddress: account.walletAddress,
    faction: account.faction,
    avatarUrl: account.avatarUrl,
    isPremium: account.isPremium,
    gold: account.gold,
    gbuxBalance: account.gbuxBalance,
    totalCharacters: account.totalCharacters,
    totalIslands: account.totalIslands,
    createdAt: account.createdAt,
  };
}

// ── Crossmint wallet helper ──

async function createCrossmintWallet(
  grudgeId: string,
  email?: string,
): Promise<{ walletId: string; walletAddress: string } | null> {
  if (!CROSSMINT_KEY) return null;
  try {
    const owner = email ? `email:${email}` : `userId:grudge-${grudgeId}`;
    const res = await fetch(`${CROSSMINT_API}/wallets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": CROSSMINT_KEY },
      body: JSON.stringify({ chainType: "solana", type: "mpc", owner }),
    });
    if (!res.ok) {
      console.error("Crossmint wallet creation failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    const walletAddress = data.address || data.publicKey || "";
    const walletId = data.locator || data.id || "";
    console.log(`✅ Crossmint wallet created for ${owner}: ${walletAddress}`);
    return { walletId, walletAddress };
  } catch (err: any) {
    console.error("Crossmint wallet error:", err.message);
    return null;
  }
}

// ── Route registration ──

export function setupGrudgeAuth(app: Express) {
  // ─── GET /api/login & /api/register → redirect to in-app auth page ───
  app.get("/api/login", (_req, res) => res.redirect(302, "/auth"));
  app.get("/api/register", (_req, res) => res.redirect(302, "/auth"));

  // ════════════════════════════════════════════
  // POST /api/login — username/email/grudgeId + password
  // ════════════════════════════════════════════
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password, identifier } = req.body || {};
      const loginId = identifier || username;

      if (!loginId || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }

      const account = await db.query.accounts.findFirst({
        where: or(
          eq(accounts.username, loginId),
          eq(accounts.email, loginId),
          eq(accounts.grudgeId, loginId),
        ),
      });

      if (!account || !account.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await bcrypt.compare(password, account.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      await db.update(accounts)
        .set({ lastLoginAt: new Date() })
        .where(eq(accounts.grudgeId, account.grudgeId));

      const token = signToken(account);

      res.json({
        success: true,
        grudgeId: account.grudgeId,
        userId: account.id,
        username: account.username,
        displayName: account.displayName,
        token,
        user: buildUserPayload(account),
      });
    } catch (err: any) {
      console.error("[POST /api/login] error:", err.message, err.stack);
      res.status(500).json({ error: "Login failed", details: err.message });
    }
  });

  // ════════════════════════════════════════════
  // POST /api/register — create new account
  // ════════════════════════════════════════════
  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, email } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password required" });
      }
      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: "Username must be 3-20 characters" });
      }

      const existing = await db.query.accounts.findFirst({
        where: or(
          eq(accounts.username, username),
          ...(email ? [eq(accounts.email, email)] : []),
        ),
      });
      if (existing) {
        return res.status(409).json({ error: "Username or email already taken" });
      }

      const grudgeId = generateGrudgeId();
      const passwordHash = await bcrypt.hash(password, 10);

      let walletAddress: string | undefined;
      let crossmintWalletId: string | undefined;
      const wallet = await createCrossmintWallet(grudgeId, email);
      if (wallet) {
        walletAddress = wallet.walletAddress;
        crossmintWalletId = wallet.walletId;
      }

      const [account] = await db.insert(accounts).values({
        grudgeId,
        username,
        displayName: username,
        email: email || undefined,
        passwordHash,
        walletAddress,
        walletType: walletAddress ? "crossmint-custodial" : undefined,
        crossmintWalletId,
        isPremium: false,
        isGuest: false,
        gold: 1000,
        lastLoginAt: new Date(),
      }).returning();

      const token = signToken(account);

      res.json({
        success: true,
        grudgeId,
        userId: account.id,
        username,
        displayName: account.displayName,
        walletAddress: account.walletAddress,
        token,
        user: buildUserPayload(account),
        message: `Welcome to GRUDGE Warlords! Your GRUDGE ID: ${grudgeId}`,
      });
    } catch (err: any) {
      console.error("[POST /api/register] error:", err.message, err.stack);
      res.status(500).json({ error: "Registration failed", details: err.message });
    }
  });

  // ════════════════════════════════════════════
  // POST /api/guest — instant guest account
  // ════════════════════════════════════════════
  app.post("/api/guest", async (req, res) => {
    try {
      const grudgeId = generateGrudgeId();
      const username = `Guest-${grudgeId.slice(-8)}`;

      const [account] = await db.insert(accounts).values({
        grudgeId,
        username,
        displayName: `Guest ${grudgeId.slice(-6)}`,
        isGuest: true,
        isPremium: false,
        gold: 500,
        lastLoginAt: new Date(),
        metadata: { guestCreatedAt: new Date().toISOString() },
      }).returning();

      const token = signToken(account);

      res.json({
        success: true,
        grudgeId,
        userId: account.id,
        username,
        token,
        user: buildUserPayload(account),
        message: "Guest account created. Upgrade to save progress!",
      });
    } catch (err: any) {
      console.error("[POST /api/guest] error:", err.message, err.stack);
      res.status(500).json({ error: "Guest login failed", details: err.message });
    }
  });

  // ════════════════════════════════════════════
  // POST /api/auth/puter — Puter SSO (find-or-create)
  // ════════════════════════════════════════════
  app.post("/api/auth/puter", async (req, res) => {
    try {
      const { puterUuid, puterUsername } = req.body || {};
      if (!puterUuid) {
        return res.status(400).json({ error: "puterUuid is required" });
      }

      let account = await db.query.accounts.findFirst({
        where: eq(accounts.puterUuid, puterUuid),
      });

      if (!account) {
        const grudgeId = generateGrudgeId();
        const baseUsername = `puter_${puterUsername || puterUuid.slice(0, 8)}`;

        const existingUsername = await db.query.accounts.findFirst({
          where: eq(accounts.username, baseUsername),
        });
        const finalUsername = existingUsername
          ? `puter_${puterUuid.slice(0, 8)}`
          : baseUsername;

        let walletAddress: string | undefined;
        let crossmintWalletId: string | undefined;
        const wallet = await createCrossmintWallet(grudgeId);
        if (wallet) {
          walletAddress = wallet.walletAddress;
          crossmintWalletId = wallet.walletId;
        }

        [account] = await db.insert(accounts).values({
          grudgeId,
          username: finalUsername,
          displayName: puterUsername || finalUsername,
          puterUuid,
          puterUsername,
          walletAddress,
          walletType: walletAddress ? "crossmint-custodial" : undefined,
          crossmintWalletId,
          isPremium: false,
          gold: 1000,
          gbuxBalance: 100,
          lastLoginAt: new Date(),
          metadata: { authMethod: "puter" },
        }).returning();

        console.log(`✅ New Puter account: ${account.grudgeId} (${finalUsername})`);
      } else {
        await db.update(accounts)
          .set({ lastLoginAt: new Date() })
          .where(eq(accounts.grudgeId, account.grudgeId));
      }

      const token = signToken(account);

      res.json({
        success: true,
        grudgeId: account.grudgeId,
        userId: account.id,
        username: account.username,
        displayName: account.displayName,
        walletAddress: account.walletAddress,
        token,
        user: buildUserPayload(account),
      });
    } catch (err: any) {
      console.error("[POST /api/auth/puter] error:", err.message, err.stack);
      res.status(500).json({ error: "Puter auth failed", details: err.message });
    }
  });

  // ════════════════════════════════════════════
  // POST /api/auth/link-puter — link Puter UUID to existing account
  // ════════════════════════════════════════════
  app.post("/api/auth/link-puter", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "Not authenticated" });

      const { puterUuid, puterUsername } = req.body || {};
      if (!puterUuid) return res.status(400).json({ error: "puterUuid required" });

      await db.update(accounts)
        .set({
          puterUuid,
          puterUsername: puterUsername || undefined,
          updatedAt: new Date(),
        })
        .where(eq(accounts.grudgeId, grudgeId));

      res.json({ success: true, message: "Puter account linked" });
    } catch (err: any) {
      console.error("[POST /api/auth/link-puter] error:", err.message);
      res.status(500).json({ error: "Failed to link Puter account" });
    }
  });

  // ════════════════════════════════════════════
  // GET /api/auth/verify — verify JWT, return account info
  // ════════════════════════════════════════════
  app.get("/api/auth/verify", async (req, res) => {
    try {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (!token) return res.status(401).json({ error: "No token provided" });

      const decoded = jwt.verify(token, SESSION_SECRET) as any;

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.grudgeId, decoded.grudgeId),
      });

      if (!account) return res.status(404).json({ error: "Account not found" });

      res.json({
        success: true,
        grudgeId: account.grudgeId,
        username: account.username,
        userId: account.id,
        isPremium: account.isPremium,
        user: buildUserPayload(account),
      });
    } catch {
      res.status(401).json({ error: "Invalid or expired token" });
    }
  });

  // ════════════════════════════════════════════
  // GET /api/auth/user — current user from JWT (local verify)
  // ════════════════════════════════════════════
  app.get("/api/auth/user", requireAuth, (req, res) => {
    const user = req.grudgeUser!;
    res.json({
      id: user.userId,
      grudgeId: user.grudgeId,
      username: user.username,
      role: user.role || "user",
      isPremium: user.isPremium || false,
    });
  });

  // ════════════════════════════════════════════
  // GET /api/auth/me — full profile
  // ════════════════════════════════════════════
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const grudgeId = req.grudgeUser?.grudgeId;
      if (!grudgeId) return res.status(401).json({ error: "Not authenticated" });

      const account = await db.query.accounts.findFirst({
        where: eq(accounts.grudgeId, grudgeId),
      });

      if (!account) return res.status(404).json({ error: "Account not found" });

      res.json({ success: true, ...buildUserPayload(account) });
    } catch (err: any) {
      console.error("[GET /api/auth/me] error:", err.message);
      res.status(500).json({ error: "Profile fetch failed" });
    }
  });

  // ════════════════════════════════════════════
  // POST /api/auth/wallet — link or login via Solana wallet
  // ════════════════════════════════════════════
  app.post("/api/auth/wallet", async (req, res) => {
    try {
      const { walletAddress, walletType } = req.body || {};
      if (!walletAddress) return res.status(400).json({ error: "walletAddress required" });

      let account = await db.query.accounts.findFirst({
        where: eq(accounts.walletAddress, walletAddress),
      });

      if (!account) {
        const grudgeId = generateGrudgeId();
        const username = `sol_${walletAddress.slice(0, 8)}`;

        [account] = await db.insert(accounts).values({
          grudgeId,
          username,
          displayName: username,
          walletAddress,
          walletType: walletType || "external",
          isPremium: false,
          gold: 1000,
          lastLoginAt: new Date(),
          metadata: { authMethod: "wallet" },
        }).returning();
      } else {
        await db.update(accounts)
          .set({ lastLoginAt: new Date() })
          .where(eq(accounts.grudgeId, account.grudgeId));
      }

      const token = signToken(account);

      res.json({
        success: true,
        grudgeId: account.grudgeId,
        userId: account.id,
        username: account.username,
        walletAddress: account.walletAddress,
        token,
        user: buildUserPayload(account),
      });
    } catch (err: any) {
      console.error("[POST /api/auth/wallet] error:", err.message);
      res.status(500).json({ error: "Wallet auth failed" });
    }
  });

  console.log("✅ Grudge Auth routes registered (direct DB mode)");
}
