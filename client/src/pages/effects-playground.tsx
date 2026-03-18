import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Flame, Snowflake, Sword, Target, Sparkles, 
  Play, Pause, RefreshCw, Zap, Wind, Droplets, 
  Star, Bomb, Sun, Moon, Heart, Skull, ArrowLeft,
  Settings, Eye, Move, Scale3D, Palette,
  Download, Upload, Cloud, Database, Search, Loader2, ExternalLink, CircleDot
} from 'lucide-react';
import { Link } from 'wouter';

type EffectCategory = 'fire' | 'ice' | 'lightning' | 'magic' | 'impact' | 'aura' | 'portal' | 'combat' | 'environment';

const OBJECTSTORE_BASE = 'https://molochdagod.github.io/ObjectStore';
const OBJECTSTORE_REGISTRY_URL = `${OBJECTSTORE_BASE}/api/v1/3dfx-registry.json`;
const OBJECTSTORE_R2_BASE = 'https://objectstore.grudge-studio.com';

interface ObjectStoreEffect {
  id: string;
  name: string;
  category: EffectCategory;
  source: string;
  description: string;
  colors: { primary: string; secondary: string };
  timing: { duration: number; loop: boolean; speed: number };
  shader: string | null;
  particles: Record<string, any>;
  geometry?: Record<string, any>;
  bloom: { strength: number; radius: number; threshold: number };
  light?: { color: string; intensity: number; distance: number };
  uniforms?: Record<string, any>;
  tags: string[];
}

interface ObjectStoreRegistry {
  version: string;
  totalEffects: number;
  categories: Record<string, { name: string; icon: string; color: string; count: number }>;
  shaderFiles: Record<string, { vertex: string; fragment: string }>;
  effects: Record<string, ObjectStoreEffect>;
}

interface EffectPreset {
  id: string;
  name: string;
  category: EffectCategory;
  icon: typeof Flame;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  intensity: number;
  particleCount: number;
  duration: number;
}

