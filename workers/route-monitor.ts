/**
 * Grudge Studio Route Monitor — Cloudflare Worker
 *
 * Checks all Grudge Studio service endpoints on a cron schedule (every 5 min).
 * Stores results in Cloudflare KV for the RouteHealthBadge to read.
 *
 * Deploy:
 *   1. `npm install -g wrangler`
 *   2. `wrangler kv:namespace create ROUTE_HEALTH`
 *   3. Update wrangler.toml with the KV namespace ID
 *   4. `wrangler deploy workers/route-monitor.ts`
 *
 * Endpoints:
 *   GET /status         — Full health report (JSON)
 *   GET /status/:service — Single service health
 *   GET /badge          — SVG shield badge for README
 *
 * Cron: Runs every 5 minutes via Cloudflare Cron Triggers
 */

export interface Env {
  ROUTE_HEALTH: KVNamespace;
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
  { name: 'Launcher API', url: 'https://launcher.grudge-studio.com/health', expectedStatus: [200], category: 'backend' },

  // Frontend deployments (Vercel)
  { name: 'GDevelop (dev)', url: 'https://dev.grudge-studio.com/api/health', expectedStatus: [200], category: 'frontend' },
  { name: 'GDevelop (vercel)', url: 'https://gdevelop-assistant.vercel.app/api/health', expectedStatus: [200], category: 'frontend' },
  { name: 'Grudge Warlords', url: 'https://grudgewarlords.com', expectedStatus: [200], category: 'frontend' },
  { name: 'Dashboard', url: 'https://dash.grudge-studio.com', expectedStatus: [200], category: 'frontend' },

  // Proxy routes (through GDevelop serverless)
  { name: 'Auth Proxy', url: 'https://dev.grudge-studio.com/api/auth/verify', expectedStatus: [200, 401], category: 'proxy' },
  { name: 'Leaderboard', url: 'https://dev.grudge-studio.com/api/leaderboard/games', expectedStatus: [200], category: 'proxy' },
  { name: 'Coolify Status', url: 'https://dev.grudge-studio.com/api/coolify/status', expectedStatus: [200], category: 'proxy' },
  { name: 'Characters Proxy', url: 'https://dev.grudge-studio.com/api/characters', expectedStatus: [200, 401], category: 'proxy' },
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

  // Store in KV
  await env.ROUTE_HEALTH.put('latest', JSON.stringify({
    results,
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      ok: results.filter(r => r.status === 'ok').length,
      degraded: results.filter(r => r.status === 'degraded').length,
      down: results.filter(r => r.status === 'down').length,
    },
  }), { expirationTtl: 600 }); // 10 min TTL

  // Also store per-service for quick lookups
  for (const r of results) {
    const key = r.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    await env.ROUTE_HEALTH.put(`service:${key}`, JSON.stringify(r), { expirationTtl: 600 });
  }

  return results;
}

// ── HTTP handler ────────────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
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

    // GET /check — force re-check now
    if (url.pathname === '/check') {
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
