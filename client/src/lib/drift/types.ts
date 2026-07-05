import type * as THREE from 'three';

export interface DriftInput {
  throttle: number;
  brake: number;
  steer: number;
  handbrake: boolean;
  nitro: boolean;
}

export interface DriftVehicleState {
  position: THREE.Vector3;
  heading: number;
  velocity: THREE.Vector3;
  speed: number;
  driftAngle: number;
  isDrifting: boolean;
  driftScore: number;
  comboMultiplier: number;
  boost: number;
  nitroActive: boolean;
  lap: number;
  lapProgress: number;
}

export interface SpeedPresentationState {
  speedRatio: number;
  driftIntensity: number;
  fov: number;
  shake: number;
  vignette: number;
  motionBlur: number;
  exposure: number;
}

export interface DriftHudSnapshot {
  speedKmh: number;
  driftScore: number;
  combo: number;
  boost: number;
  lap: number;
  lapTime: number;
  bestLap: number;
  isDrifting: boolean;
  nitroActive: boolean;
}

export type DriftLoadState = 'loading' | 'ready' | 'error';

export interface DriftEngineCallbacks {
  onHudUpdate?: (snapshot: DriftHudSnapshot) => void;
  onLapComplete?: (lap: number, timeMs: number) => void;
  onLoadState?: (state: DriftLoadState, message?: string) => void;
}

export interface DriftVehicleConfig {
  prepareVehicle: () => Promise<THREE.Group>;
  statMultipliers: { topSpeed: number; accel: number; grip: number };
}