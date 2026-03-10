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
 *  - Replit Object Storage (sidecar not available)
 *  - Vite dev middleware
 *  - File-system upload/sync routes
 */

import "./env";
import express, { type Request, type Response, type NextFunction } from "express";
import { setupGrudgeAuth } from "./grudgeAuth";
import { registerGrudaLegionRoutes } from "./services/grudaLegion";
import { registerGrudaWarsRoutes } from "./routes/grudaWars";
import { registerUserRoutes } from "./routes/user";
import { registerAccountRoutes } from "./routes/accountRoutes";
import { registerOpenRTSRoutes } from "./routes/openrts";
import { isDatabaseConfigured } from "./db";
import { storage } from "./storage";
import {
  insertGameProjectSchema,
  insertChatConversationSchema,
  insertChatMessageSchema,
  insertGdevelopAssetSchema,
  insertRtsProjectSchema,
  insertSkillTreeSchema,
  insertPlayerProfileSchema,
  skillTrees,
} from "../shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";

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
// Auth routes (proxy to auth-gateway)
// ════════════════════════════════════════════
setupGrudgeAuth(app);

// ════════════════════════════════════════════
// Health check
// ════════════════════════════════════════════
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "healthy",
    service: "GDevelop Assistant (Vercel)",
    timestamp: new Date().toISOString(),
    runtime: process.version,
    env: {
      hasDatabase: isDatabaseConfigured(),
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
// DB-backed routes (only when DATABASE_URL is set)
// ════════════════════════════════════════════

function requireDb(_req: Request, res: Response, next: NextFunction) {
  if (!isDatabaseConfigured()) {
    return res.status(503).json({
      error: "Database not configured",
      hint: "Set DATABASE_URL in Vercel Environment Variables",
    });
  }
  next();
}

// ── Projects ──
app.get("/api/projects", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllProjects()); }
  catch (e) { res.status(500).json({ error: "Failed to fetch projects" }); }
});

app.get("/api/projects/:id", requireDb, async (req, res) => {
  try {
    const p = await storage.getProject(req.params.id);
    p ? res.json(p) : res.status(404).json({ error: "Project not found" });
  } catch { res.status(500).json({ error: "Failed to fetch project" }); }
});

app.post("/api/projects", requireDb, async (req, res) => {
  try {
    const data = insertGameProjectSchema.parse(req.body);
    res.status(201).json(await storage.createProject(data));
  } catch { res.status(400).json({ error: "Invalid project data" }); }
});

app.patch("/api/projects/:id", requireDb, async (req, res) => {
  try {
    const p = await storage.updateProject(req.params.id, req.body);
    p ? res.json(p) : res.status(404).json({ error: "Project not found" });
  } catch { res.status(500).json({ error: "Failed to update project" }); }
});

app.delete("/api/projects/:id", requireDb, async (req, res) => {
  try {
    const ok = await storage.deleteProject(req.params.id);
    ok ? res.status(204).send() : res.status(404).json({ error: "Project not found" });
  } catch { res.status(500).json({ error: "Failed to delete project" }); }
});

// ── Conversations ──
app.get("/api/conversations", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllConversations()); }
  catch { res.status(500).json({ error: "Failed to fetch conversations" }); }
});

app.get("/api/conversations/:id", requireDb, async (req, res) => {
  try {
    const c = await storage.getConversation(req.params.id);
    c ? res.json(c) : res.status(404).json({ error: "Conversation not found" });
  } catch { res.status(500).json({ error: "Failed to fetch conversation" }); }
});

app.post("/api/conversations", requireDb, async (req, res) => {
  try {
    const data = insertChatConversationSchema.parse(req.body);
    res.status(201).json(await storage.createConversation(data));
  } catch { res.status(400).json({ error: "Invalid conversation data" }); }
});

app.delete("/api/conversations/:id", requireDb, async (req, res) => {
  try {
    const ok = await storage.deleteConversation(req.params.id);
    ok ? res.status(204).send() : res.status(404).json({ error: "Conversation not found" });
  } catch { res.status(500).json({ error: "Failed to delete conversation" }); }
});

// ── Messages + AI Chat ──
app.get("/api/conversations/:id/messages", requireDb, async (req, res) => {
  try { res.json(await storage.getMessagesByConversation(req.params.id)); }
  catch { res.status(500).json({ error: "Failed to fetch messages" }); }
});

