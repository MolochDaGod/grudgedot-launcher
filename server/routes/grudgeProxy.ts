/**
 * Grudge Backend Proxy
 *
 * Wildcards under /api/grudge/{service}/* are forwarded to the corresponding
 * Grudge backend service so the React client avoids CORS issues.
 *
 * Service map:
 *   /api/grudge/game/*      → GRUDGE_GAME_API      (api.grudgestudio.com)
 *   /api/grudge/account/*   → GRUDGE_ACCOUNT_API    (account.grudgestudio.com)
 *   /api/grudge/id/*        → GRUDGE_ID_API         (id.grudgestudio.com)
 *   /api/grudge/launcher/*  → GRUDGE_LAUNCHER_API   (launcher.grudgestudio.com)
 */

import type { Express, Request, Response } from "express";

// ── Backend origins ──
const GAME_API     = process.env.GRUDGE_GAME_API     || "https://api.grudge-studio.com";
const ACCOUNT_API  = process.env.GRUDGE_ACCOUNT_API  || "https://account.grudge-studio.com";
const ID_API       = process.env.GRUDGE_ID_API       || "https://id.grudge-studio.com";
const LAUNCHER_API = process.env.GRUDGE_LAUNCHER_API || "https://launcher.grudge-studio.com";

const SERVICE_MAP: Record<string, string> = {
  game:     GAME_API,
  account:  ACCOUNT_API,
  id:       ID_API,
  launcher: LAUNCHER_API,
};

/**
 * Proxy any request to the target backend, preserving method, headers, body,
 * and query string.
 */
async function proxy(target: string, backendPath: string, req: Request, res: Response) {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.headers.authorization) {
      headers["Authorization"] = req.headers.authorization as string;
    }

    const method = req.method;
    const fetchOpts: RequestInit = { method, headers };

    if (method !== "GET" && method !== "HEAD") {
      fetchOpts.body = JSON.stringify(req.body ?? {});
    }

    // Preserve query string
    const qs = req.url.includes("?") ? req.url.split("?").slice(1).join("?") : "";
    const url = `${target}${backendPath}${qs ? "?" + qs : ""}`;

    const upstream = await fetch(url, fetchOpts);
    const ct = upstream.headers.get("content-type") || "";

    if (ct.includes("application/json")) {
      const data = await upstream.json();
      return res.status(upstream.status).json(data);
    }
    const text = await upstream.text();
    return res.status(upstream.status).send(text);
  } catch (err: any) {
    console.error(`[grudgeProxy → ${target}${backendPath}] ${err.message}`);
    res.status(502).json({
      error: "Backend unavailable",
      service: target,
      hint: `Could not reach ${target}`,
    });
  }
}

/**
 * Register all Grudge proxy routes on the Express app.
 */
export function setupGrudgeProxy(app: Express) {
  // Single wildcard handler for all four services
  app.all("/api/grudge/:service/*", (req: Request, res: Response) => {
    const service = req.params.service;
    const target = SERVICE_MAP[service];

    if (!target) {
      return res.status(404).json({ error: `Unknown grudge service: ${service}` });
    }

    // Strip the /api/grudge/<service> prefix, keep the rest as the backend path
    const backendPath = req.url
      .replace(`/api/grudge/${service}`, "")
      .split("?")[0]; // query string handled in proxy()

    proxy(target, backendPath, req, res);
  });

  console.log("✅ Grudge Backend proxy registered:");
  Object.entries(SERVICE_MAP).forEach(([svc, url]) => {
    console.log(`   /api/grudge/${svc}/* → ${url}`);
  });
}
