import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sword, Shield, Zap, Heart, Coins, Users, Target, Star, Play, RotateCcw, Crosshair, Skull } from 'lucide-react';
import * as THREE from 'three';
import { ParticleManager, ParticleEffectPresets, SpellEffectsManager, SpriteEffects2DManager } from '@/lib/game-effects';

// Champion definitions
interface Champion {
  id: string;
  name: string;
  role: 'mage' | 'warrior' | 'tank' | 'assassin' | 'marksman';
  color: number;
  icon: string;
  stats: {
    health: number;
    mana: number;
    attack: number;
    defense: number;
    speed: number;
    range: number;
  };
  abilities: {
    q: { name: string; damage: number; cooldown: number; manaCost: number; description: string };
    w: { name: string; damage: number; cooldown: number; manaCost: number; description: string };
    e: { name: string; damage: number; cooldown: number; manaCost: number; description: string };
    r: { name: string; damage: number; cooldown: number; manaCost: number; description: string };
  };
  passive: { name: string; description: string };
}

const CHAMPIONS: Champion[] = [
  {
    id: 'skeleton-mage',
    name: 'Necros',
    role: 'mage',
    color: 0x9933ff,
    icon: '💀',
    stats: { health: 520, mana: 400, attack: 55, defense: 20, speed: 5, range: 550 },
    abilities: {
      q: { name: 'Soul Bolt', damage: 80, cooldown: 6, manaCost: 50, description: 'Fire a bolt of dark energy' },
      w: { name: 'Bone Shield', damage: 0, cooldown: 14, manaCost: 80, description: 'Create a shield of bones' },
      e: { name: 'Decay', damage: 60, cooldown: 10, manaCost: 70, description: 'Curse enemies, dealing damage over time' },
      r: { name: 'Army of the Dead', damage: 200, cooldown: 100, manaCost: 100, description: 'Summon skeletal warriors' },
    },
    passive: { name: 'Undying Will', description: 'Gains bonus AP when below 40% health' },
  },
  {
    id: 'skeleton-warrior',
    name: 'Grimfang',
    role: 'warrior',
    color: 0xff6600,
    icon: '🪓',
    stats: { health: 650, mana: 250, attack: 72, defense: 35, speed: 6, range: 150 },
    abilities: {
      q: { name: 'Cleave', damage: 90, cooldown: 5, manaCost: 35, description: 'Swing axe in an arc' },
      w: { name: 'Battle Cry', damage: 0, cooldown: 18, manaCost: 60, description: 'Boost attack speed' },
      e: { name: 'Charge', damage: 70, cooldown: 12, manaCost: 50, description: 'Rush forward stunning first enemy' },
      r: { name: 'Executioner', damage: 300, cooldown: 90, manaCost: 100, description: 'Devastating blow that executes low health targets' },
    },
    passive: { name: 'Bloodlust', description: 'Gains lifesteal when attacking enemies' },
  },
  {
    id: 'skeleton-tank',
    name: 'Boneguard',
    role: 'tank',
    color: 0x666666,
    icon: '🛡️',
    stats: { health: 800, mana: 200, attack: 50, defense: 55, speed: 4, range: 125 },
    abilities: {
      q: { name: 'Shield Bash', damage: 60, cooldown: 8, manaCost: 40, description: 'Stun with shield' },
      w: { name: 'Fortify', damage: 0, cooldown: 20, manaCost: 80, description: 'Become immovable and gain armor' },
      e: { name: 'Guardian Stance', damage: 0, cooldown: 14, manaCost: 60, description: 'Block incoming damage' },
      r: { name: 'Unbreakable', damage: 0, cooldown: 120, manaCost: 100, description: 'Become invulnerable for 3 seconds' },
    },
    passive: { name: 'Undying Fortress', description: 'Reduce damage taken by 10%' },
  },
  {
    id: 'skeleton-assassin',
    name: 'Shadowblade',
    role: 'assassin',
    color: 0x333333,
    icon: '🗡️',
    stats: { health: 480, mana: 300, attack: 68, defense: 22, speed: 8, range: 125 },
    abilities: {
      q: { name: 'Shadow Strike', damage: 100, cooldown: 4, manaCost: 40, description: 'Quick slash dealing bonus damage' },
      w: { name: 'Vanish', damage: 0, cooldown: 16, manaCost: 80, description: 'Become invisible briefly' },
      e: { name: 'Backstab', damage: 120, cooldown: 10, manaCost: 55, description: 'Teleport behind target and strike' },
      r: { name: 'Death Mark', damage: 350, cooldown: 80, manaCost: 100, description: 'Mark target for death, dealing massive damage' },
    },
    passive: { name: 'Lethal Precision', description: 'Critical strikes deal 25% more damage' },
  },
  {
    id: 'skeleton-marksman',
    name: 'Deadeye',
    role: 'marksman',
    color: 0x00cc66,
    icon: '🏹',
    stats: { health: 500, mana: 280, attack: 62, defense: 18, speed: 5, range: 650 },
    abilities: {
      q: { name: 'Piercing Shot', damage: 85, cooldown: 7, manaCost: 45, description: 'Fire a bolt that pierces enemies' },
      w: { name: 'Trap', damage: 40, cooldown: 15, manaCost: 60, description: 'Place a trap that roots enemies' },
      e: { name: 'Tumble', damage: 0, cooldown: 8, manaCost: 40, description: 'Roll in a direction, empowering next attack' },
      r: { name: 'Snipe', damage: 400, cooldown: 100, manaCost: 100, description: 'Channel and fire a devastating long-range shot' },
    },
    passive: { name: 'Hunter\'s Focus', description: 'Attacks from long range deal bonus damage' },
  },
];

// Lane waypoints for AI navigation
const LANE_WAYPOINTS = {
  blue: {
    mid: [
      new THREE.Vector3(-60, 0, -60),
      new THREE.Vector3(-40, 0, -40),
      new THREE.Vector3(-20, 0, -20),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(20, 0, 20),
      new THREE.Vector3(40, 0, 40),
      new THREE.Vector3(60, 0, 60),
    ],
    top: [
      new THREE.Vector3(-60, 0, -60),
      new THREE.Vector3(-45, 0, -25),
      new THREE.Vector3(-45, 0, 0),
      new THREE.Vector3(-25, 0, 45),
      new THREE.Vector3(0, 0, 45),
      new THREE.Vector3(45, 0, 45),
      new THREE.Vector3(60, 0, 60),
    ],
    bot: [
      new THREE.Vector3(-60, 0, -60),
      new THREE.Vector3(-25, 0, -45),
      new THREE.Vector3(0, 0, -45),
      new THREE.Vector3(45, 0, -25),
      new THREE.Vector3(45, 0, 0),
      new THREE.Vector3(45, 0, 45),
      new THREE.Vector3(60, 0, 60),
    ],
  },
  red: {
    mid: [
      new THREE.Vector3(60, 0, 60),
      new THREE.Vector3(40, 0, 40),
      new THREE.Vector3(20, 0, 20),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-20, 0, -20),
      new THREE.Vector3(-40, 0, -40),
      new THREE.Vector3(-60, 0, -60),
    ],
    top: [
      new THREE.Vector3(60, 0, 60),
      new THREE.Vector3(45, 0, 45),
      new THREE.Vector3(0, 0, 45),
      new THREE.Vector3(-25, 0, 45),
      new THREE.Vector3(-45, 0, 0),
      new THREE.Vector3(-45, 0, -25),
      new THREE.Vector3(-60, 0, -60),
    ],
    bot: [
      new THREE.Vector3(60, 0, 60),
      new THREE.Vector3(45, 0, 45),
      new THREE.Vector3(45, 0, 0),
      new THREE.Vector3(45, 0, -25),
      new THREE.Vector3(0, 0, -45),
      new THREE.Vector3(-25, 0, -45),
      new THREE.Vector3(-60, 0, -60),
    ],
  },
};

// Tower positions with aggro range
const TOWER_CONFIG = {
  aggroRange: 20,
  attackDamage: 80,
  attackCooldown: 1.5,
  maxHealth: 3000,
};

// Game entity interface
interface GameEntity {
  id: string;
  type: 'champion' | 'minion' | 'tower' | 'nexus';
  team: 'blue' | 'red';
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  mesh: THREE.Object3D;
  attackCooldown: number;
  target: GameEntity | null;
  lane?: 'top' | 'mid' | 'bot';
  waypointIndex?: number;
  isPlayer?: boolean;
  champion?: Champion;
  attackRange?: number;
  attackDamage?: number;
  speed?: number;
  lastAttackTime?: number;
  aggroRange?: number;
  mana?: number;
  maxMana?: number;
  abilityCooldowns?: { q: number; w: number; e: number; r: number };
}

