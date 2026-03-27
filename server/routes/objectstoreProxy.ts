/**
 * ObjectStore Proxy Routes
 *
 * Proxies /api/objectstore/* to the Cloudflare ObjectStore API Worker
 * at objectstore.grudge-studio.com.
 *
 * Why proxy? Keeps the API_KEY server-side — the browser never sees it.
 * Public reads (GET) are forwarded without auth.
 * Writes (POST upload, DELETE) inject the X-API-Key header.
 *
 * Env vars:
 *   OBJECTSTORE_WORKER_URL  — https://objectstore.grudge-studio.com
 *   OBJECTSTORE_API_KEY     — internal API key (same as INTERNAL_API_KEY)
 */

import type { Express, Request, Response } from "express";

const WORKER_URL  = (process.env.OBJECTSTORE_WORKER_URL || "https://objectstore.grudge-studio.com").replace(/\/$/, "");
const API_KEY     = process.env.OBJECTSTORE_API_KEY || process.env.INTERNAL_API_KEY || "";

async function proxyToWorker(
  workerPath: string,
  req: Request,
  res: Response,
  injectKey = false
): Promise<void> {
  try {
    const qs  = Object.keys(req.query).length
      ? "?" + new URLSearchParams(req.query as Record<string, string>).toString()
      : "";
    const url = `${WORKER_URL}${workerPath}${qs}`;

    const headers: Record<string, string> = {};
    // Forward content-type (needed for multipart uploads)
    const ct = req.headers["content-type"];
    if (ct) headers["Content-Type"] = ct;
    // Forward auth if user passed a Bearer token
    if (req.headers.authorization) headers["Authorization"] = req.headers.authorization as string;
    // Inject API key for write operations
    if (injectKey && API_KEY) headers["X-API-Key"] = API_KEY;

    const fetchOpts: RequestInit = {
      method: req.method,
      headers,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      // Stream the body directly (handles multipart/form-data without buffering)
      fetchOpts.body = req as any;
      (fetchOpts as any).duplex = "half";
    }

    const upstream = await fetch(url, fetchOpts);

    res.status(upstream.status);
    upstream.headers.forEach((val, key) => {
      if (!["content-encoding", "transfer-encoding", "connection"].includes(key.toLowerCase())) {
        res.setHeader(key, val);
      }
    });

    const body = await upstream.arrayBuffer();
    res.end(Buffer.from(body));
  } catch (err: any) {
    console.error("[objectstoreProxy]", err?.message);
    res.status(502).json({ error: "ObjectStore worker unreachable", detail: err?.message });
  }
}

export function registerObjectstoreProxy(app: Express): void {
  // ── Health ────────────────────────────────────────────────────────────
  app.get("/api/objectstore/health", (req, res) =>
    proxyToWorker("/health", req, res)
  );

  // ── List / search assets (public) ─────────────────────────────────────
  app.get("/api/objectstore/assets", (req, res) =>
    proxyToWorker("/v1/assets", req, res)
  );

  // ── Get single asset metadata (public) ────────────────────────────────
  app.get("/api/objectstore/assets/:id", (req, res) =>
    proxyToWorker(`/v1/assets/${req.params.id}`, req, res)
  );

  // ── Get asset file (public CDN stream) ────────────────────────────────
  app.get("/api/objectstore/assets/:id/file", (req, res) =>
    proxyToWorker(`/v1/assets/${req.params.id}/file`, req, res)
  );

  // ── Upload asset (requires auth → inject API key) ─────────────────────
  app.post("/api/objectstore/assets", (req, res) =>
    proxyToWorker("/v1/assets", req, res, true)
  );

  // ── Delete asset (requires auth → inject API key) ─────────────────────
  app.delete("/api/objectstore/assets/:id", (req, res) =>
    proxyToWorker(`/v1/assets/${req.params.id}`, req, res, true)
  );
}
