/**
 * Combat System — Damage pipeline, health, shields, hit detection
 *
 * Ported from Armory3D's trait-based damage system. Each combatant gets a
 * HealthComponent trait. The CombatManager is a singleton event bus that
 * processes DamageEvents, applies armor/shield reduction, and notifies listeners.
 */

import * as BABYLON from '@babylonjs/core';
import { Trait, TraitManager } from './trait-system';

// ── Types ──

export type DamageType = 'bullet' | 'explosion' | 'melee' | 'fire' | 'fall';

export interface DamageEvent {
  sourceId: string;
  targetId: string;
  amount: number;
  type: DamageType;
  position: BABYLON.Vector3;
  normal: BABYLON.Vector3;
  headshot?: boolean;
}

export interface KillEvent {
  killerId: string;
  victimId: string;
  weapon: string;
  headshot: boolean;
}

export type DamageCallback = (event: DamageEvent, actualDamage: number) => void;
export type KillCallback = (event: KillEvent) => void;
export type DeathCallback = (entityId: string) => void;

// ── Health Component (Trait) ──

export interface HealthConfig {
  maxHp: number;
  maxShield: number;
  shieldRegenRate: number;   // points per second
  shieldRegenDelay: number;  // seconds after last hit before regen starts
  armor: number;             // flat damage reduction
  headshotMultiplier: number;
}

const DEFAULT_HEALTH: HealthConfig = {
  maxHp: 100,
  maxShield: 50,
  shieldRegenRate: 8,
  shieldRegenDelay: 3,
  armor: 0,
  headshotMultiplier: 2.0,
};

export class HealthComponent extends Trait {
  readonly entityId: string;
  config: HealthConfig;

  hp: number;
  shield: number;
  alive = true;
  invincibleTimer = 0;

  private shieldRegenCooldown = 0;
  private _onDeath: DeathCallback[] = [];

  constructor(
    node: BABYLON.TransformNode | BABYLON.AbstractMesh,
    entityId: string,
    config: Partial<HealthConfig> = {}
  ) {
    super(node);
    this.entityId = entityId;
    this.config = { ...DEFAULT_HEALTH, ...config };
    this.hp = this.config.maxHp;
    this.shield = this.config.maxShield;
  }

  onDeath(cb: DeathCallback): void {
    this._onDeath.push(cb);
  }

  /** Apply damage after armor/shield. Returns actual damage dealt. */
  takeDamage(event: DamageEvent): number {
    if (!this.alive || this.invincibleTimer > 0) return 0;

    let dmg = event.amount;

    // Headshot multiplier
    if (event.headshot) {
      dmg *= this.config.headshotMultiplier;
    }

    // Armor reduction (flat)
    dmg = Math.max(1, dmg - this.config.armor);

    // Shield absorbs first
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, dmg);
      this.shield -= absorbed;
      dmg -= absorbed;
    }

    // Remaining goes to HP
    this.hp -= dmg;
    this.shieldRegenCooldown = this.config.shieldRegenDelay;

    const actual = event.amount; // report pre-reduction for UI

    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
      this._onDeath.forEach(cb => cb(this.entityId));
    }

    return actual;
  }

  /** Heal HP (clamped to max) */
  heal(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.min(this.config.maxHp, this.hp + amount);
  }

  /** Restore shield */
  restoreShield(amount: number): void {
    this.shield = Math.min(this.config.maxShield, this.shield + amount);
  }

  /** Reset to full health/shield and mark alive */
  respawn(): void {
    this.hp = this.config.maxHp;
    this.shield = this.config.maxShield;
    this.alive = true;
    this.invincibleTimer = 1.5; // brief spawn protection
  }

  get hpPercent(): number { return this.hp / this.config.maxHp; }
  get shieldPercent(): number { return this.config.maxShield > 0 ? this.shield / this.config.maxShield : 0; }

  update(dt: number): void {
    if (!this.alive) return;

    // Invincibility countdown
    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }

    // Shield regen
    if (this.shieldRegenCooldown > 0) {
      this.shieldRegenCooldown -= dt;
    } else if (this.shield < this.config.maxShield) {
      this.shield = Math.min(
        this.config.maxShield,
        this.shield + this.config.shieldRegenRate * dt
      );
    }
  }
}

// ── Combat Manager (singleton event bus) ──

export class CombatManager {
  private static instance: CombatManager | null = null;

  private healthComponents: Map<string, HealthComponent> = new Map();
  private damageListeners: DamageCallback[] = [];
  private killListeners: KillCallback[] = [];

  // Stats
  totalDamageDealt = 0;
  totalKills = 0;
  killFeed: KillEvent[] = [];

  static getInstance(): CombatManager {
    if (!CombatManager.instance) {
      CombatManager.instance = new CombatManager();
    }
    return CombatManager.instance;
  }

  static reset(): void {
    CombatManager.instance = null;
  }

  register(health: HealthComponent): void {
    this.healthComponents.set(health.entityId, health);
  }

  unregister(entityId: string): void {
    this.healthComponents.delete(entityId);
  }

  getHealth(entityId: string): HealthComponent | undefined {
    return this.healthComponents.get(entityId);
  }

  /** Process a damage event through the pipeline */
  applyDamage(event: DamageEvent): void {
    const target = this.healthComponents.get(event.targetId);
    if (!target || !target.alive) return;

    const wasAlive = target.alive;
    const actual = target.takeDamage(event);
    this.totalDamageDealt += actual;

    // Notify damage listeners
    this.damageListeners.forEach(cb => cb(event, actual));

    // Check for kill
    if (wasAlive && !target.alive) {
      this.totalKills++;
      const killEvt: KillEvent = {
        killerId: event.sourceId,
        victimId: event.targetId,
        weapon: event.type,
        headshot: event.headshot ?? false,
      };
      this.killFeed.push(killEvt);
      if (this.killFeed.length > 10) this.killFeed.shift();
      this.killListeners.forEach(cb => cb(killEvt));
    }
  }

  /** Explosion damage: hits everything in radius */
  applyExplosion(
    sourceId: string,
    center: BABYLON.Vector3,
    radius: number,
    maxDamage: number
  ): void {
    for (const [id, health] of this.healthComponents) {
      if (!health.alive || id === sourceId) continue;
      const dist = BABYLON.Vector3.Distance(center, health.node.position);
      if (dist < radius) {
        const falloff = 1 - (dist / radius);
        const dmg = Math.round(maxDamage * falloff);
        if (dmg > 0) {
          const dir = health.node.position.subtract(center).normalize();
          this.applyDamage({
            sourceId,
            targetId: id,
            amount: dmg,
            type: 'explosion',
            position: center,
            normal: dir,
          });
        }
      }
    }
  }

  onDamage(cb: DamageCallback): () => void {
    this.damageListeners.push(cb);
    return () => {
      const idx = this.damageListeners.indexOf(cb);
      if (idx >= 0) this.damageListeners.splice(idx, 1);
    };
  }

  onKill(cb: KillCallback): () => void {
    this.killListeners.push(cb);
    return () => {
      const idx = this.killListeners.indexOf(cb);
      if (idx >= 0) this.killListeners.splice(idx, 1);
    };
  }

  /** Get all alive entity IDs */
  getAliveEntities(): string[] {
    const result: string[] = [];
    for (const [id, h] of this.healthComponents) {
      if (h.alive) result.push(id);
    }
    return result;
  }
}
