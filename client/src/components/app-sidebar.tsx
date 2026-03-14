import { 
  MessageSquare, BookOpen, Settings, 
  Swords, Wand2, Users, User, Wallet, Trophy, Sword, Crown,
  Joystick, Puzzle, Zap, Rocket, Box, Plane, Shield, Target, Crosshair, Map,
  Sparkles, Grid3X3, UserCog, Bug, TreeDeciduous, Car, Hexagon, Gamepad2,
  Compass, Package,
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

const featured3DGames = [
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
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();
  const authData = getAuthData();

  return (
    <Sidebar>
      <SidebarHeader className="p-2">
        <Link href="/" className="block hover-elevate rounded-md overflow-hidden">
          <div className="relative w-full rounded-md overflow-hidden bg-gradient-to-r from-purple-900 to-blue-900 p-4">
            <div className="text-xl font-bold text-white text-center" data-testid="img-logo">
              Grudge<span className="text-purple-300">Develop</span>
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
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-red-500/20 text-red-400 border-0">
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
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 bg-blue-500/20 text-blue-400 border-0">
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
