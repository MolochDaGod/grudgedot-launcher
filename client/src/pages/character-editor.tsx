import { useState, useRef, useEffect, useCallback } from "react";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Upload,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  RotateCw,
  Sparkles,
  Loader2,
  Check,
  X,
  Wand2,
  Palette,
  Shield,
  User,
  Crown,
  Hand,
  Footprints,
  Circle,
  Box,
  Settings2,
  Save,
  FolderOpen,
  AlertCircle,
  Cloud,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { grudgeGameApi, type GrudgeCharacter, type GrudgeFaction } from "@/lib/grudgeBackendApi";
import { GrudgeStorageBrowser } from "@/components/grudge-storage-browser";

interface BodyPart {
  id: string;
  name: string;
  displayName: string;
  mesh: THREE.Object3D;
  visible: boolean;
  selected: boolean;
  armorPrompt: string;
  textureStatus: "idle" | "generating" | "complete" | "error";
  textureProgress: number;
  category: BodyPartCategory;
}

type BodyPartCategory = "head" | "torso" | "arms" | "legs" | "accessories";

interface ArmorPreset {
  id: string;
  name: string;
  description: string;
  prompts: Record<string, string>;
}

const BODY_PART_KEYWORDS: Record<string, { displayName: string; category: BodyPartCategory }> = {
  head: { displayName: "Head", category: "head" },
  helmet: { displayName: "Helmet", category: "head" },
  face: { displayName: "Face", category: "head" },
  hair: { displayName: "Hair", category: "head" },
  torso: { displayName: "Torso", category: "torso" },
  chest: { displayName: "Chest", category: "torso" },
  body: { displayName: "Body", category: "torso" },
  spine: { displayName: "Spine", category: "torso" },
  shoulder: { displayName: "Shoulder", category: "torso" },
  arm: { displayName: "Arm", category: "arms" },
  upperarm: { displayName: "Upper Arm", category: "arms" },
  forearm: { displayName: "Forearm", category: "arms" },
  hand: { displayName: "Hand", category: "arms" },
  finger: { displayName: "Fingers", category: "arms" },
  wrist: { displayName: "Wrist", category: "arms" },
  elbow: { displayName: "Elbow", category: "arms" },
  leg: { displayName: "Leg", category: "legs" },
  thigh: { displayName: "Thigh", category: "legs" },
  calf: { displayName: "Calf", category: "legs" },
  shin: { displayName: "Shin", category: "legs" },
  foot: { displayName: "Foot", category: "legs" },
  feet: { displayName: "Feet", category: "legs" },
  toe: { displayName: "Toes", category: "legs" },
  ankle: { displayName: "Ankle", category: "legs" },
  knee: { displayName: "Knee", category: "legs" },
  hip: { displayName: "Hip", category: "legs" },
  cape: { displayName: "Cape", category: "accessories" },
  cloak: { displayName: "Cloak", category: "accessories" },
  belt: { displayName: "Belt", category: "accessories" },
  weapon: { displayName: "Weapon", category: "accessories" },
  shield: { displayName: "Shield", category: "accessories" },
  accessory: { displayName: "Accessory", category: "accessories" },
  pauldron: { displayName: "Pauldron", category: "torso" },
  gauntlet: { displayName: "Gauntlet", category: "arms" },
  greave: { displayName: "Greave", category: "legs" },
  boot: { displayName: "Boot", category: "legs" },
  glove: { displayName: "Glove", category: "arms" },
};

