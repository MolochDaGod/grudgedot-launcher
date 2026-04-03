import { Switch, Route, Link, useLocation } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Gamepad2, Loader2 } from "lucide-react";
import { LoadingProvider } from "@/hooks/useLoading";
import { PuterProvider } from "@/contexts/puter-context";
import { AuthGuard } from "@/components/AuthGuard";
import { CharacterProvider } from "@/contexts/CharacterContext";
import { initGrudgeSSO } from "@/lib/grudge-sso";
import { RouteHealthBadge } from "@/components/RouteHealthBadge";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Enable cross-app SSO token relay for all outbound Grudge links
initGrudgeSSO();

import ChatPage from "@/pages/chat";
import NotFound from "@/pages/not-found";

const AuthPage = lazy(() => import("@/pages/auth"));
const PrivacyPage = lazy(() => import("@/pages/privacy"));
const TermsPage = lazy(() => import("@/pages/tos"));

const ProjectsPage = lazy(() => import("@/pages/projects"));
const DocsPage = lazy(() => import("@/pages/docs"));
const RtsBuilder = lazy(() => import("@/pages/rts-builder"));
const EffectsPlayground = lazy(() => import("@/pages/effects-playground"));
const LobbyPage = lazy(() => import("@/pages/lobby"));
const ProfilePage = lazy(() => import("@/pages/profile"));
const CharactersPage = lazy(() => import("@/pages/characters"));
const WalletPage = lazy(() => import("@/pages/wallet"));
const AchievementsPage = lazy(() => import("@/pages/achievements"));
const CrownClash = lazy(() => import("@/pages/crown-clash"));
const PlatformerGame = lazy(() => import("@/pages/platformer-game"));
const PuzzleGame = lazy(() => import("@/pages/puzzle-game"));
const RunnerGame = lazy(() => import("@/pages/runner-game"));
const ShooterGame = lazy(() => import("@/pages/shooter-game"));
const FlightSimulator = lazy(() => import("@/pages/flight-simulator"));
const RealmProtector = lazy(() => import("@/pages/realm-protector"));
const GrudgeGangs = lazy(() => import("@/pages/grudge-gangs"));
const GrudgeArena = lazy(() => import("@/pages/grudge-arena"));
const GrudgeArenaV1 = lazy(() => import("@/pages/grudge-arena-v1"));
const AssetGallery = lazy(() => import("@/pages/asset-gallery"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const GrudgeWarlords = lazy(() => import("@/pages/grudge-warlords"));
const MapEditor = lazy(() => import("@/pages/map-editor"));
const CharacterEditor = lazy(() => import("@/pages/character-editor"));
const GrudgeDrive = lazy(() => import("@/pages/grudge-drive"));
const GrudgeDrift = lazy(() => import("@/pages/grudge-drift"));
const Decay = lazy(() => import("@/pages/decay"));
const AdminStorage = lazy(() => import("@/pages/admin-storage"));
const SkillTreeEditor = lazy(() => import("@/pages/skill-tree-editor"));
const SwarmRTS = lazy(() => import("@/pages/swarm-rts"));
const SwarmGalactic = lazy(() => import("@/pages/swarm-galactic"));
const MMOWorld = lazy(() => import("@/pages/mmo-world"));
const MMOWorldV1 = lazy(() => import("@/pages/mmo-world-v1"));
const FeaturedGames = lazy(() => import("@/pages/featured-games"));
const GrudgeSwarm = lazy(() => import("@/pages/grudge-swarm"));
const GrudaWars = lazy(() => import("@/pages/gruda-wars"));
const OnboardingPage = lazy(() => import("@/pages/onboarding"));
const BettaWarlords = lazy(() => import("@/pages/betta-warlords"));
const GrudgeBoxPage = lazy(() => import("@/pages/grudge-box"));
const CryptCrawlers = lazy(() => import("@/pages/crypt-crawlers"));
const WarlordSuite = lazy(() => import("@/pages/warlord-suite"));
const ConnectionsPage = lazy(() => import("@/pages/connections"));
const NexusNemesis = lazy(() => import("@/pages/nexus-nemesis"));
const AssetLibrary = lazy(() => import("@/pages/asset-library"));
const DungeonCrawler = lazy(() => import("@/pages/dungeon-crawler"));
const SpriteCharEditor = lazy(() => import("@/pages/sprite-char-editor"));
const ReefHunt = lazy(() => import("@/tabs/reef-hunt/index"));
const GrudgeFactory = lazy(() => import("@/tabs/grudge-factory/index"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={ChatPage} />
        <Route path="/projects" component={ProjectsPage} />
        <Route path="/docs" component={DocsPage} />
        <Route path="/rts-builder" component={RtsBuilder} />
        <Route path="/rts-builder/:id" component={RtsBuilder} />
        <Route path="/effects" component={EffectsPlayground} />
        <Route path="/lobby" component={LobbyPage} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/characters" component={CharactersPage} />
        <Route path="/wallet" component={WalletPage} />
        <Route path="/connections" component={ConnectionsPage} />
        <Route path="/achievements" component={AchievementsPage} />
        <Route path="/crown-clash" component={CrownClash} />
        <Route path="/platformer" component={PlatformerGame} />
        <Route path="/puzzle" component={PuzzleGame} />
        <Route path="/runner" component={RunnerGame} />
        <Route path="/shooter" component={ShooterGame} />
        <Route path="/flight" component={FlightSimulator} />
        <Route path="/realm" component={RealmProtector} />
        <Route path="/moba" component={GrudgeGangs} />
        <Route path="/arena" component={GrudgeArena} />
        <Route path="/arena/v1" component={GrudgeArenaV1} />
        <Route path="/asset-gallery" component={AssetGallery} />
        <Route path="/settings" component={SettingsPage} />
        <Route path="/warlords" component={GrudgeWarlords} />
        <Route path="/map-editor" component={MapEditor} />
        <Route path="/character-editor" component={CharacterEditor} />
        <Route path="/grudge-drive" component={GrudgeDrive} />
        <Route path="/drift" component={GrudgeDrift} />
        <Route path="/decay" component={Decay} />
        <Route path="/admin-storage" component={AdminStorage} />
        <Route path="/skill-tree" component={SkillTreeEditor} />
        <Route path="/swarm-rts" component={SwarmRTS} />
        <Route path="/swarm-galactic" component={SwarmGalactic} />
        <Route path="/mmo" component={MMOWorld} />
        <Route path="/mmo/v1" component={MMOWorldV1} />
        <Route path="/games" component={FeaturedGames} />
        <Route path="/grudge-swarm" component={GrudgeSwarm} />
        <Route path="/gruda-wars" component={GrudaWars} />
        <Route path="/onboarding" component={OnboardingPage} />
        <Route path="/betta-warlords" component={BettaWarlords} />
        <Route path="/grudge-box" component={GrudgeBoxPage} />
        <Route path="/crypt-crawlers" component={CryptCrawlers} />
        <Route path="/warlord-suite/:page?" component={WarlordSuite} />
        <Route path="/nexus-nemesis" component={NexusNemesis} />
        <Route path="/asset-library" component={AssetLibrary} />
        <Route path="/dungeon-crawler" component={DungeonCrawler} />
        <Route path="/sprite-editor" component={SpriteCharEditor} />
        <Route path="/reef-hunt" component={ReefHunt} />
        <Route path="/grudge-factory" component={GrudgeFactory} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function Header() {
  const [location] = useLocation();
  
  const getPageTitle = () => {
    if (location === "/") return "Battle Station";
    if (location === "/projects") return "War Room";
    if (location.startsWith("/rts-builder")) return "RTS Forge";
    if (location === "/effects") return "Power Core";
    if (location === "/asset-gallery") return "Asset Gallery";
    if (location === "/docs") return "Strategy Guide";
    if (location === "/crown-clash") return "Crown Clash";
    if (location === "/platformer") return "Pixel Warrior";
    if (location === "/puzzle") return "Gem Crusher";
    if (location === "/runner") return "Sprint Master";
    if (location === "/shooter") return "Space Assault";
    if (location === "/flight") return "Sky Command";
    if (location === "/realm") return "Realm Protector";
    if (location === "/moba") return "Grudge Gangs";
    if (location === "/arena") return "Grudge Arena";
    if (location === "/lobby") return "Battle Lobby";
    if (location === "/characters") return "Fighters";
    if (location === "/wallet") return "War Chest";
    if (location === "/connections") return "Connections";
    if (location === "/achievements") return "Glory Hall";
    if (location === "/profile") return "Commander";
    if (location === "/settings") return "Settings";
    if (location === "/map-editor") return "Map Editor";
    if (location === "/character-editor") return "Character Editor";
    if (location === "/grudge-drive") return "Overdrive";
    if (location === "/drift") return "Grudge Drift";
    if (location === "/decay") return "Decay";
    if (location === "/admin-storage") return "Storage Admin";
    if (location === "/skill-tree") return "Skill Tree Editor";
    if (location === "/swarm-rts") return "Swarm RTS";
    if (location === "/swarm-galactic") return "Galactic Conquest";
    if (location === "/warlords") return "Grudge Warlords";
    if (location === "/grudge-swarm") return "Grudge Swarm";
    if (location === "/gruda-wars") return "Gruda Wars";
    if (location === "/mmo") return "MMO World";
    if (location === "/games") return "Featured Games";
    if (location === "/onboarding") return "Get Started";
    if (location === "/betta-warlords") return "Betta Warlords";
    if (location === "/grudge-box") return "GrudgeBox";
    if (location === "/crypt-crawlers") return "Crypt Crawlers";
    if (location.startsWith("/warlord-suite")) return "Warlord Suite";
    if (location === "/nexus-nemesis") return "Nexus Nemesis";
    if (location === "/asset-library") return "ObjectStore Library";
    if (location === "/dungeon-crawler") return "Dungeon Crawler";
    if (location === "/sprite-editor") return "2D Sprite Editor";
    if (location === "/reef-hunt") return "Reef Hunt";
    if (location === "/grudge-factory") return "Grudge Factory";
    return "Grudge Brawl";
  };

  const isGamePage = ["/crown-clash", "/platformer", "/puzzle", "/runner", "/shooter", "/flight", "/realm", "/moba", "/arena", "/grudge-drive", "/drift", "/decay", "/swarm-rts", "/swarm-galactic", "/grudge-swarm", "/gruda-wars", "/mmo", "/betta-warlords", "/grudge-box", "/crypt-crawlers", "/warlord-suite", "/nexus-nemesis", "/dungeon-crawler", "/reef-hunt", "/grudge-factory"].some(
    path => location === path
  );

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b shrink-0 bg-sidebar z-10 gap-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger data-testid="button-sidebar-toggle" />
        <div className="h-6 w-px bg-border" />
        <h1 
          className="text-lg font-bold uppercase tracking-wide hidden sm:block"
          style={{ fontFamily: 'Cinzel, serif' }}
          data-testid="text-page-title"
        >
          {getPageTitle()}
        </h1>
        {isGamePage && (
          <Badge variant="secondary" className="hidden md:flex">
            <Gamepad2 className="h-3 w-3 mr-1" />
            Playing
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="hidden sm:flex" data-testid="button-home">
          <Link href="/">
            <Home className="h-4 w-4" />
          </Link>
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}

function AppLayout() {
  const style = {
    "--sidebar-width": "17rem",
    "--sidebar-width-icon": "3.5rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen-safe w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto scroll-touch no-pull-refresh">
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      <RouteHealthBadge />
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LoadingProvider>
          <PuterProvider>
            <CharacterProvider>
              <Suspense fallback={<PageLoader />}>
                <AuthRouter />
              </Suspense>
            </CharacterProvider>
          </PuterProvider>
        </LoadingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

/**
 * Top-level router: /auth is rendered outside AuthGuard so it's always accessible.
 * Everything else goes through AuthGuard → AppLayout.
 */
function AuthRouter() {
  return (
    <Switch>
      <Route path="/auth">
        <AuthPage />
        <Toaster />
      </Route>
      <Route path="/privacy">
        <PrivacyPage />
      </Route>
      <Route path="/tos">
        <TermsPage />
      </Route>
      <Route>
        <AuthGuard>
          <AppLayout />
          <Toaster />
        </AuthGuard>
      </Route>
    </Switch>
  );
}
