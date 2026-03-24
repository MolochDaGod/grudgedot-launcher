/**
 * ============================================================================
 * GRUDGE ENGINE — MOBA System
 * ============================================================================
 * Ported from Online-Multiplayer-Game arena 2v2 MOBA mode.
 *
 * Tower defense, lane creep waves, XP/leveling, and team management
 * for the Grudge Arena MOBA game mode.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TeamSide = 'ally' | 'enemy';
export type LaneId = 'top' | 'mid' | 'bot';

export interface Tower {
  id: string;
  name: string;
  side: TeamSide;
  lane: LaneId | 'base';
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  attackDamage: number;
  attackRange: number;
  attackSpeed: number;
  lastAttackTime: number;
  alive: boolean;
  mesh?: THREE.Object3D;
}

export interface Creep {
  id: string;
  side: TeamSide;
  lane: LaneId;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  damage: number;
  speed: number;
  xpReward: number;
  goldReward: number;
  waypointIndex: number;
  alive: boolean;
  mesh?: THREE.Object3D;
}

export interface LevelData {
  level: number;
  xp: number;
  xpToNext: number;
  attributePoints: number;
}

export interface WaveConfig {
  waveNumber: number;
  creepsPerLane: number;
  creepHealth: number;
  creepDamage: number;
  spawnInterval: number;
  eliteChance: number;
}

// ---------------------------------------------------------------------------
// Tower Definitions (matching OMP arena layout)
// ---------------------------------------------------------------------------

export function createTowerLayout(): Tower[] {
  const makeTower = (
    id: string, name: string, side: TeamSide, lane: LaneId | 'base',
    x: number, z: number, hp: number,
  ): Tower => ({
    id, name, side, lane,
    position: new THREE.Vector3(x, 0, z),
    health: hp, maxHealth: hp,
    attackDamage: side === 'ally' ? 80 : 80,
    attackRange: 8,
    attackSpeed: 1.0,
    lastAttackTime: 0,
    alive: true,
  });

  return [
    // Ally towers
    makeTower('ally-main',  'Main Tower',  'ally', 'base', 0, 25, 2500),
    makeTower('ally-left',  'Left Tower',  'ally', 'top',  -15, 15, 1000),
    makeTower('ally-right', 'Right Tower', 'ally', 'bot',  15, 15, 1000),
    // Enemy towers
    makeTower('enemy-main',  'Main Tower',  'enemy', 'base', 0, -25, 2500),
    makeTower('enemy-left',  'Left Tower',  'enemy', 'top',  -15, -15, 1000),
    makeTower('enemy-right', 'Right Tower', 'enemy', 'bot',  15, -15, 1000),
  ];
}

// ---------------------------------------------------------------------------
// Lane Waypoints (Dota-inspired 3-lane layout)
// ---------------------------------------------------------------------------

export const LANE_WAYPOINTS: Record<LaneId, { ally: THREE.Vector3[]; enemy: THREE.Vector3[] }> = {
  top: {
    ally: [
      new THREE.Vector3(-15, 0, 15),
      new THREE.Vector3(-20, 0, 5),
      new THREE.Vector3(-20, 0, -5),
      new THREE.Vector3(-15, 0, -15),
    ],
    enemy: [
      new THREE.Vector3(-15, 0, -15),
      new THREE.Vector3(-20, 0, -5),
      new THREE.Vector3(-20, 0, 5),
      new THREE.Vector3(-15, 0, 15),
    ],
  },
  mid: {
    ally: [
      new THREE.Vector3(0, 0, 12),
      new THREE.Vector3(0, 0, 4),
      new THREE.Vector3(0, 0, -4),
      new THREE.Vector3(0, 0, -12),
    ],
    enemy: [
      new THREE.Vector3(0, 0, -12),
      new THREE.Vector3(0, 0, -4),
      new THREE.Vector3(0, 0, 4),
      new THREE.Vector3(0, 0, 12),
    ],
  },
  bot: {
    ally: [
      new THREE.Vector3(15, 0, 15),
      new THREE.Vector3(20, 0, 5),
      new THREE.Vector3(20, 0, -5),
      new THREE.Vector3(15, 0, -15),
    ],
    enemy: [
      new THREE.Vector3(15, 0, -15),
      new THREE.Vector3(20, 0, -5),
      new THREE.Vector3(20, 0, 5),
      new THREE.Vector3(15, 0, 15),
    ],
  },
};

// ---------------------------------------------------------------------------
// XP / Leveling
// ---------------------------------------------------------------------------

/** XP required per level (scaling formula from OMP). */
export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

