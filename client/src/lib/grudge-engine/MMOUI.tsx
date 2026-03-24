/**
 * ============================================================================
 * GRUDGE ENGINE — MMO UI Components
 * ============================================================================
 * Ported from Online-Multiplayer-Game arena/index.html MMO UI system.
 *
 * WoW-style unit frame, cast bar, buff icons, combat log,
 * and MOBA 2v2 arena team panel.
 */

import { useState, useEffect, useRef } from 'react';
import type { WeaponType, AbilityKey } from './weapon-system';
import { getWeapon, ABILITY_KEYS } from './weapon-system';
import { getRank, type ArenaStats } from './elo-rating';

// ---------------------------------------------------------------------------
// Unit Frame (Player / Target)
// ---------------------------------------------------------------------------

export interface UnitFrameProps {
  name: string;
  level: number;
  className: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina?: number;
  maxStamina?: number;
  portrait?: string;
  side?: 'left' | 'right';
  buffs?: BuffIcon[];
}

export interface BuffIcon {
  id: string;
  icon: string;
  type: 'buff' | 'debuff';
  duration?: number;
}

export function UnitFrame({
  name, level, className: cls, health, maxHealth, mana, maxMana,
  stamina, maxStamina, portrait, side = 'left', buffs = [],
}: UnitFrameProps) {
  const healthPct = Math.max(0, (health / maxHealth) * 100);
  const manaPct = Math.max(0, (mana / maxMana) * 100);
  const staminaPct = stamina && maxStamina ? Math.max(0, (stamina / maxStamina) * 100) : null;

  return (
    <div className={`fixed top-5 ${side === 'left' ? 'left-5' : 'right-5'} bg-gradient-to-b from-[#14141e]/95 to-[#0a0a14]/98 border-2 border-[#4a3c2a] rounded-lg p-2.5 min-w-[240px] z-[500] shadow-[0_4px_20px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,215,0,0.1)]`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-12 h-12 border-2 border-[#8b7355] rounded-md bg-gradient-to-br from-[#2a2a3a] to-[#1a1a2a] flex items-center justify-center text-2xl">
          {portrait || '⚔'}
        </div>
        <div className="flex-1">
          <div>
            <span className="text-sm font-bold text-[#ffd700] drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">{name}</span>
            <span className="text-[11px] text-[#aaa] ml-1.5">Lv {level}</span>
          </div>
          <div className="text-[10px] text-[#8888ff] uppercase tracking-[1px]">{cls}</div>
        </div>
      </div>

      {/* Bars */}
      <div className="flex flex-col gap-1">
        {/* Health */}
        <Bar value={healthPct} label={`${Math.floor(health)} / ${maxHealth}`} color="from-[#22cc22] to-[#44ff44]" />
        {/* Mana */}
        <Bar value={manaPct} label={`${Math.floor(mana)} / ${maxMana}`} color="from-[#2244cc] to-[#4488ff]" />
        {/* Stamina */}
        {staminaPct !== null && (
          <Bar value={staminaPct} label={`${Math.floor(stamina!)} / ${maxStamina!}`} color="from-[#cc8822] to-[#ffaa44]" />
        )}
      </div>

      {/* Buffs */}
      {buffs.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {buffs.map((b) => (
            <div key={b.id} className={`w-6 h-6 bg-[#282840]/90 border rounded text-xs flex items-center justify-center relative ${b.type === 'buff' ? 'border-green-500' : 'border-red-500'}`}>
              {b.icon}
              {b.duration && <span className="absolute -bottom-0.5 -right-0.5 text-[8px] bg-black/80 px-0.5 rounded">{b.duration}s</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Bar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="h-[18px] bg-black/60 rounded-[3px] overflow-hidden relative border border-white/10">
      <div className={`h-full bg-gradient-to-r ${color} transition-all duration-150`} style={{ width: `${value}%` }}>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] font-bold drop-shadow-[0_0_3px_black] whitespace-nowrap">
          {label}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cast Bar
// ---------------------------------------------------------------------------

export interface CastBarProps {
  visible: boolean;
  spellName: string;
  progress: number; // 0-1
  castTime: number; // seconds
}

export function CastBar({ visible, spellName, progress, castTime }: CastBarProps) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-[200px] left-1/2 -translate-x-1/2 w-[280px] bg-[#14141e]/95 border-2 border-[#4a3c2a] rounded-md p-2 z-[550]">
      <div className="flex justify-between mb-1">
        <span className="text-xs text-[#ffcc00]">{spellName}</span>
        <span className="text-[11px] text-[#aaa]">{(castTime * progress).toFixed(1)}s</span>
      </div>
      <div className="h-4 bg-black/50 rounded-[3px] overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#cc8800] to-[#ffcc00] transition-all duration-50" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ability Bar
// ---------------------------------------------------------------------------

export interface AbilityBarProps {
  weaponType: WeaponType;
  cooldowns: Record<AbilityKey, number>;
  onAbilityClick?: (key: AbilityKey) => void;
}

export function AbilityBar({ weaponType, cooldowns, onAbilityClick }: AbilityBarProps) {
  const weapon = getWeapon(weaponType);
  return (
    <div className="fixed bottom-[100px] left-1/2 -translate-x-1/2 flex gap-2.5 z-[400]">
      {ABILITY_KEYS.map((key) => {
        const ability = weapon.abilities[key];
        const cd = cooldowns[key];
        const onCooldown = cd > 0;
        return (
          <button
            key={key}
            onClick={() => !onCooldown && onAbilityClick?.(key)}
            className={`w-[60px] h-[60px] rounded-lg border-2 flex flex-col items-center justify-center relative cursor-pointer transition-all
              ${onCooldown ? 'bg-[#323250]/50 border-[#333] opacity-60' : 'bg-[#323250]/80 border-[#4488ff] hover:border-[#66aaff] hover:bg-[#4488ff]/30 hover:-translate-y-0.5'}
            `}
          >
            <span className="absolute top-0.5 left-1 text-[11px] font-bold text-[#ffcc00]">{key}</span>
            <span className="text-[10px] text-center mt-2 px-0.5 leading-tight">{ability.name}</span>
            {onCooldown && (
              <div className="absolute inset-0 bg-black/70 rounded-md flex items-center justify-center text-base font-bold">
                {cd.toFixed(1)}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Combat Log
// ---------------------------------------------------------------------------

export interface CombatLogEntry {
  id: string;
  text: string;
  type: 'damage' | 'heal' | 'ability' | 'info';
  timestamp: number;
}

export function CombatLog({ entries, maxEntries = 20 }: { entries: CombatLogEntry[]; maxEntries?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [entries]);

  const typeColor: Record<CombatLogEntry['type'], string> = {
    damage: 'text-red-400',
    heal: 'text-green-400',
    ability: 'text-yellow-400',
    info: 'text-stone-400',
  };

  return (
    <div className="fixed top-[100px] right-5 w-[250px] max-h-[200px] bg-black/50 rounded-lg p-2.5 text-xs z-[400]">
      <div ref={containerRef} className="overflow-y-auto max-h-[180px] scrollbar-thin scrollbar-thumb-blue-500 scrollbar-track-transparent">
        {entries.slice(-maxEntries).map((entry) => (
          <div key={entry.id} className={`py-0.5 border-b border-white/10 ${typeColor[entry.type]}`}>
            {entry.text}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arena Team Panel (2v2 MOBA)
// ---------------------------------------------------------------------------

export interface ArenaPlayer {
  name: string;
  health: number;
  maxHealth: number;
  icon: string;
  isAlly: boolean;
}

export interface TowerStatus {
  name: string;
  hp: number;
  maxHp: number;
  isAlly: boolean;
}

export interface ArenaTeamPanelProps {
  allies: ArenaPlayer[];
  enemies: ArenaPlayer[];
  towers: TowerStatus[];
}

export function ArenaTeamPanel({ allies, enemies, towers }: ArenaTeamPanelProps) {
  return (
    <div className="fixed top-5 right-5 bg-gradient-to-b from-[#140f1e]/95 to-[#0a0814]/98 border-2 border-[#5a4c3a] rounded-xl p-3 min-w-[200px] z-[500] shadow-[0_4px_20px_rgba(0,0,0,0.7)]">
      <h3 className="text-sm font-bold text-[#ffd700] text-center mb-2.5 pb-2 border-b border-[#4a3c2a]">2v2 Arena</h3>

      {/* Ally Team */}
      <TeamSection label="ALLY TEAM" isAlly={true} players={allies} />

      {/* Enemy Team */}
      <TeamSection label="ENEMY TEAM" isAlly={false} players={enemies} />

      {/* Tower Status */}
      {towers.length > 0 && (
        <div className="mt-2.5 pt-2 border-t border-[#4a3c2a]">
          <h4 className="text-[11px] text-[#aaa] mb-1.5">Tower Status</h4>
          {towers.map((t, i) => (
            <div key={i} className={`flex justify-between text-[10px] my-0.5 ${t.isAlly ? 'text-[#88ccff]' : 'text-[#ff8888]'}`}>
              <span>{t.name}</span>
              <span>{t.hp}/{t.maxHp}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TeamSection({ label, isAlly, players }: { label: string; isAlly: boolean; players: ArenaPlayer[] }) {
  return (
    <div className="mb-2.5">
      <div className={`text-[11px] font-bold mb-1 px-1.5 py-0.5 rounded-[3px] ${isAlly ? 'bg-[#4488cc]/30 text-[#88ccff]' : 'bg-[#cc4444]/30 text-[#ff8888]'}`}>
        {label}
      </div>
      {players.map((p, i) => (
        <div key={i} className="flex items-center gap-2 px-1.5 py-1 my-0.5 bg-black/30 rounded">
          <div className="w-6 h-6 rounded bg-[#323246]/80 border border-[#444] flex items-center justify-center text-xs">
            {p.icon}
          </div>
          <span className="flex-1 text-xs text-[#ddd]">{p.name}</span>
          <div className="w-[60px] h-2.5 bg-black/50 rounded overflow-hidden">
            <div
              className={`h-full rounded transition-all duration-300 ${isAlly ? 'bg-gradient-to-r from-[#2277aa] to-[#44aaff]' : 'bg-gradient-to-r from-[#aa2222] to-[#ff4444]'}`}
              style={{ width: `${(p.health / p.maxHealth) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Arena Rating Display
// ---------------------------------------------------------------------------

export function ArenaRatingDisplay({ stats }: { stats: ArenaStats }) {
  const rank = getRank(stats.rating);
  return (
    <div className="flex items-center gap-3 bg-[#14141e]/90 border border-[#4a3c2a] rounded-lg px-4 py-2">
      <div className="text-center">
        <div className="text-xs text-[#888]">Rating</div>
        <div className="text-lg font-bold" style={{ color: rank.color }}>{stats.rating}</div>
      </div>
      <div className="w-px h-8 bg-[#4a3c2a]" />
      <div className="text-center">
        <div className="text-xs text-[#888]">Rank</div>
        <div className="text-sm font-bold" style={{ color: rank.color }}>{rank.name}</div>
      </div>
      <div className="w-px h-8 bg-[#4a3c2a]" />
      <div className="text-center">
        <div className="text-xs text-[#888]">Record</div>
        <div className="text-sm"><span className="text-green-400">{stats.wins}W</span> - <span className="text-red-400">{stats.losses}L</span></div>
      </div>
    </div>
  );
}
