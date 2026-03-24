/**
 * ============================================================================
 * GRUDGE ENGINE — Collision System
 * ============================================================================
 * Ported from Online-Multiplayer-Game arena/game.js Section 6.
 *
 * Raycasting-based collision detection with layer masks.
 * Supports ray, sphere, and capsule queries.
 */

import * as THREE from 'three';
import type { Entity, TransformData } from './ecs';

// ---------------------------------------------------------------------------
// Collision Layers
// ---------------------------------------------------------------------------

export const CollisionLayer = {
  PLAYER:      0b00000010,  // 2
  ENEMY:       0b00000100,  // 4
  PROJECTILE:  0b00001000,  // 8
  ENVIRONMENT: 0b00010000,  // 16
  INTERACTABLE:0b00100000,  // 32
  NPC:         0b01000000,  // 64
  ALL:         0xFFFF,
} as const;

export type CollisionLayerName = keyof typeof CollisionLayer;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColliderEntry {
  mesh: THREE.Object3D;
  layer: number;
  data: Record<string, any>;
}

export interface RaycastHit {
  hit: true;
  point: THREE.Vector3;
  distance: number;
  normal: THREE.Vector3;
  object: THREE.Object3D;
  data: Record<string, any>;
}

export interface RaycastMiss {
  hit: false;
}

export type RaycastResult = RaycastHit | RaycastMiss;

// ---------------------------------------------------------------------------
// CollisionSystem
// ---------------------------------------------------------------------------

export class CollisionSystem {
  private raycaster = new THREE.Raycaster();
  private colliders: ColliderEntry[] = [];

  /** Register a mesh as a collider on a given layer. */
  addCollider(mesh: THREE.Object3D, layer: number = CollisionLayer.ENVIRONMENT, data: Record<string, any> = {}): void {
    this.colliders.push({ mesh, layer, data });
  }

  /** Remove a collider by its mesh reference. */
  removeCollider(mesh: THREE.Object3D): void {
    const index = this.colliders.findIndex((c) => c.mesh === mesh);
    if (index !== -1) this.colliders.splice(index, 1);
  }

  /** Cast a ray and return the first hit on the given layer mask. */
  checkCollision(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance = 100,
    layerMask = CollisionLayer.ALL,
  ): RaycastResult {
    this.raycaster.set(origin, direction.clone().normalize());
    this.raycaster.far = maxDistance;

    const meshes = this.colliders
      .filter((c) => (c.layer & layerMask) !== 0)
      .map((c) => c.mesh);

    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const collider = this.colliders.find(
        (c) => c.mesh === hit.object || (c.mesh as THREE.Group).children?.includes(hit.object),
      );
      return {
        hit: true,
        point: hit.point,
        distance: hit.distance,
        normal: hit.face?.normal ?? new THREE.Vector3(0, 1, 0),
        object: hit.object,
        data: collider?.data ?? {},
      };
    }

    return { hit: false };
  }

  /**
   * Check collisions in 6 cardinal directions from a sphere center.
   * Returns all hits within the given radius.
   */
  checkSphereCollision(
    position: THREE.Vector3,
    radius: number,
    layerMask = CollisionLayer.ALL,
  ): RaycastHit[] {
    const directions = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, -1, 0),
    ];

    const results: RaycastHit[] = [];
    for (const dir of directions) {
      const result = this.checkCollision(position, dir, radius, layerMask);
      if (result.hit) results.push(result);
    }
    return results;
  }

  /**
   * Push an entity out of any overlapping colliders.
   * Requires the entity to have a Transform component.
   */
  resolveCollision(entity: Entity, collisions: RaycastHit[]): void {
    const transform = entity.getComponent<TransformData>('Transform');
    if (!transform) return;

    for (const collision of collisions) {
      const pushDir = transform.position.clone().sub(collision.point).normalize();
      transform.position.add(pushDir.multiplyScalar(collision.distance * 0.5));
    }
  }

  /** Clear all registered colliders. */
  clear(): void {
    this.colliders = [];
  }

  /** Get the number of registered colliders. */
  get count(): number {
    return this.colliders.length;
  }
}
