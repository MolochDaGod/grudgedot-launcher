/**
 * Enemy AI — Armory3D-style state machine
 *
 * States: Idle → Patrol → Alert → Chase → Attack → Retreat → Dead
 * Uses Rapier raycasting for line-of-sight and the WeaponSystem to shoot.
 */

import * as BABYLON from '@babylonjs/core';
import { Trait, TraitManager } from './trait-system';
import { RapierPhysicsWorld } from '../rapier-physics';
import { WeaponSystem, WEAPONS } from './weapons';
import { HealthComponent, CombatManager } from './combat-system';
import * as VFX from './tps-vfx';

// ── AI States ──

export type AIState = 'idle' | 'patrol' | 'alert' | 'chase' | 'attack' | 'retreat' | 'dead';

export interface EnemyAIConfig {
  detectionRange: number;
  attackRange: number;
  loseRange: number;       // distance to lose aggro
  patrolSpeed: number;
  chaseSpeed: number;
  alertDuration: number;   // seconds before transitioning from alert to chase
  retreatHealthPercent: number;
  weapon: string;
  accuracy: number;        // 0-1, affects spread multiplier
}

const DEFAULT_AI_CONFIG: EnemyAIConfig = {
  detectionRange: 25,
  attackRange: 18,
  loseRange: 35,
  patrolSpeed: 2,
  chaseSpeed: 4.5,
  alertDuration: 0.8,
  retreatHealthPercent: 0.2,
  weapon: 'rifle',
  accuracy: 0.6,
};

// ── Enemy AI Trait ──

export class EnemyAI extends Trait {
  readonly entityId: string;
  config: EnemyAIConfig;
  state: AIState = 'idle';
  physics: RapierPhysicsWorld;
  weapon: WeaponSystem;

  // Target (player)
  private playerNode: BABYLON.TransformNode | null = null;

  // Patrol
  private waypoints: BABYLON.Vector3[] = [];
  private waypointIndex = 0;

  // Timers
  private stateTimer = 0;
  private attackCooldown = 0;
  private idleTimer = 0;

  // Health ref
  private health: HealthComponent | null = null;

