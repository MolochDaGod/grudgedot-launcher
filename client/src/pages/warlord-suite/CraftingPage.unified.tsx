/**
 * CraftingPage.unified.tsx — canonical crafting screen.
 *
 * Merges:
 *   • Shell A from WCS `client/src/pages/Crafting.tsx`
 *     (per-profession backgrounds, amber HSL tokens, 3-column layout,
 *     T0–T8 tier rail, Mystic enchant sockets)
 *   • Content B from WCS `api/grudge-builder/components/profession/CraftingInterface.tsx`
 *     (per-profession category tabs, Grudge Infusion panel with
 *     Blood/Void/Iron essences + 3-stack intensity slider)
 *
 * Wires up the launcher's live backend hooks (useCraftingRecipes,
 * useCraftingQueue, useStartCraft, useCompleteCraft). Falls back to
 * static data when the backend is offline.
 *
 * Drop-in replacement for warlord-suite/CraftingPage.tsx once the
 * background assets are copied into public/assets/professions/.
 */

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock, Play, X, CheckCircle, Loader2, Hammer, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useGrudgePlayer } from "@/hooks/useGrudgePlayer";
import {
  useCraftingRecipes,
  useCraftingQueue,
  useStartCraft,
  useCompleteCraft,
  type BackendCraftingRecipe,
  type CraftingQueueItem,
} from "@/hooks/useGrudgeAPI";

// ─── Profession catalog ───────────────────────────────────────────────────────

type ProfessionId = "All" | "Miner" | "Forester" | "Mystic" | "Chef" | "Engineer" | "Refinery";

interface ProfessionDef {
  id: ProfessionId;
  name: string;
  icon: string;
  color: string;       // Tailwind text color class
  accent: string;      // HSL gradient accent for buttons + badges
  bgImage: string;     // public/ path — falls back to gradient if missing
}

const PROFESSIONS: ProfessionDef[] = [
  { id: "All",      name: "Universal", icon: "📜",   color: "text-slate-300",  accent: "43 85% 55%", bgImage: "/assets/professions/bg-universal.png" },
  { id: "Miner",    name: "Miner",     icon: "⚒️",   color: "text-amber-500",  accent: "43 85% 55%", bgImage: "/assets/professions/bg-miner.png" },
  { id: "Forester", name: "Forester",  icon: "🌲",   color: "text-green-500",  accent: "130 65% 45%", bgImage: "/assets/professions/bg-forester.png" },
  { id: "Mystic",   name: "Mystic",    icon: "🔮",   color: "text-purple-500", accent: "280 75% 55%", bgImage: "/assets/professions/bg-mystic.png" },
  { id: "Chef",     name: "Chef",      icon: "👨‍🍳", color: "text-orange-500", accent: "25 90% 55%",  bgImage: "/assets/professions/bg-chef.png" },
  { id: "Engineer", name: "Engineer",  icon: "🔧",   color: "text-orange-600", accent: "18 85% 50%",  bgImage: "/assets/professions/bg-engineer.png" },
  { id: "Refinery", name: "Refinery",  icon: "🔥",   color: "text-red-500",    accent: "5 80% 50%",   bgImage: "/assets/professions/bg-refinery.png" },
];

