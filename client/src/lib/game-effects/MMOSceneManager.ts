import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { ParticleManager, ParticleEffectPresets } from './ParticleSystem';
import { SpellEffectsManager } from './SpellEffects';

export interface CharacterArchetype {
  id: string;
  name: string;
  type: 'warrior' | 'mage' | 'tank' | 'assassin' | 'marksman' | 'zombie' | 'skeleton' | 'monster';
  modelPath?: string;
  fallbackColor: number;
  stats: {
    health: number;
    mana: number;
    attack: number;
    defense: number;
    speed: number;
    range: number;
  };
  scale: number;
  animations: {
    idle?: string;
    walk?: string;
    run?: string;
    attack?: string;
    death?: string;
    spell?: string;
  };
}

export interface MMOEntity {
  id: string;
  archetype: CharacterArchetype;
  mesh: THREE.Group;
  mixer?: THREE.AnimationMixer;
  animations: Map<string, THREE.AnimationAction>;
  currentAnimation?: string;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  velocity: THREE.Vector3;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  team: 'blue' | 'red' | 'neutral';
  state: 'idle' | 'moving' | 'attacking' | 'casting' | 'dead';
  target?: MMOEntity;
  attackCooldown: number;
  isPlayer?: boolean;
}

export interface EnvironmentConfig {
  groundSize: number;
  groundColor: number;
  skyColor: number;
  fogColor: number;
  fogDensity: number;
  ambientLightColor: number;
  ambientLightIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunPosition: THREE.Vector3;
}

