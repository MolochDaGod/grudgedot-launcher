import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
// ViewportAssetViewer removed (Three.js) — will rebuild on BabylonJS
const ViewportAssetViewer = ({ asset, ...props }: any) => (
  <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">3D Preview (BabylonJS rebuild pending)</div>
);
const ImageViewport = ({ src, ...props }: any) => (
  <img src={src} className="max-w-full max-h-full object-contain" alt="" />
);
import { 
  Search, 
  RefreshCw, 
  Box, 
  Sword, 
  Shield, 
  Users, 
  Castle, 
  Loader2,
  Eye,
  X,
  FileBox,
  Image as ImageIcon,
  Sparkles,
  CloudUpload,
  AlertCircle,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Music,
  Grid3X3,
  Film,
  Layers,
  Upload,
  Database,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ViewportAsset } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import {
  useObjectStoreAssets,
  useObjectStoreUpload,
  useObjectStoreHealth,
  getR2FileUrl,
  type R2Asset,
  type R2ListQuery,
} from "@/lib/objectstore";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  unit: <Users className="h-4 w-4" />,
  weapon: <Sword className="h-4 w-4" />,
  siege: <Castle className="h-4 w-4" />,
  building: <Castle className="h-4 w-4" />,
  equipment: <Shield className="h-4 w-4" />,
  sound: <Volume2 className="h-4 w-4" />,
  background: <ImageIcon className="h-4 w-4" />,
  tileset: <Grid3X3 className="h-4 w-4" />,
  sprite: <Layers className="h-4 w-4" />,
  animation: <Film className="h-4 w-4" />,
};

const FACTION_COLORS: Record<string, string> = {
  orcs: "bg-green-600 text-white",
  elves: "bg-blue-500 text-white",
  humans: "bg-amber-500 text-white",
  undead: "bg-purple-600 text-white",
  skeletons: "bg-gray-500 text-white",
  combat: "bg-red-600 text-white",
  ui: "bg-cyan-600 text-white",
  music: "bg-pink-600 text-white",
  environment: "bg-green-700 text-white",
  player: "bg-blue-600 text-white",
  nature: "bg-emerald-600 text-white",
  sky: "bg-indigo-600 text-white",
  desert: "bg-orange-600 text-white",
  urban: "bg-slate-600 text-white",
  terrain: "bg-lime-600 text-white",
  dungeon: "bg-stone-600 text-white",
  platformer: "bg-yellow-600 text-white",
  character: "bg-violet-600 text-white",
  enemy: "bg-rose-600 text-white",
  item: "bg-amber-600 text-white",
  projectile: "bg-orange-500 text-white",
  effect: "bg-fuchsia-600 text-white",
};

function AudioPlayer({ src, name }: { src: string; name: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setError(true);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setError(true));
    }
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setIsPlaying(false);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
        <VolumeX className="h-12 w-12 mb-2" />
        <span className="text-xs text-center">Audio unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 bg-gradient-to-br from-red-900/20 to-black">
      <audio ref={audioRef} src={src} preload="metadata" />
      
      <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mb-3 border-2 border-red-600">
        <Music className="h-8 w-8 text-red-500" />
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={togglePlay}
          className="h-10 w-10 bg-red-600 hover:bg-red-700"
          data-testid={`button-audio-play-${name}`}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={handleStop}
          className="h-8 w-8"
          data-testid={`button-audio-stop-${name}`}
        >
          <Square className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="text-xs text-muted-foreground">
        {formatTime(currentTime)} / {formatTime(duration || 0)}
      </div>
    </div>
  );
}

