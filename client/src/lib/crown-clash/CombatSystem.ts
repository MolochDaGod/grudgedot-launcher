import * as THREE from 'three';
import type { GameUnit, GameBuilding, UnitFactory } from './UnitFactory';
import type { CrownClashSceneManager } from './CrownClashScene';
import type { BuildingSystem } from './BuildingSystem';

export interface Projectile {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  target: THREE.Vector3;
  speed: number;
  damage: number;
  owner: 'player' | 'enemy';
  onHit?: () => void;
}

export interface CombatEvent {
  type: 'unit_killed' | 'building_destroyed' | 'crown_earned' | 'king_destroyed';
  owner: 'player' | 'enemy';
  targetId: string;
  lane?: string;
}

export class CombatSystem {
  private scene: THREE.Scene;
  private arenaScene: CrownClashSceneManager;
  private unitFactory: UnitFactory;
  private buildingSystem: BuildingSystem;
  
  private units: GameUnit[] = [];
  private projectiles: Projectile[] = [];
  private eventQueue: CombatEvent[] = [];
  private gameTime = 0;

  constructor(
    scene: THREE.Scene,
    arenaScene: CrownClashSceneManager,
    unitFactory: UnitFactory,
    buildingSystem: BuildingSystem,
  ) {
    this.scene = scene;
    this.arenaScene = arenaScene;
    this.unitFactory = unitFactory;
    this.buildingSystem = buildingSystem;
  }

  addUnit(unit: GameUnit): void {
    this.units.push(unit);
  }

  getUnits(): GameUnit[] { return this.units; }
  
  getPlayerUnits(): GameUnit[] { return this.units.filter(u => u.owner === 'player' && !u.isDead); }
  
  getEnemyUnits(): GameUnit[] { return this.units.filter(u => u.owner === 'enemy' && !u.isDead); }

  flushEvents(): CombatEvent[] {
    const events = [...this.eventQueue];
    this.eventQueue = [];
    return events;
  }

  update(delta: number): void {
    this.gameTime += delta;

    // Update unit movement, targeting, combat
    this.updateUnits(delta);

    // Update building attacks and spawns
    this.updateBuildings(delta);

    // Update projectiles
    this.updateProjectiles(delta);

    // Clean dead units
    this.cleanDead();

    // Update animation mixers
    this.unitFactory.update(this.units, delta);
  }

  private updateUnits(delta: number): void {
    for (const unit of this.units) {
      if (unit.isDead) continue;

      // Find target if needed
      if (!unit.target || this.isTargetDead(unit.target)) {
        unit.target = this.findTarget(unit);
      }

      if (!unit.target) continue;

      const targetPos = this.getTargetPosition(unit.target);
      const unitPos = unit.mesh.position;
      const dist = unitPos.distanceTo(targetPos);

      // Check if unit needs to cross river via bridge
      const needsBridge = this.needsBridgeCrossing(unitPos, targetPos);

      if (needsBridge && !unit.waypoint) {
        unit.waypoint = this.arenaScene.getClosestBridge(unitPos);
      }

      // Move toward waypoint or target
      let moveTarget: THREE.Vector3;
      if (unit.waypoint) {
        const waypointDist = unitPos.distanceTo(unit.waypoint);
        if (waypointDist < 2) {
          unit.waypoint = null; // Reached bridge
          moveTarget = targetPos;
        } else {
          moveTarget = unit.waypoint;
        }
      } else {
        moveTarget = targetPos;
      }

      if (dist > unit.stats.attackRange) {
        // Move toward target
        const dir = new THREE.Vector3().subVectors(moveTarget, unitPos).normalize();
        dir.y = 0;
        unitPos.addScaledVector(dir, unit.stats.speed * delta);
        unitPos.y = 0;

        // Face movement direction
        unit.mesh.rotation.y = Math.atan2(dir.x, dir.z);

        this.unitFactory.playAnimation(unit, 'run');
      } else {
        // In range — attack
        if (this.gameTime >= unit.nextAttackTime) {
          this.performAttack(unit);
          unit.nextAttackTime = this.gameTime + 1 / unit.stats.attackRate;
        }
        
        // Face target
        const dir = new THREE.Vector3().subVectors(targetPos, unitPos).normalize();
        unit.mesh.rotation.y = Math.atan2(dir.x, dir.z);
      }
    }
  }

