/**
 * grudgeConfig.ts — The single source of truth for all Grudge Studio service URLs.
 *
 * Mirror of the file by the same name in GrudgeBuilder and Warlord-Crafting-Suite.
 * Keep these three copies in sync.
 */

const env = (import.meta as any).env ?? {};

export const AUTH_GATEWAY: string =
  env.VITE_AUTH_GATEWAY_URL || 'https://id.grudge-studio.com';

export const GAME_API: string =
  env.VITE_API_URL || 'https://api.grudge-studio.com';

export const WS_URL: string =
  env.VITE_WS_URL || 'wss://api.grudge-studio.com';

export const ASSETS_CDN: string =
  env.VITE_ASSETS_URL || 'https://assets.grudge-studio.com';

/** Grudge Drive / Velocity trailer — served from R2 via assets CDN */
export const GRUDGE_DRIVE_VIDEO = `${ASSETS_CDN}/game-assets/videos/grudgedrive.mp4`;

export const AI_GATEWAY: string =
  env.VITE_AI_URL || 'https://ale.grudge-studio.com';

export const BADGE_READER: string =
  env.VITE_BADGE_READER_URL || 'https://edge.grudge-studio.com';

export const OBJECTSTORE: string =
  env.VITE_OBJECTSTORE_URL || 'https://molochdagod.github.io/ObjectStore/api/v1';

export const STORAGE_KEYS = [
  'grudge_auth_token',
  'grudge_user_id',
  'grudge_id',
  'grudge_username',
  'grudge_user',
  'grudge-session',
  'grudge_auth_user',
  'grudge_session_token',
  'grudge_puter_guest_id',
  'grudge_device_id',
] as const;

export function purgeGrudgeClientState(): void {
  try {
    STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && /^grudge[_-]/i.test(k)) localStorage.removeItem(k);
    }
    sessionStorage.clear();
  } catch {
    /* ignore */
  }
  try {
    document.cookie.split(';').forEach((c) => {
      const name = c.replace(/^ +/, '').split('=')[0];
      if (!name) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.grudge-studio.com`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.grudgewarlords.com`;
    });
  } catch {
    /* ignore */
  }
}

export function authHeaders(): Record<string, string> {
  const token =
    (typeof localStorage !== 'undefined' && localStorage.getItem('grudge_auth_token')) || '';
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

export default {
  AUTH_GATEWAY,
  GAME_API,
  WS_URL,
  ASSETS_CDN,
  AI_GATEWAY,
  BADGE_READER,
  OBJECTSTORE,
  STORAGE_KEYS,
  purgeGrudgeClientState,
  authHeaders,
};
