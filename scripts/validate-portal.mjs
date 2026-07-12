import fs from "node:fs";
const h = fs.readFileSync("client/public/portal.html", "utf8");
const checks = {
  navClose: h.includes("</nav>"),
  panelForge: h.includes('id="panel-forge"'),
  panelDeploy: h.includes('id="panel-deployments"'),
  goPanel: h.includes("function goPanel"),
  fleetForge: h.includes("forge: 'https://forge.grudge-studio.com'"),
  githubObjectStore: h.includes("molochdagod.github.io/ObjectStore"),
  userAreaAfterNav: /<\/nav>\s*<div id="user-area">/.test(h),
  renderDeploys: h.includes("renderDeploys"),
  oldDEPLOYS: (h.match(/const DEPLOYS\s*=/g) || []).length,
  forgeFromHub: h.includes("forge.grudge-studio.com?from=grudge.studio"),
  canonicalHubCopy: h.includes("grudge.studio</strong> is the canonical hub"),
  panels: (h.match(/id="panel-/g) || []).length,
};
console.log(JSON.stringify(checks, null, 2));
const i = h.indexOf('data-panel="ai"');
console.log("---nav tail---");
console.log(h.slice(i, i + 180));
