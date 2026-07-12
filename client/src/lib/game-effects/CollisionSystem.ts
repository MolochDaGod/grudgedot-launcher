import * as THREE from 'three';

export enum CollisionLayer {
  DEFAULT = 1,
  PLAYER = 2,
  ENEMY = 4,
  PROJECTILE = 8,
  ENVIRONMENT = 16,
  TRIGGER = 32,
  TOWER = 64,
  UNIT = 128,
}

export interface ColliderConfig {
  type: 'sphere' | 'box' | 'capsule';
  size: THREE.Vector3 | number;
  offset?: THREE.Vector3;
  layer: CollisionLayer;
  mask: number;
  isTrigger?: boolean;
  isStatic?: boolean;
}

export interface CollisionResult {
  entityA: CollisionEntity;
  entityB: CollisionEntity;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  penetration: number;
}

export interface CollisionEntity {
  id: string;
  position: THREE.Vector3;
  collider: Collider;
  velocity?: THREE.Vector3;
  userData?: any;
}

export class Collider {
  public type: 'sphere' | 'box' | 'capsule';
  public size: THREE.Vector3 | number;
  public offset: THREE.Vector3;
  public layer: CollisionLayer;
  public mask: number;
  public isTrigger: boolean;
  public isStatic: boolean;
  public bounds: THREE.Box3;

  public onCollisionEnter?: (other: CollisionEntity) => void;
  public onCollisionStay?: (other: CollisionEntity) => void;
  public onCollisionExit?: (other: CollisionEntity) => void;
  public onTriggerEnter?: (other: CollisionEntity) => void;
  public onTriggerStay?: (other: CollisionEntity) => void;
  public onTriggerExit?: (other: CollisionEntity) => void;

  constructor(config: ColliderConfig) {
    this.type = config.type;
    this.size = config.size;
    this.offset = config.offset?.clone() ?? new THREE.Vector3();
    this.layer = config.layer;
    this.mask = config.mask;
    this.isTrigger = config.isTrigger ?? false;
    this.isStatic = config.isStatic ?? false;
    this.bounds = new THREE.Box3();
  }

  public updateBounds(position: THREE.Vector3): void {
    const center = position.clone().add(this.offset);
    
    if (this.type === 'sphere') {
      const radius = this.size as number;
      this.bounds.setFromCenterAndSize(
        center,
        new THREE.Vector3(radius * 2, radius * 2, radius * 2)
      );
    } else if (this.type === 'box') {
      const size = this.size as THREE.Vector3;
      this.bounds.setFromCenterAndSize(center, size);
    } else if (this.type === 'capsule') {
      const size = this.size as THREE.Vector3;
      this.bounds.setFromCenterAndSize(
        center,
        new THREE.Vector3(size.x * 2, size.y, size.z * 2)
      );
    }
  }

  public canCollideWith(other: Collider): boolean {
    return (this.layer & other.mask) !== 0 && (other.layer & this.mask) !== 0;
  }

  public getRadius(): number {
    if (this.type === 'sphere') {
      return this.size as number;
    } else if (this.type === 'box') {
      const size = this.size as THREE.Vector3;
      return Math.max(size.x, size.y, size.z) * 0.5;
    } else {
      const size = this.size as THREE.Vector3;
      return Math.max(size.x, size.z);
    }
  }
}

interface SpatialHashEntry {
  entity: CollisionEntity;
  bounds: THREE.Box3;
}

class SpatialHash {
  private cellSize: number;
  private cells: Map<string, SpatialHashEntry[]> = new Map();
  private entityCells: Map<string, string[]> = new Map();

