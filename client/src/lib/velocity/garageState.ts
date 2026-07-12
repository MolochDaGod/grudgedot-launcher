import { DEFAULT_CAR_ID } from './cars';
import { DEFAULT_PAINT_ID, emptyTuning, type CarTuning } from './garage';
import type { RunContractId } from './contracts';

const STORAGE_KEY = 'grudge_velocity_garage';
const VERSION = 2;

export interface GarageState {
  version: number;
  carId: string;
  paintId: string;
  mods: string[];
  tuning: CarTuning;
  currency: number;
  onboarded: boolean;
  tutorialDone: boolean;
  contractId: RunContractId;
  bestLapMs: number;
  bestDriftScore: number;
  totalRaces: number;
  lastDriftScore: number;
  lastStyleGrade: string;
}

export function defaultGarage(): GarageState {
  return {
    version: VERSION,
    carId: DEFAULT_CAR_ID,
    paintId: DEFAULT_PAINT_ID,
    mods: [],
    tuning: emptyTuning(),
    currency: 500,
    onboarded: false,
    tutorialDone: false,
    contractId: 'time_trial',
    bestLapMs: 0,
    bestDriftScore: 0,
    totalRaces: 0,
    lastDriftScore: 0,
    lastStyleGrade: '',
  };
}

function clampLevel(v: unknown): number {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.max(0, Math.min(5, n));
}

export function normalizeGarage(raw: unknown): GarageState {
  const base = defaultGarage();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Partial<GarageState> & { tuning?: Partial<CarTuning> };
  return {
    version: VERSION,
    carId: typeof o.carId === 'string' ? o.carId : base.carId,
    paintId: typeof o.paintId === 'string' ? o.paintId : base.paintId,
    mods: Array.isArray(o.mods) ? o.mods.filter((m): m is string => typeof m === 'string') : [],
    tuning: {
      topSpeed: clampLevel(o.tuning?.topSpeed),
      accel: clampLevel(o.tuning?.accel),
      grip: clampLevel(o.tuning?.grip),
    },
    currency:
      typeof o.currency === 'number' && Number.isFinite(o.currency)
        ? Math.max(0, Math.floor(o.currency))
        : base.currency,
    onboarded: Boolean(o.onboarded),
    tutorialDone: Boolean(o.tutorialDone),
    contractId:
      o.contractId === 'drift_target' || o.contractId === 'clean_run' || o.contractId === 'time_trial'
        ? o.contractId
        : base.contractId,
    bestLapMs:
      typeof o.bestLapMs === 'number' && Number.isFinite(o.bestLapMs)
        ? Math.max(0, Math.floor(o.bestLapMs))
        : base.bestLapMs,
    bestDriftScore:
      typeof o.bestDriftScore === 'number' && Number.isFinite(o.bestDriftScore)
        ? Math.max(0, Math.floor(o.bestDriftScore))
        : base.bestDriftScore,
    totalRaces:
      typeof o.totalRaces === 'number' && Number.isFinite(o.totalRaces)
        ? Math.max(0, Math.floor(o.totalRaces))
        : base.totalRaces,
    lastDriftScore:
      typeof o.lastDriftScore === 'number' && Number.isFinite(o.lastDriftScore)
        ? Math.max(0, Math.floor(o.lastDriftScore))
        : base.lastDriftScore,
    lastStyleGrade: typeof o.lastStyleGrade === 'string' ? o.lastStyleGrade : base.lastStyleGrade,
  };
}

export function loadGarage(): GarageState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultGarage();
    return normalizeGarage(JSON.parse(raw));
  } catch {
    return defaultGarage();
  }
}

export function saveGarage(state: GarageState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: VERSION }));
  } catch {
    /* best-effort */
  }
}