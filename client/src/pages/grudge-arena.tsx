/**
 * Grudge Arena — Three.js 3D Combat Arena
 *
 * - Arena floor with pillars
 * - Player (capsule) with WASD movement + third-person chase cam
 * - Enemies that chase and attack
 * - Hit particle bursts
 * - HP / Stamina HUD
 */

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LIGHTING_PRESETS } from '@/lib/engine3d';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

export default function GrudgeArena() {
  return (
    <GrudgeGameWrapper gameSlug="grudge-arena" gameName="Grudge Arena" xpPerThousand={12} goldPerGame={8} hideHud>
      {(session) => <GrudgeArenaInner session={session} />}
    </GrudgeGameWrapper>
  );
}

interface Enemy {
  mesh: THREE.Mesh;
  hp: number;
  maxHp: number;
  speed: number;
}

function GrudgeArenaInner({ session }: { session: GrudgeGameSession }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playerHP, setPlayerHP] = useState(100);
  const [stamina, setStamina] = useState(100);
  const [score, setScore] = useState(0);
  const [dead, setDead] = useState(false);
  const reportedRef = useRef(false);

  const stateRef = useRef({ playerHP: 100, stamina: 100, score: 0, dead: false });

  useEffect(() => {
    if (dead && !reportedRef.current) {
      reportedRef.current = true;
      session.reportScore(score, { outcome: 'defeated' });
    }
    if (!dead) reportedRef.current = false;
  }, [dead, score, session]);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111122);
    scene.fog = new THREE.Fog(0x111122, 30, 80);

    // Camera — third person
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);

    // Lighting
    scene.add(new THREE.AmbientLight(0x334466, 0.5));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 60;
    sun.shadow.camera.left = -30;
    sun.shadow.camera.right = 30;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    scene.add(sun);

    // Arena floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(25, 64),
      new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.9 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Arena ring
    const ringGeo = new THREE.TorusGeometry(25, 0.5, 8, 64);
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xff6b6b, emissive: 0xff6b6b, emissiveIntensity: 0.3 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.25;
    scene.add(ring);

    // Pillars
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.6, 0.8, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x444466, roughness: 0.7, metalness: 0.3 }),
      );
      pillar.position.set(Math.cos(angle) * 18, 2, Math.sin(angle) * 18);
      pillar.castShadow = true;
      scene.add(pillar);
    }

    // Player
    const playerGeo = new THREE.CapsuleGeometry(0.4, 1.0, 8, 16);
    const playerMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.3, metalness: 0.5 });
    const player = new THREE.Mesh(playerGeo, playerMat);
    player.position.set(0, 0.9, 0);
    player.castShadow = true;
    scene.add(player);

    // Enemies
    const enemies: Enemy[] = [];
    function spawnEnemy() {
      const angle = Math.random() * Math.PI * 2;
      const dist = 15 + Math.random() * 8;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.4, 0.8),
        new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.5 }),
      );
      mesh.position.set(Math.cos(angle) * dist, 0.7, Math.sin(angle) * dist);
      mesh.castShadow = true;
      scene.add(mesh);
      enemies.push({ mesh, hp: 30, maxHp: 30, speed: 0.03 + Math.random() * 0.02 });
    }
    for (let i = 0; i < 5; i++) spawnEnemy();

    // Hit particles
    function createHitBurst(pos: THREE.Vector3, color: number) {
      const count = 20;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const vels: THREE.Vector3[] = [];
      for (let i = 0; i < count; i++) {
        positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y; positions[i * 3 + 2] = pos.z;
        vels.push(new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2 + 1, (Math.random() - 0.5) * 3));
      }
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({ color, size: 0.12, transparent: true, opacity: 1 });
      const pts = new THREE.Points(geo, mat);
      scene.add(pts);
      let life = 1.0;
      const tick = () => {
        life -= 0.04;
        if (life <= 0) { scene.remove(pts); geo.dispose(); mat.dispose(); return; }
        mat.opacity = life;
        const p = geo.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < count; i++) {
          p.setXYZ(i, p.getX(i) + vels[i].x * 0.02, p.getY(i) + vels[i].y * 0.02, p.getZ(i) + vels[i].z * 0.02);
          vels[i].y -= 0.06;
        }
        p.needsUpdate = true;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    // Input
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => keys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Attack on click
    const onClick = () => {
      if (stateRef.current.dead) return;
      const st = stateRef.current;
      if (st.stamina < 10) return;
      st.stamina = Math.max(0, st.stamina - 10);
      setStamina(st.stamina);

      // Check enemies in range
      for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i];
        const dist = player.position.distanceTo(e.mesh.position);
        if (dist < 3) {
          e.hp -= 15;
          createHitBurst(e.mesh.position.clone().setY(1), 0xff6666);
          if (e.hp <= 0) {
            scene.remove(e.mesh);
            enemies.splice(i, 1);
            st.score += 10;
            setScore(st.score);
            spawnEnemy();
          }
        }
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // Game loop
    let lastTime = performance.now();
    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      const st = stateRef.current;
      if (st.dead) { renderer.render(scene, camera); return; }

      // Player movement
      const speed = keys.has('ShiftLeft') ? 8 : 5;
      const move = new THREE.Vector3();
      if (keys.has('KeyW') || keys.has('ArrowUp')) move.z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) move.z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) move.x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) move.x += 1;
      if (move.length() > 0) {
        move.normalize().multiplyScalar(speed * dt);
        player.position.add(move);
        // Face direction
        player.rotation.y = Math.atan2(move.x, move.z);
      }

      // Clamp to arena
      const pLen = new THREE.Vector2(player.position.x, player.position.z).length();
      if (pLen > 24) {
        player.position.x *= 24 / pLen;
        player.position.z *= 24 / pLen;
      }

      // Stamina regen
      st.stamina = Math.min(100, st.stamina + 8 * dt);
      setStamina(Math.round(st.stamina));

      // Enemy AI
      for (const e of enemies) {
        const dir = new THREE.Vector3().subVectors(player.position, e.mesh.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 0.5) {
          dir.normalize().multiplyScalar(e.speed);
          e.mesh.position.add(dir);
          e.mesh.lookAt(player.position.x, e.mesh.position.y, player.position.z);
        }
        // Enemy attack
        if (dist < 1.5) {
          st.playerHP -= 8 * dt;
          if (st.playerHP <= 0) {
            st.playerHP = 0;
            st.dead = true;
            setDead(true);
          }
          setPlayerHP(Math.round(st.playerHP));
        }
      }

      // Camera follow
      const camTarget = new THREE.Vector3(player.position.x, 0, player.position.z);
      camera.position.lerp(new THREE.Vector3(camTarget.x, 10, camTarget.z + 12), 0.05);
      camera.lookAt(camTarget);

      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const cw = container.clientWidth, ch = container.clientHeight;
      camera.aspect = cw / ch; camera.updateProjectionMatrix(); renderer.setSize(cw, ch);
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
      <div ref={containerRef} className="flex-1 min-h-0 cursor-crosshair" />

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="flex items-center justify-between px-4 py-2">
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-0 text-xs font-mono">Three.js</Badge>
          <div className="flex items-center gap-4">
            <span className="text-xs text-amber-400 font-mono">Score: {score}</span>
          </div>
        </div>

        {/* Bottom HUD */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-green-400 font-bold">HP</span>
            <div className="w-32 h-3 bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${playerHP}%` }} />
            </div>
            <span className="text-[10px] text-green-400 font-mono">{playerHP}/100</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-blue-400 font-bold">STAMINA</span>
            <div className="w-32 h-3 bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all" style={{ width: `${stamina}%` }} />
            </div>
            <span className="text-[10px] text-blue-400 font-mono">{stamina}/100</span>
          </div>
        </div>

        {/* Controls hint */}
        <div className="absolute bottom-4 right-4 text-[9px] text-muted-foreground bg-black/50 rounded px-2 py-1">
          WASD — Move · Click — Attack · Shift — Sprint
        </div>

        {/* Death screen */}
        {dead && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 pointer-events-auto">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-red-500 mb-2">DEFEATED</h2>
              <p className="text-muted-foreground mb-4">Score: {score}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
