import { useEffect } from 'react';
import {
  captureAuthCallback,
  getAuthData,
  verifyToken,
  logoutSilent,
} from '@/lib/auth';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard — token capture & background validation for GrudgeDot.
 *
 * NO hard redirect to SSO. GrudgeDot is publicly accessible; auth is
 * optional/progressive. If a token arrives via any source it is captured
 * and validated silently. The app renders immediately regardless.
 *
 * Token sources (priority order):
 *   1. URL hash fragment  #token=…  (cleanest — stays out of server logs)
 *   2. URL query param    ?token=…  (grudge-studio launcher injects this)
 *   3. localStorage grudge_auth_token (persisted from a prior session)
 *   4. SSO cross-service  ?sso_token=… (id.grudge-studio.com hand-off)
 *
 * On token expiry or server-side invalidation the token is cleared and
 * a 'grudge:auth:expired' event is dispatched so UI components can
 * reflect the logged-out state without forcing a navigation.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  useEffect(() => {
    // Capture any token present in the URL → persists to localStorage
    captureAuthCallback();

    const authData = getAuthData();
    if (!authData) return; // No token — app runs in unauthenticated mode

    // Background server verification — revoke stale tokens silently
    verifyToken()
      .then((profile) => {
        if (!profile) {
          logoutSilent();
          window.dispatchEvent(new CustomEvent('grudge:auth:expired'));
        }
      })
      .catch(() => {
        // Network error — keep user signed in (offline-friendly)
      });
  }, []);

  // Re-validate on tab focus — clear state on failure, no redirect
  useEffect(() => {
    const onFocus = () => {
      const current = getAuthData();
      if (!current) return;
      verifyToken()
        .then((profile) => {
          if (!profile) {
            logoutSilent();
            window.dispatchEvent(new CustomEvent('grudge:auth:expired'));
          }
        })
        .catch(() => {});
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  // Render immediately — no loading gate, no auth wall
  return <>{children}</>;
}

