import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useEffect, useCallback } from "react";
import { getAuthData } from "@/lib/auth";

export interface AuthUser {
  id: string;
  grudgeId: string;
  username: string;
  role?: string;
  isPremium?: boolean;
  // Profile fields (may come from Grudge ID backend)
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt?: string;
}

/**
 * Read user info directly from localStorage (instant, no API call).
 * This is the primary source — set by auth.ts storeAuth() during any login flow.
 */
function getLocalUser(): AuthUser | null {
  const auth = getAuthData();
  if (!auth?.token) return null;
  return {
    id: auth.userId || auth.grudgeId || "",
    grudgeId: auth.grudgeId || "",
    username: auth.username || "Player",
  };
}

/**
 * useAuth — returns the current JWT-authenticated user.
 *
 * Reads from localStorage first (instant) so every page/tab has user data
 * immediately. Then optionally enriches from /api/auth/user for role/premium.
 * Syncs across tabs via the `storage` event.
 */
export function useAuth() {
  const qc = useQueryClient();
  const hasToken = typeof localStorage !== "undefined" && !!localStorage.getItem("grudge_auth_token");

  // Primary: instant local user data (always available if token exists)
  const localUser = hasToken ? getLocalUser() : null;

  // Secondary: enrich with server data (role, premium status)
  const { data: serverUser, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    retry: 1,
    enabled: hasToken,
    staleTime: 5 * 60 * 1000, // re-verify every 5 min, not Infinity
  });

  // Merge: server data wins for enriched fields, local data as fallback
  const user = hasToken
    ? (serverUser
        ? { ...localUser, ...serverUser }
        : localUser)
    : null;

  // Sync across tabs: when another tab logs in/out, update this tab
  const handleStorageChange = useCallback((e: StorageEvent) => {
    if (e.key === "grudge_auth_token" || e.key === "grudge_username") {
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    }
  }, [qc]);

  useEffect(() => {
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [handleStorageChange]);

  return {
    user,
    isLoading: hasToken ? (isLoading && !localUser) : false,
    isAuthenticated: !!user,
    error,
  };
}
