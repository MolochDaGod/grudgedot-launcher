import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RotateCcw, Lock, Star, Clock, Droplet, Flame, ChevronDown, ChevronUp, Swords, Shield } from "lucide-react";
import {
  CLASS_SKILL_TREES, CLASS_IDS,
  type ClassSkillChoice,
} from "../../../../shared/wcs/definitions/classSkillTrees";
import {
  ATTRIBUTES, ATTRIBUTE_IDS,
} from "../../../../shared/wcs/attributeSystem";
import {
  CLASS_ALLOWED_WEAPONS, CLASS_ALLOWED_ARMOR,
} from "../../../../shared/wcs/classWeaponRestrictions";
import { type ClassId } from "../../../../shared/wcs/gameConstants";

const CLASS_META: Record<string, { icon: string; label: string; desc: string; playstyle: string }> = {
  warrior: { icon: "⚔️", label: "Warrior", desc: "Masters of melee combat who excel at absorbing damage and protecting allies. Warriors use heavy weapons and armor to dominate the battlefield.", playstyle: "Tank / Melee DPS" },
  mage:    { icon: "🪄", label: "Mage", desc: "Wielders of arcane power who devastate enemies from range with elemental spells. Fragile but capable of massive area damage.", playstyle: "Ranged Magic DPS" },
  ranger:  { icon: "🏹", label: "Ranger", desc: "Expert marksmen who fight from distance with bows, crossbows, and nature magic. Mobile and versatile with crowd control.", playstyle: "Ranged Physical DPS" },
  worge:   { icon: "🐻", label: "Worge", desc: "Shape-shifters who transform between Bear (tank), Raptor (stealth DPS), and Bird (flight/utility) forms. Incredibly versatile.", playstyle: "Hybrid / Shape-shifter" },
};

function getWeaponClassId(cls: string): ClassId {
  return (cls === "worge" ? "worg" : cls) as ClassId;
}

