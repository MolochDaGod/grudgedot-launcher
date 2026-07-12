import * as THREE from 'three';

export interface SpellConfig {
  color: THREE.Color | string;
  colorSecondary?: THREE.Color | string;
  intensity: number;
  size: number;
  speed: number;
  duration: number;
}

// ── Shared geometry pool (prevents GC thrashing) ─────────────────────────────
let _fireballGeom: THREE.SphereGeometry | null = null;
function getFireballGeometry(size: number): THREE.SphereGeometry {
  // Use low-poly sphere — 8x8 segments instead of 32x32 (8x fewer triangles)
  if (!_fireballGeom) _fireballGeom = new THREE.SphereGeometry(1, 8, 8);
  return _fireballGeom;
}

export class FireballEffect {
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;
  private glowMesh: THREE.Mesh;
  private glowMaterial: THREE.MeshBasicMaterial;
  private group: THREE.Group;
  private time: number = 0;
  private size: number;

  constructor(size: number = 1, color: string = '#ff6600') {
    this.size = size;
    this.group = new THREE.Group();

    // Core: cheap MeshBasicMaterial with additive blending (no shader compile)
    this.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ffdd00'),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const geom = getFireballGeometry(size);
    this.mesh = new THREE.Mesh(geom, this.material);
    this.mesh.scale.setScalar(size * 0.6);
    this.group.add(this.mesh);

    // Outer glow: slightly larger, lower opacity
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.glowMesh = new THREE.Mesh(geom, this.glowMaterial);
    this.glowMesh.scale.setScalar(size * 1.2);
    this.group.add(this.glowMesh);

    // NO PointLight — saves a shadow pass per fireball
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    // Pulsate scale for visual fire effect
    const pulse = 1 + Math.sin(this.time * 12) * 0.15;
    this.mesh.scale.setScalar(this.size * 0.6 * pulse);
    this.glowMesh.scale.setScalar(this.size * 1.2 * (2 - pulse));
    this.material.opacity = 0.8 + Math.sin(this.time * 8) * 0.2;
  }

  public getObject3D(): THREE.Group {
    return this.group;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  public dispose(): void {
    // Don't dispose shared geometry — only materials
    this.material.dispose();
    this.glowMaterial.dispose();
  }
}

export class FrostEffect {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private particles: THREE.Points;
  private particleMaterial: THREE.PointsMaterial;
  private group: THREE.Group;
  private time: number = 0;

  constructor(size: number = 1, color: string = '#88ccff') {
    this.group = new THREE.Group();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0.7 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        uniform float uTime;
        
        void main() {
          vUv = uv;
          vPosition = position;
          
          vec3 pos = position;
          pos += normal * sin(uTime * 2.0 + position.y * 5.0) * 0.05;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        
        varying vec2 vUv;
        varying vec3 vPosition;
        
        float random(vec2 st) {
          return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }
        
        void main() {
          float edge = 1.0 - length(vPosition);
          float shimmer = sin(uTime * 5.0 + vPosition.x * 10.0 + vPosition.y * 10.0) * 0.5 + 0.5;
          
          vec3 color = uColor + vec3(0.2, 0.2, 0.3) * shimmer;
          float alpha = edge * uOpacity * (0.8 + shimmer * 0.2);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const geometry = new THREE.IcosahedronGeometry(size, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.group.add(this.mesh);

    const particleCount = 50;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = size * (0.8 + Math.random() * 0.5);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = r * Math.cos(phi);
      particlePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.1,
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(particleGeometry, this.particleMaterial);
    this.group.add(this.particles);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.material.uniforms.uTime.value = this.time;
    this.particles.rotation.y += deltaTime * 0.5;
  }

  public getObject3D(): THREE.Group {
    return this.group;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
  }
}

export class LightningEffect {
  private bolts: THREE.Line[] = [];
  private material: THREE.LineBasicMaterial;
  private group: THREE.Group;
  private startPoint: THREE.Vector3;
  private endPoint: THREE.Vector3;
  private time: number = 0;
  private flashLight: THREE.PointLight;

  constructor(start: THREE.Vector3, end: THREE.Vector3, color: string = '#aaddff') {
    this.group = new THREE.Group();
    this.startPoint = start.clone();
    this.endPoint = end.clone();

    this.material = new THREE.LineBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });

    this.generateBolts();

    this.flashLight = new THREE.PointLight(color, 5, 20);
    this.flashLight.position.copy(start.clone().add(end).multiplyScalar(0.5));
    this.group.add(this.flashLight);
  }

  private generateBolts(): void {
    this.bolts.forEach(bolt => {
      this.group.remove(bolt);
      bolt.geometry.dispose();
    });
    this.bolts = [];

    for (let b = 0; b < 3; b++) {
      const points: THREE.Vector3[] = [];
      const segments = 15;
      const direction = this.endPoint.clone().sub(this.startPoint);
      const segmentLength = direction.length() / segments;

      let currentPoint = this.startPoint.clone();
      points.push(currentPoint.clone());

      for (let i = 1; i < segments; i++) {
        const t = i / segments;
        const basePoint = this.startPoint.clone().lerp(this.endPoint, t);
        
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * segmentLength * 0.8,
          (Math.random() - 0.5) * segmentLength * 0.8,
          (Math.random() - 0.5) * segmentLength * 0.8
        );
        
        currentPoint = basePoint.add(offset);
        points.push(currentPoint.clone());
      }
      points.push(this.endPoint.clone());

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const bolt = new THREE.Line(geometry, this.material.clone());
      (bolt.material as THREE.LineBasicMaterial).opacity = 0.5 + Math.random() * 0.5;
      this.bolts.push(bolt);
      this.group.add(bolt);
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    
    if (Math.random() < 0.3) {
      this.generateBolts();
    }

    this.flashLight.intensity = 3 + Math.random() * 4;
  }

  public getObject3D(): THREE.Group {
    return this.group;
  }

  public dispose(): void {
    this.bolts.forEach(bolt => {
      bolt.geometry.dispose();
      (bolt.material as THREE.Material).dispose();
    });
    this.material.dispose();
  }
}

export class HealingAura {
  private ring: THREE.Mesh;
  private particles: THREE.Points;
  private particlePositions: Float32Array;
  private particleVelocities: Float32Array;
  private material: THREE.ShaderMaterial;
  private particleMaterial: THREE.PointsMaterial;
  private group: THREE.Group;
  private time: number = 0;
  private size: number;

