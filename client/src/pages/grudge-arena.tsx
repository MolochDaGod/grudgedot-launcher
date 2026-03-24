import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Button } from '@/components/ui/button';
import { 
  Sword, 
  Shield, 
  ArrowLeft, 
  Play, 
  RotateCcw,
  Flame,
  Skull,
  Zap,
  Crown,
  Crosshair,
  Package,
  Settings,
  X,
  Swords,
  Axe,
  Wand2,
  Target,
  Wind,
} from 'lucide-react';
import { Link } from 'wouter';

// ── Grudge Engine (ported from Online-Multiplayer-Game) ───────────────────
import {
  // ECS
  World,
  Entity as ECSEntity,
  Components,
  // Weapons
  WEAPON_DEFINITIONS,
  WEAPON_TYPES,
  ABILITY_KEYS,
  getWeapon,
  type WeaponType,
  type AbilityKey,
  // Races
  RACES,
  RACE_IDS,
  type RaceId,
  // Character
  CharacterSystem,
  type CharacterData,
  // Camera
  ChaseCamera,
  // Collision
  CollisionSystem as GrudgeCollisionSystem,
  CollisionLayer as GrudgeCollisionLayer,
  // Shaders
  createShaderMaterial,
  updateShaderTime,
  // Animation
  ANIMATION_CATALOG,
  EMOTE_BINDINGS,
  ABILITY_BINDINGS,
  CONTROLLER_DEADZONE,
  CONTROLLER_MAPPINGS,
  getAnimationsByCategory,
  resolveAnimationPath,
  // Dev Inspector & MMO UI
  DevInspector,
  UnitFrame,
  CombatLog,
  type CombatLogEntry,
  ArenaRatingDisplay,
  // Elo Rating
  loadArenaStats,
  processMatchResult,
  simulateQueueSearch,
  getRank,
  type ArenaStats,
  type QueuedOpponent,
} from '@/lib/grudge-engine';

// Legacy game-effects (kept for backward compat — will be migrated)
import { ParticleManager, ParticleEffectPresets } from '@/lib/game-effects/ParticleSystem';
import { SpellEffectsManager } from '@/lib/game-effects/SpellEffects';
import { CollisionSystem, Collider, CollisionLayer, CollisionEntity } from '@/lib/game-effects/CollisionSystem';

// ── Weapon UI types (maps engine weapon defs to React UI) ─────────────────
interface Weapon {
  id: string;
  name: string;
  damage: number;
  attackSpeed: number;
  icon: typeof Sword;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  equipped?: boolean;
}

interface InventoryItem {
  id: string;
  weapon: Weapon;
  quantity: number;
}

// Map Grudge Engine weapon definitions to UI weapon objects
const WEAPON_ICON_MAP: Record<WeaponType, typeof Sword> = {
  greatsword: Sword,
  bow: Target,
  sabres: Swords,
  scythe: Wand2,
  runeblade: Sword,
};

const WEAPON_RARITY_MAP: Record<WeaponType, Weapon['rarity']> = {
  greatsword: 'legendary',
  bow: 'rare',
  sabres: 'epic',
  scythe: 'rare',
  runeblade: 'epic',
};

const WEAPONS: Weapon[] = WEAPON_TYPES.map((type) => {
  const def = getWeapon(type);
  return {
    id: type,
    name: def.name,
    damage: def.baseAttackDamage,
    attackSpeed: def.attackSpeed,
    icon: WEAPON_ICON_MAP[type],
    rarity: WEAPON_RARITY_MAP[type],
  };
});

const RARITY_COLORS: Record<string, string> = {
  common: 'border-stone-500 bg-stone-800/50',
  uncommon: 'border-green-500 bg-green-900/30',
  rare: 'border-blue-500 bg-blue-900/30',
  epic: 'border-purple-500 bg-purple-900/30',
  legendary: 'border-amber-500 bg-amber-900/30',
};

const RARITY_TEXT: Record<string, string> = {
  common: 'text-stone-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  epic: 'text-purple-400',
  legendary: 'text-amber-400',
};

interface CombatStats {
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  attackPower: number;
  defense: number;
  speed: number;
}

type Direction8 = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'IDLE';

interface AnimationSet {
  idle?: THREE.AnimationAction;
  walk?: Map<Direction8, THREE.AnimationAction>;
  run?: Map<Direction8, THREE.AnimationAction>;
  attack?: THREE.AnimationAction;
  spell?: THREE.AnimationAction;
  hit?: THREE.AnimationAction;
  death?: THREE.AnimationAction;
}

interface Entity {
  id: string;
  mesh: THREE.Group;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  rotation: THREE.Euler;
  stats: CombatStats;
  isPlayer: boolean;
  attackCooldown: number;
  state: 'idle' | 'moving' | 'attacking' | 'hit' | 'dead';
  direction: Direction8;
  mixer?: THREE.AnimationMixer;
  animations?: AnimationSet;
  currentAnimation?: string;
  entityType: 'player' | 'skeletonWarrior' | 'skeletonMage' | 'skeletonMinion' | 'skeletonRogue';
}

type GameState = 'menu' | 'loading' | 'playing' | 'paused' | 'victory' | 'defeat';

// ── Race-based model paths (from Grudge Engine race-config) ───────────────
// Models are served via Grudge backend /public-objects/characters/ endpoint
const MODEL_PATHS = {
  player: RACES.human.modelUrl,
  skeletonWarrior: RACES.barbarian.modelUrl,
  skeletonMage: RACES.elf.modelUrl,
  skeletonMinion: RACES.dwarf.modelUrl,
  skeletonRogue: RACES.orc.modelUrl,
};

// ── Animation paths (from Grudge Engine animation-library) ────────────────
const ANIM_BASE = '/public-objects/animations';
const ANIMATION_PATHS = {
  idle: `${ANIM_BASE}/Idle.glb`,
  kick: `${ANIM_BASE}/Kick.glb`,
  spell: `${ANIM_BASE}/Standing_2H_Cast_Spell_01.glb`,
  dualCombo: `${ANIM_BASE}/Northern_Soul_Spin_Combo.glb`,
  clubCombo: `${ANIM_BASE}/Two_Hand_Club_Combo.glb`,
  combatMelee: `${ANIM_BASE}/Kick.glb`,
  movementBasic: `${ANIM_BASE}/Swagger_Walk.glb`,
  general: `${ANIM_BASE}/Idle.glb`,
};

const DIRECTION_ANGLES: Record<Direction8, number> = {
  'N': 0,
  'NE': Math.PI / 4,
  'E': Math.PI / 2,
  'SE': (3 * Math.PI) / 4,
  'S': Math.PI,
  'SW': (-3 * Math.PI) / 4,
  'W': -Math.PI / 2,
  'NW': -Math.PI / 4,
  'IDLE': 0,
};

function getDirection8FromVector(x: number, z: number): Direction8 {
  if (x === 0 && z === 0) return 'IDLE';
  
  const angle = Math.atan2(x, -z);
  const normalized = ((angle + Math.PI) / (Math.PI * 2)) * 8;
  const index = Math.round(normalized) % 8;
  
  const directions: Direction8[] = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
  return directions[index];
}

function getDirection8FromAngle(angle: number): Direction8 {
  const normalized = ((angle + Math.PI) / (Math.PI * 2)) * 8;
  const index = Math.round(normalized) % 8;
  const directions: Direction8[] = ['S', 'SW', 'W', 'NW', 'N', 'NE', 'E', 'SE'];
  return directions[index];
}

const HealthOrb = ({ current, max, type }: { current: number; max: number; type: 'health' | 'mana' }) => {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const isHealth = type === 'health';
  
  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
        <defs>
          <linearGradient id={`${type}-gradient`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={isHealth ? '#7f1d1d' : '#1e3a8a'} />
            <stop offset="50%" stopColor={isHealth ? '#dc2626' : '#3b82f6'} />
            <stop offset="100%" stopColor={isHealth ? '#fca5a5' : '#93c5fd'} />
          </linearGradient>
          <clipPath id={`${type}-clip`}>
            <rect x="10" y={100 - percentage * 0.8 - 10} width="80" height={percentage * 0.8} />
          </clipPath>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="50" cy="50" r="45" fill="#0a0a0a" stroke="#2a2a2a" strokeWidth="3"/>
        <circle cx="50" cy="50" r="42" fill="#1a1a1a"/>
        <circle 
          cx="50" 
          cy="50" 
          r="38" 
          fill={`url(#${type}-gradient)`} 
          clipPath={`url(#${type}-clip)`}
          filter="url(#glow)"
        />
        <circle cx="50" cy="50" r="45" fill="none" stroke="#4a4a4a" strokeWidth="1"/>
        <ellipse cx="50" cy="25" rx="20" ry="8" fill="rgba(255,255,255,0.1)"/>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {isHealth ? (
          <Skull className="w-6 h-6 text-red-200 drop-shadow-lg" />
        ) : (
          <Zap className="w-6 h-6 text-blue-200 drop-shadow-lg" />
        )}
        <span className="text-xs font-bold text-white drop-shadow-lg mt-1" data-testid={`text-${type}`}>
          {Math.floor(current)}
        </span>
      </div>
    </div>
  );
};

