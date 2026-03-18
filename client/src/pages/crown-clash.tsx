import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Pause, 
  Home, 
  Swords, 
  Crown, 
  Zap, 
  Timer,
  Users,
  Bot,
  Shield,
  Target
} from "lucide-react";

import {
  skeletonSprite,
  elfArcherSprite,
  scourgeWarriorSprite,
  orcGuardianSprite,
  fireballSprite,
  explosionSprite,
  bossShipSprite,
  shipSprite,
  grudgeWarriorSprite,
  gameboardImage,
} from "@/lib/placeholderSprites";

type Difficulty = 'easy' | 'medium' | 'hard';

interface GameCard {
  name: string;
  type: 'Troop' | 'Spell' | 'Building';
  sprite: string;
  elixirCost: number;
  health?: number;
  damage: number;
  speed?: number;
  range?: number;
  attackRate?: number;
  effectSprite?: string;
  isTank?: boolean;
  isRanged?: boolean;
  description?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  explosionOnDeath?: boolean;
  explosionDamage?: number;
  explosionRadius?: number;
  revival?: boolean;
  revivalHealth?: number;
  spawnsUnit?: string;
  spawnCount?: number;
  spawnInterval?: number;
  areaEffect?: boolean;
  areaRadius?: number;
  healAmount?: number;
  canTargetAlly?: boolean;
  canTargetEnemy?: boolean;
  slowEffect?: number;
  poisonDamage?: number;
  shieldAmount?: number;
  chargeAttack?: boolean;
  chargeDamageMultiplier?: number;
  splashDamage?: boolean;
  splashRadius?: number;
  lifetime?: number;
}

interface Unit {
  x: number;
  y: number;
  card: GameCard;
  health: number;
  maxHealth: number;
  owner: string;
  target: any;
  nextAttack: number;
  attackAnimation: number;
  isUnit: true;
  lane: 'left' | 'right' | 'center';
  shield?: number;
  hasRevived?: boolean;
  hasCharged?: boolean;
  slowedUntil?: number;
  poisonedUntil?: number;
  poisonDamagePerSecond?: number;
  rageUntil?: number;
  waypoint?: { x: number; y: number } | null;
  crossedRiver?: boolean;
}

interface Building {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  damage: number;
  range: number;
  attackRate: number;
  owner: string;
  type: 'monastery' | 'tower' | 'barracks' | 'house';
  isKing: boolean;
  nextAttack: number;
  lane: 'left' | 'right' | 'center';
  destroyed: boolean;
  spawnTimer?: number;
  spawnsUnit?: string;
}

interface Particle {
  x: number;
  y: number;
  type: string;
  duration: number;
  maxDuration: number;
  scale: number;
  opacity: number;
  isParticle: true;
  color?: string;
}

interface Projectile {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  sprite: string;
  speed: number;
  rotation: number;
  onHit?: () => void;
}

interface Effect {
  x: number;
  y: number;
  sprite: string;
  duration: number;
  isEffect: true;
}

type GameEntity = Unit | Particle | Projectile | Effect;

const CARDS: GameCard[] = [
  // === TROOP CARDS (12) ===
  { 
    name: 'Grudge Knight', type: 'Troop', sprite: 'grudgeWarrior', elixirCost: 5, 
    health: 350, damage: 75, speed: 35, range: 70, attackRate: 0.9, 
    isTank: true, isRanged: false, rarity: 'epic',
    description: 'Tanky melee warrior with high HP and damage'
  },
  { 
    name: 'Skeleton Army', type: 'Troop', sprite: 'skeleton', elixirCost: 3, 
    health: 60, damage: 25, speed: 60, range: 50, attackRate: 1.2, 
    isTank: false, isRanged: false, rarity: 'common', spawnCount: 4,
    description: 'Spawns 4 skeletons that swarm enemies'
  },
  { 
    name: 'Elf Archer', type: 'Troop', sprite: 'elfArcher', elixirCost: 4, 
    health: 90, damage: 55, speed: 40, range: 200, attackRate: 0.8, 
    isTank: false, isRanged: true, rarity: 'rare',
    description: 'Long-range archer with precise shots'
  },
  { 
    name: 'Bomber', type: 'Troop', sprite: 'scourgeWarrior', elixirCost: 3, 
    health: 80, damage: 35, speed: 45, range: 60, attackRate: 1.0, 
    isTank: false, isRanged: false, rarity: 'common',
    explosionOnDeath: true, explosionDamage: 150, explosionRadius: 80,
    description: 'Explodes on death dealing area damage'
  },
  { 
    name: 'Orc Guardian', type: 'Troop', sprite: 'orcGuardian', elixirCost: 4, 
    health: 200, damage: 50, speed: 40, range: 60, attackRate: 1.0, 
    isTank: true, isRanged: false, rarity: 'rare', shieldAmount: 100,
    description: 'Tanky guardian with a shield that absorbs damage'
  },
  { 
    name: 'Phoenix', type: 'Troop', sprite: 'fireBall', elixirCost: 5, 
    health: 150, damage: 65, speed: 50, range: 150, attackRate: 0.7, 
    isTank: false, isRanged: true, rarity: 'legendary',
    revival: true, revivalHealth: 75,
    description: 'Flying unit that revives once after death'
  },
  { 
    name: 'Ice Wizard', type: 'Troop', sprite: 'elfArcher', elixirCost: 4, 
    health: 100, damage: 40, speed: 35, range: 180, attackRate: 0.9, 
    isTank: false, isRanged: true, rarity: 'epic', slowEffect: 0.4,
    splashDamage: true, splashRadius: 60,
    description: 'Slows enemies with frost attacks'
  },
  { 
    name: 'Charger', type: 'Troop', sprite: 'grudgeWarrior', elixirCost: 4, 
    health: 180, damage: 40, speed: 70, range: 50, attackRate: 1.1, 
    isTank: false, isRanged: false, rarity: 'rare',
    chargeAttack: true, chargeDamageMultiplier: 3.0,
    description: 'Charges at enemies for triple damage on first hit'
  },
  { 
    name: 'Poison Spider', type: 'Troop', sprite: 'skeleton', elixirCost: 2, 
    health: 50, damage: 20, speed: 55, range: 40, attackRate: 1.5, 
    isTank: false, isRanged: false, rarity: 'common', poisonDamage: 15,
    description: 'Applies poison damage over time'
  },
  { 
    name: 'Giant', type: 'Troop', sprite: 'bossShip', elixirCost: 6, 
    health: 800, damage: 100, speed: 20, range: 80, attackRate: 0.5, 
    isTank: true, isRanged: false, rarity: 'epic',
    description: 'Massive tank that targets buildings'
  },
  { 
    name: 'Minions', type: 'Troop', sprite: 'elfArcher', elixirCost: 3, 
    health: 45, damage: 35, speed: 55, range: 120, attackRate: 1.0, 
    isTank: false, isRanged: true, rarity: 'common', spawnCount: 3,
    description: 'Fast flying ranged attackers in groups of 3'
  },
  { 
    name: 'Dark Prince', type: 'Troop', sprite: 'scourgeWarrior', elixirCost: 5, 
    health: 280, damage: 80, speed: 45, range: 70, attackRate: 0.8, 
    isTank: true, isRanged: false, rarity: 'epic', shieldAmount: 150,
    splashDamage: true, splashRadius: 50,
    description: 'Shielded warrior with splash damage'
  },
  
  // === SPELL CARDS (5) ===
  { 
    name: 'Fireball', type: 'Spell', sprite: 'fireBall', effectSprite: 'explosion', 
    elixirCost: 4, damage: 280, rarity: 'rare',
    areaEffect: true, areaRadius: 100, canTargetEnemy: true, canTargetAlly: false,
    description: 'Deals area damage to enemy units and buildings'
  },
  { 
    name: 'Heal Spell', type: 'Spell', sprite: 'explosion', effectSprite: 'explosion', 
    elixirCost: 3, damage: 0, healAmount: 200, rarity: 'rare',
    areaEffect: true, areaRadius: 80, canTargetEnemy: false, canTargetAlly: true,
    description: 'Heals friendly troops in an area'
  },
  { 
    name: 'Freeze', type: 'Spell', sprite: 'elfArcher', effectSprite: 'explosion', 
    elixirCost: 4, damage: 50, rarity: 'epic',
    areaEffect: true, areaRadius: 90, slowEffect: 1.0, canTargetEnemy: true, canTargetAlly: false,
    description: 'Freezes all enemies in area for 3 seconds'
  },
  { 
    name: 'Poison', type: 'Spell', sprite: 'skeleton', effectSprite: 'explosion', 
    elixirCost: 4, damage: 0, poisonDamage: 40, rarity: 'epic', lifetime: 5,
    areaEffect: true, areaRadius: 120, canTargetEnemy: true, canTargetAlly: false,
    description: 'Deals damage over time in a large area'
  },
  { 
    name: 'Rage', type: 'Spell', sprite: 'fireBall', effectSprite: 'explosion', 
    elixirCost: 2, damage: 0, rarity: 'epic', lifetime: 6,
    areaEffect: true, areaRadius: 100, canTargetEnemy: false, canTargetAlly: true,
    description: 'Boosts attack speed of friendly units by 40%'
  },
  
  // === BUILDING CARDS (3) ===
  { 
    name: 'Barracks', type: 'Building', sprite: 'orcGuardian', 
    elixirCost: 5, health: 600, damage: 0, rarity: 'rare', lifetime: 40,
    spawnsUnit: 'Skeleton Army', spawnInterval: 8,
    description: 'Spawns skeleton warriors every 8 seconds'
  },
  { 
    name: 'Cannon', type: 'Building', sprite: 'bossShip', 
    elixirCost: 3, health: 400, damage: 80, range: 150, attackRate: 1.2, rarity: 'common', lifetime: 30,
    description: 'Defensive building that shoots ground enemies'
  },
  { 
    name: 'Goblin Hut', type: 'Building', sprite: 'skeleton', 
    elixirCost: 4, health: 500, damage: 0, rarity: 'rare', lifetime: 45,
    spawnsUnit: 'Minions', spawnInterval: 6,
    description: 'Spawns spear goblins every 6 seconds'
  }
];

