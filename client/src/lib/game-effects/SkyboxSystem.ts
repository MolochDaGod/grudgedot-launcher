import * as THREE from 'three';

export interface SkyboxConfig {
  type: 'color' | 'gradient' | 'procedural' | 'cubemap';
  topColor?: string;
  bottomColor?: string;
  sunColor?: string;
  sunPosition?: THREE.Vector3;
  cloudDensity?: number;
  timeOfDay?: number;
  fogEnabled?: boolean;
  fogColor?: string;
  fogNear?: number;
  fogFar?: number;
}

export class ProceduralSkybox {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private sunLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;
  private group: THREE.Group;
  private config: SkyboxConfig;

  constructor(config: Partial<SkyboxConfig> = {}) {
    this.config = {
      topColor: config.topColor ?? '#1e90ff',
      bottomColor: config.bottomColor ?? '#87ceeb',
      sunColor: config.sunColor ?? '#ffdd88',
      sunPosition: config.sunPosition ?? new THREE.Vector3(100, 100, 50),
      cloudDensity: config.cloudDensity ?? 0.3,
      timeOfDay: config.timeOfDay ?? 0.5,
      fogEnabled: config.fogEnabled ?? false,
      fogColor: config.fogColor ?? '#a0c0e0',
      fogNear: config.fogNear ?? 50,
      fogFar: config.fogFar ?? 500,
      type: 'procedural',
    };

    this.group = new THREE.Group();

    this.material = this.createSkyMaterial();
    const geometry = new THREE.SphereGeometry(1000, 32, 32);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.scale.setScalar(-1);
    this.group.add(this.mesh);

    this.sunLight = new THREE.DirectionalLight(this.config.sunColor, 1.5);
    this.sunLight.position.copy(this.config.sunPosition!);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.group.add(this.sunLight);

    this.ambientLight = new THREE.AmbientLight('#ffffff', 0.4);
    this.group.add(this.ambientLight);
  }

