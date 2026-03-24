/**
 * ============================================================================
 * GRUDGE ENGINE — Dev Inspector Panel
 * ============================================================================
 * Ported from Online-Multiplayer-Game arena/index.html Dev Inspector.
 *
 * 6-tab developer panel for testing assets in any Grudge game mode.
 * Toggle with backtick (`) key.
 *
 * Tabs: Animations | Models | Collision | Player | NPC | Hotkeys
 */

import { useState, useCallback, useEffect } from 'react';
import {
  ANIMATION_CATALOG,
  getAnimationsByCategory,
  getCategories,
  type AnimationCategory,
} from './animation-library';
import { RACE_IDS, RACES, type RaceId } from './race-config';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DevInspectorProps {
  visible: boolean;
  onClose: () => void;
  /** Called when user plays an animation by name */
  onPlayAnimation?: (name: string, loop: boolean) => void;
  /** Called when user wants to load a model by URL */
  onLoadModel?: (url: string) => void;
  /** Called when user spawns an NPC */
  onSpawnNPC?: (race: RaceId, faction: 'enemy' | 'ally' | 'neutral') => void;
  /** Called when user clears NPCs */
  onClearNPCs?: () => void;
  /** Called when user changes player stat */
  onPlayerStatChange?: (stat: string, value: number) => void;
  /** Called when user toggles collision visualization */
  onToggleCollisionVis?: (visible: boolean) => void;
  /** Current player stats for display */
  playerStats?: { health: number; mana: number; damage: number; speed: number };
}

