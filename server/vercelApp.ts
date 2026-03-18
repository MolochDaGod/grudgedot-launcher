/**
 * Vercel-compatible Express app.
 * Registers only routes that work in a serverless environment:
 *  - Auth proxy (grudgeAuth.ts)
 *  - GRUDA Legion proxy (grudaLegion.ts)
 *  - Gruda Wars (grudaWars.ts)
 *  - Chat / AI (xAI Grok)
 *  - Health check
 *  - DB-backed CRUD (projects, conversations, messages, assets, characters, etc.)
 *  - Meshy 3D API proxy
 *
 * Excluded (serverless-incompatible):
 *  - Socket.IO / real-time multiplayer lobby
 *  - Vite dev middleware
 *  - File-system upload/sync routes
 */

import "./env";
import express, { type Request, type Response, type NextFunction } from "express";
import { setupGrudgeAuth } from "./grudgeAuth";
import { setupGrudgeProxy } from "./routes/grudgeProxy";
import { registerGrudaLegionRoutes } from "./services/grudaLegion";
import { registerGrudaWarsRoutes } from "./routes/grudaWars";
import { registerUserRoutes } from "./routes/user";
import { registerAccountRoutes } from "./routes/accountRoutes";
import { registerOpenRTSRoutes } from "./routes/openrts";
import { overdriveEngine } from "./services/overdriveEngine";
import OpenAI from "openai";

const BACKEND = process.env.GRUDGE_BACKEND_URL || "https://api.grudge-studio.com";

/** Check if the Grudge backend URL is configured */
function isBackendConfigured(): boolean {
  return !!process.env.GRUDGE_BACKEND_URL;
}

/** Proxy a request to the Grudge backend */
async function proxyGet(path: string, req: Request, res: Response) {
  try {
    const headers: Record<string, string> = {};
    if (req.headers.authorization) headers["Authorization"] = req.headers.authorization as string;
    const r = await fetch(`${BACKEND}${path}`, { headers });
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "Backend unavailable" }); }
}

async function proxyMutate(method: string, path: string, req: Request, res: Response) {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (req.headers.authorization) headers["Authorization"] = req.headers.authorization as string;
    const r = await fetch(`${BACKEND}${path}`, {
      method, headers, body: JSON.stringify(req.body || {}),
    });
    if (r.status === 204) return res.status(204).send();
    const data = await r.json();
    res.status(r.status).json(data);
  } catch { res.status(502).json({ error: "Backend unavailable" }); }
}

const app = express();

// ── Middleware ──
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for Vercel (frontend and API may be on same domain, but add flexibility)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-grudge-user-id");
  if (_req.method === "OPTIONS") {
    return res.status(204).end();
  }
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    if (req.path.startsWith("/api")) {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

// ── xAI Grok client (for AI chat) ──
const xai = process.env.XAI_API_KEY
  ? new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey: process.env.XAI_API_KEY })
  : null;

const GDEVELOP_SYSTEM_PROMPT = `You are an expert GDevelop game development assistant powered by xAI's Grok. You help with game design, mechanics, GDevelop event systems, asset recommendations, and integration with tools like Three.js, Babylon.js, and LUME. Be practical, actionable, and encouraging.`;

// ════════════════════════════════════════════
// Auth routes (proxy to Grudge backend)
// ════════════════════════════════════════════
setupGrudgeAuth(app);

// ════════════════════════════════════════════
// Grudge backend proxy (/api/grudge/game|account|id|launcher)
// ════════════════════════════════════════════
setupGrudgeProxy(app);

