/**
 * Grudge SSO — Cross-App Auth Relay for React apps
 *
 * Call initGrudgeSSO() once at app boot to enable:
 *  - Outbound: clicks on links to other Grudge domains auto-append auth token
 *  - Inbound: already handled by auth.ts captureAuthCallback()
 */

const TOKEN_KEY = 'grudge_auth_token';
const USER_KEY = 'grudge_username';
const ID_KEY = 'grudge_id';

function isGrudgeDomain(hostname: string): boolean {
  if (/\.vercel\.app$/.test(hostname)) return true;
  if (/\.grudge-studio\.com$/.test(hostname)) return true;
  if (/\.grudgestudio\.com$/.test(hostname)) return true;
  if (hostname === 'grudgewarlords.com' || hostname === 'www.grudgewarlords.com') return true;
  return false;
}

function getAuthParams(): URLSearchParams | null {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const p = new URLSearchParams();
  p.set('token', token);
  const username = localStorage.getItem(USER_KEY);
  const grudgeId = localStorage.getItem(ID_KEY);
  if (username) p.set('username', username);
  if (grudgeId) p.set('grudge_id', grudgeId);
  return p;
}

function handleClick(e: MouseEvent) {
  const link = (e.target as HTMLElement).closest?.('a[href]') as HTMLAnchorElement | null;
  if (!link) return;

  const href = link.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

  let url: URL;
  try { url = new URL(href, window.location.origin); } catch { return; }

  if (url.hostname === window.location.hostname) return;
  if (!isGrudgeDomain(url.hostname)) return;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  const authParams = getAuthParams();
  if (!authParams || url.searchParams.has('token')) return;

  authParams.forEach((v, k) => url.searchParams.set(k, v));

  e.preventDefault();
  if (link.target === '_blank') {
    window.open(url.toString(), '_blank', 'noopener');
  } else {
    window.location.href = url.toString();
  }
}

let initialized = false;

/** Call once at app boot to enable cross-app SSO token relay. */
export function initGrudgeSSO() {
  if (initialized) return;
  initialized = true;
  document.addEventListener('click', handleClick, true);
}

/** Build a URL to another Grudge app with auth params included. */
export function buildSSOUrl(targetUrl: string): string {
  const url = new URL(targetUrl);
  const params = getAuthParams();
  if (params) params.forEach((v, k) => url.searchParams.set(k, v));
  return url.toString();
}
