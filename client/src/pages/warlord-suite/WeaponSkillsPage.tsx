import { useState, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, Clock, Droplet } from "lucide-react";
import {
  WEAPON_SKILL_TREES,
  getSkillsForSlot,
  calculateSkillDamage,
  calculateSkillCooldown,
  getUpgradeEffect,
  type WeaponSkill,
} from "../../../../shared/wcs/definitions/weaponSkills";
import {
  CLASS_ALLOWED_WEAPONS,
} from "../../../../shared/wcs/classWeaponRestrictions";
import { CLASS_IDS } from "../../../../shared/wcs/gameConstants";

const WEAPON_ICONS: Record<string, string> = {
  SWORD: "⚔️", AXE: "🪓", BOW: "🏹", STAFF: "🪄", DAGGER: "🗡️",
  MACE: "🔨", HAMMER: "⚒️", SPEAR: "🔱", WAND: "✨", SCYTHE: "💀",
};

const SLOT_LABELS: Record<number, { name: string; color: string }> = {
  1: { name: "Basic", color: "hsl(0 0% 70%)" },
  2: { name: "Power", color: "hsl(220 80% 60%)" },
  3: { name: "Utility", color: "hsl(280 70% 60%)" },
  4: { name: "Ultimate", color: "hsl(35 100% 55%)" },
};

export default function WeaponSkillsPage() {
  const [selectedWeapon, setSelectedWeapon] = useState<string>("SWORD");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const weaponTypes = Object.keys(WEAPON_SKILL_TREES);
  const tree = WEAPON_SKILL_TREES[selectedWeapon];

  // Which classes can use this weapon
  const usableBy = useMemo(() => {
    const lowerKey = selectedWeapon.toLowerCase();
    return CLASS_IDS.filter(cls => {
      const allowed = CLASS_ALLOWED_WEAPONS[cls];
      return allowed?.some(w => w === lowerKey || w === `2h_${lowerKey}` || lowerKey === w.replace('2h_', ''));
    });
  }, [selectedWeapon]);

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
        <div className="ornate-frame p-3 flex items-center gap-3">
          <span className="text-2xl">{WEAPON_ICONS[selectedWeapon] || "⚔️"}</span>
          <div>
            <h3 className="font-[var(--font-heading)] text-sm gold-text tracking-wide">{selectedWeapon} Skills</h3>
            <div className="flex gap-1 mt-1">
              <span className="text-[10px] text-[hsl(45_15%_55%)]">Used by:</span>
              {usableBy.map(cls => (
                <span key={cls} className="text-[9px] px-1.5 py-0.5 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_55%)] capitalize">
                  {cls}
                </span>
              ))}
            </div>
          </div>
          <div className="ml-auto text-[10px] text-[hsl(45_15%_55%)]">
            {tree.skills.length} skills · 4 slots
          </div>
        </div>
      )}

      {/* Skills by Slot */}
      <ScrollArea className="h-[calc(100vh-260px)]">
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
    </div>
  );
}
