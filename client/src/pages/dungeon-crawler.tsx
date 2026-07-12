import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import {
  HEROES, CLASS_ABILITIES, CLASS_COLORS, ITEMS, ItemDef, RACE_COLORS
} from '@/game/dungeon-crawler/types';
import {
  DungeonState, DungeonHudState,
  createDungeonState, updateDungeon, getDungeonHudState,
  DungeonRenderer, handleDungeonAbility, handleDungeonAttack
} from '@/game/dungeon-crawler/dungeon';
import { EFFECT_COLORS, StatusEffect } from '@/game/dungeon-crawler/combat';
import {
  loadKeybindings, matchesKeyDown, KeybindAction
} from '@/game/dungeon-crawler/keybindings';
import { logDungeonRun } from '@/lib/dungeon-api';
import { getAuthData } from '@/lib/auth';

export default function DungeonCrawlerPage() {
  const [, setLocation] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<DungeonState | null>(null);
  const rendererRef = useRef<DungeonRenderer | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const [hud, setHud] = useState<DungeonHudState | null>(null);
  const [heroId, setHeroId] = useState<number>(-1);
  const [selectingHero, setSelectingHero] = useState(true);
  const startTimeRef = useRef<number>(0);
  const reportedRef = useRef(false);

  // ── Hero selection phase ────────────────────────────────────
  if (selectingHero) {
    return (
      <HeroSelectScreen
        onSelect={(id) => {
          setHeroId(id);
          setSelectingHero(false);
          localStorage.setItem('grudge_hero_id', String(id));
        }}
        onBack={() => setLocation('/games')}
      />
    );
  }

  // ── Game loop ───────────────────────────────────────────────
  useEffect(() => {
    if (heroId < 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const state = createDungeonState(heroId);
    stateRef.current = state;
    startTimeRef.current = Date.now();
    reportedRef.current = false;
    const renderer = new DungeonRenderer(canvas);
    rendererRef.current = renderer;

    let lastTime = performance.now();
    let hudTimer = 0;
    let animId = 0;

    const gameLoop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      const dt = Math.min(rawDt, 0.05);
      lastTime = now;

      updateDungeon(state, dt, keysRef.current);
      renderer.render(state);

      hudTimer += dt;
      if (hudTimer > 0.1) {
        hudTimer = 0;
        const h = getDungeonHudState(state);
        setHud(h);

        // Report run to backend on game over (once)
        if (h.gameOver && !reportedRef.current) {
          reportedRef.current = true;
          const heroData = HEROES.find(hero => hero.id === heroId);
          const auth = getAuthData();
          if (auth) {
            logDungeonRun({
              hero_id: heroId,
              hero_name: heroData?.name || 'Unknown',
              hero_class: heroData?.heroClass || 'Unknown',
              floors_reached: h.floor,
              kills: h.kills,
              gold_earned: h.gold,
              duration_ms: Date.now() - startTimeRef.current,
              outcome: h.gameWon ? 'cleared' : 'died',
            }).catch(() => {}); // silently fail — game still works offline
          }
        }
      }
      animId = requestAnimationFrame(gameLoop);
    };
    animId = requestAnimationFrame(gameLoop);

    const bindings = loadKeybindings();

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current.add(key);

      if (matchesKeyDown(bindings[KeybindAction.Ability1], e)) handleDungeonAbility(state, 0);
      else if (matchesKeyDown(bindings[KeybindAction.Ability2], e)) handleDungeonAbility(state, 1);
      else if (matchesKeyDown(bindings[KeybindAction.Ability3], e)) handleDungeonAbility(state, 2);
      else if (matchesKeyDown(bindings[KeybindAction.Ability4], e)) handleDungeonAbility(state, 3);

      if (matchesKeyDown(bindings[KeybindAction.Attack], e)) handleDungeonAttack(state);
      if (key === 'i') state.showInventory = !state.showInventory;
      if (matchesKeyDown(bindings[KeybindAction.Pause], e)) { state.showInventory = false; state.paused = !state.paused; }
    };

    const onKeyUp = (e: KeyboardEvent) => { keysRef.current.delete(e.key.toLowerCase()); };

    const onClick = (e: MouseEvent) => {
      if (e.button === 0) handleDungeonAttack(state);
    };

    const onWheel = (e: WheelEvent) => {
      state.camera.zoom = Math.max(0.6, Math.min(2.5, state.camera.zoom - e.deltaY * 0.001));
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('click', onClick);
    canvas.addEventListener('wheel', onWheel);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('click', onClick);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [heroId]);

  const heroData = HEROES.find(h => h.id === heroId);
  const abilities = heroData ? CLASS_ABILITIES[heroData.heroClass] || [] : [];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black" data-testid="dungeon-crawler-page">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" data-testid="canvas-dungeon" />

      {hud && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 9999, fontFamily: "'Oxanium', sans-serif" }}>

          <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center" data-testid="panel-dungeon-top"
            style={{
              background: 'linear-gradient(to bottom, rgba(15,10,5,0.95), rgba(10,5,0,0.85))',
              borderBottom: '2px solid #c5a059',
              borderLeft: '1px solid #c5a059',
              borderRight: '1px solid #c5a059',
              borderRadius: '0 0 12px 12px',
              padding: '6px 20px',
              gap: 16,
              boxShadow: '0 4px 20px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(197,160,89,0.2)'
            }}
          >
            <span className="text-sm text-[#c5a059] font-bold" style={{ textShadow: '0 0 10px rgba(197,160,89,0.3)' }}>Floor {hud.floor}</span>
            <div style={{ width: 1, height: 16, background: '#c5a059', opacity: 0.3 }} />
            <span className="text-xs text-gray-300">Kills: <span className="text-green-400 font-bold">{hud.kills}</span></span>
            <div style={{ width: 1, height: 16, background: '#c5a059', opacity: 0.3 }} />
            <span className="text-xs font-bold" style={{ color: '#ffd700' }}>{hud.gold}g</span>
          </div>

          {hud.activeEffects.length > 0 && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 flex gap-1" data-testid="panel-active-effects">
              {hud.activeEffects.map((eff: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[10px]"
                  style={{ background: 'rgba(0,0,0,0.7)', border: `1px solid ${eff.color}`, color: eff.color }}
                  title={`${eff.name} (${eff.remaining.toFixed(1)}s)`}
                >
                  <span>{eff.icon}</span>
                  <span>{Math.ceil(eff.remaining)}s</span>
                </div>
              ))}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 flex items-end pointer-events-auto" style={{ padding: '0 8px 8px 8px', gap: 8 }}>

            <div className="flex flex-col" style={{ width: 200, flexShrink: 0 }}>
              <div
                className="flex flex-col text-xs overflow-y-auto"
                style={{
                  height: 120,
                  background: 'linear-gradient(to bottom, rgba(20,15,10,0.95), rgba(8,5,0,0.95))',
                  border: '1px solid #c5a059',
                  borderRadius: 4,
                  padding: '8px 10px',
                  boxShadow: '0 0 20px rgba(0,0,0,0.9), inset 0 0 15px rgba(0,0,0,0.5)'
                }}
                data-testid="panel-dungeon-log"
              >
                <div style={{ color: '#c5a059', fontSize: 10, marginBottom: 4 }}>DUNGEON LOG</div>
                {hud.killFeed.slice(-6).map((k: any, i: number) => (
                  <div key={i} style={{ color: k.color, fontSize: 10, lineHeight: 1.4 }}>{k.text}</div>
                ))}
              </div>
            </div>

            <div className="flex-1 flex justify-center" style={{ minWidth: 0 }}>
              <div
                className="flex flex-col items-center relative"
                style={{
                  background: 'linear-gradient(to bottom, rgba(20,15,10,0.96), rgba(8,5,0,0.96))',
                  border: '2px solid #c5a059',
                  borderRadius: 6,
                  padding: '10px 14px 8px 14px',
                  maxWidth: 540,
                  width: '100%',
                  boxShadow: '0 -4px 30px rgba(0,0,0,0.9), inset 0 0 20px rgba(0,0,0,0.4), 0 0 1px rgba(197,160,89,0.4)',
                }}
                data-testid="panel-dungeon-hotbar"
              >
                <div className="flex items-center w-full mb-1.5" style={{ gap: 8 }}>
                  <div className="flex items-center" style={{ gap: 4, flex: 1 }}>
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-black"
                      style={{
                        background: `linear-gradient(135deg, ${CLASS_COLORS[hud.heroClass] || '#333'}, ${CLASS_COLORS[hud.heroClass] || '#333'}88)`,
                        border: '2px solid #c5a059',
                        color: '#fff',
                        textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                      }}
                    >
                      {hud.heroClass.charAt(0)}
                    </div>
                    <div className="flex flex-col" style={{ gap: 2, flex: 1 }}>
                      <div className="flex items-center" style={{ gap: 4 }}>
                        <div className="h-3 rounded-sm overflow-hidden" style={{ flex: 1, background: '#200', border: '1px solid #500' }}>
                          <div className="h-full transition-all" style={{ width: `${(hud.hp / hud.maxHp) * 100}%`, background: 'linear-gradient(to right, #b91c1c, #ef4444)' }} data-testid="bar-dungeon-hp" />
                        </div>
                        <span className="text-[9px] text-red-300 w-16 text-right">{Math.floor(hud.hp)}/{hud.maxHp}</span>
                      </div>
                      <div className="flex items-center" style={{ gap: 4 }}>
                        <div className="h-3 rounded-sm overflow-hidden" style={{ flex: 1, background: '#002', border: '1px solid #005' }}>
                          <div className="h-full transition-all" style={{ width: `${(hud.mp / hud.maxMp) * 100}%`, background: 'linear-gradient(to right, #1e40af, #3b82f6)' }} data-testid="bar-dungeon-mp" />
                        </div>
                        <span className="text-[9px] text-blue-300 w-16 text-right">{Math.floor(hud.mp)}/{hud.maxMp}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center" style={{ gap: 1 }}>
                    <span className="text-sm text-[#c5a059] font-black">Lv{hud.level}</span>
                    <div className="h-1 rounded-full overflow-hidden" style={{ width: 40, background: '#333' }}>
                      <div className="h-full transition-all" style={{ width: `${(hud.xp / hud.xpToNext) * 100}%`, background: 'linear-gradient(to right, #ca8a04, #eab308)' }} data-testid="bar-dungeon-xp" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center" style={{ gap: 4 }}>
                  {abilities.map((ab: any, i: number) => {
                    const cd = hud.abilityCooldowns[i] || 0;
                    const onCd = cd > 0;
                    return (
                      <button
                        key={i}
                        className="relative flex items-center justify-center font-bold text-white"
                        style={{
                          width: 50, height: 50,
                          background: onCd ? 'linear-gradient(135deg, #1a1a1a, #0a0a0a)' : `linear-gradient(135deg, ${CLASS_COLORS[hud.heroClass] || '#333'}, ${CLASS_COLORS[hud.heroClass] || '#333'}88)`,
                          border: `2px solid ${onCd ? '#333' : '#c5a059'}`,
                          borderRadius: 4,
                          boxShadow: 'inset 0 0 8px rgba(0,0,0,0.6)',
                          opacity: onCd ? 0.6 : 1,
                          cursor: 'pointer',
                          transition: 'all 0.1s'
                        }}
                        onClick={() => stateRef.current && handleDungeonAbility(stateRef.current, i)}
                        title={`${ab.name}: ${ab.description}`}
                        data-testid={`button-dungeon-ability-${i}`}
                      >
                        <span className="absolute text-[9px] font-bold" style={{ top: 2, left: 4, color: '#888' }}>{ab.key}</span>
                        <span className="text-xs font-black" style={{ textShadow: '0 1px 2px #000' }}>{ab.name.substring(0, 2)}</span>
                        {onCd && (
                          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', borderRadius: 2 }}>
                            <span className="text-sm font-black text-white" style={{ textShadow: '0 0 4px #000' }}>{Math.ceil(cd)}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                  <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, transparent, #c5a059, transparent)', margin: '0 4px' }} />
                  {hud.items.map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-center"
                      style={{
                        width: 38, height: 50,
                        background: item ? 'linear-gradient(135deg, #1a1a2e, #0a0a15)' : 'linear-gradient(135deg, #0a0a0a, #050505)',
                        border: `1px solid ${item ? '#c5a05980' : '#222'}`,
                        borderRadius: 3,
                        color: item ? '#c5a059' : '#333',
                        fontSize: 9,
                        fontWeight: 'bold'
                      }}
                      title={item?.name}
                      data-testid={`slot-dungeon-item-${i}`}
                    >
                      {item ? item.name.split(' ').map((w: string) => w[0]).join('') : ''}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end" style={{ width: 180, flexShrink: 0 }}>
              <div
                className="w-full flex"
                style={{
                  background: 'linear-gradient(to bottom, rgba(20,15,10,0.95), rgba(8,5,0,0.95))',
                  border: '1px solid #c5a059',
                  borderRadius: 4,
                  padding: '8px 10px',
                  gap: 10,
                  boxShadow: '0 0 20px rgba(0,0,0,0.9), inset 0 0 15px rgba(0,0,0,0.5)'
                }}
                data-testid="panel-dungeon-stats"
              >
                <div className="flex flex-col items-center" style={{ gap: 4 }}>
                  <div className="rounded-lg flex items-center justify-center text-sm font-black"
                    style={{
                      width: 38, height: 38,
                      background: `linear-gradient(135deg, ${CLASS_COLORS[hud.heroClass] || '#333'}, #111)`,
                      border: '2px solid #c5a059',
                      color: '#fff'
                    }}
                  >
                    {hud.heroClass.charAt(0)}
                  </div>
                  <span className="text-[10px] font-bold" style={{ color: '#ffd700' }}>{hud.gold}g</span>
                </div>
                <div className="flex-1" style={{ fontSize: 10 }}>
                  <div className="font-bold truncate" style={{ color: '#c5a059', fontSize: 11, marginBottom: 4, borderBottom: '1px solid #333', paddingBottom: 3 }}>{hud.heroName.split(' ').pop()}</div>
                  <div style={{ color: '#888' }}>ATK <span className="font-bold" style={{ color: '#fbbf24' }}>{hud.atk}</span></div>
                  <div style={{ color: '#888' }}>DEF <span className="font-bold" style={{ color: '#60a5fa' }}>{hud.def}</span></div>
                  <div style={{ color: '#888' }}>SPD <span className="font-bold" style={{ color: '#4ade80' }}>{hud.spd}</span></div>
                </div>
              </div>
            </div>
          </div>

          {hud.gameOver && (
            <DungeonGameOver
              hud={hud}
              onReturn={() => { setSelectingHero(true); setHud(null); }}
              onRetry={() => {
                stateRef.current = null;
                setHud(null);
                reportedRef.current = false;
                // Re-trigger useEffect
                setHeroId(-1);
                setTimeout(() => setHeroId(heroId), 0);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Hero Selection (inline) ───────────────────────────────────

const RACES = ['All', 'Human', 'Barbarian', 'Dwarf', 'Elf', 'Orc', 'Undead'];
const CLASSES = ['All', 'Warrior', 'Worg', 'Mage', 'Ranger'];
const RARITY_COLORS: Record<string, string> = {
  Common: '#9ca3af', Uncommon: '#22c55e', Rare: '#3b82f6', Epic: '#a855f7', Legendary: '#ffd700'
};
const FACTION_COLORS: Record<string, string> = {
  Crusade: '#ef4444', Fabled: '#06b6d4', Legion: '#a855f7', Pirates: '#d4a017'
};

function HeroSelectScreen({ onSelect, onBack }: { onSelect: (id: number) => void; onBack: () => void }) {
  const [selectedHero, setSelectedHero] = useState<any | null>(null);
  const [raceFilter, setRaceFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');

  const filteredHeroes = HEROES.filter(h => {
    if (raceFilter !== 'All' && h.race !== raceFilter) return false;
    if (classFilter !== 'All' && h.heroClass !== classFilter) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-[#0a0f0a] text-white">
      <div className="sticky top-0 z-50 bg-[#0a0f0a]/95 backdrop-blur border-b border-[#c5a059]/30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-wider" style={{ fontFamily: "'Oxanium', sans-serif", color: '#c5a059' }}>
            HERO SELECT — DUNGEON CRAWLER
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-500 text-sm">{filteredHeroes.length} heroes</span>
            <button className="px-3 py-1 text-sm border border-gray-600 rounded hover:border-gray-400 text-gray-400" onClick={onBack}>Back</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-3 flex-wrap mb-3">
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-500 mr-1">Race:</span>
            {RACES.map(r => (
              <button key={r} className={`px-3 py-1 text-xs rounded border transition-all ${raceFilter === r ? 'border-[#c5a059] text-[#c5a059] bg-[#c5a059]/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`} onClick={() => setRaceFilter(r)}>{r}</button>
            ))}
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-xs text-gray-500 mr-1">Class:</span>
            {CLASSES.map(c => (
              <button key={c} className={`px-3 py-1 text-xs rounded border transition-all ${classFilter === c ? 'border-[#c5a059] text-[#c5a059] bg-[#c5a059]/10' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`} onClick={() => setClassFilter(c)}>{c}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            {filteredHeroes.map(hero => {
              const isSelected = selectedHero?.id === hero.id;
              const rarityColor = RARITY_COLORS[hero.rarity] || '#888';
              return (
                <div
                  key={hero.id}
                  className={`cursor-pointer transition-all overflow-hidden bg-[#1a1a2e] border rounded-lg p-3 hover:border-[#c5a059]/50 ${isSelected ? 'border-[#c5a059] ring-1 ring-[#c5a059]/30' : 'border-gray-800'}`}
                  onClick={() => setSelectedHero(hero)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded flex items-center justify-center text-xs font-black"
                      style={{ background: `linear-gradient(135deg, ${CLASS_COLORS[hero.heroClass] || '#333'}, #111)`, border: '1px solid #c5a059', color: '#fff' }}>
                      {hero.heroClass.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold truncate" style={{ color: rarityColor }}>{hero.name}</h3>
                      <p className="text-[10px] text-gray-500 italic truncate">{hero.title}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-700" style={{ color: RACE_COLORS[hero.race] }}>{hero.race}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-700" style={{ color: CLASS_COLORS[hero.heroClass] }}>{hero.heroClass}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-700" style={{ color: FACTION_COLORS[hero.faction] }}>{hero.faction}</span>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] text-gray-400">
                    <span>HP <span className="text-red-400 font-bold">{hero.hp}</span></span>
                    <span>ATK <span className="text-yellow-400 font-bold">{hero.atk}</span></span>
                    <span>DEF <span className="text-blue-400 font-bold">{hero.def}</span></span>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedHero && (
            <div className="w-72 flex-shrink-0 border border-[#c5a059]/30 rounded-lg p-4 bg-[#0f0f1a]">
              <h2 className="text-lg font-black mb-1" style={{ color: RARITY_COLORS[selectedHero.rarity] }}>{selectedHero.name}</h2>
              <p className="text-xs text-gray-500 italic mb-3">{selectedHero.title}</p>
              <p className="text-xs text-gray-400 italic mb-4 border-l-2 border-[#c5a059]/30 pl-2">"{selectedHero.quote}"</p>

              <div className="space-y-1 text-xs mb-4">
                {[['HP', selectedHero.hp, '#ef4444'], ['ATK', selectedHero.atk, '#fbbf24'], ['DEF', selectedHero.def, '#60a5fa'], ['SPD', selectedHero.spd, '#4ade80'], ['MP', selectedHero.mp, '#a855f7']].map(([label, val, color]) => (
                  <div key={label as string} className="flex items-center gap-2">
                    <span className="w-8 font-bold" style={{ color: color as string }}>{label}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${((val as number) / 270) * 100}%`, backgroundColor: color as string }} />
                    </div>
                    <span className="w-8 text-right text-gray-300">{val as number}</span>
                  </div>
                ))}
              </div>

              <button
                className="w-full py-3 bg-gradient-to-r from-red-600 to-amber-600 text-white font-bold rounded-lg hover:from-red-500 hover:to-amber-500 transition-all"
                onClick={() => onSelect(selectedHero.id)}
              >
                ENTER DUNGEON
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Game Over Overlay ─────────────────────────────────────────

function DungeonGameOver({ hud, onReturn, onRetry }: { hud: DungeonHudState; onReturn: () => void; onRetry: () => void }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 pointer-events-auto" data-testid="panel-dungeon-game-over">
      <div className="text-center">
        <h1
          className="text-5xl font-black mb-4"
          style={{
            fontFamily: "'Oxanium', sans-serif",
            color: hud.gameWon ? '#ffd700' : '#ef4444',
            textShadow: `0 0 60px ${hud.gameWon ? 'rgba(255,215,0,0.5)' : 'rgba(239,68,68,0.5)'}`
          }}
          data-testid="text-dungeon-result"
        >
          {hud.gameWon ? 'DUNGEON CLEARED!' : 'DEFEATED'}
        </h1>
        <p className="text-gray-400 text-lg mb-2">{hud.heroName}</p>
        <div className="flex gap-6 justify-center mb-6 text-lg">
          <span className="text-[#c5a059]">Floor <span className="text-2xl font-bold">{hud.floor}</span></span>
          <span className="text-green-400">Kills <span className="text-2xl font-bold">{hud.kills}</span></span>
          <span className="text-yellow-400">Gold <span className="text-2xl font-bold">{hud.gold}</span></span>
        </div>
        <div className="flex gap-3 justify-center">
          <button
            className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-800 text-white font-bold rounded-lg hover:from-amber-500 hover:to-amber-700 transition-all cursor-pointer"
            style={{ fontFamily: "'Oxanium', sans-serif" }}
            onClick={onRetry}
            data-testid="button-dungeon-retry"
          >
            RETRY
          </button>
          <button
            className="px-8 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white font-bold rounded-lg hover:from-red-500 hover:to-red-700 transition-all cursor-pointer"
            style={{ fontFamily: "'Oxanium', sans-serif" }}
            onClick={onReturn}
            data-testid="button-dungeon-return"
          >
            HERO SELECT
          </button>
        </div>
      </div>
    </div>
  );
}
