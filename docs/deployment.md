---
layout: default
title: App deployment
nav_order: 8
description: Deploy the grudgeDot app (Railway + Cloudflare Pages).
permalink: /deployment/
---

# App deployment

This page covers the **application**, not the docs site. For documentation publishing, see [GitHub Pages]({% link github-pages.md %}).

## Production shape

| Layer | Host | Notes |
|-------|------|--------|
| Full-stack container | **Railway** (Docker) | Express API + static client; primary runtime |
| Static SPA mirror | **Cloudflare Pages** project `grudgedot` | Built by `.github/workflows/pages-deploy.yml` |
| Auth | `id.grudge-studio.com` | JWT / SSO |
| Game API | `api.grudge-studio.com` | Characters, economy, crafting |
| Assets | `assets.grudge-studio.com` (R2) | GLBs, sprites, CDN |
| Game data JSON | `objectstore.grudge-studio.com` | Master items, effects, registries |

## Railway (primary)

```bash
npm install -g @railway/cli
railway login
railway link
railway up
```

- Config: `railway.toml` (healthcheck `/api/health`, `$PORT`)
- Set env vars in the Railway dashboard (mirror `.env.example`)
- Domain: assign under Grudge Studio fleet as needed

## Cloudflare Pages (static SPA)

Workflow: `.github/workflows/pages-deploy.yml` on `main` / `production`.

```bash
npm ci
node scripts/ci-verify.mjs
npm run vercel-build   # output: dist/public
```

CI publishes `dist/public` to Cloudflare Pages project **`grudgedot`** when `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets are present. Missing secrets → build still green, publish skipped.

{: .important }
Static Pages deploys do **not** run Express. Client code must use relative `/api/*` (or configured production hosts). See [Backend connections]({% link BACKEND_CONNECTION_GUIDE.md %}).

## Domain convention

Always use **`grudge-studio.com`** (hyphenated):

- ✅ `api.grudge-studio.com`, `id.grudge-studio.com`
- ❌ `grudgestudio.com` (legacy)

## Verify

1. Health: `/api/health` on the container
2. UI probes: app route **`/connections`**
3. Auth round-trip: open launcher from studio with `?token=` or `#token=`
