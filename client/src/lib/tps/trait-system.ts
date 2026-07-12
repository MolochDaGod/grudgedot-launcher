/**
 * Armory3D-style Trait System for BabylonJS
 *
 * Traits are reusable behavior components that attach to BabylonJS TransformNodes.
 * Each trait has lifecycle hooks: init(), update(dt), remove().
 * The TraitManager drives all active traits each frame via scene.onBeforeRenderObservable.
 */

import * as BABYLON from '@babylonjs/core';

// ── Base Trait ──

export abstract class Trait {
  /** The node this trait is attached to */
  node: BABYLON.TransformNode | BABYLON.AbstractMesh;
  /** Reference to the scene */
  scene: BABYLON.Scene;
  /** Unique ID for this trait instance */
  readonly uid: string;
  /** Whether this trait is currently active */
  active = true;

  private _initialized = false;
  private _onRemoveCallbacks: (() => void)[] = [];

  constructor(node: BABYLON.TransformNode | BABYLON.AbstractMesh) {
    this.node = node;
    this.scene = node.getScene();
    this.uid = `trait_${Math.random().toString(36).slice(2, 10)}`;
  }

  /** Called once when the trait is first registered */
  init(): void {}

  /** Called every frame with delta time in seconds */
  abstract update(dt: number): void;

  /** Called when the trait is removed */
  remove(): void {}

  /** Register a callback to run on removal */
  notifyOnRemove(cb: () => void): void {
    this._onRemoveCallbacks.push(cb);
  }

  /** @internal */
  _doInit(): void {
    if (this._initialized) return;
    this._initialized = true;
    this.init();
  }

  /** @internal */
  _doRemove(): void {
    this.remove();
    this._onRemoveCallbacks.forEach(cb => cb());
    this._onRemoveCallbacks.length = 0;
  }

  /** Get another trait of a given type on the same node */
  getTrait<T extends Trait>(TraitClass: new (...args: any[]) => T): T | null {
    return TraitManager.getTrait(this.node, TraitClass);
  }
}

// ── Trait Manager (singleton per scene) ──

const managers = new WeakMap<BABYLON.Scene, TraitManager>();

export class TraitManager {
  private scene: BABYLON.Scene;
  private traits: Map<string, Trait> = new Map();
  private nodeTraits: Map<BABYLON.Node, Set<string>> = new Map();
  private observer: BABYLON.Nullable<BABYLON.Observer<BABYLON.Scene>> = null;
  private lastTime = 0;

  private constructor(scene: BABYLON.Scene) {
    this.scene = scene;
    this.lastTime = performance.now();
    this.observer = scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;
      this.tick(dt);
    });
  }

  static get(scene: BABYLON.Scene): TraitManager {
    let mgr = managers.get(scene);
    if (!mgr) {
      mgr = new TraitManager(scene);
      managers.set(scene, mgr);
    }
    return mgr;
  }

  /** Register a trait and call its init() */
  add(trait: Trait): void {
    this.traits.set(trait.uid, trait);
    let set = this.nodeTraits.get(trait.node);
    if (!set) {
      set = new Set();
      this.nodeTraits.set(trait.node, set);
    }
    set.add(trait.uid);
    trait._doInit();
  }

  /** Remove a trait by instance */
  removeTrait(trait: Trait): void {
    trait.active = false;
    trait._doRemove();
    this.traits.delete(trait.uid);
    const set = this.nodeTraits.get(trait.node);
    if (set) {
      set.delete(trait.uid);
      if (set.size === 0) this.nodeTraits.delete(trait.node);
    }
  }

  /** Remove all traits from a node */
  removeAllTraits(node: BABYLON.Node): void {
    const set = this.nodeTraits.get(node);
    if (!set) return;
    for (const uid of set) {
      const trait = this.traits.get(uid);
      if (trait) {
        trait.active = false;
        trait._doRemove();
        this.traits.delete(uid);
      }
    }
    this.nodeTraits.delete(node);
  }

  /** Find a trait of a given type on a node */
  static getTrait<T extends Trait>(
    node: BABYLON.Node,
    TraitClass: new (...args: any[]) => T
  ): T | null {
    const scene = node.getScene();
    const mgr = managers.get(scene);
    if (!mgr) return null;
    const set = mgr.nodeTraits.get(node);
    if (!set) return null;
    for (const uid of set) {
      const trait = mgr.traits.get(uid);
      if (trait && trait instanceof TraitClass) return trait as T;
    }
    return null;
  }

  /** Get all traits on a node */
  static getTraits(node: BABYLON.Node): Trait[] {
    const scene = node.getScene();
    const mgr = managers.get(scene);
    if (!mgr) return [];
    const set = mgr.nodeTraits.get(node);
    if (!set) return [];
    const result: Trait[] = [];
    for (const uid of set) {
      const trait = mgr.traits.get(uid);
      if (trait) result.push(trait);
    }
    return result;
  }

  private tick(dt: number): void {
    for (const trait of this.traits.values()) {
      if (trait.active) {
        trait.update(dt);
      }
    }
  }

  dispose(): void {
    for (const trait of this.traits.values()) {
      trait._doRemove();
    }
    this.traits.clear();
    this.nodeTraits.clear();
    if (this.observer) {
      this.scene.onBeforeRenderObservable.remove(this.observer);
      this.observer = null;
    }
    managers.delete(this.scene);
  }
}
