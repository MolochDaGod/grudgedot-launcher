/**
 * Grudge Studio Unified Authentication
 *
 * All auth flows produce the same result: a JWT stored as `grudge_auth_token`.
 *
 * Auth calls route through the SAME-ORIGIN /api proxy (registered in
 * grudgeAuth.ts) which forwards to id.grudge-studio.com. This avoids
 * CORS issues across all Grudge Studio deployment domains.
 *
 * Supported flows:
 *  1. Username/password → /api/login → JWT
 *  2. Puter.js sign-in  → /api/auth/puter → JWT
 *  3. Auth-gateway redirect (external login page) → JWT via URL param
 *  4. Guest login → /api/guest → JWT
 *  5. Discord/Google/GitHub OAuth → /api/auth/{provider}
 *  6. Phantom wallet → /api/auth/wallet → JWT
 *  7. Phone SMS → /api/auth/phone → JWT
 *
 * Source of truth: id.grudge-studio.com (shared `accounts` table)
 */

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

// Canonical Grudge ID SSO (fleet ONE TRUTH)
const GRUDGE_AUTH_LOGIN_URL = 'https://id.grudge-studio.com/login';
const APP_ID = 'grudgedot';

// ── Public API ──

/** Get current auth data without redirecting. Returns null if not logged in / expired. */
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

/**
 * Build login URL. Prefers Grudge ID SSO (fleet allowlisted redirect_uri).
 * Falls back to in-app /auth for local multi-flow testing.
 */
export function getLoginHref(customReturnUrl?: string): string {
  let ret = customReturnUrl || (typeof window !== 'undefined' ? window.location.href.split('#')[0] : '/');
  try {
    const u = new URL(ret, typeof window !== 'undefined' ? window.location.origin : 'https://grudge.studio');
    ['token', 'sso_token', 'jwt', 'grudge_token', 'launch_token'].forEach((k) =>
      u.searchParams.delete(k),
    );
    ret = u.origin + u.pathname + (u.search || '');
  } catch {
    /* keep ret */
  }
  // Use SSO when not on localhost without proxy; keep /auth as progressive fallback
  if (typeof window !== 'undefined' && /localhost|127\.0\.0\.1/.test(window.location.hostname)) {
    return `/auth?return=${encodeURIComponent(ret)}`;
  }
  return `${GRUDGE_AUTH_LOGIN_URL}?redirect_uri=${encodeURIComponent(ret)}&app=${APP_ID}`;
}

/** Redirect to Grudge ID SSO (or local /auth on localhost). */
export function redirectToLogin(customReturnUrl?: string) {
  window.location.href = getLoginHref(customReturnUrl);
}

// ── Auth API base: same-origin proxy avoids CORS issues across all domains ──
// The proxy in grudgeAuth.ts forwards /api/login etc. → id.grudge-studio.com
const _API = '';  // same-origin, e.g. /api/login

// ── Phantom Connect SDK (lazy-loaded singleton) ──
import { BrowserSDK, AddressType } from '@phantom/browser-sdk';
const PHANTOM_APP_ID = '656b4ef2-7acc-44fe-bec7-4b288cfdd2e9';
let _phantomSdk: InstanceType<typeof BrowserSDK> | null = null;

export function getPhantomSdk() {
  if (!_phantomSdk) {
    _phantomSdk = new BrowserSDK({
      providers: ['google', 'phantom', 'injected', 'deeplink'],
      addressTypes: [AddressType.solana, AddressType.ethereum],
      appId: PHANTOM_APP_ID,
      authOptions: {
        authUrl: 'https://connect.phantom.app/login',
        redirectUrl: window.location.origin + '/',
      },
    });
  }
  return _phantomSdk;
}

