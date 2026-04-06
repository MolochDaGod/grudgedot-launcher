import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CLOTH_EQUIPMENT, LEATHER_EQUIPMENT, METAL_EQUIPMENT,
  EQUIPMENT_SETS, EQUIPMENT_SLOTS, ARMOR_MATERIALS,
  type EquipmentItem,
} from "../../../../shared/wcs/definitions/equipmentData";
import { useGrudgePlayer } from "@/hooks/useGrudgePlayer";
import { useEquipItem } from "@/hooks/useGrudgeAPI";

const ALL_EQUIPMENT: EquipmentItem[] = [
  ...CLOTH_EQUIPMENT,
  ...LEATHER_EQUIPMENT,
  ...METAL_EQUIPMENT,
];

const MATERIAL_COLORS: Record<string, string> = {
  Cloth: "#8b5cf6",
  Leather: "#d97706",
  Metal: "#6b7280",
};

const MATERIAL_ICONS: Record<string, string> = {
  Cloth: "🧵",
  Leather: "🦌",
  Metal: "⚙️",
};

const TAB_IDS = ["all", "cloth", "leather", "metal"] as const;

export default function ArsenalPage() {
  const [materialFilter, setMaterialFilter] = useState<string>("all");
  const [setFilter, setSetFilter] = useState<string>("all");
  const [slotFilter, setSlotFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("all");
  const player = useGrudgePlayer();
  const equipMutation = useEquipItem();

  const filtered = useMemo(() => {
    return ALL_EQUIPMENT.filter(item => {
      if (materialFilter !== "all" && item.material !== materialFilter) return false;
      if (slotFilter !== "all" && item.type !== slotFilter) return false;
      if (setFilter !== "all" && !item.id.includes(setFilter.toLowerCase())) return false;
      if (activeTab !== "all" && item.material.toLowerCase() !== activeTab) return false;
      return true;
    });
  }, [materialFilter, setFilter, slotFilter, activeTab]);

  const equippedIds = new Set(
    player.inventory.filter(i => i.equipped).map(i => i.item_key)
  );

  return (
    <div className="p-4 space-y-4">
      {/* Filters Bar */}
      <div className="fantasy-panel p-3 flex items-center gap-3 flex-wrap">
        <select
          value={materialFilter}
          onChange={e => setMaterialFilter(e.target.value)}
          className="inset-panel px-2 py-1 text-xs text-[hsl(45_30%_75%)] bg-transparent outline-none"
        >
          <option value="all">All Materials</option>
          {ARMOR_MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select
          value={setFilter}
          onChange={e => setSetFilter(e.target.value)}
          className="inset-panel px-2 py-1 text-xs text-[hsl(45_30%_75%)] bg-transparent outline-none"
        >
          <option value="all">All Sets</option>
          {EQUIPMENT_SETS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={slotFilter}
          onChange={e => setSlotFilter(e.target.value)}
          className="inset-panel px-2 py-1 text-xs text-[hsl(45_30%_75%)] bg-transparent outline-none"
        >
          <option value="all">All Slots</option>
          {EQUIPMENT_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-[10px] text-[hsl(43_70%_55%)] ml-auto font-[var(--font-body)]">
          {filtered.length} items ({ALL_EQUIPMENT.length} total)
        </span>
      </div>

      {/* Material Tabs */}
      <div className="flex gap-2">
        {TAB_IDS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-[var(--font-heading)] tracking-wide rounded transition-all ${
              activeTab === tab ? "gilded-button" : "dark-button"
            }`}
          >
            {tab === "all" ? "All" : `${MATERIAL_ICONS[tab.charAt(0).toUpperCase() + tab.slice(1)] || ""} ${tab.charAt(0).toUpperCase() + tab.slice(1)}`}
            <span className="ml-1 text-[10px] opacity-75">
              ({tab === "all" ? filtered.length : ALL_EQUIPMENT.filter(i => i.material.toLowerCase() === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* Equipment Grid */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(item => {
            const isEquipped = equippedIds.has(item.id);
            const matColor = MATERIAL_COLORS[item.material] || "#888";
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`stone-panel p-3 cursor-pointer transition-all hover:border-[hsl(43_60%_40%)] ${
                      isEquipped ? "ring-1 ring-[hsl(43_85%_55%)]" : ""
                    }`}
                    style={{ borderLeftWidth: "3px", borderLeftColor: matColor }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-[var(--font-heading)] text-xs tracking-wide truncate text-[hsl(45_30%_85%)]">
                        {item.name}
                      </span>
                      <div className="flex gap-1 shrink-0">
                        <span className="text-[9px] px-1 py-0.5 rounded border border-[hsl(220_15%_30%)] text-[hsl(45_15%_60%)]">{item.type}</span>
                        <span className="text-[9px] px-1 py-0.5 rounded" style={{ borderWidth: "1px", borderColor: matColor + "60", color: matColor }}>
                          {item.material}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-0.5 text-[10px]">
                      <div className="flex justify-between"><span className="text-[hsl(45_15%_50%)]">HP</span><span className="font-mono text-[hsl(120_60%_50%)]">{item.stats.hpBase} +{item.stats.hpPerTier}/T</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(45_15%_50%)]">Mana</span><span className="font-mono text-blue-400">{item.stats.manaBase} +{item.stats.manaPerTier}/T</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(45_15%_50%)]">Crit</span><span className="font-mono text-[hsl(35_100%_55%)]">{item.stats.critBase}%</span></div>
                      <div className="flex justify-between"><span className="text-[hsl(45_15%_50%)]">Def</span><span className="font-mono text-[hsl(220_80%_60%)]">{item.stats.defenseBase} +{item.stats.defensePerTier}/T</span></div>
                    </div>
                    <div className="text-[9px] mt-1.5 text-[hsl(43_70%_55%)]">
                      {item.passive} · <span className="text-[hsl(45_15%_55%)]">{item.attribute}</span>
                    </div>
                    {isEquipped && (
                      <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 rounded bg-[hsl(43_40%_12%)] text-[hsl(43_85%_55%)] border border-[hsl(43_50%_30%)]">
                        Equipped
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs fantasy-panel p-3 space-y-1.5">
                  <p className="font-[var(--font-heading)] font-semibold text-[hsl(43_85%_55%)]">{item.name}</p>
                  <p className="text-xs italic text-[hsl(45_15%_55%)]">{item.lore}</p>
                  <div className="text-xs space-y-0.5 text-[hsl(45_30%_75%)]">
                    <div>Passive: <span className="text-[hsl(43_70%_55%)]">{item.passive}</span></div>
                    <div>Effect: {item.effect}</div>
                    <div>Proc: {item.proc}</div>
                    <div>Set Bonus: <span className="text-[hsl(280_70%_60%)]">{item.setBonus}</span></div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