  private updateBuildings(delta: number): void {
    const buildings = this.buildingSystem.getBuildings();

    for (const building of buildings) {
      if (building.destroyed) continue;

      // Building attacks
      if (building.damage > 0 && this.gameTime >= building.nextAttackTime) {
        const enemyUnits = building.owner === 'player' ? this.getEnemyUnits() : this.getPlayerUnits();
        const target = this.findClosestInRange(building.position, enemyUnits, building.range);
        
        if (target) {
          this.fireProjectile(building.position.clone().add(new THREE.Vector3(0, 2, 0)), target.mesh.position, building.damage, building.owner);
          building.nextAttackTime = this.gameTime + 1 / building.attackRate;
        }
      }

      // Building spawns
      if (building.spawnsUnit && building.spawnInterval > 0) {
        building.spawnTimer -= delta;
        if (building.spawnTimer <= 0) {
          building.spawnTimer = building.spawnInterval;
          this.spawnFromBuilding(building);
        }
      }
    }
  }

  private spawnFromBuilding(building: GameBuilding): void {
    const spawnPos = building.position.clone();
    spawnPos.z += building.owner === 'player' ? -2 : 2;
    spawnPos.x += (Math.random() - 0.5) * 2;

    const faction = building.owner === 'player' ? 'elves' : 'orcs'; // TODO: use actual faction
    const role = building.spawnsUnit as any;
    
    const unit = this.unitFactory.spawnUnit(faction, role, building.owner, spawnPos, building.lane);
    if (unit) {
      this.addUnit(unit);
    }
  }

  private performAttack(unit: GameUnit): void {
    if (!unit.target) return;

    this.unitFactory.playAnimation(unit, 'attack');

    if (unit.stats.isRanged) {
      const targetPos = this.getTargetPosition(unit.target);
      this.fireProjectile(
        unit.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
        targetPos.clone().add(new THREE.Vector3(0, 0.8, 0)),
        unit.stats.damage,
        unit.owner
      );
    } else {
      // Melee — direct damage
      this.applyDamage(unit.target, unit.stats.damage, unit.owner);
    }
  }

  private fireProjectile(from: THREE.Vector3, to: THREE.Vector3, damage: number, owner: 'player' | 'enemy'): void {
    const geo = new THREE.SphereGeometry(0.15, 6, 6);
    const mat = new THREE.MeshStandardMaterial({
      color: owner === 'player' ? 0x44aaff : 0xff4444,
      emissive: owner === 'player' ? 0x2266cc : 0xcc2222,
      metalness: 0,
      roughness: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(from);
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      origin: from.clone(),
      target: to.clone(),
      speed: 20,
      damage,
      owner,
    });
  }

  private updateProjectiles(delta: number): void {
    this.projectiles = this.projectiles.filter(proj => {
      const dir = new THREE.Vector3().subVectors(proj.target, proj.mesh.position);
      const dist = dir.length();

      if (dist < proj.speed * delta) {
        // Hit
        this.scene.remove(proj.mesh);
        proj.mesh.geometry.dispose();
        (proj.mesh.material as THREE.Material).dispose();

        // Find what's at the target location
        const enemyOwner = proj.owner === 'player' ? 'enemy' : 'player';
        const nearbyUnit = this.units.find(u =>
          !u.isDead && u.owner === enemyOwner &&
          u.mesh.position.distanceTo(proj.target) < 2
        );
        if (nearbyUnit) {
          this.applyDamage(nearbyUnit, proj.damage, proj.owner);
        }
        return false;
      }

      dir.normalize();
      proj.mesh.position.addScaledVector(dir, proj.speed * delta);
      return true;
    });
  }

  private applyDamage(target: GameUnit | GameBuilding, damage: number, attackerOwner: 'player' | 'enemy'): void {
    if ('isDead' in target) {
      // It's a unit
      const unit = target as GameUnit;
      unit.stats.health -= damage;
      this.unitFactory.updateHealthBar(unit);

      if (unit.stats.health <= 0) {
        unit.isDead = true;
        this.unitFactory.playAnimation(unit, 'hit');
        this.eventQueue.push({
          type: 'unit_killed',
          owner: attackerOwner,
          targetId: unit.id,
          lane: unit.lane,
        });
      }
    } else {
      // It's a building
      const building = target as GameBuilding;
      if (building.destroyed) return;
      building.health -= damage;
      this.buildingSystem.updateHealthBar(building);

      if (building.health <= 0) {
        this.buildingSystem.destroyBuilding(building);
        
        if (building.isKing) {
          this.eventQueue.push({
            type: 'king_destroyed',
            owner: attackerOwner,
            targetId: building.id,
          });
        } else {
          this.eventQueue.push({
            type: 'building_destroyed',
            owner: attackerOwner,
            targetId: building.id,
            lane: building.lane,
          });
          this.eventQueue.push({
            type: 'crown_earned',
            owner: attackerOwner,
            targetId: building.id,
          });
        }
      }
    }
  }

