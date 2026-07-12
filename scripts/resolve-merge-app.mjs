import fs from "fs";
import path from "path";
import os from "os";

const temp = process.env.TEMP || os.tmpdir();
const ours = fs.readFileSync(path.join(temp, "App-ours.tsx"), "utf8");

let out = ours;

const mainImports = `
const CardForge = lazy(() => import("@/pages/card-forge"));
const ForgeEditor = lazy(() => import("@/pages/forge-editor"));
const GrudgeEngine = lazy(() => import("@/pages/grudge-engine"));
const GrudgeThreeEngine = lazy(() => import("@/pages/grudge-three-engine"));
const GrudgeFlatEngine = lazy(() => import("@/pages/grudge-flat-engine"));
const Shooter3D = lazy(() => import("@/pages/shooter-3d"));
const BabyGrudge = lazy(() => import("@/pages/babygrudge"));
const ArmadaSaga = lazy(() => import("@/tabs/armada-saga"));
const GrudgeCrafting = lazy(() => import("@/tabs/grudge-crafting"));
const GrudgeWarlordsRts = lazy(() => import("@/tabs/grudge-warlords-rts"));
const GrudgeDriveRedirect = lazy(() => import("@/pages/grudge-drive-redirect"));
`;

if (!out.includes("const CardForge")) {
  out = out.replace(
    'const SpriteCharEditor = lazy(() => import("@/pages/sprite-char-editor"));',
    'const SpriteCharEditor = lazy(() => import("@/pages/sprite-char-editor"));\n' +
      mainImports,
  );
}

out = out.replace(
  'const ReefHunt = lazy(() => import("@/tabs/reef-hunt/index"));',
  'const ReefHunt = lazy(() => import("@/tabs/reef-hunt"));',
);
out = out.replace(
  'const GrudgeFactory = lazy(() => import("@/tabs/grudge-factory/index"));',
  'const GrudgeFactory = lazy(() => import("@/tabs/grudge-factory"));',
);

// Prefer redirect wrapper for /grudge-drive when available
if (
  out.includes("const GrudgeDriveRedirect") &&
  out.includes('path="/grudge-drive" component={GrudgeDrive}')
) {
  out = out.replace(
    '<Route path="/grudge-drive" component={GrudgeDrive} />',
    '<Route path="/grudge-drive" component={GrudgeDriveRedirect} />',
  );
}

const mustHave = [
  ["/grudge-arena", "GrudgeArena"],
  ["/armada-saga", "ArmadaSaga"],
  ["/grudge-crafting", "GrudgeCrafting"],
  ["/grudge-warlords-rts", "GrudgeWarlordsRts"],
  ["/swarm-rts-enhanced", "GrudgeSwarm"],
  ["/card-forge", "CardForge"],
  ["/forge", "ForgeEditor"],
  ["/engine", "GrudgeEngine"],
  ["/three-engine", "GrudgeThreeEngine"],
  ["/flat-engine", "GrudgeFlatEngine"],
  ["/shooter-3d", "Shooter3D"],
  ["/babygrudge", "BabyGrudge"],
  ["/asset-library", "AssetLibrary"],
  ["/dungeon-crawler", "DungeonCrawler"],
  ["/sprite-editor", "SpriteCharEditor"],
  ["/reef-hunt", "ReefHunt"],
  ["/grudge-factory", "GrudgeFactory"],
];

for (const [p, comp] of mustHave) {
  if (!out.includes(`path="${p}"`)) {
    out = out.replace(
      "        <Route component={NotFound} />",
      `        <Route path="${p}" component={${comp}} />\n        <Route component={NotFound} />`,
    );
  }
}

const titleInserts = [
  '    if (location === "/card-forge") return "Card Forge";',
  '    if (location === "/forge" || location === "/engine" || location === "/three-engine") return "Studio Forge";',
  '    if (location === "/flat-engine") return "Grudge Flat Engine";',
  '    if (location === "/shooter-3d") return "Grudge Assault";',
  '    if (location === "/babygrudge") return "Studio Forge Hub";',
  '    if (location === "/armada-saga") return "Armada Saga";',
  '    if (location === "/grudge-crafting") return "Grudge Crafting";',
  '    if (location === "/grudge-warlords-rts") return "Grudge Warlords RTS";',
  '    if (location === "/grudge-arena") return "Grudge Arena";',
];

for (const t of titleInserts) {
  const key = t.split("return")[0].trim();
  if (!out.includes(key)) {
    out = out.replace(
      '    return "Grudge Brawl";',
      `${t}\n    return "Grudge Brawl";`,
    );
  }
}

const paths = [
  "/crown-clash",
  "/platformer",
  "/puzzle",
  "/runner",
  "/shooter",
  "/flight",
  "/realm",
  "/moba",
  "/arena",
  "/grudge-arena",
  "/grudge-drive",
  "/drift",
  "/decay",
  "/swarm-rts",
  "/swarm-rts-enhanced",
  "/swarm-galactic",
  "/grudge-swarm",
  "/gruda-wars",
  "/mmo",
  "/betta-warlords",
  "/grudge-box",
  "/crypt-crawlers",
  "/warlord-suite",
  "/nexus-nemesis",
  "/flat-engine",
  "/shooter-3d",
  "/armada-saga",
  "/reef-hunt",
  "/grudge-factory",
  "/grudge-crafting",
  "/grudge-warlords-rts",
  "/dungeon-crawler",
];
const arr = paths.map((p) => `"${p}"`).join(", ");
out = out.replace(
  /const isGamePage = \[[\s\S]*?\]\.some\(\s*path => location === path\s*\)/,
  `const isGamePage = [${arr}].some(\n    path => location === path || location.startsWith(\`\${path}/\`)`,
);

// Fix possible double paren issues from partial match
out = out.replace(
  /const isGamePage = \[([\s\S]*?)\]\.some\(\s*path => location === path \|\| location\.startsWith\(`\$\{path\}\/`\)\s*\)\s*\)/,
  `const isGamePage = [${arr}].some(\n    path => location === path || location.startsWith(\`\${path}/\`)`,
);

// Ensure closing paren for isGamePage if broken
if (!/const isGamePage[\s\S]*?\);\s*\n\s*return \(/.test(out)) {
  out = out.replace(
    /const isGamePage = \[([^\]]+)\]\.some\(\s*path => location === path \|\| location\.startsWith\(`\$\{path\}\/`\)\s*\n\s*\);?/,
    `const isGamePage = [${arr}].some(\n    path => location === path || location.startsWith(\`\${path}/\`),\n  );`,
  );
}

fs.writeFileSync("client/src/App.tsx", out);
const markers = (out.match(/<<<<<<</g) || []).length;
console.log("Wrote client/src/App.tsx");
console.log("conflict markers:", markers);
console.log("lines:", out.split("\n").length);
console.log("has CardForge:", out.includes("CardForge"));
console.log("has DungeonCrawler:", out.includes("DungeonCrawler"));
console.log("has ErrorBoundary:", out.includes("ErrorBoundary"));