  constructor(
    node: BABYLON.TransformNode | BABYLON.AbstractMesh,
    entityId: string,
    physics: RapierPhysicsWorld,
    config: Partial<EnemyAIConfig> = {}
  ) {
    super(node);
    this.entityId = entityId;
    this.physics = physics;
    this.config = { ...DEFAULT_AI_CONFIG, ...config };
    this.weapon = new WeaponSystem(node.getScene(), physics, entityId, this.config.weapon);

    // Generate patrol waypoints around spawn position
    const origin = node.position.clone();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.random() * 0.5;
      const dist = 5 + Math.random() * 8;
      this.waypoints.push(new BABYLON.Vector3(
        origin.x + Math.cos(angle) * dist,
        origin.y,
        origin.z + Math.sin(angle) * dist
      ));
    }
  }

  init(): void {
    this.idleTimer = 1 + Math.random() * 2;
  }

  setPlayer(playerNode: BABYLON.TransformNode): void {
    this.playerNode = playerNode;
  }

  setHealth(health: HealthComponent): void {
    this.health = health;
    health.onDeath(() => {
      this.state = 'dead';
      this.onDeath();
    });
  }

  update(dt: number): void {
    if (this.state === 'dead') return;

    this.attackCooldown -= dt;
    const playerPos = this.playerNode?.position;
    const myPos = this.node.position;
    const distToPlayer = playerPos ? BABYLON.Vector3.Distance(myPos, playerPos) : Infinity;
    const hasLOS = playerPos ? this.checkLineOfSight(myPos, playerPos) : false;

    // Check retreat condition
    if (this.health && this.health.hpPercent <= this.config.retreatHealthPercent && this.state !== 'retreat') {
      this.state = 'retreat';
      this.stateTimer = 3;
    }

    switch (this.state) {
      case 'idle':
        this.updateIdle(dt, distToPlayer, hasLOS);
        break;
      case 'patrol':
        this.updatePatrol(dt, distToPlayer, hasLOS);
        break;
      case 'alert':
        this.updateAlert(dt, distToPlayer, hasLOS);
        break;
      case 'chase':
        this.updateChase(dt, distToPlayer, hasLOS, playerPos);
        break;
      case 'attack':
        this.updateAttack(dt, distToPlayer, hasLOS, playerPos);
        break;
      case 'retreat':
        this.updateRetreat(dt, distToPlayer, playerPos);
        break;
    }
  }

  // ── State Updates ──

  private updateIdle(dt: number, dist: number, los: boolean): void {
    this.idleTimer -= dt;
    if (this.idleTimer <= 0) {
      this.state = 'patrol';
      this.waypointIndex = Math.floor(Math.random() * this.waypoints.length);
    }
    if (dist < this.config.detectionRange && los) {
      this.state = 'alert';
      this.stateTimer = this.config.alertDuration;
    }
  }

  private updatePatrol(dt: number, dist: number, los: boolean): void {
    if (this.waypoints.length === 0) return;

    const target = this.waypoints[this.waypointIndex];
    const toTarget = target.subtract(this.node.position);
    toTarget.y = 0;
    const d = toTarget.length();

    if (d < 1.0) {
      this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      // Pause briefly at waypoint
      this.state = 'idle';
      this.idleTimer = 1 + Math.random() * 2;
      return;
    }

    const dir = toTarget.normalize();
    this.moveToward(dir, this.config.patrolSpeed, dt);
    this.faceDirection(dir, dt);

    // Detect player
    if (dist < this.config.detectionRange && los) {
      this.state = 'alert';
      this.stateTimer = this.config.alertDuration;
    }
  }

  private updateAlert(dt: number, dist: number, los: boolean): void {
    this.stateTimer -= dt;

    // Face player
    if (this.playerNode) {
      const dir = this.playerNode.position.subtract(this.node.position);
      dir.y = 0;
      if (dir.length() > 0.1) this.faceDirection(dir.normalize(), dt);
    }

    if (this.stateTimer <= 0) {
      this.state = dist <= this.config.attackRange && los ? 'attack' : 'chase';
    }
    if (dist > this.config.loseRange || !los) {
      this.state = 'patrol';
    }
  }

  private updateChase(dt: number, dist: number, los: boolean, playerPos?: BABYLON.Vector3): void {
    if (!playerPos) { this.state = 'patrol'; return; }

    const dir = playerPos.subtract(this.node.position);
    dir.y = 0;
    if (dir.length() > 0.1) {
      this.moveToward(dir.normalize(), this.config.chaseSpeed, dt);
      this.faceDirection(dir.normalize(), dt);
    }

    if (dist <= this.config.attackRange && los) {
      this.state = 'attack';
    }
    if (dist > this.config.loseRange) {
      this.state = 'patrol';
    }
  }

  private updateAttack(dt: number, dist: number, los: boolean, playerPos?: BABYLON.Vector3): void {
    if (!playerPos) { this.state = 'patrol'; return; }

    // Face player
    const dir = playerPos.subtract(this.node.position);
    dir.y = 0;
    if (dir.length() > 0.1) this.faceDirection(dir.normalize(), dt);

    // Strafe slightly while attacking
    const strafe = BABYLON.Vector3.Cross(dir.normalize(), BABYLON.Vector3.Up());
    const strafeFactor = Math.sin(performance.now() * 0.002) * 0.5;
    this.moveToward(strafe, this.config.chaseSpeed * strafeFactor, dt);

    // Shoot
    if (this.attackCooldown <= 0 && los) {
      const aimDir = playerPos.subtract(this.node.position).normalize();
      // Adjust aim up to chest height
      aimDir.y = (playerPos.y + 1.2 - (this.node.position.y + 1.2)) / dist;
      aimDir.normalize();

      // Reduce accuracy: multiply weapon spread by inverse accuracy
      const origSpread = this.weapon.currentWeapon.spread;
      this.weapon.currentWeapon.spread = origSpread / Math.max(0.1, this.config.accuracy);

      const shootOrigin = this.node.position.clone();
      shootOrigin.y += 1.2;
      this.weapon.fire(shootOrigin, aimDir);

      this.weapon.currentWeapon.spread = origSpread;
      this.attackCooldown = 0.1; // small delay between shots to prevent spam
    }

    // Transition out
    if (dist > this.config.attackRange * 1.3) {
      this.state = 'chase';
    }
    if (dist > this.config.loseRange) {
      this.state = 'patrol';
    }
  }

  private updateRetreat(dt: number, dist: number, playerPos?: BABYLON.Vector3): void {
    this.stateTimer -= dt;

    if (playerPos) {
      // Move away from player
      const away = this.node.position.subtract(playerPos);
      away.y = 0;
      if (away.length() > 0.1) {
        this.moveToward(away.normalize(), this.config.chaseSpeed, dt);
        this.faceDirection(away.normalize(), dt);
      }
    }

    // Recover: go back to patrol if timer expires or health recovered
    if (this.stateTimer <= 0 || (this.health && this.health.hpPercent > 0.5)) {
      this.state = 'patrol';
    }
  }

  // ── Helpers ──

  private moveToward(direction: BABYLON.Vector3, speed: number, dt: number): void {
    const move = direction.scale(speed * dt);
    this.node.position.addInPlace(move);

    // Clamp to arena bounds (simple circle)
    const pos = this.node.position;
    const distFromCenter = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    if (distFromCenter > 24) {
      const norm = new BABYLON.Vector3(pos.x, 0, pos.z).normalize();
      pos.x = norm.x * 24;
      pos.z = norm.z * 24;
    }
  }

  private faceDirection(dir: BABYLON.Vector3, dt: number): void {
    const targetRot = Math.atan2(dir.x, dir.z);
    if (this.node.rotationQuaternion) {
      const targetQuat = BABYLON.Quaternion.FromEulerAngles(0, targetRot, 0);
      this.node.rotationQuaternion = BABYLON.Quaternion.Slerp(
        this.node.rotationQuaternion,
        targetQuat,
        8 * dt
      );
    } else {
      let diff = targetRot - this.node.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.node.rotation.y += diff * 8 * dt;
    }
  }

  private checkLineOfSight(from: BABYLON.Vector3, to: BABYLON.Vector3): boolean {
    const dir = to.subtract(from);
    const dist = dir.length();
    dir.normalize();

    const eyePos = from.clone();
    eyePos.y += 1.2; // eye height

    const hit = this.physics.raycast(eyePos, dir, dist);
    if (!hit) return true; // nothing blocking
    // If the hit is the player, LOS is clear
    return hit.gameObjectId === 'player' || hit.distance >= dist * 0.95;
  }

  private onDeath(): void {
    VFX.explosion(this.scene, this.node.position.clone(), 1.5);

    // Flash red and fade out
    const mesh = this.node as BABYLON.AbstractMesh;
    if (mesh.material instanceof BABYLON.StandardMaterial) {
      mesh.material.emissiveColor = new BABYLON.Color3(1, 0, 0);
    }

    let fadeTimer = 1.0;
    const obs = this.scene.onBeforeRenderObservable.add(() => {
      fadeTimer -= this.scene.getEngine().getDeltaTime() / 1000;
      mesh.visibility = Math.max(0, fadeTimer);
      if (fadeTimer <= 0) {
        this.scene.onBeforeRenderObservable.remove(obs);
        mesh.setEnabled(false);
      }
    });

    this.weapon.dispose();
  }

  remove(): void {
    this.weapon.dispose();
  }
}

