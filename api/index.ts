/**
 * Vercel serverless entry point.
 * Uses lazy bootstrap so the module evaluates without importing heavy
 * server dependencies.  If bootstrap fails, the handler returns a
 * JSON error instead of crashing with FUNCTION_INVOCATION_FAILED.
 */

let _app: any = null;
let _initError: any = null;

function bootstrap() {
  // require() is bundled by ncc (dynamic import() is NOT, causing ERR_MODULE_NOT_FOUND)
  require("dotenv").config();

  const express = require("express");
  const { serveStatic, log } = require("../server/serverUtils");
  const { storage } = require("../server/storage");
  const { isDatabaseConfigured } = require("../server/db");
  const { setupGrudgeAuth } = require("../server/grudgeAuth");

  const app = express();

  app.use(express.json({
    verify: (req: any, _res: any, buf: any) => { req.rawBody = buf; },
  }));
  app.use(express.urlencoded({ extended: false }));

  // Request logger
  app.use((req: any, res: any, next: any) => {
    const start = Date.now();
    const reqPath = req.path;
    let captured: any;
    const origJson = res.json;
    res.json = function (body: any, ...a: any[]) {
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

  // Auth routes (gateway proxy — no DB needed)
  setupGrudgeAuth(app);
  log("Grudge Authentication configured (gateway proxy mode)");

  // Seed DB if configured
  if (isDatabaseConfigured()) {
    storage.seedAssets()
      .then(() => storage.seedRtsAssets())
      .then(() => storage.seedGameData())
      .then(() => log("Database seeded successfully"))
      .catch((err: any) => {
        log("Warning: Database seeding failed (OK for serverless cold starts)");
        console.error(err);
      });
  } else {
    log("Warning: DATABASE_URL not set — running without database");
  }

  // Lazy-load heavy routes on first request
  let routesRegistered = false;
  app.use(async (req: any, res: any, next: any) => {
    if (!routesRegistered) {
      try {
        const { registerRoutes } = require("../server/routes");
        await registerRoutes(app);
        routesRegistered = true;
        log("Routes registered successfully");
      } catch (error) {
        console.error("Failed to register routes:", error);
      }
    }
    next();
  });

  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Request error:", err);
    res.status(status).json({ message });
  });

  serveStatic(app);
  log("Serverless function initialized");
  return app;
}

export default function handler(req: any, res: any) {
  // Return cached error from a previous failed bootstrap
  if (_initError) {
    return res.status(500).json({
      error: "Function bootstrap failed",
      message: _initError.message,
      stack: _initError.stack?.split("\n").slice(0, 10),
    });
  }

  // Lazy-init on first invocation
  if (!_app) {
    try {
      _app = bootstrap();
    } catch (err: any) {
      _initError = err;
      console.error("BOOTSTRAP ERROR:", err);
      return res.status(500).json({
        error: "Function bootstrap failed",
        message: err.message,
        stack: err.stack?.split("\n").slice(0, 10),
      });
    }
  }

  return _app(req, res);
}