const ARMOR_PRESETS: ArmorPreset[] = [
  {
    id: "knight",
    name: "Medieval Knight",
    description: "Classic plate armor with chainmail",
    prompts: {
      head: "medieval knight helmet with visor, polished steel, battle-worn",
      torso: "plate armor chest piece with engraved cross, steel with gold trim",
      arms: "steel gauntlets with articulated fingers, leather straps",
      legs: "plate greaves and sabatons, steel with leather underlayer",
      accessories: "flowing red cape with golden clasp",
    },
  },
  {
    id: "samurai",
    name: "Samurai Warrior",
    description: "Traditional Japanese armor",
    prompts: {
      head: "kabuto helmet with menpo face guard, lacquered black and red",
      torso: "do chest armor with kusazuri skirt plates, red silk cords",
      arms: "kote arm guards with tekko hand guards, iron and leather",
      legs: "suneate shin guards with kogake foot armor, black lacquer",
      accessories: "sashimono back banner with clan crest",
    },
  },
  {
    id: "scifi",
    name: "Sci-Fi Marine",
    description: "Futuristic power armor",
    prompts: {
      head: "tactical visor helmet with HUD display, matte black carbon fiber",
      torso: "powered exosuit chest plate with glowing reactor core, titanium alloy",
      arms: "mechanical arm augments with energy gauntlets, blue LED accents",
      legs: "hydraulic leg armor with magnetic boots, reinforced joints",
      accessories: "jetpack thruster unit with holographic cape",
    },
  },
  {
    id: "fantasy",
    name: "Dark Fantasy",
    description: "Eldritch corrupted armor",
    prompts: {
      head: "cursed helmet with glowing eyes, obsidian with purple runes",
      torso: "bone-fused chest armor with pulsing veins, dark metal",
      arms: "clawed gauntlets with shadow wisps, corrupted steel",
      legs: "spiked leg guards with ethereal chains, blackened iron",
      accessories: "tattered shadow cloak with skull clasps",
    },
  },
  {
    id: "steampunk",
    name: "Steampunk Engineer",
    description: "Victorian industrial aesthetic",
    prompts: {
      head: "brass goggles with gear mechanisms, leather aviator cap",
      torso: "clockwork chest harness with copper pipes, brown leather",
      arms: "mechanical arm with exposed gears, brass and leather",
      legs: "riveted leg braces with steam vents, iron and leather",
      accessories: "gear-studded belt with pocket watch chain",
    },
  },
];

const CATEGORY_ICONS: Record<BodyPartCategory, typeof Crown> = {
  head: Crown,
  torso: Shield,
  arms: Hand,
  legs: Footprints,
  accessories: Sparkles,
};

function identifyBodyPart(name: string): { displayName: string; category: BodyPartCategory } | null {
  const lowerName = name.toLowerCase();
  for (const [keyword, info] of Object.entries(BODY_PART_KEYWORDS)) {
    if (lowerName.includes(keyword)) {
      return info;
    }
  }
  return null;
}