const SPRITE_IMAGES: Record<string, string> = {
  grudgeWarrior: grudgeWarriorSprite,
  skeleton: skeletonSprite,
  elfArcher: elfArcherSprite,
  scourgeWarrior: scourgeWarriorSprite,
  orcGuardian: orcGuardianSprite,
  fireBall: fireballSprite,
  explosion: explosionSprite,
  bossShip: bossShipSprite,
  ship1: shipSprite
};

const DIFFICULTY_COLORS: Record<Difficulty, { primary: string; secondary: string; name: string }> = {
  easy: { primary: '#fbbf24', secondary: '#f59e0b', name: 'Easy' },
  medium: { primary: '#3b82f6', secondary: '#2563eb', name: 'Medium' },
  hard: { primary: '#dc2626', secondary: '#b91c1c', name: 'Hard' }
};

const PLAYER_COLORS = { primary: '#1a1a1a', secondary: '#333333', accent: '#666666' };

const AI_SETTINGS: Record<Difficulty, { playDelay: number; accuracy: number; comboProbability: number; elixirThreshold: number }> = {
  easy: { playDelay: 2.5, accuracy: 0.5, comboProbability: 0.1, elixirThreshold: 8 },
  medium: { playDelay: 1.5, accuracy: 0.7, comboProbability: 0.35, elixirThreshold: 6 },
  hard: { playDelay: 0.8, accuracy: 0.9, comboProbability: 0.6, elixirThreshold: 4 }
};

const GAME_DURATION = 180;
const OVERTIME_DURATION = 60;
const ELIXIR_REGEN_RATE = 1 / 2.8;
const OVERTIME_ELIXIR_RATE = 1 / 1.4;
const MAX_ELIXIR = 10;

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 540;
const LANE_DIVIDER = CANVAS_WIDTH / 2;
const RIVER_Y = CANVAS_HEIGHT / 2;
const RIVER_HEIGHT = 28;
const BRIDGE_WIDTH = 50;

// Bridge navigation waypoints - units must cross river at these points
const LEFT_BRIDGE_CENTER_X = BRIDGE_WIDTH + BRIDGE_WIDTH / 2; // 75
const RIGHT_BRIDGE_CENTER_X = CANVAS_WIDTH - BRIDGE_WIDTH * 1.5; // 285
const RIVER_TOP = RIVER_Y - RIVER_HEIGHT / 2; // 256
const RIVER_BOTTOM = RIVER_Y + RIVER_HEIGHT / 2; // 284

interface AIState {
  lastPlayTime: number;
  playDelay: number;
  threatLevel: { left: number; right: number };
  preferredLane: 'left' | 'right' | null;
  counterAttacking: boolean;
  savedElixir: number;
  difficulty: Difficulty;
  comboBuffer: GameCard[];
}

const backgroundImageRef = { current: null as HTMLImageElement | null, loaded: false };

function loadBackgroundImage() {
  if (!backgroundImageRef.current) {
    const img = new Image();
    img.src = gameboardImage;
    img.onload = () => {
      backgroundImageRef.loaded = true;
    };
    backgroundImageRef.current = img;
  }
}

function drawArenaMap(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  // Enemy territory (top) - darker red tinted
  const enemyGradient = ctx.createLinearGradient(0, 0, 0, RIVER_Y - RIVER_HEIGHT/2);
  enemyGradient.addColorStop(0, '#2a1a1a');
  enemyGradient.addColorStop(1, '#3a2525');
  ctx.fillStyle = enemyGradient;
  ctx.fillRect(0, 0, canvas.width, RIVER_Y - RIVER_HEIGHT/2);
  
  // Player territory (bottom) - darker gray/blue tinted  
  const playerGradient = ctx.createLinearGradient(0, RIVER_Y + RIVER_HEIGHT/2, 0, canvas.height);
  playerGradient.addColorStop(0, '#252530');
  playerGradient.addColorStop(1, '#1a1a25');
  ctx.fillStyle = playerGradient;
  ctx.fillRect(0, RIVER_Y + RIVER_HEIGHT/2, canvas.width, canvas.height - RIVER_Y - RIVER_HEIGHT/2);
  
  // Grid pattern for both territories
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < canvas.width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }
  
  // River (middle divider)
  const riverGradient = ctx.createLinearGradient(0, RIVER_Y - RIVER_HEIGHT/2, 0, RIVER_Y + RIVER_HEIGHT/2);
  riverGradient.addColorStop(0, '#1a4a6a');
  riverGradient.addColorStop(0.5, '#2a6a9a');
  riverGradient.addColorStop(1, '#1a4a6a');
  ctx.fillStyle = riverGradient;
  ctx.fillRect(0, RIVER_Y - RIVER_HEIGHT/2, canvas.width, RIVER_HEIGHT);
  
  // River waves animation effect
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.3)';
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, RIVER_Y - 5);
    ctx.quadraticCurveTo(x + 10, RIVER_Y - 10, x + 20, RIVER_Y - 5);
    ctx.stroke();
  }
  
  // Left bridge
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(BRIDGE_WIDTH, RIVER_Y - RIVER_HEIGHT/2 - 5, BRIDGE_WIDTH, RIVER_HEIGHT + 10);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 3;
  ctx.strokeRect(BRIDGE_WIDTH, RIVER_Y - RIVER_HEIGHT/2 - 5, BRIDGE_WIDTH, RIVER_HEIGHT + 10);
  // Bridge planks
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 1;
  for (let y = RIVER_Y - RIVER_HEIGHT/2; y < RIVER_Y + RIVER_HEIGHT/2; y += 8) {
    ctx.beginPath();
    ctx.moveTo(BRIDGE_WIDTH + 5, y);
    ctx.lineTo(BRIDGE_WIDTH + BRIDGE_WIDTH - 5, y);
    ctx.stroke();
  }
  
  // Right bridge
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(canvas.width - BRIDGE_WIDTH * 2, RIVER_Y - RIVER_HEIGHT/2 - 5, BRIDGE_WIDTH, RIVER_HEIGHT + 10);
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = 3;
  ctx.strokeRect(canvas.width - BRIDGE_WIDTH * 2, RIVER_Y - RIVER_HEIGHT/2 - 5, BRIDGE_WIDTH, RIVER_HEIGHT + 10);
  // Bridge planks
  ctx.strokeStyle = '#2a1a0a';
  ctx.lineWidth = 1;
  for (let y = RIVER_Y - RIVER_HEIGHT/2; y < RIVER_Y + RIVER_HEIGHT/2; y += 8) {
    ctx.beginPath();
    ctx.moveTo(canvas.width - BRIDGE_WIDTH * 2 + 5, y);
    ctx.lineTo(canvas.width - BRIDGE_WIDTH - 5, y);
    ctx.stroke();
  }
  
  // Lane divider line (center)
  ctx.strokeStyle = 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, RIVER_Y - RIVER_HEIGHT/2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, RIVER_Y + RIVER_HEIGHT/2);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // Territory labels
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,100,100,0.5)';
  ctx.fillText('ENEMY TERRITORY', canvas.width / 2, 20);
  ctx.fillStyle = 'rgba(100,150,255,0.5)';
  ctx.fillText('YOUR TERRITORY', canvas.width / 2, canvas.height - 110);
}

