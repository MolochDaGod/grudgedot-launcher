# grudgeDot — Grudge Studio Launcher
> Games, crafting, AI agents, CNFT character ownership, and dev tools for the Grudge Warlords universe, wrapped in a single launcher.
## Overview
grudgeDot is the full-stack web launcher for Grudge Studio. It hosts multiple games and creator tools on top of a shared **universal hero system** — the same 8 WCS attributes (Strength, Vitality, Endurance, Intellect, Wisdom, Dexterity, Agility, Tactics), tier gear (T0–T5), professions, and crafting — so a character created once lives across every Grudge Warlords title.
Characters and home islands are owned on-chain as **Solana cNFTs via Crossmint**. The canonical character creation flow lives in [Grudge Builder](https://github.com/MolochDaGod/Grudge-Builder); any Grudge game (Gruda Wars, Warlord Crafting Suite, grudgeDot, etc.) reads a player's cNFT to load their hero.
**Auth**: Optional/progressive. If a Grudge ID JWT is present (via URL `?token=`, `#token=`, or localStorage) it is captured and validated silently. The launcher is fully accessible without being signed in.  
**Production**: Railway (Docker) — [railway.app](https://railway.app) via `grudge-studio` service deployment.  
**Discord**: [discord.gg/FtGtmxmwkh](https://discord.gg/FtGtmxmwkh)
## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI, React Query
- **Backend**: Node.js, Express, TypeScript — VPS game API at `api.grudge-studio.com` (Coolify/Docker + Traefik)
- **Database**: PostgreSQL via Drizzle ORM
- **Auth**: Optional/progressive token-based auth; JWT captured from URL params or localStorage
- **Deployment**: Railway (Docker, primary) + Vercel (static/serverless)
- **Storage**: Cloudflare R2 via `objectstore.grudge-studio.com` Cloudflare Worker proxy
- **Real-time**: Socket.IO / Colyseus (development mode)
## Quick Start
```bash
git clone https://github.com/MolochDaGod/grudgeDot.git
cd grudgeDot
npm install
cp .env.example .env   # Fill in DATABASE_URL, SESSION_SECRET, etc.
npm run dev             # Starts Express + Vite dev server
```
The app runs at `http://localhost:5000` by default. The launcher is publicly accessible — no login required to browse.
## Registered Games & Tools (Tabs)
All tabs are listed in `client/src/tabs.registry.json`. See [TABS_AND_APPS.md](docs/TABS_AND_APPS.md) for full details.
| Slug | Title | Description |
|------|-------|-------------|
| `grudge-swarm` | Grudge Swarm RTS | Top-down RTS with faction-based AI swarm battles |
| `mmo` | MMO World | Phaser 3 MMO with shared WCS heroes, souls-like indicators, crafting/professions |
| `grudge-drive` | Grudge Drive | Asset management and sprite deployment tool |
**Platform Pages:**
| Path | Title | Description |
|------|-------|-------------|
| `/connections` | Connections | Live backend health probes, account/wallet tools, AI launchers |
## Shared Hero System & CNFT Ownership
All games draw from the same hero identity:
- **WCS Attributes**: 8 core stats defined in `shared/grudachain.ts`
- **Hero Roster**: 4 Gruda Wars heroes (Thane, Lyra, Kael, Mira) in `shared/grudaWarsHeroes.ts`
- **Tier Gear**: T0–T5 equipment system with class restrictions
- **CNFT Ownership** (Crossmint on Solana):
  - Character collection: `a9bb2c8d-1350-4413-aec7-5ba1f6888511`
  - Home Island collection: `18d0e641-8713-4d5b-9a1d-ba67c516a3ce`
  - Parent collection: `5061318d-ff65-4893-ac4b-9b28efb18ace`
- **Character Creation**: Originates from [Grudge Builder](https://github.com/MolochDaGod/Grudge-Builder) — generates avatar, mints cNFT with WCS stats as on-chain metadata
- **Cross-game**: Any Grudge game reads the player's cNFT to load their hero, stats, and gear
## Project Structure
```
grudgeDot/
├── apps/                 # Per-tab packaging & metadata
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # UI components (Radix-based)
│   │   │   └── AuthGuard.tsx  # Gates the app on a valid Grudge ID JWT
│   │   ├── lib/          # auth.ts (SSO token handling), mmo-systems.ts, ...
│   │   ├── pages/        # App pages (mmo-world, grudge-box, crypt-crawlers, etc.)
│   │   └── tabs.registry.json  # All registered game tabs
│   └── index.html        # Vite entry point
├── server/               # Express backend
│   ├── routes.ts         # All API routes
│   ├── grudgeAuth.ts     # Token verify/user/logout proxies to id.grudge-studio.com
│   ├── index.ts          # Dev server entry (Vite middleware)
│   ├── middleware/        # grudgeJwt.ts (JWT verification)
│   └── services/         # grudaLegion.ts, etc.
├── shared/               # Shared types and schemas
├── docs/                 # Project documentation
├── vite.config.ts        # Vite build config
└── package.json
```
## Authentication
grudgeDot uses **optional/progressive token-based auth**. The launcher is publicly accessible without a login — auth unlocks per-user features (characters, wallet, cloud saves).

**How tokens arrive:**
- **grudge-studio launcher** — appends `?token=<jwt>` (or `#token=<jwt>`) to the URL when opening grudgeDot; `captureAuthCallback()` reads it and persists to `localStorage`.
- **SSO hand-off** — clicking "Sign In" links to `id.grudge-studio.com` which returns via `#token=…` or `?sso_token=…`.
- **Returning session** — `getAuthData()` reads `localStorage.grudge_auth_token` and validates the JWT hasn't expired.

**Validation:** `AuthGuard` background-verifies against `/api/auth/verify`. On failure it clears localStorage and emits `grudge:auth:expired` — **no hard redirect**. UI components listen for this event to show a sign-in prompt inline.

See [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) for full details.
## Available Scripts
```bash
npm run dev          # Start dev server (Express + Vite HMR)
npm run build        # Production build (Vite)
npm run start        # Start production server
npm run check        # TypeScript type checking
npm run db:push      # Push Drizzle schema changes to database
```
## Environment Variables
```env
DATABASE_URL=postgresql://...                  # Grudge VPS PostgreSQL connection string
SESSION_SECRET=your-secret                     # JWT signing secret (shared with id.grudge-studio.com)
GRUDGE_AUTH_URL=https://id.grudge-studio.com   # SSO origin (proxied by grudgeAuth.ts)
GRUDGE_BACKEND_URL=https://api.grudge-studio.com
GRUDGEDOT_BACKEND_PREFIX=/api/gdevelop         # Upstream path prefix on the VPS; flip to /api/grudgedot after VPS rename
```
See [.env.example](.env.example) for the full list.
## Deployment

### Railway (primary — grudge-studio production)

GrudgeDot runs as a single Docker container on Railway. The `railway.toml` at the project root configures the build and healthcheck.

```bash
# First-time setup
npm install -g @railway/cli
railway login
railway link   # link to your grudge-studio Railway project

# Deploy
railway up     # builds & deploys the Docker image
railway domain # assign grudgedot.com as the custom domain
```

Set all required env vars in the Railway dashboard (or `railway variables set KEY=VALUE`). See `railway.toml` for the full list of required vars. The container listens on `$PORT` (injected by Railway) and the health endpoint is `/api/health`.

### Cloudflare Pages (static SPA)

The Vite client builds to `dist/public/` and is published to the Cloudflare Pages project `grudgedot` by `.github/workflows/pages-deploy.yml` on every push to `main`. There is no Vercel deployment for this repo — the legacy `gdevelop-assistant` Vercel project has been retired.

```bash
npm run build      # produces dist/public/
# CI then runs cloudflare/pages-action against project=grudgedot
```

> **Note**: All runtime API routes are handled by `server/routes.ts` against the Railway / VPS container. Static-only deploys (Cloudflare Pages) proxy `/api/*` to `api.grudge-studio.com` via the client's fetch calls. See [docs/BACKEND_CONNECTION_GUIDE.md](docs/BACKEND_CONNECTION_GUIDE.md).

After any deploy, verify backend connectivity at `/connections`.
## Warlord Suite (Native Pages)
The Warlord Suite tabs at `/warlord-suite/:page` are fully native React pages using **canonical WCS data** from `shared/wcs/` and **WCS fantasy MMO styling**.
- **Skill Tree** (`/warlord-suite/skill-tree`) — 4 classes (warrior/mage/ranger/worge), 6 tiers each, pick-one-per-tier.
- **Arsenal** (`/warlord-suite/arsenal`) — 144 equipment items (cloth/leather/metal).
- **Crafting** (`/warlord-suite/crafting`) — Backend-synced recipe browser + crafting queue, 10 canonical professions.
- **Weapon Skills** (`/warlord-suite/weapon-skills`) — 10 weapon skill trees, 4 slots each.
- **Character Builder** (`/warlord-suite/character-builder`) — Full WCS attribute allocator.
Source: `client/src/pages/warlord-suite/`
## Key Modules
- `client/src/lib/mmo-systems.ts` — Combat formulas, equipment tiers, crafting recipes, gathering professions (all built on WCS stats)
- `client/src/lib/mmo-indicators.ts` — Souls-like attack telegraph system for Phaser 3
- `shared/grudachain.ts` — Universal WCS hero attribute definitions and conversion functions
- `shared/grudaWarsHeroes.ts` — Hero roster with per-hero stats, abilities, and equipment IDs
## Backend Connection Architecture
See [docs/BACKEND_CONNECTION_GUIDE.md](docs/BACKEND_CONNECTION_GUIDE.md) for the **production-verified** backend proxy pattern.
## AI Systems
See [docs/AI_SYSTEMS_GUIDE.md](docs/AI_SYSTEMS_GUIDE.md) for the full AI architecture: AIWorker/Grok, GRUDA Legion, AI Agent Server, sprite pipeline, combat AI behavior trees, and best practices.
## Related Projects
- **[Grudge Builder](https://github.com/MolochDaGod/Grudge-Builder)** — Universal character creation + Crossmint cNFT minting
- **[ObjectStore](https://github.com/MolochDaGod/ObjectStore)** — Unified game data API
- **[Auth Gateway](https://github.com/MolochDaGod/Warlord-Crafting-Suite/tree/main/auth-gateway)** — Grudge ID SSO system
- **[Grudachain](https://github.com/MolochDaGod/grudachain)** — GRUDA Legion standalone AI system
- **[Warlord Crafting Suite](https://github.com/MolochDaGod/Warlord-Crafting-Suite)** — Main game platform
## Community
- **Discord**: [discord.gg/FtGtmxmwkh](https://discord.gg/FtGtmxmwkh)
- **Game**: [grudgewarlords.com](https://grudgewarlords.com)
- **Studio**: [grudge-studio.com](https://grudge-studio.com)
## Recent Changes
- **Rebrand** — project renamed `GDevelopAssistant` → `grudgeDot`
- **Auth consolidation** — in-app login removed; all auth delegated to `id.grudge-studio.com`
- **Configurable backend prefix** — `GRUDGEDOT_BACKEND_PREFIX` env var lets the launcher move off `/api/gdevelop/*` once the VPS is renamed
- **Discord invite** — all invite links updated to `discord.gg/FtGtmxmwkh`
- **GrudgeEmbed + GKO Boxing** — Phase 1 engine bridge integration
- **GBUX Economy API** — live price feed and on-chain tracker endpoints
## License
MIT