function AnimatedSpritePreview({ src, metadata }: { src: string; metadata: Record<string, unknown> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const frameWidth = (metadata?.frameWidth as number) || 64;
  const frameHeight = (metadata?.frameHeight as number) || 64;
  const totalFrames = (metadata?.frames as number) || 4;
  const fps = (metadata?.fps as number) || 12;

  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      setImageLoaded(true);
    };
    img.onerror = () => setError(true);
    img.src = src;
  }, [src]);

  useEffect(() => {
    if (!imageLoaded) return;

    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % totalFrames);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [imageLoaded, totalFrames, fps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const sx = frame * frameWidth;
    const sy = 0;
    
    ctx.drawImage(
      img,
      sx, sy, frameWidth, frameHeight,
      0, 0, canvas.width, canvas.height
    );
  }, [frame, imageLoaded, frameWidth, frameHeight]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Film className="h-12 w-12 mb-2" />
        <span className="text-xs">Animation unavailable</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-black/50 p-2">
      <canvas 
        ref={canvasRef} 
        width={Math.min(frameWidth * 2, 128)} 
        height={Math.min(frameHeight * 2, 128)}
        className="image-rendering-pixelated"
        style={{ imageRendering: "pixelated" }}
      />
      <Badge className="mt-2 bg-red-600 text-xs">
        Frame {frame + 1}/{totalFrames}
      </Badge>
    </div>
  );
}

function TilesetPreview({ src }: { src: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Grid3X3 className="h-12 w-12 mb-2" />
        <span className="text-xs">Tileset preview unavailable</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black/50 p-2 flex items-center justify-center overflow-hidden">
      <img 
        src={src} 
        alt="Tileset" 
        className="max-w-full max-h-full object-contain"
        style={{ imageRendering: "pixelated" }}
        onError={() => setError(true)}
      />
    </div>
  );
}

function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <ImageIcon className="h-12 w-12 mb-2" />
        <span className="text-xs">Image unavailable</span>
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={alt} 
      className="w-full h-full object-cover"
      onError={() => setError(true)}
    />
  );
}

/** Derive a display-friendly asset type from R2 mime/filename */
function deriveAssetType(asset: R2Asset): string {
  const ext = asset.filename.split(".").pop()?.toLowerCase() || "";
  if (["glb", "gltf"].includes(ext)) return ext;
  if (["fbx", "obj"].includes(ext)) return ext;
  if (["png", "jpg", "jpeg", "gif", "webp", "tga"].includes(ext)) return ext;
  if (["mp3", "wav", "ogg", "flac"].includes(ext)) return "audio";
  if (asset.mime.startsWith("audio/")) return "audio";
  if (asset.mime.startsWith("image/")) return ext || "png";
  if (asset.mime.includes("gltf")) return "glb";
  return ext || "file";
}

