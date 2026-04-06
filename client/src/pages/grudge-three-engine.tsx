/**
 * Grudge Three Engine — Three.js 3D Editor
 *
 * Full-screen Three.js editor with:
 * - Left: Scene hierarchy tree
 * - Center: WebGLRenderer canvas + OrbitControls
 * - Right: Inspector (transform, material, light properties)
 * - Bottom: tabs for Model Library, Materials, Animations
 *
 * Uses existing `engine3d.ts` presets and `model-library-browser.tsx` integration.
 * Keeps all Three.js systems isolated from the BabylonJS engine.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { TransformControls } from "three/addons/controls/TransformControls.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Box, Upload, Download, Sun, Moon, Eye, EyeOff,
  Plus, Trash2, Move, RotateCw, Maximize, Grid3X3,
  ChevronRight, ChevronDown, Lightbulb, Camera, Palette,
  Play, Pause, SkipForward, Layers, Settings2, Cuboid,
  Circle, Triangle, Cylinder, Save, FolderOpen,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  CAMERA_PRESETS, LIGHTING_PRESETS, MATERIAL_PRESETS,
  POST_PROCESS_PRESETS, MOVEMENT_PRESETS, type CameraPreset,
} from "@/lib/engine3d";

// ── Types ────────────────────────────────────────────────────────────────────

interface SceneNode {
  id: string;
  name: string;
  type: string;
  object: THREE.Object3D;
  children: SceneNode[];
  visible: boolean;
  expanded: boolean;
}

type TransformMode = "translate" | "rotate" | "scale";

// ── Component ────────────────────────────────────────────────────────────────

export default function GrudgeThreeEngine() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const animFrameRef = useRef<number>(0);
  const { toast } = useToast();

  const [sceneTree, setSceneTree] = useState<SceneNode[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transformMode, setTransformMode] = useState<TransformMode>("translate");
  const [showGrid, setShowGrid] = useState(true);
  const [lightingPreset, setLightingPreset] = useState("day");
  const [bottomTab, setBottomTab] = useState("models");

  // Selected object properties
  const [selPos, setSelPos] = useState({ x: 0, y: 0, z: 0 });
  const [selRot, setSelRot] = useState({ x: 0, y: 0, z: 0 });
  const [selScale, setSelScale] = useState({ x: 1, y: 1, z: 1 });

  // ── Initialize Three.js ──

  useEffect(() => {
    if (!canvasRef.current) return;

    const container = canvasRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 100, 500);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 5000);
    camera.position.set(10, 8, 15);
    cameraRef.current = camera;

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Transform controls
    const tc = new TransformControls(camera, renderer.domElement);
    tc.addEventListener("dragging-changed", (e: any) => {
      controls.enabled = !e.value;
    });
    scene.add(tc);
    transformRef.current = tc;

    // Grid
    const grid = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    grid.name = "__grid";
    scene.add(grid);

    // Default lighting
    applyLighting(scene, "day");

    // Default objects
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x2a2a3e, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.name = "Floor";
    scene.add(floor);

    const cubeGeo = new THREE.BoxGeometry(1, 1, 1);
    const cubeMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.4, metalness: 0.3 });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.set(0, 0.5, 0);
    cube.castShadow = true;
    cube.name = "Cube";
    scene.add(cube);

    refreshSceneTree();

    // Render loop
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const onResize = () => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scene Tree Builder ──

  const refreshSceneTree = useCallback(() => {
    const scene = sceneRef.current;
    const build = (obj: THREE.Object3D): SceneNode | null => {
      if (obj.name.startsWith("__") || obj.type === "TransformControls" || obj.type === "TransformControlsPlane") return null;
      return {
        id: obj.uuid,
        name: obj.name || obj.type,
        type: obj.type,
        object: obj,
        children: obj.children.map(build).filter(Boolean) as SceneNode[],
        visible: obj.visible,
        expanded: true,
      };
    };
    const nodes = scene.children.map(build).filter(Boolean) as SceneNode[];
    setSceneTree(nodes);
  }, []);

  // ── Lighting ──

  function applyLighting(scene: THREE.Scene, preset: string) {
    // Remove old lights
    scene.children.filter((c) => c.type.includes("Light")).forEach((l) => scene.remove(l));

    const p = LIGHTING_PRESETS[preset];
    if (!p) return;

    const ambient = new THREE.AmbientLight(p.ambient.color, p.ambient.intensity);
    ambient.name = "__ambientLight";
    scene.add(ambient);

    if (p.directional) {
      const dir = new THREE.DirectionalLight(p.directional.color, p.directional.intensity);
      dir.position.set(p.directional.position.x, p.directional.position.y, p.directional.position.z);
      dir.castShadow = true;
      dir.shadow.mapSize.set(2048, 2048);
      dir.name = "__dirLight";
      scene.add(dir);
    }

    if (p.fog) {
      scene.fog = new THREE.Fog(p.fog.color, p.fog.near, p.fog.far);
      scene.background = new THREE.Color(p.fog.color);
    }
  }

  // ── Selection ──

  const selectObject = (id: string) => {
    setSelectedId(id);
    const obj = sceneRef.current.getObjectByProperty("uuid", id);
    if (obj && transformRef.current) {
      transformRef.current.attach(obj);
      setSelPos({ x: +obj.position.x.toFixed(2), y: +obj.position.y.toFixed(2), z: +obj.position.z.toFixed(2) });
      setSelRot({ x: +THREE.MathUtils.radToDeg(obj.rotation.x).toFixed(1), y: +THREE.MathUtils.radToDeg(obj.rotation.y).toFixed(1), z: +THREE.MathUtils.radToDeg(obj.rotation.z).toFixed(1) });
      setSelScale({ x: +obj.scale.x.toFixed(2), y: +obj.scale.y.toFixed(2), z: +obj.scale.z.toFixed(2) });
    }
  };

  // ── Add Primitives ──

  const addPrimitive = (type: string) => {
    const scene = sceneRef.current;
    let geo: THREE.BufferGeometry;
    let name = type;

    switch (type) {
      case "cube": geo = new THREE.BoxGeometry(1, 1, 1); break;
      case "sphere": geo = new THREE.SphereGeometry(0.5, 32, 32); break;
      case "cylinder": geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32); break;
      case "plane": geo = new THREE.PlaneGeometry(2, 2); name = "Plane"; break;
      case "cone": geo = new THREE.ConeGeometry(0.5, 1, 32); break;
      default: geo = new THREE.BoxGeometry(1, 1, 1);
    }

    const mat = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff, roughness: 0.5, metalness: 0.3 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0.5, 0);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = name.charAt(0).toUpperCase() + name.slice(1);
    scene.add(mesh);
    refreshSceneTree();
    selectObject(mesh.uuid);
  };

  // ── Import GLB ──

  const handleImportGLB = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".glb,.gltf";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const loader = new GLTFLoader();
      const url = URL.createObjectURL(file);
      loader.load(url, (gltf: GLTF) => {
        gltf.scene.name = file.name.replace(/\.(glb|gltf)$/i, "");
        sceneRef.current.add(gltf.scene);
        refreshSceneTree();
        toast({ title: "Model Imported", description: file.name });
        URL.revokeObjectURL(url);
      });
    };
    input.click();
  };

  // ── Export GLB ──

  const handleExportGLB = () => {
    const exporter = new GLTFExporter();
    exporter.parse(sceneRef.current, (result) => {
      const blob = new Blob([result as ArrayBuffer], { type: "application/octet-stream" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "grudge-three-scene.glb";
      link.click();
      toast({ title: "Scene Exported", description: "grudge-three-scene.glb" });
    }, (err) => {
      toast({ variant: "destructive", title: "Export Failed", description: err.message });
    }, { binary: true });
  };

  // ── Delete Selected ──

  const deleteSelected = () => {
    if (!selectedId) return;
    const obj = sceneRef.current.getObjectByProperty("uuid", selectedId);
    if (obj) {
      transformRef.current?.detach();
      sceneRef.current.remove(obj);
      setSelectedId(null);
      refreshSceneTree();
    }
  };

  // ── Scene Tree Node Render ──

  function TreeNode({ node, depth }: { node: SceneNode; depth: number }) {
    const isSelected = selectedId === node.id;
    return (
      <div>
        <button
          className={`flex items-center gap-1 w-full text-left px-2 py-1 text-xs rounded transition-colors ${
            isSelected ? "bg-primary/20 text-primary" : "hover:bg-muted/50"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => selectObject(node.id)}
        >
          {node.children.length > 0 ? (
            <ChevronDown className="h-3 w-3 shrink-0" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 opacity-30" />
          )}
          <span className="truncate">{node.name}</span>
          <span className="ml-auto text-[9px] text-muted-foreground">{node.type}</span>
        </button>
        {node.children.map((child) => (
          <TreeNode key={child.id} node={child} depth={depth + 1} />
        ))}
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-sidebar/60 backdrop-blur-sm shrink-0">
        <Box className="w-4 h-4 text-blue-400" />
        <span className="font-bold text-xs uppercase tracking-widest">Grudge Three Engine</span>
        <Badge variant="secondary" className="text-[9px] px-1.5 bg-blue-500/20 text-blue-400 border-0">Three.js</Badge>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Transform modes */}
        {(["translate", "rotate", "scale"] as const).map((mode) => {
          const Icon = mode === "translate" ? Move : mode === "rotate" ? RotateCw : Maximize;
          return (
            <Button
              key={mode}
              size="sm"
              variant={transformMode === mode ? "default" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={() => {
                setTransformMode(mode);
                if (transformRef.current) transformRef.current.setMode(mode);
              }}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          );
        })}

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Add primitives */}
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => addPrimitive("cube")}>
          <Cuboid className="h-3.5 w-3.5" /> Cube
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => addPrimitive("sphere")}>
          <Circle className="h-3.5 w-3.5" /> Sphere
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => addPrimitive("cylinder")}>
          <Cylinder className="h-3.5 w-3.5" /> Cylinder
        </Button>

        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Grid toggle */}
        <Button
          size="sm"
          variant={showGrid ? "default" : "ghost"}
          className="h-7 w-7 p-0"
          onClick={() => {
            setShowGrid(!showGrid);
            const grid = sceneRef.current.getObjectByName("__grid");
            if (grid) grid.visible = !showGrid;
          }}
        >
          <Grid3X3 className="h-3.5 w-3.5" />
        </Button>

        {/* Lighting preset */}
        <Select value={lightingPreset} onValueChange={(v) => { setLightingPreset(v); applyLighting(sceneRef.current, v); }}>
          <SelectTrigger className="h-7 w-24 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(LIGHTING_PRESETS).map((k) => (
              <SelectItem key={k} value={k} className="text-xs capitalize">{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleImportGLB}>
          <Upload className="h-3.5 w-3.5" /> Import GLB
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleExportGLB}>
          <Download className="h-3.5 w-3.5" /> Export GLB
        </Button>
      </div>

      {/* Main panels */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Scene Hierarchy */}
        <div className="w-56 shrink-0 border-r flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-sidebar/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            Scene Hierarchy
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => addPrimitive("cube")}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            {sceneTree.map((node) => (
              <TreeNode key={node.id} node={node} depth={0} />
            ))}
          </ScrollArea>
        </div>

        {/* Center: Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <div ref={canvasRef} className="flex-1 min-h-0 bg-black" />

          {/* Bottom panel */}
          <div className="h-48 border-t flex flex-col shrink-0">
            <Tabs value={bottomTab} onValueChange={setBottomTab} className="flex flex-col flex-1 min-h-0">
              <TabsList className="w-full rounded-none border-b h-8 bg-sidebar/60">
                <TabsTrigger value="models" className="text-[10px] px-2">Model Library</TabsTrigger>
                <TabsTrigger value="materials" className="text-[10px] px-2">Materials</TabsTrigger>
                <TabsTrigger value="animations" className="text-[10px] px-2">Animations</TabsTrigger>
                <TabsTrigger value="cameras" className="text-[10px] px-2">Camera Presets</TabsTrigger>
              </TabsList>
              <TabsContent value="models" className="flex-1 overflow-auto m-0 p-3">
                <p className="text-xs text-muted-foreground">
                  Drag & drop GLB/GLTF files onto the viewport, or use Import GLB in the toolbar.
                  Connect to Grudge ObjectStore for cloud-hosted models.
                </p>
              </TabsContent>
              <TabsContent value="materials" className="flex-1 overflow-auto m-0 p-3">
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(MATERIAL_PRESETS).map(([name, mat]) => (
                    <button
                      key={name}
                      className="text-left p-2 rounded border border-border hover:border-primary/50 text-xs"
                    >
                      <div className="font-medium capitalize">{name}</div>
                      <div className="text-[10px] text-muted-foreground">{mat.type}</div>
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="animations" className="flex-1 overflow-auto m-0 p-3">
                <p className="text-xs text-muted-foreground">
                  Import animated GLB models and control playback via the Animation Mixer.
                </p>
              </TabsContent>
              <TabsContent value="cameras" className="flex-1 overflow-auto m-0 p-3">
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(CAMERA_PRESETS).map(([name, preset]) => (
                    <button
                      key={name}
                      className="text-left p-2 rounded border border-border hover:border-primary/50 text-xs"
                      onClick={() => {
                        const cam = cameraRef.current;
                        if (cam) {
                          cam.fov = preset.fov;
                          cam.near = preset.near;
                          cam.far = preset.far;
                          cam.position.set(preset.position.x, preset.position.y, preset.position.z);
                          cam.updateProjectionMatrix();
                          if (preset.target && controlsRef.current) {
                            controlsRef.current.target.set(preset.target.x, preset.target.y, preset.target.z);
                          }
                        }
                      }}
                    >
                      <div className="font-medium capitalize">{name}</div>
                      <div className="text-[10px] text-muted-foreground">FOV {preset.fov}</div>
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right: Inspector */}
        <div className="w-60 shrink-0 border-l flex flex-col overflow-hidden">
          <div className="px-3 py-1.5 border-b bg-sidebar/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Inspector
          </div>
          <ScrollArea className="flex-1">
            {selectedId ? (
              <div className="p-3 space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground">Position</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["x", "y", "z"] as const).map((axis) => (
                      <div key={axis} className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase">{axis}</span>
                        <Input
                          type="number"
                          step={0.1}
                          value={selPos[axis]}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setSelPos({ ...selPos, [axis]: v });
                            const obj = sceneRef.current.getObjectByProperty("uuid", selectedId);
                            if (obj) obj.position[axis] = v;
                          }}
                          className="h-6 text-[10px] px-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground">Rotation (deg)</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["x", "y", "z"] as const).map((axis) => (
                      <div key={axis} className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase">{axis}</span>
                        <Input
                          type="number"
                          step={1}
                          value={selRot[axis]}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setSelRot({ ...selRot, [axis]: v });
                            const obj = sceneRef.current.getObjectByProperty("uuid", selectedId);
                            if (obj) obj.rotation[axis] = THREE.MathUtils.degToRad(v);
                          }}
                          className="h-6 text-[10px] px-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] text-muted-foreground">Scale</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["x", "y", "z"] as const).map((axis) => (
                      <div key={axis} className="space-y-0.5">
                        <span className="text-[9px] text-muted-foreground uppercase">{axis}</span>
                        <Input
                          type="number"
                          step={0.1}
                          value={selScale[axis]}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 1;
                            setSelScale({ ...selScale, [axis]: v });
                            const obj = sceneRef.current.getObjectByProperty("uuid", selectedId);
                            if (obj) obj.scale[axis] = v;
                          }}
                          className="h-6 text-[10px] px-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <Button size="sm" variant="destructive" className="w-full text-xs h-7" onClick={deleteSelected}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete Object
                </Button>
              </div>
            ) : (
              <div className="p-3 text-xs text-muted-foreground text-center py-8">
                Select an object in the scene hierarchy or viewport to inspect its properties.
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
