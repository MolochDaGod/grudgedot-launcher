import * as THREE from 'three';
import {
  createVehicleState,
  updateDriftPhysics,
  getVelocityHeading,
  speedToKmh,
  DRIFT_TUNING,
} from './driftPhysics';
import {
  createSpeedPresentationState,
  updateSpeedPresentation,
  applyCameraPresentation,
  pulseShake,
  SPEED_FX,
} from './speedPresentation';
import type { DriftEngineCallbacks, DriftHudSnapshot, DriftInput } from './types';
import {
  loadRvpTrackModel,
  buildRaceRouteFromTrack,
  snapToTrackSurface,
  type LoadedRaceTrack,
} from './trackLoader';
import {
  getClosestRouteProgress,
  isWorldOnStreet,
  type RaceRoute,
} from './streetPathfinder';

export type { DriftLoadState } from './types';

export class DriftRacingEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private disposed = false;
  private ready = false;

  private vehicle = new THREE.Group();
  private wheelMeshes: THREE.Mesh[] = [];
  private smokeParticles: THREE.Points;
  private smokePositions: Float32Array;
  private smokeVelocities: Float32Array;
  private smokeLife: Float32Array;
  private readonly smokeCount = 120;

  private vehicleState = createVehicleState();
  private speedFx = createSpeedPresentationState();
  private input: DriftInput = { throttle: 0, brake: 0, steer: 0, handbrake: false, nitro: false };
  private keys = new Set<string>();

  private track: LoadedRaceTrack | null = null;
  private route!: RaceRoute;
  private routeMarkers: THREE.Group | null = null;

  private lapStart = 0;
  private lapTime = 0;
  private bestLap = 0;
  private lastProgress = 0;

  private callbacks: DriftEngineCallbacks;

  private constructor(container: HTMLElement, callbacks: DriftEngineCallbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    const w = Math.max(1, container.clientWidth);
    const h = Math.max(1, container.clientHeight);

    this.camera = new THREE.PerspectiveCamera(SPEED_FX.fovBase, w / h, 0.5, 800);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.smokePositions = new Float32Array(this.smokeCount * 3);
    this.smokeVelocities = new Float32Array(this.smokeCount * 3);
    this.smokeLife = new Float32Array(this.smokeCount);

    const smokeGeo = new THREE.BufferGeometry();
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    this.smokeParticles = new THREE.Points(
      smokeGeo,
      new THREE.PointsMaterial({
        color: 0xcccccc,
        size: 0.35,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.smokeParticles);

    this.buildVehicle();
    this.buildLighting();

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('resize', this.onResize);
  }

  static async create(
    container: HTMLElement,
    callbacks: DriftEngineCallbacks = {},
  ): Promise<DriftRacingEngine> {
    const engine = new DriftRacingEngine(container, callbacks);
    await engine.initTrack();
    return engine;
  }

  private async initTrack() {
    this.callbacks.onLoadState?.('loading', 'Loading RVP street circuit…');
    try {
      const model = await loadRvpTrackModel((pct) => {
        this.callbacks.onLoadState?.('loading', `Loading track ${Math.round(pct * 100)}%`);
      });
      this.scene.add(model.root);

      this.callbacks.onLoadState?.('loading', 'Pathfinding legal street lap…');
      await new Promise((r) => setTimeout(r, 0));
      const { nav, route } = buildRaceRouteFromTrack(model.meshes, model.bounds);
      this.track = { ...model, nav, route };
      this.route = route;
      this.buildRouteMarkers();
      this.fitCameraToTrack();
      this.resetToStart();
      this.ready = true;
      this.lapStart = performance.now();
      this.callbacks.onLoadState?.('ready');
      this.tick();
    } catch (err) {
      console.error('[GrudgeDrift] track load failed:', err);
      this.callbacks.onLoadState?.('error', 'Failed to load RVP track');
    }
  }

  private buildLighting() {
    this.scene.background = new THREE.Color(0x0a0e18);
    this.scene.fog = new THREE.FogExp2(0x0a0e18, 0.004);

    const hemi = new THREE.HemisphereLight(0x6688bb, 0x101018, 0.55);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.1);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 400;
    const s = 120;
    sun.shadow.camera.left = -s;
    sun.shadow.camera.right = s;
    sun.shadow.camera.top = s;
    sun.shadow.camera.bottom = -s;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x6688ff, 0.35);
    fill.position.set(-40, 30, -20);
    this.scene.add(fill);
  }

  private buildRouteMarkers() {
    if (!this.track) return;
    this.routeMarkers?.removeFromParent();
    const group = new THREE.Group();
    group.name = 'RaceRouteMarkers';

    const step = Math.max(1, Math.floor(this.route.points.length / 16));
    for (let i = 0; i < this.route.points.length; i += step) {
      const p = this.route.points[i];
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.1, 1.2, 6),
        new THREE.MeshStandardMaterial({
          color: i % (step * 2) === 0 ? 0xff2244 : 0xffffff,
          emissive: 0xff2244,
          emissiveIntensity: 0.15,
        }),
      );
      post.position.set(p.x, p.y + 0.7, p.z);
      post.castShadow = true;
      group.add(post);
    }

    // Start/finish gantry
    const start = this.route.curve.getPointAt(0);
    const tangent = this.route.curve.getTangentAt(0);
    const gantry = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 2.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x44ffaa, emissiveIntensity: 0.3 }),
    );
    gantry.position.copy(start);
    gantry.position.y += 1.3;
    gantry.lookAt(start.clone().add(tangent));
    group.add(gantry);

    this.scene.add(group);
    this.routeMarkers = group;
  }

  private fitCameraToTrack() {
    if (!this.track) return;
    const size = new THREE.Vector3();
    this.track.bounds.getSize(size);
    const maxDim = Math.max(size.x, size.z);
    this.camera.far = maxDim * 4;
    this.camera.updateProjectionMatrix();
  }

  private buildVehicle() {
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.35, 0.42, 2.55),
      new THREE.MeshStandardMaterial({ color: 0xff2244, metalness: 0.6, roughness: 0.25 }),
    );
    body.position.y = 0.45;
    body.castShadow = true;
    this.vehicle.add(body);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.32, 1.15),
      new THREE.MeshStandardMaterial({ color: 0x111820, metalness: 0.8, roughness: 0.15 }),
    );
    cabin.position.set(0, 0.72, -0.15);
    this.vehicle.add(cabin);

    const spoiler = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 0.06, 0.25),
      new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 }),
    );
    spoiler.position.set(0, 0.82, 1.15);
    this.vehicle.add(spoiler);

    const wheelGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 12);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
    const positions: [number, number, number][] = [
      [-0.62, 0.28, 0.75], [0.62, 0.28, 0.75],
      [-0.62, 0.28, -0.75], [0.62, 0.28, -0.75],
    ];
    for (const [x, y, z] of positions) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, y, z);
      wheel.castShadow = true;
      this.vehicle.add(wheel);
      this.wheelMeshes.push(wheel);
    }

    this.scene.add(this.vehicle);
  }

  private resetToStart() {
    if (!this.track) return;
    const start = this.route.curve.getPointAt(0);
    const tangent = this.route.curve.getTangentAt(0);
    const snapped = snapToTrackSurface(this.track.groundMeshes, start.x, start.z) ?? start;

    this.vehicleState.position.copy(snapped);
    this.vehicleState.position.y += 0.35;
    this.vehicleState.heading = Math.atan2(-tangent.x, -tangent.z);
    this.vehicleState.velocity.set(0, 0, 0);
    this.vehicleState.speed = 0;
    this.vehicleState.driftScore = 0;
    this.vehicleState.comboMultiplier = 1;
    this.vehicleState.boost = 0;
    this.lastProgress = 0;
    this.lapStart = performance.now();
    this.lapTime = 0;
  }

  private readInput() {
    this.input.throttle = this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0;
    this.input.brake = this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0;
    let steer = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) steer -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) steer += 1;
    this.input.steer = steer;
    this.input.handbrake = this.keys.has(' ');
    this.input.nitro = this.keys.has('shift');
  }

  private updateLap() {
    if (!this.track) return;
    const closestT = getClosestRouteProgress(this.route, this.vehicleState.position);
    this.vehicleState.lapProgress = closestT;

    if (this.lastProgress > 0.88 && closestT < 0.12 && this.vehicleState.speed > 4) {
      this.vehicleState.lap++;
      this.lapTime = performance.now() - this.lapStart;
      if (this.bestLap === 0 || this.lapTime < this.bestLap) {
        this.bestLap = this.lapTime;
      }
      this.callbacks.onLapComplete?.(this.vehicleState.lap, this.lapTime);
      pulseShake(this.speedFx, 0.12);
      this.lapStart = performance.now();
    }
    this.lastProgress = closestT;
  }

  private enforceLegalTrack() {
    if (!this.track) return;
    const { position } = this.vehicleState;
    const onStreet = isWorldOnStreet(this.track.nav, position.x, position.z, 1);
    const routePoint = this.route.curve.getPointAt(this.vehicleState.lapProgress);
    const routeDist = position.distanceTo(routePoint);
    const legal = onStreet && routeDist < this.route.legalRadius * 1.35;

    if (!legal) {
      this.vehicleState.velocity.multiplyScalar(0.92);
      pulseShake(this.speedFx, 0.05);
    }
  }

  private snapVehicleToGround() {
    if (!this.track) return;
    const snapped = snapToTrackSurface(
      this.track.groundMeshes,
      this.vehicleState.position.x,
      this.vehicleState.position.z,
    );
    if (snapped) {
      this.vehicleState.position.y = THREE.MathUtils.lerp(
        this.vehicleState.position.y,
        snapped.y + 0.35,
        0.35,
      );
    }
  }

  private updateSmoke(dt: number) {
    const drifting = this.vehicleState.isDrifting;
    const positions = this.smokeParticles.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.smokeCount; i++) {
      if (this.smokeLife[i] > 0) {
        this.smokeLife[i] -= dt;
        this.smokePositions[i * 3] += this.smokeVelocities[i * 3] * dt;
        this.smokePositions[i * 3 + 1] += this.smokeVelocities[i * 3 + 1] * dt;
        this.smokePositions[i * 3 + 2] += this.smokeVelocities[i * 3 + 2] * dt;
        this.smokeVelocities[i * 3 + 1] += 0.8 * dt;
      } else if (drifting && Math.random() < 0.4) {
        const rearOffset = new THREE.Vector3(0, 0.15, 0.9)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicleState.heading);
        const side = i % 2 === 0 ? -0.55 : 0.55;
        const sideOffset = new THREE.Vector3(side, 0, 0)
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.vehicleState.heading);

        this.smokePositions[i * 3] = this.vehicleState.position.x + rearOffset.x + sideOffset.x;
        this.smokePositions[i * 3 + 1] = this.vehicleState.position.y + rearOffset.y;
        this.smokePositions[i * 3 + 2] = this.vehicleState.position.z + rearOffset.z + sideOffset.z;

        this.smokeVelocities[i * 3] = (Math.random() - 0.5) * 2;
        this.smokeVelocities[i * 3 + 1] = 0.5 + Math.random();
        this.smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
        this.smokeLife[i] = 0.4 + Math.random() * 0.5;
      }
    }
    positions.needsUpdate = true;
  }

  private emitHud() {
    const snapshot: DriftHudSnapshot = {
      speedKmh: speedToKmh(this.vehicleState.speed),
      driftScore: Math.floor(this.vehicleState.driftScore),
      combo: Math.round(this.vehicleState.comboMultiplier * 10) / 10,
      boost: this.vehicleState.boost,
      lap: this.vehicleState.lap,
      lapTime: (performance.now() - this.lapStart) / 1000,
      bestLap: this.bestLap / 1000,
      isDrifting: this.vehicleState.isDrifting,
      nitroActive: this.vehicleState.nitroActive,
    };
    this.callbacks.onHudUpdate?.(snapshot);
  }

  private tick = () => {
    if (this.disposed || !this.ready) return;
    requestAnimationFrame(this.tick);
    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.readInput();
    updateDriftPhysics(this.vehicleState, this.input, dt);
    this.snapVehicleToGround();
    this.enforceLegalTrack();
    this.updateLap();
    updateSpeedPresentation(this.speedFx, this.vehicleState, dt);
    this.updateSmoke(dt);

    this.vehicle.position.copy(this.vehicleState.position);
    this.vehicle.rotation.y = this.vehicleState.heading;

    const spin = this.vehicleState.speed * dt * 3;
    for (const wheel of this.wheelMeshes) wheel.rotation.x += spin;

    const velHeading = getVelocityHeading(this.vehicleState);
    applyCameraPresentation(
      this.camera,
      this.speedFx,
      this.vehicleState.position,
      this.vehicleState.position,
      velHeading,
      this.vehicleState.heading,
      this.speedFx.driftIntensity,
      dt,
    );

    this.renderer.toneMappingExposure = this.speedFx.exposure;
    this.renderer.render(this.scene, this.camera);
    this.emitHud();
  };

  getSpeedFx() {
    return this.speedFx;
  }

  private onKeyDown = (e: KeyboardEvent) => {
    this.keys.add(e.key.toLowerCase());
    if (e.key === ' ') e.preventDefault();
    if (e.key === 'r' || e.key === 'R') this.resetToStart();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.key.toLowerCase());
  };

  private onResize = () => {
    if (this.disposed) return;
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  };

  dispose() {
    this.disposed = true;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('resize', this.onResize);
    this.track?.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m.dispose());
      }
    });
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export { DRIFT_TUNING, SPEED_FX };