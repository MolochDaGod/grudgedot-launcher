/**
 * Decay — Three.js FPS Survival Horror
 *
 * - PointerLockControls for FPS camera
 * - Dark corridor environment with PointLights (flickering)
 * - Fog for horror atmosphere
 * - Enemy meshes with chase AI
 * - SpotLight flashlight attached to camera
 * - HP / Ammo HUD
 */

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

interface DecayEnemy {
  mesh: THREE.Mesh;
  hp: number;
  speed: number;
  light: THREE.PointLight;
}

export default function Decay() {
  return (
    <GrudgeGameWrapper gameSlug="decay" gameName="Decay" xpPerThousand={20} goldPerGame={15}>
      {(session) => <DecayInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function DecayInner({ session }: { session: GrudgeGameSession }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hp, setHp] = useState(100);
  const [ammo, setAmmo] = useState(30);
  const [kills, setKills] = useState(0);
  const [locked, setLocked] = useState(false);
  const [dead, setDead] = useState(false);

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
    renderer.toneMappingExposure = 0.6;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050508);
    scene.fog = new THREE.FogExp2(0x050508, 0.04);

    // FPS Camera
    const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100);
    camera.position.set(0, 1.7, 0);

    // Very dim ambient
    scene.add(new THREE.AmbientLight(0x111118, 0.15));

    // Flashlight (SpotLight attached to camera)
    const flashlight = new THREE.SpotLight(0xffeebb, 2, 20, Math.PI / 6, 0.4, 1);
    flashlight.castShadow = true;
    flashlight.shadow.mapSize.set(512, 512);
    camera.add(flashlight);
    camera.add(flashlight.target);
    flashlight.target.position.set(0, 0, -1);
    scene.add(camera);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = 3;
    scene.add(ceiling);

    // Corridor walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x222228, roughness: 0.8 });
    const corridorWalls: THREE.Mesh[] = [];
    const wallPositions = [
      // Main corridor
      { x: -3, z: 0, w: 0.3, h: 3, d: 30 },
      { x: 3, z: 0, w: 0.3, h: 3, d: 30 },
      // Cross corridors
      { x: 0, z: -8, w: 10, h: 3, d: 0.3 },
      { x: -6, z: -8, w: 0.3, h: 3, d: 10 },
      { x: 6, z: -8, w: 0.3, h: 3, d: 10 },
      { x: 0, z: 8, w: 10, h: 3, d: 0.3 },
      { x: -6, z: 8, w: 0.3, h: 3, d: 10 },
      { x: 6, z: 8, w: 0.3, h: 3, d: 10 },
      // Rooms
      { x: -8, z: -12, w: 6, h: 3, d: 0.3 },
      { x: 8, z: -12, w: 6, h: 3, d: 0.3 },
      { x: -8, z: 12, w: 6, h: 3, d: 0.3 },
      { x: 8, z: 12, w: 6, h: 3, d: 0.3 },
    ];

    wallPositions.forEach(wp => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(wp.w, wp.h, wp.d), wallMat);
      wall.position.set(wp.x, wp.h / 2, wp.z);
      wall.castShadow = true;
      wall.receiveShadow = true;
      scene.add(wall);
      corridorWalls.push(wall);
    });

    // Flickering corridor lights
    const corridorLights: THREE.PointLight[] = [];
    const lightPositions = [
      new THREE.Vector3(0, 2.8, -5),
      new THREE.Vector3(0, 2.8, 5),
      new THREE.Vector3(-5, 2.8, -8),
      new THREE.Vector3(5, 2.8, -8),
    ];
    lightPositions.forEach(pos => {
      const light = new THREE.PointLight(0xff8844, 0.4, 8, 2);
      light.position.copy(pos);
      light.castShadow = true;
      scene.add(light);
      corridorLights.push(light);

      // Light fixture
      const fixture = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.1, 0.3),
        new THREE.MeshStandardMaterial({ color: 0x666666, emissive: 0xff8844, emissiveIntensity: 0.3 }),
      );
      fixture.position.copy(pos);
      scene.add(fixture);
    });

    // Enemies
    const enemies: DecayEnemy[] = [];
    const stateRef = { hp: 100, ammo: 30, kills: 0, dead: false };

    function spawnEnemy() {
      const angle = Math.random() * Math.PI * 2;
      const dist = 10 + Math.random() * 5;
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1.6, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x442222, roughness: 0.7, emissive: 0x220000, emissiveIntensity: 0.2 }),
      );
      mesh.position.set(Math.cos(angle) * dist, 0.8, Math.sin(angle) * dist);
      mesh.castShadow = true;
      scene.add(mesh);

      // Enemy glow eyes
      const eyeLight = new THREE.PointLight(0xff0000, 0.3, 3, 2);
      eyeLight.position.set(0, 0.6, -0.3);
      mesh.add(eyeLight);

      enemies.push({ mesh, hp: 20, speed: 1.5 + Math.random(), light: eyeLight });
    }
    for (let i = 0; i < 4; i++) spawnEnemy();

    // Pointer Lock
    const euler2 = new THREE.Euler(0, 0, 0, 'YXZ');
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      euler2.setFromQuaternion(camera.quaternion);
      euler2.y -= e.movementX * 0.002;
      euler2.x -= e.movementY * 0.002;
      euler2.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler2.x));
      camera.quaternion.setFromEuler(euler2);
    };
    document.addEventListener('mousemove', onMouseMove);

    const onClickLock = () => {
      if (stateRef.dead) return;
      if (document.pointerLockElement !== renderer.domElement) {
        renderer.domElement.requestPointerLock();
      } else {
        // Shoot
        if (stateRef.ammo <= 0) return;
        stateRef.ammo--;
        setAmmo(stateRef.ammo);

        // Raycast from camera
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(0, 0), camera);
        const meshes = enemies.map(e => e.mesh);
        const hits = ray.intersectObjects(meshes);
        if (hits.length > 0) {
          const hitMesh = hits[0].object;
          const enemy = enemies.find(e => e.mesh === hitMesh);
          if (enemy) {
            enemy.hp -= 10;
            // Flash red
            (enemy.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0xff0000);
            setTimeout(() => { (enemy.mesh.material as THREE.MeshStandardMaterial).emissive.setHex(0x220000); }, 100);
            if (enemy.hp <= 0) {
              scene.remove(enemy.mesh);
              const idx = enemies.indexOf(enemy);
              if (idx >= 0) enemies.splice(idx, 1);
              stateRef.kills++;
              setKills(stateRef.kills);
              spawnEnemy();
            }
          }
        }
      }
    };
    renderer.domElement.addEventListener('click', onClickLock);

    const onLockChange = () => {
      setLocked(document.pointerLockElement === renderer.domElement);
    };
    document.addEventListener('pointerlockchange', onLockChange);

    // Input
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => keys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Reload
    const onReload = (e: KeyboardEvent) => {
      if (e.code === 'KeyR') { stateRef.ammo = 30; setAmmo(30); }
    };
    window.addEventListener('keydown', onReload);

    // Game loop
    let lastTime = performance.now();
    let frame = 0;
    const moveDir = new THREE.Vector3();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (stateRef.dead) { renderer.render(scene, camera); return; }

      // Player movement (WASD)
      moveDir.set(0, 0, 0);
      const speed = keys.has('ShiftLeft') ? 5 : 3;
      if (keys.has('KeyW')) moveDir.z -= 1;
      if (keys.has('KeyS')) moveDir.z += 1;
      if (keys.has('KeyA')) moveDir.x -= 1;
      if (keys.has('KeyD')) moveDir.x += 1;
      if (moveDir.length() > 0) {
        moveDir.normalize();
        // Rotate movement to camera facing
        moveDir.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(0, euler2.y, 0)));
        camera.position.addScaledVector(moveDir, speed * dt);
      }
      // Clamp to map
      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -18, 18);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -18, 18);
      camera.position.y = 1.7;

      // Flickering lights
      corridorLights.forEach((light, i) => {
        light.intensity = 0.3 + Math.sin(now * 0.01 + i * 100) * 0.15 + Math.random() * 0.05;
      });

      // Enemy AI
      for (const e of enemies) {
        const dir = new THREE.Vector3().subVectors(camera.position, e.mesh.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 1.2) {
          dir.normalize().multiplyScalar(e.speed * dt);
          e.mesh.position.add(dir);
          e.mesh.lookAt(camera.position.x, e.mesh.position.y, camera.position.z);
        }
        if (dist < 1.5) {
          stateRef.hp -= 12 * dt;
          if (stateRef.hp <= 0) {
            stateRef.hp = 0;
            stateRef.dead = true;
            setDead(true);
            document.exitPointerLock();
          }
          setHp(Math.round(stateRef.hp));
        }
      }

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
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      renderer.domElement.removeEventListener('click', onClickLock);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('keydown', onReload);
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
          <span className="text-xs font-mono text-red-400/60">DECAY</span>
        </div>

        {/* Crosshair */}
        {locked && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="w-0.5 h-4 bg-white/40 absolute -top-2 left-1/2 -translate-x-1/2" />
            <div className="w-0.5 h-4 bg-white/40 absolute top-2 left-1/2 -translate-x-1/2" />
            <div className="w-4 h-0.5 bg-white/40 absolute top-1/2 -left-2 -translate-y-1/2" />
            <div className="w-4 h-0.5 bg-white/40 absolute top-1/2 left-2 -translate-y-1/2" />
          </div>
        )}

        {/* Click to enter */}
        {!locked && !dead && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <div className="text-center bg-black/80 rounded-xl px-8 py-6 border border-white/10">
              <h2 className="text-xl font-bold text-red-500 mb-2">DECAY</h2>
              <p className="text-sm text-muted-foreground mb-4">Click to enter</p>
              <p className="text-[10px] text-muted-foreground">WASD — Move · Mouse — Look · Click — Shoot · R — Reload</p>
            </div>
          </div>
        )}

        {/* Bottom HUD */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-xl border border-white/10">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-red-400 font-bold">HP</span>
            <div className="w-28 h-3 bg-stone-800 rounded-full overflow-hidden">
              <div className="h-full bg-red-500 transition-all" style={{ width: `${hp}%` }} />
            </div>
            <span className="text-[10px] text-red-400 font-mono">{hp}/100</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-amber-400 font-bold">AMMO</span>
            <span className="text-lg font-mono text-amber-300">{ammo}<span className="text-[10px] text-amber-400/60">/30</span></span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] text-purple-400 font-bold">KILLS</span>
            <span className="text-lg font-mono text-purple-300">{kills}</span>
          </div>
        </div>

        {/* Death screen */}
        {dead && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 pointer-events-auto">
            <div className="text-center">
              <h2 className="text-4xl font-bold text-red-500 mb-2">YOU DIED</h2>
              <p className="text-muted-foreground mb-4">Kills: {kills}</p>
              <Button variant="destructive" onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
