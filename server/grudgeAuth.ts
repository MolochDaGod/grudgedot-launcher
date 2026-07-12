/**
 * grudgeDot Auth Routes
 *
 * grudgeDot does NOT host its own login. The user is sent to the unified
 * Grudge ID SSO at https://id.grudge-studio.com/api/auth/page for every login flow
 * (password, OAuth, wallet, Puter, phone, guest). This module only keeps the
 * thin proxies that the authenticated client still needs:
 *
 *   - /api/auth/verify   \
 *   - /api/auth/user      }   JWT verification / profile loading
 *   - /api/auth/me       /
 *   - /api/auth/logout   (invalidate the JWT server-side)
 *
 * Anything that still hits /api/login or /api/register is redirected (302)
 * out to the SSO so stale links keep working.
 */

import type { Express, Request, Response } from "express";

const AUTH_URL = process.env.GRUDGE_AUTH_URL || "https://id.grudge-studio.com";
const APP_ID = "grudgedot";

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
    console.error(`[grudgeDot auth proxy ${backendPath}] error:`, err.message);
    res.status(502).json({
      error: "Auth service unavailable",
      service: "grudgeDot",
      hint: `Grudge ID at ${AUTH_URL} may be offline`,
    });
  }
}

/** Build the redirect URL used when a stale link hits a local login endpoint. */
function ssoRedirect(req: Request): string {
  const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
  const host = req.get("host");
  const returnUrl = encodeURIComponent(`${proto}://${host}/`);
  return `${AUTH_URL}/api/auth/page?app=${APP_ID}&redirect=${returnUrl}`;
}

export function setupGrudgeAuth(app: Express) {
  // ── Token-only proxies (the only things the app still needs) ──
  app.get("/api/auth/verify", (req, res) =>
    proxyAuth("/api/auth/verify", req, res, { method: "GET", forwardBody: false }),
  );
  app.get("/api/auth/user", (req, res) =>
    proxyAuth("/api/auth/user", req, res, { method: "GET", forwardBody: false }),
  );
  app.get("/api/auth/me", (req, res) =>
    proxyAuth("/api/auth/user", req, res, { method: "GET", forwardBody: false }),
  );
  app.post("/api/auth/logout", (req, res) => proxyAuth("/api/auth/logout", req, res));

  // Puter cloud linkage for an already-authenticated Grudge account (NOT a login).
  // The user is already signed in via Grudge ID; this associates their Puter UUID
  // so Puter KV/FS can persist per-user saves.
  app.post("/api/auth/link-puter", (req, res) => proxyAuth("/api/auth/puter-link", req, res));

  // ── Backwards-compatible redirects for old login links ──
  app.get("/api/login", (req, res) => res.redirect(302, ssoRedirect(req)));
  app.get("/api/register", (req, res) => res.redirect(302, ssoRedirect(req)));
  app.post("/api/login", (req, res) => res.redirect(302, ssoRedirect(req)));
  app.post("/api/register", (req, res) => res.redirect(302, ssoRedirect(req)));
}
