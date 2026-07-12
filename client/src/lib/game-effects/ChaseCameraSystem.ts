import * as THREE from 'three';

export interface ChaseCameraConfig {
  distance: number;
  height: number;
  heightOffset: number;
  lookAheadDistance: number;
  smoothSpeed: number;
  rotationSpeed: number;
  minDistance: number;
  maxDistance: number;
  minVerticalAngle: number;
  maxVerticalAngle: number;
  collisionEnabled: boolean;
  collisionRadius: number;
}

export class ChaseCamera {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D | null = null;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private config: ChaseCameraConfig;
  
  private horizontalAngle: number = 0;
  private verticalAngle: number = 0.3;
  private currentDistance: number;
  private targetDistance: number;
  
  private isMouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(camera: THREE.PerspectiveCamera, config?: Partial<ChaseCameraConfig>) {
    this.camera = camera;
    this.config = {
      distance: config?.distance ?? 10,
      height: config?.height ?? 5,
      heightOffset: config?.heightOffset ?? 1.5,
      lookAheadDistance: config?.lookAheadDistance ?? 2,
      smoothSpeed: config?.smoothSpeed ?? 5,
      rotationSpeed: config?.rotationSpeed ?? 0.003,
      minDistance: config?.minDistance ?? 3,
      maxDistance: config?.maxDistance ?? 20,
      minVerticalAngle: config?.minVerticalAngle ?? -0.5,
      maxVerticalAngle: config?.maxVerticalAngle ?? 1.2,
      collisionEnabled: config?.collisionEnabled ?? true,
      collisionRadius: config?.collisionRadius ?? 0.5,
    };
    
    this.currentDistance = this.config.distance;
    this.targetDistance = this.config.distance;
  }

  public setTarget(target: THREE.Object3D): void {
    this.target = target;
    if (target) {
      this.targetPosition.copy(target.position);
      this.updateCameraPosition(0);
    }
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public update(deltaTime: number, collisionObjects?: THREE.Object3D[]): void {
    if (!this.target) return;

    this.targetPosition.lerp(this.target.position, this.config.smoothSpeed * deltaTime);

    if (this.config.collisionEnabled && collisionObjects) {
      this.handleCollision(collisionObjects);
    }

    this.currentDistance = THREE.MathUtils.lerp(
      this.currentDistance,
      this.targetDistance,
      this.config.smoothSpeed * deltaTime
    );

    this.updateCameraPosition(deltaTime);
  }

  private updateCameraPosition(deltaTime: number): void {
    const offsetX = Math.sin(this.horizontalAngle) * Math.cos(this.verticalAngle) * this.currentDistance;
    const offsetY = Math.sin(this.verticalAngle) * this.currentDistance + this.config.height;
    const offsetZ = Math.cos(this.horizontalAngle) * Math.cos(this.verticalAngle) * this.currentDistance;

    const targetCameraPos = new THREE.Vector3(
      this.targetPosition.x + offsetX,
      this.targetPosition.y + offsetY,
      this.targetPosition.z + offsetZ
    );

    this.currentPosition.lerp(targetCameraPos, this.config.smoothSpeed * deltaTime);
    this.camera.position.copy(this.currentPosition);

    const lookAtTarget = this.targetPosition.clone();
    lookAtTarget.y += this.config.heightOffset;
    
    if (this.target) {
      const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.target.quaternion);
      lookAtTarget.add(forward.multiplyScalar(this.config.lookAheadDistance * 0.3));
    }
    
    this.camera.lookAt(lookAtTarget);
  }

  private handleCollision(collisionObjects: THREE.Object3D[]): void {
    const direction = this.camera.position.clone().sub(this.targetPosition).normalize();
    const raycaster = new THREE.Raycaster(
      this.targetPosition.clone().add(new THREE.Vector3(0, this.config.heightOffset, 0)),
      direction,
      0,
      this.targetDistance + this.config.collisionRadius
    );

    const intersects = raycaster.intersectObjects(collisionObjects, true);
    
    if (intersects.length > 0) {
      const closestHit = intersects[0];
      const newDistance = closestHit.distance - this.config.collisionRadius;
      this.currentDistance = Math.max(this.config.minDistance, Math.min(newDistance, this.targetDistance));
    }
  }

  public handleMouseDown(event: MouseEvent): void {
    if (event.button === 2) {
      this.isMouseDown = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  public handleMouseUp(event: MouseEvent): void {
    if (event.button === 2) {
      this.isMouseDown = false;
    }
  }

  public handleMouseMove(event: MouseEvent): void {
    if (!this.isMouseDown) return;

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.horizontalAngle -= deltaX * this.config.rotationSpeed;
    this.verticalAngle += deltaY * this.config.rotationSpeed;

    this.verticalAngle = Math.max(
      this.config.minVerticalAngle,
      Math.min(this.config.maxVerticalAngle, this.verticalAngle)
    );

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  public handleWheel(event: WheelEvent): void {
    const zoomSpeed = 0.5;
    this.targetDistance += event.deltaY * 0.01 * zoomSpeed;
    this.targetDistance = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, this.targetDistance)
    );
  }

  public setDistance(distance: number): void {
    this.targetDistance = Math.max(
      this.config.minDistance,
      Math.min(this.config.maxDistance, distance)
    );
  }

  public setAngle(horizontal: number, vertical: number): void {
    this.horizontalAngle = horizontal;
    this.verticalAngle = Math.max(
      this.config.minVerticalAngle,
      Math.min(this.config.maxVerticalAngle, vertical)
    );
  }

  public rotateAroundTarget(deltaAngle: number): void {
    this.horizontalAngle += deltaAngle;
  }

  public getForwardDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(
      -Math.sin(this.horizontalAngle),
      0,
      -Math.cos(this.horizontalAngle)
    );
    return direction.normalize();
  }

