/**
 * Grudge Arena — 3D PvP Combat Arena
 *
 * Loads the Gladiator Low Poly Arena FBX as the environment,
 * spawns the player's race character model, and enables
 * WASD movement with over-shoulder camera in the arena.
 *
 * Also available as a scene in the Grudge Three Engine editor.
 */

import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crosshair, Loader2, Maximize, Minimize } from "lucide-react";
import { getModelUrlForRace, getCustomizationForRace, applyCustomization } from "@/lib/character-customization";

const ARENA_FBX = "/models/scenes/arena/gladiator-arena.fbx";

export default function GrudgeArena() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clockRef = useRef(new THREE.Clock());
  const frameRef = useRef(0);
  const keysRef = useRef(new Set<string>());
  const velocityRef = useRef(new THREE.Vector3());
  const isGroundedRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth;
    const h = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    camera.position.set(0, 8, -12);
    cameraRef.current = camera;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.5);
    sun.position.set(20, 30, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 100;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6688cc, 0.4);
    fill.position.set(-10, 10, -10);
    scene.add(fill);

    // Torch point lights for atmosphere
    const torchColors = [0xff6600, 0xff4400, 0xff8800, 0xff5500];
    for (let i = 0; i < 4; i++) {
      const pl = new THREE.PointLight(torchColors[i], 0.8, 20);
      const angle = (i / 4) * Math.PI * 2;
      pl.position.set(Math.cos(angle) * 12, 4, Math.sin(angle) * 12);
      scene.add(pl);
    }

    // Load arena FBX
    setLoadProgress("Loading arena...");
    const fbxLoader = new FBXLoader();

    fbxLoader.load(
      ARENA_FBX,
      (fbx) => {
        // Scale arena
        const box = new THREE.Box3().setFromObject(fbx);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 30 / maxDim;
        fbx.scale.setScalar(scale);
        fbx.position.y = 0;

        fbx.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        scene.add(fbx);
        setLoadProgress("Loading player...");

        // Load player character
        const raceId = "human";
        const modelUrl = getModelUrlForRace(raceId);

        if (modelUrl) {
          const gltfLoader = new GLTFLoader();
          gltfLoader.load(modelUrl, (gltf) => {
            const player = gltf.scene;
            player.name = "Player";

            const pBox = new THREE.Box3().setFromObject(player);
            const pSize = pBox.getSize(new THREE.Vector3());
            const pScale = 2 / Math.max(pSize.x, pSize.y, pSize.z);
            player.scale.setScalar(pScale);
            player.position.set(0, 0, 0);

            player.traverse((child) => {
              if (child instanceof THREE.Mesh) child.castShadow = true;
            });

            const custom = getCustomizationForRace(raceId);
            applyCustomization(player, custom);

            scene.add(player);
            playerRef.current = player;

            if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(player);
              const idle = gltf.animations.find((a) => /idle/i.test(a.name)) || gltf.animations[0];
              if (idle) mixer.clipAction(idle).play();
              mixerRef.current = mixer;
            }

            setLoading(false);
          }, undefined, () => setLoading(false));
        } else {
          setLoading(false);
        }
      },
      (progress) => {
        if (progress.total > 0) {
          setLoadProgress(`Loading arena... ${Math.round((progress.loaded / progress.total) * 100)}%`);
        }
      },
      () => {
        setLoadProgress("Failed to load arena");
        setLoading(false);
      },
    );

    // Render loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      if (mixerRef.current) mixerRef.current.update(delta);
      if (playerRef.current) updatePlayer(delta, playerRef.current, camera);
      renderer.render(scene, camera);
    };
    animate();

    // Resize
    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      if (cw && ch) {
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
        renderer.setSize(cw, ch);
      }
    });
    ro.observe(container);

    // Keys
    const onKD = (e: KeyboardEvent) => keysRef.current.add(e.code);
    const onKU = (e: KeyboardEvent) => keysRef.current.delete(e.code);
    window.addEventListener("keydown", onKD);
    window.addEventListener("keyup", onKU);

    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      window.removeEventListener("keydown", onKD);
      window.removeEventListener("keyup", onKU);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updatePlayer = useCallback((delta: number, player: THREE.Object3D, camera: THREE.PerspectiveCamera) => {
    const keys = keysRef.current;
    const vel = velocityRef.current;

    if (keys.has("KeyA")) player.rotation.y += 3 * delta;
    if (keys.has("KeyD")) player.rotation.y -= 3 * delta;

    const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);

    if (keys.has("KeyW")) { vel.x = fwd.x * 8; vel.z = fwd.z * 8; }
    else if (keys.has("KeyS")) { vel.x = -fwd.x * 4; vel.z = -fwd.z * 4; }
    else { vel.x *= 0.85; vel.z *= 0.85; }

    if (keys.has("KeyQ")) { vel.x -= right.x * 5; vel.z -= right.z * 5; }
    if (keys.has("KeyE")) { vel.x += right.x * 5; vel.z += right.z * 5; }

    if (keys.has("Space") && isGroundedRef.current) { vel.y = 10; isGroundedRef.current = false; }

    vel.y -= 25 * delta;
    player.position.x = THREE.MathUtils.clamp(player.position.x + vel.x * delta, -14, 14);
    player.position.y += vel.y * delta;
    player.position.z = THREE.MathUtils.clamp(player.position.z + vel.z * delta, -14, 14);

    if (player.position.y <= 0) { player.position.y = 0; vel.y = 0; isGroundedRef.current = true; }

    // Over-shoulder camera
    const off = new THREE.Vector3(-1.5, 3, -5).applyAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation.y);
    camera.position.lerp(player.position.clone().add(off), 6 * delta);
    camera.lookAt(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  };

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden relative">
      <div className="absolute top-3 left-3 z-10">
        <Badge className="bg-red-600/80 text-white border-0 font-bold">
          <Crosshair className="h-3.5 w-3.5 mr-1" /> GRUDGE ARENA
        </Badge>
      </div>
      <div className="absolute top-3 right-3 z-10">
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-white/60 hover:text-white" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
        </Button>
      </div>
      <div className="absolute bottom-3 left-3 z-10 bg-black/70 rounded-lg px-3 py-2 text-[10px] text-white/50">
        <span className="font-bold text-white/80">WASD</span> Move &nbsp;
        <span className="font-bold text-white/80">Q/E</span> Strafe &nbsp;
        <span className="font-bold text-white/80">Space</span> Jump
      </div>
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/90">
          <Loader2 className="h-12 w-12 animate-spin text-red-500 mb-4" />
          <p className="text-white font-bold text-lg">GRUDGE ARENA</p>
          <p className="text-white/50 text-sm">{loadProgress}</p>
        </div>
      )}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
