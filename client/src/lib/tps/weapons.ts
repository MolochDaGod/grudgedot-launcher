/**
 * Weapon System — Definitions and firing logic
 *
 * Supports hitscan (rifle, pistol, shotgun, sniper) and projectile (rocket) modes.
 * Uses Rapier raycasting for hitscan hit detection and spawns BabylonJS meshes
 * for visible projectiles.
 */

import * as BABYLON from '@babylonjs/core';
import { RapierPhysicsWorld } from '../rapier-physics';
import { CombatManager, DamageEvent } from './combat-system';
import * as VFX from './tps-vfx';

// ── Weapon Definitions ──

export type WeaponType = 'hitscan' | 'projectile';

export interface WeaponDef {
  name: string;
  type: WeaponType;
  damage: number;
  fireRate: number;          // rounds per second
  range: number;             // max distance
  spread: number;            // radians of cone spread
  recoil: number;            // screen shake intensity
  magSize: number;
  reloadTime: number;        // seconds
  pellets: number;           // >1 for shotgun
  projectileSpeed: number;   // for projectile type
  explosionRadius: number;   // for projectile type
  headshotMultiplier: number;
  auto: boolean;             // full-auto vs semi-auto
}

export const WEAPONS: Record<string, WeaponDef> = {
  pistol: {
    name: 'Pistol',
    type: 'hitscan',
    damage: 18,
    fireRate: 4,
    range: 80,
    spread: 0.015,
    recoil: 2,
    magSize: 12,
    reloadTime: 1.2,
    pellets: 1,
    projectileSpeed: 0,
    explosionRadius: 0,
    headshotMultiplier: 2.5,
    auto: false,
  },
  rifle: {
    name: 'Assault Rifle',
    type: 'hitscan',
    damage: 14,
    fireRate: 10,
    range: 100,
    spread: 0.025,
    recoil: 1.5,
    magSize: 30,
    reloadTime: 2.0,
    pellets: 1,
    projectileSpeed: 0,
    explosionRadius: 0,
    headshotMultiplier: 2.0,
    auto: true,
  },
  shotgun: {
    name: 'Shotgun',
    type: 'hitscan',
    damage: 8,
    fireRate: 1.2,
    range: 25,
    spread: 0.08,
    recoil: 6,
    magSize: 6,
    reloadTime: 2.5,
    pellets: 8,
    projectileSpeed: 0,
    explosionRadius: 0,
    headshotMultiplier: 1.5,
    auto: false,
  },
  sniper: {
    name: 'Sniper Rifle',
    type: 'hitscan',
    damage: 75,
    fireRate: 0.8,
    range: 200,
    spread: 0.003,
    recoil: 8,
    magSize: 5,
    reloadTime: 3.0,
    pellets: 1,
    projectileSpeed: 0,
    explosionRadius: 0,
    headshotMultiplier: 3.0,
    auto: false,
  },
  rocket: {
    name: 'Rocket Launcher',
    type: 'projectile',
    damage: 80,
    fireRate: 0.6,
    range: 150,
    spread: 0.01,
    recoil: 10,
    magSize: 3,
    reloadTime: 3.5,
    pellets: 1,
    projectileSpeed: 40,
    explosionRadius: 5,
    headshotMultiplier: 1.0,
    auto: false,
  },
};

// ── Projectile tracker ──

interface ActiveProjectile {
  mesh: BABYLON.Mesh;
  velocity: BABYLON.Vector3;
  sourceId: string;
  damage: number;
  explosionRadius: number;
  life: number;
}

// ── Weapon System Class ──

export class WeaponSystem {
  scene: BABYLON.Scene;
  physics: RapierPhysicsWorld;
  combat: CombatManager;
  ownerId: string;

  currentWeapon: WeaponDef;
  ammo: number;
  maxAmmo: number;
  reloading = false;
  reloadTimer = 0;
  fireCooldown = 0;

  private projectiles: ActiveProjectile[] = [];
  private observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;

