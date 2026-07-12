/**
 * Shooter 3D — Third-Person Shooter Arena
 *
 * BabylonJS + Rapier physics, Armory3D-style trait system.
 * Wave-based enemies, over-the-shoulder camera, multiple weapons.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Play, Home, RotateCcw, Trophy, Heart, Shield, Crosshair,
  Zap, Swords, Target,
} from 'lucide-react';

import * as BABYLON from '@babylonjs/core';
import { createPhysicsWorld, RapierPhysicsWorld } from '@/lib/rapier-physics';
import { TraitManager } from '@/lib/tps/trait-system';
import { ShooterController, ShooterControllerState } from '@/lib/tps/shooter-controller';
import { HealthComponent, CombatManager } from '@/lib/tps/combat-system';
import { EnemySpawner } from '@/lib/tps/enemy-ai';
import { WEAPONS } from '@/lib/tps/weapons';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

type GamePhase = 'menu' | 'playing' | 'paused' | 'dead' | 'victory';

export default function Shooter3D() {
  return (
    <GrudgeGameWrapper gameSlug="shooter-3d" gameName="Grudge Assault" xpPerThousand={15} goldPerGame={12} hideHud>
      {(session) => <Shooter3DInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function Shooter3DInner({ session }: { session: GrudgeGameSession }) {
  const [, navigate] = useLocation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BABYLON.Engine | null>(null);
  const sceneRef = useRef<BABYLON.Scene | null>(null);
  const controllerRef = useRef<ShooterController | null>(null);
  const spawnerRef = useRef<EnemySpawner | null>(null);
  const traitMgrRef = useRef<TraitManager | null>(null);

  const [phase, setPhase] = useState<GamePhase>('menu');
  const [hud, setHud] = useState<ShooterControllerState>({
    hp: 100, maxHp: 100, shield: 50, maxShield: 50,
    stamina: 100, maxStamina: 100, ammo: 30, maxAmmo: 30,
    weaponName: 'Assault Rifle', reloading: false,
    mode: 'combat', score: 0, kills: 0,
  });
  const [wave, setWave] = useState(1);
  const [kills, setKills] = useState(0);
  const [score, setScore] = useState(0);
  const [waveText, setWaveText] = useState('');
  const reportedRef = useRef(false);

  useEffect(() => {
    if ((phase === 'dead' || phase === 'victory') && !reportedRef.current) {
      reportedRef.current = true;
      session.reportScore(score, { wave, kills, outcome: phase });
    }
    if (phase === 'menu' || phase === 'playing') reportedRef.current = false;
  }, [phase, score, wave, kills, session]);

  // ── Build Scene ──

  const buildScene = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cleanup previous
    if (engineRef.current) {
      engineRef.current.dispose();
    }

    const engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    engineRef.current = engine;
    const scene = new BABYLON.Scene(engine);
    sceneRef.current = scene;
    scene.clearColor = new BABYLON.Color4(0.05, 0.05, 0.12, 1);
    scene.fogMode = BABYLON.Scene.FOGMODE_LINEAR;
    scene.fogStart = 40;
    scene.fogEnd = 80;
    scene.fogColor = new BABYLON.Color3(0.05, 0.05, 0.12);

    // Physics
    const physics = await createPhysicsWorld(scene);

    // Trait manager
    const traitMgr = TraitManager.get(scene);
    traitMgrRef.current = traitMgr;

    // Combat manager
    CombatManager.reset();
    const combat = CombatManager.getInstance();

    // ── Lighting ──
    scene.ambientColor = new BABYLON.Color3(0.15, 0.15, 0.2);
    const hemi = new BABYLON.HemisphericLight('hemi', new BABYLON.Vector3(0, 1, 0), scene);
    hemi.intensity = 0.4;
    hemi.diffuse = new BABYLON.Color3(0.5, 0.5, 0.7);

    const sun = new BABYLON.DirectionalLight('sun', new BABYLON.Vector3(-1, -2, -1), scene);
    sun.intensity = 1.2;
    sun.diffuse = new BABYLON.Color3(1, 0.95, 0.85);
    sun.position = new BABYLON.Vector3(10, 20, 10);
    sun.shadowEnabled = true;
    const shadowGen = new BABYLON.ShadowGenerator(2048, sun);
    shadowGen.useBlurExponentialShadowMap = true;
    shadowGen.blurKernel = 32;

    // ── Arena Floor ──
    const ground = BABYLON.MeshBuilder.CreateGround('ground', { width: 50, height: 50, subdivisions: 1 }, scene);
    const groundMat = new BABYLON.StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new BABYLON.Color3(0.12, 0.12, 0.18);
    groundMat.specularColor = new BABYLON.Color3(0.05, 0.05, 0.05);
    ground.material = groundMat;
    ground.receiveShadows = true;
    physics.addBody('ground', ground, { type: 'fixed' }, {
      shape: 'box', halfExtents: { x: 25, y: 0.01, z: 25 },
    });

    // Arena ring
    const ring = BABYLON.MeshBuilder.CreateTorus('ring', { diameter: 50, thickness: 0.6, tessellation: 64 }, scene);
    ring.position.y = 0.3;
    const ringMat = new BABYLON.StandardMaterial('ringMat', scene);
    ringMat.emissiveColor = new BABYLON.Color3(0.8, 0.15, 0.15);
    ringMat.diffuseColor = new BABYLON.Color3(0.6, 0.1, 0.1);
    ring.material = ringMat;

    // Cover objects (boxes)
    const coverPositions = [
      { x: 6, z: 6 }, { x: -6, z: 6 }, { x: 6, z: -6 }, { x: -6, z: -6 },
      { x: 12, z: 0 }, { x: -12, z: 0 }, { x: 0, z: 12 }, { x: 0, z: -12 },
      { x: 10, z: 10 }, { x: -10, z: -10 }, { x: -10, z: 10 }, { x: 10, z: -10 },
    ];
    coverPositions.forEach((pos, i) => {
      const h = 1.5 + Math.random() * 1.5;
      const w = 1 + Math.random() * 1.5;
      const box = BABYLON.MeshBuilder.CreateBox(`cover_${i}`, { width: w, height: h, depth: w }, scene);
      box.position = new BABYLON.Vector3(pos.x, h / 2, pos.z);
      const mat = new BABYLON.StandardMaterial(`coverMat_${i}`, scene);
      mat.diffuseColor = new BABYLON.Color3(0.2, 0.2, 0.25);
      box.material = mat;
      box.receiveShadows = true;
      shadowGen.addShadowCaster(box);
      physics.addBody(`cover_${i}`, box, { type: 'fixed' }, {
        shape: 'box', halfExtents: { x: w / 2, y: h / 2, z: w / 2 },
      });
    });

    // Pillars (tall cylinders around edge)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pillar = BABYLON.MeshBuilder.CreateCylinder(`pillar_${i}`, {
        height: 5, diameter: 1.2, tessellation: 8,
      }, scene);
      pillar.position = new BABYLON.Vector3(Math.cos(angle) * 20, 2.5, Math.sin(angle) * 20);
      const pMat = new BABYLON.StandardMaterial(`pillarMat_${i}`, scene);
      pMat.diffuseColor = new BABYLON.Color3(0.25, 0.25, 0.3);
      pMat.specularColor = new BABYLON.Color3(0.1, 0.1, 0.15);
      pillar.material = pMat;
      pillar.receiveShadows = true;
      shadowGen.addShadowCaster(pillar);
      physics.addBody(`pillar_${i}`, pillar, { type: 'fixed' }, {
        shape: 'cylinder', radius: 0.6, halfHeight: 2.5,
      });
    }

    // ── Player ──
    const player = BABYLON.MeshBuilder.CreateCapsule('player', {
      radius: 0.4, height: 1.8, tessellation: 16, subdivisions: 8,
    }, scene);
    player.position = new BABYLON.Vector3(0, 0.9, 0);
    const playerMat = new BABYLON.StandardMaterial('playerMat', scene);
    playerMat.diffuseColor = new BABYLON.Color3(0.3, 0.4, 0.9);
    playerMat.specularColor = new BABYLON.Color3(0.2, 0.3, 0.6);
    player.material = playerMat;
    shadowGen.addShadowCaster(player);

    physics.addBody('player', player,
      { type: 'kinematicPosition', mass: 0 },
      { shape: 'capsule', radius: 0.4, halfHeight: 0.5 }
    );

    // Player health
    const playerHealth = new HealthComponent(player, 'player', {
      maxHp: 100, maxShield: 50, shieldRegenRate: 8, shieldRegenDelay: 3,
    });
    traitMgr.add(playerHealth);
    combat.register(playerHealth);

    playerHealth.onDeath(() => {
      setPhase('dead');
      controller.deactivate();
      document.exitPointerLock?.();
    });

    // Controller
    const controller = new ShooterController(scene, canvas, player, physics);
    controllerRef.current = controller;

    controller.onStateChange = (state) => {
      setHud({
        ...state,
        hp: playerHealth.hp,
        maxHp: playerHealth.config.maxHp,
        shield: playerHealth.shield,
        maxShield: playerHealth.config.maxShield,
        kills: spawnerRef.current?.totalKills ?? 0,
        score: (spawnerRef.current?.totalKills ?? 0) * 100,
      });
    };

    // Damage listener for hit indicator
    combat.onDamage((event) => {
      if (event.targetId === 'player') {
        // Red flash on player damage could go here
      }
    });

    // ── Enemy Spawner ──
    const spawner = new EnemySpawner(scene, physics, player);
    spawnerRef.current = spawner;

    spawner.onWaveStart = (w) => {
      setWave(w);
      setWaveText(`WAVE ${w}`);
      setTimeout(() => setWaveText(''), 2000);
    };

    spawner.onWaveComplete = (w) => {
      setWaveText(`WAVE ${w} COMPLETE`);
      setTimeout(() => setWaveText(''), 2000);

      // Heal player between waves
      playerHealth.heal(30);
      playerHealth.restoreShield(25);

      // Cleanup dead enemies
      spawner.cleanup();

      // Spawn next wave after delay
      if (w >= 20) {
        setPhase('victory');
        controller.deactivate();
        document.exitPointerLock?.();
      } else {
        setTimeout(() => {
          if (sceneRef.current && playerHealth.alive) {
            spawner.spawnWave();
          }
        }, 3000);
      }
    };

    spawner.onEnemyKilled = (total) => {
      setKills(total);
      setScore(total * 100);
    };

    // ── Start ──
    controller.activate();
    spawner.spawnWave();

    // Render loop
    engine.runRenderLoop(() => {
      physics.step(engine.getDeltaTime() / 1000);
      scene.render();
    });

    // Resize
    const onResize = () => engine.resize();
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      controller.dispose();
      spawner.dispose();
      traitMgr.dispose();
      combat.killFeed.length = 0;
      physics.dispose();
      scene.dispose();
      engine.dispose();
      CombatManager.reset();
    };
  }, []);

  // ── Start Game ──
  const startGame = useCallback(() => {
    setPhase('playing');
    setKills(0);
    setScore(0);
    setWave(1);
    setWaveText('');

    // Build after state updates
    setTimeout(() => {
      buildScene();
    }, 50);
  }, [buildScene]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      controllerRef.current?.dispose();
      spawnerRef.current?.dispose();
      traitMgrRef.current?.dispose();
      engineRef.current?.dispose();
      CombatManager.reset();
    };
  }, []);

  // ── UI ──

  return (
    <div className="flex h-full flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 relative">
      {/* Menu */}
      {phase === 'menu' && (
        <Card className="w-full max-w-lg border-2 border-primary/30">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-4xl font-bold flex items-center justify-center gap-3">
              <Target className="h-10 w-10 text-red-400" />
              GRUDGE ASSAULT
            </CardTitle>
            <p className="text-muted-foreground text-lg">Third-Person Tactical Shooter</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
              <p className="font-semibold text-base mb-2">Controls</p>
              <div className="grid grid-cols-2 gap-2">
                <p><kbd className="px-1 bg-background rounded">WASD</kbd> Move</p>
                <p><kbd className="px-1 bg-background rounded">Mouse</kbd> Aim + Shoot</p>
                <p><kbd className="px-1 bg-background rounded">Shift</kbd> Sprint</p>
                <p><kbd className="px-1 bg-background rounded">Space</kbd> Jump</p>
                <p><kbd className="px-1 bg-background rounded">Shift+Space</kbd> Dodge</p>
                <p><kbd className="px-1 bg-background rounded">R</kbd> Reload</p>
                <p><kbd className="px-1 bg-background rounded">Tab</kbd> Combat/Explore</p>
                <p><kbd className="px-1 bg-background rounded">1-5</kbd> Switch Weapon</p>
                <p><kbd className="px-1 bg-background rounded">RMB</kbd> Aim Down Sights</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-3">
                <Badge variant="outline">1: Rifle</Badge>
                <Badge variant="outline">2: Shotgun</Badge>
                <Badge variant="outline">3: Pistol</Badge>
                <Badge variant="outline">4: Sniper</Badge>
                <Badge variant="outline">5: Rocket</Badge>
              </div>
            </div>
            <Button onClick={startGame} className="w-full text-lg" size="lg">
              <Play className="h-6 w-6 mr-2" /> Deploy
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              <Home className="h-5 w-5 mr-2" /> Back to Home
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Playing */}
      {phase === 'playing' && (
        <div className="relative w-full h-full">
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-8 h-8">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white/70" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0.5 h-2.5 bg-white/70" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-2.5 bg-white/70" />
              <div className="absolute right-0 top-1/2 -translate-y-1/2 h-0.5 w-2.5 bg-white/70" />
              <div className="absolute inset-[13px] rounded-full border border-white/40" />
            </div>
          </div>

          {/* HUD - Top Bar */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-base px-3 py-1">
                <Swords className="h-4 w-4 mr-1" /> Wave {wave}
              </Badge>
              <Badge variant="secondary" className="text-base px-3 py-1">
                <Trophy className="h-4 w-4 mr-1 text-yellow-500" /> {score}
              </Badge>
              <Badge variant="outline" className="text-base px-3 py-1">
                <Crosshair className="h-4 w-4 mr-1" /> {kills} kills
              </Badge>
            </div>
            <Badge variant={hud.mode === 'combat' ? 'destructive' : 'secondary'} className="text-xs">
              {hud.mode === 'combat' ? 'COMBAT' : 'EXPLORE'}
            </Badge>
          </div>

          {/* HUD - Bottom Bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between pointer-events-none">
            {/* Health / Shield / Stamina */}
            <div className="space-y-1.5 min-w-[200px]">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500 shrink-0" />
                <Progress value={(hud.hp / hud.maxHp) * 100} className="h-2.5 flex-1" />
                <span className="text-xs text-white/70 w-8 text-right">{Math.round(hud.hp)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-400 shrink-0" />
                <Progress value={(hud.shield / Math.max(1, hud.maxShield)) * 100} className="h-2 flex-1" />
                <span className="text-xs text-white/70 w-8 text-right">{Math.round(hud.shield)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-400 shrink-0" />
                <Progress value={(hud.stamina / hud.maxStamina) * 100} className="h-1.5 flex-1" />
              </div>
            </div>

            {/* Weapon / Ammo */}
            <div className="text-right space-y-1">
              <div className="text-white font-bold text-lg">{hud.weaponName}</div>
              <div className="text-white/80 text-2xl font-mono">
                {hud.reloading ? (
                  <span className="text-yellow-400 animate-pulse">RELOADING</span>
                ) : (
                  <>{hud.ammo} <span className="text-white/40">/ {hud.maxAmmo}</span></>
                )}
              </div>
            </div>
          </div>

          {/* Wave Announcement */}
          {waveText && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-white text-5xl font-bold tracking-widest animate-pulse drop-shadow-lg">
                {waveText}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dead */}
      {phase === 'dead' && (
        <Card className="w-full max-w-md border-2 border-red-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-red-500">ELIMINATED</CardTitle>
            <div className="space-y-1 pt-2">
              <p className="text-xl font-bold">{score.toLocaleString()} pts</p>
              <p className="text-muted-foreground">Wave {wave} • {kills} Kills</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={startGame} className="w-full">
              <RotateCcw className="h-5 w-5 mr-2" /> Try Again
            </Button>
            <Button variant="outline" onClick={() => setPhase('menu')} className="w-full">
              <Home className="h-5 w-5 mr-2" /> Main Menu
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Victory */}
      {phase === 'victory' && (
        <Card className="w-full max-w-md border-2 border-green-500/30">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-green-500 flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8" /> VICTORY
            </CardTitle>
            <p className="text-2xl font-bold pt-2">{score.toLocaleString()} pts</p>
            <p className="text-muted-foreground">{kills} Kills • 20 Waves Survived</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={startGame} className="w-full">
              <Play className="h-5 w-5 mr-2" /> Play Again
            </Button>
            <Button variant="outline" onClick={() => setPhase('menu')} className="w-full">
              <Home className="h-5 w-5 mr-2" /> Main Menu
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
