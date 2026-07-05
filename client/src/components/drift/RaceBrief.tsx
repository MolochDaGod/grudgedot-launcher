import { Button } from '@/components/ui/button';
import type { RunContract } from '@/lib/velocity/contracts';

interface RaceBriefProps {
  contract: RunContract;
  carName: string;
  effectiveStats: { topSpeed: number; accel: number; grip: number };
  bestLapMs: number;
  onContinue: () => void;
}

function formatMs(ms: number): string {
  if (ms <= 0) return '—';
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toFixed(2).padStart(5, '0')}`;
}

export function RaceBrief({ contract, carName, effectiveStats, bestLapMs, onContinue }: RaceBriefProps) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm">
      <div
        className="mx-4 max-w-md rounded-xl border border-cyan-500/25 bg-black/80 p-6 shadow-[0_0_40px_rgba(255,34,68,0.15)]"
        style={{ fontFamily: 'Orbitron, sans-serif' }}
      >
        <p className="text-[10px] uppercase tracking-[0.35em] text-rose-400">Race Brief</p>
        <h2 className="mt-2 text-2xl font-black text-white">{contract.name}</h2>
        <p className="mt-2 text-sm text-white/55">{contract.description}</p>

        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
          <span className="text-white">{carName}</span>
          <span className="mx-2 text-white/30">·</span>
          SPD {(effectiveStats.topSpeed * 100).toFixed(0)}% · ACC {(effectiveStats.accel * 100).toFixed(0)}% · GRP{' '}
          {(effectiveStats.grip * 100).toFixed(0)}%
        </div>

        {bestLapMs > 0 && (
          <p className="mt-2 text-xs text-emerald-400/80">Personal best lap: {formatMs(bestLapMs)}</p>
        )}

        <div className="mt-4 rounded border border-white/10 px-3 py-2 text-[10px] text-white/45">
          <div>W/↑ Gas · S/↓ Brake · A/D Steer</div>
          <div>Space Handbrake · Shift Nitro · R Reset</div>
        </div>

        <Button className="mt-5 w-full bg-rose-600 hover:bg-rose-500" onClick={onContinue}>
          Grid Up
        </Button>
      </div>
    </div>
  );
}