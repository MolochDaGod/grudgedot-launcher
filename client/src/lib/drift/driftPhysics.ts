import * as THREE from 'three';
import type { DriftInput, DriftVehicleState } from './types';

const FORWARD = new THREE.Vector3(0, 0, -1);
const RIGHT = new THREE.Vector3(1, 0, 0);
const VEL_FLAT = new THREE.Vector3();
const HEADING_FWD = new THREE.Vector3();
const LATERAL = new THREE.Vector3();

export const DRIFT_TUNING = {
  maxSpeed: 52,
  acceleration: 28,
  brakeForce: 38,
  coastDrag: 0.985,
  brakeDrag: 0.92,
  maxSteer: 1.15,
  steerSpeed: 2.8,
  steerReturn: 4.5,
  gripNormal: 9.5,
  gripDrift: 2.2,
  handbrakeGrip: 0.85,
  handbrakeYawBoost: 1.65,
  minDriftSpeed: 8,
  minDriftAngle: 0.12,
  driftScoreRate: 42,
  comboDecay: 0.35,
  comboGain: 0.08,
  maxCombo: 8,
  boostFillRate: 18,
  boostDrainRate: 55,
  nitroMultiplier: 1.45,
  mass: 1,
} as const;

export function createVehicleState(): DriftVehicleState {
  return {
    position: new THREE.Vector3(0, 0.35, 0),
    heading: 0,
    velocity: new THREE.Vector3(),
    speed: 0,
    driftAngle: 0,
    isDrifting: false,
    driftScore: 0,
    comboMultiplier: 1,
    boost: 0,
    nitroActive: false,
    lap: 0,
    lapProgress: 0,
  };
}

export function updateDriftPhysics(
  state: DriftVehicleState,
  input: DriftInput,
  dt: number,
): void {
  const t = DRIFT_TUNING;

  // Steering with speed-sensitive response
  const steerRate = input.steer === 0 ? t.steerReturn : t.steerSpeed;
  const speedFactor = THREE.MathUtils.clamp(state.speed / t.maxSpeed, 0.25, 1);
  state.heading += input.steer * t.maxSteer * steerRate * dt * speedFactor;

  // Yaw boost during handbrake drift
  if (input.handbrake && state.speed > t.minDriftSpeed * 0.5) {
    state.heading += input.steer * t.handbrakeYawBoost * dt * speedFactor;
  }

  HEADING_FWD.copy(FORWARD).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.heading);

  // Engine / brake forces along heading
  const throttle = THREE.MathUtils.clamp(input.throttle, 0, 1);
  const brake = THREE.MathUtils.clamp(input.brake, 0, 1);
  const nitro = input.nitro && state.boost > 0.05;
  state.nitroActive = nitro;

  const driveForce = throttle * t.acceleration * (nitro ? t.nitroMultiplier : 1);
  const brakeForce = brake * t.brakeForce;

  state.velocity.addScaledVector(HEADING_FWD, driveForce * dt);
  if (brake > 0) {
    state.velocity.multiplyScalar(Math.pow(t.brakeDrag, brake * dt * 60));
  } else if (throttle < 0.05) {
    state.velocity.multiplyScalar(Math.pow(t.coastDrag, dt * 60));
  }

  // Lateral grip — separate velocity into forward/lateral relative to heading
  VEL_FLAT.set(state.velocity.x, 0, state.velocity.z);
  const forwardSpeed = VEL_FLAT.dot(HEADING_FWD);
  LATERAL.copy(HEADING_FWD).multiplyScalar(forwardSpeed);
  LATERAL.subVectors(VEL_FLAT, LATERAL); // lateral component

  const drifting = input.handbrake && Math.abs(forwardSpeed) > t.minDriftSpeed;
  let grip = drifting ? t.gripDrift : t.gripNormal;
  if (input.handbrake) grip *= t.handbrakeGrip;

  const lateralDamp = Math.exp(-grip * dt);
  LATERAL.multiplyScalar(lateralDamp);

  VEL_FLAT.copy(HEADING_FWD).multiplyScalar(forwardSpeed).add(LATERAL);
  state.velocity.x = VEL_FLAT.x;
  state.velocity.z = VEL_FLAT.z;

  // Speed clamp
  state.speed = VEL_FLAT.length();
  if (state.speed > t.maxSpeed) {
    VEL_FLAT.normalize().multiplyScalar(t.maxSpeed);
    state.velocity.x = VEL_FLAT.x;
    state.velocity.z = VEL_FLAT.z;
    state.speed = t.maxSpeed;
  }

  // Drift angle between velocity and heading
  if (state.speed > 0.5) {
    const velHeading = Math.atan2(-state.velocity.x, -state.velocity.z);
    let angle = velHeading - state.heading;
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    state.driftAngle = angle;
  } else {
    state.driftAngle = 0;
  }

  state.isDrifting =
    drifting && Math.abs(state.driftAngle) > t.minDriftAngle && state.speed > t.minDriftSpeed;

  // Drift score + combo
  if (state.isDrifting) {
    const intensity = THREE.MathUtils.clamp(
      (Math.abs(state.driftAngle) / 0.8) * (state.speed / t.maxSpeed),
      0,
      1,
    );
    state.comboMultiplier = Math.min(t.maxCombo, state.comboMultiplier + t.comboGain * dt);
    state.driftScore += t.driftScoreRate * intensity * state.comboMultiplier * dt;
    state.boost = Math.min(100, state.boost + t.boostFillRate * intensity * dt);
  } else {
    state.comboMultiplier = Math.max(1, state.comboMultiplier - t.comboDecay * dt);
  }

  if (nitro) {
    state.boost = Math.max(0, state.boost - t.boostDrainRate * dt);
    if (state.boost <= 0) state.nitroActive = false;
  }

  // Integrate position
  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;
}

export function getVelocityHeading(state: DriftVehicleState): number {
  if (state.speed < 0.5) return state.heading;
  return Math.atan2(-state.velocity.x, -state.velocity.z);
}

export function speedToKmh(speed: number): number {
  return Math.round(speed * 3.6 * 2.2);
}