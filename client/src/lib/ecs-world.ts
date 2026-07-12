/**
 * ECS World — Entity Component System using bitecs for game scene management.
 *
 * Provides high-performance entity management for game scenes:
 *  - Transform, Velocity, Health, AI, Physics, Render components
 *  - Movement, AI, Health, Despawn systems
 *  - Integration points for BabylonJS mesh syncing
 *
 * bitecs uses typed arrays internally — handles 100k+ entities at 60fps.
 *
 * Usage:
 *   import { createGameWorld, Transform, Health } from '@/lib/ecs-world';
 *   const world = createGameWorld();
 *   const eid = world.spawn({ x: 0, y: 1, z: 0 });
 *   world.tick(deltaTime);
 */

import {
  createWorld,
  addEntity,
  removeEntity,
  addComponent,
  removeComponent,
  hasComponent,
  registerComponent,
  query as ecsQuery,
  pipe,
  soa,
  set,
} from 'bitecs';

type World = ReturnType<typeof createWorld>;

// ══════════════════════════════════════════════
// COMPONENTS (SoA backed by Float32Array / Uint8Array)
// ══════════════════════════════════════════════

/** 3D position + rotation + scale */
export const Transform = soa({
  x: [] as number[], y: [] as number[], z: [] as number[],
  rotX: [] as number[], rotY: [] as number[], rotZ: [] as number[],
  scaleX: [] as number[], scaleY: [] as number[], scaleZ: [] as number[],
});

/** Linear + angular velocity */
export const Velocity = soa({
  vx: [] as number[], vy: [] as number[], vz: [] as number[],
  angX: [] as number[], angY: [] as number[], angZ: [] as number[],
});

/** Health pool with max, current, regen */
export const Health = soa({
  current: [] as number[],
  max: [] as number[],
  regenRate: [] as number[],
  lastDamageTime: [] as number[],
  regenDelay: [] as number[],
});

/** AI state machine */
export const AIAgent = soa({
  state: [] as number[],        // 0=idle, 1=patrol, 2=chase, 3=attack, 4=flee, 5=dead
  detectionRange: [] as number[],
  attackRange: [] as number[],
  speed: [] as number[],
  targetEid: [] as number[],
  patrolIndex: [] as number[],
});

/** Physics body */
export const PhysicsBody = soa({
  mass: [] as number[],
  friction: [] as number[],
  restitution: [] as number[],
  isKinematic: [] as number[],
  bodyType: [] as number[],
});

/** Render component — links to BabylonJS mesh by index */
export const Renderable = soa({
  meshIndex: [] as number[],
  isVisible: [] as number[],
  castShadows: [] as number[],
  receiveShadows: [] as number[],
});

/** Lifetime — auto-despawn after TTL */
export const Lifetime = soa({ remaining: [] as number[] });

/** Team/faction tag */
export const Team = soa({ id: [] as number[] });

/** Damage source */
export const DamageSource = soa({
  damage: [] as number[],
  ownerEid: [] as number[],
  hitOnce: [] as number[],
});

// ══════════════════════════════════════════════
// SYSTEMS (plain functions operating on world)
// ══════════════════════════════════════════════

/** Apply velocity to transform */
export function movementSystem(world: World, dt: number): void {
  const ents = Array.from(ecsQuery(world, [Transform, Velocity]));
  for (const eid of ents) {
    Transform.x[eid] += Velocity.vx[eid] * dt;
    Transform.y[eid] += Velocity.vy[eid] * dt;
    Transform.z[eid] += Velocity.vz[eid] * dt;
    Transform.rotX[eid] += Velocity.angX[eid] * dt;
    Transform.rotY[eid] += Velocity.angY[eid] * dt;
    Transform.rotZ[eid] += Velocity.angZ[eid] * dt;
  }
}

/** Health regen system */
export function healthSystem(world: World, dt: number, time: number): void {
  const ents = Array.from(ecsQuery(world, [Health]));
  for (const eid of ents) {
    if (Health.current[eid] <= 0) continue;
    if (Health.current[eid] >= Health.max[eid]) continue;
    if (time - Health.lastDamageTime[eid] < Health.regenDelay[eid]) continue;
    Health.current[eid] = Math.min(
      Health.max[eid],
      Health.current[eid] + Health.regenRate[eid] * dt,
    );
  }
}

/** Lifetime countdown — removes entities when TTL expires */
export function lifetimeSystem(world: World, dt: number): void {
  const ents = Array.from(ecsQuery(world, [Lifetime]));
  for (const eid of ents) {
    Lifetime.remaining[eid] -= dt;
    if (Lifetime.remaining[eid] <= 0) {
      removeEntity(world, eid);
    }
  }
}

// ══════════════════════════════════════════════
// GAME WORLD WRAPPER
// ══════════════════════════════════════════════

export interface GameWorld {
  world: World;
  spawn(pos?: { x?: number; y?: number; z?: number }): number;
  despawn(eid: number): void;
  tick(dt: number): void;
  addComp(eid: number, component: any): void;
  removeComp(eid: number, component: any): void;
  hasComp(eid: number, component: any): boolean;
  queryEnts(...components: any[]): number[];
  entityCount: number;
  time: number;
}

export function createGameWorld(): GameWorld {
  const world = createWorld();
  let _time = 0;
  let _entityCount = 0;

  // Register all components with the world
  registerComponent(world, Transform);
  registerComponent(world, Velocity);
  registerComponent(world, Health);
  registerComponent(world, AIAgent);
  registerComponent(world, PhysicsBody);
  registerComponent(world, Renderable);
  registerComponent(world, Lifetime);
  registerComponent(world, Team);
  registerComponent(world, DamageSource);

  return {
    world,

    spawn(pos) {
      const eid = addEntity(world);
      addComponent(world, eid, Transform);
      Transform.scaleX[eid] = 1;
      Transform.scaleY[eid] = 1;
      Transform.scaleZ[eid] = 1;
      if (pos) {
        Transform.x[eid] = pos.x ?? 0;
        Transform.y[eid] = pos.y ?? 0;
        Transform.z[eid] = pos.z ?? 0;
      }
      _entityCount++;
      return eid;
    },

    despawn(eid) {
      removeEntity(world, eid);
      _entityCount = Math.max(0, _entityCount - 1);
    },

    tick(dt) {
      _time += dt;
      movementSystem(world, dt);
      healthSystem(world, dt, _time);
      lifetimeSystem(world, dt);
    },

    addComp(eid, component) {
      addComponent(world, eid, component);
    },

    removeComp(eid, component) {
      removeComponent(world, eid, component);
    },

    hasComp(eid, component) {
      return hasComponent(world, eid, component);
    },

    queryEnts(...components) {
      return Array.from(ecsQuery(world, components));
    },

    get entityCount() {
      return _entityCount;
    },

    get time() {
      return _time;
    },
  };
}

// ══════════════════════════════════════════════
// AI STATE ENUM (for readable code)
// ══════════════════════════════════════════════

export const AI_STATE = {
  IDLE: 0,
  PATROL: 1,
  CHASE: 2,
  ATTACK: 3,
  FLEE: 4,
  DEAD: 5,
} as const;
