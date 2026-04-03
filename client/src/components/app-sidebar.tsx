import {
  MessageSquare, BookOpen, Settings,
  Swords, Wand2, Users, User, Wallet, Trophy, Sword, Crown,
  Joystick, Puzzle, Zap, Rocket, Box, Plane, Shield, Target, Crosshair, Map,
  Sparkles, Grid3X3, UserCog, Bug, TreeDeciduous, Car, Hexagon, Gamepad2,
  Compass, Fish, Hammer, FolderOpen, HardDrive, Globe, Warehouse, Link2, Package,
  ChevronDown, Coins, Star, LogOut, Plus, RefreshCw,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { logout } from "@/lib/auth";
import { GrudgeLogo } from "@/components/GrudgeLogo";
import { PayBadge } from "@/components/PayGate";
import { useCharacter, CLASS_COLOR } from "@/contexts/CharacterContext";

const mainMenuItems = [
  {
    title: "Chat Assistant",
    url: "/",
    icon: MessageSquare,
  },
  {
    title: "RTS Builder",
    url: "/rts-builder",
    icon: Swords,
  },
  {
    title: "Warlords Builder",
    url: "/warlords",
    icon: Map,
    badge: "3D",
  },
  {
    title: "Map Editor",
    url: "/map-editor",
    icon: Grid3X3,
    badge: "2D/3D",
  },
  {
    title: "Character Editor",
    url: "/character-editor",
    icon: UserCog,
    badge: "AI",
  },
  {
    title: "2D Sprite Editor",
    url: "/sprite-editor",
    icon: Sparkles,
    badge: "2D",
  },
  {
    title: "Effects Playground",
    url: "/effects",
    icon: Wand2,
  },
  {
    title: "ObjectStore Library",
    url: "/asset-library",
    icon: Package,
    badge: "8K+",
  },
  {
    title: "Asset Gallery",
    url: "/asset-gallery",
    icon: Box,
  },
  {
    title: "Skill Tree Editor",
    url: "/skill-tree",
    icon: TreeDeciduous,
  },
  {
    title: "Documentation",
    url: "/docs",
    icon: BookOpen,
  },
];

const warlordSuiteItems = [
  {
    title: "Skill Tree",
    url: "/warlord-suite/skill-tree",
    icon: TreeDeciduous,
    badge: "WCS",
  },
  {
    title: "Arsenal",
    url: "/warlord-suite/arsenal",
    icon: Shield,
    badge: "Items",
  },
  {
    title: "Crafting",
    url: "/warlord-suite/crafting",
    icon: Hammer,
    badge: "WCS",
  },
  {
    title: "Weapon Skills",
    url: "/warlord-suite/weapon-skills",
    icon: Sword,
    badge: "WCS",
  },
  {
    title: "Character Builder",
    url: "/warlord-suite/character-builder",
    icon: UserCog,
    badge: "WCS",
  },
];

const featured3DGames = [
  {
    title: "Betta Warlords",
    url: "/betta-warlords",
    icon: Fish,
    badge: "RPG",
  },
  {
    title: "GrudgeBox",
    url: "/grudge-box",
    icon: Swords,
    badge: "Fight",
  },
  {
    title: "Crypt Crawlers",
    url: "/crypt-crawlers",
    icon: Compass,
    badge: "Crawl",
  },
  {
    title: "Overdrive",
    url: "/grudge-drive",
    icon: Car,
    badge: "2D",
  },
  {
    title: "Grudge Drift",
    url: "/drift",
    icon: Car,
    badge: "3D",
  },
  {
    title: "Crown Clash",
    url: "/crown-clash",
    icon: Crown,
    badge: "PvE",
  },
  {
    title: "Grudge Arena",
    url: "/arena",
    icon: Crosshair,
    badge: "3D",
  },
  {
    title: "Grudge Gangs",
    url: "/moba",
    icon: Target,
    badge: "MOBA",
  },
  {
    title: "Flight Simulator",
    url: "/flight",
    icon: Plane,
    badge: "3D",
  },
  {
    title: "Decay",
    url: "/decay",
    icon: Bug,
    badge: "FPS",
  },
  {
    title: "Swarm RTS",
    url: "/swarm-rts",
    icon: Hexagon,
    badge: "RTS",
  },
  {
    title: "MMO World",
    url: "/mmo",
    icon: Users,
    badge: "MMO",
  },
  {
    title: "Grudge Swarm",
    url: "/grudge-swarm",
    icon: Hexagon,
    badge: "RTS",
  },
  {
    title: "Gruda Wars",
    url: "/gruda-wars",
    icon: Sword,
    badge: "RPG",
  },
  {
    title: "Nexus Nemesis",
    url: "/nexus-nemesis",
    icon: Crown,
    badge: "TCG",
  },
  {
    title: "Galactic Conquest",
    url: "/swarm-galactic",
    icon: Globe,
    badge: "RTS",
  },
  {
    title: "Dungeon Crawler",
    url: "/dungeon-crawler",
    icon: Swords,
    badge: "Dungeon",
  },
  {
    title: "Reef Hunt",
    url: "/reef-hunt",
    icon: Fish,
    badge: "3D",
  },
  {
    title: "Grudge Factory",
    url: "/grudge-factory",
    icon: Hammer,
    badge: "Sim",
  },
  {
    title: "All Games",
    url: "/games",
    icon: Gamepad2,
  },
];

const arcadeGames = [
  {
    title: "Platformer",
    url: "/platformer",
    icon: Joystick,
  },
  {
    title: "Puzzle Match",
    url: "/puzzle",
    icon: Puzzle,
  },
  {
    title: "Endless Runner",
    url: "/runner",
    icon: Zap,
  },
  {
    title: "Space Shooter",
    url: "/shooter",
    icon: Rocket,
  },
  {
    title: "Realm Protector",
    url: "/realm",
    icon: Shield,
  },
];

const gameSystemItems = [
  {
    title: "Game Lobbies",
    url: "/lobby",
    icon: Users,
  },
  {
    title: "Characters",
    url: "/characters",
    icon: Sword,
  },
  {
    title: "Wallet",
    url: "/wallet",
    icon: Wallet,
  },
  {
    title: "Achievements",
    url: "/achievements",
    icon: Trophy,
  },
  {
    title: "Projects",
    url: "/projects",
    icon: FolderOpen,
  },
  {
    title: "Admin Storage",
    url: "/admin-storage",
    icon: HardDrive,
  },
  {
    title: "Connections",
    url: "/connections",
    icon: Link2,
  },
];

function CharacterPanel() {
  const { activeCharacter, characters, setActiveCharacter, isLoading, refetch } = useCharacter();
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="mx-2 mb-2 rounded-lg border border-border/30 bg-muted/20 p-3 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-2" />
        <div className="h-2 w-16 bg-muted rounded" />
      </div>
    );
  }

  if (!activeCharacter) {
    return (
      <div className="mx-2 mb-2">
        <Link href="/characters">
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-amber-800/40 bg-amber-950/10 px-3 py-2.5 text-xs text-amber-500/70 hover:border-amber-600/60 hover:text-amber-400 transition-colors cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            <span style={{ fontFamily: 'Cinzel, serif' }}>Create Character</span>
          </div>
        </Link>
      </div>
    );
  }

  const classColor = CLASS_COLOR[activeCharacter.class?.toLowerCase()] || '#d97706';
  const initial = activeCharacter.name?.[0]?.toUpperCase() || '?';

  return (
    <div className="mx-2 mb-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full rounded-lg border bg-gradient-to-br from-muted/40 to-background/60 p-2.5 hover:border-amber-700/40 transition-colors group"
            style={{ borderColor: classColor + '33' }}>
            <div className="flex items-center gap-2.5">
              {/* Avatar with class color */}
              <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${classColor}99, ${classColor}44)`, border: `1px solid ${classColor}55` }}>
                {initial}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-xs font-semibold truncate text-foreground/90" style={{ fontFamily: 'Cinzel, serif' }}>
                  {activeCharacter.name}
                </div>
                <div className="text-[10px] text-muted-foreground capitalize">
                  {activeCharacter.race} {activeCharacter.class} · Lv{activeCharacter.level}
                </div>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-0.5 text-[10px] text-amber-400/80">
                  <Coins className="w-2.5 h-2.5" />
                  {(activeCharacter.gold ?? 0).toLocaleString()}
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground" />
              </div>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground uppercase tracking-wider">Switch Character</div>
          <DropdownMenuSeparator />
          {characters.map(c => (
            <DropdownMenuItem key={c.id} onClick={() => setActiveCharacter(c)}
              className={`flex items-center gap-2 ${c.id === activeCharacter.id ? 'bg-muted/50' : ''}`}>
              <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ background: CLASS_COLOR[c.class?.toLowerCase()] || '#d97706' }}>
                {c.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground capitalize">{c.race} {c.class} · Lv{c.level}</div>
              </div>
              {c.id === activeCharacter.id && <Star className="w-3 h-3 text-amber-400 flex-shrink-0" />}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/characters" className="flex items-center gap-2 cursor-pointer">
              <Plus className="w-3.5 h-3.5" />
              <span className="text-xs">New Character</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={refetch} className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="text-xs">Refresh</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-2 pb-0">
        <Link href="/" className="block">
          <GrudgeLogo />
        </Link>
      </SidebarHeader>

      {/* Live character panel */}
      <div className="mt-2">
        <CharacterPanel />
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-wider text-muted-foreground">Command Center</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url || (item.url !== "/" && location.startsWith(item.url))}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-yellow-500/20 text-yellow-400 border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-wider text-muted-foreground flex items-center gap-1">
            <Warehouse className="h-3 w-3 text-cyan-500" />
            Warlord Suite
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {warlordSuiteItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url || location.startsWith(item.url)}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-cyan-500/20 text-cyan-400 border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-wider text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-yellow-500" />
            Featured Games
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {featured3DGames.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.title}</span>
                      {item.badge && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/20 text-amber-400 border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-wider text-muted-foreground flex items-center gap-1">
            <Gamepad2 className="h-3 w-3" />
            Arcade Games
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {arcadeGames.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-xs tracking-wider text-muted-foreground">Warrior Hub</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {gameSystemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    data-active={location === item.url}
                    data-testid={`link-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-1 border-t border-border/30">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-active={location === "/profile"} data-testid="link-profile">
              <Link href="/profile">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-amber-500 to-red-700 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
                  {user?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="truncate text-xs">{user?.username || 'Profile'}</span>
                {user?.role && user.role !== 'pleb' && user.role !== 'guest' && (
                  <Badge className="text-[8px] px-1 py-0 h-3.5 bg-amber-500/20 text-amber-400 border-0 capitalize">{user.role}</Badge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild data-active={location === "/settings"} data-testid="link-settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={logout} data-testid="button-logout" className="text-muted-foreground/70 hover:text-red-400">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
