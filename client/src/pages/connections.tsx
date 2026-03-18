import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Server,
  ShieldCheck,
  ShieldAlert,
  UserCircle2,
  Wallet,
  MessageSquare,
  Code2,
  Link2,
  ExternalLink,
} from "lucide-react";

type ProbeState = "online" | "auth" | "offline";

interface ProbeResult {
  name: string;
  url: string;
  state: ProbeState;
  statusCode: number | null;
  detail: string;
}

interface HealthResponse {
  status?: string;
  service?: string;
  timestamp?: string;
  env?: Record<string, unknown>;
}

interface AccountResponse {
  account?: {
    grudgeId?: string;
    username?: string;
    displayName?: string;
    email?: string;
    gold?: number;
    gbuxBalance?: number;
    walletAddress?: string;
    walletType?: string;
  };
  error?: string;
}

interface WalletResponse {
  wallet?: {
    walletAddress?: string | null;
    walletType?: string | null;
    crossmintWalletId?: string | null;
  };
  balances?: {
    gold?: number;
    gbux?: number;
  };
  error?: string;
}

function getToken(): string | null {
  return localStorage.getItem("grudge_auth_token");
}

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) return { "Content-Type": "application/json" };
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function probeEndpoint(name: string, url: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, { headers: authHeaders() });
    const statusCode = res.status;
    if (res.ok) {
      return { name, url, state: "online", statusCode, detail: "Connected" };
    }
    if (statusCode === 401 || statusCode === 403) {
      return {
        name,
        url,
        state: "auth",
        statusCode,
        detail: "Reachable (auth required)",
      };
    }
    return {
      name,
      url,
      state: "offline",
      statusCode,
      detail: `Error ${statusCode}`,
    };
  } catch {
    return { name, url, state: "offline", statusCode: null, detail: "Unreachable" };
  }
}

function StateBadge({ state, statusCode }: { state: ProbeState; statusCode: number | null }) {
  if (state === "online") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Online{statusCode ? ` · ${statusCode}` : ""}</Badge>;
  }
  if (state === "auth") {
    return <Badge className="bg-amber-600 hover:bg-amber-600 text-white">Auth Required{statusCode ? ` · ${statusCode}` : ""}</Badge>;
  }
  return <Badge variant="destructive">Offline{statusCode ? ` · ${statusCode}` : ""}</Badge>;
}

