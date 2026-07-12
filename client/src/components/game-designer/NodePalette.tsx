import { useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import type { NodeTemplate, DesignerNodeKind } from '@/lib/rts-engine/designer-types';
import { NODE_DEFAULTS } from '@/lib/rts-engine/designer-types';
import { UNIT_CONFIGS, BUILDING_CONFIGS, HERO_CONFIGS, ABILITY_DEFS, UPGRADE_DEFS } from '@/lib/rts-engine/constants';

// ── Generate templates from engine constants ─────────────────────────────────
function buildTemplates(): NodeTemplate[] {
  const templates: NodeTemplate[] = [];

  // Buildings
  for (const [key, cfg] of Object.entries(BUILDING_CONFIGS)) {
    templates.push({
      configKey: key, kind: 'building', name: key.charAt(0).toUpperCase() + key.slice(1),
      icon: key === 'castle' ? '🏰' : key === 'keep' ? '🏯' : key === 'fortress' ? '⛩️' :
            key === 'barracks' ? '⚔️' : key === 'archery' ? '🏹' : key === 'chapel' ? '⛪' :
            key === 'workshop' ? '🔧' : key === 'sanctum' ? '🔮' : key === 'tower' ? '🗼' :
            key === 'house' ? '🏠' : key === 'market' ? '🏪' : key === 'tavern' ? '🍺' :
            key === 'blacksmith' ? '⚒️' : key === 'altar' ? '🪦' : key === 'docks' ? '⚓' :
            key === 'goldmine' ? '💰' : '🏗️',
      color: NODE_DEFAULTS.building.color, category: 'Buildings',
      defaultStats: { hp: cfg.hp, foodProvided: cfg.foodProvided, buildTime: cfg.buildTime },
      defaultCost: cfg.cost, defaultTier: cfg.techTier,
      description: `T${cfg.techTier} ${cfg.canAttack ? 'Defense' : 'Structure'} — Trains: ${cfg.trains.join(', ') || 'none'}`,
    });
  }

  // Trainable units
  for (const [key, cfg] of Object.entries(UNIT_CONFIGS)) {
    if (cfg.foodCost === 0) continue; // skip creep-only
    templates.push({
      configKey: key, kind: 'unit', name: key.charAt(0).toUpperCase() + key.slice(1),
      icon: cfg.role === 'worker' ? '⛏️' : cfg.role === 'melee' ? '⚔️' : cfg.role === 'ranged' ? '🏹' :
            cfg.role === 'caster' ? '✨' : cfg.role === 'siege' ? '💣' : '👤',
      color: NODE_DEFAULTS.unit.color, category: `Units — ${cfg.role.charAt(0).toUpperCase() + cfg.role.slice(1)}`,
      defaultStats: { hp: cfg.hp, damage: cfg.damage, armor: cfg.armor, speed: cfg.speed, range: cfg.range, foodCost: cfg.foodCost },
      defaultCost: cfg.trainCost, defaultTier: cfg.requiredTier,
      description: `${cfg.role} T${cfg.requiredTier} — Trained at ${cfg.trainedAt}`,
    });
  }

  // Heroes
  for (const hcfg of HERO_CONFIGS) {
    templates.push({
      configKey: hcfg.type, kind: 'hero', name: `${hcfg.name} (${hcfg.title})`,
      icon: hcfg.type === 'arthax' ? '🗡️' : hcfg.type === 'kanji' ? '🔮' : hcfg.type === 'katan' ? '🏹' : '🛡️',
      color: NODE_DEFAULTS.hero.color, category: 'Heroes',
      defaultStats: { hp: hcfg.hp, mana: hcfg.mana, damage: hcfg.damage, armor: hcfg.armor, speed: hcfg.speed },
      description: `Abilities: ${hcfg.abilities.join(', ')}`,
    });
  }

  // Spells / Abilities
  for (const [key, def] of Object.entries(ABILITY_DEFS)) {
    templates.push({
      configKey: key, kind: 'spell', name: def.name,
      icon: def.icon, color: NODE_DEFAULTS.spell.color, category: def.isUltimate ? 'Ultimates' : 'Abilities',
      defaultStats: { cooldown: def.cooldown, manaCost: def.manaCost, maxRank: def.maxRank },
      description: def.description,
    });
  }

  // Upgrades
  for (const [key, def] of Object.entries(UPGRADE_DEFS)) {
    templates.push({
      configKey: key, kind: 'upgrade', name: def.name,
      icon: def.icon, color: NODE_DEFAULTS.upgrade.color, category: 'Upgrades',
      defaultStats: { ...(def.bonusDamage ? { bonusDamage: def.bonusDamage } : {}), ...(def.bonusArmor ? { bonusArmor: def.bonusArmor } : {}) },
      defaultCost: def.cost, defaultTier: def.requiredTier,
      description: def.description,
    });
  }

  return templates;
}

const ALL_TEMPLATES = buildTemplates();

interface NodePaletteProps {
  onDragStart?: (template: NodeTemplate) => void;
}

export function NodePalette({ onDragStart }: NodePaletteProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = search
    ? ALL_TEMPLATES.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase()))
    : ALL_TEMPLATES;

  // Group by category
  const grouped = new Map<string, NodeTemplate[]>();
  for (const t of filtered) {
    if (!grouped.has(t.category)) grouped.set(t.category, []);
    grouped.get(t.category)!.push(t);
  }

  const toggleCategory = (cat: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleDrag = (e: React.DragEvent, template: NodeTemplate) => {
    e.dataTransfer.setData('node-kind', JSON.stringify(template));
    onDragStart?.(template);
  };

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-700 flex flex-col h-full">
      <div className="p-2 border-b border-zinc-700">
        <h3 className="text-sm font-bold text-zinc-300 mb-2">Node Palette</h3>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <Input className="pl-8 h-8 text-xs bg-zinc-800 border-zinc-700" placeholder="Search nodes..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {Array.from(grouped.entries()).map(([cat, templates]: [string, NodeTemplate[]]) => (
            <div key={cat}>
              <button className="flex items-center gap-1 w-full text-left text-xs font-bold text-zinc-400 hover:text-zinc-200 py-1 px-1"
                onClick={() => toggleCategory(cat)}>
                {collapsed.has(cat) ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {cat}
                <Badge variant="outline" className="text-[10px] ml-auto h-4">{templates.length}</Badge>
              </button>
              {!collapsed.has(cat) && templates.map((t: NodeTemplate) => (
                <div key={t.configKey} draggable
                  onDragStart={(e) => handleDrag(e, t)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-800 cursor-grab active:cursor-grabbing text-xs border border-transparent hover:border-zinc-700 ml-2"
                  style={{ borderLeftColor: t.color, borderLeftWidth: 3 }}>
                  <span className="text-base">{t.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-zinc-200 truncate font-medium">{t.name}</div>
                    {t.defaultCost && (
                      <div className="text-zinc-500 text-[10px]">🪙{t.defaultCost.gold} 🪵{t.defaultCost.wood}</div>
                    )}
                  </div>
                  {t.defaultTier && (
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0">T{t.defaultTier}</Badge>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
