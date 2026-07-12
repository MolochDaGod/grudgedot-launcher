/**
 * Third-Person Shooter Controller
 *
 * Over-the-shoulder camera, crosshair aiming, WASD movement, dodge roll,
 * sprint stamina, Tab toggle between combat/exploration modes.
 * Uses Rapier for ground detection and the WeaponSystem for firing.
 */

import * as BABYLON from '@babylonjs/core';
import { RapierPhysicsWorld } from '../rapier-physics';
import { WeaponSystem } from './weapons';
import * as VFX from './tps-vfx';

export interface ShooterControllerConfig {
  walkSpeed: number;
  runSpeed: number;
  rotationSpeed: number;
  cameraDistance: number;
  cameraHeight: number;
  shoulderOffset: number;   // right offset for OTS
  dodgeSpeed: number;
  dodgeDuration: number;
  dodgeCooldown: number;
  maxStamina: number;
  staminaDrain: number;     // per second while sprinting
  staminaRegen: number;     // per second while not sprinting
  jumpForce: number;
  gravity: number;
}

const DEFAULT_CONFIG: ShooterControllerConfig = {
  walkSpeed: 5,
  runSpeed: 9,
  rotationSpeed: 10,
  cameraDistance: 5,
  cameraHeight: 2,
  shoulderOffset: 1.2,
  dodgeSpeed: 15,
  dodgeDuration: 0.3,
  dodgeCooldown: 1.0,
  maxStamina: 100,
  staminaDrain: 30,
  staminaRegen: 20,
  jumpForce: 8,
  gravity: 20,
};

export type ControllerMode = 'combat' | 'explore';

export interface ShooterControllerState {
  hp: number;
  maxHp: number;
  shield: number;
  maxShield: number;
  stamina: number;
  maxStamina: number;
  ammo: number;
  maxAmmo: number;
  weaponName: string;
  reloading: boolean;
  mode: ControllerMode;
  score: number;
  kills: number;
}

export class ShooterController {
  private scene: BABYLON.Scene;
  private canvas: HTMLCanvasElement;
  private character: BABYLON.AbstractMesh;
  private camera: BABYLON.ArcRotateCamera;
  private physics: RapierPhysicsWorld;
  weapon: WeaponSystem;
  private config: ShooterControllerConfig;

  // Input
  private keys = new Set<string>();
  private mouseDown = false;
  private mouseRightDown = false;

  // State
  mode: ControllerMode = 'combat';
  stamina: number;
  private verticalVelocity = 0;
  private grounded = true;
  private dodging = false;
  private dodgeTimer = 0;
  private dodgeCooldownTimer = 0;
  private dodgeDirection = BABYLON.Vector3.Zero();

  // Lifecycle
  private isActive = false;
  private observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private contextMenuHandler: (e: Event) => void;

  // Animation
  private animationGroups: Map<string, BABYLON.AnimationGroup> = new Map();
  private animationWeights: Map<string, number> = new Map();
  private currentAnimation = 'idle';
  private blendSpeed = 5.0;

  // Callbacks
  onStateChange?: (state: ShooterControllerState) => void;

  constructor(
    scene: BABYLON.Scene,
    canvas: HTMLCanvasElement,
    character: BABYLON.AbstractMesh,
    physics: RapierPhysicsWorld,
    animationGroups?: BABYLON.AnimationGroup[],
    config?: Partial<ShooterControllerConfig>
  ) {
    this.scene = scene;
    this.canvas = canvas;
    this.character = character;
    this.physics = physics;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stamina = this.config.maxStamina;

    // Setup animations
    if (animationGroups) {
      animationGroups.forEach(ag => {
        const name = ag.name.toLowerCase();
        this.animationGroups.set(name, ag);
        if (name.includes('idle') || name.includes('stand')) this.animationGroups.set('idle', ag);
        if (name.includes('walk')) this.animationGroups.set('walk', ag);
        if (name.includes('run') || name.includes('sprint')) this.animationGroups.set('run', ag);
      });
    }

    // Camera: ArcRotate for over-the-shoulder
    this.camera = new BABYLON.ArcRotateCamera(
      'shooterCam',
      -Math.PI / 2,
      Math.PI / 3,
      this.config.cameraDistance,
      character.position.clone(),
      scene
    );
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 12;
    this.camera.lowerBetaLimit = 0.3;
    this.camera.upperBetaLimit = Math.PI / 2 - 0.05;
    this.camera.panningSensibility = 0; // disable panning
    this.camera.checkCollisions = true;

    // Weapon system
    this.weapon = new WeaponSystem(scene, physics, 'player', 'rifle');

    // Input handlers
    this.keyDownHandler = this.onKeyDown.bind(this);
    this.keyUpHandler = this.onKeyUp.bind(this);
    this.mouseDownHandler = this.onMouseDown.bind(this);
    this.mouseUpHandler = this.onMouseUp.bind(this);
    this.contextMenuHandler = (e: Event) => e.preventDefault();

    VFX.setShakeCamera(this.camera);
  }

