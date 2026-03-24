/**
 * ============================================================================
 * GRUDGE ENGINE — Camera System
 * ============================================================================
 * Ported from Online-Multiplayer-Game arena/game.js Section 7.
 *
 * Third-person chase camera with smooth lerp, configurable distance/height,
 * camera shake on impact, and lock mechanism.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// ChaseCamera
// ---------------------------------------------------------------------------

export interface ChaseCameraConfig {
  distance?: number;
  height?: number;
  lookAtHeight?: number;
  smoothSpeed?: number;
  offsetAngle?: number;
}

export class ChaseCamera {
  public camera: THREE.PerspectiveCamera;
  public target: THREE.Object3D | null;

  public distance: number;
  public height: number;
  public lookAtHeight: number;
  public smoothSpeed: number;
  public offsetAngle: number;

  private currentPosition = new THREE.Vector3();
  private currentLookAt = new THREE.Vector3();

  // Shake
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeElapsed = 0;

  // Lock
  private locked = false;
  private lockTarget: THREE.Object3D | null = null;

  constructor(camera: THREE.PerspectiveCamera, config: ChaseCameraConfig = {}) {
    this.camera = camera;
    this.target = null;
    this.distance = config.distance ?? 15;
    this.height = config.height ?? 12;
    this.lookAtHeight = config.lookAtHeight ?? 1;
    this.smoothSpeed = config.smoothSpeed ?? 5;
    this.offsetAngle = config.offsetAngle ?? 0;
  }

  setTarget(target: THREE.Object3D): void {
    this.target = target;
  }

  /** Lock camera to look at a specific target (e.g. during combat). */
  lockOn(target: THREE.Object3D): void {
    this.locked = true;
    this.lockTarget = target;
  }

  unlock(): void {
    this.locked = false;
    this.lockTarget = null;
  }

  /** Trigger a camera shake (e.g. on hit/explosion). */
  shake(intensity = 0.5, duration = 0.3): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeElapsed = 0;
  }

  update(delta: number): void {
    if (!this.target) return;

    const targetPos = this.target.position.clone();
    const angle = this.target.rotation?.y ?? 0;
    const offsetX = Math.sin(angle + this.offsetAngle) * this.distance;

    const desiredPosition = new THREE.Vector3(
      targetPos.x - offsetX * 0.3,
      targetPos.y + this.height,
      targetPos.z + this.distance,
    );

    this.currentPosition.lerp(desiredPosition, this.smoothSpeed * delta);

    // Look-at target
    let lookAtTarget: THREE.Vector3;
    if (this.locked && this.lockTarget) {
      const mid = targetPos.clone().add(this.lockTarget.position).multiplyScalar(0.5);
      lookAtTarget = new THREE.Vector3(mid.x, mid.y + this.lookAtHeight, mid.z);
    } else {
      lookAtTarget = new THREE.Vector3(targetPos.x, targetPos.y + this.lookAtHeight, targetPos.z);
    }

    this.currentLookAt.lerp(lookAtTarget, this.smoothSpeed * delta);

    // Apply shake
    const shakeOffset = new THREE.Vector3();
    if (this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += delta;
      const decay = 1 - this.shakeElapsed / this.shakeDuration;
      shakeOffset.set(
        (Math.random() - 0.5) * this.shakeIntensity * decay,
        (Math.random() - 0.5) * this.shakeIntensity * decay,
        (Math.random() - 0.5) * this.shakeIntensity * decay,
      );
    }

    this.camera.position.copy(this.currentPosition).add(shakeOffset);
    this.camera.lookAt(this.currentLookAt);
  }
}
