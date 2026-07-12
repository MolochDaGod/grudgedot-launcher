/**
 * MM (Melee / Movement Modifier) — distance bias for combat skills.
 * Reference diagrams: user-authored sheets (hosted under /assets/reference/).
 *
 * Scale: +100 = close gap (melee preference) … 0 = neutral … -100 = keep distance (ranged).
 * Formula: MM = lerp(+100, -100, d) where d = DistanceBias in [0, 1].
 */

export const MM_REFERENCE_IMAGES = {
  scaleAndAbilities: '/assets/reference/mm-weapons-1.png',
  weaponMatrix: '/assets/reference/mm-weapons-2.png',
  skillSprites: '/assets/reference/mm-weapons-3.png',
} as const;

/** Original imgur sources (author uploads). */
export const MM_REFERENCE_IMAGES_REMOTE = {
  scaleAndAbilities: 'https://i.imgur.com/tprSl2o.png',
  weaponMatrix: 'https://i.imgur.com/abQfBd7.png',
  skillSprites: 'https://i.imgur.com/FonlVod.png',
} as const;

export type MmSkillKind = 'combo' | 'special' | 'ranged' | 'power';

export const MM_SKILL_KIND_LABELS: Record<MmSkillKind, { label: string; index: number }> = {
  combo:   { label: 'Combo',      index: 1 },
  special: { label: 'Special',    index: 2 },
  ranged:  { label: 'Ranged',     index: 3 },
  power:   { label: 'Power Move', index: 4 },
};

/** Ranged skills always enforce keep-distance bias (exception rule). */
export const MM_RANGED_FIXED = -50 as const;

export function distanceBiasToMm(d: number): number {
  const clamped = Math.max(0, Math.min(1, d));
  return Math.round(100 - clamped * 200);
}

export function mmToDistanceBias(mm: number): number {
  const clamped = Math.max(-100, Math.min(100, mm));
  return (100 - clamped) / 200;
}

export interface MmWeaponRow {
  weapon: string;
  combo: number;
  special: number;
  ranged: number;
  power: number;
}

/** Full weapon × skill-type matrix from the reference sheet. */
export const MM_WEAPON_MATRIX: MmWeaponRow[] = [
  { weapon: 'Unarmed',           combo: +60,  special: +40,  ranged: MM_RANGED_FIXED, power: +70 },
  { weapon: 'Sword and Shield',  combo: +70,  special: +50,  ranged: MM_RANGED_FIXED, power: +80 },
  { weapon: 'Great Sword',       combo: +85,  special: +70,  ranged: MM_RANGED_FIXED, power: +95 },
  { weapon: 'Battle Axe',        combo: +90,  special: +80,  ranged: MM_RANGED_FIXED, power: +100 },
  { weapon: 'Daggers',           combo: +50,  special: +35,  ranged: MM_RANGED_FIXED, power: +45 },
  { weapon: 'Spear',             combo: +75,  special: +55,  ranged: MM_RANGED_FIXED, power: +85 },
  { weapon: 'War Hammer',        combo: +95,  special: +85,  ranged: MM_RANGED_FIXED, power: +100 },
  { weapon: 'Long Bow',          combo: +20,  special: +10,  ranged: MM_RANGED_FIXED, power: +10 },
  { weapon: 'Arcane Staff',      combo: -15,  special: -25,  ranged: MM_RANGED_FIXED, power: -10 },
  { weapon: 'Pistol',            combo: -35,  special: -20,  ranged: MM_RANGED_FIXED, power: -30 },
  { weapon: 'Rifle',             combo: -50,  special: -35,  ranged: MM_RANGED_FIXED, power: -60 },
  { weapon: 'Tower Shield',      combo: +80,  special: +65,  ranged: MM_RANGED_FIXED, power: +75 },
];

export const MM_SCALE_EXAMPLES = [
  { d: 0.0, mm: +100, meaning: 'Melee — close gap' },
  { d: 0.5, mm: 0,    meaning: 'Neutral — balanced' },
  { d: 1.0, mm: -100, meaning: 'Ranged — keep distance' },
] as const;

export const MM_DOUBLE_JUMP_EXAMPLES = [
  { label: 'Melee jump chain', jump1: +30, jump2: +50, outcome: 'Close gap (more committed)' },
  { label: 'Ranged jump chain', jump1: -30, jump2: -60, outcome: 'Keep distance (more committed)' },
] as const;

export function mmColor(mm: number): string {
  if (mm >= 50) return 'hsl(142 70% 45%)';
  if (mm >= 10) return 'hsl(80 60% 45%)';
  if (mm > -10) return 'hsl(45 15% 55%)';
  if (mm > -40) return 'hsl(25 80% 50%)';
  return 'hsl(0 70% 50%)';
}

export function mmLabel(mm: number): string {
  if (mm >= 50) return 'Close gap';
  if (mm >= 10) return 'Melee lean';
  if (mm > -10) return 'Neutral';
  if (mm > -40) return 'Ranged lean';
  return 'Keep distance';
}