export default function CharacterEditor() {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [bodyParts, setBodyParts] = useState<BodyPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<BodyPartCategory, boolean>>({
    head: true,
    torso: true,
    arms: true,
    legs: true,
    accessories: true,
  });
  const [globalPrompt, setGlobalPrompt] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [webglError, setWebglError] = useState(false);
  const [storageBrowserOpen, setStorageBrowserOpen] = useState(false);
  const [selectedGrudgeCharId, setSelectedGrudgeCharId] = useState<number | null>(null);

  // Grudge backend characters & factions for the editor
  const { data: grudgeChars = [], refetch: refetchGrudgeChars } = useQuery<GrudgeCharacter[]>({
    queryKey: ['grudge', 'characters'],
    queryFn: () => grudgeGameApi.listCharacters(),
    enabled: isAuthenticated,
  });

  const { data: factions = [] } = useQuery<GrudgeFaction[]>({
    queryKey: ['grudge', 'factions'],
    queryFn: () => grudgeGameApi.listFactions(),
  });

  const initScene = useCallback(() => {
    if (!containerRef.current || rendererRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#0a0a0a");
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(3, 2, 5);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.error("WebGL initialization failed:", error);
      setWebglError(true);
      return;
    }
    
    if (!renderer.getContext()) {
      console.error("WebGL context not available");
      setWebglError(true);
      return;
    }
    
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 20;
    controls.target.set(0, 1, 0);
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xdc2626, 0.3);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);

    const gridHelper = new THREE.GridHelper(10, 20, 0x333333, 0x1a1a1a);
    scene.add(gridHelper);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const cleanup = initScene();
    return cleanup;
  }, [initScene]);

  const extractBodyParts = useCallback((object: THREE.Object3D): BodyPart[] => {
    const parts: BodyPart[] = [];
    let partIndex = 0;

    const traverse = (node: THREE.Object3D, depth = 0) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.SkinnedMesh || node.children.length === 0) {
        const info = identifyBodyPart(node.name);
        const displayName = info?.displayName || node.name || `Part ${partIndex + 1}`;
        const category = info?.category || "accessories";

        parts.push({
          id: `part-${partIndex}`,
          name: node.name || `unnamed-${partIndex}`,
          displayName,
          mesh: node,
          visible: true,
          selected: false,
          armorPrompt: "",
          textureStatus: "idle",
          textureProgress: 0,
          category,
        });
        partIndex++;
      }

      for (const child of node.children) {
        traverse(child, depth + 1);
      }
    };

    traverse(object);
    return parts;
  }, []);

  const loadModel = useCallback((url: string, fileName?: string) => {
    setLoading(true);
    setBodyParts([]);
    setSelectedPartId(null);

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf: GLTF) => {
        if (modelRef.current && sceneRef.current) {
          sceneRef.current.remove(modelRef.current);
        }

        const model = gltf.scene;
        modelRef.current = model;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y = 0;

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        sceneRef.current?.add(model);

        const parts = extractBodyParts(model);
        setBodyParts(parts);
        setModelLoaded(true);
        setLoading(false);

        toast({
          title: "Model Loaded",
          description: `${fileName || 'Character'} ready - ${parts.length} body parts found`,
        });
      },
      undefined,
      (error) => {
        console.error("Error loading model:", error);
        setLoading(false);
        toast({
          title: "Error Loading Model",
          description: "Failed to load the 3D model",
          variant: "destructive",
        });
      }
    );
  }, [extractBodyParts, toast]);

  const createProceduralMannequin = useCallback(() => {
    if (!sceneRef.current) return;
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
    }

    const root = new THREE.Group();
    root.name = "Mannequin";

    const skin = 0xd4a574;
    const cloth = 0x555568;
    const metal = 0x888899;

    const mat = (color: number, m = 0.1, r = 0.7) =>
      new THREE.MeshStandardMaterial({ color, metalness: m, roughness: r, side: THREE.DoubleSide });

    // Head
    const headGroup = new THREE.Group(); headGroup.name = "Head";
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 16), mat(skin));
    headMesh.position.y = 1.65; headMesh.castShadow = true;
    headGroup.add(headMesh);
    root.add(headGroup);

    // Helmet slot (slightly larger invisible sphere)
    const helmetGroup = new THREE.Group(); helmetGroup.name = "Helmet";
    const helmetMesh = new THREE.Mesh(new THREE.SphereGeometry(0.155, 16, 16), mat(metal, 0.6, 0.3));
    helmetMesh.position.y = 1.67; helmetMesh.castShadow = true;
    helmetGroup.add(helmetMesh);
    root.add(helmetGroup);

    // Torso
    const torsoGroup = new THREE.Group(); torsoGroup.name = "Torso";
    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.44, 0.2), mat(cloth));
    torsoMesh.position.y = 1.28; torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);
    root.add(torsoGroup);

    // Chest armor
    const chestGroup = new THREE.Group(); chestGroup.name = "Chest Armor";
    const chestMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.46, 0.22), mat(metal, 0.6, 0.3));
    chestMesh.position.y = 1.28; chestMesh.castShadow = true;
    chestGroup.add(chestMesh);
    root.add(chestGroup);

    // Shoulders
    for (const side of [-1, 1]) {
      const shoulderGroup = new THREE.Group(); shoulderGroup.name = side === -1 ? "Left Shoulder" : "Right Shoulder";
      const shoulderMesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), mat(metal, 0.6, 0.3));
      shoulderMesh.position.set(side * 0.24, 1.46, 0); shoulderMesh.castShadow = true;
      shoulderGroup.add(shoulderMesh);
      root.add(shoulderGroup);
    }

    // Arms
    for (const side of [-1, 1]) {
      const armGroup = new THREE.Group(); armGroup.name = side === -1 ? "Left Arm" : "Right Arm";
      // Upper arm
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.26, 8), mat(skin));
      upper.position.set(side * 0.26, 1.32, 0); upper.castShadow = true;
      armGroup.add(upper);
      // Forearm
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.24, 8), mat(skin));
      fore.position.set(side * 0.26, 1.08, 0); fore.castShadow = true;
      armGroup.add(fore);
      root.add(armGroup);

      // Hand
      const handGroup = new THREE.Group(); handGroup.name = side === -1 ? "Left Hand" : "Right Hand";
      const handMesh = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(skin));
      handMesh.position.set(side * 0.26, 0.94, 0); handMesh.castShadow = true;
      handGroup.add(handMesh);
      root.add(handGroup);

      // Gauntlet
      const gauntletGroup = new THREE.Group(); gauntletGroup.name = side === -1 ? "Left Gauntlet" : "Right Gauntlet";
      const gauntletMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.14, 8), mat(metal, 0.6, 0.3));
      gauntletMesh.position.set(side * 0.26, 1.01, 0); gauntletMesh.castShadow = true;
      gauntletGroup.add(gauntletMesh);
      root.add(gauntletGroup);
    }

    // Hips / Belt
    const beltGroup = new THREE.Group(); beltGroup.name = "Belt";
    const beltMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.2), mat(0x4a3728, 0.1, 0.8));
    beltMesh.position.y = 1.04; beltMesh.castShadow = true;
    beltGroup.add(beltMesh);
    root.add(beltGroup);

    // Legs
    for (const side of [-1, 1]) {
      const legGroup = new THREE.Group(); legGroup.name = side === -1 ? "Left Leg" : "Right Leg";
      // Thigh
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.32, 8), mat(cloth));
      thigh.position.set(side * 0.1, 0.84, 0); thigh.castShadow = true;
      legGroup.add(thigh);
      // Shin
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.045, 0.32, 8), mat(cloth));
      shin.position.set(side * 0.1, 0.52, 0); shin.castShadow = true;
      legGroup.add(shin);
      root.add(legGroup);

      // Greave
      const greaveGroup = new THREE.Group(); greaveGroup.name = side === -1 ? "Left Greave" : "Right Greave";
      const greaveMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.2, 8), mat(metal, 0.6, 0.3));
      greaveMesh.position.set(side * 0.1, 0.55, 0); greaveMesh.castShadow = true;
      greaveGroup.add(greaveMesh);
      root.add(greaveGroup);

      // Boot
      const bootGroup = new THREE.Group(); bootGroup.name = side === -1 ? "Left Boot" : "Right Boot";
      const bootMesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.14), mat(0x3a2a1a, 0.1, 0.8));
      bootMesh.position.set(side * 0.1, 0.34, 0.02); bootMesh.castShadow = true;
      bootGroup.add(bootMesh);
      root.add(bootGroup);
    }

    // Cape
    const capeGroup = new THREE.Group(); capeGroup.name = "Cape";
    const capeShape = new THREE.Shape();
    capeShape.moveTo(-0.16, 0); capeShape.lineTo(0.16, 0);
    capeShape.lineTo(0.2, -0.5); capeShape.lineTo(-0.2, -0.5); capeShape.closePath();
    const capeMesh = new THREE.Mesh(new THREE.ShapeGeometry(capeShape), mat(0x8b1a1a, 0, 0.9));
    capeMesh.position.set(0, 1.48, -0.12); capeMesh.rotation.x = 0.1; capeMesh.castShadow = true;
    capeGroup.add(capeMesh);
    root.add(capeGroup);

    // Weapon (right hand sword)
    const weaponGroup = new THREE.Group(); weaponGroup.name = "Weapon";
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.06), mat(0xccccdd, 0.8, 0.2));
    blade.position.set(0.26, 0.7, 0); blade.castShadow = true;
    weaponGroup.add(blade);
    const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.1, 6), mat(0x4a3728));
    hilt.position.set(0.26, 0.48, 0); hilt.castShadow = true;
    weaponGroup.add(hilt);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.04), mat(0xdaa520, 0.5, 0.3));
    guard.position.set(0.26, 0.5, 0); guard.castShadow = true;
    weaponGroup.add(guard);
    root.add(weaponGroup);

    // Shield (left hand)
    const shieldGroup = new THREE.Group(); shieldGroup.name = "Shield";
    const shieldMesh = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16), mat(metal, 0.6, 0.3));
    shieldMesh.position.set(-0.32, 1.1, 0.08); shieldMesh.castShadow = true;
    shieldGroup.add(shieldMesh);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), mat(0xdaa520, 0.5, 0.3));
    boss.position.set(-0.32, 1.1, 0.1); boss.castShadow = true;
    shieldGroup.add(boss);
    root.add(shieldGroup);

    // Center the model
    root.position.y = -0.9;
    modelRef.current = root;
    sceneRef.current.add(root);

    const parts = extractBodyParts(root);
    setBodyParts(parts);
    setModelLoaded(true);

    toast({
      title: "Default Mannequin Loaded",
      description: `Knight mannequin ready — ${parts.length} body parts. Upload a GLB to replace.`,
    });
  }, [extractBodyParts, toast]);

  useEffect(() => {
    if (sceneRef.current && !modelLoaded && !loading) {
      const timer = setTimeout(() => {
        createProceduralMannequin();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [createProceduralMannequin, modelLoaded, loading]);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setBodyParts([]);
    setSelectedPartId(null);

    try {
      const url = URL.createObjectURL(file);
      const loader = new GLTFLoader();

      loader.load(
        url,
        (gltf: GLTF) => {
          if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current);
          }

          const model = gltf.scene;
          modelRef.current = model;

          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          model.position.y = 0;

          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          sceneRef.current?.add(model);

          const parts = extractBodyParts(model);
          setBodyParts(parts);
          setModelLoaded(true);
          setLoading(false);

          toast({
            title: "Model Loaded",
            description: `Found ${parts.length} body parts ready for customization`,
          });

          URL.revokeObjectURL(url);
        },
        undefined,
        (error) => {
          console.error("Error loading model:", error);
          setLoading(false);
          toast({
            title: "Error Loading Model",
            description: "Failed to load the 3D model. Please try a different file.",
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }, [extractBodyParts, toast]);

  const handleStorageSelect = useCallback(async (asset: { url: string; filename: string }) => {
    setLoading(true);
    setBodyParts([]);
    setSelectedPartId(null);

    try {
      const loader = new GLTFLoader();
      
      loader.load(
        asset.url,
        (gltf: GLTF) => {
          if (modelRef.current && sceneRef.current) {
            sceneRef.current.remove(modelRef.current);
          }

          const model = gltf.scene;
          modelRef.current = model;

          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 2 / maxDim;
          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          model.position.y = 0;

          sceneRef.current?.add(model);

          const parts = extractBodyParts(model);
          setBodyParts(parts);
          setModelLoaded(true);
          setLoading(false);

          toast({
            title: "Model Loaded from Grudge Storage",
            description: `Loaded "${asset.filename}" with ${parts.length} body parts`,
          });
        },
        undefined,
        (error) => {
          console.error("Error loading model from storage:", error);
          setLoading(false);
          toast({
            title: "Error Loading Model",
            description: "Failed to load the model from storage. Please try again.",
            variant: "destructive",
          });
        }
      );
    } catch (error) {
      console.error("Error:", error);
      setLoading(false);
    }
  }, [extractBodyParts, toast]);

  const togglePartVisibility = useCallback((partId: string) => {
    setBodyParts((prev) =>
      prev.map((part) => {
        if (part.id === partId) {
          part.mesh.visible = !part.visible;
          return { ...part, visible: !part.visible };
        }
        return part;
      })
    );
  }, []);

  const selectPart = useCallback((partId: string) => {
    setSelectedPartId(partId);
    setBodyParts((prev) =>
      prev.map((part) => {
        const isSelected = part.id === partId;
        if (part.mesh instanceof THREE.Mesh) {
          if (isSelected) {
            const material = part.mesh.material as THREE.MeshStandardMaterial;
            if (material.emissive) {
              material.emissive.setHex(0xdc2626);
              material.emissiveIntensity = 0.3;
            }
          } else {
            const material = part.mesh.material as THREE.MeshStandardMaterial;
            if (material.emissive) {
              material.emissive.setHex(0x000000);
              material.emissiveIntensity = 0;
            }
          }
        }
        return { ...part, selected: isSelected };
      })
    );
  }, []);

  const updatePartPrompt = useCallback((partId: string, prompt: string) => {
    setBodyParts((prev) =>
      prev.map((part) =>
        part.id === partId ? { ...part, armorPrompt: prompt } : part
      )
    );
  }, []);

  const applyPreset = useCallback((presetId: string) => {
    const preset = ARMOR_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setSelectedPreset(presetId);
    setBodyParts((prev) =>
      prev.map((part) => ({
        ...part,
        armorPrompt: preset.prompts[part.category] || "",
      }))
    );

    toast({
      title: "Preset Applied",
      description: `Applied "${preset.name}" armor style to all parts`,
    });
  }, [toast]);

  const applyGlobalPrompt = useCallback(() => {
    if (!globalPrompt.trim()) return;

    setBodyParts((prev) =>
      prev.map((part) => ({
        ...part,
        armorPrompt: `${globalPrompt} - ${part.displayName.toLowerCase()}`,
      }))
    );

    toast({
      title: "Global Prompt Applied",
      description: "Applied prompt to all body parts",
    });
  }, [globalPrompt, toast]);

  const parsePromptToMaterial = useCallback((prompt: string, category: BodyPartCategory): THREE.MeshStandardMaterial => {
    const lowerPrompt = prompt.toLowerCase();
    
    const colorKeywords: Record<string, number> = {
      gold: 0xffd700, golden: 0xffd700,
      silver: 0xc0c0c0, steel: 0x708090,
      bronze: 0xcd7f32, copper: 0xb87333,
      iron: 0x434343, black: 0x1a1a1a,
      white: 0xffffff, red: 0xdc2626,
      blue: 0x2563eb, green: 0x16a34a,
      purple: 0x9333ea, obsidian: 0x1e1e2e,
      brass: 0xb5a642, leather: 0x8b4513,
      brown: 0x8b4513, dark: 0x2d2d2d,
    };
    
    let baseColor = 0x666666;
    let metalness = 0.3;
    let roughness = 0.6;
    let emissive = 0x000000;
    let emissiveIntensity = 0;
    
    for (const [keyword, color] of Object.entries(colorKeywords)) {
      if (lowerPrompt.includes(keyword)) {
        baseColor = color;
        break;
      }
    }
    
    if (lowerPrompt.includes('metal') || lowerPrompt.includes('steel') || 
        lowerPrompt.includes('iron') || lowerPrompt.includes('plate') ||
        lowerPrompt.includes('armor') || lowerPrompt.includes('polished')) {
      metalness = 0.8;
      roughness = 0.2;
    }
    
    if (lowerPrompt.includes('leather') || lowerPrompt.includes('cloth') || 
        lowerPrompt.includes('fabric') || lowerPrompt.includes('silk')) {
      metalness = 0.0;
      roughness = 0.9;
    }
    
    if (lowerPrompt.includes('glow') || lowerPrompt.includes('rune') || 
        lowerPrompt.includes('magic') || lowerPrompt.includes('energy') ||
        lowerPrompt.includes('reactor') || lowerPrompt.includes('led')) {
      emissive = lowerPrompt.includes('purple') ? 0x9333ea : 
                 lowerPrompt.includes('blue') ? 0x3b82f6 :
                 lowerPrompt.includes('red') ? 0xef4444 :
                 lowerPrompt.includes('green') ? 0x22c55e : 0x8b5cf6;
      emissiveIntensity = 0.5;
    }
    
    const categoryColors: Record<BodyPartCategory, number> = {
      head: 0x808080,
      torso: 0x606060,
      arms: 0x707070,
      legs: 0x505050,
      accessories: 0x909090,
    };
    
    if (baseColor === 0x666666) {
      baseColor = categoryColors[category];
    }
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      metalness,
      roughness,
      emissive,
      emissiveIntensity,
      side: THREE.DoubleSide,
    });
  }, []);

  const applyMaterialToMesh = useCallback((mesh: THREE.Object3D, material: THREE.Material) => {
    mesh.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.SkinnedMesh) {
        if (Array.isArray(child.material)) {
          child.material = child.material.map(() => material.clone());
        } else {
          child.material = material.clone();
        }
        child.material.needsUpdate = true;
      }
    });
  }, []);

  const generateTextures = useCallback(async () => {
    const partsWithPrompts = bodyParts.filter((p) => p.armorPrompt.trim());
    if (partsWithPrompts.length === 0) {
      toast({
        title: "No Prompts Set",
        description: "Please add armor prompts to at least one body part",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    setBodyParts((prev) =>
      prev.map((part) =>
        part.armorPrompt.trim()
          ? { ...part, textureStatus: "generating" as const, textureProgress: 0 }
          : part
      )
    );

    for (const part of partsWithPrompts) {
      await new Promise((resolve) => setTimeout(resolve, 300));

      for (let progress = 0; progress <= 80; progress += 20) {
        setBodyParts((prev) =>
          prev.map((p) =>
            p.id === part.id ? { ...p, textureProgress: progress } : p
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const material = parsePromptToMaterial(part.armorPrompt, part.category);
      applyMaterialToMesh(part.mesh, material);

      setBodyParts((prev) =>
        prev.map((p) =>
          p.id === part.id
            ? { ...p, textureStatus: "complete" as const, textureProgress: 100 }
            : p
        )
      );
    }

    setIsGenerating(false);
    toast({
      title: "Materials Applied",
      description: `Successfully applied materials to ${partsWithPrompts.length} body parts. Check the 3D view!`,
    });
  }, [bodyParts, toast, parsePromptToMaterial, applyMaterialToMesh]);

  const exportModel = useCallback(async () => {
    if (!modelRef.current) {
      toast({
        title: "No Model",
        description: "Please load a model first",
        variant: "destructive",
      });
      return;
    }

    const exporter = new GLTFExporter();
    exporter.parse(
      modelRef.current,
      (result) => {
        const output = JSON.stringify(result, null, 2);
        const blob = new Blob([output], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "armored-character.gltf";
        link.click();
        URL.revokeObjectURL(url);

        toast({
          title: "Model Exported",
          description: "Character saved as armored-character.gltf",
        });
      },
      (error) => {
        console.error("Export error:", error);
        toast({
          title: "Export Failed",
          description: "Failed to export the model",
          variant: "destructive",
        });
      },
      { binary: false }
    );
  }, [toast]);

  const resetCamera = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(3, 2, 5);
      controlsRef.current.target.set(0, 1, 0);
      controlsRef.current.update();
    }
  }, []);

  const groupedParts = bodyParts.reduce<Record<BodyPartCategory, BodyPart[]>>(
    (acc, part) => {
      acc[part.category].push(part);
      return acc;
    },
    { head: [], torso: [], arms: [], legs: [], accessories: [] }
  );

  const selectedPart = bodyParts.find((p) => p.id === selectedPartId);

  return (
    <div className="flex h-full bg-black text-white" data-testid="character-editor">
      <div className="w-72 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-lg font-bold uppercase tracking-wide mb-4" style={{ fontFamily: "Bebas Neue, sans-serif" }} data-testid="text-body-parts-heading">
            Body Parts
          </h2>
          <div className="space-y-2">
            <Label htmlFor="model-upload" className="cursor-pointer" data-testid="label-upload-model">
              <div className="flex items-center justify-center gap-2 p-3 border border-dashed border-gray-600 rounded-lg hover:border-red-600 hover:bg-gray-900/50 transition-colors" data-testid="dropzone-model">
                <Upload className="h-4 w-4" />
                <span className="text-sm">Upload GLB Model</span>
              </div>
              <input
                id="model-upload"
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={handleFileUpload}
                data-testid="input-model-upload"
              />
            </Label>
            <Button
              variant="outline"
              className="w-full border-red-600/50 hover:bg-red-600/10 hover:border-red-600"
              onClick={() => setStorageBrowserOpen(true)}
              data-testid="button-upload-from-grudge"
            >
              <Cloud className="h-4 w-4 mr-2 text-red-600" />
              <span className="text-sm">Upload from Grudge</span>
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {loading && (
              <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
                <Loader2 className="h-6 w-6 animate-spin text-red-600" />
              </div>
            )}

            {!loading && bodyParts.length === 0 && (
              <div className="text-center py-8 text-gray-500" data-testid="empty-state">
                <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Upload a model to see body parts</p>
              </div>
            )}

            {Object.entries(groupedParts).map(([category, parts]) => {
              if (parts.length === 0) return null;
              const CategoryIcon = CATEGORY_ICONS[category as BodyPartCategory];

              return (
                <Collapsible
                  key={category}
                  open={expandedCategories[category as BodyPartCategory]}
                  onOpenChange={(open) =>
                    setExpandedCategories((prev) => ({ ...prev, [category]: open }))
                  }
                >
                  <CollapsibleTrigger 
                    className="flex items-center justify-between w-full p-2 hover:bg-gray-900 rounded-lg transition-colors"
                    data-testid={`category-toggle-${category}`}
                  >
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4 text-red-600" />
                      <span className="text-sm font-medium capitalize" data-testid={`text-category-${category}`}>{category}</span>
                      <Badge variant="secondary" className="text-xs" data-testid={`badge-category-count-${category}`}>
                        {parts.length}
                      </Badge>
                    </div>
                    {expandedCategories[category as BodyPartCategory] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-6 space-y-1 mt-1">
                    {parts.map((part) => (
                      <div
                        key={part.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                          part.selected
                            ? "bg-red-600/20 border-l-2 border-red-600"
                            : "hover:bg-gray-900"
                        }`}
                        onClick={() => selectPart(part.id)}
                        data-testid={`part-item-${part.id}`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Circle
                            className={`h-2 w-2 flex-shrink-0 ${
                              part.textureStatus === "complete"
                                ? "text-green-500 fill-green-500"
                                : part.textureStatus === "generating"
                                ? "text-yellow-500 fill-yellow-500"
                                : part.armorPrompt
                                ? "text-red-500 fill-red-500"
                                : "text-gray-600"
                            }`}
                            data-testid={`status-indicator-${part.id}`}
                          />
                          <span className="text-sm truncate" data-testid={`text-part-name-${part.id}`}>{part.displayName}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePartVisibility(part.id);
                          }}
                          className="p-1 hover:bg-gray-800 rounded"
                          data-testid={`toggle-visibility-${part.id}`}
                        >
                          {part.visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={resetCamera} data-testid="button-reset-camera">
              <RotateCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {/* Backend character picker */}
            {grudgeChars.length > 0 && (
              <select
                className="h-8 text-xs bg-gray-800 border border-gray-700 rounded px-2 text-white"
                value={selectedGrudgeCharId ?? ''}
                onChange={(e) => setSelectedGrudgeCharId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Select Grudge Char</option>
                {grudgeChars.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.name} (Lv {ch.level} {ch.class})</option>
                ))}
              </select>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!selectedGrudgeCharId) { toast({ title: 'Select a character first', variant: 'destructive' }); return; }
                const inv = await grudgeGameApi.listInventory(selectedGrudgeCharId);
                const profs = await grudgeGameApi.getProfessions(selectedGrudgeCharId);
                toast({ title: 'Inventory Loaded', description: `${inv.length} items, ${profs.length} professions` });
              }}
              disabled={!selectedGrudgeCharId}
              data-testid="button-load-inventory"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Load Inventory
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportModel}
              disabled={!modelLoaded}
              data-testid="button-export"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {webglError ? (
          <div className="flex-1 bg-[#0a0a0a] flex items-center justify-center" data-testid="webgl-error">
            <div className="text-center p-8">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">WebGL Not Available</h3>
              <p className="text-gray-400 text-sm max-w-sm">
                Your browser doesn't support WebGL or it's disabled. 
                Please try using a modern browser with hardware acceleration enabled.
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="flex-1 bg-[#0a0a0a]"
            data-testid="viewport-canvas"
          />
        )}
      </div>

      <div className="w-80 border-l border-gray-800 flex flex-col">
        <Tabs defaultValue="armor" className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-2 m-4" data-testid="tabs-list-main">
            <TabsTrigger value="armor" data-testid="tab-armor">
              <Shield className="h-4 w-4 mr-2" />
              Armor
            </TabsTrigger>
            <TabsTrigger value="presets" data-testid="tab-presets">
              <Palette className="h-4 w-4 mr-2" />
              Presets
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <TabsContent value="armor" className="p-4 pt-0 space-y-4 mt-0">
              <Card className="bg-gray-900 border-gray-800" data-testid="card-global-prompt">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2" data-testid="text-global-prompt-title">
                    <Wand2 className="h-4 w-4 text-red-600" />
                    Global Prompt
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    placeholder="e.g., Dark fantasy armor with glowing runes..."
                    value={globalPrompt}
                    onChange={(e) => setGlobalPrompt(e.target.value)}
                    className="min-h-[80px] bg-gray-800 border-gray-700"
                    data-testid="input-global-prompt"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={applyGlobalPrompt}
                    disabled={!globalPrompt.trim()}
                    data-testid="button-apply-global"
                  >
                    Apply to All Parts
                  </Button>
                </CardContent>
              </Card>

              {selectedPart && (
                <Card className="bg-gray-900 border-gray-800 border-red-600/30" data-testid="card-selected-part">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2" data-testid="text-selected-part-title">
                      <Settings2 className="h-4 w-4 text-red-600" />
                      {selectedPart.displayName}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-400 mb-2 block" data-testid="label-armor-prompt">Armor Prompt</Label>
                      <Textarea
                        placeholder={`Describe armor for ${selectedPart.displayName.toLowerCase()}...`}
                        value={selectedPart.armorPrompt}
                        onChange={(e) => updatePartPrompt(selectedPart.id, e.target.value)}
                        className="min-h-[100px] bg-gray-800 border-gray-700"
                        data-testid="input-part-prompt"
                      />
                    </div>

                    {selectedPart.textureStatus === "generating" && (
                      <div className="space-y-2" data-testid="status-generating">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Generating texture...</span>
                          <span className="text-red-600" data-testid="text-progress-percent">{selectedPart.textureProgress}%</span>
                        </div>
                        <Progress value={selectedPart.textureProgress} className="h-1" data-testid="progress-texture" />
                      </div>
                    )}

                    {selectedPart.textureStatus === "complete" && (
                      <div className="flex items-center gap-2 text-green-500 text-sm" data-testid="status-complete">
                        <Check className="h-4 w-4" />
                        Texture generated
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Separator className="bg-gray-800" data-testid="separator-actions" />

              <Button
                className="w-full bg-red-600 hover:bg-red-700"
                onClick={generateTextures}
                disabled={isGenerating || !modelLoaded}
                data-testid="button-generate-textures"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate All Textures
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="presets" className="p-4 pt-0 space-y-3 mt-0">
              {ARMOR_PRESETS.map((preset) => (
                <Card
                  key={preset.id}
                  className={`bg-gray-900 border-gray-800 cursor-pointer transition-colors hover:border-red-600/50 ${
                    selectedPreset === preset.id ? "border-red-600" : ""
                  }`}
                  onClick={() => applyPreset(preset.id)}
                  data-testid={`preset-${preset.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium" data-testid={`text-preset-name-${preset.id}`}>{preset.name}</h3>
                      {selectedPreset === preset.id && (
                        <Check className="h-4 w-4 text-red-600" data-testid={`icon-preset-check-${preset.id}`} />
                      )}
                    </div>
                    <p className="text-xs text-gray-400" data-testid={`text-preset-desc-${preset.id}`}>{preset.description}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>

      <GrudgeStorageBrowser
        open={storageBrowserOpen}
        onOpenChange={setStorageBrowserOpen}
        onSelect={handleStorageSelect}
        fileTypes={[".glb", ".gltf"]}
        title="Select Model from Grudge Storage"
      />
    </div>
  );
}
