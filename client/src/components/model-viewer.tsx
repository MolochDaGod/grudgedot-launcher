import { useEffect, useRef, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Box, Layers, Palette, Film } from "lucide-react";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ModelMetadata | null>(null);
  const [modelName, setModelName] = useState<string>("");

  // Resolve the actual URL
  const resolvedUrl = grudgeId
    ? `/api/models/${grudgeId}/file`
    : modelUrl || null;

  const cleanup = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    if (containerRef.current) {
      const canvas = containerRef.current.querySelector("canvas");
      if (canvas) containerRef.current.removeChild(canvas);
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
    if (!resolvedUrl || !containerRef.current) return;

    cleanup();
    setLoading(true);
    setError(null);

    const container = containerRef.current;
    const width = container.clientWidth;
    const h = container.clientHeight || parseInt(height);

    (async () => {
      try {
        const THREE = await import("three");
        const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");

        // Scene
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1a1a2e);

        // Camera
        const camera = new THREE.PerspectiveCamera(45, width / h, 0.01, 1000);
        camera.position.set(3, 2, 3);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, h);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        rendererRef.current = renderer;
        container.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1;

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x404060, 1.5);
        scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(5, 8, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x8888ff, 0.5);
        fillLight.position.set(-3, 2, -3);
        scene.add(fillLight);

        // Ground grid
        const gridHelper = new THREE.GridHelper(10, 20, 0x333366, 0x222244);
        scene.add(gridHelper);

        // Ground plane (for shadow)
        const groundGeo = new THREE.PlaneGeometry(10, 10);
        const groundMat = new THREE.ShadowMaterial({ opacity: 0.3 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Load model
        const loader = new GLTFLoader();
        loader.load(
          resolvedUrl,
          (gltf) => {
            const model = gltf.scene;

            // Auto-scale to fit view
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.setScalar(scale);
            model.position.sub(center.multiplyScalar(scale));
            model.position.y -= box.min.y * scale;

            // Enable shadows
            model.traverse((child: any) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            scene.add(model);

            // Fit camera
            const scaledBox = new THREE.Box3().setFromObject(model);
            const scaledSize = scaledBox.getSize(new THREE.Vector3());
            const maxScaled = Math.max(scaledSize.x, scaledSize.y, scaledSize.z);
            camera.position.set(maxScaled * 1.5, maxScaled * 1, maxScaled * 1.5);
            controls.target.set(0, scaledSize.y * 0.4, 0);
            controls.update();

            // Extract metadata from loaded model
            let meshCount = 0;
            const materialSet = new Set<string>();
            model.traverse((child: any) => {
              if (child.isMesh) {
                meshCount++;
                if (child.material) {
                  const mat = Array.isArray(child.material)
                    ? child.material
                    : [child.material];
                  mat.forEach((m: any) => materialSet.add(m.uuid));
                }
              }
            });

            const animNames = gltf.animations?.map((a) => a.name || "unnamed") || [];

            // Play first animation if available
            if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              const clip = gltf.animations[0];
              mixer.clipAction(clip).play();
              (scene as any).__mixer = mixer;
            }

            setMetadata((prev) => ({
              ...prev,
              meshCount,
              materialCount: materialSet.size,
              animationCount: gltf.animations.length,
              animationNames: animNames,
            }));

            setLoading(false);
          },
          undefined,
          (err) => {
            console.error("Model load error:", err);
            setError("Failed to load model");
            setLoading(false);
          }
        );

        // Animation loop
        const clock = new THREE.Clock();
        const animate = () => {
          animFrameRef.current = requestAnimationFrame(animate);
          const delta = clock.getDelta();
          controls.update();
          const mixer = (scene as any).__mixer;
          if (mixer) mixer.update(delta);
          renderer.render(scene, camera);
        };
        animate();

        // Resize handler
        const handleResize = () => {
          if (!container) return;
          const w = container.clientWidth;
          const newH = container.clientHeight || parseInt(height);
          camera.aspect = w / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(w, newH);
        };
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
    })();

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
        <div ref={containerRef} className="w-full h-full" data-testid="canvas-3d-viewer" />

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
