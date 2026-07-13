---
layout: default
title: Home
nav_order: 1
description: Official grudgeDot launcher documentation — setup, architecture, sprites, and deploy.
permalink: /
---

<div class="grudge-hero" markdown="1">

# grudgeDot Docs

The launcher for Grudge Studio games, crafting tools, AI agents, and shared WCS heroes.
Characters live as Solana cNFTs; backends sit behind the Grudge proxy on `*.grudge-studio.com`.

[Get started]({% link getting-started.md %}){: .btn .btn-primary }
[Architecture]({% link BACKEND_CONNECTION_GUIDE.md %}){: .btn }
[Deploy docs]({% link github-pages.md %}){: .btn }

</div>

## Live endpoints

| Surface | URL |
|---------|-----|
| Studio portal | [grudge-studio.com](https://grudge-studio.com) |
| Auth (Grudge ID) | [id.grudge-studio.com](https://id.grudge-studio.com) |
| Game API | [api.grudge-studio.com](https://api.grudge-studio.com) |
| ObjectStore | [objectstore.grudge-studio.com](https://objectstore.grudge-studio.com) |
| Assets CDN | [assets.grudge-studio.com](https://assets.grudge-studio.com) |
| Drive (racer) | [drive.grudge-studio.com](https://drive.grudge-studio.com) |
| Forge editor | [forge.grudge-studio.com](https://forge.grudge-studio.com) |
| **These docs** | [molochdagod.github.io/grudgedot-launcher](https://molochdagod.github.io/grudgedot-launcher/) |

{: .note }
These pages are a **project GitHub Pages site** (`username.github.io/repo`), built with Jekyll + just-the-docs and published by a **GitHub Actions** workflow — not a dump of raw Markdown from the branch root.

## Guides

<div class="grudge-cards">
  <a class="grudge-card" href="{{ site.baseurl }}/getting-started/">
    <strong>Getting started</strong>
    <span>Clone, env, dev server, and first run of the launcher.</span>
  </a>
  <a class="grudge-card" href="{{ site.baseurl }}/backend-connection-guide/">
    <strong>Backend connections</strong>
    <span>Proxy pattern for game, account, ID, and launcher APIs.</span>
  </a>
  <a class="grudge-card" href="{{ site.baseurl }}/ai-systems-guide/">
    <strong>AI systems</strong>
    <span>AIWorker, GRUDA Legion, agents, combat AI, and cNFTs.</span>
  </a>
  <a class="grudge-card" href="{{ site.baseurl }}/sprite-system-overview/">
    <strong>Sprite system</strong>
    <span>Layered animation architecture and asset flow.</span>
  </a>
  <a class="grudge-card" href="{{ site.baseurl }}/sprite-effects-usage/">
    <strong>Sprite effects</strong>
    <span>Effects and projectile overlays on units.</span>
  </a>
  <a class="grudge-card" href="{{ site.baseurl }}/tabs-and-apps/">
    <strong>Tabs &amp; apps</strong>
    <span>Register games/tools, scaffold tabs, organize assets.</span>
  </a>
  <a class="grudge-card" href="{{ site.baseurl }}/deployment/">
    <strong>App deployment</strong>
    <span>Railway container + Cloudflare Pages SPA publish.</span>
  </a>
  <a class="grudge-card" href="{{ site.baseurl }}/github-pages/">
    <strong>Docs deployment</strong>
    <span>How this site is published with GitHub Pages Actions.</span>
  </a>
</div>

## Repo

```bash
git clone https://github.com/MolochDaGod/grudgedot-launcher.git
cd grudgedot-launcher
npm install
cp .env.example .env
npm run dev
```

App default: `http://localhost:5000` · Auth is progressive (browse without login).
