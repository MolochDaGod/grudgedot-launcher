# GDevelop Assistant — Grudge Studio Multi-Game Platform

> Games, crafting, AI agents, CNFT character ownership, and dev tools for the Grudge Warlords universe.

## Overview

GDevelop Assistant (GGE) is a full-stack web platform hosting multiple games and tools for the Grudge Studio ecosystem. Every game shares a **universal hero system** — the same 8 WCS attributes (Strength, Vitality, Endurance, Intellect, Wisdom, Dexterity, Agility, Tactics), tier gear (T0–T5), professions, and crafting — so a character created once lives across all Grudge universe titles.

Characters and islands are owned on-chain as **Solana cNFTs via Crossmint**. The canonical character creation flow originates from [Grudge Builder](https://github.com/MolochDaGod/Grudge-Builder), which mints characters with their full WCS stats as NFT metadata. Any Grudge game (Gruda Wars, Warlord Crafting Suite, GDevelop, etc.) can read a player's cNFT to load their hero.

**Live**: [gdevelop-assistant.vercel.app](https://gdevelop-assistant.vercel.app)  
**Auth**: Auto-guest on first visit; full auth via [id.grudge-studio.com](https://id.grudge-studio.com) (Grudge ID SSO)

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Radix UI, React Query
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL via Drizzle ORM (`@neondatabase/serverless`)
- **Auth**: JWT via Grudge Auth Gateway (hub-and-spoke model)
- **Deployment**: Vercel (serverless API + static frontend)
- **Real-time**: Socket.IO (development mode)

## Quick Start

```bash
git clone https://github.com/MolochDaGod/GDevelopAssistant.git
cd GDevelopAssistant
npm install
cp .env.example .env   # Add DATABASE_URL, SESSION_SECRET, etc.
npm run dev             # Starts Express + Vite dev server
```

The app runs at `http://localhost:5000` by default.

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
GDevelopAssistant/
├── api/                  # Vercel serverless entry point
│   └── index.ts          # Express app for Vercel
├── apps/                 # Per-tab packaging & metadata
│   ├── mmo/              # MMO World tab config
│   └── grudge-drive/     # Grudge Drive tab config
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # UI components (Radix-based)
│   │   ├── lib/          # auth.ts, mmo-systems.ts, mmo-indicators.ts
│   │   ├── pages/        # App pages (mmo-world.tsx, etc.)
│   │   └── tabs.registry.json  # All registered game tabs
│   ├── public/           # Favicons, static assets
│   └── index.html        # Vite entry point
├── server/               # Express backend
│   ├── routes.ts         # All API routes
│   ├── index.ts          # Dev server entry (Vite middleware)
│   ├── serverUtils.ts    # log() and serveStatic() for serverless
│   ├── middleware/        # grudgeJwt.ts (JWT verification)
│   └── services/         # grudaLegion.ts, etc.
├── shared/               # Shared types and schemas
│   ├── schema.ts         # Drizzle ORM database schema
│   ├── grudachain.ts     # WCS hero attributes & conversion
│   └── grudaWarsHeroes.ts # Gruda Wars hero definitions
├── docs/                 # Project documentation
│   ├── AI_SYSTEMS_GUIDE.md  # AI architecture & best practices
│   └── TABS_AND_APPS.md     # Tab system guide
├── vercel.json           # Vercel deployment config
├── vite.config.ts        # Vite build config
├── drizzle.config.ts     # Drizzle ORM config
└── package.json
```

## Authentication

GGE uses the **Grudge Auth Gateway** (`id.grudge-studio.com`) for all authentication. See [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) for details.

Supported login methods:
- Username/password
- Puter.js SSO
- Guest accounts
- Auth gateway redirect

All methods produce a JWT stored as `grudge_auth_token` in localStorage.

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
DATABASE_URL=postgresql://...       # Grudge VPS PostgreSQL connection string
SESSION_SECRET=your-secret          # Express session secret
JWT_SECRET=your-jwt-secret          # JWT signing secret (shared with auth-gateway)
```

## Deployment

The Vite client builds to `dist/public/` and deploys to **Vercel** as static files. The Express backend runs in dev mode only (`npm run dev`) — it is not deployed to Vercel serverless.

Only `api/health.ts` is deployed as a Vercel serverless function. The SPA catch-all rewrite in `vercel.json` serves `index.html` for all non-API routes.

```bash
npm run build:vercel       # Build client
vercel --prod --yes        # Deploy to production
```

> **CRITICAL**: Both `server/routes.ts` (dev) and `server/vercelApp.ts` (Vercel) **must** call
> `setupGrudgeProxy(app)` or all `/api/grudge/*` backend calls will 404 on the deployed site.
> See [docs/BACKEND_CONNECTION_GUIDE.md](docs/BACKEND_CONNECTION_GUIDE.md) for the full architecture.

After deploying, verify backend connectivity by visiting `/connections` on the live URL.

## Warlord Suite (Native Pages)

The Warlord Suite tabs at `/warlord-suite/:page` are fully native React pages using **canonical WCS data** from `shared/wcs/` and **WCS fantasy MMO styling** (gold-bordered panels, dark fantasy theme, Cinzel Decorative/MedievalSharp fonts, skill node icons, gem-glow animations).

All pages connect to the Grudge backend via React Query hooks for live character/inventory/profession sync.

- **Skill Tree** (`/warlord-suite/skill-tree`) — 4 class skill trees (warrior/mage/ranger/worge), 6 tiers each, pick-one-per-tier with special abilities. Ornate-frame headers, class-colored gem-glow indicators.
- **Arsenal** (`/warlord-suite/arsenal`) — 144 equipment items (cloth/leather/metal), filterable by material/set/slot. Stone-panel item cards with stat breakdowns and tooltip lore.
- **Crafting** (`/warlord-suite/crafting`) — Backend-synced recipe browser + crafting queue, 10 canonical professions (5 gathering + 5 crafting) with XP progress. Parchment-panel recipes, gilded craft buttons.
- **Weapon Skills** (`/warlord-suite/weapon-skills`) — 10 weapon skill trees (SWORD/AXE/BOW/STAFF/DAGGER/MACE/HAMMER/SPEAR/WAND/SCYTHE), 4 slots each with upgrade paths showing damage/cooldown scaling. Skill icons from canonical data.
- **Class Skills** (`/warlord-suite/class-skill`) — Class overview with allowed weapons/armor from `classWeaponRestrictions.ts`, full skill tree preview, 8-attribute reference grid. Only 4 canonical classes.
- **Character Builder** (`/warlord-suite/character-builder`) — Full WCS attribute allocator (8 attrs, 18 secondary stats, diminishing returns), 4 races (orc/elf/human/undead), 4 classes, derived combat stats via `calculateStats()`. Ornate-frame attribute sliders with DR indicators.

Source: `client/src/pages/warlord-suite/`
## Key Modules

- `client/src/lib/mmo-systems.ts` — Combat formulas, equipment tiers, crafting recipes, gathering professions (all built on WCS stats)
- `client/src/lib/mmo-indicators.ts` — Souls-like attack telegraph system for Phaser 3 (6 indicator types, dodge windows)
- `shared/grudachain.ts` — Universal WCS hero attribute definitions and conversion functions
- `shared/grudaWarsHeroes.ts` — Hero roster with per-hero stats, abilities, and equipment IDs

## Backend Connection Architecture

See [docs/BACKEND_CONNECTION_GUIDE.md](docs/BACKEND_CONNECTION_GUIDE.md) for the **production-verified** backend proxy pattern:
- Service map (game, account, id, launcher APIs)
- Dual registration requirement (dev + Vercel entry points)
- Domain convention (`grudge-studio.com` with hyphen)
- CORS, OAuth redirect handling, health monitoring
- Checklist for adding backend connectivity to any new Grudge Studio app

## AI Systems

See [docs/AI_SYSTEMS_GUIDE.md](docs/AI_SYSTEMS_GUIDE.md) for the full AI architecture: AIWorker/Grok, GRUDA Legion, AI Agent Server, sprite pipeline, combat AI behavior trees, and best practices.

## Related Projects

- **[Grudge Builder](https://github.com/MolochDaGod/Grudge-Builder)** — Universal character creation + Crossmint cNFT minting
- **[Auth Gateway](https://github.com/MolochDaGod/Warlord-Crafting-Suite/tree/main/auth-gateway)** — Grudge ID SSO system
- **[Grudachain](https://github.com/MolochDaGod/grudachain)** — GRUDA Legion standalone AI system
- **[Warlord Crafting Suite](https://github.com/MolochDaGod/Warlord-Crafting-Suite)** — Main game platform

## License

MIT
