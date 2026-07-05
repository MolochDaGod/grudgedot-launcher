import { useState, useMemo, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Clock, Crosshair, Droplet, GitBranch, Swords } from "lucide-react";
import MmReferencePanel from "./MmReferencePanel";
import CombatTargetingPanel from "./CombatTargetingPanel";
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
  SWORD: "⚔️", TWO_H_SWORD: "🗡️", AXE: "🪓", TWO_H_AXE: "🪓",
  BOW: "🏹", CROSSBOW: "🏹", GUN: "🔫",
  STAFF: "🪄", WAND: "✨", TOME: "📖",
  DAGGER: "🗡️", MACE: "🔨", HAMMER: "⚒️",
  SPEAR: "🔱", LANCE: "🏹", SCYTHE: "💀",
  SHIELD: "🛡️", OFF_HAND_RELIC: "🔮",
};

/** Slot-to-hotkey mapping: slot N = hotkey N. Slot 1 is the standard-attack pick. */
const SLOT_LABELS: Record<number, { name: string; hotkey: string; color: string; hint?: string }> = {
  1: { name: "Standard", hotkey: "1", color: "hsl(0 0% 70%)",    hint: "Pick one of two auto-attacks" },
  2: { name: "Basic",    hotkey: "2", color: "hsl(200 70% 60%)" },
  3: { name: "Power",    hotkey: "3", color: "hsl(220 80% 60%)" },
  4: { name: "Utility",  hotkey: "4", color: "hsl(280 70% 60%)" },
  5: { name: "Ultimate", hotkey: "5", color: "hsl(35 100% 55%)" },
};

type WeaponSkillsView = "trees" | "mm" | "targeting";

function ViewTabs({ view, setView }: { view: WeaponSkillsView; setView: (v: WeaponSkillsView) => void }) {
  const tabs: { id: WeaponSkillsView; label: string; icon: typeof GitBranch }[] = [
    { id: "mm", label: "MM Reference", icon: GitBranch },
    { id: "targeting", label: "Soft & Focus", icon: Crosshair },
    { id: "trees", label: "Skill Trees (hotkeys 1–5)", icon: Swords },
  ];
  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setView(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-[var(--font-heading)] tracking-wide rounded ${
            view === tab.id ? "gilded-button" : "dark-button"
          }`}
        >
          <tab.icon className="h-3.5 w-3.5" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function initialView(): WeaponSkillsView {
  const tab = new URLSearchParams(window.location.search).get("tab");
  if (tab === "targeting") return "targeting";
  if (tab === "trees") return "trees";
  return "mm";
}

export default function WeaponSkillsPage() {
  const [view, setView] = useState<WeaponSkillsView>(initialView);
  const [selectedWeapon, setSelectedWeapon] = useState<string>("SWORD");
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  useEffect(() => {
    const tab = view === "mm" ? "" : view;
    const url = new URL(window.location.href);
    if (tab) url.searchParams.set("tab", tab);
    else url.searchParams.delete("tab");
    window.history.replaceState({}, "", url.pathname + url.search);
  }, [view]);

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
    const grouped: Record<number, WeaponSkill[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const skill of tree.skills) {
      grouped[skill.slot]?.push(skill);
    }
    return grouped;
  }, [tree]);

  if (view === "mm") {
    return (
      <div className="p-4 space-y-4">
        <ViewTabs view={view} setView={setView} />
        <MmReferencePanel />
      </div>
    );
  }

  if (view === "targeting") {
    return (
      <div className="p-4 space-y-4">
        <ViewTabs view={view} setView={setView} />
        <CombatTargetingPanel />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <ViewTabs view={view} setView={setView} />

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
            {tree.skills.length} skills · 5 hotkeys
          </div>
        </div>
      )}

      {/* Skills by Slot */}
      <ScrollArea className="h-[calc(100vh-260px)]">
        <div className="space-y-4">
          {([1, 2, 3, 4, 5] as const).map(slot => {
            const skills = skillsBySlot[slot] || [];
            const slotMeta = SLOT_LABELS[slot];
            if (skills.length === 0) return null;
            return (
              <div key={slot} className="fantasy-panel p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: slotMeta.color }} />
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                    style={{ borderColor: `${slotMeta.color}60`, color: slotMeta.color, backgroundColor: `${slotMeta.color}14` }}
                    title={`Hotkey ${slotMeta.hotkey}`}
                  >
                    [{slotMeta.hotkey}]
                  </span>
                  <h4 className="font-[var(--font-heading)] text-xs tracking-widest uppercase" style={{ color: slotMeta.color }}>
                    {slotMeta.name}
                  </h4>
                  {slotMeta.hint && (
                    <span className="text-[10px] italic text-[hsl(45_15%_55%)]">{slotMeta.hint}</span>
                  )}
                  <span className="text-[10px] text-[hsl(45_15%_50%)] ml-auto">
                    {skills.length} skill{skills.length === 1 ? "" : "s"} · Max {slot === 5 ? 3 : 5} upgrades
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
