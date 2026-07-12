import * as THREE from 'three';
import type { DriftVehicleState } from './types';
import type { SpeedPresentationState } from './types';
import { DRIFT_TUNING } from './driftPhysics';

export const SPEED_FX = {
  fovBase: 58,
  fovMax: 82,
  exposureBase: 1.0,
  exposureMax: 1.18,
  camDistance: 14,
  camHeight: 4.5,
  camLag: 6,
  camDriftBias: 0.72,
  shakeDecay: 8,
} as const;

export function createSpeedPresentationState(): SpeedPresentationState {
  return {
    speedRatio: 0,
    driftIntensity: 0,
    fov: SPEED_FX.fovBase,
    shake: 0,
    vignette: 0.25,
    motionBlur: 0,
    exposure: SPEED_FX.exposureBase,
  };
}

export function updateSpeedPresentation(
  fx: SpeedPresentationState,
  vehicle: DriftVehicleState,
  dt: number,
): void {
  fx.speedRatio = THREE.MathUtils.clamp(vehicle.speed / DRIFT_TUNING.maxSpeed, 0, 1);
  fx.driftIntensity = vehicle.isDrifting
    ? THREE.MathUtils.clamp(Math.abs(vehicle.driftAngle) * vehicle.speed / DRIFT_TUNING.maxSpeed, 0, 1)
    : Math.max(0, fx.driftIntensity - dt * 3);

  const nitroBoost = vehicle.nitroActive ? 0.15 : 0;
  const targetFov = SPEED_FX.fovBase + fx.speedRatio * (SPEED_FX.fovMax - SPEED_FX.fovBase) + nitroBoost * 12;
  fx.fov = THREE.MathUtils.lerp(fx.fov, targetFov, 1 - Math.exp(-10 * dt));

  fx.exposure = THREE.MathUtils.lerp(
    fx.exposure,
    SPEED_FX.exposureBase + fx.speedRatio * (SPEED_FX.exposureMax - SPEED_FX.exposureBase),
    1 - Math.exp(-6 * dt),
  );

  fx.vignette = THREE.MathUtils.lerp(
    0.2,
    0.65,
    fx.speedRatio * 0.6 + fx.driftIntensity * 0.4,
  );

  fx.motionBlur = THREE.MathUtils.lerp(
    0,
    0.85,
    fx.speedRatio * 0.5 + (vehicle.nitroActive ? 0.35 : 0),
  );

  fx.shake = Math.max(0, fx.shake - SPEED_FX.shakeDecay * dt);
  if (vehicle.nitroActive) fx.shake = Math.max(fx.shake, 0.04);
}

export function applyCameraPresentation(
  camera: THREE.PerspectiveCamera,
  fx: SpeedPresentationState,
  targetPos: THREE.Vector3,
  lookAt: THREE.Vector3,
  velocityHeading: number,
  vehicleHeading: number,
  driftIntensity: number,
  dt: number,
): void {
  camera.fov = fx.fov;
  camera.updateProjectionMatrix();

  const blend = THREE.MathUtils.lerp(vehicleHeading, velocityHeading, driftIntensity * SPEED_FX.camDriftBias);
  const camOffset = new THREE.Vector3(
    Math.sin(blend) * SPEED_FX.camDistance,
    SPEED_FX.camHeight,
    Math.cos(blend) * SPEED_FX.camDistance,
  );

  const shake = fx.shake;
  const desiredPos = targetPos.clone().add(camOffset);
  if (shake > 0.001) {
    desiredPos.x += (Math.random() - 0.5) * shake;
    desiredPos.y += (Math.random() - 0.5) * shake * 0.5;
  }

  camera.position.lerp(desiredPos, 1 - Math.exp(-SPEED_FX.camLag * dt));
  camera.lookAt(lookAt.x, lookAt.y + 0.8, lookAt.z);
}

export function pulseShake(fx: SpeedPresentationState, amount: number): void {
  fx.shake = Math.max(fx.shake, amount);
}