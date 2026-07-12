import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wrench, Palette, Gauge, Coins, Play, ChevronRight } from 'lucide-react';
import {
  CARS,
  STARTER_CARS,
  getCar,
  nextCar,
  type CarDef,
} from '@/lib/velocity/cars';
import {
  PAINTS,
  VISUAL_MODS,
  STAT_KEYS,
  STAT_LABEL,
  TUNE_MAX,
  tuneCost,
  tuneRefund,
  carRefund,
  computeEffectiveStats,
  getMod,
} from '@/lib/velocity/garage';
import type { GarageState } from '@/lib/velocity/garageState';
import { RUN_CONTRACTS, type RunContractId } from '@/lib/velocity/contracts';

interface VelocityGarageProps {
  garage: GarageState;
  onChange: (next: GarageState) => void;
  onRace: () => void;
}

export function VelocityGarage({ garage, onChange, onRace }: VelocityGarageProps) {
  const car = getCar(garage.carId) ?? STARTER_CARS[0];
  const upgrade = nextCar(garage.carId);
  const effective = useMemo(
    () => computeEffectiveStats(car.stats, garage.tuning),
    [car, garage.tuning],
  );

  const set = (patch: Partial<GarageState>) => onChange({ ...garage, ...patch });

  const buyMod = (modId: string) => {
    const mod = getMod(modId);
    if (!mod || garage.mods.includes(modId) || garage.currency < mod.price) return;
    set({ currency: garage.currency - mod.price, mods: [...garage.mods, modId] });
  };

  const tuneUp = (stat: (typeof STAT_KEYS)[number]) => {
    const level = garage.tuning[stat];
    if (level >= TUNE_MAX) return;
    const cost = tuneCost(level);
    if (garage.currency < cost) return;
    set({
      currency: garage.currency - cost,
      tuning: { ...garage.tuning, [stat]: level + 1 },
    });
  };

  const tuneDown = (stat: (typeof STAT_KEYS)[number]) => {
    const level = garage.tuning[stat];
    if (level <= 0) return;
    set({
      currency: garage.currency + tuneRefund(level),
      tuning: { ...garage.tuning, [stat]: level - 1 },
    });
  };

  const pickStarter = (c: CarDef) => {
    set({ carId: c.id, onboarded: true, tutorialDone: true });
  };

  const formatLap = (ms: number) => {
    if (ms <= 0) return '—';
    const s = ms / 1000;
    return `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, '0')}`;
  };

  const buyUpgrade = () => {
    if (!upgrade?.upgradeCost || garage.currency < upgrade.upgradeCost) return;
    set({ carId: upgrade.id, currency: garage.currency - upgrade.upgradeCost });
  };

  const sellUpgrade = () => {
    const prev = CARS.find((c) => c.upgradeTo === garage.carId);
    if (!prev || !prev.upgradeCost) return;
    set({ carId: prev.id, currency: garage.currency + carRefund(prev.upgradeCost) });
  };

  if (!garage.onboarded) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Pick your starter
          </h2>
          <p className="mt-2 text-sm text-white/50">Voxel garage — tune paint, mods, and stats before you drift.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STARTER_CARS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pickStarter(c)}
              className="group rounded-xl border border-white/10 bg-black/40 p-4 text-left transition hover:border-white/30 hover:bg-white/5"
            >
              <Badge style={{ backgroundColor: `${c.accent}22`, color: c.accent, border: 'none' }}>{c.klass}</Badge>
              <h3 className="mt-3 text-lg font-bold text-white">{c.name}</h3>
              <p className="mt-1 text-xs text-white/45">
                SPD {(c.stats.topSpeed * 100).toFixed(0)}% · ACC {(c.stats.accel * 100).toFixed(0)}% · GRP {(c.stats.grip * 100).toFixed(0)}%
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-cyan-500/15 bg-black/50 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Wrench className="h-5 w-5 text-rose-400" />
            {car.name}
          </CardTitle>
          <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-300">
            <Coins className="h-3 w-3" />
            {garage.currency}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="flex h-40 items-center justify-center rounded-lg border border-white/10"
            style={{ background: `radial-gradient(circle at 50% 80%, ${car.accent}33, transparent 70%)` }}
          >
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-white/40">{car.klass} · Tier {car.tier}</p>
              <p className="mt-1 text-sm text-white/70">
                Effective — SPD {(effective.topSpeed * 100).toFixed(0)}% · ACC {(effective.accel * 100).toFixed(0)}% · GRP {(effective.grip * 100).toFixed(0)}%
              </p>
            </div>
          </div>

          {(garage.lastDriftScore > 0 || garage.bestLapMs > 0) && (
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/55">
              Last run — {garage.lastDriftScore.toLocaleString()} pts
              {garage.lastStyleGrade && (
                <span className="ml-2 text-amber-300">{garage.lastStyleGrade}</span>
              )}
              {garage.bestLapMs > 0 && (
                <span className="ml-2 text-emerald-400/80">PB {formatLap(garage.bestLapMs)}</span>
              )}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-white/40">Run contract</p>
            <div className="grid gap-2">
              {RUN_CONTRACTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => set({ contractId: c.id as RunContractId })}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                    garage.contractId === c.id
                      ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100'
                      : 'border-white/10 text-white/60 hover:border-white/25'
                  }`}
                >
                  <p className="font-semibold text-white">{c.name}</p>
                  <p className="mt-0.5 text-white/45">{c.description}</p>
                </button>
              ))}
            </div>
          </div>

          {upgrade && (
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <div>
                <p className="text-xs text-white/45">Upgrade ladder</p>
                <p className="text-sm font-semibold text-white">{upgrade.name} — {upgrade.upgradeCost}¢</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={sellUpgrade} disabled={car.tier === 1}>
                  Revert
                </Button>
                <Button size="sm" onClick={buyUpgrade} disabled={garage.currency < (upgrade.upgradeCost ?? 0)}>
                  Upgrade
                </Button>
              </div>
            </div>
          )}

          <Button className="w-full gap-2 bg-rose-600 hover:bg-rose-500" size="lg" onClick={onRace}>
            <Play className="h-4 w-4" />
            Drift RVP Circuit
            <ChevronRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card className="border-cyan-500/15 bg-black/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <Palette className="h-4 w-4 text-cyan-400" />
              Paint
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {PAINTS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => set({ paintId: p.id })}
                className={`rounded-md border px-2 py-1 text-xs ${garage.paintId === p.id ? 'border-cyan-400 text-cyan-200' : 'border-white/10 text-white/60'}`}
              >
                <span
                  className="mr-1 inline-block h-2 w-2 rounded-full border border-white/20"
                  style={{ background: p.color || car.accent }}
                />
                {p.name}
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-cyan-500/15 bg-black/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-white">
              <Gauge className="h-4 w-4 text-emerald-400" />
              Tuning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {STAT_KEYS.map((stat) => (
              <div key={stat} className="flex items-center justify-between text-xs text-white/70">
                <span>{STAT_LABEL[stat]} Lv {garage.tuning[stat]}/{TUNE_MAX}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => tuneDown(stat)}>-</Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => tuneUp(stat)}
                    disabled={garage.tuning[stat] >= TUNE_MAX || garage.currency < tuneCost(garage.tuning[stat])}
                  >
                    + ({tuneCost(garage.tuning[stat])}¢)
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-cyan-500/15 bg-black/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Visual mods</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {VISUAL_MODS.map((mod) => {
              const owned = garage.mods.includes(mod.id);
              return (
                <div key={mod.id} className="flex items-center justify-between rounded border border-white/10 px-2 py-1.5 text-xs">
                  <div>
                    <p className="font-medium text-white">{mod.name}</p>
                    <p className="text-white/40">{mod.description}</p>
                  </div>
                  {owned ? (
                    <Badge variant="secondary">Equipped</Badge>
                  ) : (
                    <Button size="sm" variant="outline" className="h-7" onClick={() => buyMod(mod.id)} disabled={garage.currency < mod.price}>
                      {mod.price}¢
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}