import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { DesignerNode, Connection } from '@/lib/rts-engine/designer-types';
import { CONNECTION_COLORS, CONNECTION_LABELS } from '@/lib/rts-engine/designer-types';

interface PropertiesPanelProps {
  node: DesignerNode | null;
  connections: Connection[];
  allNodes: DesignerNode[];
  onNodeChange: (updated: DesignerNode) => void;
}

export function PropertiesPanel({ node, connections, allNodes, onNodeChange }: PropertiesPanelProps) {
  if (!node) {
    return (
      <div className="w-72 bg-zinc-900 border-l border-zinc-700 flex items-center justify-center p-4">
        <p className="text-zinc-500 text-sm text-center">Select a node to view properties</p>
      </div>
    );
  }

  const nodeConns = connections.filter(c => c.fromNodeId === node.id || c.toNodeId === node.id);

  const updateStat = (key: string, value: string) => {
    const numVal = Number(value);
    onNodeChange({
      ...node,
      stats: { ...node.stats, [key]: isNaN(numVal) ? value : numVal },
    });
  };

  const updateCost = (field: 'gold' | 'wood', value: string) => {
    onNodeChange({
      ...node,
      cost: { ...(node.cost ?? { gold: 0, wood: 0 }), [field]: Number(value) || 0 },
    });
  };

  return (
    <div className="w-72 bg-zinc-900 border-l border-zinc-700 flex flex-col h-full">
      <div className="p-3 border-b border-zinc-700">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">{node.icon}</span>
          <div className="flex-1 min-w-0">
            <Input className="h-7 text-sm font-bold bg-zinc-800 border-zinc-700" value={node.name}
              onChange={e => onNodeChange({ ...node, name: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-2">
          <Badge style={{ backgroundColor: node.color }} className="text-[10px] text-white uppercase">{node.kind}</Badge>
          {node.tier && <Badge variant="outline" className="text-[10px]">Tier {node.tier}</Badge>}
          <Badge variant="secondary" className="text-[10px]">{node.configKey}</Badge>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {/* Description */}
          <div>
            <Label className="text-xs text-zinc-400">Description</Label>
            <Input className="h-7 text-xs bg-zinc-800 border-zinc-700 mt-1" value={node.description ?? ''}
              onChange={e => onNodeChange({ ...node, description: e.target.value })} placeholder="Notes..." />
          </div>

          <Separator className="bg-zinc-700" />

          {/* Cost */}
          {(node.kind === 'building' || node.kind === 'unit' || node.kind === 'upgrade') && (
            <div>
              <Label className="text-xs text-zinc-400 font-bold">Cost</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <Label className="text-[10px] text-zinc-500">🪙 Gold</Label>
                  <Input className="h-7 text-xs bg-zinc-800 border-zinc-700" type="number"
                    value={node.cost?.gold ?? 0} onChange={e => updateCost('gold', e.target.value)} />
                </div>
                <div>
                  <Label className="text-[10px] text-zinc-500">🪵 Wood</Label>
                  <Input className="h-7 text-xs bg-zinc-800 border-zinc-700" type="number"
                    value={node.cost?.wood ?? 0} onChange={e => updateCost('wood', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          <Separator className="bg-zinc-700" />

          {/* Stats */}
          <div>
            <Label className="text-xs text-zinc-400 font-bold">Stats</Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {Object.entries(node.stats).map(([key, val]) => (
                <div key={key}>
                  <Label className="text-[10px] text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                  <Input className="h-7 text-xs bg-zinc-800 border-zinc-700" type={typeof val === 'number' ? 'number' : 'text'}
                    value={val} onChange={e => updateStat(key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-zinc-700" />

          {/* Connections */}
          <div>
            <Label className="text-xs text-zinc-400 font-bold">Connections ({nodeConns.length})</Label>
            <div className="mt-1 space-y-1">
              {nodeConns.length === 0 && <p className="text-zinc-600 text-[10px]">No connections yet</p>}
              {nodeConns.map(c => {
                const isFrom = c.fromNodeId === node.id;
                const otherNode = allNodes.find(n => n.id === (isFrom ? c.toNodeId : c.fromNodeId));
                return (
                  <div key={c.id} className="flex items-center gap-1.5 text-[10px] py-0.5 px-1 rounded bg-zinc-800">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CONNECTION_COLORS[c.type] }} />
                    <span className="text-zinc-400">{isFrom ? '→' : '←'}</span>
                    <span style={{ color: CONNECTION_COLORS[c.type] }} className="font-bold">{CONNECTION_LABELS[c.type]}</span>
                    <span className="text-zinc-300 truncate">{otherNode?.icon} {otherNode?.name ?? '???'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
