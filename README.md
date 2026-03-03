# GDevelop Assistant — Grudge Warlords

> Crafting, progression, AI agents, and game tools for the Grudge Studio ecosystem.

## Overview

GDevelop Assistant (GGE) is a full-stack web application that serves as the primary development and gameplay hub for Grudge Warlords. It provides crafting systems, character management, AI-powered sprite generation, GRUDA Wars heroes, and an admin dashboard — all backed by a PostgreSQL database and authenticated via the Grudge Auth Gateway.

**Live**: Deployed on [Vercel](https://vercel.com)  
**Auth**: [auth-gateway-flax.vercel.app](https://auth-gateway-flax.vercel.app) (Grudge ID SSO)

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

## Project Structure

```
GDevelopAssistant/
├── api/                  # Vercel serverless entry point
│   └── index.ts          # Express app for Vercel
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── components/   # UI components (Radix-based)
│   │   ├── lib/          # auth.ts, puter.ts, utilities
│   │   └── pages/        # App pages
│   ├── public/           # Favicons, static assets
│   └── index.html        # Vite entry point
├── server/               # Express backend
│   ├── routes.ts         # All API routes
│   ├── index.ts          # Dev server entry (Vite middleware)
│   ├── serverUtils.ts    # log() and serveStatic() for serverless
│   ├── middleware/        # grudgeJwt.ts (JWT verification)
│   └── services/         # grudaLegion.ts, etc.
├── shared/               # Shared types and schemas
│   └── schema.ts         # Drizzle ORM database schema
├── vercel.json           # Vercel deployment config
├── vite.config.ts        # Vite build config
├── drizzle.config.ts     # Drizzle ORM config
└── package.json
```

## Authentication

GGE uses the **Grudge Auth Gateway** (`auth-gateway-flax.vercel.app`) for all authentication. See [AUTH_INTEGRATION.md](AUTH_INTEGRATION.md) for details.

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
DATABASE_URL=postgresql://...       # Neon PostgreSQL connection string
SESSION_SECRET=your-secret          # Express session secret
JWT_SECRET=your-jwt-secret          # JWT signing secret (shared with auth-gateway)
```

## Deployment

The app deploys to **Vercel** automatically on push to `main`. The `vercel.json` config routes `/api/*` to the Express serverless function and serves the Vite build as static files.

## Related Projects

- **[Auth Gateway](https://github.com/MolochDaGod/Warlord-Crafting-Suite/tree/main/auth-gateway)** — Grudge ID SSO system
- **[Grudachain](https://github.com/MolochDaGod/grudachain)** — GRUDA Legion standalone AI system
- **[Warlord Crafting Suite](https://github.com/MolochDaGod/Warlord-Crafting-Suite)** — Main game platform

## License

MIT
