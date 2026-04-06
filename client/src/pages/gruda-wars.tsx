import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Sword, Shield, Zap, Heart, Crown, Users, Star,
  Maximize2, Minimize2, RefreshCw, ExternalLink,
  Hammer, Package, Map, Activity, Wifi, WifiOff,
  Loader2, ChevronRight, Sparkles, Skull, Play,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ── Types matching server response ──

interface GrudaWarsHero {
  syncId: string;
  name: string;
  title: string;
  description: string;
  lore: string;
  raceId: string;
  classId: string;
  level: number;
  wcsAttributes: Record<string, number>;
  equipment: Record<string, string>;
  playstyle: string;
  strengths: string[];
  weaknesses: string[];
  gdaType: string;
  gdaRarity: string;
  gdaBaseStats: { health: number; attack: number; defense: number; speed: number };
  gdaAbilities: Array<{
    id: string;
    name: string;
    description: string;
    damage?: number;
    cooldown?: number;
    manaCost?: number;
    type: "active" | "passive";
  }>;
  portraitUrl: string;
}

interface GrudaWarsConfig {
  grudachainUrl: string;
  wcsUrl: string;
  wcsPages: Record<string, string>;
  grudachainApi: Record<string, string>;
}

interface GrudaWarsStatus {
  grudachain: { status: string; [key: string]: unknown };
  wcs: { available: boolean; url: string; lastChecked: string };
  gge: { status: string; heroCount: number };
}

// ── Stat bar colors ──

const STAT_COLORS: Record<string, string> = {
  health: "bg-green-500",
  attack: "bg-red-500",
  defense: "bg-blue-500",
  speed: "bg-yellow-500",
};

const STAT_ICONS: Record<string, React.ReactNode> = {
  health: <Heart className="w-3 h-3" />,
  attack: <Sword className="w-3 h-3" />,
  defense: <Shield className="w-3 h-3" />,
  speed: <Zap className="w-3 h-3" />,
};

const RARITY_COLORS: Record<string, string> = {
  common: "bg-gray-500",
  uncommon: "bg-green-600",
  rare: "bg-blue-600",
  epic: "bg-purple-600",
  legendary: "bg-orange-500",
};

const CLASS_COLORS: Record<string, string> = {
  warrior: "text-red-400 border-red-400",
  mage: "text-blue-400 border-blue-400",
  ranger: "text-green-400 border-green-400",
  worge: "text-amber-400 border-amber-400",
};

// Fallback WCS route paths — camelCase key → actual kebab-case path
// Used when /api/gruda-wars/config hasn't loaded yet
const WCS_FALLBACK_PATHS: Record<string, string> = {
  dungeon: "/dungeon",
  battle: "/battle",
  crafting: "/crafting",
  arsenal: "/arsenal",
  islandHub: "/island-hub",
  worldMap: "/world-map",
  character: "/character",
  characterCreation: "/character-creation",
  dashboard: "/dashboard",
};

// ── Component ──

