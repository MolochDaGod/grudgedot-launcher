/**
 * Grudge Gangs — Top-down MOBA (GrudgeDot)
 *
 * TVS voxel assets from D1/R2 CDN:
 *  - Knight keeps (nexus), towers, ranger camps
 *  - Champion from voxel-knights roster
 *  - Top-down RTS camera + 3 lanes
 */

import { useRef, useEffect, useState } from "react";
import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GrudgeGameWrapper } from "@/components/GrudgeGameWrapper";
import type { GrudgeGameSession } from "@/hooks/useGrudgeGameSession";
import { TVS_MOBA, loadTvsFbx } from "@/lib/tvs-cdn";

const MAP_SIZE = 80;
const LANE_OFFSETS = [-20, 0, 20];

interface Minion {
  mesh: THREE.Object3D;
  team: "blue" | "red";
  lane: number;
  hp: number;
  speed: number;
}

interface Tower {
  mesh: THREE.Object3D;
  team: "blue" | "red";
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
  const [assetStatus, setAssetStatus] = useState("Loading TVS MOBA assets…");

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const w = container.clientWidth;
    const h = container.clientHeight;
    let disposed = false;

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2a1a);
    scene.fog = new THREE.Fog(0x1a2a1a, 60, 120);

    const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 300);
    camera.position.set(0, 50, 35);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0x446644, 0.65));
    const sun = new THREE.DirectionalLight(0xffeedd, 0.95);
    sun.position.set(20, 40, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE),
      new THREE.MeshStandardMaterial({ color: 0x2d4a2d, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    LANE_OFFSETS.forEach((xOff) => {
      const lane = new THREE.Mesh(
        new THREE.PlaneGeometry(3, MAP_SIZE - 10),
        new THREE.MeshStandardMaterial({ color: 0x3d5a3d, roughness: 0.9 }),
      );
      lane.rotation.x = -Math.PI / 2;
      lane.position.set(xOff, 0.01, 0);
      scene.add(lane);
    });

    // Team base pads (fallback under keeps)
    const bluePad = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0x2244aa, emissive: 0x112244, emissiveIntensity: 0.25 }),
    );
    bluePad.position.set(0, 0.2, 35);
    scene.add(bluePad);
    const redPad = new THREE.Mesh(
      new THREE.CylinderGeometry(7, 7, 0.4, 32),
      new THREE.MeshStandardMaterial({ color: 0xaa2222, emissive: 0x441111, emissiveIntensity: 0.25 }),
    );
    redPad.position.set(0, 0.2, -35);
    scene.add(redPad);

    const towers: Tower[] = [];
    const minions: Minion[] = [];
    let champ: THREE.Object3D = new THREE.Group();
    champ.position.set(0, 0, 30);
    scene.add(champ);

    const placeholderChamp = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1.2, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x6366f1 }),
    );
    placeholderChamp.position.y = 1.1;
    champ.add(placeholderChamp);

    function primitiveTower(x: number, z: number, team: "blue" | "red") {
      const color = team === "blue" ? 0x4488ff : 0xff4444;
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 1.2, 5, 8),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3 }),
      );
      mesh.position.set(x, 2.5, z);
      mesh.castShadow = true;
      scene.add(mesh);
      towers.push({ mesh, team, hp: 100, maxHp: 100 });
    }

    // Async TVS load
    (async () => {
      try {
        setAssetStatus("TVS · loading keeps & towers…");
        const keepB = await loadTvsFbx(THREE, FBXLoader as any, TVS_MOBA.keep.model, TVS_MOBA.keep.tex, 8);
        const keepR = keepB.clone(true);
        keepB.position.set(0, 0, 35);
        keepR.position.set(0, 0, -35);
        if (!disposed) {
          scene.add(keepB);
          scene.add(keepR);
        }

        const towerKinds = [TVS_MOBA.tower, TVS_MOBA.rangerTower, TVS_MOBA.wizardTower];
        for (let i = 0; i < LANE_OFFSETS.length; i++) {
          const xOff = LANE_OFFSETS[i];
          const kind = towerKinds[i % 3];
          const tBlue = await loadTvsFbx(THREE, FBXLoader as any, kind.model, kind.tex, 5);
          const tRed = tBlue.clone(true);
          tBlue.position.set(xOff, 0, 20);
          tRed.position.set(xOff, 0, -20);
          if (!disposed) {
            scene.add(tBlue);
            scene.add(tRed);
            towers.push({ mesh: tBlue, team: "blue", hp: 100, maxHp: 100 });
            towers.push({ mesh: tRed, team: "red", hp: 100, maxHp: 100 });
          }
        }

        // Jungle tents
        for (const p of [
          [-28, 8],
          [28, 8],
          [-28, -8],
          [28, -8],
        ] as const) {
          const tent = await loadTvsFbx(THREE, FBXLoader as any, TVS_MOBA.tent.model, TVS_MOBA.tent.tex, 2.5);
          tent.position.set(p[0], 0, p[1]);
          if (!disposed) scene.add(tent);
        }

        setAssetStatus("TVS · loading champion…");
        const hero = await loadTvsFbx(THREE, FBXLoader as any, TVS_MOBA.champion.model, TVS_MOBA.champion.tex, 2);
        if (!disposed) {
          champ.clear();
          champ.add(hero);
          setAssetStatus("TVS MOBA ready · D1/R2 knights · rangers · wizards");
        }
      } catch (err) {
        console.warn("[GrudgeGangs] TVS fallback primitives", err);
        setAssetStatus("TVS offline · primitive fallback");
        LANE_OFFSETS.forEach((xOff) => {
          primitiveTower(xOff, 20, "blue");
          primitiveTower(xOff, -20, "red");
        });
      }
    })();

    // Attack range
    const rangeRing = new THREE.Mesh(
      new THREE.RingGeometry(3.8, 4, 32),
      new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.15, side: THREE.DoubleSide }),
    );
    rangeRing.rotation.x = -Math.PI / 2;
    rangeRing.position.y = 0.05;
    champ.add(rangeRing);

    function spawnWave() {
      LANE_OFFSETS.forEach((xOff, laneIdx) => {
        for (let t = 0; t < 3; t++) {
          const bMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.7, 0.5),
            new THREE.MeshStandardMaterial({ color: 0x4488ff }),
          );
          bMesh.position.set(xOff + (t - 1) * 0.8, 0.35, 30);
          bMesh.castShadow = true;
          scene.add(bMesh);
          minions.push({ mesh: bMesh, team: "blue", lane: laneIdx, hp: 10, speed: 2 + Math.random() * 0.5 });

          const rMesh = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.7, 0.5),
            new THREE.MeshStandardMaterial({ color: 0xff4444 }),
          );
          rMesh.position.set(xOff + (t - 1) * 0.8, 0.35, -30);
          rMesh.castShadow = true;
          scene.add(rMesh);
          minions.push({ mesh: rMesh, team: "red", lane: laneIdx, hp: 10, speed: 2 + Math.random() * 0.5 });
        }
      });
    }
    spawnWave();

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
    renderer.domElement.addEventListener("contextmenu", onRightClick);

    const killsRef = { current: 0 };
    const onClick = () => {
      for (let i = minions.length - 1; i >= 0; i--) {
        const m = minions[i];
        if (m.team !== "red") continue;
        if (champ.position.distanceTo(m.mesh.position) < 4) {
          m.hp -= 5;
          if (m.hp <= 0) {
            scene.remove(m.mesh);
            minions.splice(i, 1);
            killsRef.current++;
            setKills(killsRef.current);
            try {
              session.reportKill?.();
            } catch {
              /* optional */
            }
          }
          break;
        }
      }
    };
    renderer.domElement.addEventListener("click", onClick);

    const miniCanvas = document.createElement("canvas");
    miniCanvas.width = 120;
    miniCanvas.height = 120;
    miniCanvas.style.cssText =
      "position:absolute;bottom:12px;left:12px;border:1px solid rgba(255,255,255,0.2);border-radius:4px;pointer-events:none;";
    container.appendChild(miniCanvas);
    const miniCtx = miniCanvas.getContext("2d")!;

    function drawMinimap() {
      miniCtx.fillStyle = "#1a2a1a";
      miniCtx.fillRect(0, 0, 120, 120);
      const scale = 120 / MAP_SIZE;
      const cx = 60,
        cy = 60;
      miniCtx.strokeStyle = "#3d5a3d";
      miniCtx.lineWidth = 2;
      LANE_OFFSETS.forEach((xOff) => {
        miniCtx.beginPath();
        miniCtx.moveTo(cx + xOff * scale, 8);
        miniCtx.lineTo(cx + xOff * scale, 112);
        miniCtx.stroke();
      });
      miniCtx.fillStyle = "#4488ff";
      miniCtx.beginPath();
      miniCtx.arc(cx, cy + 35 * scale, 4, 0, Math.PI * 2);
      miniCtx.fill();
      miniCtx.fillStyle = "#ff4444";
      miniCtx.beginPath();
      miniCtx.arc(cx, cy - 35 * scale, 4, 0, Math.PI * 2);
      miniCtx.fill();
      miniCtx.fillStyle = "#a78bfa";
      miniCtx.beginPath();
      miniCtx.arc(cx + champ.position.x * scale, cy - champ.position.z * scale, 3, 0, Math.PI * 2);
      miniCtx.fill();
    }

    let waveTimer = 0;
    const clock = new THREE.Clock();
    let animId = 0;

    function tick() {
      if (disposed) return;
      animId = requestAnimationFrame(tick);
      const dt = Math.min(clock.getDelta(), 0.05);

      if (moveTarget) {
        const dir = moveTarget.clone().sub(champ.position);
        dir.y = 0;
        const dist = dir.length();
        if (dist > 0.15) {
          dir.normalize();
          champ.position.addScaledVector(dir, 8 * dt);
          champ.rotation.y = Math.atan2(dir.x, dir.z);
        } else moveTarget = null;
      }

      for (const m of minions) {
        const targetZ = m.team === "blue" ? -35 : 35;
        const dz = targetZ - m.mesh.position.z;
        if (Math.abs(dz) > 0.5) {
          m.mesh.position.z += Math.sign(dz) * m.speed * dt;
        }
      }

      waveTimer += dt;
      if (waveTimer > 12) {
        waveTimer = 0;
        spawnWave();
      }

      // Soft tower damage if enemy minions near
      for (const t of towers) {
        for (const m of minions) {
          if (m.team === t.team) continue;
          if (t.mesh.position.distanceTo(m.mesh.position) < 3) {
            t.hp -= 2 * dt;
            if (t.hp <= 0) {
              scene.remove(t.mesh);
              t.hp = 0;
            }
          }
        }
      }

      setChampHP((hp) => Math.min(100, hp + 2 * dt));
      drawMinimap();
      renderer.render(scene, camera);
    }
    tick();

    const onResize = () => {
      if (!containerRef.current) return;
      const rw = containerRef.current.clientWidth;
      const rh = containerRef.current.clientHeight;
      renderer.setSize(rw, rh);
      camera.aspect = rw / Math.max(1, rh);
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      renderer.domElement.removeEventListener("contextmenu", onRightClick);
      renderer.domElement.removeEventListener("click", onClick);
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      if (miniCanvas.parentNode) miniCanvas.parentNode.removeChild(miniCanvas);
    };
  }, [session]);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-black">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none z-10">
        <Badge variant="outline" className="bg-black/70 border-amber-700/50 text-amber-200">
          MOBA · Top-down · TVS
        </Badge>
        <div className="text-[10px] text-emerald-400/90 bg-black/60 px-2 py-1 rounded max-w-xs">{assetStatus}</div>
      </div>
      <div className="absolute top-3 right-3 flex gap-3 z-10">
        <Badge className="bg-violet-900/80">Kills {kills}</Badge>
        <Badge className="bg-rose-900/80">HP {Math.round(champHP)}</Badge>
      </div>
      <div className="absolute bottom-3 right-3 z-10 pointer-events-auto">
        <Button size="sm" variant="secondary" onClick={() => setChampHP(100)}>
          Recall base
        </Button>
      </div>
      <div className="absolute bottom-3 left-36 text-[10px] text-white/50 z-10">
        RMB move · LMB attack · TVS knights / rangers / wizards CDN
      </div>
    </div>
  );
}
