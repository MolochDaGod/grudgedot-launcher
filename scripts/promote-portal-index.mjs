/**
 * Make portal.html the site root (grudge.studio / launcher.grudge-studio.com).
 * Vite emits SPA as dist/public/index.html which wins over rewrites for "/".
 * We keep the React app as app.html and serve it under /app/*.
 *
 * Soft behavior: if portal.html is not produced by the build, log a warning and
 * leave the SPA index in place so production deploys still succeed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist", "public");
const spa = path.join(dist, "index.html");
const portal = path.join(dist, "portal.html");
const appHtml = path.join(dist, "app.html");

if (!fs.existsSync(spa)) {
  console.error("[promote-portal-index] missing vite index.html at", spa);
  process.exit(1);
}

if (!fs.existsSync(portal)) {
  console.warn(
    "[promote-portal-index] portal.html not found — keeping SPA as root index (non-fatal)",
  );
  process.exit(0);
}

fs.copyFileSync(spa, appHtml);
fs.copyFileSync(portal, spa);
console.log("[promote-portal-index] root index.html = portal; SPA at app.html");
