/**
 * One-shot upgrade of client/public/portal.html:
 * - fixed canonical fleet links
 * - forge + deployments panels
 * - fleet ONE TRUTH copy (2026)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const portalPath = path.join(root, "client", "public", "portal.html");
let html = fs.readFileSync(portalPath, "utf8");

function replaceBetween(startMarker, endMarker, replacement) {
  const i = html.indexOf(startMarker);
  if (i < 0) throw new Error("start not found: " + startMarker.slice(0, 60));
  const j = html.indexOf(endMarker, i + startMarker.length);
  if (j < 0) throw new Error("end not found after: " + startMarker.slice(0, 60));
  html = html.slice(0, i) + replacement + html.slice(j);
}

// Title / og
html = html.replace(
  /<title>[\s\S]*?<\/title>/,
  "<title>Grudge Studio — Command Hub · Wallet · Accounts · Treaty · Forge</title>"
);
html = html.replace(
  /content="Canonical Grudge Studio hub:[\s\S]*?"/,
  'content="Canonical Grudge Studio hub (grudgeDot): accounts, wallet, Treaty, Forge editor, and fleet deployments. Railway Postgres SSOT."'
);

// Header + nav
replaceBetween(
  '<a class="logo" href="#">',
  "</nav>",
  `<a class="logo" href="/" onclick="goPanel('overview');return false;">GRUDGE STUDIO<span>// grudgeDot HUB · FORGE · FLEET</span></a>
    <nav>
      <button type="button" class="nav-btn active" data-panel="overview" onclick="goPanel('overview', this)">HOME</button>
      <button type="button" class="nav-btn" data-panel="account" onclick="goPanel('account', this)">ACCOUNTS</button>
      <button type="button" class="nav-btn" data-panel="wallet" onclick="goPanel('wallet', this)">WALLET</button>
      <button type="button" class="nav-btn" data-panel="treaty" onclick="goPanel('treaty', this)">TREATY</button>
      <button type="button" class="nav-btn" data-panel="forge" onclick="goPanel('forge', this)">FORGE</button>
      <button type="button" class="nav-btn" data-panel="apps" onclick="goPanel('apps', this)">APPS</button>
      <button type="button" class="nav-btn" data-panel="deployments" onclick="goPanel('deployments', this)">DEPLOY</button>
      <button type="button" class="nav-btn" data-panel="dns" onclick="goPanel('dns', this)">FLEET</button>
      <button type="button" class="nav-btn" data-panel="stack" onclick="goPanel('stack', this)">STACK</button>
      <button type="button" class="nav-btn" data-panel="ai" onclick="goPanel('ai', this)">AI</button>
    `
);
// restore closing nav (replaceBetween left endMarker out)
html = html.replace(
  `data-panel="ai" onclick="goPanel('ai', this)">AI</button>
    
    <div id="user-area">`,
  `data-panel="ai" onclick="goPanel('ai', this)">AI</button>
    </nav>
    <div id="user-area">`
);

// Fix if nav close broken differently
if (!html.includes('data-panel="ai"') || !html.includes("</nav>")) {
  console.warn("nav structure may need manual check");
}

html = html.replace(
  /onclick="switchPanel\('account', document\.querySelector\('\.nav-btn:nth-child\(2\)'\)\)"/g,
  `onclick="goPanel('account')"`
);

// Hero
replaceBetween(
  '<div class="hero-banner">',
  '<div class="stats-row">',
  `<div class="hero-banner">
        <div class="hero-text">
          <h2>Grudge Studio Command Hub</h2>
          <p><strong>grudge.studio</strong> is the canonical hub — grudgeDot launcher merged here for deploy.
          Accounts · Wallet · Treaty · <strong>Forge</strong> · fleet games.
          One truth: Railway Postgres characters/account · ObjectStore definitions · R2 assets.</p>
          <div class="hero-actions">
            <a class="hero-cta" href="https://grudgewarlords.com" target="_blank" rel="noopener">WARLORDS LIVE</a>
            <a class="hero-cta secondary" href="https://forge.grudge-studio.com?from=grudge.studio" target="_blank" rel="noopener">OPEN FORGE</a>
            <a class="hero-cta secondary" href="javascript:void(0)" onclick="goPanel('wallet')">WALLET</a>
            <a class="hero-cta secondary" href="javascript:void(0)" onclick="goPanel('account')">ACCOUNT</a>
            <a class="hero-cta secondary" href="javascript:void(0)" onclick="goPanel('treaty')">TREATY</a>
            <a class="hero-cta secondary" href="https://grudge-crafting.puter.site/?from=grudge.studio" target="_blank" rel="noopener">CRAFTING</a>
            <a class="hero-cta secondary" href="https://character.grudge-studio.com?era=warlords&amp;from=grudge.studio" target="_blank" rel="noopener">CHARACTERS</a>
            <a class="hero-cta secondary" href="javascript:void(0)" onclick="goPanel('deployments')">DEPLOYMENTS</a>
          </div>
        </div>
      </div>

      `
);

// Quick links
replaceBetween(
  '<div class="qlinks">',
  "<!-- ACCOUNT / GRUDGE ID -->",
  `<div class="qlinks">
        <a class="qlink" href="https://grudgewarlords.com" target="_blank" rel="noopener"><span class="qlink-icon">W</span>WARLORDS</a>
        <a class="qlink" href="https://forge.grudge-studio.com?from=grudge.studio" target="_blank" rel="noopener"><span class="qlink-icon">F</span>FORGE</a>
        <a class="qlink" href="javascript:void(0)" onclick="goPanel('wallet')"><span class="qlink-icon">$</span>WALLET</a>
        <a class="qlink" href="javascript:void(0)" onclick="goPanel('account')"><span class="qlink-icon">A</span>ACCOUNT</a>
        <a class="qlink" href="javascript:void(0)" onclick="goPanel('treaty')"><span class="qlink-icon">T</span>TREATY</a>
        <a class="qlink" href="https://grudge-crafting.puter.site/?from=grudge.studio" target="_blank" rel="noopener"><span class="qlink-icon">C</span>CRAFTING</a>
        <a class="qlink" href="https://character.grudge-studio.com?era=warlords&amp;from=grudge.studio" target="_blank" rel="noopener"><span class="qlink-icon">G</span>GCS</a>
        <a class="qlink" id="qlink-id" href="https://id.grudge-studio.com/login" target="_blank" rel="noopener"><span class="qlink-icon">ID</span>GRUDGE ID</a>
        <a class="qlink" href="https://client.grudge-studio.com" target="_blank" rel="noopener"><span class="qlink-icon">CL</span>CLIENT</a>
        <a class="qlink" href="https://fleet.grudge-studio.com" target="_blank" rel="noopener"><span class="qlink-icon">MAP</span>FLEET MAP</a>
        <a class="qlink" href="https://objectstore.grudge-studio.com/api/v1/master-recipes.json" target="_blank" rel="noopener"><span class="qlink-icon">OS</span>OBJECTSTORE</a>
        <a class="qlink" href="https://assets.grudge-studio.com" target="_blank" rel="noopener"><span class="qlink-icon">R2</span>ASSETS CDN</a>
        <a class="qlink" href="https://browse.grudge-studio.com" target="_blank" rel="noopener"><span class="qlink-icon">BR</span>BROWSE</a>
        <a class="qlink" href="https://ui.grudge-studio.com" target="_blank" rel="noopener"><span class="qlink-icon">UI</span>UI EDITOR</a>
        <a class="qlink" href="https://grudox.grudge-studio.com" target="_blank" rel="noopener"><span class="qlink-icon">GX</span>GRUDOX</a>
        <a class="qlink" href="https://gameopen.vercel.app" target="_blank" rel="noopener"><span class="qlink-icon">GO</span>GAMEOPEN</a>
      </div>
    </div>

    `
);

// Wallet war chest link - use goPanel not broken /app if not signed in is ok for war chest
html = html.replace(
  'href="/app/wallet"',
  'href="https://forge.grudge-studio.com?from=hub-wallet" style="display:none" data-hide="1"'
);
// restore a better wallet app link
html = html.replace(
  /<a class="hero-cta secondary" href="https:\/\/forge\.grudge-studio\.com\?from=hub-wallet"[\s\S]*?>Full War Chest app<\/a>/,
  `<a class="hero-cta secondary" href="/app/wallet" style="text-decoration:none">Full War Chest (/app)</a>
            <a class="hero-cta secondary" href="https://grudgewarlords.com/wallet" target="_blank" rel="noopener" style="text-decoration:none">Warlords wallet</a>`
);

// Insert FORGE panel before APPS PANEL
const forgePanel = `
    <!-- FORGE PANEL -->
    <div class="panel" id="panel-forge">
      <div class="sh"><div class="sh-title">FORGE · STUDIO EDITOR</div><div class="sh-line"></div><div class="sh-badge">forge.grudge-studio.com</div></div>
      <p style="font-size:13px;color:rgba(201,168,76,0.5);margin:-4px 0 18px;line-height:1.5">
        Canonical 3D scene / map / effects editor. Loads ObjectStore definitions + R2 assets.
        Open Forge with SSO-friendly return to this hub via <code style="color:var(--gold)">?from=grudge.studio</code>.
      </p>
      <div class="hero-actions" style="margin-bottom:20px;flex-wrap:wrap">
        <a class="hero-cta" href="https://forge.grudge-studio.com?from=grudge.studio" target="_blank" rel="noopener">LAUNCH FORGE</a>
        <a class="hero-cta secondary" href="https://forge.grudge-studio.com?from=grudge.studio&amp;mode=scene" target="_blank" rel="noopener">SCENE MODE</a>
        <a class="hero-cta secondary" href="https://forge.grudge-studio.com?from=grudge.studio&amp;mode=map" target="_blank" rel="noopener">MAP MODE</a>
        <a class="hero-cta secondary" href="https://forge.grudge-studio.com?from=grudge.studio&amp;mode=effects" target="_blank" rel="noopener">EFFECTS</a>
        <a class="hero-cta secondary" href="https://objectstore.grudge-studio.com/" target="_blank" rel="noopener">OBJECTSTORE</a>
        <a class="hero-cta secondary" href="https://assets.grudge-studio.com" target="_blank" rel="noopener">ASSETS CDN</a>
        <a class="hero-cta secondary" href="https://browse.grudge-studio.com" target="_blank" rel="noopener">BROWSE MESHES</a>
      </div>
      <div class="account-grid">
        <div class="account-card">
          <div class="sh" style="margin-bottom:12px"><div class="sh-title">FORGE CONNECTS TO</div><div class="sh-line"></div></div>
          <div style="font-size:13px;line-height:1.7;color:rgba(201,168,76,0.7)">
            <div><span style="color:var(--gold)">Auth</span> — id.grudge-studio.com (Grudge ID JWT)</div>
            <div><span style="color:var(--gold)">Player state</span> — Railway /api/characters · /api/account</div>
            <div><span style="color:var(--gold)">Definitions</span> — objectstore.grudge-studio.com/api/v1/*.json</div>
            <div><span style="color:var(--gold)">Binaries</span> — assets.grudge-studio.com (R2)</div>
            <div><span style="color:var(--gold)">Hub return</span> — grudge.studio (this page)</div>
          </div>
        </div>
        <div class="account-card">
          <div class="sh" style="margin-bottom:12px"><div class="sh-title">RELATED STUDIO TOOLS</div><div class="sh-line"></div></div>
          <div class="qlinks" style="margin:0">
            <a class="qlink" href="https://character.grudge-studio.com?era=warlords" target="_blank" rel="noopener"><span class="qlink-icon">G</span>GCS</a>
            <a class="qlink" href="https://ui.grudge-studio.com" target="_blank" rel="noopener"><span class="qlink-icon">UI</span>UI EDITOR</a>
            <a class="qlink" href="https://client.grudge-studio.com" target="_blank" rel="noopener"><span class="qlink-icon">CL</span>CLIENT</a>
            <a class="qlink" href="https://grudge-studio-editor.vercel.app" target="_blank" rel="noopener"><span class="qlink-icon">ME</span>MAP EDITOR</a>
            <a class="qlink" href="/app" target="_blank" rel="noopener"><span class="qlink-icon">DOT</span>grudgeDot APP</a>
          </div>
        </div>
      </div>
    </div>

`;

if (!html.includes('id="panel-forge"')) {
  html = html.replace("<!-- APPS PANEL -->", forgePanel + "    <!-- APPS PANEL -->");
}

// Deployments panel markup
replaceBetween(
  '<!-- DEPLOYMENTS -->',
  "<!-- FLEET TRUTH / OPS -->",
  `<!-- DEPLOYMENTS -->
    <div class="panel" id="panel-deployments">
      <div class="sh"><div class="sh-title">LIVE DEPLOYMENTS</div><div class="sh-line"></div><div class="sh-badge">PRODUCTION FLEET + PUTER</div></div>
      <p style="font-size:13px;color:rgba(201,168,76,0.5);margin:-4px 0 14px;line-height:1.5">
        Canonical production origins (not Vercel deploy-hash URLs). Forge + games + studio tools first; Puter apps secondary.
      </p>
      <div class="filter-bar" id="deploy-filters">
        <button type="button" class="filter-tag active" data-deploy-tag="all" onclick="filterDeploys('all', this)">ALL</button>
        <button type="button" class="filter-tag" data-deploy-tag="core" onclick="filterDeploys('core', this)">CORE</button>
        <button type="button" class="filter-tag" data-deploy-tag="studio" onclick="filterDeploys('studio', this)">STUDIO</button>
        <button type="button" class="filter-tag" data-deploy-tag="games" onclick="filterDeploys('game', this)">GAMES</button>
        <button type="button" class="filter-tag" data-deploy-tag="data" onclick="filterDeploys('data', this)">DATA</button>
        <button type="button" class="filter-tag" data-deploy-tag="puter" onclick="filterDeploys('puter', this)">PUTER</button>
      </div>
      <div class="deploy-grid" id="deploy-grid"></div>
    </div>

    `
);

// Fleet truth panel rewrite
replaceBetween(
  '<!-- FLEET TRUTH / OPS -->',
  "<!-- TECH STACK & DEPENDENCIES -->",
  `<!-- FLEET TRUTH / OPS -->
    <div class="panel" id="panel-dns">
      <div class="sh"><div class="sh-title">FLEET ONE TRUTH</div><div class="sh-line"></div><div class="sh-badge">PRODUCTION 2026</div></div>

      <div class="dns-card">
        <h3>Production endpoints (do not invent parallel SSOT)</h3>
        <p style="font-size:13px;color:rgba(201,168,76,0.5);margin-bottom:14px">
          This hub (<code style="color:var(--gold)">grudge.studio</code>) same-origin <code>/api/*</code> rewrites to Railway + ID.
        </p>
        <table class="dns-table">
          <tr><th>ROLE</th><th>HOST</th><th>SSOT</th><th>NOTE</th></tr>
          <tr>
            <td>Hub (grudgeDot)</td>
            <td class="value">grudge.studio</td>
            <td>Portal</td>
            <td class="note">Accounts · wallet · Treaty · Forge entry · deploy map</td>
          </tr>
          <tr>
            <td>Auth</td>
            <td class="value">id.grudge-studio.com</td>
            <td>JWT / SSO</td>
            <td class="note">/login?redirect_uri= → Railway auth impl</td>
          </tr>
          <tr>
            <td>Game data</td>
            <td class="value">grudge-api-production-0d46.up.railway.app</td>
            <td>Postgres</td>
            <td class="note">characters · account bag · island · wallet · treaty</td>
          </tr>
          <tr>
            <td>Forge editor</td>
            <td class="value">forge.grudge-studio.com</td>
            <td>Studio</td>
            <td class="note">3D scene/map/effects · ObjectStore + R2</td>
          </tr>
          <tr>
            <td>Definitions</td>
            <td class="value">objectstore.grudge-studio.com/api/v1</td>
            <td>JSON</td>
            <td class="note">recipes, items, races — not player state</td>
          </tr>
          <tr>
            <td>Binaries</td>
            <td class="value">assets.grudge-studio.com</td>
            <td>R2</td>
            <td class="note">icons, GLB, audio, grudge-fleet.js</td>
          </tr>
          <tr>
            <td>AI</td>
            <td class="value">ai.grudge-studio.com</td>
            <td>Workers</td>
            <td class="note">+ Puter AI (user-pays)</td>
          </tr>
        </table>
      </div>

      <div class="dns-card">
        <h3>Retired / never use as player SSOT</h3>
        <table class="dns-table">
          <tr><th>BAD</th><th>WHY</th><th>USE INSTEAD</th></tr>
          <tr>
            <td class="value">api.grudge-studio.com</td>
            <td class="note">Split-brain — not Railway characters</td>
            <td class="value">same-origin /api/* → Railway</td>
          </tr>
          <tr>
            <td class="value">MySQL 8 on VPS</td>
            <td class="note">Legacy docs only</td>
            <td class="value">Railway Postgres</td>
          </tr>
          <tr>
            <td class="value">D1 for islands/chars</td>
            <td class="note">Asset registry only</td>
            <td class="value">Railway home_islands</td>
          </tr>
          <tr>
            <td class="value">Puter KV as sole truth</td>
            <td class="note">Cache only</td>
            <td class="value">Railway + optional KV mirror</td>
          </tr>
          <tr>
            <td class="value">*.vercel.app deploy hashes</td>
            <td class="note">Per-deploy instances</td>
            <td class="value">stable *.grudge-studio.com aliases</td>
          </tr>
        </table>
      </div>

      <div class="dns-card">
        <h3>Scope matrix (account vs character)</h3>
        <div class="code-block">
<span class="comment"># Account scope — shared bag across all characters</span>
GET  <span class="key">/api/account</span>
GET  <span class="key">/api/account/resources</span>
GET  <span class="key">/api/account/inventory</span>
GET  <span class="key">/api/wallet</span>
GET  <span class="key">/api/treaty/*</span>  <span class="comment"># friends · DMs · groups · servers</span>

<span class="comment"># Character scope — UUID primary key, profession XP, equipment</span>
GET  <span class="key">/api/characters?era=warlords</span>
GET  <span class="key">/api/characters/:id</span>
POST <span class="key">/api/characters/:id/progress</span>  <span class="comment"># expectedRevision</span>

<span class="comment"># Auth handoff from id.grudge-studio.com</span>
?grudge_token=… → POST <span class="key">/api/auth/grudge-bridge</span> { token, audience }
?sso_token=… or ?token=… → store as grudge_auth_token
        </div>
      </div>

      <div class="dns-card">
        <h3>Live product links</h3>
        <div class="code-block">
<span class="key">Hub</span>          <span class="val">https://grudge.studio</span>
<span class="key">Warlords</span>     <span class="val">https://grudgewarlords.com</span>
<span class="key">Forge</span>        <span class="val">https://forge.grudge-studio.com</span>
<span class="key">Crafting</span>     <span class="val">https://grudge-crafting.puter.site</span>
<span class="key">GCS</span>          <span class="val">https://character.grudge-studio.com</span>
<span class="key">Client</span>       <span class="val">https://client.grudge-studio.com</span>
<span class="key">Fleet map</span>    <span class="val">https://fleet.grudge-studio.com</span>
<span class="key">GRUDOX</span>       <span class="val">https://grudox.grudge-studio.com</span>
<span class="key">GameOpen</span>     <span class="val">https://gameopen.vercel.app</span>

<span class="comment"># Probe health</span>
curl <span class="val">https://grudge.studio/api/health</span>
curl <span class="val">https://grudge-api-production-0d46.up.railway.app/api/health</span>
        </div>
      </div>

      <div class="dns-card">
        <h3>Deploy this hub (grudgeDot → grudge.studio)</h3>
        <div class="code-block">
<span class="comment"># Repo: MolochDaGod/grudgedot-launcher</span>
<span class="comment"># Vercel project: grudgedot-launcher (team grudgenexus)</span>
<span class="comment"># Production aliases: grudge.studio · www.grudge.studio · dev.grudge-studio.com</span>

npm run vercel-build   <span class="comment"># vite build + promote portal → index.html</span>
vercel deploy --prod --scope grudgenexus

<span class="comment"># SPA (React grudgeDot) remains at /app → app.html</span>
<span class="comment"># Forge stays external: forge.grudge-studio.com</span>
        </div>
      </div>
    </div>

    `
);

// Stack: update VPS badge + launcher row
html = html.replace(
  '<div class="sh"><div class="sh-title">TECH STACK & DEPENDENCIES</div><div class="sh-line"></div><div class="sh-badge">VPS 74.208.155.229</div></div>',
  '<div class="sh"><div class="sh-title">TECH STACK & DEPENDENCIES</div><div class="sh-line"></div><div class="sh-badge">RAILWAY · VERCEL · CF</div></div>'
);
html = html.replace(
  "<tr><td>Launcher</td><td class=\"value\">Vercel</td><td>—</td><td class=\"value\">launcher.grudge-studio.com</td></tr>",
  "<tr><td>Command Hub</td><td class=\"value\">Vercel</td><td>—</td><td class=\"value\">grudge.studio (grudgeDot)</td></tr>\n          <tr><td>Forge</td><td class=\"value\">Vercel</td><td>—</td><td class=\"value\">forge.grudge-studio.com</td></tr>"
);

// ObjectStore GitHub Pages → production
html = html.replace(
  'href="https://molochdagod.github.io/ObjectStore"',
  'href="https://objectstore.grudge-studio.com/"'
);

// FLEET constant
const fleetJs = `const FLEET = {
  hub: 'https://grudge.studio',
  auth: 'https://id.grudge-studio.com',
  gameData: 'https://grudge-api-production-0d46.up.railway.app',
  assets: 'https://assets.grudge-studio.com',
  objectStore: 'https://objectstore.grudge-studio.com/api/v1',
  objectStoreHome: 'https://objectstore.grudge-studio.com/',
  ai: 'https://ai.grudge-studio.com',
  warlords: 'https://grudgewarlords.com',
  crafting: 'https://grudge-crafting.puter.site',
  characters: 'https://character.grudge-studio.com',
  forge: 'https://forge.grudge-studio.com',
  fleetMap: 'https://fleet.grudge-studio.com',
  client: 'https://client.grudge-studio.com',
  browse: 'https://browse.grudge-studio.com',
  ui: 'https://ui.grudge-studio.com',
  grudox: 'https://grudox.grudge-studio.com',
  gameopen: 'https://gameopen.vercel.app',
  carrier: 'https://carrier.grudge-studio.com',
  grudge6: 'https://grudge6.grudge-studio.com/game',
  water: 'https://water.grudge-studio.com',
  drive: 'https://drive.grudge-studio.com',
  arena: 'https://grudge-arena.grudge-studio.com',
  survival: 'https://survival.grudge-studio.com',
  dcq: 'https://dcq.grudge-studio.com',
  studioEditor: 'https://grudge-studio-editor.vercel.app',
  engineGallery: 'https://grudge-engine-psi.vercel.app',
  identityPortal: 'https://grudge-studio.com',
};
`;
html = html.replace(
  /const FLEET = \{[\s\S]*?\};/,
  fleetJs.trim() + "\n"
);

// SERVICES
const servicesJs = `const SERVICES = [
  { id:'warlords',   icon:'\\u2694', title:'Grudge Warlords', desc:'Main game — islands, combat, professions. Railway character SSOT.', path:FLEET.warlords, badge:'LIVE', tag:'game' },
  { id:'forge',      icon:'\\u2699', title:'Studio Forge', desc:'3D scene / map / effects editor. ObjectStore + R2 assets.', path:FLEET.forge + '?from=grudge.studio', badge:'EDITOR', tag:'studio' },
  { id:'characters', icon:'\\uD83C\\uDFA8', title:'Character Studio', desc:'Create/edit heroes (GCS). Saves to Railway /api/characters.', path:FLEET.characters + '?era=warlords&from=grudge.studio', badge:'GCS', tag:'studio' },
  { id:'crafting',   icon:'\\u2692', title:'Crafting Suite', desc:'Shared account bag + per-character XP. Puter UI → Railway.', path:FLEET.crafting + '/?from=grudge.studio', badge:'CRAFT', tag:'game' },
  { id:'id',         icon:'\\uD83D\\uDD11', title:'Grudge ID', desc:'Unified auth — login, SSO, Puter bridge.', path:FLEET.auth + '/login?redirect_uri=' + encodeURIComponent(CLIENT_URL + '/'), badge:'AUTH', tag:'core' },
  { id:'account',    icon:'\\uD83D\\uDC64', title:'Accounts', desc:'Grudge ID profile, linked providers, settings.', path:'#panel:account', badge:'ID', tag:'core' },
  { id:'wallet',     icon:'\\uD83D\\uDCB0', title:'Wallet / War Chest', desc:'Solana · Crossmint · GBUX (Railway /api/wallet).', path:'#panel:wallet', badge:'WEB3', tag:'core' },
  { id:'treaty',     icon:'\\uD83D\\uDCAC', title:'Treaty', desc:'Account friends, DMs, groups, fleet server chat.', path:'#panel:treaty', badge:'SOCIAL', tag:'core' },
  { id:'client',     icon:'\\uD83D\\uDDA5', title:'Client', desc:'Fleet client shell (client.grudge-studio.com).', path:FLEET.client, badge:'CLIENT', tag:'studio' },
  { id:'grudox',     icon:'\\uD83C\\uDFAE', title:'GRUDOX', desc:'Arcade / studio hub on grudox.grudge-studio.com.', path:FLEET.grudox, badge:'HUB', tag:'game' },
  { id:'gameopen',   icon:'\\u26A1', title:'GameOpen', desc:'Open combat/studio platform (SSO).', path:FLEET.gameopen, badge:'OPEN', tag:'game' },
  { id:'fleet',      icon:'\\uD83D\\uDDFA', title:'Fleet Map', desc:'Live topology — Workers, Railway, R2, Vercel.', path:FLEET.fleetMap, badge:'OPS', tag:'data' },
  { id:'objectstore',icon:'\\uD83D\\uDDC4', title:'ObjectStore', desc:'Definitions JSON — recipes, items, races.', path:FLEET.objectStore + '/master-recipes.json', badge:'DATA', tag:'data' },
  { id:'assets',     icon:'\\uD83D\\uDDBC', title:'Assets CDN', desc:'R2 binaries — icons, GLB, audio.', path:FLEET.assets, badge:'CDN', tag:'data' },
  { id:'browse',     icon:'\\uD83D\\uDD0D', title:'Browse', desc:'Mesh / equipment browser (browse.grudge-studio.com).', path:FLEET.browse, badge:'MESH', tag:'studio' },
  { id:'ai',         icon:'\\u2728', title:'AI Gateway', desc:'ai.grudge-studio.com + Puter AI console.', path:FLEET.ai, badge:'AI', tag:'data' },
];
`;
html = html.replace(/const SERVICES = \[[\s\S]*?\];/, servicesJs.trim() + "\n");

// DEPLOYS + render + goPanel + filterDeploys — replace old DEPLOYS block through render
const deploysBlock = `
// ===== DEPLOYMENTS (production fleet first, Puter secondary) =====
const PRODUCTION_DEPLOYS = [
  { name: 'grudge.studio (this hub)', url: 'https://grudge.studio', tag: 'core', badge: 'HUB' },
  { name: 'id.grudge-studio.com', url: 'https://id.grudge-studio.com/login', tag: 'core', badge: 'AUTH' },
  { name: 'forge.grudge-studio.com', url: 'https://forge.grudge-studio.com?from=grudge.studio', tag: 'studio', badge: 'FORGE' },
  { name: 'grudgewarlords.com', url: 'https://grudgewarlords.com', tag: 'game', badge: 'LIVE' },
  { name: 'character.grudge-studio.com', url: 'https://character.grudge-studio.com?era=warlords', tag: 'studio', badge: 'GCS' },
  { name: 'client.grudge-studio.com', url: 'https://client.grudge-studio.com', tag: 'studio', badge: 'CLIENT' },
  { name: 'grudge-crafting.puter.site', url: 'https://grudge-crafting.puter.site/', tag: 'game', badge: 'CRAFT' },
  { name: 'fleet.grudge-studio.com', url: 'https://fleet.grudge-studio.com', tag: 'data', badge: 'MAP' },
  { name: 'objectstore.grudge-studio.com', url: 'https://objectstore.grudge-studio.com/', tag: 'data', badge: 'JSON' },
  { name: 'assets.grudge-studio.com', url: 'https://assets.grudge-studio.com', tag: 'data', badge: 'R2' },
  { name: 'browse.grudge-studio.com', url: 'https://browse.grudge-studio.com', tag: 'studio', badge: 'MESH' },
  { name: 'ui.grudge-studio.com', url: 'https://ui.grudge-studio.com', tag: 'studio', badge: 'UI' },
  { name: 'grudox.grudge-studio.com', url: 'https://grudox.grudge-studio.com', tag: 'game', badge: 'GX' },
  { name: 'gameopen.vercel.app', url: 'https://gameopen.vercel.app', tag: 'game', badge: 'OPEN' },
  { name: 'carrier.grudge-studio.com', url: 'https://carrier.grudge-studio.com', tag: 'game', badge: 'PVP' },
  { name: 'water.grudge-studio.com', url: 'https://water.grudge-studio.com', tag: 'game', badge: 'TI' },
  { name: 'drive.grudge-studio.com', url: 'https://drive.grudge-studio.com', tag: 'game', badge: 'DRIVE' },
  { name: 'grudge-arena.grudge-studio.com', url: 'https://grudge-arena.grudge-studio.com', tag: 'game', badge: 'ARENA' },
  { name: 'survival.grudge-studio.com', url: 'https://survival.grudge-studio.com', tag: 'game', badge: 'SURV' },
  { name: 'dcq.grudge-studio.com', url: 'https://dcq.grudge-studio.com', tag: 'game', badge: 'DCQ' },
  { name: 'grudge6.grudge-studio.com', url: 'https://grudge6.grudge-studio.com/game', tag: 'game', badge: 'G6' },
  { name: 'ai.grudge-studio.com', url: 'https://ai.grudge-studio.com', tag: 'data', badge: 'AI' },
  { name: 'dev.grudge-studio.com', url: 'https://dev.grudge-studio.com', tag: 'core', badge: 'DEV' },
  { name: 'grudge-studio.com (portal)', url: 'https://grudge-studio.com', tag: 'core', badge: 'PORTAL' },
  { name: 'grudgeDot /app SPA', url: '/app', tag: 'core', badge: 'APP' },
];

const PUTER_DEPLOYS = [
  'grudgestudio.puter.site','grudge-crafting.puter.site','puter.com/app/warlords',
  'puter.com/app/grudge-angler','puter.com/app/grudge-launcher','puter.com/app/GrudgeStudio',
  'grudachain-command-center.puter.site','grudge-heros.puter.site','meta-build-jb36g.puter.site',
].map((d) => ({
  name: d,
  url: d.startsWith('puter.com') ? 'https://' + d : 'https://' + d,
  tag: 'puter',
  badge: 'PUTER',
}));

const ALL_DEPLOYS = PRODUCTION_DEPLOYS.concat(PUTER_DEPLOYS);
let deployTag = 'all';

function renderDeploys(list) {
  const grid = document.getElementById('deploy-grid');
  if (!grid) return;
  grid.innerHTML = list.map((d) => \`
    <a class="deploy-row" href="\${d.url}" target="_blank" rel="noopener" title="\${d.badge || ''}">
      <div class="deploy-dot"></div>
      <div class="deploy-name">\${d.name}</div>
      <div class="deploy-folder">\${d.badge || d.tag || ''}</div>
    </a>\`).join('');
}

function filterDeploys(tag, el) {
  deployTag = tag;
  document.querySelectorAll('#deploy-filters .filter-tag').forEach((t) => t.classList.remove('active'));
  if (el) el.classList.add('active');
  const list = tag === 'all' ? ALL_DEPLOYS : ALL_DEPLOYS.filter((d) => d.tag === tag);
  renderDeploys(list);
}

renderDeploys(ALL_DEPLOYS);

function goPanel(name, btn) {
  const el = btn || document.querySelector('.nav-btn[data-panel="' + name + '"]');
  switchPanel(name, el || null);
  try {
    if (['wallet','account','treaty','forge','deployments','apps','dns','stack','ai','overview'].includes(name)) {
      const u = new URL(location.href);
      if (name === 'overview') u.searchParams.delete('panel');
      else u.searchParams.set('panel', name);
      history.replaceState({}, '', u.pathname + (u.search || '') + (u.hash || ''));
    }
  } catch {}
}

// Wire Grudge ID quick link redirect_uri after CLIENT_URL is known
(function wireIdLink() {
  const a = document.getElementById('qlink-id');
  if (a) a.href = FLEET.auth + '/login?redirect_uri=' + encodeURIComponent(location.origin + '/');
})();
`;

// Remove old DEPLOYS const + immediate render
if (html.includes("const DEPLOYS = [")) {
  html = html.replace(
    /\/\/ ===== DEPLOYMENTS DATA =====[\s\S]*?document\.getElementById\('deploy-grid'\)\.innerHTML = DEPLOYS\.map[\s\S]*?\.join\(''\);/,
    deploysBlock.trim() + "\n"
  );
} else if (html.includes("const PRODUCTION_DEPLOYS")) {
  console.log("deploys already upgraded");
} else {
  // insert before AI console
  html = html.replace(
    /\/\/ ===== AI CONSOLE/,
    deploysBlock.trim() + "\n\n// ===== AI CONSOLE"
  );
}

// switchPanel: also handle forge
html = html.replace(
  "if (name === 'wallet') refreshWalletPanel();\n  if (name === 'treaty') initTreatyPanel();",
  "if (name === 'wallet') refreshWalletPanel();\n  if (name === 'treaty') initTreatyPanel();\n  if (name === 'deployments') filterDeploys(deployTag || 'all', document.querySelector('#deploy-filters .filter-tag.active'));"
);

// AI context
html = html.replace(
  /const AI_CONTEXT = `[\s\S]*?`;/,
  `const AI_CONTEXT = \`You are the Grudge Studio AI assistant for the canonical hub at grudge.studio (grudgeDot merged).
ONE TRUTH fleet (2026):
- Hub: https://grudge.studio — accounts, wallet, Treaty, Forge entry, deploy map
- Auth: id.grudge-studio.com /login?redirect_uri= → Railway auth
- Player SSOT: Railway Postgres grudge-api-production-0d46.up.railway.app — characters, account, islands, wallet, treaty
- NEVER MySQL or api.grudge-studio.com as character SSOT
- Forge: forge.grudge-studio.com (scene/map/effects) · ObjectStore + R2
- Definitions: objectstore.grudge-studio.com/api/v1/*.json
- Binaries: assets.grudge-studio.com
- Games: grudgewarlords.com, grudge-crafting.puter.site, character.grudge-studio.com, grudox, gameopen
- Inventory account-shared; profession XP per character UUID
Be concise, technical, and production-ready.\`;`
);

// AI shortcuts
html = html.replace(
  "aiPrompt('Explain Grudge fleet ONE TRUTH: id.grudge-studio.com auth and Railway Postgres characters')",
  "aiPrompt('Explain Grudge fleet ONE TRUTH for grudge.studio hub: auth, Railway, Forge, ObjectStore')"
);
html = html.replace(
  "aiPrompt('How does launcher.grudge-studio.com proxy /api/characters to Railway?')",
  "aiPrompt('How does grudge.studio proxy /api/characters and /api/treaty to Railway?')"
);

// deep link include forge + deployments
html = html.replace(
  "['wallet', 'account', 'treaty', 'apps', 'overview']",
  "['wallet', 'account', 'treaty', 'forge', 'deployments', 'apps', 'dns', 'stack', 'ai', 'overview']"
);
html = html.replace(
  "path === '/treaty' ? 'treaty'\n      : path === '/apps' ? 'apps'\n      : null;",
  "path === '/treaty' ? 'treaty'\n      : path === '/forge' ? 'forge'\n      : path === '/deploy' || path === '/deployments' ? 'deployments'\n      : path === '/apps' ? 'apps'\n      : null;"
);

// Comments at top of script
html = html.replace(
  /\/\/ ===== GRUDGE STUDIO LAUNCHER[\s\S]*?\/\/ Never use api\.grudge-studio\.com[^\n]*/,
  `// ===== GRUDGE STUDIO HUB — grudgeDot merged (grudge.studio) =====
// Same-origin /api/* → Railway Postgres SSOT (characters, account, island, wallet, treaty)
// Auth → id.grudge-studio.com · Forge → forge.grudge-studio.com
// Never use api.grudge-studio.com or MySQL as player-state SSOT.`
);

fs.writeFileSync(portalPath, html);
console.log("upgraded", portalPath, "bytes", html.length);
console.log("has forge panel", html.includes('id="panel-forge"'));
console.log("has PRODUCTION_DEPLOYS", html.includes("PRODUCTION_DEPLOYS"));
console.log("has goPanel", html.includes("function goPanel"));
console.log("has grudge.studio hub row", html.includes("grudge.studio</td>") || html.includes("grudge.studio (this hub)"));
