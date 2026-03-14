import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Heart, Shield, Target, Volume2, VolumeX, Crosshair, Skull, RefreshCw } from "lucide-react";
import * as THREE from "three";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";

const MODEL_PATHS = {
  zombieNormal: "/public-objects/games/decay/Enemies/Zombie Normal/scene.gltf",
  zombieNormal2: "/public-objects/games/decay/Enemies/Zombie Normal 2/scene.gltf",
  zombieRunner: "/public-objects/games/decay/Enemies/Zombie Runner/scene.gltf",
  zombieSkinny: "/public-objects/games/decay/Enemies/Zombie Skinny/skinny.glb",
  rifle: "/public-objects/games/decay/Player/Gun/rifle.glb",
  healthPickup: "/public-objects/games/decay/Drops/Health/scene.gltf",
  armorPickup: "/public-objects/games/decay/Drops/Armor/armor.glb",
  rock: "/public-objects/games/decay/Props/Rocks/Rock1/rock.glb",
  tree1: "/public-objects/games/decay/Props/Trees/Tree1/scene.gltf",
  bush1: "/public-objects/games/decay/Props/Bushes/Bush1/scene.gltf",
};

const ZOMBIE_ANIMATIONS = {
  zombieNormal: { run: 3, attack: 4, death: 5 },
  zombieNormal2: { run: 2, attack: 14, death: 4 },
  zombieRunner: { run: 8, attack: 15, death: 14 },
  zombieSkinny: { run: 6, attack: 1, death: 3 },
};

interface Zombie {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  type: "walker" | "runner" | "brute";
  lastAttack: number;
  isDead: boolean;
  deathTime: number;
  mixer?: THREE.AnimationMixer;
  animations?: Map<string, THREE.AnimationClip>;
  animIndices?: { run: number; attack: number; death: number };
  currentAction?: THREE.AnimationAction;
  state: "idle" | "walking" | "running" | "attacking" | "dead";
}

interface Pickup {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  type: "health" | "armor" | "ammo";
  value: number;
}

interface Bullet {
  id: string;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  damage: number;
  distance: number;
}

const ZOMBIE_CONFIG = {
  walker: { health: 50, speed: 2, damage: 10, size: 1, color: 0x4a5568 },
  runner: { health: 30, speed: 5, damage: 8, size: 0.8, color: 0x718096 },
  brute: { health: 150, speed: 1.5, damage: 25, size: 1.5, color: 0x2d3748 },
};

