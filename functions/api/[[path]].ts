/**
 * /api/* — Cloudflare Pages Function proxy (same-origin → fleet backends).
 *
 * ONE TRUTH routing (2026-07 fleet):
 *   /api/auth/discord*  → grudgewarlords.com (OAuth app redirect URI)
 *   /api/auth/*         → id.grudge-studio.com (Grudge ID hub → Railway auth)
 *   /api/{characters,account,wallet,inventory,island,health,...} → Railway Postgres SSOT
 *   /api/* (remainder)  → Railway game API (no more api.grudge-studio.com split-brain)
 *
 * @see GrudgeBuilder/shared/fleet/manifest.ts FLEET_URLS + FLEET_GAME_DATA_API_PREFIXES
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const RAILWAY = "https://grudge-api-production-0d46.up.railway.app";
const AUTH_HUB = "https://id.grudge-studio.com";
const WARLORDS = "https://grudgewarlords.com";

/** Prefixes that must hit Railway Postgres (characters / account bag / islands). */
const GAME_DATA_PREFIXES = new Set([
  "health",
  "characters",
  "party",
  "account",
  "island",
  "islands",
  "inventory",
  "wallet",
  "nfts",
  "island-nfts",
  "professions",
  "missions",
  "player",
  "resource-nodes",
  "resources",
  "sprites",
  "generate-dungeon",
  "fleet",
  "supabase",
  "lore",
  "combat-challenges",
  "story-arcs",
  "skills",
  "sheets",
  "aseprite",
  "sprite-specs",
  "sprite-generation-jobs",
  "admin",
  "activity",
  "analytics",
  "crafting",
  "harvest",
  "combat",
  "rts",
  "discord",
  "videos",
  "races",
  "classes",
  "items",
  "spells",
  "monsters",
  "maps",
  "launcher",
  "ai-units",
  "rewards",
]);

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "x-forwarded-host",
  "x-forwarded-proto",
]);

function buildTarget(path: string, search: string): string {
  if (path === "/api/auth/discord") {
    return `${WARLORDS}/discord${search}`;
  }
  if (path.startsWith("/api/auth/discord/")) {
    const rest = path.slice("/api/auth/discord/".length);
    return `${WARLORDS}/api/discord/${rest}${search}`;
  }

  // Auth implementation lives on Railway (same as id.grudge-studio.com hub rewrites).
  // Proxying API calls straight to Railway avoids id hub 404s on puter/login/bridge.
  // Browser login UI still uses https://id.grudge-studio.com/login (pretty domain).
  if (path.startsWith("/api/auth/")) {
    return `${RAILWAY}${path}${search}`;
  }

  // Explicit game-data prefixes + default remainder → Railway SSOT
  if (path.startsWith("/api/")) {
    const rest = path.slice("/api/".length);
    const prefix = rest.split("/")[0] || "";
    if (!prefix || GAME_DATA_PREFIXES.has(prefix) || true) {
      // All non-auth /api goes to Railway — single player-state SSOT
      return `${RAILWAY}${path}${search}`;
    }
  }

  return `${RAILWAY}${path}${search}`;
}

function filterRequestHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });
  return out;
}

function filterResponseHeaders(src: Headers): Headers {
  const out = new Headers();
  src.forEach((value, key) => {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      out.set(key, value);
    }
  });
  // Allow launcher origin to read responses when called cross-subdomain (rare)
  if (!out.has("Access-Control-Allow-Origin")) {
    out.set("Access-Control-Allow-Origin", "https://launcher.grudge-studio.com");
    out.set("Vary", "Origin");
  }
  return out;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request } = ctx;
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "https://launcher.grudge-studio.com",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type,Authorization,X-Session-Token,If-Match,X-Progress-Revision",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const target = buildTarget(url.pathname, url.search);

  const init: RequestInit = {
    method: request.method,
    headers: filterRequestHeaders(request.headers),
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    (init as any).duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        error: "Upstream fetch failed",
        target,
        message: err?.message ?? String(err),
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: filterResponseHeaders(upstream.headers),
  });
};
