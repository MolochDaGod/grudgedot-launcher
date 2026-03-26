import { useState, useCallback, useEffect } from "react";
import { RTSTestbed } from "@/components/rts/RTSTestbed";
import { StrategyHUD, ResourceBar, CombatLog } from "@/components/rts/StrategyHUD";
import { AssetBrowser, type AssetEntry } from "@/components/rts/AssetBrowser";
import {
  createInitialState, handleKeyDown, selectSingle, selectMany, addToSelection,
  clearSelection, setMode, setHover, addLog, startDrag, updateDrag, endDrag,
  type InteractionState, type RTSEntity,
} from "@/components/rts/RTSInteraction";

let nextEntityId = 1;

// Default demo entities
const DEMO_ENTITIES: RTSEntity[] = [
  { id: 'base1', name: 'Main Outpost', kind: 'building', team: 'player', hp: 1500, maxHp: 1500, armor: 5, damage: '0', xp: 0, maxXp: 500, level: 3, position: { x: -8, y: 0, z: 12 }, commands: ['Build', 'Upgrade', 'Rally'], iconEmoji: '🏰' },
  { id: 'unit1', name: 'Footman Alpha', kind: 'unit', team: 'player', hp: 420, maxHp: 420, armor: 3, damage: '15-18', xp: 120, maxXp: 300, level: 2, position: { x: -4, y: 0, z: 6 }, commands: ['Move', 'Stop', 'Hold', 'Attack'], iconEmoji: '⚔️' },
  { id: 'unit2', name: 'Footman Beta', kind: 'unit', team: 'player', hp: 420, maxHp: 420, armor: 3, damage: '15-18', position: { x: -1, y: 0, z: 8 }, commands: ['Move', 'Stop', 'Hold', 'Attack'], iconEmoji: '⚔️' },
  { id: 'unit3', name: 'Archer Gamma', kind: 'unit', team: 'player', hp: 280, maxHp: 280, armor: 1, damage: '22-26', position: { x: 3, y: 0, z: 5 }, commands: ['Move', 'Stop', 'Hold', 'Attack'], iconEmoji: '🏹' },
  { id: 'enemy1', name: 'Orc Raider', kind: 'unit', team: 'enemy', hp: 520, maxHp: 520, armor: 2, damage: '19-24', position: { x: 15, y: 0, z: -8 }, commands: [], iconEmoji: '👹' },
  { id: 'enemy2', name: 'Orc Tower', kind: 'building', team: 'enemy', hp: 800, maxHp: 800, armor: 4, damage: '30-40', position: { x: 20, y: 0, z: -15 }, commands: [], iconEmoji: '🗼' },
];

