import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { AssetEntry } from "./AssetBrowser";
import type { RTSEntity, InteractionState } from "./RTSInteraction";
import { getCursorClass, getDragBox } from "./RTSInteraction";

interface RTSTestbedProps {
  interactionState: InteractionState;
  entities: RTSEntity[];
  onEntityClick: (id: string) => void;
  onGroundClick: (pos: { x: number; y: number; z: number }) => void;
  onDragStart: (x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: (boxEntities: string[]) => void;
  onHoverEntity: (id: string | null) => void;
}

export function RTSTestbed({
  interactionState, entities, onEntityClick, onGroundClick,
  onDragStart, onDragMove, onDragEnd, onHoverEntity,
}: RTSTestbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const rafRef = useRef(0);
  const clockRef = useRef(new THREE.Clock());
  const meshMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const raycasterRef = useRef(new THREE.Raycaster());
  const groundPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));

  // Camera state for RTS controls
  const camTarget = useRef(new THREE.Vector3(0, 0, 0));
  const camZoom = useRef(35);
  const keysRef = useRef(new Set<string>());

  const [initialized, setInitialized] = useState(false);

  // ===== INIT =====
  useEffect(() => {
    const ct = containerRef.current;
    if (!ct || initialized) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2634);
    scene.fog = new THREE.Fog(0x1a2634, 80, 150);
    sceneRef.current = scene;

    const cam = new THREE.PerspectiveCamera(55, ct.clientWidth / ct.clientHeight, 0.1, 300);
    cam.position.set(0, 35, 35);
    cam.lookAt(0, 0, 0);
    cameraRef.current = cam;

    const r = new THREE.WebGLRenderer({ antialias: true });
    r.setSize(ct.clientWidth, ct.clientHeight);
    r.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    ct.appendChild(r.domElement);
    rendererRef.current = r;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffeedd, 0.5));
    const sun = new THREE.DirectionalLight(0xfff5e0, 0.9);
    sun.position.set(15, 30, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
    scene.add(sun);
    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x556633, 0.3));

    // Ground
    const groundGeo = new THREE.PlaneGeometry(100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    // Grid
    const grid = new THREE.GridHelper(100, 50, 0x000000, 0x333333);
    (grid.material as THREE.Material).opacity = 0.15;
    (grid.material as THREE.Material).transparent = true;
    scene.add(grid);

    setInitialized(true);

    // Game loop
    const loop = () => {
      const dt = clockRef.current.getDelta();

      // Camera WASD pan
      const panSpeed = 25 * dt;
      if (keysRef.current.has('w') || keysRef.current.has('arrowup')) camTarget.current.z -= panSpeed;
      if (keysRef.current.has('s') || keysRef.current.has('arrowdown')) camTarget.current.z += panSpeed;
      if (keysRef.current.has('a') || keysRef.current.has('arrowleft')) camTarget.current.x -= panSpeed;
      if (keysRef.current.has('d') || keysRef.current.has('arrowright')) camTarget.current.x += panSpeed;

      // Apply camera
      if (cameraRef.current) {
        const z = camZoom.current;
        cameraRef.current.position.set(camTarget.current.x, z, camTarget.current.z + z * 0.7);
        cameraRef.current.lookAt(camTarget.current);
      }

      // Procedural unit animations
      const t = performance.now() * 0.001;
      meshMapRef.current.forEach((mesh, id) => {
        const ent = entities.find(e => e.id === id);
        if (!ent) return;
        mesh.position.set(ent.position.x, Math.sin(t * 2 + mesh.id) * 0.05, ent.position.z);
        // Selection ring
        const ring = mesh.getObjectByName('selRing');
        if (ring) {
          (ring as THREE.Mesh).material = new THREE.MeshBasicMaterial({
            color: interactionState.selectedIds.includes(id) ? 0x00ff00 :
              interactionState.hoverEntityId === id ? (interactionState.mode === 'attack' ? 0xff0000 : 0xffaa00) : 0x000000,
            transparent: true,
            opacity: interactionState.selectedIds.includes(id) || interactionState.hoverEntityId === id ? 0.5 : 0,
            side: THREE.DoubleSide,
          });
        }
      });

      r.render(scene, cam);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    // Resize
    const handleResize = () => {
      if (!ct || !r || !cam) return;
      cam.aspect = ct.clientWidth / ct.clientHeight;
      cam.updateProjectionMatrix();
      r.setSize(ct.clientWidth, ct.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Keyboard
    const keyDown = (e: KeyboardEvent) => keysRef.current.add(e.key.toLowerCase());
    const keyUp = (e: KeyboardEvent) => keysRef.current.delete(e.key.toLowerCase());
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);

    // Zoom
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      camZoom.current = Math.max(10, Math.min(80, camZoom.current + e.deltaY * 0.05));
    };
    ct.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      ct.removeEventListener('wheel', handleWheel);
      if (r.domElement.parentNode) r.domElement.parentNode.removeChild(r.domElement);
      r.dispose();
    };
  }, []);

  // ===== SYNC ENTITIES TO 3D =====
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Add meshes for new entities
    for (const ent of entities) {
      if (meshMapRef.current.has(ent.id)) continue;

      const group = new THREE.Group();
      const isBuilding = ent.kind === 'building';
      const color = ent.team === 'player' ? 0x3366ff : ent.team === 'enemy' ? 0xff3333 : 0x888888;

      if (isBuilding) {
        const body = new THREE.Mesh(
          new THREE.BoxGeometry(2, 2.5, 2),
          new THREE.MeshStandardMaterial({ color, roughness: 0.7 })
        );
        body.position.y = 1.25;
        body.castShadow = true;
        group.add(body);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(1.8, 1.2, 4),
          new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 })
        );
        roof.position.y = 3.1;
        roof.rotation.y = Math.PI / 4;
        group.add(roof);
      } else {
        const body = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.3, 0.8, 4, 8),
          new THREE.MeshStandardMaterial({ color, roughness: 0.6 })
        );
        body.position.y = 0.7;
        body.castShadow = true;
        group.add(body);
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xeebb99 })
        );
        head.position.y = 1.3;
        group.add(head);
      }

      // Selection ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(isBuilding ? 1.5 : 0.6, isBuilding ? 1.8 : 0.8, 24),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, side: THREE.DoubleSide })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.02;
      ring.name = 'selRing';
      group.add(ring);

      // HP bar
      const hpCanvas = document.createElement('canvas');
      hpCanvas.width = 64; hpCanvas.height = 8;
      const hpCtx = hpCanvas.getContext('2d')!;
      hpCtx.fillStyle = '#22c55e'; hpCtx.fillRect(0, 0, 64, 8);
      const hpTex = new THREE.CanvasTexture(hpCanvas);
      const hpBar = new THREE.Sprite(new THREE.SpriteMaterial({ map: hpTex, depthTest: false }));
      hpBar.scale.set(1.2, 0.12, 1);
      hpBar.position.y = isBuilding ? 4 : 1.8;
      group.add(hpBar);

      group.position.set(ent.position.x, 0, ent.position.z);
      group.userData = { entityId: ent.id };
      scene.add(group);
      meshMapRef.current.set(ent.id, group);
    }

    // Remove meshes for deleted entities
    const activeIds = new Set(entities.map(e => e.id));
    meshMapRef.current.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        scene.remove(mesh);
        meshMapRef.current.delete(id);
      }
    });
  }, [entities]);

  // ===== MOUSE HANDLERS =====
  const getGroundPos = useCallback((e: React.MouseEvent): THREE.Vector3 | null => {
    const ct = containerRef.current, cam = cameraRef.current;
    if (!ct || !cam) return null;
    const rc = ct.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rc.left) / rc.width) * 2 - 1,
      -((e.clientY - rc.top) / rc.height) * 2 + 1
    );
    raycasterRef.current.setFromCamera(mouse, cam);
    const target = new THREE.Vector3();
    return raycasterRef.current.ray.intersectPlane(groundPlaneRef.current, target) ? target : null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const rc = containerRef.current?.getBoundingClientRect();
    if (!rc) return;
    onDragStart(e.clientX - rc.left, e.clientY - rc.top);
  }, [onDragStart]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rc = containerRef.current?.getBoundingClientRect();
    if (!rc) return;
    onDragMove(e.clientX - rc.left, e.clientY - rc.top);

    // Hover detection
    const cam = cameraRef.current, scene = sceneRef.current;
    if (!cam || !scene) return;
    const mouse = new THREE.Vector2(
      ((e.clientX - rc.left) / rc.width) * 2 - 1,
      -((e.clientY - rc.top) / rc.height) * 2 + 1
    );
    raycasterRef.current.setFromCamera(mouse, cam);
    const meshes = Array.from(meshMapRef.current.values());
    const allChildren: THREE.Object3D[] = [];
    meshes.forEach(m => m.traverse(c => allChildren.push(c)));
    const hits = raycasterRef.current.intersectObjects(allChildren, false);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj && !obj.userData?.entityId) obj = obj.parent;
      onHoverEntity(obj?.userData?.entityId || null);
    } else {
      onHoverEntity(null);
    }
  }, [onDragMove, onHoverEntity]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const dragBox = getDragBox(interactionState);
    if (dragBox && dragBox.width > 8 && dragBox.height > 8) {
      // Box select — find entities in screen-space box
      const ct = containerRef.current, cam = cameraRef.current;
      if (ct && cam) {
        const rc = ct.getBoundingClientRect();
        const inBox = entities.filter(ent => {
          const mesh = meshMapRef.current.get(ent.id);
          if (!mesh) return false;
          const pos = mesh.position.clone().project(cam);
          const sx = (pos.x + 1) / 2 * rc.width;
          const sy = (-pos.y + 1) / 2 * rc.height;
          return ent.team === 'player' &&
            sx >= dragBox.left && sx <= dragBox.left + dragBox.width &&
            sy >= dragBox.top && sy <= dragBox.top + dragBox.height;
        }).map(e => e.id);
        onDragEnd(inBox);
      } else {
        onDragEnd([]);
      }
    } else {
      // Click
      const pos = getGroundPos(e);
      if (interactionState.hoverEntityId) {
        onEntityClick(interactionState.hoverEntityId);
      } else if (pos) {
        onGroundClick({ x: pos.x, y: pos.y, z: pos.z });
      }
      onDragEnd([]);
    }
  }, [interactionState, entities, getGroundPos, onEntityClick, onGroundClick, onDragEnd]);

  const cursorClass = getCursorClass(interactionState, entities);
  const dragBox = getDragBox(interactionState);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className={`h-full w-full ${cursorClass}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onContextMenu={e => e.preventDefault()}
      />

      {/* Drag selection box */}
      {dragBox && dragBox.width > 4 && (
        <div
          className="absolute border border-cyan-400 bg-cyan-400/15 pointer-events-none"
          style={{
            left: dragBox.left,
            top: dragBox.top,
            width: dragBox.width,
            height: dragBox.height,
          }}
        />
      )}

      {/* Controls hint */}
      <div className="absolute bottom-2 left-2 text-[10px] text-white/40 bg-black/30 px-2 py-1 rounded pointer-events-none">
        WASD: Pan · Scroll: Zoom · Click: Select · Drag: Box Select
      </div>
    </div>
  );
}
