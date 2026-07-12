/**
 * RouteHealthBadge — WCS-styled floating widget (bottom-right)
 *
 * Shows on every page:
 *  - Current route source (GitHub repo, Vercel project)
 *  - Backend health indicator (green/amber/red dot)
 *  - Quick links: GitHub, Vercel, connections page
 *  - Expandable on hover/click
 *
 * Styled with Cinzel font, gold borders, dark fantasy theme (WCS style).
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';

// ── Route → source mapping ──────────────────────────────────────────────────
interface RouteSource {
  repo: string;
  repoUrl: string;
  vercel: string;
  vercelUrl: string;
  backend?: string;
}

const ROUTE_SOURCES: Record<string, RouteSource> = {
  // GDevelop Assistant pages
  '/': { repo: 'GDevelopAssistant', repoUrl: 'https://github.com/MolochDaGod/GDevelopAssistant', vercel: 'gdevelop-assistant', vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant' },
  '/grudge-swarm': { repo: 'GDevelopAssistant + grudge-warlords-rts', repoUrl: 'https://github.com/MolochDaGod/grudge-warlords-rts', vercel: 'gdevelop-assistant', vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant', backend: 'api.grudge-studio.com' },
  '/grudge-arena': { repo: 'GDevelopAssistant', repoUrl: 'https://github.com/MolochDaGod/GDevelopAssistant', vercel: 'gdevelop-assistant', vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant' },
  '/grudge-box': { repo: 'GDevelopAssistant', repoUrl: 'https://github.com/MolochDaGod/GDevelopAssistant', vercel: 'gdevelop-assistant', vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant' },
  '/crypt-crawlers': { repo: 'GDevelopAssistant', repoUrl: 'https://github.com/MolochDaGod/GDevelopAssistant', vercel: 'gdevelop-assistant', vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant' },
  '/mmo': { repo: 'GDevelopAssistant', repoUrl: 'https://github.com/MolochDaGod/GDevelopAssistant', vercel: 'gdevelop-assistant', vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant', backend: 'api.grudge-studio.com' },
  '/grudge-crafting': { repo: 'GDevelopAssistant', repoUrl: 'https://github.com/MolochDaGod/GDevelopAssistant', vercel: 'gdevelop-assistant', vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant', backend: 'api.grudge-studio.com' },
  '/connections': { repo: 'GDevelopAssistant', repoUrl: 'https://github.com/MolochDaGod/GDevelopAssistant', vercel: 'gdevelop-assistant', vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant', backend: 'all services' },
};

const DEFAULT_SOURCE: RouteSource = {
  repo: 'GDevelopAssistant',
  repoUrl: 'https://github.com/MolochDaGod/GDevelopAssistant',
  vercel: 'gdevelop-assistant',
  vercelUrl: 'https://vercel.com/grudgenexus/gdevelop-assistant',
};

// ── Health check cache ──────────────────────────────────────────────────────
type HealthStatus = 'ok' | 'degraded' | 'down' | 'checking';

interface ServiceHealth {
  api: HealthStatus;
  auth: HealthStatus;
  vercel: HealthStatus;
}

export function RouteHealthBadge() {
  const [location] = useLocation();
  const [expanded, setExpanded] = useState(false);
  const [health, setHealth] = useState<ServiceHealth>({ api: 'checking', auth: 'checking', vercel: 'checking' });
  const [lastCheck, setLastCheck] = useState<string>('');

  const source = ROUTE_SOURCES[location] || DEFAULT_SOURCE;

  const checkHealth = useCallback(async () => {
    const results: ServiceHealth = { api: 'checking', auth: 'checking', vercel: 'checking' };

    // Check local API (Vercel serverless)
    try {
      const r = await fetch('/api/health', { signal: AbortSignal.timeout(5000) });
      results.vercel = r.ok ? 'ok' : 'degraded';
    } catch { results.vercel = 'down'; }

    // Check auth
    try {
      const r = await fetch('/api/auth/verify', {
        headers: { Authorization: `Bearer test` },
        signal: AbortSignal.timeout(5000),
      });
      results.auth = (r.status === 401 || r.ok) ? 'ok' : 'degraded';
    } catch { results.auth = 'down'; }

    // Check game API proxy
    try {
      const r = await fetch('/api/characters', {
        headers: { Authorization: `Bearer ${localStorage.getItem('grudge_auth_token') || 'none'}` },
        signal: AbortSignal.timeout(5000),
      });
      results.api = (r.ok || r.status === 401) ? 'ok' : 'degraded';
    } catch { results.api = 'down'; }

    setHealth(results);
    setLastCheck(new Date().toLocaleTimeString());
  }, []);

  // Check on mount and every 60s
  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 60000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const overallStatus = health.vercel === 'down' ? 'down'
    : (health.api === 'down' && health.auth === 'down') ? 'down'
    : (health.api === 'degraded' || health.auth === 'degraded') ? 'degraded'
    : 'ok';

  const statusColor = overallStatus === 'ok' ? '#22c55e' : overallStatus === 'degraded' ? '#f59e0b' : '#ef4444';
  const statusText = overallStatus === 'ok' ? 'All Systems Online' : overallStatus === 'degraded' ? 'Degraded' : 'Offline';

  const dotStyle = (s: HealthStatus) => ({
    width: 8, height: 8, borderRadius: '50%',
    backgroundColor: s === 'ok' ? '#22c55e' : s === 'degraded' ? '#f59e0b' : s === 'down' ? '#ef4444' : '#71717a',
    boxShadow: s === 'ok' ? '0 0 6px #22c55e' : s === 'degraded' ? '0 0 6px #f59e0b' : s === 'down' ? '0 0 6px #ef4444' : 'none',
  });

  return (
    <div
      style={{
        position: 'fixed', bottom: 16, right: 16, zIndex: 9999,
        fontFamily: "'Cinzel', 'MedievalSharp', serif",
        transition: 'all 0.3s ease',
      }}
    >
      {/* Collapsed: small pill */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 20,
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            border: `1px solid ${statusColor}44`,
            boxShadow: `0 2px 12px rgba(0,0,0,0.5), 0 0 8px ${statusColor}22`,
            cursor: 'pointer', color: '#d4af37',
            fontSize: 11, fontWeight: 600, letterSpacing: 0.5,
          }}
        >
          <span style={dotStyle(overallStatus as HealthStatus)} />
          <span style={{ color: '#a1a1aa', fontFamily: 'sans-serif', fontSize: 10 }}>
            {source.repo.split('/').pop()?.replace('GDevelopAssistant', 'GDevelop')}
          </span>
        </button>
      )}

      {/* Expanded: WCS panel */}
      {expanded && (
        <div
          style={{
            width: 280, padding: 0,
            background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #0f0f1a 100%)',
            border: '1px solid #d4af3744',
            borderRadius: 8,
            boxShadow: '0 4px 24px rgba(0,0,0,0.7), 0 0 12px rgba(212,175,55,0.1), inset 0 1px 0 rgba(212,175,55,0.1)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'linear-gradient(90deg, #d4af3722, transparent, #d4af3722)',
            borderBottom: '1px solid #d4af3733',
          }}>
            <span style={{ color: '#d4af37', fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
              Route Inspector
            </span>
            <button onClick={() => setExpanded(false)} style={{
              background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 14, padding: '0 4px',
            }}>✕</button>
          </div>

          {/* Status row */}
          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #ffffff08' }}>
            <span style={dotStyle(overallStatus as HealthStatus)} />
            <span style={{ color: statusColor, fontSize: 11, fontWeight: 600 }}>{statusText}</span>
            {lastCheck && <span style={{ color: '#52525b', fontSize: 9, marginLeft: 'auto', fontFamily: 'sans-serif' }}>{lastCheck}</span>}
          </div>

          {/* Services */}
          <div style={{ padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              { label: 'Vercel API', status: health.vercel },
              { label: 'Auth (id.grudge-studio)', status: health.auth },
              { label: 'Game API', status: health.api },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={dotStyle(s.status)} />
                <span style={{ color: '#a1a1aa', fontSize: 10, fontFamily: 'sans-serif' }}>{s.label}</span>
                <span style={{ color: s.status === 'ok' ? '#22c55e' : s.status === 'degraded' ? '#f59e0b' : '#ef4444', fontSize: 9, marginLeft: 'auto', fontFamily: 'sans-serif', fontWeight: 600 }}>
                  {s.status.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {/* Source info */}
          <div style={{ padding: '8px 12px', borderTop: '1px solid #ffffff08' }}>
            <div style={{ color: '#71717a', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Source</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <a href={source.repoUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#d4af37', fontSize: 10, textDecoration: 'none', fontFamily: 'sans-serif' }}>
                <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
                {source.repo}
              </a>
              <a href={source.vercelUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#a1a1aa', fontSize: 10, textDecoration: 'none', fontFamily: 'sans-serif' }}>
                <svg width="12" height="12" viewBox="0 0 76 65" fill="currentColor"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
                {source.vercel}
              </a>
              {source.backend && (
                <span style={{ color: '#52525b', fontSize: 9, fontFamily: 'sans-serif' }}>
                  Backend: {source.backend}
                </span>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div style={{
            padding: '6px 12px 8px', borderTop: '1px solid #d4af3722',
            display: 'flex', gap: 6, justifyContent: 'center',
          }}>
            <a href="/connections" style={{
              padding: '3px 10px', borderRadius: 4,
              background: '#d4af3715', border: '1px solid #d4af3733',
              color: '#d4af37', fontSize: 9, textDecoration: 'none', fontWeight: 600,
              fontFamily: 'sans-serif',
            }}>Connections</a>
            <button onClick={checkHealth} style={{
              padding: '3px 10px', borderRadius: 4,
              background: '#22c55e15', border: '1px solid #22c55e33',
              color: '#22c55e', fontSize: 9, cursor: 'pointer', fontWeight: 600,
              fontFamily: 'sans-serif',
            }}>Recheck</button>
          </div>
        </div>
      )}
    </div>
  );
}
