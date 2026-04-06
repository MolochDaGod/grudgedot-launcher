import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Hammer, Clock, FlaskConical, CheckCircle } from "lucide-react";
import {
  ALL_PROFESSIONS, GATHERING_PROFESSIONS, CRAFTING_PROFESSIONS,
  getProfessionXPForLevel, getRequiredLevelForTier,
  type Profession,
} from "../../../../shared/wcs/gameDefinitions/professions";
import { useGrudgePlayer } from "@/hooks/useGrudgePlayer";
import {
  useCraftingRecipes, useCraftingQueue,
  useStartCraft, useCompleteCraft,
  type BackendCraftingRecipe, type CraftingQueueItem,
} from "@/hooks/useGrudgeAPI";

const PROF_ICONS: Record<string, string> = {
  mining: "⛏️", logging: "🪵", herbalism: "🌿", fishing: "🎣", skinning: "✂️",
  blacksmithing: "🔨", woodworking: "🏹", enchanting: "✨", alchemy: "⚗️", engineering: "⚙️",
};

const TAB_IDS = ["recipes", "queue", "professions"] as const;

export default function CraftingPage() {
  const player = useGrudgePlayer();
  const { toast } = useToast();
  const charId = player.activeChar?.id;
  const classId = player.activeChar?.class;
  const [activeTab, setActiveTab] = useState<string>("recipes");

  const { data: recipes = [], isLoading: recipesLoading } = useCraftingRecipes(classId);
  const { data: queue = [], isLoading: queueLoading } = useCraftingQueue(charId);
  const startCraft = useStartCraft();
  const completeCraft = useCompleteCraft();

  const handleStartCraft = (recipeKey: string) => {
    if (!charId) return;
    startCraft.mutate({ charId, recipeKey }, {
      onSuccess: () => toast({ title: "Craft started!", description: `Recipe: ${recipeKey}` }),
      onError: () => toast({ title: "Craft failed", description: "Check requirements", variant: "destructive" }),
    });
  };

  const handleCompleteCraft = (craftId: number) => {
    completeCraft.mutate(craftId, {
      onSuccess: () => toast({ title: "Craft complete!", description: "Item added to inventory" }),
    });
  };

  const queuedCount = queue.filter(q => q.status === "queued").length;

  return (
    <div className="p-4 space-y-4">
      {/* Tab buttons */}
      <div className="flex gap-2">
        {TAB_IDS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-[var(--font-heading)] tracking-wide rounded transition-all ${
              activeTab === tab ? "gilded-button" : "dark-button"
            }`}
          >
            {tab === "recipes" && <Hammer className="h-3 w-3" />}
            {tab === "queue" && <Clock className="h-3 w-3" />}
            {tab === "professions" && <FlaskConical className="h-3 w-3" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === "queue" && queuedCount > 0 && (
              <span className="ml-1 text-[9px] px-1 py-0 rounded-full bg-[hsl(43_40%_12%)] text-[hsl(43_85%_55%)] border border-[hsl(43_50%_30%)]">
                {queuedCount}
              </span>
            )}
            {tab === "professions" && (
              <span className="ml-1 text-[10px] opacity-75">({ALL_PROFESSIONS.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Recipes Tab */}
      {activeTab === "recipes" && (
        <ScrollArea className="h-[calc(100vh-220px)]">
          {!player.activeChar ? (
            <div className="text-center text-[hsl(45_15%_55%)] py-8 font-[var(--font-body)]">Select a character to view recipes</div>
          ) : recipesLoading ? (
            <div className="text-center text-[hsl(45_15%_55%)] py-8 font-[var(--font-body)]">Loading recipes...</div>
          ) : recipes.length === 0 ? (
            <div className="text-center text-[hsl(45_15%_55%)] py-8 font-[var(--font-body)]">
              No recipes available. Backend may be offline — check Professions tab for canonical data.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {recipes.map((recipe: BackendCraftingRecipe) => (
                <div key={recipe.recipe_key} className="parchment-panel p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-[var(--font-heading)] text-xs tracking-wide text-[hsl(45_30%_85%)]">{recipe.name}</span>
                    <div className="flex gap-1">
                      <span className="text-[9px] px-1 py-0.5 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)]">{recipe.output_item_type}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_55%)]">T{recipe.output_tier}</span>
                    </div>
                  </div>
                  {recipe.required_profession && (
                    <div className="flex items-center gap-2 text-[10px] text-[hsl(45_15%_55%)]">
                      <FlaskConical className="h-3 w-3" />
                      <span className="capitalize">{recipe.required_profession}</span>
                      <span>· Lv {recipe.required_level}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="flex items-center gap-1 text-[hsl(45_15%_55%)]">
                      <Clock className="h-3 w-3" /> {recipe.craft_time_seconds}s
                    </span>
                    <span className="font-mono text-[hsl(43_85%_55%)]">{recipe.cost_gold}g</span>
                  </div>
                  <button
                    className="gilded-button w-full py-1.5 text-xs flex items-center justify-center gap-1"
                    onClick={() => handleStartCraft(recipe.recipe_key)}
                    disabled={startCraft.isPending}
                  >
                    <Hammer className="h-3 w-3" /> Craft
                  </button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Queue Tab */}
      {activeTab === "queue" && (
        <ScrollArea className="h-[calc(100vh-220px)]">
          {queue.length === 0 ? (
            <div className="text-center text-[hsl(45_15%_55%)] py-8 font-[var(--font-body)]">No active crafts</div>
          ) : (
            <div className="space-y-3">
              {queue.map((item: CraftingQueueItem) => (
                <div key={item.id} className="fantasy-panel p-3 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-[var(--font-heading)] text-sm text-[hsl(45_30%_85%)]">{item.recipe_name}</div>
                    <div className="text-[10px] text-[hsl(45_15%_55%)]">
                      {item.output_item_type} · T{item.output_tier}
                    </div>
                    {item.status === "queued" && !item.is_ready && (
                      <div className="text-[10px] text-[hsl(45_15%_55%)] mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.ceil(item.time_left_s)}s remaining
                      </div>
                    )}
                  </div>
                  {item.is_ready ? (
                    <button
                      className="gilded-button px-3 py-1.5 text-xs flex items-center gap-1"
                      onClick={() => handleCompleteCraft(item.id)}
                    >
                      <CheckCircle className="h-3 w-3" /> Collect
                    </button>
                  ) : (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                      item.status === "complete"
                        ? "border-[hsl(120_60%_40%)] text-[hsl(120_60%_50%)]"
                        : "border-[hsl(220_15%_30%)] text-[hsl(45_15%_55%)]"
                    }`}>
                      {item.status}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      )}

      {/* Professions Tab */}
      {activeTab === "professions" && (
        <ScrollArea className="h-[calc(100vh-220px)]">
          <div className="space-y-4">
            <h3 className="font-[var(--font-heading)] text-xs gold-text tracking-widest uppercase">
              Gathering ({Object.keys(GATHERING_PROFESSIONS).length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(GATHERING_PROFESSIONS).map((prof: Profession) => {
                const playerProf = player.professions.find(p => p.profession === prof.id || p.profession === prof.name);
                return (
                  <div key={prof.id} className="fantasy-panel p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{PROF_ICONS[prof.id] || "📦"}</span>
                      <span className="font-[var(--font-heading)] text-xs tracking-wide text-[hsl(45_30%_85%)]">{prof.name}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_55%)]">{prof.type}</span>
                      {playerProf && (
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[hsl(43_40%_12%)] text-[hsl(43_85%_55%)] border border-[hsl(43_50%_30%)]">
                          Lv {playerProf.level}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[hsl(45_15%_55%)] mb-1">{prof.description}</p>
                    {prof.primaryStat && (
                      <div className="text-[10px] text-[hsl(45_15%_60%)]">Primary: <span className="capitalize text-[hsl(43_70%_55%)]">{prof.primaryStat}</span></div>
                    )}
                    {prof.relatedProfessions && prof.relatedProfessions.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        <span className="text-[9px] text-[hsl(45_15%_50%)]">Synergies:</span>
                        {prof.relatedProfessions.map(r => (
                          <span key={r} className="text-[9px] px-1 py-0 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)]">{r}</span>
                        ))}
                      </div>
                    )}
                    {playerProf && (
                      <Progress value={(playerProf.xp / (playerProf.next_milestone || 100)) * 100} className="h-1.5 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>

            <h3 className="font-[var(--font-heading)] text-xs gold-text tracking-widest uppercase pt-2">
              Crafting ({Object.keys(CRAFTING_PROFESSIONS).length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.values(CRAFTING_PROFESSIONS).map((prof: Profession) => {
                const playerProf = player.professions.find(p => p.profession === prof.id || p.profession === prof.name);
                return (
                  <div key={prof.id} className="fantasy-panel p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{PROF_ICONS[prof.id] || "📦"}</span>
                      <span className="font-[var(--font-heading)] text-xs tracking-wide text-[hsl(45_30%_85%)]">{prof.name}</span>
                      <span className="text-[9px] px-1 py-0.5 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_55%)]">{prof.type}</span>
                      {playerProf && (
                        <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-[hsl(43_40%_12%)] text-[hsl(43_85%_55%)] border border-[hsl(43_50%_30%)]">
                          Lv {playerProf.level}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[hsl(45_15%_55%)] mb-1">{prof.description}</p>
                    {prof.primaryStat && (
                      <div className="text-[10px] text-[hsl(45_15%_60%)]">Primary: <span className="capitalize text-[hsl(43_70%_55%)]">{prof.primaryStat}</span></div>
                    )}
                    {prof.relatedProfessions && prof.relatedProfessions.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        <span className="text-[9px] text-[hsl(45_15%_50%)]">Synergies:</span>
                        {prof.relatedProfessions.map(r => (
                          <span key={r} className="text-[9px] px-1 py-0 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)]">{r}</span>
                        ))}
                      </div>
                    )}
                    {playerProf && (
                      <Progress value={(playerProf.xp / (playerProf.next_milestone || 100)) * 100} className="h-1.5 mt-2" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tier Requirements */}
            <div className="parchment-panel p-3">
              <h4 className="font-[var(--font-heading)] text-xs gold-text tracking-wide mb-2">Tier → Required Profession Level</h4>
              <div className="flex gap-2 flex-wrap">
                {[0,1,2,3,4,5,6,7,8].map(t => (
                  <span key={t} className="text-[10px] px-1.5 py-0.5 rounded border border-[hsl(43_50%_30%)] text-[hsl(43_70%_55%)]">
                    T{t} → Lv {getRequiredLevelForTier(t)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