/** Logout — invalidates JWT server-side, clears tokens, redirects to auth page. */
export function logout() {
  const token = localStorage.getItem(KEYS.token);
  if (token) {
    fetch(`${_API}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    }).catch(() => {});
  }
  clearAuth();
  window.location.href = '/auth';
}

/** Logout without redirect (for switching accounts, etc.) */
export function logoutSilent() {
  const token = localStorage.getItem(KEYS.token);
  if (token) {
    fetch(`${_API}/api/auth/logout`, {
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

/** Login with username + password via same-origin proxy. */
export async function loginWithPassword(username: string, password: string) {
  const res = await fetch(`${_API}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: username, password }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Register via same-origin proxy. */
export async function registerAccount(username: string, password: string, email?: string) {
  const res = await fetch(`${_API}/api/register`, {
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
  const res = await fetch(`${_API}/api/auth/puter`, {
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

/** Guest login via same-origin proxy. */
export async function loginAsGuest(deviceId?: string) {
  const id = deviceId || crypto.randomUUID().slice(0, 12);
  const res = await fetch(`${_API}/api/guest`, {
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

/** Initiate Google OAuth → goes through same-origin server callback. */
export async function loginWithGoogle(returnUrl?: string) {
  const state = encodeURIComponent(returnUrl || '/');
  // Fetch the OAuth URL from our proxy, which builds the correct redirect_uri
  try {
    const res = await fetch(`${_API}/api/auth/google?state=${state}`);
    const data = await res.json();
    if (data.url) { window.location.href = data.url; return; }
  } catch {}
  // Fallback: direct to server endpoint which will redirect
  window.location.href = `${_API}/api/auth/google?state=${state}`;
}

/** Initiate Discord OAuth → goes through same-origin server callback. */
export async function loginWithDiscord(returnUrl?: string) {
  const state = encodeURIComponent(returnUrl || '/');
  try {
    const res = await fetch(`${_API}/api/auth/discord?state=${state}`);
    const data = await res.json();
    if (data.url) { window.location.href = data.url; return; }
  } catch {}
  window.location.href = `${_API}/api/auth/discord?state=${state}`;
}

/** Initiate GitHub OAuth → goes through same-origin server callback. */
export async function loginWithGitHub(returnUrl?: string) {
  const state = encodeURIComponent(returnUrl || '/');
  try {
    const res = await fetch(`${_API}/api/auth/github?state=${state}`);
    const data = await res.json();
    if (data.url) { window.location.href = data.url; return; }
  } catch {}
  window.location.href = `${_API}/api/auth/github?state=${state}`;
}

/** Send phone verification code via SMS. */
export async function sendPhoneCode(phone: string) {
  const res = await fetch(`${_API}/api/auth/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'send', phone }),
  });
  return res.json();
}

/** Verify phone code and get JWT. */
export async function verifyPhoneCode(phone: string, code: string) {
  const res = await fetch(`${_API}/api/auth/phone`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'verify', phone, code }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Connect wallet via Phantom Connect SDK → link to Grudge ID. */
export async function loginWithWallet(walletAddress?: string, walletType = 'solana') {
  let address = walletAddress;
  if (!address) {
    const sdk = getPhantomSdk();
    const { addresses } = await sdk.connect({ provider: 'injected' });
    const solAddr = addresses.find((a: any) => a.addressType === 'solana');
    address = solAddr?.address || addresses[0]?.address;
    if (!address) throw new Error('No wallet address returned');
    localStorage.setItem('grudge_wallet_address', address);
  }
  const res = await fetch(`${_API}/api/auth/wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(hasAuthToken() ? { Authorization: `Bearer ${localStorage.getItem(KEYS.token)}` } : {}),
    },
    body: JSON.stringify({ walletAddress: address, walletType }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Connect via Phantom embedded wallet (Google, Phantom login, etc.) */
export async function loginWithPhantomConnect(provider: 'google' | 'phantom' | 'injected' = 'phantom') {
  const sdk = getPhantomSdk();
  const { addresses } = await sdk.connect({ provider });
  const solAddr = addresses.find((a: any) => a.addressType === 'solana');
  const address = solAddr?.address || addresses[0]?.address;
  if (!address) throw new Error('No wallet address returned');
  localStorage.setItem('grudge_wallet_address', address);
  // Link to Grudge account
  return loginWithWallet(address);
}

/** Verify current token via same-origin proxy. Returns full profile or null. */
export async function verifyToken() {
  const token = localStorage.getItem(KEYS.token);
  if (!token) return null;
  try {
    const res = await fetch(`${_API}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { clearAuth(); return null; }
    return res.json();
  } catch {
    return null;
  }
}