interface GameState {
  phase: 'champion-select' | 'loading' | 'playing' | 'victory' | 'defeat';
  selectedChampion: Champion | null;
  playerTeam: 'blue' | 'red';
  gold: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  level: number;
  exp: number;
  cooldowns: { q: number; w: number; e: number; r: number };
  currentHealth: number;
  currentMana: number;
  gameTime: number;
}

export default function GrudgeGangs() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerEntityRef = useRef<GameEntity | null>(null);
  const enemyHeroRef = useRef<GameEntity | null>(null);
  const entitiesRef = useRef<GameEntity[]>([]);
  const animationRef = useRef<number>(0);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const targetPositionRef = useRef<THREE.Vector3 | null>(null);
  const minionSpawnTimerRef = useRef<number>(0);
  const gameTickRef = useRef<number>(0);
  const particleManagerRef = useRef<ParticleManager | null>(null);
  const spellManagerRef = useRef<SpellEffectsManager | null>(null);
  const spriteEffects2DRef = useRef<SpriteEffects2DManager | null>(null);
  
  const [gameState, setGameState] = useState<GameState>({
    phase: 'champion-select',
    selectedChampion: null,
    playerTeam: 'blue',
    gold: 500,
    kills: 0,
    deaths: 0,
    assists: 0,
    cs: 0,
    level: 1,
    exp: 0,
    cooldowns: { q: 0, w: 0, e: 0, r: 0 },
    currentHealth: 0,
    currentMana: 0,
    gameTime: 0,
  });

  const [hoveredChampion, setHoveredChampion] = useState<Champion | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);

  // Add to combat log
  const addCombatLog = useCallback((message: string) => {
    setCombatLog(prev => [...prev.slice(-9), message]);
  }, []);

  // Create champion mesh
  const createChampionMesh = useCallback((champion: Champion, team: 'blue' | 'red', isEnemy: boolean = false) => {
    const group = new THREE.Group();
    
    // Body
    const bodyGeometry = new THREE.CapsuleGeometry(0.4, 1.2, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: champion.color,
      emissive: champion.color,
      emissiveIntensity: isEnemy ? 0.4 : 0.2,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.35, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({ 
      color: isEnemy ? 0xffaaaa : 0xffccaa 
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2;
    head.castShadow = true;
    group.add(head);

    // Team indicator ring
    const ringGeometry = new THREE.RingGeometry(0.6, 0.8, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
      color: team === 'blue' ? 0x4488ff : 0xff4444,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    group.add(ring);

    // Aggro range indicator (invisible by default)
    const aggroGeometry = new THREE.RingGeometry(champion.stats.range / 30, champion.stats.range / 30 + 0.2, 32);
    const aggroMaterial = new THREE.MeshBasicMaterial({ 
      color: team === 'blue' ? 0x4488ff : 0xff4444,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
    });
    const aggroRing = new THREE.Mesh(aggroGeometry, aggroMaterial);
    aggroRing.rotation.x = -Math.PI / 2;
    aggroRing.position.y = 0.01;
    aggroRing.name = 'aggroRange';
    group.add(aggroRing);

    // Health bar background
    const healthBgGeometry = new THREE.PlaneGeometry(1.2, 0.15);
    const healthBgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const healthBg = new THREE.Mesh(healthBgGeometry, healthBgMaterial);
    healthBg.position.y = 2.8;
    healthBg.name = 'healthBg';
    group.add(healthBg);

    // Health bar fill
    const healthFillGeometry = new THREE.PlaneGeometry(1.18, 0.13);
    const healthFillMaterial = new THREE.MeshBasicMaterial({ 
      color: team === 'blue' ? 0x44ff44 : 0xff4444,
    });
    const healthFill = new THREE.Mesh(healthFillGeometry, healthFillMaterial);
    healthFill.position.y = 2.8;
    healthFill.position.z = 0.01;
    healthFill.name = 'healthFill';
    group.add(healthFill);

    return group;
  }, []);

  // Create minion mesh
  const createMinionMesh = (team: 'blue' | 'red') => {
    const group = new THREE.Group();
    
    const bodyGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: team === 'blue' ? 0x4488ff : 0xff4444,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.3;
    body.castShadow = true;
    group.add(body);

    // Hat/helmet
    const hatGeometry = new THREE.ConeGeometry(0.25, 0.3, 8);
    const hatMaterial = new THREE.MeshStandardMaterial({ 
      color: team === 'blue' ? 0x2266cc : 0xcc2222,
    });
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = 0.75;
    group.add(hat);

    // Health bar
    const healthBgGeometry = new THREE.PlaneGeometry(0.6, 0.08);
    const healthBgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const healthBg = new THREE.Mesh(healthBgGeometry, healthBgMaterial);
    healthBg.position.y = 1.1;
    group.add(healthBg);

    const healthFillGeometry = new THREE.PlaneGeometry(0.58, 0.06);
    const healthFillMaterial = new THREE.MeshBasicMaterial({ 
      color: team === 'blue' ? 0x44ff44 : 0xff4444,
    });
    const healthFill = new THREE.Mesh(healthFillGeometry, healthFillMaterial);
    healthFill.position.y = 1.1;
    healthFill.position.z = 0.01;
    healthFill.name = 'healthFill';
    group.add(healthFill);

    return group;
  };

  // Create tower mesh with aggro range visualization
  const createTowerMesh = (team: 'blue' | 'red') => {
    const group = new THREE.Group();
    const color = team === 'blue' ? 0x4488ff : 0xff4444;
    
    // Aggro range indicator
    const aggroGeometry = new THREE.RingGeometry(TOWER_CONFIG.aggroRange - 0.5, TOWER_CONFIG.aggroRange, 64);
    const aggroMaterial = new THREE.MeshBasicMaterial({ 
      color,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const aggroRing = new THREE.Mesh(aggroGeometry, aggroMaterial);
    aggroRing.rotation.x = -Math.PI / 2;
    aggroRing.position.y = 0.03;
    aggroRing.name = 'aggroRange';
    group.add(aggroRing);

    // Base platform
    const baseGeometry = new THREE.CylinderGeometry(2.5, 3, 0.5, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25;
    base.receiveShadow = true;
    group.add(base);

    // Tower body
    const bodyGeometry = new THREE.CylinderGeometry(1.5, 2, 6, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 3.5;
    body.castShadow = true;
    group.add(body);

    // Tower top
    const topGeometry = new THREE.CylinderGeometry(0.5, 1.5, 2, 8);
    const topMaterial = new THREE.MeshStandardMaterial({ 
      color, 
      emissive: color, 
      emissiveIntensity: 0.3,
    });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 7.5;
    group.add(top);

    // Glowing orb (projectile source)
    const orbGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const orbMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: color, 
      emissiveIntensity: 1,
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.y = 9;
    orb.name = 'towerOrb';
    group.add(orb);

    // Health bar
    const healthBgGeometry = new THREE.PlaneGeometry(3, 0.3);
    const healthBgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const healthBg = new THREE.Mesh(healthBgGeometry, healthBgMaterial);
    healthBg.position.y = 10;
    group.add(healthBg);

    const healthFillGeometry = new THREE.PlaneGeometry(2.9, 0.25);
    const healthFillMaterial = new THREE.MeshBasicMaterial({ 
      color: team === 'blue' ? 0x44ff44 : 0xff4444,
    });
    const healthFill = new THREE.Mesh(healthFillGeometry, healthFillMaterial);
    healthFill.position.y = 10;
    healthFill.position.z = 0.01;
    healthFill.name = 'healthFill';
    group.add(healthFill);

    return group;
  };

  // Create nexus mesh
  const createNexusMesh = (team: 'blue' | 'red') => {
    const group = new THREE.Group();
    const color = team === 'blue' ? 0x4488ff : 0xff4444;

    // Platform
    const platformGeometry = new THREE.CylinderGeometry(8, 10, 1, 16);
    const platformMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.y = 0.5;
    platform.receiveShadow = true;
    group.add(platform);

    // Main structure
    const nexusGeometry = new THREE.CylinderGeometry(4, 5, 8, 8);
    const nexusMaterial = new THREE.MeshStandardMaterial({ 
      color, 
      emissive: color, 
      emissiveIntensity: 0.4,
    });
    const nexus = new THREE.Mesh(nexusGeometry, nexusMaterial);
    nexus.position.y = 5;
    nexus.castShadow = true;
    group.add(nexus);

    // Crystal top
    const crystalGeometry = new THREE.OctahedronGeometry(3);
    const crystalMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffffff, 
      emissive: color, 
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystal.position.y = 12;
    crystal.rotation.y = Math.PI / 4;
    group.add(crystal);

    return group;
  };

  // Update health bar
  const updateHealthBar = (entity: GameEntity) => {
    const healthFill = entity.mesh.getObjectByName('healthFill') as THREE.Mesh;
    if (healthFill) {
      const healthPercent = Math.max(0, entity.health / entity.maxHealth);
      healthFill.scale.x = healthPercent;
      healthFill.position.x = -(1 - healthPercent) * 0.5 * (entity.type === 'tower' ? 1.45 : entity.type === 'minion' ? 0.29 : 0.59);
    }
  };

  // Find nearest enemy in range
  const findNearestEnemy = (entity: GameEntity, range: number): GameEntity | null => {
    let nearest: GameEntity | null = null;
    let nearestDist = Infinity;

    for (const other of entitiesRef.current) {
      if (other.team === entity.team || other.health <= 0) continue;
      if (other.type === 'nexus') continue; // Don't target nexus directly
      
      const dist = entity.position.distanceTo(other.position);
      if (dist <= range && dist < nearestDist) {
        nearestDist = dist;
        nearest = other;
      }
    }

    return nearest;
  };

  // Tower aggro logic
  const updateTowerAggro = (tower: GameEntity, delta: number) => {
    if (tower.health <= 0) return;

    tower.attackCooldown = Math.max(0, tower.attackCooldown - delta);

    // Find target - prioritize minions, then champions
    let target: GameEntity | null = null;
    let minDist = Infinity;

    // First check for enemy minions
    for (const entity of entitiesRef.current) {
      if (entity.team === tower.team || entity.health <= 0) continue;
      if (entity.type !== 'minion') continue;
      
      const dist = tower.position.distanceTo(entity.position);
      if (dist <= TOWER_CONFIG.aggroRange && dist < minDist) {
        minDist = dist;
        target = entity;
      }
    }

    // If no minions, target champions
    if (!target) {
      for (const entity of entitiesRef.current) {
        if (entity.team === tower.team || entity.health <= 0) continue;
        if (entity.type !== 'champion') continue;
        
        const dist = tower.position.distanceTo(entity.position);
        if (dist <= TOWER_CONFIG.aggroRange && dist < minDist) {
          minDist = dist;
          target = entity;
        }
      }
    }

    tower.target = target;

    // Attack if ready
    if (target && tower.attackCooldown <= 0) {
      tower.attackCooldown = TOWER_CONFIG.attackCooldown;
      
      // Deal damage
      target.health -= TOWER_CONFIG.attackDamage;
      updateHealthBar(target);

      // Visual feedback - pulse the orb and create projectile effect
      const orb = tower.mesh.getObjectByName('towerOrb') as THREE.Mesh;
      if (orb) {
        orb.scale.set(1.5, 1.5, 1.5);
        setTimeout(() => orb.scale.set(1, 1, 1), 100);
      }

      // Tower attack projectile effect using spell/particle systems
      const towerTopPos = tower.position.clone();
      towerTopPos.y = 8;
      const targetPos = target.position.clone();
      targetPos.y = 1.5;
      
      // Create lightning bolt from tower to target
      if (spellManagerRef.current) {
        spellManagerRef.current.spawnLightning(towerTopPos, targetPos, 0.5);
      }
      // Also add impact effect at target
      if (particleManagerRef.current) {
        particleManagerRef.current.spawnExplosion(targetPos, tower.team === 'blue' ? '#4488ff' : '#ff4444', 0.5);
      }
      // 2D sprite lightning + impact overlay
      if (spriteEffects2DRef.current && cameraRef.current && containerRef.current) {
        const screenPos = spriteEffects2DRef.current.projectToScreen(
          target.position.x, 1.5, target.position.z,
          cameraRef.current, containerRef.current.clientWidth, containerRef.current.clientHeight
        );
        if (screenPos) {
          spriteEffects2DRef.current.spawnAt('lightning', screenPos.x, screenPos.y, tower.team === 'blue' ? '#4488ff' : '#ff4444', { scale: 0.8, screenShake: true });
          spriteEffects2DRef.current.spawnAt('impact', screenPos.x, screenPos.y, '#ffffff', { scale: 0.6 });
        }
      }

      if (target.isPlayer) {
        setGameState(prev => ({ ...prev, currentHealth: target!.health }));
        addCombatLog(`Tower hits you for ${TOWER_CONFIG.attackDamage} damage!`);
      }

      // Check for death
      if (target.health <= 0) {
        handleEntityDeath(target, tower);
      }
    }
  };

  // AI Hero logic
  const updateEnemyHeroAI = (hero: GameEntity, delta: number) => {
    if (hero.health <= 0) return;

    const champion = hero.champion!;
    hero.attackCooldown = Math.max(0, hero.attackCooldown - delta);
    
    // Update ability cooldowns
    if (hero.abilityCooldowns) {
      hero.abilityCooldowns.q = Math.max(0, hero.abilityCooldowns.q - delta);
      hero.abilityCooldowns.w = Math.max(0, hero.abilityCooldowns.w - delta);
      hero.abilityCooldowns.e = Math.max(0, hero.abilityCooldowns.e - delta);
      hero.abilityCooldowns.r = Math.max(0, hero.abilityCooldowns.r - delta);
    }

    // Mana regeneration
    if (hero.mana !== undefined && hero.maxMana !== undefined) {
      hero.mana = Math.min(hero.maxMana, hero.mana + delta * 5);
    }

    const player = playerEntityRef.current;
    if (!player || player.health <= 0) {
      // If no player, follow lane waypoints
      followLaneWaypoints(hero, delta);
      return;
    }

    const distToPlayer = hero.position.distanceTo(player.position);
    const aggroRange = 25;
    const attackRange = champion.stats.range / 30;

    // Check if player is in aggro range
    if (distToPlayer <= aggroRange) {
      hero.target = player;

      // Move toward player if not in attack range
      if (distToPlayer > attackRange) {
        const direction = new THREE.Vector3().subVectors(player.position, hero.position).normalize();
        const moveSpeed = (hero.speed || 4) * delta;
        hero.position.add(direction.multiplyScalar(moveSpeed));
        hero.mesh.position.copy(hero.position);
        hero.mesh.lookAt(player.position.x, hero.mesh.position.y, player.position.z);
      } else {
        // In attack range - attack!
        if (hero.attackCooldown <= 0) {
          hero.attackCooldown = 1.0;
          
          const damage = champion.stats.attack;
          player.health -= damage;
          updateHealthBar(player);
          setGameState(prev => ({ ...prev, currentHealth: player.health }));
          addCombatLog(`${champion.name} attacks you for ${damage} damage!`);
          
          // Hero basic attack effect
          if (particleManagerRef.current) {
            const hitPos = player.position.clone();
            hitPos.y = 1;
            particleManagerRef.current.spawnDamage(hitPos, 'physical');
          }
          // 2D sprite slash overlay for hero basic attack
          if (spriteEffects2DRef.current && cameraRef.current && containerRef.current) {
            const screenPos = spriteEffects2DRef.current.projectToScreen(
              player.position.x, 1, player.position.z,
              cameraRef.current, containerRef.current.clientWidth, containerRef.current.clientHeight
            );
            if (screenPos) {
              spriteEffects2DRef.current.spawnAt('slash', screenPos.x, screenPos.y, `#${champion.color.toString(16).padStart(6, '0')}`, { scale: 0.7, rotation: Math.random() * Math.PI });
            }
          }

          // Use abilities
          if (hero.abilityCooldowns && hero.mana !== undefined) {
            // Use Q if available
            if (hero.abilityCooldowns.q <= 0 && hero.mana >= champion.abilities.q.manaCost) {
              hero.mana -= champion.abilities.q.manaCost;
              hero.abilityCooldowns.q = champion.abilities.q.cooldown;
              player.health -= champion.abilities.q.damage;
              updateHealthBar(player);
              setGameState(prev => ({ ...prev, currentHealth: player.health }));
              addCombatLog(`${champion.name} uses ${champion.abilities.q.name} for ${champion.abilities.q.damage} damage!`);
              createAbilityEffect(hero.position, 0xff0000);
            }

            // Use R if health is low
            if (hero.health < hero.maxHealth * 0.4 && 
                hero.abilityCooldowns.r <= 0 && 
                hero.mana >= champion.abilities.r.manaCost) {
              hero.mana -= champion.abilities.r.manaCost;
              hero.abilityCooldowns.r = champion.abilities.r.cooldown;
              player.health -= champion.abilities.r.damage;
              updateHealthBar(player);
              setGameState(prev => ({ ...prev, currentHealth: player.health }));
              addCombatLog(`${champion.name} uses ULTIMATE: ${champion.abilities.r.name} for ${champion.abilities.r.damage} damage!`);
              createAbilityEffect(hero.position, 0xffff00, 3);
            }
          }

          if (player.health <= 0) {
            handleEntityDeath(player, hero);
          }
        }
      }
    } else {
      // Out of aggro range - follow lane
      hero.target = null;
      followLaneWaypoints(hero, delta);
    }
  };

  // Follow lane waypoints
  const followLaneWaypoints = (entity: GameEntity, delta: number) => {
    const lane = entity.lane || 'mid';
    const waypoints = LANE_WAYPOINTS[entity.team][lane];
    const waypointIndex = entity.waypointIndex || 0;

    if (waypointIndex >= waypoints.length) return;

    const targetWaypoint = waypoints[waypointIndex];
    const direction = new THREE.Vector3().subVectors(targetWaypoint, entity.position);
    direction.y = 0;

    if (direction.length() < 2) {
      // Reached waypoint, move to next
      entity.waypointIndex = waypointIndex + 1;
    } else {
      // Move toward waypoint
      const moveSpeed = (entity.speed || 3) * delta;
      direction.normalize().multiplyScalar(moveSpeed);
      entity.position.add(direction);
      entity.mesh.position.copy(entity.position);
      entity.mesh.lookAt(targetWaypoint.x, entity.mesh.position.y, targetWaypoint.z);
    }
  };

  // Minion AI
  const updateMinionAI = (minion: GameEntity, delta: number) => {
    if (minion.health <= 0) return;

    minion.attackCooldown = Math.max(0, minion.attackCooldown - delta);

    // Find nearest enemy
    const enemy = findNearestEnemy(minion, 8);
    
    if (enemy) {
      minion.target = enemy;
      const dist = minion.position.distanceTo(enemy.position);
      
      if (dist > 2) {
        // Move toward enemy
        const direction = new THREE.Vector3().subVectors(enemy.position, minion.position).normalize();
        const moveSpeed = 3 * delta;
        minion.position.add(direction.multiplyScalar(moveSpeed));
        minion.mesh.position.copy(minion.position);
        minion.mesh.lookAt(enemy.position.x, minion.mesh.position.y, enemy.position.z);
      } else if (minion.attackCooldown <= 0) {
        // Attack
        minion.attackCooldown = 1.2;
        const damage = 15;
        enemy.health -= damage;
        updateHealthBar(enemy);
        
        // Minion attack effect
        if (particleManagerRef.current) {
          const hitPos = enemy.position.clone();
          hitPos.y = 1;
          particleManagerRef.current.spawnDamage(hitPos, 'physical');
        }
        // 2D sprite impact for minion attacks
        if (spriteEffects2DRef.current && cameraRef.current && containerRef.current) {
          const screenPos = spriteEffects2DRef.current.projectToScreen(
            enemy.position.x, 1, enemy.position.z,
            cameraRef.current, containerRef.current.clientWidth, containerRef.current.clientHeight
          );
          if (screenPos) {
            spriteEffects2DRef.current.spawnAt('spark', screenPos.x, screenPos.y, minion.team === 'blue' ? '#4488ff' : '#ff4444', { scale: 0.4 });
          }
        }

        if (enemy.isPlayer) {
          setGameState(prev => ({ ...prev, currentHealth: enemy.health }));
        }

        if (enemy.health <= 0) {
          handleEntityDeath(enemy, minion);
        }
      }
    } else {
      // No enemy nearby, follow lane
      followLaneWaypoints(minion, delta);
    }
  };

  // Handle entity death with visual effects
  const handleEntityDeath = (entity: GameEntity, killer: GameEntity | null) => {
    entity.health = 0;
    
    // Death effect based on entity type
    const deathPos = entity.position.clone();
    deathPos.y = 1;
    
    if (particleManagerRef.current) {
      if (entity.type === 'champion') {
        // Champion death - large dramatic effect
        particleManagerRef.current.spawnExplosion(deathPos, entity.team === 'blue' ? '#4488ff' : '#ff4444', 2);
        particleManagerRef.current.spawnDamage(deathPos, 'physical');
        if (spellManagerRef.current) {
          spellManagerRef.current.spawnFireball(deathPos, 1.5, 2);
        }
      } else if (entity.type === 'minion') {
        // Minion death - smaller effect
        particleManagerRef.current.spawnExplosion(deathPos, entity.team === 'blue' ? '#6699cc' : '#cc6666', 0.5);
      } else if (entity.type === 'tower') {
        // Tower death - massive explosion
        particleManagerRef.current.spawnExplosion(deathPos, entity.team === 'blue' ? '#4488ff' : '#ff4444', 4);
        particleManagerRef.current.spawnExplosion(deathPos.clone().add(new THREE.Vector3(0, 5, 0)), '#ffff00', 3);
        if (spellManagerRef.current) {
          spellManagerRef.current.spawnFireball(deathPos, 3, 3);
        }
      }
    }
    
    entity.mesh.visible = false;

    if (entity.isPlayer) {
      setGameState(prev => ({
        ...prev,
        deaths: prev.deaths + 1,
        currentHealth: 0,
      }));
      addCombatLog('You have been slain!');
      
      // Respawn after 5 seconds
      setTimeout(() => {
        if (playerEntityRef.current) {
          playerEntityRef.current.health = playerEntityRef.current.maxHealth;
          playerEntityRef.current.position.set(-70, 0, -70);
          playerEntityRef.current.mesh.position.set(-70, 0, -70);
          playerEntityRef.current.mesh.visible = true;
          updateHealthBar(playerEntityRef.current);
          setGameState(prev => ({
            ...prev,
            currentHealth: playerEntityRef.current!.maxHealth,
            currentMana: gameState.selectedChampion?.stats.mana || 0,
          }));
          addCombatLog('You have respawned!');
        }
      }, 5000);
    } else if (entity.type === 'champion' && !entity.isPlayer) {
      // Enemy hero killed
      if (killer?.isPlayer) {
        setGameState(prev => ({
          ...prev,
          kills: prev.kills + 1,
          gold: prev.gold + 300,
          exp: prev.exp + 200,
        }));
        addCombatLog(`You killed ${entity.champion?.name}! +300 gold`);
      }
      
      // Respawn enemy hero after 10 seconds
      setTimeout(() => {
        if (enemyHeroRef.current) {
          enemyHeroRef.current.health = enemyHeroRef.current.maxHealth;
          enemyHeroRef.current.mana = enemyHeroRef.current.maxMana;
          enemyHeroRef.current.position.set(70, 0, 70);
          enemyHeroRef.current.mesh.position.set(70, 0, 70);
          enemyHeroRef.current.mesh.visible = true;
          enemyHeroRef.current.waypointIndex = 0;
          updateHealthBar(enemyHeroRef.current);
          addCombatLog(`${enemyHeroRef.current.champion?.name} has respawned!`);
        }
      }, 10000);
    } else if (entity.type === 'minion') {
      if (killer?.isPlayer) {
        setGameState(prev => ({
          ...prev,
          cs: prev.cs + 1,
          gold: prev.gold + 20,
          exp: prev.exp + 30,
        }));
      }
      // Remove from entities
      const index = entitiesRef.current.indexOf(entity);
      if (index > -1) {
        entitiesRef.current.splice(index, 1);
        sceneRef.current?.remove(entity.mesh);
      }
    } else if (entity.type === 'tower') {
      if (killer?.isPlayer || killer?.team === 'blue') {
        setGameState(prev => ({
          ...prev,
          gold: prev.gold + 150,
        }));
        addCombatLog('Tower destroyed! +150 gold');
      }
    }
  };

  // Create ability effect using particle and spell systems
  const createAbilityEffect = (position: THREE.Vector3, color: number, scale: number = 1) => {
    if (!sceneRef.current || !particleManagerRef.current) return;
    
    const effectPosition = position.clone();
    effectPosition.y = 1.5;

    // Determine effect type based on color
    // Determine 2D sprite overlay type
    let spriteType: 'fire' | 'frost' | 'lightning' | 'magic' | 'heal' | 'impact' | 'shockwave' | 'slash' = 'impact';
    let spriteColor = `#${color.toString(16).padStart(6, '0')}`;

    if (color === 0xff0000 || color === 0xff6600) {
      // Fire/Attack effect
      particleManagerRef.current.spawnDamage(effectPosition, 'fire');
      if (scale > 2 && spellManagerRef.current) {
        spellManagerRef.current.spawnFireball(effectPosition, scale * 0.5, 1.5);
      }
      spriteType = 'fire';
      spriteColor = '#ff6600';
    } else if (color === 0x88ccff || color === 0x4488ff) {
      // Ice/Frost effect
      particleManagerRef.current.spawnEffect(ParticleEffectPresets.frost(), effectPosition, 1.5, 30);
      if (scale > 2 && spellManagerRef.current) {
        spellManagerRef.current.spawnFrost(effectPosition, scale * 0.5, 1.5);
      }
      spriteType = 'frost';
      spriteColor = '#88ccff';
    } else if (color === 0xffff00 || color === 0xaaddff) {
      // Ultimate/Lightning effect
      particleManagerRef.current.spawnExplosion(effectPosition, '#ffff00', scale);
      if (spellManagerRef.current && playerEntityRef.current) {
        const targetPos = effectPosition.clone().add(new THREE.Vector3(0, 5, 0));
        spellManagerRef.current.spawnLightning(targetPos, effectPosition, 0.8);
      }
      spriteType = 'lightning';
      spriteColor = '#ffff00';
    } else if (color === 0x00ff88) {
      // Heal effect
      particleManagerRef.current.spawnHeal(effectPosition);
      if (spellManagerRef.current) {
        spellManagerRef.current.spawnHealingAura(effectPosition, scale, 2);
      }
      spriteType = 'heal';
      spriteColor = '#00ff88';
    } else if (color === 0x9933ff || color === 0xff00ff) {
      // Magic/Dark effect
      particleManagerRef.current.spawnDamage(effectPosition, 'magic');
      if (scale > 1) {
        particleManagerRef.current.spawnExplosion(effectPosition, '#9933ff', scale * 0.5);
      }
      spriteType = 'magic';
      spriteColor = '#9933ff';
    } else if (color === 0x00ffff) {
      // Cyan/Electric effect
      particleManagerRef.current.spawnExplosion(effectPosition, '#00ffff', scale);
      spriteType = 'lightning';
      spriteColor = '#00ffff';
    } else {
      // Default explosion effect
      particleManagerRef.current.spawnExplosion(effectPosition, `#${color.toString(16).padStart(6, '0')}`, scale);
    }

    // Spawn 2D sprite effect overlay
    if (spriteEffects2DRef.current && cameraRef.current && containerRef.current) {
      const screenPos = spriteEffects2DRef.current.projectToScreen(
        effectPosition.x, effectPosition.y, effectPosition.z,
        cameraRef.current, containerRef.current.clientWidth, containerRef.current.clientHeight
      );
      if (screenPos) {
        const isUltimate = color === 0xffff00 || color === 0xaaddff;
        spriteEffects2DRef.current.spawnAt(spriteType, screenPos.x, screenPos.y, spriteColor, {
          scale: scale * 0.8,
          screenShake: isUltimate || scale > 2,
          colorSecondary: '#ffffff',
        });
        // Add shockwave ring on ultimates
        if (isUltimate) {
          spriteEffects2DRef.current.spawnAt('shockwave', screenPos.x, screenPos.y, spriteColor, { scale: scale * 1.2 });
        }
      }
    }
  };

  // Initialize scene
  const initScene = useCallback(() => {
    if (!containerRef.current || !gameState.selectedChampion) return;

    // Scene with enhanced MMORPG atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1e);
    scene.fog = new THREE.FogExp2(0x0a0a1e, 0.006);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      500
    );
    camera.position.set(0, 60, 60);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer with WebGL error handling
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, failIfMajorPerformanceCaveat: false });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;
    } catch (error) {
      console.error('WebGL initialization failed:', error);
      setWebglError('WebGL is not available. Please use a browser with WebGL support.');
      return;
    }

    // Initialize particle and spell effects managers
    particleManagerRef.current = new ParticleManager(scene);
    spellManagerRef.current = new SpellEffectsManager(scene);
    // Initialize 2D sprite effects overlay
    if (containerRef.current) {
      spriteEffects2DRef.current = new SpriteEffects2DManager(containerRef.current);
    }

    // Enhanced MMORPG Lighting System
    const ambientLight = new THREE.AmbientLight(0x202040, 0.4);
    scene.add(ambientLight);

    // Main sun/moon light with dramatic color
    const directionalLight = new THREE.DirectionalLight(0xffd4a8, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 10;
    directionalLight.shadow.camera.far = 300;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    scene.add(directionalLight);
    
    // Rim light for dramatic silhouettes
    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    rimLight.position.set(-50, 50, -50);
    scene.add(rimLight);
    
    // Fill light from below for magical ambiance
    const fillLight = new THREE.HemisphereLight(0x4466aa, 0x1a1a2e, 0.5);
    scene.add(fillLight);

    // Team base lights with pulsing effect
    const blueLight = new THREE.PointLight(0x4488ff, 3, 100);
    blueLight.position.set(-70, 15, -70);
    scene.add(blueLight);
    
    const blueInnerLight = new THREE.PointLight(0x88ccff, 2, 50);
    blueInnerLight.position.set(-75, 8, -75);
    scene.add(blueInnerLight);

    const redLight = new THREE.PointLight(0xff4444, 3, 100);
    redLight.position.set(70, 15, 70);
    scene.add(redLight);
    
    const redInnerLight = new THREE.PointLight(0xff8866, 2, 50);
    redInnerLight.position.set(75, 8, 75);
    scene.add(redInnerLight);
    
    // River magical glow
    const riverLight = new THREE.PointLight(0x00ffff, 1.5, 40);
    riverLight.position.set(0, 5, 0);
    scene.add(riverLight);
    
    // Ambient floating particles using the particle manager
    if (particleManagerRef.current) {
      // Spawn ambient magical particles around the map
      const ambientPositions = [
        new THREE.Vector3(-30, 3, -30),
        new THREE.Vector3(30, 3, 30),
        new THREE.Vector3(-50, 5, 50),
        new THREE.Vector3(50, 5, -50),
        new THREE.Vector3(0, 4, 0),
      ];
      ambientPositions.forEach(pos => {
        particleManagerRef.current?.spawnEffect(ParticleEffectPresets.magic(), pos, 60, 15);
      });
    }

    // Enhanced Ground with grid pattern
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a2030, 
      roughness: 0.95,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    
    // Add decorative trees/rocks around map edges
    const createTree = (x: number, z: number, scale: number = 1) => {
      const treeGroup = new THREE.Group();
      
      // Trunk
      const trunkGeo = new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 3 * scale, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.5 * scale;
      trunk.castShadow = true;
      treeGroup.add(trunk);
      
      // Foliage (cone for pine tree style)
      const foliageGeo = new THREE.ConeGeometry(2 * scale, 4 * scale, 8);
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1a4020, roughness: 0.8 });
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 5 * scale;
      foliage.castShadow = true;
      treeGroup.add(foliage);
      
      treeGroup.position.set(x, 0, z);
      return treeGroup;
    };
    
    const createRock = (x: number, z: number, scale: number = 1) => {
      const rockGeo = new THREE.DodecahedronGeometry(1.5 * scale, 0);
      const rockMat = new THREE.MeshStandardMaterial({ 
        color: 0x3a3a40, 
        roughness: 0.95,
        metalness: 0.1,
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(x, 0.5 * scale, z);
      rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      rock.castShadow = true;
      rock.scale.y = 0.6;
      return rock;
    };
    
    // Add trees around map edges
    const treePositions = [
      [-90, -90], [-85, -70], [-70, -85], [-95, -50], [-50, -95],
      [90, 90], [85, 70], [70, 85], [95, 50], [50, 95],
      [-90, 50], [-95, 30], [-85, 70], [-70, 85],
      [90, -50], [95, -30], [85, -70], [70, -85],
    ];
    treePositions.forEach(([x, z]) => {
      const scale = 0.8 + Math.random() * 0.6;
      scene.add(createTree(x + Math.random() * 5, z + Math.random() * 5, scale));
    });
    
    // Add rocks around the map
    const rockPositions = [
      [-80, -40], [-40, -80], [80, 40], [40, 80],
      [-60, 60], [60, -60], [0, -90], [0, 90],
    ];
    rockPositions.forEach(([x, z]) => {
      const scale = 0.6 + Math.random() * 0.8;
      scene.add(createRock(x + Math.random() * 3, z + Math.random() * 3, scale));
    });

    // Lanes
    const laneMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5568, roughness: 0.7 });

    // Mid lane
    const midLane = new THREE.Mesh(new THREE.PlaneGeometry(8, 160), laneMaterial);
    midLane.rotation.x = -Math.PI / 2;
    midLane.rotation.z = Math.PI / 4;
    midLane.position.y = 0.01;
    scene.add(midLane);

    // Top lane
    const topLane1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 70), laneMaterial);
    topLane1.rotation.x = -Math.PI / 2;
    topLane1.position.set(-45, 0.01, -10);
    scene.add(topLane1);

    const topLane2 = new THREE.Mesh(new THREE.PlaneGeometry(70, 6), laneMaterial);
    topLane2.rotation.x = -Math.PI / 2;
    topLane2.position.set(-10, 0.01, -45);
    scene.add(topLane2);

    // Bottom lane
    const botLane1 = new THREE.Mesh(new THREE.PlaneGeometry(6, 70), laneMaterial);
    botLane1.rotation.x = -Math.PI / 2;
    botLane1.position.set(45, 0.01, 10);
    scene.add(botLane1);

    const botLane2 = new THREE.Mesh(new THREE.PlaneGeometry(70, 6), laneMaterial);
    botLane2.rotation.x = -Math.PI / 2;
    botLane2.position.set(10, 0.01, 45);
    scene.add(botLane2);

    // Enhanced River with magical glow effect
    const riverMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a6080, 
      transparent: true, 
      opacity: 0.7,
      emissive: 0x004466,
      emissiveIntensity: 0.3,
      roughness: 0.2,
      metalness: 0.4,
    });
    const river = new THREE.Mesh(new THREE.PlaneGeometry(12, 180), riverMaterial);
    river.rotation.x = -Math.PI / 2;
    river.rotation.z = -Math.PI / 4;
    river.position.y = 0.02;
    scene.add(river);
    
    // River banks/shores
    const shoreMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a4a50, 
      roughness: 0.9,
    });
    
    const shorePositions = [
      { x: -5, z: 5, rot: -Math.PI / 4 },
      { x: 5, z: -5, rot: -Math.PI / 4 },
    ];
    
    shorePositions.forEach(({ x, z, rot }) => {
      const shore = new THREE.Mesh(new THREE.PlaneGeometry(3, 180), shoreMaterial);
      shore.rotation.x = -Math.PI / 2;
      shore.rotation.z = rot;
      shore.position.set(x, 0.015, z);
      scene.add(shore);
    });

    // Nexuses
    const blueNexus = createNexusMesh('blue');
    blueNexus.position.set(-75, 0, -75);
    scene.add(blueNexus);

    const redNexus = createNexusMesh('red');
    redNexus.position.set(75, 0, 75);
    scene.add(redNexus);

    // Tower positions
    const towerPositions = {
      blue: [
        { pos: [-55, -55], lane: 'mid' as const },
        { pos: [-35, -35], lane: 'mid' as const },
        { pos: [-45, -20], lane: 'top' as const },
        { pos: [-20, -45], lane: 'bot' as const },
      ],
      red: [
        { pos: [55, 55], lane: 'mid' as const },
        { pos: [35, 35], lane: 'mid' as const },
        { pos: [45, 20], lane: 'bot' as const },
        { pos: [20, 45], lane: 'top' as const },
      ],
    };

    // Create towers
    Object.entries(towerPositions).forEach(([team, positions]) => {
      positions.forEach(({ pos, lane }, index) => {
        const tower = createTowerMesh(team as 'blue' | 'red');
        tower.position.set(pos[0], 0, pos[1]);
        scene.add(tower);

        entitiesRef.current.push({
          id: `tower-${team}-${index}`,
          type: 'tower',
          team: team as 'blue' | 'red',
          position: new THREE.Vector3(pos[0], 0, pos[1]),
          health: TOWER_CONFIG.maxHealth,
          maxHealth: TOWER_CONFIG.maxHealth,
          mesh: tower,
          attackCooldown: 0,
          target: null,
          lane,
          aggroRange: TOWER_CONFIG.aggroRange,
          attackDamage: TOWER_CONFIG.attackDamage,
        });
      });
    });

    // Create player champion
    const playerMesh = createChampionMesh(gameState.selectedChampion, 'blue');
    playerMesh.position.set(-70, 0, -70);
    scene.add(playerMesh);

    const playerEntity: GameEntity = {
      id: 'player',
      type: 'champion',
      team: 'blue',
      position: new THREE.Vector3(-70, 0, -70),
      health: gameState.selectedChampion.stats.health,
      maxHealth: gameState.selectedChampion.stats.health,
      mesh: playerMesh,
      attackCooldown: 0,
      target: null,
      isPlayer: true,
      champion: gameState.selectedChampion,
      attackRange: gameState.selectedChampion.stats.range / 30,
      attackDamage: gameState.selectedChampion.stats.attack,
      speed: gameState.selectedChampion.stats.speed,
      mana: gameState.selectedChampion.stats.mana,
      maxMana: gameState.selectedChampion.stats.mana,
    };
    playerEntityRef.current = playerEntity;
    entitiesRef.current.push(playerEntity);

    // Create enemy hero (pick a random different champion)
    const enemyChampions = CHAMPIONS.filter(c => c.id !== gameState.selectedChampion!.id);
    const enemyChampion = enemyChampions[Math.floor(Math.random() * enemyChampions.length)];
    const enemyMesh = createChampionMesh(enemyChampion, 'red', true);
    enemyMesh.position.set(70, 0, 70);
    scene.add(enemyMesh);

    const enemyEntity: GameEntity = {
      id: 'enemy-hero',
      type: 'champion',
      team: 'red',
      position: new THREE.Vector3(70, 0, 70),
      health: enemyChampion.stats.health,
      maxHealth: enemyChampion.stats.health,
      mesh: enemyMesh,
      attackCooldown: 0,
      target: null,
      isPlayer: false,
      champion: enemyChampion,
      attackRange: enemyChampion.stats.range / 30,
      attackDamage: enemyChampion.stats.attack,
      speed: enemyChampion.stats.speed,
      lane: 'mid',
      waypointIndex: 0,
      mana: enemyChampion.stats.mana,
      maxMana: enemyChampion.stats.mana,
      abilityCooldowns: { q: 0, w: 0, e: 0, r: 0 },
    };
    enemyHeroRef.current = enemyEntity;
    entitiesRef.current.push(enemyEntity);

    addCombatLog(`Enemy champion: ${enemyChampion.name} (${enemyChampion.role})`);

    setGameState(prev => ({
      ...prev,
      currentHealth: gameState.selectedChampion!.stats.health,
      currentMana: gameState.selectedChampion!.stats.mana,
    }));

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      gameTickRef.current += delta;

      // Update game time
      setGameState(prev => ({ ...prev, gameTime: prev.gameTime + delta }));

      // Player movement
      if (playerEntityRef.current && targetPositionRef.current && playerEntityRef.current.health > 0) {
        const direction = new THREE.Vector3().subVectors(targetPositionRef.current, playerEntityRef.current.position);
        direction.y = 0;
        
        if (direction.length() > 0.5) {
          const speed = (playerEntityRef.current.speed || 5) * delta * 2;
          direction.normalize().multiplyScalar(speed);
          playerEntityRef.current.position.add(direction);
          playerEntityRef.current.mesh.position.copy(playerEntityRef.current.position);
          playerEntityRef.current.mesh.lookAt(
            targetPositionRef.current.x, 
            playerEntityRef.current.mesh.position.y, 
            targetPositionRef.current.z
          );
        } else {
          targetPositionRef.current = null;
        }
      }

      // Camera follows player
      if (playerEntityRef.current && cameraRef.current) {
        const targetCamPos = new THREE.Vector3(
          playerEntityRef.current.position.x,
          60,
          playerEntityRef.current.position.z + 40
        );
        cameraRef.current.position.lerp(targetCamPos, 0.05);
        cameraRef.current.lookAt(playerEntityRef.current.position);
      }

      // Update towers
      entitiesRef.current.filter(e => e.type === 'tower' && e.health > 0).forEach(tower => {
        updateTowerAggro(tower, delta);
      });

      // Update enemy hero AI
      if (enemyHeroRef.current && enemyHeroRef.current.health > 0) {
        updateEnemyHeroAI(enemyHeroRef.current, delta);
      }

      // Update minions
      entitiesRef.current.filter(e => e.type === 'minion' && e.health > 0).forEach(minion => {
        updateMinionAI(minion, delta);
      });

      // Spawn minions
      minionSpawnTimerRef.current += delta;
      if (minionSpawnTimerRef.current > 20) {
        minionSpawnTimerRef.current = 0;
        spawnMinionWave(scene);
      }

      // Update cooldowns
      setGameState(prev => ({
        ...prev,
        cooldowns: {
          q: Math.max(0, prev.cooldowns.q - delta),
          w: Math.max(0, prev.cooldowns.w - delta),
          e: Math.max(0, prev.cooldowns.e - delta),
          r: Math.max(0, prev.cooldowns.r - delta),
        },
      }));

      // Mana regeneration
      if (playerEntityRef.current && playerEntityRef.current.health > 0) {
        setGameState(prev => ({
          ...prev,
          currentMana: Math.min(
            prev.currentMana + delta * 5,
            gameState.selectedChampion?.stats.mana || 0
          ),
        }));
      }

      // Check level up
      setGameState(prev => {
        const expNeeded = prev.level * 100;
        if (prev.exp >= expNeeded) {
          addCombatLog(`Level up! Now level ${prev.level + 1}`);
          return { ...prev, level: prev.level + 1, exp: prev.exp - expNeeded };
        }
        return prev;
      });

      // Update health bars to face camera
      entitiesRef.current.forEach(entity => {
        if (entity.health > 0 && camera) {
          const healthBg = entity.mesh.getObjectByName('healthBg') as THREE.Mesh;
          const healthFill = entity.mesh.getObjectByName('healthFill') as THREE.Mesh;
          if (healthBg) {
            healthBg.lookAt(camera.position);
          }
          if (healthFill) {
            healthFill.lookAt(camera.position);
          }
        }
      });

      // Update particle and spell effects systems
      if (particleManagerRef.current) {
        particleManagerRef.current.update(delta);
      }
      if (spellManagerRef.current) {
        spellManagerRef.current.update(delta);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      // Dispose particle and spell managers
      if (particleManagerRef.current) {
        particleManagerRef.current.dispose();
        particleManagerRef.current = null;
      }
      if (spellManagerRef.current) {
        spellManagerRef.current.dispose();
        spellManagerRef.current = null;
      }
      if (spriteEffects2DRef.current) {
        spriteEffects2DRef.current.dispose();
        spriteEffects2DRef.current = null;
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [gameState.selectedChampion, createChampionMesh, addCombatLog]);

  // Spawn minion wave
  const spawnMinionWave = (scene: THREE.Scene) => {
    const lanes: ('top' | 'mid' | 'bot')[] = ['mid'];
    const teams: ('blue' | 'red')[] = ['blue', 'red'];

    teams.forEach(team => {
      lanes.forEach(lane => {
        for (let i = 0; i < 3; i++) {
          const minion = createMinionMesh(team);
          const waypoints = LANE_WAYPOINTS[team][lane];
          const startPos = waypoints[0].clone();
          startPos.x += (Math.random() - 0.5) * 3;
          startPos.z += (Math.random() - 0.5) * 3;
          
          minion.position.copy(startPos);
          scene.add(minion);

          const minionEntity: GameEntity = {
            id: `minion-${team}-${lane}-${Date.now()}-${i}`,
            type: 'minion',
            team,
            position: startPos.clone(),
            health: 100,
            maxHealth: 100,
            mesh: minion,
            attackCooldown: 0,
            target: null,
            lane,
            waypointIndex: 1,
            speed: 3,
          };
          entitiesRef.current.push(minionEntity);
        }
      });
    });

    addCombatLog('Minions have spawned!');
  };

  // Handle click for movement
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;
    if (!playerEntityRef.current || playerEntityRef.current.health <= 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
    if (intersects.length > 0) {
      const point = intersects[0].point.clone();
      point.y = 0;
      targetPositionRef.current = point;
    }
  }, []);

  // Handle ability usage
  const useAbility = useCallback((key: 'q' | 'w' | 'e' | 'r') => {
    if (!gameState.selectedChampion || gameState.cooldowns[key] > 0) return;
    if (!playerEntityRef.current || playerEntityRef.current.health <= 0) return;

    const ability = gameState.selectedChampion.abilities[key];
    if (gameState.currentMana < ability.manaCost) return;

    // Find nearest enemy to deal damage
    const target = findNearestEnemy(playerEntityRef.current, 20);
    if (target && ability.damage > 0) {
      target.health -= ability.damage;
      updateHealthBar(target);
      addCombatLog(`${ability.name} hits ${target.champion?.name || target.type} for ${ability.damage} damage!`);

      if (target.health <= 0) {
        handleEntityDeath(target, playerEntityRef.current);
      }
    }

    createAbilityEffect(playerEntityRef.current.position, 
      key === 'r' ? 0xffff00 : key === 'q' ? 0xff00ff : key === 'w' ? 0x00ffff : 0x00ff00,
      key === 'r' ? 2 : 1
    );

    setGameState(prev => ({
      ...prev,
      currentMana: prev.currentMana - ability.manaCost,
      cooldowns: {
        ...prev.cooldowns,
        [key]: ability.cooldown,
      },
    }));
  }, [gameState.selectedChampion, gameState.cooldowns, gameState.currentMana, addCombatLog]);

  // Keyboard controls
  useEffect(() => {
    if (gameState.phase !== 'playing') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['q', 'w', 'e', 'r'].includes(key)) {
        useAbility(key as 'q' | 'w' | 'e' | 'r');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.phase, useAbility]);

  // Select champion
  const selectChampion = (champion: Champion) => {
    setGameState(prev => ({ ...prev, selectedChampion: champion }));
  };

  // Start game
  const startGame = () => {
    if (!gameState.selectedChampion) return;
    setGameState(prev => ({ ...prev, phase: 'loading' }));
    
    setTimeout(() => {
      setGameState(prev => ({ ...prev, phase: 'playing' }));
    }, 500);
  };

  // Initialize scene when playing
  useEffect(() => {
    if (gameState.phase === 'playing') {
      const cleanup = initScene();
      return () => {
        if (cleanup) cleanup();
        entitiesRef.current = [];
        minionSpawnTimerRef.current = 0;
        playerEntityRef.current = null;
        enemyHeroRef.current = null;
      };
    }
  }, [gameState.phase, initScene]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Champion select phase
  if (gameState.phase === 'champion-select') {
    return (
      <div className="flex flex-col h-full bg-gradient-to-b from-gray-900 via-red-900/20 to-gray-900" data-testid="page-grudge-gangs">
        <div className="p-4 border-b border-primary/20 bg-black/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Skull className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold game-text">Grudge Gangs</h1>
                <p className="text-sm text-muted-foreground game-text">
                  MOBA Arena - Select Your Champion
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Choose Your Fighter</h2>
              <p className="text-muted-foreground">Select a champion to enter the battlefield</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
              {CHAMPIONS.map((champion) => (
                <Card
                  key={champion.id}
                  className={`cursor-pointer transition-all hover-elevate ${
                    gameState.selectedChampion?.id === champion.id
                      ? 'ring-2 ring-primary bg-primary/10'
                      : 'bg-card/50'
                  }`}
                  onClick={() => selectChampion(champion)}
                  onMouseEnter={() => setHoveredChampion(champion)}
                  onMouseLeave={() => setHoveredChampion(null)}
                  data-testid={`card-champion-${champion.id}`}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-4xl mb-2">{champion.icon}</div>
                    <h3 className="font-bold game-text">{champion.name}</h3>
                    <Badge variant="outline" className="mt-2 capitalize game-hud">
                      {champion.role}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {(gameState.selectedChampion || hoveredChampion) && (
              <Card className="bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardTitle className="flex items-center gap-4">
                    <span className="text-3xl">
                      {(hoveredChampion || gameState.selectedChampion)!.icon}
                    </span>
                    <div>
                      <h3 className="text-xl game-text">
                        {(hoveredChampion || gameState.selectedChampion)!.name}
                      </h3>
                      <p className="text-sm text-muted-foreground capitalize">
                        {(hoveredChampion || gameState.selectedChampion)!.role}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="stats">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="stats">Stats</TabsTrigger>
                      <TabsTrigger value="abilities">Abilities</TabsTrigger>
                      <TabsTrigger value="passive">Passive</TabsTrigger>
                    </TabsList>
                    <TabsContent value="stats" className="mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries((hoveredChampion || gameState.selectedChampion)!.stats).map(([stat, value]) => (
                          <div key={stat} className="flex items-center gap-2">
                            {stat === 'health' && <Heart className="h-4 w-4 text-red-500" />}
                            {stat === 'mana' && <Zap className="h-4 w-4 text-blue-500" />}
                            {stat === 'attack' && <Sword className="h-4 w-4 text-orange-500" />}
                            {stat === 'defense' && <Shield className="h-4 w-4 text-gray-500" />}
                            {stat === 'speed' && <Crosshair className="h-4 w-4 text-green-500" />}
                            {stat === 'range' && <Target className="h-4 w-4 text-amber-500" />}
                            <span className="capitalize text-sm game-text">{stat}:</span>
                            <span className="font-bold game-hud">{value}</span>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="abilities" className="mt-4">
                      <div className="grid gap-3">
                        {(['q', 'w', 'e', 'r'] as const).map((key) => {
                          const ability = (hoveredChampion || gameState.selectedChampion)!.abilities[key];
                          return (
                            <div key={key} className="flex items-center gap-3 p-2 rounded bg-background/50">
                              <Badge className="uppercase game-hud w-8 justify-center">{key}</Badge>
                              <div className="flex-1">
                                <p className="font-semibold game-text">{ability.name}</p>
                                <p className="text-sm text-muted-foreground">{ability.description}</p>
                              </div>
                              <div className="text-right text-sm game-hud">
                                <p className="text-red-400">DMG: {ability.damage}</p>
                                <p className="text-blue-400">MANA: {ability.manaCost}</p>
                                <p className="text-yellow-400">CD: {ability.cooldown}s</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                    <TabsContent value="passive" className="mt-4">
                      <div className="p-4 rounded bg-background/50">
                        <div className="flex items-center gap-2 mb-2">
                          <Star className="h-5 w-5 text-yellow-500" />
                          <h4 className="font-bold game-text">
                            {(hoveredChampion || gameState.selectedChampion)!.passive.name}
                          </h4>
                        </div>
                        <p className="text-muted-foreground">
                          {(hoveredChampion || gameState.selectedChampion)!.passive.description}
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {gameState.selectedChampion && (
                    <div className="mt-6 flex justify-center">
                      <Button
                        size="lg"
                        onClick={startGame}
                        className="gap-2"
                        data-testid="button-start-game"
                      >
                        <Play className="h-5 w-5" />
                        Enter Battle
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Loading phase
  if (gameState.phase === 'loading') {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <div className="text-6xl mb-4">{gameState.selectedChampion?.icon}</div>
          <h2 className="text-2xl font-bold mb-2 game-text">{gameState.selectedChampion?.name}</h2>
          <Progress value={66} className="w-64 mx-auto" />
          <p className="mt-4 text-muted-foreground game-text">Loading arena...</p>
        </div>
      </div>
    );
  }

  // WebGL error fallback
  if (webglError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-900 p-8" data-testid="page-grudge-gangs-error">
        <Card className="max-w-md text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Skull className="h-6 w-6 text-primary" />
              Grudge Gangs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">{webglError}</p>
            <Button
              onClick={() => {
                setWebglError(null);
                setGameState(prev => ({ ...prev, phase: 'champion-select' }));
              }}
              data-testid="button-back-to-select"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Back to Champion Select
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="flex flex-col h-full bg-gray-900" data-testid="page-grudge-gangs-game">
      {/* Top HUD */}
      <div className="p-2 bg-black/80 border-b border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="game-hud">
            <Users className="h-3 w-3 mr-1" />
            {gameState.kills}/{gameState.deaths}/{gameState.assists}
          </Badge>
          <Badge variant="outline" className="game-hud">
            <Coins className="h-3 w-3 mr-1" />
            {gameState.gold}
          </Badge>
          <Badge variant="outline" className="game-hud">
            <Crosshair className="h-3 w-3 mr-1" />
            CS: {gameState.cs}
          </Badge>
          <Badge variant="outline" className="game-hud">
            <Star className="h-3 w-3 mr-1" />
            LVL {gameState.level}
          </Badge>
          <Badge variant="secondary" className="game-hud">
            {Math.floor(gameState.gameTime / 60)}:{String(Math.floor(gameState.gameTime % 60)).padStart(2, '0')}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground game-text">
            {gameState.selectedChampion?.name}
          </span>
          <Button size="icon" variant="ghost" onClick={() => {
            setGameState(prev => ({ ...prev, phase: 'champion-select', gameTime: 0, kills: 0, deaths: 0, assists: 0, cs: 0, gold: 500, level: 1, exp: 0 }));
            entitiesRef.current = [];
            setCombatLog([]);
          }}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Game viewport */}
      <div 
        className="flex-1 relative cursor-crosshair" 
        ref={containerRef}
        onClick={handleCanvasClick}
      >
        {/* Health/Mana bars */}
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 w-96 space-y-2 pointer-events-none z-10">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-red-500" />
            <Progress
              value={(gameState.currentHealth / (gameState.selectedChampion?.stats.health || 1)) * 100}
              className="h-4 bg-gray-800"
            />
            <span className="text-sm game-hud text-red-400 w-24">
              {Math.round(gameState.currentHealth)}/{gameState.selectedChampion?.stats.health}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-500" />
            <Progress
              value={(gameState.currentMana / (gameState.selectedChampion?.stats.mana || 1)) * 100}
              className="h-4 bg-gray-800"
            />
            <span className="text-sm game-hud text-blue-400 w-24">
              {Math.round(gameState.currentMana)}/{gameState.selectedChampion?.stats.mana}
            </span>
          </div>
        </div>

        {/* Ability bar */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {(['q', 'w', 'e', 'r'] as const).map((key) => {
            const ability = gameState.selectedChampion?.abilities[key];
            const onCooldown = gameState.cooldowns[key] > 0;
            return (
              <Button
                key={key}
                variant={onCooldown ? 'secondary' : 'default'}
                className={`w-16 h-16 flex flex-col items-center justify-center relative ${
                  key === 'r' ? 'ring-2 ring-yellow-500' : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  useAbility(key);
                }}
                disabled={onCooldown || gameState.currentMana < (ability?.manaCost || 0)}
                data-testid={`button-ability-${key}`}
              >
                <span className="uppercase font-bold game-hud">{key}</span>
                <span className="text-xs truncate game-text">{ability?.name.split(' ')[0]}</span>
                {onCooldown && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded">
                    <span className="text-lg font-bold game-hud">
                      {Math.ceil(gameState.cooldowns[key])}
                    </span>
                  </div>
                )}
              </Button>
            );
          })}
        </div>

        {/* Combat log */}
        <Card className="absolute top-4 left-4 w-72 p-2 game-container backdrop-blur text-xs z-10 max-h-40 overflow-hidden">
          <div className="space-y-0.5">
            {combatLog.map((log, i) => (
              <p key={i} className="game-text text-muted-foreground truncate">{log}</p>
            ))}
          </div>
        </Card>

        {/* Controls help */}
        <Card className="absolute bottom-4 left-4 p-3 game-container backdrop-blur text-xs z-10">
          <div className="game-text space-y-1">
            <p><strong>Click</strong> - Move</p>
            <p><strong>Q/W/E/R</strong> - Abilities</p>
          </div>
        </Card>

        {/* Minimap */}
        <div className="absolute bottom-4 right-4 w-44 h-44 bg-black/90 rounded border border-primary/30 z-10 overflow-hidden">
          <div className="p-1 text-xs text-center text-primary game-hud border-b border-primary/20">Minimap</div>
          <div className="relative w-full h-36 bg-gray-900">
            <div className="absolute inset-0">
              <div className="absolute w-full h-0.5 bg-gray-600/50 rotate-45 origin-center top-1/2 left-0" />
              <div className="absolute w-0.5 h-1/2 bg-gray-600/50 left-2 top-1/4" />
              <div className="absolute w-1/2 h-0.5 bg-gray-600/50 top-2 left-1/4" />
              <div className="absolute w-0.5 h-1/2 bg-gray-600/50 right-2 bottom-1/4" />
              <div className="absolute w-1/2 h-0.5 bg-gray-600/50 bottom-2 right-1/4" />
            </div>
            <div className="absolute top-1 left-1 w-4 h-4 bg-blue-500/80 rounded-sm" />
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-red-500/80 rounded-sm" />
            <div className="absolute top-3 left-3 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <div className="absolute bottom-3 right-3 w-2 h-2 bg-red-400 rounded-full" />
            <div className="absolute top-6 left-6 w-1.5 h-1.5 bg-blue-400 rounded-full" />
            <div className="absolute bottom-6 right-6 w-1.5 h-1.5 bg-red-400 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
