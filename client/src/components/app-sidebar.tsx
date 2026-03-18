import { 
  MessageSquare, BookOpen, Settings, 
  Swords, Wand2, Users, User, Wallet, Trophy, Sword, Crown,
  Joystick, Puzzle, Zap, Rocket, Box, Plane, Shield, Target, Crosshair, Map,
  Sparkles, Grid3X3, UserCog, Bug, TreeDeciduous, Car, Hexagon, Gamepad2,
  Compass, Fish, Hammer, FolderOpen, HardDrive, Globe, Warehouse,
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
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { getAuthData, logout } from "@/lib/auth";

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
    title: "Effects Playground",
    url: "/effects",
    icon: Wand2,
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
    title: "Class Skills",
    url: "/warlord-suite/class-skill",
    icon: Crown,
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
    badge: "Racing",
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
    title: "Galactic Conquest",
    url: "/swarm-galactic",
    icon: Globe,
    badge: "RTS",
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
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const authData = getAuthData();

  return (
    <Sidebar>
      <SidebarHeader className="p-2">
        <Link href="/" className="block hover-elevate rounded-md overflow-hidden">
          <div className="relative w-full rounded-md overflow-hidden bg-gradient-to-r from-yellow-900/80 via-amber-800/60 to-yellow-900/80 border border-yellow-700/30 p-4">
            <div className="text-xl font-bold text-center" style={{ fontFamily: 'Cinzel, serif' }} data-testid="img-logo">
              <span className="text-yellow-400">GRUDGE</span>
              <span className="text-yellow-200/70 text-sm ml-1">Warlords</span>
            </div>
          </div>
        </Link>
      </SidebarHeader>
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
      <SidebarFooter className="p-4 space-y-2">
        {authData ? (
          <div className="space-y-2">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  data-active={location === "/profile"}
                  data-testid="link-profile"
                >
                  <Link href="/profile">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>
                        <User className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">{authData.username}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full" 
              onClick={logout}
              data-testid="button-logout"
            >
              Logout
            </Button>
          </div>
        ) : null}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              data-active={location === "/onboarding"}
              data-testid="link-get-started"
            >
              <Link href="/onboarding">
                <Compass className="h-4 w-4" />
                <span>Get Started</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton 
              asChild 
              data-active={location === "/settings"}
              data-testid="link-settings"
            >
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