// ════════════════════════════════════════════
// Health check
// ════════════════════════════════════════════
app.get("/api/health", async (_req: Request, res: Response) => {
  // Quick Grudge backend ping (non-blocking, 3s timeout)
  let backendOk = false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const r = await fetch(`${BACKEND}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    backendOk = r.ok;
  } catch { /* unreachable */ }

  res.json({
    status: "healthy",
    service: "GDevelop Assistant",
    timestamp: new Date().toISOString(),
    runtime: process.version,
    env: {
      grudgeBackend: backendOk ? "reachable" : "unreachable",
      backendUrl: BACKEND,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      hasXaiKey: !!process.env.XAI_API_KEY,
      hasMeshyKey: !!process.env.MESHY_API_KEY,
      nodeEnv: process.env.NODE_ENV || "not-set",
    },
  });
});

// ════════════════════════════════════════════
// GRUDA Legion + Gruda Wars (standalone modules)
// ════════════════════════════════════════════
registerGrudaLegionRoutes(app);
registerGrudaWarsRoutes(app);
registerAccountRoutes(app);
registerOpenRTSRoutes(app);

// ════════════════════════════════════════════
// DB-backed routes → proxy to Grudge backend
// ════════════════════════════════════════════

// ── Projects ──
app.get("/api/projects", (req, res) => proxyGet("/api/gdevelop/projects", req, res));
app.get("/api/projects/:id", (req, res) => proxyGet(`/api/gdevelop/projects/${req.params.id}`, req, res));
app.post("/api/projects", (req, res) => proxyMutate("POST", "/api/gdevelop/projects", req, res));
app.patch("/api/projects/:id", (req, res) => proxyMutate("PATCH", `/api/gdevelop/projects/${req.params.id}`, req, res));
app.delete("/api/projects/:id", (req, res) => proxyMutate("DELETE", `/api/gdevelop/projects/${req.params.id}`, req, res));

// ── Conversations ──
app.get("/api/conversations", (req, res) => proxyGet("/api/gdevelop/conversations", req, res));
app.get("/api/conversations/:id", (req, res) => proxyGet(`/api/gdevelop/conversations/${req.params.id}`, req, res));
app.post("/api/conversations", (req, res) => proxyMutate("POST", "/api/gdevelop/conversations", req, res));
app.delete("/api/conversations/:id", (req, res) => proxyMutate("DELETE", `/api/gdevelop/conversations/${req.params.id}`, req, res));

// ── Messages + AI Chat ──
app.get("/api/conversations/:id/messages", (req, res) => proxyGet(`/api/gdevelop/conversations/${req.params.id}/messages`, req, res));

app.post("/api/messages", async (req: Request, res: Response) => {
  try {
    // Save user message via backend
    const msgRes = await fetch(`${BACKEND}/api/gdevelop/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    const userMessage = await msgRes.json();

    // Get AI response from xAI Grok
    try {
      if (!xai) throw new Error("XAI_API_KEY not configured");

      // Fetch conversation history from backend
      const histRes = await fetch(`${BACKEND}/api/gdevelop/conversations/${req.body.conversationId}/messages`);
      const history = await histRes.json();

      const response = await xai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { role: "system", content: GDEVELOP_SYSTEM_PROMPT },
          ...history.map((m: any) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        max_tokens: 4096,
        temperature: 0.7,
      });

      const aiContent = response.choices[0]?.message?.content
        || "I couldn't generate a response. Please try again.";

      const aiRes = await fetch(`${BACKEND}/api/gdevelop/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: req.body.conversationId, role: "assistant", content: aiContent }),
      });
      const aiMessage = await aiRes.json();
      res.status(201).json({ userMessage, aiMessage });
    } catch (aiErr: any) {
      console.error("AI Error:", aiErr.message);
      const fbRes = await fetch(`${BACKEND}/api/gdevelop/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: req.body.conversationId, role: "assistant",
          content: xai
            ? "I encountered an error processing your request. Please try again."
            : "AI chat is not configured. Set XAI_API_KEY to enable it.",
        }),
      });
      const aiMessage = await fbRes.json();
      res.status(201).json({ userMessage, aiMessage });
    }
  } catch (e: any) {
    console.error("Message Error:", e);
    res.status(400).json({ error: "Invalid message data" });
  }
});

// ── Assets ──
app.get("/api/assets", (req, res) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  proxyGet(`/api/gdevelop/assets${qs ? "?" + qs : ""}`, req, res);
});
app.post("/api/assets", (req, res) => proxyMutate("POST", "/api/gdevelop/assets", req, res));

// ── Simple proxy routes ──
app.get("/api/characters", (req, res) => proxyGet("/api/gdevelop/characters", req, res));
app.get("/api/currencies", (req, res) => proxyGet("/api/gdevelop/currencies", req, res));
app.get("/api/achievements", (req, res) => proxyGet("/api/gdevelop/achievements", req, res));
app.get("/api/store", (req, res) => proxyGet("/api/gdevelop/store", req, res));
app.get("/api/lobbies", (req, res) => proxyGet("/api/gdevelop/lobbies", req, res));
app.get("/api/ai-behaviors", (req, res) => proxyGet("/api/gdevelop/ai-behaviors", req, res));
app.get("/api/levels", (req, res) => proxyGet("/api/gdevelop/levels", req, res));
app.get("/api/settings", (req, res) => proxyGet("/api/gdevelop/settings", req, res));
app.get("/api/skill-trees", (req, res) => proxyGet("/api/gdevelop/skill-trees", req, res));
app.post("/api/skill-trees", (req, res) => proxyMutate("POST", "/api/gdevelop/skill-trees", req, res));
app.get("/api/rts/projects", (req, res) => proxyGet("/api/gdevelop/rts/projects", req, res));
app.get("/api/rts/assets", (req, res) => {
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  proxyGet(`/api/gdevelop/rts/assets${qs ? "?" + qs : ""}`, req, res);
});

// ── Meshy 3D API (texture generation) ──
app.post("/api/meshy/retexture", async (req, res) => {
  try {
    const { modelUrl, texturePrompt, enablePbr = true } = req.body;
    if (!modelUrl || !texturePrompt) {
      return res.status(400).json({ error: "Model URL and texture prompt required" });
    }
    const key = process.env.MESHY_API_KEY;
    if (!key) {
      return res.json({ taskId: `mock-task-${Date.now()}`, status: "PENDING", mock: true });
    }
    const resp = await fetch("https://api.meshy.ai/openapi/v2/retexture", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model_url: modelUrl, texture_prompt: texturePrompt, enable_pbr: enablePbr, ai_model: "latest" }),
    });
    if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
    const result = await resp.json();
    res.json({ taskId: result.result, status: "PENDING" });
  } catch { res.status(500).json({ error: "Meshy API error" }); }
});