export default function ConnectionsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const healthQuery = useQuery({
    queryKey: ["connections", "health"],
    queryFn: async () => {
      const res = await fetch("/api/health", { headers: { "Content-Type": "application/json" } });
      if (!res.ok) return {} as HealthResponse;
      return res.json() as Promise<HealthResponse>;
    },
    refetchInterval: 30000,
  });

  const probesQuery = useQuery({
    queryKey: ["connections", "probes"],
    queryFn: async () => {
      const checks = await Promise.all([
        probeEndpoint("App API", "/api/health"),
        probeEndpoint("Grudge Game API Proxy", "/api/grudge/game/ai/llm/status"),
        probeEndpoint("Grudge Account API Proxy", "/api/grudge/account/sessions"),
        probeEndpoint("Grudge ID API Proxy", "/api/grudge/id/identity/me"),
      ]);
      return checks;
    },
    refetchInterval: 30000,
  });

  const accountQuery = useQuery({
    queryKey: ["connections", "account"],
    queryFn: async () => {
      const res = await fetch("/api/account/me", { headers: authHeaders() });
      if (!res.ok) return null;
      const data = await res.json() as AccountResponse;
      return data.account || null;
    },
  });

  const walletQuery = useQuery({
    queryKey: ["connections", "wallet"],
    queryFn: async () => {
      const res = await fetch("/api/account/wallet", { headers: authHeaders() });
      if (!res.ok) return null;
      return res.json() as Promise<WalletResponse>;
    },
  });

  const ensureWalletMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/account/wallet/ensure", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({} as Record<string, unknown>));
      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Wallet ensure failed";
        throw new Error(message);
      }
      return data;
    },
    onSuccess: () => {
      toast({ title: "Wallet Ready", description: "Account wallet connection is confirmed." });
      accountQuery.refetch();
      walletQuery.refetch();
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", title: "Wallet Error", description: err.message });
    },
  });

  const isLoading = probesQuery.isLoading || healthQuery.isLoading;
  const probes = probesQuery.data || [];
  const allOnline = probes.length > 0 && probes.every((p) => p.state !== "offline");
  const account = accountQuery.data;
  const wallet = walletQuery.data?.wallet;
  const balances = walletQuery.data?.balances;
  const backendEnv = healthQuery.data?.env;
  const backendUrl = typeof backendEnv?.backendUrl === "string" ? backendEnv.backendUrl : "Unknown";

  return (
    <div className="min-h-full p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl border border-stone-700 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Link2 className="h-6 w-6 text-amber-400" />
                Account & Server Connections
              </h1>
              <p className="text-sm text-muted-foreground">
                Grudge backend link status, account bridge, and AI access tools.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="border-stone-600"
                onClick={() => {
                  probesQuery.refetch();
                  healthQuery.refetch();
                  accountQuery.refetch();
                  walletQuery.refetch();
                }}
                disabled={isLoading}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Live Connection Probes
              </CardTitle>
              <CardDescription>
                Verifies the deployed app can reach core Grudge services through `/api/*` routes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {probes.map((probe) => (
                <div key={probe.name} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{probe.name}</p>
                      <p className="text-xs text-muted-foreground">{probe.url}</p>
                    </div>
                    <StateBadge state={probe.state} statusCode={probe.statusCode} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{probe.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {allOnline ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <ShieldAlert className="h-5 w-5 text-amber-500" />}
                Backend Status
              </CardTitle>
              <CardDescription>Overall service health</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Service:</span>{" "}
                <span className="font-medium">{healthQuery.data?.service || "GDevelop Assistant"}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Backend URL:</span>{" "}
                <span className="font-medium break-all">{backendUrl}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Health:</span>{" "}
                <Badge className={allOnline ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-amber-600 hover:bg-amber-600 text-white"}>
                  {allOnline ? "Connected" : "Needs Attention"}
                </Badge>
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5" />
                Account Backend Tool
              </CardTitle>
              <CardDescription>
                Connected account details from `/api/account/*`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {account ? (
                <>
                  <p className="text-sm"><span className="text-muted-foreground">Username:</span> <span className="font-medium">{account.username || account.displayName || "Player"}</span></p>
                  <p className="text-sm"><span className="text-muted-foreground">Grudge ID:</span> <span className="font-medium">{account.grudgeId || "Unavailable"}</span></p>
                  <p className="text-sm"><span className="text-muted-foreground">Email:</span> <span className="font-medium">{account.email || "Not set"}</span></p>
                  <p className="text-sm"><span className="text-muted-foreground">Gold:</span> <span className="font-medium">{(account.gold ?? balances?.gold ?? 0).toLocaleString()}</span></p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Sign in first to load account data from the backend.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet & Server Link
              </CardTitle>
              <CardDescription>
                Ensure your account has a backend wallet and active server association.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">
                <span className="text-muted-foreground">Wallet:</span>{" "}
                <span className="font-medium break-all">{wallet?.walletAddress || "Not connected"}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Type:</span>{" "}
                <span className="font-medium">{wallet?.walletType || "N/A"}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">GBUX:</span>{" "}
                <span className="font-medium">{(balances?.gbux ?? 0).toLocaleString()}</span>
              </p>
              <Button
                onClick={() => ensureWalletMutation.mutate()}
                disabled={ensureWalletMutation.isPending}
                className="w-full"
              >
                {ensureWalletMutation.isPending ? "Connecting..." : "Ensure Account Wallet Connection"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>AI Chat & Code Agents</CardTitle>
            <CardDescription>
              Open assistant tools directly after backend/account connection is healthy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/")}>
                <MessageSquare className="mr-2 h-4 w-4" />
                Open AI Chat
              </Button>
              <Button variant="secondary" onClick={() => navigate("/?tool=code-generate")}>
                <Code2 className="mr-2 h-4 w-4" />
                Open Code Agent
              </Button>
              <Button variant="outline" onClick={() => window.open("https://gdevelop-assistant-git-main-grudgenexus.vercel.app/", "_blank")}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Deployed App
              </Button>
            </div>
            <Separator className="my-4" />
            <p className="text-xs text-muted-foreground">
              If probes show offline, verify Vercel environment values for `GRUDGE_GAME_API`, `GRUDGE_ACCOUNT_API`,
              `GRUDGE_ID_API`, `GRUDGE_LAUNCHER_API`, and `GRUDGE_AUTH_URL`.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