export const CHARACTER_ARCHETYPES: CharacterArchetype[] = [
  {
    id: 'skeleton-mage',
    name: 'Necros',
    type: 'mage',
    modelPath: '/public-objects/game-assets/characters/3fa75469_boxman.glb',
    fallbackColor: 0x9933ff,
    scale: 1.0,
    stats: { health: 520, mana: 400, attack: 55, defense: 20, speed: 5, range: 550 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', spell: 'Spell', death: 'Death' }
  },
  {
    id: 'skeleton-warrior',
    name: 'Grimfang',
    type: 'warrior',
    modelPath: '/public-objects/game-assets/characters/3fa75469_boxman.glb',
    fallbackColor: 0xff6600,
    scale: 1.0,
    stats: { health: 650, mana: 250, attack: 72, defense: 35, speed: 6, range: 150 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  },
  {
    id: 'skeleton-tank',
    name: 'Boneguard',
    type: 'tank',
    modelPath: '/public-objects/game-assets/characters/3fa75469_boxman.glb',
    fallbackColor: 0x666666,
    scale: 1.2,
    stats: { health: 800, mana: 200, attack: 50, defense: 55, speed: 4, range: 125 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  },
  {
    id: 'skeleton-assassin',
    name: 'Shadowblade',
    type: 'assassin',
    modelPath: '/public-objects/game-assets/characters/3fa75469_boxman.glb',
    fallbackColor: 0x333333,
    scale: 0.9,
    stats: { health: 480, mana: 300, attack: 68, defense: 22, speed: 8, range: 125 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  },
  {
    id: 'skeleton-marksman',
    name: 'Deadeye',
    type: 'marksman',
    modelPath: '/public-objects/game-assets/characters/3fa75469_boxman.glb',
    fallbackColor: 0x00cc66,
    scale: 1.0,
    stats: { health: 500, mana: 280, attack: 62, defense: 18, speed: 5, range: 650 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  },
  {
    id: 'zombie-walker',
    name: 'Shambler',
    type: 'zombie',
    fallbackColor: 0x4a5d23,
    scale: 1.0,
    stats: { health: 150, mana: 0, attack: 25, defense: 10, speed: 2, range: 50 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  },
  {
    id: 'zombie-runner',
    name: 'Sprinter',
    type: 'zombie',
    fallbackColor: 0x5a7d33,
    scale: 0.9,
    stats: { health: 100, mana: 0, attack: 20, defense: 5, speed: 6, range: 50 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  },
  {
    id: 'zombie-brute',
    name: 'Crusher',
    type: 'zombie',
    fallbackColor: 0x3a4d13,
    scale: 1.5,
    stats: { health: 400, mana: 0, attack: 50, defense: 25, speed: 1.5, range: 75 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  },
  {
    id: 'ogre',
    name: 'Mountain Crusher',
    type: 'monster',
    fallbackColor: 0x8b4513,
    scale: 2.0,
    stats: { health: 1000, mana: 0, attack: 80, defense: 40, speed: 2, range: 100 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  },
  {
    id: 'goblin',
    name: 'Sneaky',
    type: 'monster',
    fallbackColor: 0x2d5a27,
    scale: 0.6,
    stats: { health: 80, mana: 50, attack: 15, defense: 5, speed: 7, range: 50 },
    animations: { idle: 'Idle', walk: 'Walk', attack: 'Attack', death: 'Death' }
  }
];

export const DEFAULT_ENVIRONMENT: EnvironmentConfig = {
  groundSize: 200,
  groundColor: 0x1a1a1a,
  skyColor: 0x0a0a0a,
  fogColor: 0x0a0a0a,
  fogDensity: 0.015,
  ambientLightColor: 0x404060,
  ambientLightIntensity: 0.4,
  sunColor: 0xffddaa,
  sunIntensity: 1.2,
  sunPosition: new THREE.Vector3(50, 100, 50)
};

export class MMOSceneManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private camera: THREE.PerspectiveCamera;
  private loader: GLTFLoader;
  private loadedModels: Map<string, THREE.Group> = new Map();
  private loadedAnimations: Map<string, THREE.AnimationClip[]> = new Map();
  private entities: Map<string, MMOEntity> = new Map();
  private particleManager: ParticleManager;
  private spellManager: SpellEffectsManager;
  private clock: THREE.Clock;
  private environmentConfig: EnvironmentConfig;
  
  private ground?: THREE.Mesh;
  private lights: THREE.Light[] = [];

  constructor(
    container: HTMLElement,
    config: Partial<EnvironmentConfig> = {}
  ) {
    this.environmentConfig = { ...DEFAULT_ENVIRONMENT, ...config };
    this.clock = new THREE.Clock();
    this.loader = new GLTFLoader();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.environmentConfig.skyColor);
    this.scene.fog = new THREE.FogExp2(
      this.environmentConfig.fogColor,
      this.environmentConfig.fogDensity
    );

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    container.appendChild(this.renderer.domElement);

    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
    this.camera.position.set(0, 30, 50);
    this.camera.lookAt(0, 0, 0);

    this.particleManager = new ParticleManager(this.scene);
    this.spellManager = new SpellEffectsManager(this.scene);

    this.setupLighting();
    this.setupGround();

    window.addEventListener('resize', () => this.handleResize(container));
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(
      this.environmentConfig.ambientLightColor,
      this.environmentConfig.ambientLightIntensity
    );
    this.scene.add(ambient);
    this.lights.push(ambient);

    const sun = new THREE.DirectionalLight(
      this.environmentConfig.sunColor,
      this.environmentConfig.sunIntensity
    );
    sun.position.copy(this.environmentConfig.sunPosition);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    this.scene.add(sun);
    this.lights.push(sun);

    const rimLight = new THREE.DirectionalLight(0x4466ff, 0.3);
    rimLight.position.set(-50, 30, -50);
    this.scene.add(rimLight);
    this.lights.push(rimLight);
  }

  private setupGround(): void {
    const size = this.environmentConfig.groundSize;
    
    const groundGeometry = new THREE.PlaneGeometry(size, size, 64, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: this.environmentConfig.groundColor,
      roughness: 0.9,
      metalness: 0.1,
    });

    const positions = groundGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 2] += (Math.random() - 0.5) * 0.3;
    }
    groundGeometry.computeVertexNormals();

    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    const gridHelper = new THREE.GridHelper(size, size / 5, 0x333333, 0x222222);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
  }

  public async preloadModels(archetypes: CharacterArchetype[]): Promise<void> {
    const modelPaths = new Set<string>();
    archetypes.forEach(a => {
      if (a.modelPath) modelPaths.add(a.modelPath);
    });

    const loadPromises = Array.from(modelPaths).map(path => 
      this.loadModel(path).catch(err => {
        console.warn(`Failed to load model ${path}:`, err);
        return null;
      })
    );

    await Promise.all(loadPromises);
  }

  private async loadModel(path: string): Promise<THREE.Group | null> {
    if (this.loadedModels.has(path)) {
      return this.loadedModels.get(path)!;
    }

    return new Promise((resolve, reject) => {
      this.loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.loadedModels.set(path, model);
          if (gltf.animations.length > 0) {
            this.loadedAnimations.set(path, gltf.animations);
          }
          resolve(model);
        },
        undefined,
        (error) => reject(error)
      );
    });
  }

  public createEntity(
    id: string,
    archetype: CharacterArchetype,
    position: THREE.Vector3,
    team: 'blue' | 'red' | 'neutral' = 'neutral',
    isPlayer: boolean = false
  ): MMOEntity {
    let mesh: THREE.Group;
    let mixer: THREE.AnimationMixer | undefined;
    const animations = new Map<string, THREE.AnimationAction>();

    if (archetype.modelPath && this.loadedModels.has(archetype.modelPath)) {
      const original = this.loadedModels.get(archetype.modelPath)!;
      mesh = SkeletonUtils.clone(original) as THREE.Group;
      mesh.scale.setScalar(archetype.scale);

      mixer = new THREE.AnimationMixer(mesh);
      const clips = this.loadedAnimations.get(archetype.modelPath);
      if (clips) {
        clips.forEach(clip => {
          const action = mixer!.clipAction(clip);
          animations.set(clip.name, action);
        });
      }
    } else {
      mesh = this.createFallbackMesh(archetype, team);
    }

    mesh.position.copy(position);
    this.scene.add(mesh);

    this.addHealthBar(mesh, archetype.stats.health);
    this.addTeamIndicator(mesh, team);

    const entity: MMOEntity = {
      id,
      archetype,
      mesh,
      mixer,
      animations,
      position: mesh.position,
      rotation: mesh.rotation,
      velocity: new THREE.Vector3(),
      health: archetype.stats.health,
      maxHealth: archetype.stats.health,
      mana: archetype.stats.mana,
      maxMana: archetype.stats.mana,
      team,
      state: 'idle',
      attackCooldown: 0,
      isPlayer
    };

    this.entities.set(id, entity);
    return entity;
  }

  private createFallbackMesh(archetype: CharacterArchetype, team: 'blue' | 'red' | 'neutral'): THREE.Group {
    const group = new THREE.Group();
    const scale = archetype.scale;

    const bodyGeometry = new THREE.CapsuleGeometry(0.4 * scale, 1.2 * scale, 8, 16);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: archetype.fallbackColor,
      emissive: archetype.fallbackColor,
      emissiveIntensity: 0.2,
      roughness: 0.6,
      metalness: 0.3,
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1 * scale;
    body.castShadow = true;
    group.add(body);

    const headGeometry = new THREE.SphereGeometry(0.35 * scale, 16, 16);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: archetype.type === 'zombie' ? 0x4a5d23 : 0xffccaa,
      roughness: 0.8,
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 2 * scale;
    head.castShadow = true;
    group.add(head);

    if (archetype.type === 'mage') {
      const glowGeometry = new THREE.SphereGeometry(0.15 * scale, 16, 16);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0x9933ff,
        transparent: true,
        opacity: 0.8,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.set(0.5 * scale, 1.5 * scale, 0);
      group.add(glow);
    }

    if (archetype.type === 'warrior' || archetype.type === 'tank') {
      const weaponGeometry = new THREE.BoxGeometry(0.1 * scale, 0.8 * scale, 0.05 * scale);
      const weaponMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.8,
        roughness: 0.2,
      });
      const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
      weapon.position.set(0.6 * scale, 1 * scale, 0);
      weapon.rotation.z = Math.PI / 6;
      group.add(weapon);
    }

    return group;
  }

  private addHealthBar(mesh: THREE.Group, maxHealth: number): void {
    const bgGeometry = new THREE.PlaneGeometry(1.2, 0.15);
    const bgMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const bg = new THREE.Mesh(bgGeometry, bgMaterial);
    bg.position.y = 2.8;
    bg.name = 'healthBg';
    mesh.add(bg);

    const fillGeometry = new THREE.PlaneGeometry(1.18, 0.13);
    const fillMaterial = new THREE.MeshBasicMaterial({ color: 0x44ff44 });
    const fill = new THREE.Mesh(fillGeometry, fillMaterial);
    fill.position.y = 2.8;
    fill.position.z = 0.01;
    fill.name = 'healthFill';
    mesh.add(fill);

    const manaGeometry = new THREE.PlaneGeometry(1.18, 0.08);
    const manaMaterial = new THREE.MeshBasicMaterial({ color: 0x4488ff });
    const mana = new THREE.Mesh(manaGeometry, manaMaterial);
    mana.position.y = 2.6;
    mana.position.z = 0.01;
    mana.name = 'manaFill';
    mesh.add(mana);
  }

  private addTeamIndicator(mesh: THREE.Group, team: 'blue' | 'red' | 'neutral'): void {
    const ringGeometry = new THREE.RingGeometry(0.6, 0.8, 32);
    const ringColor = team === 'blue' ? 0x4488ff : team === 'red' ? 0xff4444 : 0xaaaaaa;
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: ringColor,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.name = 'teamRing';
    mesh.add(ring);
  }

  public updateEntityHealth(entity: MMOEntity): void {
    const healthFill = entity.mesh.getObjectByName('healthFill') as THREE.Mesh;
    if (healthFill) {
      const ratio = Math.max(0, entity.health / entity.maxHealth);
      healthFill.scale.x = ratio;
      healthFill.position.x = -(1 - ratio) * 0.59;

      const material = healthFill.material as THREE.MeshBasicMaterial;
      if (ratio > 0.6) {
        material.color.setHex(0x44ff44);
      } else if (ratio > 0.3) {
        material.color.setHex(0xffaa00);
      } else {
        material.color.setHex(0xff4444);
      }
    }

    const manaFill = entity.mesh.getObjectByName('manaFill') as THREE.Mesh;
    if (manaFill && entity.maxMana > 0) {
      const ratio = Math.max(0, entity.mana / entity.maxMana);
      manaFill.scale.x = ratio;
      manaFill.position.x = -(1 - ratio) * 0.59;
    }
  }

  public spawnDamageNumber(position: THREE.Vector3, damage: number, isCrit: boolean = false): void {
    const damageType = isCrit ? 'magic' : 'physical';
    this.particleManager.spawnDamage(
      position.clone().add(new THREE.Vector3(0, 2, 0)),
      damageType
    );
  }

  public castSpell(
    caster: MMOEntity,
    target: MMOEntity | THREE.Vector3,
    spellType: 'fireball' | 'frost' | 'lightning' | 'heal'
  ): void {
    const targetPos = target instanceof THREE.Vector3 ? target : target.position;
    
    switch (spellType) {
      case 'fireball':
        this.spellManager.spawnFireball(targetPos, 1, 2);
        this.particleManager.spawnEffect(ParticleEffectPresets.fire(), targetPos, 1.5, 30);
        break;
      case 'frost':
        this.spellManager.spawnFrost(targetPos, 1, 2);
        this.particleManager.spawnEffect(ParticleEffectPresets.frost(), targetPos, 1.5, 30);
        break;
      case 'lightning':
        this.spellManager.spawnLightning(caster.position, targetPos, 0.5);
        break;
      case 'heal':
        this.particleManager.spawnHeal(caster.position);
        break;
    }
  }

  public meleeAttack(attacker: MMOEntity, target: MMOEntity): void {
    const direction = new THREE.Vector3()
      .subVectors(target.position, attacker.position)
      .normalize();
    
    const hitPos = target.position.clone().add(
      direction.multiplyScalar(-0.5)
    );
    hitPos.y += 1;

    this.particleManager.spawnDamage(hitPos, 'physical');
  }

  public update(): void {
    const delta = this.clock.getDelta();

    this.entities.forEach(entity => {
      if (entity.mixer) {
        entity.mixer.update(delta);
      }

      if (entity.attackCooldown > 0) {
        entity.attackCooldown -= delta;
      }

      entity.mana = Math.min(entity.maxMana, entity.mana + delta * 5);
      this.updateEntityHealth(entity);

      const healthBg = entity.mesh.getObjectByName('healthBg');
      const healthFill = entity.mesh.getObjectByName('healthFill');
      const manaFill = entity.mesh.getObjectByName('manaFill');
      if (healthBg && healthFill && manaFill) {
        healthBg.lookAt(this.camera.position);
        healthFill.lookAt(this.camera.position);
        manaFill.lookAt(this.camera.position);
      }
    });

    this.particleManager.update(delta);
    this.spellManager.update(delta);
    
    this.renderer.render(this.scene, this.camera);
  }

  public getEntity(id: string): MMOEntity | undefined {
    return this.entities.get(id);
  }

  public getAllEntities(): MMOEntity[] {
    return Array.from(this.entities.values());
  }

  public removeEntity(id: string): void {
    const entity = this.entities.get(id);
    if (entity) {
      this.scene.remove(entity.mesh);
      entity.mixer?.stopAllAction();
      this.entities.delete(id);
    }
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public getParticleManager(): ParticleManager {
    return this.particleManager;
  }

  public getSpellManager(): SpellEffectsManager {
    return this.spellManager;
  }

  private handleResize(container: HTMLElement): void {
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public dispose(): void {
    this.entities.forEach((entity, id) => this.removeEntity(id));
    this.particleManager.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export function getArchetypeById(id: string): CharacterArchetype | undefined {
  return CHARACTER_ARCHETYPES.find(a => a.id === id);
}