  constructor(
    scene: BABYLON.Scene,
    physics: RapierPhysicsWorld,
    ownerId: string,
    startWeapon: string = 'rifle'
  ) {
    this.scene = scene;
    this.physics = physics;
    this.combat = CombatManager.getInstance();
    this.ownerId = ownerId;
    this.currentWeapon = WEAPONS[startWeapon] || WEAPONS.rifle;
    this.ammo = this.currentWeapon.magSize;
    this.maxAmmo = this.currentWeapon.magSize;

    // Update loop for projectiles and cooldowns
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      this.updateProjectiles(dt);
      if (this.fireCooldown > 0) this.fireCooldown -= dt;
      if (this.reloading) {
        this.reloadTimer -= dt;
        if (this.reloadTimer <= 0) {
          this.ammo = this.currentWeapon.magSize;
          this.reloading = false;
        }
      }
    });
  }

  /** Switch to a different weapon */
  equip(weaponKey: string): void {
    const def = WEAPONS[weaponKey];
    if (!def) return;
    this.currentWeapon = def;
    this.ammo = def.magSize;
    this.maxAmmo = def.magSize;
    this.reloading = false;
    this.fireCooldown = 0;
  }

  /** Start reload */
  reload(): void {
    if (this.reloading || this.ammo >= this.currentWeapon.magSize) return;
    this.reloading = true;
    this.reloadTimer = this.currentWeapon.reloadTime;
  }

  /** Attempt to fire. Returns true if shot was fired. */
  fire(origin: BABYLON.Vector3, direction: BABYLON.Vector3): boolean {
    if (this.fireCooldown > 0 || this.reloading) return false;
    if (this.ammo <= 0) {
      this.reload();
      return false;
    }

    this.ammo--;
    this.fireCooldown = 1 / this.currentWeapon.fireRate;

    const w = this.currentWeapon;

    // Compute barrel position (slightly in front of origin)
    const barrelPos = origin.add(direction.scale(0.5));

    // Compute right direction for shell casing
    const up = BABYLON.Vector3.Up();
    const right = BABYLON.Vector3.Cross(direction, up).normalize();

    VFX.muzzleFlash(this.scene, barrelPos, direction);
    VFX.shellCasing(this.scene, barrelPos, right);
    VFX.screenShake(w.recoil);

    if (w.type === 'hitscan') {
      this.fireHitscan(barrelPos, direction, w);
    } else {
      this.fireProjectile(barrelPos, direction, w);
    }

    return true;
  }

  private fireHitscan(origin: BABYLON.Vector3, baseDir: BABYLON.Vector3, w: WeaponDef): void {
    for (let i = 0; i < w.pellets; i++) {
      // Apply spread
      const dir = this.applySpread(baseDir, w.spread);

      const hit = this.physics.raycast(origin, dir, w.range);

      if (hit) {
        VFX.bulletTracer(this.scene, origin, hit.point);

        if (hit.gameObjectId && hit.gameObjectId !== this.ownerId) {
          // Determine headshot (hit above 80% of target height)
          const targetHealth = this.combat.getHealth(hit.gameObjectId);
          let headshot = false;
          if (targetHealth) {
            const targetY = targetHealth.node.position.y;
            // Simple headshot: hit point is in upper 20% of target
            const bounding = (targetHealth.node as BABYLON.AbstractMesh).getBoundingInfo?.();
            if (bounding) {
              const height = bounding.boundingBox.extendSize.y * 2;
              headshot = hit.point.y > targetY + height * 0.3;
            }
          }

          const event: DamageEvent = {
            sourceId: this.ownerId,
            targetId: hit.gameObjectId,
            amount: w.damage,
            type: 'bullet',
            position: hit.point,
            normal: hit.normal,
            headshot,
          };
          this.combat.applyDamage(event);

          VFX.bloodSplatter(this.scene, hit.point, hit.normal);
          VFX.damageNumber(this.scene, hit.point, w.damage, headshot);
        } else {
          VFX.impactSpark(this.scene, hit.point, hit.normal);
        }
      } else {
        // Tracer to max range
        VFX.bulletTracer(this.scene, origin, origin.add(dir.scale(w.range)));
      }
    }
  }

  private fireProjectile(origin: BABYLON.Vector3, baseDir: BABYLON.Vector3, w: WeaponDef): void {
    const dir = this.applySpread(baseDir, w.spread);

    const rocket = BABYLON.MeshBuilder.CreateSphere('projectile', { diameter: 0.15 }, this.scene);
    rocket.position = origin.clone();

    const mat = new BABYLON.StandardMaterial('projMat', this.scene);
    mat.emissiveColor = new BABYLON.Color3(1, 0.4, 0.1);
    mat.diffuseColor = new BABYLON.Color3(1, 0.5, 0.1);
    rocket.material = mat;
    rocket.isPickable = false;

    this.projectiles.push({
      mesh: rocket,
      velocity: dir.scale(w.projectileSpeed),
      sourceId: this.ownerId,
      damage: w.damage,
      explosionRadius: w.explosionRadius,
      life: w.range / w.projectileSpeed,
    });
  }

  private updateProjectiles(dt: number): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;

      const movement = p.velocity.scale(dt);
      const dir = p.velocity.normalize();

      // Check for collision via raycast
      const hit = this.physics.raycast(p.mesh.position, dir, movement.length() + 0.2);

      if (hit && hit.distance < movement.length() + 0.2) {
        // Explode
        VFX.explosion(this.scene, hit.point, p.explosionRadius);
        this.combat.applyExplosion(p.sourceId, hit.point, p.explosionRadius, p.damage);
        this.disposeProjectile(i);
        continue;
      }

      p.mesh.position.addInPlace(movement);

      // Trail particles
      const trailPs = new BABYLON.ParticleSystem('rocketTrail', 5, this.scene);
      trailPs.particleTexture = new BABYLON.Texture('https://playground.babylonjs.com/textures/flare.png', this.scene);
      trailPs.emitter = p.mesh.position.clone();
      trailPs.minEmitBox = BABYLON.Vector3.Zero();
      trailPs.maxEmitBox = BABYLON.Vector3.Zero();
      trailPs.color1 = new BABYLON.Color4(1, 0.5, 0.1, 0.8);
      trailPs.color2 = new BABYLON.Color4(0.5, 0.2, 0.1, 0.5);
      trailPs.colorDead = new BABYLON.Color4(0.2, 0.1, 0.05, 0);
      trailPs.minSize = 0.05;
      trailPs.maxSize = 0.12;
      trailPs.minLifeTime = 0.1;
      trailPs.maxLifeTime = 0.3;
      trailPs.manualEmitCount = 3;
      trailPs.gravity = BABYLON.Vector3.Zero();
      trailPs.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
      trailPs.targetStopDuration = 0.05;
      trailPs.disposeOnStop = true;
      trailPs.start();

      if (p.life <= 0) {
        VFX.explosion(this.scene, p.mesh.position, p.explosionRadius);
        this.combat.applyExplosion(p.sourceId, p.mesh.position, p.explosionRadius, p.damage);
        this.disposeProjectile(i);
      }
    }
  }

  private disposeProjectile(index: number): void {
    const p = this.projectiles[index];
    p.mesh.material?.dispose();
    p.mesh.dispose();
    this.projectiles.splice(index, 1);
  }

  private applySpread(dir: BABYLON.Vector3, spread: number): BABYLON.Vector3 {
    if (spread <= 0) return dir.clone();
    const up = BABYLON.Vector3.Up();
    const right = BABYLON.Vector3.Cross(dir, up).normalize();
    const actualUp = BABYLON.Vector3.Cross(right, dir).normalize();

    const hAngle = (Math.random() - 0.5) * spread * 2;
    const vAngle = (Math.random() - 0.5) * spread * 2;

    return dir.add(right.scale(Math.tan(hAngle))).add(actualUp.scale(Math.tan(vAngle))).normalize();
  }

  dispose(): void {
    if (this.observer) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
      this.observer = null;
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.disposeProjectile(i);
    }
  }
}
