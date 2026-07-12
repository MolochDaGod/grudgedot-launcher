/**
 * Grudge Gangs — Three.js MOBA
 *
 * - Top-down RTS camera
 * - 3-lane map with terrain
 * - Towers at lane entrances & bases
 * - Minion waves marching down lanes
 * - Click-to-move champion with attack range indicator
 * - Minimap overlay
 */

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

const MAP_SIZE = 80;
const LANE_OFFSETS = [-20, 0, 20]; // top, mid, bot lane X-offsets

interface Minion {
  mesh: THREE.Mesh;
  team: 'blue' | 'red';
  lane: number;
  hp: number;
  speed: number;
}

interface Tower {
  mesh: THREE.Mesh;
  team: 'blue' | 'red';
  hp: number;
  maxHp: number;
}

export default function GrudgeGangs() {
  return (
    <GrudgeGameWrapper gameSlug="grudge-gangs" gameName="Grudge Gangs" xpPerThousand={20} goldPerGame={15}>
      {(session) => <GrudgeGangsInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function GrudgeGangsInner({ session }: { session: GrudgeGameSession }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [kills, setKills] = useState(0);
  const [champHP, setChampHP] = useState(100);

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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a1a);
    scene.fog = new THREE.Fog(0x1a2a1a, 60, 120);

    // RTS Camera
    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300);
    camera.position.set(0, 50, 35);
    camera.lookAt(0, 0, 0);

    // Lighting
    scene.add(new THREE.AmbientLight(0x446644, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 0.9);
    sun.position.set(20, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -50; sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50; sun.shadow.camera.bottom = -50;
    scene.add(sun);

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x2d4a2d, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Lanes (bright paths)
    LANE_OFFSETS.forEach(xOff => {
      const lane = new THREE.Mesh(
        new THREE.PlaneGeometry(3, MAP_SIZE - 10),
        new THREE.MeshStandardMaterial({ color: 0x3d5a3d, roughness: 0.9 }),
      );
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(xOff, 0.01, 0);
      scene.add(lane);
    });

    // Base zones
    const blueBase = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 0.5, 32),
      new THREE.MeshStandardMaterial({ color: 0x2244aa, emissive: 0x2244aa, emissiveIntensity: 0.2 }),
    );
    blueBase.position.set(0, 0.25, 35);
    scene.add(blueBase);

    const redBase = new THREE.Mesh(
      new THREE.CylinderGeometry(6, 6, 0.5, 32),
      new THREE.MeshStandardMaterial({ color: 0xaa2222, emissive: 0xaa2222, emissiveIntensity: 0.2 }),
    );
    redBase.position.set(0, 0.25, -35);
    scene.add(redBase);

    // Towers
    const towers: Tower[] = [];
    function createTower(x: number, z: number, team: 'blue' | 'red') {
      const color = team === 'blue' ? 0x4488ff : 0xff4444;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.2, 5, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 }),
      );
      mesh.position.set(x, 2.5, z);
      mesh.castShadow = true;
      scene.add(mesh);

      // Tower top
      const top = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 1.5, 8),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3 }),
      );
      top.position.set(x, 5.5, z);
      scene.add(top);

      towers.push({ mesh, team, hp: 100, maxHp: 100 });
    }

    // Place towers per lane
    LANE_OFFSETS.forEach(xOff => {
      createTower(xOff, 20, 'blue');
      createTower(xOff, -20, 'red');
    });

    // Champion (player)
    const champ = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1.2, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.3, metalness: 0.5 }),
    );
    champ.position.set(0, 1.1, 30);
    champ.castShadow = true;
    scene.add(champ);

    // Attack range indicator
    const rangeRing = new THREE.Mesh(
      new THREE.RingGeometry(3.8, 4, 32),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.15, side: THREE.DoubleSide }),
    );
    rangeRing.rotation.x = -Math.PI / 2;
    rangeRing.position.y = 0.02;
    champ.add(rangeRing);

    // Minions
    const minions: Minion[] = [];
    let minionTimer = 0;

    function spawnWave() {
      LANE_OFFSETS.forEach((xOff, laneIdx) => {
        for (let t = 0; t < 3; t++) {
          // Blue minion
          const bMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.7, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x4488ff }),
          );
          bMesh.position.set(xOff + (t - 1) * 0.8, 0.35, 30);
          bMesh.castShadow = true;
          scene.add(bMesh);
          minions.push({ mesh: bMesh, team: 'blue', lane: laneIdx, hp: 10, speed: 2 + Math.random() * 0.5 });

          // Red minion
          const rMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.7, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xff4444 }),
          );
          rMesh.position.set(xOff + (t - 1) * 0.8, 0.35, -30);
          rMesh.castShadow = true;
          scene.add(rMesh);
          minions.push({ mesh: rMesh, team: 'red', lane: laneIdx, hp: 10, speed: 2 + Math.random() * 0.5 });
        }
      });
    }
    spawnWave();

    // Click-to-move
    let moveTarget: THREE.Vector3 | null = null;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onRightClick = (e: MouseEvent) => {
      e.preventDefault();
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObject(ground);
      if (hits.length > 0) moveTarget = hits[0].point.clone();
    };
    renderer.domElement.addEventListener('contextmenu', onRightClick);

    // Attack nearest red minion on left click
    const killsRef = { current: 0 };
    const hpRef = { current: 100 };
    const onClick = () => {
      for (let i = minions.length - 1; i >= 0; i--) {
        const m = minions[i];
        if (m.team !== 'red') continue;
        if (champ.position.distanceTo(m.mesh.position) < 4) {
          m.hp -= 5;
          if (m.hp <= 0) {
            scene.remove(m.mesh);
            minions.splice(i, 1);
            killsRef.current++;
            setKills(killsRef.current);
          }
          break;
        }
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    // Minimap canvas
    const miniCanvas = document.createElement('canvas');
    miniCanvas.width = 120; miniCanvas.height = 120;
    miniCanvas.style.cssText = 'position:absolute;bottom:12px;left:12px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;pointer-events:none;';
    container.appendChild(miniCanvas);
    const miniCtx = miniCanvas.getContext('2d')!;

    function drawMinimap() {
      miniCtx.fillStyle = '#1a2a1a';
      miniCtx.fillRect(0, 0, 120, 120);
      const scale = 120 / MAP_SIZE;
      const cx = 60, cy = 60;

      // Lanes
      miniCtx.strokeStyle = '#3d5a3d';
      miniCtx.lineWidth = 2;
      LANE_OFFSETS.forEach(xOff => {
        miniCtx.beginPath();
        miniCtx.moveTo(cx + xOff * scale, 5);
        miniCtx.lineTo(cx + xOff * scale, 115);
        miniCtx.stroke();
      });

      // Towers
      towers.forEach(t => {
        miniCtx.fillStyle = t.team === 'blue' ? '#4488ff' : '#ff4444';
        miniCtx.fillRect(cx + t.mesh.position.x * scale - 2, cy - t.mesh.position.z * scale - 2, 4, 4);
      });

      // Minions
      minions.forEach(m => {
        miniCtx.fillStyle = m.team === 'blue' ? '#4488ff88' : '#ff444488';
        miniCtx.fillRect(cx + m.mesh.position.x * scale - 1, cy - m.mesh.position.z * scale - 1, 2, 2);
      });

      // Champion
      miniCtx.fillStyle = '#6366f1';
      miniCtx.beginPath();
      miniCtx.arc(cx + champ.position.x * scale, cy - champ.position.z * scale, 3, 0, Math.PI * 2);
      miniCtx.fill();
    }

    // Camera controls (WASD pan)
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => keys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Game loop
    let lastTime = performance.now();
    let frame = 0;

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Camera pan
      const panSpeed = 25 * dt;
      if (keys.has('KeyW') || keys.has('ArrowUp')) camera.position.z -= panSpeed;
      if (keys.has('KeyS') || keys.has('ArrowDown')) camera.position.z += panSpeed;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) camera.position.x -= panSpeed;
      if (keys.has('KeyD') || keys.has('ArrowRight')) camera.position.x += panSpeed;
      camera.lookAt(camera.position.x, 0, camera.position.z - 35);

      // Champion move toward target
      if (moveTarget) {
        const dir = new THREE.Vector3().subVectors(moveTarget, champ.position);
        dir.y = 0;
        if (dir.length() > 0.3) {
          dir.normalize().multiplyScalar(6 * dt);
          champ.position.add(dir);
          champ.lookAt(moveTarget.x, champ.position.y, moveTarget.z);
        } else {
          moveTarget = null;
        }
      }

      // Minion movement
      for (let i = minions.length - 1; i >= 0; i--) {
        const m = minions[i];
        const dir = m.team === 'blue' ? -1 : 1;
        m.mesh.position.z += dir * m.speed * dt;

        // Remove if reached enemy base
        if ((m.team === 'blue' && m.mesh.position.z < -35) || (m.team === 'red' && m.mesh.position.z > 35)) {
          scene.remove(m.mesh);
          minions.splice(i, 1);
          continue;
        }

        // Fight opposing minions
        for (let j = minions.length - 1; j >= 0; j--) {
          if (i === j || minions[i]?.team === minions[j]?.team) continue;
          const other = minions[j];
          if (m.mesh.position.distanceTo(other.mesh.position) < 1.5) {
            other.hp -= 3 * dt;
            m.hp -= 3 * dt;
            // Stop moving when fighting
            m.mesh.position.z -= dir * m.speed * dt * 0.8;
            if (other.hp <= 0) {
              scene.remove(other.mesh);
              minions.splice(j, 1);
              if (j < i) i--;
            }
            if (m.hp <= 0) {
              scene.remove(m.mesh);
              minions.splice(i, 1);
              break;
            }
          }
        }
      }

      // Spawn waves
      minionTimer += dt;
      if (minionTimer > 15) {
        minionTimer = 0;
        spawnWave();
      }

      // Red minions damage player
      for (const m of minions) {
        if (m.team === 'red' && champ.position.distanceTo(m.mesh.position) < 2) {
          hpRef.current = Math.max(0, hpRef.current - 5 * dt);
          setChampHP(Math.round(hpRef.current));
        }
      }

      drawMinimap();
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
      renderer.domElement.removeEventListener('contextmenu', onRightClick);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
      if (container.contains(miniCanvas)) container.removeChild(miniCanvas);
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
      <div ref={containerRef} className="flex-1 min-h-0" style={{ cursor: 'url("data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><circle cx=\'12\' cy=\'12\' r=\'4\' fill=\'none\' stroke=\'white\' stroke-width=\'2\'/><line x1=\'12\' y1=\'2\' x2=\'12\' y2=\'8\' stroke=\'white\' stroke-width=\'1\'/><line x1=\'12\' y1=\'16\' x2=\'12\' y2=\'22\' stroke=\'white\' stroke-width=\'1\'/><line x1=\'2\' y1=\'12\' x2=\'8\' y2=\'12\' stroke=\'white\' stroke-width=\'1\'/><line x1=\'16\' y1=\'12\' x2=\'22\' y2=\'12\' stroke=\'white\' stroke-width=\'1\'/></svg>") 12 12, crosshair' }} />

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="flex items-center justify-between px-4 py-2">
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-0 text-xs font-mono">Three.js</Badge>
          <span className="text-xs text-amber-400 font-mono">Kills: {kills}</span>
        </div>

        {/* Champion HP */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-green-400 font-bold">HP</span>
            <div className="w-40 h-3 bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${champHP}%` }} />
            </div>
            <span className="text-[10px] text-green-400 font-mono">{champHP}/100</span>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 text-[9px] text-muted-foreground bg-black/50 rounded px-2 py-1">
          WASD — Camera · Right-Click — Move · Left-Click — Attack
        </div>
      </div>
    </div>
  );
}
