import { useAuth } from "@/hooks/useAuth";
import { useGbuxEconomy } from "@/hooks/useGbuxEconomy";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Coins, Gem, LogIn, Wallet, ExternalLink, Copy, Check,
  TrendingUp, TrendingDown, ArrowUpRight, Loader2,
  Bot, Palette, Swords, Map, RefreshCw, ShieldCheck,
} from "lucide-react";
import { useState } from "react";

function formatUsd(n: number): string {
  if (n < 0.01 && n > 0) return `$${n.toFixed(6)}`;
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");
  const isUp = data[data.length - 1] >= data[0];

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? "#22c55e" : "#ef4444"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function WalletPage() {
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    gbuxPrice, gbuxChange24h, gbuxBalance, goldBalance, gbuxValueUsd,
    walletAddress, hasWallet, links, supply, agentWallet, history, txList,
    isLoading, overview, wallet, transactions, ensureWallet,
  } = useGbuxEconomy();

  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    toast({ title: "Copied", description: "Wallet address copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">War Chest</h2>
          <p className="text-muted-foreground">Sign in to view your GBUX balance and wallet</p>
        </div>
        <Button asChild data-testid="button-login">
          <a href="/auth">
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </a>
        </Button>
      </div>
    );
  }

  const sparkData = history.map((h) => h.priceUsd).slice(-60);
  const isUp = gbuxChange24h >= 0;

  const SPENDING_CATEGORIES = [
    { icon: Bot, label: "AI Time", desc: "AI code review, lore generation, companion interactions", color: "text-blue-400" },
    { icon: Palette, label: "Assets", desc: "3D models, textures, animations from the asset store", color: "text-purple-400" },
    { icon: Swords, label: "Tournaments", desc: "Entry fees for PvP tournaments and ranked matches", color: "text-red-400" },
    { icon: Map, label: "Scene Building", desc: "Premium terrain, props, and map templates", color: "text-green-400" },
  ];

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold" data-testid="text-wallet-title">War Chest</h1>
          <p className="text-sm text-muted-foreground">GBUX economy & wallet management</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            overview.refetch();
            wallet.refetch();
            transactions.refetch();
          }}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* ── Balance Cards ── */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        {/* GBUX Balance */}
        <Card className="border-amber-900/50 bg-gradient-to-br from-stone-900 to-stone-950">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">GBUX Balance</span>
              <Gem className="h-5 w-5 text-amber-400" />
            </div>
            <p className="text-3xl font-bold text-amber-400">{formatNumber(gbuxBalance)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              ≈ {formatUsd(gbuxValueUsd)}
            </p>
          </CardContent>
        </Card>

        {/* Gold Balance */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">Gold</span>
              <Coins className="h-5 w-5 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-yellow-500">{formatNumber(goldBalance)}</p>
            <p className="text-sm text-muted-foreground mt-1">In-game currency</p>
          </CardContent>
        </Card>

        {/* GBUX Price Ticker */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground uppercase tracking-wider">GBUX Price</span>
              {isUp
                ? <TrendingUp className="h-5 w-5 text-green-500" />
                : <TrendingDown className="h-5 w-5 text-red-500" />
              }
            </div>
            <div className="flex items-center gap-3">
              <p className="text-2xl font-bold">{formatUsd(gbuxPrice)}</p>
              <Badge
                variant="secondary"
                className={isUp ? "bg-green-500/20 text-green-400 border-0" : "bg-red-500/20 text-red-400 border-0"}
              >
                {isUp ? "+" : ""}{gbuxChange24h.toFixed(2)}%
              </Badge>
            </div>
            <div className="mt-2">
              <MiniSparkline data={sparkData} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Wallet Address & Quick Actions ── */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 mb-6">
        {/* Wallet Address */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" /> Solana Wallet
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasWallet ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                    {walletAddress}
                  </code>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={copyAddress}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Crossmint Custodial
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No wallet connected. Create a server-side custodial wallet to hold GBUX and NFTs.
                </p>
                <Button
                  onClick={() => ensureWallet.mutate()}
                  disabled={ensureWallet.isPending}
                  className="gap-2"
                >
                  {ensureWallet.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Wallet className="h-4 w-4" />
                  }
                  Create Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Buy, track, and manage GBUX</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => links?.raydiumSwap && window.open(links.raydiumSwap, "_blank")}
                disabled={!links?.raydiumSwap}
              >
                <ArrowUpRight className="h-5 w-5 text-amber-400" />
                <span className="text-xs">Buy GBUX</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => links?.dexscreener && window.open(links.dexscreener, "_blank")}
                disabled={!links?.dexscreener}
              >
                <TrendingUp className="h-5 w-5 text-green-400" />
                <span className="text-xs">DexScreener</span>
              </Button>
              <Button
                variant="outline"
                className="gap-2 h-auto py-3 flex-col"
                onClick={() => links?.solscan && window.open(links.solscan, "_blank")}
                disabled={!links?.solscan}
              >
                <ExternalLink className="h-5 w-5 text-blue-400" />
                <span className="text-xs">Solscan</span>
              </Button>
            </div>
            {supply && (
              <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                <span>Supply: {formatNumber(supply.onChainTotal)}</span>
                {overview.data?.gbux?.volume24h != null && (
                  <span>Vol 24h: {formatUsd(overview.data.gbux.volume24h)}</span>
                )}
                {overview.data?.gbux?.liquidity != null && (
                  <span>Liq: {formatUsd(overview.data.gbux.liquidity)}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Spending Categories ── */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Spend GBUX</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {SPENDING_CATEGORIES.map((cat) => (
            <Card key={cat.label} className="hover:border-stone-600 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0 ${cat.color}`}>
                  <cat.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground leading-tight">{cat.desc}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Separator className="mb-6" />

      {/* ── Transaction History ── */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Recent Transactions</h2>
        {txList.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Coins className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-semibold">No Transactions Yet</p>
              <p className="text-sm text-muted-foreground">
                Transactions will appear here as you earn and spend GBUX across Grudge games.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {txList.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tx.description || tx.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()} · {tx.type}
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={tx.amount >= 0
                        ? "bg-green-500/20 text-green-400 border-0"
                        : "bg-red-500/20 text-red-400 border-0"
                      }
                    >
                      {tx.amount >= 0 ? "+" : ""}{formatNumber(tx.amount)} {tx.currency}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Agent Wallet (admin info) ── */}
      {agentWallet && (
        <Card className="border-blue-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-400" /> AI Agent Wallet
            </CardTitle>
            <CardDescription>Grudge AI agent on-chain balances</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">SOL</p>
                <p className="font-semibold">{formatNumber(agentWallet.solBalance)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">GBUX</p>
                <p className="font-semibold">{formatNumber(agentWallet.gbuxBalance)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Address</p>
                <code className="text-xs truncate block">{agentWallet.address}</code>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