export default function Decay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<PointerLockControls | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const animationFrameRef = useRef<number>(0);
  const gltfLoaderRef = useRef<GLTFLoader>(new GLTFLoader());
  const loadedModelsRef = useRef<Map<string, THREE.Group>>(new Map());
  const loadedAnimationsRef = useRef<Map<string, THREE.AnimationClip[]>>(new Map());
  const modelsLoadingRef = useRef<boolean>(false);
  const rifleRef = useRef<THREE.Group | null>(null);
  const rifleMixerRef = useRef<THREE.AnimationMixer | null>(null);
  
  const zombiesRef = useRef<Zombie[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const bloodSplatsRef = useRef<{ mesh: THREE.Points; createdAt: number }[]>([]);
  
  const keysRef = useRef<Set<string>>(new Set());
  const velocityRef = useRef(new THREE.Vector3());
  const canJumpRef = useRef(true);
  const isCrouchingRef = useRef(false);
  const isSprintingRef = useRef(false);
  const isAimingRef = useRef(false);
  const lastShotRef = useRef(0);
  const reloadingRef = useRef(false);
  const reloadStartRef = useRef(0);
  
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "gameover">("menu");
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;
  const [health, setHealth] = useState(100);
  const [armor, setArmor] = useState(0);
  const [ammo, setAmmo] = useState(30);
  const [maxAmmo] = useState(30);
  const [reserveAmmo, setReserveAmmo] = useState(90);
  const [kills, setKills] = useState(0);
  const [wave, setWave] = useState(1);
  const [score, setScore] = useState(0);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [showControls, setShowControls] = useState(false);

  const spawnTimerRef = useRef(0);
  const pickupTimerRef = useRef(0);
  const survivalTimerRef = useRef(0);

  // Refs that mirror state for use inside the game loop (avoids stale closures & unnecessary re-renders)
  const healthRef = useRef(health);
  healthRef.current = health;
  const armorRef = useRef(armor);
  armorRef.current = armor;
  const killsRef = useRef(kills);
  killsRef.current = kills;
  const waveRef = useRef(wave);
  waveRef.current = wave;
  const waveKillsRef = useRef(0);

  const loadModels = useCallback(async () => {
    if (modelsLoadingRef.current || loadedModelsRef.current.size > 0) return;
    modelsLoadingRef.current = true;

    const loader = gltfLoaderRef.current;
    const modelEntries = Object.entries(MODEL_PATHS);

    for (const [key, path] of modelEntries) {
      try {
        await new Promise<void>((resolve, reject) => {
          loader.load(
            path,
            (gltf) => {
              const model = gltf.scene.clone();
              model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                  child.castShadow = true;
                  child.receiveShadow = true;
                }
              });
              loadedModelsRef.current.set(key, model);
              if (gltf.animations && gltf.animations.length > 0) {
                loadedAnimationsRef.current.set(key, gltf.animations);
                console.log(`Loaded ${gltf.animations.length} animations for ${key}`);
              }
              resolve();
            },
            undefined,
            () => reject(new Error(`Failed to load ${path}`))
          );
        });
      } catch {
        console.warn(`Could not load model: ${path}, using fallback`);
      }
    }
    modelsLoadingRef.current = false;
  }, []);

  const getLoadedZombieMesh = useCallback((type: keyof typeof ZOMBIE_CONFIG): { 
    mesh: THREE.Group; 
    mixer?: THREE.AnimationMixer; 
    animations: Map<string, THREE.AnimationClip>;
    animIndices: { run: number; attack: number; death: number };
  } | null => {
    const modelKeys: Record<string, string[]> = {
      walker: ["zombieNormal", "zombieNormal2"],
      runner: ["zombieRunner"],
      brute: ["zombieSkinny"],
    };

    const candidates = modelKeys[type] || [];
    for (const key of candidates) {
      const model = loadedModelsRef.current.get(key);
      if (model) {
        const clone = SkeletonUtils.clone(model) as THREE.Group;
        const config = ZOMBIE_CONFIG[type];
        clone.scale.setScalar(config.size * (type === "brute" ? 1.5 : 0.8));
        
        const mixer = new THREE.AnimationMixer(clone);
        const animClips = loadedAnimationsRef.current.get(key) || [];
        const animationsMap = new Map<string, THREE.AnimationClip>();
        
        for (let i = 0; i < animClips.length; i++) {
          animationsMap.set(`anim_${i}`, animClips[i]);
        }
        
        const animIndices = ZOMBIE_ANIMATIONS[key as keyof typeof ZOMBIE_ANIMATIONS] || { run: 0, attack: 1, death: 2 };
        
        return { mesh: clone, mixer, animations: animationsMap, animIndices };
      }
    }
    return null;
  }, []);

  const createZombieMesh = useCallback((type: keyof typeof ZOMBIE_CONFIG): {
    mesh: THREE.Group;
    mixer?: THREE.AnimationMixer;
    animations?: Map<string, THREE.AnimationClip>;
    animIndices?: { run: number; attack: number; death: number };
  } => {
    const loadedData = getLoadedZombieMesh(type);
    if (loadedData) return loadedData;
    
    const config = ZOMBIE_CONFIG[type];
    const group = new THREE.Group();

    const bodyGeometry = new THREE.CapsuleGeometry(0.3 * config.size, 1 * config.size, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: config.color,
      roughness: 0.8,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.8 * config.size;
    body.castShadow = true;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(0.25 * config.size, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3d4852,
      roughness: 0.9,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.6 * config.size;
    head.castShadow = true;
    group.add(head);

    const eyeGeometry = new THREE.SphereGeometry(0.05 * config.size, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1 * config.size, 1.65 * config.size, 0.2 * config.size);
    group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1 * config.size, 1.65 * config.size, 0.2 * config.size);
    group.add(rightEye);

    const armGeometry = new THREE.CapsuleGeometry(0.1 * config.size, 0.6 * config.size, 4, 8);
    const armMaterial = new THREE.MeshStandardMaterial({ color: config.color });
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.4 * config.size, 0.8 * config.size, 0.2 * config.size);
    leftArm.rotation.x = -0.5;
    group.add(leftArm);
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.4 * config.size, 0.8 * config.size, 0.2 * config.size);
    rightArm.rotation.x = -0.5;
    group.add(rightArm);

    return { mesh: group };
  }, [getLoadedZombieMesh]);

  const playZombieAnimation = useCallback((zombie: Zombie, animType: "run" | "attack" | "death", loop = true) => {
    if (!zombie.mixer || !zombie.animations || !zombie.animIndices) return;
    
    const animIndex = zombie.animIndices[animType];
    const clip = zombie.animations.get(`anim_${animIndex}`);
    if (!clip) return;
    
    if (zombie.currentAction) {
      zombie.currentAction.fadeOut(0.3);
    }
    
    const action = zombie.mixer.clipAction(clip);
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.fadeIn(0.3);
    action.play();
    zombie.currentAction = action;
  }, []);

  const initScene = useCallback(async () => {
    if (!containerRef.current) return;

    await loadModels();

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.7, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new PointerLockControls(camera, renderer.domElement);
    controlsRef.current = controls;
    
    controls.addEventListener("lock", () => setIsLocked(true));
    controls.addEventListener("unlock", () => {
      setIsLocked(false);
      if (gameStateRef.current === "playing") setGameState("paused");
    });

    const rifleModel = loadedModelsRef.current.get("rifle");
    if (rifleModel) {
      const rifle = rifleModel.clone();
      rifle.scale.setScalar(0.15);
      rifle.position.set(0.25, -0.25, -0.5);
      rifle.rotation.set(0, Math.PI, 0);
      camera.add(rifle);
      rifleRef.current = rifle;
      
      const rifleAnims = loadedAnimationsRef.current.get("rifle");
      if (rifleAnims && rifleAnims.length > 0) {
        rifleMixerRef.current = new THREE.AnimationMixer(rifle);
      }
    }
    scene.add(camera);

    const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
    scene.add(ambientLight);

    const moonLight = new THREE.DirectionalLight(0x8888aa, 0.5);
    moonLight.position.set(50, 100, 50);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 2048;
    moonLight.shadow.mapSize.height = 2048;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 500;
    moonLight.shadow.camera.left = -100;
    moonLight.shadow.camera.right = 100;
    moonLight.shadow.camera.top = 100;
    moonLight.shadow.camera.bottom = -100;
    scene.add(moonLight);

    const groundSize = 200;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize, 50, 50);
    const positions = groundGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      positions.setZ(i, (Math.sin(x * 0.1) + Math.cos(y * 0.1)) * 0.3);
    }
    groundGeometry.computeVertexNormals();
    
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3436,
      roughness: 0.9,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    for (let i = 0; i < 20; i++) {
      const x = (Math.random() - 0.5) * 150;
      const z = (Math.random() - 0.5) * 150;
      
      if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;

      const loadedTree = loadedModelsRef.current.get("tree1");
      if (loadedTree) {
        const tree = loadedTree.clone();
        tree.position.set(x, 0, z);
        tree.scale.setScalar(1 + Math.random() * 0.5);
        tree.rotation.y = Math.random() * Math.PI * 2;
        scene.add(tree);
      } else {
        const treeGroup = new THREE.Group();
        const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 4, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2817 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.y = 2;
        trunk.castShadow = true;
        treeGroup.add(trunk);

        const branchGeometry = new THREE.CylinderGeometry(0.05, 0.15, 2, 6);
        const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1f14 });
        for (let j = 0; j < 4; j++) {
          const branch = new THREE.Mesh(branchGeometry, branchMaterial);
          branch.position.y = 3 + Math.random();
          branch.rotation.z = Math.PI / 4 + Math.random() * 0.3;
          branch.rotation.y = (j / 4) * Math.PI * 2;
          treeGroup.add(branch);
        }

        treeGroup.position.set(x, 0, z);
        scene.add(treeGroup);
      }
    }

    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 160;
      
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;

      const loadedRock = loadedModelsRef.current.get("rock");
      if (loadedRock) {
        const rock = loadedRock.clone();
        rock.position.set(x, 0, z);
        rock.scale.setScalar(0.5 + Math.random() * 1);
        rock.rotation.y = Math.random() * Math.PI;
        scene.add(rock);
      } else {
        const width = 3 + Math.random() * 4;
        const height = 2 + Math.random() * 3;
        const depth = 3 + Math.random() * 4;
        
        const rockGeometry = new THREE.BoxGeometry(width, height, depth);
        const rockMaterial = new THREE.MeshStandardMaterial({ 
          color: 0x4a4a4a,
          roughness: 0.9,
        });
        const rock = new THREE.Mesh(rockGeometry, rockMaterial);
        rock.position.set(x, height / 2, z);
        rock.rotation.y = Math.random() * Math.PI;
        rock.castShadow = true;
        rock.receiveShadow = true;
        scene.add(rock);
      }
    }

    const loadedBush = loadedModelsRef.current.get("bush1");
    if (loadedBush) {
      for (let i = 0; i < 30; i++) {
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 180;
        if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
        
        const bush = loadedBush.clone();
        bush.position.set(x, 0, z);
        bush.scale.setScalar(0.8 + Math.random() * 0.5);
        bush.rotation.y = Math.random() * Math.PI * 2;
        scene.add(bush);
      }
    }

  }, [loadModels]);

  const spawnZombie = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current) return;

    const types: Array<keyof typeof ZOMBIE_CONFIG> = ["walker", "walker", "walker", "runner", "brute"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    if (type === "brute" && wave < 3) return;
    if (type === "runner" && wave < 2) return;

    const angle = Math.random() * Math.PI * 2;
    const distance = 30 + Math.random() * 20;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    const config = ZOMBIE_CONFIG[type];
    const { mesh, mixer, animations, animIndices } = createZombieMesh(type);
    mesh.position.set(x, 0, z);
    sceneRef.current.add(mesh);

    const zombie: Zombie = {
      id: Math.random().toString(36).substr(2, 9),
      mesh,
      position: new THREE.Vector3(x, 0, z),
      health: config.health + wave * 10,
      maxHealth: config.health + wave * 10,
      speed: config.speed + wave * 0.1,
      damage: config.damage + wave * 2,
      type,
      lastAttack: 0,
      isDead: false,
      deathTime: 0,
      mixer,
      animations,
      animIndices,
      state: "walking",
    };

    if (mixer && animations && animIndices) {
      playZombieAnimation(zombie, "run");
    }

    zombiesRef.current.push(zombie);
  }, [wave, createZombieMesh, playZombieAnimation]);

  const spawnPickup = useCallback(() => {
    if (!sceneRef.current) return;

    const types: Array<"health" | "armor" | "ammo"> = ["health", "armor", "ammo"];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 5 + Math.random() * 30;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;

    const colors = { health: 0x22c55e, armor: 0x3b82f6, ammo: 0xfbbf24 };
    const values = { health: 25, armor: 25, ammo: 15 };

    const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const material = new THREE.MeshStandardMaterial({ 
      color: colors[type],
      emissive: colors[type],
      emissiveIntensity: 0.3,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, 0.5, z);
    mesh.castShadow = true;
    sceneRef.current.add(mesh);

    pickupsRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      mesh,
      position: new THREE.Vector3(x, 0.5, z),
      type,
      value: values[type],
    });
  }, []);

  const createBloodSplat = useCallback((position: THREE.Vector3, direction: THREE.Vector3) => {
    if (!sceneRef.current) return;

    const particleCount = 15;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const spreadX = (Math.random() - 0.5) * 0.5;
      const spreadY = (Math.random() - 0.5) * 0.5;
      const spreadZ = (Math.random() - 0.5) * 0.5;
      
      positions[i * 3] = position.x + spreadX + direction.x * 0.3;
      positions[i * 3 + 1] = position.y + spreadY + direction.y * 0.3;
      positions[i * 3 + 2] = position.z + spreadZ + direction.z * 0.3;

      const shade = 0.3 + Math.random() * 0.4;
      colors[i * 3] = shade;
      colors[i * 3 + 1] = 0;
      colors[i * 3 + 2] = 0;

      sizes[i] = 0.05 + Math.random() * 0.1;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    sceneRef.current.add(particles);
    bloodSplatsRef.current.push({ mesh: particles, createdAt: performance.now() });
  }, []);

  const createMuzzleFlash = useCallback(() => {
    if (!cameraRef.current || !sceneRef.current) return;

    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.8,
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    
    const direction = new THREE.Vector3();
    cameraRef.current.getWorldDirection(direction);
    
    flash.position.copy(cameraRef.current.position);
    flash.position.add(direction.multiplyScalar(0.5));
    flash.position.y -= 0.1;
    flash.position.x += 0.2;
    
    sceneRef.current.add(flash);
    
    setTimeout(() => {
      if (sceneRef.current) {
        sceneRef.current.remove(flash);
        flashGeometry.dispose();
        flashMaterial.dispose();
      }
    }, 50);
  }, []);

  const shoot = useCallback(() => {
    if (!cameraRef.current || ammo <= 0 || reloadingRef.current) return;

    const now = performance.now();
    const fireRate = isAimingRef.current ? 150 : 120;
    
    if (now - lastShotRef.current < fireRate) return;
    lastShotRef.current = now;

    setAmmo((a) => a - 1);
    createMuzzleFlash();

    const direction = new THREE.Vector3();
    cameraRef.current.getWorldDirection(direction);

    let spread = 0.02;
    if (isSprintingRef.current) spread = 0.08;
    else if (isCrouchingRef.current) spread = 0.01;
    else if (isAimingRef.current) spread = 0.005;
    
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();

    const origin = cameraRef.current.position.clone();
    
    const raycaster = new THREE.Raycaster(origin, direction);
    raycaster.far = 100;

    let hitZombie = false;
    zombiesRef.current.forEach((zombie) => {
      if (zombie.isDead) return;
      
      const zombiePos = zombie.mesh.position.clone();
      zombiePos.y += 1;
      const distance = origin.distanceTo(zombiePos);
      
      if (distance < 50) {
        const toZombie = zombiePos.clone().sub(origin).normalize();
        const dot = direction.dot(toZombie);
        
        if (dot > 0.98) {
          const damage = 25 + (isAimingRef.current ? 10 : 0);
          zombie.health -= damage;
          hitZombie = true;
          
          createBloodSplat(zombiePos, direction);

          if (zombie.health <= 0 && !zombie.isDead) {
            zombie.isDead = true;
            zombie.deathTime = now;
            zombie.state = "dead";
            
            const scoreValue = { walker: 100, runner: 150, brute: 300 }[zombie.type] ?? 100;
            setScore((s) => s + scoreValue);
            setKills((k) => k + 1);
            waveKillsRef.current += 1;
            
            if (zombie.mixer && zombie.animations && zombie.animIndices) {
              playZombieAnimation(zombie, "death", false);
            } else {
              zombie.mesh.rotation.x = Math.PI / 2;
              zombie.mesh.position.y = 0.3;
            }
          }
        }
      }
    });

  }, [ammo, createBloodSplat, createMuzzleFlash]);

  const reload = useCallback(() => {
    if (reloadingRef.current || ammo >= maxAmmo || reserveAmmo <= 0) return;
    
    reloadingRef.current = true;
    reloadStartRef.current = performance.now();
    
    setTimeout(() => {
      const needed = maxAmmo - ammo;
      const available = Math.min(needed, reserveAmmo);
      setAmmo((a) => a + available);
      setReserveAmmo((r) => r - available);
      reloadingRef.current = false;
    }, 2000);
  }, [ammo, maxAmmo, reserveAmmo]);

  const gameLoop = useCallback(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current || !controlsRef.current) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    if (gameState !== "playing") {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const delta = clockRef.current.getDelta();
    const camera = cameraRef.current;
    const velocity = velocityRef.current;

    survivalTimerRef.current += delta;
    setSurvivalTime(Math.floor(survivalTimerRef.current));

    const moveSpeed = isCrouchingRef.current ? 3 : isSprintingRef.current ? 8 : 5;
    const damping = 10;

    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const moveDirection = new THREE.Vector3();
    if (keysRef.current.has("w")) moveDirection.add(forward);
    if (keysRef.current.has("s")) moveDirection.sub(forward);
    if (keysRef.current.has("a")) moveDirection.sub(right);
    if (keysRef.current.has("d")) moveDirection.add(right);

    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      velocity.x += moveDirection.x * moveSpeed * delta;
      velocity.z += moveDirection.z * moveSpeed * delta;
    }

    velocity.x *= 1 - damping * delta;
    velocity.z *= 1 - damping * delta;

    const targetHeight = isCrouchingRef.current ? 1.2 : 1.7;
    camera.position.y += (targetHeight - camera.position.y) * 5 * delta;

    if (keysRef.current.has(" ") && canJumpRef.current && !isCrouchingRef.current) {
      velocity.y = 5;
      canJumpRef.current = false;
    }

    velocity.y -= 15 * delta;
    
    const newPos = camera.position.clone();
    newPos.x += velocity.x;
    newPos.z += velocity.z;
    newPos.y += velocity.y * delta;

    if (newPos.y < targetHeight) {
      newPos.y = targetHeight;
      velocity.y = 0;
      canJumpRef.current = true;
    }

    const boundary = 95;
    newPos.x = Math.max(-boundary, Math.min(boundary, newPos.x));
    newPos.z = Math.max(-boundary, Math.min(boundary, newPos.z));

    camera.position.copy(newPos);

    spawnTimerRef.current += delta;
    const spawnInterval = Math.max(1, 5 - wave * 0.3);
    if (spawnTimerRef.current > spawnInterval && zombiesRef.current.length < 20 + wave * 5) {
      spawnZombie();
      spawnTimerRef.current = 0;
    }

    pickupTimerRef.current += delta;
    if (pickupTimerRef.current > 15 && pickupsRef.current.length < 5) {
      spawnPickup();
      pickupTimerRef.current = 0;
    }

    const now = performance.now();
    zombiesRef.current.forEach((zombie) => {
      if (zombie.mixer) {
        zombie.mixer.update(delta);
      }
      
      if (zombie.isDead) {
        if (now - zombie.deathTime > 3000 && sceneRef.current) {
          sceneRef.current.remove(zombie.mesh);
        }
        return;
      }

      const toPlayer = camera.position.clone().sub(zombie.position);
      toPlayer.y = 0;
      const distance = toPlayer.length();

      if (distance > 2) {
        if (zombie.state !== "walking" && zombie.state !== "running") {
          zombie.state = zombie.type === "runner" ? "running" : "walking";
          playZombieAnimation(zombie, "run");
        }
        toPlayer.normalize();
        zombie.position.add(toPlayer.multiplyScalar(zombie.speed * delta));
        zombie.mesh.position.copy(zombie.position);
        zombie.mesh.lookAt(camera.position.x, zombie.mesh.position.y, camera.position.z);
      } else if (now - zombie.lastAttack > 1000) {
        zombie.state = "attacking";
        playZombieAnimation(zombie, "attack", false);
        zombie.lastAttack = now;
        
      if (armorRef.current > 0) {
          const remaining = zombie.damage - armorRef.current;
          setArmor((a) => Math.max(0, a - zombie.damage));
          if (remaining > 0) {
            setHealth((h) => {
              const newHealth = h - remaining;
              if (newHealth <= 0) setGameState("gameover");
              return Math.max(0, newHealth);
            });
          }
        } else {
          setHealth((h) => {
            const newHealth = h - zombie.damage;
            if (newHealth <= 0) setGameState("gameover");
            return Math.max(0, newHealth);
          });
        }
      }
    });

    zombiesRef.current = zombiesRef.current.filter((z) => !z.isDead || now - z.deathTime < 3000);

    pickupsRef.current.forEach((pickup) => {
      pickup.mesh.rotation.y += delta * 2;
      
      const distance = camera.position.distanceTo(pickup.position);
      if (distance < 1.5) {
        if (pickup.type === "health" && healthRef.current < 100) {
          setHealth((h) => Math.min(100, h + pickup.value));
          if (sceneRef.current) sceneRef.current.remove(pickup.mesh);
          pickup.mesh.visible = false;
        } else if (pickup.type === "armor" && armorRef.current < 100) {
          setArmor((a) => Math.min(100, a + pickup.value));
          if (sceneRef.current) sceneRef.current.remove(pickup.mesh);
          pickup.mesh.visible = false;
        } else if (pickup.type === "ammo") {
          setReserveAmmo((r) => r + pickup.value);
          if (sceneRef.current) sceneRef.current.remove(pickup.mesh);
          pickup.mesh.visible = false;
        }
      }
    });
    pickupsRef.current = pickupsRef.current.filter((p) => p.mesh.visible);

    const killsNeeded = 10 + waveRef.current * 5;
    if (waveKillsRef.current >= killsNeeded) {
      waveKillsRef.current = 0;
      setWave((w) => w + 1);
    }

    bloodSplatsRef.current.forEach((splat) => {
      const age = now - splat.createdAt;
      const material = splat.mesh.material as THREE.PointsMaterial;
      material.opacity = Math.max(0, 0.9 - age / 1000);
    });
    bloodSplatsRef.current = bloodSplatsRef.current.filter((splat) => {
      if (now - splat.createdAt > 1000) {
        if (sceneRef.current) {
          sceneRef.current.remove(splat.mesh);
          splat.mesh.geometry.dispose();
          (splat.mesh.material as THREE.PointsMaterial).dispose();
        }
        return false;
      }
      return true;
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, spawnZombie, spawnPickup, playZombieAnimation]);

  const startGame = useCallback(() => {
    // Clean up previous scene resources before re-initializing
    if (rendererRef.current && containerRef.current) {
      try {
        containerRef.current.removeChild(rendererRef.current.domElement);
      } catch { /* already removed */ }
      rendererRef.current.dispose();
      rendererRef.current = null;
    }
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
    sceneRef.current = null;
    cameraRef.current = null;

    setGameState("playing");
    setHealth(100);
    setArmor(0);
    setAmmo(30);
    setReserveAmmo(90);
    setKills(0);
    setWave(1);
    setScore(0);
    setSurvivalTime(0);
    
    zombiesRef.current = [];
    pickupsRef.current = [];
    bloodSplatsRef.current = [];
    spawnTimerRef.current = 0;
    pickupTimerRef.current = 0;
    survivalTimerRef.current = 0;
    waveKillsRef.current = 0;
    
    initScene();
    
    setTimeout(() => {
      controlsRef.current?.lock();
    }, 100);
  }, [initScene]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      
      if (e.key.toLowerCase() === "c") isCrouchingRef.current = true;
      if (e.key === "Shift") isSprintingRef.current = true;
      if (e.key.toLowerCase() === "r") reload();
      if (e.key.toLowerCase() === "p") setShowControls((s) => !s);
      if (e.key === "Escape" && gameState === "paused") {
        setGameState("playing");
        controlsRef.current?.lock();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
      
      if (e.key.toLowerCase() === "c") isCrouchingRef.current = false;
      if (e.key === "Shift") isSprintingRef.current = false;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0 && isLocked) shoot();
      if (e.button === 2) isAimingRef.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 2) isAimingRef.current = false;
    };

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };

    const handleContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("resize", handleResize);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [isLocked, shoot, reload, gameState]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [gameLoop]);

  useEffect(() => {
    return () => {
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, []);

  if (gameState === "menu") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center p-4" data-testid="screen-menu">
        <Link href="/">
          <Button variant="ghost" className="absolute top-4 left-4 text-white" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-7xl font-bold text-red-600 mb-4 tracking-wider" style={{ fontFamily: "Bebas Neue, sans-serif", textShadow: "0 0 20px rgba(220, 38, 38, 0.5)" }} data-testid="text-title">
            DECAY
          </h1>
          <p className="text-gray-400 text-xl italic" data-testid="text-subtitle">
            Stand against the decay
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white px-12 py-6 text-xl"
            onClick={startGame}
            data-testid="button-play"
          >
            <Skull className="h-6 w-6 mr-3" />
            SURVIVE
          </Button>

          <Button
            variant="outline"
            className="border-gray-600"
            onClick={() => setShowControls(true)}
            data-testid="button-controls"
          >
            View Controls
          </Button>
        </div>

        {showControls && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={() => setShowControls(false)}>
            <div className="bg-gray-900 p-8 rounded-lg max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold text-white mb-4">Controls</h2>
              <div className="space-y-2 text-gray-300">
                <p><span className="text-white font-mono">WASD</span> - Move</p>
                <p><span className="text-white font-mono">Mouse</span> - Look around</p>
                <p><span className="text-white font-mono">Left Click</span> - Shoot</p>
                <p><span className="text-white font-mono">Right Click</span> - Aim down sights</p>
                <p><span className="text-white font-mono">Space</span> - Jump</p>
                <p><span className="text-white font-mono">C</span> - Crouch</p>
                <p><span className="text-white font-mono">Shift</span> - Sprint</p>
                <p><span className="text-white font-mono">R</span> - Reload</p>
                <p><span className="text-white font-mono">Esc</span> - Pause</p>
              </div>
              <Button className="mt-6 w-full" onClick={() => setShowControls(false)}>Close</Button>
            </div>
          </div>
        )}

        <div className="mt-12 text-gray-600 text-center text-sm">
          <p>Survive waves of zombies</p>
          <p>Collect health, armor, and ammo pickups</p>
        </div>
      </div>
    );
  }

  if (gameState === "gameover") {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center" data-testid="screen-gameover">
        <h1 className="text-6xl font-bold text-red-600 mb-4" style={{ fontFamily: "Bebas Neue, sans-serif" }}>
          YOU DIED
        </h1>
        <p className="text-gray-400 text-xl mb-8">The decay consumed you...</p>

        <div className="text-center mb-8 space-y-2">
          <p className="text-3xl text-white font-bold">{score} pts</p>
          <p className="text-xl text-gray-400">Kills: {kills}</p>
          <p className="text-xl text-gray-400">Wave: {wave}</p>
          <p className="text-xl text-gray-400">Survived: {Math.floor(survivalTime / 60)}m {survivalTime % 60}s</p>
        </div>

        <div className="flex gap-4">
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700"
            onClick={startGame}
            data-testid="button-retry"
          >
            <RefreshCw className="h-5 w-5 mr-2" />
            Try Again
          </Button>
          <Link href="/">
            <Button size="lg" variant="outline" data-testid="button-menu">
              Main Menu
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-[#1a1a2e] overflow-hidden" data-testid="screen-game">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Crosshair */}
      {isLocked && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Crosshair className={`h-6 w-6 ${isAimingRef.current ? "text-red-500" : "text-white/70"}`} />
        </div>
      )}

      {/* HUD */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end pointer-events-none">
        {/* Left: Health & Armor */}
        <div className="space-y-2 w-48">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            <Progress value={health} className="h-3 bg-gray-800" />
            <span className="text-white text-sm font-bold">{health}</span>
          </div>
          {armor > 0 && (
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <Progress value={armor} className="h-3 bg-gray-800" />
              <span className="text-blue-400 text-sm font-bold">{armor}</span>
            </div>
          )}
        </div>

        {/* Center: Wave & Score */}
        <div className="text-center">
          <p className="text-red-600 text-2xl font-bold">WAVE {wave}</p>
          <p className="text-white text-lg">{score} pts</p>
          <p className="text-gray-400 text-sm">{Math.floor(survivalTime / 60)}:{String(survivalTime % 60).padStart(2, "0")}</p>
        </div>

        {/* Right: Ammo */}
        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <Target className="h-5 w-5 text-yellow-500" />
            <span className="text-white text-2xl font-bold font-mono">{ammo}</span>
            <span className="text-gray-500 text-lg">/ {reserveAmmo}</span>
          </div>
          {reloadingRef.current && (
            <p className="text-yellow-400 text-sm animate-pulse">RELOADING...</p>
          )}
        </div>
      </div>

      {/* Top HUD */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="pointer-events-auto"
          data-testid="button-sound"
        >
          {soundEnabled ? <Volume2 className="h-5 w-5 text-white" /> : <VolumeX className="h-5 w-5 text-gray-500" />}
        </Button>
      </div>

      {/* Click to play overlay */}
      {!isLocked && gameState === "playing" && (
        <div 
          className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer"
          onClick={() => controlsRef.current?.lock()}
        >
          <p className="text-white text-xl">Click to continue</p>
        </div>
      )}

      {/* Pause overlay */}
      {gameState === "paused" && (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center" data-testid="overlay-pause">
          <h2 className="text-4xl font-bold text-white mb-8">PAUSED</h2>
          <div className="flex gap-4">
            <Button 
              size="lg" 
              className="bg-red-600 hover:bg-red-700" 
              onClick={() => {
                setGameState("playing");
                controlsRef.current?.lock();
              }}
            >
              Resume
            </Button>
            <Link href="/">
              <Button size="lg" variant="outline">
                Quit
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
