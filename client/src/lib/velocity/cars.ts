export interface CarStats {
  topSpeed: number;
  accel: number;
  grip: number;
}

export type CarTier = 1 | 2 | 3;

export interface CarDef {
  id: string;
  assetId: string;
  name: string;
  klass: string;
  accent: string;
  stats: CarStats;
  tier: CarTier;
  starter?: boolean;
  upgradeTo?: string;
  upgradeCost?: number;
  modelYaw?: number;
}

export const CARS: CarDef[] = [
  {
    id: 'cube-cruiser',
    assetId: 'vehicles/minecraft-car',
    name: 'Cube Cruiser',
    klass: 'Starter',
    accent: '#9dff00',
    stats: { topSpeed: 0.92, accel: 0.95, grip: 1.05 },
    tier: 1,
    starter: true,
    upgradeTo: 'm3-gtr',
    upgradeCost: 1200,
  },
  {
    id: 'datsun-240z',
    assetId: 'vehicles/datsun-240z',
    name: 'Datsun 240Z',
    klass: 'Classic',
    accent: '#ff5a36',
    stats: { topSpeed: 0.96, accel: 0.9, grip: 1.0 },
    tier: 1,
    starter: true,
    upgradeTo: 'skyline-r34',
    upgradeCost: 1200,
  },
  {
    id: 'nsx-v',
    assetId: 'vehicles/nsx-voxel',
    name: 'NSX-V',
    klass: 'Coupe',
    accent: '#00e5ff',
    stats: { topSpeed: 0.98, accel: 0.98, grip: 0.92 },
    tier: 1,
    starter: true,
    upgradeTo: 'street-demon',
    upgradeCost: 1200,
  },
  {
    id: 'm3-gtr',
    assetId: 'vehicles/bmw-m3-gtr',
    name: 'M3 GTR',
    klass: 'GT',
    accent: '#ffb300',
    stats: { topSpeed: 1.1, accel: 1.08, grip: 1.12 },
    tier: 2,
    upgradeTo: 'grudge-srt',
    upgradeCost: 2600,
  },
  {
    id: 'skyline-r34',
    assetId: 'vehicles/skyline-r34',
    name: 'Skyline R34',
    klass: 'Tuner',
    accent: '#2e6bff',
    stats: { topSpeed: 1.14, accel: 1.12, grip: 1.05 },
    tier: 2,
    upgradeTo: 'apex-gt',
    upgradeCost: 2600,
  },
  {
    id: 'street-demon',
    assetId: 'vehicles/street-racer',
    name: 'Street Demon',
    klass: 'Street',
    accent: '#ff2bd6',
    stats: { topSpeed: 1.12, accel: 1.15, grip: 0.96 },
    tier: 2,
    upgradeTo: 'phantom-911',
    upgradeCost: 2600,
    modelYaw: Math.PI,
  },
  {
    id: 'grudge-srt',
    assetId: 'vehicles/challenger-srt',
    name: 'Grudge SRT',
    klass: 'Muscle',
    accent: '#ffb300',
    stats: { topSpeed: 1.22, accel: 1.32, grip: 0.92 },
    tier: 3,
  },
  {
    id: 'apex-gt',
    assetId: 'vehicles/racing-car',
    name: 'Apex GT',
    klass: 'Prototype',
    accent: '#9dff00',
    stats: { topSpeed: 1.3, accel: 1.24, grip: 1.08 },
    tier: 3,
  },
  {
    id: 'phantom-911',
    assetId: 'vehicles/porsche-911',
    name: 'Phantom 911',
    klass: 'Hypercar',
    accent: '#00e5ff',
    stats: { topSpeed: 1.28, accel: 1.18, grip: 1.2 },
    tier: 3,
  },
];

export const STARTER_CARS = CARS.filter((c) => c.starter);
export const DEFAULT_CAR_ID = STARTER_CARS[0].id;

export function getCar(id: string): CarDef | undefined {
  return CARS.find((c) => c.id === id);
}

export function nextCar(id: string): CarDef | undefined {
  const car = getCar(id);
  return car?.upgradeTo ? getCar(car.upgradeTo) : undefined;
}

export function prevCar(id: string): CarDef | undefined {
  return CARS.find((c) => c.upgradeTo === id);
}