export default function RtsBuilder() {
  const [state, setState] = useState<InteractionState>(createInitialState());
  const [entities, setEntities] = useState<RTSEntity[]>(DEMO_ENTITIES);
  const [fps, setFps] = useState(60);

  // FPS counter
  useEffect(() => {
    let frames = 0, last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      setFps(Math.round(frames / ((now - last) / 1000)));
      frames = 0; last = now;
    }, 1000);
    const raf = () => { frames++; requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    return () => clearInterval(interval);
  }, []);

  // Keyboard
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      setState(s => handleKeyDown(s, e.key));
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  // Entity click
  const onEntityClick = useCallback((id: string) => {
    const ent = entities.find(e => e.id === id);
    if (!ent) return;

    if (state.mode === 'attack' && ent.team === 'enemy') {
      const selectedAllies = entities.filter(e => state.selectedIds.includes(e.id) && e.team === 'player');
      if (selectedAllies.length > 0) {
        setState(s => addLog(s, `Attack order: ${selectedAllies.map(u => u.name).join(', ')} → ${ent.name}`, 'danger'));
        // Move units toward enemy
        setEntities(prev => prev.map(e => {
          if (state.selectedIds.includes(e.id) && e.team === 'player') {
            return { ...e, position: { x: ent.position.x + (Math.random() - 0.5) * 4, y: 0, z: ent.position.z + (Math.random() - 0.5) * 4 } };
          }
          return e;
        }));
      } else {
        setState(s => addLog(s, 'Select allied units before issuing attack.', 'warn'));
      }
      return;
    }

    if (state.mode === 'move' && ent.team === 'enemy') {
      setState(s => addLog(s, 'Cannot move to enemy. Press A to attack.', 'warn'));
      return;
    }

    setState(s => {
      const newState = selectSingle(s, id);
      return addLog(newState, `Selected ${ent.name}${ent.kind === 'building' ? ' (building)' : ''}.`);
    });
  }, [entities, state.mode, state.selectedIds]);

  // Ground click
  const onGroundClick = useCallback((pos: { x: number; y: number; z: number }) => {
    if (state.mode === 'move') {
      const selectedAllies = entities.filter(e => state.selectedIds.includes(e.id) && e.team === 'player' && e.kind === 'unit');
      if (selectedAllies.length > 0) {
        const cols = Math.ceil(Math.sqrt(selectedAllies.length));
        setEntities(prev => prev.map(e => {
          const idx = selectedAllies.findIndex(a => a.id === e.id);
          if (idx === -1) return e;
          const row = Math.floor(idx / cols), col = idx % cols;
          return { ...e, position: { x: pos.x + (col - (cols - 1) / 2) * 3, y: 0, z: pos.z + row * 3 } };
        }));
        setState(s => addLog(s, `Move order: ${selectedAllies.length} unit${selectedAllies.length > 1 ? 's' : ''} to (${pos.x.toFixed(0)}, ${pos.z.toFixed(0)}).`));
      } else {
        setState(s => addLog(s, 'Select units first.', 'warn'));
      }
      return;
    }

    // Default: clear selection on empty ground click
    setState(s => clearSelection(s));
  }, [state.mode, state.selectedIds, entities]);

  // Drag
  const onDragStart = useCallback((x: number, y: number) => setState(s => startDrag(s, x, y)), []);
  const onDragMove = useCallback((x: number, y: number) => setState(s => updateDrag(s, x, y)), []);
  const onDragEnd = useCallback((boxIds: string[]) => {
    setState(s => {
      let newState = endDrag(s);
      if (boxIds.length > 0) newState = selectMany(newState, boxIds);
      return newState;
    });
  }, []);

  // Hover
  const onHoverEntity = useCallback((id: string | null) => setState(s => setHover(s, id)), []);

  // Command from HUD
  const onCommand = useCallback((key: string) => {
    setState(s => handleKeyDown(s, key));
  }, []);

  // Place asset from browser
  const onPlaceAsset = useCallback((asset: AssetEntry) => {
    const id = `placed_${nextEntityId++}`;
    const newEntity: RTSEntity = {
      id,
      name: asset.name,
      kind: asset.type === 'building' ? 'building' : 'unit',
      team: 'player',
      hp: asset.type === 'building' ? 800 : 300,
      maxHp: asset.type === 'building' ? 800 : 300,
      armor: asset.type === 'building' ? 3 : 2,
      damage: asset.type === 'building' ? '20-30' : '10-15',
      position: { x: (Math.random() - 0.5) * 20, y: 0, z: (Math.random() - 0.5) * 10 + 5 },
      commands: asset.type === 'building' ? ['Build', 'Upgrade'] : ['Move', 'Attack', 'Stop'],
      modelPath: asset.path || asset.url,
      iconEmoji: asset.iconEmoji || (asset.type === 'building' ? '🏗️' : '⚔️'),
    };
    setEntities(prev => [...prev, newEntity]);
    setState(s => addLog(s, `Placed ${asset.name} on the battlefield.`, 'success'));
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#0b1320] overflow-hidden" data-testid="page-rts-builder">
      {/* Top Resource Bar */}
      <ResourceBar state={state} fps={fps} />

      {/* Main Content: 3D Viewport + Asset Browser */}
      <div className="flex flex-1 min-h-0">
        {/* 3D Viewport (70%) */}
        <div className="flex-[7] min-w-0 relative">
          <RTSTestbed
            interactionState={state}
            entities={entities}
            onEntityClick={onEntityClick}
            onGroundClick={onGroundClick}
            onDragStart={onDragStart}
            onDragMove={onDragMove}
            onDragEnd={onDragEnd}
            onHoverEntity={onHoverEntity}
          />
        </div>

        {/* Right Panel: Asset Browser + Combat Log (30%) */}
        <div className="flex-[3] min-w-[280px] max-w-[400px] flex flex-col border-l border-[#333]">
          <div className="flex-1 min-h-0">
            <AssetBrowser onPlaceAsset={onPlaceAsset} />
          </div>
          <div className="h-[160px] border-t border-[#333] bg-card p-2 overflow-hidden">
            <div className="text-xs font-bold text-zinc-300 mb-1">Combat / Event Log</div>
            <CombatLog log={state.log} />
          </div>
        </div>
      </div>

      {/* Bottom WC3 HUD */}
      <StrategyHUD state={state} entities={entities} fps={fps} onCommand={onCommand} />
    </div>
  );
}
