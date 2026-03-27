/**
 * Grudge Studio Unified Authentication
 *
 * All auth flows produce the same result: a JWT stored as `grudge_auth_token`.
 *
 * Supported flows:
 *  1. Username/password → auth-gateway /api/login → JWT
 *  2. Puter.js sign-in  → /api/auth/puter { puterUuid } → JWT
 *  3. Auth-gateway redirect (external login page) → JWT via URL param
 *  4. Guest login → auth-gateway /api/guest → JWT
 *
 * Source of truth: local /api proxy → auth-gateway (shared `accounts` table)
 */

// Auth is now served in-app at /auth — no external gateway redirect needed

// ── localStorage keys (shared across all Grudge Studio apps) ──
const KEYS = {
  token: 'grudge_auth_token',
  grudgeId: 'grudge_id',
  userId: 'grudge_user_id',
  username: 'grudge_username',
  isPuter: 'grudge_puter_auth',
} as const;

export interface AuthData {
  token: string;
  grudgeId: string;
  userId: string;
  username: string;
  isPuter?: boolean;
}

// ── Storage helpers ──

/** Save auth response from any flow into localStorage. */
export function storeAuth(data: {
  token: string;
  grudgeId?: string;
  userId?: string;
  username?: string;
  displayName?: string;
  isPuter?: boolean;
}) {
  localStorage.setItem(KEYS.token, data.token);
  if (data.grudgeId) localStorage.setItem(KEYS.grudgeId, data.grudgeId);
  if (data.userId) localStorage.setItem(KEYS.userId, String(data.userId));
  localStorage.setItem(KEYS.username, data.displayName || data.username || 'Player');
  if (data.isPuter) localStorage.setItem(KEYS.isPuter, 'true');
}

/** Clear all auth data. */
function clearAuth() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// ── Public API ──

/** Get current auth data without redirecting. Returns null if not logged in. */
export function getAuthData(): AuthData | null {
  const token = localStorage.getItem(KEYS.token);
  const grudgeId = localStorage.getItem(KEYS.grudgeId);
  const userId = localStorage.getItem(KEYS.userId);
  const username = localStorage.getItem(KEYS.username);

  if (!token) return null;

  return {
    token,
    grudgeId: grudgeId || '',
    userId: userId || grudgeId || '',
    username: username || 'Player',
    isPuter: localStorage.getItem(KEYS.isPuter) === 'true',
  };
}

/** Check auth — redirects to login if missing. */
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

/** Redirect to in-app auth page. */
export function redirectToLogin(customReturnUrl?: string) {
  const returnUrl = encodeURIComponent(customReturnUrl || window.location.pathname);
  window.location.href = `/auth?return=${returnUrl}`;
}

const _ID_BASE = 'https://id.grudge-studio.com';

/** Logout — invalidates JWT server-side, clears tokens, redirects to auth page. */
export function logout() {
  // Fire-and-forget: invalidate JWT so it cannot be replayed
  const token = localStorage.getItem(KEYS.token);
  if (token) {
    fetch(`${_ID_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).catch(() => {}); // best-effort
  }
  clearAuth();
  window.location.href = '/auth';
}

/** Logout without redirect (for switching accounts, etc.) */
export function logoutSilent() {
  const token = localStorage.getItem(KEYS.token);
  if (token) {
    fetch(`${_ID_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).catch(() => {});
  }
  clearAuth();
}

// ── API call helper ──

/** Make an authenticated API call. Sends JWT in Authorization header. */
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

// ── Callback capture (after auth-gateway redirect) ──

/**
 * Capture auth data from URL params after auth-gateway redirect.
 * The auth-gateway redirects back with ?token=...&grudgeId=...&userId=...&username=...
 * This must be called BEFORE getAuthData() on page load.
 * Returns true if auth data was captured from the URL.
 */
export function captureAuthCallback(): boolean {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) return false;

  // Store everything the gateway sent
  storeAuth({
    token,
    grudgeId: params.get('grudgeId') || undefined,
    userId: params.get('userId') || undefined,
    username: params.get('username') || undefined,
    displayName: params.get('displayName') || undefined,
  });

  // Strip auth params from URL so they don't leak into bookmarks/history
  const cleanUrl = new URL(window.location.href);
  ['token', 'grudgeId', 'userId', 'username', 'displayName', 'provider', 'isNew'].forEach(
    (k) => cleanUrl.searchParams.delete(k),
  );
  window.history.replaceState({}, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);

  return true;
}

// ── Auth flows ──

/** Login with username + password via auth-gateway. */
export async function loginWithPassword(username: string, password: string) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Register via auth-gateway. */
export async function registerAccount(username: string, password: string, email?: string) {
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Bridge Grudge Cloud (Puter) auth to a Grudge JWT. Call after puter.auth.signIn(). */
export async function loginWithPuter(puterUuid: string, puterUsername: string) {
  const res = await fetch('/api/auth/puter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ puterUuid, puterUsername }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth({ ...data, isPuter: true });
  }
  return data;
}

/** Guest login via auth-gateway. */
export async function loginAsGuest(deviceId?: string) {
  const id = deviceId || crypto.randomUUID().slice(0, 12);
  const res = await fetch('/api/guest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId: id }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Initiate Google OAuth — returns { url } to redirect to. */
export async function loginWithGoogle(returnUrl?: string) {
  const state = encodeURIComponent(returnUrl || window.location.pathname);
  const res = await fetch(`/api/auth/google?state=${state}`);
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  }
  return data;
}

/** Initiate Discord OAuth — returns { url } to redirect to. */
export async function loginWithDiscord(returnUrl?: string) {
  const state = encodeURIComponent(returnUrl || window.location.pathname);
  const res = await fetch(`/api/auth/discord?state=${state}`);
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  }
  return data;
}

/** Initiate GitHub OAuth — returns { url } to redirect to. */
export async function loginWithGitHub(returnUrl?: string) {
  const state = encodeURIComponent(returnUrl || window.location.pathname);
  const res = await fetch(`/api/auth/github?state=${state}`);
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  }
  return data;
}

/** Send phone verification code via SMS. */
export async function sendPhoneCode(phone: string) {
  const res = await fetch('/api/auth/phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, action: 'send' }),
  });
  return res.json();
}

/** Verify phone code and get JWT. */
export async function verifyPhoneCode(phone: string, code: string) {
  const res = await fetch('/api/auth/phone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code, action: 'verify' }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Connect a Solana wallet (login or link to existing account). */
export async function loginWithWallet(walletAddress: string, walletType = 'solana') {
  const res = await fetch('/api/auth/wallet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(hasAuthToken() ? { Authorization: `Bearer ${localStorage.getItem(KEYS.token)}` } : {}),
    },
    body: JSON.stringify({ walletAddress, walletType }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Verify current token with server. Returns full profile or null. */
export async function verifyToken() {
  return apiCall('auth/verify');
}
