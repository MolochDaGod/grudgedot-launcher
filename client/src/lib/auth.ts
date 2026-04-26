/**
 * grudgeDot Authentication
 *
 * The launcher does NOT provide its own login. Authentication is fully delegated
 * to the unified Grudge ID SSO at https://id.grudge-studio.com/auth. This module
 * only handles:
 *
 *   - storing / reading the JWT issued by the SSO
 *   - hard-redirecting unauthenticated users out to the SSO
 *   - capturing the JWT returned via hash or query params when the user comes
 *     back from the SSO
 *   - forwarding the JWT on authenticated API calls + logging out
 */

const GRUDGE_AUTH_URL = 'https://id.grudge-studio.com/auth';
const GRUDGE_ID_BASE = 'https://id.grudge-studio.com';
const APP_ID = 'grudgedot';

// ── localStorage keys (shared across all Grudge Studio apps) ──
const KEYS = {
  token: 'grudge_auth_token',
  grudgeId: 'grudge_id',
  userId: 'grudge_user_id',
  username: 'grudge_username',
} as const;

export interface AuthData {
  token: string;
  grudgeId: string;
  userId: string;
  username: string;
}

// ── Storage helpers ──

/** Save auth response from the SSO callback into localStorage. */
export function storeAuth(data: {
  token: string;
  grudgeId?: string;
  userId?: string;
  username?: string;
  displayName?: string;
}) {
  localStorage.setItem(KEYS.token, data.token);
  if (data.grudgeId) localStorage.setItem(KEYS.grudgeId, data.grudgeId);
  if (data.userId) localStorage.setItem(KEYS.userId, String(data.userId));
  localStorage.setItem(KEYS.username, data.displayName || data.username || 'Player');
}

/** Clear all auth data. */
function clearAuth() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  // Clear any stale keys from previous auth implementations.
  localStorage.removeItem('grudge_puter_auth');
  localStorage.removeItem('grudge_auth_provider');
}

// ── Token helpers ──

/** Decode a JWT payload without verification (client-side only). */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/** Check if a JWT is expired (or will expire within `bufferSeconds`). */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return payload.exp - bufferSeconds <= nowSec;
}

// ── Public API ──

/** Current auth data, or null if not logged in / token expired. */
export function getAuthData(): AuthData | null {
  const token = localStorage.getItem(KEYS.token);
  const grudgeId = localStorage.getItem(KEYS.grudgeId);
  const userId = localStorage.getItem(KEYS.userId);
  const username = localStorage.getItem(KEYS.username);

  if (!token) return null;

  if (isTokenExpired(token)) {
    clearAuth();
    return null;
  }

  return {
    token,
    grudgeId: grudgeId || '',
    userId: userId || grudgeId || '',
    username: username || 'Player',
  };
}

/** Same as getAuthData, but redirects to SSO if not logged in. */
export function checkAuth(): AuthData | null {
  const auth = getAuthData();
  if (!auth) {
    redirectToLogin();
    return null;
  }
  return auth;
}

export function hasAuthToken(): boolean {
  return !!localStorage.getItem(KEYS.token);
}

/** Hard-redirect the browser to the Grudge ID SSO. */
export function redirectToLogin(customReturnUrl?: string) {
  const returnUrl = encodeURIComponent(customReturnUrl || window.location.href);
  window.location.replace(`${GRUDGE_AUTH_URL}?redirect=${returnUrl}&app=${APP_ID}`);
}

/**
 * Capture auth data from a URL returned by the SSO. Accepts both hash-fragment
 * (`#token=...`) and query-param styles. Returns true if a token was captured.
 * Must be called on page load BEFORE getAuthData().
 */
export function captureAuthCallback(): boolean {
  // 1. Hash fragment (preferred — keeps token out of server logs)
  if (location.hash && location.hash.length > 1) {
    const hash = new URLSearchParams(location.hash.slice(1));
    const token = hash.get('token');
    if (token) {
      storeAuth({
        token,
        grudgeId: hash.get('grudgeId') || hash.get('grudge_id') || undefined,
        userId: hash.get('userId') || hash.get('user_id') || undefined,
        username: hash.get('name') || hash.get('username') || undefined,
        displayName: hash.get('name') || hash.get('displayName') || undefined,
      });
      history.replaceState(null, '', location.pathname + location.search);
      return true;
    }
  }

  const params = new URLSearchParams(window.location.search);

  // 2. Cross-service SSO handshake (sso_token)
  const ssoToken = params.get('sso_token');
  if (ssoToken) {
    storeAuth({
      token: ssoToken,
      grudgeId: params.get('grudge_id') || params.get('grudgeId') || undefined,
      userId: params.get('grudge_user_id') || params.get('userId') || undefined,
      username: params.get('grudge_username') || params.get('username') || undefined,
    });
    cleanAuthParams([
      'sso_token',
      'grudge_id',
      'grudge_user_id',
      'grudge_username',
      'grudgeId',
      'userId',
      'username',
    ]);
    return true;
  }

  // 3. Legacy `?token=` style
  const token = params.get('token');
  if (!token) return false;

  storeAuth({
    token,
    grudgeId: params.get('grudgeId') || params.get('grudge_id') || undefined,
    userId: params.get('userId') || params.get('user_id') || undefined,
    username: params.get('username') || undefined,
    displayName: params.get('displayName') || undefined,
  });

  cleanAuthParams([
    'token',
    'grudgeId',
    'userId',
    'username',
    'displayName',
    'provider',
    'isNew',
  ]);
  return true;
}

function cleanAuthParams(keys: string[]) {
  const cleanUrl = new URL(window.location.href);
  keys.forEach((k) => cleanUrl.searchParams.delete(k));
  window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
}

// ── Logout ──

/** Logout — invalidates JWT server-side, clears tokens, redirects to SSO. */
export function logout() {
  const token = localStorage.getItem(KEYS.token);
  if (token) {
    // Same-origin via the Pages Function proxy at functions/api/[[path]].ts
    // -> https://id.grudge-studio.com/auth/logout. Avoids CORS entirely.
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).catch(() => {});
  }
  clearAuth();
  redirectToLogin();
}

/** Logout without redirect (for switching accounts, etc.). */
export function logoutSilent() {
  const token = localStorage.getItem(KEYS.token);
  if (token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).catch(() => {});
  }
  clearAuth();
}

// ── Authenticated API calls ──

/** Fetch wrapper that auto-attaches the JWT Authorization header. */
export async function apiCall<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T | null> {
  const token = localStorage.getItem(KEYS.token);
  if (!token) {
    logout();
    return null;
  }

  const response = await fetch(`/api/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (response.status === 401) {
    logout();
    return null;
  }

  return response.json();
}

/** Verify current token with server. Returns full profile or null. */
export async function verifyToken() {
  return apiCall('auth/verify');
}
