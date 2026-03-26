import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Box, Sword, Sparkles, Users, Image, Layers } from "lucide-react";
import { useRtsModels, useModels3D, useEffects2D, useOsWeapons, useOsSprites, flattenRtsModels, type RtsModel, type Model3D } from "@/lib/objectstore-gamedata";

interface AssetBrowserProps {
  onPlaceAsset: (asset: AssetEntry) => void;
}

export interface AssetEntry {
  id: string;
  name: string;
  category: string;
  source: 'objectstore' | 'model-registry' | 'crown-clash' | 'effects';
  type: 'character' | 'building' | 'weapon' | 'nature' | 'vehicle' | 'effect' | 'misc';
  path?: string;
  url?: string;
  format?: string;
  sizeKB?: number;
  race?: string;
  tags?: string[];
  iconEmoji?: string;
}

const CATEGORY_ICONS: Record<string, typeof Box> = {
  character: Users,
  building: Layers,
  weapon: Sword,
  nature: Sparkles,
  effect: Sparkles,
  misc: Box,
};

const TYPE_COLORS: Record<string, string> = {
  character: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  building: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  weapon: 'bg-red-500/20 text-red-300 border-red-500/30',
  nature: 'bg-green-500/20 text-green-300 border-green-500/30',
  vehicle: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  effect: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  misc: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
};

export function AssetBrowser({ onPlaceAsset }: AssetBrowserProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");

  const { data: rtsModels } = useRtsModels();
  const { data: models3d } = useModels3D();
  const { data: effects2d } = useEffects2D();
  const { data: weapons } = useOsWeapons();

  // Build unified asset list
  const allAssets = useMemo(() => {
    const assets: AssetEntry[] = [];

    // ObjectStore RTS models
    if (rtsModels?.races) {
      for (const [raceId, race] of Object.entries(rtsModels.races)) {
        for (const model of race.models) {
          assets.push({
            id: model.grudgeId || `os-${model.name}`,
            name: model.displayName || model.name,
            category: model.category || 'character',
            source: 'objectstore',
            type: model.unitType === 'building' ? 'building' : 'character',
            url: model.url,
            format: 'glb',
            race: raceId,
            tags: model.tags,
            iconEmoji: race.emoji,
          });
        }
      }
    }

    // 3D models from ObjectStore
    if (models3d?.models) {
      for (const m of models3d.models) {
        const cat = m.category?.toLowerCase();
        assets.push({
          id: `m3d-${m.name}`,
          name: m.name,
          category: m.category,
          source: 'objectstore',
          type: cat?.includes('weapon') ? 'weapon' : cat?.includes('building') ? 'building' : cat?.includes('character') ? 'character' : cat?.includes('nature') ? 'nature' : 'misc',
          path: m.path,
          format: m.format,
          sizeKB: m.sizeKB,
        });
      }
    }

    // Crown Clash models (from manifest if available)
    const ccFactions = ['elves', 'orcs'] as const;
    for (const faction of ccFactions) {
      const names = faction === 'elves'
        ? ['elf_commoner_1', 'elf_commoner_2', 'elf_upper_class_1', 'king', 'queen']
        : ['orcs_city_dwellers_1', 'peasant_1', 'peasant_2', 'king', 'queen'];
      for (const name of names) {
        assets.push({
          id: `cc-${faction}-${name}`,
          name: `${faction === 'elves' ? 'Elf' : 'Orc'} ${name.replace(/_/g, ' ')}`,
          category: faction,
          source: 'crown-clash',
          type: name === 'king' || name === 'queen' ? 'character' : 'character',
          path: `/models/crown-clash/${faction}/fbx/_${name}.fbx`,
          format: 'fbx',
          race: faction,
          iconEmoji: faction === 'elves' ? '🧝' : '👹',
        });
      }
    }

    // 2D Effects
    if (effects2d?.effects) {
      for (const [key, fx] of Object.entries(effects2d.effects)) {
        assets.push({
          id: `fx-${key}`,
          name: fx.filename,
          category: fx.subcategory,
          source: 'effects',
          type: 'effect',
          url: fx.src,
          format: fx.ext,
          sizeKB: fx.sizeKB,
          tags: fx.categories,
        });
      }
    }

    return assets;
  }, [rtsModels, models3d, effects2d]);

  // Filter
  const filtered = useMemo(() => {
    let list = allAssets;
    if (tab !== 'all') {
      list = list.filter(a => a.type === tab || a.source === tab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.category?.toLowerCase().includes(q) ||
        a.race?.toLowerCase().includes(q) ||
        a.tags?.some(t => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [allAssets, tab, search]);

  const counts = useMemo(() => ({
    all: allAssets.length,
    character: allAssets.filter(a => a.type === 'character').length,
    building: allAssets.filter(a => a.type === 'building').length,
    weapon: allAssets.filter(a => a.type === 'weapon').length,
    effect: allAssets.filter(a => a.type === 'effect').length,
  }), [allAssets]);

  return (
    <div className="flex flex-col h-full bg-card border-l">
      <div className="p-2 border-b space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-7 w-full grid grid-cols-5 text-[10px]">
            <TabsTrigger value="all" className="text-[10px] h-6">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="character" className="text-[10px] h-6">Units</TabsTrigger>
            <TabsTrigger value="building" className="text-[10px] h-6">Build</TabsTrigger>
            <TabsTrigger value="weapon" className="text-[10px] h-6">Wpn</TabsTrigger>
            <TabsTrigger value="effect" className="text-[10px] h-6">FX</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1.5 space-y-1">
          {filtered.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">
              {allAssets.length === 0 ? 'Loading assets...' : 'No assets match filter'}
            </div>
          )}
          {filtered.slice(0, 100).map(asset => (
            <AssetCard key={asset.id} asset={asset} onPlace={() => onPlaceAsset(asset)} />
          ))}
          {filtered.length > 100 && (
            <div className="text-center text-xs text-muted-foreground py-2">
              +{filtered.length - 100} more...
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function AssetCard({ asset, onPlace }: { asset: AssetEntry; onPlace: () => void }) {
  const Icon = CATEGORY_ICONS[asset.type] || Box;
  const colorClass = TYPE_COLORS[asset.type] || TYPE_COLORS.misc;

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-md border border-border/50 hover:border-primary/30 hover:bg-accent/30 transition-colors group">
      <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 border ${colorClass}`}>
        {asset.iconEmoji ? <span className="text-sm">{asset.iconEmoji}</span> : <Icon className="h-3.5 w-3.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium truncate">{asset.name}</p>
        <div className="flex items-center gap-1">
          <Badge variant="outline" className="text-[8px] h-3.5 px-1">{asset.source}</Badge>
          {asset.format && <span className="text-[8px] text-muted-foreground uppercase">{asset.format}</span>}
          {asset.sizeKB && <span className="text-[8px] text-muted-foreground">{asset.sizeKB}KB</span>}
        </div>
      </div>
      <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] opacity-0 group-hover:opacity-100" onClick={onPlace}>
        Place
      </Button>
    </div>
  );
}
