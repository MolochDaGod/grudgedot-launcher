import { useEffect, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Box, Layers, Palette, Film } from "lucide-react";
import {
  Engine, Scene, ArcRotateCamera, Vector3,
  HemisphericLight, DirectionalLight,
  Color3, Color4, SceneLoader,
  MeshBuilder, StandardMaterial
} from "@babylonjs/core";
import "@babylonjs/loaders/glTF";

interface ModelViewerProps {
  /** Direct URL to a .glb/.gltf file, OR /api/models/:grudgeId/file */
  modelUrl?: string;
  /** Grudge UUID — will auto-resolve to /api/models/:id/file */
  grudgeId?: string;
  /** Show metadata panel below the viewer */
  showMetadata?: boolean;
  className?: string;
  height?: string;
}

interface ModelMetadata {
  meshCount?: number;
  materialCount?: number;
  animationCount?: number;
  animationNames?: string[];
  sceneName?: string;
  hasTextures?: boolean;
}

export function ModelViewer({
  modelUrl,
  grudgeId,
  showMetadata = true,
  className,
  height = "400px",
}: ModelViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [modelName, setModelName] = useState<string>("");

  const resolvedUrl = grudgeId
    ? `/api/models/${grudgeId}/file`
    : modelUrl || null;

  const cleanup = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.dispose();
      engineRef.current = null;
    }
  }, []);

  // Fetch metadata if grudgeId is provided
  useEffect(() => {
    if (!grudgeId) return;
    fetch(`/api/models/${grudgeId}/metadata`)
      .then((r) => r.json())
      .then((data) => {
        setMetadata(data);
        setModelName(data.name || "");
      })
      .catch(() => {});
  }, [grudgeId]);

  useEffect(() => {
    if (!resolvedUrl || !canvasRef.current) return;

    cleanup();
    setLoading(true);
    setError(null);

    try {
      const canvas = canvasRef.current;
      const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
      engineRef.current = engine;

      const scene = new Scene(engine);
      scene.clearColor = new Color4(0.1, 0.1, 0.18, 1);

      // Camera with built-in orbit controls
      const camera = new ArcRotateCamera("camera", Math.PI / 4, Math.PI / 3, 5, Vector3.Zero(), scene);
      camera.attachControl(canvas, true);
      camera.lowerRadiusLimit = 0.5;
      camera.upperRadiusLimit = 50;
      camera.wheelPrecision = 50;
      camera.useAutoRotationBehavior = true;
      if (camera.autoRotationBehavior) {
        camera.autoRotationBehavior.idleRotationSpeed = 0.3;
      }

      // Lighting
      const hemiLight = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
      hemiLight.intensity = 0.6;

      const dirLight = new DirectionalLight("dir", new Vector3(-1, -2, -1), scene);
      dirLight.position = new Vector3(5, 8, 5);
      dirLight.intensity = 1.5;

      const fillLight = new DirectionalLight("fill", new Vector3(1, -0.5, 1), scene);
      fillLight.intensity = 0.4;

      // Ground
      const ground = MeshBuilder.CreateGround("ground", { width: 10, height: 10 }, scene);
      const groundMat = new StandardMaterial("groundMat", scene);
      groundMat.alpha = 0.2;
      groundMat.diffuseColor = new Color3(0.2, 0.2, 0.27);
      ground.material = groundMat;
      ground.receiveShadows = true;
      ground.isPickable = false;

      // Load model
      SceneLoader.ImportMesh("", "", resolvedUrl, scene,
        (meshes, _particleSystems, _skeletons, animationGroups) => {
          // Auto-frame camera on loaded model
          const worldExtends = scene.getWorldExtends((m) => m !== ground);
          const center = worldExtends.min.add(worldExtends.max).scale(0.5);
          const size = worldExtends.max.subtract(worldExtends.min);
          const maxDim = Math.max(size.x, size.y, size.z);

          camera.target = center;
          camera.radius = maxDim * 2;

          meshes.forEach((mesh) => {
            mesh.receiveShadows = true;
          });

          // Play first animation
          if (animationGroups.length > 0) {
            animationGroups[0].start(true);
          }

          // Collect metadata
          const materialSet = new Set<string>();
          let meshCount = 0;
          meshes.forEach((mesh) => {
            if (mesh.getTotalVertices() > 0) {
              meshCount++;
              if (mesh.material) {
                materialSet.add(mesh.material.uniqueId.toString());
              }
            }
          });

          const animNames = animationGroups.map((ag) => ag.name || "unnamed");

          setMetadata((prev) => ({
            ...prev,
            meshCount,
            materialCount: materialSet.size,
            animationCount: animationGroups.length,
            animationNames: animNames,
          }));

          setLoading(false);
        },
        null,
        (_scene, message, exception) => {
          console.error("Model load error:", message, exception);
          setError("Failed to load model");
          setLoading(false);
        }
      );

      engine.runRenderLoop(() => scene.render());

      const handleResize = () => engine.resize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        cleanup();
      };
    } catch (err: any) {
      console.error("Failed to init 3D viewer:", err);
      setError(err.message || "WebGL not available");
      setLoading(false);
    }

    return cleanup;
  }, [resolvedUrl, height, cleanup]);

  if (!resolvedUrl) {
    return (
      <div
        className={`${className || ""} flex items-center justify-center bg-muted rounded-lg`}
        style={{ height }}
      >
        <div className="text-center p-6">
          <Box className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No model selected</p>
          <p className="text-xs text-muted-foreground mt-1">
            Choose a model from the library to preview
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Viewer canvas */}
      <div className="relative rounded-lg overflow-hidden border border-border" style={{ height }}>
        <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} data-testid="canvas-3d-viewer" />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
              <p className="text-sm text-muted-foreground">Loading model...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-destructive/10">
            <div className="text-center p-4">
              <p className="text-sm text-destructive font-medium">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">Check console for details</p>
            </div>
          </div>
        )}

        {modelName && !loading && !error && (
          <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1">
            <p className="text-xs font-medium">{modelName}</p>
          </div>
        )}
      </div>

      {/* Metadata panel */}
      {showMetadata && metadata && (
        <div className="flex flex-wrap gap-2 mt-2">
          {metadata.meshCount !== undefined && (
            <Badge variant="outline" className="text-xs">
              <Layers className="h-3 w-3 mr-1" />
              {metadata.meshCount} meshes
            </Badge>
          )}
          {metadata.materialCount !== undefined && (
            <Badge variant="outline" className="text-xs">
              <Palette className="h-3 w-3 mr-1" />
              {metadata.materialCount} materials
            </Badge>
          )}
          {metadata.animationCount !== undefined && metadata.animationCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              <Film className="h-3 w-3 mr-1" />
              {metadata.animationCount} animations
            </Badge>
          )}
          {metadata.sceneName && (
            <Badge variant="outline" className="text-xs">
              {metadata.sceneName}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