  constructor(size: number = 2, color: string = '#00ff88') {
    this.group = new THREE.Group();
    this.size = size;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: `
        varying vec2 vUv;
        uniform float uTime;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          pos.z += sin(uTime * 2.0 + position.x * 3.0) * 0.1;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        
        void main() {
          float dist = length(vUv - vec2(0.5));
          float ring = smoothstep(0.4, 0.45, dist) * (1.0 - smoothstep(0.45, 0.5, dist));
          float pulse = sin(uTime * 3.0) * 0.3 + 0.7;
          
          vec3 color = uColor * (1.0 + pulse * 0.5);
          float alpha = ring * pulse;
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const ringGeometry = new THREE.RingGeometry(size * 0.8, size, 32);
    this.ring = new THREE.Mesh(ringGeometry, this.material);
    this.ring.rotation.x = -Math.PI / 2;
    this.group.add(this.ring);

    const particleCount = 30;
    this.particlePositions = new Float32Array(particleCount * 3);
    this.particleVelocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      this.particlePositions[i * 3] = Math.cos(angle) * size * 0.5;
      this.particlePositions[i * 3 + 1] = 0;
      this.particlePositions[i * 3 + 2] = Math.sin(angle) * size * 0.5;

      this.particleVelocities[i * 3 + 1] = 0.5 + Math.random() * 0.5;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));

    this.particleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(particleGeometry, this.particleMaterial);
    this.group.add(this.particles);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.material.uniforms.uTime.value = this.time;

    const positions = this.particles.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3 + 1] += this.particleVelocities[i * 3 + 1] * deltaTime;
      
      if (positions[i * 3 + 1] > 2) {
        const angle = (i / (positions.length / 3)) * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * this.size * 0.5;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = Math.sin(angle) * this.size * 0.5;
      }
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  public getObject3D(): THREE.Group {
    return this.group;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  public dispose(): void {
    this.ring.geometry.dispose();
    this.material.dispose();
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
  }
}

export class PortalEffect {
  private ring: THREE.Mesh;
  private vortex: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private vortexMaterial: THREE.ShaderMaterial;
  private group: THREE.Group;
  private time: number = 0;
  private light: THREE.PointLight;

  constructor(size: number = 2, color: string = '#9966ff') {
    this.group = new THREE.Group();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vUv - vec2(0.5);
          float dist = length(center);
          float angle = atan(center.y, center.x);
          
          float spiral = sin(angle * 5.0 - uTime * 3.0 + dist * 20.0);
          float ring = smoothstep(0.3, 0.35, dist) * (1.0 - smoothstep(0.45, 0.5, dist));
          
          vec3 color = uColor * (1.0 + spiral * 0.3);
          float alpha = ring * (0.7 + spiral * 0.3);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const ringGeometry = new THREE.RingGeometry(size * 0.6, size, 64);
    this.ring = new THREE.Mesh(ringGeometry, this.material);
    this.group.add(this.ring);

    this.vortexMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        
        void main() {
          vec2 center = vUv - vec2(0.5);
          float dist = length(center);
          float angle = atan(center.y, center.x);
          
          float vortex = sin(angle * 8.0 + uTime * 5.0 - dist * 30.0) * 0.5 + 0.5;
          float fade = 1.0 - smoothstep(0.0, 0.4, dist);
          
          vec3 color = mix(uColor * 0.5, vec3(1.0), vortex * fade);
          float alpha = fade * (0.5 + vortex * 0.5);
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const vortexGeometry = new THREE.CircleGeometry(size * 0.55, 64);
    this.vortex = new THREE.Mesh(vortexGeometry, this.vortexMaterial);
    this.vortex.position.z = 0.01;
    this.group.add(this.vortex);

    this.light = new THREE.PointLight(color, 2, size * 5);
    this.light.position.z = 0.5;
    this.group.add(this.light);
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.material.uniforms.uTime.value = this.time;
    this.vortexMaterial.uniforms.uTime.value = this.time;
    
    this.light.intensity = 1.5 + Math.sin(this.time * 2) * 0.5;
  }

  public getObject3D(): THREE.Group {
    return this.group;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  public dispose(): void {
    this.ring.geometry.dispose();
    this.material.dispose();
    this.vortex.geometry.dispose();
    this.vortexMaterial.dispose();
  }
}

export class SpellEffectsManager {
  private scene: THREE.Scene;
  private activeEffects: { effect: any; endTime: number; type: string }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public spawnFireball(position: THREE.Vector3, size: number = 1, duration: number = 2): FireballEffect {
    const effect = new FireballEffect(size);
    effect.setPosition(position.x, position.y, position.z);
    this.scene.add(effect.getObject3D());
    
    this.activeEffects.push({
      effect,
      endTime: Date.now() + duration * 1000,
      type: 'fireball',
    });
    
    return effect;
  }

  public spawnFrost(position: THREE.Vector3, size: number = 1, duration: number = 2): FrostEffect {
    const effect = new FrostEffect(size);
    effect.setPosition(position.x, position.y, position.z);
    this.scene.add(effect.getObject3D());
    
    this.activeEffects.push({
      effect,
      endTime: Date.now() + duration * 1000,
      type: 'frost',
    });
    
    return effect;
  }

  public spawnLightning(start: THREE.Vector3, end: THREE.Vector3, duration: number = 0.5): LightningEffect {
    const effect = new LightningEffect(start, end);
    this.scene.add(effect.getObject3D());
    
    this.activeEffects.push({
      effect,
      endTime: Date.now() + duration * 1000,
      type: 'lightning',
    });
    
    return effect;
  }

  public spawnHealingAura(position: THREE.Vector3, size: number = 2, duration: number = 3): HealingAura {
    const effect = new HealingAura(size);
    effect.setPosition(position.x, position.y, position.z);
    this.scene.add(effect.getObject3D());
    
    this.activeEffects.push({
      effect,
      endTime: Date.now() + duration * 1000,
      type: 'heal',
    });
    
    return effect;
  }

  public spawnPortal(position: THREE.Vector3, size: number = 2, duration: number = 5): PortalEffect {
    const effect = new PortalEffect(size);
    effect.setPosition(position.x, position.y, position.z);
    this.scene.add(effect.getObject3D());
    
    this.activeEffects.push({
      effect,
      endTime: Date.now() + duration * 1000,
      type: 'portal',
    });
    
    return effect;
  }

  public update(deltaTime: number): void {
    const now = Date.now();

    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const activeEffect = this.activeEffects[i];
      activeEffect.effect.update(deltaTime);

      if (now >= activeEffect.endTime) {
        this.scene.remove(activeEffect.effect.getObject3D());
        activeEffect.effect.dispose();
        this.activeEffects.splice(i, 1);
      }
    }
  }

  public dispose(): void {
    this.activeEffects.forEach(({ effect }) => {
      this.scene.remove(effect.getObject3D());
      effect.dispose();
    });
    this.activeEffects = [];
  }
}
