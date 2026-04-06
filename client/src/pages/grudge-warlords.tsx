import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Home, 
  Map, 
  Maximize2, 
  Minimize2, 
  Play, 
  Settings,
  Layers,
  Mountain,
  Building,
  Trees,
  Sword,
  Users,
  Gamepad2,
  Info,
  Code,
  Bug,
  RefreshCw,
  ExternalLink,
  User,
  Box,
  Upload,
  Keyboard
} from "lucide-react";
import { Link } from "wouter";
import { HotkeyEditor } from "@/components/game-ui";

const SCENES = [
  { id: "viewer", name: "Asset Viewer", description: "View and configure models with animations" },
  { id: "builder", name: "Builder", description: "Full editor with placement tools" },
  { id: "testing", name: "Testing Grounds", description: "Large 3000m terrain for testing" },
  { id: "outdoor", name: "Outdoor", description: "Open world terrain exploration" },
  { id: "day", name: "Day", description: "Dynamic terrain with daylight" },
  { id: "night", name: "Night", description: "Castle and night environment" },
  { id: "inn", name: "Inn", description: "Interior tavern scene" },
  { id: "town", name: "Town", description: "Medieval town with buildings" },
  { id: "room", name: "Room", description: "Interior room scene" },
  { id: "underground", name: "Underground", description: "Dungeon environment" }
];

const BIOMES = [
  { id: "grassland", name: "Grassland" },
  { id: "desert", name: "Desert" },
  { id: "forest", name: "Forest" },
  { id: "snow", name: "Snow" },
  { id: "volcanic", name: "Volcanic" }
];

const TERRAIN_SIZES = [
  { id: "small", name: "Small (500m)" },
  { id: "medium", name: "Medium (1km)" },
  { id: "large", name: "Large (2km)" },
  { id: "testing", name: "Testing (3km)" },
  { id: "massive", name: "Massive (4km)" }
];

const TERRAIN_TYPES = [
  { id: "flat", name: "Flat" },
  { id: "heightmap", name: "Heightmap" },
  { id: "procedural", name: "Procedural" }
];

const ENTITY_TYPES = [
  { id: "character", name: "Character", icon: "user" },
  { id: "npc", name: "NPC", icon: "users" },
  { id: "monster", name: "Monster", icon: "skull" },
  { id: "building", name: "Building", icon: "building" },
  { id: "prop", name: "Prop", icon: "box" },
  { id: "spell", name: "Spell", icon: "sparkles" },
  { id: "vehicle", name: "Vehicle", icon: "car" },
  { id: "weapon", name: "Weapon", icon: "sword" }
];

const AVAILABLE_MODELS = [
  { id: "boxman", name: "Boxman (Default)", path: "/public-objects/assets/sketchbook/characters/boxman.glb" },
  { id: "human", name: "Human Body", path: "/public-objects/assets/human/Human GLTF/Human Body.glb" },
  { id: "car", name: "Car", path: "/public-objects/assets/sketchbook/vehicles/car.glb" },
  { id: "airplane", name: "Airplane", path: "/public-objects/assets/sketchbook/vehicles/airplane.glb" },
  { id: "heli", name: "Helicopter", path: "/public-objects/assets/sketchbook/vehicles/heli.glb" },
  { id: "world", name: "World", path: "/public-objects/assets/sketchbook/worlds/world.glb" },
  { id: "custom", name: "Custom URL", path: "custom" }
];

