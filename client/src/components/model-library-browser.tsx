import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Grid3X3,
  List,
  Box,
  RefreshCw,
  Download,
  ExternalLink,
  Filter,
  Loader2,
  FileBox,
  Layers,
  Film,
} from "lucide-react";
import { ModelViewer } from "./model-viewer";

interface ModelEntry {
  grudgeId: string;
  name: string;
  filename: string;
  format: string;
  fileSize: number;
  subcategory: string;
  tags: string[];
  threeJsCompatible: boolean;
  metadata: {
    meshCount?: number;
    materialCount?: number;
    animationCount?: number;
    animationNames?: string[];
    sceneName?: string;
  };
  fileUrl: string;
  metadataUrl: string;
}

interface ModelListResponse {
  total: number;
  offset: number;
  limit: number;
  formatCounts: Record<string, number>;
  categoryCounts: Record<string, number>;
  models: ModelEntry[];
}

interface ModelLibraryBrowserProps {
  /** Callback when a model is selected for use in an editor */
  onSelectModel?: (model: ModelEntry) => void;
  /** Label for the select button */
  selectLabel?: string;
  /** Whether to show the 3D preview panel */
  showPreview?: boolean;
  className?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ModelLibraryBrowser({
  onSelectModel,
  selectLabel = "Use in Editor",
  showPreview = true,
  className,
}: ModelLibraryBrowserProps) {
  const [models, setModels] = useState<ModelEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [formatFilter, setFormatFilter] = useState<string>("all");
  const [threeJsOnly, setThreeJsOnly] = useState(false);

  // View state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedModel, setSelectedModel] = useState<ModelEntry | null>(null);
  const [offset, setOffset] = useState(0);
  const limit = 30;

  // Stats
  const [formatCounts, setFormatCounts] = useState<Record<string, number>>({});
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (subcategoryFilter !== "all") params.set("subcategory", subcategoryFilter);
      if (formatFilter !== "all") params.set("format", formatFilter);
      if (threeJsOnly) params.set("threeJsOnly", "true");
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await fetch(`/api/models?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data: ModelListResponse = await res.json();
      setModels(data.models);
      setTotal(data.total);
      setFormatCounts(data.formatCounts || {});
      setCategoryCounts(data.categoryCounts || {});
    } catch (err: any) {
      setError(err.message);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, subcategoryFilter, formatFilter, threeJsOnly, offset]);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [searchQuery, subcategoryFilter, formatFilter, threeJsOnly]);

  const handleReload = async () => {
    setLoading(true);
    try {
      await fetch("/api/models/reload", { method: "POST" });
      await fetchModels();
    } catch {
      setError("Failed to reload registry");
    }
  };

  return (
    <div className={`flex flex-col gap-4 ${className || ""}`}>
      {/* Header & Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={subcategoryFilter} onValueChange={setSubcategoryFilter}>
          <SelectTrigger className="w-[140px]">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {Object.entries(categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <SelectItem key={cat} value={cat}>
                  {cat} ({count})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select value={formatFilter} onValueChange={setFormatFilter}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            {Object.entries(formatCounts).map(([fmt, count]) => (
              <SelectItem key={fmt} value={fmt}>
                .{fmt} ({count})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={threeJsOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setThreeJsOnly(!threeJsOnly)}
          title="Show only Three.js compatible models (.glb, .gltf)"
        >
          <Box className="h-3 w-3 mr-1" />
          3JS
        </Button>

        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={handleReload} title="Reload registry">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{total} models</span>
        {searchQuery && <span>matching "{searchQuery}"</span>}
      </div>

      {/* Main content */}
      <div className={`flex gap-4 ${showPreview ? "flex-row" : ""}`}>
        {/* Model list */}
        <ScrollArea className={`${showPreview && selectedModel ? "flex-1" : "w-full"}`} style={{ maxHeight: "600px" }}>
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading models...</span>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-destructive">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Make sure to run the scanner first: npx tsx server/scripts/scan-models.ts
              </p>
            </div>
          )}

          {!loading && !error && models.length === 0 && (
            <div className="text-center py-12">
              <FileBox className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No models found</p>
            </div>
          )}

          {!loading && !error && models.length > 0 && (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {models.map((model) => (
                    <Card
                      key={model.grudgeId}
                      className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                        selectedModel?.grudgeId === model.grudgeId
                          ? "ring-2 ring-primary"
                          : ""
                      }`}
                      onClick={() => setSelectedModel(model)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Box className="h-4 w-4 text-primary shrink-0" />
                          <p className="text-sm font-medium truncate">{model.name}</p>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-2">
                          <Badge variant="outline" className="text-[10px] py-0">
                            .{model.format}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0">
                            {model.subcategory}
                          </Badge>
                          {model.metadata.animationCount && model.metadata.animationCount > 0 && (
                            <Badge variant="secondary" className="text-[10px] py-0">
                              <Film className="h-2.5 w-2.5 mr-0.5" />
                              {model.metadata.animationCount}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {formatBytes(model.fileSize)}
                          {model.metadata.meshCount ? ` · ${model.metadata.meshCount} meshes` : ""}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {models.map((model) => (
                    <div
                      key={model.grudgeId}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors ${
                        selectedModel?.grudgeId === model.grudgeId ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedModel(model)}
                    >
                      <Box className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{model.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0">
                            .{model.format}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] py-0">
                            {model.subcategory}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">{formatBytes(model.fileSize)}</p>
                        {model.metadata.meshCount && (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end">
                            <Layers className="h-2.5 w-2.5" />
                            {model.metadata.meshCount}
                          </p>
                        )}
                      </div>
                      {onSelectModel && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectModel(model);
                          }}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {total > limit && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {offset + 1}–{Math.min(offset + limit, total)} of {total}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset + limit >= total}
                    onClick={() => setOffset(offset + limit)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>

        {/* Preview panel */}
        {showPreview && selectedModel && (
          <div className="w-[400px] shrink-0 space-y-3">
            <ModelViewer
              grudgeId={selectedModel.grudgeId}
              height="350px"
              showMetadata={true}
            />

            <div className="space-y-2">
              <h3 className="font-medium text-sm">{selectedModel.name}</h3>
              <div className="flex flex-wrap gap-1">
                {selectedModel.tags.slice(0, 8).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] py-0 cursor-pointer hover:bg-accent"
                    onClick={() => setSearchQuery(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2 mt-2">
                {onSelectModel && (
                  <Button
                    size="sm"
                    onClick={() => onSelectModel(selectedModel)}
                    className="flex-1"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {selectLabel}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <a href={selectedModel.fileUrl} download={selectedModel.filename}>
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </a>
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground font-mono break-all">
                grudgeId: {selectedModel.grudgeId}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
