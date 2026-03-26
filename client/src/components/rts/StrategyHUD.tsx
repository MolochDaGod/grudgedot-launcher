import { Badge } from "@/components/ui/badge";
import type { RTSEntity, InteractionState, LogEntry } from "./RTSInteraction";
import { getCommands } from "./RTSInteraction";

interface StrategyHUDProps {
  state: InteractionState;
  entities: RTSEntity[];
  fps?: number;
  onCommand: (key: string) => void;
}

export function ResourceBar({ state, fps = 60 }: { state: InteractionState; fps?: number }) {
  const { gold, wood, food, maxFood } = state.resources;
  return (
    <div className="flex items-center justify-center gap-6 px-4 py-1.5 bg-gradient-to-b from-[#2c3e50] to-[#1a1a2e] border-b-2 border-[#414158] text-xs font-bold" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      <div className="flex items-center gap-2">
        <span className="text-yellow-400">●</span> GOLD: <span className="text-yellow-300">{gold.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-green-400">●</span> WOOD: <span className="text-green-300">{wood}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-orange-400">●</span> FOOD: <span className="text-orange-300">{food} / {maxFood}</span>
      </div>
      <div className="text-zinc-500">FPS: {fps}</div>
      <Badge variant="outline" className="text-[10px] border-indigo-400/30 text-indigo-300">
        Mode: {state.mode.charAt(0).toUpperCase() + state.mode.slice(1)}
      </Badge>
    </div>
  );
}

export function StrategyHUD({ state, entities, fps, onCommand }: StrategyHUDProps) {
  const selected = entities.filter(e => state.selectedIds.includes(e.id));
  const commands = getCommands(state, entities);

  return (
    <div className="flex h-[200px] bg-[#121212] border-t-4 border-[#333] gap-2 p-2" style={{ backgroundImage: 'linear-gradient(45deg, #1a1a1a 25%, transparent 25%), linear-gradient(-45deg, #1a1a1a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1a1a1a 75%), linear-gradient(-45deg, transparent 75%, #1a1a1a 75%)', backgroundSize: '4px 4px' }}>
      {/* LEFT: Minimap */}
      <div className="w-[180px] flex flex-col border-2 border-[#444] bg-[#222] shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
        <div className="flex-1 bg-[#050505] border border-[#555] m-1 relative">
          {/* Minimap dots */}
          {entities.map(e => (
            <div key={e.id} className="absolute rounded-sm" style={{
              width: 6, height: 6,
              left: `${((e.position.x + 50) / 100) * 100}%`,
              top: `${((e.position.z + 50) / 100) * 100}%`,
              background: e.team === 'player' ? '#3498db' : e.team === 'enemy' ? '#e74c3c' : '#888',
              boxShadow: `0 0 5px ${e.team === 'player' ? '#3498db' : e.team === 'enemy' ? '#e74c3c' : '#888'}`,
            }} />
          ))}
        </div>
        <div className="flex justify-around p-1">
          <button className="text-[8px] bg-gray-700 px-1 border border-gray-500 text-white">MAP</button>
          <button className="text-[8px] bg-gray-700 px-1 border border-gray-500 text-white">LOG</button>
        </div>
      </div>

      {/* CENTER: Selection Info */}
      <div className="flex-1 flex items-center gap-4 p-2 border-2 border-[#444] bg-[#222] shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
        {selected.length === 0 ? (
          <div className="text-xs text-zinc-500 px-4">
            No selection. Click a unit or drag-box to select.
          </div>
        ) : selected.length === 1 ? (
          <SingleUnitInfo entity={selected[0]} />
        ) : (
          <GroupInfo entities={selected} />
        )}
      </div>

      {/* RIGHT: Command Grid */}
      <div className="w-[260px] grid grid-cols-4 grid-rows-3 gap-1 p-1 border-2 border-[#444] bg-[#222] shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]">
        {commands.map((cmd, i) => (
          <button
            key={i}
            onClick={() => cmd.key && onCommand(cmd.key)}
            disabled={!cmd.label}
            className={`flex flex-col items-center justify-center border-2 transition-all text-white relative
              ${cmd.active ? 'border-yellow-400 bg-yellow-500/20' : cmd.label ? 'border-[#555] bg-[#333] hover:border-yellow-400 hover:bg-[#444] active:scale-95' : 'border-[#333] bg-[#222] opacity-20'}
            `}
          >
            {cmd.key && <span className="absolute top-0.5 right-1 text-[7px] text-zinc-500">{cmd.key}</span>}
            <span className="text-sm">
              {cmd.label === 'Move' ? '↗️' : cmd.label === 'Stop' ? '🛑' : cmd.label === 'Hold' ? '🛡️' : cmd.label === 'Attack' ? '⚔️' : cmd.label === 'Build' ? '🏗️' : cmd.label === 'Towers' ? '🏹' : cmd.label === 'Upgrade' ? '🔼' : cmd.label === 'Reset' ? '🔄' : cmd.label === 'Rally' ? '🚩' : cmd.label === 'Back' ? '↩️' : ''}
            </span>
            <span className="text-[6px] mt-0.5">{cmd.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SingleUnitInfo({ entity }: { entity: RTSEntity }) {
  const hpPct = Math.max(0, Math.min(100, (entity.hp / entity.maxHp) * 100));
  const xpPct = entity.maxXp ? Math.max(0, Math.min(100, ((entity.xp || 0) / entity.maxXp) * 100)) : 0;

  return (
    <>
      {/* Portrait */}
      <div className="w-[90px] h-[90px] bg-[#333] border-2 border-yellow-500 flex items-center justify-center shrink-0">
        <span className="text-3xl">{entity.iconEmoji || (entity.kind === 'building' ? '🏰' : entity.team === 'enemy' ? '☠️' : '⚔️')}</span>
      </div>

      {/* Stats */}
      <div className="flex-1 flex flex-col gap-1.5">
        <div className="text-xs text-white font-bold">
          {entity.name} <span className="text-[8px] text-zinc-400">LVL {entity.level || 1}</span>
        </div>

        {/* HP Bar */}
        <div className="w-full h-4 bg-[#441111] border border-black">
          <div className="h-full bg-[#cc2222] transition-all" style={{ width: `${hpPct}%` }} />
        </div>
        <div className="text-[8px] text-zinc-400">
          HP: {entity.hp}/{entity.maxHp} | ARMOR: {entity.armor} | DMG: {entity.damage}
        </div>

        {/* XP Bar */}
        {entity.maxXp && (
          <>
            <div className="w-4/5 h-2 bg-[#111144] border border-black">
              <div className="h-full bg-[#4444ff] transition-all" style={{ width: `${xpPct}%` }} />
            </div>
            <div className="text-[8px] text-blue-400">XP: {entity.xp || 0}/{entity.maxXp}</div>
          </>
        )}
      </div>

      {/* Inventory Slots */}
      <div className="grid grid-cols-2 gap-1 shrink-0">
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="w-9 h-9 bg-black/40 border border-gray-600" />
        ))}
      </div>
    </>
  );
}

function GroupInfo({ entities }: { entities: RTSEntity[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1 overflow-auto max-h-full">
      {entities.map(e => (
        <div key={e.id} className="w-10 h-10 bg-[#333] border border-[#555] flex items-center justify-center relative" title={`${e.name} (HP: ${e.hp})`}>
          <span className="text-sm">{e.iconEmoji || '⚔️'}</span>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#441111]">
            <div className="h-full bg-green-500" style={{ width: `${(e.hp / e.maxHp) * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="text-[8px] text-zinc-400 self-center ml-2">{entities.length} selected</div>
    </div>
  );
}

export function CombatLog({ log }: { log: LogEntry[] }) {
  return (
    <div className="space-y-1 text-xs max-h-40 overflow-auto">
      {log.map((entry, i) => (
        <div key={i} className={`rounded px-2 py-1 border ${
          entry.tone === 'warn' ? 'border-amber-400/20 bg-amber-500/10 text-amber-200' :
          entry.tone === 'danger' ? 'border-red-400/20 bg-red-500/10 text-red-200' :
          entry.tone === 'success' ? 'border-green-400/20 bg-green-500/10 text-green-200' :
          'border-white/10 bg-white/5 text-zinc-300'
        }`}>
          {entry.text}
        </div>
      ))}
      {log.length === 0 && <div className="text-zinc-500 text-center py-2">No events yet</div>}
    </div>
  );
}