export default function GrudgeWarlords() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  const [selectedScene, setSelectedScene] = useState("outdoor");
  const [debugMode, setDebugMode] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [selectedModel, setSelectedModel] = useState("boxman");
  const [customModelUrl, setCustomModelUrl] = useState("");
  const [selectedBiome, setSelectedBiome] = useState("grassland");
  const [selectedTerrainSize, setSelectedTerrainSize] = useState("testing");
  const [selectedTerrainType, setSelectedTerrainType] = useState("flat");
  const [selectedEntityType, setSelectedEntityType] = useState("character");
  const [viewerAnimations, setViewerAnimations] = useState<string[]>([]);
  const [currentAnimation, setCurrentAnimation] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch models from the asset registry (with UUIDs and URLs)
  const { data: assetRegistry } = useQuery<{ count: number; models: Array<{ id: string; uuid: string; filename: string; url: string; folder: string; size?: number }> }>({
    queryKey: ["/api/asset-registry/models"],
    enabled: activeTab === "builder"
  });

  const glbAssets = assetRegistry?.models || [];

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getModelPath = () => {
    if (selectedModel === "custom") return customModelUrl;
    if (selectedModel.startsWith("storage:")) {
      const assetId = selectedModel.replace("storage:", "");
      const asset = glbAssets.find(a => a.id === assetId);
      return asset?.url || "";
    }
    const presetModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);
    return presetModel?.path || AVAILABLE_MODELS[0].path;
  };

  // Grudge Engine external URL (deployed editor)
  const GRUDGE_ENGINE_URL = 'https://grudge-engine-web.vercel.app';

  const getIframeSrc = () => {
    const params = new URLSearchParams();
    params.set("scene", selectedScene);
    if (debugMode) params.set("debug", "true");
    const modelPath = getModelPath();
    if (modelPath) params.set("model", modelPath);
    
    // Add terrain params for Testing Grounds scene
    if (selectedScene === "testing") {
      params.set("biome", selectedBiome);
      params.set("terrainSize", selectedTerrainSize);
      params.set("terrainType", selectedTerrainType);
    }
    
    // Add entity type for Asset Viewer scene
    if (selectedScene === "viewer") {
      params.set("entityType", selectedEntityType);
      params.set("biome", selectedBiome);
    }
    
    // Try local first, fall back to external Grudge Engine
    // Local: /grudge-warlords/index.html (if bundled)
    // External: Grudge Engine deployment
    const localSrc = `/grudge-warlords/index.html?${params.toString()}`;
    const externalSrc = `${GRUDGE_ENGINE_URL}?${params.toString()}`;
    // Use external engine as primary — more reliable than local static file
    return externalSrc;
  };
  
  // Listen for messages from Asset Viewer iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};
      if (type === 'assetViewer:animations') {
        setViewerAnimations(data.animations?.map((a: { name: string }) => a.name) || []);
        setCurrentAnimation(data.currentAnimation);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);
  
  // Send command to Asset Viewer
  const sendViewerCommand = (command: string, data: Record<string, unknown> = {}) => {
    iframeRef.current?.contentWindow?.postMessage({ type: command, data }, '*');
  };
  
  const playAnimation = (name: string) => {
    sendViewerCommand('assetViewer:playAnimation', { name });
    setCurrentAnimation(name);
  };

  const reloadScene = () => {
    setIframeKey(prev => prev + 1);
  };

  const features = [
    {
      icon: <Map className="w-5 h-5" />,
      title: "Procedural Map Generation",
      description: "Create infinite terrain with customizable biomes using WFC algorithm"
    },
    {
      icon: <Building className="w-5 h-5" />,
      title: "Building System",
      description: "Place walls, roofs, and structures with snap-to-grid placement"
    },
    {
      icon: <Trees className="w-5 h-5" />,
      title: "Vegetation & Props",
      description: "Add trees, grass, and environmental details with custom shaders"
    },
    {
      icon: <Mountain className="w-5 h-5" />,
      title: "Terrain Sculpting",
      description: "Raise and lower terrain with height map tools"
    },
    {
      icon: <Sword className="w-5 h-5" />,
      title: "Combat System",
      description: "Test characters with spells, projectiles, and VFX"
    },
    {
      icon: <Users className="w-5 h-5" />,
      title: "Character Editor",
      description: "Customize heroes with equipment, armor, and abilities"
    }
  ];

  const controls = [
    { key: "WASD", action: "Move character" },
    { key: "Mouse", action: "Camera rotation" },
    { key: "Scroll", action: "Zoom in/out" },
    { key: "Click", action: "Select/Place objects" },
    { key: "Tab", action: "Toggle build menu" },
    { key: "Esc", action: "Cancel action" }
  ];

  const shaderTypes = [
    "Terrain Blend", "Grass Alpha", "HP Bars", "Orb VFX", "Trail Effects", "Sword Trails"
  ];

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <iframe
          key={iframeKey}
          src={getIframeSrc()}
          className="w-full h-full border-0"
          title="Grudge Warlords Builder"
          data-testid="iframe-grudge-warlords-fullscreen"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            onClick={reloadScene}
            size="icon"
            variant="outline"
            className="bg-black/50 border-white/20 hover:bg-black/70"
            data-testid="button-reload-fullscreen"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            onClick={toggleFullscreen}
            size="icon"
            variant="outline"
            className="bg-black/50 border-white/20 hover:bg-black/70"
            data-testid="button-exit-fullscreen"
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
        </div>
        <div className="absolute top-4 left-4 flex gap-2 items-center">
          <Select value={selectedScene} onValueChange={(v) => { setSelectedScene(v); reloadScene(); }}>
            <SelectTrigger className="w-40 bg-black/50 border-white/20" data-testid="select-scene-fullscreen">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCENES.map(scene => (
                <SelectItem key={scene.id} value={scene.id}>{scene.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 bg-black/50 px-3 py-2 rounded-md border border-white/20">
            <Bug className="w-4 h-4 text-yellow-500" />
            <Switch 
              checked={debugMode} 
              onCheckedChange={(v) => { setDebugMode(v); reloadScene(); }}
              data-testid="switch-debug-fullscreen"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-home">
                <Home className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-red-500" />
                Grudge Warlords Builder
              </h1>
              <p className="text-muted-foreground text-sm">
                3D Map Editor & Game Tester - Foundation for all 3D games
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-red-500 border-red-500/50">
              Babylon.js 6.x
            </Badge>
            <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
              Havok Physics
            </Badge>
            <Badge variant="outline" className="text-amber-500 border-amber-500/50">
              WebGL 2.0
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-5">
            <TabsTrigger value="builder" data-testid="tab-builder">
              <Map className="w-4 h-4 mr-2" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="scenes" data-testid="tab-scenes">
              <Layers className="w-4 h-4 mr-2" />
              Scenes
            </TabsTrigger>
            <TabsTrigger value="hotkeys" data-testid="tab-hotkeys">
              <Keyboard className="w-4 h-4 mr-2" />
              Hotkeys
            </TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-features">
              <Code className="w-4 h-4 mr-2" />
              Engine
            </TabsTrigger>
            <TabsTrigger value="controls" data-testid="tab-controls">
              <Settings className="w-4 h-4 mr-2" />
              Controls
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder" className="space-y-4">
            <Card className="border-red-500/20">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Play className="w-5 h-5 text-green-500" />
                    Live 3D Editor
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select value={selectedScene} onValueChange={(v) => { setSelectedScene(v); reloadScene(); }}>
                      <SelectTrigger className="w-36" data-testid="select-scene">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCENES.map(scene => (
                          <SelectItem key={scene.id} value={scene.id}>{scene.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedScene === "testing" && (
                      <>
                        <Select value={selectedBiome} onValueChange={(v) => { setSelectedBiome(v); reloadScene(); }}>
                          <SelectTrigger className="w-28" data-testid="select-biome">
                            <SelectValue placeholder="Biome" />
                          </SelectTrigger>
                          <SelectContent>
                            {BIOMES.map(biome => (
                              <SelectItem key={biome.id} value={biome.id}>{biome.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={selectedTerrainSize} onValueChange={(v) => { setSelectedTerrainSize(v); reloadScene(); }}>
                          <SelectTrigger className="w-32" data-testid="select-terrain-size">
                            <SelectValue placeholder="Size" />
                          </SelectTrigger>
                          <SelectContent>
                            {TERRAIN_SIZES.map(size => (
                              <SelectItem key={size.id} value={size.id}>{size.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={selectedTerrainType} onValueChange={(v) => { setSelectedTerrainType(v); reloadScene(); }}>
                          <SelectTrigger className="w-28" data-testid="select-terrain-type">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {TERRAIN_TYPES.map(type => (
                              <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    {selectedScene === "viewer" && (
                      <>
                        <Select value={selectedEntityType} onValueChange={(v) => { setSelectedEntityType(v); reloadScene(); }}>
                          <SelectTrigger className="w-28" data-testid="select-entity-type">
                            <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                            {ENTITY_TYPES.map(type => (
                              <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={selectedBiome} onValueChange={(v) => { setSelectedBiome(v); reloadScene(); }}>
                          <SelectTrigger className="w-28" data-testid="select-viewer-biome">
                            <SelectValue placeholder="Biome" />
                          </SelectTrigger>
                          <SelectContent>
                            {BIOMES.map(biome => (
                              <SelectItem key={biome.id} value={biome.id}>{biome.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                    <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); if (v !== "custom") reloadScene(); }}>
                      <SelectTrigger className="w-36" data-testid="select-model">
                        <User className="w-3 h-3 mr-1" />
                        <SelectValue placeholder="Character" />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_MODELS.map(model => (
                          <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                        ))}
                        {glbAssets.length > 0 && (
                          <>
                            <div className="px-2 py-1.5 text-xs text-muted-foreground font-semibold border-t mt-1">
                              From Storage ({glbAssets.length})
                            </div>
                            {glbAssets.map(asset => (
                              <SelectItem key={`storage:${asset.id}`} value={`storage:${asset.id}`}>
                                <span className="flex items-center gap-1">
                                  <Box className="w-3 h-3" />
                                  <span className="truncate max-w-[120px]">{asset.filename}</span>
                                  <span className="text-[10px] text-muted-foreground">#{asset.id}</span>
                                </span>
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {selectedModel === "custom" && (
                      <div className="flex items-center gap-1">
                        <Input
                          placeholder="GLB URL..."
                          className="w-48 h-8 text-xs"
                          value={customModelUrl}
                          onChange={(e) => setCustomModelUrl(e.target.value)}
                          data-testid="input-custom-model"
                        />
                        <Button size="sm" variant="outline" onClick={reloadScene} data-testid="button-apply-model">
                          <Upload className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="debug-mode" className="text-xs flex items-center gap-1">
                        <Bug className="w-3 h-3" />
                        Inspector
                      </Label>
                      <Switch 
                        id="debug-mode"
                        checked={debugMode} 
                        onCheckedChange={(v) => { setDebugMode(v); reloadScene(); }}
                        data-testid="switch-debug"
                      />
                    </div>
                    <Button
                      onClick={reloadScene}
                      variant="outline"
                      size="icon"
                      data-testid="button-reload"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={toggleFullscreen}
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      data-testid="button-fullscreen"
                    >
                      <Maximize2 className="w-4 h-4" />
                      Fullscreen
                    </Button>
                  </div>
                </div>
                <CardDescription>
                  Build maps, test characters, and create game levels. Enable Inspector for live scene editing.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative w-full aspect-video bg-black rounded-b-lg overflow-hidden">
                  <iframe
                    ref={iframeRef}
                    key={iframeKey}
                    src={getIframeSrc()}
                    className="w-full h-full border-0"
                    title="Grudge Warlords Builder"
                    data-testid="iframe-grudge-warlords"
                  />
                </div>
                {/* Animation controls panel for Asset Viewer */}
                {selectedScene === "viewer" && viewerAnimations.length > 0 && (
                  <div className="p-3 border-t border-red-500/20 bg-black/50">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">Animations:</span>
                      {viewerAnimations.map((anim) => (
                        <Button
                          key={anim}
                          size="sm"
                          variant={currentAnimation === anim ? "default" : "outline"}
                          className="h-6 text-xs"
                          onClick={() => playAnimation(anim)}
                          data-testid={`button-animation-${anim}`}
                        >
                          {anim}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-xs"
                        onClick={() => sendViewerCommand('assetViewer:stopAnimation')}
                        data-testid="button-stop-animation"
                      >
                        Stop
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-500" />
                    Current Scene
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">{SCENES.find(s => s.id === selectedScene)?.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {SCENES.find(s => s.id === selectedScene)?.description}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building className="w-4 h-4 text-orange-500" />
                    Asset Types
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {["Characters", "Weapons", "Buildings", "Terrain", "Props", "VFX"].map((asset) => (
                      <Badge key={asset} variant="secondary" className="text-xs">
                        {asset}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Code className="w-4 h-4 text-green-500" />
                    Custom Shaders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {shaderTypes.map((shader) => (
                      <Badge key={shader} variant="secondary" className="text-xs">
                        {shader}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="scenes" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {SCENES.map((scene) => (
                <Card 
                  key={scene.id} 
                  className={`cursor-pointer transition-all ${selectedScene === scene.id ? 'border-red-500 ring-1 ring-red-500' : 'hover-elevate'}`}
                  onClick={() => { setSelectedScene(scene.id); reloadScene(); }}
                  data-testid={`card-scene-${scene.id}`}
                >
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Layers className={`w-4 h-4 ${selectedScene === scene.id ? 'text-red-500' : 'text-muted-foreground'}`} />
                      {scene.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{scene.description}</p>
                    {selectedScene === scene.id && (
                      <Badge className="mt-2 bg-red-500">Active</Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ExternalLink className="w-5 h-5 text-amber-500" />
                  Direct Scene Access
                </CardTitle>
                <CardDescription>
                  Access scenes directly via URL parameters for integration with other tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <code className="block p-3 bg-muted rounded-md text-sm font-mono">
                    /grudge-warlords/index.html?scene={selectedScene}{debugMode ? '&debug=true' : ''}
                  </code>
                  <p className="text-xs text-muted-foreground">
                    Use <code className="bg-muted px-1 rounded">?scene=</code> to load specific scenes and 
                    <code className="bg-muted px-1 rounded">?debug=true</code> to enable the Babylon.js Inspector
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hotkeys" className="space-y-4">
            <HotkeyEditor
              animations={viewerAnimations}
              currentAnimation={currentAnimation}
              onPlayAnimation={playAnimation}
              onSaveConfig={(config) => {
                localStorage.setItem("grudge-warlords-hotkeys", JSON.stringify(config));
              }}
              onLoadConfig={() => {
                const saved = localStorage.getItem("grudge-warlords-hotkeys");
                return saved ? JSON.parse(saved) : null;
              }}
            />

            <Card className="border-amber-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-amber-500" />
                  Motion Controller Setup
                </CardTitle>
                <CardDescription>
                  Configure your keyboard and mouse as a standard motion controller for character movement
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Default Movement Scheme</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><Badge variant="outline" className="mr-2 font-mono">WASD</Badge> Character movement</p>
                      <p><Badge variant="outline" className="mr-2 font-mono">Mouse</Badge> Camera rotation</p>
                      <p><Badge variant="outline" className="mr-2 font-mono">Scroll</Badge> Zoom in/out</p>
                      <p><Badge variant="outline" className="mr-2 font-mono">Shift</Badge> Sprint modifier</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Animation Triggers</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p><Badge variant="outline" className="mr-2 font-mono">LMB</Badge> Primary attack</p>
                      <p><Badge variant="outline" className="mr-2 font-mono">RMB</Badge> Block/secondary</p>
                      <p><Badge variant="outline" className="mr-2 font-mono">Space</Badge> Jump</p>
                      <p><Badge variant="outline" className="mr-2 font-mono">E</Badge> Interact</p>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use the Hotkey Editor above to customize bindings. Configurations can be exported and imported for different controller layouts.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature, index) => (
                <Card key={index} className="hover-elevate">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="text-red-500">{feature.icon}</span>
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="border-yellow-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-yellow-500" />
                  Engine Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Core Systems</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>SceneManager - Multi-scene handling</li>
                      <li>Havok Physics - Collision & dynamics</li>
                      <li>GLTF Loader - Model import pipeline</li>
                      <li>Shader System - Custom GLSL effects</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Game Systems</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>Character Controller - Movement & camera</li>
                      <li>Combat System - Spells & projectiles</li>
                      <li>Health & Damage - HP bars & popups</li>
                      <li>Procedural Gen - WFC & LLM-assisted</li>
                    </ul>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Badge>Babylon.js 6.x</Badge>
                  <Badge>Havok Physics</Badge>
                  <Badge>ES Modules</Badge>
                  <Badge>Custom Shaders</Badge>
                  <Badge>Mobile Joystick</Badge>
                  <Badge>lil-gui</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="controls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Keyboard & Mouse Controls</CardTitle>
                <CardDescription>
                  Learn how to navigate and use the builder tools
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {controls.map((control, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <Badge variant="outline" className="font-mono">
                        {control.key}
                      </Badge>
                      <span className="text-sm text-muted-foreground">{control.action}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-amber-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-amber-500" />
                    Mobile Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    The builder includes a virtual joystick for mobile devices. 
                    Touch and drag on the left side of the screen to move, 
                    and use gestures to rotate the camera.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bug className="w-5 h-5 text-yellow-500" />
                    Debug Inspector
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Enable the Inspector toggle to access the full Babylon.js scene debugger.
                    Edit materials, transforms, lighting, and physics in real-time.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