const FIRE_VERTEX_SHADER = `
  varying vec2 vUv;
  varying float vTime;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vTime = uTime;
    vec3 pos = position;
    pos.y += sin(uTime * 3.0 + position.x * 5.0) * 0.1;
    pos.x += cos(uTime * 2.0 + position.y * 4.0) * 0.05;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FIRE_FRAGMENT_SHADER = `
  varying vec2 vUv;
  varying float vTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uIntensity;
  
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = p * 2.0;
      a *= 0.5;
    }
    return v;
  }
  
  void main() {
    vec2 uv = vUv;
    uv.y -= vTime * 0.5;
    
    float n = fbm(uv * 4.0 + vTime);
    float flame = 1.0 - vUv.y;
    flame = pow(flame, 1.5);
    flame *= n;
    flame *= smoothstep(0.0, 0.3, vUv.y);
    flame *= smoothstep(1.0, 0.7, abs(vUv.x - 0.5) * 2.0);
    
    vec3 color = mix(uColor2, uColor1, flame);
    float alpha = flame * uIntensity * 2.0;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

const LIGHTNING_VERTEX_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(uTime * 20.0 + position.y * 10.0) * 0.1;
    pos.x += wave * (1.0 - vUv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const LIGHTNING_FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uTime;
  
  void main() {
    float centerDist = abs(vUv.x - 0.5) * 2.0;
    float glow = 1.0 - pow(centerDist, 0.5);
    glow *= 1.0 - vUv.y * 0.3;
    
    float flicker = 0.8 + 0.2 * sin(uTime * 50.0);
    glow *= flicker;
    
    vec3 color = mix(uColor2, uColor1, glow);
    float alpha = glow * 1.5;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

const SHOCKWAVE_VERTEX_SHADER = `
  varying vec2 vUv;
  uniform float uProgress;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    float scale = 1.0 + uProgress * 3.0;
    pos.xz *= scale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const SHOCKWAVE_FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform vec3 uColor1;
  uniform float uProgress;
  
  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    float ring = smoothstep(0.4, 0.5, dist) * smoothstep(0.6, 0.5, dist);
    float alpha = ring * (1.0 - uProgress);
    
    gl_FragColor = vec4(uColor1, alpha);
  }
`;

const MAGIC_VERTEX_SHADER = `
  varying vec2 vUv;
  uniform float uTime;
  
  void main() {
    vUv = uv;
    vec3 pos = position;
    float spiral = sin(uTime * 2.0 + atan(position.x, position.z) * 3.0) * 0.1;
    pos.y += spiral;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const MAGIC_FRAGMENT_SHADER = `
  varying vec2 vUv;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uTime;
  
  void main() {
    vec2 center = vec2(0.5, 0.5);
    float dist = distance(vUv, center);
    
    float angle = atan(vUv.y - 0.5, vUv.x - 0.5);
    float spiral = sin(angle * 5.0 - uTime * 3.0 + dist * 10.0);
    spiral = smoothstep(0.0, 1.0, spiral);
    
    float glow = 1.0 - dist;
    glow = pow(glow, 2.0);
    
    vec3 color = mix(uColor2, uColor1, spiral * glow);
    float alpha = glow * 1.5;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

const EFFECT_PRESETS: EffectPreset[] = [
  {
    id: 'inferno',
    name: 'Inferno Blast',
    category: 'fire',
    icon: Flame,
    description: 'Massive blazing explosion with intense heat',
    primaryColor: '#ff4400',
    secondaryColor: '#ffcc00',
    intensity: 2.0,
    particleCount: 500,
    duration: 2.0,
  },
  {
    id: 'hellfire',
    name: 'Hellfire Vortex',
    category: 'fire',
    icon: Sun,
    description: 'Swirling flames from the underworld',
    primaryColor: '#ff2200',
    secondaryColor: '#880000',
    intensity: 2.5,
    particleCount: 800,
    duration: 3.0,
  },
  {
    id: 'frost_nova',
    name: 'Frost Nova',
    category: 'ice',
    icon: Snowflake,
    description: 'Expanding ring of freezing ice',
    primaryColor: '#00ccff',
    secondaryColor: '#ffffff',
    intensity: 1.8,
    particleCount: 400,
    duration: 1.5,
  },
  {
    id: 'blizzard',
    name: 'Arctic Storm',
    category: 'ice',
    icon: Wind,
    description: 'Howling blizzard with ice shards',
    primaryColor: '#88ddff',
    secondaryColor: '#aaeeff',
    intensity: 1.5,
    particleCount: 1000,
    duration: 4.0,
  },
  {
    id: 'chain_lightning',
    name: 'Chain Lightning',
    category: 'lightning',
    icon: Zap,
    description: 'Branching bolts of electric fury',
    primaryColor: '#ffff00',
    secondaryColor: '#88ccff',
    intensity: 3.0,
    particleCount: 200,
    duration: 0.5,
  },
  {
    id: 'thunderstrike',
    name: 'Thunder Strike',
    category: 'lightning',
    icon: Zap,
    description: 'Devastating bolt from the heavens',
    primaryColor: '#ffffff',
    secondaryColor: '#aaccff',
    intensity: 4.0,
    particleCount: 150,
    duration: 0.3,
  },
  {
    id: 'arcane_burst',
    name: 'Arcane Burst',
    category: 'magic',
    icon: Sparkles,
    description: 'Explosion of pure magical energy',
    primaryColor: '#aa44ff',
    secondaryColor: '#ff44aa',
    intensity: 2.2,
    particleCount: 600,
    duration: 1.8,
  },
  {
    id: 'void_rift',
    name: 'Void Rift',
    category: 'magic',
    icon: Moon,
    description: 'Tear in reality emanating dark power',
    primaryColor: '#6600aa',
    secondaryColor: '#220044',
    intensity: 2.0,
    particleCount: 400,
    duration: 3.0,
  },
  {
    id: 'meteor_impact',
    name: 'Meteor Impact',
    category: 'impact',
    icon: Bomb,
    description: 'Devastating ground-shaking explosion',
    primaryColor: '#ff6600',
    secondaryColor: '#ffaa00',
    intensity: 3.5,
    particleCount: 1000,
    duration: 2.5,
  },
  {
    id: 'shockwave',
    name: 'Shockwave',
    category: 'impact',
    icon: Target,
    description: 'Expanding ring of force',
    primaryColor: '#ffffff',
    secondaryColor: '#aaddff',
    intensity: 2.0,
    particleCount: 300,
    duration: 1.0,
  },
  {
    id: 'holy_aura',
    name: 'Divine Aura',
    category: 'aura',
    icon: Heart,
    description: 'Radiant protective blessing',
    primaryColor: '#ffdd44',
    secondaryColor: '#ffffff',
    intensity: 1.5,
    particleCount: 200,
    duration: 5.0,
  },
  {
    id: 'dark_aura',
    name: 'Shadow Shroud',
    category: 'aura',
    icon: Skull,
    description: 'Menacing dark energy surrounding',
    primaryColor: '#440066',
    secondaryColor: '#000000',
    intensity: 1.8,
    particleCount: 300,
    duration: 5.0,
  },
];

const CATEGORY_INFO: Record<EffectCategory, { name: string; icon: typeof Flame; color: string }> = {
  fire: { name: 'Fire', icon: Flame, color: 'bg-orange-500' },
  ice: { name: 'Ice', icon: Snowflake, color: 'bg-cyan-500' },
  lightning: { name: 'Lightning', icon: Zap, color: 'bg-yellow-400' },
  magic: { name: 'Magic', icon: Sparkles, color: 'bg-purple-500' },
  impact: { name: 'Impact', icon: Bomb, color: 'bg-red-600' },
  aura: { name: 'Aura', icon: Star, color: 'bg-amber-400' },
  portal: { name: 'Portal', icon: CircleDot, color: 'bg-blue-500' },
  combat: { name: 'Combat', icon: Sword, color: 'bg-red-500' },
  environment: { name: 'Environment', icon: Wind, color: 'bg-green-500' },
};

const ICON_MAP: Record<string, typeof Flame> = {
  flame: Flame, snowflake: Snowflake, zap: Zap, sparkles: Sparkles,
  bomb: Bomb, star: Star, circle: CircleDot, sword: Sword, wind: Wind,
  sun: Sun, moon: Moon, heart: Heart, skull: Skull, target: Target,
};

function registryEffectToPreset(effect: ObjectStoreEffect): EffectPreset {
  const catInfo = CATEGORY_INFO[effect.category];
  return {
    id: effect.id,
    name: effect.name,
    category: effect.category,
    icon: catInfo?.icon ?? Sparkles,
    description: effect.description,
    primaryColor: effect.colors.primary,
    secondaryColor: effect.colors.secondary,
    intensity: effect.uniforms?.uIntensity?.value ?? effect.bloom?.strength ?? 1.5,
    particleCount: effect.particles?.count ?? 200,
    duration: effect.timing?.duration ?? 2.0,
  };
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export default function EffectsPlayground() {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const effectsRef = useRef<THREE.Object3D[]>([]);
  const particleSystemsRef = useRef<THREE.Points[]>([]);
  const materialsRef = useRef<THREE.ShaderMaterial[]>([]);

  const [activePreset, setActivePreset] = useState<EffectPreset | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bloomStrength, setBloomStrength] = useState(1.5);
  const [bloomRadius, setBloomRadius] = useState(0.4);
  const [bloomThreshold, setBloomThreshold] = useState(0.2);
  const [particleSize, setParticleSize] = useState(1.0);
  const [effectIntensity, setEffectIntensity] = useState(1.0);
  const [showGrid, setShowGrid] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<EffectCategory | 'all'>('all');
  const [objectStoreRegistry, setObjectStoreRegistry] = useState<ObjectStoreRegistry | null>(null);
  const [objectStorePresets, setObjectStorePresets] = useState<EffectPreset[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [showObjectStore, setShowObjectStore] = useState(false);
  const [objectStoreSearch, setObjectStoreSearch] = useState('');
  const [savingToObjectStore, setSavingToObjectStore] = useState(false);
  
  const [effectScale, setEffectScale] = useState({ x: 1, y: 1, z: 1 });
  const [effectPosition, setEffectPosition] = useState({ x: 0, y: 0, z: 0 });
  const [effectSpread, setEffectSpread] = useState(1.0);
  const [animationSpeed, setAnimationSpeed] = useState(1.0);
  const [primaryColor, setPrimaryColor] = useState('#ff4400');
  const [secondaryColor, setSecondaryColor] = useState('#ffcc00');

  // Fetch ObjectStore 3DFX registry on mount
  useEffect(() => {
    const fetchRegistry = async () => {
      setRegistryLoading(true);
      setRegistryError(null);
      try {
        const res = await fetch(OBJECTSTORE_REGISTRY_URL);
        if (!res.ok) throw new Error(`Registry fetch failed: ${res.status}`);
        const data: ObjectStoreRegistry = await res.json();
        setObjectStoreRegistry(data);
        const presets = Object.values(data.effects).map(registryEffectToPreset);
        setObjectStorePresets(presets);
      } catch (err: any) {
        console.warn('ObjectStore registry unavailable:', err.message);
        setRegistryError(err.message);
      } finally {
        setRegistryLoading(false);
      }
    };
    fetchRegistry();
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebglAvailable(false);
        return;
      }
    } catch {
      setWebglAvailable(false);
      return;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.02);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(5, 4, 8);
    camera.lookAt(0, 1, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(container.clientWidth, container.clientHeight),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloomPass);
    composerRef.current = composer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1, 0);
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.5;
    orbitControlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0x222233, 0.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0x8888ff, 0.3);
    mainLight.position.set(5, 10, 5);
    scene.add(mainLight);

    const gridHelper = new THREE.GridHelper(20, 40, 0x333355, 0x222244);
    gridHelper.name = 'grid';
    scene.add(gridHelper);

    const groundGeometry = new THREE.PlaneGeometry(30, 30);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.9,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const time = clockRef.current.getElapsedTime();

      materialsRef.current.forEach(mat => {
        if (mat.uniforms.uTime) {
          mat.uniforms.uTime.value = time;
        }
        if (mat.uniforms.uProgress) {
          const progress = (time % 2) / 2;
          mat.uniforms.uProgress.value = progress;
        }
      });

      particleSystemsRef.current.forEach(particles => {
        if (particles.userData.update) {
          particles.userData.update(time);
        }
      });

      controls.update();
      composer.render();
    };

    animate();

    const handleResize = () => {
      if (!container || !camera || !renderer || !composer) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      if (renderer) {
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
      effectsRef.current.forEach(e => scene.remove(e));
      particleSystemsRef.current.forEach(p => scene.remove(p));
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const grid = scene.getObjectByName('grid');
    if (grid) grid.visible = showGrid;
  }, [showGrid]);

  useEffect(() => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;
    const bloomPass = composer.passes[1] as UnrealBloomPass;
    if (bloomPass) {
      bloomPass.strength = bloomStrength;
      bloomPass.radius = bloomRadius;
      bloomPass.threshold = bloomThreshold;
    }
  }, [bloomStrength, bloomRadius, bloomThreshold]);

  useEffect(() => {
    effectsRef.current.forEach(obj => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
        obj.scale.set(effectScale.x * effectSpread, effectScale.y, effectScale.z * effectSpread);
        obj.position.x += effectPosition.x * 0.1;
        obj.position.z += effectPosition.z * 0.1;
      }
    });
    particleSystemsRef.current.forEach(particles => {
      particles.scale.set(effectScale.x * effectSpread, effectScale.y, effectScale.z * effectSpread);
    });
  }, [effectScale, effectSpread]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    
    const effectGroup = new THREE.Group();
    effectGroup.position.set(effectPosition.x, effectPosition.y, effectPosition.z);
    
    effectsRef.current.forEach(obj => {
      const baseY = obj.userData.baseY ?? obj.position.y;
      obj.userData.baseY = baseY;
      obj.position.y = baseY + effectPosition.y;
    });
    particleSystemsRef.current.forEach(particles => {
      const baseY = particles.userData.baseY ?? particles.position.y;
      particles.userData.baseY = baseY;
      particles.position.y = baseY + effectPosition.y;
    });
  }, [effectPosition]);

  useEffect(() => {
    const color1 = new THREE.Color(primaryColor);
    const color2 = new THREE.Color(secondaryColor);
    
    materialsRef.current.forEach(mat => {
      if (mat.uniforms.uColor1) {
        mat.uniforms.uColor1.value = color1;
      }
      if (mat.uniforms.uColor2) {
        mat.uniforms.uColor2.value = color2;
      }
    });
    
    particleSystemsRef.current.forEach(particles => {
      const material = particles.material as THREE.PointsMaterial;
      material.color = color1;
    });
  }, [primaryColor, secondaryColor]);

  const clearEffects = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    effectsRef.current.forEach(e => scene.remove(e));
    particleSystemsRef.current.forEach(p => scene.remove(p));
    effectsRef.current = [];
    particleSystemsRef.current = [];
    materialsRef.current = [];
  }, []);

  const createFireEffect = useCallback((preset: EffectPreset) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const geometry = new THREE.PlaneGeometry(2, 3, 32, 32);
    const material = new THREE.ShaderMaterial({
      vertexShader: FIRE_VERTEX_SHADER,
      fragmentShader: FIRE_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(preset.primaryColor) },
        uColor2: { value: new THREE.Color(preset.secondaryColor) },
        uIntensity: { value: preset.intensity * effectIntensity },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialsRef.current.push(material);

    for (let i = 0; i < 6; i++) {
      const flame = new THREE.Mesh(geometry, material.clone());
      const angle = (i / 6) * Math.PI * 2;
      flame.position.set(Math.cos(angle) * 0.5, 1.5, Math.sin(angle) * 0.5);
      flame.rotation.y = -angle + Math.PI / 2;
      scene.add(flame);
      effectsRef.current.push(flame);
      materialsRef.current.push(flame.material as THREE.ShaderMaterial);
    }

    const particleCount = Math.floor(preset.particleCount * effectIntensity);
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const lifetimes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 0.5;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      velocities[i * 3] = (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = 1 + Math.random() * 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      sizes[i] = 0.05 + Math.random() * 0.1;
      lifetimes[i] = Math.random();
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(preset.primaryColor),
      size: 0.15 * particleSize,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.velocities = velocities;
    particles.userData.lifetimes = lifetimes;
    particles.userData.update = (time: number) => {
      const pos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const lt = (time + lifetimes[i]) % 2;
        pos[i * 3 + 1] = lt * velocities[i * 3 + 1];
        pos[i * 3] = Math.cos((time + i) * 0.5) * 0.3 + velocities[i * 3] * lt * 0.5;
        pos[i * 3 + 2] = Math.sin((time + i) * 0.5) * 0.3 + velocities[i * 3 + 2] * lt * 0.5;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    };
    scene.add(particles);
    particleSystemsRef.current.push(particles);
  }, [effectIntensity, particleSize]);

  const createIceEffect = useCallback((preset: EffectPreset) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const shockwaveGeometry = new THREE.RingGeometry(0.5, 2, 64);
    const shockwaveMaterial = new THREE.ShaderMaterial({
      vertexShader: SHOCKWAVE_VERTEX_SHADER,
      fragmentShader: SHOCKWAVE_FRAGMENT_SHADER,
      uniforms: {
        uColor1: { value: new THREE.Color(preset.primaryColor) },
        uProgress: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialsRef.current.push(shockwaveMaterial);

    const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.y = 0.1;
    scene.add(shockwave);
    effectsRef.current.push(shockwave);

    for (let i = 0; i < 12; i++) {
      const height = 0.5 + Math.random() * 1.5;
      const crystalGeometry = new THREE.ConeGeometry(0.1 + Math.random() * 0.1, height, 4);
      const crystalMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(preset.primaryColor),
        emissive: new THREE.Color(preset.secondaryColor),
        emissiveIntensity: 0.5 * effectIntensity,
        transparent: true,
        opacity: 0.7,
        roughness: 0.1,
        metalness: 0.9,
      });

      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      const angle = (i / 12) * Math.PI * 2;
      const radius = 1 + Math.random() * 1.5;
      crystal.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
      crystal.rotation.z = (Math.random() - 0.5) * 0.3;
      scene.add(crystal);
      effectsRef.current.push(crystal);
    }

    const particleCount = Math.floor(preset.particleCount * effectIntensity);
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = 3 + Math.random() * 2;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      velocities[i * 3] = (Math.random() - 0.5) * 0.2;
      velocities[i * 3 + 1] = -0.5 - Math.random() * 1.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(preset.secondaryColor),
      size: 0.08 * particleSize,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.velocities = velocities;
    particles.userData.update = (time: number) => {
      const pos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const phase = (time * 0.5 + i * 0.01) % 1;
        pos[i * 3 + 1] = 5 - phase * 5;
        pos[i * 3] += Math.sin(time + i) * 0.01;
        pos[i * 3 + 2] += Math.cos(time + i) * 0.01;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    };
    scene.add(particles);
    particleSystemsRef.current.push(particles);
  }, [effectIntensity, particleSize]);

  const createLightningEffect = useCallback((preset: EffectPreset) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const boltGeometry = new THREE.PlaneGeometry(0.5, 6, 8, 32);
    const boltMaterial = new THREE.ShaderMaterial({
      vertexShader: LIGHTNING_VERTEX_SHADER,
      fragmentShader: LIGHTNING_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(preset.primaryColor) },
        uColor2: { value: new THREE.Color(preset.secondaryColor) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialsRef.current.push(boltMaterial);

    const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
    bolt.position.y = 3;
    scene.add(bolt);
    effectsRef.current.push(bolt);

    for (let i = 0; i < 3; i++) {
      const branchMaterial = boltMaterial.clone();
      materialsRef.current.push(branchMaterial);
      const branchGeometry = new THREE.PlaneGeometry(0.3, 2, 4, 16);
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      branch.position.set((Math.random() - 0.5) * 1, 2 + Math.random() * 2, (Math.random() - 0.5) * 0.5);
      branch.rotation.z = (Math.random() - 0.5) * 0.8;
      scene.add(branch);
      effectsRef.current.push(branch);
    }

    const impactGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const impactMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(preset.primaryColor),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    impact.position.y = 0.3;
    scene.add(impact);
    effectsRef.current.push(impact);

    const light = new THREE.PointLight(new THREE.Color(preset.primaryColor), 5 * effectIntensity, 10);
    light.position.y = 0.5;
    scene.add(light);
    effectsRef.current.push(light);
  }, [effectIntensity]);

  const createMagicEffect = useCallback((preset: EffectPreset) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const circleGeometry = new THREE.RingGeometry(1.5, 2, 64);
    const circleMaterial = new THREE.ShaderMaterial({
      vertexShader: MAGIC_VERTEX_SHADER,
      fragmentShader: MAGIC_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(preset.primaryColor) },
        uColor2: { value: new THREE.Color(preset.secondaryColor) },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialsRef.current.push(circleMaterial);

    const circle = new THREE.Mesh(circleGeometry, circleMaterial);
    circle.rotation.x = -Math.PI / 2;
    circle.position.y = 0.1;
    scene.add(circle);
    effectsRef.current.push(circle);

    const runeGeometry = new THREE.TorusGeometry(1, 0.05, 8, 6);
    const runeMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(preset.primaryColor),
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < 3; i++) {
      const rune = new THREE.Mesh(runeGeometry, runeMaterial.clone());
      rune.rotation.x = Math.PI / 2;
      rune.position.y = 0.5 + i * 0.8;
      rune.scale.setScalar(0.8 - i * 0.2);
      scene.add(rune);
      effectsRef.current.push(rune);
    }

    const particleCount = Math.floor(preset.particleCount * effectIntensity);
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.5 + Math.random() * 1.5;
      const height = Math.random() * 3;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(preset.primaryColor),
      size: 0.06 * particleSize,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.update = (time: number) => {
      const pos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const angle = time * 0.5 + i * 0.02;
        const radius = 0.5 + (i % 10) * 0.15;
        pos[i * 3] = Math.cos(angle) * radius;
        pos[i * 3 + 2] = Math.sin(angle) * radius;
        pos[i * 3 + 1] = ((time * 0.5 + i * 0.01) % 1) * 3;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    };
    scene.add(particles);
    particleSystemsRef.current.push(particles);

    const light = new THREE.PointLight(new THREE.Color(preset.primaryColor), 2 * effectIntensity, 8);
    light.position.y = 1.5;
    scene.add(light);
    effectsRef.current.push(light);
  }, [effectIntensity, particleSize]);

  const createImpactEffect = useCallback((preset: EffectPreset) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const craterGeometry = new THREE.RingGeometry(0.5, 2.5, 32);
    const craterMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(preset.secondaryColor),
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const crater = new THREE.Mesh(craterGeometry, craterMaterial);
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = 0.05;
    scene.add(crater);
    effectsRef.current.push(crater);

    const fireGeometry = new THREE.PlaneGeometry(3, 4, 16, 16);
    const fireMaterial = new THREE.ShaderMaterial({
      vertexShader: FIRE_VERTEX_SHADER,
      fragmentShader: FIRE_FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color(preset.primaryColor) },
        uColor2: { value: new THREE.Color(preset.secondaryColor) },
        uIntensity: { value: preset.intensity * effectIntensity },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialsRef.current.push(fireMaterial);

    for (let i = 0; i < 8; i++) {
      const fire = new THREE.Mesh(fireGeometry, fireMaterial.clone());
      const angle = (i / 8) * Math.PI * 2;
      fire.position.set(Math.cos(angle) * 0.8, 2, Math.sin(angle) * 0.8);
      fire.rotation.y = -angle + Math.PI / 2;
      scene.add(fire);
      effectsRef.current.push(fire);
      materialsRef.current.push(fire.material as THREE.ShaderMaterial);
    }

    const shockwaveGeometry = new THREE.RingGeometry(1, 4, 64);
    const shockwaveMaterial = new THREE.ShaderMaterial({
      vertexShader: SHOCKWAVE_VERTEX_SHADER,
      fragmentShader: SHOCKWAVE_FRAGMENT_SHADER,
      uniforms: {
        uColor1: { value: new THREE.Color(preset.primaryColor) },
        uProgress: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialsRef.current.push(shockwaveMaterial);

    const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    shockwave.rotation.x = -Math.PI / 2;
    shockwave.position.y = 0.1;
    scene.add(shockwave);
    effectsRef.current.push(shockwave);

    const particleCount = Math.floor(preset.particleCount * effectIntensity);
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      const speed = 1 + Math.random() * 3;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = 1 + Math.random() * 4;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(preset.primaryColor),
      size: 0.12 * particleSize,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.velocities = velocities;
    particles.userData.update = (time: number) => {
      const pos = particles.geometry.attributes.position.array as Float32Array;
      const phase = time % 3;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] = velocities[i * 3] * phase;
        pos[i * 3 + 1] = velocities[i * 3 + 1] * phase - 4.9 * phase * phase;
        pos[i * 3 + 2] = velocities[i * 3 + 2] * phase;
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 0;
      }
      particles.geometry.attributes.position.needsUpdate = true;
    };
    scene.add(particles);
    particleSystemsRef.current.push(particles);

    const light = new THREE.PointLight(new THREE.Color(preset.primaryColor), 8 * effectIntensity, 15);
    light.position.y = 2;
    scene.add(light);
    effectsRef.current.push(light);
  }, [effectIntensity, particleSize]);

  const createAuraEffect = useCallback((preset: EffectPreset) => {
    const scene = sceneRef.current;
    if (!scene) return;

    const sphereGeometry = new THREE.SphereGeometry(1.5, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(preset.primaryColor),
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.y = 1.5;
    scene.add(sphere);
    effectsRef.current.push(sphere);

    const innerSphereGeometry = new THREE.SphereGeometry(1.2, 32, 32);
    const innerSphereMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(preset.secondaryColor),
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const innerSphere = new THREE.Mesh(innerSphereGeometry, innerSphereMaterial);
    innerSphere.position.y = 1.5;
    scene.add(innerSphere);
    effectsRef.current.push(innerSphere);

    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(1.3 + i * 0.2, 0.02, 8, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(preset.primaryColor),
        transparent: true,
        opacity: 0.4 - i * 0.1,
        blending: THREE.AdditiveBlending,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.y = 1.5;
      ring.rotation.x = Math.PI / 2 + i * 0.3;
      scene.add(ring);
      effectsRef.current.push(ring);
    }

    const particleCount = Math.floor(preset.particleCount * effectIntensity);
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = 1.3 + Math.random() * 0.3;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = 1.5 + radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(preset.primaryColor),
      size: 0.04 * particleSize,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    particles.userData.update = (time: number) => {
      particles.rotation.y = time * 0.2;
      particles.rotation.x = Math.sin(time * 0.3) * 0.1;
    };
    scene.add(particles);
    particleSystemsRef.current.push(particles);

    const light = new THREE.PointLight(new THREE.Color(preset.primaryColor), 1.5 * effectIntensity, 6);
    light.position.y = 1.5;
    scene.add(light);
    effectsRef.current.push(light);
  }, [effectIntensity, particleSize]);

  const applyPreset = useCallback((preset: EffectPreset) => {
    clearEffects();
    setActivePreset(preset);
    setIsPlaying(true);
    setPrimaryColor(preset.primaryColor);
    setSecondaryColor(preset.secondaryColor);
    setEffectScale({ x: 1, y: 1, z: 1 });
    setEffectPosition({ x: 0, y: 0, z: 0 });
    setEffectSpread(1.0);

    switch (preset.category) {
      case 'fire':
        createFireEffect(preset);
        break;
      case 'ice':
        createIceEffect(preset);
        break;
      case 'lightning':
        createLightningEffect(preset);
        break;
      case 'magic':
        createMagicEffect(preset);
        break;
      case 'impact':
        createImpactEffect(preset);
        break;
      case 'aura':
        createAuraEffect(preset);
        break;
    }

    toast({ title: 'Effect Applied', description: preset.name });
  }, [clearEffects, createFireEffect, createIceEffect, createLightningEffect, createMagicEffect, createImpactEffect, createAuraEffect, toast]);

  const exportEffectToJSON = useCallback(() => {
    if (!activePreset) return;
    const effectDef = objectStoreRegistry?.effects?.[activePreset.id];
    const exportData = effectDef ?? {
      id: activePreset.id,
      name: activePreset.name,
      category: activePreset.category,
      source: 'gdevelop-effects-playground',
      description: activePreset.description,
      colors: { primary: primaryColor, secondary: secondaryColor },
      timing: { duration: activePreset.duration, loop: true, speed: animationSpeed },
      particles: { count: activePreset.particleCount, size: particleSize * 0.1, opacity: 0.8, blending: 'additive' },
      bloom: { strength: bloomStrength, radius: bloomRadius, threshold: bloomThreshold },
      uniforms: { uIntensity: { value: effectIntensity } },
      tags: [activePreset.category, 'spell'],
    };
    // Apply current editor overrides
    const overridden = {
      ...exportData,
      colors: { primary: primaryColor, secondary: secondaryColor },
      bloom: { strength: bloomStrength, radius: bloomRadius, threshold: bloomThreshold },
      timing: { ...((exportData as any).timing ?? {}), speed: animationSpeed },
    };
    return overridden;
  }, [activePreset, objectStoreRegistry, primaryColor, secondaryColor, bloomStrength, bloomRadius, bloomThreshold, animationSpeed, effectIntensity, particleSize]);

  const handleSaveToObjectStore = useCallback(async () => {
    const data = exportEffectToJSON();
    if (!data) return;
    setSavingToObjectStore(true);
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const key = `3dfx/definitions/${data.id}.json`;
      const res = await fetch(`${OBJECTSTORE_R2_BASE}/${key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: blob,
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      toast({ title: 'Saved to ObjectStore', description: `${data.name} uploaded to 3DFX storage` });
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingToObjectStore(false);
    }
  }, [exportEffectToJSON, toast]);

  const handleDownloadJSON = useCallback(() => {
    const data = exportEffectToJSON();
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.id}.3dfx.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Downloaded', description: `${data.name} exported as JSON` });
  }, [exportEffectToJSON, toast]);

  // Merge local presets with ObjectStore presets (local first, deduped by id)
  const allPresets = (() => {
    const localIds = new Set(EFFECT_PRESETS.map(p => p.id));
    const objectStoreOnly = objectStorePresets.filter(p => !localIds.has(p.id));
    return showObjectStore ? [...EFFECT_PRESETS, ...objectStoreOnly] : EFFECT_PRESETS;
  })();

  const filteredPresets = (() => {
    let presets = selectedCategory === 'all' ? allPresets : allPresets.filter(p => p.category === selectedCategory);
    if (showObjectStore && objectStoreSearch) {
      const q = objectStoreSearch.toLowerCase();
      presets = presets.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return presets;
  })();

  if (!webglAvailable) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30 p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              WebGL Not Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              The Effects Playground requires WebGL support. Please try a different browser or enable hardware acceleration.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Effects Playground
            </h1>
            <p className="text-xs text-muted-foreground">Create stunning visual effects with glow, particles, and shaders</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activePreset && (
            <Badge 
              className="text-white"
              style={{ backgroundColor: activePreset.primaryColor }}
            >
              {activePreset.name}
            </Badge>
          )}
          <Button
            variant={showObjectStore ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowObjectStore(!showObjectStore)}
            data-testid="button-objectstore"
          >
            <Database className="mr-1 h-4 w-4" />
            ObjectStore
            {registryLoading && <Loader2 className="ml-1 h-3 w-3 animate-spin" />}
            {objectStoreRegistry && (
              <Badge variant="secondary" className="ml-1 text-[10px] h-4">
                {objectStoreRegistry.totalEffects}
              </Badge>
            )}
          </Button>
          {activePreset && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToObjectStore}
                disabled={savingToObjectStore}
                data-testid="button-save-objectstore"
              >
                {savingToObjectStore ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
                Save to R2
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadJSON}
                data-testid="button-download"
              >
                <Download className="mr-1 h-4 w-4" />
                Export
              </Button>
            </>
          )}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { clearEffects(); setActivePreset(null); }}
            data-testid="button-clear"
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-72 border-r bg-muted/20 flex flex-col overflow-hidden">
          <div className="p-3 border-b space-y-2">
            {showObjectStore && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/30">
                <Cloud className="h-4 w-4 text-blue-400 flex-shrink-0" />
                <span className="text-xs font-medium text-blue-400">ObjectStore Connected</span>
                {registryError && <span className="text-[10px] text-red-400">({registryError})</span>}
              </div>
            )}
            {showObjectStore && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search effects..."
                  value={objectStoreSearch}
                  onChange={(e) => setObjectStoreSearch(e.target.value)}
                  className="h-8 text-xs pl-7"
                  data-testid="objectstore-search"
                />
              </div>
            )}
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Category</Label>
              <div className="flex flex-wrap gap-1">
                <Button
                  size="sm"
                  variant={selectedCategory === 'all' ? 'default' : 'ghost'}
                  className="h-7 text-xs"
                  onClick={() => setSelectedCategory('all')}
                  data-testid="category-all"
                >
                  All
                </Button>
                {Object.entries(CATEGORY_INFO).map(([key, info]) => {
                  const Icon = info.icon;
                  return (
                    <Button
                      key={key}
                      size="sm"
                      variant={selectedCategory === key ? 'default' : 'ghost'}
                      className="h-7 text-xs"
                      onClick={() => setSelectedCategory(key as EffectCategory)}
                      data-testid={`category-${key}`}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {info.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {filteredPresets.map(preset => {
                const Icon = preset.icon;
                const catInfo = CATEGORY_INFO[preset.category];
                return (
                  <div
                    key={preset.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      activePreset?.id === preset.id 
                        ? 'bg-primary/15 border border-primary/40 shadow-lg' 
                        : 'hover-elevate border border-transparent'
                    }`}
                    onClick={() => applyPreset(preset)}
                    data-testid={`preset-${preset.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ 
                          backgroundColor: preset.primaryColor + '30',
                          boxShadow: activePreset?.id === preset.id 
                            ? `0 0 15px ${preset.primaryColor}80` 
                            : 'none'
                        }}
                      >
                        <Icon 
                          className="h-4 w-4" 
                          style={{ color: preset.primaryColor }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{preset.name}</div>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {catInfo.name}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: preset.primaryColor }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: preset.secondaryColor }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {preset.particleCount} particles
                      </span>
                      {showObjectStore && !EFFECT_PRESETS.find(p => p.id === preset.id) && (
                        <Badge variant="outline" className="text-[9px] h-3 ml-auto text-blue-400 border-blue-400/40">
                          <Cloud className="h-2 w-2 mr-0.5" />
                          R2
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div 
            ref={containerRef} 
            className="flex-1 relative bg-black"
            data-testid="viewport"
          />
          
          <div className="h-14 border-t bg-card flex items-center justify-center gap-4 px-4">
            <Button
              size="icon"
              variant={isPlaying ? 'default' : 'outline'}
              onClick={() => setIsPlaying(!isPlaying)}
              data-testid="button-play"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Switch 
                checked={showGrid} 
                onCheckedChange={setShowGrid}
                data-testid="toggle-grid"
              />
              <span className="text-xs text-muted-foreground">Grid</span>
            </div>

            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <Switch 
                checked={autoRotate} 
                onCheckedChange={setAutoRotate}
                data-testid="toggle-rotate"
              />
              <span className="text-xs text-muted-foreground">Rotate</span>
            </div>
          </div>
        </div>

        <div className="w-72 border-l bg-muted/20 flex flex-col overflow-hidden">
          <Tabs defaultValue="bloom" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-2 mb-0">
              <TabsTrigger value="bloom" className="text-xs" data-testid="tab-bloom">
                <Settings className="h-3 w-3 mr-1" />
                Bloom
              </TabsTrigger>
              <TabsTrigger value="shape" className="text-xs" data-testid="tab-shape">
                <Scale3D className="h-3 w-3 mr-1" />
                Shape
              </TabsTrigger>
              <TabsTrigger value="colors" className="text-xs" data-testid="tab-colors">
                <Palette className="h-3 w-3 mr-1" />
                Colors
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1">
              <TabsContent value="bloom" className="p-3 pt-2 m-0 space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Bloom Strength: {bloomStrength.toFixed(1)}</Label>
                  <Slider
                    value={[bloomStrength]}
                    onValueChange={([v]) => setBloomStrength(v)}
                    min={0}
                    max={3}
                    step={0.1}
                    data-testid="slider-bloom-strength"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Bloom Radius: {bloomRadius.toFixed(1)}</Label>
                  <Slider
                    value={[bloomRadius]}
                    onValueChange={([v]) => setBloomRadius(v)}
                    min={0}
                    max={1}
                    step={0.05}
                    data-testid="slider-bloom-radius"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Threshold: {bloomThreshold.toFixed(1)}</Label>
                  <Slider
                    value={[bloomThreshold]}
                    onValueChange={([v]) => setBloomThreshold(v)}
                    min={0}
                    max={1}
                    step={0.05}
                    data-testid="slider-bloom-threshold"
                  />
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Effect Intensity: {effectIntensity.toFixed(1)}x</Label>
                  <Slider
                    value={[effectIntensity]}
                    onValueChange={([v]) => setEffectIntensity(v)}
                    min={0.1}
                    max={3}
                    step={0.1}
                    data-testid="slider-intensity"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Particle Size: {particleSize.toFixed(1)}x</Label>
                  <Slider
                    value={[particleSize]}
                    onValueChange={([v]) => setParticleSize(v)}
                    min={0.1}
                    max={3}
                    step={0.1}
                    data-testid="slider-particle-size"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Animation Speed: {animationSpeed.toFixed(1)}x</Label>
                  <Slider
                    value={[animationSpeed]}
                    onValueChange={([v]) => setAnimationSpeed(v)}
                    min={0.1}
                    max={3}
                    step={0.1}
                    data-testid="slider-animation-speed"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="shape" className="p-3 pt-2 m-0 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Scale3D className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Scale</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Scale X: {effectScale.x.toFixed(1)}</Label>
                  <Slider
                    value={[effectScale.x]}
                    onValueChange={([v]) => setEffectScale(prev => ({ ...prev, x: v }))}
                    min={0.1}
                    max={3}
                    step={0.1}
                    data-testid="slider-scale-x"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Scale Y: {effectScale.y.toFixed(1)}</Label>
                  <Slider
                    value={[effectScale.y]}
                    onValueChange={([v]) => setEffectScale(prev => ({ ...prev, y: v }))}
                    min={0.1}
                    max={3}
                    step={0.1}
                    data-testid="slider-scale-y"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Scale Z: {effectScale.z.toFixed(1)}</Label>
                  <Slider
                    value={[effectScale.z]}
                    onValueChange={([v]) => setEffectScale(prev => ({ ...prev, z: v }))}
                    min={0.1}
                    max={3}
                    step={0.1}
                    data-testid="slider-scale-z"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Spread: {effectSpread.toFixed(1)}x</Label>
                  <Slider
                    value={[effectSpread]}
                    onValueChange={([v]) => setEffectSpread(v)}
                    min={0.1}
                    max={3}
                    step={0.1}
                    data-testid="slider-spread"
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center gap-2 mb-2">
                  <Move className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Position</span>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Height: {effectPosition.y.toFixed(1)}</Label>
                  <Slider
                    value={[effectPosition.y]}
                    onValueChange={([v]) => setEffectPosition(prev => ({ ...prev, y: v }))}
                    min={-2}
                    max={5}
                    step={0.1}
                    data-testid="slider-pos-y"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Offset X: {effectPosition.x.toFixed(1)}</Label>
                  <Slider
                    value={[effectPosition.x]}
                    onValueChange={([v]) => setEffectPosition(prev => ({ ...prev, x: v }))}
                    min={-3}
                    max={3}
                    step={0.1}
                    data-testid="slider-pos-x"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Offset Z: {effectPosition.z.toFixed(1)}</Label>
                  <Slider
                    value={[effectPosition.z]}
                    onValueChange={([v]) => setEffectPosition(prev => ({ ...prev, z: v }))}
                    min={-3}
                    max={3}
                    step={0.1}
                    data-testid="slider-pos-z"
                  />
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    setEffectScale({ x: 1, y: 1, z: 1 });
                    setEffectPosition({ x: 0, y: 0, z: 0 });
                    setEffectSpread(1.0);
                  }}
                  data-testid="button-reset-shape"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset Shape
                </Button>
              </TabsContent>
              
              <TabsContent value="colors" className="p-3 pt-2 m-0 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">Effect Colors</span>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer"
                      data-testid="input-primary-color"
                    />
                    <Input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 text-xs font-mono"
                      data-testid="input-primary-color-text"
                    />
                  </div>
                </div>
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-12 h-9 p-1 cursor-pointer"
                      data-testid="input-secondary-color"
                    />
                    <Input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 text-xs font-mono"
                      data-testid="input-secondary-color-text"
                    />
                  </div>
                </div>
                
                <Separator />
                
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Color Presets</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { primary: '#ff4400', secondary: '#ffcc00', name: 'Fire' },
                      { primary: '#00ccff', secondary: '#ffffff', name: 'Ice' },
                      { primary: '#ffff00', secondary: '#88ccff', name: 'Lightning' },
                      { primary: '#aa44ff', secondary: '#ff44aa', name: 'Magic' },
                      { primary: '#ff2200', secondary: '#880000', name: 'Dark Fire' },
                      { primary: '#00ff88', secondary: '#004422', name: 'Poison' },
                      { primary: '#ffdd44', secondary: '#ffffff', name: 'Holy' },
                      { primary: '#440066', secondary: '#000000', name: 'Shadow' },
                    ].map((preset, i) => (
                      <button
                        key={i}
                        className="w-full aspect-square rounded-md border hover-elevate"
                        style={{
                          background: `linear-gradient(135deg, ${preset.primary}, ${preset.secondary})`,
                        }}
                        onClick={() => {
                          setPrimaryColor(preset.primary);
                          setSecondaryColor(preset.secondary);
                        }}
                        title={preset.name}
                        data-testid={`color-preset-${i}`}
                      />
                    ))}
                  </div>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => {
                    if (activePreset) {
                      setPrimaryColor(activePreset.primaryColor);
                      setSecondaryColor(activePreset.secondaryColor);
                    }
                  }}
                  disabled={!activePreset}
                  data-testid="button-reset-colors"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reset to Preset Colors
                </Button>
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          {activePreset && (
            <div className="p-3 border-t">
              <div className="flex items-center gap-2 mb-2">
                <div 
                  className="w-5 h-5 rounded-full"
                  style={{ 
                    background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
                    boxShadow: `0 0 8px ${primaryColor}60`
                  }}
                />
                <span className="font-medium text-sm">{activePreset.name}</span>
                <Badge variant="outline" className="text-[10px] ml-auto">
                  {CATEGORY_INFO[activePreset.category]?.name ?? activePreset.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{activePreset.description}</p>
              {objectStoreRegistry?.effects?.[activePreset.id] && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {objectStoreRegistry.effects[activePreset.id].tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[9px] h-4">{tag}</Badge>
                  ))}
                </div>
              )}
              {showObjectStore && activePreset && (
                <div className="mt-2 pt-2 border-t flex flex-col gap-1">
                  <a
                    href={`${OBJECTSTORE_BASE}/3dfx-viewer.html?effect=${activePreset.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Open in 3DFX Viewer
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
