export type RunContractId = 'time_trial' | 'drift_target' | 'clean_run';

export interface RunContract {
  id: RunContractId;
  name: string;
  description: string;
  targetLaps?: number;
  driftScoreTarget?: number;
  driftTimeLimitSec?: number;
  cleanRunLaps?: number;
  maxOffTrackPct?: number;
}

export const RUN_CONTRACTS: RunContract[] = [
  {
    id: 'time_trial',
    name: 'Time Trial',
    description: 'Complete 3 laps on the RVP circuit. Beat your personal best.',
    targetLaps: 3,
  },
  {
    id: 'drift_target',
    name: 'Drift Target',
    description: 'Hit 50,000 drift points within 90 seconds.',
    driftScoreTarget: 50_000,
    driftTimeLimitSec: 90,
  },
  {
    id: 'clean_run',
    name: 'Clean Run',
    description: 'Finish 2 laps with less than 20% off-track time.',
    cleanRunLaps: 2,
    maxOffTrackPct: 20,
  },
];

export function getContract(id: RunContractId): RunContract {
  return RUN_CONTRACTS.find((c) => c.id === id) ?? RUN_CONTRACTS[0];
}

export type StyleGrade = 'S' | 'A' | 'B' | 'C';

export interface DriftSessionResult {
  contractId: RunContractId;
  passed: boolean;
  driftScore: number;
  bestLapMs: number;
  totalTimeMs: number;
  lapTimes: number[];
  offTrackPct: number;
  longestCombo: number;
  styleGrade: StyleGrade;
  currencyEarned: number;
}

export function gradeStyle(
  driftScore: number,
  offTrackPct: number,
  passed: boolean,
): StyleGrade {
  if (!passed) return 'C';
  if (driftScore >= 80_000 && offTrackPct < 10) return 'S';
  if (driftScore >= 40_000 && offTrackPct < 15) return 'A';
  if (driftScore >= 15_000 && offTrackPct < 25) return 'B';
  return 'C';
}

export function contractPayout(grade: StyleGrade, passed: boolean): number {
  const base = { S: 320, A: 220, B: 140, C: 60 };
  const mult = passed ? 1 : 0.35;
  return Math.floor(base[grade] * mult);
}

export function evaluateContract(
  contract: RunContract,
  stats: {
    laps: number;
    driftScore: number;
    sessionSec: number;
    offTrackPct: number;
    bestLapMs: number;
    prevBestLapMs: number;
  },
): boolean {
  switch (contract.id) {
    case 'time_trial':
      return stats.laps >= (contract.targetLaps ?? 3);
    case 'drift_target':
      return stats.driftScore >= (contract.driftScoreTarget ?? 50_000);
    case 'clean_run':
      return (
        stats.laps >= (contract.cleanRunLaps ?? 2) &&
        stats.offTrackPct <= (contract.maxOffTrackPct ?? 20)
      );
    default:
      return false;
  }
}

export function contractProgress(
  contract: RunContract,
  stats: { laps: number; driftScore: number; sessionSec: number; offTrackPct: number },
): number {
  switch (contract.id) {
    case 'time_trial':
      return Math.min(1, stats.laps / (contract.targetLaps ?? 3));
    case 'drift_target': {
      const scoreP = stats.driftScore / (contract.driftScoreTarget ?? 50_000);
      const timeP = stats.sessionSec / (contract.driftTimeLimitSec ?? 90);
      return Math.min(1, Math.max(scoreP, timeP > 1 ? 1 : scoreP));
    }
    case 'clean_run': {
      const lapP = stats.laps / (contract.cleanRunLaps ?? 2);
      const cleanP = 1 - stats.offTrackPct / (contract.maxOffTrackPct ?? 20);
      return Math.min(1, lapP * 0.6 + Math.max(0, cleanP) * 0.4);
    }
    default:
      return 0;
  }
}

export function isSessionTimedOut(contract: RunContract, sessionSec: number): boolean {
  if (contract.id !== 'drift_target') return false;
  return sessionSec >= (contract.driftTimeLimitSec ?? 90);
}