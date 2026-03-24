/**
 * ============================================================================
 * GRUDGE ENGINE — Entity-Component-System (ECS)
 * ============================================================================
 * Ported from Online-Multiplayer-Game arena/game.js
 *
 * ECS separates data (Components) from logic (Systems).
 * Entities are just IDs that hold components.
 * This makes the code modular and easy to extend across arena, MOBA, and MMO.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Entity
// ---------------------------------------------------------------------------

export class Entity {
  private static nextId = 0;

  public id: number;
  public components: Map<string, any>;
  public tags: Set<string>;

  constructor() {
    this.id = Entity.nextId++;
    this.components = new Map();
    this.tags = new Set();
  }

  addComponent<T>(name: string, data: T): this {
    this.components.set(name, data);
    return this;
  }

  getComponent<T>(name: string): T | undefined {
    return this.components.get(name) as T | undefined;
  }

  hasComponent(name: string): boolean {
    return this.components.has(name);
  }

  removeComponent(name: string): this {
    this.components.delete(name);
    return this;
  }

  addTag(tag: string): this {
    this.tags.add(tag);
    return this;
  }

  hasTag(tag: string): boolean {
    return this.tags.has(tag);
  }

  removeTag(tag: string): this {
    this.tags.delete(tag);
    return this;
  }
}

// ---------------------------------------------------------------------------
// System base class
// ---------------------------------------------------------------------------

export abstract class System {
  public world!: World;
  abstract update(delta: number): void;
}

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------

export interface GameEvent {
  type: string;
  data: any;
}

export class World {
  public entities: Map<number, Entity>;
  public systems: System[];
  public eventQueue: GameEvent[];

  constructor() {
    this.entities = new Map();
    this.systems = [];
    this.eventQueue = [];
  }

  createEntity(): Entity {
    const entity = new Entity();
    this.entities.set(entity.id, entity);
    return entity;
  }

  removeEntity(id: number): void {
    this.entities.delete(id);
  }

  getEntity(id: number): Entity | undefined {
    return this.entities.get(id);
  }

  getEntitiesWith(...componentNames: string[]): Entity[] {
    return Array.from(this.entities.values()).filter((entity) =>
      componentNames.every((name) => entity.hasComponent(name)),
    );
  }

  getEntitiesWithTag(tag: string): Entity[] {
    return Array.from(this.entities.values()).filter((entity) =>
      entity.hasTag(tag),
    );
  }

  addSystem(system: System): void {
    this.systems.push(system);
    system.world = this;
  }

  update(delta: number): void {
    for (const system of this.systems) {
      system.update(delta);
    }
    this.eventQueue = [];
  }

  emit(event: GameEvent): void {
    this.eventQueue.push(event);
  }

  getEvents(type: string): GameEvent[] {
    return this.eventQueue.filter((e) => e.type === type);
  }
}

// ---------------------------------------------------------------------------
// Component Factories
// ---------------------------------------------------------------------------

export interface TransformData {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
}

export interface VelocityData {
  linear: THREE.Vector3;
  angular: THREE.Vector3;
}

export interface HealthData {
  current: number;
  max: number;
  regenRate: number;
  invulnerable: boolean;
  lastDamageTime: number;
}

export interface ShieldData {
  current: number;
  max: number;
  regenRate: number;
  regenDelay: number;
}

export interface ResourcePool {
  current: number;
  max: number;
  regenRate: number;
}

export interface ResourcesData {
  mana: ResourcePool;
  energy: ResourcePool;
  rage: ResourcePool;
}

export interface ColliderData {
  type: 'capsule' | 'sphere' | 'box';
  radius: number;
  height: number;
  layer: string;
  isStatic: boolean;
}

export interface MovementData {
  baseSpeed: number;
  sprintMultiplier: number;
  isSprinting: boolean;
  isGrounded: boolean;
  jumpForce: number;
  friction: number;
}

export interface WeaponStateData {
  primary: string;
  secondary: string;
  activeSlot: 'primary' | 'secondary';
  swapCooldown: number;
  lastAttackTime: number;
}

export interface AbilityStateData {
  cooldowns: Record<string, number>;
  casting: string | null;
  castProgress: number;
}

export interface ProjectileData {
  ownerId: number;
  damage: number;
  speed: number;
  lifetime: number;
  maxLifetime: number;
  piercing: boolean;
  homing: boolean;
  onHit: string | null;
}

export interface AIData {
  behavior: 'idle' | 'patrol' | 'chase' | 'attack' | 'retreat' | 'die';
  target: number | null;
  aggroRange: number;
  attackRange: number;
  patrolPoints: THREE.Vector3[];
  currentPatrolIndex: number;
}

export interface RenderMeshData {
  mesh: THREE.Object3D | null;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
}

export interface AnimatorData {
  mixer: THREE.AnimationMixer | null;
  clips: Record<string, THREE.AnimationClip>;
  currentAction: THREE.AnimationAction | null;
  blendTime: number;
}

export interface PlayerInputData {
  moveDirection: THREE.Vector2;
  lookDirection: THREE.Vector3;
  mousePosition: THREE.Vector2;
  actions: {
    jump: boolean;
    sprint: boolean;
    attack: boolean;
    abilityQ: boolean;
    abilityE: boolean;
    abilityR: boolean;
    abilityF: boolean;
    abilityP: boolean;
    weaponSwap: boolean;
  };
}

/** Factory functions that produce fresh component data. */
export const Components = {
  Transform: (x = 0, y = 0, z = 0): TransformData => ({
    position: new THREE.Vector3(x, y, z),
    rotation: new THREE.Euler(0, 0, 0),
    scale: new THREE.Vector3(1, 1, 1),
  }),

  Velocity: (x = 0, y = 0, z = 0): VelocityData => ({
    linear: new THREE.Vector3(x, y, z),
    angular: new THREE.Vector3(0, 0, 0),
  }),

  Health: (max = 100): HealthData => ({
    current: max,
    max,
    regenRate: 0,
    invulnerable: false,
    lastDamageTime: 0,
  }),

  Shield: (max = 0): ShieldData => ({
    current: max,
    max,
    regenRate: 5,
    regenDelay: 3,
  }),

  Resources: (): ResourcesData => ({
    mana: { current: 100, max: 100, regenRate: 5 },
    energy: { current: 100, max: 100, regenRate: 10 },
    rage: { current: 0, max: 100, regenRate: -2 },
  }),

  Collider: (radius = 0.5, height = 1.8): ColliderData => ({
    type: 'capsule',
    radius,
    height,
    layer: 'default',
    isStatic: false,
  }),

  Movement: (speed = 5): MovementData => ({
    baseSpeed: speed,
    sprintMultiplier: 1.5,
    isSprinting: false,
    isGrounded: true,
    jumpForce: 8,
    friction: 0.9,
  }),

  WeaponState: (primary: string, secondary: string): WeaponStateData => ({
    primary,
    secondary,
    activeSlot: 'primary',
    swapCooldown: 0,
    lastAttackTime: 0,
  }),

  AbilityState: (): AbilityStateData => ({
    cooldowns: { Q: 0, E: 0, R: 0, F: 0, P: 0 },
    casting: null,
    castProgress: 0,
  }),

  Projectile: (
    owner: number,
    damage: number,
    speed: number,
    lifetime: number,
  ): ProjectileData => ({
    ownerId: owner,
    damage,
    speed,
    lifetime,
    maxLifetime: lifetime,
    piercing: false,
    homing: false,
    onHit: null,
  }),

  AI: (behavior: AIData['behavior'] = 'idle'): AIData => ({
    behavior,
    target: null,
    aggroRange: 15,
    attackRange: 2,
    patrolPoints: [],
    currentPatrolIndex: 0,
  }),

  RenderMesh: (mesh: THREE.Object3D | null = null): RenderMeshData => ({
    mesh,
    visible: true,
    castShadow: true,
    receiveShadow: true,
  }),

  Animator: (): AnimatorData => ({
    mixer: null,
    clips: {},
    currentAction: null,
    blendTime: 0.2,
  }),

  PlayerInput: (): PlayerInputData => ({
    moveDirection: new THREE.Vector2(0, 0),
    lookDirection: new THREE.Vector3(0, 0, -1),
    mousePosition: new THREE.Vector2(0, 0),
    actions: {
      jump: false,
      sprint: false,
      attack: false,
      abilityQ: false,
      abilityE: false,
      abilityR: false,
      abilityF: false,
      abilityP: false,
      weaponSwap: false,
    },
  }),
};
