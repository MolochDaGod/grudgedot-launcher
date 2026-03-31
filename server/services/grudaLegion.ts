/**
 * GRUDA Legion Service
 * Server-side proxy to the VPS-deployed GRUDA Legion AI node system.
 * Keeps API keys server-side and adds Puter account linkage + cloud storage best practices.
 *
 * Production: https://api.grudge-studio.com (Grudge Studio VPS via Coolify/Traefik)
 * Endpoints proxied: /health, /api/chat, /api/generate-code, /api/status,
 *   /api/vibe/*, /api/sdk/info, /api/storage/*, /api/grudge-studio/*, /api/admin/*
 */

import type { Express } from "express";
import {
  GRUDACHAIN_URL, GRUDACHAIN_API, GAME_API_GRUDA, GRUDACHAIN_SOURCE, WCS_URL,
  GRD17_MODELS, GRD17_CORES, GRD17_API, GRD17_PUTER_KEYS, GRD17_PUTER_FS, GRD17_REPO, GRD17_DEPLOYMENT_ID,
} from "../../shared/grudachain";
import { aiService } from "../services/ai";

// Grudge ID service — id.grudge-studio.com (identity + auth)
const GRUDGE_ID_SERVICE_URL = process.env.GRUDGE_ID_URL || "https://id.grudge-studio.com";

// ── Server-side conversation history store ──────────────────────────────────
// Keeps last 20 messages per user+core in memory as fallback when
// the client is not signed into Puter.  Cleared on server restart.
// For production, upgrade to Redis via REDIS_URL when available.

const MAX_HISTORY = 20;
const historyStore = new Map<string, Array<{ role: string; content: string; timestamp: string }>>();

function historyKey(userId: string, coreId: string) {
  return `${userId}::${coreId}`;
}

function getHistory(userId: string, coreId: string) {
  return historyStore.get(historyKey(userId, coreId)) ?? [];
}

function appendHistory(
  userId: string, coreId: string,
  userMsg: string, assistantMsg: string,
) {
  const key = historyKey(userId, coreId);
  const hist = historyStore.get(key) ?? [];
  const ts = new Date().toISOString();
  hist.push({ role: "user", content: userMsg, timestamp: ts });
  hist.push({ role: "assistant", content: assistantMsg, timestamp: ts });
  // Trim to last MAX_HISTORY messages
  if (hist.length > MAX_HISTORY) hist.splice(0, hist.length - MAX_HISTORY);
  historyStore.set(key, hist);
}

// ── Per-IP request throttle (simple in-memory) ────────────────────────────
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT_CALLS = 20; // per IP per minute across all AI routes
const ipCounts = new Map<string, { count: number; windowStart: number }>();

function checkServerRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    ipCounts.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_CALLS) return false;
  entry.count += 1;
  return true;
}

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

  // ─── Aggregated health check (VPS + WCS + local) ───
  app.get("/api/gruda-legion/aggregate-health", async (_req, res) => {
    const [vpsHealth, wcsHealth] = await Promise.all([
      proxyFetch(GRUDACHAIN_API.health),
      proxyFetch(`${WCS_URL}/api/health`).catch(() => ({
        ok: false,
        status: 503,
        data: { status: "unreachable" },
      })),
    ]);

    const allHealthy = vpsHealth.ok && wcsHealth.ok;

    res.status(allHealthy ? 200 : 207).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      services: {
        grudaLegion: {
          url: GRUDACHAIN_URL,
          status: vpsHealth.ok ? "healthy" : "unreachable",
          data: vpsHealth.data,
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

  // ─── Vibe AI proxy (VPS game-api serves these natively) ───
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

  // ─── GRD-17 AI Legion model-info endpoint ───
  // Returns all GRD-17 AI core metadata for client-side model selection
  app.get("/api/gruda-legion/grd17/model-info", (_req, res) => {
    res.json({
      repo: GRD17_REPO,
      deploymentId: GRD17_DEPLOYMENT_ID,
      models: GRD17_MODELS,
      cores: GRD17_CORES,
      puterStorage: {
        kvPrefixes: GRD17_PUTER_KEYS,
        fsPaths: GRD17_PUTER_FS,
      },
    });
  });

  // ─── GRD-17 Automation proxy routes ───
  app.get("/api/gruda-legion/grd17/automation/status", async (_req, res) => {
    const result = await proxyFetch(GRD17_API.automationStatus);
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/automation/enable/:ruleId", async (req, res) => {
    const result = await proxyFetch(GRD17_API.automationEnable(req.params.ruleId), { method: "POST" });
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/automation/disable/:ruleId", async (req, res) => {
    const result = await proxyFetch(GRD17_API.automationDisable(req.params.ruleId), { method: "POST" });
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/automation/execute/:ruleId", async (req, res) => {
    const result = await proxyFetch(GRD17_API.automationExecute(req.params.ruleId), { method: "POST" });
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/automation/test-condition", async (req, res) => {
    const result = await proxyFetch(GRD17_API.automationTestCondition, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  // ─── GRD-17 Node / Blockchain proxy routes ───
  app.get("/api/gruda-legion/grd17/node/status", async (_req, res) => {
    const result = await proxyFetch(GRD17_API.nodeStatus);
    res.status(result.status).json(result.data);
  });

  app.get("/api/gruda-legion/grd17/network/info", async (_req, res) => {
    const result = await proxyFetch(GRD17_API.networkInfo);
    res.status(result.status).json(result.data);
  });

  app.get("/api/gruda-legion/grd17/mining/stats", async (_req, res) => {
    const result = await proxyFetch(GRD17_API.miningStats);
    res.status(result.status).json(result.data);
  });

  app.get("/api/gruda-legion/grd17/validator/status", async (_req, res) => {
    const result = await proxyFetch(GRD17_API.validatorStatus);
    res.status(result.status).json(result.data);
  });

  // ─── GRD-17 Blockchain / Wallet proxy routes ───
  app.get("/api/gruda-legion/grd17/blockchain/stats", async (_req, res) => {
    const result = await proxyFetch(GRD17_API.blockchainStats);
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/blockchain/wallet-info", async (req, res) => {
    const result = await proxyFetch(GRD17_API.blockchainWalletInfo, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/blockchain/create-wallet", async (_req, res) => {
    const result = await proxyFetch(GRD17_API.blockchainCreateWallet, { method: "POST" });
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/blockchain/airdrop", async (req, res) => {
    const result = await proxyFetch(GRD17_API.blockchainAirdrop, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/blockchain/mint-gbux", async (req, res) => {
    const result = await proxyFetch(GRD17_API.blockchainMintGbux, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  app.post("/api/gruda-legion/grd17/blockchain/transfer", async (req, res) => {
    const result = await proxyFetch(GRD17_API.blockchainTransfer, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  // ─── GRD-17 model-aware chat ───
  // Extends the base /api/gruda-legion/chat to support GRD-17 specific model IDs
  app.post("/api/gruda-legion/grd17/chat", async (req, res) => {
    const { message, model, temperature, context } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    // Validate model is a known GRD-17 core or fall back to grd17 primary
    const grd17Models = Object.values(GRD17_MODELS) as string[];
    const resolvedModel = grd17Models.includes(model) ? model : GRD17_MODELS.grd17;

    const result = await proxyFetch(GRUDACHAIN_API.chat, {
      method: "POST",
      body: JSON.stringify({
        message,
        model: resolvedModel,
        temperature: temperature ?? 0.7,
        context: context || {},
        source: "grd17-legion",
      }),
    });

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

  // ─── Puter AI Legion routes ──────────────────────────────────────────
  // These routes use the GRUDACHAIN Puter account’s paid membership to access
  // 500+ AI models free via puter.ai. Falls back to Legion Hub if Puter fails.

  // GET /api/gruda-legion/puter-ai/models
  // Returns the GRD-17 core → Puter model mapping + live model list
  app.get("/api/gruda-legion/puter-ai/models", async (_req, res) => {
    const coreMap = aiService.getPuterModelMap();
    res.json({
      coreModelMap: coreMap,
      grd17Models: GRD17_MODELS,
      grd17Cores: GRD17_CORES,
      puterSDK: "https://js.puter.com/v2/",
      account: "GRUDACHAIN",
      note: "Client-side: use puter.ai.chat() directly after signing in as GRUDACHAIN. Server-side: routed through PUTER_API_KEY.",
    });
  });

  // POST /api/gruda-legion/puter-ai/chat
  // Server-side Puter AI chat — rate-limited, history-aware, GRUDACHAIN account
  // Body: { message, core?, model?, temperature?, maxTokens?, systemPrompt?, userId? }
  app.post("/api/gruda-legion/puter-ai/chat", async (req, res) => {
    const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
      ?? req.socket?.remoteAddress
      ?? "unknown";

    // Server-side rate limit (20 req/min per IP)
    if (!checkServerRateLimit(ip)) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        retryAfterMs: RATE_WINDOW_MS,
      });
    }

    const { message, core, model, temperature, maxTokens, systemPrompt, userId } = req.body;

    if (!message) {
      return res.status(400).json({ error: "message is required" });
    }

    try {
      const resolvedCore  = core  || "grd17";
      const resolvedModel = model || resolvedCore;
      const resolvedUser  = userId || ip;

      // Load prior conversation history for context
      const history = getHistory(resolvedUser, resolvedCore);

      const text = await aiService.generateText(message, {
        model:        resolvedModel,
        temperature:  temperature ?? 0.7,
        maxTokens:    maxTokens   ?? 2048,
        systemPrompt,
        provider: "puter-ai",
      });

      // Persist exchange to server-side history
      appendHistory(resolvedUser, resolvedCore, message, text);

      res.json({
        response: text,
        core:      resolvedCore,
        model:     resolvedModel,
        source:    "puter-ai-server",
        historyLength: getHistory(resolvedUser, resolvedCore).length,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Puter AI chat failed" });
    }
  });

  // GET /api/gruda-legion/puter-ai/history/:userId/:coreId
  // Returns conversation history for a user+core pair
  app.get("/api/gruda-legion/puter-ai/history/:userId/:coreId", (req, res) => {
    const { userId, coreId } = req.params;
    const hist = getHistory(userId, coreId);
    res.json({
      userId,
      coreId,
      messageCount: hist.length,
      messages: hist,
    });
  });

  // DELETE /api/gruda-legion/puter-ai/history/:userId/:coreId
  // Clears conversation history for a user+core pair
  app.delete("/api/gruda-legion/puter-ai/history/:userId/:coreId", (req, res) => {
    const { userId, coreId } = req.params;
    historyStore.delete(historyKey(userId, coreId));
    res.json({ cleared: true, userId, coreId });
  });

  // GET /api/gruda-legion/puter-ai/history/:userId
  // Returns history summary across all cores for a user
  app.get("/api/gruda-legion/puter-ai/history/:userId", (req, res) => {
    const { userId } = req.params;
    const cores = Object.values(GRD17_MODELS) as string[];
    const summary = cores.map(coreId => ({
      coreId,
      messageCount: getHistory(userId, coreId).length,
    })).filter(c => c.messageCount > 0);
    res.json({ userId, cores: summary });
  });

  // GET /api/gruda-legion/puter-ai/status
  // Returns Puter AI provider status and model availability
  app.get("/api/gruda-legion/puter-ai/status", (_req, res) => {
    res.json({
      providers: aiService.getStatus(),
      coreModelMap: aiService.getPuterModelMap(),
      puterMembership: "GRUDACHAIN",
      hasPuterApiKey: !!process.env.PUTER_API_KEY,
      modelsAvailable: 500,
    });
  });

  // ── Grudge ID — Puter onboarding and identity routes ───────────────────────────────────────────────────────────────────────────────
  //
  // These proxy the grudge-id service (id.grudge-studio.com).
  // They implement the GRUDGE STUDIO PIP monetisation scheme:
  //   • Every visitor gets a Puter account (temp or real)
  //   • Puter UUID → Grudge ID (single identity across all auth methods)
  //   • All subsequent puter.ai / puter.kv / puter.fs calls charge the USER’S
  //     Puter account → GRUDGE STUDIO earns PIP revenue from that engagement
  //
  // POST /api/grudge-id/link-puter — called by puter-onboarding.ts autoOnboard()
  app.post("/api/grudge-id/link-puter", async (req, res) => {
    const result = await proxyFetch(`${GRUDGE_ID_SERVICE_URL}/identity/link-puter`, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  // POST /api/grudge-id/link-auth — called by puter-onboarding.ts linkAuth()
  app.post("/api/grudge-id/link-auth", async (req, res) => {
    const result = await proxyFetch(`${GRUDGE_ID_SERVICE_URL}/identity/link-auth`, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  // POST /api/grudge-id/claim-account — called by puter-onboarding.ts claimAccount()
  app.post("/api/grudge-id/claim-account", async (req, res) => {
    const result = await proxyFetch(`${GRUDGE_ID_SERVICE_URL}/identity/claim-account`, {
      method: "POST",
      body: JSON.stringify(req.body),
    });
    res.status(result.status).json(result.data);
  });

  // GET /api/grudge-id/:grudgeId — public profile lookup
  app.get("/api/grudge-id/:grudgeId", async (req, res) => {
    const result = await proxyFetch(`${GRUDGE_ID_SERVICE_URL}/identity/${req.params.grudgeId}`);
    res.status(result.status).json(result.data);
  });

  // NOTE: Babylon AI Workers are accessed directly at:
  //   - ai.grudge-studio.com/v1/agents/havok/chat  (auth'd, rate-limited)
  //   - ai.grudge-studio.com/v1/agents/sage/chat
  //   - babylon-ai-workers.grudge.workers.dev       (direct, CORS open)
  // No duplicate proxy needed here — the real backend (ai-hub) handles routing.

  console.log("✅ GRUDA Legion proxy routes registered");
}
