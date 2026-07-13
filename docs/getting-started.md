---
layout: default
title: Getting started
nav_order: 2
description: Install and run the grudgeDot launcher locally.
permalink: /getting-started/
---

# Getting started

## Prerequisites

- **Node.js** 20+ (see `.node-version` in the repo)
- **npm** (lockfile is committed)
- PostgreSQL connection string for full backend features (optional for UI-only work)

## Install

```bash
git clone https://github.com/MolochDaGod/grudgedot-launcher.git
cd grudgedot-launcher
npm install
cp .env.example .env
```

Minimum `.env` keys for local UI:

```env
SESSION_SECRET=dev-secret-change-me
GRUDGE_AUTH_URL=https://id.grudge-studio.com
GRUDGE_BACKEND_URL=https://api.grudge-studio.com
```

See [`.env.example`](https://github.com/MolochDaGod/grudgedot-launcher/blob/main/.env.example) for the full list (`DATABASE_URL`, ObjectStore, assets CDN, AI URLs, etc.).

## Run

```bash
npm run dev
```

- Opens Express + Vite HMR (default **http://localhost:5000**)
- Launcher is **public** — no login required to browse tabs
- Sign-in is progressive via [id.grudge-studio.com](https://id.grudge-studio.com)

## Useful scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Dev server (API + client) |
| `npm run build` / `npm run vercel-build` | Production client build → `dist/public` |
| `npm run check` | TypeScript check |
| `npm run db:push` | Push Drizzle schema |
| `node scripts/ci-verify.mjs` | CI export sanity check |

## Next

1. [Backend connections]({% link BACKEND_CONNECTION_GUIDE.md %}) — proxy map and dual registration
2. [Tabs & apps]({% link TABS_AND_APPS.md %}) — add a game tab
3. [App deployment]({% link deployment.md %}) — Railway + Cloudflare Pages
4. [Docs deployment]({% link github-pages.md %}) — this site on GitHub Pages

{: .tip }
After deploy, open **`/connections`** in the app to probe live backend health.
