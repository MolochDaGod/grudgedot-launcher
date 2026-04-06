import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { captureAuthCallback, getAuthData, verifyToken, logoutSilent, type AuthData } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard component that checks for authentication before rendering children.
 * - Captures OAuth callback tokens from URL
 * - Checks for non-expired JWT in localStorage
 * - Verifies token with server (async, non-blocking after first paint)
 * - Redirects unauthenticated users to /auth
 * - Navigates to /onboarding on first visit
 * - Re-validates token when the tab regains focus
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();

  const redirectToAuth = useCallback(() => {
    const returnUrl = encodeURIComponent(window.location.pathname);
    navigate(`/auth?return=${returnUrl}`, { replace: true });
  }, [navigate]);

  // ── Initial check on mount ──
  useEffect(() => {
    captureAuthCallback();

    const authData = getAuthData(); // already rejects expired tokens
    if (!authData) {
      redirectToAuth();
      setLoading(false);
      return;
    }

    // Optimistic: render immediately with the local token
    setAuth(authData);
    setLoading(false);

    // Background verify with server — if token is actually invalid, boot the user
    verifyToken().then((profile) => {
      if (!profile) {
        logoutSilent();
        redirectToAuth();
      }
    }).catch(() => {
      // Network error — keep user logged in (offline-friendly)
    });

    // Onboarding redirect
    const onboarded = localStorage.getItem('grudge_onboarded');
    if (!onboarded && !window.location.pathname.startsWith('/onboarding')) {
      navigate('/onboarding');
    }
  }, [navigate, redirectToAuth]);

  // ── Re-validate when tab regains focus ──
  useEffect(() => {
    const onFocus = () => {
      const current = getAuthData();
      if (!current) {
        redirectToAuth();
        return;
      }
      // Lightweight server verify in background
      verifyToken().then((profile) => {
        if (!profile) {
          logoutSilent();
          redirectToAuth();
        }
      }).catch(() => {});
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [redirectToAuth]);

  if (loading || !auth) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <p className="text-lg font-semibold">Grudge Warlords</p>
            <p className="text-sm text-muted-foreground">Loading your battle station...</p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
