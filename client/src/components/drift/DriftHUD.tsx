import type { DriftHudSnapshot } from '@/lib/drift/types';

interface DriftHUDProps {
  hud: DriftHudSnapshot;
}

function formatTime(seconds: number): string {
  if (seconds <= 0) return '--:--.--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toFixed(2).padStart(5, '0')}`;
}

export function DriftHUD({ hud }: DriftHUDProps) {
  const speedAngle = Math.min(270, (hud.speedKmh / 220) * 270);
  const boostPct = hud.boost;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 font-mono">
      {/* Top bar */}
      <div className="absolute left-4 right-4 top-4 flex items-start justify-between">
        <div className="rounded-lg border border-cyan-500/20 bg-black/60 px-4 py-2 backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/70">Grudge Drift</div>
          <div className="text-xs text-white/50">RVP Street · Lap {hud.lap + 1}</div>
        </div>

        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Lap Time</div>
          <div className="text-xl font-bold tabular-nums text-white">{formatTime(hud.lapTime)}</div>
          {hud.bestLap > 0 && (
            <div className="text-xs text-emerald-400/80">Best {formatTime(hud.bestLap)}</div>
          )}
        </div>
      </div>

      {/* Drift score — center top */}
      <div
        className={`absolute left-1/2 top-20 -translate-x-1/2 text-center transition-all duration-150 ${
          hud.isDrifting ? 'scale-110 opacity-100' : 'scale-100 opacity-70'
        }`}
      >
        <div className="text-[10px] uppercase tracking-[0.3em] text-amber-400/60">Drift</div>
        <div
          className={`text-4xl font-black tabular-nums tracking-tight ${
            hud.isDrifting ? 'text-amber-300 drop-shadow-[0_0_12px_rgba(255,180,50,0.6)]' : 'text-white/80'
          }`}
        >
          {hud.driftScore.toLocaleString()}
        </div>
        {hud.combo > 1 && (
          <div className="mt-1 text-sm font-bold text-orange-400 animate-pulse">
            x{hud.combo.toFixed(1)} COMBO
          </div>
        )}
      </div>

      {/* Speedometer — bottom left */}
      <div className="absolute bottom-6 left-6">
        <div className="relative h-28 w-28">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-[135deg]">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42" fill="none"
              stroke={hud.nitroActive ? '#ff4466' : '#22d3ee'}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(speedAngle / 360) * 264} 264`}
              className="transition-all duration-75"
              style={{ filter: hud.nitroActive ? 'drop-shadow(0 0 6px #ff4466)' : undefined }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black tabular-nums text-white leading-none">{hud.speedKmh}</span>
            <span className="text-[10px] uppercase tracking-widest text-white/40">km/h</span>
          </div>
        </div>
      </div>

      {/* Boost bar — bottom center */}
      <div className="absolute bottom-8 left-1/2 w-64 -translate-x-1/2">
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-white/40">
          <span>Nitro</span>
          <span>{hud.nitroActive ? 'BOOSTING' : 'Shift'}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-100 ${
              hud.nitroActive
                ? 'bg-gradient-to-r from-rose-500 via-orange-400 to-yellow-300 animate-pulse'
                : boostPct >= 100
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                  : 'bg-gradient-to-r from-cyan-600/80 to-cyan-400/60'
            }`}
            style={{ width: `${boostPct}%` }}
          />
        </div>
      </div>

      {/* Controls hint — bottom right */}
      <div className="absolute bottom-6 right-6 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[10px] text-white/45 backdrop-blur-sm">
        <div>W/↑ Gas · S/↓ Brake</div>
        <div>A/D Steer · Space Handbrake</div>
        <div>Shift Nitro · R Reset</div>
      </div>

      {/* Drift indicator */}
      {hud.isDrifting && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2">
          <div className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-bold uppercase tracking-widest text-amber-300 shadow-[0_0_20px_rgba(255,180,50,0.3)]">
            Drifting
          </div>
        </div>
      )}
    </div>
  );
}