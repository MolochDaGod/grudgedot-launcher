import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Clock, Droplet, Zap, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  WEAPON_SKILL_TREES,
  MASTERY_LEVELS,
  getClassBonusesForWeapon,
  calculateSkillDamage,
  calculateSkillCooldown,
  getUpgradeEffect,
  type WeaponSkill,
} from "../../../../shared/wcs/definitions/weaponSkills";

const WEAPON_ICONS: Record<string, string> = {
  SWORD: '⚔️', AXE: '🪳', BOW: '🏹', STAFF: '🪴', DAGGER: '🗡️',
  MACE: '🔨', HAMMER: '⚒️', SPEAR: '🔱', WAND: '✨', SCYTHE: '💀',
  CROSSBOW: '🏹', GUN: '💥', TOME: '📚', SHIELD: '🛡️', RELIC: '💎', CAPE: '🩹',
};

// Mastery tier color by level bracket
function masteryColor(level: number): string {
  if (level <= 5)  return 'hsl(0 0% 65%)';
  if (level <= 10) return 'hsl(220 80% 65%)';
  if (level <= 15) return 'hsl(280 70% 65%)';
  return 'hsl(35 100% 60%)';
}

const CLASS_COLORS: Record<string, string> = {
  warrior: '#d97706',
  mage:    '#7c3aed',
  ranger:  '#16a34a',
  worge:   '#0891b2',
};

const SLOT_LABELS: Record<number, { name: string; color: string }> = {
  1: { name: "Basic", color: "hsl(0 0% 70%)" },
  2: { name: "Power", color: "hsl(220 80% 60%)" },
  3: { name: "Utility", color: "hsl(280 70% 60%)" },
  4: { name: "Ultimate", color: "hsl(35 100% 55%)" },
};

