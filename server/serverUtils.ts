/**
 * Serverless-safe utilities.
 * log() and serveStatic() extracted from vite.ts so that
 * api/index.ts (Vercel serverless function) does NOT pull in the
 * entire Vite dev toolchain at import time.
 *
 * server/index.ts (local dev) continues to import from vite.ts directly.
 */

import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Use __dirname directly (CJS) or derive from import.meta.url (ESM).
// Vercel compiles ESM→CJS — import.meta.url may not survive the transform.
const __dirname_safe: string = (() => {
  try {
    // CJS — __dirname is globally available
    if (typeof __dirname !== "undefined") return __dirname;
  } catch {}
  try {
    // ESM fallback
    const { fileURLToPath } = require("url");
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {}
  return process.cwd();
})();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  const candidates = [
    path.resolve(__dirname_safe, "..", "dist", "public"),
    path.resolve(__dirname_safe, "public"),
    path.resolve(process.cwd(), "dist", "public"),
  ];

  const distPath = candidates.find((p) => fs.existsSync(p));

  if (!distPath) {
    log(`Warning: No build directory found. Tried: ${candidates.join(", ")}`);
    return;
  }

  app.use(express.static(distPath));

  // SPA fallback
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
