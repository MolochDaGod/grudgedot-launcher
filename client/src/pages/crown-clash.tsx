/**
 * Crown Clash — Three.js PvE Card Arena
 *
 * 3D card game board with:
 * - Player hand at bottom, enemy field at top
 * - Turn-based PvE: draw, play cards, resolve damage
 * - Particle burst on card play
 * - HP / Elixir / Turn HUD overlay
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ALL_CARDS, getDefaultDeck, RARITY_COLORS, CARD_TYPE_COLORS, type CrownClashCard } from '@/data/crown-clash-cards';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

// ── Game State ──

interface GameState {
  playerHP: number;
  enemyHP: number;
  playerElixir: number;
  maxElixir: number;
  turn: number;
  phase: 'play' | 'gameover';
  hand: CrownClashCard[];
  deck: CrownClashCard[];
  enemyField: CrownClashCard[];
  playerField: CrownClashCard[];
  log: string[];
}

function createInitialState(): GameState {
  const deck = [...getDefaultDeck('elves')];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  const hand = deck.splice(0, 4);
  return { playerHP: 30, enemyHP: 30, playerElixir: 5, maxElixir: 10, turn: 1, phase: 'play', hand, deck, enemyField: [], playerField: [], log: ['Battle begins!'] };
}

// ── Card mesh ──

function createCardMesh(card: CrownClashCard, index: number, total: number, isEnemy: boolean): THREE.Group {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.2, 1.8, 0.05);
  const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(CARD_TYPE_COLORS[card.type] || '#333'), roughness: 0.4, metalness: 0.2 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  group.add(mesh);

  // Rarity gem
  const gem = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), new THREE.MeshStandardMaterial({ color: new THREE.Color(RARITY_COLORS[card.rarity]), emissive: new THREE.Color(RARITY_COLORS[card.rarity]), emissiveIntensity: 0.6 }));
  gem.position.set(0, 0.75, 0.05);
  group.add(gem);

  // Cost orb
  const cost = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), new THREE.MeshStandardMaterial({ color: 0x7c3aed, emissive: 0x7c3aed, emissiveIntensity: 0.4 }));
  cost.position.set(-0.45, 0.75, 0.05);
  group.add(cost);

  const spread = Math.min(total * 1.5, 8);
  const x = (index - (total - 1) / 2) * (spread / Math.max(total, 1));
  group.position.set(x, 0.1, isEnemy ? -3.5 : 3.5);
  group.rotation.x = isEnemy ? 0.3 : -0.3;
  if (isEnemy) group.rotation.y = Math.PI;
  group.userData = { cardId: card.id, isEnemy };
  return group;
}

// ── Particle burst ──

function createBurst(scene: THREE.Scene, position: THREE.Vector3, color: string) {
  const count = 40;
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const velocities: THREE.Vector3[] = [];
  for (let i = 0; i < count; i++) {
    positions[i * 3] = position.x; positions[i * 3 + 1] = position.y; positions[i * 3 + 2] = position.z;
    velocities.push(new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 3 + 1, (Math.random() - 0.5) * 4));
  }
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: new THREE.Color(color), size: 0.15, transparent: true, opacity: 1 });
  const points = new THREE.Points(geo, mat);
  scene.add(points);

  let life = 1.0;
  const tick = () => {
    life -= 0.03;
    if (life <= 0) { scene.remove(points); geo.dispose(); mat.dispose(); return; }
    mat.opacity = life;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      pos.setXYZ(i, pos.getX(i) + velocities[i].x * 0.02, pos.getY(i) + velocities[i].y * 0.02, pos.getZ(i) + velocities[i].z * 0.02);
      velocities[i].y -= 0.05;
    }
    pos.needsUpdate = true;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// ── Component ──

export default function CrownClash() {
  return (
    <GrudgeGameWrapper gameSlug="crown-clash" gameName="Crown Clash" xpPerThousand={15} goldPerGame={10}>
      {(session) => <CrownClashInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function CrownClashInner({ session }: { session: GrudgeGameSession }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameRef = useRef(0);
  const cardMeshesRef = useRef<THREE.Group[]>([]);
  const [game, setGame] = useState<GameState>(createInitialState);

  // ── Three.js init ──
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    scene.fog = new THREE.Fog(0x0a0a1a, 15, 30);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    camera.position.set(0, 8, 8);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0x334455, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(5, 10, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);

    // Board
    const board = new THREE.Mesh(new THREE.BoxGeometry(12, 0.2, 10), new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 }));
    board.position.y = -0.1; board.receiveShadow = true;
    scene.add(board);

    // Center line
    const line = new THREE.Mesh(new THREE.BoxGeometry(10, 0.02, 0.05), new THREE.MeshStandardMaterial({ color: 0xff6b6b, emissive: 0xff6b6b, emissiveIntensity: 0.3 }));
    line.position.y = 0.01;
    scene.add(line);

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      cardMeshesRef.current.forEach((g, i) => { g.position.y = 0.1 + Math.sin(Date.now() * 0.002 + i) * 0.05; });
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth, ch = container.clientHeight;
      camera.aspect = cw / ch; camera.updateProjectionMatrix(); renderer.setSize(cw, ch);
    });
    ro.observe(container);

    return () => { cancelAnimationFrame(frameRef.current); ro.disconnect(); renderer.dispose(); if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement); };
  }, []);

  // ── Sync cards → meshes ──
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    cardMeshesRef.current.forEach(m => scene.remove(m));
    cardMeshesRef.current = [];

    game.hand.forEach((card, i) => { const m = createCardMesh(card, i, game.hand.length, false); scene.add(m); cardMeshesRef.current.push(m); });
    game.enemyField.forEach((card, i) => { const m = createCardMesh(card, i, game.enemyField.length, true); scene.add(m); cardMeshesRef.current.push(m); });
    game.playerField.forEach((card, i) => { const m = createCardMesh(card, i, game.playerField.length, false); m.position.z = 1.5; m.rotation.x = 0; scene.add(m); cardMeshesRef.current.push(m); });
  }, [game.hand, game.enemyField, game.playerField]);

  // ── Play card ──
  const playCard = useCallback((idx: number) => {
    setGame(prev => {
      if (prev.phase !== 'play') return prev;
      const card = prev.hand[idx];
      if (!card || card.elixirCost > prev.playerElixir) return prev;
      const newHand = [...prev.hand]; newHand.splice(idx, 1);
      const newField = [...prev.playerField, card];
      if (sceneRef.current) createBurst(sceneRef.current, new THREE.Vector3(0, 1, 1.5), CARD_TYPE_COLORS[card.type]);
      let dmg = 0;
      if (card.type === 'spell' && card.spellDamage) dmg = Math.floor(card.spellDamage / 40);
      else if (card.type === 'unit') dmg = (card.spawnCount || 1) * 2;
      else if (card.type === 'hero') dmg = 5;
      else if (card.type === 'building') dmg = 1;
      const newEnemyHP = Math.max(0, prev.enemyHP - dmg);
      const log = [...prev.log, `Played ${card.name}${dmg > 0 ? ` — ${dmg} dmg` : ''}`];
      return { ...prev, hand: newHand, playerField: newField, playerElixir: prev.playerElixir - card.elixirCost, enemyHP: newEnemyHP, log, phase: newEnemyHP <= 0 ? 'gameover' : 'play' };
    });
  }, []);

  // ── End turn ──
  const endTurn = useCallback(() => {
    setGame(prev => {
      if (prev.phase !== 'play') return prev;
      const enemyDmg = Math.floor(Math.random() * 4) + 1;
      const newPlayerHP = Math.max(0, prev.playerHP - enemyDmg);
      const enemyCards = ALL_CARDS.filter(c => c.type === 'unit' || c.type === 'building');
      const enemyCard = enemyCards[Math.floor(Math.random() * enemyCards.length)];
      const newDeck = [...prev.deck]; const drawn = newDeck.length > 0 ? newDeck.splice(0, 1) : [];
      if (sceneRef.current) createBurst(sceneRef.current, new THREE.Vector3(0, 1, -3.5), '#ff4444');
      const log = [...prev.log, `— Turn ${prev.turn + 1} —`, `Enemy: ${enemyDmg} dmg`, `Enemy deploys ${enemyCard.name}`, ...(drawn.length ? [`Drew ${drawn[0].name}`] : ['Deck empty!'])];
      return { ...prev, playerHP: newPlayerHP, enemyField: [...prev.enemyField.slice(-3), enemyCard], hand: [...prev.hand, ...drawn], deck: newDeck, playerElixir: Math.min(prev.maxElixir, prev.playerElixir + 3), turn: prev.turn + 1, playerField: [], log, phase: newPlayerHP <= 0 ? 'gameover' : 'play' };
    });
  }, []);

  const restart = () => setGame(createInitialState());
  const isGameOver = game.phase === 'gameover';
  const won = game.enemyHP <= 0;

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
      <div ref={containerRef} className="flex-1 min-h-0" />

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Top — enemy HP */}
        <div className="flex items-center justify-between px-4 py-2">
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-0 text-xs font-mono pointer-events-auto">Three.js</Badge>
          <div className="flex items-center gap-3">
            <span className="text-xs text-red-400 font-bold">ENEMY</span>
            <div className="w-32 h-3 bg-stone-800 rounded-full overflow-hidden"><div className="h-full bg-red-500 transition-all" style={{ width: `${(game.enemyHP / 30) * 100}%` }} /></div>
            <span className="text-xs text-red-400 font-mono">{game.enemyHP}/30</span>
          </div>
        </div>

        {/* Bottom */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-auto">
          <div className="flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm border-t border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-400 font-bold">YOU</span>
              <div className="w-32 h-3 bg-stone-800 rounded-full overflow-hidden"><div className="h-full bg-green-500 transition-all" style={{ width: `${(game.playerHP / 30) * 100}%` }} /></div>
              <span className="text-xs text-green-400 font-mono">{game.playerHP}/30</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-400 font-mono">⚡ {game.playerElixir}/{game.maxElixir}</span>
              <span className="text-xs text-muted-foreground">Turn {game.turn}</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={endTurn} disabled={isGameOver}>End Turn</Button>
              {isGameOver && <Button size="sm" className="h-7 text-xs" onClick={restart}>{won ? '🏆 Play Again' : '💀 Retry'}</Button>}
            </div>
          </div>
          {!isGameOver && (
            <div className="flex gap-2 px-4 py-3 bg-black/90 justify-center overflow-x-auto">
              {game.hand.map((card, i) => {
                const canPlay = card.elixirCost <= game.playerElixir && game.phase === 'play';
                return (
                  <button key={card.id + i} className={`flex-shrink-0 w-28 rounded-lg border p-2 text-left transition-all ${canPlay ? 'border-amber-500/50 bg-stone-900 hover:bg-stone-800 hover:-translate-y-1 cursor-pointer' : 'border-stone-700 bg-stone-950 opacity-50 cursor-not-allowed'}`} onClick={() => canPlay && playCard(i)} disabled={!canPlay}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold truncate" style={{ color: CARD_TYPE_COLORS[card.type] }}>{card.name}</span>
                      <Badge variant="outline" className="text-[8px] px-1 h-4" style={{ borderColor: RARITY_COLORS[card.rarity], color: RARITY_COLORS[card.rarity] }}>⚡{card.elixirCost}</Badge>
                    </div>
                    <p className="text-[8px] text-muted-foreground line-clamp-2">{card.description}</p>
                    <Badge variant="secondary" className="text-[7px] mt-1 px-1 h-3">{card.type}</Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Log */}
        <div className="absolute top-12 right-3 w-48 max-h-40 overflow-y-auto pointer-events-auto bg-black/60 rounded-lg p-2 backdrop-blur-sm">
          {game.log.slice(-6).map((msg, i) => <p key={i} className="text-[9px] text-muted-foreground">{msg}</p>)}
        </div>
      </div>
    </div>
  );
}
