/**
 * Gruda Wars (Betta Warlords) — Play with your Grudge Studio character
 *
 * Loads the user's real characters from the Grudge backend,
 * then drops them into a Three.js RPG world where stats, inventory,
 * and equipment are all sourced from the account.
 *
 * Flow: Auth Gate → Character Select → Three.js World
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getLoginHref } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { useGrudgeAccount, type GrudgeCharacterLocal } from '@/hooks/useGrudgeAccount';
import { useGrudgePlayer } from '@/hooks/useGrudgePlayer';
import { ATTRIBUTE_DEFINITIONS, BASE_STATS } from '@/lib/character-stats';
import { Loader2, LogIn, Sword, Shield, Heart, Zap, Star, Package, Play, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

// ── Compute derived stats from attributes ──
function computeStats(attrs: Record<string, number>) {
  const stats = { ...BASE_STATS };
  for (const [attrName, points] of Object.entries(attrs)) {
    const def = ATTRIBUTE_DEFINITIONS[attrName];
    if (!def) continue;
    for (const [statKey, gain] of Object.entries(def.gains)) {
      stats[statKey] = (stats[statKey] || 0) + gain.value * points;
    }
  }
  return stats;
}

// ── Class color mapping ──
const CLASS_COLORS: Record<string, number> = {
  warrior: 0xf97316, mage: 0x6366f1, ranger: 0x22c55e, shapeshifter: 0xa855f7,
};
const CLASS_LABELS: Record<string, string> = {
  warrior: 'Warrior', mage: 'Mage', ranger: 'Ranger', shapeshifter: 'Shapeshifter',
};

// ── Enemy type ──
interface GameEnemy {
  mesh: THREE.Mesh;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  name: string;
}

export default function BettaWarlords() {
  return (
    <GrudgeGameWrapper gameSlug="betta-warlords" gameName="Betta Warlords" xpPerThousand={14} goldPerGame={10} hideHud>
      {(session) => <BettaWarlordsInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function BettaWarlordsInner({ session }: { session: GrudgeGameSession }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { characters, charactersLoading } = useGrudgeAccount();
  const { activeChar: grudgeChar, inventory, professions } = useGrudgePlayer();

  const [selectedChar, setSelectedChar] = useState<GrudgeCharacterLocal | null>(null);
  const [phase, setPhase] = useState<'select' | 'play' | 'dead'>('select');
  const [gameHP, setGameHP] = useState(0);
  const [gameMaxHP, setGameMaxHP] = useState(0);
  const [gameMana, setGameMana] = useState(0);
  const [gameMaxMana, setGameMaxMana] = useState(0);
  const [killCount, setKillCount] = useState(0);
  const [xpGained, setXpGained] = useState(0);
  const [goldGained, setGoldGained] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef(0);
  const gameRef = useRef<{ running: boolean; keys: Set<string> } | null>(null);
  const reportedRef = useRef(false);

  useEffect(() => {
    if (phase === 'dead' && !reportedRef.current) {
      reportedRef.current = true;
      session.reportScore(killCount * 100 + xpGained, { kills: killCount, xpGained, goldGained });
    }
    if (phase !== 'dead') reportedRef.current = false;
  }, [phase, killCount, xpGained, goldGained, session]);

  // Auto-select first character
  useEffect(() => {
    if (characters.length > 0 && !selectedChar) setSelectedChar(characters[0]);
  }, [characters, selectedChar]);

  // ── Auth gate ──
  if (authLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950">
        <Sword className="h-16 w-16 text-amber-500" />
        <h2 className="text-2xl font-bold">Gruda Wars</h2>
        <p className="text-muted-foreground text-center max-w-sm">Sign in with your Grudge Studio account to play with your characters, inventory, and stats.</p>
        <Button asChild><a href={getLoginHref()}><LogIn className="mr-2 h-4 w-4" /> Sign In</a></Button>
      </div>
    );
  }

  // ── Start game with selected character ──
  const startGame = useCallback(() => {
    if (!selectedChar || !containerRef.current) return;

    const stats = computeStats(selectedChar.attributes || {});
    const maxHP = Math.round(stats.health);
    const maxMana = Math.round(stats.mana);
    setGameHP(maxHP); setGameMaxHP(maxHP);
    setGameMana(maxMana); setGameMaxMana(maxMana);
    setKillCount(0); setXpGained(0); setGoldGained(0);
    setPhase('play');

    const container = containerRef.current;
    // Clear previous
    while (container.firstChild) container.removeChild(container.firstChild);

    const w = container.clientWidth, h = container.clientHeight;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a1a);
    scene.fog = new THREE.Fog(0x1a2a1a, 40, 100);

    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);

    // Lighting
    scene.add(new THREE.AmbientLight(0x446644, 0.5));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(10, 20, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -40; sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40;
    scene.add(sun);

    // Terrain
    const terrainGeo = new THREE.PlaneGeometry(200, 200, 64, 64);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i);
      posAttr.setZ(i, Math.sin(x * 0.05) * 1.5 + Math.cos(y * 0.07) * 1);
    }
    terrainGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ color: 0x2d4a2d, roughness: 0.95, flatShading: true }));
    terrain.rotation.x = -Math.PI / 2; terrain.receiveShadow = true;
    scene.add(terrain);

    // Trees (simple cylinders + cones)
    for (let i = 0; i < 30; i++) {
      const tx = (Math.random() - 0.5) * 160, tz = (Math.random() - 0.5) * 160;
      if (Math.abs(tx) < 10 && Math.abs(tz) < 10) continue;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 2, 6), new THREE.MeshStandardMaterial({ color: 0x4a3520 }));
      trunk.position.set(tx, 1, tz); trunk.castShadow = true; scene.add(trunk);
      const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 6), new THREE.MeshStandardMaterial({ color: 0x1a5a1a }));
      leaves.position.set(tx, 3.5, tz); leaves.castShadow = true; scene.add(leaves);
    }

    // Player character mesh (color based on class)
    const classColor = CLASS_COLORS[selectedChar.classId || 'warrior'] || 0xffffff;
    const player = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 8, 16), new THREE.MeshStandardMaterial({ color: classColor, roughness: 0.3, metalness: 0.5 }));
    body.castShadow = true; body.position.y = 0.9;
    player.add(body);
    // Weapon indicator
    const wpn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.8, 0.1), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
    wpn.position.set(0.5, 1.0, 0); player.add(wpn);
    // Name label uses level from character
    player.position.set(0, 0, 0);
    scene.add(player);

    // Enemies
    const enemies: GameEnemy[] = [];
    const stateRef = { hp: maxHP, mana: maxMana, kills: 0, xp: 0, gold: 0, dead: false };

    function spawnEnemy() {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 15;
      const tier = Math.floor(Math.random() * 3);
      const names = ['Goblin Scout', 'Orc Grunt', 'Skeleton Warrior', 'Dark Mage', 'Troll Berserker'];
      const colors = [0x558833, 0x664422, 0xaaaaaa, 0x442255, 0x886644];
      const idx = Math.floor(Math.random() * names.length);
      const eLvl = Math.max(1, (selectedChar.level || 1) - 2 + tier);
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.7 + tier * 0.2, 1.2 + tier * 0.3, 0.7 + tier * 0.2),
        new THREE.MeshStandardMaterial({ color: colors[idx], roughness: 0.6 }),
      );
      mesh.position.set(Math.cos(angle) * dist, 0.7 + tier * 0.15, Math.sin(angle) * dist);
      mesh.castShadow = true;
      scene.add(mesh);
      enemies.push({
        mesh, hp: 20 + eLvl * 5, maxHp: 20 + eLvl * 5,
        speed: 1.5 + tier * 0.3, damage: 3 + eLvl * 1.5,
        attackCooldown: 0, name: `${names[idx]} Lv.${eLvl}`,
      });
    }
    for (let i = 0; i < 8; i++) spawnEnemy();

    // Input
    const keys = new Set<string>();
    const onKD = (e: KeyboardEvent) => keys.add(e.code);
    const onKU = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onKD);
    window.addEventListener('keyup', onKU);

    // Attack
    const playerDmg = stats.damage + 5; // base + attr damage
    const critChance = stats.criticalChance / 100;
    const onClick = () => {
      if (stateRef.dead) return;
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dist = player.position.distanceTo(e.mesh.position);
        if (dist < 3.5) {
          const isCrit = Math.random() < critChance;
          const dmg = Math.round(playerDmg * (isCrit ? 1.5 + (stats.criticalDamage || 0) / 100 : 1));
          e.hp -= dmg;
          if (e.hp <= 0) {
            scene.remove(e.mesh);
            enemies.splice(i, 1);
            const xpReward = 10 + Math.floor(Math.random() * 15);
            const goldReward = 2 + Math.floor(Math.random() * 8);
            stateRef.kills++; stateRef.xp += xpReward; stateRef.gold += goldReward;
            setKillCount(stateRef.kills); setXpGained(stateRef.xp); setGoldGained(stateRef.gold);
            spawnEnemy();
          }
          break;
        }
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    gameRef.current = { running: true, keys };
    let lastTime = performance.now();

    const animate = () => {
      if (!gameRef.current?.running) return;
      frameRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (stateRef.dead) { renderer.render(scene, camera); return; }

      // Movement
      const moveSpeed = 5 + (stats.movementSpeed || 0) * 0.1;
      const move = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) move.z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) move.z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) move.x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) move.x += 1;
      if (move.length() > 0) {
        move.normalize().multiplyScalar(moveSpeed * dt);
        player.position.add(move);
        player.rotation.y = Math.atan2(move.x, move.z);
      }
      // Clamp
      player.position.x = THREE.MathUtils.clamp(player.position.x, -90, 90);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -90, 90);

      // Regen
      const hpRegen = (stats.healthRegen || 0) * dt;
      const manaRegen = (stats.manaRegen || 0) * dt;
      stateRef.hp = Math.min(maxHP, stateRef.hp + hpRegen);
      stateRef.mana = Math.min(maxMana, stateRef.mana + manaRegen);

      // Enemy AI
      for (const e of enemies) {
        const dir = new THREE.Vector3().subVectors(player.position, e.mesh.position);
        dir.y = 0; const dist = dir.length();
        if (dist > 1.2 && dist < 25) {
          dir.normalize().multiplyScalar(e.speed * dt);
          e.mesh.position.add(dir);
          e.mesh.lookAt(player.position.x, e.mesh.position.y, player.position.z);
        }
        e.attackCooldown = Math.max(0, e.attackCooldown - dt);
        if (dist < 1.8 && e.attackCooldown <= 0) {
          const blocked = Math.random() < (stats.block || 0) / 100;
          const evaded = Math.random() < (stats.evasion || 0) / 100;
          if (!blocked && !evaded) {
            const reduction = (stats.defense || 0) * 0.02;
            const dmg = Math.max(1, Math.round(e.damage * (1 - Math.min(0.75, reduction))));
            stateRef.hp -= dmg;
            if (stateRef.hp <= 0) {
              stateRef.hp = 0; stateRef.dead = true;
              setPhase('dead');
            }
          }
          e.attackCooldown = 1.5;
        }
      }

      // Camera
      const camTarget = new THREE.Vector3(player.position.x, 0, player.position.z);
      camera.position.lerp(new THREE.Vector3(camTarget.x, 12, camTarget.z + 14), 0.05);
      camera.lookAt(camTarget);

      setGameHP(Math.round(stateRef.hp));
      setGameMana(Math.round(stateRef.mana));

      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth, ch = container.clientHeight;
      camera.aspect = cw / ch; camera.updateProjectionMatrix(); renderer.setSize(cw, ch);
    });
    ro.observe(container);

    return () => {
      if (gameRef.current) gameRef.current.running = false;
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      window.removeEventListener('keydown', onKD);
      window.removeEventListener('keyup', onKU);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, [selectedChar]);

  // Start game effect
  useEffect(() => {
    if (phase === 'play' && selectedChar) {
      const cleanup = startGame();
      return cleanup;
    }
  }, [phase, selectedChar, startGame]);

  // ── Character Select Screen ──
  if (phase === 'select') {
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 overflow-auto" data-testid="page-betta-warlords">
        <div className="flex flex-col items-center pt-8 pb-4 px-4">
          <h1 className="text-3xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500 mb-1">Gruda Wars</h1>
          <p className="text-sm text-muted-foreground mb-6">Select your character to enter the world</p>
        </div>

        {charactersLoading ? (
          <div className="flex items-center justify-center flex-1"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : characters.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 px-4">
            <p className="text-muted-foreground text-center">No characters found. Create one first!</p>
            <Button asChild><Link href="/characters"><Star className="mr-2 h-4 w-4" /> Create Character</Link></Button>
          </div>
        ) : (
          <ScrollArea className="flex-1 px-4 pb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {characters.map(ch => {
                const stats = computeStats(ch.attributes || {});
                const isSelected = selectedChar?.id === ch.id;
                const equipped = Object.values(ch.equipment || {}).filter(Boolean).length;
                return (
                  <button
                    key={ch.id}
                    onClick={() => setSelectedChar(ch)}
                    className={`text-left rounded-xl border p-4 transition-all ${
                      isSelected ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10' : 'border-white/10 bg-stone-900/50 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{backgroundColor: `#${(CLASS_COLORS[ch.classId || 'warrior'] || 0xffffff).toString(16).padStart(6, '0')}22`}}>
                        {ch.classId === 'mage' ? '🧙' : ch.classId === 'ranger' ? '🏹' : ch.classId === 'shapeshifter' ? '🐺' : '⚔️'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold truncate">{ch.name}</div>
                        <div className="text-xs text-muted-foreground">Lv.{ch.level} {CLASS_LABELS[ch.classId || 'warrior'] || ch.classId} · {ch.raceId}</div>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{ch.faction || 'None'}</Badge>
                    </div>

                    {/* Stats preview */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div><Heart className="h-3 w-3 mx-auto text-red-400 mb-0.5" /><span className="text-[10px] text-red-400 font-mono">{Math.round(stats.health)}</span></div>
                      <div><Zap className="h-3 w-3 mx-auto text-blue-400 mb-0.5" /><span className="text-[10px] text-blue-400 font-mono">{Math.round(stats.mana)}</span></div>
                      <div><Sword className="h-3 w-3 mx-auto text-amber-400 mb-0.5" /><span className="text-[10px] text-amber-400 font-mono">{Math.round(stats.damage)}</span></div>
                      <div><Shield className="h-3 w-3 mx-auto text-green-400 mb-0.5" /><span className="text-[10px] text-green-400 font-mono">{Math.round(stats.defense)}</span></div>
                    </div>

                    <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                      <Package className="h-3 w-3" /> {equipped} equipped
                      <span className="ml-auto">{ch.gold || 0}g · {ch.experience || 0}xp</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {selectedChar && (
              <div className="flex justify-center mt-6">
                <Button size="lg" className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold text-lg px-8" onClick={() => setPhase('play')}>
                  <Play className="mr-2 h-5 w-5" /> Enter World as {selectedChar.name}
                </Button>
              </div>
            )}
          </ScrollArea>
        )}
      </div>
    );
  }

  // ── Death Screen ──
  if (phase === 'dead') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black gap-4" data-testid="page-betta-warlords">
        <h1 className="text-4xl font-black text-red-500">FALLEN</h1>
        <p className="text-lg text-muted-foreground">{selectedChar?.name} has been defeated</p>
        <div className="flex gap-6 text-center">
          <div><span className="text-2xl font-bold text-amber-400">{killCount}</span><br /><span className="text-xs text-muted-foreground">Kills</span></div>
          <div><span className="text-2xl font-bold text-blue-400">{xpGained}</span><br /><span className="text-xs text-muted-foreground">XP Earned</span></div>
          <div><span className="text-2xl font-bold text-yellow-400">{goldGained}</span><br /><span className="text-xs text-muted-foreground">Gold</span></div>
        </div>
        <div className="flex gap-3 mt-4">
          <Button variant="outline" onClick={() => { if (gameRef.current) gameRef.current.running = false; setPhase('select'); }}><ArrowLeft className="mr-2 h-4 w-4" /> Character Select</Button>
          <Button className="bg-gradient-to-r from-amber-600 to-red-600" onClick={() => { if (gameRef.current) gameRef.current.running = false; setPhase('play'); }}>Respawn</Button>
        </div>
      </div>
    );
  }

  // ── Play Screen ──
  const charStats = selectedChar ? computeStats(selectedChar.attributes || {}) : null;

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden" data-testid="page-betta-warlords">
      <div ref={containerRef} className="flex-1 min-h-0 cursor-crosshair" />

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 border-0 text-xs font-mono">Gruda Wars</Badge>
            {selectedChar && <span className="text-xs font-bold text-white">{selectedChar.name}</span>}
            {selectedChar && <span className="text-[10px] text-muted-foreground">Lv.{selectedChar.level} {CLASS_LABELS[selectedChar.classId || ''] || ''}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-amber-400">{killCount} kills</span>
            <span className="text-blue-400">+{xpGained}xp</span>
            <span className="text-yellow-400">+{goldGained}g</span>
          </div>
        </div>

        {/* HP / Mana bars */}
        <div className="px-4 mt-1 max-w-sm">
          <div className="flex items-center gap-2 mb-1">
            <Heart className="h-3 w-3 text-red-400" />
            <div className="flex-1 h-3 bg-stone-900 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${gameMaxHP ? (gameHP / gameMaxHP) * 100 : 0}%` }} />
            </div>
            <span className="text-[10px] text-red-400 font-mono w-16 text-right">{gameHP}/{gameMaxHP}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3 text-blue-400" />
            <div className="flex-1 h-3 bg-stone-900 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${gameMaxMana ? (gameMana / gameMaxMana) * 100 : 0}%` }} />
            </div>
            <span className="text-[10px] text-blue-400 font-mono w-16 text-right">{gameMana}/{gameMaxMana}</span>
          </div>
        </div>

        {/* Stats panel (bottom left) */}
        {charStats && (
          <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg p-2 border border-white/10 text-[9px] font-mono text-muted-foreground">
            <div>DMG: {Math.round(charStats.damage)} · DEF: {Math.round(charStats.defense)}</div>
            <div>CRIT: {(charStats.criticalChance || 0).toFixed(1)}% · EVA: {(charStats.evasion || 0).toFixed(1)}%</div>
            <div>SPD: {(5 + (charStats.movementSpeed || 0) * 0.1).toFixed(1)} · BLK: {(charStats.block || 0).toFixed(1)}%</div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-3 right-3 text-[9px] text-muted-foreground bg-black/50 rounded px-2 py-1">
          WASD — Move · Click — Attack
        </div>
      </div>
    </div>
  );
}
