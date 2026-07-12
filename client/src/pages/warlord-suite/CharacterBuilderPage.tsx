import { useState, useMemo, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { RotateCcw } from "lucide-react";
import {
  ATTRIBUTES, ATTRIBUTE_IDS, SECONDARY_STAT_IDS, STAT_DEFINITIONS,
  calculateStats, getEffectivePoints,
  type CharacterAttributes, type SecondaryStatId,
} from "../../../../shared/wcs/attributeSystem";
import {
  CLASS_ALLOWED_WEAPONS, CLASS_ALLOWED_ARMOR,
} from "../../../../shared/wcs/classWeaponRestrictions";
import {
  CLASS_IDS, RACE_IDS, CLASS_DISPLAY_NAMES, MAX_CHARACTER_LEVEL,
  LEVEL_SCALING, type ClassId, type RaceId,
} from "../../../../shared/wcs/gameConstants";

const RACE_META: Record<string, { icon: string; name: string; bonus: string; faction: string; bonuses: Partial<CharacterAttributes> }> = {
  human:     { icon: "🧑", name: "Human",     faction: "Crusade", bonus: "+1 all stats",             bonuses: { strength: 1, vitality: 1, endurance: 1, intellect: 1, wisdom: 1, dexterity: 1, agility: 1, tactics: 1 } },
  orc:       { icon: "👹", name: "Orc",       faction: "Legion",  bonus: "+3 STR, +2 VIT",           bonuses: { strength: 3, vitality: 2 } },
  elf:       { icon: "🧝", name: "Elf",       faction: "Fabled",  bonus: "+3 INT, +2 AGI",           bonuses: { intellect: 3, agility: 2 } },
  undead:    { icon: "💀", name: "Undead",    faction: "Legion",  bonus: "+3 WIS, +2 INT",           bonuses: { wisdom: 3, intellect: 2 } },
  barbarian: { icon: "🪓", name: "Barbarian", faction: "Crusade", bonus: "+3 STR, +2 END",           bonuses: { strength: 3, endurance: 2 } },
  dwarf:     { icon: "⛏️", name: "Dwarf",     faction: "Fabled",  bonus: "+3 VIT, +2 WIS",           bonuses: { vitality: 3, wisdom: 2 } },
};

const CLASS_META: Record<string, { icon: string; name: string; playstyle: string }> = {
  warrior: { icon: "⚔️", name: "Warrior",            playstyle: "Tank / Melee DPS" },
  mage:    { icon: "🪄", name: "Mage Priest",         playstyle: "Ranged Magic DPS" },
  ranger:  { icon: "🏹", name: "Ranger Scout",        playstyle: "Ranged Physical DPS" },
  worge:   { icon: "🐻", name: "Worge Shapeshifter",  playstyle: "Hybrid / Shape-shifter" },
};

const BASE_POINTS = 5;
const STARTING_POOL = 20;
const POINTS_PER_LEVEL = 7;

// Key secondary stats to display prominently
const DISPLAY_STATS: { id: SecondaryStatId; icon: string }[] = [
  { id: "health", icon: "❤️" },
  { id: "mana", icon: "💧" },
  { id: "stamina", icon: "⚡" },
  { id: "damage", icon: "⚔️" },
  { id: "defense", icon: "🛡️" },
  { id: "criticalChance", icon: "🎯" },
  { id: "blockChance", icon: "🛡️" },
  { id: "accuracy", icon: "🎯" },
  { id: "resistance", icon: "🪄" },
  { id: "criticalFactor", icon: "💥" },
  { id: "blockFactor", icon: "🧱" },
  { id: "critEvasion", icon: "💨" },
];

function formatStat(id: SecondaryStatId, value: number): string {
  const def = STAT_DEFINITIONS[id];
  if (def?.isPercentage) return `${(value * 100).toFixed(1)}%`;
  return String(Math.floor(value));
}

export default function CharacterBuilderPage() {
  const [race, setRace] = useState<string>("human");
  const [classId, setClassId] = useState<string>("warrior");
  const [level, setLevel] = useState(1);
  const [allocated, setAllocated] = useState<CharacterAttributes>({
    strength: BASE_POINTS, vitality: BASE_POINTS, endurance: BASE_POINTS, intellect: BASE_POINTS,
    wisdom: BASE_POINTS, dexterity: BASE_POINTS, agility: BASE_POINTS, tactics: BASE_POINTS,
  });

  const totalPool = STARTING_POOL + ((level - 1) * POINTS_PER_LEVEL);
  const pointsUsed = Object.values(allocated).reduce((s, v) => s + (v - BASE_POINTS), 0);
  const pointsLeft = totalPool - pointsUsed;

  // Apply race bonuses to get final attributes
  const finalAttrs = useMemo<CharacterAttributes>(() => {
    const bonus = RACE_META[race]?.bonuses || {};
    const result = {} as CharacterAttributes;
    for (const k of ATTRIBUTE_IDS) {
      result[k] = allocated[k] + (bonus[k] || 0);
    }
    return result;
  }, [allocated, race]);

  // Calculate all derived stats via canonical system
  const computed = useMemo(() => calculateStats(level, finalAttrs), [level, finalAttrs]);

  const weapons = CLASS_ALLOWED_WEAPONS[classId as ClassId] || [];
  const armors = CLASS_ALLOWED_ARMOR[classId as ClassId] || [];

  const setStat = useCallback((key: keyof CharacterAttributes, val: number) => {
    setAllocated(prev => {
      const diff = val - prev[key];
      const currentUsed = Object.values(prev).reduce((s, v) => s + (v - BASE_POINTS), 0);
      if (currentUsed + diff > totalPool) return prev;
      return { ...prev, [key]: Math.max(BASE_POINTS, val) };
    });
  }, [totalPool]);

  const resetStats = () => {
    setAllocated({
      strength: BASE_POINTS, vitality: BASE_POINTS, endurance: BASE_POINTS, intellect: BASE_POINTS,
      wisdom: BASE_POINTS, dexterity: BASE_POINTS, agility: BASE_POINTS, tactics: BASE_POINTS,
    });
    setLevel(1);
  };

  return (
    <div className="p-4 space-y-4">
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="space-y-4">
          {/* Race Selector */}
          <div className="fantasy-panel p-4">
            <h4 className="font-[var(--font-heading)] text-xs gold-text tracking-widest uppercase mb-3">Race</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {RACE_IDS.map(rId => {
                const r = RACE_META[rId];
                const active = race === rId;
                return (
                  <button
                    key={rId}
                    onClick={() => setRace(rId)}
                    className={`p-3 rounded text-left text-xs transition-all ${
                      active ? "fantasy-panel ring-1 ring-[hsl(43_85%_55%)]" : "stone-panel hover:border-[hsl(43_60%_40%)]"
                    }`}
                  >
                    <span className="text-xl">{r?.icon}</span>
                    <div className="font-[var(--font-heading)] tracking-wide mt-1" style={active ? { color: "hsl(43 85% 55%)" } : undefined}>
                      {r?.name}
                    </div>
                    <div className="text-[9px] text-[hsl(45_15%_55%)] mt-0.5">{r?.bonus}</div>
                    <div className="text-[8px] text-[hsl(43_50%_45%)] mt-0.5 italic">{r?.faction}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Selector */}
          <div className="fantasy-panel p-4">
            <h4 className="font-[var(--font-heading)] text-xs gold-text tracking-widest uppercase mb-3">Class</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {CLASS_IDS.map(cId => {
                const c = CLASS_META[cId];
                const active = classId === cId;
                return (
                  <button
                    key={cId}
                    onClick={() => setClassId(cId)}
                    className={`p-3 rounded text-left text-xs transition-all ${
                      active ? "fantasy-panel ring-1 ring-[hsl(43_85%_55%)]" : "stone-panel hover:border-[hsl(43_60%_40%)]"
                    }`}
                  >
                    <span className="text-xl">{c?.icon}</span>
                    <div className="font-[var(--font-heading)] tracking-wide mt-1" style={active ? { color: "hsl(43 85% 55%)" } : undefined}>
                      {c?.name}
                    </div>
                    <div className="text-[9px] text-[hsl(45_15%_55%)] mt-0.5">{c?.playstyle}</div>
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 flex-wrap mt-3 text-[10px]">
              <span className="text-[hsl(43_70%_55%)] font-[var(--font-heading)]">Weapons:</span>
              {weapons.map(w => (
                <span key={w} className="px-1.5 py-0.5 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)] capitalize text-[9px]">
                  {w.replace(/_/g, " ")}
                </span>
              ))}
              <span className="text-[hsl(43_70%_55%)] font-[var(--font-heading)] ml-2">Armor:</span>
              {armors.map(a => (
                <span key={a} className="px-1.5 py-0.5 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)] capitalize text-[9px]">
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Attribute Allocator */}
          <div className="ornate-frame p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-[var(--font-heading)] text-xs gold-text tracking-widest uppercase">Attributes</h4>
              <span className="text-xs font-[var(--font-body)]">
                Points: <span className={pointsLeft === 0 ? "text-[hsl(120_60%_50%)]" : "text-[hsl(43_85%_55%)]"}>{pointsLeft}</span> / {totalPool}
              </span>
            </div>

            {/* Level slider */}
            <div className="flex items-center gap-3 text-xs mb-3">
              <span className="text-[hsl(45_15%_55%)] w-16 font-[var(--font-heading)]">Level</span>
              <Slider min={1} max={20} step={1} value={[level]} onValueChange={([v]) => setLevel(v)} className="flex-1" />
              <span className="font-mono w-6 text-right text-[hsl(43_85%_55%)]">{level}</span>
            </div>

            <div className="border-t border-[hsl(220_15%_25%)] pt-3 space-y-2.5">
              {ATTRIBUTE_IDS.map(key => {
                const attr = ATTRIBUTES[key];
                const bonus = (RACE_META[race]?.bonuses || {})[key] || 0;
                const effective = getEffectivePoints(finalAttrs[key]);
                const hasDR = finalAttrs[key] > 25;
                return (
                  <div key={key} className="flex items-center gap-3 text-xs">
                    <span className="w-20 font-[var(--font-heading)] font-semibold tracking-wide" style={{ color: attr.color }}>
                      {attr.abbrev}
                    </span>
                    <Slider
                      min={BASE_POINTS}
                      max={BASE_POINTS + totalPool}
                      step={1}
                      value={[allocated[key]]}
                      onValueChange={([v]) => setStat(key, v)}
                      className="flex-1"
                    />
                    <span className="font-mono w-6 text-right text-[hsl(45_30%_75%)]">{allocated[key]}</span>
                    {bonus > 0 && (
                      <span className="text-[9px] px-1 py-0 rounded bg-[hsl(43_40%_12%)] text-[hsl(43_85%_55%)] border border-[hsl(43_50%_30%)]">
                        +{bonus}
                      </span>
                    )}
                    <span className="font-mono w-6 text-right font-bold" style={{ color: attr.color }}>{finalAttrs[key]}</span>
                    {hasDR && (
                      <span className="text-[8px] text-[hsl(0_65%_55%)]" title="Diminishing returns active">DR</span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-3">
              <button onClick={resetStats} className="dark-button flex items-center gap-1 px-2 py-1 text-xs">
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
          </div>

          {/* Derived Combat Stats */}
          <div className="fantasy-panel p-4">
            <h4 className="font-[var(--font-heading)] text-xs gold-text tracking-widest uppercase mb-3">
              Derived Combat Stats
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {DISPLAY_STATS.map(({ id, icon }) => {
                const def = STAT_DEFINITIONS[id];
                const val = computed[id as keyof typeof computed];
                if (val === undefined) return null;
                return (
                  <div key={id} className="inset-panel p-2.5 flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[9px] text-[hsl(45_15%_50%)] truncate">{def?.name || id}</div>
                      <div className="font-mono font-bold text-xs text-[hsl(43_85%_55%)]">
                        {formatStat(id, val as number)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* All secondary stats */}
            <details className="mt-3">
              <summary className="text-[10px] text-[hsl(43_70%_55%)] font-[var(--font-heading)] cursor-pointer tracking-wide">
                All {SECONDARY_STAT_IDS.length} Secondary Stats
              </summary>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5 mt-2">
                {SECONDARY_STAT_IDS.map(statId => {
                  const def = STAT_DEFINITIONS[statId];
                  const val = computed[statId as keyof typeof computed];
                  if (val === undefined) return null;
                  return (
                    <div key={statId} className="flex justify-between text-[10px] px-2 py-1 rounded bg-[hsl(225_25%_10%)]">
                      <span className="text-[hsl(45_15%_55%)]">{def?.name || statId}</span>
                      <span className="font-mono text-[hsl(45_30%_75%)]">{formatStat(statId, val as number)}</span>
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