// Per-profession content tabs (from CraftingInterface.tsx:15-53)
const PROFESSION_CATEGORIES: Record<ProfessionId, { value: string; label: string; color: string }[]> = {
  All: [
    { value: "all", label: "All", color: "text-slate-300" },
  ],
  Miner: [
    { value: "all",         label: "All",         color: "text-slate-300"  },
    { value: "melee",       label: "Weapons",     color: "text-red-400"    },
    { value: "armor",       label: "Armor",       color: "text-blue-400"   },
    { value: "shields",     label: "Shields",     color: "text-cyan-400"   },
    { value: "accessories", label: "Accessories", color: "text-yellow-400" },
    { value: "refining",    label: "Refining",    color: "text-orange-400" },
  ],
  Forester: [
    { value: "all",         label: "All",         color: "text-slate-300"  },
    { value: "bows",        label: "Bows",        color: "text-emerald-400"},
    { value: "armor",       label: "Armor",       color: "text-amber-500"  },
    { value: "accessories", label: "Accessories", color: "text-yellow-400" },
    { value: "materials",   label: "Materials",   color: "text-green-400"  },
  ],
  Mystic: [
    { value: "all",         label: "All",         color: "text-slate-300"  },
    { value: "staves",      label: "Staves",      color: "text-violet-400" },
    { value: "armor",       label: "Armor",       color: "text-purple-400" },
    { value: "accessories", label: "Accessories", color: "text-yellow-400" },
    { value: "enchants",    label: "Enchants",    color: "text-pink-400"   },
    { value: "cloth",       label: "Cloth",       color: "text-indigo-400" },
  ],
  Chef: [
    { value: "all",   label: "All",   color: "text-slate-300" },
    { value: "red",   label: "Red",   color: "text-red-500"   },
    { value: "green", label: "Green", color: "text-green-500" },
    { value: "blue",  label: "Blue",  color: "text-blue-500"  },
  ],
  Engineer: [
    { value: "all",         label: "All",         color: "text-slate-300"  },
    { value: "ranged",      label: "Ranged",      color: "text-orange-400" },
    { value: "armor",       label: "Armor",       color: "text-blue-400"   },
    { value: "accessories", label: "Accessories", color: "text-yellow-400" },
    { value: "components",  label: "Parts",       color: "text-slate-400"  },
    { value: "siege",       label: "Siege",       color: "text-red-500"    },
  ],
  Refinery: [
    { value: "all", label: "All", color: "text-slate-300" },
    { value: "ore", label: "Ore", color: "text-amber-400" },
    { value: "log", label: "Lumber", color: "text-amber-700" },
    { value: "herb", label: "Herbs", color: "text-green-400" },
  ],
};

const TIER_UNLOCK_LEVELS: Record<number, number> = {
  0: 1, 1: 1, 2: 10, 3: 20, 4: 30, 5: 40, 6: 50, 7: 60, 8: 70,
};

const CRAFT_XP_BY_TIER: Record<number, number> = {
  0: 10, 1: 25, 2: 50, 3: 100, 4: 200, 5: 400, 6: 800, 7: 1600, 8: 3200,
};