const SkillButton = ({ 
  icon: Icon, 
  hotkey, 
  cooldown, 
  manaCost,
  onClick,
  disabled 
}: { 
  icon: typeof Sword; 
  hotkey: string; 
  cooldown?: number;
  manaCost?: number;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`relative w-16 h-16 bg-gradient-to-b from-stone-700 to-stone-900 border-2 border-stone-600 rounded-lg 
      hover:border-amber-500 hover:from-stone-600 hover:to-stone-800 transition-all duration-150
      disabled:opacity-50 disabled:cursor-not-allowed
      shadow-lg shadow-black/50`}
    data-testid={`skill-${hotkey.toLowerCase()}`}
  >
    <Icon className="w-8 h-8 mx-auto text-amber-100" />
    {cooldown && cooldown > 0 && (
      <div className="absolute inset-0 bg-black/70 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold">{cooldown.toFixed(1)}</span>
      </div>
    )}
    <span className="absolute bottom-0.5 right-1 text-xs text-stone-400 font-bold">{hotkey}</span>
    {manaCost && (
      <span className="absolute top-0.5 right-1 text-xs text-blue-400">{manaCost}</span>
    )}
  </button>
);

export default function GrudgeArena() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerRef = useRef<Entity | null>(null);
  const enemiesRef = useRef<Entity[]>([]);
  const particleSystemRef = useRef<ParticleManager | null>(null);
  const spellManagerRef = useRef<SpellEffectsManager | null>(null);
  const collisionSystemRef = useRef<CollisionSystem | null>(null);
  const animationFrameRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const loaderRef = useRef<GLTFLoader>(new GLTFLoader());
  const loadedModelsRef = useRef<Map<string, THREE.Group>>(new Map());
  const loadedAnimationsRef = useRef<Map<string, THREE.AnimationClip[]>>(new Map());
  const mouseTargetRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const targetIndicatorRef = useRef<THREE.Mesh | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const groundPlaneRef = useRef<THREE.Mesh | null>(null);
  const playerSpotlightRef = useRef<THREE.SpotLight | null>(null);
  
  const [gameState, setGameState] = useState<GameState>('menu');
  const [playerHealth, setPlayerHealth] = useState(100);
  const [playerMana, setPlayerMana] = useState(100);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [enemiesRemaining, setEnemiesRemaining] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('Initializing...');
  const [attackCooldown, setAttackCooldown] = useState(0);
  const [playerDirection, setPlayerDirection] = useState<Direction8>('S');
  
  // MMO UI State
  const [showInventory, setShowInventory] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [equippedWeapon, setEquippedWeapon] = useState<Weapon>(WEAPONS[0]);
  const [inventory, setInventory] = useState<InventoryItem[]>(() => 
    WEAPONS.map((w, i) => ({ id: `inv-${i}`, weapon: w, quantity: 1 }))
  );
  const [isJumping, setIsJumping] = useState(false);
  const [skillCooldowns, setSkillCooldowns] = useState<number[]>([0, 0, 0, 0, 0]);
  
  // Dev Inspector state (toggle with backtick `)
  const [showDevInspector, setShowDevInspector] = useState(false);
  
  // Arena Elo rating stats
  const [arenaStats, setArenaStats] = useState<ArenaStats>(() => loadArenaStats());
  
  // Combat log entries for MMO UI
  const [combatLogEntries, setCombatLogEntries] = useState<CombatLogEntry[]>([]);
  const combatLogIdRef = useRef(0);
  
  /** Add a combat log entry. */
  const addCombatLog = useCallback((text: string, type: CombatLogEntry['type'] = 'info') => {
    setCombatLogEntries(prev => [
      ...prev.slice(-49),
      { id: `log-${combatLogIdRef.current++}`, text, type, timestamp: Date.now() },
    ]);
  }, []);
  
  // Jump physics refs
  const verticalVelocityRef = useRef(0);
  const playerYRef = useRef(0);
  const GRAVITY = 25;
  const JUMP_FORCE = 10;
  
  const keysPressed = useRef<Set<string>>(new Set());
  const mousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const loadModel = useCallback(async (path: string, name: string): Promise<THREE.Group> => {
    if (loadedModelsRef.current.has(path)) {
      const cached = loadedModelsRef.current.get(path)!;
      return cached.clone();
    }

    return new Promise((resolve, reject) => {
      loaderRef.current.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              const mesh = child as THREE.Mesh;
              if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach(m => {
                    if (m instanceof THREE.MeshStandardMaterial) {
                      m.metalness = Math.min(m.metalness, 0.8);
                      m.roughness = Math.max(m.roughness, 0.2);
                    }
                  });
                } else if (mesh.material instanceof THREE.MeshStandardMaterial) {
                  mesh.material.metalness = Math.min(mesh.material.metalness, 0.8);
                  mesh.material.roughness = Math.max(mesh.material.roughness, 0.2);
                }
              }
            }
          });
          loadedModelsRef.current.set(path, model);
          console.log(`Loaded model: ${name}`);
          resolve(model.clone());
        },
        undefined,
        (error) => {
          console.error(`Failed to load model ${name} from ${path}:`, error);
          reject(error);
        }
      );
    });
  }, []);

  const loadAnimations = useCallback(async (path: string, name: string): Promise<THREE.AnimationClip[]> => {
    if (loadedAnimationsRef.current.has(path)) {
      return loadedAnimationsRef.current.get(path)!;
    }

    return new Promise((resolve, reject) => {
      loaderRef.current.load(
        path,
        (gltf) => {
          const clips = gltf.animations;
          loadedAnimationsRef.current.set(path, clips);
          console.log(`Loaded ${clips.length} animations from: ${name}`);
          resolve(clips);
        },
        undefined,
        (error) => {
          console.error(`Failed to load animations ${name}:`, error);
          reject(error);
        }
      );
    });
  }, []);

  const setupEntityAnimations = useCallback(async (entity: Entity): Promise<void> => {
    const mixer = new THREE.AnimationMixer(entity.mesh);
    entity.mixer = mixer;
    entity.animations = {
      walk: new Map(),
      run: new Map(),
    };

    try {
      const [idleClips, combatClips, movementClips] = await Promise.all([
        loadAnimations(ANIMATION_PATHS.idle, 'Idle').catch(() => []),
        loadAnimations(ANIMATION_PATHS.combatMelee, 'Combat').catch(() => []),
        loadAnimations(ANIMATION_PATHS.movementBasic, 'Movement').catch(() => []),
      ]);

      if (idleClips.length > 0) {
        entity.animations.idle = mixer.clipAction(idleClips[0]);
        entity.animations.idle.play();
      }

      for (const clip of combatClips) {
        const name = clip.name.toLowerCase();
        if (name.includes('attack') || name.includes('melee') || name.includes('slash')) {
          entity.animations.attack = mixer.clipAction(clip);
          entity.animations.attack.setLoop(THREE.LoopOnce, 1);
          entity.animations.attack.clampWhenFinished = true;
          break;
        }
      }

      for (const clip of movementClips) {
        const name = clip.name.toLowerCase();
        if (name.includes('walk') || name.includes('run') || name.includes('move')) {
          const walkAction = mixer.clipAction(clip);
          entity.animations.walk?.set('N', walkAction);
          entity.animations.walk?.set('S', walkAction);
          entity.animations.walk?.set('E', walkAction);
          entity.animations.walk?.set('W', walkAction);
          entity.animations.walk?.set('NE', walkAction);
          entity.animations.walk?.set('NW', walkAction);
          entity.animations.walk?.set('SE', walkAction);
          entity.animations.walk?.set('SW', walkAction);
          break;
        }
      }

      const spellClips = await loadAnimations(ANIMATION_PATHS.spell, 'Spell').catch(() => []);
      if (spellClips.length > 0) {
        entity.animations.spell = mixer.clipAction(spellClips[0]);
        entity.animations.spell.setLoop(THREE.LoopOnce, 1);
        entity.animations.spell.clampWhenFinished = true;
      }
    } catch (error) {
      console.warn('Could not load all animations for entity:', error);
    }
  }, [loadAnimations]);

  const playAnimation = useCallback((entity: Entity, animName: 'idle' | 'walk' | 'attack' | 'spell', direction?: Direction8) => {
    if (!entity.animations || !entity.mixer) return;

    const stopAllExcept = (except?: THREE.AnimationAction) => {
      entity.animations?.idle?.stop();
      entity.animations?.attack?.stop();
      entity.animations?.spell?.stop();
      entity.animations?.walk?.forEach(action => {
        if (action !== except) action.stop();
      });
    };

    switch (animName) {
      case 'idle':
        if (entity.animations.idle && entity.currentAnimation !== 'idle') {
          stopAllExcept(entity.animations.idle);
          entity.animations.idle.reset().play();
          entity.currentAnimation = 'idle';
        }
        break;
      case 'walk':
        const walkDir = direction || 'N';
        const walkAnim = entity.animations.walk?.get(walkDir) || entity.animations.walk?.get('N');
        if (walkAnim && entity.currentAnimation !== `walk_${walkDir}`) {
          stopAllExcept(walkAnim);
          walkAnim.reset().play();
          entity.currentAnimation = `walk_${walkDir}`;
        }
        break;
      case 'attack':
        if (entity.animations.attack) {
          stopAllExcept();
          entity.animations.attack.reset().play();
          entity.currentAnimation = 'attack';
          setTimeout(() => {
            if (entity.state !== 'dead') {
              playAnimation(entity, 'idle');
            }
          }, 500);
        }
        break;
      case 'spell':
        if (entity.animations.spell) {
          stopAllExcept();
          entity.animations.spell.reset().play();
          entity.currentAnimation = 'spell';
          setTimeout(() => {
            if (entity.state !== 'dead') {
              playAnimation(entity, 'idle');
            }
          }, 800);
        }
        break;
    }
  }, []);

  const createGothicArena = useCallback((scene: THREE.Scene) => {
    const groundGeometry = new THREE.CircleGeometry(35, 64);
    // Use Grudge Engine arena ground shader for pulsing grid effect
    const groundShader = createShaderMaterial('arenaGround');
    const groundMaterial = groundShader instanceof THREE.ShaderMaterial
      ? groundShader
      : new THREE.MeshStandardMaterial({ color: 0x1a1510, roughness: 0.95, metalness: 0.05 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);
    groundPlaneRef.current = ground;

    const pentagramGeometry = new THREE.RingGeometry(8, 8.3, 5);
    const pentagramMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x8b0000,
      side: THREE.DoubleSide,
    });
    const pentagram = new THREE.Mesh(pentagramGeometry, pentagramMaterial);
    pentagram.rotation.x = -Math.PI / 2;
    pentagram.position.y = 0.02;
    scene.add(pentagram);

    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.RingGeometry(12 + i * 5, 12.2 + i * 5, 64);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x3d2817,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      scene.add(ring);
    }

    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const pillarGeometry = new THREE.CylinderGeometry(0.8, 1.0, 8, 8);
      const pillarMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x2a2520,
        roughness: 0.8,
        metalness: 0.2,
      });
      const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
      pillar.position.set(Math.cos(angle) * 30, 4, Math.sin(angle) * 30);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);

      const fireLight = new THREE.PointLight(0xff6600, 2, 15);
      fireLight.position.set(Math.cos(angle) * 30, 9, Math.sin(angle) * 30);
      fireLight.castShadow = true;
      scene.add(fireLight);
    }

    const targetGeometry = new THREE.RingGeometry(0.3, 0.5, 32);
    const targetMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff3333, 
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const targetIndicator = new THREE.Mesh(targetGeometry, targetMaterial);
    targetIndicator.rotation.x = -Math.PI / 2;
    targetIndicator.position.y = 0.1;
    targetIndicator.visible = false;
    scene.add(targetIndicator);
    targetIndicatorRef.current = targetIndicator;

    const fogColor = 0x0a0806;
    scene.fog = new THREE.FogExp2(fogColor, 0.02);
    scene.background = new THREE.Color(fogColor);
  }, []);

  const spawnEnemy = useCallback(async (
    scene: THREE.Scene, 
    collisionSystem: CollisionSystem, 
    type: 'skeletonWarrior' | 'skeletonMage' | 'skeletonMinion' | 'skeletonRogue'
  ): Promise<Entity> => {
    const modelPath = MODEL_PATHS[type];
    
    let mesh: THREE.Group;
    try {
      mesh = await loadModel(modelPath, type);
      mesh.scale.setScalar(type === 'skeletonWarrior' ? 1.0 : type === 'skeletonMage' ? 0.9 : 0.8);
    } catch {
      mesh = new THREE.Group();
      const capsule = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.4, 1.2, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x444444 })
      );
      capsule.position.y = 1;
      mesh.add(capsule);
    }
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 18 + Math.random() * 8;
    const position = new THREE.Vector3(
      Math.cos(angle) * distance,
      0,
      Math.sin(angle) * distance
    );
    
    mesh.position.copy(position);
    scene.add(mesh);

    const baseStats: Record<string, CombatStats> = {
      skeletonMinion: { health: 30, maxHealth: 30, mana: 0, maxMana: 0, attackPower: 8, defense: 3, speed: 4 },
      skeletonWarrior: { health: 70, maxHealth: 70, mana: 0, maxMana: 0, attackPower: 18, defense: 12, speed: 2.5 },
      skeletonMage: { health: 40, maxHealth: 40, mana: 60, maxMana: 60, attackPower: 22, defense: 5, speed: 2 },
      skeletonRogue: { health: 45, maxHealth: 45, mana: 20, maxMana: 20, attackPower: 15, defense: 6, speed: 5 },
    };

    const entity: Entity = {
      id: `enemy-${Date.now()}-${Math.random()}`,
      mesh,
      position: position.clone(),
      velocity: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      stats: { ...baseStats[type] },
      isPlayer: false,
      attackCooldown: 0,
      state: 'idle',
      direction: 'S',
      entityType: type,
    };

    await setupEntityAnimations(entity);

    const collider = new Collider({
      type: 'sphere',
      size: type === 'skeletonWarrior' ? 0.8 : 0.6,
      layer: CollisionLayer.ENEMY,
      mask: CollisionLayer.PLAYER | CollisionLayer.PROJECTILE | CollisionLayer.ENVIRONMENT,
    });

    const collisionEntity: CollisionEntity = {
      id: entity.id,
      position: entity.position,
      collider,
      velocity: entity.velocity,
      userData: { entity },
    };

    collisionSystem.addEntity(collisionEntity);

    return entity;
  }, [loadModel, setupEntityAnimations]);

  const spawnWave = useCallback(async (scene: THREE.Scene, collisionSystem: CollisionSystem, waveNumber: number) => {
    const enemies: Entity[] = [];
    
    const minionCount = 2 + waveNumber;
    const warriorCount = Math.floor(waveNumber / 2) + 1;
    const mageCount = Math.floor((waveNumber - 1) / 2);
    const rogueCount = Math.floor(waveNumber / 3);

    const types: ('skeletonMinion' | 'skeletonWarrior' | 'skeletonMage' | 'skeletonRogue')[] = [];
    for (let i = 0; i < minionCount; i++) types.push('skeletonMinion');
    for (let i = 0; i < warriorCount; i++) types.push('skeletonWarrior');
    for (let i = 0; i < mageCount; i++) types.push('skeletonMage');
    for (let i = 0; i < rogueCount; i++) types.push('skeletonRogue');

    for (const type of types) {
      try {
        const enemy = await spawnEnemy(scene, collisionSystem, type);
        enemies.push(enemy);
      } catch (error) {
        console.error(`Failed to spawn ${type}:`, error);
      }
    }

    enemiesRef.current = enemies;
    setEnemiesRemaining(enemies.length);
  }, [spawnEnemy]);

  const initGame = useCallback(async () => {
    if (!containerRef.current) return;

    setGameState('loading');
    setLoadingProgress(0);
    setLoadingStatus('Creating arena...');

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      500
    );
    camera.position.set(0, 25, 25);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: false });
    } catch {
      console.warn('WebGL not supported');
      return;
    }
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    setLoadingProgress(15);
    setLoadingStatus('Setting up lighting...');

    // Enhanced ambient light for better visibility
    const ambientLight = new THREE.AmbientLight(0x3a2a1f, 0.6);
    scene.add(ambientLight);

    // Hemisphere light for natural sky/ground blend
    const hemiLight = new THREE.HemisphereLight(0x8888aa, 0x443322, 0.5);
    scene.add(hemiLight);

    // Main directional light - stronger for better visibility
    const mainLight = new THREE.DirectionalLight(0xffcc99, 1.2);
    mainLight.position.set(25, 50, 25);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 120;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    mainLight.shadow.bias = -0.001;
    scene.add(mainLight);

    // Fill light from opposite side
    const fillLight = new THREE.DirectionalLight(0x6688bb, 0.5);
    fillLight.position.set(-25, 15, -25);
    scene.add(fillLight);

    // Center arena glow
    const centerLight = new THREE.PointLight(0x8b0000, 1.5, 25);
    centerLight.position.set(0, 3, 0);
    scene.add(centerLight);

    // Player spotlight - follows the player and highlights them
    const playerSpotlight = new THREE.SpotLight(0xffffff, 3);
    playerSpotlight.position.set(0, 15, 0);
    playerSpotlight.angle = Math.PI / 8;
    playerSpotlight.penumbra = 0.5;
    playerSpotlight.decay = 1.5;
    playerSpotlight.distance = 30;
    playerSpotlight.castShadow = true;
    playerSpotlight.shadow.mapSize.width = 1024;
    playerSpotlight.shadow.mapSize.height = 1024;
    playerSpotlight.shadow.camera.near = 5;
    playerSpotlight.shadow.camera.far = 30;
    playerSpotlight.target.position.set(0, 0, 0);
    scene.add(playerSpotlight);
    scene.add(playerSpotlight.target);
    playerSpotlightRef.current = playerSpotlight;

    // Rim light from behind for dramatic effect
    const rimLight = new THREE.DirectionalLight(0xff6633, 0.4);
    rimLight.position.set(0, 20, -30);
    scene.add(rimLight);

    setLoadingProgress(30);
    setLoadingStatus('Building gothic arena...');

    createGothicArena(scene);

    setLoadingProgress(45);
    setLoadingStatus('Initializing effects...');

    const particleSystem = new ParticleManager(scene);
    particleSystemRef.current = particleSystem;

    const spellManager = new SpellEffectsManager(scene);
    spellManagerRef.current = spellManager;

    const collisionSystem = new CollisionSystem(5);
    collisionSystemRef.current = collisionSystem;

    setLoadingProgress(60);
    setLoadingStatus('Loading character model via CharacterSystem...');

    // Use Grudge Engine CharacterSystem for race-based model loading
    let playerMesh: THREE.Group;
    let playerCharacterData: CharacterData | null = null;
    try {
      playerCharacterData = await CharacterSystem.createCharacter(scene, {
        race: 'human',
        position: new THREE.Vector3(0, 0, 0),
        scale: 1.0, // Arena uses unit scale; race scaleFactor (0.037) is for Babylon compat
      });
      playerMesh = playerCharacterData.group;
    } catch (error) {
      console.error('CharacterSystem failed, falling back to loadModel:', error);
      try {
        playerMesh = await loadModel(MODEL_PATHS.player, 'Human');
        playerMesh.scale.setScalar(1.0);
        playerMesh.position.set(0, 0, 0);
        scene.add(playerMesh);
      } catch {
        playerMesh = new THREE.Group();
        const capsule = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.4, 1.2, 8, 16),
          new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.6, roughness: 0.3 }),
        );
        capsule.position.y = 1;
        playerMesh.add(capsule);
        playerMesh.position.set(0, 0, 0);
        scene.add(playerMesh);
      }
    }

    setLoadingProgress(80);
    setLoadingStatus('Loading animations...');

    const player: Entity = {
      id: 'player',
      mesh: playerMesh,
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(),
      rotation: new THREE.Euler(),
      stats: {
        health: 100,
        maxHealth: 100,
        mana: 100,
        maxMana: 100,
        attackPower: 35,
        defense: 12,
        speed: 6,
      },
      isPlayer: true,
      attackCooldown: 0,
      state: 'idle',
      direction: 'S',
      entityType: 'player',
    };
    playerRef.current = player;

    await setupEntityAnimations(player);

    const playerCollider = new Collider({
      type: 'sphere',
      size: 0.6,
      layer: CollisionLayer.PLAYER,
      mask: CollisionLayer.ENEMY | CollisionLayer.ENVIRONMENT,
    });

    collisionSystem.addEntity({
      id: player.id,
      position: player.position,
      collider: playerCollider,
      velocity: player.velocity,
      userData: { entity: player },
    });

    setLoadingProgress(100);
    setLoadingStatus('Ready!');

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    setTimeout(() => setGameState('menu'), 500);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [createGothicArena, loadModel, setupEntityAnimations]);

  const updateMouseTarget = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !groundPlaneRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mousePosition.current = {
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1,
    };

    raycasterRef.current.setFromCamera(
      new THREE.Vector2(mousePosition.current.x, mousePosition.current.y),
      cameraRef.current
    );

    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(groundPlane, intersectPoint);

    if (intersectPoint) {
      mouseTargetRef.current.copy(intersectPoint);
      if (targetIndicatorRef.current && gameState === 'playing') {
        targetIndicatorRef.current.position.set(intersectPoint.x, 0.1, intersectPoint.z);
        targetIndicatorRef.current.visible = true;
      }
    }
  }, [gameState]);

  const updateGame = useCallback((deltaTime: number) => {
    const player = playerRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const collisionSystem = collisionSystemRef.current;
    const particleSystem = particleSystemRef.current;
    const spellManager = spellManagerRef.current;

    if (!player || !scene || !camera || !collisionSystem || !particleSystem) return;

    particleSystem.update(deltaTime);
    
    // Update spell effects (fireballs, frost, lightning, etc.)
    if (spellManager) {
      spellManager.update(deltaTime);
    }

    if (player.mixer) {
      player.mixer.update(deltaTime);
    }

    for (const enemy of enemiesRef.current) {
      if (enemy.mixer) {
        enemy.mixer.update(deltaTime);
      }
    }

    const moveSpeed = player.stats.speed * deltaTime;
    const moveDirection = new THREE.Vector3();

    if (keysPressed.current.has('KeyW') || keysPressed.current.has('ArrowUp')) {
      moveDirection.z -= 1;
    }
    if (keysPressed.current.has('KeyS') || keysPressed.current.has('ArrowDown')) {
      moveDirection.z += 1;
    }
    if (keysPressed.current.has('KeyA') || keysPressed.current.has('ArrowLeft')) {
      moveDirection.x -= 1;
    }
    if (keysPressed.current.has('KeyD') || keysPressed.current.has('ArrowRight')) {
      moveDirection.x += 1;
    }

    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      
      const direction8 = getDirection8FromVector(moveDirection.x, moveDirection.z);
      player.direction = direction8;
      setPlayerDirection(direction8);
      
      moveDirection.multiplyScalar(moveSpeed);
      player.position.add(moveDirection);
      player.state = 'moving';

      const targetToMouse = mouseTargetRef.current.clone().sub(player.position);
      const faceAngle = Math.atan2(targetToMouse.x, targetToMouse.z);
      player.mesh.rotation.y = THREE.MathUtils.lerp(
        player.mesh.rotation.y,
        faceAngle,
        10 * deltaTime
      );

      playAnimation(player, 'walk', direction8);

      const distanceFromCenter = player.position.length();
      if (distanceFromCenter > 28) {
        player.position.normalize().multiplyScalar(28);
      }
    } else {
      if (player.state === 'moving') {
        player.state = 'idle';
        playAnimation(player, 'idle');
      }

      const targetToMouse = mouseTargetRef.current.clone().sub(player.position);
      const faceAngle = Math.atan2(targetToMouse.x, targetToMouse.z);
      player.mesh.rotation.y = THREE.MathUtils.lerp(
        player.mesh.rotation.y,
        faceAngle,
        8 * deltaTime
      );
    }

    // Jump physics
    if (isJumping || playerYRef.current > 0) {
      verticalVelocityRef.current -= GRAVITY * deltaTime;
      playerYRef.current += verticalVelocityRef.current * deltaTime;
      
      if (playerYRef.current <= 0) {
        playerYRef.current = 0;
        verticalVelocityRef.current = 0;
        setIsJumping(false);
      }
    }
    
    player.mesh.position.copy(player.position);
    player.mesh.position.y = playerYRef.current;
    collisionSystem.updateEntity(player.id, player.position);

    if (player.attackCooldown > 0) {
      player.attackCooldown -= deltaTime;
      setAttackCooldown(player.attackCooldown);
    }

    const manaRegen = 8 * deltaTime;
    player.stats.mana = Math.min(player.stats.maxMana, player.stats.mana + manaRegen);

    camera.position.x = THREE.MathUtils.lerp(camera.position.x, player.position.x, 3 * deltaTime);
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, player.position.z + 25, 3 * deltaTime);
    camera.lookAt(player.position.x, 0, player.position.z);

    // Update player spotlight to follow player
    if (playerSpotlightRef.current) {
      playerSpotlightRef.current.position.set(
        player.position.x,
        15,
        player.position.z
      );
      playerSpotlightRef.current.target.position.set(
        player.position.x,
        0,
        player.position.z
      );
    }

    for (const enemy of enemiesRef.current) {
      if (enemy.state === 'dead') continue;

      const directionToPlayer = player.position.clone().sub(enemy.position);
      const distanceToPlayer = directionToPlayer.length();

      if (distanceToPlayer > 2) {
        directionToPlayer.normalize();
        
        const enemyDir8 = getDirection8FromVector(directionToPlayer.x, directionToPlayer.z);
        enemy.direction = enemyDir8;
        
        const moveAmount = enemy.stats.speed * deltaTime;
        enemy.position.add(directionToPlayer.clone().multiplyScalar(moveAmount));
        enemy.mesh.position.copy(enemy.position);

        const targetRotation = Math.atan2(directionToPlayer.x, directionToPlayer.z);
        enemy.mesh.rotation.y = THREE.MathUtils.lerp(
          enemy.mesh.rotation.y,
          targetRotation,
          5 * deltaTime
        );

        collisionSystem.updateEntity(enemy.id, enemy.position);
        
        if (enemy.state !== 'moving') {
          enemy.state = 'moving';
          playAnimation(enemy, 'walk', enemyDir8);
        }
      } else {
        if (enemy.attackCooldown <= 0) {
          const damage = Math.max(1, enemy.stats.attackPower - player.stats.defense);
          player.stats.health -= damage;
          setPlayerHealth(player.stats.health);

          particleSystem.spawnDamage(player.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 'physical');
          
          playAnimation(enemy, 'attack');
          enemy.attackCooldown = 1.2;
          enemy.state = 'attacking';

          if (player.stats.health <= 0) {
            setGameState('defeat');
          }
        } else if (enemy.state !== 'idle' && enemy.state !== 'attacking') {
          enemy.state = 'idle';
          playAnimation(enemy, 'idle');
        }
      }

      if (enemy.attackCooldown > 0) {
        enemy.attackCooldown -= deltaTime;
      }
    }

    collisionSystem.update();
    setPlayerMana(player.stats.mana);
  }, [playAnimation, isJumping, GRAVITY]);

  const performAttack = useCallback(() => {
    const player = playerRef.current;
    const scene = sceneRef.current;
    const particleSystem = particleSystemRef.current;
    const collisionSystem = collisionSystemRef.current;

    if (!player || !scene || !particleSystem || !collisionSystem) return;
    if (player.attackCooldown > 0) return;

    player.attackCooldown = 0.4;
    player.state = 'attacking';
    setAttackCooldown(0.4);
    playAnimation(player, 'attack');

    const attackRange = 3.5;
    const targetPos = mouseTargetRef.current.clone();
    const attackDirection = targetPos.sub(player.position).normalize();

    const attackPoint = player.position.clone().add(attackDirection.clone().multiplyScalar(attackRange * 0.5));
    attackPoint.y = 1;

    particleSystem.spawnEffect(ParticleEffectPresets.spark('#ffd700'), attackPoint, 0.3, 30);

    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const enemy = enemiesRef.current[i];
      if (enemy.state === 'dead') continue;

      const directionToEnemy = enemy.position.clone().sub(player.position);
      const distanceToEnemy = directionToEnemy.length();

      if (distanceToEnemy <= attackRange) {
        const attackAngle = Math.atan2(attackDirection.x, attackDirection.z);
        const enemyAngle = Math.atan2(directionToEnemy.x, directionToEnemy.z);
        const angleDiff = Math.abs(attackAngle - enemyAngle);

        if (angleDiff < Math.PI * 0.5 || angleDiff > Math.PI * 1.5) {
          const damage = Math.max(1, player.stats.attackPower - enemy.stats.defense);
          enemy.stats.health -= damage;

          particleSystem.spawnDamage(enemy.position.clone().add(new THREE.Vector3(0, 1, 0)), 'physical');

          if (enemy.stats.health <= 0) {
            enemy.state = 'dead';
            particleSystem.spawnExplosion(enemy.position.clone().add(new THREE.Vector3(0, 0.5, 0)), '#4a3c2e');
            scene.remove(enemy.mesh);
            collisionSystem.removeEntity(enemy.id);

            setScore(prev => prev + (enemy.entityType === 'skeletonWarrior' ? 150 : enemy.entityType === 'skeletonMage' ? 120 : 80));
            setEnemiesRemaining(prev => {
              const newCount = prev - 1;
              if (newCount <= 0) {
                setTimeout(() => {
                  setWave(w => {
                    const newWave = w + 1;
                    if (newWave > 5) {
                      setGameState('victory');
                    } else {
                      spawnWave(scene, collisionSystem, newWave);
                    }
                    return newWave;
                  });
                }, 1500);
              }
              return newCount;
            });
          }
        }
      }
    }
  }, [playAnimation, spawnWave]);

  const performSpecialAttack = useCallback(() => {
    const player = playerRef.current;
    const scene = sceneRef.current;
    const spellManager = spellManagerRef.current;
    const particleSystem = particleSystemRef.current;
    const collisionSystem = collisionSystemRef.current;

    if (!player || !scene || !spellManager || !particleSystem || !collisionSystem) return;
    if (player.stats.mana < 25) return;

    player.stats.mana -= 25;
    setPlayerMana(player.stats.mana);
    playAnimation(player, 'spell');

    const targetPos = mouseTargetRef.current.clone();
    const attackDirection = targetPos.sub(player.position).normalize();
    attackDirection.y = 0.3;

    const startPos = player.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const fireball = spellManager.spawnFireball(startPos, 0.6, 2.5);

    let projectilePos = startPos.clone();
    const projectileSpeed = 20;
    const maxDistance = 30;
    let distanceTraveled = 0;

    const updateProjectile = () => {
      if (gameState !== 'playing' || distanceTraveled >= maxDistance) return;

      const delta = 1 / 60;
      const movement = attackDirection.clone().multiplyScalar(projectileSpeed * delta);
      projectilePos.add(movement);
      distanceTraveled += movement.length();

      fireball.setPosition(projectilePos.x, projectilePos.y, projectilePos.z);

      for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
        const enemy = enemiesRef.current[i];
        if (enemy.state === 'dead') continue;

        const dist = projectilePos.distanceTo(enemy.position.clone().add(new THREE.Vector3(0, 1, 0)));
        if (dist < 2) {
          const damage = 50;
          enemy.stats.health -= damage;

          particleSystem.spawnExplosion(enemy.position.clone().add(new THREE.Vector3(0, 1, 0)), '#ff4400');

          if (enemy.stats.health <= 0) {
            enemy.state = 'dead';
            scene.remove(enemy.mesh);
            collisionSystem.removeEntity(enemy.id);
            setScore(prev => prev + 180);
            setEnemiesRemaining(prev => {
              const newCount = prev - 1;
              if (newCount <= 0) {
                setTimeout(() => {
                  setWave(w => {
                    const newWave = w + 1;
                    if (newWave > 5) {
                      setGameState('victory');
                    } else {
                      spawnWave(scene, collisionSystem, newWave);
                    }
                    return newWave;
                  });
                }, 1500);
              }
              return newCount;
            });
          }
          return;
        }
      }

      if (distanceTraveled < maxDistance) {
        requestAnimationFrame(updateProjectile);
      }
    };

    requestAnimationFrame(updateProjectile);
  }, [gameState, playAnimation, spawnWave]);

  // Skill attacks for hotkeys 1-5 with different spell effects
  const performSkillAttack = useCallback((skillIndex: number) => {
    const player = playerRef.current;
    const scene = sceneRef.current;
    const particleSystem = particleSystemRef.current;
    const collisionSystem = collisionSystemRef.current;
    const spellManager = spellManagerRef.current;

    if (!player || !scene || !particleSystem || !collisionSystem || !spellManager) return;
    if (skillCooldowns[skillIndex] > 0) return;
    
    // Different mana costs per skill
    const manaCosts = [10, 15, 20, 25, 30];
    if (player.stats.mana < manaCosts[skillIndex]) return;

    player.stats.mana -= manaCosts[skillIndex];
    setPlayerMana(player.stats.mana);

    // Different cooldowns per skill
    const cooldowns = [1.5, 2.0, 2.5, 3.0, 4.0];
    setSkillCooldowns(prev => {
      const newCooldowns = [...prev];
      newCooldowns[skillIndex] = cooldowns[skillIndex];
      return newCooldowns;
    });

    playAnimation(player, 'spell');
    
    const attackRange = 4.0 + skillIndex * 1.0;
    const targetPos = mouseTargetRef.current.clone();
    const attackDirection = targetPos.sub(player.position).normalize();
    const attackPoint = player.position.clone().add(attackDirection.clone().multiplyScalar(attackRange * 0.5));
    attackPoint.y = 1;

    // Different spell effects for each skill slot
    const skillColors = ['#ffd700', '#88ccff', '#00ff88', '#aaddff', '#9966ff'];
    
    // Skill 1: Slash (melee spark)
    if (skillIndex === 0) {
      particleSystem.spawnEffect(ParticleEffectPresets.spark(skillColors[0]), attackPoint, 0.5, 50);
    }
    // Skill 2: Frost Nova (frost AoE)
    else if (skillIndex === 1) {
      spellManager.spawnFrost(attackPoint, 1.5, 1.5);
      particleSystem.spawnEffect(ParticleEffectPresets.spark(skillColors[1]), attackPoint, 0.6, 60);
    }
    // Skill 3: Healing Aura (self heal)
    else if (skillIndex === 2) {
      spellManager.spawnHealingAura(player.position.clone().add(new THREE.Vector3(0, 0.1, 0)), 2.5, 2.0);
      player.stats.health = Math.min(player.stats.maxHealth, player.stats.health + 25);
      setPlayerHealth(player.stats.health);
    }
    // Skill 4: Lightning Strike
    else if (skillIndex === 3) {
      const strikePos = attackPoint.clone();
      strikePos.y = 0;
      const skyPos = strikePos.clone();
      skyPos.y = 15;
      spellManager.spawnLightning(skyPos, strikePos, 0.8);
      particleSystem.spawnExplosion(strikePos.clone().add(new THREE.Vector3(0, 0.5, 0)), skillColors[3]);
    }
    // Skill 5: Portal Strike (teleport + damage)
    else if (skillIndex === 4) {
      spellManager.spawnPortal(player.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 1.5, 1.0);
      spellManager.spawnPortal(attackPoint.clone().add(new THREE.Vector3(0, 0.5, 0)), 1.5, 1.0);
      particleSystem.spawnEffect(ParticleEffectPresets.spark(skillColors[4]), attackPoint, 0.8, 80);
    }

    // Deal damage based on skill and equipped weapon
    const baseDamage = equippedWeapon.damage * (1 + skillIndex * 0.15);
    
    for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
      const enemy = enemiesRef.current[i];
      if (enemy.state === 'dead') continue;

      const directionToEnemy = enemy.position.clone().sub(player.position);
      const distanceToEnemy = directionToEnemy.length();

      if (distanceToEnemy <= attackRange) {
        const attackAngle = Math.atan2(attackDirection.x, attackDirection.z);
        const enemyAngle = Math.atan2(directionToEnemy.x, directionToEnemy.z);
        const angleDiff = Math.abs(attackAngle - enemyAngle);

        if (angleDiff < Math.PI * 0.6 || angleDiff > Math.PI * 1.4) {
          const damage = Math.max(1, baseDamage - enemy.stats.defense);
          enemy.stats.health -= damage;

          particleSystem.spawnDamage(enemy.position.clone().add(new THREE.Vector3(0, 1, 0)), 'physical');

          if (enemy.stats.health <= 0) {
            enemy.state = 'dead';
            particleSystem.spawnExplosion(enemy.position.clone().add(new THREE.Vector3(0, 0.5, 0)), skillColors[skillIndex]);
            scene.remove(enemy.mesh);
            collisionSystem.removeEntity(enemy.id);

            setScore(prev => prev + (enemy.entityType === 'skeletonWarrior' ? 150 : enemy.entityType === 'skeletonMage' ? 120 : 80));
            setEnemiesRemaining(prev => {
              const newCount = prev - 1;
              if (newCount <= 0) {
                setTimeout(() => {
                  setWave(w => {
                    const newWave = w + 1;
                    if (newWave > 5) {
                      setGameState('victory');
                    } else {
                      spawnWave(scene, collisionSystem, newWave);
                    }
                    return newWave;
                  });
                }, 1500);
              }
              return newCount;
            });
          }
        }
      }
    }
  }, [playAnimation, skillCooldowns, equippedWeapon, spawnWave]);

  // Jump function
  const performJump = useCallback(() => {
    if (isJumping) return;
    setIsJumping(true);
    verticalVelocityRef.current = JUMP_FORCE;
  }, [isJumping, JUMP_FORCE]);

  // Equip weapon function
  const equipWeapon = useCallback((weapon: Weapon) => {
    setEquippedWeapon(weapon);
    const player = playerRef.current;
    if (player) {
      player.stats.attackPower = 20 + weapon.damage;
    }
  }, []);

  const startGame = useCallback(async () => {
    setScore(0);
    setWave(1);
    setPlayerHealth(100);
    setPlayerMana(100);

    if (playerRef.current) {
      playerRef.current.stats.health = 100;
      playerRef.current.stats.mana = 100;
      playerRef.current.position.set(0, 0, 0);
      playerRef.current.mesh.position.set(0, 0, 0);
      playAnimation(playerRef.current, 'idle');
    }

    for (const enemy of enemiesRef.current) {
      sceneRef.current?.remove(enemy.mesh);
      collisionSystemRef.current?.removeEntity(enemy.id);
    }
    enemiesRef.current = [];

    setGameState('playing');

    if (sceneRef.current && collisionSystemRef.current) {
      await spawnWave(sceneRef.current, collisionSystemRef.current, 1);
    }
  }, [spawnWave, playAnimation]);

  useEffect(() => {
    const cleanup = initGame();
    return () => {
      cleanup?.then(fn => fn?.());
    };
  }, [initGame]);

  useEffect(() => {
    if (gameState !== 'playing') {
      if (targetIndicatorRef.current) {
        targetIndicatorRef.current.visible = false;
      }
      return;
    }

    const animate = () => {
      const deltaTime = clockRef.current.getDelta();
      updateGame(deltaTime);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, updateGame]);

  // Skill cooldown update effect
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const interval = setInterval(() => {
      setSkillCooldowns(prev => prev.map(cd => Math.max(0, cd - 0.1)));
    }, 100);
    
    return () => clearInterval(interval);
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);

      // Skip game controls if UI panel is open
      const uiOpen = showInventory || showEquipment || showSettings;

      // Hotkeys 1-5 for skill attacks
      if (gameState === 'playing' && !uiOpen) {
        if (e.code === 'Digit1') { e.preventDefault(); performSkillAttack(0); }
        if (e.code === 'Digit2') { e.preventDefault(); performSkillAttack(1); }
        if (e.code === 'Digit3') { e.preventDefault(); performSkillAttack(2); }
        if (e.code === 'Digit4') { e.preventDefault(); performSkillAttack(3); }
        if (e.code === 'Digit5') { e.preventDefault(); performSkillAttack(4); }
      }

      // Spacebar for jump
      if (e.code === 'Space' && gameState === 'playing' && !uiOpen) {
        e.preventDefault();
        performJump();
      }
      
      // E for special attack (fireball)
      if (e.code === 'KeyE' && gameState === 'playing' && !uiOpen) {
        e.preventDefault();
        performSpecialAttack();
      }
      
      // C key for equipment panel
      if (e.code === 'KeyC' && gameState === 'playing') {
        e.preventDefault();
        setShowEquipment(prev => !prev);
        setShowInventory(false);
        setShowSettings(false);
      }
      
      // B key for inventory panel
      if (e.code === 'KeyB' && gameState === 'playing') {
        e.preventDefault();
        setShowInventory(prev => !prev);
        setShowEquipment(false);
        setShowSettings(false);
      }
      
      // Backtick (`) for Dev Inspector toggle
      if (e.code === 'Backquote') {
        e.preventDefault();
        setShowDevInspector(prev => !prev);
      }
      
      // Escape to close panels or pause
      if (e.code === 'Escape') {
        if (showDevInspector) {
          setShowDevInspector(false);
        } else if (showInventory || showEquipment || showSettings) {
          setShowInventory(false);
          setShowEquipment(false);
          setShowSettings(false);
        } else if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };

    const handleMouseMove = (e: MouseEvent) => {
      updateMouseTarget(e);
    };

    const handleMouseClick = (e: MouseEvent) => {
      if (gameState === 'playing' && e.button === 0 && !showInventory && !showEquipment && !showSettings) {
        performAttack();
      }
    };

    const handleRightClick = (e: MouseEvent) => {
      if (gameState === 'playing' && !showInventory && !showEquipment && !showSettings) {
        e.preventDefault();
        performSpecialAttack();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleMouseClick);
    window.addEventListener('contextmenu', handleRightClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleMouseClick);
      window.removeEventListener('contextmenu', handleRightClick);
    };
  }, [gameState, performAttack, performSpecialAttack, performSkillAttack, performJump, updateMouseTarget, showInventory, showEquipment, showSettings]);

  return (
    <div className="h-screen w-full flex flex-col bg-stone-950 overflow-hidden">
      <div className="flex-1 relative cursor-crosshair">
        <div ref={containerRef} className="w-full h-full" data-testid="game-canvas" />

        {/* Dev Inspector — toggle with backtick (`) */}
        <DevInspector
          visible={showDevInspector}
          onClose={() => setShowDevInspector(false)}
          playerStats={{
            health: playerHealth,
            mana: playerMana,
            damage: 35,
            speed: 6,
          }}
        />

        {gameState === 'playing' && (
          <>
            {/* ── Grudge Engine MMO UI ── */}
            <UnitFrame
              name="Player"
              level={1}
              className={equippedWeapon.id.toUpperCase()}
              health={playerHealth}
              maxHealth={100}
              mana={playerMana}
              maxMana={100}
              portrait="⚔"
              side="left"
            />
            <CombatLog entries={combatLogEntries} />

            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none">
              <Link href="/" className="pointer-events-auto">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="bg-stone-900/80 border border-stone-700 hover:bg-stone-800"
                  data-testid="button-back"
                >
                  <ArrowLeft className="h-4 w-4 text-amber-100" />
                </Button>
              </Link>

              <div className="flex items-center gap-4 bg-stone-900/90 border border-stone-700 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <Skull className="h-4 w-4 text-red-500" />
                  <span className="text-amber-100 font-bold" data-testid="badge-wave">Wave {wave}/5</span>
                </div>
                <div className="w-px h-6 bg-stone-600" />
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  <span className="text-amber-100 font-bold" data-testid="badge-score">{score}</span>
                </div>
                <div className="w-px h-6 bg-stone-600" />
                <div className="flex items-center gap-2">
                  <Skull className="h-4 w-4 text-stone-400" />
                  <span className="text-stone-300" data-testid="badge-enemies">{enemiesRemaining}</span>
                </div>
                <div className="w-px h-6 bg-stone-600" />
                <div className="flex items-center gap-2">
                  <Crosshair className="h-4 w-4 text-amber-400" />
                  <span className="text-amber-200 text-sm font-mono" data-testid="direction">{playerDirection}</span>
                </div>
              </div>

              {/* Quick Access Buttons */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="bg-stone-900/80 border border-stone-700 hover:bg-stone-800"
                  onClick={() => setShowInventory(prev => !prev)}
                  data-testid="button-inventory"
                >
                  <Package className="h-4 w-4 text-amber-100" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="bg-stone-900/80 border border-stone-700 hover:bg-stone-800"
                  onClick={() => setShowEquipment(prev => !prev)}
                  data-testid="button-equipment"
                >
                  <Shield className="h-4 w-4 text-amber-100" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="bg-stone-900/80 border border-stone-700 hover:bg-stone-800"
                  onClick={() => setShowSettings(prev => !prev)}
                  data-testid="button-settings"
                >
                  <Settings className="h-4 w-4 text-amber-100" />
                </Button>
              </div>
            </div>

            {/* Equipped Weapon Display */}
            <div className="absolute top-16 left-4 pointer-events-none">
              <div className="bg-stone-900/90 border border-stone-700 rounded-lg px-3 py-2 flex items-center gap-2">
                <equippedWeapon.icon className={`h-5 w-5 ${RARITY_TEXT[equippedWeapon.rarity]}`} />
                <div>
                  <span className={`text-sm font-bold ${RARITY_TEXT[equippedWeapon.rarity]}`}>{equippedWeapon.name}</span>
                  <div className="text-xs text-stone-400">DMG: {equippedWeapon.damage}</div>
                </div>
              </div>
            </div>

            <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
              <div 
                className="mx-auto max-w-5xl flex items-end justify-between px-4 pb-4"
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                  paddingTop: '60px',
                }}
              >
                <div className="pointer-events-auto">
                  <HealthOrb current={playerHealth} max={100} type="health" />
                </div>

                <div className="flex flex-col items-center gap-2 pointer-events-auto">
                  {/* Skill Bar with Hotkeys 1-5 */}
                  <div className="flex items-center gap-1">
                    <SkillButton 
                      icon={Sword} 
                      hotkey="1" 
                      cooldown={skillCooldowns[0] > 0 ? skillCooldowns[0] : undefined}
                      manaCost={10}
                      onClick={() => performSkillAttack(0)}
                      disabled={skillCooldowns[0] > 0 || playerMana < 10}
                    />
                    <SkillButton 
                      icon={Target} 
                      hotkey="2" 
                      cooldown={skillCooldowns[1] > 0 ? skillCooldowns[1] : undefined}
                      manaCost={10}
                      onClick={() => performSkillAttack(1)}
                      disabled={skillCooldowns[1] > 0 || playerMana < 10}
                    />
                    <SkillButton 
                      icon={Wind} 
                      hotkey="3" 
                      cooldown={skillCooldowns[2] > 0 ? skillCooldowns[2] : undefined}
                      manaCost={10}
                      onClick={() => performSkillAttack(2)}
                      disabled={skillCooldowns[2] > 0 || playerMana < 10}
                    />
                    <SkillButton 
                      icon={Swords} 
                      hotkey="4" 
                      cooldown={skillCooldowns[3] > 0 ? skillCooldowns[3] : undefined}
                      manaCost={10}
                      onClick={() => performSkillAttack(3)}
                      disabled={skillCooldowns[3] > 0 || playerMana < 10}
                    />
                    <SkillButton 
                      icon={Zap} 
                      hotkey="5" 
                      cooldown={skillCooldowns[4] > 0 ? skillCooldowns[4] : undefined}
                      manaCost={10}
                      onClick={() => performSkillAttack(4)}
                      disabled={skillCooldowns[4] > 0 || playerMana < 10}
                    />
                    <div className="w-px h-12 bg-stone-600 mx-1" />
                    <SkillButton 
                      icon={Flame} 
                      hotkey="E" 
                      manaCost={25}
                      onClick={performSpecialAttack}
                      disabled={playerMana < 25}
                    />
                    <SkillButton 
                      icon={Sword} 
                      hotkey="LMB" 
                      cooldown={attackCooldown > 0 ? attackCooldown : undefined}
                      onClick={performAttack}
                      disabled={attackCooldown > 0}
                    />
                  </div>
                  <div className="text-xs text-stone-500">
                    WASD Move | Space Jump | 1-5 Skills | B Inventory | C Equipment
                  </div>
                </div>

                <div className="pointer-events-auto">
                  <HealthOrb current={playerMana} max={100} type="mana" />
                </div>
              </div>
            </div>

            {/* Inventory Panel (B key) */}
            {showInventory && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-auto" data-testid="panel-inventory">
                <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-stone-700 rounded-lg p-6 w-[500px] max-h-[80vh] overflow-auto">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-amber-100">Inventory</h2>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowInventory(false)}
                      data-testid="button-close-inventory"
                    >
                      <X className="h-4 w-4 text-stone-400" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {inventory.map((item) => (
                      <button
                        key={item.id}
                        className={`p-3 rounded-lg border-2 ${RARITY_COLORS[item.weapon.rarity]} hover:brightness-110 transition-all`}
                        onClick={() => equipWeapon(item.weapon)}
                        data-testid={`item-${item.weapon.id}`}
                      >
                        <item.weapon.icon className={`h-8 w-8 mx-auto ${RARITY_TEXT[item.weapon.rarity]}`} />
                        <div className={`text-xs mt-1 text-center truncate ${RARITY_TEXT[item.weapon.rarity]}`}>
                          {item.weapon.name}
                        </div>
                        <div className="text-xs text-stone-500 text-center">DMG: {item.weapon.damage}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-stone-500 mt-4 text-center">Click a weapon to equip it</p>
                </div>
              </div>
            )}

            {/* Equipment Panel (C key) */}
            {showEquipment && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-auto" data-testid="panel-equipment">
                <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-stone-700 rounded-lg p-6 w-[400px]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-amber-100">Equipment</h2>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowEquipment(false)}
                      data-testid="button-close-equipment"
                    >
                      <X className="h-4 w-4 text-stone-400" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {/* Equipped Weapon Slot */}
                    <div className="bg-stone-800/50 rounded-lg p-4">
                      <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">Main Hand</div>
                      <div className={`flex items-center gap-3 p-3 rounded-lg border-2 ${RARITY_COLORS[equippedWeapon.rarity]}`}>
                        <equippedWeapon.icon className={`h-10 w-10 ${RARITY_TEXT[equippedWeapon.rarity]}`} />
                        <div>
                          <div className={`font-bold ${RARITY_TEXT[equippedWeapon.rarity]}`}>{equippedWeapon.name}</div>
                          <div className="text-sm text-stone-400">Damage: {equippedWeapon.damage}</div>
                          <div className="text-sm text-stone-400">Attack Speed: {equippedWeapon.attackSpeed}x</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Player Stats */}
                    <div className="bg-stone-800/50 rounded-lg p-4">
                      <div className="text-xs text-stone-500 uppercase tracking-wider mb-2">Stats</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between text-stone-300">
                          <span>Attack Power:</span>
                          <span className="text-amber-100">{20 + equippedWeapon.damage}</span>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Defense:</span>
                          <span className="text-amber-100">12</span>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Health:</span>
                          <span className="text-red-400">{playerHealth}/100</span>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Mana:</span>
                          <span className="text-blue-400">{Math.floor(playerMana)}/100</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Panel */}
            {showSettings && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-auto" data-testid="panel-settings">
                <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-stone-700 rounded-lg p-6 w-[350px]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-amber-100">Settings</h2>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setShowSettings(false)}
                      data-testid="button-close-settings"
                    >
                      <X className="h-4 w-4 text-stone-400" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="bg-stone-800/50 rounded-lg p-4">
                      <div className="text-xs text-stone-500 uppercase tracking-wider mb-3">Hotkeys</div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-stone-300">
                          <span>Move:</span><kbd className="bg-stone-700 px-2 py-0.5 rounded text-amber-100">WASD</kbd>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Jump:</span><kbd className="bg-stone-700 px-2 py-0.5 rounded text-amber-100">Space</kbd>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Skills:</span><kbd className="bg-stone-700 px-2 py-0.5 rounded text-amber-100">1-5</kbd>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Fireball:</span><kbd className="bg-stone-700 px-2 py-0.5 rounded text-amber-100">E / RMB</kbd>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Attack:</span><kbd className="bg-stone-700 px-2 py-0.5 rounded text-amber-100">LMB</kbd>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Inventory:</span><kbd className="bg-stone-700 px-2 py-0.5 rounded text-amber-100">B</kbd>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Equipment:</span><kbd className="bg-stone-700 px-2 py-0.5 rounded text-amber-100">C</kbd>
                        </div>
                        <div className="flex justify-between text-stone-300">
                          <span>Pause:</span><kbd className="bg-stone-700 px-2 py-0.5 rounded text-amber-100">Esc</kbd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {gameState === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-950">
            <div className="text-center">
              <Skull className="h-16 w-16 text-red-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-2xl font-bold text-amber-100 mb-2">Entering the Arena...</h2>
              <p className="text-stone-400 mb-4">{loadingStatus}</p>
              <div className="w-64 h-2 bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-stone-500 mt-2">{loadingProgress}%</p>
            </div>
          </div>
        )}

        {gameState === 'menu' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="relative bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-stone-700 rounded-lg p-8 w-[420px]"
              style={{ boxShadow: '0 0 60px rgba(139, 0, 0, 0.3), inset 0 0 30px rgba(0,0,0,0.5)' }}
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2">
                <div className="bg-stone-900 border-2 border-stone-600 rounded-full p-3">
                  <Skull className="h-10 w-10 text-red-600" />
                </div>
              </div>

              <div className="text-center mt-6 mb-8">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-600 mb-2">
                  GRUDGE ARENA
                </h1>
                <p className="text-stone-400 text-sm">8-Directional Combat with Mouse Targeting</p>
                {/* Elo Rating Display */}
                <div className="mt-4 flex justify-center">
                  <ArenaRatingDisplay stats={arenaStats} />
                </div>
              </div>

              <div className="space-y-4">
                <Button 
                  className="w-full h-14 bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border border-red-600 text-amber-100 text-lg font-bold shadow-lg"
                  onClick={startGame}
                  data-testid="button-start"
                >
                  <Play className="h-5 w-5 mr-2" />
                  ENTER THE ARENA
                </Button>

                <Link href="/" className="block">
                  <Button 
                    variant="outline"
                    className="w-full border-stone-600 text-stone-300 hover:bg-stone-800 hover:text-amber-100"
                    data-testid="button-back-menu"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Return to Sanctum
                  </Button>
                </Link>
              </div>

              <div className="mt-8 pt-4 border-t border-stone-700">
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-3">Controls</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-stone-400">
                    <kbd className="bg-stone-800 px-2 py-1 rounded text-xs text-amber-100">WASD</kbd>
                    <span>8-Dir Move</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-400">
                    <kbd className="bg-stone-800 px-2 py-1 rounded text-xs text-amber-100">Mouse</kbd>
                    <span>Aim</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-400">
                    <kbd className="bg-stone-800 px-2 py-1 rounded text-xs text-amber-100">LMB</kbd>
                    <span>Melee Attack</span>
                  </div>
                  <div className="flex items-center gap-2 text-stone-400">
                    <kbd className="bg-stone-800 px-2 py-1 rounded text-xs text-amber-100">RMB</kbd>
                    <span className="text-orange-400">Fireball</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-stone-700 rounded-lg p-8 w-80">
              <h2 className="text-2xl font-bold text-center text-amber-100 mb-6">PAUSED</h2>
              <div className="space-y-3">
                <Button 
                  className="w-full bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border border-red-600 text-amber-100"
                  onClick={() => setGameState('playing')}
                  data-testid="button-resume"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Continue
                </Button>
                <Button 
                  variant="outline"
                  className="w-full border-stone-600 text-stone-300"
                  onClick={() => setGameState('menu')}
                  data-testid="button-quit"
                >
                  Abandon Quest
                </Button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div 
              className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-amber-600 rounded-lg p-8 w-[420px]"
              style={{ boxShadow: '0 0 60px rgba(217, 175, 55, 0.3)' }}
            >
              <div className="text-center">
                <Crown className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 mb-2">
                  VICTORY
                </h2>
                <p className="text-stone-400 mb-6">The arena bows before you.</p>

                <div className="bg-stone-800/50 rounded-lg p-4 mb-6">
                  <p className="text-stone-400 text-sm">Final Score</p>
                  <p className="text-4xl font-bold text-amber-100">{score}</p>
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-b from-amber-600 to-amber-800 hover:from-amber-500 hover:to-amber-700 border border-amber-500 text-stone-900 font-bold"
                    onClick={startGame}
                    data-testid="button-play-again"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Fight Again
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full border-stone-600 text-stone-300"
                    onClick={() => setGameState('menu')}
                    data-testid="button-menu"
                  >
                    Return to Sanctum
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {gameState === 'defeat' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div 
              className="bg-gradient-to-b from-stone-900 to-stone-950 border-2 border-red-900 rounded-lg p-8 w-[420px]"
              style={{ boxShadow: '0 0 60px rgba(139, 0, 0, 0.3)' }}
            >
              <div className="text-center">
                <Shield className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-red-500 mb-2">FALLEN</h2>
                <p className="text-stone-400 mb-6">The darkness claims another soul...</p>

                <div className="bg-stone-800/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-around">
                    <div>
                      <p className="text-stone-400 text-sm">Wave</p>
                      <p className="text-2xl font-bold text-amber-100">{wave}</p>
                    </div>
                    <div>
                      <p className="text-stone-400 text-sm">Score</p>
                      <p className="text-2xl font-bold text-amber-100">{score}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <Button 
                    className="w-full bg-gradient-to-b from-red-700 to-red-900 hover:from-red-600 hover:to-red-800 border border-red-600 text-amber-100"
                    onClick={startGame}
                    data-testid="button-retry"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Rise Again
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full border-stone-600 text-stone-300"
                    onClick={() => setGameState('menu')}
                    data-testid="button-menu-defeat"
                  >
                    Return to Sanctum
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