// ── Wave-Based Enemy Spawner ──

export interface WaveConfig {
  baseEnemyCount: number;
  enemiesPerWave: number;
  bossEveryNWaves: number;
  spawnRadius: number;
  difficultyScale: number;  // multiplier per wave for health/speed
}

const DEFAULT_WAVE_CONFIG: WaveConfig = {
  baseEnemyCount: 4,
  enemiesPerWave: 2,
  bossEveryNWaves: 5,
  spawnRadius: 20,
  difficultyScale: 0.15,
};

export class EnemySpawner {
  scene: BABYLON.Scene;
  physics: RapierPhysicsWorld;
  playerNode: BABYLON.TransformNode;
  config: WaveConfig;
  traitManager: TraitManager;

  wave = 0;
  enemiesAlive = 0;
  totalKills = 0;
  spawning = false;

  private enemies: { mesh: BABYLON.Mesh; ai: EnemyAI; health: HealthComponent }[] = [];

  onWaveStart?: (wave: number) => void;
  onWaveComplete?: (wave: number) => void;
  onEnemyKilled?: (totalKills: number) => void;

  constructor(
    scene: BABYLON.Scene,
    physics: RapierPhysicsWorld,
    playerNode: BABYLON.TransformNode,
    config?: Partial<WaveConfig>
  ) {
    this.scene = scene;
    this.physics = physics;
    this.playerNode = playerNode;
    this.config = { ...DEFAULT_WAVE_CONFIG, ...config };
    this.traitManager = TraitManager.get(scene);
  }