  public getRightDirection(): THREE.Vector3 {
    const forward = this.getForwardDirection();
    return new THREE.Vector3(-forward.z, 0, forward.x);
  }

  public attachControls(element: HTMLElement): () => void {
    const onMouseDown = (e: MouseEvent) => this.handleMouseDown(e);
    const onMouseUp = (e: MouseEvent) => this.handleMouseUp(e);
    const onMouseMove = (e: MouseEvent) => this.handleMouseMove(e);
    const onWheel = (e: WheelEvent) => this.handleWheel(e);
    const onContextMenu = (e: Event) => e.preventDefault();

    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mouseup', onMouseUp);
    element.addEventListener('mousemove', onMouseMove);
    element.addEventListener('wheel', onWheel);
    element.addEventListener('contextmenu', onContextMenu);

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('mouseup', onMouseUp);
      element.removeEventListener('mousemove', onMouseMove);
      element.removeEventListener('wheel', onWheel);
      element.removeEventListener('contextmenu', onContextMenu);
    };
  }
}

export class FirstPersonCamera {
  private camera: THREE.PerspectiveCamera;
  private target: THREE.Object3D | null = null;
  private config: {
    eyeHeight: number;
    mouseSensitivity: number;
    minPitch: number;
    maxPitch: number;
  };
  
  private yaw: number = 0;
  private pitch: number = 0;
  private isPointerLocked: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, config?: Partial<FirstPersonCamera['config']>) {
    this.camera = camera;
    this.config = {
      eyeHeight: config?.eyeHeight ?? 1.7,
      mouseSensitivity: config?.mouseSensitivity ?? 0.002,
      minPitch: config?.minPitch ?? -Math.PI / 2 + 0.1,
      maxPitch: config?.maxPitch ?? Math.PI / 2 - 0.1,
    };
  }

  public setTarget(target: THREE.Object3D): void {
    this.target = target;
  }

  public update(): void {
    if (!this.target) return;

    this.camera.position.copy(this.target.position);
    this.camera.position.y += this.config.eyeHeight;

    const euler = new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  public handleMouseMove(movementX: number, movementY: number): void {
    if (!this.isPointerLocked) return;

    this.yaw -= movementX * this.config.mouseSensitivity;
    this.pitch -= movementY * this.config.mouseSensitivity;

    this.pitch = Math.max(this.config.minPitch, Math.min(this.config.maxPitch, this.pitch));
  }

  public requestPointerLock(element: HTMLElement): void {
    element.requestPointerLock();
  }

  public setPointerLocked(locked: boolean): void {
    this.isPointerLocked = locked;
  }

  public getForwardDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(this.camera.quaternion);
    direction.y = 0;
    return direction.normalize();
  }

  public getRightDirection(): THREE.Vector3 {
    const forward = this.getForwardDirection();
    return new THREE.Vector3(forward.z, 0, -forward.x);
  }

  public attachControls(element: HTMLElement): () => void {
    const onMouseMove = (e: MouseEvent) => {
      this.handleMouseMove(e.movementX, e.movementY);
    };

    const onPointerLockChange = () => {
      this.isPointerLocked = document.pointerLockElement === element;
    };

    const onClick = () => {
      if (!this.isPointerLocked) {
        this.requestPointerLock(element);
      }
    };

    element.addEventListener('click', onClick);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('pointerlockchange', onPointerLockChange);

    return () => {
      element.removeEventListener('click', onClick);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('pointerlockchange', onPointerLockChange);
    };
  }
}

export class CameraPresets {
  static topDown(camera: THREE.PerspectiveCamera): ChaseCameraConfig {
    return {
      distance: 20,
      height: 18,
      heightOffset: 0,
      lookAheadDistance: 0,
      smoothSpeed: 8,
      rotationSpeed: 0.003,
      minDistance: 10,
      maxDistance: 40,
      minVerticalAngle: 1.2,
      maxVerticalAngle: 1.4,
      collisionEnabled: false,
      collisionRadius: 0.5,
    };
  }

  static thirdPerson(camera: THREE.PerspectiveCamera): ChaseCameraConfig {
    return {
      distance: 8,
      height: 3,
      heightOffset: 1.5,
      lookAheadDistance: 2,
      smoothSpeed: 6,
      rotationSpeed: 0.003,
      minDistance: 3,
      maxDistance: 15,
      minVerticalAngle: -0.3,
      maxVerticalAngle: 0.8,
      collisionEnabled: true,
      collisionRadius: 0.5,
    };
  }

  static cinematic(camera: THREE.PerspectiveCamera): ChaseCameraConfig {
    return {
      distance: 12,
      height: 4,
      heightOffset: 1,
      lookAheadDistance: 4,
      smoothSpeed: 2,
      rotationSpeed: 0.002,
      minDistance: 8,
      maxDistance: 20,
      minVerticalAngle: 0,
      maxVerticalAngle: 0.6,
      collisionEnabled: true,
      collisionRadius: 1,
    };
  }

  static mobaStyle(camera: THREE.PerspectiveCamera): ChaseCameraConfig {
    return {
      distance: 15,
      height: 12,
      heightOffset: 0,
      lookAheadDistance: 0,
      smoothSpeed: 10,
      rotationSpeed: 0,
      minDistance: 10,
      maxDistance: 25,
      minVerticalAngle: 0.8,
      maxVerticalAngle: 1.0,
      collisionEnabled: false,
      collisionRadius: 0.5,
    };
  }
}