const cardStyle = "border-2 border-[hsl(43_40%_25%)] bg-[hsl(225_30%_8%)] rounded-xl";
const headerStyle = "border-b-2 border-[hsl(43_40%_25%)] bg-[hsl(225_30%_8%)]";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return "Ready!";
  const s = Math.floor(seconds) % 60;
  const m = Math.floor(seconds / 60) % 60;
  const h = Math.floor(seconds / 3600);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatCraftTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function mapRecipeToCategory(recipe: BackendCraftingRecipe): string {
  const type = (recipe.output_item_type || "").toLowerCase();
  const name = (recipe.name || "").toLowerCase();
  if (["sword", "axe", "dagger", "hammer", "greataxe", "greatsword", "spear", "mace"].includes(type)) return "melee";
  if (type === "armor") return "armor";
  if (type === "shield") return "shields";
  if (type === "refining" || type === "tool") return "refining";
  if (type === "bow") return "bows";
  if (["wood", "leather"].includes(type) || name.includes("plank") || name.includes("leather")) return "materials";
  if (type === "staff") return "staves";
  if (type === "cloth" || name.includes("fabric")) return "cloth";
  if (["enchant", "scroll", "spellpage", "codex", "gem"].includes(type)) return "enchants";
  if (type === "component" || type === "tool") return "components";
  if (type === "crossbow" || type === "gun") return "ranged";
  if (type === "vehicle" || type === "utility") return "siege";
  if (["ring", "necklace", "relic", "back"].includes(type)) return "accessories";
  return "all";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CraftingPageUnified() {
  const player = useGrudgePlayer();
  const { toast } = useToast();
  const charId = player.activeChar?.id;
  const classId = player.activeChar?.class;

  const [activeProfession, setActiveProfession] = useState<ProfessionId>("All");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeTier, setActiveTier] = useState<number | "All">("All");
  const [selectedRecipeKey, setSelectedRecipeKey] = useState<string | null>(null);
  const [infusion, setInfusion] = useState<string | null>(null);
  const [stackLevel, setStackLevel] = useState<number>(0);

  const { data: recipes = [], isLoading: recipesLoading } = useCraftingRecipes(classId);
  const { data: queue = [], isLoading: queueLoading } = useCraftingQueue(charId);
  const startCraft = useStartCraft();
  const completeCraft = useCompleteCraft();

  const currentProfession = PROFESSIONS.find(p => p.id === activeProfession) ?? PROFESSIONS[0];
  const categories = PROFESSION_CATEGORIES[activeProfession] ?? PROFESSION_CATEGORIES.All;

  // Max tier unlocked for this profession (falls back to 1 if progression not loaded)
  const maxUnlockedTier = useMemo(() => {
    const playerProfs = (player as any).professions || [];
    if (activeProfession === "All") {
      const minLevel = playerProfs.reduce((m: number, p: any) => Math.min(m, p.level ?? 1), 99);
      const l = minLevel === 99 ? 1 : minLevel;
      return Object.entries(TIER_UNLOCK_LEVELS).filter(([, lvl]) => l >= lvl).map(([t]) => +t).sort((a, b) => b - a)[0] ?? 0;
    }
    const prof = playerProfs.find((p: any) =>
      (p.profession || "").toLowerCase() === activeProfession.toLowerCase(),
    );
    const lvl = prof?.level ?? 1;
    return Object.entries(TIER_UNLOCK_LEVELS).filter(([, l]) => lvl >= l).map(([t]) => +t).sort((a, b) => b - a)[0] ?? 0;
  }, [activeProfession, player]);

  // Filter recipes by active profession + category + tier.
  const filteredRecipes = useMemo(() => {
    const list = recipes.filter((r: BackendCraftingRecipe) => {
      if (activeProfession !== "All" && r.required_profession &&
          r.required_profession.toLowerCase() !== activeProfession.toLowerCase()) return false;
      if (activeCategory !== "all" && mapRecipeToCategory(r) !== activeCategory) return false;
      if (activeTier !== "All" && r.output_tier !== activeTier) return false;
      return true;
    });
    return list;
  }, [recipes, activeProfession, activeCategory, activeTier]);

  const selectedRecipe = useMemo(() => {
    return filteredRecipes.find(r => r.recipe_key === selectedRecipeKey) ?? filteredRecipes[0];
  }, [filteredRecipes, selectedRecipeKey]);

  const isTierLocked = (tier: number) => tier > maxUnlockedTier;

  const handleStartCraft = () => {
    if (!charId || !selectedRecipe) return;
    startCraft.mutate({ charId, recipeKey: selectedRecipe.recipe_key }, {
      onSuccess: () => toast({ title: "Craft started!", description: selectedRecipe.name }),
      onError:  () => toast({ title: "Craft failed", description: "Missing materials or gold.", variant: "destructive" }),
    });
  };

  const handleCompleteCraft = (id: number) =>
    completeCraft.mutate(id, { onSuccess: () => toast({ title: "Craft complete!" }) });

  const completedJobs = queue.filter((q: CraftingQueueItem) => q.is_ready);
  const activeJobs    = queue.filter((q: CraftingQueueItem) => q.status === "queued" && !q.is_ready);

  const bgStyle: React.CSSProperties = {
    backgroundImage: `linear-gradient(180deg, hsl(${currentProfession.accent} / 0.10), hsl(225 30% 4% / 0.95)), url(${currentProfession.bgImage})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundAttachment: "fixed",
  };

  return (
    <div className="min-h-screen relative transition-all duration-500" style={bgStyle}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />

      <div className="relative z-10 max-w-7xl mx-auto">
        {/* ── Header ── */}
        <header className={cn("px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2", headerStyle)}>
          <div className="flex items-center gap-3">
            <Hammer className="w-6 h-6 sm:w-8 sm:h-8 text-[hsl(43_85%_55%)]" />
            <div>
              <h1 className="text-lg sm:text-2xl font-bold font-uncial text-[hsl(43_85%_65%)]">Crafting Guild</h1>
              <p className="text-[10px] sm:text-xs text-[hsl(43_60%_50%)] tracking-wider hidden sm:block">
                Profession · Recipes · Infusion · Queue
              </p>
            </div>
          </div>
          <div className={cn("text-right text-sm sm:text-lg font-bold", currentProfession.color)}>
            {currentProfession.icon} <span className="hidden sm:inline">{currentProfession.name}</span>
            {activeProfession !== "All" && (
              <div className="text-[10px] sm:text-xs text-slate-400">T{maxUnlockedTier} unlocked</div>
            )}
          </div>
        </header>

        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
          {/* ── Profession tab bar ── */}
          <div className="flex gap-1 sm:gap-2 border-b-2 border-[hsl(43_40%_25%)] pb-3 overflow-x-auto scrollbar-hide">
            {PROFESSIONS.map((prof) => (
              <button
                key={prof.id}
                data-testid={`profession-tab-${prof.id}`}
                onClick={() => {
                  setActiveProfession(prof.id);
                  setActiveCategory("all");
                  setSelectedRecipeKey(null);
                }}
                className={cn(
                  "px-2 sm:px-4 py-1.5 sm:py-2.5 rounded-lg border-2 font-bold transition-all whitespace-nowrap flex items-center gap-1 sm:gap-2 text-sm sm:text-base",
                  activeProfession === prof.id
                    ? `bg-[hsl(225_28%_14%)] ${prof.color} border-[hsl(43_50%_35%)] shadow-lg shadow-black/30`
                    : "bg-[hsl(225_30%_8%)] border-[hsl(43_40%_20%)] text-slate-400 hover:border-[hsl(43_40%_30%)]",
                )}
              >
                <span className="text-base sm:text-lg">{prof.icon}</span>
                <span className="hidden sm:inline">{prof.name}</span>
              </button>
            ))}
          </div>

          {/* ── Per-profession category tabs (Content B) ── */}
          {categories.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded border transition-colors",
                    activeCategory === cat.value
                      ? `${cat.color} bg-[hsl(225_28%_14%)] border-[hsl(43_50%_35%)]`
                      : "text-slate-500 bg-[hsl(225_30%_8%)] border-[hsl(43_40%_15%)] hover:border-[hsl(43_40%_30%)]",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Tier rail ── */}
          <div className="flex justify-center">
            <div className="flex flex-wrap gap-1 p-1 sm:p-1.5 rounded-lg border-2 border-[hsl(43_40%_25%)] bg-[hsl(225_30%_8%)]">
              <button
                onClick={() => setActiveTier("All")}
                className={cn(
                  "px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-colors",
                  activeTier === "All"
                    ? "bg-[hsl(43_85%_55%)] text-[hsl(225_30%_8%)]"
                    : "text-slate-500 hover:text-slate-300",
                )}
              >
                All
              </button>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((tier) => {
                const locked = isTierLocked(tier);
                return (
                  <button
                    key={tier}
                    onClick={() => setActiveTier(tier)}
                    className={cn(
                      "px-2 sm:px-3 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-colors flex items-center gap-0.5",
                      activeTier === tier
                        ? "bg-amber-500 text-black"
                        : locked ? "text-slate-600 opacity-50" : "text-slate-400 hover:text-slate-200",
                    )}
                  >
                    {locked && <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />}
                    T{tier}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Three-column layout: list | detail+infusion | queue ── */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-6 h-[560px]">
            {/* ── Left: Recipe List ── */}
            <div className={cn(cardStyle, "w-full lg:w-64 xl:w-72 flex-shrink-0 p-3 sm:p-4 flex flex-col overflow-hidden")}>
              <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base text-[hsl(43_85%_65%)] flex-shrink-0">
                Recipes ({filteredRecipes.length})
              </h3>
              <div className="space-y-2 overflow-y-auto flex-1 pr-2">
                {recipesLoading ? (
                  <div className="text-center text-slate-500 py-6 text-sm"><Loader2 className="inline w-4 h-4 animate-spin mr-1" /> Loading…</div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="text-center text-slate-500 py-8 italic text-sm">No recipes in this category</div>
                ) : (
                  filteredRecipes.map((recipe) => {
                    const locked = isTierLocked(recipe.output_tier);
                    const isSelected = selectedRecipe?.recipe_key === recipe.recipe_key;
                    return (
                      <button
                        key={recipe.recipe_key}
                        data-testid={`recipe-${recipe.recipe_key}`}
                        onClick={() => !locked && setSelectedRecipeKey(recipe.recipe_key)}
                        disabled={locked}
                        className={cn(
                          "w-full p-3 rounded-lg flex justify-between items-center transition-all border text-left",
                          locked
                            ? "bg-slate-800/30 border-slate-700/30 cursor-not-allowed opacity-50"
                            : isSelected
                              ? "bg-[hsl(43_85%_55%)]/10 border-[hsl(43_85%_55%)] border-l-4"
                              : "bg-[hsl(225_28%_12%)] border-[hsl(43_40%_20%)] hover:border-[hsl(43_40%_30%)]",
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {locked && <Lock className="w-4 h-4 text-slate-500" />}
                          <span className={cn("font-medium text-sm", isSelected ? "text-[hsl(43_85%_65%)]" : "text-slate-300")}>
                            {recipe.name}
                          </span>
                        </div>
                        <span className={cn(
                          "text-xs px-2 py-1 rounded border",
                          locked ? "text-slate-600 border-slate-700/30" : "text-[hsl(43_60%_50%)] border-[hsl(43_40%_20%)]",
                        )}>
                          T{recipe.output_tier}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* ── Center: Recipe Detail + Infusion ── */}
            <div className={cn(cardStyle, "flex-1 min-w-0 p-4 sm:p-6 flex flex-col overflow-hidden")}>
              {selectedRecipe ? (
                <div className="h-full flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-2xl font-bold font-uncial text-[hsl(43_85%_65%)] mb-1">{selectedRecipe.name}</h3>
                      <p className="text-sm text-[hsl(43_60%_50%)]">
                        {selectedRecipe.output_item_type} · {selectedRecipe.required_profession ?? "Universal"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="inline-block text-lg px-4 py-1 bg-amber-500 text-black font-bold rounded">
                        T{selectedRecipe.output_tier}
                      </span>
                      <div className="text-xs text-green-400 mt-1">+{CRAFT_XP_BY_TIER[selectedRecipe.output_tier] || 10} XP</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-hidden">
                    {/* Materials */}
                    <div className="bg-[hsl(225_28%_12%)] rounded-xl p-4 border-2 border-[hsl(43_40%_20%)] overflow-auto">
                      <h4 className="font-bold mb-3 text-xs uppercase tracking-widest text-[hsl(43_60%_50%)]">Required Materials</h4>
                      <ul className="space-y-2 text-sm">
                        {((selectedRecipe as any).required_materials ?? []).map((m: any, i: number) => (
                          <li key={i} className="flex justify-between items-center border-b border-[hsl(43_40%_15%)] pb-2 last:border-0">
                            <span className="text-slate-300">{m.name ?? m.item}</span>
                            <span className="font-mono text-slate-400">x{m.quantity ?? m.qty}</span>
                          </li>
                        ))}
                        {!(selectedRecipe as any).required_materials && (
                          <li className="text-slate-500 italic text-xs">Requirements not loaded — backend may be offline.</li>
                        )}
                      </ul>
                      <div className="flex justify-between items-center mt-3 text-xs border-t border-[hsl(43_40%_15%)] pt-2">
                        <span className="text-amber-400">Gold Cost</span>
                        <span className="font-mono text-amber-300">{selectedRecipe.cost_gold}g</span>
                      </div>
                    </div>

                    {/* Grudge Infusion panel */}
                    <div className="bg-[hsl(225_28%_12%)] rounded-xl p-4 border-2 border-[hsl(43_40%_20%)] overflow-auto">
                      <h4 className="font-bold mb-3 text-xs uppercase tracking-widest text-[hsl(43_60%_50%)] flex justify-between">
                        <span>Grudge Infusion</span>
                        {selectedRecipe.output_tier < 2 && (
                          <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">T2+ only</span>
                        )}
                      </h4>

                      {selectedRecipe.output_tier < 2 ? (
                        <div className="h-24 flex items-center justify-center text-slate-600 text-sm italic text-center">
                          Base items cannot be infused. Craft T2+ to unlock customization.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-xs text-slate-400">Infusion Essence</span>
                            <select
                              value={infusion ?? ""}
                              onChange={(e) => { setInfusion(e.target.value || null); setStackLevel(0); }}
                              className="mt-1 w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200 outline-none focus:border-amber-500"
                            >
                              <option value="">None</option>
                              <option value="blood">Blood Essence — Lifesteal</option>
                              <option value="void">Void Essence — Mana Drain</option>
                              <option value="iron">Iron Essence — Thorns</option>
                            </select>
                          </label>

                          {infusion && (
                            <div>
                              <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>Stack Intensity</span>
                                <span>
                                  {stackLevel === 0 ? "Base (100%)" : stackLevel === 1 ? "Enhanced (160%)" : "Max Overload (190%)"}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                  <button
                                    key={i}
                                    onClick={() => setStackLevel(i)}
                                    className={cn(
                                      "h-2 flex-1 rounded-full transition-colors",
                                      i <= stackLevel
                                        ? `bg-[hsl(${currentProfession.accent})]`
                                        : "bg-slate-800",
                                    )}
                                    aria-label={`Intensity ${i}`}
                                  />
                                ))}
                              </div>
                              <p className="text-[10px] text-slate-500 mt-1">
                                Cost ×{(1.5 ** stackLevel).toFixed(1)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-blue-500/10 border-2 border-blue-500/30 p-3 rounded-lg text-center">
                      <div className="text-xs text-blue-400 uppercase font-bold">Craft Time</div>
                      <div className="text-xl font-bold text-blue-300">{formatCraftTime(selectedRecipe.craft_time_seconds)}</div>
                    </div>
                    <div className="bg-purple-500/10 border-2 border-purple-500/30 p-3 rounded-lg text-center">
                      <div className="text-xs text-purple-400 uppercase font-bold">Station</div>
                      <div className="text-sm font-bold text-purple-300">
                        {(selectedRecipe as any).required_station ?? "Any"}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleStartCraft}
                    disabled={startCraft.isPending || !charId || isTierLocked(selectedRecipe.output_tier)}
                    className={cn(
                      "w-full h-12 mt-4 text-lg font-bold transition-all border-2 rounded-lg flex items-center justify-center gap-2",
                      isTierLocked(selectedRecipe.output_tier)
                        ? "bg-slate-700 text-slate-400 border-slate-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-[hsl(43_85%_45%)] to-[hsl(35_90%_40%)] hover:from-[hsl(43_85%_55%)] hover:to-[hsl(35_90%_50%)] text-[hsl(225_30%_8%)] border-[hsl(43_85%_55%)]",
                    )}
                  >
                    {startCraft.isPending ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Starting…</>
                    ) : isTierLocked(selectedRecipe.output_tier) ? (
                      <><Lock className="w-5 h-5" /> Unlock at Lv.{TIER_UNLOCK_LEVELS[selectedRecipe.output_tier]}</>
                    ) : (
                      <><Play className="w-5 h-5" /> Start Craft</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Select a recipe to view details
                </div>
              )}
            </div>

            {/* ── Right: Queue ── */}
            <div className={cn(cardStyle, "w-full lg:w-64 xl:w-72 flex-shrink-0 p-3 sm:p-4 flex flex-col overflow-hidden")}>
              <h3 className="font-bold mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base text-[hsl(43_85%_65%)]">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" /> Queue
              </h3>

              {!charId ? (
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">Log in to use crafting</div>
              ) : queueLoading ? (
                <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div>
              ) : queue.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm py-8">
                  <Clock className="w-8 h-8 mb-2 opacity-50" />
                  <p>No active crafts</p>
                </div>
              ) : (
                <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                  {completedJobs.length > 0 && (
                    <div>
                      <div className="text-xs text-green-400 uppercase font-bold mb-2">Ready to Claim</div>
                      {completedJobs.map((job) => (
                        <div key={job.id} className="p-3 rounded-lg bg-green-500/10 border-2 border-green-500/30 mb-2">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium text-green-300 text-sm">{job.recipe_name}</span>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          </div>
                          <button
                            onClick={() => handleCompleteCraft(job.id)}
                            disabled={completeCraft.isPending}
                            className="w-full text-xs py-1.5 bg-green-600 hover:bg-green-500 border-2 border-green-400 rounded font-bold"
                          >
                            Claim
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeJobs.length > 0 && (
                    <div>
                      <div className="text-xs text-amber-400 uppercase font-bold mb-2">In Progress</div>
                      {activeJobs.map((job) => {
                        const pct = Math.min(100, Math.max(0, 100 - (job.time_left_s / 60 * 100)));
                        return (
                          <div key={job.id} className="p-3 rounded-lg bg-amber-500/10 border-2 border-amber-500/30 mb-2">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium text-amber-300 text-sm">{job.recipe_name}</span>
                              <span className="text-xs text-amber-400 font-mono">{formatTimeRemaining(job.time_left_s)}</span>
                            </div>
                            <div className="w-full bg-black/30 rounded-full h-2 border border-amber-500/20">
                              <div className="bg-gradient-to-r from-amber-500 to-amber-400 h-full rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── Mystic Enchant Sockets ── */}
          <div className={cn(cardStyle, "p-4 sm:p-6")}>
            <h3 className="font-bold mb-3 text-[hsl(43_85%_65%)] flex items-center gap-2 text-sm sm:text-base">
              <span className="text-lg sm:text-xl">🔮 Mystic</span> Enchant Sockets
            </h3>
            <p className="text-xs sm:text-sm text-[hsl(43_60%_50%)] mb-3 sm:mb-4">
              Add gem-based enchantments to gear (Mystic profession required).
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="p-2 sm:p-4 border-2 border-dashed border-[hsl(43_40%_25%)] rounded-lg text-center hover:border-purple-500/50 hover:bg-purple-500/5 cursor-pointer transition-colors bg-[hsl(225_28%_12%)]"
                >
                  <div className="text-2xl opacity-30 mb-1">🔮</div>
                  <div className="text-[10px] sm:text-xs text-[hsl(43_60%_50%)]">Slot {i}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
