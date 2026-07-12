/**
 * TPS Visual Effects — Muzzle flash, tracers, impacts, explosions
 *
 * All VFX use BabylonJS ParticleSystems and short-lived meshes.
 * Each function creates a self-disposing effect at the given position.
 */

import * as BABYLON from '@babylonjs/core';

// ── Screen Shake ──

let shakeIntensity = 0;
let shakeCamera: BABYLON.Camera | null = null;
let shakeOriginalPos: BABYLON.Vector3 | null = null;

export function setShakeCamera(cam: BABYLON.Camera): void {
  shakeCamera = cam;
}

export function screenShake(intensity: number): void {
  shakeIntensity = Math.max(shakeIntensity, intensity);
}

export function updateScreenShake(dt: number): void {
  if (!shakeCamera || shakeIntensity <= 0) return;
  if (shakeCamera instanceof BABYLON.ArcRotateCamera) {
    shakeCamera.alpha += (Math.random() - 0.5) * shakeIntensity * 0.01;
    shakeCamera.beta += (Math.random() - 0.5) * shakeIntensity * 0.005;
  }
  shakeIntensity *= 0.85;
  if (shakeIntensity < 0.1) shakeIntensity = 0;
}

// ── Muzzle Flash ──

export function muzzleFlash(scene: BABYLON.Scene, position: BABYLON.Vector3, direction: BABYLON.Vector3): void {
  const ps = new BABYLON.ParticleSystem('muzzleFlash', 30, scene);
  ps.particleTexture = new BABYLON.Texture('https://playground.babylonjs.com/textures/flare.png', scene);
  ps.emitter = position.clone();
  ps.minEmitBox = BABYLON.Vector3.Zero();
  ps.maxEmitBox = BABYLON.Vector3.Zero();

  ps.color1 = new BABYLON.Color4(1, 0.9, 0.3, 1);
  ps.color2 = new BABYLON.Color4(1, 0.6, 0.1, 1);
  ps.colorDead = new BABYLON.Color4(1, 0.3, 0, 0);

  ps.minSize = 0.05;
  ps.maxSize = 0.2;
  ps.minLifeTime = 0.02;
  ps.maxLifeTime = 0.08;
  ps.emitRate = 500;
  ps.manualEmitCount = 20;

  ps.direction1 = direction.scale(2).add(new BABYLON.Vector3(-0.5, -0.5, -0.5));
  ps.direction2 = direction.scale(4).add(new BABYLON.Vector3(0.5, 0.5, 0.5));
  ps.minEmitPower = 1;
  ps.maxEmitPower = 3;
  ps.updateSpeed = 0.005;
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
  ps.gravity = BABYLON.Vector3.Zero();

  ps.targetStopDuration = 0.05;
  ps.disposeOnStop = true;
  ps.start();

  // Flash light
  const light = new BABYLON.PointLight('muzzleLight', position.clone(), scene);
  light.intensity = 3;
  light.diffuse = new BABYLON.Color3(1, 0.8, 0.3);
  light.range = 5;
  let life = 0.06;
  const obs = scene.onBeforeRenderObservable.add(() => {
    life -= scene.getEngine().getDeltaTime() / 1000;
    light.intensity = Math.max(0, (life / 0.06) * 3);
    if (life <= 0) {
      scene.onBeforeRenderObservable.remove(obs);
      light.dispose();
    }
  });
}

// ── Bullet Tracer ──

export function bulletTracer(scene: BABYLON.Scene, from: BABYLON.Vector3, to: BABYLON.Vector3): void {
  const points = [from.clone(), to.clone()];
  const lines = BABYLON.MeshBuilder.CreateLines('tracer', { points }, scene);
  lines.color = new BABYLON.Color3(1, 0.9, 0.4);
  lines.isPickable = false;

  let life = 0.1;
  const obs = scene.onBeforeRenderObservable.add(() => {
    life -= scene.getEngine().getDeltaTime() / 1000;
    lines.visibility = Math.max(0, life / 0.1);
    if (life <= 0) {
      scene.onBeforeRenderObservable.remove(obs);
      lines.dispose();
    }
  });
}

// ── Impact Sparks ──

