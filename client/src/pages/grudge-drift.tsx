import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Gauge, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import { DriftHUD } from '@/components/drift/DriftHUD';
import { SpeedOverlay } from '@/components/drift/SpeedOverlay';
import { DriftRacingEngine, type DriftLoadState } from '@/lib/drift/DriftRacingEngine';
import type { DriftHudSnapshot } from '@/lib/drift/types';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';
import type { SpeedPresentationState } from '@/lib/drift/types';

const DEFAULT_HUD: DriftHudSnapshot = {
  speedKmh: 0,
  driftScore: 0,
  combo: 1,
  boost: 0,
  lap: 0,
  lapTime: 0,
  bestLap: 0,
  isDrifting: false,
  nitroActive: false,
};

const DEFAULT_FX: SpeedPresentationState = {
  speedRatio: 0,
  driftIntensity: 0,
  fov: 58,
  shake: 0,
  vignette: 0.25,
  motionBlur: 0,
  exposure: 1,
};

export default function GrudgeDrift() {
  return (
    <GrudgeGameWrapper gameSlug="grudge-drift" gameName="Grudge Drift" xpPerThousand={10} goldPerGame={8} hideHud>
      {(session) => <GrudgeDriftInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function GrudgeDriftInner({ session }: { session: GrudgeGameSession }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DriftRacingEngine | null>(null);
  const [hud, setHud] = useState<DriftHudSnapshot>(DEFAULT_HUD);
  const [fx, setFx] = useState<SpeedPresentationState>(DEFAULT_FX);
  const [lapToast, setLapToast] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<DriftLoadState>('loading');
  const [loadMessage, setLoadMessage] = useState('Loading RVP street circuit…');

  const handleHudUpdate = useCallback((snapshot: DriftHudSnapshot) => {
    setHud(snapshot);
    const engine = engineRef.current;
    if (engine) setFx({ ...engine.getSpeedFx() });
  }, []);

  const handleLapComplete = useCallback((lap: number, timeMs: number) => {
    const time = (timeMs / 1000).toFixed(2);
    setLapToast(`Lap ${lap} — ${time}s`);
    session.reportScore(Math.floor(hud.driftScore), { lap, timeMs });
    setTimeout(() => setLapToast(null), 2500);
  }, [session, hud.driftScore]);

  useEffect(() => {
    document.title = 'Grudge Drift — RVP Street Circuit';
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    DriftRacingEngine.create(container, {
      onHudUpdate: handleHudUpdate,
      onLapComplete: handleLapComplete,
      onLoadState: (state, message) => {
        setLoadState(state);
        if (message) setLoadMessage(message);
      },
    }).then((engine) => {
      if (cancelled) {
        engine.dispose();
        return;
      }
      engineRef.current = engine;
    }).catch(() => {
      setLoadState('error');
      setLoadMessage('Failed to load chicken_gun_rvp_track2.glb');
    });

    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [handleHudUpdate, handleLapComplete]);

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#060810]" data-testid="page-grudge-drift">
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-cyan-500/10 bg-black/70 px-4 py-2 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white/50 hover:text-white">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-rose-500" />
            <h1
              className="text-lg font-black tracking-wider text-white"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              GRUDGE<span className="text-rose-500">DRIFT</span>
            </h1>
          </div>
        </div>
        {session.character && (
          <div className="flex items-center gap-2 text-xs text-white/50">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            {session.character.name}
          </div>
        )}
      </header>

      {/* Game viewport */}
      <div ref={containerRef} className="relative min-h-0 flex-1" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
        {loadState !== 'ready' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#060810]/90 backdrop-blur-sm">
            {loadState === 'loading' && (
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
            )}
            <p className="text-sm text-white/70">{loadMessage}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/35">
              chicken_gun_rvp_track2 · street pathfind lap
            </p>
          </div>
        )}
        {loadState === 'ready' && (
          <>
            <DriftHUD hud={hud} />
            <SpeedOverlay fx={fx} isDrifting={hud.isDrifting} nitroActive={hud.nitroActive} />
          </>
        )}
      </div>

      {/* Lap toast */}
      {lapToast && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 animate-bounce">
          <div
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-6 py-3 text-lg font-bold text-emerald-300 shadow-[0_0_30px_rgba(52,211,153,0.25)]"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {lapToast}
          </div>
        </div>
      )}
    </div>
  );
}