  private createSkyMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(this.config.topColor) },
        uBottomColor: { value: new THREE.Color(this.config.bottomColor) },
        uSunColor: { value: new THREE.Color(this.config.sunColor) },
        uSunPosition: { value: this.config.sunPosition },
        uTime: { value: 0 },
        uCloudDensity: { value: this.config.cloudDensity },
        uTimeOfDay: { value: this.config.timeOfDay },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunPosition;
        uniform float uTime;
        uniform float uCloudDensity;
        uniform float uTimeOfDay;
        
        varying vec3 vWorldPosition;
        varying vec2 vUv;
        
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        float fbm(vec2 p) {
          float value = 0.0;
          float amplitude = 0.5;
          float frequency = 1.0;
          
          for (int i = 0; i < 5; i++) {
            value += amplitude * noise(p * frequency);
            amplitude *= 0.5;
            frequency *= 2.0;
          }
          
          return value;
        }
        
        void main() {
          vec3 direction = normalize(vWorldPosition);
          float height = direction.y * 0.5 + 0.5;
          
          vec3 skyColor = mix(uBottomColor, uTopColor, pow(height, 0.5));
          
          vec3 sunDir = normalize(uSunPosition);
          float sunDot = max(0.0, dot(direction, sunDir));
          float sunDisc = smoothstep(0.995, 1.0, sunDot);
          float sunGlow = pow(sunDot, 8.0) * 0.5;
          
          skyColor += uSunColor * sunDisc;
          skyColor += uSunColor * sunGlow * 0.3;
          
          if (direction.y > 0.0 && uCloudDensity > 0.0) {
            vec2 cloudUv = direction.xz / (direction.y + 0.1) * 2.0;
            cloudUv += uTime * 0.01;
            
            float clouds = fbm(cloudUv * 3.0);
            clouds = smoothstep(0.4 - uCloudDensity * 0.3, 0.6, clouds);
            
            vec3 cloudColor = mix(vec3(0.9), uSunColor, 0.1);
            float cloudShadow = 1.0 - clouds * 0.3;
            
            skyColor = mix(skyColor, cloudColor, clouds * 0.8);
          }
          
          float horizonGlow = exp(-abs(direction.y) * 3.0);
          vec3 horizonColor = mix(uBottomColor, uSunColor, 0.3);
          skyColor = mix(skyColor, horizonColor, horizonGlow * 0.4);
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide,
    });
  }

  public update(deltaTime: number): void {
    this.material.uniforms.uTime.value += deltaTime;
  }

  public setTimeOfDay(time: number): void {
    this.config.timeOfDay = Math.max(0, Math.min(1, time));
    this.material.uniforms.uTimeOfDay.value = this.config.timeOfDay;

    const angle = time * Math.PI;
    const sunY = Math.sin(angle) * 100;
    const sunZ = Math.cos(angle) * 100;
    this.config.sunPosition!.set(50, sunY, sunZ);
    this.material.uniforms.uSunPosition.value.copy(this.config.sunPosition!);
    this.sunLight.position.copy(this.config.sunPosition!);

    if (time < 0.25 || time > 0.75) {
      const t = time < 0.25 ? time / 0.25 : (1 - time) / 0.25;
      this.material.uniforms.uTopColor.value.setHex(0x0a1a2a).lerp(new THREE.Color(this.config.topColor), t);
      this.material.uniforms.uBottomColor.value.setHex(0x1a2a3a).lerp(new THREE.Color(this.config.bottomColor), t);
      this.sunLight.intensity = 0.5 + t;
      this.ambientLight.intensity = 0.1 + t * 0.3;
    } else {
      this.material.uniforms.uTopColor.value.set(this.config.topColor);
      this.material.uniforms.uBottomColor.value.set(this.config.bottomColor);
      this.sunLight.intensity = 1.5;
      this.ambientLight.intensity = 0.4;
    }
  }

  public setCloudDensity(density: number): void {
    this.config.cloudDensity = Math.max(0, Math.min(1, density));
    this.material.uniforms.uCloudDensity.value = this.config.cloudDensity;
  }

  public getObject3D(): THREE.Group {
    return this.group;
  }

  public getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }

  public getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export class ColorSkybox {
  private mesh: THREE.Mesh;
  private material: THREE.MeshBasicMaterial;

  constructor(color: string = '#1a1a2e') {
    const geometry = new THREE.SphereGeometry(1000, 16, 16);
    this.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      side: THREE.BackSide,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  public setColor(color: string): void {
    this.material.color.set(color);
  }

  public getObject3D(): THREE.Mesh {
    return this.mesh;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export class GradientSkybox {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(topColor: string = '#1e90ff', bottomColor: string = '#87ceeb') {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTopColor: { value: new THREE.Color(topColor) },
        uBottomColor: { value: new THREE.Color(bottomColor) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTopColor;
        uniform vec3 uBottomColor;
        varying vec3 vWorldPosition;
        
        void main() {
          float height = normalize(vWorldPosition).y * 0.5 + 0.5;
          vec3 color = mix(uBottomColor, uTopColor, height);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide,
    });

    const geometry = new THREE.SphereGeometry(1000, 32, 32);
    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  public setColors(topColor: string, bottomColor: string): void {
    this.material.uniforms.uTopColor.value.set(topColor);
    this.material.uniforms.uBottomColor.value.set(bottomColor);
  }

  public getObject3D(): THREE.Mesh {
    return this.mesh;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export class SkyboxPresets {
  static daytime(): SkyboxConfig {
    return {
      type: 'procedural',
      topColor: '#1e90ff',
      bottomColor: '#87ceeb',
      sunColor: '#ffdd88',
      sunPosition: new THREE.Vector3(100, 100, 50),
      cloudDensity: 0.3,
      timeOfDay: 0.5,
    };
  }

  static sunset(): SkyboxConfig {
    return {
      type: 'procedural',
      topColor: '#1a1a4e',
      bottomColor: '#ff6b35',
      sunColor: '#ff4500',
      sunPosition: new THREE.Vector3(100, 20, 100),
      cloudDensity: 0.4,
      timeOfDay: 0.75,
    };
  }

  static night(): SkyboxConfig {
    return {
      type: 'procedural',
      topColor: '#0a0a1a',
      bottomColor: '#1a1a2e',
      sunColor: '#aaaacc',
      sunPosition: new THREE.Vector3(-50, -30, 100),
      cloudDensity: 0.1,
      timeOfDay: 0.1,
    };
  }

  static hellscape(): SkyboxConfig {
    return {
      type: 'procedural',
      topColor: '#2a0a0a',
      bottomColor: '#8b0000',
      sunColor: '#ff4400',
      sunPosition: new THREE.Vector3(80, 40, 60),
      cloudDensity: 0.6,
      timeOfDay: 0.5,
    };
  }

  static arctic(): SkyboxConfig {
    return {
      type: 'procedural',
      topColor: '#4a6fa5',
      bottomColor: '#d4e5f7',
      sunColor: '#ffffff',
      sunPosition: new THREE.Vector3(50, 30, 100),
      cloudDensity: 0.5,
      timeOfDay: 0.4,
    };
  }

  static fantasy(): SkyboxConfig {
    return {
      type: 'procedural',
      topColor: '#2e1a47',
      bottomColor: '#6b3fa0',
      sunColor: '#ff88ff',
      sunPosition: new THREE.Vector3(70, 80, 40),
      cloudDensity: 0.4,
      timeOfDay: 0.6,
    };
  }

  static grudgeBrawl(): SkyboxConfig {
    return {
      type: 'procedural',
      topColor: '#0a0a0a',
      bottomColor: '#1a0a0a',
      sunColor: '#dc2626',
      sunPosition: new THREE.Vector3(60, 50, 80),
      cloudDensity: 0.2,
      timeOfDay: 0.3,
    };
  }
}

export class SkyboxManager {
  private scene: THREE.Scene;
  private currentSkybox: ProceduralSkybox | ColorSkybox | GradientSkybox | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public setProceduralSkybox(config?: SkyboxConfig): ProceduralSkybox {
    this.dispose();
    const skybox = new ProceduralSkybox(config);
    this.currentSkybox = skybox;
    this.scene.add(skybox.getObject3D());
    return skybox;
  }

  public setColorSkybox(color: string): ColorSkybox {
    this.dispose();
    const skybox = new ColorSkybox(color);
    this.currentSkybox = skybox;
    this.scene.add(skybox.getObject3D());
    return skybox;
  }

  public setGradientSkybox(topColor: string, bottomColor: string): GradientSkybox {
    this.dispose();
    const skybox = new GradientSkybox(topColor, bottomColor);
    this.currentSkybox = skybox;
    this.scene.add(skybox.getObject3D());
    return skybox;
  }

  public setPreset(preset: 'daytime' | 'sunset' | 'night' | 'hellscape' | 'arctic' | 'fantasy' | 'grudgeBrawl'): ProceduralSkybox {
    const presets: Record<string, () => SkyboxConfig> = {
      daytime: SkyboxPresets.daytime,
      sunset: SkyboxPresets.sunset,
      night: SkyboxPresets.night,
      hellscape: SkyboxPresets.hellscape,
      arctic: SkyboxPresets.arctic,
      fantasy: SkyboxPresets.fantasy,
      grudgeBrawl: SkyboxPresets.grudgeBrawl,
    };
    const config = presets[preset]();
    return this.setProceduralSkybox(config);
  }

  public update(deltaTime: number): void {
    if (this.currentSkybox instanceof ProceduralSkybox) {
      this.currentSkybox.update(deltaTime);
    }
  }

  public dispose(): void {
    if (this.currentSkybox) {
      this.scene.remove(this.currentSkybox.getObject3D());
      this.currentSkybox.dispose();
      this.currentSkybox = null;
    }
  }
}
