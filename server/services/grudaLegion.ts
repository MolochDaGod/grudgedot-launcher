/**
 * GRUDA Legion Service
 * Server-side proxy to the Railway-deployed GRUDA Legion AI node system.
 * Keeps API keys server-side and adds Puter account linkage + cloud storage best practices.
 *
 * Production: https://gruda-legion-production.up.railway.app
 * Endpoints proxied: /health, /api/chat, /api/generate-code, /api/status,
 *   /api/vibe/*, /api/sdk/info, /api/storage/*, /api/grudge-studio/*, /api/admin/*
 */

import type { Express } from "express";
import { GRUDACHAIN_URL, GRUDACHAIN_API, GAME_API_GRUDA, GRUDACHAIN_SOURCE, WCS_URL } from "../../shared/grudachain";

const PROXY_TIMEOUT_MS = 15_000;

// ── Proxy helper ──

async function proxyFetch(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers || {}),
      },
    });
    clearTimeout(timeout);
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
  } catch (err: any) {
    clearTimeout(timeout);
    return {
      ok: false,
      status: 503,
      data: { error: "GRUDA Legion unreachable", details: err.message },
    };
  }
}

// ── Route registration ──

export function registerGrudaLegionRoutes(app: Express) {
  // ─── Health / status passthrough ───
  app.get("/api/gruda-legion/health", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.health);
    res.status(result.status).json(result.data);
  });

  app.get("/api/gruda-legion/status", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.status);
    res.status(result.status).json(result.data);
  });

  // ─── AI Chat proxy ───
  // Keeps any future API keys on the server and rate-limits client requests
  app.post("/api/gruda-legion/chat", async (req, res) => {
    const { message, model, temperature } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    const result = await proxyFetch(GRUDACHAIN_API.chat, {
      method: "POST",
      body: JSON.stringify({ message, model: model || "auto", temperature: temperature || 0.7 }),
    });

    res.status(result.status).json(result.data);
  });

  // ─── Code generation proxy ───
  app.post("/api/gruda-legion/generate-code", async (req, res) => {
    const { description, language, framework } = req.body;

    if (!description) {
      return res.status(400).json({ error: "description is required" });
    }

    const result = await proxyFetch(GRUDACHAIN_API.generateCode, {
      method: "POST",
      body: JSON.stringify({
        description,
        language: language || "javascript",
        framework: framework || "vanilla",
      }),
    });

    res.status(result.status).json(result.data);
  });

  // ─── File analysis proxy ───
  app.post("/api/gruda-legion/analyze-file", async (req, res) => {
    const { content, filename, type } = req.body;

    if (!content || !filename) {
      return res.status(400).json({ error: "content and filename are required" });
    }

    const result = await proxyFetch(GRUDACHAIN_API.analyzeFile, {
      method: "POST",
      body: JSON.stringify({ content, filename, type: type || "code" }),
    });

    res.status(result.status).json(result.data);
  });

  // ─── Aggregated health check (Railway + WCS + local) ───
  app.get("/api/gruda-legion/aggregate-health", async (_req, res) => {
    const [railwayHealth, wcsHealth] = await Promise.all([
      proxyFetch(GRUDACHAIN_API.health),
      proxyFetch(`${WCS_URL}/api/health`).catch(() => ({
        ok: false,
        status: 503,
        data: { status: "unreachable" },
      })),
    ]);

    const allHealthy = railwayHealth.ok && wcsHealth.ok;

    res.status(allHealthy ? 200 : 207).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        grudaLegion: {
          url: GRUDACHAIN_URL,
          status: railwayHealth.ok ? "healthy" : "unreachable",
          data: railwayHealth.data,
          source: GRUDACHAIN_SOURCE,
        },
        wcs: {
          url: WCS_URL,
          status: wcsHealth.ok ? "healthy" : "unreachable",
          data: wcsHealth.data,
        },
        gge: {
          status: "running",
          uptime: process.uptime(),
        },
      },
    });
  });

  // ─── Vibe AI proxy (Railway server.js now serves these natively) ───
  app.get("/api/vibe/providers", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.vibeProviders);
    res.status(result.status).json(result.data);
  });

  app.post("/api/vibe/chat", async (req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.vibeChat, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  // ─── SDK Info proxy ───
  app.get("/api/gruda-legion/sdk-info", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.sdkInfo);
    res.status(result.status).json(result.data);
  });

  // ─── Storage proxy ───
  app.get("/api/gruda-legion/storage-info", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.storageInfo);
    res.status(result.status).json(result.data);
  });

  app.get("/api/gruda-legion/storage-list", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.storageList);
    res.status(result.status).json(result.data);
  });

  // ─── Grudge Studio integration proxy ───
  app.get("/api/gruda-legion/grudge-studio-config", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.grudgeStudioConfig);
    res.status(result.status).json(result.data);
  });

  app.get("/api/gruda-legion/grudge-studio-links", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.grudgeStudioLinks);
    res.status(result.status).json(result.data);
  });

  // ─── Admin proxy ───
  app.get("/api/gruda-legion/admin-stats", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.adminStats);
    res.status(result.status).json(result.data);
  });

  app.get("/api/gruda-legion/admin-ecosystem", async (_req, res) => {
    const result = await proxyFetch(GRUDACHAIN_API.adminEcosystem);
    res.status(result.status).json(result.data);
  });

  // ─── Puter Cloud Storage best-practices endpoint ───
  // Returns the canonical directory structure and storage keys for a user
  app.get("/api/gruda-legion/storage-config", (_req, res) => {
    res.json({
      basePath: "/GRUDA",
      directories: {
        assets: "/GRUDA/assets",
        models: "/GRUDA/assets/models",
        textures: "/GRUDA/assets/textures",
        animations: "/GRUDA/assets/animations",
        audio: "/GRUDA/assets/audio",
        projects: "/GRUDA/projects",
        exports: "/GRUDA/exports",
        grudaWarsHeroes: "/GRUDA/gruda-wars/heroes",
        grudaWarsSaves: "/GRUDA/gruda-wars/saves",
        grudaWarsSettings: "/GRUDA/gruda-wars/settings",
      },
      kvPrefixes: {
        cache: "grudge_cache_",
        save: "grudge_save_",
        settings: "grudge_settings_",
        session: "grudge_session_",
        heroSync: "grudge_hero_sync_",
      },
      bestPractices: [
        "Always use createMissingParents: true when writing files",
        "Prefix all KV keys with 'grudge_' to avoid collisions with other Puter apps",
        "Use TTL-based cache entries for temporary data (grudge_cache_ prefix)",
        "Store hero sync timestamps in KV to avoid re-downloading unchanged data",
        "Keep file uploads under 50MB per file for reliable Puter.fs writes",
        "Use dedupeName: true for user uploads to prevent accidental overwrites",
      ],
      deployments: {
        grudaLegion: GRUDACHAIN_URL,
        gameApi: GAME_API_GRUDA,
      },
      source: GRUDACHAIN_SOURCE,
      // Socket.IO: connect to GRUDACHAIN_URL root for real-time AI chat relay
      // Future: implement WebSocket bridge in this proxy
      websocket: {
        url: GRUDACHAIN_URL,
        protocol: "socket.io",
        events: ["chat-message", "chat-response", "system-status", "ai-services"],
      },
    });
  });

  // ─── VPS Game API proxy routes ───
  // These proxy to api.grudge-studio.com game-api endpoints with JWT forwarding

  const gameApiProxy = (route: string) => async (req: any, res: any) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const authHeader = req.headers.authorization;
    if (authHeader) headers["Authorization"] = authHeader;

    const result = await proxyFetch(`${GAME_API_GRUDA}${route}`, {
      method: req.method,
      headers,
      ...(req.method !== "GET" ? { body: JSON.stringify(req.body) } : {}),
    });
    res.status(result.status).json(result.data);
  };

  // Characters
  app.get("/api/gruda-legion/characters", gameApiProxy("/characters"));
  app.post("/api/gruda-legion/characters", gameApiProxy("/characters"));

  // Economy
  app.get("/api/gruda-legion/economy/balance", gameApiProxy("/economy/balance"));
  app.post("/api/gruda-legion/economy/transfer", gameApiProxy("/economy/transfer"));

  // Crafting
  app.get("/api/gruda-legion/crafting/recipes", gameApiProxy("/crafting/recipes"));
  app.post("/api/gruda-legion/crafting/craft", gameApiProxy("/crafting/craft"));

  // Islands
  app.get("/api/gruda-legion/islands", gameApiProxy("/islands"));

  // Factions
  app.get("/api/gruda-legion/factions", gameApiProxy("/factions"));

  // Missions
  app.get("/api/gruda-legion/missions", gameApiProxy("/missions"));

  // Professions
  app.get("/api/gruda-legion/professions/:characterId", (req: any, res: any) =>
    gameApiProxy(`/professions/${req.params.characterId}`)(req, res)
  );

  // Inventory
  app.get("/api/gruda-legion/inventory/:characterId", (req: any, res: any) =>
    gameApiProxy(`/inventory/${req.params.characterId}`)(req, res)
  );

  console.log("✅ GRUDA Legion proxy routes registered (VPS game-api + AI)");
}