export function impactSpark(
  scene: BABYLON.Scene,
  position: BABYLON.Vector3,
  normal: BABYLON.Vector3,
  color?: BABYLON.Color4
): void {
  const ps = new BABYLON.ParticleSystem('impactSpark', 40, scene);
  ps.particleTexture = new BABYLON.Texture('https://playground.babylonjs.com/textures/flare.png', scene);
  ps.emitter = position.clone();
  ps.minEmitBox = BABYLON.Vector3.Zero();
  ps.maxEmitBox = BABYLON.Vector3.Zero();

  const c = color ?? new BABYLON.Color4(1, 0.8, 0.3, 1);
  ps.color1 = c;
  ps.color2 = new BABYLON.Color4(c.r * 0.7, c.g * 0.7, c.b * 0.5, 1);
  ps.colorDead = new BABYLON.Color4(0.3, 0.1, 0, 0);

  ps.minSize = 0.02;
  ps.maxSize = 0.06;
  ps.minLifeTime = 0.05;
  ps.maxLifeTime = 0.2;
  ps.emitRate = 500;
  ps.manualEmitCount = 30;

  const reflect = normal.scale(2);
  ps.direction1 = reflect.add(new BABYLON.Vector3(-1, -1, -1));
  ps.direction2 = reflect.add(new BABYLON.Vector3(1, 2, 1));
  ps.minEmitPower = 2;
  ps.maxEmitPower = 6;
  ps.gravity = new BABYLON.Vector3(0, -9.81, 0);
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

  ps.targetStopDuration = 0.05;
  ps.disposeOnStop = true;
  ps.start();
}

// ── Blood Splatter ──

export function bloodSplatter(scene: BABYLON.Scene, position: BABYLON.Vector3, normal: BABYLON.Vector3): void {
  impactSpark(scene, position, normal, new BABYLON.Color4(0.8, 0.05, 0.05, 1));
}

// ── Explosion ──

export function explosion(scene: BABYLON.Scene, position: BABYLON.Vector3, radius: number = 3): void {
  // Core fireball
  const ps = new BABYLON.ParticleSystem('explosion', 200, scene);
  ps.particleTexture = new BABYLON.Texture('https://playground.babylonjs.com/textures/flare.png', scene);
  ps.emitter = position.clone();
  ps.minEmitBox = new BABYLON.Vector3(-0.2, -0.2, -0.2);
  ps.maxEmitBox = new BABYLON.Vector3(0.2, 0.2, 0.2);

  ps.color1 = new BABYLON.Color4(1, 0.6, 0.1, 1);
  ps.color2 = new BABYLON.Color4(1, 0.3, 0, 1);
  ps.colorDead = new BABYLON.Color4(0.2, 0.05, 0, 0);

  ps.minSize = 0.3;
  ps.maxSize = radius * 0.5;
  ps.minLifeTime = 0.2;
  ps.maxLifeTime = 0.6;
  ps.emitRate = 500;
  ps.manualEmitCount = 100;

  ps.direction1 = new BABYLON.Vector3(-radius, -radius, -radius);
  ps.direction2 = new BABYLON.Vector3(radius, radius * 2, radius);
  ps.minEmitPower = 2;
  ps.maxEmitPower = 8;
  ps.gravity = new BABYLON.Vector3(0, -3, 0);
  ps.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

  ps.targetStopDuration = 0.15;
  ps.disposeOnStop = true;
  ps.start();

  // Smoke cloud
  const smoke = new BABYLON.ParticleSystem('explosionSmoke', 80, scene);
  smoke.particleTexture = new BABYLON.Texture('https://playground.babylonjs.com/textures/flare.png', scene);
  smoke.emitter = position.clone();
  smoke.minEmitBox = new BABYLON.Vector3(-0.5, 0, -0.5);
  smoke.maxEmitBox = new BABYLON.Vector3(0.5, 0.5, 0.5);

  smoke.color1 = new BABYLON.Color4(0.3, 0.3, 0.3, 0.6);
  smoke.color2 = new BABYLON.Color4(0.2, 0.2, 0.2, 0.4);
  smoke.colorDead = new BABYLON.Color4(0.1, 0.1, 0.1, 0);

  smoke.minSize = 0.5;
  smoke.maxSize = radius;
  smoke.minLifeTime = 0.5;
  smoke.maxLifeTime = 1.5;
  smoke.emitRate = 200;
  smoke.manualEmitCount = 40;

  smoke.direction1 = new BABYLON.Vector3(-2, 1, -2);
  smoke.direction2 = new BABYLON.Vector3(2, 5, 2);
  smoke.minEmitPower = 1;
  smoke.maxEmitPower = 3;
  smoke.gravity = new BABYLON.Vector3(0, 1, 0);
  smoke.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;

  smoke.targetStopDuration = 0.2;
  smoke.disposeOnStop = true;
  smoke.start();

  // Explosion light
  const light = new BABYLON.PointLight('explosionLight', position.clone(), scene);
  light.intensity = 8;
  light.diffuse = new BABYLON.Color3(1, 0.6, 0.2);
  light.range = radius * 4;
  let life = 0.3;
  const obs = scene.onBeforeRenderObservable.add(() => {
    life -= scene.getEngine().getDeltaTime() / 1000;
    light.intensity = Math.max(0, (life / 0.3) * 8);
    if (life <= 0) {
      scene.onBeforeRenderObservable.remove(obs);
      light.dispose();
    }
  });

  screenShake(radius * 3);
}

