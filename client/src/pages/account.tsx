/**
 * Account Hub — Unified Grudge Studio account dashboard.
 *
 * Tabs: Overview | Characters | Social | Stats | Linked Accounts
 */

import { useState, useEffect } from 'react';
import { getLoginHref } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { useGrudgeAccount } from '@/hooks/useGrudgeAccount';
import { usePlayerActivity, formatPlaytime } from '@/hooks/usePlayerActivity';
import { useQuery, useMutation } from '@tanstack/react-query';
import { grudgeAccountApi, grudgeIdApi, type GrudgeProfile, type GrudgeFriend, type GrudgeNotification } from '@/lib/grudgeBackendApi';
import { usePuter } from '@/contexts/puter-context';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  User, Trophy, Gamepad2, Star, LogIn, Coins, Gem, Wallet,
  UserPlus, Bell, BellDot, Shield, Link2, Crown, Globe,
  Sword, Clock, Zap, ChevronRight, Copy, Check, ExternalLink,
  BarChart3, Target, Sparkles, MapPin, Download, Brain,
} from 'lucide-react';
import { Link } from 'wouter';

export default function AccountPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { account, accountLoading, characters, refetchAccount } = useGrudgeAccount();
  const { summary } = usePlayerActivity();
  const { toast } = useToast();
  const { isSignedIn: puterSignedIn, user: puterUser } = usePuter();
  const [friendId, setFriendId] = useState('');
  const [copied, setCopied] = useState(false);

  // Grudge identity
  const { data: grudgeMe } = useQuery({
    queryKey: ['grudge', 'identity'],
    queryFn: () => grudgeIdApi.getMe(),
    enabled: isAuthenticated,
  });
  const grudgeId = grudgeMe?.grudge_id || grudgeMe?.grudgeId || '';

  // Friends
  const { data: friends = [], refetch: refetchFriends } = useQuery<GrudgeFriend[]>({
    queryKey: ['grudge', 'friends'],
    queryFn: () => grudgeAccountApi.listFriends(),
    enabled: isAuthenticated,
  });

  // Notifications
  const { data: notifications = [], refetch: refetchNotifs } = useQuery<GrudgeNotification[]>({
    queryKey: ['grudge', 'notifications'],
    queryFn: () => grudgeAccountApi.listNotifications(),
    enabled: isAuthenticated,
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const sendFriendReq = useMutation({
    mutationFn: (id: string) => grudgeAccountApi.sendFriendRequest(id),
    onSuccess: () => { refetchFriends(); toast({ title: 'Friend request sent!' }); setFriendId(''); },
    onError: () => toast({ variant: 'destructive', title: 'Failed to send request' }),
  });

  const markAllRead = useMutation({
    mutationFn: () => grudgeAccountApi.markAllRead(),
    onSuccess: () => refetchNotifs(),
  });

  const copyGrudgeId = () => {
    if (!grudgeId) return;
    navigator.clipboard.writeText(grudgeId);
    setCopied(true);
    toast({ title: 'Copied', description: 'Grudge ID copied' });
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const gfc = (window as Window & { GrudgeFleetConnect?: { mount: (sel: string) => void } }).GrudgeFleetConnect;
    if (gfc) gfc.mount('#grudge-fleet-connect-account');
  }, [isAuthenticated, account?.homeIslandId]);

  // ── Auth gate ──
  if (!isAuthenticated && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center mb-2">
          <User className="w-10 h-10 text-black" />
        </div>
        <h2 className="text-2xl font-bold">Your Account</h2>
        <p className="text-muted-foreground text-center max-w-sm">Sign in to view your characters, stats, wallet, and connect with other players.</p>
        <Button asChild size="lg">
          <a href={getLoginHref()}><LogIn className="mr-2 h-4 w-4" /> Sign In</a>
        </Button>
      </div>
    );
  }

  const activeChar = characters.find(c => c.isActive) || characters[0];
  const displayName = account?.displayName || account?.username || user?.username || 'Player';
  const avatarUrl = account?.avatarUrl || activeChar?.avatarUrl;
  const initials = displayName.slice(0, 2).toUpperCase();
  const level = activeChar?.level ?? 1;
  const xpProgress = Math.min(100, ((activeChar?.experience ?? 0) % 1000) / 10);

  const acceptedFriends = friends.filter(f => f.status === 'accepted');
  const pendingFriends = friends.filter(f => f.status === 'pending');

  return (
    <div className="flex flex-col min-h-full p-4 sm:p-6">
      <div className="max-w-4xl mx-auto w-full space-y-6">

        {/* ── Account Header ── */}
        <Card className="border-amber-500/20 bg-gradient-to-r from-stone-950 via-stone-900 to-stone-950">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 sm:gap-6">
              <Avatar className="w-16 h-16 sm:w-20 sm:h-20 border-2 border-amber-500/40">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-amber-500/10 text-amber-400 text-xl font-bold">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold">{displayName}</h1>
                  <Badge variant="outline" className="border-amber-500/30 text-amber-400">Lv.{level}</Badge>
                  {account?.isPremium && <Badge className="bg-purple-600/80 text-white">Premium</Badge>}
                  {activeChar?.isNft && <Badge className="bg-emerald-600/80 text-white">NFT</Badge>}
                </div>
                {grudgeId && (
                  <button onClick={copyGrudgeId} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-white mt-1 transition">
                    <span className="font-mono">{grudgeId.slice(0, 8)}...{grudgeId.slice(-4)}</span>
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                )}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>XP</span>
                    <span className="text-white">{activeChar?.experience ?? 0}</span>
                  </div>
                  <Progress value={xpProgress} className="h-1.5" />
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1.5">
                <div className="flex items-center gap-1 text-yellow-500">
                  <Coins className="w-4 h-4" />
                  <span className="font-bold">{(activeChar?.gold ?? account?.gold ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-amber-400">
                  <Gem className="w-4 h-4" />
                  <span className="font-bold">{(account?.gbuxBalance ?? 0).toLocaleString()}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{characters.length} character{characters.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="overview" className="gap-1"><User className="h-3.5 w-3.5" />Overview</TabsTrigger>
            <TabsTrigger value="characters" className="gap-1"><Sword className="h-3.5 w-3.5" />Characters</TabsTrigger>
            <TabsTrigger value="social" className="gap-1">
              <UserPlus className="h-3.5 w-3.5" />Social
              {unreadCount > 0 && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4 ml-1">{unreadCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-1"><BarChart3 className="h-3.5 w-3.5" />Stats</TabsTrigger>
            <TabsTrigger value="linked" className="gap-1"><Link2 className="h-3.5 w-3.5" />Linked</TabsTrigger>
          </TabsList>

          {/* ═══ OVERVIEW ═══ */}
          <TabsContent value="overview" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* Quick Stats */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Gamepad2 className="h-4 w-4 text-amber-400" />Games Played</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{summary.totalGamesPlayed}</p>
                  <p className="text-xs text-muted-foreground">{summary.totalSessions} total sessions · {formatPlaytime(summary.totalPlaytimeMs)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Trophy className="h-4 w-4 text-yellow-500" />Best Scores</CardTitle></CardHeader>
                <CardContent>
                  {summary.recentGames.length > 0 ? (
                    <div className="space-y-1.5">
                      {summary.allGames.sort((a, b) => b.bestScore - a.bestScore).slice(0, 3).map(g => (
                        <div key={g.gameSlug} className="flex justify-between text-sm">
                          <span className="text-muted-foreground truncate">{g.gameName}</span>
                          <span className="font-mono font-bold">{g.bestScore.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Play some games to see your scores!</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-1.5"><Star className="h-4 w-4 text-purple-400" />Active Character</CardTitle></CardHeader>
                <CardContent>
                  {activeChar ? (
                    <div>
                      <p className="text-lg font-bold">{activeChar.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{activeChar.raceId} {activeChar.classId} · Lv.{activeChar.level}</p>
                      <Link href="/characters"><span className="text-xs text-amber-400 hover:underline cursor-pointer">Manage →</span></Link>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground">No character yet</p>
                      <Link href="/characters"><Button size="sm" className="mt-2">Create Character</Button></Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'War Chest', href: '/wallet', icon: Wallet, desc: 'GBUX & Gold' },
                { label: 'Characters', href: '/characters', icon: Sword, desc: 'Create & customize' },
                { label: 'grudgeDot Games', href: '/games', icon: Gamepad2, desc: 'Play all games' },
                { label: 'Achievements', href: '/achievements', icon: Trophy, desc: 'Your glory' },
              ].map(link => (
                <Link key={link.href} href={link.href}>
                  <Card className="hover:border-amber-500/30 transition cursor-pointer h-full">
                    <CardContent className="p-4 flex items-center gap-3">
                      <link.icon className="h-5 w-5 text-amber-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{link.label}</p>
                        <p className="text-[10px] text-muted-foreground">{link.desc}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Fleet Connect — cross-app character / island / save links */}
            <Card className="border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-emerald-400" />
                  Fleet Connect
                </CardTitle>
                <CardDescription>Jump to your characters, home-island, and saves across the Grudge fleet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: 'Warlords Characters', href: 'https://client.grudge-studio.com/character', icon: Sword },
                    { label: 'Home Island', href: account?.homeIslandId
                      ? `https://warlord-crafting-suite.vercel.app/island-hub?island=${account.homeIslandId}`
                      : 'https://warlord-crafting-suite.vercel.app/island-hub', icon: MapPin },
                    { label: 'Play Warlords', href: 'https://client.grudge-studio.com', icon: Globe },
                    { label: 'Nexus Hub', href: 'https://grudachain.grudge-studio.com', icon: Link2 },
                    { label: 'Studio Forge', href: 'https://github.com/MolochDaGod/grudge-dev-tool/releases/latest', icon: Download },
                    { label: 'Legion AI', href: 'https://ai.grudge-studio.com', icon: Brain },
                  ].map(link => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition text-sm"
                    >
                      <link.icon className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{link.label}</span>
                      <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                    </a>
                  ))}
                </div>
                <div id="grudge-fleet-connect-account" data-grudge-fleet-connect className="mt-4" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ CHARACTERS ═══ */}
          <TabsContent value="characters" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Your Characters</CardTitle>
                    <CardDescription>{characters.length} Warlord{characters.length !== 1 ? 's' : ''}</CardDescription>
                  </div>
                  <Link href="/characters"><Button size="sm" className="gap-1"><Sparkles className="h-3 w-3" />Manage</Button></Link>
                </div>
              </CardHeader>
              <CardContent>
                {characters.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-3">No characters yet. Create your first Warlord!</p>
                    <Link href="/characters"><Button>Create Character</Button></Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {characters.map(ch => (
                      <div key={ch.id} className="flex items-center justify-between p-3 rounded-lg border bg-accent/10">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${ch.isActive ? 'bg-amber-500/20 ring-2 ring-amber-500/50' : 'bg-muted'}`}>
                            {ch.raceId === 'orc' ? '💀' : ch.raceId === 'elf' ? '🏹' : ch.raceId === 'dwarf' ? '⛏️' : '⚔️'}
                          </div>
                          <div>
                            <p className="font-medium flex items-center gap-1.5">
                              {ch.name}
                              {ch.isActive && <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-400">Active</Badge>}
                              {ch.isNft && <Badge variant="outline" className="text-[9px] border-purple-500/30 text-purple-400">NFT</Badge>}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{ch.raceId} {ch.classId} · Lv.{ch.level} · {ch.gold ?? 0}g</p>
                          </div>
                        </div>
                        <Link href="/characters"><Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button></Link>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ SOCIAL ═══ */}
          <TabsContent value="social" className="space-y-4 mt-4">
            {/* Add Friend */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Add Friend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter Grudge ID..."
                    value={friendId}
                    onChange={e => setFriendId(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={() => sendFriendReq.mutate(friendId)} disabled={!friendId.trim() || sendFriendReq.isPending}>
                    {sendFriendReq.isPending ? 'Sending...' : 'Send Request'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Friends List */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Friends ({acceptedFriends.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  {acceptedFriends.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No friends yet. Share your Grudge ID!</p>
                  ) : (
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2">
                        {acceptedFriends.map(f => (
                          <div key={f.id} className="flex items-center justify-between p-2 rounded border bg-accent/10">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                              <span className="text-sm">{f.username || f.friend_grudge_id.slice(0, 12)}</span>
                            </div>
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online" />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {unreadCount > 0 ? <BellDot className="h-4 w-4 text-amber-400" /> : <Bell className="h-4 w-4" />}
                      Notifications
                    </CardTitle>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => markAllRead.mutate()}>
                        Mark all read
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No notifications</p>
                  ) : (
                    <ScrollArea className="max-h-[300px]">
                      <div className="space-y-2">
                        {notifications.slice(0, 20).map(n => (
                          <div key={n.id} className={`p-2 rounded border text-xs ${n.read ? 'bg-accent/5 text-muted-foreground' : 'bg-amber-500/5 border-amber-500/20'}`}>
                            <p>{n.type}: {JSON.stringify(n.payload).slice(0, 80)}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(n.created_at).toLocaleDateString()}</p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══ STATS ═══ */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <Gamepad2 className="h-6 w-6 mx-auto mb-1 text-amber-400" />
                  <p className="text-2xl font-bold">{summary.totalGamesPlayed}</p>
                  <p className="text-xs text-muted-foreground">Games Played</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Target className="h-6 w-6 mx-auto mb-1 text-red-400" />
                  <p className="text-2xl font-bold">{summary.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Total Sessions</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 mx-auto mb-1 text-blue-400" />
                  <p className="text-2xl font-bold">{formatPlaytime(summary.totalPlaytimeMs)}</p>
                  <p className="text-xs text-muted-foreground">Total Playtime</p>
                </CardContent>
              </Card>
            </div>

            {/* Per-game breakdown */}
            <Card>
              <CardHeader><CardTitle className="text-base">Per-Game Scores</CardTitle></CardHeader>
              <CardContent>
                {summary.allGames.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Play some games from the <Link href="/games"><span className="text-amber-400 hover:underline">grudgeDot launcher</span></Link> to see your stats here!</p>
                ) : (
                  <div className="space-y-2">
                    {summary.allGames.map(g => (
                      <div key={g.gameSlug} className="flex items-center justify-between p-2.5 rounded border bg-accent/5">
                        <div>
                          <p className="text-sm font-medium">{g.gameName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {g.totalPlays} plays · {formatPlaytime(g.totalPlaytimeMs)} · Last: {new Date(g.lastPlayedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold font-mono text-amber-400">{g.bestScore.toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">Best Score</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ═══ LINKED ACCOUNTS ═══ */}
          <TabsContent value="linked" className="space-y-4 mt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Solana Wallet */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" />Solana Wallet</CardTitle>
                </CardHeader>
                <CardContent>
                  {account?.walletAddress ? (
                    <div className="space-y-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded block truncate">{account.walletAddress}</code>
                      <Badge variant="secondary" className="text-[10px]">{account.walletType || 'Crossmint'}</Badge>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">No wallet linked</p>
                      <Link href="/wallet"><Button size="sm" variant="outline">Setup Wallet</Button></Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Puter Cloud */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" />Puter Cloud</CardTitle>
                </CardHeader>
                <CardContent>
                  {puterSignedIn ? (
                    <div className="space-y-2">
                      <p className="text-sm"><span className="text-emerald-400">●</span> Connected as <strong>{puterUser?.username || 'User'}</strong></p>
                      <Badge className="bg-emerald-600/30 text-emerald-400 border-0 text-[10px]">Cloud Storage Active</Badge>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Not connected</p>
                      <Link href="/onboarding"><Button size="sm" variant="outline">Connect Puter</Button></Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Discord */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Discord</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">Link your Discord for social features</p>
                  <Button size="sm" variant="outline" onClick={() => window.open('https://discord.gg/FtGtmxmwkh', '_blank')}>
                    <ExternalLink className="mr-1 h-3 w-3" />Join Discord
                  </Button>
                </CardContent>
              </Card>

              {/* Grudge Backend */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4" />Grudge Backend</CardTitle>
                </CardHeader>
                <CardContent>
                  {grudgeId ? (
                    <div className="space-y-2">
                      <p className="text-sm"><span className="text-emerald-400">●</span> Connected</p>
                      <p className="text-xs text-muted-foreground font-mono">{grudgeId}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Connecting...</p>
                  )}
                  <Link href="/connections"><Button size="sm" variant="ghost" className="mt-2 text-xs">Server Status →</Button></Link>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
