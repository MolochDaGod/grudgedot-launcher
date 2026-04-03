import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Image,
  Box,
  Music,
  Video,
  Layers,
  Download,
  Copy,
  ExternalLink,
  Loader2,
  Play,
  Pause,
  Volume2,
  ChevronDown,
  Package,
  Grid3X3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  fetchManifest,
  filterAssets,
  getUniqueCategories,
  formatSize,
  type GDevelopManifest,
  type ObjectStoreAsset,
  type AssetType,
} from "@/lib/objectstore-client";

const TYPE_CONFIG: Record<AssetType, { label: string; icon: typeof Image; color: string }> = {
  icon: { label: "Icons", icon: Image, color: "#f59e0b" },
  sprite: { label: "Sprites", icon: Layers, color: "#22c55e" },
  model: { label: "3D Models", icon: Box, color: "#3b82f6" },
  audio: { label: "Audio", icon: Music, color: "#a855f7" },
  video: { label: "Video", icon: Video, color: "#ef4444" },
};

function AudioPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const toggle = () => {
    if (!ref.current) return;
    playing ? ref.current.pause() : ref.current.play();
    setPlaying(!playing);
  };
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3">
      <audio
        ref={ref}
        src={src}
        onTimeUpdate={() => {
          if (ref.current) setProgress((ref.current.currentTime / ref.current.duration) * 100 || 0);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
      />
      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
        <Volume2 className="w-8 h-8 text-primary" />
      </div>
      <Button size="sm" variant="outline" onClick={toggle} className="gap-2">
        {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        {playing ? "Pause" : "Play"}
      </Button>
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function AssetPreview({ asset }: { asset: ObjectStoreAsset }) {
  if (asset.type === "audio") return <AudioPlayer src={asset.url} />;
  if (asset.type === "video") {
    return (
      <video src={asset.url} controls className="w-full h-full object-contain bg-black rounded" />
    );
  }
  if (asset.previewUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[repeating-conic-gradient(#80808020_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
        <img
          src={asset.previewUrl}
          alt={asset.name}
          className="max-w-full max-h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }
  const TypeIcon = TYPE_CONFIG[asset.type]?.icon || Package;
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/30">
      <TypeIcon className="w-16 h-16 text-muted-foreground/30" />
    </div>
  );
}

function AssetCard({
  asset,
  onSelect,
}: {
  asset: ObjectStoreAsset;
  onSelect: (a: ObjectStoreAsset) => void;
}) {
  return (
    <Card
      className="group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all overflow-hidden"
      onClick={() => onSelect(asset)}
    >
      <div className="aspect-square relative overflow-hidden bg-muted/20">
        {asset.previewUrl ? (
          <img
            src={asset.previewUrl}
            alt={asset.name}
            className="w-full h-full object-contain p-2"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {(() => {
              const Icon = TYPE_CONFIG[asset.type]?.icon || Package;
              return <Icon className="w-8 h-8 text-muted-foreground/40" />;
            })()}
          </div>
        )}
        <Badge
          className="absolute top-1 right-1 text-[10px] px-1.5 py-0"
          style={{ backgroundColor: TYPE_CONFIG[asset.type]?.color || "#888" }}
        >
          {asset.type}
        </Badge>
      </div>
      <CardContent className="p-2">
        <p className="text-xs font-medium truncate" title={asset.name}>
          {asset.name}
        </p>
        <p className="text-[10px] text-muted-foreground truncate">{asset.category}</p>
      </CardContent>
    </Card>
  );
}

const PAGE_SIZE = 120;

export default function AssetLibraryPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selected, setSelected] = useState<ObjectStoreAsset | null>(null);
  const [page, setPage] = useState(0);

  const { data: manifest, isLoading, error } = useQuery<GDevelopManifest>({
    queryKey: ["objectstore-manifest"],
    queryFn: fetchManifest,
    staleTime: 10 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (!manifest) return [];
    return filterAssets(manifest.assets, {
      type: typeFilter === "all" ? undefined : typeFilter,
      category: categoryFilter === "all" ? undefined : categoryFilter,
      search: search || undefined,
    });
  }, [manifest, typeFilter, categoryFilter, search]);

  const paged = useMemo(() => filtered.slice(0, (page + 1) * PAGE_SIZE), [filtered, page]);
  const hasMore = paged.length < filtered.length;

  const categories = useMemo(
    () => getUniqueCategories(manifest?.assets || [], typeFilter === "all" ? undefined : typeFilter),
    [manifest, typeFilter]
  );

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: "URL copied", description: "Asset URL copied to clipboard" });
  };

  // Reset pagination/category on type change
  const handleTypeChange = (val: string) => {
    setTypeFilter(val as AssetType | "all");
    setCategoryFilter("all");
    setPage(0);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full gap-3">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">Loading ObjectStore manifest…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-destructive">Failed to load assets: {String(error)}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "Space Grotesk, sans-serif" }}
              >
                ObjectStore Asset Library
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {manifest?.totalAssets.toLocaleString()} assets from Grudge Studio ObjectStore
              </p>
            </div>
            <a href="https://molochdagod.github.io/ObjectStore" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> ObjectStore
              </Button>
            </a>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets by name, category, or tag…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-10"
            />
          </div>

          {/* Type tabs */}
          <Tabs value={typeFilter} onValueChange={handleTypeChange}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all" className="gap-1.5">
                <Grid3X3 className="h-3.5 w-3.5" />
                All
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {manifest?.totalAssets.toLocaleString()}
                </Badge>
              </TabsTrigger>
              {(Object.entries(TYPE_CONFIG) as [AssetType, typeof TYPE_CONFIG["icon"]][]).map(
                ([key, cfg]) => {
                  const count = manifest?.types[key] || 0;
                  if (!count) return null;
                  const Icon = cfg.icon;
                  return (
                    <TabsTrigger key={key} value={key} className="gap-1.5">
                      <Icon className="h-3.5 w-3.5" />
                      {cfg.label}
                      <Badge variant="secondary" className="ml-1 text-[10px]">
                        {count.toLocaleString()}
                      </Badge>
                    </TabsTrigger>
                  );
                }
              )}
            </TabsList>
          </Tabs>

          {/* Category filter */}
          {categories.length > 1 && (
            <ScrollArea className="mt-2 max-h-10">
              <div className="flex gap-1.5 pb-1">
                <Badge
                  variant={categoryFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer whitespace-nowrap text-xs"
                  onClick={() => { setCategoryFilter("all"); setPage(0); }}
                >
                  All ({filtered.length})
                </Badge>
                {categories.map((cat) => {
                  const count = manifest!.assets.filter(
                    (a) =>
                      a.category === cat &&
                      (typeFilter === "all" || a.type === typeFilter)
                  ).length;
                  return (
                    <Badge
                      key={cat}
                      variant={categoryFilter === cat ? "default" : "outline"}
                      className="cursor-pointer whitespace-nowrap text-xs"
                      onClick={() => { setCategoryFilter(cat); setPage(0); }}
                    >
                      {cat} ({count})
                    </Badge>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        <p className="text-xs text-muted-foreground mb-3">
          Showing {paged.length.toLocaleString()} of {filtered.length.toLocaleString()} results
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {paged.map((asset) => (
            <AssetCard key={asset.id} asset={asset} onSelect={setSelected} />
          ))}
        </div>
        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button variant="outline" onClick={() => setPage((p) => p + 1)} className="gap-2">
              <ChevronDown className="h-4 w-4" /> Load More
            </Button>
          </div>
        )}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Package className="h-12 w-12 mb-3 opacity-30" />
            <p>No assets found matching your filters</p>
          </div>
        )}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.name}
                  <Badge style={{ backgroundColor: TYPE_CONFIG[selected.type]?.color }}>
                    {selected.type}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="h-64 rounded-lg overflow-hidden border">
                <AssetPreview asset={selected} />
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <div className="text-muted-foreground">Category</div>
                <div>{selected.category}</div>
                <div className="text-muted-foreground">Subcategory</div>
                <div>{selected.subcategory}</div>
                <div className="text-muted-foreground">Format</div>
                <div className="uppercase">{selected.format}</div>
                {selected.sizeBytes > 0 && (
                  <>
                    <div className="text-muted-foreground">Size</div>
                    <div>{formatSize(selected.sizeBytes)}</div>
                  </>
                )}
                {selected.tags.length > 0 && (
                  <>
                    <div className="text-muted-foreground">Tags</div>
                    <div className="flex flex-wrap gap-1">
                      {selected.tags.map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => handleCopyUrl(selected.url)}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy URL
                </Button>
                <a href={selected.url} target="_blank" rel="noreferrer" download>
                  <Button size="sm" className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </a>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
