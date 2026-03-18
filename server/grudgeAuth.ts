/**
 * Grudge Auth Routes — Proxy to Grudge ID Service
 *
 * Auth lives on id.grudge-studio.com (grudge-id, port 3001).
 * Game data lives on api.grudge-studio.com (game-api, port 3003).
 *
 * OAuth flows: The proxy initiates OAuth, receives the callback,
 * exchanges the code via grudge-id, and redirects back to /auth with token.
 */

import type { Express, Request, Response } from "express";

// Auth service (grudge-id) — handles login, register, JWT, OAuth
const AUTH_URL = process.env.GRUDGE_AUTH_URL || "https://id.grudge-studio.com";

async function proxyAuth(
  backendPath: string,
  req: Request,
  res: Response,
  { method = "POST", forwardBody = true } = {},
) {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization as string;
    }

    const fetchOpts: RequestInit = { method, headers };
    if (forwardBody && method !== "GET") {
      fetchOpts.body = JSON.stringify(req.body || {});
    }

    const upstream = await fetch(`${AUTH_URL}${backendPath}`, fetchOpts);
    const contentType = upstream.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    } else {
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    }
  } catch (err: any) {
    console.error(`[Auth Proxy ${backendPath}] error:`, err.message);
    res.status(502).json({
      error: "Auth service unavailable",
      service: "GDevelop Assistant",
      hint: "Grudge ID at " + AUTH_URL + " may be offline",
    });
  }
}

/** Build OAuth callback redirect with token params */
function buildAuthRedirect(data: any, provider: string, returnUrl: string): string {
  // Safety: if returnUrl is a full URL (e.g. https://....), extract just the path+query
  // so the client-side wouter navigate() works correctly.
  let cleanReturn = returnUrl || "/";
  try {
    const parsed = new URL(cleanReturn);
    // Only strip origin if it's our own domain
    if (parsed.origin === "https://gdevelop-assistant.vercel.app" || parsed.hostname === "localhost") {
      cleanReturn = parsed.pathname + parsed.search;
    }
  } catch {
    // Not a full URL — already a path, keep as-is
  }

  const params = new URLSearchParams({
    token: data.token,
    grudgeId: data.grudgeId || "",
    userId: String(data.userId || ""),
    username: data.username || "",
    displayName: data.displayName || "",
    provider,
    isNew: data.isNewUser ? "true" : "false",
  });
  return `/auth?${params}&return=${encodeURIComponent(cleanReturn)}`;
}

