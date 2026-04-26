/**
 * /api/* — Cloudflare Pages Function proxy.
 *
 * Replaces the external-URL `200` rewrites that previously lived in
 * `client/public/_redirects`. Cloudflare Pages silently drops external
 * 200-rewrites, so those rules fell through to the SPA `index.html` and
 * every `/api/auth/*` call returned HTML instead of JSON.
 *
 * Routing matrix (matches the rules from the old _redirects):
 *   /api/auth/discord            -> https://grudgewarlords.com/discord
 *   /api/auth/discord/<rest>     -> https://grudgewarlords.com/api/discord/<rest>
 *   /api/auth/<rest>             -> https://id.grudge-studio.com/auth/<rest>
 *   /api/<rest>                  -> https://api.grudge-studio.com/api/<rest>
 *
 * Why a Function instead of _redirects?
 *   1. Pages silently drops `200` rewrites whose destination is an external
 *      URL. Only redirects (301/302/307/308) work for cross-origin targets,
 *      and a redirect would require CORS on the upstream — which currently
 *      only allows `https://grudge-studio.com`, not the launcher subdomain.
 *   2. A Function runs server-side at the edge, so the browser sees a
 *      same-origin response and CORS is irrelevant.
 *
 * The function preserves method, headers, body, and search string. It does
 * NOT follow upstream redirects (so OAuth 302s back to the SPA propagate to
 * the browser unchanged) and strips hop-by-hop headers that should not be
 * forwarded.
 */

interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  // Cloudflare-injected; the upstream should not see these
  "cf-connecting-ip",
  "cf-ipcountry",
  "cf-ray",
  "cf-visitor",
  "x-forwarded-host",
  "x-forwarded-proto",
]);

function buildTarget(path: string, search: string): string {
  // Discord OAuth lives on grudgewarlords.com — the OAuth app's redirect URI
  // is approved against /api/discord/callback there.
  if (path === "/api/auth/discord") {
    return `https://grudgewarlords.com/discord${search}`;
  }
  if (path.startsWith("/api/auth/discord/")) {
    const rest = path.slice("/api/auth/discord/".length);
    return `https://grudgewarlords.com/api/discord/${rest}${search}`;
  }

  // All other auth → id.grudge-studio.com (which mounts /auth/*, NOT /api/auth/*)
  if (path.startsWith("/api/auth/")) {
    const rest = path.slice("/api/auth/".length);
    return `https://id.grudge-studio.com/auth/${rest}${search}`;
  }

  // Everything else under /api → game backend on api.grudge-studio.com
  // (preserves the /api/ prefix because that's how the upstream routes are mounted)
  return `https://api.grudge-studio.com${path}${search}`;
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
  return out;
}

export const onRequest: PagesFunction<Env> = async (ctx) => {
  const { request } = ctx;
  const url = new URL(request.url);
  const target = buildTarget(url.pathname, url.search);

  const init: RequestInit = {
    method: request.method,
    headers: filterRequestHeaders(request.headers),
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    // ReadableStream bodies require duplex:'half' on Node-style fetches; the
    // CF runtime accepts this transparently.
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
