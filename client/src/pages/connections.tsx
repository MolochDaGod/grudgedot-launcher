import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw, Server, ShieldCheck, ShieldAlert, UserCircle2, Wallet,
  MessageSquare, Code2, Link2, ExternalLink, Play, Square, RotateCw,
  Rocket, ScrollText, AlertTriangle, Clock, Database, Container,
  BookOpen, Zap, Activity,
} from "lucide-react";

type ProbeState = "online" | "auth" | "offline";
interface ProbeResult { name: string; url: string; state: ProbeState; statusCode: number | null; detail: string; }
interface HealthResponse { status?: string; service?: string; timestamp?: string; env?: Record<string, unknown>; }
interface AccountResponse { account?: { grudgeId?: string; username?: string; displayName?: string; email?: string; gold?: number; gbuxBalance?: number; walletAddress?: string; walletType?: string; }; error?: string; }
interface WalletResponse { wallet?: { walletAddress?: string | null; walletType?: string | null; crossmintWalletId?: string | null; }; balances?: { gold?: number; gbux?: number; }; error?: string; }
interface CoolifyApp { uuid: string; name: string; description?: string; fqdn?: string; status?: string; git_repository?: string; git_branch?: string; created_at?: string; updated_at?: string; }
interface CoolifyServer { uuid: string; name: string; description?: string; ip?: string; is_reachable?: boolean; created_at?: string; }

function getToken(): string | null { return localStorage.getItem("grudge_auth_token"); }
function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) return { "Content-Type": "application/json" };
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function probeEndpoint(name: string, url: string): Promise<ProbeResult> {
  try {
    const res = await fetch(url, { headers: authHeaders() });
    const sc = res.status;
    if (res.ok) return { name, url, state: "online", statusCode: sc, detail: "Connected" };
    if (sc === 401 || sc === 403) return { name, url, state: "auth", statusCode: sc, detail: "Reachable (auth required)" };
    return { name, url, state: "offline", statusCode: sc, detail: `Error ${sc}` };
  } catch { return { name, url, state: "offline", statusCode: null, detail: "Unreachable" }; }
}

function StateBadge({ state, statusCode }: { state: ProbeState; statusCode: number | null }) {
  if (state === "online") return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Online{statusCode ? ` · ${statusCode}` : ""}</Badge>;
  if (state === "auth") return <Badge className="bg-amber-600 hover:bg-amber-600 text-white">Auth Required{statusCode ? ` · ${statusCode}` : ""}</Badge>;
  return <Badge variant="destructive">Offline{statusCode ? ` · ${statusCode}` : ""}</Badge>;
}

function AppStatusBadge({ status }: { status?: string }) {
  const s = (status || "unknown").toLowerCase();
  if (s === "running") return <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">Running</Badge>;
  if (s === "stopped" || s === "exited") return <Badge variant="destructive">Stopped</Badge>;
  if (s.includes("deploy") || s.includes("build")) return <Badge className="bg-blue-600 hover:bg-blue-600 text-white">Deploying</Badge>;
  if (s.includes("restart")) return <Badge className="bg-amber-600 hover:bg-amber-600 text-white">Restarting</Badge>;
  return <Badge variant="secondary">{status || "Unknown"}</Badge>;
}

const COOLIFY_BEST_PRACTICES = [
  { title: "Use Health Checks", detail: "Configure health checks for every app so Coolify auto-restarts unhealthy containers. Set interval=30s, timeout=5s, retries=3." },
  { title: "Enable Auto-Deploy on Push", detail: "Connect GitHub webhooks so pushing to main triggers a rebuild. Avoid manual deploys for production services." },
  { title: "Set Resource Limits", detail: "Limit each container's CPU and memory (e.g. 1 CPU, 512MB) to prevent one service from starving others on the VPS." },
  { title: "Schedule Daily Restarts", detail: "Use a cron job on the VPS to restart all containers daily at a low-traffic time (e.g. 5am CST) to clear memory leaks." },
  { title: "Backup Volumes", detail: "PostgreSQL data volumes should be backed up via pg_dump on a cron schedule. Coolify supports S3 backup destinations." },
  { title: "Use Environment Variables", detail: "Never hardcode secrets. Store them in Coolify's environment panel per-app. Rotate keys quarterly." },
  { title: "Monitor Disk Usage", detail: "Docker images and logs fill disks fast. Run `docker system prune -f` weekly via cron, or enable Coolify's auto-cleanup." },
  { title: "Separate DB from App Servers", detail: "If possible, run PostgreSQL on a separate Coolify server or managed DB to isolate failures and simplify scaling." },
];

