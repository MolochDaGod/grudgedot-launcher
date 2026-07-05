import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sword, Shield, Wand2, Map, Crown, Hexagon, Car, Bug, Users,
  Cloud, CloudOff, CheckCircle2, ChevronRight, ChevronLeft,
  Rocket, Loader2, FolderTree, Sparkles, Gamepad2, Hammer,
  TreeDeciduous, Grid3X3, UserCog, Crosshair, Target, Plane,
  MessageSquare, BookOpen, Box, Zap,
} from "lucide-react";
import { getAuthData } from "@/lib/auth";
import { usePuter } from "@/contexts/puter-context";

const ONBOARDED_KEY = "grudge_onboarded";

// ── Step definitions ──

interface LauncherItem {
  title: string;
  url: string;
  icon: React.ElementType;
  description: string;
  badge?: string;
  category: "tools" | "games";
}

const launchers: LauncherItem[] = [
  // grudgeDot Tools
  { title: "Chat Assistant", url: "/", icon: MessageSquare, description: "AI-powered game dev assistant", category: "tools" },
  { title: "RTS Builder", url: "/rts-builder", icon: Sword, description: "Build real-time strategy levels", badge: "Builder", category: "tools" },
  { title: "Map Editor", url: "/map-editor", icon: Grid3X3, description: "2D/3D tile-based map editor", badge: "2D/3D", category: "tools" },
  { title: "Character Editor", url: "/character-editor", icon: UserCog, description: "Design and balance characters", badge: "AI", category: "tools" },
  { title: "Skill Tree Editor", url: "/skill-tree", icon: TreeDeciduous, description: "Create ability progression trees", category: "tools" },
  { title: "Warlords Builder", url: "/warlords", icon: Map, description: "3D world builder for Grudge Warlords", badge: "3D", category: "tools" },
  { title: "Effects Playground", url: "/effects", icon: Wand2, description: "Particle & shader effects lab", category: "tools" },
  { title: "Asset Gallery", url: "/asset-gallery", icon: Box, description: "Browse and manage game assets", category: "tools" },
  { title: "Documentation", url: "/docs", icon: BookOpen, description: "Guides and API references", category: "tools" },
  // GGE Game Launchers
  { title: "Gruda Wars", url: "/gruda-wars", icon: Sword, description: "RPG dungeon crawler with hero system", badge: "RPG", category: "games" },
  { title: "Crown Clash", url: "/crown-clash", icon: Crown, description: "PvE battle royale arena", badge: "PvE", category: "games" },
  { title: "Grudge Arena", url: "/arena", icon: Crosshair, description: "3D combat arena", badge: "3D", category: "games" },
  { title: "Grudge Gangs", url: "/moba", icon: Target, description: "Team-based MOBA gameplay", badge: "MOBA", category: "games" },
  { title: "Grudge Velocity", url: "/drift", icon: Car, description: "Voxel garage, drift racing, and Overdrive", badge: "Racing", category: "games" },
  { title: "Decay", url: "/decay", icon: Bug, description: "Survival FPS", badge: "FPS", category: "games" },
  { title: "Swarm RTS", url: "/swarm-rts", icon: Hexagon, description: "Real-time swarm strategy", badge: "RTS", category: "games" },
  { title: "MMO World", url: "/mmo", icon: Users, description: "Massively multiplayer RPG world", badge: "MMO", category: "games" },
  { title: "Flight Simulator", url: "/flight", icon: Plane, description: "Aerial combat & flight sim", badge: "3D", category: "games" },
  { title: "Grudge Swarm", url: "/grudge-swarm", icon: Hexagon, description: "Galactic swarm battles", badge: "RTS", category: "games" },
];

