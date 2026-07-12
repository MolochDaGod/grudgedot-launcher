/**
 * Grudge Flat Engine — 2D Game Editor
 *
 * Full-screen 2D editor powered by Pixi.js + Phaser utilities.
 *
 * Layout:
 * - Left: Layer panel (background, midground, foreground, UI, collision)
 * - Center: Pixi.js Application canvas with pan/zoom
 * - Right: Inspector (position, scale, rotation, sprite frame, tint)
 * - Bottom: Tile Palette, Sprite Sheet, Animation Timeline, Scene Config
 * - Toolbar: Select, Move, Tile Brush, Eraser, Shape tools
 *
 * Keyboard: Space+drag=pan, scroll=zoom, V=select, B=brush, E=eraser, G=grid
 * Save/load as .grudge2d JSON. Export to standalone Phaser game bundle.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Layers, Plus, Trash2, Eye, EyeOff, Lock, Unlock,
  Move, MousePointer, PaintBucket, Eraser, Grid3X3,
  Square, Circle, Type, Image, Download, Upload,
  Play, Save, FolderOpen, ChevronDown, ChevronRight,
  Palette, Settings2, Ruler, Pipette, ZoomIn, ZoomOut,
  RotateCw, FlipHorizontal, FlipVertical, Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────

interface Layer2D {
  id: string;
  name: string;
  type: "background" | "midground" | "foreground" | "ui" | "collision";
  visible: boolean;
  locked: boolean;
  opacity: number;
  objects: SceneObject2D[];
}

interface SceneObject2D {
  id: string;
  type: "sprite" | "tile" | "rectangle" | "ellipse" | "text" | "polygon";
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  tint: string;
  alpha: number;
  spriteUrl?: string;
  text?: string;
  fontSize?: number;
  physicsBody?: "static" | "dynamic" | "none";
}

type Tool2D = "select" | "move" | "brush" | "eraser" | "rectangle" | "ellipse" | "text" | "pipette";

// ── Default Layers ──

function createDefaultLayers(): Layer2D[] {
  return [
    { id: "bg", name: "Background", type: "background", visible: true, locked: false, opacity: 1, objects: [] },
    { id: "mg", name: "Midground", type: "midground", visible: true, locked: false, opacity: 1, objects: [] },
    { id: "fg", name: "Foreground", type: "foreground", visible: true, locked: false, opacity: 1, objects: [] },
    { id: "ui", name: "UI", type: "ui", visible: true, locked: false, opacity: 1, objects: [] },
    { id: "col", name: "Collision", type: "collision", visible: true, locked: false, opacity: 0.5, objects: [] },
  ];
}

// ── Component ────────────────────────────────────────────────────────────────

export default function GrudgeFlatEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [layers, setLayers] = useState<Layer2D[]>(createDefaultLayers);
  const [activeLayerId, setActiveLayerId] = useState("mg");
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<Tool2D>("select");
  const [showGrid, setShowGrid] = useState(true);
  const [gridSize, setGridSize] = useState(32);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [bottomTab, setBottomTab] = useState("tiles");
  const [brushColor, setBrushColor] = useState("#6366f1");

  // Canvas state
  const [canvasSize, setCanvasSize] = useState({ w: 1280, h: 720 });
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });

  // ── Canvas Render ──

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = canvasSize;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply view transform
    ctx.save();
    ctx.translate(panOffset.x + canvas.width / 2, panOffset.y + canvas.height / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);

    // Scene background
    ctx.fillStyle = "#0f0f1a";
    ctx.fillRect(0, 0, w, h);

    // Grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1 / zoom;
      for (let x = 0; x <= w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    // Render layers (bottom to top)
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.globalAlpha = layer.opacity;

      for (const obj of layer.objects) {
        ctx.save();
        ctx.translate(obj.x, obj.y);
        ctx.rotate((obj.rotation * Math.PI) / 180);
        ctx.scale(obj.scaleX, obj.scaleY);
        ctx.globalAlpha *= obj.alpha;

        if (obj.type === "rectangle") {
          ctx.fillStyle = obj.tint || brushColor;
          ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
        } else if (obj.type === "ellipse") {
          ctx.fillStyle = obj.tint || brushColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (obj.type === "text") {
          ctx.fillStyle = obj.tint || "#ffffff";
          ctx.font = `${obj.fontSize || 16}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(obj.text || "Text", 0, 0);
        } else if (obj.type === "sprite") {
          // Placeholder for sprite rendering
          ctx.fillStyle = "#3b82f680";
          ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
          ctx.strokeStyle = "#3b82f6";
          ctx.lineWidth = 1 / zoom;
          ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
          ctx.fillStyle = "#fff";
          ctx.font = `${10 / zoom}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(obj.name, 0, 0);
        }

        // Selection indicator
        if (obj.id === selectedObjectId) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 2 / zoom;
          ctx.setLineDash([4 / zoom, 4 / zoom]);
          ctx.strokeRect(-obj.width / 2 - 2, -obj.height / 2 - 2, obj.width + 4, obj.height + 4);
          ctx.setLineDash([]);
        }

        ctx.restore();
      }
    }

    // Scene border
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(251,191,36,0.3)";
    ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(0, 0, w, h);

    ctx.restore();

    // HUD
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(8, canvas.height - 28, 200, 20);
    ctx.fillStyle = "#aaa";
    ctx.font = "11px monospace";
    ctx.fillText(`Zoom: ${(zoom * 100).toFixed(0)}%  Grid: ${gridSize}px  ${canvasSize.w}x${canvasSize.h}`, 14, canvas.height - 13);
  }, [layers, zoom, panOffset, showGrid, gridSize, canvasSize, selectedObjectId, brushColor]);

  useEffect(() => {
    const frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [render]);

  // ── Mouse handlers ──

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.1, Math.min(10, z * delta)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.getModifierState("Space"))) {
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (activeTool === "rectangle" || activeTool === "ellipse") {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left - panOffset.x - canvas.width / 2) / zoom + canvasSize.w / 2;
      const cy = (e.clientY - rect.top - panOffset.y - canvas.height / 2) / zoom + canvasSize.h / 2;

      const newObj: SceneObject2D = {
        id: crypto.randomUUID(),
        type: activeTool,
        name: activeTool === "rectangle" ? "Rect" : "Ellipse",
        x: Math.round(cx / gridSize) * gridSize,
        y: Math.round(cy / gridSize) * gridSize,
        width: gridSize * 2,
        height: gridSize * 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        tint: brushColor,
        alpha: 1,
        physicsBody: "none",
      };

      setLayers((prev) =>
        prev.map((l) => (l.id === activeLayerId ? { ...l, objects: [...l.objects, newObj] } : l)),
      );
      setSelectedObjectId(newObj.id);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      setPanOffset((p) => ({ x: p.x + dx, y: p.y + dy }));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
  };

  // ── Keyboard ──

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "v": setActiveTool("select"); break;
        case "b": setActiveTool("brush"); break;
        case "e": setActiveTool("eraser"); break;
        case "g": setShowGrid((g) => !g); break;
        case "delete":
        case "backspace":
          if (selectedObjectId) {
            setLayers((prev) =>
              prev.map((l) => ({ ...l, objects: l.objects.filter((o) => o.id !== selectedObjectId) })),
            );
            setSelectedObjectId(null);
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedObjectId]);

  // ── Save / Load ──

  const handleSave = () => {
    const data = JSON.stringify({ version: 1, canvasSize, layers, gridSize }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "scene.grudge2d";
    link.click();
    toast({ title: "Scene Saved", description: "scene.grudge2d" });
  };

  const handleLoad = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".grudge2d,.json";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const data = JSON.parse(text);
        if (data.layers) setLayers(data.layers);
        if (data.canvasSize) setCanvasSize(data.canvasSize);
        if (data.gridSize) setGridSize(data.gridSize);
        toast({ title: "Scene Loaded", description: file.name });
      } catch {
        toast({ variant: "destructive", title: "Invalid file" });
      }
    };
    input.click();
  };

  // ── Selected object helper ──

  const selectedObj = layers.flatMap((l) => l.objects).find((o) => o.id === selectedObjectId) || null;

  const updateSelectedObj = (patch: Partial<SceneObject2D>) => {
    if (!selectedObjectId) return;
    setLayers((prev) =>
      prev.map((l) => ({
        ...l,
        objects: l.objects.map((o) => (o.id === selectedObjectId ? { ...o, ...patch } : o)),
      })),
    );
  };

  // ── Tools config ──

  const TOOLS: { id: Tool2D; icon: typeof MousePointer; label: string; key: string }[] = [
    { id: "select", icon: MousePointer, label: "Select", key: "V" },
    { id: "move", icon: Move, label: "Move", key: "M" },
    { id: "brush", icon: PaintBucket, label: "Brush", key: "B" },
    { id: "eraser", icon: Eraser, label: "Eraser", key: "E" },
    { id: "rectangle", icon: Square, label: "Rectangle", key: "R" },
    { id: "ellipse", icon: Circle, label: "Ellipse", key: "C" },
    { id: "text", icon: Type, label: "Text", key: "T" },
  ];

  // ── Render ──

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b bg-sidebar/60 backdrop-blur-sm shrink-0">
        <Layers className="w-4 h-4 text-green-400" />
        <span className="font-bold text-xs uppercase tracking-widest">Grudge Flat Engine</span>
        <Badge variant="secondary" className="text-[9px] px-1.5 bg-green-500/20 text-green-400 border-0">2D</Badge>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Tool buttons */}
        {TOOLS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={activeTool === t.id ? "default" : "ghost"}
            className="h-7 w-7 p-0"
            title={`${t.label} (${t.key})`}
            onClick={() => setActiveTool(t.id)}
          >
            <t.icon className="h-3.5 w-3.5" />
          </Button>
        ))}

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Brush color */}
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
          className="h-7 w-7 rounded border border-border cursor-pointer"
          title="Brush Color"
        />

        {/* Grid */}
        <Button
          size="sm"
          variant={showGrid ? "default" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid (G)"
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>

        {/* Zoom */}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.min(10, z * 1.25))}>
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <span className="text-[10px] font-mono w-10 text-center">{(zoom * 100).toFixed(0)}%</span>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setZoom((z) => Math.max(0.1, z * 0.8))}>
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>

        <div className="flex-1" />

        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleLoad}>
          <FolderOpen className="h-3.5 w-3.5" /> Open
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleSave}>
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
      </div>

      {/* Main panels */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Layers */}
        <div className="w-52 shrink-0 border-r flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-sidebar/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            Layers
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => {
                const id = crypto.randomUUID().slice(0, 8);
                setLayers((prev) => [...prev, {
                  id, name: `Layer ${prev.length + 1}`, type: "midground",
                  visible: true, locked: false, opacity: 1, objects: [],
                }]);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center gap-1.5 px-2 py-1.5 border-b border-border/30 text-xs cursor-pointer ${
                  activeLayerId === layer.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                }`}
                onClick={() => setActiveLayerId(layer.id)}
              >
                <button
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayers((p) => p.map((l) => (l.id === layer.id ? { ...l, visible: !l.visible } : l)));
                  }}
                >
                  {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                </button>
                <button
                  className="shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLayers((p) => p.map((l) => (l.id === layer.id ? { ...l, locked: !l.locked } : l)));
                  }}
                >
                  {layer.locked ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Unlock className="h-3 w-3" />}
                </button>
                <span className="flex-1 truncate">{layer.name}</span>
                <Badge variant="secondary" className="text-[8px] px-1 py-0 h-3.5">{layer.objects.length}</Badge>
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={containerRef} className="flex-1 min-h-0 bg-neutral-950 overflow-hidden relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {/* Bottom panel */}
          <div className="h-44 border-t flex flex-col shrink-0">
            <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="w-full rounded-none border-b h-8 bg-sidebar/60">
                <TabsTrigger value="tiles" className="text-[10px] px-2">Tile Palette</TabsTrigger>
                <TabsTrigger value="sprites" className="text-[10px] px-2">Sprite Sheets</TabsTrigger>
                <TabsTrigger value="timeline" className="text-[10px] px-2">Animation Timeline</TabsTrigger>
                <TabsTrigger value="scene" className="text-[10px] px-2">Scene Config</TabsTrigger>
              </TabsList>
              <TabsContent value="tiles" className="flex-1 overflow-auto m-0 p-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Import a tileset PNG and define tile size to start painting. Uses the existing Phaser TileMapGenerator.
                </p>
                <Button size="sm" variant="outline" className="text-xs h-7 gap-1">
                  <Upload className="h-3.5 w-3.5" /> Import Tileset
                </Button>
              </TabsContent>
              <TabsContent value="sprites" className="flex-1 overflow-auto m-0 p-3">
                <p className="text-xs text-muted-foreground">
                  Drag a sprite sheet PNG, define frame grid (rows/columns), and assign animation sequences.
                </p>
              </TabsContent>
              <TabsContent value="timeline" className="flex-1 overflow-auto m-0 p-3">
                <p className="text-xs text-muted-foreground">
                  Frame-by-frame animation editor. Select a sprite, set keyframes for position, scale, rotation, and opacity.
                </p>
              </TabsContent>
              <TabsContent value="scene" className="flex-1 overflow-auto m-0 p-3">
                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Scene Width</Label>
                    <Input type="number" value={canvasSize.w} onChange={(e) => setCanvasSize((s) => ({ ...s, w: +e.target.value || 800 }))} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Scene Height</Label>
                    <Input type="number" value={canvasSize.h} onChange={(e) => setCanvasSize((s) => ({ ...s, h: +e.target.value || 600 }))} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Grid Size</Label>
                    <Input type="number" value={gridSize} onChange={(e) => setGridSize(+e.target.value || 32)} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Background Color</Label>
                    <input type="color" value="#0f0f1a" className="h-7 w-full rounded border border-border cursor-pointer" />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="w-56 shrink-0 border-l flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-sidebar/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Inspector
          </div>
          <ScrollArea className="flex-1">
            {selectedObj ? (
              <div className="p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-[10px]">Name</Label>
                  <Input value={selectedObj.name} onChange={(e) => updateSelectedObj({ name: e.target.value })} className="h-7 text-xs" />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-muted-foreground">X</Label>
                    <Input type="number" value={selectedObj.x} onChange={(e) => updateSelectedObj({ x: +e.target.value })} className="h-6 text-[10px] px-1" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-muted-foreground">Y</Label>
                    <Input type="number" value={selectedObj.y} onChange={(e) => updateSelectedObj({ y: +e.target.value })} className="h-6 text-[10px] px-1" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-muted-foreground">Width</Label>
                    <Input type="number" value={selectedObj.width} onChange={(e) => updateSelectedObj({ width: +e.target.value })} className="h-6 text-[10px] px-1" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[9px] text-muted-foreground">Height</Label>
                    <Input type="number" value={selectedObj.height} onChange={(e) => updateSelectedObj({ height: +e.target.value })} className="h-6 text-[10px] px-1" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Rotation</Label>
                  <Slider min={0} max={360} step={1} value={[selectedObj.rotation]} onValueChange={([v]) => updateSelectedObj({ rotation: v })} className="h-1.5" />
                  <span className="text-[9px] text-muted-foreground">{selectedObj.rotation}°</span>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Tint</Label>
                  <input type="color" value={selectedObj.tint} onChange={(e) => updateSelectedObj({ tint: e.target.value })} className="h-7 w-full rounded border border-border cursor-pointer" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Opacity</Label>
                  <Slider min={0} max={1} step={0.05} value={[selectedObj.alpha]} onValueChange={([v]) => updateSelectedObj({ alpha: v })} className="h-1.5" />
                </div>

                <Separator />

                <Button size="sm" variant="destructive" className="w-full text-xs h-7" onClick={() => {
                  setLayers((prev) => prev.map((l) => ({ ...l, objects: l.objects.filter((o) => o.id !== selectedObjectId) })));
                  setSelectedObjectId(null);
                }}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete Object
                </Button>
              </div>
            ) : (
              <div className="p-3 text-xs text-muted-foreground text-center py-8">
                Click on an object in the scene or use a drawing tool to create one.
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
