/**
 * Grudge Auth Routes (GGE)
 * All authentication is delegated to the auth-gateway (source of truth).
 * This file proxies login/register/guest/puter requests and provides
 * JWT-verified /api/auth/* endpoints for the GGE client.
 */

import type { Express } from "express";
import { requireAuth } from "./middleware/grudgeJwt";
import { db } from "./db";
import { accounts } from "../shared/schema";
import { eq } from "drizzle-orm";

const AUTH_GATEWAY = process.env.AUTH_GATEWAY_URL || "https://auth-gateway-flax.vercel.app";
const CROSSMINT_API = "https://www.crossmint.com/api/v1-alpha2";
const CROSSMINT_KEY = process.env.CROSSMINT_SERVER_API_KEY || "";

// ── Proxy helper ──

async function gatewayProxy(
  endpoint: string,
  method: string,
  body?: Record<string, any>,
  headers?: Record<string, string>,
): Promise<{ ok: boolean; status: number; data: any }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${AUTH_GATEWAY}/api/${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(headers || {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 503,
      data: { error: "Auth gateway unreachable", details: err.message },
    };
  }
}

// ── Crossmint wallet helper ──

async function createCrossmintWallet(
  grudgeId: string,
  email?: string,
): Promise<{ walletId: string; walletAddress: string } | null> {
  if (!CROSSMINT_KEY) {
    console.warn("⚠️  CROSSMINT_SERVER_API_KEY not set — skipping wallet creation");
    return null;
  }
  try {
    const res = await fetch(`${CROSSMINT_API}/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": CROSSMINT_KEY,
      },
      body: JSON.stringify({
        chain: "solana",
        ...(email ? { email } : { linkedUser: `grudge:${grudgeId}` }),
      }),
    });
    if (!res.ok) {
      console.error("Crossmint wallet creation failed:", res.status, await res.text());
      return null;
    }
    const data = await res.json();
    return { walletId: data.id, walletAddress: data.publicKey || data.address || "" };
  } catch (err: any) {
    console.error("Crossmint wallet error:", err.message);
    return null;
  }
}

// ── Local account upsert helper ──

async function upsertLocalAccount(gatewayData: any, isNewRegistration = false) {
  const grudgeId = gatewayData.grudgeId || gatewayData.user?.grudgeId;
  if (!grudgeId) return null;

  const username =
    gatewayData.username || gatewayData.user?.username || "unknown";
  const email = gatewayData.email || gatewayData.user?.email;
  const puterUuid = gatewayData.puterUuid || gatewayData.user?.puterUuid;
  const puterUsername =
    gatewayData.puterUsername || gatewayData.user?.puterUsername;
  const discordId = gatewayData.discordId || gatewayData.user?.discordId;
  const discordUsername =
    gatewayData.discordUsername || gatewayData.user?.discordUsername;
  const isGuest = gatewayData.isGuest ?? gatewayData.user?.isGuest ?? false;

  try {
    // Check if account already exists
    const existing = await db
      .select()
      .from(accounts)
      .where(eq(accounts.grudgeId, grudgeId))
      .limit(1);

    if (existing.length > 0) {
      // Update last login + any new fields from gateway
      await db
        .update(accounts)
        .set({
          lastLoginAt: new Date(),
          updatedAt: new Date(),
          ...(puterUuid ? { puterUuid } : {}),
          ...(puterUsername ? { puterUsername } : {}),
          ...(discordId ? { discordId } : {}),
          ...(discordUsername ? { discordUsername } : {}),
          ...(email ? { email } : {}),
        })
        .where(eq(accounts.grudgeId, grudgeId));
      return existing[0];
    }

    // New account — create Crossmint wallet if this is a registration
    let walletAddress: string | undefined;
    let crossmintWalletId: string | undefined;
    if (isNewRegistration) {
      const wallet = await createCrossmintWallet(grudgeId, email);
      if (wallet) {
        walletAddress = wallet.walletAddress;
        crossmintWalletId = wallet.walletId;
      }
    }

    const [newAccount] = await db
      .insert(accounts)
      .values({
        grudgeId,
        username,
        email,
        puterUuid,
        puterUsername,
        discordId,
        discordUsername,
        isGuest,
        walletAddress,
        walletType: walletAddress ? "crossmint-custodial" : undefined,
        crossmintWalletId,
        lastLoginAt: new Date(),
      })
      .returning();
    return newAccount;
  } catch (err: any) {
    console.error("Account upsert error:", err.message);
    return null;
  }
}

// ── Route registration ──

export function setupGrudgeAuth(app: Express) {
  // ─── Proxy login to auth-gateway ───
  app.post("/api/login", async (req, res) => {
    const result = await gatewayProxy("login", "POST", req.body);
    if (result.ok) {
      // Upsert local account on successful login (not new registration)
      await upsertLocalAccount(result.data, false);
    }
    res.status(result.status).json(result.data);
  });

  // ─── Proxy register to auth-gateway ───
  app.post("/api/register", async (req, res) => {
    const result = await gatewayProxy("register", "POST", req.body);
    if (result.ok) {
      // New registration → upsert account + create Crossmint wallet
      const acct = await upsertLocalAccount(result.data, true);
      if (acct?.walletAddress) {
        result.data.walletAddress = acct.walletAddress;
      }
    }
    res.status(result.status).json(result.data);
  });

  // ─── Proxy guest login to auth-gateway ───
  app.post("/api/guest", async (req, res) => {
    const result = await gatewayProxy("guest", "POST", req.body);
    if (result.ok) {
      // Upsert guest account (isGuest = true)
      await upsertLocalAccount({ ...result.data, isGuest: true }, true);
    }
    res.status(result.status).json(result.data);
  });

  // ─── Puter sign-in → auth-gateway /api/puter → JWT ───
  // Client calls this after puter.auth.signIn() to get a Grudge JWT
  app.post("/api/auth/puter", async (req, res) => {
    const { puterUuid, puterUsername } = req.body;
    if (!puterUuid) {
      return res.status(400).json({ error: "puterUuid is required" });
    }
    const result = await gatewayProxy("puter", "POST", { puterUuid, puterUsername });
    if (result.ok) {
      // Upsert account with Puter identity
      await upsertLocalAccount({ ...result.data, puterUuid, puterUsername }, true);
    }
    res.status(result.status).json(result.data);
  });

  // ─── Verify token (proxy to auth-gateway /api/verify) ───
  app.get("/api/auth/verify", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No token provided" });
    }
    const result = await gatewayProxy("verify", "GET", undefined, {
      Authorization: authHeader,
    });
    res.status(result.status).json(result.data);
  });

  // ─── Get current user (JWT-verified locally) ───
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

  // ─── Full profile (enriched from auth-gateway /api/verify) ───
  app.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const result = await gatewayProxy("verify", "GET", undefined, {
      Authorization: authHeader,
    });
    if (!result.ok) {
      return res.status(result.status).json(result.data);
    }
    res.json(result.data);
  });

  // ─── Discord OAuth — get URL or handle callback ───
  app.get("/api/auth/discord", async (req, res) => {
    // Pass the return URL as state so Discord redirects back through the gateway
    const state = req.query.state || req.query.return || '';
    const qs = state ? `?state=${encodeURIComponent(String(state))}` : '';
    const result = await gatewayProxy(`discord${qs}`, "GET");
    res.status(result.status).json(result.data);
  });

  // ─── GitHub OAuth — get URL or handle callback ───
  app.get("/api/auth/github", async (req, res) => {
    const state = req.query.state || req.query.return || '';
    const qs = state ? `?state=${encodeURIComponent(String(state))}` : '';
    const result = await gatewayProxy(`github${qs}`, "GET");
    res.status(result.status).json(result.data);
  });

  // ─── Google OAuth — get URL or handle callback ───
  app.get("/api/auth/google", async (req, res) => {
    const state = req.query.state || req.query.return || '';
    const qs = state ? `?state=${encodeURIComponent(String(state))}` : '';
    const result = await gatewayProxy(`google${qs}`, "GET");
    res.status(result.status).json(result.data);
  });

  // ─── Phone (Twilio SMS) — send code / verify code ───
  app.post("/api/auth/phone", async (req, res) => {
    const result = await gatewayProxy("phone", "POST", req.body);
    res.status(result.status).json(result.data);
  });

  // ─── Wallet connect — link or login via Solana wallet ───
  app.post("/api/auth/wallet", async (req, res) => {
    const authHeader = req.headers.authorization;
    const result = await gatewayProxy("connect-wallet", "POST", req.body, {
      ...(authHeader ? { Authorization: authHeader } : {}),
    });
    res.status(result.status).json(result.data);
  });

  console.log("✅ Grudge Auth routes registered (gateway proxy mode)");
}
