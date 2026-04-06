import { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Sword, Shield, Zap, Coins, Play, RotateCcw, Home, 
  Target, Navigation, Pause, Eye, EyeOff, Map as MapIcon, AlertCircle
} from 'lucide-react';
import { Link } from 'wouter';
import { FACTIONS, getFactionUnits, getUnitById, type FactionId, type UnitDefinition } from '@/data/faction-units';
import { spriteLoader, renderUnitSprite, getUnitAnimationState, type UnitSprite } from '@/lib/sprite-loader';
import { rtsApi, type RTSMap } from '@/lib/gameApi';

// Game constants
const GAME_WIDTH = 3600;
const GAME_HEIGHT = 2100;
const VIEWPORT_WIDTH = 1200;
const VIEWPORT_HEIGHT = 700;
const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 105;

interface Vector2 {
  x: number;
  y: number;
}

type UnitCommand = 'stop' | 'move' | 'attack' | 'patrol' | 'hold';
type UnitAbility = 'heal' | 'aura' | 'special' | 'rage' | 'shield';
type StatusEffect = 'freeze' | 'poison' | 'stun' | 'burn' | 'slow';

interface DamageNumber {
  id: string;
  x: number;
  y: number;
  value: number;
  color: string;
  lifetime: number;
  velocity: Vector2;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  damage: number;
  faction: FactionId;
  sourceUnit: string;
  targetUnit: string | null;
  effectType: 'arrow' | 'magic' | 'melee';
}

interface Unit {
  id: string;
  unitDefId: string;
  faction: FactionId;
  x: number;
  y: number;
  destX: number;
  destY: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  sprite: UnitSprite | null;
  currentAnimation: string;
  facing: number;
  command: UnitCommand;
  target: Unit | null;
  patrolPoints: Vector2[];
  currentPatrolIndex: number;
  abilities: UnitAbility[];
  abilityStates: Map<UnitAbility, { cooldown: number; active: boolean; duration: number }>;
  auraRadius: number;
  isDestroyed: boolean;
  radius: number;
  lastAttackTime: number;
  statusEffects: Map<StatusEffect, { duration: number; strength: number }>;
}

