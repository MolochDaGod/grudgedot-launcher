/**
 * Grudge Studio Unified Authentication
 *
 * All auth flows produce the same result: a JWT stored as `grudge_auth_token`.
 *
 * Auth calls go DIRECTLY to the Grudge ID service to avoid dependency on
 * the local /api proxy (which may be unavailable in serverless environments).
 *
 * Supported flows:
 *  1. Username/password → id.grudge-studio.com/auth/login → JWT
 *  2. Puter.js sign-in  → id.grudge-studio.com/auth/puter → JWT
 *  3. Auth-gateway redirect (external login page) → JWT via URL param
 *  4. Guest login → id.grudge-studio.com/auth/guest → JWT
 *  5. Discord/Google/GitHub OAuth → id.grudge-studio.com/auth/{provider}
 *  6. Phantom wallet → id.grudge-studio.com/auth/wallet → JWT
 *  7. Phone SMS → id.grudge-studio.com/auth/phone-send|verify → JWT
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

// ── Grudge ID service (direct calls, no local proxy needed) ──
const _ID_BASE = 'https://id.grudge-studio.com';

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

/** Login with username + password → Grudge ID directly. */
export async function loginWithPassword(username: string, password: string) {
  const res = await fetch(`${_ID_BASE}/auth/login`, {
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

/** Register → Grudge ID directly. */
export async function registerAccount(username: string, password: string, email?: string) {
  const res = await fetch(`${_ID_BASE}/auth/register`, {
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
  const res = await fetch(`${_ID_BASE}/auth/puter`, {
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

/** Guest login → Grudge ID directly. */
export async function loginAsGuest(deviceId?: string) {
  const id = deviceId || crypto.randomUUID().slice(0, 12);
  const res = await fetch(`${_ID_BASE}/auth/guest`, {
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

/** Initiate Google OAuth → redirect to Grudge ID. */
export async function loginWithGoogle(returnUrl?: string) {
  const callbackUrl = `${window.location.origin}/auth`;
  const state = encodeURIComponent(returnUrl || '/');
  window.location.href = `${_ID_BASE}/auth/google?redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
}

/** Initiate Discord OAuth → redirect to Grudge ID. */
export async function loginWithDiscord(returnUrl?: string) {
  const callbackUrl = `${window.location.origin}/auth`;
  const state = encodeURIComponent(returnUrl || '/');
  window.location.href = `${_ID_BASE}/auth/discord?redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
}

/** Initiate GitHub OAuth → redirect to Grudge ID. */
export async function loginWithGitHub(returnUrl?: string) {
  const callbackUrl = `${window.location.origin}/auth`;
  const state = encodeURIComponent(returnUrl || '/');
  window.location.href = `${_ID_BASE}/auth/github?redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
}

/** Send phone verification code via SMS. */
export async function sendPhoneCode(phone: string) {
  const res = await fetch(`${_ID_BASE}/auth/phone-send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  return res.json();
}

/** Verify phone code and get JWT. */
export async function verifyPhoneCode(phone: string, code: string) {
  const res = await fetch(`${_ID_BASE}/auth/phone-verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code }),
  });
  const data = await res.json();
  if (data.success && data.token) {
    storeAuth(data);
  }
  return data;
}

/** Connect wallet via Phantom Connect SDK → link to Grudge ID. */
export async function loginWithWallet(walletAddress?: string, walletType = 'solana') {
  // If no address provided, connect via Phantom SDK first
  let address = walletAddress;
  if (!address) {
    const sdk = getPhantomSdk();
    const { addresses } = await sdk.connect({ provider: 'injected' });
    const solAddr = addresses.find((a: any) => a.addressType === 'solana');
    address = solAddr?.address || addresses[0]?.address;
    if (!address) throw new Error('No wallet address returned');
    // Store wallet address for other parts of the app
    localStorage.setItem('grudge_wallet_address', address);
  }
  // Link wallet to Grudge account
  const res = await fetch(`${_ID_BASE}/auth/wallet`, {
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

/** Verify current token with Grudge ID directly. Returns full profile or null. */
export async function verifyToken() {
  const token = localStorage.getItem(KEYS.token);
  if (!token) return null;
  try {
    const res = await fetch(`${_ID_BASE}/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 401) { clearAuth(); return null; }
    return res.json();
  } catch {
    return null;
  }
}