app.get("/api/meshy/retexture/:taskId", async (req, res) => {
  const { taskId } = req.params;
  if (taskId.startsWith("mock-task-")) {
    return res.json({ taskId, status: "SUCCEEDED", progress: 100, mock: true });
  }
  const key = process.env.MESHY_API_KEY;
  if (!key) return res.status(400).json({ error: "Meshy API key not configured" });
  try {
    const resp = await fetch(`https://api.meshy.ai/openapi/v2/retexture/${taskId}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!resp.ok) return res.status(resp.status).json({ error: await resp.text() });
    const result = await resp.json();
    res.json({ taskId, status: result.status, progress: result.progress, modelUrls: result.model_urls, textureUrls: result.texture_urls });
  } catch { res.status(500).json({ error: "Meshy status check error" }); }
});

// ── User routes (profile, characters, stats) ──
try { registerUserRoutes(app); } catch { /* backend may not be configured */ }

// ── Lobby stats (no Socket.IO — returns zeros) ──
app.get("/api/lobby/stats", (_req, res) => {
  res.json({ rooms: 0, players: 0, available: false, hint: "Real-time lobby requires persistent server (Railway)" });
});

// ════════════════════════════════════════════
// OVERDRIVE RACING GAME ROUTES
// ════════════════════════════════════════════

app.get("/api/overdrive/tracks", (_req, res) => {
  try {
    res.json(overdriveEngine.getTracks());
  } catch { res.status(500).json({ error: "Failed to fetch tracks" }); }
});

app.get("/api/overdrive/tracks/:trackId", (req, res) => {
  const track = overdriveEngine.getTrack(req.params.trackId);
  track ? res.json(track) : res.status(404).json({ error: "Track not found" });
});

app.post("/api/overdrive/races", (req, res) => {
  try {
    const { trackId, maxPlayers = 4 } = req.body;
    if (!trackId) return res.status(400).json({ error: "trackId is required" });
    res.status(201).json(overdriveEngine.createRace(trackId, maxPlayers));
  } catch (e: any) { res.status(400).json({ error: e.message || "Failed to create race" }); }
});

app.post("/api/overdrive/races/:raceId/join", (req, res) => {
  try {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: "playerId is required" });
    res.status(201).json(overdriveEngine.addVehicleToRace(req.params.raceId, playerId));
  } catch (e: any) { res.status(400).json({ error: e.message || "Failed to join race" }); }
});

app.get("/api/overdrive/races/:raceId", (req, res) => {
  const race = overdriveEngine.getRaceState(req.params.raceId);
  if (!race) return res.status(404).json({ error: "Race not found" });
  res.json({
    ...race,
    vehicles: Array.from(race.vehicles.values()),
    playerTimes: Object.fromEntries(race.playerTimes),
  });
});

app.get("/api/overdrive/leaderboard", (req, res) => {
  try {
    const { trackId, limit = 50 } = req.query;
    res.json(overdriveEngine.getLeaderboard(
      typeof trackId === "string" ? trackId : undefined,
      Math.min(Number(limit) || 50, 100),
    ));
  } catch { res.status(500).json({ error: "Failed to fetch leaderboard" }); }
});

app.post("/api/overdrive/leaderboard", (req, res) => {
  try {
    const { playerId, playerName, trackId, time, difficulty } = req.body;
    if (!playerId || !playerName || !trackId || !time) {
      return res.status(400).json({ error: "playerId, playerName, trackId, and time are required" });
    }
    overdriveEngine.addLeaderboardEntry({ playerId, playerName, trackId, time, date: new Date(), difficulty: difficulty || 1 });
    res.status(201).json({ success: true });
  } catch { res.status(500).json({ error: "Failed to add leaderboard entry" }); }
});

// ════════════════════════════════════════════
// Unavailable feature stubs
// ════════════════════════════════════════════
const unavailable = (feature: string) => (_req: Request, res: Response) => {
  res.status(503).json({
    error: `${feature} is not available in serverless mode`,
    hint: "This feature requires the full Express server (Railway or local dev)",
  });
};

app.all("/api/objects/*", unavailable("Object Storage"));
app.all("/public-objects/*", unavailable("Object Storage"));
app.all("/api/assets/sync-to-storage", unavailable("Asset Sync"));
app.all("/api/assets/upload-folder", unavailable("Folder Upload"));
app.all("/api/assets/upload-batch", unavailable("Batch Upload"));
app.all("/api/admin/storage*", unavailable("Admin Storage"));

// ── Catch-all for unimplemented API routes ──
app.all("/api/*", (req: Request, res: Response) => {
  res.status(404).json({
    error: "Endpoint not available",
    path: req.path,
    method: req.method,
    hint: "This endpoint may not be implemented in the Vercel deployment",
  });
});

export default app;