export function createLevelData(): LevelData {
  return { level: 1, xp: 0, xpToNext: xpForLevel(2), attributePoints: 0 };
}

export function addXP(data: LevelData, amount: number): LevelData {
  let xp = data.xp + amount;
  let level = data.level;
  let xpToNext = data.xpToNext;
  let points = data.attributePoints;

  while (xp >= xpToNext && level < 25) {
    xp -= xpToNext;
    level++;
    xpToNext = xpForLevel(level + 1);
    points += 3; // 3 attribute points per level
  }

  return { level, xp, xpToNext, attributePoints: points };
}

// ---------------------------------------------------------------------------
// Wave Spawning
// ---------------------------------------------------------------------------

export function getWaveConfig(waveNumber: number): WaveConfig {
  return {
    waveNumber,
    creepsPerLane: 3 + Math.floor(waveNumber / 3),
    creepHealth: 100 + waveNumber * 20,
    creepDamage: 10 + waveNumber * 3,
    spawnInterval: 30, // seconds between waves
    eliteChance: Math.min(0.05 * waveNumber, 0.3),
  };
}

let nextCreepId = 0;

export function spawnCreepWave(
  side: TeamSide,
  lane: LaneId,
  config: WaveConfig,
): Creep[] {
  const creeps: Creep[] = [];
  const waypoints = LANE_WAYPOINTS[lane][side];
  const spawnPos = waypoints[0].clone();

  for (let i = 0; i < config.creepsPerLane; i++) {
    const isElite = Math.random() < config.eliteChance;
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2,
    );

    creeps.push({
      id: `creep-${side}-${lane}-${nextCreepId++}`,
      side,
      lane,
      position: spawnPos.clone().add(offset),
      health: isElite ? config.creepHealth * 2 : config.creepHealth,
      maxHealth: isElite ? config.creepHealth * 2 : config.creepHealth,
      damage: isElite ? config.creepDamage * 1.5 : config.creepDamage,
      speed: 2 + Math.random() * 0.5,
      xpReward: isElite ? 30 : 15,
      goldReward: isElite ? 50 : 20,
      waypointIndex: 0,
      alive: true,
    });
  }

  return creeps;
}

// ---------------------------------------------------------------------------
// Tower Attack Logic
// ---------------------------------------------------------------------------

export function towerAttack(
  tower: Tower,
  targets: Creep[],
  currentTime: number,
): { targetId: string; damage: number } | null {
  if (!tower.alive) return null;
  if (currentTime - tower.lastAttackTime < 1 / tower.attackSpeed) return null;

  // Find closest enemy creep in range
  const enemyCreeps = targets.filter(
    (c) => c.alive && c.side !== tower.side,
  );

  let closest: Creep | null = null;
  let closestDist = Infinity;

  for (const creep of enemyCreeps) {
    const dist = tower.position.distanceTo(creep.position);
    if (dist <= tower.attackRange && dist < closestDist) {
      closest = creep;
      closestDist = dist;
    }
  }

  if (closest) {
    tower.lastAttackTime = currentTime;
    return { targetId: closest.id, damage: tower.attackDamage };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Creep Movement
// ---------------------------------------------------------------------------

export function moveCreep(creep: Creep, delta: number): void {
  if (!creep.alive) return;

  const waypoints = LANE_WAYPOINTS[creep.lane][creep.side];
  if (creep.waypointIndex >= waypoints.length) return;

  const target = waypoints[creep.waypointIndex];
  const dir = target.clone().sub(creep.position);
  const dist = dir.length();

  if (dist < 1) {
    creep.waypointIndex++;
    return;
  }

  dir.normalize().multiplyScalar(creep.speed * delta);
  creep.position.add(dir);
}

// ---------------------------------------------------------------------------
// All Lane IDs
// ---------------------------------------------------------------------------

export const LANE_IDS: LaneId[] = ['top', 'mid', 'bot'];
