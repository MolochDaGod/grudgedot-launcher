import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'wouter';
import { ArrowLeft, Gauge, Trophy, Wrench, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import { DriftHUD } from '@/components/drift/DriftHUD';
import { SpeedOverlay } from '@/components/drift/SpeedOverlay';
import { RaceBrief } from '@/components/drift/RaceBrief';
import { RaceCountdown } from '@/components/drift/RaceCountdown';
import { RaceResults } from '@/components/drift/RaceResults';
import { VelocityGarage } from '@/components/velocity/VelocityGarage';
import { DriftRacingEngine, type DriftLoadState } from '@/lib/drift/DriftRacingEngine';
import type { DriftHudSnapshot, SpeedPresentationState } from '@/lib/drift/types';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';
import { getCar } from '@/lib/velocity/cars';
import { computeEffectiveStats, getPaint } from '@/lib/velocity/garage';
import { loadGarage, saveGarage, type GarageState } from '@/lib/velocity/garageState';
import { prepareVehicle } from '@/lib/velocity/vehicleFactory';
import { getContract, type DriftSessionResult } from '@/lib/velocity/contracts';

import { GrudgeDriveGame } from '@/pages/grudge-drive';

type HubTab = 'garage' | 'overdrive';
type RacePhase = 'brief' | 'countdown' | 'driving' | 'results';

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
  isOffTrack: false,
  offTrackPct: 0,
  longestCombo: 1,
  targetLaps: 3,
  contractLabel: 'Time Trial',
  contractProgress: 0,
  sessionSec: 0,
  drivingActive: false,
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
    <GrudgeGameWrapper gameSlug="grudge-velocity" gameName="Grudge Velocity" xpPerThousand={10} goldPerGame={8} hideHud>
      {(session) => <GrudgeVelocityInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function GrudgeVelocityInner({ session }: { session: GrudgeGameSession }) {
  const [hubTab, setHubTab] = useState<HubTab>(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    return tab === 'overdrive' ? 'overdrive' : 'garage';
  });
  const [inRace, setInRace] = useState(false);
  const [garage, setGarage] = useState<GarageState>(() => loadGarage());

  useEffect(() => {
    document.title = 'Grudge Velocity — Voxel Garage & Drift';
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    const next = hubTab === 'overdrive' ? 'overdrive' : null;
    if (next) url.searchParams.set('tab', next);
    else url.searchParams.delete('tab');
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [hubTab]);

  const persistGarage = useCallback((next: GarageState) => {
    setGarage(next);
    saveGarage(next);
  }, []);

  const handleSessionComplete = useCallback(
    (result: DriftSessionResult) => {
      const next: GarageState = {
        ...garage,
        currency: garage.currency + result.currencyEarned,
        bestLapMs:
          result.bestLapMs > 0 && (garage.bestLapMs === 0 || result.bestLapMs < garage.bestLapMs)
            ? result.bestLapMs
            : garage.bestLapMs,
        bestDriftScore: Math.max(garage.bestDriftScore, result.driftScore),
        totalRaces: garage.totalRaces + 1,
        lastDriftScore: result.driftScore,
        lastStyleGrade: result.styleGrade,
        tutorialDone: true,
      };
      persistGarage(next);
      session.reportScore(result.driftScore, {
        grade: result.styleGrade,
        passed: result.passed,
        contract: result.contractId,
      });
    },
    [garage, persistGarage, session],
  );

  if (inRace) {
    return (
      <GrudgeDriftRace
        garage={garage}
        session={session}
        onExit={() => setInRace(false)}
        onSessionComplete={handleSessionComplete}
      />
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#060810]" data-testid="page-grudge-velocity">
      <link
        href="https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=JetBrains+Mono:wght@400;600&display=swap"
        rel="stylesheet"
      />

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
            <h1 className="text-lg font-black tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              GRUDGE<span className="text-rose-500">VELOCITY</span>
            </h1>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={hubTab === 'garage' ? 'default' : 'ghost'}
            className="gap-1"
            onClick={() => setHubTab('garage')}
          >
            <Wrench className="h-3.5 w-3.5" />
            Garage
          </Button>
          <Button
            size="sm"
            variant={hubTab === 'overdrive' ? 'default' : 'ghost'}
            className="gap-1"
            onClick={() => setHubTab('overdrive')}
          >
            <Flag className="h-3.5 w-3.5" />
            Overdrive
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-auto">
        {hubTab === 'garage' ? (
          <VelocityGarage garage={garage} onChange={persistGarage} onRace={() => setInRace(true)} />
        ) : (
          <GrudgeDriveGame session={session} />
        )}
      </div>
    </div>
  );
}

function GrudgeDriftRace({
  garage,
  session,
  onExit,
  onSessionComplete,
}: {
  garage: GarageState;
  session: GrudgeGameSession;
  onExit: () => void;
  onSessionComplete: (result: DriftSessionResult) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<DriftRacingEngine | null>(null);
  const [racePhase, setRacePhase] = useState<RacePhase>('brief');
  const [countdown, setCountdown] = useState(3);
  const [hud, setHud] = useState<DriftHudSnapshot>(DEFAULT_HUD);
  const [fx, setFx] = useState<SpeedPresentationState>(DEFAULT_FX);
  const [lapToast, setLapToast] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<DriftLoadState>('loading');
  const [loadMessage, setLoadMessage] = useState('Loading RVP street circuit…');
  const [sessionResult, setSessionResult] = useState<DriftSessionResult | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const prevBestLapRef = useRef(garage.bestLapMs);
  const prevBestScoreRef = useRef(garage.bestDriftScore);

  const contract = getContract(garage.contractId);
  const car = getCar(garage.carId);
  const paint = getPaint(garage.paintId);
  const stats = car ? computeEffectiveStats(car.stats, garage.tuning) : { topSpeed: 1, accel: 1, grip: 1 };

  const handleHudUpdate = useCallback((snapshot: DriftHudSnapshot) => {
    setHud(snapshot);
    const engine = engineRef.current;
    if (engine) setFx({ ...engine.getSpeedFx() });
  }, []);

  const handleLapComplete = useCallback((lap: number, timeMs: number) => {
    const time = (timeMs / 1000).toFixed(2);
    setLapToast(`Lap ${lap} — ${time}s`);
    setTimeout(() => setLapToast(null), 2500);
  }, []);

  const handleSessionEnd = useCallback(
    (result: DriftSessionResult) => {
      onSessionComplete(result);
      setSessionResult(result);
      setRacePhase('results');
    },
    [onSessionComplete],
  );

  useEffect(() => {
    document.title = 'Grudge Velocity — RVP Drift';
    const container = containerRef.current;
    if (!container || !car) return;

    let cancelled = false;
    DriftRacingEngine.create(
      container,
      {
        prepareVehicle: async () => {
          const prepared = await prepareVehicle(car, {
            paintColor: paint?.color || undefined,
            mods: garage.mods,
          });
          return prepared.root;
        },
        statMultipliers: stats,
      },
      { contract },
      {
        onHudUpdate: handleHudUpdate,
        onLapComplete: handleLapComplete,
        onLoadState: (state, message) => {
          setLoadState(state);
          if (message) setLoadMessage(message);
        },
        onSessionComplete: handleSessionEnd,
      },
    )
      .then((engine) => {
        if (cancelled) {
          engine.dispose();
          return;
        }
        engineRef.current = engine;
      })
      .catch(() => {
        setLoadState('error');
        setLoadMessage('Failed to load track or voxel car');
      });

    return () => {
      cancelled = true;
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, [
    car?.id,
    garage.paintId,
    garage.mods.join(','),
    garage.tuning.topSpeed,
    garage.tuning.accel,
    garage.tuning.grip,
    garage.contractId,
    retryKey,
    handleHudUpdate,
    handleLapComplete,
    handleSessionEnd,
  ]);

  useEffect(() => {
    if (racePhase !== 'brief' || loadState !== 'ready') return;
    const t = setTimeout(() => setRacePhase('countdown'), 2800);
    return () => clearTimeout(t);
  }, [racePhase, loadState]);

  useEffect(() => {
    if (racePhase !== 'countdown') return;
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      engineRef.current?.beginDriving();
      setRacePhase('driving');
    }, 700);
    return () => clearTimeout(t);
  }, [racePhase, countdown]);

  const handleRetry = () => {
    prevBestLapRef.current = garage.bestLapMs;
    prevBestScoreRef.current = garage.bestDriftScore;
    setSessionResult(null);
    setRacePhase('brief');
    setCountdown(3);
    setHud(DEFAULT_HUD);
    setLoadState('loading');
    setLoadMessage('Loading RVP street circuit…');
    setRetryKey((k) => k + 1);
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#060810]">
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-cyan-500/10 bg-black/70 px-4 py-2 backdrop-blur-md">
        <Button variant="ghost" size="sm" onClick={onExit} className="text-white/50 hover:text-white">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Garage
        </Button>
        <div className="flex items-center gap-2 text-sm text-white/70">
          <span style={{ color: car?.accent }}>{car?.name}</span>
          <span className="text-white/30">·</span>
          <span className="text-xs text-cyan-300/80">{contract.name}</span>
          {session.character && (
            <>
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              {session.character.name}
            </>
          )}
        </div>
      </header>

      <div
        key={retryKey}
        ref={containerRef}
        className="relative min-h-0 flex-1"
        style={{ fontFamily: 'JetBrains Mono, monospace' }}
      >
        {loadState !== 'ready' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-[#060810]/90 backdrop-blur-sm">
            {loadState === 'loading' && (
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-500/30 border-t-cyan-400" />
            )}
            <p className="text-sm text-white/70">{loadMessage}</p>
          </div>
        )}

        {loadState === 'ready' && racePhase !== 'results' && (
          <>
            {(racePhase === 'driving' || racePhase === 'countdown') && (
              <>
                <DriftHUD hud={hud} />
                <SpeedOverlay fx={fx} isDrifting={hud.isDrifting} nitroActive={hud.nitroActive} isOffTrack={hud.isOffTrack} />
              </>
            )}
            {racePhase === 'brief' && car && (
              <RaceBrief
                contract={contract}
                carName={car.name}
                effectiveStats={stats}
                bestLapMs={garage.bestLapMs}
                onContinue={() => setRacePhase('countdown')}
              />
            )}
            {racePhase === 'countdown' && <RaceCountdown value={countdown} />}
          </>
        )}

        {sessionResult && racePhase === 'results' && car && (
          <RaceResults
            result={sessionResult}
            carName={car.name}
            prevBestLapMs={prevBestLapRef.current}
            prevBestScore={prevBestScoreRef.current}
            onRetry={handleRetry}
            onGarage={onExit}
          />
        )}
      </div>

      {lapToast && racePhase === 'driving' && (
        <div className="pointer-events-none absolute left-1/2 top-1/3 z-30 -translate-x-1/2 animate-bounce">
          <div
            className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-6 py-3 text-lg font-bold text-emerald-300"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            {lapToast}
          </div>
        </div>
      )}
    </div>
  );
}