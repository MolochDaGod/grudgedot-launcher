/**
 * CharacterViewer3D — Reusable 3D character viewer + play mode
 *
 * Modes:
 *  - "thumbnail": small auto-rotate card preview, no controls
 *  - "full": orbit controls, customization sliders visible
 *  - "play": WASD ground movement, over-shoulder camera
 *
 * Loads race GLTF model or falls back to procedural mannequin.
 * Applies bone-based customization in real time.
 */

import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import {
  type CharacterCustomization,
  getModelUrlForRace,
  mergeCustomization,
  applyCustomization,
  getCustomizationForRace,
} from "@/lib/character-customization";

// ── Types ────────────────────────────────────────────────────────────────────

export interface CharacterViewer3DProps {
  raceId: string;
  classId?: string;
  customization?: Partial<CharacterCustomization> | null;
  mode?: "thumbnail" | "full" | "play";
  className?: string;
  onCustomizationChange?: (c: CharacterCustomization) => void;
}

export interface CharacterViewer3DHandle {
  getModel: () => THREE.Object3D | null;
  applyCustom: (c: CharacterCustomization) => void;
}

// ── Procedural Mannequin (fallback) ─────────────────────────────────────────

function createMannequin(skinColor: string): THREE.Group {
  const root = new THREE.Group();
  root.name = "Mannequin";
  const skin = new THREE.Color(skinColor);
  const cloth = new THREE.Color("#555568");
  const mat = (color: THREE.Color, m = 0.1, r = 0.7) =>
    new THREE.MeshStandardMaterial({ color, metalness: m, roughness: r });

  // Head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), mat(skin));
  head.position.y = 1.65; head.name = "Head"; head.castShadow = true;
  root.add(head);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.2), mat(cloth));
  torso.position.y = 1.28; torso.name = "Torso"; torso.castShadow = true;
  root.add(torso);

  // Arms
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.5, 8), mat(skin));
    arm.position.set(side * 0.26, 1.2, 0);
    arm.name = side === -1 ? "LeftArm" : "RightArm";
    arm.castShadow = true;
    root.add(arm);
  }

  // Legs
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.045, 0.6, 8), mat(cloth));
    leg.position.set(side * 0.1, 0.7, 0);
    leg.name = side === -1 ? "LeftLeg" : "RightLeg";
    leg.castShadow = true;
    root.add(leg);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.14), mat(new THREE.Color("#3a2a1a")));
    boot.position.set(side * 0.1, 0.34, 0.02);
    boot.name = side === -1 ? "LeftBoot" : "RightBoot";
    boot.castShadow = true;
    root.add(boot);
  }

  root.position.y = -0.9;
  return root;
}

// ── Component ────────────────────────────────────────────────────────────────

