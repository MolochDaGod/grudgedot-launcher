import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { getAuthData } from "@/lib/auth";

export interface AuthUser {
  id: string;
  grudgeId: string;
  username: string;
  role?: string;
  isPremium?: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  createdAt?: string;
}

/**
 * useAuth — returns the current JWT-authenticated user.
 * Uses returnNull on 401 so unauthenticated state is handled gracefully
 * instead of throwing and breaking the UI.
 *
 * - Uses getAuthData() which automatically rejects expired tokens
 * - Re-fetches on window focus so returning to the tab picks up session changes
 * - 5 min staleTime to avoid excessive server calls
 */
export function useAuth() {
  // getAuthData() rejects expired tokens (clears localStorage)
  const authData = typeof localStorage !== "undefined" ? getAuthData() : null;
  const hasToken = !!authData;

  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    retry: false,
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,         // 5 minutes
    refetchOnWindowFocus: true,        // re-validate when tab regains focus
  });

  return {
    user: hasToken ? user : null,
    isLoading: hasToken ? isLoading : false,
    isAuthenticated: !!user,
    error,
  };
}
