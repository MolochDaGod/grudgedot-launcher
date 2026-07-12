/**
 * Sky Command — Three.js Flight Simulator
 *
 * - Gradient sky + fog atmosphere
 * - Terrain with mountains
 * - Player aircraft (box composite) with pitch/yaw/roll
 * - Engine trail particles
 * - Altitude / Speed / Heading HUD
 */

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { Badge } from '@/components/ui/badge';
import { GrudgeGameWrapper } from '@/components/GrudgeGameWrapper';
import type { GrudgeGameSession } from '@/hooks/useGrudgeGameSession';

export default function FlightSimulator() {
  return (
    <GrudgeGameWrapper gameSlug="flight-sim" gameName="Sky Command" xpPerThousand={10} goldPerGame={8}>
      {(session) => <FlightSimulatorInner session={session} />}
    </GrudgeGameWrapper>
  );
}

function FlightSimulatorInner({ session }: { session: GrudgeGameSession }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState({ alt: 50, speed: 60, heading: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth, h = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x88bbee, 200, 800);
    scene.background = new THREE.Color(0x88bbee);

    const camera = new THREE.PerspectiveCamera(70, w / h, 0.1, 2000);

    // Lighting
    scene.add(new THREE.AmbientLight(0x99bbdd, 0.6));
    const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
    sun.position.set(100, 200, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -200; sun.shadow.camera.right = 200;
    sun.shadow.camera.top = 200; sun.shadow.camera.bottom = -200;
    sun.shadow.camera.far = 500;
    scene.add(sun);

    // Hemisphere light for sky color
    scene.add(new THREE.HemisphereLight(0x88bbee, 0x446633, 0.4));

    // Terrain
    const terrainSize = 1000;
    const terrainSeg = 128;
    const terrainGeo = new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSeg, terrainSeg);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i), y = posAttr.getY(i);
      const height = Math.sin(x * 0.01) * 8 + Math.cos(y * 0.015) * 6 + Math.sin(x * 0.005 + y * 0.005) * 15;
      posAttr.setZ(i, Math.max(0, height));
    }
    terrainGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(
      terrainGeo,
      new THREE.MeshStandardMaterial({ color: 0x3d6b3d, roughness: 0.95, flatShading: true }),
    );
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = true;
    scene.add(terrain);

    // Water plane
    const water = new THREE.Mesh(
      new THREE.PlaneGeometry(terrainSize, terrainSize),
      new THREE.MeshStandardMaterial({ color: 0x2266aa, transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.3 }),
    );
    water.rotation.x = -Math.PI / 2;
    water.position.y = -0.5;
    scene.add(water);

    // Aircraft
    const aircraft = new THREE.Group();
    // Fuselage
    const fuselage = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.6, 3),
      new THREE.MeshStandardMaterial({ color: 0xccccdd, roughness: 0.3, metalness: 0.6 }),
    );
    fuselage.castShadow = true;
    aircraft.add(fuselage);
    // Wings
    const wing = new THREE.Mesh(
      new THREE.BoxGeometry(6, 0.08, 1.2),
      new THREE.MeshStandardMaterial({ color: 0xaaaacc, roughness: 0.4, metalness: 0.4 }),
    );
    wing.position.z = 0.3;
    wing.castShadow = true;
    aircraft.add(wing);
    // Tail
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(2, 0.06, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xaaaacc, roughness: 0.4, metalness: 0.4 }),
    );
    tail.position.z = 1.5;
    aircraft.add(tail);
    // Vertical stabilizer
    const vStab = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1, 0.6),
      new THREE.MeshStandardMaterial({ color: 0xaaaacc }),
    );
    vStab.position.set(0, 0.5, 1.5);
    aircraft.add(vStab);
    // Nose cone
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff4444, roughness: 0.3 }),
    );
    nose.rotation.x = Math.PI / 2;
    nose.position.z = -1.8;
    aircraft.add(nose);

    aircraft.position.set(0, 50, 0);
    scene.add(aircraft);

    // Engine trail particles
    const trailCount = 100;
    const trailGeo = new THREE.BufferGeometry();
    const trailPositions = new Float32Array(trailCount * 3);
    const trailAlphas = new Float32Array(trailCount);
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    const trailMat = new THREE.PointsMaterial({ color: 0xffaa44, size: 0.3, transparent: true, opacity: 0.6 });
    const trail = new THREE.Points(trailGeo, trailMat);
    scene.add(trail);
    let trailIdx = 0;

    // Flight state
    const flightState = { pitch: 0, yaw: 0, roll: 0, speed: 60, altitude: 50 };

    // Input
    const keys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => keys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => keys.delete(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Game loop
    let lastTime = performance.now();
    let frame = 0;

    const forward = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');

    const animate = () => {
      frame = requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Controls
      const pitchRate = 1.2 * dt;
      const rollRate = 2.0 * dt;
      const yawRate = 0.8 * dt;

      if (keys.has('KeyW') || keys.has('ArrowUp')) flightState.pitch -= pitchRate;
      if (keys.has('KeyS') || keys.has('ArrowDown')) flightState.pitch += pitchRate;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) flightState.roll -= rollRate;
      if (keys.has('KeyD') || keys.has('ArrowRight')) flightState.roll += rollRate;
      if (keys.has('KeyQ')) flightState.yaw += yawRate;
      if (keys.has('KeyE')) flightState.yaw -= yawRate;
      if (keys.has('ShiftLeft')) flightState.speed = Math.min(120, flightState.speed + 20 * dt);
      if (keys.has('ControlLeft')) flightState.speed = Math.max(20, flightState.speed - 20 * dt);

      // Damping
      flightState.roll *= 0.97;
      flightState.pitch *= 0.98;

      // Apply rotation
      euler.set(flightState.pitch, flightState.yaw, flightState.roll);
      quat.setFromEuler(euler);
      aircraft.quaternion.copy(quat);

      // Move forward
      forward.set(0, 0, -1).applyQuaternion(quat);
      aircraft.position.addScaledVector(forward, flightState.speed * dt);

      // Prevent ground crash
      if (aircraft.position.y < 3) {
        aircraft.position.y = 3;
        flightState.pitch = Math.max(flightState.pitch, 0);
      }

      flightState.altitude = aircraft.position.y;

      // Camera chase
      const camOffset = new THREE.Vector3(0, 3, 10).applyQuaternion(quat);
      camera.position.lerp(aircraft.position.clone().add(camOffset), 0.08);
      camera.lookAt(aircraft.position);

      // Trail
      const trailPos = trail.geometry.attributes.position as THREE.BufferAttribute;
      const worldPos = new THREE.Vector3(0, 0, 1.5).applyQuaternion(quat).add(aircraft.position);
      trailPos.setXYZ(trailIdx % trailCount, worldPos.x, worldPos.y, worldPos.z);
      trailPos.needsUpdate = true;
      trailIdx++;

      // Water animation
      water.position.y = -0.5 + Math.sin(now * 0.001) * 0.2;

      // Update sun to follow aircraft loosely
      sun.position.set(aircraft.position.x + 100, 200, aircraft.position.z + 50);
      sun.target.position.copy(aircraft.position);

      // HUD
      const headingDeg = ((THREE.MathUtils.radToDeg(flightState.yaw) % 360) + 360) % 360;
      setHud({ alt: Math.round(flightState.altitude), speed: Math.round(flightState.speed), heading: Math.round(headingDeg) });

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
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="h-full flex flex-col bg-black relative overflow-hidden">
      <div ref={containerRef} className="flex-1 min-h-0" />

      {/* HUD */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="flex items-center justify-between px-4 py-2">
          <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-0 text-xs font-mono">Three.js</Badge>
          <span className="text-xs font-mono text-white/60">SKY COMMAND</span>
        </div>

        {/* Flight instruments */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-8 bg-black/70 backdrop-blur-sm px-8 py-4 rounded-xl border border-white/10">
          <div className="text-center">
            <div className="text-[10px] text-cyan-400 font-bold mb-1">ALT</div>
            <div className="text-lg font-mono text-cyan-300">{hud.alt}<span className="text-[10px] text-cyan-400/60"> m</span></div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-[10px] text-green-400 font-bold mb-1">SPEED</div>
            <div className="text-lg font-mono text-green-300">{hud.speed}<span className="text-[10px] text-green-400/60"> kts</span></div>
          </div>
          <div className="w-px h-10 bg-white/10" />
          <div className="text-center">
            <div className="text-[10px] text-amber-400 font-bold mb-1">HDG</div>
            <div className="text-lg font-mono text-amber-300">{hud.heading}°</div>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 text-[9px] text-muted-foreground bg-black/50 rounded px-2 py-1">
          W/S — Pitch · A/D — Roll · Q/E — Yaw · Shift/Ctrl — Throttle
        </div>

        {/* Crosshair */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-6 h-6 border border-white/30 rounded-full" />
          <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white/60 rounded-full -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>
    </div>
  );
}
