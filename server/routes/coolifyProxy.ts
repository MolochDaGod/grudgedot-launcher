/**
 * Coolify API Proxy Routes
 *
 * Proxies requests from the GDevelop Assistant frontend to the Coolify API
 * running on the Grudge VPS. Provides server overview, log viewing, and
 * restart/deploy management for all Coolify-managed services.
 *
 * Env vars:
 *   COOLIFY_API_URL   — e.g. https://coolify.grudge-studio.com  (required)
 *   COOLIFY_API_TOKEN — Bearer token from Coolify Settings → API Tokens
 *
 * Coolify v4 API Docs: https://coolify.io/docs/api-reference
 */

import type { Express, Request, Response } from "express";

const COOLIFY_URL = process.env.COOLIFY_API_URL || "";
const COOLIFY_TOKEN = process.env.COOLIFY_API_TOKEN || "";

function coolifyConfigured(): boolean {
  return !!(COOLIFY_URL && COOLIFY_TOKEN);
}

async function coolifyFetch(path: string, method = "GET", body?: unknown) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${COOLIFY_TOKEN}`,
    Accept: "application/json",
  };
  if (body) headers["Content-Type"] = "application/json";

  const res = await fetch(`${COOLIFY_URL}/api/v1${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    return { status: res.status, data };
  }
  const text = await res.text();
  return { status: res.status, data: text };
}

function guardCoolify(_req: Request, res: Response): boolean {
  if (!coolifyConfigured()) {
    res.status(503).json({
      error: "Coolify not configured",
      hint: "Set COOLIFY_API_URL and COOLIFY_API_TOKEN in your environment",
    });
    return false;
  }
  return true;
}

export function registerCoolifyRoutes(app: Express) {
  // ── Status: is Coolify configured? ──
  app.get("/api/coolify/status", (_req: Request, res: Response) => {
    res.json({
      configured: coolifyConfigured(),
      url: COOLIFY_URL || null,
    });
  });

  // ── List servers ──
  app.get("/api/coolify/servers", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch("/servers");
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── List applications (all deployed apps/services) ──
  app.get("/api/coolify/applications", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch("/applications");
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── List services ──
  app.get("/api/coolify/services", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch("/services");
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── List databases ──
  app.get("/api/coolify/databases", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch("/databases");
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── Get application details ──
  app.get("/api/coolify/applications/:uuid", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch(`/applications/${req.params.uuid}`);
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── Get application logs (stdout) ──
  app.get("/api/coolify/applications/:uuid/logs", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const lines = req.query.lines || "100";
      const { status, data } = await coolifyFetch(
        `/applications/${req.params.uuid}/logs?lines=${lines}`
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── Restart application ──
  app.post("/api/coolify/applications/:uuid/restart", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch(
        `/applications/${req.params.uuid}/restart`,
        "POST"
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── Deploy (rebuild) application ──
  app.post("/api/coolify/applications/:uuid/deploy", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch(
        `/applications/${req.params.uuid}/deploy`,
        "POST"
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── Stop application ──
  app.post("/api/coolify/applications/:uuid/stop", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch(
        `/applications/${req.params.uuid}/stop`,
        "POST"
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── Start application ──
  app.post("/api/coolify/applications/:uuid/start", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch(
        `/applications/${req.params.uuid}/start`,
        "POST"
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── Restart a service (e.g. PostgreSQL, Redis) ──
  app.post("/api/coolify/services/:uuid/restart", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch(
        `/services/${req.params.uuid}/restart`,
        "POST"
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  // ── Deployments list for an application ──
  app.get("/api/coolify/applications/:uuid/deployments", async (req: Request, res: Response) => {
    if (!guardCoolify(req, res)) return;
    try {
      const { status, data } = await coolifyFetch(
        `/applications/${req.params.uuid}/deployments`
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Coolify unreachable", detail: e.message });
    }
  });

  console.log(`✅ Coolify proxy registered${COOLIFY_URL ? ` → ${COOLIFY_URL}` : " (not configured)"}`);
}