export function setupGrudgeAuth(app: Express) {
  // GET /api/login & /api/register → redirect to in-app auth page
  app.get("/api/login", (_req, res) => res.redirect(302, "/auth"));
  app.get("/api/register", (_req, res) => res.redirect(302, "/auth"));

  // ── Direct auth proxies → grudge-id /auth/* ──
  app.post("/api/login", (req, res) => proxyAuth("/auth/login", req, res));
  app.post("/api/register", (req, res) => proxyAuth("/auth/register", req, res));
  app.post("/api/guest", (req, res) => proxyAuth("/auth/guest", req, res));

  app.get("/api/auth/verify", (req, res) => proxyAuth("/auth/verify", req, res, { method: "GET", forwardBody: false }));
  app.get("/api/auth/user", (req, res) => proxyAuth("/auth/user", req, res, { method: "GET", forwardBody: false }));
  app.get("/api/auth/me", (req, res) => proxyAuth("/auth/user", req, res, { method: "GET", forwardBody: false }));

  app.post("/api/auth/puter", (req, res) => proxyAuth("/auth/puter", req, res));
  app.post("/api/auth/link-puter", (req, res) => proxyAuth("/auth/puter-link", req, res));
  app.post("/api/auth/wallet", (req, res) => proxyAuth("/auth/wallet", req, res));
  app.post("/api/auth/logout", (req, res) => proxyAuth("/auth/logout", req, res));

  // ── Phone auth ──
  app.post("/api/auth/phone", async (req: Request, res: Response) => {
    const { action, phone, code } = req.body;
    if (action === "send") return proxyAuth("/auth/phone-send", req, res);
    if (action === "verify" && code) {
      req.body = { phone, code };
      return proxyAuth("/auth/phone-verify", req, res);
    }
    res.status(400).json({ error: "Invalid action. Use 'send' or 'verify'." });
  });

  // ── Discord OAuth ──
  app.get("/api/auth/discord", (req: Request, res: Response) => {
    const state = (req.query.state as string) || "/";
    const clientId = process.env.DISCORD_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: "Discord OAuth not configured" });
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/discord/callback`;
    const params = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri,
      response_type: "code", scope: "identify email", state,
    });
    res.json({ url: `https://discord.com/api/oauth2/authorize?${params}` });
  });

  app.get("/api/auth/discord/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const returnUrl = decodeURIComponent((state as string) || "/");
    if (!code) return res.redirect(`/auth?error=discord_token_failed&return=${encodeURIComponent(returnUrl)}`);
    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/discord/callback`;
      const r = await fetch(`${AUTH_URL}/auth/discord/exchange`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });
      const data = await r.json() as any;
      if (data.success && data.token) return res.redirect(buildAuthRedirect(data, "discord", returnUrl));
      res.redirect(`/auth?error=discord_auth_failed&return=${encodeURIComponent(returnUrl)}`);
    } catch { res.redirect(`/auth?error=discord_auth_failed&return=${encodeURIComponent(returnUrl)}`); }
  });

  // ── Google OAuth ──
  app.get("/api/auth/google", (req: Request, res: Response) => {
    const state = (req.query.state as string) || "/";
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: "Google OAuth not configured" });
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri,
      response_type: "code", scope: "openid email profile",
      state, access_type: "offline", prompt: "select_account",
    });
    res.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const returnUrl = decodeURIComponent((state as string) || "/");
    if (!code) return res.redirect(`/auth?error=google_token_failed&return=${encodeURIComponent(returnUrl)}`);
    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/google/callback`;
      const r = await fetch(`${AUTH_URL}/auth/google/exchange`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });
      const data = await r.json() as any;
      if (data.success && data.token) return res.redirect(buildAuthRedirect(data, "google", returnUrl));
      res.redirect(`/auth?error=google_auth_failed&return=${encodeURIComponent(returnUrl)}`);
    } catch { res.redirect(`/auth?error=google_auth_failed&return=${encodeURIComponent(returnUrl)}`); }
  });

  // ── GitHub OAuth ──
  app.get("/api/auth/github", (req: Request, res: Response) => {
    const state = (req.query.state as string) || "/";
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) return res.status(503).json({ error: "GitHub OAuth not configured" });
    const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/github/callback`;
    const params = new URLSearchParams({
      client_id: clientId, redirect_uri: redirectUri,
      scope: "read:user user:email", state,
    });
    res.json({ url: `https://github.com/login/oauth/authorize?${params}` });
  });

  app.get("/api/auth/github/callback", async (req: Request, res: Response) => {
    const { code, state } = req.query;
    const returnUrl = decodeURIComponent((state as string) || "/");
    if (!code) return res.redirect(`/auth?error=github_token_failed&return=${encodeURIComponent(returnUrl)}`);
    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/auth/github/callback`;
      const r = await fetch(`${AUTH_URL}/auth/github/exchange`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, redirect_uri: redirectUri }),
      });
      const data = await r.json() as any;
      if (data.success && data.token) return res.redirect(buildAuthRedirect(data, "github", returnUrl));
      res.redirect(`/auth?error=github_auth_failed&return=${encodeURIComponent(returnUrl)}`);
    } catch { res.redirect(`/auth?error=github_auth_failed&return=${encodeURIComponent(returnUrl)}`); }
  });

  console.log(`✅ Grudge Auth proxy registered → ${AUTH_URL}`);
}