app.post("/api/messages", requireDb, async (req, res) => {
  try {
    const data = insertChatMessageSchema.parse(req.body);
    const userMessage = await storage.createMessage(data);

    // Get AI response from xAI Grok
    try {
      if (!xai) throw new Error("XAI_API_KEY not configured");

      const history = await storage.getMessagesByConversation(data.conversationId);
      const response = await xai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { role: "system", content: GDEVELOP_SYSTEM_PROMPT },
          ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        ],
        max_tokens: 4096,
        temperature: 0.7,
      });

      const aiContent = response.choices[0]?.message?.content
        || "I couldn't generate a response. Please try again.";
      const aiMessage = await storage.createMessage({
        conversationId: data.conversationId,
        role: "assistant",
        content: aiContent,
      });
      res.status(201).json({ userMessage, aiMessage });
    } catch (aiErr: any) {
      console.error("AI Error:", aiErr.message);
      const fallback = await storage.createMessage({
        conversationId: data.conversationId,
        role: "assistant",
        content: xai
          ? "I encountered an error processing your request. Please try again."
          : "AI chat is not configured. Set XAI_API_KEY in Vercel Environment Variables to enable it.",
      });
      res.status(201).json({ userMessage, aiMessage: fallback });
    }
  } catch (e: any) {
    console.error("Message Error:", e);
    res.status(400).json({ error: "Invalid message data" });
  }
});

// ── Assets ──
app.get("/api/assets", requireDb, async (req, res) => {
  try {
    const { type, search } = req.query;
    let assets;
    if (search && typeof search === "string") assets = await storage.searchAssets(search);
    else if (type && typeof type === "string") assets = await storage.getAssetsByType(type);
    else assets = await storage.getAllAssets();
    res.json(assets);
  } catch { res.status(500).json({ error: "Failed to fetch assets" }); }
});

app.post("/api/assets", requireDb, async (req, res) => {
  try {
    const data = insertGdevelopAssetSchema.parse(req.body);
    res.status(201).json(await storage.createAsset(data));
  } catch { res.status(400).json({ error: "Invalid asset data" }); }
});

// ── Characters ──
app.get("/api/characters", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllCharacters()); }
  catch { res.status(500).json({ error: "Failed to fetch characters" }); }
});

// ── Currencies & Wallet ──
app.get("/api/currencies", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllCurrencies()); }
  catch { res.status(500).json({ error: "Failed to fetch currencies" }); }
});

// ── Achievements ──
app.get("/api/achievements", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllAchievements()); }
  catch { res.status(500).json({ error: "Failed to fetch achievements" }); }
});

// ── Store ──
app.get("/api/store", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllStoreItems()); }
  catch { res.status(500).json({ error: "Failed to fetch store" }); }
});

// ── Lobbies ──
app.get("/api/lobbies", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllLobbies()); }
  catch { res.status(500).json({ error: "Failed to fetch lobbies" }); }
});

// ── AI Behaviors ──
app.get("/api/ai-behaviors", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllAiBehaviors()); }
  catch { res.status(500).json({ error: "Failed to fetch AI behaviors" }); }
});

// ── Levels ──
app.get("/api/levels", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllLevelRequirements()); }
  catch { res.status(500).json({ error: "Failed to fetch levels" }); }
});

// ── Settings ──
app.get("/api/settings", requireDb, async (req, res) => {
  try {
    const claims = (req as any).user?.claims;
    const userId = claims?.sub || "guest";
    const settings = await storage.getUserSettings(userId);
    res.json(settings || {});
  } catch { res.status(500).json({ error: "Failed to fetch settings" }); }
});

// ── Skill Trees ──
app.get("/api/skill-trees", requireDb, async (_req, res) => {
  try {
    // @ts-expect-error - drizzle query proxy
    const trees = await db.query.skillTrees.findMany();
    res.json(trees);
  } catch { res.status(500).json({ error: "Failed to fetch skill trees" }); }
});

app.post("/api/skill-trees", requireDb, async (req, res) => {
  try {
    const data = insertSkillTreeSchema.parse(req.body);
    const [tree] = await db.insert(skillTrees).values(data).returning();
    res.status(201).json(tree);
  } catch { res.status(400).json({ error: "Invalid skill tree data" }); }
});

// ── RTS Projects ──
app.get("/api/rts/projects", requireDb, async (_req, res) => {
  try { res.json(await storage.getAllRtsProjects()); }
  catch { res.status(500).json({ error: "Failed to fetch RTS projects" }); }
});

app.get("/api/rts/assets", requireDb, async (req, res) => {
  try {
    const { type } = req.query;
    const assets = type && typeof type === "string"
      ? await storage.getRtsAssetsByType(type)
      : await storage.getAllRtsAssets();
    res.json(assets);
  } catch { res.status(500).json({ error: "Failed to fetch RTS assets" }); }
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
try { registerUserRoutes(app); } catch { /* DB may not be configured */ }

// ── Lobby stats (no Socket.IO — returns zeros) ──
app.get("/api/lobby/stats", (_req, res) => {
  res.json({ rooms: 0, players: 0, available: false, hint: "Real-time lobby requires persistent server (Railway)" });
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