function drawBuilding(
  ctx: CanvasRenderingContext2D, 
  building: Building, 
  isPlayer: boolean,
  difficulty: Difficulty
) {
  if (building.destroyed) return;
  
  const colors = isPlayer ? PLAYER_COLORS : DIFFICULTY_COLORS[difficulty];
  const baseColor = isPlayer ? colors.primary : colors.primary;
  const accentColor = isPlayer ? colors.secondary : colors.secondary;
  
  ctx.save();
  
  if (building.type === 'monastery' || building.isKing) {
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(building.x, building.y, 40, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(building.x - 25, building.y + 22);
    ctx.lineTo(building.x - 25, building.y - 18);
    ctx.lineTo(building.x - 18, building.y - 28);
    ctx.lineTo(building.x - 10, building.y - 18);
    ctx.lineTo(building.x - 10, building.y - 32);
    ctx.lineTo(building.x, building.y - 40);
    ctx.lineTo(building.x + 10, building.y - 32);
    ctx.lineTo(building.x + 10, building.y - 18);
    ctx.lineTo(building.x + 18, building.y - 28);
    ctx.lineTo(building.x + 25, building.y - 18);
    ctx.lineTo(building.x + 25, building.y + 22);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(building.x - 7, building.y + 4, 14, 18);
    
    ctx.fillStyle = isPlayer ? '#333' : accentColor;
    ctx.beginPath();
    ctx.arc(building.x, building.y - 18, 9, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('♛', building.x, building.y - 44);
    
  } else if (building.type === 'tower') {
    ctx.fillStyle = baseColor;
    ctx.beginPath();
    ctx.arc(building.x, building.y, 28, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(building.x - 16, building.y + 14);
    ctx.lineTo(building.x - 20, building.y - 10);
    ctx.lineTo(building.x - 12, building.y - 20);
    ctx.lineTo(building.x, building.y - 25);
    ctx.lineTo(building.x + 12, building.y - 20);
    ctx.lineTo(building.x + 20, building.y - 10);
    ctx.lineTo(building.x + 16, building.y + 14);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(building.x - 5, building.y + 2, 10, 12);
    
    ctx.fillStyle = isPlayer ? '#333' : accentColor;
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(building.x - 11 + i * 9, building.y - 16, 5, 6);
    }
    
  } else if (building.type === 'barracks' || building.type === 'house') {
    ctx.fillStyle = baseColor;
    ctx.fillRect(building.x - 25, building.y - 20, 50, 40);
    
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(building.x - 30, building.y - 20);
    ctx.lineTo(building.x, building.y - 40);
    ctx.lineTo(building.x + 30, building.y - 20);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(building.x - 25, building.y - 20, 50, 40);
    
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(building.x - 6, building.y, 12, 20);
    
    if (building.type === 'barracks') {
      ctx.fillStyle = isPlayer ? '#555' : accentColor;
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('⚔', building.x, building.y - 25);
    }
  }
  
  ctx.restore();
  
  const healthPercent = building.health / building.maxHealth;
  const barWidth = building.isKing ? 80 : 55;
  const barY = building.y - (building.isKing ? 75 : 55);
  
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(building.x - barWidth / 2, barY, barWidth, 8);
  
  ctx.fillStyle = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';
  ctx.fillRect(building.x - barWidth / 2, barY, barWidth * healthPercent, 8);
  
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.strokeRect(building.x - barWidth / 2, barY, barWidth, 8);
}

export default function CrownClash() {
  const { user } = useAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImagesRef = useRef<Record<string, HTMLImageElement>>({});
  const animationFrameRef = useRef<number>();
  
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'ended'>('menu');
  const [gameMode, setGameMode] = useState<'solo' | 'pvp'>('solo');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  const [playerElixir, setPlayerElixir] = useState(5);
  const [enemyElixir, setEnemyElixir] = useState(5);
  const [playerCrowns, setPlayerCrowns] = useState(0);
  const [enemyCrowns, setEnemyCrowns] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [hand, setHand] = useState<GameCard[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [isOvertime, setIsOvertime] = useState(false);
  const [nextCard, setNextCard] = useState<GameCard | null>(null);

  const aiStateRef = useRef<AIState>({
    lastPlayTime: 0,
    playDelay: 1.5,
    threatLevel: { left: 0, right: 0 },
    preferredLane: null,
    counterAttacking: false,
    savedElixir: 0,
    difficulty: 'medium',
    comboBuffer: []
  });

  const gameDataRef = useRef({
    units: [] as GameEntity[],
    buildings: [] as Building[],
    drawPile: [...CARDS],
    hand: [] as GameCard[],
    aiHand: [] as GameCard[],
    aiDrawPile: [...CARDS],
    lastTime: 0,
    gameTime: 0,
    player1: { elixir: 5, crowns: 0 },
    player2: { elixir: 5, crowns: 0 },
    selectedCardIndex: null as number | null,
    gameEnded: false,
    difficulty: 'medium' as Difficulty,
    isOvertime: false
  });

  useEffect(() => {
    let loadedCount = 0;
    const totalImages = Object.keys(SPRITE_IMAGES).length;
    
    if (totalImages === 0) {
      setImagesLoaded(true);
      return;
    }
    
    Object.entries(SPRITE_IMAGES).forEach(([key, src]) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = src;
      img.onload = () => {
        loadedImagesRef.current[key] = img;
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
      img.onerror = () => {
        console.warn(`Failed to load image: ${key}`);
        loadedCount++;
        if (loadedCount === totalImages) {
          setImagesLoaded(true);
        }
      };
    });
  }, []);

  const shuffleDeck = useCallback((deck: GameCard[]) => {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }, []);

  const drawCard = useCallback(() => {
    const data = gameDataRef.current;
    if (data.hand.length < 4 && data.drawPile.length > 0) {
      data.hand.push(data.drawPile.shift()!);
      if (data.drawPile.length === 0) {
        data.drawPile = shuffleDeck([...CARDS]);
      }
    }
    setHand([...data.hand]);
    setNextCard(data.drawPile.length > 0 ? data.drawPile[0] : null);
  }, [shuffleDeck]);

  const drawAICard = useCallback(() => {
    const data = gameDataRef.current;
    if (data.aiHand.length < 4 && data.aiDrawPile.length > 0) {
      data.aiHand.push(data.aiDrawPile.shift()!);
      if (data.aiDrawPile.length === 0) {
        data.aiDrawPile = shuffleDeck([...CARDS]);
      }
    }
  }, [shuffleDeck]);

  const initializeBuildings = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    loadBackgroundImage();
    
    gameDataRef.current.buildings = [
      { x: 180, y: 450, health: 4000, maxHealth: 4000, damage: 120, range: 120, attackRate: 0.8, owner: 'player1', type: 'monastery', isKing: true, nextAttack: 0, lane: 'center', destroyed: false },
      { x: 70, y: 360, health: 2000, maxHealth: 2000, damage: 90, range: 100, attackRate: 1, owner: 'player1', type: 'tower', isKing: false, nextAttack: 0, lane: 'left', destroyed: false },
      { x: 290, y: 360, health: 2000, maxHealth: 2000, damage: 90, range: 100, attackRate: 1, owner: 'player1', type: 'tower', isKing: false, nextAttack: 0, lane: 'right', destroyed: false },
      
      { x: 180, y: 90, health: 4000, maxHealth: 4000, damage: 120, range: 120, attackRate: 0.8, owner: 'player2', type: 'monastery', isKing: true, nextAttack: 0, lane: 'center', destroyed: false },
      { x: 70, y: 180, health: 2000, maxHealth: 2000, damage: 90, range: 100, attackRate: 1, owner: 'player2', type: 'tower', isKing: false, nextAttack: 0, lane: 'left', destroyed: false },
      { x: 290, y: 180, health: 2000, maxHealth: 2000, damage: 90, range: 100, attackRate: 1, owner: 'player2', type: 'tower', isKing: false, nextAttack: 0, lane: 'right', destroyed: false }
    ];
  }, []);

  const addParticle = useCallback((x: number, y: number, type: string, duration: number, color?: string) => {
    gameDataRef.current.units.push({
      x, y, type, duration,
      maxDuration: duration,
      scale: 1,
      opacity: 1,
      isParticle: true,
      color
    } as Particle);
  }, []);

  const addProjectile = useCallback((startX: number, startY: number, targetX: number, targetY: number, sprite: string, speed: number, onHit?: () => void) => {
    gameDataRef.current.units.push({
      x: startX,
      y: startY,
      targetX,
      targetY,
      sprite,
      speed,
      onHit,
      rotation: Math.atan2(targetY - startY, targetX - startX)
    } as Projectile);
  }, []);

  const getLane = useCallback((x: number): 'left' | 'right' | 'center' => {
    if (x < LANE_DIVIDER - 50) return 'left';
    if (x > LANE_DIVIDER + 50) return 'right';
    return 'center';
  }, []);

  // Check if unit is on a bridge (can cross river)
  const isOnBridge = useCallback((x: number): boolean => {
    const leftBridgeMin = BRIDGE_WIDTH;
    const leftBridgeMax = BRIDGE_WIDTH * 2;
    const rightBridgeMin = CANVAS_WIDTH - BRIDGE_WIDTH * 2;
    const rightBridgeMax = CANVAS_WIDTH - BRIDGE_WIDTH;
    return (x >= leftBridgeMin && x <= leftBridgeMax) || (x >= rightBridgeMin && x <= rightBridgeMax);
  }, []);

  // Calculate bridge waypoint for a unit that needs to cross the river
  const getBridgeWaypoint = useCallback((unit: Unit): { x: number; y: number } | null => {
    if (!unit.target) return null;
    
    const targetY = unit.target.y;
    const unitY = unit.y;
    
    // Check if unit needs to cross the river (target is on opposite side)
    const unitAboveRiver = unitY < RIVER_TOP;
    const unitBelowRiver = unitY > RIVER_BOTTOM;
    const targetAboveRiver = targetY < RIVER_TOP;
    const targetBelowRiver = targetY > RIVER_BOTTOM;
    
    // If already crossed or same side of river, no waypoint needed
    if ((unitAboveRiver && targetAboveRiver) || (unitBelowRiver && targetBelowRiver)) {
      return null;
    }
    
    // If unit is currently in river zone and on a bridge, continue through
    if (unitY >= RIVER_TOP && unitY <= RIVER_BOTTOM) {
      if (isOnBridge(unit.x)) return null;
      // Unit is in river but NOT on bridge - needs to get to bridge
    }
    
    // Choose the bridge closest to unit's lane/position
    const unitLane = unit.lane;
    let bridgeX: number;
    
    if (unitLane === 'left') {
      bridgeX = LEFT_BRIDGE_CENTER_X;
    } else if (unitLane === 'right') {
      bridgeX = RIGHT_BRIDGE_CENTER_X;
    } else {
      // Center lane - pick closest bridge
      const distToLeft = Math.abs(unit.x - LEFT_BRIDGE_CENTER_X);
      const distToRight = Math.abs(unit.x - RIGHT_BRIDGE_CENTER_X);
      bridgeX = distToLeft < distToRight ? LEFT_BRIDGE_CENTER_X : RIGHT_BRIDGE_CENTER_X;
    }
    
    // Waypoint is at the bridge, on the river edge closest to the unit
    const waypointY = unitY < RIVER_Y ? RIVER_TOP : RIVER_BOTTOM;
    
    return { x: bridgeX, y: waypointY };
  }, [isOnBridge]);

  const findTarget = useCallback((unit: Unit) => {
    const data = gameDataRef.current;
    const enemyOwner = unit.owner === 'player1' ? 'player2' : 'player1';
    
    let targets: { x: number; y: number; obj: any; priority: number }[] = [];
    
    data.units
      .filter((u): u is Unit => 'isUnit' in u && u.isUnit && u.owner === enemyOwner)
      .forEach(u => {
        const dist = Math.hypot(u.x - unit.x, u.y - unit.y);
        let priority = 100 - (dist / 10);
        if (u.lane === unit.lane) priority += 20;
        targets.push({ x: u.x, y: u.y, obj: u, priority });
      });
    
    const frontBuildingsDestroyed = data.buildings
      .filter(b => b.owner === enemyOwner && !b.isKing)
      .every(b => b.destroyed);
    
    data.buildings
      .filter(b => b.owner === enemyOwner && !b.destroyed)
      .forEach(b => {
        if (b.isKing && !frontBuildingsDestroyed) return;
        
        const dist = Math.hypot(b.x - unit.x, b.y - unit.y);
        let priority = 50 - (dist / 20);
        if (b.lane === unit.lane) priority += 30;
        if (b.isKing) priority += 40;
        targets.push({ x: b.x, y: b.y, obj: b, priority });
      });
    
    targets.sort((a, b) => b.priority - a.priority);
    unit.target = targets[0]?.obj || null;
  }, []);

  const checkBuildingDestruction = useCallback((building: Building) => {
    const data = gameDataRef.current;
    if (building.health <= 0 && !building.destroyed) {
      building.destroyed = true;
      building.health = 0;
      
      const particleColor = building.owner === 'player1' ? '#333' : DIFFICULTY_COLORS[data.difficulty].primary;
      for (let i = 0; i < 15; i++) {
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * 50;
        addParticle(
          building.x + Math.cos(angle) * distance,
          building.y + Math.sin(angle) * distance,
          'explosion',
          0.7,
          particleColor
        );
      }
      
      if (building.isKing) {
        if (building.owner === 'player1') {
          data.player2.crowns = 3;
          setEnemyCrowns(3);
          setWinner('AI');
        } else {
          data.player1.crowns = 3;
          setPlayerCrowns(3);
          setWinner('You');
        }
        endGame();
      } else {
        if (building.owner === 'player1') {
          data.player2.crowns++;
          setEnemyCrowns(data.player2.crowns);
        } else {
          data.player1.crowns++;
          setPlayerCrowns(data.player1.crowns);
        }
      }
    }
  }, [addParticle]);

  const castSpell = useCallback((card: GameCard, x: number, y: number, caster: string) => {
    const data = gameDataRef.current;
    const enemyOwner = caster === 'player1' ? 'player2' : 'player1';
    
    const frontBuildingsDestroyed = data.buildings
      .filter(b => b.owner === enemyOwner && !b.isKing)
      .every(b => b.destroyed);
    
    data.units.forEach(unit => {
      if (!('isUnit' in unit) || !unit.isUnit) return;
      const dist = Math.hypot(unit.x - x, unit.y - y);
      if (dist < 120 && (unit as Unit).owner === enemyOwner) {
        (unit as Unit).health -= card.damage;
        addParticle(unit.x, unit.y - 20, 'damage', 0.5);
      }
    });
    
    data.buildings.forEach(building => {
      if (building.destroyed) return;
      if (building.isKing && !frontBuildingsDestroyed) return;
      
      const dist = Math.hypot(building.x - x, building.y - y);
      if (dist < 120 && building.owner === enemyOwner) {
        building.health -= card.damage;
        addParticle(building.x, building.y - 20, 'damage', 0.5);
        checkBuildingDestruction(building);
      }
    });
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 60;
      addParticle(
        x + Math.cos(angle) * dist,
        y + Math.sin(angle) * dist,
        'spell_ring',
        0.5,
        '#ff6600'
      );
    }
  }, [addParticle, checkBuildingDestruction]);

  const playCard = useCallback((card: GameCard, x: number, y: number, owner: string = 'player1') => {
    const data = gameDataRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const playerData = owner === 'player1' ? data.player1 : data.player2;
    if (playerData.elixir < card.elixirCost) return;
    
    playerData.elixir -= card.elixirCost;
    if (owner === 'player1') {
      setPlayerElixir(playerData.elixir);
      data.hand = data.hand.filter(c => c !== card);
      setHand([...data.hand]);
      drawCard();
    } else {
      data.aiHand = data.aiHand.filter(c => c !== card);
      drawAICard();
    }
    
    addParticle(x, y, 'spawn', 0.4);

    if (card.type === 'Troop') {
      const spawnCount = card.spawnCount || 1;
      for (let i = 0; i < spawnCount; i++) {
        const offsetX = spawnCount > 1 ? (Math.random() - 0.5) * 40 : 0;
        const offsetY = spawnCount > 1 ? (Math.random() - 0.5) * 40 : 0;
        const unit: Unit = {
          x: x + offsetX, 
          y: y + offsetY, 
          card,
          health: card.health!,
          maxHealth: card.health!,
          owner,
          target: null,
          nextAttack: 0,
          attackAnimation: 0,
          isUnit: true,
          lane: getLane(x),
          shield: card.shieldAmount,
          hasRevived: false,
          hasCharged: false
        };
        data.units.push(unit);
        findTarget(unit);
      }
    } else if (card.type === 'Spell') {
      const startY = owner === 'player1' ? canvas.height - 50 : 50;
      addProjectile(canvas.width / 2, startY, x, y, card.sprite, 400, () => {
        data.units.push({ x, y, sprite: card.effectSprite!, duration: 1.2, isEffect: true } as Effect);
        castSpell(card, x, y, owner);
      });
    } else if (card.type === 'Building') {
      const buildingY = owner === 'player1' ? Math.max(y, RIVER_Y + 50) : Math.min(y, RIVER_Y - 50);
      const building: Building = {
        x: x,
        y: buildingY,
        health: card.health || 500,
        maxHealth: card.health || 500,
        damage: card.damage || 0,
        range: card.range || 150,
        attackRate: card.attackRate || 1.0,
        owner,
        type: 'barracks',
        isKing: false,
        nextAttack: 0,
        lane: getLane(x),
        destroyed: false,
        spawnTimer: card.spawnInterval ? data.gameTime + card.spawnInterval : undefined,
        spawnsUnit: card.spawnsUnit
      };
      data.buildings.push(building);
    }
  }, [addParticle, addProjectile, castSpell, drawCard, drawAICard, findTarget, getLane]);

  const updateUnits = useCallback((delta: number) => {
    const data = gameDataRef.current;
    
    const deadUnits: Unit[] = [];
    data.units = data.units.filter(unit => {
      if (!('isUnit' in unit) || !unit.isUnit) return true;
      const u = unit as Unit;
      if (u.health <= 0) {
        if (u.card.revival && !u.hasRevived) {
          u.health = u.card.revivalHealth || 50;
          u.hasRevived = true;
          addParticle(u.x, u.y, 'spawn', 0.5, '#ffcc00');
          return true;
        }
        deadUnits.push(u);
        return false;
      }
      return true;
    });
    
    deadUnits.forEach(u => {
      if (u.card.explosionOnDeath) {
        addParticle(u.x, u.y, 'explosion', 0.6);
        const enemyOwner = u.owner === 'player1' ? 'player2' : 'player1';
        data.units.forEach(target => {
          if ('isUnit' in target && target.isUnit && (target as Unit).owner === enemyOwner) {
            const dist = Math.hypot((target as Unit).x - u.x, (target as Unit).y - u.y);
            if (dist < (u.card.explosionRadius || 80)) {
              (target as Unit).health -= u.card.explosionDamage || 100;
            }
          }
        });
        data.buildings.forEach(b => {
          if (b.owner === enemyOwner && !b.destroyed) {
            const dist = Math.hypot(b.x - u.x, b.y - u.y);
            if (dist < (u.card.explosionRadius || 80)) {
              b.health -= u.card.explosionDamage || 100;
            }
          }
        });
      }
    });
    
    data.units.forEach(unit => {
      if (!('isUnit' in unit) || !unit.isUnit) return;
      const u = unit as Unit;
      
      if (!u.target || (u.target.health !== undefined && u.target.health <= 0) || u.target.destroyed) {
        findTarget(u);
      }
      
      if (u.target) {
        // Determine positions relative to river
        const unitAboveRiver = u.y < RIVER_TOP;
        const unitBelowRiver = u.y > RIVER_BOTTOM;
        const unitInRiver = !unitAboveRiver && !unitBelowRiver;
        const targetAboveRiver = u.target.y < RIVER_TOP;
        const targetBelowRiver = u.target.y > RIVER_BOTTOM;
        
        // Determine if unit needs to cross river to reach target
        const needsCrossing = (unitAboveRiver && targetBelowRiver) || (unitBelowRiver && targetAboveRiver) || 
                              (unitInRiver && !isOnBridge(u.x));
        
        // Handle units that are in the river but not on a bridge
        if (unitInRiver && !isOnBridge(u.x)) {
          // Unit is in water illegally - get nearest bridge
          if (!u.waypoint) {
            const distToLeft = Math.abs(u.x - LEFT_BRIDGE_CENTER_X);
            const distToRight = Math.abs(u.x - RIGHT_BRIDGE_CENTER_X);
            const nearestBridgeX = distToLeft < distToRight ? LEFT_BRIDGE_CENTER_X : RIGHT_BRIDGE_CENTER_X;
            u.waypoint = { x: nearestBridgeX, y: u.y };
          }
        }
        
        // If we have a waypoint, check if we've reached it
        if (u.waypoint) {
          const dxWp = u.waypoint.x - u.x;
          const dyWp = u.waypoint.y - u.y;
          const distToWaypoint = Math.hypot(dxWp, dyWp);
          
          if (distToWaypoint < 12) {
            // Reached waypoint - determine next step
            if (unitInRiver && isOnBridge(u.x)) {
              // On bridge, continue to exit on correct side
              if (u.owner === 'player1') {
                u.waypoint = { x: u.x, y: RIVER_TOP - 25 };
              } else {
                u.waypoint = { x: u.x, y: RIVER_BOTTOM + 25 };
              }
            } else if (!unitInRiver) {
              // Exited the river - clear waypoint
              u.waypoint = null;
            }
          }
        }
        
        // Set initial crossing waypoint if needed and no waypoint exists
        if (needsCrossing && !u.waypoint && !unitInRiver) {
          const newWaypoint = getBridgeWaypoint(u);
          if (newWaypoint) {
            u.waypoint = newWaypoint;
          }
        }
        
        // Determine movement target and attack logic
        let moveToX: number;
        let moveToY: number;
        let shouldMove = false;
        let canAttack = false;
        
        if (u.waypoint) {
          // Always move toward waypoint when one exists
          moveToX = u.waypoint.x;
          moveToY = u.waypoint.y;
          shouldMove = true;
        } else {
          // No waypoint - move directly toward target if not in range
          const dx = u.target.x - u.x;
          const dy = u.target.y - u.y;
          const distToTarget = Math.hypot(dx, dy);
          
          if (distToTarget > u.card.range!) {
            moveToX = u.target.x;
            moveToY = u.target.y;
            shouldMove = true;
          } else {
            canAttack = true;
          }
        }
        
        if (shouldMove) {
          const moveDx = moveToX! - u.x;
          const moveDy = moveToY! - u.y;
          const angle = Math.atan2(moveDy, moveDx);
          u.x += Math.cos(angle) * u.card.speed! * delta;
          u.y += Math.sin(angle) * u.card.speed! * delta;
        } else if (canAttack && data.gameTime >= u.nextAttack) {
          u.attackAnimation = 0.2;
          
          let damage = u.card.damage;
          if (u.card.chargeAttack && !u.hasCharged) {
            damage *= u.card.chargeDamageMultiplier || 2;
            u.hasCharged = true;
            addParticle(u.x, u.y, 'spawn', 0.3, '#ff4400');
          }
          
          const dealDamage = (target: any, dmg: number) => {
            if ('isUnit' in target && target.shield && target.shield > 0) {
              const shieldDmg = Math.min(target.shield, dmg);
              target.shield -= shieldDmg;
              dmg -= shieldDmg;
              if (target.shield <= 0) {
                addParticle(target.x, target.y, 'spawn', 0.3, '#6666ff');
              }
            }
            if (dmg > 0) {
              target.health -= dmg;
            }
          };
          
          if (u.card.range! > 80 || u.card.isRanged) {
            addProjectile(u.x, u.y, u.target.x, u.target.y, 'fireBall', 280, () => {
              if (u.target && u.target.health > 0) {
                dealDamage(u.target, damage);
                addParticle(u.target.x, u.target.y - 20, 'damage', 0.5);
                if (u.target.isKing !== undefined) checkBuildingDestruction(u.target);
              }
            });
          } else {
            if (u.target.health > 0) {
              dealDamage(u.target, damage);
              addParticle(u.target.x, u.target.y - 20, 'damage', 0.5);
              if (u.target.isKing !== undefined) checkBuildingDestruction(u.target);
            }
          }
          u.nextAttack = data.gameTime + 1 / u.card.attackRate!;
        }
        
        if (u.attackAnimation > 0) {
          u.attackAnimation -= delta;
        }
      }
    });
  }, [addParticle, addProjectile, checkBuildingDestruction, findTarget, getBridgeWaypoint, isOnBridge]);

  const updateBuildings = useCallback((delta: number) => {
    const data = gameDataRef.current;
    
    data.buildings.forEach(building => {
      if (building.destroyed) return;
      
      if (building.spawnsUnit && building.spawnTimer && data.gameTime >= building.spawnTimer) {
        const spawnCard = CARDS.find(c => c.name === building.spawnsUnit);
        if (spawnCard) {
          const spawnX = building.x + (Math.random() - 0.5) * 30;
          const spawnY = building.owner === 'player1' ? building.y - 40 : building.y + 40;
          const unit: Unit = {
            x: spawnX,
            y: spawnY,
            card: spawnCard,
            health: spawnCard.health || 60,
            maxHealth: spawnCard.health || 60,
            owner: building.owner,
            target: null,
            nextAttack: 0,
            attackAnimation: 0,
            isUnit: true,
            lane: building.lane,
            shield: spawnCard.shieldAmount,
            hasRevived: false,
            hasCharged: false
          };
          data.units.push(unit);
          addParticle(spawnX, spawnY, 'spawn', 0.3);
        }
        building.spawnTimer = data.gameTime + 8;
      }
      
      const enemyOwner = building.owner === 'player1' ? 'player2' : 'player1';
      let potentialTargets = data.units
        .filter((u): u is Unit => 'isUnit' in u && u.isUnit && u.owner === enemyOwner)
        .map(u => ({ unit: u, dist: Math.hypot(u.x - building.x, u.y - building.y) }))
        .filter(t => t.dist < building.range)
        .sort((a, b) => a.dist - b.dist);
      
      const target = potentialTargets[0]?.unit;
      
      if (target && building.damage > 0 && data.gameTime >= building.nextAttack) {
        addProjectile(building.x, building.y - 20, target.x, target.y, 'fireBall', 320, () => {
          if (target.health > 0) {
            target.health -= building.damage;
            addParticle(target.x, target.y - 20, 'damage', 0.5);
          }
        });
        building.nextAttack = data.gameTime + 1 / building.attackRate;
      }
    });
  }, [addParticle, addProjectile]);

  const updateProjectiles = useCallback((delta: number) => {
    const data = gameDataRef.current;
    data.units = data.units.filter(p => {
      if (!('targetX' in p)) return true;
      const proj = p as Projectile;
      const dx = proj.targetX - proj.x;
      const dy = proj.targetY - proj.y;
      const dist = Math.hypot(dx, dy);
      if (dist < proj.speed * delta) {
        if (proj.onHit) proj.onHit();
        addParticle(proj.targetX, proj.targetY, 'explosion', 0.35);
        return false;
      }
      const angle = Math.atan2(dy, dx);
      proj.x += Math.cos(angle) * proj.speed * delta;
      proj.y += Math.sin(angle) * proj.speed * delta;
      proj.rotation = angle;
      return true;
    });
  }, [addParticle]);

  const updateParticles = useCallback((delta: number) => {
    const data = gameDataRef.current;
    data.units = data.units.filter(p => {
      if (!('isParticle' in p) || !p.isParticle) return true;
      const particle = p as Particle;
      particle.duration -= delta;
      if (particle.type === 'damage') {
        particle.y -= 35 * delta;
        particle.opacity = particle.duration / particle.maxDuration;
      } else if (particle.type === 'explosion' || particle.type === 'spawn') {
        particle.scale = 1 + (1 - particle.duration / particle.maxDuration) * 0.6;
        particle.opacity = particle.duration / particle.maxDuration;
      } else if (particle.type === 'spell_ring') {
        particle.scale = 1 + (1 - particle.duration / particle.maxDuration) * 2;
        particle.opacity = particle.duration / particle.maxDuration;
      }
      return particle.duration > 0;
    });
  }, []);

  const updateAI = useCallback((delta: number) => {
    const data = gameDataRef.current;
    const ai = aiStateRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const settings = AI_SETTINGS[ai.difficulty];
    
    data.player2.elixir = Math.min(data.player2.elixir + ELIXIR_REGEN_RATE * delta, MAX_ELIXIR);
    setEnemyElixir(Math.floor(data.player2.elixir));
    
    ai.threatLevel = { left: 0, right: 0 };
    data.units
      .filter((u): u is Unit => 'isUnit' in u && u.isUnit && u.owner === 'player1')
      .forEach(u => {
        const threat = (u.health / u.maxHealth) * u.card.damage * (u.y < 400 ? 2.5 : 1);
        if (u.x < LANE_DIVIDER) {
          ai.threatLevel.left += threat;
        } else {
          ai.threatLevel.right += threat;
        }
      });
    
    if (data.gameTime - ai.lastPlayTime < ai.playDelay) return;
    
    const availableCards = data.aiHand.filter(c => c.elixirCost <= data.player2.elixir);
    if (availableCards.length === 0) return;
    
    let shouldPlay = false;
    let selectedCard: GameCard | null = null;
    let deployX = LANE_DIVIDER;
    let deployY = 120;
    
    const maxThreat = Math.max(ai.threatLevel.left, ai.threatLevel.right);
    const threatenedLane: 'left' | 'right' = ai.threatLevel.left > ai.threatLevel.right ? 'left' : 'right';
    
    if (maxThreat > 40 * settings.accuracy) {
      ai.counterAttacking = true;
      const defensiveCards = availableCards.filter(c => c.type === 'Troop' || c.type === 'Building');
      
      if (defensiveCards.length > 0) {
        const tanks = defensiveCards.filter(c => c.isTank);
        const ranged = defensiveCards.filter(c => c.isRanged);
        
        if (tanks.length > 0 && Math.random() < 0.5 + settings.accuracy * 0.3) {
          selectedCard = tanks[Math.floor(Math.random() * tanks.length)];
        } else if (ranged.length > 0 && Math.random() < settings.accuracy) {
          selectedCard = ranged[Math.floor(Math.random() * ranged.length)];
        } else {
          selectedCard = defensiveCards[Math.floor(Math.random() * defensiveCards.length)];
        }
        
        deployX = threatenedLane === 'left' ? 80 : 280;
        deployY = 200 + Math.random() * 30;
        shouldPlay = true;
      }
      
      if (maxThreat > 80 * settings.accuracy) {
        const spells = availableCards.filter(c => c.type === 'Spell');
        if (spells.length > 0 && Math.random() < settings.comboProbability + 0.3) {
          selectedCard = spells[Math.floor(Math.random() * spells.length)];
          const targetUnits = data.units
            .filter((u): u is Unit => 'isUnit' in u && u.isUnit && u.owner === 'player1' && u.y < 450);
          
          if (targetUnits.length > 0) {
            const target = targetUnits.reduce((best, u) => {
              const nearbyCount = targetUnits.filter(t => 
                Math.hypot(t.x - u.x, t.y - u.y) < 100
              ).length;
              return nearbyCount > (best.count || 0) ? { unit: u, count: nearbyCount } : best;
            }, { unit: targetUnits[0], count: 1 });
            
            deployX = target.unit.x;
            deployY = target.unit.y;
            shouldPlay = true;
          }
        }
      }
    }
    
    else if (data.player2.elixir >= settings.elixirThreshold || 
             (data.player2.elixir >= 4 && Math.random() < 0.1 * settings.accuracy)) {
      ai.counterAttacking = false;
      
      const playerFrontBuildingsDestroyed = data.buildings
        .filter(b => b.owner === 'player1' && !b.isKing)
        .every(b => b.destroyed);
      
      const weakerLane = data.buildings
        .filter(b => b.owner === 'player1' && !b.isKing && !b.destroyed)
        .reduce((weaker, b) => {
          if (!weaker) return b;
          return b.health < weaker.health ? b : weaker;
        }, null as Building | null);
      
      const attackLane = weakerLane?.lane || (Math.random() < 0.5 ? 'left' : 'right');
      
      const troops = availableCards.filter(c => c.type === 'Troop');
      if (troops.length > 0) {
        if (Math.random() < settings.comboProbability && troops.length >= 2) {
          const tank = troops.find(c => c.isTank);
          const ranged = troops.find(c => c.isRanged);
          if (tank && ranged && data.player2.elixir >= tank.elixirCost + ranged.elixirCost) {
            selectedCard = tank;
            ai.comboBuffer = [ranged];
          } else {
            selectedCard = troops[Math.floor(Math.random() * troops.length)];
          }
        } else {
          const tanks = troops.filter(c => c.isTank);
          const cheapTroops = troops.filter(c => c.elixirCost <= 4);
          
          if (data.player2.elixir >= 8 && tanks.length > 0) {
            selectedCard = tanks.reduce((best, c) => c.elixirCost > best.elixirCost ? c : best, tanks[0]);
          } else if (cheapTroops.length > 0) {
            selectedCard = cheapTroops[Math.floor(Math.random() * cheapTroops.length)];
          } else {
            selectedCard = troops[Math.floor(Math.random() * troops.length)];
          }
        }
        
        deployX = attackLane === 'left' ? 70 + Math.random() * 30 : 260 + Math.random() * 30;
        deployY = 140 + Math.random() * 40;
        shouldPlay = true;
      }
    }
    
    else if (data.player2.elixir >= MAX_ELIXIR - 1) {
      const cheapestCard = availableCards.reduce((cheapest, c) => 
        c.elixirCost < cheapest.elixirCost ? c : cheapest, availableCards[0]);
      
      selectedCard = cheapestCard;
      deployX = Math.random() < 0.5 ? 80 : 280;
      deployY = 150 + Math.random() * 40;
      shouldPlay = true;
    }
    
    if (shouldPlay && selectedCard) {
      playCard(selectedCard, deployX, deployY, 'player2');
      ai.lastPlayTime = data.gameTime;
      
      const baseDelay = settings.playDelay;
      ai.playDelay = baseDelay * (0.8 + Math.random() * 0.4);
      
      if (maxThreat > 60) {
        ai.playDelay *= 0.6;
      }
      
      if (ai.comboBuffer.length > 0) {
        setTimeout(() => {
          const comboCard = ai.comboBuffer.shift();
          if (comboCard && gameDataRef.current.player2.elixir >= comboCard.elixirCost) {
            playCard(comboCard, deployX + (Math.random() - 0.5) * 40, deployY + 30, 'player2');
          }
        }, 300);
      }
    }
  }, [playCard]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const images = loadedImagesRef.current;
    const data = gameDataRef.current;
    
    drawArenaMap(ctx, canvas);

    data.buildings.forEach(building => {
      const isPlayer = building.owner === 'player1';
      drawBuilding(ctx, building, isPlayer, data.difficulty);
    });

    data.units.forEach(entity => {
      if ('isUnit' in entity && entity.isUnit) {
        const unit = entity as Unit;
        const img = images[unit.card.sprite];
        const size = unit.card.isTank && unit.card.health && unit.card.health > 500 ? 70 : 50;
        
        ctx.save();
        if (unit.attackAnimation > 0) {
          ctx.translate(unit.x, unit.y);
          ctx.scale(1.15, 1.15);
          ctx.translate(-unit.x, -unit.y);
        }
        
        ctx.shadowColor = unit.owner === 'player1' ? '#000' : DIFFICULTY_COLORS[data.difficulty].primary;
        ctx.shadowBlur = 8;
        
        if (img) {
          ctx.drawImage(img, unit.x - size / 2, unit.y - size / 2, size, size);
        } else {
          ctx.fillStyle = unit.owner === 'player1' ? '#1a1a1a' : DIFFICULTY_COLORS[data.difficulty].primary;
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, size / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = unit.owner === 'player1' ? '#333' : DIFFICULTY_COLORS[data.difficulty].secondary;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();
        
        const healthPercent = unit.health / unit.maxHealth;
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(unit.x - 24, unit.y - 35, 48, 7);
        ctx.fillStyle = unit.owner === 'player1' ? '#22c55e' : DIFFICULTY_COLORS[data.difficulty].primary;
        ctx.fillRect(unit.x - 24, unit.y - 35, 48 * healthPercent, 7);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(unit.x - 24, unit.y - 35, 48, 7);
        
      } else if ('isParticle' in entity && entity.isParticle) {
        const particle = entity as Particle;
        ctx.globalAlpha = particle.opacity;
        
        if (particle.type === 'damage') {
          ctx.fillStyle = '#ff4444';
          ctx.font = 'bold 18px Arial';
          ctx.textAlign = 'center';
          ctx.fillText('-' + Math.floor(Math.random() * 50 + 20), particle.x, particle.y);
        } else if (particle.type === 'explosion') {
          const size = 40 * particle.scale;
          const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, size / 2);
          gradient.addColorStop(0, particle.color || '#ffff00');
          gradient.addColorStop(0.4, '#ff8800');
          gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (particle.type === 'spawn') {
          const size = 30 * particle.scale;
          ctx.strokeStyle = '#8b5cf6';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.stroke();
        } else if (particle.type === 'spell_ring') {
          const size = 15 * particle.scale;
          ctx.fillStyle = particle.color || '#ff6600';
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        
      } else if ('targetX' in entity) {
        const proj = entity as Projectile;
        const img = images[proj.sprite];
        ctx.save();
        ctx.translate(proj.x, proj.y);
        ctx.rotate(proj.rotation);
        
        if (img) {
          ctx.drawImage(img, -20, -20, 40, 40);
        } else {
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
          gradient.addColorStop(0, '#ffff00');
          gradient.addColorStop(0.5, '#ff6600');
          gradient.addColorStop(1, '#ff0000');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, 12, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        
      } else if ('isEffect' in entity && entity.isEffect) {
        const effect = entity as Effect;
        const img = images[effect.sprite];
        ctx.globalAlpha = Math.min(effect.duration, 1);
        if (img) {
          ctx.drawImage(img, effect.x - 60, effect.y - 60, 120, 120);
        } else {
          const gradient = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, 80);
          gradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
          gradient.addColorStop(0.5, 'rgba(255, 50, 0, 0.4)');
          gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(effect.x, effect.y, 80, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    });

    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
    ctx.fillRect(0, canvas.height - 120, canvas.width, 120);
    
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 100);
    ctx.lineTo(canvas.width, canvas.height - 100);
    ctx.stroke();
    
    const cardWidth = 70;
    const cardSpacing = 85;
    const startX = (canvas.width - (data.hand.length * cardSpacing)) / 2;
    
    data.hand.forEach((card, i) => {
      const cardX = startX + i * cardSpacing;
      const cardY = canvas.height - 95;
      const isSelected = data.selectedCardIndex === i;
      const canAfford = data.player1.elixir >= card.elixirCost;
      
      ctx.fillStyle = isSelected ? '#7c2d12' : (canAfford ? '#1a1a1a' : '#2a2a2a');
      ctx.strokeStyle = isSelected ? '#dc2626' : (canAfford ? '#333' : '#222');
      ctx.lineWidth = isSelected ? 3 : 2;
      
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardWidth, 85, 6);
      ctx.fill();
      ctx.stroke();
      
      const img = images[card.sprite];
      if (img) {
        ctx.drawImage(img, cardX + 10, cardY + 10, 50, 50);
      } else {
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(cardX + 35, cardY + 35, 20, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.fillStyle = canAfford ? '#fff' : '#666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(card.name.slice(0, 10), cardX + cardWidth / 2, cardY + 72);
      
      ctx.fillStyle = canAfford ? '#dc2626' : '#4a4a4a';
      ctx.beginPath();
      ctx.arc(cardX + 14, cardY + 14, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px Arial';
      ctx.fillText(card.elixirCost.toString(), cardX + 14, cardY + 18);
    });

    ctx.fillStyle = '#dc2626';
    ctx.fillRect(10, canvas.height - 118, (data.player1.elixir / MAX_ELIXIR) * 120, 12);
    ctx.strokeStyle = '#7c2d12';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, canvas.height - 118, 120, 12);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`⚡ ${Math.floor(data.player1.elixir)}/${MAX_ELIXIR}`, 10, canvas.height - 103);
    
    if (data.isOvertime) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 11px Arial';
      ctx.textAlign = 'right';
      ctx.fillText('x2 ELIXIR', canvas.width - 10, canvas.height - 103);
    }

    if (data.gameEnded) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 56px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 50);
      
      ctx.font = '32px Arial';
      const isWin = data.player1.crowns > data.player2.crowns;
      const isDraw = data.player1.crowns === data.player2.crowns;
      ctx.fillStyle = isWin ? '#22c55e' : (isDraw ? '#eab308' : '#ef4444');
      ctx.fillText(isWin ? 'Victory!' : (isDraw ? 'Draw!' : 'Defeat!'), canvas.width / 2, canvas.height / 2 + 10);
      
      ctx.fillStyle = '#fff';
      ctx.font = '24px Arial';
      ctx.fillText(`${data.player1.crowns} - ${data.player2.crowns}`, canvas.width / 2, canvas.height / 2 + 55);
      
      ctx.font = '16px Arial';
      ctx.fillStyle = DIFFICULTY_COLORS[data.difficulty].primary;
      ctx.fillText(`vs ${DIFFICULTY_COLORS[data.difficulty].name} AI`, canvas.width / 2, canvas.height / 2 + 85);
    }
  }, []);

  const gameLoop = useCallback(() => {
    const data = gameDataRef.current;
    
    if (data.gameEnded) {
      render();
      return;
    }
    
    if (!isPaused && gameState === 'playing') {
      const now = performance.now();
      const delta = (now - (data.lastTime || now)) / 1000;
      data.lastTime = now;
      data.gameTime += delta;
      
      const maxTime = data.isOvertime ? GAME_DURATION + OVERTIME_DURATION : GAME_DURATION;
      if (data.gameTime >= maxTime) {
        if (!data.isOvertime && data.player1.crowns === data.player2.crowns) {
          data.isOvertime = true;
          setIsOvertime(true);
        } else {
          endGame();
          return;
        }
      }
      
      const elixirRate = data.isOvertime ? OVERTIME_ELIXIR_RATE : ELIXIR_REGEN_RATE;
      data.player1.elixir = Math.min(data.player1.elixir + elixirRate * delta, MAX_ELIXIR);
      setPlayerElixir(Math.floor(data.player1.elixir));
      setGameTime(data.gameTime);
      
      updateUnits(delta);
      updateBuildings(delta);
      updateProjectiles(delta);
      updateParticles(delta);
      updateAI(delta);
      
      data.units = data.units.filter(e => {
        if ('isEffect' in e && e.isEffect) {
          const effect = e as Effect;
          effect.duration -= delta;
          return effect.duration > 0;
        }
        return true;
      });
    }
    
    render();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, isPaused, render, updateUnits, updateBuildings, updateProjectiles, updateParticles, updateAI]);

  const endGame = useCallback(() => {
    const data = gameDataRef.current;
    data.gameEnded = true;
    setGameState('ended');
    
    if (data.player1.crowns > data.player2.crowns) {
      setWinner('You');
    } else if (data.player2.crowns > data.player1.crowns) {
      setWinner('AI');
    } else {
      setWinner('Draw');
    }
  }, []);

  const startGame = useCallback(() => {
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownInterval);
          
          const playerDeck = shuffleDeck([...CARDS]);
          const aiDeck = shuffleDeck([...CARDS]);
          
          const playerHand = playerDeck.splice(0, 4);
          const aiHand = aiDeck.splice(0, 4);
          
          gameDataRef.current = {
            units: [],
            buildings: [],
            drawPile: playerDeck,
            hand: playerHand,
            aiHand: aiHand,
            aiDrawPile: aiDeck,
            lastTime: performance.now(),
            gameTime: 0,
            player1: { elixir: 5, crowns: 0 },
            player2: { elixir: 5, crowns: 0 },
            selectedCardIndex: null,
            gameEnded: false,
            difficulty: difficulty,
            isOvertime: false
          };
          
          setIsOvertime(false);
          setNextCard(playerDeck.length > 0 ? playerDeck[0] : null);
          
          aiStateRef.current = {
            lastPlayTime: 0,
            playDelay: AI_SETTINGS[difficulty].playDelay,
            threatLevel: { left: 0, right: 0 },
            preferredLane: null,
            counterAttacking: false,
            savedElixir: 0,
            difficulty: difficulty,
            comboBuffer: []
          };
          
          setPlayerElixir(5);
          setEnemyElixir(5);
          setPlayerCrowns(0);
          setEnemyCrowns(0);
          setGameTime(0);
          setSelectedCardIndex(null);
          setWinner(null);
          setHand([...playerHand]);
          
          initializeBuildings();
          
          setGameState('playing');
          setCountdown(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, [difficulty, initializeBuildings, shuffleDeck]);

  const returnToMenu = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setGameState('menu');
    setIsPaused(false);
    setWinner(null);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const data = gameDataRef.current;
    if (data.gameEnded || isPaused || gameState !== 'playing') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (y > canvas.height - 100) {
      const cardSpacing = 85;
      const startX = (canvas.width - (data.hand.length * cardSpacing)) / 2;
      for (let i = 0; i < data.hand.length; i++) {
        const cardX = startX + i * cardSpacing;
        if (x >= cardX && x <= cardX + 70) {
          data.selectedCardIndex = i;
          setSelectedCardIndex(i);
          return;
        }
      }
    } else if (y > RIVER_Y + RIVER_HEIGHT && y < canvas.height - 100 && data.selectedCardIndex !== null) {
      playCard(data.hand[data.selectedCardIndex], x, y);
      data.selectedCardIndex = null;
      setSelectedCardIndex(null);
    }
  }, [gameState, isPaused, playCard]);

  useEffect(() => {
    if (gameState === 'playing' && imagesLoaded) {
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, imagesLoaded, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState !== 'playing') return;
      
      const keyMap: Record<string, number> = { '1': 0, '2': 1, '3': 2, '4': 3 };
      const index = keyMap[e.key];
      if (index !== undefined && gameDataRef.current.hand[index]) {
        gameDataRef.current.selectedCardIndex = index;
        setSelectedCardIndex(index);
      }
      if (e.key === 'p' || e.key === 'P') {
        setIsPaused(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  if (gameState === 'menu') {
    return (
      <div className="min-h-full p-4 sm:p-6 flex flex-col items-center justify-center bg-black" data-testid="page-crown-clash">
        <div className="w-full max-w-2xl">
          <Card className="bg-gradient-to-br from-zinc-900 to-black border-red-900/50">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-2">
                <Crown className="h-9 w-9 text-red-500" />
                <CardTitle className="text-3xl sm:text-4xl font-bold text-white">Crown Clash</CardTitle>
                <Crown className="h-9 w-9 text-red-500" />
              </div>
              <p className="text-zinc-400">Strategic card battle - Grudge Brawl Edition</p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Tabs value={gameMode} onValueChange={(v) => setGameMode(v as 'solo' | 'pvp')} className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-zinc-900">
                  <TabsTrigger value="solo" className="flex items-center gap-2 data-[state=active]:bg-red-900/50" data-testid="tab-solo">
                    <Bot className="h-4 w-4" />
                    Solo vs AI
                  </TabsTrigger>
                  <TabsTrigger value="pvp" className="flex items-center gap-2 data-[state=active]:bg-red-900/50" data-testid="tab-pvp">
                    <Users className="h-4 w-4" />
                    PvP (Soon)
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="solo" className="space-y-4">
                  <div className="bg-zinc-900/50 rounded-lg p-4 space-y-4">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Target className="h-5 w-5 text-red-500" />
                      Select Difficulty
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      {(['easy', 'medium', 'hard'] as Difficulty[]).map((diff) => (
                        <Button
                          key={diff}
                          variant={difficulty === diff ? "default" : "outline"}
                          className={`${difficulty === diff ? 'ring-2' : ''}`}
                          style={{
                            backgroundColor: difficulty === diff ? DIFFICULTY_COLORS[diff].primary : 'transparent',
                            borderColor: DIFFICULTY_COLORS[diff].primary,
                            color: difficulty === diff ? '#fff' : DIFFICULTY_COLORS[diff].primary
                          }}
                          onClick={() => setDifficulty(diff)}
                          data-testid={`button-difficulty-${diff}`}
                        >
                          {DIFFICULTY_COLORS[diff].name}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-zinc-900/50 rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <Swords className="h-5 w-5 text-red-500" />
                      How to Play
                    </h3>
                    <ul className="text-sm text-zinc-400 space-y-1.5">
                      <li className="flex items-start gap-2">
                        <span className="text-red-500">1.</span> Select cards with keyboard (1-4) or click
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500">2.</span> Click on YOUR side (below river) to deploy
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500">3.</span> Destroy towers to earn crowns
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-500">4.</span> Destroy the Monastery for instant 3-crown victory!
                      </li>
                    </ul>
                  </div>
                  
                  {countdown !== null ? (
                    <div className="text-center py-8">
                      <div className="text-7xl font-bold text-red-500 animate-pulse">
                        {countdown}
                      </div>
                      <p className="text-zinc-400 mt-3">Prepare for battle...</p>
                    </div>
                  ) : (
                    <Button 
                      onClick={startGame} 
                      size="lg" 
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
                      disabled={!imagesLoaded}
                      data-testid="button-start-game"
                    >
                      <Play className="h-5 w-5 mr-2" />
                      {imagesLoaded ? `Battle ${DIFFICULTY_COLORS[difficulty].name} AI` : 'Loading sprites...'}
                    </Button>
                  )}
                </TabsContent>
                
                <TabsContent value="pvp" className="text-center py-8">
                  <Users className="h-16 w-16 mx-auto text-zinc-600 mb-4" />
                  <p className="text-zinc-500">
                    PvP multiplayer coming soon!<br />
                    Join a lobby from the Game Lobbies page.
                  </p>
                </TabsContent>
              </Tabs>
              
              <div className="grid grid-cols-4 gap-2">
                {CARDS.slice(0, 4).map((card, i) => (
                  <div key={i} className="bg-zinc-900 rounded-lg p-2 text-center border border-zinc-800">
                    <div className="w-12 h-12 mx-auto bg-zinc-800 rounded-lg flex items-center justify-center mb-1 overflow-hidden">
                      {loadedImagesRef.current[card.sprite] ? (
                        <img 
                          src={SPRITE_IMAGES[card.sprite]} 
                          alt={card.name} 
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <Zap className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 truncate">{card.name}</p>
                    <Badge variant="secondary" className="mt-1 bg-red-900/50 text-red-300 text-xs">
                      {card.elixirCost}⚡
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-2 bg-black" data-testid="page-crown-clash-game">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-3 px-2">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={returnToMenu}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              data-testid="button-return-menu"
            >
              <Home className="h-4 w-4 mr-1" />
              Menu
            </Button>
            <Badge 
              className="text-white"
              style={{ backgroundColor: DIFFICULTY_COLORS[difficulty].primary }}
            >
              {DIFFICULTY_COLORS[difficulty].name} AI
            </Badge>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isOvertime ? 'bg-red-900 animate-pulse' : 'bg-zinc-900'}`}>
              <Timer className="h-4 w-4 text-red-500" />
              <span className="text-white font-mono font-bold" data-testid="text-game-time">
                {isOvertime ? (
                  <span className="text-yellow-400">OT {formatTime(GAME_DURATION + OVERTIME_DURATION - gameTime)}</span>
                ) : (
                  formatTime(GAME_DURATION - gameTime)
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-white font-bold" data-testid="text-player-crowns">{playerCrowns}</span>
                <Crown className="h-5 w-5 text-zinc-400" />
              </div>
              <span className="text-zinc-600">vs</span>
              <div className="flex items-center gap-1.5">
                <Crown className="h-5 w-5" style={{ color: DIFFICULTY_COLORS[difficulty].primary }} />
                <span className="font-bold" style={{ color: DIFFICULTY_COLORS[difficulty].primary }} data-testid="text-enemy-crowns">
                  {enemyCrowns}
                </span>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsPaused(!isPaused)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
              data-testid="button-pause"
            >
              {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="relative rounded-lg overflow-hidden border-2 border-red-900/50 shadow-2xl shadow-red-900/20">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onClick={handleCanvasClick}
            className="w-full cursor-pointer"
            style={{ maxWidth: '100%', height: 'auto' }}
            data-testid="canvas-game"
          />
          
          {isPaused && !gameDataRef.current.gameEnded && (
            <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
              <div className="text-center">
                <Pause className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <p className="text-2xl font-bold text-white mb-2">Paused</p>
                <p className="text-zinc-400">Press P or click to resume</p>
              </div>
            </div>
          )}
          
          {gameState === 'ended' && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <Button 
                onClick={returnToMenu}
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-8"
                data-testid="button-play-again"
              >
                Play Again
              </Button>
            </div>
          )}
        </div>
        
        <div className="mt-3 text-center text-sm text-zinc-500">
          <span className="mr-4">Keys 1-4: Select card</span>
          <span className="mr-4">Click: Deploy on your side</span>
          <span>P: Pause</span>
        </div>
      </div>
    </div>
  );
}
