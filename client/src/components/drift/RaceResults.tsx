import { Button } from '@/components/ui/button';
import { Coins, RotateCcw, Wrench } from 'lucide-react';
import type { DriftSessionResult } from '@/lib/velocity/contracts';

interface RaceResultsProps {
  result: DriftSessionResult;
  carName: string;
  prevBestLapMs: number;
  prevBestScore: number;
  onRetry: () => void;
  onGarage: () => void;
}

function formatMs(ms: number): string {
  if (ms <= 0) return '—';
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toFixed(2).padStart(5, '0')}`;
}

const GRADE_COLORS: Record<string, string> = {
  S: 'text-yellow-300',
  A: 'text-emerald-300',
  B: 'text-cyan-300',
  C: 'text-white/60',
};

export function RaceResults({
  result,
  carName,
  prevBestLapMs,
  prevBestScore,
  onRetry,
  onGarage,
}: RaceResultsProps) {
  const newBestLap = result.bestLapMs > 0 && (prevBestLapMs === 0 || result.bestLapMs < prevBestLapMs);
  const newBestScore = result.driftScore > prevBestScore;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/85 backdrop-blur-md">
      <div
        className="mx-4 w-full max-w-lg rounded-xl border border-cyan-500/20 bg-[#060810]/95 p-6"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-cyan-400/70">Run Complete</p>
        <div className="mt-2 flex items-baseline gap-3">
          <h2 className={`text-4xl font-black ${GRADE_COLORS[result.styleGrade] ?? 'text-white'}`}>
            {result.styleGrade}
          </h2>
          <span
            className={`text-sm font-bold uppercase tracking-widest ${
              result.passed ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {result.passed ? 'Contract cleared' : 'Contract failed'}
          </span>
        </div>

        <p className="mt-1 text-sm text-white/50">{carName}</p>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase text-white/40">Drift score</p>
            <p className="font-bold tabular-nums text-white">
              {result.driftScore.toLocaleString()}
              {newBestScore && <span className="ml-1 text-xs text-amber-400">PB</span>}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase text-white/40">Best lap</p>
            <p className="font-bold tabular-nums text-white">
              {formatMs(result.bestLapMs)}
              {newBestLap && <span className="ml-1 text-xs text-amber-400">PB</span>}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase text-white/40">Off-track</p>
            <p className="font-bold tabular-nums text-white">{result.offTrackPct.toFixed(1)}%</p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
            <p className="text-[10px] uppercase text-white/40">Max combo</p>
            <p className="font-bold tabular-nums text-white">x{result.longestCombo.toFixed(1)}</p>
          </div>
        </div>

        {result.lapTimes.length > 0 && (
          <div className="mt-3 rounded-lg border border-white/10 px-3 py-2">
            <p className="text-[10px] uppercase text-white/40">Lap times</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs tabular-nums text-white/70">
              {result.lapTimes.map((t, i) => (
                <span key={i}>
                  L{i + 1} {formatMs(t)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <Coins className="h-4 w-4 text-amber-300" />
          <span className="text-lg font-bold text-amber-200">+{result.currencyEarned}¢</span>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1 gap-1" onClick={onGarage}>
            <Wrench className="h-4 w-4" />
            Garage
          </Button>
          <Button className="flex-1 gap-1 bg-rose-600 hover:bg-rose-500" onClick={onRetry}>
            <RotateCcw className="h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    </div>
  );
}