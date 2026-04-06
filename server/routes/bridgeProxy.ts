/**
 * Grudge Bridge Proxy Routes
 *
 * Proxies /api/bridge/* from the GDevelop frontend to the
 * Grudge Bridge service (grudge-bridge:4000 on VPS, or local).
 *
 * Follows the same pattern as coolifyProxy.ts.
 *
 * Env vars:
 *   BRIDGE_URL       — e.g. https://bridge.grudge-studio.com (or http://localhost:4000)
 *   BRIDGE_API_KEY   — Bearer token for bridge auth
 */

import type { Express, Request, Response } from "express";

const BRIDGE_URL = process.env.BRIDGE_URL || "";
const BRIDGE_API_KEY = process.env.BRIDGE_API_KEY || "";

function bridgeConfigured(): boolean {
  return !!(BRIDGE_URL && BRIDGE_API_KEY);
}

async function bridgeFetch(
  path: string,
  method = "GET",
  body?: unknown,
  headers?: Record<string, string>
): Promise<{ status: number; data: unknown; contentType: string }> {
  const reqHeaders: Record<string, string> = {
    Authorization: `Bearer ${BRIDGE_API_KEY}`,
    Accept: "application/json",
    ...headers,
  };
  if (body) reqHeaders["Content-Type"] = "application/json";

  const res = await fetch(`${BRIDGE_URL}/api/bridge${path}`, {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const contentType = res.headers.get("content-type") || "";

  // Handle SSE streams (deploy endpoint)
  if (contentType.includes("text/event-stream")) {
    const text = await res.text();
    return { status: res.status, data: text, contentType };
  }

  if (contentType.includes("application/json")) {
    const data = await res.json();
    return { status: res.status, data, contentType };
  }

  const text = await res.text();
  return { status: res.status, data: text, contentType };
}

function guardBridge(_req: Request, res: Response): boolean {
  if (!bridgeConfigured()) {
    res.status(503).json({
      error: "Bridge not configured",
      hint: "Set BRIDGE_URL and BRIDGE_API_KEY in your environment",
    });
    return false;
  }
  return true;
}

export function registerBridgeRoutes(app: Express) {
  // ── Status: is bridge configured? ──
  app.get("/api/bridge/status", (_req: Request, res: Response) => {
    res.json({
      configured: bridgeConfigured(),
      url: BRIDGE_URL || null,
    });
  });

  // ── Health ──
  app.get("/api/bridge/health", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const { status, data } = await bridgeFetch("/health");
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  // ── Backups catalog ──
  app.get("/api/bridge/backups", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const type = req.query.type ? `?type=${req.query.type}` : "";
      const { status, data } = await bridgeFetch(`/backups${type}`);
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  // ── Verify backup integrity ──
  app.get("/api/bridge/backups/:file/verify", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const type = req.query.type ? `?type=${req.query.type}` : "";
      const { status, data } = await bridgeFetch(
        `/backups/${req.params.file}/verify${type}`
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  // ── Delete backup ──
  app.delete("/api/bridge/backups/:file", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const type = req.query.type ? `?type=${req.query.type}` : "";
      const { status, data } = await bridgeFetch(
        `/backups/${req.params.file}${type}`,
        "DELETE"
      );
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  // ── Trigger dump ──
  app.post("/api/bridge/dump", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const { status, data } = await bridgeFetch("/dump", "POST", req.body);
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  // ── Trigger restore ──
  app.post("/api/bridge/restore", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const { status, data } = await bridgeFetch("/restore", "POST", req.body);
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  // ── Deploy ──
  app.post("/api/bridge/deploy", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const { status, data, contentType } = await bridgeFetch("/deploy", "POST", req.body);
      if (contentType.includes("text/event-stream")) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.send(data);
      } else {
        res.status(status).json(data);
      }
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  // ── Settings ──
  app.get("/api/bridge/settings", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const { status, data } = await bridgeFetch("/settings");
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  app.put("/api/bridge/settings", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const { status, data } = await bridgeFetch("/settings", "PUT", req.body);
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  // ── Nodes / mesh status ──
  app.get("/api/bridge/nodes", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const refresh = req.query.refresh ? `?refresh=${req.query.refresh}` : "";
      const { status, data } = await bridgeFetch(`/nodes${refresh}`);
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  app.get("/api/bridge/nodes/ping", async (req: Request, res: Response) => {
    if (!guardBridge(req, res)) return;
    try {
      const { status, data } = await bridgeFetch("/nodes/ping");
      res.status(status).json(data);
    } catch (e: any) {
      res.status(502).json({ error: "Bridge unreachable", detail: e.message });
    }
  });

  console.log(
    `✅ Bridge proxy registered${BRIDGE_URL ? ` → ${BRIDGE_URL}` : " (not configured)"}`
  );
}