export default function WeaponSkillsPage() {
  const [selectedWeapon, setSelectedWeapon] = useState<string>('SWORD');
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mastery' | 'skills'>('mastery');

  const weaponTypes = Object.keys(WEAPON_SKILL_TREES);
  const tree = WEAPON_SKILL_TREES[selectedWeapon];

  // Class bonuses (head-start) for this weapon
  const classBonuses = useMemo(() => getClassBonusesForWeapon(selectedWeapon), [selectedWeapon]);

  const skillsBySlot = useMemo(() => {
    if (!tree) return {};
    const grouped: Record<number, WeaponSkill[]> = { 1: [], 2: [], 3: [], 4: [] };
    for (const skill of tree.skills) {
      grouped[skill.slot]?.push(skill);
    }
    return grouped;
  }, [tree]);

  return (
    <div className="p-4 space-y-4">
      {/* Weapon Type Selector */}
      <div className="flex gap-2 flex-wrap">
        {weaponTypes.map(wt => (
          <button
            key={wt}
            onClick={() => { setSelectedWeapon(wt); setExpandedSkill(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-[var(--font-heading)] tracking-wide rounded transition-all ${
              selectedWeapon === wt ? "gilded-button" : "dark-button"
            }`}
          >
            <span className="text-base">{WEAPON_ICONS[wt] || "⚔️"}</span>
            {wt}
          </button>
        ))}
      </div>

      {/* Weapon Info Header */}
      {tree && (
        <div className="ornate-frame p-3">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{WEAPON_ICONS[selectedWeapon] || '⚔️'}</span>
            <div className="flex-1">
              <h3 className="font-[var(--font-heading)] text-sm gold-text tracking-wide">{selectedWeapon} Mastery</h3>
              <p className="text-[10px] text-[hsl(45_15%_50%)] mt-0.5">
                All classes can equip — mastery unlocks through use (max level +70% dmg, +35% spd, +25% crit)
              </p>
            </div>
            <div className="text-[10px] text-[hsl(45_15%_55%)] text-right">
              20 levels · {tree.skills.length} skills
            </div>
          </div>
          {/* Class bonuses row */}
          {classBonuses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-[hsl(45_15%_50%)]">Class bonus:</span>
              {classBonuses.map(({ cls, headstart }) => (
                <span key={cls}
                  className="text-[9px] px-1.5 py-0.5 rounded capitalize font-semibold"
                  style={{ background: CLASS_COLORS[cls] + '22', color: CLASS_COLORS[cls], border: `1px solid ${CLASS_COLORS[cls]}44` }}>
                  {cls} starts at Lv{headstart}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab toggle: Mastery / Skills */}
      <div className="flex gap-1">
        <button onClick={() => setActiveTab('mastery')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-[var(--font-heading)] tracking-wide rounded transition-all ${
            activeTab === 'mastery' ? 'gilded-button' : 'dark-button'
          }`}>
          <TrendingUp className="h-3 w-3" /> Mastery Progression
        </button>
        <button onClick={() => setActiveTab('skills')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-[var(--font-heading)] tracking-wide rounded transition-all ${
            activeTab === 'skills' ? 'gilded-button' : 'dark-button'
          }`}>
          <Zap className="h-3 w-3" /> Weapon Skills
        </button>
      </div>

      {/* ── Mastery Ladder ── */}
      {activeTab === 'mastery' && (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-1.5">
            {MASTERY_LEVELS.map((ml) => {
              const color = masteryColor(ml.level);
              const tierStart = [1, 6, 11, 16].includes(ml.level);
              return (
                <div key={ml.level}
                  className={`stone-panel p-2.5 flex items-center gap-2.5 ${
                    tierStart ? 'border-l-2' : ''
                  }`}
                  style={tierStart ? { borderLeftColor: color } : {}}>
                  {/* Level badge */}
                  <div className="w-7 h-7 rounded flex items-center justify-center text-[11px] font-bold shrink-0"
                    style={{ background: color + '22', color, border: `1px solid ${color}44` }}>
                    {ml.level}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-[var(--font-heading)] text-[11px] tracking-wide truncate" style={{ color }}>
                      {ml.label}
                    </div>
                    <div className="flex gap-2 mt-0.5 text-[10px]">
                      <span className="text-red-400">+{ml.damagePct}% dmg</span>
                      <span className="text-blue-400">+{ml.attackSpeedPct}% spd</span>
                      <span className="text-yellow-400">+{ml.critPct}% crit</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 stone-panel p-3 text-[10px] text-[hsl(45_15%_50%)] space-y-1">
            <p>At <span className="gold-text">Grandmaster (Lv20)</span>: +70% damage · +35% attack speed · +25% crit chance</p>
            <p>XP earned from hitting enemies with this weapon type. Class head-start applies on first login.</p>
          </div>
        </ScrollArea>
      )}

      {/* ── Skills by Slot ── */}
      {activeTab === 'skills' && (
      <ScrollArea className="h-[calc(100vh-300px)]">
        <div className="space-y-4">
          {([1, 2, 3, 4] as const).map(slot => {
            const skills = skillsBySlot[slot] || [];
            const slotMeta = SLOT_LABELS[slot];
            if (skills.length === 0) return null;
            return (
              <div key={slot} className="fantasy-panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slotMeta.color }} />
                  <h4 className="font-[var(--font-heading)] text-xs tracking-widest uppercase" style={{ color: slotMeta.color }}>
                    Slot {slot} — {slotMeta.name}
                  </h4>
                  <span className="text-[10px] text-[hsl(45_15%_50%)] ml-auto">
                    {skills.length} skills · Max {slot === 4 ? 3 : 5} upgrades
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {skills.map(skill => {
                    const isExpanded = expandedSkill === skill.id;
                    return (
                      <div
                        key={skill.id}
                        className="stone-panel p-3 cursor-pointer transition-all hover:border-[hsl(43_60%_40%)]"
                        onClick={() => setExpandedSkill(isExpanded ? null : skill.id)}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          {skill.icon && (
                            <img src={skill.icon} alt="" className="w-6 h-6 rounded" />
                          )}
                          <span className="font-[var(--font-heading)] text-xs tracking-wide text-[hsl(45_30%_85%)] flex-1">
                            {skill.name}
                          </span>
                          <ChevronRight className={`h-3.5 w-3.5 text-[hsl(45_15%_40%)] transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                        </div>
                        <p className="text-[10px] text-[hsl(45_15%_55%)] mb-1.5">{skill.description}</p>

                        {/* Base stats row */}
                        <div className="flex gap-3 text-[10px]">
                          <span className="text-[hsl(0_65%_55%)]">⚔ {skill.baseDamage} dmg</span>
                          <span className="flex items-center gap-0.5 text-[hsl(45_15%_55%)]">
                            <Clock className="h-2.5 w-2.5" />{skill.cooldown}s
                          </span>
                          <span className="flex items-center gap-0.5 text-blue-400">
                            <Droplet className="h-2.5 w-2.5" />{skill.manaCost}
                          </span>
                        </div>

                        {/* Effects */}
                        <div className="flex gap-1 flex-wrap mt-1.5">
                          {skill.effects.map((e, i) => (
                            <span key={i} className="text-[9px] px-1 py-0 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)]">
                              {e}
                            </span>
                          ))}
                        </div>

                        {/* Expanded: Upgrade Path */}
                        {isExpanded && (
                          <div className="mt-3 pt-2 border-t border-[hsl(220_15%_25%)] space-y-1.5">
                            <span className="text-[10px] font-[var(--font-heading)] text-[hsl(43_70%_55%)] tracking-wide">
                              Upgrade Path
                            </span>
                            {skill.upgradeEffects.map((effect, lvl) => {
                              const dmg = calculateSkillDamage(skill, lvl + 1);
                              const cd = calculateSkillCooldown(skill, lvl + 1);
                              return (
                                <div key={lvl} className="flex items-start gap-2 text-[10px]">
                                  <span className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-[9px] font-mono"
                                    style={{
                                      backgroundColor: `${slotMeta.color}20`,
                                      color: slotMeta.color,
                                      border: `1px solid ${slotMeta.color}40`,
                                    }}
                                  >
                                    {lvl + 1}
                                  </span>
                                  <div className="flex-1">
                                    <span className="text-[hsl(45_30%_75%)]">{effect}</span>
                                    <span className="text-[hsl(45_15%_45%)] ml-2">
                                      ({dmg} dmg, {cd.toFixed(1)}s cd)
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      )}
    </div>
  );
}
