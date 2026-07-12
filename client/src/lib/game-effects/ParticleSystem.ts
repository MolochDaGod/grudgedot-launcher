import * as THREE from 'three';

export interface ParticleConfig {
  count: number;
  size: number;
  color: THREE.Color | string;
  colorEnd?: THREE.Color | string;
  lifetime: number;
  speed: number;
  spread: number;
  gravity?: number;
  fadeOut?: boolean;
  scaleOverLife?: boolean;
  emitRate?: number;
  texture?: THREE.Texture;
  blending?: THREE.Blending;
  opacity?: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
  colorEnd: THREE.Color;
}

export class ParticleEmitter {
  private particles: Particle[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial | THREE.ShaderMaterial;
  private points: THREE.Points;
  private config: ParticleConfig;
  private isActive: boolean = true;
  private emitTimer: number = 0;
  private useShader: boolean = false;

  constructor(config: ParticleConfig, useShader: boolean = false) {
    this.config = config;
    this.useShader = useShader;
    this.geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(config.count * 3);
    const colors = new Float32Array(config.count * 3);
    const sizes = new Float32Array(config.count);
    const lifetimes = new Float32Array(config.count);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));

    if (useShader) {
      this.material = this.createShaderMaterial(config);
    } else {
      const color = typeof config.color === 'string' ? new THREE.Color(config.color) : config.color;
      this.material = new THREE.PointsMaterial({
        size: config.size,
        color: color,
        transparent: true,
        opacity: config.opacity ?? 1,
        blending: config.blending ?? THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
        sizeAttenuation: true,
      });

      if (config.texture) {
        this.material.map = config.texture;
      }
    }

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
  }

  private createShaderMaterial(config: ParticleConfig): THREE.ShaderMaterial {
    const color = typeof config.color === 'string' ? new THREE.Color(config.color) : config.color;
    
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: color },
        uSize: { value: config.size },
      },
      vertexShader: `
        attribute float size;
        attribute float lifetime;
        attribute vec3 color;
        varying float vLifetime;
        varying vec3 vColor;
        
        void main() {
          vLifetime = lifetime;
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vLifetime;
        varying vec3 vColor;
        
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          
          float alpha = smoothstep(0.5, 0.0, dist) * vLifetime;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: config.blending ?? THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  public emit(position: THREE.Vector3, count?: number): void {
    const emitCount = count ?? this.config.count;
    const colorStart = typeof this.config.color === 'string' 
      ? new THREE.Color(this.config.color) 
      : this.config.color.clone();
    const colorEnd = this.config.colorEnd 
      ? (typeof this.config.colorEnd === 'string' 
          ? new THREE.Color(this.config.colorEnd) 
          : this.config.colorEnd.clone())
      : colorStart.clone();

    for (let i = 0; i < emitCount; i++) {
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * this.config.spread,
        Math.random() * this.config.speed,
        (Math.random() - 0.5) * this.config.spread
      );

      this.particles.push({
        position: position.clone(),
        velocity: velocity,
        life: this.config.lifetime,
        maxLife: this.config.lifetime,
        size: this.config.size * (0.5 + Math.random() * 0.5),
        color: colorStart.clone(),
        colorEnd: colorEnd.clone(),
      });
    }
  }

  public emitBurst(position: THREE.Vector3, count: number, direction?: THREE.Vector3): void {
    const colorStart = typeof this.config.color === 'string' 
      ? new THREE.Color(this.config.color) 
      : this.config.color.clone();
    const colorEnd = this.config.colorEnd 
      ? (typeof this.config.colorEnd === 'string' 
          ? new THREE.Color(this.config.colorEnd) 
          : this.config.colorEnd.clone())
      : colorStart.clone();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const spread = this.config.spread;
      
      let velocity: THREE.Vector3;
      if (direction) {
        velocity = direction.clone()
          .multiplyScalar(this.config.speed)
          .add(new THREE.Vector3(
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread,
            (Math.random() - 0.5) * spread
          ));
      } else {
        velocity = new THREE.Vector3(
          Math.cos(angle) * this.config.speed + (Math.random() - 0.5) * spread,
          Math.random() * this.config.speed * 0.5,
          Math.sin(angle) * this.config.speed + (Math.random() - 0.5) * spread
        );
      }

      this.particles.push({
        position: position.clone(),
        velocity: velocity,
        life: this.config.lifetime * (0.5 + Math.random() * 0.5),
        maxLife: this.config.lifetime,
        size: this.config.size * (0.5 + Math.random() * 0.5),
        color: colorStart.clone(),
        colorEnd: colorEnd.clone(),
      });
    }
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    const gravity = this.config.gravity ?? 0;
    const fadeOut = this.config.fadeOut ?? true;
    const scaleOverLife = this.config.scaleOverLife ?? true;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;
    const lifetimes = this.geometry.attributes.lifetime.array as Float32Array;

    let aliveCount = 0;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life -= deltaTime;

      if (particle.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      particle.velocity.y -= gravity * deltaTime;
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));

      const lifeRatio = particle.life / particle.maxLife;
      
      const idx = aliveCount * 3;
      positions[idx] = particle.position.x;
      positions[idx + 1] = particle.position.y;
      positions[idx + 2] = particle.position.z;

      const lerpedColor = particle.color.clone().lerp(particle.colorEnd, 1 - lifeRatio);
      colors[idx] = lerpedColor.r;
      colors[idx + 1] = lerpedColor.g;
      colors[idx + 2] = lerpedColor.b;

      sizes[aliveCount] = scaleOverLife 
        ? particle.size * lifeRatio 
        : particle.size;
      
      lifetimes[aliveCount] = fadeOut ? lifeRatio : 1;

      aliveCount++;
    }

    for (let i = aliveCount; i < this.config.count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -10000;
      positions[i * 3 + 2] = 0;
      sizes[i] = 0;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.lifetime.needsUpdate = true;

    if (this.useShader && this.material instanceof THREE.ShaderMaterial) {
      this.material.uniforms.uTime.value += deltaTime;
    }
  }

  public getObject3D(): THREE.Points {
    return this.points;
  }

  public setActive(active: boolean): void {
    this.isActive = active;
    this.points.visible = active;
  }

  public reset(): void {
    this.particles = [];
  }

  public dispose(): void {
    this.geometry.dispose();
    if (this.material instanceof THREE.Material) {
      this.material.dispose();
    }
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}

export class ParticleEffectPresets {
  static explosion(color: string = '#ff6600'): ParticleConfig {
    return {
      count: 100,
      size: 0.5,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#ff0000'),
      lifetime: 0.8,
      speed: 8,
      spread: 5,
      gravity: 15,
      fadeOut: true,
      scaleOverLife: true,
      blending: THREE.AdditiveBlending,
    };
  }

  static fire(color: string = '#ff4400'): ParticleConfig {
    return {
      count: 50,
      size: 0.4,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#ffff00'),
      lifetime: 1.2,
      speed: 3,
      spread: 1,
      gravity: -2,
      fadeOut: true,
      scaleOverLife: true,
      blending: THREE.AdditiveBlending,
    };
  }

  static smoke(color: string = '#888888'): ParticleConfig {
    return {
      count: 30,
      size: 1,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#333333'),
      lifetime: 2,
      speed: 1.5,
      spread: 0.5,
      gravity: -0.5,
      fadeOut: true,
      scaleOverLife: false,
      blending: THREE.NormalBlending,
      opacity: 0.6,
    };
  }

  static spark(color: string = '#ffff00'): ParticleConfig {
    return {
      count: 20,
      size: 0.15,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#ff8800'),
      lifetime: 0.5,
      speed: 12,
      spread: 3,
      gravity: 20,
      fadeOut: true,
      scaleOverLife: true,
      blending: THREE.AdditiveBlending,
    };
  }

  static blood(color: string = '#8b0000'): ParticleConfig {
    return {
      count: 40,
      size: 0.2,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#4a0000'),
      lifetime: 0.6,
      speed: 6,
      spread: 2,
      gravity: 25,
      fadeOut: true,
      scaleOverLife: true,
      blending: THREE.NormalBlending,
    };
  }

  static magic(color: string = '#9966ff'): ParticleConfig {
    return {
      count: 60,
      size: 0.3,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#ffffff'),
      lifetime: 1.5,
      speed: 2,
      spread: 2,
      gravity: -1,
      fadeOut: true,
      scaleOverLife: true,
      blending: THREE.AdditiveBlending,
    };
  }

  static heal(color: string = '#00ff88'): ParticleConfig {
    return {
      count: 40,
      size: 0.25,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#88ffcc'),
      lifetime: 1.2,
      speed: 2,
      spread: 1.5,
      gravity: -3,
      fadeOut: true,
      scaleOverLife: true,
      blending: THREE.AdditiveBlending,
    };
  }

  static frost(color: string = '#88ccff'): ParticleConfig {
    return {
      count: 50,
      size: 0.2,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#ffffff'),
      lifetime: 1.5,
      speed: 1.5,
      spread: 2,
      gravity: 1,
      fadeOut: true,
      scaleOverLife: true,
      blending: THREE.AdditiveBlending,
    };
  }

  static lightning(color: string = '#aaddff'): ParticleConfig {
    return {
      count: 30,
      size: 0.15,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#ffffff'),
      lifetime: 0.2,
      speed: 20,
      spread: 1,
      gravity: 0,
      fadeOut: true,
      scaleOverLife: false,
      blending: THREE.AdditiveBlending,
    };
  }

  static impact(color: string = '#ffffff'): ParticleConfig {
    return {
      count: 25,
      size: 0.2,
      color: new THREE.Color(color),
      colorEnd: new THREE.Color('#888888'),
      lifetime: 0.3,
      speed: 10,
      spread: 4,
      gravity: 30,
      fadeOut: true,
      scaleOverLife: true,
      blending: THREE.AdditiveBlending,
    };
  }
}

export class ParticleManager {
  private scene: THREE.Scene;
  private emitters: Map<string, ParticleEmitter> = new Map();
  private activeEffects: { emitter: ParticleEmitter; endTime: number }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createEmitter(name: string, config: ParticleConfig, useShader: boolean = false): ParticleEmitter {
    const emitter = new ParticleEmitter(config, useShader);
    this.emitters.set(name, emitter);
    this.scene.add(emitter.getObject3D());
    return emitter;
  }

  public getEmitter(name: string): ParticleEmitter | undefined {
    return this.emitters.get(name);
  }

  public spawnEffect(
    preset: ParticleConfig,
    position: THREE.Vector3,
    duration?: number,
    count?: number
  ): ParticleEmitter {
    const emitter = new ParticleEmitter(preset);
    this.scene.add(emitter.getObject3D());
    emitter.emitBurst(position, count ?? preset.count);

    const effectDuration = duration ?? preset.lifetime * 1.5;
    this.activeEffects.push({
      emitter,
      endTime: Date.now() + effectDuration * 1000,
    });

    return emitter;
  }

  public spawnExplosion(position: THREE.Vector3, color?: string, size?: number): void {
    const config = ParticleEffectPresets.explosion(color);
    if (size) {
      config.size *= size;
      config.spread *= size;
    }
    this.spawnEffect(config, position, 1.5, 80);

    const sparkConfig = ParticleEffectPresets.spark(color ?? '#ffff00');
    this.spawnEffect(sparkConfig, position, 0.8, 30);

    const smokeConfig = ParticleEffectPresets.smoke();
    this.spawnEffect(smokeConfig, position, 2.5, 20);
  }

  public spawnDamage(position: THREE.Vector3, damageType: 'physical' | 'fire' | 'ice' | 'magic' = 'physical'): void {
    const colors: Record<string, string> = {
      physical: '#ff4444',
      fire: '#ff6600',
      ice: '#88ccff',
      magic: '#9966ff',
    };
    
    const config = ParticleEffectPresets.impact(colors[damageType]);
    this.spawnEffect(config, position, 0.5, 15);
  }

  public spawnHeal(position: THREE.Vector3): void {
    const config = ParticleEffectPresets.heal();
    this.spawnEffect(config, position, 1.5, 30);
  }

  public update(deltaTime: number): void {
    const now = Date.now();

    this.emitters.forEach((emitter) => {
      emitter.update(deltaTime);
    });

    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      effect.emitter.update(deltaTime);

      if (now >= effect.endTime && effect.emitter.getParticleCount() === 0) {
        this.scene.remove(effect.emitter.getObject3D());
        effect.emitter.dispose();
        this.activeEffects.splice(i, 1);
      }
    }
  }

  public dispose(): void {
    this.emitters.forEach((emitter) => {
      this.scene.remove(emitter.getObject3D());
      emitter.dispose();
    });
    this.emitters.clear();

    this.activeEffects.forEach((effect) => {
      this.scene.remove(effect.emitter.getObject3D());
      effect.emitter.dispose();
    });
    this.activeEffects = [];
  }
}