type TabId = 'animations' | 'models' | 'collision' | 'player' | 'npc' | 'hotkeys';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DevInspector({
  visible,
  onClose,
  onPlayAnimation,
  onLoadModel,
  onSpawnNPC,
  onClearNPCs,
  onPlayerStatChange,
  onToggleCollisionVis,
  playerStats,
}: DevInspectorProps) {
  const [activeTab, setActiveTab] = useState<TabId>('animations');
  const [animFilter, setAnimFilter] = useState<AnimationCategory | 'all'>('all');
  const [selectedAnim, setSelectedAnim] = useState<string | null>(null);
  const [animSpeed, setAnimSpeed] = useState(1.0);
  const [blendTime, setBlendTime] = useState(0.15);
  const [modelPath, setModelPath] = useState('');
  const [modelScale, setModelScale] = useState(1.0);
  const [showColliders, setShowColliders] = useState(false);
  const [npcRace, setNpcRace] = useState<RaceId>('human');
  const [npcFaction, setNpcFaction] = useState<'enemy' | 'ally' | 'neutral'>('enemy');
  const [godMode, setGodMode] = useState(false);

  const filteredAnims = animFilter === 'all'
    ? ANIMATION_CATALOG
    : getAnimationsByCategory(animFilter);

  if (!visible) return null;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'animations', label: 'Animations' },
    { id: 'models', label: 'Models' },
    { id: 'collision', label: 'Collision' },
    { id: 'player', label: 'Player' },
    { id: 'npc', label: 'NPC' },
    { id: 'hotkeys', label: 'Hotkeys' },
  ];

  const categoryBadge = (cat: AnimationCategory) => {
    const colors: Record<AnimationCategory, string> = {
      combat: 'bg-red-900/60 text-red-400',
      movement: 'bg-green-900/60 text-green-400',
      magic: 'bg-blue-900/60 text-blue-400',
      emotes: 'bg-yellow-900/60 text-yellow-400',
      reactions: 'bg-purple-900/60 text-purple-400',
      general: 'bg-stone-700 text-stone-400',
    };
    return colors[cat] || colors.general;
  };

  return (
    <div className="fixed top-12 right-3 w-96 max-h-[calc(100vh-80px)] bg-[#141420]/95 border-2 border-blue-500 rounded-lg z-[2000] font-mono text-xs flex flex-col overflow-hidden shadow-[0_0_20px_rgba(68,136,255,0.3)]">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 bg-gradient-to-b from-[#2a2a40] to-[#1a1a2a] border-b border-blue-500">
        <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">Dev Inspector</span>
        <button onClick={onClose} className="text-red-400 text-lg hover:text-red-300 px-1">&times;</button>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#1a1a25] border-b border-stone-700 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-[11px] uppercase transition-all ${
              activeTab === tab.id
                ? 'text-blue-400 bg-blue-500/20 border-b-2 border-blue-500'
                : 'text-stone-500 hover:text-white hover:bg-blue-500/10'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ── Animations Tab ── */}
        {activeTab === 'animations' && (
          <>
            <Section title="Animation Library">
              <Row label="Filter">
                <select
                  value={animFilter}
                  onChange={(e) => setAnimFilter(e.target.value as any)}
                  className="dev-select"
                >
                  <option value="all">All</option>
                  {getCategories().map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Row>
              <div className="max-h-36 overflow-y-auto bg-[#0a0a15] border border-stone-700 rounded mt-1">
                {filteredAnims.map((anim) => (
                  <div
                    key={anim.name}
                    onClick={() => setSelectedAnim(anim.name)}
                    className={`px-2 py-1 cursor-pointer border-b border-stone-800 flex justify-between items-center hover:bg-blue-500/20 ${
                      selectedAnim === anim.name ? 'bg-blue-500/30 text-blue-400' : 'text-stone-300'
                    }`}
                  >
                    <span>{anim.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${categoryBadge(anim.category)}`}>
                      {anim.category}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-1 mt-2">
                <button onClick={() => selectedAnim && onPlayAnimation?.(selectedAnim, false)} className="dev-btn-primary">Play</button>
                <button onClick={() => selectedAnim && onPlayAnimation?.(selectedAnim, true)} className="dev-btn">Loop</button>
                <button onClick={() => onPlayAnimation?.('idle', true)} className="dev-btn">Stop</button>
              </div>
            </Section>
            <Section title="Settings">
              <Row label="Speed">
                <input type="range" min="0.1" max="3" step="0.1" value={animSpeed} onChange={(e) => setAnimSpeed(+e.target.value)} className="dev-slider" />
                <span className="w-10 text-right">{animSpeed.toFixed(1)}x</span>
              </Row>
              <Row label="Blend">
                <input type="range" min="0" max="1" step="0.05" value={blendTime} onChange={(e) => setBlendTime(+e.target.value)} className="dev-slider" />
                <span className="w-10 text-right">{blendTime.toFixed(2)}s</span>
              </Row>
            </Section>
            <Section title="Stats">
              <div className="grid grid-cols-2 gap-1">
                <Stat label="Total" value={ANIMATION_CATALOG.length.toString()} />
                <Stat label="Filtered" value={filteredAnims.length.toString()} />
                <Stat label="Categories" value={getCategories().length.toString()} />
                <Stat label="Selected" value={selectedAnim || 'none'} />
              </div>
            </Section>
          </>
        )}

        {/* ── Models Tab ── */}
        {activeTab === 'models' && (
          <>
            <Section title="Model Loader">
              <Row label="Path">
                <input type="text" value={modelPath} onChange={(e) => setModelPath(e.target.value)} placeholder="/public-objects/characters/..." className="dev-input" />
              </Row>
              <div className="flex gap-1 mt-1">
                <button onClick={() => modelPath && onLoadModel?.(modelPath)} className="dev-btn-primary">Load Model</button>
              </div>
              <div className="mt-2 text-stone-500">Quick Load:</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {RACE_IDS.map((r) => (
                  <button key={r} onClick={() => onLoadModel?.(RACES[r].modelUrl)} className="dev-btn text-[10px] capitalize">{r}</button>
                ))}
              </div>
            </Section>
            <Section title="Transform">
              <Row label="Scale">
                <input type="range" min="0.01" max="5" step="0.01" value={modelScale} onChange={(e) => setModelScale(+e.target.value)} className="dev-slider" />
                <span className="w-10 text-right">{modelScale.toFixed(2)}</span>
              </Row>
            </Section>
          </>
        )}

        {/* ── Collision Tab ── */}
        {activeTab === 'collision' && (
          <Section title="Collision Visualization">
            <Row label="Show Colliders">
              <Toggle active={showColliders} onClick={() => { setShowColliders(!showColliders); onToggleCollisionVis?.(!showColliders); }} />
            </Row>
            <div className="mt-2 text-stone-500 text-[10px]">
              Layers: PLAYER(2) ENEMY(4) PROJECTILE(8) ENV(16) NPC(64)
            </div>
          </Section>
        )}

        {/* ── Player Tab ── */}
        {activeTab === 'player' && (
          <>
            <Section title="Player Stats">
              <Row label="Health">
                <input type="number" value={playerStats?.health ?? 100} onChange={(e) => onPlayerStatChange?.('health', +e.target.value)} className="dev-input w-20" />
                <button onClick={() => onPlayerStatChange?.('health', 100)} className="dev-btn">Heal</button>
              </Row>
              <Row label="Mana">
                <input type="number" value={playerStats?.mana ?? 100} onChange={(e) => onPlayerStatChange?.('mana', +e.target.value)} className="dev-input w-20" />
                <button onClick={() => onPlayerStatChange?.('mana', 100)} className="dev-btn">Restore</button>
              </Row>
              <Row label="Damage">
                <input type="number" value={playerStats?.damage ?? 50} onChange={(e) => onPlayerStatChange?.('damage', +e.target.value)} className="dev-input w-20" />
              </Row>
            </Section>
            <Section title="Abilities">
              <div className="flex gap-1">
                <button onClick={() => onPlayerStatChange?.('resetCooldowns', 0)} className="dev-btn-danger">Reset CDs</button>
                <button onClick={() => { setGodMode(!godMode); onPlayerStatChange?.('godMode', godMode ? 0 : 1); }} className={godMode ? 'dev-btn-success' : 'dev-btn'}>
                  God Mode {godMode ? 'ON' : 'OFF'}
                </button>
              </div>
            </Section>
          </>
        )}

        {/* ── NPC Tab ── */}
        {activeTab === 'npc' && (
          <>
            <Section title="NPC Spawner">
              <Row label="Race">
                <select value={npcRace} onChange={(e) => setNpcRace(e.target.value as RaceId)} className="dev-select">
                  {RACE_IDS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Row>
              <Row label="Faction">
                <select value={npcFaction} onChange={(e) => setNpcFaction(e.target.value as any)} className="dev-select">
                  <option value="enemy">Enemy</option>
                  <option value="ally">Ally</option>
                  <option value="neutral">Neutral</option>
                </select>
              </Row>
              <div className="flex gap-1 mt-1">
                <button onClick={() => onSpawnNPC?.(npcRace, npcFaction)} className="dev-btn-primary">Spawn NPC</button>
                <button onClick={onClearNPCs} className="dev-btn-danger">Clear All</button>
              </div>
            </Section>
          </>
        )}

        {/* ── Hotkeys Tab ── */}
        {activeTab === 'hotkeys' && (
          <>
            <Section title="Emote Hotkeys (6-0)">
              {['6: Hip Hop Dance', '7: Silly Dancing', '8: Taunt', '9: Victory', '0: Wave'].map((h) => (
                <div key={h} className="text-stone-400 py-0.5">{h}</div>
              ))}
            </Section>
            <Section title="Ability Bindings">
              {['Q: Primary Attack', 'E: AoE / Combo', 'R: Heavy / Spell', 'F: Utility / Blink', 'P: Ultimate'].map((h) => (
                <div key={h} className="text-stone-400 py-0.5">{h}</div>
              ))}
            </Section>
            <Section title="Controller (Xbox/PS)">
              {['A/Cross: Jump', 'B/Circle: Dodge', 'X/Square: Attack', 'Y/Triangle: Combo', 'LB: Block', 'RB: Cast'].map((h) => (
                <div key={h} className="text-stone-400 py-0.5">{h}</div>
              ))}
            </Section>
          </>
        )}
      </div>

      {/* Inline styles for dev inspector controls */}
      <style>{`
        .dev-select { flex:1; background:#1a1a25; border:1px solid #444; border-radius:3px; padding:4px 8px; color:#fff; font-size:11px; }
        .dev-input { flex:1; background:#1a1a25; border:1px solid #444; border-radius:3px; padding:4px 8px; color:#fff; font-size:11px; }
        .dev-input:focus { border-color:#4488ff; outline:none; }
        .dev-slider { flex:1; height:4px; accent-color:#4488ff; }
        .dev-btn { padding:4px 10px; background:linear-gradient(180deg,#3a3a50,#2a2a40); border:1px solid #555; border-radius:3px; color:#fff; font-size:11px; cursor:pointer; }
        .dev-btn:hover { border-color:#4488ff; }
        .dev-btn-primary { padding:4px 10px; background:linear-gradient(180deg,#4488ff,#3366cc); border:1px solid #4488ff; border-radius:3px; color:#fff; font-size:11px; cursor:pointer; }
        .dev-btn-danger { padding:4px 10px; background:linear-gradient(180deg,#aa4444,#882222); border:1px solid #ff4444; border-radius:3px; color:#fff; font-size:11px; cursor:pointer; }
        .dev-btn-success { padding:4px 10px; background:linear-gradient(180deg,#44aa44,#228822); border:1px solid #44ff44; border-radius:3px; color:#fff; font-size:11px; cursor:pointer; }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-black/30 rounded p-2.5">
      <div className="text-[11px] text-yellow-500 uppercase mb-2 pb-1 border-b border-stone-700">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="w-24 text-stone-500 text-[11px] shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#1a1a25] px-2 py-1 rounded flex justify-between">
      <span className="text-stone-500">{label}</span>
      <span className="text-blue-400 font-bold">{value}</span>
    </div>
  );
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`relative w-10 h-5 rounded-full cursor-pointer transition-colors ${active ? 'bg-blue-500' : 'bg-stone-700'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${active ? 'left-[22px]' : 'left-0.5'}`} />
    </div>
  );
}