  /** Spawn the next wave */
  spawnWave(): void {
    this.wave++;
    const count = this.config.baseEnemyCount + (this.wave - 1) * this.config.enemiesPerWave;
    const isBossWave = this.wave % this.config.bossEveryNWaves === 0;
    const diffMult = 1 + (this.wave - 1) * this.config.difficultyScale;

    this.onWaveStart?.(this.wave);

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const dist = this.config.spawnRadius + Math.random() * 5;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      this.spawnEnemy(x, z, diffMult, false);
    }

    if (isBossWave) {
      this.spawnEnemy(0, -this.config.spawnRadius, diffMult * 2, true);
    }

    this.enemiesAlive = this.enemies.filter(e => e.health.alive).length;
  }

  private spawnEnemy(x: number, z: number, diffMult: number, isBoss: boolean): void {
    const size = isBoss ? 1.5 : 0.8;
    const mesh = BABYLON.MeshBuilder.CreateBox(`enemy_${this.enemies.length}`, {
      width: size,
      height: isBoss ? 2.5 : 1.8,
      depth: size,
    }, this.scene);
    mesh.position = new BABYLON.Vector3(x, isBoss ? 1.25 : 0.9, z);
    mesh.isPickable = true;

    const mat = new BABYLON.StandardMaterial(`enemyMat_${this.enemies.length}`, this.scene);
    mat.diffuseColor = isBoss
      ? new BABYLON.Color3(0.8, 0.1, 0.8)
      : new BABYLON.Color3(0.8 + Math.random() * 0.2, 0.15, 0.15);
    mat.roughness = 0.7;
    mesh.material = mat;
    mesh.receiveShadow = true;

    // Add to physics
    const entityId = `enemy_${this.enemies.length}_${Date.now()}`;
    this.physics.addBody(entityId, mesh,
      { type: 'kinematicPosition', mass: 0 },
      { shape: 'box', halfExtents: { x: size / 2, y: isBoss ? 1.25 : 0.9, z: size / 2 } }
    );

    // Health
    const health = new HealthComponent(mesh, entityId, {
      maxHp: isBoss ? 500 * diffMult : 60 * diffMult,
      maxShield: isBoss ? 100 : 0,
      armor: isBoss ? 5 : 0,
    });
    this.traitManager.add(health);
    CombatManager.getInstance().register(health);

    // AI
    const ai = new EnemyAI(mesh, entityId, this.physics, {
      detectionRange: isBoss ? 40 : 25,
      attackRange: isBoss ? 25 : 18,
      chaseSpeed: (isBoss ? 3 : 4.5) * Math.min(diffMult, 2),
      weapon: isBoss ? 'shotgun' : 'rifle',
      accuracy: Math.min(0.3 + this.wave * 0.05, 0.85),
    });
    ai.setPlayer(this.playerNode);
    ai.setHealth(health);
    this.traitManager.add(ai);

    // On death
    health.onDeath(() => {
      this.enemiesAlive--;
      this.totalKills++;
      this.onEnemyKilled?.(this.totalKills);

      if (this.enemiesAlive <= 0) {
        this.onWaveComplete?.(this.wave);
      }
    });

    this.enemies.push({ mesh, ai, health });
  }

  /** Clean up dead enemies' meshes */
  cleanup(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.health.alive && !e.mesh.isEnabled()) {
        this.traitManager.removeTrait(e.ai);
        this.traitManager.removeTrait(e.health);
        CombatManager.getInstance().unregister(e.health.entityId);
        this.physics.removeBody(e.health.entityId);
        e.mesh.material?.dispose();
        e.mesh.dispose();
        this.enemies.splice(i, 1);
      }
    }
  }

  dispose(): void {
    for (const e of this.enemies) {
      this.traitManager.removeTrait(e.ai);
      this.traitManager.removeTrait(e.health);
      CombatManager.getInstance().unregister(e.health.entityId);
      this.physics.removeBody(e.health.entityId);
      e.mesh.material?.dispose();
      e.mesh.dispose();
    }
    this.enemies.length = 0;
  }
}
