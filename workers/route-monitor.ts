/**
 * Grudge Studio Route Monitor — Cloudflare Worker
 *
 * Checks all Grudge Studio service endpoints on a cron schedule (every 5 min).
 * Stores results in Cloudflare KV for the RouteHealthBadge to read.
 *
 * Deploy:
 *   1. `npm install -g wrangler`
 *   2. `wrangler kv namespace create ROUTE_HEALTH`
 *   3. Update wrangler.toml with the KV namespace ID
 *   4. `wrangler deploy`
 *
 * Endpoints:
 *   GET /status         — Full health report (JSON)
 *   GET /status/:service — Single service health
 *   GET /badge          — SVG shield badge for README
 *   GET /check          — Force re-check (requires MONITOR_SECRET)
 *
 * Cron: Runs every 5 minutes via Cloudflare Cron Triggers
 */

export interface Env {
  ROUTE_HEALTH: KVNamespace;
  MONITOR_SECRET: string; // wrangler secret put MONITOR_SECRET
}

const ALLOWED_ORIGINS = [
  'https://grudge-studio.com',
  'https://dev.grudge-studio.com',
  'https://dash.grudge-studio.com',
  'https://grudgewarlords.com',
  'https://gdevelop-assistant.vercel.app',
];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') ?? '';
  // Allow any *.grudge-studio.com subdomain or exact matches
  if (
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/[a-z0-9-]+\.grudge-studio\.com$/.test(origin) ||
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin)
  ) {
    return origin;
  }
  return ALLOWED_ORIGINS[0]; // default — won't match random callers
}

interface ServiceCheck {
  name: string;
  url: string;
  expectedStatus: number[];
  category: 'backend' | 'frontend' | 'proxy';
}

interface CheckResult {
  name: string;
  url: string;
  status: 'ok' | 'degraded' | 'down';
  statusCode: number | null;
  responseTime: number;
  lastChecked: string;
  category: string;
}

const SERVICES: ServiceCheck[] = [
  // Backend services (VPS / Coolify)
  { name: 'Game API', url: 'https://api.grudge-studio.com/health', expectedStatus: [200], category: 'backend' },
  { name: 'Auth (grudge-id)', url: 'https://id.grudge-studio.com/health', expectedStatus: [200], category: 'backend' },
  { name: 'Account API', url: 'https://account.grudge-studio.com/health', expectedStatus: [200], category: 'backend' },
  { name: 'Asset Service', url: 'https://assets.grudge-studio.com/health', expectedStatus: [200], category: 'backend' },

  // Cloudflare Workers
  { name: 'ObjectStore', url: 'https://objectstore.grudge-studio.com/health', expectedStatus: [200], category: 'backend' },
  { name: 'ObjectStore API', url: 'https://molochdagod.github.io/ObjectStore/api/v1/classes.json', expectedStatus: [200], category: 'backend' },

  // Frontend deployments (Vercel)
  { name: 'Grudge Warlords', url: 'https://grudgewarlords.com', expectedStatus: [200], category: 'frontend' },
  { name: 'GDevelop Assistant', url: 'https://gdevelop-assistant.vercel.app', expectedStatus: [200], category: 'frontend' },
  { name: 'Grudge Engine Web', url: 'https://grudge-engine-web.vercel.app', expectedStatus: [200], category: 'frontend' },
  { name: 'Dashboard', url: 'https://dash.grudge-studio.com', expectedStatus: [200], category: 'frontend' },

  // Proxy routes (through Vercel rewrites to VPS)
  { name: 'Characters API', url: 'https://api.grudge-studio.com/characters', expectedStatus: [401], category: 'proxy' },
  { name: 'Crafting API', url: 'https://api.grudge-studio.com/crafting/recipes', expectedStatus: [401], category: 'proxy' },
  { name: 'Missions API', url: 'https://api.grudge-studio.com/missions', expectedStatus: [401], category: 'proxy' },
];