  constructor(cellSize: number = 5) {
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  private getCellsForBounds(bounds: THREE.Box3): string[] {
    const keys: string[] = [];
    const minX = Math.floor(bounds.min.x / this.cellSize);
    const maxX = Math.floor(bounds.max.x / this.cellSize);
    const minY = Math.floor(bounds.min.y / this.cellSize);
    const maxY = Math.floor(bounds.max.y / this.cellSize);
    const minZ = Math.floor(bounds.min.z / this.cellSize);
    const maxZ = Math.floor(bounds.max.z / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          keys.push(`${x},${y},${z}`);
        }
      }
    }
    return keys;
  }

  public update(entity: CollisionEntity, bounds: THREE.Box3): void {
    this.remove(entity);

    const cellKeys = this.getCellsForBounds(bounds);
    this.entityCells.set(entity.id, cellKeys);

    const entry: SpatialHashEntry = { entity, bounds: bounds.clone() };
    
    cellKeys.forEach(key => {
      if (!this.cells.has(key)) {
        this.cells.set(key, []);
      }
      this.cells.get(key)!.push(entry);
    });
  }

  public remove(entity: CollisionEntity): void {
    const cellKeys = this.entityCells.get(entity.id);
    if (!cellKeys) return;

    cellKeys.forEach(key => {
      const cell = this.cells.get(key);
      if (cell) {
        const index = cell.findIndex(e => e.entity.id === entity.id);
        if (index !== -1) {
          cell.splice(index, 1);
        }
        if (cell.length === 0) {
          this.cells.delete(key);
        }
      }
    });

    this.entityCells.delete(entity.id);
  }

  public query(bounds: THREE.Box3): SpatialHashEntry[] {
    const results: SpatialHashEntry[] = [];
    const seen = new Set<string>();
    const cellKeys = this.getCellsForBounds(bounds);

    cellKeys.forEach(key => {
      const cell = this.cells.get(key);
      if (cell) {
        cell.forEach(entry => {
          if (!seen.has(entry.entity.id) && bounds.intersectsBox(entry.bounds)) {
            seen.add(entry.entity.id);
            results.push(entry);
          }
        });
      }
    });

    return results;
  }

  public queryRadius(center: THREE.Vector3, radius: number): SpatialHashEntry[] {
    const bounds = new THREE.Box3().setFromCenterAndSize(
      center,
      new THREE.Vector3(radius * 2, radius * 2, radius * 2)
    );
    
    const candidates = this.query(bounds);
    return candidates.filter(entry => {
      const entryCenter = new THREE.Vector3();
      entry.bounds.getCenter(entryCenter);
      return center.distanceTo(entryCenter) <= radius + entry.entity.collider.getRadius();
    });
  }

  public clear(): void {
    this.cells.clear();
    this.entityCells.clear();
  }
}

export class CollisionSystem {
  private entities: Map<string, CollisionEntity> = new Map();
  private spatialHash: SpatialHash;
  private activeCollisions: Map<string, CollisionResult> = new Map();
  private collisionCallbacks: ((result: CollisionResult) => void)[] = [];
  private triggerCallbacks: ((result: CollisionResult, type: 'enter' | 'stay' | 'exit') => void)[] = [];

  constructor(cellSize: number = 5) {
    this.spatialHash = new SpatialHash(cellSize);
  }

  public addEntity(entity: CollisionEntity): void {
    this.entities.set(entity.id, entity);
    entity.collider.updateBounds(entity.position);
    this.spatialHash.update(entity, entity.collider.bounds);
  }

