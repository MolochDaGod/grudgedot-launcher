/**
 * grudgeConfig.ts — ONE TRUTH service URLs for grudgeDot launcher.
 *
 * Aligned with GrudgeBuilder/shared/fleet/manifest.ts FLEET_URLS.
 * Never point game state at api.grudge-studio.com (retired split-brain).
 */

const env = (import.meta as any).env ?? {};

/** Grudge ID — canonical SSO /login?redirect_uri= */
export const AUTH_GATEWAY: string =
  env.VITE_AUTH_GATEWAY_URL || "https://id.grudge-studio.com";

/**
 * Game data SSOT — Railway Postgres (characters, account bag, islands, wallet).
 * Prefer same-origin `/api` (Vercel/Pages rewrites) in production.
 */
export const GAME_API: string =
  env.VITE_API_URL ||
  (typeof window !== "undefined" ? "" : "https://grudge-api-production-0d46.up.railway.app");

/** Absolute Railway origin when you must bypass same-origin rewrites. */
export const GAME_DATA_ABSOLUTE: string =
  env.VITE_GAME_DATA_URL || "https://grudge-api-production-0d46.up.railway.app";

export const WS_URL: string =
  env.VITE_WS_URL || "wss://grudge-api-production-0d46.up.railway.app";

export const ASSETS_CDN: string =
  env.VITE_ASSETS_URL || "https://assets.grudge-studio.com";

/** Grudge Drive / Velocity trailer — served from R2 via assets CDN */
export const GRUDGE_DRIVE_VIDEO = `${ASSETS_CDN}/game-assets/videos/grudgedrive.mp4`;

/** Cinematic cutscene between Velocity race phases */
export const GRUDGE_DRIVE_SCENE_VIDEO = `${ASSETS_CDN}/game-assets/videos/grudge-drive-scene.mp4`;

/** Open + loading reel */
export const GRUDGE_DRIVE_LOADING_VIDEO = `${ASSETS_CDN}/game-assets/videos/grudge-drive-loading.mp4`;

export const AI_GATEWAY: string =
  env.VITE_AI_URL || "https://ai.grudge-studio.com";

export const BADGE_READER: string =
  env.VITE_BADGE_READER_URL || "https://edge.grudge-studio.com";

/** ObjectStore JSON definitions (recipes, items, races) — not character SSOT */
export const OBJECTSTORE: string =
  env.VITE_OBJECTSTORE_URL || "https://objectstore.grudge-studio.com/api/v1";

export const WARLORDS_URL = "https://grudgewarlords.com";
export const CRAFTING_URL = "https://grudge-crafting.puter.site";
export const CHARACTER_STUDIO_URL = "https://character.grudge-studio.com";
export const FORGE_URL = "https://forge.grudge-studio.com";
export const FLEET_MAP_URL = "https://fleet.grudge-studio.com";
export const LAUNCHER_URL = "https://launcher.grudge-studio.com";

export const STORAGE_KEYS = [
  "grudge_auth_token",
  "grudge_session_token",
  "grudge.token",
  "sso_token",
  "grudge_user_id",
  "grudge_id",
  "grudge_account_id",
  "grudge_username",
  "grudge_user",
  "grudge-session",
  "grudge_auth_user",
  "grudge_puter_guest_id",
  "grudge_device_id",
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
    document.cookie.split(";").forEach((c) => {
      const name = c.replace(/^ +/, "").split("=")[0];
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
  let token = "";
  try {
    token =
      localStorage.getItem("grudge_auth_token") ||
      localStorage.getItem("grudge_session_token") ||
      localStorage.getItem("grudge.token") ||
      "";
  } catch {
    /* ignore */
  }
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

/** Canonical Grudge ID login (allowlisted return hosts include *.grudge-studio.com). */
export function buildGrudgeLoginUrl(returnUrl?: string): string {
  const ret =
    returnUrl ||
    (typeof window !== "undefined"
      ? window.location.origin + window.location.pathname
      : LAUNCHER_URL);
  return `${AUTH_GATEWAY.replace(/\/$/, "")}/login?redirect_uri=${encodeURIComponent(ret)}`;
}

export default {
  AUTH_GATEWAY,
  GAME_API,
  GAME_DATA_ABSOLUTE,
  WS_URL,
  ASSETS_CDN,
  AI_GATEWAY,
  BADGE_READER,
  OBJECTSTORE,
  WARLORDS_URL,
  CRAFTING_URL,
  CHARACTER_STUDIO_URL,
  FORGE_URL,
  FLEET_MAP_URL,
  LAUNCHER_URL,
  STORAGE_KEYS,
  purgeGrudgeClientState,
  authHeaders,
  buildGrudgeLoginUrl,
};