interface City {
  id: string;
  x: number;
  y: number;
  radius: number;
  capturedByFaction: FactionId | null;
  captureProgress: number;
  maxCaptureProgress: number;
  isCapital: boolean;
  spawnRate: number;
  lastSpawnTime: number;
  buildings: string[];
  selectedUnitId: string | null;
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

interface GameMap {
  id: string;
  name: string;
  width: number;
  height: number;
  cities: City[];
  startPositions: Record<FactionId, Vector2>;
  terrain: string;
  difficulty: number;
}

interface GameState {
  units: Unit[];
  cities: City[];
  projectiles: Projectile[];
  damageNumbers: DamageNumber[];
  gameStatus: 'menu' | 'playing' | 'paused' | 'won' | 'lost';
  playerFaction: FactionId;
  enemyFaction: FactionId;
  resources: { gold: number; wood: number; food: number };
  time: number;
  camera: Camera;
  selection: { x1: number; y1: number; x2: number; y2: number } | null;
  selectedUnits: Set<string>;
  fogOfWar: boolean;
  fogMap: Uint8Array;
  currentMap: GameMap;
  maxUnitCount: number;
}

// Predefined maps
const GAME_MAPS: GameMap[] = [
  {
    id: 'grasslands',
    name: 'Grasslands',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    terrain: 'grass',
    difficulty: 1,
    startPositions: {
      fabled: { x: 300, y: GAME_HEIGHT / 2 },
      legion: { x: GAME_WIDTH - 300, y: GAME_HEIGHT / 2 },
      crusade: { x: GAME_WIDTH / 2, y: 300 },
    },
    cities: [
      // Player capital (left)
      {
        id: 'capital_left',
        x: 300,
        y: GAME_HEIGHT / 2,
        radius: 80,
        capturedByFaction: 'fabled',
        captureProgress: 10000,
        maxCaptureProgress: 10000,
        isCapital: true,
        spawnRate: 0.15,
        lastSpawnTime: 0,

        buildings: ['barracks', 'archery'],
        selectedUnitId: null,
      },
      // Enemy capital (right)
      {
        id: 'capital_right',
        x: GAME_WIDTH - 300,
        y: GAME_HEIGHT / 2,
        radius: 80,
        capturedByFaction: 'legion',
        captureProgress: 10000,
        maxCaptureProgress: 10000,
        isCapital: true,
        spawnRate: 0.5,
        lastSpawnTime: 0,
        buildings: ['barracks', 'archery'],
        selectedUnitId: null,
      },
      // Neutral cities
      { id: 'city_1', x: 1000, y: 600, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'city_2', x: 1800, y: 1050, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'city_3', x: 2600, y: 600, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'city_4', x: 1000, y: 1500, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'city_5', x: 2600, y: 1500, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'city_6', x: 1800, y: 1050, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
    ],
  },
  {
    id: 'mountains',
    name: 'Mountain Pass',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    terrain: 'mountain',
    difficulty: 2,
    startPositions: {
      fabled: { x: 300, y: 1050 },
      legion: { x: GAME_WIDTH - 300, y: 1050 },
      crusade: { x: GAME_WIDTH / 2, y: 300 },
    },
    cities: [
      { id: 'mountain_capital_1', x: 300, y: 1050, radius: 80, capturedByFaction: 'fabled', captureProgress: 10000, maxCaptureProgress: 10000, isCapital: true, spawnRate: 0.15, lastSpawnTime: 0, buildings: ['barracks'], selectedUnitId: null },
      { id: 'mountain_capital_2', x: GAME_WIDTH - 300, y: 1050, radius: 80, capturedByFaction: 'crusade', captureProgress: 10000, maxCaptureProgress: 10000, isCapital: true, spawnRate: 0.15, lastSpawnTime: 0, buildings: ['barracks'], selectedUnitId: null },
      { id: 'mountain_pass', x: GAME_WIDTH / 2, y: 1050, radius: 70, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 7000, isCapital: false, spawnRate: 0.12, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
    ],
  },
  {
    id: 'islands',
    name: 'Island Warfare',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    terrain: 'water',
    difficulty: 3,
    startPositions: {
      fabled: { x: 500, y: 500 },
      legion: { x: GAME_WIDTH - 500, y: GAME_HEIGHT - 500 },
      crusade: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
    },
    cities: [
      { id: 'island_1', x: 500, y: 500, radius: 80, capturedByFaction: 'fabled', captureProgress: 10000, maxCaptureProgress: 10000, isCapital: true, spawnRate: 0.15, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'island_2', x: GAME_WIDTH - 500, y: GAME_HEIGHT - 500, radius: 80, capturedByFaction: 'legion', captureProgress: 10000, maxCaptureProgress: 10000, isCapital: true, spawnRate: 0.15, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'island_3', x: GAME_WIDTH / 2, y: 500, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'island_4', x: 1000, y: GAME_HEIGHT - 500, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
      { id: 'island_5', x: GAME_WIDTH - 1000, y: 500, radius: 60, capturedByFaction: null, captureProgress: 0, maxCaptureProgress: 5000, isCapital: false, spawnRate: 0.1, lastSpawnTime: 0, buildings: [], selectedUnitId: null },
    ],
  },
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function getStatusEmoji(status: StatusEffect): string {
  const emojiMap: Record<StatusEffect, string> = {
    freeze: '❄️',
    poison: '☠️',
    stun: '💫',
    burn: '🔥',
    slow: '🐌',
  };
  return emojiMap[status];
}

export default function SwarmRTSEnhanced() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const fogCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [selectedMap, setSelectedMap] = useState<GameMap>(GAME_MAPS[0]);
  const [spritesLoaded, setSpritesLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [apiMaps, setApiMaps] = useState<RTSMap[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  
  const gameStateRef = useRef<GameState>({
    units: [],
    cities: [],
    projectiles: [],
    damageNumbers: [],
    gameStatus: 'menu',
    playerFaction: 'fabled',
    enemyFaction: 'legion',
    resources: { gold: 1000, wood: 500, food: 200 },
    time: 0,
    camera: { x: 0, y: 0, zoom: 1 },
    selection: null,
    selectedUnits: new Set(),
    fogOfWar: true,
    fogMap: new Uint8Array(Math.ceil(GAME_WIDTH / 10) * Math.ceil(GAME_HEIGHT / 10)),
    currentMap: GAME_MAPS[0],
    maxUnitCount: 100,
  });
  
  const [displayState, setDisplayState] = useState({
    resources: { gold: 1000, wood: 500, food: 200 },
    units: { fabled: 0, legion: 0, crusade: 0 },
    gameStatus: 'menu' as GameState['gameStatus'],
    selectedUnits: 0,
    fogOfWar: true,
  });
  
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<Vector2>({ x: 0, y: 0 });
  const spritesRef = useRef<Map<string, UnitSprite>>(new Map());
  const isPanningRef = useRef(false);
  const panStartRef = useRef<Vector2>({ x: 0, y: 0 });
  const cameraPanStartRef = useRef<Vector2>({ x: 0, y: 0 });

  // Load all unit sprites and game data from API
  const loadSprites = useCallback(async () => {
    try {
      setLoadingProgress(0);
      setApiError(null);
      
      // Load maps and factions from backend API
      const maps = await rtsApi.getMaps();
      const factions = await rtsApi.getFactions();
      const systems = await rtsApi.getGameplaySystems();
      
      if (maps.length > 0) {
        setApiMaps(maps);
        console.log('Loaded', maps.length, 'maps from API');
      }
      
      if (factions.length > 0) {
        console.log('Loaded', factions.length, 'factions from API');
      }
      
      if (systems.length > 0) {
        console.log('Loaded', systems.length, 'gameplay systems from API');
      }
      
      const allUnits: UnitDefinition[] = [];
      
      for (const faction of Object.values(FACTIONS)) {
        allUnits.push(...faction.units);
      }
      
      let loaded = 0;
      for (const unitDef of allUnits) {
        try {
          const result = await spriteLoader.loadUnitSprite(
            unitDef.id,
            unitDef.spritePath,
            unitDef.animations
          );
          
          if (result.success && result.sprite) {
            spritesRef.current.set(unitDef.id, result.sprite);
          }
        } catch (err) {
          console.warn(`Failed to load sprite for ${unitDef.id}:`, err);
        }
        
        loaded++;
        setLoadingProgress(Math.floor((loaded / (allUnits.length + 3)) * 100));
      }
      
      setSpritesLoaded(true);
    } catch (err) {
      console.error('Failed to load game data:', err);
      setApiError('Failed to load game data from server');
      setSpritesLoaded(true); // Allow game to continue with local fallback
    }
  }, []);

  useEffect(() => {
    // Assets are deployed under client/public/assets -> served at /assets
    spriteLoader.setBasePath('/assets');
    loadSprites();
  }, [loadSprites]);

  // Create unit with sprite
  const createUnit = useCallback((
    faction: FactionId,
    x: number,
    y: number,
    unitDefId: string
  ): Unit => {
    const unitDef = getUnitById(unitDefId);
    if (!unitDef) {
      throw new Error(`Unit definition not found: ${unitDefId}`);
    }
    
    const sprite = spritesRef.current.get(unitDefId) || null;
    
    // Assign abilities based on unit type
    const abilities: UnitAbility[] = [];
    if (unitDef.type === 'support') abilities.push('heal', 'aura');
    if (unitDef.type === 'heavy') abilities.push('shield', 'rage');
    if (unitDef.type === 'magic') abilities.push('special', 'aura');
    
    return {
      id: generateId(),
      unitDefId: unitDef.id,
      faction,
      x,
      y,
      destX: x,
      destY: y,
      vx: 0,
      vy: 0,
      health: unitDef.stats.health,
      maxHealth: unitDef.stats.health,
      sprite,
      currentAnimation: 'Idle',
      facing: 1,
      command: 'stop',
      target: null,
      patrolPoints: [],
      currentPatrolIndex: 0,
      abilities,
      abilityStates: new Map(),
      auraRadius: 100,
      isDestroyed: false,
      radius: unitDef.stats.size / 2,
      lastAttackTime: 0,
      statusEffects: new Map(),
    };
  }, []);

  // Initialize game
  const initGame = useCallback((playerFaction: FactionId, map: GameMap) => {
    const units: Unit[] = [];
    const cities = JSON.parse(JSON.stringify(map.cities)) as City[];
    
    // Spawn starting units at capitals (reduced to 8 per capital)
    cities.forEach(city => {
      if (city.isCapital && city.capturedByFaction) {
        const factionUnits = getFactionUnits(city.capturedByFaction);
        
        for (let i = 0; i < 8; i++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * city.radius * 0.8;
          const randomUnit = factionUnits[Math.floor(Math.random() * factionUnits.length)];
          
          units.push(createUnit(
            city.capturedByFaction,
            city.x + Math.cos(angle) * dist,
            city.y + Math.sin(angle) * dist,
            randomUnit.id
          ));
        }
      }
    });
    
    // Initialize fog of war
    const fogWidth = Math.ceil(GAME_WIDTH / 10);
    const fogHeight = Math.ceil(GAME_HEIGHT / 10);
    const fogMap = new Uint8Array(fogWidth * fogHeight);
    fogMap.fill(255); // All fog initially
    
    gameStateRef.current = {
      units,
      cities,
      projectiles: [],
      damageNumbers: [],
      gameStatus: 'playing',
      playerFaction,
      enemyFaction: playerFaction === 'fabled' ? 'legion' : 'fabled',
      resources: { gold: 1000, wood: 500, food: 200 },
      time: 0,
      camera: { 
        x: map.startPositions[playerFaction].x - VIEWPORT_WIDTH / 2, 
        y: map.startPositions[playerFaction].y - VIEWPORT_HEIGHT / 2, 
        zoom: 1 
      },
      selection: null,
      selectedUnits: new Set(),
      fogOfWar: true,
      fogMap,
      currentMap: map,
      maxUnitCount: 100,
    };
    
    setDisplayState({
      resources: { gold: 1000, wood: 500, food: 200 },
      units: { fabled: 0, legion: 0, crusade: 0 },
      gameStatus: 'playing',
      selectedUnits: 0,
      fogOfWar: true,
    });
  }, [createUnit]);

  // Update fog of war
  const updateFogOfWar = useCallback((state: GameState) => {
    if (!state.fogOfWar) return;
    
    const fogWidth = Math.ceil(GAME_WIDTH / 10);
    const fogHeight = Math.ceil(GAME_HEIGHT / 10);
    
    // Decay fog slowly
    for (let i = 0; i < state.fogMap.length; i++) {
      if (state.fogMap[i] < 255) {
        state.fogMap[i] = Math.min(255, state.fogMap[i] + 1);
      }
    }
    
    // Reveal around player units and cities
    state.units.forEach(unit => {
      if (unit.faction === state.playerFaction && !unit.isDestroyed) {
        const unitDef = getUnitById(unit.unitDefId);
        const visionRadius = unitDef ? unitDef.stats.attackRange * 1.5 : 100;
        
        const fogX = Math.floor(unit.x / 10);
        const fogY = Math.floor(unit.y / 10);
        const fogRadius = Math.ceil(visionRadius / 10);
        
        for (let dy = -fogRadius; dy <= fogRadius; dy++) {
          for (let dx = -fogRadius; dx <= fogRadius; dx++) {
            if (dx * dx + dy * dy <= fogRadius * fogRadius) {
              const fx = fogX + dx;
              const fy = fogY + dy;
              if (fx >= 0 && fx < fogWidth && fy >= 0 && fy < fogHeight) {
                state.fogMap[fy * fogWidth + fx] = 0;
              }
            }
          }
        }
      }
    });
    
    // Reveal around player cities
    state.cities.forEach(city => {
      if (city.capturedByFaction === state.playerFaction) {
        const fogX = Math.floor(city.x / 10);
        const fogY = Math.floor(city.y / 10);
        const fogRadius = Math.ceil(city.radius * 2 / 10);
        
        for (let dy = -fogRadius; dy <= fogRadius; dy++) {
          for (let dx = -fogRadius; dx <= fogRadius; dx++) {
            if (dx * dx + dy * dy <= fogRadius * fogRadius) {
              const fx = fogX + dx;
              const fy = fogY + dy;
              if (fx >= 0 && fx < fogWidth && fy >= 0 && fy < fogHeight) {
                state.fogMap[fy * fogWidth + fx] = 0;
              }
            }
          }
        }
      }
    });
  }, []);

  // Create damage number
  const createDamageNumber = useCallback((x: number, y: number, damage: number, isCrit: boolean = false) => {
    return {
      id: generateId(),
      x,
      y,
      value: Math.round(damage),
      color: isCrit ? '#ff0' : '#f00',
      lifetime: 1.0,
      velocity: { x: (Math.random() - 0.5) * 20, y: -50 - Math.random() * 30 },
    };
  }, []);

  // Create projectile
  const createProjectile = useCallback((sourceUnit: Unit, targetUnit: Unit, damage: number) => {
    const unitDef = getUnitById(sourceUnit.unitDefId);
    if (!unitDef) return null;

    let effectType: 'arrow' | 'magic' | 'melee' = 'melee';
    if (unitDef.type === 'ranged') effectType = 'arrow';
    if (unitDef.type === 'magic') effectType = 'magic';

    return {
      id: generateId(),
      x: sourceUnit.x,
      y: sourceUnit.y,
      targetX: targetUnit.x,
      targetY: targetUnit.y,
      speed: effectType === 'magic' ? 400 : 600,
      damage,
      faction: sourceUnit.faction,
      sourceUnit: sourceUnit.id,
      targetUnit: targetUnit.id,
      effectType,
    };
  }, []);

  // Apply collision resolution
  const resolveCollisions = useCallback((units: Unit[]) => {
    const activeUnits = units.filter(u => !u.isDestroyed);
    
    for (let i = 0; i < activeUnits.length; i++) {
      for (let j = i + 1; j < activeUnits.length; j++) {
        const u1 = activeUnits[i];
        const u2 = activeUnits[j];
        
        const dx = u2.x - u1.x;
        const dy = u2.y - u1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = u1.radius + u2.radius;
        
        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          
          // Push units apart
          const separation = overlap / 2;
          u1.x -= nx * separation;
          u1.y -= ny * separation;
          u2.x += nx * separation;
          u2.y += ny * separation;
          
          // Keep units in bounds
          u1.x = Math.max(u1.radius, Math.min(GAME_WIDTH - u1.radius, u1.x));
          u1.y = Math.max(u1.radius, Math.min(GAME_HEIGHT - u1.radius, u1.y));
          u2.x = Math.max(u2.radius, Math.min(GAME_WIDTH - u2.radius, u2.x));
          u2.y = Math.max(u2.radius, Math.min(GAME_HEIGHT - u2.radius, u2.y));
        }
      }
    }
  }, []);

  // Game update loop
  const updateGame = useCallback((delta: number) => {
    const state = gameStateRef.current;
    if (state.gameStatus !== 'playing') return;
    
    state.time += delta;
    
    // Update fog of war
    updateFogOfWar(state);
    
    // Update status effects and movement
    state.units.forEach(unit => {
      if (unit.isDestroyed) return;
      
      // Update status effects
      unit.statusEffects.forEach((effect, status) => {
        effect.duration -= delta;
        if (effect.duration <= 0) {
          unit.statusEffects.delete(status);
        } else {
          // Apply status effects
          if (status === 'poison') {
            unit.health -= effect.strength * delta;
            if (Math.random() < 0.1) {
              state.damageNumbers.push(createDamageNumber(unit.x, unit.y, effect.strength * delta, false));
            }
          } else if (status === 'burn') {
            unit.health -= effect.strength * delta * 2;
          }
        }
      });
      
      // Skip movement if stunned or frozen
      if (unit.statusEffects.has('stun') || unit.statusEffects.has('freeze')) {
        return;
      }
      
      const unitDef = getUnitById(unit.unitDefId);
      if (!unitDef) return;
      
      // Movement with speed reduction for slow status
      const speedMod = unit.statusEffects.has('slow') ? 0.5 : 1.0;
      const dx = unit.destX - unit.x;
      const dy = unit.destY - unit.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 2) {
        const moveSpeed = unitDef.stats.speed * speedMod;
        unit.vx = (dx / dist) * moveSpeed;
        unit.vy = (dy / dist) * moveSpeed;
        unit.x += unit.vx * delta;
        unit.y += unit.vy * delta;
        unit.facing = dx < 0 ? -1 : 1;
      } else {
        unit.vx = 0;
        unit.vy = 0;
      }
      
      // Keep in bounds
      unit.x = Math.max(unit.radius, Math.min(GAME_WIDTH - unit.radius, unit.x));
      unit.y = Math.max(unit.radius, Math.min(GAME_HEIGHT - unit.radius, unit.y));
      
      // Find and attack enemies
      if (!unit.target || unit.target.isDestroyed || unit.target.health <= 0) {
        unit.target = null;
        
        // Find nearest enemy
        let nearest: Unit | null = null;
        let nearestDist = unitDef.stats.attackRange;
        
        state.units.forEach(other => {
          if (other.faction !== unit.faction && !other.isDestroyed && other.health > 0) {
            const d = distance(unit.x, unit.y, other.x, other.y);
            if (d < nearestDist) {
              nearestDist = d;
              nearest = other;
            }
          }
        });
        
        unit.target = nearest;
      }
      
      // Attack target
      if (unit.target && !unit.statusEffects.has('stun')) {
        const d = distance(unit.x, unit.y, unit.target.x, unit.target.y);
        if (d <= unitDef.stats.attackRange) {
          const now = state.time;
          if (now - unit.lastAttackTime >= unitDef.stats.attackCooldown) {
            unit.lastAttackTime = now;
            
            // Create projectile for ranged/magic units
            if (unitDef.type === 'ranged' || unitDef.type === 'magic') {
              const projectile = createProjectile(unit, unit.target, unitDef.stats.attackDamage);
              if (projectile) state.projectiles.push(projectile);
            } else {
              // Melee: instant damage
              const damage = unitDef.stats.attackDamage;
              unit.target.health -= damage;
              state.damageNumbers.push(createDamageNumber(unit.target.x, unit.target.y, damage, false));
              
              // Random status effect chance (10%)
              if (Math.random() < 0.1) {
                const statuses: StatusEffect[] = ['stun', 'slow', 'poison'];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                unit.target.statusEffects.set(status, { duration: 2.0, strength: 5 });
              }
            }
          }
        }
      }
    });
    
    // Resolve collisions
    resolveCollisions(state.units);
    
    // Update projectiles
    state.projectiles = state.projectiles.filter(proj => {
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 5) {
        // Hit target
        const target = state.units.find(u => u.id === proj.targetUnit);
        if (target && !target.isDestroyed) {
          target.health -= proj.damage;
          state.damageNumbers.push(createDamageNumber(target.x, target.y, proj.damage, false));
          
          // Magic projectiles have 20% chance to apply burn
          if (proj.effectType === 'magic' && Math.random() < 0.2) {
            target.statusEffects.set('burn', { duration: 3.0, strength: 10 });
          }
        }
        return false;
      }
      
      // Move projectile
      proj.x += (dx / dist) * proj.speed * delta;
      proj.y += (dy / dist) * proj.speed * delta;
      return true;
    });
    
    // Update damage numbers
    state.damageNumbers = state.damageNumbers.filter(dmg => {
      dmg.lifetime -= delta;
      dmg.x += dmg.velocity.x * delta;
      dmg.y += dmg.velocity.y * delta;
      dmg.velocity.y += 100 * delta; // Gravity
      return dmg.lifetime > 0;
    });
    
    // Remove dead units
    state.units.forEach(unit => {
      if (unit.health <= 0 && !unit.isDestroyed) {
        unit.isDestroyed = true;
      }
    });
    
    // Spawn new units at cities (if under max cap)
    const totalUnits = state.units.filter(u => !u.isDestroyed).length;
    if (totalUnits < state.maxUnitCount) {
      state.cities.forEach(city => {
        if (city.capturedByFaction && state.time - city.lastSpawnTime > (1 / city.spawnRate)) {
          city.lastSpawnTime = state.time;
          const factionUnits = getFactionUnits(city.capturedByFaction);
          const randomUnit = factionUnits[Math.floor(Math.random() * factionUnits.length)];
          const angle = Math.random() * Math.PI * 2;
          state.units.push(createUnit(
            city.capturedByFaction,
            city.x + Math.cos(angle) * city.radius,
            city.y + Math.sin(angle) * city.radius,
            randomUnit.id
          ));
        }
      });
    }
    
    // Update sprites
    state.units.forEach(unit => {
      if (unit.sprite && !unit.isDestroyed) {
        const isMoving = distance(unit.x, unit.y, unit.destX, unit.destY) > 2;
        const isAttacking = unit.target !== null;
        const animState = getUnitAnimationState({
          isMoving,
          isAttacking,
          isDead: false,
          isHurt: unit.health < unit.maxHealth * 0.3,
        });
        
        if (unit.sprite.currentAnimation !== animState) {
          spriteLoader.setAnimation(unit.sprite, animState);
        }
        
        spriteLoader.updateAnimation(unit.sprite, delta);
      }
    });
    
    // Update unit counts
    const unitCounts = { fabled: 0, legion: 0, crusade: 0 };
    state.units.forEach(u => {
      if (!u.isDestroyed) unitCounts[u.faction]++;
    });
    
    setDisplayState(prev => ({
      ...prev,
      units: unitCounts,
      selectedUnits: state.selectedUnits.size,
    }));
  }, [updateFogOfWar, createDamageNumber, createProjectile, resolveCollisions, createUnit]);

  // Render game
  /**
   * Render unit with fallback graphics (colored shapes)
   */
  const renderUnitFallback = useCallback((
    ctx: CanvasRenderingContext2D,
    unit: Unit,
    screenX: number,
    screenY: number,
    radius: number
  ) => {
    const factionColor = FACTIONS[unit.faction]?.color || '#888888';
    const isSelected = gameStateRef.current.selectedUnits.has(unit.id);

    // Draw unit circle
    ctx.fillStyle = factionColor;
    ctx.beginPath();
    ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
    ctx.fill();

    // Draw border
    ctx.strokeStyle = isSelected ? '#ffff00' : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.stroke();

    // Draw unit type icon
    const unitDef = getUnitById(unit.unitDefId);
    if (unitDef) {
      ctx.fillStyle = 'white';
      ctx.font = `bold ${radius}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const typeIcon: Record<string, string> = {
        melee: '⚔',
        ranged: '🏹',
        heavy: '🛡',
        magic: '✨',
        support: '✚',
        cavalry: '🐴'
      };
      
      ctx.fillText(typeIcon[unitDef.type] || '●', screenX, screenY);
    }

    // Draw health bar above unit
    if (unit.health < unit.maxHealth) {
      const barWidth = radius * 2;
      const barHeight = 3;
      const healthPercent = unit.health / unit.maxHealth;

      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(screenX - barWidth / 2, screenY - radius - 10, barWidth, barHeight);

      ctx.fillStyle = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(screenX - barWidth / 2, screenY - radius - 10, barWidth * healthPercent, barHeight);
    }
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const bgCanvas = bgCanvasRef.current;
    const fogCanvas = fogCanvasRef.current;
    const minimap = minimapRef.current;
    
    if (!canvas || !bgCanvas || !fogCanvas || !minimap) return;
    
    const ctx = canvas.getContext('2d');
    const bgCtx = bgCanvas.getContext('2d');
    const fogCtx = fogCanvas.getContext('2d');
    const mmCtx = minimap.getContext('2d');
    
    if (!ctx || !bgCtx || !fogCtx || !mmCtx) return;
    
    const state = gameStateRef.current;
    const { camera } = state;
    
    // Render background
    bgCtx.fillStyle = '#1a2f1a';
    bgCtx.fillRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    
    // Clear main canvas
    ctx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
    
    // Render cities
    state.cities.forEach(city => {
      const screenX = city.x - camera.x;
      const screenY = city.y - camera.y;
      
      if (screenX < -100 || screenX > VIEWPORT_WIDTH + 100 || screenY < -100 || screenY > VIEWPORT_HEIGHT + 100) return;
      
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(screenX, screenY, city.radius, 0, Math.PI * 2);
      ctx.fillStyle = city.capturedByFaction ? FACTIONS[city.capturedByFaction].color : '#666';
      ctx.fill();
      ctx.restore();
      
      // City icon
      ctx.beginPath();
      ctx.arc(screenX, screenY, city.isCapital ? 20 : 15, 0, Math.PI * 2);
      ctx.fillStyle = city.capturedByFaction ? FACTIONS[city.capturedByFaction].color : '#888';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    
    // Render units with sprites
    state.units.forEach(unit => {
      if (unit.isDestroyed) return;
      
      const screenX = unit.x - camera.x;
      const screenY = unit.y - camera.y;
      
      if (screenX < -50 || screenX > VIEWPORT_WIDTH + 50 || screenY < -50 || screenY > VIEWPORT_HEIGHT + 50) return;
      
      const unitDef = getUnitById(unit.unitDefId);
      if (!unitDef) return;
      
      // Render aura if active
      const auraState = unit.abilityStates.get('aura');
      if (auraState?.active) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, unit.auraRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        ctx.restore();
      }
      
      // Render sprite or fallback shape
      if (unit.sprite) {
        renderUnitSprite(ctx, unit.sprite, screenX, screenY, unitDef.stats.size, unit.facing < 0);
      } else {
        // Fallback rendering with unit type indicator
        renderUnitFallback(ctx, unit, screenX, screenY, unitDef.stats.size / 2);
      }
      
      // Health bar
      const barWidth = unitDef.stats.size;
      const barHeight = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(screenX - barWidth / 2, screenY - unitDef.stats.size / 2 - 8, barWidth, barHeight);
      ctx.fillStyle = unit.health > unit.maxHealth * 0.3 ? '#22c55e' : '#dc2626';
      ctx.fillRect(screenX - barWidth / 2, screenY - unitDef.stats.size / 2 - 8, barWidth * (unit.health / unit.maxHealth), barHeight);
      
      // Selection indicator
      if (state.selectedUnits.has(unit.id)) {
        ctx.strokeStyle = '#0F0';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(screenX, screenY, unitDef.stats.size / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // Render status effects
      const statusArray = Array.from(unit.statusEffects.keys());
      statusArray.forEach((status, idx) => {
        ctx.font = '16px Arial';
        ctx.fillText(getStatusEmoji(status), screenX + idx * 18 - 9, screenY - unitDef.stats.size / 2 - 15);
      });
    });
    
    // Render projectiles
    state.projectiles.forEach(proj => {
      const screenX = proj.x - camera.x;
      const screenY = proj.y - camera.y;
      
      if (screenX < -50 || screenX > VIEWPORT_WIDTH + 50 || screenY < -50 || screenY > VIEWPORT_HEIGHT + 50) return;
      
      ctx.save();
      if (proj.effectType === 'arrow') {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(screenX - 3, screenY - 1, 6, 2);
      } else if (proj.effectType === 'magic') {
        ctx.fillStyle = '#9370DB';
        ctx.beginPath();
        ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#9370DB';
        ctx.fill();
      }
      ctx.restore();
    });
    
    // Render damage numbers
    state.damageNumbers.forEach(dmg => {
      const screenX = dmg.x - camera.x;
      const screenY = dmg.y - camera.y;
      
      if (screenX < -50 || screenX > VIEWPORT_WIDTH + 50 || screenY < -50 || screenY > VIEWPORT_HEIGHT + 50) return;
      
      ctx.save();
      ctx.font = 'bold 16px Arial';
      ctx.fillStyle = dmg.color;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.globalAlpha = dmg.lifetime;
      ctx.strokeText(dmg.value.toString(), screenX, screenY);
      ctx.fillText(dmg.value.toString(), screenX, screenY);
      ctx.restore();
    });
    
    // Render selection box
    if (state.selection) {
      const x1 = Math.min(state.selection.x1, state.selection.x2);
      const y1 = Math.min(state.selection.y1, state.selection.y2);
      const x2 = Math.max(state.selection.x1, state.selection.x2);
      const y2 = Math.max(state.selection.y1, state.selection.y2);
      
      ctx.strokeStyle = '#0F0';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
    }
    
    // Render fog of war
    if (state.fogOfWar) {
      fogCtx.clearRect(0, 0, VIEWPORT_WIDTH, VIEWPORT_HEIGHT);
      const fogWidth = Math.ceil(GAME_WIDTH / 10);
      const cellSize = 10;
      
      for (let y = 0; y < Math.ceil(VIEWPORT_HEIGHT / cellSize); y++) {
        for (let x = 0; x < Math.ceil(VIEWPORT_WIDTH / cellSize); x++) {
          const worldX = Math.floor((camera.x + x * cellSize) / cellSize);
          const worldY = Math.floor((camera.y + y * cellSize) / cellSize);
          
          if (worldX >= 0 && worldX < fogWidth && worldY >= 0 && worldY < Math.ceil(GAME_HEIGHT / 10)) {
            const fogValue = state.fogMap[worldY * fogWidth + worldX];
            if (fogValue > 0) {
              fogCtx.fillStyle = `rgba(0,0,0,${fogValue / 255 * 0.7})`;
              fogCtx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
          }
        }
      }
    }
    
    // Render minimap
    mmCtx.fillStyle = '#0a0a0a';
    mmCtx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);
    
    const scaleX = MINIMAP_WIDTH / GAME_WIDTH;
    const scaleY = MINIMAP_HEIGHT / GAME_HEIGHT;
    
    // Cities on minimap
    state.cities.forEach(city => {
      mmCtx.fillStyle = city.capturedByFaction ? FACTIONS[city.capturedByFaction].color : '#666';
      mmCtx.fillRect(city.x * scaleX - 2, city.y * scaleY - 2, 4, 4);
    });
    
    // Units on minimap
    state.units.forEach(unit => {
      if (!unit.isDestroyed) {
        mmCtx.fillStyle = FACTIONS[unit.faction].color;
        mmCtx.fillRect(unit.x * scaleX, unit.y * scaleY, 1, 1);
      }
    });
    
    // Camera viewport on minimap
    mmCtx.strokeStyle = '#FFF';
    mmCtx.lineWidth = 1;
    mmCtx.strokeRect(
      camera.x * scaleX,
      camera.y * scaleY,
      VIEWPORT_WIDTH * scaleX,
      VIEWPORT_HEIGHT * scaleY
    );
  }, []);

  // Game loop
  const gameLoop = useCallback((timestamp: number) => {
    const delta = Math.min(0.1, (timestamp - lastTimeRef.current) / 1000);
    lastTimeRef.current = timestamp;
    
    updateGame(delta);
    render();
    
    animationRef.current = requestAnimationFrame(gameLoop);
  }, [updateGame, render]);

  useEffect(() => {
    if (gameStateRef.current.gameStatus === 'playing') {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameLoop, displayState.gameStatus]);

  const toggleFogOfWar = () => {
    gameStateRef.current.fogOfWar = !gameStateRef.current.fogOfWar;
    setDisplayState(prev => ({ ...prev, fogOfWar: !prev.fogOfWar }));
  };

  // Mouse event handlers
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const state = gameStateRef.current;

    if (e.button === 0) { // Left click - selection
      isDraggingRef.current = true;
      dragStartRef.current = { x, y };
      state.selection = { x1: x, y1: y, x2: x, y2: y };
    } else if (e.button === 2) { // Right click - handled in context menu
      e.preventDefault();
    } else if (e.button === 1) { // Middle mouse - pan camera
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY };
      cameraPanStartRef.current = { x: state.camera.x, y: state.camera.y };
    }
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const state = gameStateRef.current;

    if (isDraggingRef.current && state.selection) {
      state.selection.x2 = x;
      state.selection.y2 = y;
    }

    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      state.camera.x = Math.max(0, Math.min(GAME_WIDTH - VIEWPORT_WIDTH, cameraPanStartRef.current.x - dx));
      state.camera.y = Math.max(0, Math.min(GAME_HEIGHT - VIEWPORT_HEIGHT, cameraPanStartRef.current.y - dy));
    }
  }, []);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const state = gameStateRef.current;

    if (e.button === 0 && isDraggingRef.current) {
      isDraggingRef.current = false;
      
      const worldX = x + state.camera.x;
      const worldY = y + state.camera.y;
      
      // Check if it's a click (small drag distance) or a selection box
      const dragDist = distance(dragStartRef.current.x, dragStartRef.current.y, x, y);
      
      if (dragDist < 5) {
        // Single click - select one unit
        let foundUnit: Unit | null = null;
        let minDist = 50; // Max click radius
        
        state.units.forEach(unit => {
          if (!unit.isDestroyed && unit.faction === state.playerFaction) {
            const d = distance(unit.x, unit.y, worldX, worldY);
            if (d < minDist) {
              minDist = d;
              foundUnit = unit;
            }
          }
        });
        
        state.selectedUnits.clear();
        if (foundUnit) {
          state.selectedUnits.add((foundUnit as any).id);
        }
      } else {
        // Selection box
        const x1 = Math.min(dragStartRef.current.x, x) + state.camera.x;
        const x2 = Math.max(dragStartRef.current.x, x) + state.camera.x;
        const y1 = Math.min(dragStartRef.current.y, y) + state.camera.y;
        const y2 = Math.max(dragStartRef.current.y, y) + state.camera.y;
        
        state.selectedUnits.clear();
        state.units.forEach(unit => {
          if (!unit.isDestroyed && unit.faction === state.playerFaction) {
            if (unit.x >= x1 && unit.x <= x2 && unit.y >= y1 && unit.y <= y2) {
              state.selectedUnits.add(unit.id);
            }
          }
        });
      }
      
      state.selection = null;
    } else if (e.button === 1) {
      isPanningRef.current = false;
    }
  }, []);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const state = gameStateRef.current;
    
    if (state.selectedUnits.size === 0) return;
    
    const worldX = x + state.camera.x;
    const worldY = y + state.camera.y;
    
    // Move all selected units to target position
    state.units.forEach(unit => {
      if (state.selectedUnits.has(unit.id)) {
        unit.destX = worldX + (Math.random() - 0.5) * 100; // Spread units out
        unit.destY = worldY + (Math.random() - 0.5) * 100;
        unit.command = 'move';
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center p-4">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <Home className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Swarm RTS - Enhanced</h1>
        <Badge className="bg-yellow-600">
          <Coins className="w-4 h-4 mr-1" />
          {displayState.resources.gold}
        </Badge>
      </div>

      {apiError && (
        <Card className="p-4 mb-4 border-red-500/50 bg-red-950/30">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-200">{apiError}</p>
          </div>
        </Card>
      )}

      {apiMaps.length > 0 && (
        <Card className="p-4 mb-4 border-amber-500/50 bg-amber-950/30">
          <p className="text-amber-200">Loaded {apiMaps.length} maps from server</p>
        </Card>
      )}

      {!spritesLoaded && displayState.gameStatus === 'menu' && (
        <Card className="p-6 mb-4">
          <p className="text-white">Loading sprites... {loadingProgress}%</p>
        </Card>
      )}

      {displayState.gameStatus === 'menu' && spritesLoaded && (
        <Card className="p-6 mb-4 max-w-2xl">
          <h2 className="text-xl font-bold text-white mb-4">Select Map & Faction</h2>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {GAME_MAPS.map(map => (
              <Button
                key={map.id}
                variant={selectedMap.id === map.id ? 'default' : 'outline'}
                onClick={() => setSelectedMap(map)}
                className="flex flex-col items-center p-4"
              >
                <MapIcon className="w-8 h-8 mb-2" />
                <span>{map.name}</span>
                <span className="text-xs text-gray-400">Difficulty: {map.difficulty}</span>
              </Button>
            ))}
          </div>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => initGame('fabled', selectedMap)} style={{ backgroundColor: FACTIONS.fabled.color }}>
              <Play className="w-4 h-4 mr-2" />
              Play as {FACTIONS.fabled.name}
            </Button>
            <Button onClick={() => initGame('crusade', selectedMap)} style={{ backgroundColor: FACTIONS.crusade.color }}>
              <Play className="w-4 h-4 mr-2" />
              Play as {FACTIONS.crusade.name}
            </Button>
            <Button onClick={() => initGame('legion', selectedMap)} style={{ backgroundColor: FACTIONS.legion.color }}>
              <Play className="w-4 h-4 mr-2" />
              Play as {FACTIONS.legion.name}
            </Button>
          </div>
        </Card>
      )}

      {displayState.gameStatus !== 'menu' && (
        <div className="flex gap-4">
          <div className="relative">
            <canvas ref={bgCanvasRef} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} className="absolute" />
            <canvas 
              ref={canvasRef} 
              width={VIEWPORT_WIDTH} 
              height={VIEWPORT_HEIGHT} 
              className="relative border border-gray-800 cursor-crosshair" 
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onContextMenu={handleCanvasContextMenu}
            />
            <canvas ref={fogCanvasRef} width={VIEWPORT_WIDTH} height={VIEWPORT_HEIGHT} className="absolute pointer-events-none" />
            
            {/* Minimap */}
            <canvas
              ref={minimapRef}
              width={MINIMAP_WIDTH}
              height={MINIMAP_HEIGHT}
              className="absolute bottom-4 right-4 border-2 border-white"
            />
          </div>

          {/* UI Panel */}
          <Card className="w-80 p-4 bg-gray-900 border-gray-800 flex flex-col gap-4">
            <div>
              <h3 className="text-white font-bold mb-2">Unit Count</h3>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span style={{ color: FACTIONS.fabled.color }}>{FACTIONS.fabled.name}:</span>
                  <span className="text-white">{displayState.units.fabled}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: FACTIONS.legion.color }}>{FACTIONS.legion.name}:</span>
                  <span className="text-white">{displayState.units.legion}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: FACTIONS.crusade.color }}>{FACTIONS.crusade.name}:</span>
                  <span className="text-white">{displayState.units.crusade}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">Commands</h3>
              <div className="grid grid-cols-3 gap-2">
                <Button size="sm" variant="outline" title="Stop">
                  <Pause className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" title="Move">
                  <Navigation className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" title="Attack">
                  <Target className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <h3 className="text-white font-bold mb-2">Options</h3>
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={toggleFogOfWar}
              >
                {displayState.fogOfWar ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
                Fog of War: {displayState.fogOfWar ? 'ON' : 'OFF'}
              </Button>
            </div>

            <div>
              <p className="text-gray-400 text-sm">Selected: {displayState.selectedUnits} units</p>
              <p className="text-gray-400 text-sm">Controls: Left-click drag to select</p>
              <p className="text-gray-400 text-sm">Right-click to move</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