  public removeEntity(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      this.spatialHash.remove(entity);
      this.entities.delete(entityId);
      
      const keysToRemove: string[] = [];
      this.activeCollisions.forEach((_, key) => {
        if (key.includes(entityId)) {
          keysToRemove.push(key);
        }
      });
      keysToRemove.forEach(key => this.activeCollisions.delete(key));
    }
  }

  public updateEntity(entityId: string, position: THREE.Vector3): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.position.copy(position);
      entity.collider.updateBounds(position);
      this.spatialHash.update(entity, entity.collider.bounds);
    }
  }

  public onCollision(callback: (result: CollisionResult) => void): void {
    this.collisionCallbacks.push(callback);
  }

  public onTrigger(callback: (result: CollisionResult, type: 'enter' | 'stay' | 'exit') => void): void {
    this.triggerCallbacks.push(callback);
  }

  public update(): void {
    const currentCollisions = new Map<string, CollisionResult>();

    this.entities.forEach((entityA) => {
      const candidates = this.spatialHash.query(entityA.collider.bounds);

      candidates.forEach(({ entity: entityB }) => {
        if (entityA.id === entityB.id) return;
        if (!entityA.collider.canCollideWith(entityB.collider)) return;

        const pairKey = entityA.id < entityB.id 
          ? `${entityA.id}-${entityB.id}` 
          : `${entityB.id}-${entityA.id}`;

        if (currentCollisions.has(pairKey)) return;

        const result = this.testCollision(entityA, entityB);
        if (result) {
          currentCollisions.set(pairKey, result);
        }
      });
    });

    currentCollisions.forEach((result, key) => {
      const isNew = !this.activeCollisions.has(key);
      
      if (result.entityA.collider.isTrigger || result.entityB.collider.isTrigger) {
        if (isNew) {
          result.entityA.collider.onTriggerEnter?.(result.entityB);
          result.entityB.collider.onTriggerEnter?.(result.entityA);
          this.triggerCallbacks.forEach(cb => cb(result, 'enter'));
        } else {
          result.entityA.collider.onTriggerStay?.(result.entityB);
          result.entityB.collider.onTriggerStay?.(result.entityA);
          this.triggerCallbacks.forEach(cb => cb(result, 'stay'));
        }
      } else {
        if (isNew) {
          result.entityA.collider.onCollisionEnter?.(result.entityB);
          result.entityB.collider.onCollisionEnter?.(result.entityA);
        } else {
          result.entityA.collider.onCollisionStay?.(result.entityB);
          result.entityB.collider.onCollisionStay?.(result.entityA);
        }
        
        this.collisionCallbacks.forEach(cb => cb(result));
        this.resolveCollision(result);
      }
    });

    this.activeCollisions.forEach((result, key) => {
      if (!currentCollisions.has(key)) {
        if (result.entityA.collider.isTrigger || result.entityB.collider.isTrigger) {
          result.entityA.collider.onTriggerExit?.(result.entityB);
          result.entityB.collider.onTriggerExit?.(result.entityA);
          this.triggerCallbacks.forEach(cb => cb(result, 'exit'));
        } else {
          result.entityA.collider.onCollisionExit?.(result.entityB);
          result.entityB.collider.onCollisionExit?.(result.entityA);
        }
      }
    });

    this.activeCollisions = currentCollisions;
  }

  private testCollision(entityA: CollisionEntity, entityB: CollisionEntity): CollisionResult | null {
    const posA = entityA.position.clone().add(entityA.collider.offset);
    const posB = entityB.position.clone().add(entityB.collider.offset);

    if (entityA.collider.type === 'sphere' && entityB.collider.type === 'sphere') {
      return this.testSphereSphere(entityA, entityB, posA, posB);
    } else if (entityA.collider.type === 'box' && entityB.collider.type === 'box') {
      return this.testBoxBox(entityA, entityB);
    } else if (
      (entityA.collider.type === 'sphere' && entityB.collider.type === 'box') ||
      (entityA.collider.type === 'box' && entityB.collider.type === 'sphere')
    ) {
      const sphereEntity = entityA.collider.type === 'sphere' ? entityA : entityB;
      const boxEntity = entityA.collider.type === 'box' ? entityA : entityB;
      return this.testSphereBox(sphereEntity, boxEntity);
    }

    return this.testBoundsOverlap(entityA, entityB);
  }

  private testSphereSphere(
    entityA: CollisionEntity,
    entityB: CollisionEntity,
    posA: THREE.Vector3,
    posB: THREE.Vector3
  ): CollisionResult | null {
    const radiusA = entityA.collider.size as number;
    const radiusB = entityB.collider.size as number;
    
    const direction = posB.clone().sub(posA);
    const distance = direction.length();
    const combinedRadius = radiusA + radiusB;

    if (distance < combinedRadius) {
      const penetration = combinedRadius - distance;
      const normal = distance > 0 ? direction.normalize() : new THREE.Vector3(0, 1, 0);
      const point = posA.clone().add(normal.clone().multiplyScalar(radiusA));

      return {
        entityA,
        entityB,
        point,
        normal,
        penetration,
      };
    }

    return null;
  }

  private testBoxBox(entityA: CollisionEntity, entityB: CollisionEntity): CollisionResult | null {
    if (entityA.collider.bounds.intersectsBox(entityB.collider.bounds)) {
      const centerA = new THREE.Vector3();
      const centerB = new THREE.Vector3();
      entityA.collider.bounds.getCenter(centerA);
      entityB.collider.bounds.getCenter(centerB);

      const direction = centerB.clone().sub(centerA);
      const normal = direction.length() > 0 ? direction.normalize() : new THREE.Vector3(0, 1, 0);

      return {
        entityA,
        entityB,
        point: centerA.clone().lerp(centerB, 0.5),
        normal,
        penetration: 0.1,
      };
    }

    return null;
  }

  private testSphereBox(sphereEntity: CollisionEntity, boxEntity: CollisionEntity): CollisionResult | null {
    const sphereCenter = sphereEntity.position.clone().add(sphereEntity.collider.offset);
    const sphereRadius = sphereEntity.collider.size as number;

    const closestPoint = new THREE.Vector3();
    boxEntity.collider.bounds.clampPoint(sphereCenter, closestPoint);

    const distance = sphereCenter.distanceTo(closestPoint);

    if (distance < sphereRadius) {
      const normal = sphereCenter.clone().sub(closestPoint);
      if (normal.length() > 0) {
        normal.normalize();
      } else {
        normal.set(0, 1, 0);
      }

      return {
        entityA: sphereEntity,
        entityB: boxEntity,
        point: closestPoint,
        normal,
        penetration: sphereRadius - distance,
      };
    }

    return null;
  }

  private testBoundsOverlap(entityA: CollisionEntity, entityB: CollisionEntity): CollisionResult | null {
    if (entityA.collider.bounds.intersectsBox(entityB.collider.bounds)) {
      const centerA = new THREE.Vector3();
      const centerB = new THREE.Vector3();
      entityA.collider.bounds.getCenter(centerA);
      entityB.collider.bounds.getCenter(centerB);

      return {
        entityA,
        entityB,
        point: centerA.clone().lerp(centerB, 0.5),
        normal: centerB.clone().sub(centerA).normalize(),
        penetration: 0.1,
      };
    }

    return null;
  }

  private resolveCollision(result: CollisionResult): void {
    const { entityA, entityB, normal, penetration } = result;

    if (entityA.collider.isStatic && entityB.collider.isStatic) return;

    const separation = normal.clone().multiplyScalar(penetration * 1.01);

    if (entityA.collider.isStatic) {
      entityB.position.add(separation);
      if (entityB.velocity) {
        const dot = entityB.velocity.dot(normal);
        if (dot < 0) {
          entityB.velocity.sub(normal.clone().multiplyScalar(dot));
        }
      }
    } else if (entityB.collider.isStatic) {
      entityA.position.sub(separation);
      if (entityA.velocity) {
        const dot = entityA.velocity.dot(normal);
        if (dot > 0) {
          entityA.velocity.sub(normal.clone().multiplyScalar(dot));
        }
      }
    } else {
      entityA.position.sub(separation.clone().multiplyScalar(0.5));
      entityB.position.add(separation.clone().multiplyScalar(0.5));
    }

    this.updateEntity(entityA.id, entityA.position);
    this.updateEntity(entityB.id, entityB.position);
  }

  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = Infinity): { entity: CollisionEntity; distance: number; point: THREE.Vector3 } | null {
    const ray = new THREE.Ray(origin, direction.normalize());
    let closestHit: { entity: CollisionEntity; distance: number; point: THREE.Vector3 } | null = null;

    this.entities.forEach(entity => {
      const intersection = ray.intersectBox(entity.collider.bounds, new THREE.Vector3());
      if (intersection) {
        const distance = origin.distanceTo(intersection);
        if (distance <= maxDistance && (!closestHit || distance < closestHit.distance)) {
          closestHit = { entity, distance, point: intersection };
        }
      }
    });

    return closestHit;
  }

  public queryRadius(center: THREE.Vector3, radius: number, layer?: CollisionLayer): CollisionEntity[] {
    const entries = this.spatialHash.queryRadius(center, radius);
    return entries
      .filter(e => !layer || (e.entity.collider.layer & layer) !== 0)
      .map(e => e.entity);
  }

  public clear(): void {
    this.entities.clear();
    this.spatialHash.clear();
    this.activeCollisions.clear();
  }
}
