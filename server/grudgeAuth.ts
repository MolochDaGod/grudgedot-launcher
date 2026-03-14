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

  // ════════════════════════════════════════════
  // Google OAuth — GET /api/auth/google → redirect URL
  // ════════════════════════════════════════════
  app.get("/api/auth/google", (req, res) => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: "Google OAuth not configured" });
    }

    const state = (req.query.state as string) || "/";
    const redirectUri = `${getOrigin(req)}/api/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
      prompt: "consent",
      state,
    });

    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  // ════════════════════════════════════════════
  // Google OAuth callback — GET /api/auth/google/callback
  // ════════════════════════════════════════════
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) return res.status(400).send("Missing authorization code");

      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      const redirectUri = `${getOrigin(req)}/api/auth/google/callback`;

      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code as string,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        console.error("Google token exchange failed:", await tokenRes.text());
        return res.redirect(`/auth?error=google_token_failed`);
      }

      const tokens = await tokenRes.json();

      // Get user info
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userRes.ok) {
        return res.redirect(`/auth?error=google_userinfo_failed`);
      }

      const googleUser = await userRes.json();
      const googleId = googleUser.id;
      const googleEmail = googleUser.email;
      const googleName = googleUser.name || googleEmail?.split("@")[0] || "GoogleUser";
      const googleAvatar = googleUser.picture;

      // Find existing account by googleId or email
      let account = await db.query.accounts.findFirst({
        where: eq(accounts.googleId, googleId),
      });

      if (!account && googleEmail) {
        account = await db.query.accounts.findFirst({
          where: eq(accounts.email, googleEmail),
        });
        // Link Google ID to existing email account
        if (account) {
          await db.update(accounts)
            .set({ googleId, googleEmail, avatarUrl: account.avatarUrl || googleAvatar })
            .where(eq(accounts.id, account.id));
        }
      }

      if (!account) {
        // Create new account
        const grudgeId = generateGrudgeId();
        const baseUsername = googleName.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || `g_${googleId.slice(0, 8)}`;

        // Ensure unique username
        const existingUsername = await db.query.accounts.findFirst({
          where: eq(accounts.username, baseUsername),
        });
        const finalUsername = existingUsername
          ? `${baseUsername}_${crypto.randomBytes(3).toString("hex")}`
          : baseUsername;

        let walletAddress: string | undefined;
        let crossmintWalletId: string | undefined;
        const wallet = await createCrossmintWallet(grudgeId, googleEmail);
        if (wallet) {
          walletAddress = wallet.walletAddress;
          crossmintWalletId = wallet.walletId;
        }

        [account] = await db.insert(accounts).values({
          grudgeId,
          username: finalUsername,
          displayName: googleName,
          email: googleEmail,
          avatarUrl: googleAvatar,
          googleId,
          googleEmail,
          walletAddress,
          walletType: walletAddress ? "crossmint-custodial" : undefined,
          crossmintWalletId,
          isPremium: false,
          gold: 1000,
          lastLoginAt: new Date(),
          metadata: { authMethod: "google" },
        }).returning();

        console.log(`✅ New Google account: ${account.grudgeId} (${finalUsername})`);
      } else {
        await db.update(accounts)
          .set({ lastLoginAt: new Date() })
          .where(eq(accounts.grudgeId, account.grudgeId));
      }

      const token = signToken(account);

      // Redirect back to the app with auth params
      const returnUrl = (state as string) || "/auth";
      const separator = returnUrl.includes("?") ? "&" : "?";
      const authParams = new URLSearchParams({
        token,
        grudgeId: account.grudgeId,
        userId: account.id,
        username: account.username || "",
        displayName: account.displayName || "",
        provider: "google",
      });

      res.redirect(`${returnUrl}${separator}${authParams}`);
    } catch (err: any) {
      console.error("[GET /api/auth/google/callback] error:", err.message, err.stack);
      res.redirect(`/auth?error=google_auth_failed`);
    }
  });

  // ════════════════════════════════════════════
  // Discord OAuth — GET /api/auth/discord → redirect URL
  // ════════════════════════════════════════════
  app.get("/api/auth/discord", (req, res) => {
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: "Discord OAuth not configured" });
    }

    const state = (req.query.state as string) || "/";
    const redirectUri = `${getOrigin(req)}/api/auth/discord/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "identify email",
      state,
    });

    res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
  });

  // ════════════════════════════════════════════
  // Discord OAuth callback — GET /api/auth/discord/callback
  // ════════════════════════════════════════════
  app.get("/api/auth/discord/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) return res.status(400).send("Missing authorization code");

      const clientId = process.env.DISCORD_CLIENT_ID!;
      const clientSecret = process.env.DISCORD_CLIENT_SECRET!;
      const redirectUri = `${getOrigin(req)}/api/auth/discord/callback`;

      // Exchange code for tokens
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: redirectUri,
        }),
      });

      if (!tokenRes.ok) {
        console.error("Discord token exchange failed:", await tokenRes.text());
        return res.redirect(`/auth?error=discord_token_failed`);
      }

      const tokens = await tokenRes.json();

      // Fetch Discord user
      const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });

      if (!userRes.ok) {
        return res.redirect(`/auth?error=discord_userinfo_failed`);
      }

      const discordUser = await userRes.json();
      const discordId = discordUser.id;
      const discordUsername = discordUser.global_name || discordUser.username;
      const discordEmail = discordUser.email;
      const discordAvatar = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png`
        : null;

      // Find existing account by discordId or email
      let account = await db.query.accounts.findFirst({
        where: eq(accounts.discordId, discordId),
      });

      if (!account && discordEmail) {
        account = await db.query.accounts.findFirst({
          where: eq(accounts.email, discordEmail),
        });
        // Link Discord ID to existing email account
        if (account) {
          await db.update(accounts)
            .set({ discordId, discordUsername, avatarUrl: account.avatarUrl || discordAvatar })
            .where(eq(accounts.id, account.id));
        }
      }

      if (!account) {
        // Create new account
        const grudgeId = generateGrudgeId();
        const baseUsername = discordUsername.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || `d_${discordId.slice(0, 8)}`;

        const existingUsername = await db.query.accounts.findFirst({
          where: eq(accounts.username, baseUsername),
        });
        const finalUsername = existingUsername
          ? `${baseUsername}_${crypto.randomBytes(3).toString("hex")}`
          : baseUsername;

        let walletAddress: string | undefined;
        let crossmintWalletId: string | undefined;
        const wallet = await createCrossmintWallet(grudgeId, discordEmail);
        if (wallet) {
          walletAddress = wallet.walletAddress;
          crossmintWalletId = wallet.walletId;
        }

        [account] = await db.insert(accounts).values({
          grudgeId,
          username: finalUsername,
          displayName: discordUsername,
          email: discordEmail || undefined,
          avatarUrl: discordAvatar,
          discordId,
          discordUsername,
          walletAddress,
          walletType: walletAddress ? "crossmint-custodial" : undefined,
          crossmintWalletId,
          isPremium: false,
          gold: 1000,
          lastLoginAt: new Date(),
          metadata: { authMethod: "discord" },
        }).returning();

        console.log(`✅ New Discord account: ${account.grudgeId} (${finalUsername})`);
      } else {
        await db.update(accounts)
          .set({ lastLoginAt: new Date() })
          .where(eq(accounts.grudgeId, account.grudgeId));
      }

      const token = signToken(account);

      const returnUrl = (state as string) || "/auth";
      const separator = returnUrl.includes("?") ? "&" : "?";
      const authParams = new URLSearchParams({
        token,
        grudgeId: account.grudgeId,
        userId: account.id,
        username: account.username || "",
        displayName: account.displayName || "",
        provider: "discord",
      });

      res.redirect(`${returnUrl}${separator}${authParams}`);
    } catch (err: any) {
      console.error("[GET /api/auth/discord/callback] error:", err.message, err.stack);
      res.redirect(`/auth?error=discord_auth_failed`);
    }
  });

  // ════════════════════════════════════════════
  // GitHub OAuth — GET /api/auth/github → redirect URL
  // ════════════════════════════════════════════
  app.get("/api/auth/github", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(503).json({ error: "GitHub OAuth not configured" });
    }

    const state = (req.query.state as string) || "/";

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${getOrigin(req)}/api/auth/github/callback`,
      scope: "read:user user:email",
      state,
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
  });

  // ════════════════════════════════════════════
  // GitHub OAuth callback — GET /api/auth/github/callback
  // ════════════════════════════════════════════
  app.get("/api/auth/github/callback", async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code) return res.status(400).send("Missing authorization code");

      const clientId = process.env.GITHUB_CLIENT_ID!;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET!;

      // Exchange code for access token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code as string,
        }),
      });

      if (!tokenRes.ok) {
        console.error("GitHub token exchange failed:", await tokenRes.text());
        return res.redirect(`/auth?error=github_token_failed`);
      }

      const tokenData = await tokenRes.json();
      if (tokenData.error) {
        console.error("GitHub token error:", tokenData.error_description);
        return res.redirect(`/auth?error=github_token_failed`);
      }

      const accessToken = tokenData.access_token;

      // Fetch GitHub user
      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!userRes.ok) {
        return res.redirect(`/auth?error=github_userinfo_failed`);
      }

      const ghUser = await userRes.json();
      const githubId = String(ghUser.id);
      const githubUsername = ghUser.login;
      const githubName = ghUser.name || githubUsername;
      const githubAvatar = ghUser.avatar_url;

      // Fetch email (may be private)
      let githubEmail: string | undefined;
      try {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github+json",
          },
        });
        if (emailRes.ok) {
          const emails = await emailRes.json();
          const primary = emails.find((e: any) => e.primary && e.verified);
          githubEmail = primary?.email || emails[0]?.email;
        }
      } catch { /* email fetch is best-effort */ }

      // Find existing account by githubId or email
      let account = await db.query.accounts.findFirst({
        where: eq(accounts.githubId, githubId),
      });

      if (!account && githubEmail) {
        account = await db.query.accounts.findFirst({
          where: eq(accounts.email, githubEmail),
        });
        if (account) {
          await db.update(accounts)
            .set({ githubId, githubUsername, avatarUrl: account.avatarUrl || githubAvatar })
            .where(eq(accounts.id, account.id));
        }
      }

      if (!account) {
        const grudgeId = generateGrudgeId();
        const baseUsername = githubUsername.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || `gh_${githubId.slice(0, 8)}`;

        const existingUsername = await db.query.accounts.findFirst({
          where: eq(accounts.username, baseUsername),
        });
        const finalUsername = existingUsername
          ? `${baseUsername}_${crypto.randomBytes(3).toString("hex")}`
          : baseUsername;

        let walletAddress: string | undefined;
        let crossmintWalletId: string | undefined;
        const wallet = await createCrossmintWallet(grudgeId, githubEmail);
        if (wallet) {
          walletAddress = wallet.walletAddress;
          crossmintWalletId = wallet.walletId;
        }

        [account] = await db.insert(accounts).values({
          grudgeId,
          username: finalUsername,
          displayName: githubName,
          email: githubEmail || undefined,
          avatarUrl: githubAvatar,
          githubId,
          githubUsername,
          walletAddress,
          walletType: walletAddress ? "crossmint-custodial" : undefined,
          crossmintWalletId,
          isPremium: false,
          gold: 1000,
          lastLoginAt: new Date(),
          metadata: { authMethod: "github" },
        }).returning();

        console.log(`✅ New GitHub account: ${account.grudgeId} (${finalUsername})`);
      } else {
        await db.update(accounts)
          .set({ lastLoginAt: new Date() })
          .where(eq(accounts.grudgeId, account.grudgeId));
      }

      const token = signToken(account);

      const returnUrl = (state as string) || "/auth";
      const separator = returnUrl.includes("?") ? "&" : "?";
      const authParams = new URLSearchParams({
        token,
        grudgeId: account.grudgeId,
        userId: account.id,
        username: account.username || "",
        displayName: account.displayName || "",
        provider: "github",
      });

      res.redirect(`${returnUrl}${separator}${authParams}`);
    } catch (err: any) {
      console.error("[GET /api/auth/github/callback] error:", err.message, err.stack);
      res.redirect(`/auth?error=github_auth_failed`);
    }
  });

  // ════════════════════════════════════════════
  // Phone/SMS — POST /api/auth/phone
  // ════════════════════════════════════════════
  app.post("/api/auth/phone", async (req, res) => {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      return res.status(503).json({
        error: "Phone authentication not configured",
        hint: "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to enable SMS verification",
      });
    }
    // TODO: Implement Twilio SMS send/verify when credentials are configured
    res.status(501).json({ error: "Phone auth coming soon" });
  });

  console.log("✅ Grudge Auth routes registered (direct DB mode)");
}

// Helper to derive origin from request (handles Vercel proxying)
function getOrigin(req: any): string {
  const proto = req.headers["x-forwarded-proto"] || req.protocol || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `${proto}://${host}`;
}