  private findTarget(unit: GameUnit): GameUnit | GameBuilding | null {
    const enemyOwner = unit.owner === 'player' ? 'enemy' : 'player';
    
    // Priority: nearby enemy units > same-lane tower > king tower
    const enemyUnits = this.units.filter(u => !u.isDead && u.owner === enemyOwner);
    const nearbyEnemies = enemyUnits
      .map(u => ({ unit: u, dist: unit.mesh.position.distanceTo(u.mesh.position) }))
      .filter(e => e.dist < 15)
      .sort((a, b) => a.dist - b.dist);

    if (nearbyEnemies.length > 0) {
      // Prefer same-lane enemies
      const sameLane = nearbyEnemies.filter(e => e.unit.lane === unit.lane);
      return (sameLane[0] || nearbyEnemies[0]).unit;
    }

    // Target buildings
    const buildings = this.buildingSystem.getBuildings()
      .filter(b => !b.destroyed && b.owner === enemyOwner);
    
    // Can only attack king tower if princess towers in that lane are destroyed
    const princessTowers = buildings.filter(b => !b.isKing);
    const kingTower = buildings.find(b => b.isKing);

    if (princessTowers.length > 0) {
      // Target closest princess tower, prefer same lane
      const sameLaneTower = princessTowers.find(b => b.lane === unit.lane);
      if (sameLaneTower) return sameLaneTower;
      return princessTowers.sort((a, b) =>
        unit.mesh.position.distanceTo(a.position) - unit.mesh.position.distanceTo(b.position)
      )[0];
    }

    return kingTower || null;
  }

  private findClosestInRange(pos: THREE.Vector3, units: GameUnit[], range: number): GameUnit | null {
    let closest: GameUnit | null = null;
    let closestDist = range;

    for (const unit of units) {
      const dist = pos.distanceTo(unit.mesh.position);
      if (dist < closestDist) {
        closestDist = dist;
        closest = unit;
      }
    }
    return closest;
  }

  private getTargetPosition(target: GameUnit | GameBuilding): THREE.Vector3 {
    if ('mesh' in target && 'isDead' in target) {
      return (target as GameUnit).mesh.position;
    }
    return (target as GameBuilding).position;
  }

  private isTargetDead(target: GameUnit | GameBuilding): boolean {
    if ('isDead' in target) return (target as GameUnit).isDead;
    return (target as GameBuilding).destroyed;
  }

  private needsBridgeCrossing(from: THREE.Vector3, to: THREE.Vector3): boolean {
    const riverHW = 2;
    const fromAbove = from.z < -riverHW;
    const fromBelow = from.z > riverHW;
    const toAbove = to.z < -riverHW;
    const toBelow = to.z > riverHW;
    return (fromAbove && toBelow) || (fromBelow && toAbove);
  }

  private pendingRemoval = new Set<string>();

  private cleanDead(): void {
    for (const unit of this.units) {
      if (!unit.isDead || this.pendingRemoval.has(unit.id)) continue;

      // Mark so we don't schedule removal twice
      this.pendingRemoval.add(unit.id);

      // Immediate: shrink + sink the mesh as death visual
      const mesh = unit.mesh;
      const startScale = mesh.scale.x;
      let elapsed = 0;
      const shrink = () => {
        elapsed += 16;
        const t = Math.min(elapsed / 600, 1); // 600ms fade
        mesh.scale.setScalar(startScale * (1 - t * 0.7));
        mesh.position.y = -t * 0.5;
        mesh.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            (child.material as THREE.MeshStandardMaterial).opacity = 1 - t;
            (child.material as THREE.MeshStandardMaterial).transparent = true;
          }
        });
        if (t < 1) requestAnimationFrame(shrink);
      };
      requestAnimationFrame(shrink);

      // After fade, fully remove
      setTimeout(() => {
        this.unitFactory.removeUnit(unit);
        this.units = this.units.filter(u => u.id !== unit.id);
        this.pendingRemoval.delete(unit.id);
      }, 700);
    }
  }

  dispose(): void {
    for (const unit of this.units) {
      this.unitFactory.removeUnit(unit);
    }
    this.units = [];
    for (const proj of this.projectiles) {
      this.scene.remove(proj.mesh);
    }
    this.projectiles = [];
  }
}
