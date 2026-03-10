import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  grudgeId: string;
  username: string;
  role?: string;
  isPremium?: boolean;
}

/**
 * useAuth — returns the current JWT-authenticated user.
 * Uses returnNull on 401 so unauthenticated state is handled gracefully
 * instead of throwing and breaking the UI.
 */
export function useAuth() {
  const hasToken = typeof localStorage !== "undefined" && !!localStorage.getItem("grudge_auth_token");

  const { data: user, isLoading, error } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn<AuthUser | null>({ on401: "returnNull" }),
    retry: false,
    enabled: hasToken,
  });

  return {
    user: hasToken ? user : null,
    isLoading: hasToken ? isLoading : false,
    isAuthenticated: !!user,
    error,
  };
}
