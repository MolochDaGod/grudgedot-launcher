/**
 * Soft acquisition + hard focus (RMB lock) — 3D action combat targeting.
 * Reference diagram: user-authored sheet (hosted under /assets/reference/).
 */

export const COMBAT_TARGETING_REFERENCE_IMAGES = {
  softAndFocus: '/assets/reference/soft-focus-targeting.png',
} as const;

export const COMBAT_TARGETING_REFERENCE_IMAGES_REMOTE = {
  softAndFocus: 'https://i.imgur.com/MLh8mAE.png',
} as const;

/** Cone-based soft target acquisition (before RMB hard lock). */
export const SOFT_ACQUISITION = {
  maxDistanceM: 10,
  coneDegrees: 30,
  horizontalHalfAngleDeg: 15,
  verticalHalfAngleDeg: 7.5,
  distanceFormula: '√((x₂ − x₁)² + (z₂ − z₁)²) ≤ 10m',
  horizontalFormula: 'cos⁻¹(dot) ≤ 15°',
  verticalFormula: 'cos⁻¹(dot) ≤ 7.5°',
} as const;

/** Hard focus lock — sticky RMB toggle with release rules. */
export const FOCUS_LOCK_RULES = {
  releaseDistanceM: 12,
  releaseOnTargetDeath: true,
  priority: [
    { key: 'closest', label: 'Closest' },
    { key: 'highestAggression', label: 'Highest aggression' },
    { key: 'lowestHealth', label: 'Lowest health' },
  ],
  camera: {
    fixedOffset: true,
    verticalPitchOnly: true,
    smoothReleaseSec: 0.25,
  },
} as const;

export const TARGETING_CONTROLS = [
  { keys: 'W A S D', action: 'Move', detail: 'Travel heading in select mode; strafe around lock in focus mode' },
  { keys: 'Q / E', action: 'Switch target', detail: 'Cycle candidates by priority stack' },
  { keys: 'RMB', action: 'Toggle lock', detail: 'Sticky focus mode — orbit while held, lock state persists on release' },
  { keys: 'LMB', action: 'Attack', detail: 'Select in default mode; fire skill along aim vector when locked' },
] as const;

export const TARGETING_MODES = [
  {
    id: 'select',
    label: 'Select (default)',
    focusEnabled: false,
    summary: 'LMB raycast picks hostile; body faces travel direction.',
  },
  {
    id: 'focus',
    label: 'Hard focus (RMB toggle)',
    focusEnabled: true,
    summary: 'Soft-lock retained target; body faces camera-forward; strafe around lock; screen + world reticles.',
  },
] as const;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function horizontalDistance(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dz * dz);
}

function dotNormalized(ax: number, az: number, bx: number, bz: number): number {
  const al = Math.hypot(ax, az) || 1;
  const bl = Math.hypot(bx, bz) || 1;
  return (ax * bx + az * bz) / (al * bl);
}

/** Horizontal cone check for soft acquisition (diagram: cos⁻¹(dot) ≤ 15°). */
export function isWithinSoftAcquisitionCone(
  origin: Vec3,
  forwardYawRad: number,
  target: Vec3,
  opts: { maxDistanceM?: number; horizontalHalfAngleDeg?: number } = {},
): boolean {
  const maxDist = opts.maxDistanceM ?? SOFT_ACQUISITION.maxDistanceM;
  const halfAngle = opts.horizontalHalfAngleDeg ?? SOFT_ACQUISITION.horizontalHalfAngleDeg;

  const dist = horizontalDistance(origin, target);
  if (dist > maxDist) return false;

  const fx = Math.sin(forwardYawRad);
  const fz = Math.cos(forwardYawRad);
  const tx = target.x - origin.x;
  const tz = target.z - origin.z;
  const dot = dotNormalized(fx, fz, tx, tz);
  const angleDeg = (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
  return angleDeg <= halfAngle;
}

/** Hard lock should break when target exceeds release distance or dies. */
export function shouldReleaseFocusLock(
  origin: Vec3,
  target: Vec3 | null,
  targetAlive: boolean,
  opts: { releaseDistanceM?: number } = {},
): boolean {
  if (!target || !targetAlive) return true;
  const release = opts.releaseDistanceM ?? FOCUS_LOCK_RULES.releaseDistanceM;
  return horizontalDistance(origin, target) > release;
}