export default function GrudaWars() {
  const [selectedHero, setSelectedHero] = useState<GrudaWarsHero | null>(null);
  const [activeSystem, setActiveSystem] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { toast } = useToast();

  // Fetch heroes
  const { data: heroData, isLoading: heroesLoading } = useQuery<{ heroes: GrudaWarsHero[]; count: number }>({
    queryKey: ["/api/gruda-wars/heroes"],
  });

  // Fetch config (deployment URLs)
  const { data: config } = useQuery<GrudaWarsConfig>({
    queryKey: ["/api/gruda-wars/config"],
  });

  // Fetch status
  const { data: status, isLoading: statusLoading } = useQuery<GrudaWarsStatus>({
    queryKey: ["/api/gruda-wars/status"],
    refetchInterval: 30000,
  });

  // Hero sync mutation
  const syncMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/gruda-wars/heroes/sync"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gruda-wars/heroes"] });
      toast({ title: "Heroes Synced", description: "All Gruda Wars heroes synced to database" });
    },
    onError: () => {
      toast({ title: "Sync Failed", description: "Could not sync heroes — check database connection", variant: "destructive" });
    },
  });

  const heroes = heroData?.heroes || [];
  const wcsUrl = config?.wcsUrl || "https://warlord-crafting-suite.vercel.app";
  const grudachainUrl = config?.grudachainUrl || "https://grudachain.vercel.app";
  const wcsPages = config?.wcsPages || {};

  const wcsAvailable = status?.wcs?.available ?? false;
  const grudachainStatus = status?.grudachain?.status ?? "unknown";

  // ── Helpers ──

  const openSystem = (page: string) => {
    setActiveSystem(page);
    setIsFullscreen(false);
  };

  const getIframeSrc = () => {
    if (activeSystem) return activeSystem;
    if (selectedHero) return wcsPages.dungeon || `${wcsUrl}/dungeon`;
    return wcsPages.dashboard || `${wcsUrl}/dashboard`;
  };

  // ── Render ──

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-red-950/50 to-orange-950/50">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sword className="w-6 h-6 text-red-400" />
            Gruda Wars
          </h1>
          <p className="text-sm text-muted-foreground">
            Play dungeons, manage heroes, and craft gear — powered by WCS + GRUDACHAIN
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Service status indicators */}
          <Badge variant="outline" className={wcsAvailable ? "text-green-400 border-green-400" : "text-red-400 border-red-400"}>
            {wcsAvailable ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            WCS
          </Badge>
          <Badge variant="outline" className={grudachainStatus === "healthy" ? "text-green-400 border-green-400" : "text-yellow-400 border-yellow-400"}>
            <Activity className="w-3 h-3 mr-1" />
            GRUDA
          </Badge>
          <Button variant="outline" size="sm" onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            {syncMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-1 hidden sm:inline">Sync Heroes</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="play" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-2 w-fit">
          <TabsTrigger value="play" className="gap-1"><Play className="w-4 h-4" />Play</TabsTrigger>
          <TabsTrigger value="heroes" className="gap-1"><Users className="w-4 h-4" />Heroes</TabsTrigger>
          <TabsTrigger value="systems" className="gap-1"><Hammer className="w-4 h-4" />Systems</TabsTrigger>
        </TabsList>

        {/* ═══ PLAY TAB ═══ */}
        <TabsContent value="play" className="flex-1 flex flex-col overflow-hidden m-0 p-4 pt-2">
          <div className="flex-1 flex gap-4 overflow-hidden">
            {/* Hero selector sidebar */}
            <div className="w-64 shrink-0">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Select Hero</h3>
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-2">
                  {heroesLoading ? (
                    <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : (
                    heroes.map((hero) => (
                      <Card
                        key={hero.syncId}
                        className={`cursor-pointer transition-all hover:scale-[1.02] ${selectedHero?.syncId === hero.syncId ? "ring-2 ring-red-500 bg-red-500/10" : "hover:bg-accent/50"}`}
                        onClick={() => setSelectedHero(hero)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center">
                              <img src={hero.portraitUrl} alt={hero.name} className="w-6 h-6 object-contain" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{hero.name}</p>
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${CLASS_COLORS[hero.gdaType] || ""}`}>
                                  {hero.classId}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">Lv.{hero.level}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Game viewport */}
            <div className={`flex-1 flex flex-col rounded-lg border overflow-hidden bg-black ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b">
                <div className="flex items-center gap-2">
                  {selectedHero ? (
                    <>
                      <Skull className="w-4 h-4 text-red-400" />
                      <span className="text-sm font-medium">Dungeon — {selectedHero.name}</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Select a hero to enter the dungeon</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)}>
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={getIframeSrc()} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              </div>
              <iframe
                ref={iframeRef}
                src={getIframeSrc()}
                className="flex-1 w-full border-0"
                allow="fullscreen; autoplay"
                title="Gruda Wars"
              />
            </div>
          </div>
        </TabsContent>

        {/* ═══ HEROES TAB ═══ */}
        <TabsContent value="heroes" className="flex-1 overflow-auto m-0 p-4 pt-2">
          <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {heroes.map((hero) => (
              <Card key={hero.syncId} className="overflow-hidden">
                {/* Hero header gradient */}
                <div className="h-2" style={{
                  background: hero.classId === "warrior" ? "linear-gradient(to right, #dc2626, #f97316)"
                    : hero.classId === "mage" ? "linear-gradient(to right, #3b82f6, #8b5cf6)"
                  : hero.classId === "ranger" ? "linear-gradient(to right, #22c55e, #10b981)"
                    : hero.classId === "worge" ? "linear-gradient(to right, #eab308, #f97316)"
                    : "linear-gradient(to right, #6b7280, #9ca3af)",
                }} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-2 border-slate-600">
                        <img src={hero.portraitUrl} alt={hero.name} className="w-8 h-8 object-contain" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{hero.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <Crown className="w-3 h-3" />
                          {hero.title}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`${RARITY_COLORS[hero.gdaRarity] || "bg-gray-500"} text-white text-[10px]`}>
                        {hero.gdaRarity}
                      </Badge>
                      <Badge variant="outline" className={CLASS_COLORS[hero.gdaType] || ""}>
                        {hero.raceId} {hero.classId}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{hero.description}</p>

                  {/* Stats */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Combat Stats</h4>
                    {Object.entries(hero.gdaBaseStats).map(([stat, value]) => (
                      <div key={stat} className="flex items-center gap-2">
                        {STAT_ICONS[stat]}
                        <span className="text-xs w-14 capitalize">{stat}</span>
                        <Progress value={Math.min((value / 200) * 100, 100)} className="flex-1 h-2" />
                        <span className="text-xs font-mono w-8 text-right">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Abilities */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Abilities</h4>
                    <div className="grid grid-cols-2 gap-1">
                      {hero.gdaAbilities.map((ability) => (
                        <div key={ability.id} className="flex items-center gap-1 p-1.5 rounded bg-accent/30 text-xs">
                          {ability.type === "passive" ? (
                            <Sparkles className="w-3 h-3 text-yellow-400 shrink-0" />
                          ) : (
                            <Zap className="w-3 h-3 text-blue-400 shrink-0" />
                          )}
                          <span className="truncate">{ability.name}</span>
                          {ability.cooldown && <span className="text-muted-foreground ml-auto">{ability.cooldown}t</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Playstyle */}
                  <div className="flex flex-wrap gap-1">
                    {hero.strengths.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[9px] bg-green-500/10 text-green-400">{s}</Badge>
                    ))}
                    {hero.weaknesses.map((w) => (
                      <Badge key={w} variant="secondary" className="text-[9px] bg-red-500/10 text-red-400">{w}</Badge>
                    ))}
                  </div>

                  <Button
                    className="w-full gap-2"
                    variant={selectedHero?.syncId === hero.syncId ? "default" : "outline"}
                    onClick={() => setSelectedHero(hero)}
                  >
                    {selectedHero?.syncId === hero.syncId ? (
                      <>
                        <Star className="w-4 h-4" />
                        Selected
                      </>
                    ) : (
                      <>
                        Select Hero
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ═══ SYSTEMS TAB ═══ */}
        <TabsContent value="systems" className="flex-1 flex flex-col overflow-hidden m-0 p-4 pt-2">
          <div className="flex gap-4 flex-1 overflow-hidden">
            {/* System launchers */}
            <div className="w-64 shrink-0 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">WCS Game Systems</h3>

              {[
                { key: "dungeon", label: "Dungeon", icon: Skull, desc: "Enter dungeons and fight" },
                { key: "battle", label: "Battle", icon: Sword, desc: "PvP and PvE combat" },
                { key: "crafting", label: "Crafting", icon: Hammer, desc: "Craft gear and items" },
                { key: "arsenal", label: "Arsenal", icon: Package, desc: "Manage equipment" },
                { key: "character", label: "Character", icon: Users, desc: "Character builder" },
                { key: "characterCreation", label: "Character Creation", icon: Star, desc: "Create a new hero" },
                { key: "islandHub", label: "Island Hub", icon: Map, desc: "Explore the islands" },
                { key: "worldMap", label: "World Map", icon: Map, desc: "Navigate the world" },
                { key: "dashboard", label: "Dashboard", icon: Activity, desc: "Character overview" },
              ].map(({ key, label, icon: Icon, desc }) => {
                const systemUrl = wcsPages[key] || `${wcsUrl}${WCS_FALLBACK_PATHS[key] || `/${key}`}`;
                return (
                <Card
                  key={key}
                  className={`cursor-pointer transition-all hover:scale-[1.02] ${activeSystem === systemUrl ? "ring-2 ring-orange-500" : ""}`}
                  onClick={() => openSystem(systemUrl)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Icon className="w-5 h-5 text-orange-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              );})}

              {/* GRUDACHAIN section */}
              <div className="pt-4 border-t mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">GRUDACHAIN</h3>
                <Card
                  className="cursor-pointer hover:scale-[1.02] transition-all"
                  onClick={() => openSystem(grudachainUrl)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">AI Node Dashboard</p>
                      <p className="text-[10px] text-muted-foreground">GRUDA Legion AI services</p>
                    </div>
                    <Badge variant="outline" className={grudachainStatus === "healthy" ? "text-green-400 border-green-400" : "text-yellow-400 border-yellow-400"}>
                      {grudachainStatus}
                    </Badge>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* System viewport */}
            <div className={`flex-1 flex flex-col rounded-lg border overflow-hidden bg-black ${isFullscreen ? "fixed inset-0 z-50" : ""}`}>
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b">
                <span className="text-sm font-medium">{activeSystem ? "System Viewer" : "Select a system to launch"}</span>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsFullscreen(!isFullscreen)}>
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                  {activeSystem && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                      <a href={activeSystem} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
              {activeSystem ? (
                <iframe
                  src={activeSystem}
                  className="flex-1 w-full border-0"
                  allow="fullscreen; autoplay"
                  title="WCS System"
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Hammer className="w-12 h-12 mx-auto opacity-30" />
                    <p>Choose a game system from the left panel</p>
                    <p className="text-xs">Crafting, inventory, dungeons, and more from Warlord Crafting Suite</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
