/**
 * SidebarAccountWidget — Persistent account card at the bottom of the sidebar.
 *
 * Shows: avatar, username, level badge, gold/GBUX, backend connection indicator.
 * Click navigates to /account. Guest state shows sign-in CTA.
 */

import { Link } from 'wouter';
import { getLoginHref } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { useGrudgeAccount } from '@/hooks/useGrudgeAccount';
import { useQuery } from '@tanstack/react-query';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Coins, Gem, LogIn, Wifi, WifiOff } from 'lucide-react';

export function SidebarAccountWidget() {
  const { isAuthenticated, user } = useAuth();
  const { account, accountLoading, characters } = useGrudgeAccount();

  // Lightweight backend probe
  const healthProbe = useQuery({
    queryKey: ['sidebar-health-probe'],
    queryFn: async () => {
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(3000) });
        return res.ok;
      } catch {
        return false;
      }
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const isOnline = healthProbe.data === true;
  const activeChar = characters.find(c => c.isActive) || characters[0];

  // ── Guest state ──
  if (!isAuthenticated) {
    return (
      <div className="p-2">
        <a href={getLoginHref()}>
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-accent/30 hover:bg-accent/50 transition cursor-pointer border border-transparent hover:border-amber-500/20">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
              <LogIn className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Sign In</p>
              <p className="text-[10px] text-muted-foreground">Play as your character</p>
            </div>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-red-500'}`} />
          </div>
        </a>
      </div>
    );
  }

  // ── Loading state ──
  if (accountLoading) {
    return (
      <div className="p-2">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-accent/20 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-1">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-2 w-14 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated state ──
  const displayName = account?.displayName || account?.username || user?.username || 'Player';
  const avatarUrl = account?.avatarUrl || activeChar?.avatarUrl;
  const initials = displayName.slice(0, 2).toUpperCase();
  const gold = activeChar?.gold ?? account?.gold ?? 0;
  const gbux = account?.gbuxBalance ?? 0;
  const level = activeChar?.level ?? 1;

  return (
    <div className="p-2">
      <Link href="/account">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-accent/20 hover:bg-accent/40 transition cursor-pointer border border-transparent hover:border-amber-500/20 group">
          {/* Avatar */}
          <Avatar className="w-8 h-8 border border-amber-500/30">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-amber-500/10 text-amber-400 text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Name + Level */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate group-hover:text-amber-400 transition">
                {displayName}
              </p>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-500/30 text-amber-400 shrink-0">
                {level}
              </Badge>
            </div>
            {/* Gold + GBUX inline */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5 text-yellow-500">
                <Coins className="w-2.5 h-2.5" />{gold.toLocaleString()}
              </span>
              {gbux > 0 && (
                <span className="flex items-center gap-0.5 text-amber-400">
                  <Gem className="w-2.5 h-2.5" />{gbux.toLocaleString()}
                </span>
              )}
              {activeChar && (
                <span className="truncate text-white/30">
                  {activeChar.name}
                </span>
              )}
            </div>
          </div>

          {/* Connection indicator */}
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${isOnline ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`}
            title={isOnline ? 'Backend connected' : 'Backend offline'}
          />
        </div>
      </Link>
    </div>
  );
}