async function checkService(svc: ServiceCheck): Promise<CheckResult> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(svc.url, {
      method: 'GET',
      headers: { 'User-Agent': 'GrudgeStudio-RouteMonitor/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const responseTime = Date.now() - start;
    const status = svc.expectedStatus.includes(res.status) ? 'ok'
      : (res.status >= 500 ? 'down' : 'degraded');

    return {
      name: svc.name, url: svc.url, status, statusCode: res.status,
      responseTime, lastChecked: new Date().toISOString(), category: svc.category,
    };
  } catch {
    return {
      name: svc.name, url: svc.url, status: 'down', statusCode: null,
      responseTime: Date.now() - start, lastChecked: new Date().toISOString(), category: svc.category,
    };
  }
}

async function runAllChecks(env: Env): Promise<CheckResult[]> {
  const results = await Promise.all(SERVICES.map(checkService));

  const payload = JSON.stringify({
    results,
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      ok: results.filter(r => r.status === 'ok').length,
      degraded: results.filter(r => r.status === 'degraded').length,
      down: results.filter(r => r.status === 'down').length,
    },
  });

  try {
    // Store aggregate result
    await env.ROUTE_HEALTH.put('latest', payload, { expirationTtl: 600 });

    // Per-service writes in parallel (non-blocking if one fails)
    await Promise.allSettled(
      results.map(r => {
        const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return env.ROUTE_HEALTH.put(`service:${key}`, JSON.stringify(r), { expirationTtl: 600 });
      })
    );
  } catch (err) {
    console.error('KV write failed:', err);
  }

  return results;
}

// ── HTTP handler ────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = getCorsOrigin(request);
    const corsHeaders = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow GET requests
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /status — full report
    if (url.pathname === '/status' || url.pathname === '/') {
      const cached = await env.ROUTE_HEALTH.get('latest');
      if (cached) {
        return new Response(cached, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
        });
      }
      // No cached data — run checks now
      const results = await runAllChecks(env);
      return new Response(JSON.stringify({ results, timestamp: new Date().toISOString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /status/:service
    if (url.pathname.startsWith('/status/')) {
      const key = url.pathname.replace('/status/', '').toLowerCase().replace(/[^a-z0-9-]/g, '');
      if (!key || key.length > 64) {
        return new Response(JSON.stringify({ error: 'Invalid service key' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await env.ROUTE_HEALTH.get(`service:${key}`);
      if (data) {
        return new Response(data, {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Service not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /badge — SVG shield badge
    if (url.pathname === '/badge') {
      const cached = await env.ROUTE_HEALTH.get('latest');
      let label = 'services';
      let message = 'unknown';
      let color = '#71717a';
      if (cached) {
        const data = JSON.parse(cached);
        const { ok, down, total } = data.summary;
        message = `${ok}/${total} online`;
        color = down === 0 ? '#22c55e' : (down < total / 2 ? '#f59e0b' : '#ef4444');
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="20">
        <linearGradient id="a" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
        <rect rx="3" width="160" height="20" fill="#555"/>
        <rect rx="3" x="60" width="100" height="20" fill="${color}"/>
        <rect rx="3" width="160" height="20" fill="url(#a)"/>
        <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
          <text x="30" y="15" fill="#010101" fill-opacity=".3">${label}</text>
          <text x="30" y="14">${label}</text>
          <text x="110" y="15" fill="#010101" fill-opacity=".3">${message}</text>
          <text x="110" y="14">${message}</text>
        </g>
      </svg>`;
      return new Response(svg, {
        headers: { ...corsHeaders, 'Content-Type': 'image/svg+xml', 'Cache-Control': 'max-age=300' },
      });
    }

    // GET /check — force re-check (requires MONITOR_SECRET)
    if (url.pathname === '/check') {
      const auth = request.headers.get('Authorization');
      const token = url.searchParams.get('token');
      const secret = env.MONITOR_SECRET;

      if (!secret || (auth !== `Bearer ${secret}` && token !== secret)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const results = await runAllChecks(env);
      return new Response(JSON.stringify({ results, timestamp: new Date().toISOString(), forced: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Grudge Studio Route Monitor\n\nGET /status — Full health report\nGET /badge — SVG badge\nGET /check — Force re-check', {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });
  },

  // ── Cron handler (runs every 5 minutes) ────────────────────────────────────
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runAllChecks(env));
  },
};