const CharacterViewer3D = forwardRef<CharacterViewer3DHandle, CharacterViewer3DProps>(
  ({ raceId, classId, customization, mode = "thumbnail", className, onCustomizationChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const modelRef = useRef<THREE.Object3D | null>(null);
    const mixerRef = useRef<THREE.AnimationMixer | null>(null);
    const clockRef = useRef(new THREE.Clock());
    const frameRef = useRef(0);

    // Play mode state
    const keysRef = useRef(new Set<string>());
    const velocityRef = useRef(new THREE.Vector3());
    const isGroundedRef = useRef(true);

    const [loaded, setLoaded] = useState(false);

    // ── Setup scene ──

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const w = container.clientWidth || 200;
      const h = container.clientHeight || 280;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = mode !== "thumbnail";
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Scene
      const scene = new THREE.Scene();
      if (mode !== "thumbnail") {
        scene.background = new THREE.Color(0x0a0a14);
      }
      sceneRef.current = scene;

      // Camera
      const camera = new THREE.PerspectiveCamera(mode === "thumbnail" ? 35 : 50, w / h, 0.1, 500);
      camera.position.set(0, 1.4, mode === "thumbnail" ? 4 : 3.5);
      cameraRef.current = camera;

      // Controls (not for thumbnail or play)
      if (mode === "full") {
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.target.set(0, 1, 0);
        controls.minDistance = 1.5;
        controls.maxDistance = 10;
        controlsRef.current = controls;
      }

      // Lights
      scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const key = new THREE.DirectionalLight(0xffffff, 1.2);
      key.position.set(3, 5, 4);
      key.castShadow = true;
      scene.add(key);
      const fill = new THREE.DirectionalLight(0x8888ff, 0.3);
      fill.position.set(-3, 2, -3);
      scene.add(fill);

      // Ground (play and full modes)
      if (mode !== "thumbnail") {
        const grid = new THREE.GridHelper(20, 20, 0x333333, 0x1a1a1a);
        scene.add(grid);
        const floor = new THREE.Mesh(
          new THREE.PlaneGeometry(20, 20),
          new THREE.MeshStandardMaterial({ color: 0x151520, roughness: 0.95 }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);
      }

      // Load model
      const modelUrl = getModelUrlForRace(raceId);
      const custom = mergeCustomization(customization, raceId);

      if (modelUrl) {
        const loader = new GLTFLoader();
        loader.load(
          modelUrl,
          (gltf: GLTF) => {
            const model = gltf.scene;
            model.name = `race-${raceId}`;

            // Normalize size
            const box = new THREE.Box3().setFromObject(model);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2 / maxDim;
            model.scale.setScalar(scale);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center.multiplyScalar(scale));
            model.position.y = 0;

            model.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });

            scene.add(model);
            modelRef.current = model;
            applyCustomization(model, custom);

            // Animations
            if (gltf.animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              const idleClip = gltf.animations.find((a) => /idle/i.test(a.name)) || gltf.animations[0];
              if (idleClip) {
                mixer.clipAction(idleClip).play();
              }
              mixerRef.current = mixer;
            }

            setLoaded(true);
          },
          undefined,
          () => {
            // Fallback: procedural mannequin
            const mannequin = createMannequin(custom.skinColor);
            scene.add(mannequin);
            modelRef.current = mannequin;
            setLoaded(true);
          },
        );
      } else {
        const mannequin = createMannequin(custom.skinColor);
        scene.add(mannequin);
        modelRef.current = mannequin;
        setLoaded(true);
      }

      // Render loop
      const animate = () => {
        frameRef.current = requestAnimationFrame(animate);
        const delta = clockRef.current.getDelta();

        // Animation mixer
        if (mixerRef.current) mixerRef.current.update(delta);

        // Thumbnail auto-rotate
        if (mode === "thumbnail" && modelRef.current) {
          modelRef.current.rotation.y += 0.005;
        }

        // Play mode movement
        if (mode === "play" && modelRef.current) {
          updatePlayMode(delta, modelRef.current, camera);
        }

        // Orbit controls
        controlsRef.current?.update();

        renderer.render(scene, camera);
      };
      animate();

      // Resize
      const ro = new ResizeObserver(() => {
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        if (cw > 0 && ch > 0) {
          camera.aspect = cw / ch;
          camera.updateProjectionMatrix();
          renderer.setSize(cw, ch);
        }
      });
      ro.observe(container);

      // Play mode key listeners
      if (mode === "play") {
        const onKeyDown = (e: KeyboardEvent) => keysRef.current.add(e.code);
        const onKeyUp = (e: KeyboardEvent) => keysRef.current.delete(e.code);
        window.addEventListener("keydown", onKeyDown);
        window.addEventListener("keyup", onKeyUp);
        return () => {
          cancelAnimationFrame(frameRef.current);
          ro.disconnect();
          renderer.dispose();
          if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
          window.removeEventListener("keydown", onKeyDown);
          window.removeEventListener("keyup", onKeyUp);
        };
      }

      return () => {
        cancelAnimationFrame(frameRef.current);
        ro.disconnect();
        renderer.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      };
    }, [raceId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Re-apply customization when it changes ──

    useEffect(() => {
      if (!modelRef.current) return;
      const custom = mergeCustomization(customization, raceId);
      applyCustomization(modelRef.current, custom);
    }, [customization, raceId]);

    // ── Play mode movement logic ──

    const updatePlayMode = useCallback(
      (delta: number, model: THREE.Object3D, camera: THREE.PerspectiveCamera) => {
        const keys = keysRef.current;
        const vel = velocityRef.current;
        const speed = 5;
        const turnSpeed = 3;
        const jumpForce = 8;
        const gravity = 20;

        // Turn A/D
        if (keys.has("KeyA")) model.rotation.y += turnSpeed * delta;
        if (keys.has("KeyD")) model.rotation.y -= turnSpeed * delta;

        // Forward/back W/S (relative to character facing)
        const forward = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), model.rotation.y);
        if (keys.has("KeyW")) {
          vel.x = forward.x * speed;
          vel.z = forward.z * speed;
        } else if (keys.has("KeyS")) {
          vel.x = -forward.x * speed * 0.6;
          vel.z = -forward.z * speed * 0.6;
        } else {
          vel.x *= 0.85;
          vel.z *= 0.85;
        }

        // Jump
        if (keys.has("Space") && isGroundedRef.current) {
          vel.y = jumpForce;
          isGroundedRef.current = false;
        }

        // Gravity
        vel.y -= gravity * delta;

        // Apply movement
        model.position.x += vel.x * delta;
        model.position.y += vel.y * delta;
        model.position.z += vel.z * delta;

        // Ground clamp
        if (model.position.y <= 0) {
          model.position.y = 0;
          vel.y = 0;
          isGroundedRef.current = true;
        }

        // Procedural idle bobbing (if no animation mixer)
        if (!mixerRef.current) {
          const isMoving = Math.abs(vel.x) > 0.3 || Math.abs(vel.z) > 0.3;
          if (isMoving) {
            // Walk bob
            model.children.forEach((child) => {
              if (child.name.includes("Leg") || child.name.includes("leg")) {
                child.rotation.x = Math.sin(performance.now() * 0.008) * 0.4;
              }
              if (child.name.includes("Arm") || child.name.includes("arm")) {
                child.rotation.x = Math.sin(performance.now() * 0.008 + Math.PI) * 0.3;
              }
            });
          }
        }

        // Over-shoulder camera follow
        const cameraOffset = new THREE.Vector3(-1, 2.5, -4);
        cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), model.rotation.y);
        const targetCamPos = model.position.clone().add(cameraOffset);
        camera.position.lerp(targetCamPos, 5 * delta);
        const lookTarget = model.position.clone().add(new THREE.Vector3(0, 1.2, 0));
        camera.lookAt(lookTarget);
      },
      [],
    );

    // ── Expose handle ──

    useImperativeHandle(ref, () => ({
      getModel: () => modelRef.current,
      applyCustom: (c: CharacterCustomization) => {
        if (modelRef.current) applyCustomization(modelRef.current, c);
      },
    }));

    return (
      <div
        ref={containerRef}
        className={`relative ${className || ""}`}
        style={{ minHeight: mode === "thumbnail" ? 200 : 400 }}
      >
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    );
  },
);

CharacterViewer3D.displayName = "CharacterViewer3D";
export default CharacterViewer3D;
