#!/usr/bin/env node
/**
 * ci-verify.mjs — fail fast on regressions that previously broke production builds.
 *
 * Checks:
 *  1. Critical modules exist on disk (game-effects, auth, backend API)
 *  2. Critical named exports are present in auth + grudgeBackendApi source
 *  3. package.json engines / name stay canonical
 *  4. .npmrc has legacy-peer-deps (multi-engine dep graph)
 *
 * Exit 0 on success, 1 with a clear list of failures.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fail = [];
const warn = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// ── 1. Critical files ──────────────────────────────────────────
const requiredFiles = [
  "client/src/lib/auth.ts",
  "client/src/lib/grudgeBackendApi.ts",
  "client/src/lib/queryClient.ts",
  "client/src/App.tsx",
  "client/src/lib/game-effects/ParticleSystem.ts",
  "client/src/lib/game-effects/SpellEffects.ts",
  "client/src/lib/game-effects/CollisionSystem.ts",
  "client/src/pages/swarm-rts-enhanced.tsx",
  "package.json",
  "package-lock.json",
  ".npmrc",
  ".node-version",
];

for (const f of requiredFiles) {
  if (!exists(f)) fail.push(`missing file: ${f}`);
}

// ── 2. Critical exports ────────────────────────────────────────
const exportChecks = [
  {
    file: "client/src/lib/auth.ts",
    symbols: [
      "isTokenExpired",
      "redirectToLogin",
      "getLoginHref",
      "getAuthData",
      "storeAuth",
      "logout",
    ],
  },
  {
    file: "client/src/lib/grudgeBackendApi.ts",
    symbols: [
      "apiFetch",
      "grudgeGameApi",
      "grudgeAccountApi",
      "grudgeEconomyApi",
      "EconomyOverview",
      "AccountWalletData",
      "PriceHistoryEntry",
    ],
  },
];

for (const { file, symbols } of exportChecks) {
  if (!exists(file)) continue;
  const src = read(file);
  for (const sym of symbols) {
    const re = new RegExp(
      `export\\s+(?:async\\s+)?(?:function|const|interface|type|class)\\s+${sym}\\b|export\\s*\\{[^}]*\\b${sym}\\b`,
    );
    if (!re.test(src)) fail.push(`${file}: missing export ${sym}`);
  }
}

// ── 3. package.json canonical ──────────────────────────────────
if (exists("package.json")) {
  const pkg = JSON.parse(read("package.json"));
  if (pkg.name !== "grudgedot") {
    fail.push(`package.json name is "${pkg.name}", expected "grudgedot"`);
  }
  const nodeEng = pkg.engines?.node || "";
  if (!/22/.test(nodeEng) && !/>=\s*22/.test(nodeEng)) {
    fail.push(`package.json engines.node should require 22+ (got "${nodeEng}")`);
  }
  const three = pkg.dependencies?.three || "";
  // postprocessing requires three < 0.183
  if (/0\.183|0\.184|0\.19/.test(three) && !/0\.182/.test(three)) {
    fail.push(
      `package.json three@${three} may break postprocessing peers (keep <=0.182.x)`,
    );
  }
}

// ── 4. .npmrc ──────────────────────────────────────────────────
if (exists(".npmrc")) {
  const npmrc = read(".npmrc");
  if (!/legacy-peer-deps\s*=\s*true/.test(npmrc)) {
    fail.push(".npmrc should set legacy-peer-deps=true for the multi-engine graph");
  }
}

// ── 5. Node version file ───────────────────────────────────────
if (exists(".node-version")) {
  const nv = read(".node-version").trim();
  if (!nv.startsWith("22")) {
    warn.push(`.node-version is "${nv}", expected 22.x`);
  }
}

// ── Report ─────────────────────────────────────────────────────
for (const w of warn) console.warn(`warn: ${w}`);
if (fail.length) {
  console.error("ci-verify FAILED:");
  for (const f of fail) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`ci-verify OK (${requiredFiles.length} files, exports checked)`);
process.exit(0);
