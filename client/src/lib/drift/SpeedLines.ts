import * as THREE from 'three';

const WHITE = 0xffffff;
const CYAN = 0x88eeff;
const STREAK_COUNT = 28;
const ONSET_SPEED = 0.35;

/**
 * Camera-attached radial speed streaks (ported from vfc-build arcade SpeedLines).
 */
export class SpeedLines {
  readonly group = new THREE.Group();
  private readonly mat: THREE.MeshBasicMaterial;
  private readonly geo: THREE.PlaneGeometry;
  private readonly slivers: THREE.Mesh[] = [];
  private intensity = 0;
  private pulse = 0;

  constructor(camera: THREE.PerspectiveCamera) {
    this.mat = new THREE.MeshBasicMaterial({
      color: WHITE,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.geo = new THREE.PlaneGeometry(0.09, 2.4);

    for (let i = 0; i < STREAK_COUNT; i++) {
      const m = new THREE.Mesh(this.geo, this.mat);
      const a = (i / STREAK_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      const r = 0.35 + Math.random() * 0.75;
      const depth = -0.9 - Math.random() * 2.8;
      m.position.set(Math.cos(a) * r, Math.sin(a) * r, depth);
      m.rotation.z = a - Math.PI / 2;
      m.userData.baseLen = 0.55 + Math.random() * 0.85;
      m.userData.phase = Math.random() * Math.PI * 2;
      m.scale.y = m.userData.baseLen as number;
      this.slivers.push(m);
      this.group.add(m);
    }
    this.group.renderOrder = 999;
    this.group.frustumCulled = false;
    camera.add(this.group);
  }

  update(speedRatio: number, nitroActive: boolean, dt: number): void {
    const frac = THREE.MathUtils.clamp((speedRatio - ONSET_SPEED) / (1 - ONSET_SPEED), 0, 1);
    const target = nitroActive ? Math.max(frac, 0.65) : frac;
    this.intensity += (target - this.intensity) * Math.min(1, 10 * dt);
    this.pulse += dt * (nitroActive ? 14 : 8);

    const alpha = this.intensity * (nitroActive ? 0.95 : 0.72);
    this.mat.opacity = alpha;
    this.mat.color.setHex(nitroActive || this.intensity > 0.65 ? WHITE : CYAN);

    const grow = 0.65 + this.intensity * (nitroActive ? 2.2 : 1.35);
    for (const m of this.slivers) {
      const wobble = 1 + Math.sin(this.pulse + (m.userData.phase as number)) * 0.08 * this.intensity;
      m.scale.y = (m.userData.baseLen as number) * grow * wobble;
      m.scale.x = nitroActive ? 1.15 : 1;
    }
  }

  dispose(): void {
    this.group.parent?.remove(this.group);
    this.geo.dispose();
    this.mat.dispose();
  }
}