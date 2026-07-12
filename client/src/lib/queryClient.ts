import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { isTokenExpired, redirectToLogin } from "@/lib/auth";

const AUTH_TOKEN_KEY = "grudge_auth_token";

/** Build headers with JWT Authorization if a non-expired token exists. */
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...extra };
  const token = typeof localStorage !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null;
  if (token && !isTokenExpired(token)) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

/**
 * Handle 401 globally: clear stale auth data and redirect to the Grudge ID SSO.
 * Debounced so multiple parallel 401s don't cause multiple redirects.
 */
let redirecting = false;
function handleGlobal401() {
  if (redirecting) return;
  redirecting = true;
  // Clear all auth keys
  ['grudge_auth_token', 'grudge_id', 'grudge_user_id', 'grudge_username', 'grudge_puter_auth', 'grudge_auth_provider']
    .forEach((k) => localStorage.removeItem(k));
  redirectToLogin(window.location.href);
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: authHeaders(data ? { "Content-Type": "application/json" } : undefined),
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401 && !url.includes('/auth/')) {
    handleGlobal401();
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: authHeaders(),
      credentials: "include",
    });

    if (res.status === 401) {
      if (unauthorizedBehavior === "returnNull") return null;
      // For "throw" behavior on non-auth endpoints, trigger global redirect
      const url = queryKey.join("/");
      if (!url.includes('/auth/')) handleGlobal401();
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 5 * 60 * 1000, // 5 minutes — allows auth & data to refresh
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