/** Derive a URL-safe slug from filename */
function slugify(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

/** Format bytes to human-readable */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetGallery() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<R2Asset | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // ── ObjectStore R2 data layer ─────────────────────────────────────
  const r2Query: R2ListQuery = {
    limit: 100,
    ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
    ...(debouncedSearch ? { q: debouncedSearch } : {}),
  };

  const { data: r2Data, isLoading, isError, error, refetch } = useObjectStoreAssets(r2Query);
  const health = useObjectStoreHealth();
  const uploadMutation = useObjectStoreUpload();

  const assets = r2Data?.items ?? [];

  // Sync R2 → local viewport_assets DB (for 3D viewer compatibility)
  const syncFromStorageMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/viewport-assets/sync-from-storage", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to sync assets from R2");
      return response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "R2 Models Synced",
        description: `Added ${data.added} new models, ${data.skipped} already exist`,
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  // ── Upload handler ────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let category = "uncategorized";
    if (["glb", "gltf", "fbx", "obj"].includes(ext)) category = "3d-models";
    else if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) category = "images";
    else if (["mp3", "wav", "ogg", "flac"].includes(ext)) category = "audio";

    uploadMutation.mutate(
      { file, category, tags: [ext] },
      {
        onSuccess: (result) => {
          toast({ title: "Uploaded", description: `${result.filename} uploaded to ObjectStore R2` });
          setShowUpload(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
        onError: (err) => {
          toast({ title: "Upload Failed", description: String(err), variant: "destructive" });
        },
      },
    );
  }, [uploadMutation, toast]);

  // ── Asset type helpers ────────────────────────────────────────────
  const isSupported3DModel = (t: string) => ["gltf", "glb"].includes(t.toLowerCase());
  const isUnsupported3D = (t: string) => ["obj", "fbx"].includes(t.toLowerCase());
  const isImage = (t: string) => ["png", "jpg", "jpeg", "gif", "webp", "tga", "sprite", "background"].includes(t.toLowerCase());
  const isAudio = (t: string) => ["audio", "sound", "mp3", "wav", "ogg", "flac"].includes(t.toLowerCase());
  const isTileset = (t: string) => t.toLowerCase() === "tileset";
  const isSpritesheet = (t: string) => ["spritesheet", "animation"].includes(t.toLowerCase());

  const renderR2AssetPreview = (asset: R2Asset, isLarge = false) => {
    const fileUrl = getR2FileUrl(asset.id);
    const assetType = deriveAssetType(asset);
    const slug = slugify(asset.filename);

    if (isAudio(assetType)) {
      return <AudioPlayer src={fileUrl} name={slug} />;
    }

    if (isSpritesheet(assetType) && asset.metadata) {
      return <AnimatedSpritePreview src={fileUrl} metadata={asset.metadata} />;
    }

    if (isTileset(assetType)) {
      return <TilesetPreview src={fileUrl} />;
    }

    if (isSupported3DModel(assetType)) {
      return (
        <ViewportAssetViewer
          filePath={fileUrl}
          className="w-full h-full"
          viewportConfig={{ cameraPosition: { x: 3, y: 2, z: 5 } }}
          showControls={isLarge}
          autoRotate={true}
        />
      );
    }

    if (isUnsupported3D(assetType)) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
          <FileBox className="h-12 w-12 mb-2" />
          <span className="text-xs">{assetType.toUpperCase()} (Preview N/A)</span>
        </div>
      );
    }

    if (isImage(assetType)) {
      return <ImagePreview src={fileUrl} alt={asset.filename} />;
    }

    return (
      <div className="w-full h-full flex items-center justify-center">
        <FileBox className="h-12 w-12 text-muted-foreground" />
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full" data-testid="page-asset-gallery">
      <div className="p-6 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3" data-testid="text-page-title">
              <Database className="h-6 w-6" />
              ObjectStore Asset Gallery
              {health.data ? (
                <Badge className="bg-green-600 text-white text-xs font-normal">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> R2 Connected
                </Badge>
              ) : health.isError ? (
                <Badge className="bg-red-600 text-white text-xs font-normal">
                  <XCircle className="h-3 w-3 mr-1" /> R2 Offline
                </Badge>
              ) : null}
            </h1>
            <p className="text-muted-foreground">
              Browse assets stored in ObjectStore R2 — {assets.length} asset{assets.length !== 1 ? "s" : ""} loaded
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => syncFromStorageMutation.mutate()}
              disabled={syncFromStorageMutation.isPending}
              data-testid="button-sync-storage"
            >
              {syncFromStorageMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-2" />
              )}
              Sync R2 → DB
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload to R2
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".glb,.gltf,.fbx,.obj,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.ogg"
              onChange={handleFileUpload}
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search ObjectStore assets by filename..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="bg-black/50 flex-wrap">
              <TabsTrigger value="all" data-testid="tab-all">
                <Box className="h-4 w-4 mr-1" />
                All
              </TabsTrigger>
              <TabsTrigger value="unit" data-testid="tab-unit">
                <Users className="h-4 w-4 mr-1" />
                Characters
              </TabsTrigger>
              <TabsTrigger value="weapon" data-testid="tab-weapon">
                <Sword className="h-4 w-4 mr-1" />
                Weapons
              </TabsTrigger>
              <TabsTrigger value="building" data-testid="tab-building">
                <Castle className="h-4 w-4 mr-1" />
                Buildings
              </TabsTrigger>
              <TabsTrigger value="equipment" data-testid="tab-equipment">
                <Shield className="h-4 w-4 mr-1" />
                Equipment
              </TabsTrigger>
              <TabsTrigger value="3d-models" data-testid="tab-3d-models">
                <FileBox className="h-4 w-4 mr-1" />
                3D Models
              </TabsTrigger>
              <TabsTrigger value="images" data-testid="tab-images">
                <ImageIcon className="h-4 w-4 mr-1" />
                Images
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <ScrollArea className="flex-1 p-6">
        {isError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to Load Assets from ObjectStore</h3>
            <p className="text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "Could not reach ObjectStore R2 Worker"}
            </p>
            <Button
              variant="outline"
              onClick={() => refetch()}
              data-testid="button-retry"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-card/50">
                <CardContent className="p-4">
                  <Skeleton className="aspect-square w-full rounded-lg mb-3" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Database className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Assets in ObjectStore</h3>
            <p className="text-muted-foreground mb-4">
              {debouncedSearch
                ? "No assets match your search. Try a different term."
                : "Upload assets using the 'Upload to R2' button to get started."}
            </p>
            {!debouncedSearch && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
                data-testid="button-upload-empty"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First Asset
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {assets.map((asset) => {
              const assetType = deriveAssetType(asset);
              const slug = slugify(asset.filename);
              return (
                <Card 
                  key={asset.id} 
                  className="bg-card/50 hover-elevate cursor-pointer group overflow-visible"
                  onClick={() => {
                    setSelectedAsset(asset);
                    setShowPreview(true);
                  }}
                  data-testid={`card-asset-${slug}`}
                >
                  <CardContent className="p-4">
                    <div className="aspect-square w-full rounded-lg overflow-hidden bg-black/50 mb-3 relative">
                      {renderR2AssetPreview(asset)}
                      
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 bg-black/70"
                          data-testid={`button-preview-${slug}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {isAudio(assetType) && (
                        <Badge className="absolute top-2 left-2 bg-amber-600 text-white text-xs">
                          Audio
                        </Badge>
                      )}
                      
                      {isSupported3DModel(assetType) && (
                        <Badge className="absolute top-2 left-2 bg-blue-600 text-white text-xs">
                          3D
                        </Badge>
                      )}
                    </div>
                    
                    <h3 className="font-medium text-white truncate mb-1" data-testid={`text-asset-name-${slug}`}>
                      {asset.filename}
                    </h3>
                    
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {CATEGORY_ICONS[asset.category] || <Box className="h-3 w-3" />}
                        <span className="ml-1">{asset.category}</span>
                      </Badge>
                      <Badge variant="outline" className="text-xs uppercase">
                        {assetType}
                      </Badge>
                      {asset.size > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {formatBytes(asset.size)}
                        </Badge>
                      )}
                    </div>
                    
                    {asset.tags && asset.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {asset.tags.slice(0, 3).map((tag, i) => (
                          <Badge 
                            key={i}
                            className={`text-xs ${FACTION_COLORS[tag] || "bg-gray-600 text-white"}`}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Detail preview dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              {selectedAsset?.filename}
              {selectedAsset && isAudio(deriveAssetType(selectedAsset)) && (
                <Badge className="bg-amber-600 text-white">Audio</Badge>
              )}
              {selectedAsset && isSupported3DModel(deriveAssetType(selectedAsset)) && (
                <Badge className="bg-blue-600 text-white">3D Model</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {selectedAsset && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="aspect-square rounded-lg overflow-hidden bg-black/50">
                {renderR2AssetPreview(selectedAsset, true)}
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">R2 File URL</h4>
                  <code className="text-xs bg-black/50 p-2 rounded block overflow-x-auto">
                    {getR2FileUrl(selectedAsset.id)}
                  </code>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Storage Key</h4>
                  <code className="text-xs bg-black/50 p-2 rounded block overflow-x-auto">
                    {selectedAsset.key}
                  </code>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Category</h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">
                      {CATEGORY_ICONS[selectedAsset.category] || <Box className="h-3 w-3" />}
                      <span className="ml-1">{selectedAsset.category}</span>
                    </Badge>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">MIME</h4>
                    <Badge variant="secondary">{selectedAsset.mime}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Size</h4>
                    <Badge variant="secondary">{formatBytes(selectedAsset.size)}</Badge>
                  </div>
                </div>
                
                {selectedAsset.tags && selectedAsset.tags.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Tags</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedAsset.tags.map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedAsset.metadata && Object.keys(selectedAsset.metadata).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Metadata</h4>
                    <pre className="text-xs bg-black/50 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(selectedAsset.metadata, null, 2)}
                    </pre>
                  </div>
                )}
                
                <div className="pt-4 flex gap-2">
                  <Button 
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={() => {
                      navigator.clipboard.writeText(getR2FileUrl(selectedAsset.id));
                      toast({ title: "Copied", description: "R2 file URL copied to clipboard" });
                    }}
                    data-testid="button-copy-url"
                  >
                    Copy R2 URL
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAsset.id);
                      toast({ title: "Copied", description: "Asset ID copied to clipboard" });
                    }}
                    data-testid="button-copy-id"
                  >
                    Copy ID
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