export default function ConnectionsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string>("50");

  const healthQuery = useQuery({ queryKey: ["connections", "health"], queryFn: async () => { const res = await fetch("/api/health", { headers: { "Content-Type": "application/json" } }); if (!res.ok) return {} as HealthResponse; return res.json() as Promise<HealthResponse>; }, refetchInterval: 30000 });
  const probesQuery = useQuery({ queryKey: ["connections", "probes"], queryFn: async () => Promise.all([ probeEndpoint("App API", "/api/health"), probeEndpoint("Grudge Game API Proxy", "/api/grudge/game/ai/llm/status"), probeEndpoint("Grudge Account API Proxy", "/api/grudge/account/sessions"), probeEndpoint("Grudge ID API Proxy", "/api/grudge/id/identity/me") ]), refetchInterval: 30000 });
  const accountQuery = useQuery({ queryKey: ["connections", "account"], queryFn: async () => { const res = await fetch("/api/account/me", { headers: authHeaders() }); if (!res.ok) return null; const data = await res.json() as AccountResponse; return data.account || null; } });
  const walletQuery = useQuery({ queryKey: ["connections", "wallet"], queryFn: async () => { const res = await fetch("/api/account/wallet", { headers: authHeaders() }); if (!res.ok) return null; return res.json() as Promise<WalletResponse>; } });
  const ensureWalletMutation = useMutation({ mutationFn: async () => { const res = await fetch("/api/account/wallet/ensure", { method: "POST", headers: authHeaders(), body: JSON.stringify({}) }); const data = await res.json().catch(() => ({} as Record<string, unknown>)); if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Wallet ensure failed"); return data; }, onSuccess: () => { toast({ title: "Wallet Ready", description: "Account wallet connection is confirmed." }); accountQuery.refetch(); walletQuery.refetch(); }, onError: (err: Error) => { toast({ variant: "destructive", title: "Wallet Error", description: err.message }); } });

  const coolifyStatusQuery = useQuery({ queryKey: ["coolify", "status"], queryFn: async () => { const res = await fetch("/api/coolify/status"); return res.json() as Promise<{ configured: boolean; url: string | null }>; } });
  const coolifyServersQuery = useQuery({ queryKey: ["coolify", "servers"], queryFn: async () => { const res = await fetch("/api/coolify/servers"); if (!res.ok) return []; return res.json() as Promise<CoolifyServer[]>; }, enabled: coolifyStatusQuery.data?.configured === true, refetchInterval: 60000 });
  const coolifyAppsQuery = useQuery({ queryKey: ["coolify", "applications"], queryFn: async () => { const res = await fetch("/api/coolify/applications"); if (!res.ok) return []; return res.json() as Promise<CoolifyApp[]>; }, enabled: coolifyStatusQuery.data?.configured === true, refetchInterval: 30000 });
  const coolifyServicesQuery = useQuery({ queryKey: ["coolify", "services"], queryFn: async () => { const res = await fetch("/api/coolify/services"); if (!res.ok) return []; return res.json() as Promise<any[]>; }, enabled: coolifyStatusQuery.data?.configured === true, refetchInterval: 60000 });
  const coolifyDbQuery = useQuery({ queryKey: ["coolify", "databases"], queryFn: async () => { const res = await fetch("/api/coolify/databases"); if (!res.ok) return []; return res.json() as Promise<any[]>; }, enabled: coolifyStatusQuery.data?.configured === true, refetchInterval: 60000 });
  const logsQuery = useQuery({ queryKey: ["coolify", "logs", selectedApp, logLines], queryFn: async () => { if (!selectedApp) return null; const res = await fetch(`/api/coolify/applications/${selectedApp}/logs?lines=${logLines}`); if (!res.ok) return null; return res.json(); }, enabled: !!selectedApp && coolifyStatusQuery.data?.configured === true, refetchInterval: 10000 });

  const restartAppMutation = useMutation({ mutationFn: async (uuid: string) => { const res = await fetch(`/api/coolify/applications/${uuid}/restart`, { method: "POST" }); if (!res.ok) throw new Error("Restart failed"); return res.json(); }, onSuccess: () => { toast({ title: "Restart Triggered", description: "Application is restarting..." }); qc.invalidateQueries({ queryKey: ["coolify"] }); }, onError: (err: Error) => { toast({ variant: "destructive", title: "Restart Failed", description: err.message }); } });
  const deployAppMutation = useMutation({ mutationFn: async (uuid: string) => { const res = await fetch(`/api/coolify/applications/${uuid}/deploy`, { method: "POST" }); if (!res.ok) throw new Error("Deploy failed"); return res.json(); }, onSuccess: () => { toast({ title: "Deploy Triggered", description: "Rebuilding from latest source..." }); qc.invalidateQueries({ queryKey: ["coolify"] }); }, onError: (err: Error) => { toast({ variant: "destructive", title: "Deploy Failed", description: err.message }); } });
  const stopAppMutation = useMutation({ mutationFn: async (uuid: string) => { const res = await fetch(`/api/coolify/applications/${uuid}/stop`, { method: "POST" }); if (!res.ok) throw new Error("Stop failed"); return res.json(); }, onSuccess: () => { toast({ title: "Stop Triggered", description: "Application is stopping..." }); qc.invalidateQueries({ queryKey: ["coolify"] }); }, onError: (err: Error) => { toast({ variant: "destructive", title: "Stop Failed", description: err.message }); } });
  const startAppMutation = useMutation({ mutationFn: async (uuid: string) => { const res = await fetch(`/api/coolify/applications/${uuid}/start`, { method: "POST" }); if (!res.ok) throw new Error("Start failed"); return res.json(); }, onSuccess: () => { toast({ title: "Start Triggered", description: "Application is starting..." }); qc.invalidateQueries({ queryKey: ["coolify"] }); }, onError: (err: Error) => { toast({ variant: "destructive", title: "Start Failed", description: err.message }); } });

  const isLoading = probesQuery.isLoading || healthQuery.isLoading;
  const probes = probesQuery.data || [];
  const allOnline = probes.length > 0 && probes.every((p) => p.state !== "offline");
  const account = accountQuery.data;
  const wallet = walletQuery.data?.wallet;
  const balances = walletQuery.data?.balances;
  const backendEnv = healthQuery.data?.env;
  const backendUrl = typeof backendEnv?.backendUrl === "string" ? backendEnv.backendUrl : "Unknown";
  const coolifyConfigured = coolifyStatusQuery.data?.configured === true;
  const apps = coolifyAppsQuery.data || [];
  const servers = coolifyServersQuery.data || [];
  const services = coolifyServicesQuery.data || [];
  const databases = coolifyDbQuery.data || [];
  const anyMutating = restartAppMutation.isPending || deployAppMutation.isPending || stopAppMutation.isPending || startAppMutation.isPending;

  const refreshAll = () => { probesQuery.refetch(); healthQuery.refetch(); accountQuery.refetch(); walletQuery.refetch(); coolifyAppsQuery.refetch(); coolifyServersQuery.refetch(); coolifyServicesQuery.refetch(); coolifyDbQuery.refetch(); };

  return (
    <div className="min-h-full p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl border border-stone-700 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2"><Link2 className="h-6 w-6 text-amber-400" />Servers & Connections</h1>
              <p className="text-sm text-muted-foreground">Coolify VPS management, Grudge backend status, logs, and restarts.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="border-stone-600" onClick={refreshAll} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />Refresh All</Button>
              {coolifyConfigured && <Button variant="outline" className="border-stone-600" onClick={() => window.open(coolifyStatusQuery.data?.url || "#", "_blank")}><ExternalLink className="mr-2 h-4 w-4" />Open Coolify</Button>}
            </div>
          </div>
        </div>

        <Tabs defaultValue="servers" className="w-full">
          <TabsList className="bg-stone-800 w-full flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="servers" className="gap-1"><Container className="h-3.5 w-3.5" />Servers</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1"><ScrollText className="h-3.5 w-3.5" />Logs</TabsTrigger>
            <TabsTrigger value="connections" className="gap-1"><Activity className="h-3.5 w-3.5" />Connections</TabsTrigger>
            <TabsTrigger value="account" className="gap-1"><UserCircle2 className="h-3.5 w-3.5" />Account</TabsTrigger>
            <TabsTrigger value="bestpractices" className="gap-1"><BookOpen className="h-3.5 w-3.5" />Best Practices</TabsTrigger>
          </TabsList>

          {/* ═══ SERVERS TAB ═══ */}
          <TabsContent value="servers" className="space-y-4 mt-4">
            {!coolifyConfigured ? (
              <Card><CardContent className="py-8 text-center space-y-3"><AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" /><p className="font-semibold">Coolify Not Configured</p><p className="text-sm text-muted-foreground max-w-md mx-auto">Set <code className="text-xs bg-stone-800 px-1 rounded">COOLIFY_API_URL</code> and <code className="text-xs bg-stone-800 px-1 rounded">COOLIFY_API_TOKEN</code> in your Vercel environment variables to enable VPS management.</p></CardContent></Card>
            ) : (<>
              {servers.length > 0 && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />VPS Servers</CardTitle><CardDescription>Physical/virtual servers managed by Coolify</CardDescription></CardHeader><CardContent className="space-y-3">{servers.map((srv) => (<div key={srv.uuid} className="rounded-lg border p-3 flex items-center justify-between gap-3"><div><p className="font-semibold">{srv.name}</p><p className="text-xs text-muted-foreground">{srv.ip || "No IP"} · {srv.description || "No description"}</p></div><Badge className={srv.is_reachable ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-red-600 hover:bg-red-600 text-white"}>{srv.is_reachable ? "Reachable" : "Unreachable"}</Badge></div>))}</CardContent></Card>}

              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Container className="h-5 w-5" />Applications ({apps.length})</CardTitle><CardDescription>Deployed apps on Coolify — restart, deploy, stop, or view logs</CardDescription></CardHeader><CardContent className="space-y-3">
                {apps.length === 0 && <p className="text-sm text-muted-foreground">No applications found.</p>}
                {apps.map((app) => (
                  <div key={app.uuid} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3"><div className="min-w-0"><p className="font-semibold truncate">{app.name}</p><p className="text-xs text-muted-foreground truncate">{app.fqdn || app.git_repository || "No domain"}</p></div><AppStatusBadge status={app.status} /></div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => restartAppMutation.mutate(app.uuid)} disabled={anyMutating}><RotateCw className="h-3 w-3" />Restart</Button>
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => deployAppMutation.mutate(app.uuid)} disabled={anyMutating}><Rocket className="h-3 w-3" />Deploy</Button>
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => startAppMutation.mutate(app.uuid)} disabled={anyMutating}><Play className="h-3 w-3" />Start</Button>
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs text-red-400 border-red-800 hover:bg-red-900/30" onClick={() => stopAppMutation.mutate(app.uuid)} disabled={anyMutating}><Square className="h-3 w-3" />Stop</Button>
                      <Button size="sm" variant="secondary" className="gap-1 h-7 text-xs" onClick={() => setSelectedApp(app.uuid)}><ScrollText className="h-3 w-3" />Logs</Button>
                    </div>
                  </div>
                ))}
              </CardContent></Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Services ({services.length})</CardTitle><CardDescription>Docker Compose services (Redis, etc.)</CardDescription></CardHeader><CardContent className="space-y-2">{services.length === 0 && <p className="text-sm text-muted-foreground">No services found.</p>}{services.map((svc: any) => (<div key={svc.uuid} className="rounded-lg border p-2 flex items-center justify-between"><p className="text-sm font-medium truncate">{svc.name || svc.uuid}</p><AppStatusBadge status={svc.status} /></div>))}</CardContent></Card>
                <Card><CardHeader><CardTitle className="flex items-center gap-2"><Database className="h-5 w-5" />Databases ({databases.length})</CardTitle><CardDescription>PostgreSQL, MySQL, etc.</CardDescription></CardHeader><CardContent className="space-y-2">{databases.length === 0 && <p className="text-sm text-muted-foreground">No databases found.</p>}{databases.map((db: any) => (<div key={db.uuid} className="rounded-lg border p-2 flex items-center justify-between"><div className="min-w-0"><p className="text-sm font-medium truncate">{db.name || db.uuid}</p><p className="text-xs text-muted-foreground">{db.type || "unknown"}</p></div><AppStatusBadge status={db.status} /></div>))}</CardContent></Card>
              </div>

              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />VPS Restart Schedule</CardTitle><CardDescription>Daily and emergency restart management</CardDescription></CardHeader><CardContent className="space-y-4">
                <div className="rounded-lg border border-stone-700 bg-stone-900/50 p-4 space-y-2"><p className="text-sm font-semibold">Daily Scheduled Restart</p><p className="text-xs text-muted-foreground">Set a cron job on your VPS to restart all Coolify containers daily at low-traffic time. Recommended: <code className="bg-stone-800 px-1 rounded">5:00 AM CST</code></p><div className="rounded bg-stone-800 p-2 text-xs font-mono text-stone-300">{"# /etc/cron.d/grudge-daily-restart"}<br />{"0 5 * * * root docker restart $(docker ps -q) >> /var/log/grudge-restart.log 2>&1"}</div><p className="text-xs text-muted-foreground">This clears memory leaks, rebuilds stale network connections, and keeps containers healthy.</p></div>
                <div className="rounded-lg border border-red-900/50 bg-red-950/20 p-4 space-y-2"><p className="text-sm font-semibold text-red-400 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Emergency Restart</p><p className="text-xs text-muted-foreground">If a service is unresponsive and won't restart via Coolify UI, use the buttons above per-app, or SSH into the VPS and run:</p><div className="rounded bg-stone-800 p-2 text-xs font-mono text-stone-300">{"# Emergency: restart all containers"}<br />{"docker restart $(docker ps -q)"}<br /><br />{"# Nuclear: full Coolify stack restart"}<br />{"cd /data/coolify && docker compose down && docker compose up -d"}</div><p className="text-xs text-muted-foreground">Coolify dashboard will reconnect automatically after the stack restarts.</p></div>
              </CardContent></Card>
            </>)}
          </TabsContent>

          {/* ═══ LOGS TAB ═══ */}
          <TabsContent value="logs" className="space-y-4 mt-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" />Application Logs</CardTitle><CardDescription>Live stdout logs from Coolify-managed containers</CardDescription></CardHeader><CardContent className="space-y-3">
              {!coolifyConfigured ? <p className="text-sm text-muted-foreground">Coolify not configured — set env vars first.</p> : (<>
                <div className="flex flex-wrap gap-2">{apps.map((app) => (<Button key={app.uuid} size="sm" variant={selectedApp === app.uuid ? "default" : "outline"} className="h-7 text-xs" onClick={() => setSelectedApp(app.uuid)}>{app.name}</Button>))}</div>
                {selectedApp && (<>
                  <div className="flex items-center gap-2">
                    <select className="bg-stone-800 border border-stone-600 rounded px-2 py-1 text-xs text-stone-300" value={logLines} onChange={(e) => setLogLines(e.target.value)}>
                      <option value="25">25 lines</option><option value="50">50 lines</option><option value="100">100 lines</option><option value="200">200 lines</option><option value="500">500 lines</option>
                    </select>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => logsQuery.refetch()}><RefreshCw className={`h-3 w-3 mr-1 ${logsQuery.isFetching ? "animate-spin" : ""}`} />Refresh</Button>
                  </div>
                  <ScrollArea className="h-[400px] rounded-lg border bg-stone-950 p-3"><pre className="text-xs font-mono text-stone-300 whitespace-pre-wrap break-all">{logsQuery.isLoading ? "Loading logs..." : typeof logsQuery.data === "string" ? logsQuery.data : logsQuery.data ? JSON.stringify(logsQuery.data, null, 2) : "No logs available. Select an app above."}</pre></ScrollArea>
                </>)}
              </>)}
            </CardContent></Card>
          </TabsContent>

          {/* ═══ CONNECTIONS TAB ═══ */}
          <TabsContent value="connections" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="md:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Live Connection Probes</CardTitle><CardDescription>Verifies the deployed app can reach core Grudge services through `/api/*` routes.</CardDescription></CardHeader><CardContent className="space-y-3">{probes.map((probe) => (<div key={probe.name} className="rounded-lg border p-3"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">{probe.name}</p><p className="text-xs text-muted-foreground">{probe.url}</p></div><StateBadge state={probe.state} statusCode={probe.statusCode} /></div><p className="mt-2 text-xs text-muted-foreground">{probe.detail}</p></div>))}</CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2">{allOnline ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <ShieldAlert className="h-5 w-5 text-amber-500" />}Backend Status</CardTitle><CardDescription>Overall service health</CardDescription></CardHeader><CardContent className="space-y-2"><p className="text-sm"><span className="text-muted-foreground">Service:</span> <span className="font-medium">{healthQuery.data?.service || "GDevelop Assistant"}</span></p><p className="text-sm"><span className="text-muted-foreground">Backend URL:</span> <span className="font-medium break-all">{backendUrl}</span></p><p className="text-sm"><span className="text-muted-foreground">Health:</span>{" "}<Badge className={allOnline ? "bg-emerald-600 hover:bg-emerald-600 text-white" : "bg-amber-600 hover:bg-amber-600 text-white"}>{allOnline ? "Connected" : "Needs Attention"}</Badge></p></CardContent></Card>
            </div>
            <Card><CardHeader><CardTitle>AI Chat & Code Agents</CardTitle></CardHeader><CardContent><div className="flex flex-wrap gap-2"><Button onClick={() => navigate("/")}><MessageSquare className="mr-2 h-4 w-4" />Open AI Chat</Button><Button variant="secondary" onClick={() => navigate("/?tool=code-generate")}><Code2 className="mr-2 h-4 w-4" />Open Code Agent</Button><Button variant="outline" onClick={() => window.open("https://gdevelop-assistant-git-main-grudgenexus.vercel.app/", "_blank")}><ExternalLink className="mr-2 h-4 w-4" />Open Deployed App</Button></div><Separator className="my-4" /><p className="text-xs text-muted-foreground">If probes show offline, verify Vercel environment values for `GRUDGE_GAME_API`, `GRUDGE_ACCOUNT_API`, `GRUDGE_ID_API`, `GRUDGE_LAUNCHER_API`, and `GRUDGE_AUTH_URL`.</p></CardContent></Card>
          </TabsContent>

          {/* ═══ ACCOUNT TAB ═══ */}
          <TabsContent value="account" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserCircle2 className="h-5 w-5" />Account Backend Tool</CardTitle><CardDescription>Connected account details from `/api/account/*`.</CardDescription></CardHeader><CardContent className="space-y-2">{account ? (<><p className="text-sm"><span className="text-muted-foreground">Username:</span> <span className="font-medium">{account.username || account.displayName || "Player"}</span></p><p className="text-sm"><span className="text-muted-foreground">Grudge ID:</span> <span className="font-medium">{account.grudgeId || "Unavailable"}</span></p><p className="text-sm"><span className="text-muted-foreground">Email:</span> <span className="font-medium">{account.email || "Not set"}</span></p><p className="text-sm"><span className="text-muted-foreground">Gold:</span> <span className="font-medium">{(account.gold ?? balances?.gold ?? 0).toLocaleString()}</span></p></>) : (<p className="text-sm text-muted-foreground">Sign in first to load account data from the backend.</p>)}</CardContent></Card>
              <Card><CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />Wallet & Server Link</CardTitle><CardDescription>Ensure your account has a backend wallet and active server association.</CardDescription></CardHeader><CardContent className="space-y-3"><p className="text-sm"><span className="text-muted-foreground">Wallet:</span> <span className="font-medium break-all">{wallet?.walletAddress || "Not connected"}</span></p><p className="text-sm"><span className="text-muted-foreground">Type:</span> <span className="font-medium">{wallet?.walletType || "N/A"}</span></p><p className="text-sm"><span className="text-muted-foreground">GBUX:</span> <span className="font-medium">{(balances?.gbux ?? 0).toLocaleString()}</span></p><Button onClick={() => ensureWalletMutation.mutate()} disabled={ensureWalletMutation.isPending} className="w-full">{ensureWalletMutation.isPending ? "Connecting..." : "Ensure Account Wallet Connection"}</Button></CardContent></Card>
            </div>
          </TabsContent>

          {/* ═══ BEST PRACTICES TAB ═══ */}
          <TabsContent value="bestpractices" className="space-y-4 mt-4">
            <Card><CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Coolify Best Practices</CardTitle><CardDescription>Guidelines for running Grudge Studio services reliably on your Coolify VPS.</CardDescription></CardHeader><CardContent className="space-y-3">{COOLIFY_BEST_PRACTICES.map((bp, i) => (<div key={i} className="rounded-lg border p-3 space-y-1"><p className="font-semibold text-sm">{bp.title}</p><p className="text-xs text-muted-foreground">{bp.detail}</p></div>))}</CardContent></Card>
            <Card><CardHeader><CardTitle>Recommended Cron Jobs for VPS</CardTitle></CardHeader><CardContent className="space-y-3">
              <div className="rounded bg-stone-800 p-3 text-xs font-mono text-stone-300 space-y-1">
                <p>{"# ── /etc/cron.d/grudge-maintenance ──"}</p><p></p>
                <p>{"# Daily container restart at 5 AM CST (11 UTC)"}</p>
                <p>{"0 11 * * * root docker restart $(docker ps -q) >> /var/log/grudge-restart.log 2>&1"}</p><p></p>
                <p>{"# Weekly Docker cleanup (Sunday 4 AM CST)"}</p>
                <p>{"0 10 * * 0 root docker system prune -f >> /var/log/docker-prune.log 2>&1"}</p><p></p>
                <p>{"# Daily PostgreSQL backup at 3 AM CST"}</p>
                <p>{"0 9 * * * root docker exec grudge-postgres pg_dumpall -U grudge > /backups/pg-$(date +\\%F).sql 2>&1"}</p><p></p>
                <p>{"# Keep only last 7 backups"}</p>
                <p>{"30 9 * * * root find /backups -name \"pg-*.sql\" -mtime +7 -delete"}</p>
              </div>
              <p className="text-xs text-muted-foreground">Add these to your VPS via <code className="bg-stone-800 px-1 rounded">sudo nano /etc/cron.d/grudge-maintenance</code> and ensure the cron daemon is running.</p>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