// ── Shell Casing ──

export function shellCasing(scene: BABYLON.Scene, position: BABYLON.Vector3, rightDir: BABYLON.Vector3): void {
  const shell = BABYLON.MeshBuilder.CreateCylinder('shell', {
    height: 0.06,
    diameterTop: 0.015,
    diameterBottom: 0.02,
    tessellation: 6,
  }, scene);
  shell.position = position.clone();

  const mat = new BABYLON.StandardMaterial('shellMat', scene);
  mat.diffuseColor = new BABYLON.Color3(0.85, 0.7, 0.2);
  mat.specularColor = new BABYLON.Color3(1, 0.9, 0.5);
  shell.material = mat;
  shell.isPickable = false;

  const vel = rightDir.scale(2 + Math.random() * 2)
    .add(new BABYLON.Vector3(0, 3 + Math.random() * 2, 0))
    .add(new BABYLON.Vector3((Math.random() - 0.5) * 1, 0, (Math.random() - 0.5) * 1));
  const angVel = new BABYLON.Vector3(
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20,
    (Math.random() - 0.5) * 20
  );

  let life = 2.0;
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    life -= dt;

    vel.y -= 9.81 * dt;
    shell.position.addInPlace(vel.scale(dt));

    shell.rotation.x += angVel.x * dt;
    shell.rotation.y += angVel.y * dt;
    shell.rotation.z += angVel.z * dt;

    // Stop at ground
    if (shell.position.y < 0.02) {
      shell.position.y = 0.02;
      vel.y = 0;
      vel.x *= 0.5;
      vel.z *= 0.5;
      angVel.scaleInPlace(0.5);
    }

    if (life <= 0) {
      scene.onBeforeRenderObservable.remove(obs);
      shell.dispose();
      mat.dispose();
    }
  });
}

// ── Damage Number Popup ──

export function damageNumber(
  scene: BABYLON.Scene,
  position: BABYLON.Vector3,
  amount: number,
  headshot: boolean = false
): void {
  const plane = BABYLON.MeshBuilder.CreatePlane('dmgNum', { width: 0.6, height: 0.3 }, scene);
  plane.position = position.clone().add(new BABYLON.Vector3(
    (Math.random() - 0.5) * 0.3,
    0.5,
    (Math.random() - 0.5) * 0.3
  ));
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;

  const dynTex = new BABYLON.DynamicTexture('dmgTex', { width: 128, height: 64 }, scene);
  const ctx = dynTex.getContext();
  ctx.clearRect(0, 0, 128, 64);
  ctx.font = headshot ? 'bold 36px monospace' : 'bold 28px monospace';
  ctx.fillStyle = headshot ? '#ff3333' : '#ffcc00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(amount)}`, 64, 32);
  dynTex.update();

  const mat = new BABYLON.StandardMaterial('dmgMat', scene);
  mat.diffuseTexture = dynTex;
  mat.emissiveTexture = dynTex;
  mat.opacityTexture = dynTex;
  mat.backFaceCulling = false;
  mat.disableLighting = true;
  plane.material = mat;

  let life = 1.0;
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    life -= dt;
    plane.position.y += dt * 1.5;
    plane.visibility = Math.max(0, life);
    if (life <= 0) {
      scene.onBeforeRenderObservable.remove(obs);
      plane.dispose();
      mat.dispose();
      dynTex.dispose();
    }
  });
}