const STORAGE_DIRS = [
  { path: "/GRUDA/assets/", desc: "Models, textures, audio" },
  { path: "/GRUDA/projects/", desc: "Saved projects and scenes" },
  { path: "/GRUDA/exports/", desc: "Exported game levels" },
  { path: "/GRUDA/gruda-wars/", desc: "Heroes, saves, settings" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();
  const authData = getAuthData();
  const { isAvailable, isSignedIn, user, signIn, isLoading } = usePuter();
  const [puterConnecting, setPuterConnecting] = useState(false);
  const [dirsReady, setDirsReady] = useState(false);

  const totalSteps = 4; // intro + 3 original steps
  const progressPercent = ((step + 1) / totalSteps) * 100;

  // If already onboarded and navigated here manually, let them through
  useEffect(() => {
    if (isSignedIn && isAvailable) {
      setDirsReady(true);
    }
  }, [isSignedIn, isAvailable]);

  const handleConnectPuter = async () => {
    setPuterConnecting(true);
    try {
      await signIn();
      setDirsReady(true);
    } catch (err) {
      console.error("Puter sign-in failed:", err);
    } finally {
      setPuterConnecting(false);
    }
  };

  const handleComplete = () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    navigate("/");
  };

  const handleSkip = () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a0f] via-yellow-950/20 to-[#0a0a0f] p-4">
      {/* Progress */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Step {step + 1} of {totalSteps}</span>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleSkip}>
            Skip Setup
          </Button>
        </div>
        <Progress value={progressPercent} className="h-1.5" />
      </div>

      {/* Step Content */}
      <div className="w-full max-w-2xl">
        {/* ═══ STEP 0: Intro GIF ═══ */}
        {step === 0 && (
          <div className="flex flex-col items-center justify-center gap-6">
            <img
              src="/assets/intro.gif"
              alt="Welcome to Grudge Studio"
              className="w-full max-w-xl rounded-xl shadow-2xl shadow-yellow-900/40 border border-yellow-600/20"
            />
            <Button
              onClick={() => setStep(1)}
              size="lg"
              className="gap-2 text-lg px-8 bg-gradient-to-r from-yellow-700 to-amber-600 hover:from-yellow-800 hover:to-amber-700 text-black font-semibold"
            >
              Continue <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* ═══ STEP 1: Welcome ═══ */}
        {step === 1 && (
          <Card className="border-yellow-600/30 bg-card/80 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-700 to-amber-600 flex items-center justify-center">
                <Rocket className="w-10 h-10 text-black" />
              </div>
              <CardTitle className="text-3xl">
                Welcome{authData?.username ? `, ${authData.username}` : ""}!
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Your game development command center is ready
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-accent/30">
                  <Hammer className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <p className="font-semibold text-sm">grudgeDot Tools</p>
                  <p className="text-xs text-muted-foreground mt-1">Map editors, character builders, AI assistants</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/30">
                  <Gamepad2 className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                  <p className="font-semibold text-sm">GGE Launchers</p>
                  <p className="text-xs text-muted-foreground mt-1">Play RPGs, racers, FPS, RTS and more</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-accent/30">
                  <Cloud className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="font-semibold text-sm">Puter Cloud</p>
                  <p className="text-xs text-muted-foreground mt-1">Free cloud storage for assets & saves</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground text-center">
                We'll set up your cloud storage and show you around the platform. This only takes a minute.
              </p>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(0)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep(2)} className="gap-2">
                  Get Started <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ STEP 2: Cloud Storage ═══ */}
        {step === 2 && (
          <Card className="border-green-500/30 bg-card/80 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center">
                <Cloud className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl">Cloud Storage</CardTitle>
              <CardDescription className="text-base mt-2">
                Connect Puter for free cloud storage — assets, saves, and project files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection status */}
              <div className="p-4 rounded-lg border bg-accent/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isSignedIn ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <CloudOff className="w-6 h-6 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-semibold text-sm">
                        {isSignedIn ? "Connected to Puter" : "Not connected"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isSignedIn && user
                          ? `Signed in as ${user.username}`
                          : "Sign in to enable cloud features"}
                      </p>
                    </div>
                  </div>
                  {!isSignedIn && (
                    <Button
                      onClick={handleConnectPuter}
                      disabled={puterConnecting || isLoading || !isAvailable}
                      size="sm"
                      className="gap-2"
                    >
                      {puterConnecting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Cloud className="w-4 h-4" />
                      )}
                      Connect Puter
                    </Button>
                  )}
                </div>
              </div>

              {/* Directory structure */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FolderTree className="w-4 h-4" />
                  Your Storage Layout
                </h4>
                <div className="space-y-2">
                  {STORAGE_DIRS.map((dir) => (
                    <div key={dir.path} className="flex items-center gap-3 p-2 rounded bg-accent/10">
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 shrink-0">
                        {dir.path}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{dir.desc}</span>
                      {dirsReady && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!isAvailable && (
                <p className="text-xs text-yellow-400 text-center">
                  Puter SDK is loading... You can skip this step and connect later in Settings.
                </p>
              )}

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep(3)} className="gap-2">
                  {isSignedIn ? "Continue" : "Skip for Now"} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ═══ STEP 3: Launchers ═══ */}
        {step === 3 && (
          <Card className="border-yellow-600/30 bg-card/80 backdrop-blur">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-700 to-amber-600 flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-black" />
              </div>
              <CardTitle className="text-2xl">Your Launchers</CardTitle>
              <CardDescription className="text-base mt-2">
                Build games with grudgeDot tools and play them in GGE
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* grudgeDot Tools */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-yellow-400">
                  <Hammer className="w-4 h-4" />
                  grudgeDot Builder Tools
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {launchers
                    .filter((l) => l.category === "tools")
                    .slice(0, 6)
                    .map((launcher) => (
                      <LauncherCard key={launcher.url} item={launcher} />
                    ))}
                </div>
              </div>

              {/* GGE Game Launchers */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-400">
                  <Gamepad2 className="w-4 h-4" />
                  GGE Game Launchers
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {launchers
                    .filter((l) => l.category === "games")
                    .slice(0, 6)
                    .map((launcher) => (
                      <LauncherCard key={launcher.url} item={launcher} />
                    ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  + more games available in the sidebar
                </p>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={handleComplete} className="gap-2 bg-gradient-to-r from-yellow-700 to-amber-600 hover:from-yellow-800 hover:to-amber-700 text-black font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Enter Battle Station
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-muted-foreground mt-6">
        Powered by <a href="https://developer.puter.com" target="_blank" rel="noopener noreferrer" className="underline">Puter</a> · Grudge Studio
      </p>
    </div>
  );
}

function LauncherCard({ item }: { item: LauncherItem }) {
  const [, navigate] = useLocation();
  const Icon = item.icon;

  return (
    <button
      onClick={() => {
        localStorage.setItem(ONBOARDED_KEY, "true");
        navigate(item.url);
      }}
      className="flex items-center gap-2 p-2.5 rounded-lg border bg-accent/20 hover:bg-accent/40 transition-colors text-left w-full group"
    >
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{item.title}</p>
      </div>
      {item.badge && (
        <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5 shrink-0">
          {item.badge}
        </Badge>
      )}
    </button>
  );
}
