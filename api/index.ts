/**
 * Vercel serverless entry point.
 * Static imports are bundled by ncc. Module-level init is wrapped
 * so that if anything throws we still get a JSON error response
 * instead of an opaque FUNCTION_INVOCATION_FAILED.
 */
import dotenv from "dotenv";
dotenv.config();

import express, { type Request, Response, NextFunction } from "express";
import { serveStatic, log } from "../server/serverUtils";
import { storage } from "../server/storage";
import { isDatabaseConfigured } from "../server/db";
import { setupGrudgeAuth } from "../server/grudgeAuth";

// ── Build the Express app (runs once at cold-start) ──
let _app: ReturnType<typeof express> | null = null;
let _initError: Error | null = null;

try {
  const app = express();

  app.use(express.json({
    verify: (req: any, _res, buf) => { (req as any).rawBody = buf; },
  }));
  app.use(express.urlencoded({ extended: false }));

  // Request logger
  app.use((req, res, next) => {
    const start = Date.now();
    const reqPath = req.path;
    let captured: any;
    const origJson = res.json;
    res.json = function (body, ...a: any[]) {
      captured = body;
      return origJson.apply(res, [body, ...a]);
    };
    res.on("finish", () => {
      if (reqPath.startsWith("/api")) {
        let line = `${req.method} ${reqPath} ${res.statusCode} in ${Date.now() - start}ms`;
        if (captured) line += ` :: ${JSON.stringify(captured)}`;
        if (line.length > 80) line = line.slice(0, 79) + "…";
        log(line);
      }
    });
    next();
  });

  // Auth (gateway proxy — no DB needed)
  setupGrudgeAuth(app);
  log("Grudge Auth configured (gateway proxy)");

  // Seed DB if configured
  if (isDatabaseConfigured()) {
    storage.seedAssets()
      .then(() => storage.seedRtsAssets())
      .then(() => storage.seedGameData())
      .then(() => log("Database seeded"))
      .catch((err) => {
        log("Warning: DB seeding failed (OK for serverless cold starts)");
        console.error(err);
      });
  } else {
    log("Warning: DATABASE_URL not set — running without database");
  }

  // Lazy-load heavy routes (Socket.IO, OpenAI, etc.) on first request
  let routesLoaded = false;
  app.use(async (_req, _res, next) => {
    if (!routesLoaded) {
      try {
        const { registerRoutes } = await import("../server/routes.js");
        await registerRoutes(app);
        routesLoaded = true;
        log("Routes registered");
      } catch (err) {
        console.error("Failed to register routes:", err);
      }
    }
    next();
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    console.error("Request error:", err);
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  serveStatic(app);
  log("Serverless function initialized");
  _app = app;
} catch (err: any) {
  _initError = err;
  console.error("BOOTSTRAP ERROR:", err);
}

// ── Handler — Vercel calls this per request ──
export default function handler(req: any, res: any) {
  if (_initError || !_app) {
    return res.status(500).json({
      error: "Function bootstrap failed",
      message: _initError?.message ?? "unknown",
      stack: _initError?.stack?.split("\n").slice(0, 10),
    });
  }
  return _app(req, res);
}