/* ── Skill Node ── */
function SkillNode({
  skill, selected, locked, onSelect, treeColor,
}: {
  skill: ClassSkillChoice; selected: boolean; locked: boolean; onSelect: () => void; treeColor: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onSelect}
          disabled={locked}
          className={`group relative flex flex-col gap-1.5 p-3 text-left text-xs transition-all w-full rounded ${
            selected
              ? "fantasy-panel ring-2 shadow-lg scale-[1.02]"
              : locked
                ? "stone-panel opacity-40 cursor-not-allowed"
                : "stone-panel hover:border-[hsl(43_60%_45%)] hover:shadow-md cursor-pointer"
          }`}
          style={selected ? { borderColor: treeColor, boxShadow: `0 0 14px ${treeColor}50` } : undefined}
        >
          <div className="flex items-center gap-2">
            {skill.icon && (
              <img src={skill.icon} alt="" className="w-7 h-7 rounded" style={{ filter: locked ? "grayscale(1)" : "none" }} />
            )}
            <span className="font-[var(--font-heading)] font-semibold tracking-wide text-[13px]" style={selected ? { color: treeColor } : undefined}>
              {skill.name}
            </span>
            <Badge
              className={`text-[9px] px-1.5 py-0 ml-auto border ${
                skill.effectType === "ultimate" ? "border-[hsl(35_100%_55%)] text-[hsl(35_100%_55%)]" :
                skill.effectType === "active" ? "border-[hsl(43_85%_55%)] text-[hsl(43_85%_55%)]" :
                "border-[hsl(220_15%_50%)] text-[hsl(220_15%_60%)]"
              }`}
              variant="outline"
            >
              {skill.effectType}
            </Badge>
          </div>
          <p className="text-[hsl(45_15%_60%)] line-clamp-2 leading-relaxed">{skill.description}</p>
          <div className="flex gap-3 text-[10px] text-[hsl(45_15%_55%)] mt-0.5">
            {skill.cooldown != null && skill.cooldown > 0 && (
              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{skill.cooldown}s</span>
            )}
            {skill.manaCost != null && skill.manaCost > 0 && (
              <span className="flex items-center gap-0.5 text-blue-400"><Droplet className="h-2.5 w-2.5" />{skill.manaCost}</span>
            )}
            {skill.staminaCost != null && skill.staminaCost > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400"><Flame className="h-2.5 w-2.5" />{skill.staminaCost}</span>
            )}
          </div>
          {selected && (
            <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full animate-gem-glow" style={{ backgroundColor: treeColor, color: treeColor }} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs fantasy-panel p-3 space-y-1.5 z-50">
        <p className="font-[var(--font-heading)] font-semibold text-[hsl(43_85%_55%)]">{skill.name}</p>
        <p className="text-sm text-[hsl(45_30%_75%)] leading-relaxed">{skill.description}</p>
        <ul className="text-xs space-y-0.5 text-[hsl(45_15%_65%)]">
          {skill.effects.map((e, i) => <li key={i}>• {e}</li>)}
        </ul>
        <div className="flex gap-3 text-[10px] pt-1 border-t border-[hsl(43_20%_20%)]">
          {skill.cooldown != null && skill.cooldown > 0 && <span className="text-[hsl(45_15%_55%)]">CD: {skill.cooldown}s</span>}
          {skill.manaCost != null && skill.manaCost > 0 && <span className="text-blue-400">Mana: {skill.manaCost}</span>}
          {skill.staminaCost != null && skill.staminaCost > 0 && <span className="text-amber-400">Stamina: {skill.staminaCost}</span>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function SkillTreePage() {
  const [selectedClass, setSelectedClass] = useState<string>("warrior");
  const [tierSelections, setTierSelections] = useState<Record<string, string>>({});
  const [showClassInfo, setShowClassInfo] = useState(true);
  const characterLevel = 20;

  const tree = CLASS_SKILL_TREES[selectedClass];
  const meta = CLASS_META[selectedClass];
  const weaponClassId = getWeaponClassId(selectedClass);
  const weapons = CLASS_ALLOWED_WEAPONS[weaponClassId] || [];
  const armors = CLASS_ALLOWED_ARMOR[weaponClassId] || [];

  const selectSkill = (tierLevel: number, skillId: string) => {
    setTierSelections(prev => {
      const key = String(tierLevel);
      if (prev[key] === skillId) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: skillId };
    });
  };

  const reset = () => setTierSelections({});
  const switchClass = (cls: string) => { setSelectedClass(cls); reset(); };

  const selectedCount = Object.keys(tierSelections).length;
  const totalTiers = tree?.tiers.length || 0;

  const selectedSkills = useMemo(() => {
    if (!tree) return [];
    return tree.tiers
      .map(tier => {
        const selId = tierSelections[String(tier.level)];
        return tier.choices.find(c => c.id === selId);
      })
      .filter(Boolean) as ClassSkillChoice[];
  }, [tree, tierSelections]);

  if (!tree) return <div className="p-4 text-[hsl(45_15%_55%)]">No skill tree data.</div>;

  return (
    <div className="h-full flex flex-col">
      {/* ── Class Selector Bar ── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(43_20%_18%)] bg-[hsl(225_25%_8%)] flex-wrap">
        {CLASS_IDS.map(cls => {
          const t = CLASS_SKILL_TREES[cls];
          const m = CLASS_META[cls];
          const active = selectedClass === cls;
          return (
            <button
              key={cls}
              onClick={() => switchClass(cls)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-[var(--font-heading)] tracking-wide transition-all rounded-lg ${
                active ? "gilded-button shadow-lg" : "dark-button hover:bg-[hsl(225_20%_16%)]"
              }`}
            >
              <span className="text-lg">{m?.icon}</span>
              <span>{t.className}</span>
            </button>
          );
        })}
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[hsl(225_20%_12%)] border border-[hsl(43_30%_22%)]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tree.color }} />
            <span className="text-xs font-[var(--font-heading)] tracking-wide" style={{ color: tree.color }}>
              {selectedCount}/{totalTiers}
            </span>
            <span className="text-[10px] text-[hsl(45_15%_45%)]">tiers</span>
          </div>
          <button onClick={reset} className="dark-button flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg hover:bg-[hsl(0_60%_20%)] hover:border-[hsl(0_60%_35%)] transition-colors">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 max-w-5xl mx-auto">

          {/* ── Class Overview (collapsible) ── */}
          <div className="ornate-frame">
            <button
              onClick={() => setShowClassInfo(!showClassInfo)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <span className="text-3xl">{meta?.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-[var(--font-heading)] text-lg gold-text tracking-wide">
                    {tree.className}
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[hsl(43_50%_30%)] text-[hsl(43_70%_55%)]">
                    {meta?.playstyle}
                  </span>
                </div>
                <p className="text-xs text-[hsl(45_15%_60%)] mt-0.5 line-clamp-1">{meta?.desc}</p>
              </div>
              <div className="w-5 h-5 rounded-full animate-gem-glow shrink-0" style={{ backgroundColor: tree.color, color: tree.color }} />
              {showClassInfo ? <ChevronUp className="h-4 w-4 text-[hsl(45_15%_45%)] shrink-0" /> : <ChevronDown className="h-4 w-4 text-[hsl(45_15%_45%)] shrink-0" />}
            </button>

            {showClassInfo && (
              <div className="px-4 pb-4 space-y-3 border-t border-[hsl(43_20%_18%)] pt-3">
                <p className="text-xs text-[hsl(45_30%_75%)] leading-relaxed">{meta?.desc}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="inset-panel p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Swords className="h-3.5 w-3.5 text-[hsl(43_70%_55%)]" />
                      <span className="text-[10px] font-[var(--font-heading)] text-[hsl(43_70%_55%)] tracking-widest uppercase">Weapons</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {weapons.map(w => (
                        <span key={w} className="text-[10px] px-2 py-0.5 rounded-full border border-[hsl(220_15%_30%)] text-[hsl(45_20%_65%)] bg-[hsl(225_20%_12%)] capitalize">
                          {w.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="inset-panel p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Shield className="h-3.5 w-3.5 text-[hsl(43_70%_55%)]" />
                      <span className="text-[10px] font-[var(--font-heading)] text-[hsl(43_70%_55%)] tracking-widest uppercase">Armor</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {armors.map(a => (
                        <span key={a} className="text-[10px] px-2 py-0.5 rounded-full border border-[hsl(220_15%_30%)] text-[hsl(45_20%_65%)] bg-[hsl(225_20%_12%)] capitalize">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Core Attributes */}
                <div>
                  <span className="text-[10px] font-[var(--font-heading)] text-[hsl(43_70%_55%)] tracking-widest uppercase">Core Attributes</span>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-1.5 mt-2">
                    {ATTRIBUTE_IDS.map(attrId => {
                      const attr = ATTRIBUTES[attrId];
                      return (
                        <Tooltip key={attrId}>
                          <TooltipTrigger asChild>
                            <div className="inset-panel p-2 text-center cursor-help hover:border-[hsl(43_40%_35%)] transition-colors">
                              <div className="font-[var(--font-heading)] text-xs font-bold" style={{ color: attr.color }}>
                                {attr.abbrev}
                              </div>
                              <div className="text-[9px] text-[hsl(45_15%_50%)]">{attr.name}</div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="fantasy-panel p-2 max-w-[200px] z-50">
                            <p className="font-[var(--font-heading)] text-xs font-bold mb-0.5" style={{ color: attr.color }}>{attr.name}</p>
                            <p className="text-[10px] text-[hsl(45_15%_60%)]">{attr.role}</p>
                            <p className="text-[9px] text-[hsl(45_15%_45%)] mt-0.5">{attr.effects.length} stat effects</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Special Ability ── */}
          <div className="ornate-frame p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5" style={{ color: tree.color }} />
              <h3 className="font-[var(--font-heading)] text-sm gold-text tracking-wide">
                Special Ability — {tree.specialAbility.name}
              </h3>
              <Badge className="ml-auto text-[9px] border-[hsl(35_100%_55%)] text-[hsl(35_100%_55%)]" variant="outline">
                {tree.specialAbility.effectType}
              </Badge>
            </div>
            <p className="text-xs text-[hsl(45_30%_75%)] mb-2 leading-relaxed">{tree.specialAbility.description}</p>
            <div className="flex gap-1.5 flex-wrap mb-1">
              {tree.specialAbility.effects.map((e, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_65%)] bg-[hsl(225_25%_12%)]">
                  {e}
                </span>
              ))}
            </div>
            <div className="flex gap-3 text-[10px] text-[hsl(45_15%_55%)]">
              {tree.specialAbility.cooldown != null && tree.specialAbility.cooldown > 0 && <span>CD: {tree.specialAbility.cooldown}s</span>}
              {tree.specialAbility.manaCost != null && tree.specialAbility.manaCost > 0 && <span className="text-blue-400">Mana: {tree.specialAbility.manaCost}</span>}
              {tree.specialAbility.staminaCost != null && tree.specialAbility.staminaCost > 0 && <span className="text-amber-400">Stamina: {tree.specialAbility.staminaCost}</span>}
            </div>
          </div>

          {/* ── Skill Tiers ── */}
          {tree.tiers.map((tier, idx) => {
            const isLocked = tier.level > characterLevel;
            const selectedId = tierSelections[String(tier.level)];
            return (
              <div key={tier.level} className={`fantasy-panel p-4 transition-opacity ${isLocked ? "opacity-40" : ""}`}>
                <div className="flex items-center gap-2 mb-3">
                  {isLocked
                    ? <Lock className="h-4 w-4 text-[hsl(45_15%_40%)]" />
                    : (
                      <div className="flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: `${tree.color}25`, color: tree.color, border: `1.5px solid ${tree.color}60` }}>
                        {idx + 1}
                      </div>
                    )
                  }
                  <h4 className="font-[var(--font-heading)] text-sm tracking-wide" style={{ color: isLocked ? undefined : tree.color }}>
                    Lv {tier.level} — {tier.tierName}
                  </h4>
                  <span className="text-[10px] font-[var(--font-body)] text-[hsl(45_15%_55%)] ml-auto hidden sm:inline">{tier.description}</span>
                  {selectedId && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[hsl(43_40%_12%)] text-[hsl(43_85%_55%)] border border-[hsl(43_50%_30%)] animate-pulse">
                      ✓ Selected
                    </span>
                  )}
                </div>
                <div className={`grid gap-3 ${
                  tier.choices.length === 1 ? "grid-cols-1 max-w-md" :
                  tier.choices.length === 2 ? "grid-cols-1 sm:grid-cols-2" :
                  "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                }`}>
                  {tier.choices.map(skill => (
                    <SkillNode
                      key={skill.id}
                      skill={skill}
                      selected={selectedId === skill.id}
                      locked={isLocked}
                      onSelect={() => selectSkill(tier.level, skill.id)}
                      treeColor={tree.color}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {/* ── Build Summary ── */}
          {selectedSkills.length > 0 && (
            <div className="parchment-panel p-4 sticky bottom-0">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-[var(--font-heading)] text-sm gold-text tracking-wide">
                  Build Summary
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: `${tree.color}20`, color: tree.color, border: `1px solid ${tree.color}40` }}>
                  {selectedSkills.length} / {totalTiers} skills
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {selectedSkills.map(s => (
                  <span
                    key={s.id}
                    className="text-[10px] px-2.5 py-1 rounded-full font-[var(--font-heading)] tracking-wide"
                    style={{ backgroundColor: `${tree.color}20`, color: tree.color, border: `1px solid ${tree.color}50` }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