  activate(): void {
    if (this.isActive) return;
    this.isActive = true;

    this.scene.activeCamera = this.camera;
    this.camera.attachControl(this.canvas, true);

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('contextmenu', this.contextMenuHandler);

    // Lock pointer for FPS-like aiming
    this.canvas.requestPointerLock?.();

    // Start all animations for blending
    this.animationGroups.forEach((ag, name) => {
      ag.start(true, 1.0);
      ag.setWeightForAllAnimatables(name === 'idle' ? 1 : 0);
      this.animationWeights.set(name, name === 'idle' ? 1 : 0);
    });

    this.observer = this.scene.onBeforeRenderObservable.add(() => {
      const dt = Math.min(this.scene.getEngine().getDeltaTime() / 1000, 0.1);
      this.update(dt);
    });
  }

  deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;

    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('contextmenu', this.contextMenuHandler);

    if (this.observer) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
      this.observer = null;
    }

    this.camera.detachControl();
    document.exitPointerLock?.();
    this.animationGroups.forEach(ag => ag.stop());
    this.keys.clear();
  }

  dispose(): void {
    this.deactivate();
    this.weapon.dispose();
    this.camera.dispose();
  }

  // ── Input ──

  private onKeyDown(e: KeyboardEvent): void {
    this.keys.add(e.code);

    if (e.code === 'Tab') {
      e.preventDefault();
      this.mode = this.mode === 'combat' ? 'explore' : 'combat';
    }
    if (e.code === 'KeyR') {
      this.weapon.reload();
    }
    if (e.code === 'Space' && this.grounded && !this.dodging) {
      if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) {
        this.startDodge();
      } else {
        this.verticalVelocity = this.config.jumpForce;
        this.grounded = false;
      }
    }
    // Weapon switching: 1-5
    const weaponKeys: Record<string, string> = {
      'Digit1': 'rifle',
      'Digit2': 'shotgun',
      'Digit3': 'pistol',
      'Digit4': 'sniper',
      'Digit5': 'rocket',
    };
    if (weaponKeys[e.code]) {
      this.weapon.equip(weaponKeys[e.code]);
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button === 0) this.mouseDown = true;
    if (e.button === 2) this.mouseRightDown = true;

    // Request pointer lock on click
    if (!document.pointerLockElement) {
      this.canvas.requestPointerLock?.();
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.mouseDown = false;
    if (e.button === 2) this.mouseRightDown = false;
  }

  // ── Dodge ──

  private startDodge(): void {
    if (this.dodgeCooldownTimer > 0 || this.stamina < 20) return;
    this.dodging = true;
    this.dodgeTimer = this.config.dodgeDuration;
    this.dodgeCooldownTimer = this.config.dodgeCooldown;
    this.stamina -= 20;

    // Dodge in movement direction or backward
    const moveDir = this.getMovementDirection();
    this.dodgeDirection = moveDir.length() > 0.1
      ? moveDir.normalize()
      : this.getForwardDirection().scale(-1);
  }

  // ── Update Loop ──

  private update(dt: number): void {
    if (!this.isActive) return;

    // Ground check via raycast
    const feetPos = this.character.position.clone();
    const downHit = this.physics.raycast(feetPos, BABYLON.Vector3.Down(), 1.2);
    this.grounded = downHit !== null && downHit.distance < 1.0;

    // Gravity
    if (!this.grounded) {
      this.verticalVelocity -= this.config.gravity * dt;
    } else if (this.verticalVelocity < 0) {
      this.verticalVelocity = 0;
      // Snap to ground
      if (downHit) {
        this.character.position.y = downHit.point.y + 0.9;
      }
    }
    this.character.position.y += this.verticalVelocity * dt;

    // Dodge
    if (this.dodging) {
      this.dodgeTimer -= dt;
      const dodgeMove = this.dodgeDirection.scale(this.config.dodgeSpeed * dt);
      this.character.position.addInPlace(dodgeMove);
      if (this.dodgeTimer <= 0) this.dodging = false;
    }
    if (this.dodgeCooldownTimer > 0) this.dodgeCooldownTimer -= dt;

    // Movement
    const isMoving = !this.dodging && this.moveCharacter(dt);
    const isSprinting = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight');

    // Stamina
    if (isSprinting && isMoving) {
      this.stamina = Math.max(0, this.stamina - this.config.staminaDrain * dt);
    } else {
      this.stamina = Math.min(this.config.maxStamina, this.stamina + this.config.staminaRegen * dt);
    }

    // Shooting (combat mode, mouse held, auto weapons)
    if (this.mode === 'combat' && this.mouseDown) {
      const aimDir = this.getAimDirection();
      const shootOrigin = this.character.position.clone();
      shootOrigin.y += 1.4; // chest height
      this.weapon.fire(shootOrigin, aimDir);
    }

    // Camera follow
    this.updateCamera(dt);

    // Animation blending
    let targetAnim = 'idle';
    if (this.dodging) {
      targetAnim = 'run';
    } else if (isMoving) {
      targetAnim = (isSprinting && this.stamina > 0) ? 'run' : 'walk';
    }
    this.blendToAnimation(targetAnim, dt);

    // Screen shake update
    VFX.updateScreenShake(dt);

    // Emit state
    this.emitState();
  }

  private moveCharacter(dt: number): boolean {
    const moveDir = this.getMovementDirection();
    if (moveDir.length() < 0.01) return false;

    moveDir.normalize();
    const isSprinting = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && this.stamina > 0;
    const speed = isSprinting ? this.config.runSpeed : this.config.walkSpeed;

    this.character.position.addInPlace(moveDir.scale(speed * dt));

    // Rotate character
    if (this.mode === 'combat') {
      // In combat, always face aim direction
      const aimDir = this.getAimDirection();
      const targetRot = Math.atan2(aimDir.x, aimDir.z);
      this.smoothRotate(targetRot, dt);
    } else {
      // In explore, face movement direction
      const targetRot = Math.atan2(moveDir.x, moveDir.z);
      this.smoothRotate(targetRot, dt);
    }

    return true;
  }

  private smoothRotate(targetRot: number, dt: number): void {
    if (this.character.rotationQuaternion) {
      const targetQuat = BABYLON.Quaternion.FromEulerAngles(0, targetRot, 0);
      this.character.rotationQuaternion = BABYLON.Quaternion.Slerp(
        this.character.rotationQuaternion,
        targetQuat,
        this.config.rotationSpeed * dt
      );
    } else {
      let diff = targetRot - this.character.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.character.rotation.y += diff * this.config.rotationSpeed * dt;
    }
  }

  private getMovementDirection(): BABYLON.Vector3 {
    const camAlpha = this.camera.alpha;
    const move = new BABYLON.Vector3(0, 0, 0);

    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      move.x += Math.sin(camAlpha);
      move.z += Math.cos(camAlpha);
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      move.x -= Math.sin(camAlpha);
      move.z -= Math.cos(camAlpha);
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      move.x += Math.sin(camAlpha + Math.PI / 2);
      move.z += Math.cos(camAlpha + Math.PI / 2);
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      move.x += Math.sin(camAlpha - Math.PI / 2);
      move.z += Math.cos(camAlpha - Math.PI / 2);
    }

    return move;
  }

  private getForwardDirection(): BABYLON.Vector3 {
    const alpha = this.camera.alpha;
    return new BABYLON.Vector3(Math.sin(alpha), 0, Math.cos(alpha));
  }

  /** Get world-space aim direction from camera through center of screen */
  getAimDirection(): BABYLON.Vector3 {
    // Cast ray from camera through screen center
    const engine = this.scene.getEngine();
    const cx = engine.getRenderWidth() / 2;
    const cy = engine.getRenderHeight() / 2;
    const ray = this.scene.createPickingRay(cx, cy, BABYLON.Matrix.Identity(), this.camera);
    return ray.direction.normalize();
  }

  private updateCamera(dt: number): void {
    // Target: character position + height offset
    const targetPos = this.character.position.clone();
    targetPos.y += this.config.cameraHeight;

    // OTS offset (right shoulder in combat, centered in explore)
    if (this.mode === 'combat') {
      const camAlpha = this.camera.alpha;
      const rightDir = new BABYLON.Vector3(
        Math.sin(camAlpha - Math.PI / 2),
        0,
        Math.cos(camAlpha - Math.PI / 2)
      );
      targetPos.addInPlace(rightDir.scale(this.config.shoulderOffset));
    }

    // Smooth follow
    this.camera.target = BABYLON.Vector3.Lerp(this.camera.target, targetPos, dt * 8);

    // Zoom in when aiming (right mouse)
    const targetRadius = this.mouseRightDown ? this.config.cameraDistance * 0.6 : this.config.cameraDistance;
    this.camera.radius += (targetRadius - this.camera.radius) * dt * 5;
  }

  private blendToAnimation(targetAnim: string, dt: number): void {
    this.animationGroups.forEach((ag, name) => {
      if (!this.animationWeights.has(name)) {
        this.animationWeights.set(name, 0);
        ag.start(true, 1.0);
        ag.setWeightForAllAnimatables(0);
      }
    });

    this.animationGroups.forEach((ag, name) => {
      const current = this.animationWeights.get(name) || 0;
      const target = name === targetAnim ? 1 : 0;
      const newWeight = current + (target - current) * Math.min(1, this.blendSpeed * dt);
      this.animationWeights.set(name, newWeight);
      ag.setWeightForAllAnimatables(newWeight);
    });

    this.currentAnimation = targetAnim;
  }

  private emitState(): void {
    this.onStateChange?.({
      hp: 100, // connected to HealthComponent externally
      maxHp: 100,
      shield: 50,
      maxShield: 50,
      stamina: this.stamina,
      maxStamina: this.config.maxStamina,
      ammo: this.weapon.ammo,
      maxAmmo: this.weapon.maxAmmo,
      weaponName: this.weapon.currentWeapon.name,
      reloading: this.weapon.reloading,
      mode: this.mode,
      score: 0,
      kills: 0,
    });
  }

  getCamera(): BABYLON.ArcRotateCamera { return this.camera; }
  getCharacter(): BABYLON.AbstractMesh { return this.character; }
}
