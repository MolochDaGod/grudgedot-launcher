import * as THREE from 'three';

export interface StreetCell {
  x: number;
  z: number;
  y: number;
  gx: number;
  gz: number;
}

export interface StreetNavMesh {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cellW: number;
  cellH: number;
  gridW: number;
  gridH: number;
  drivable: Uint8Array;
  heights: Float32Array;
}

export interface RaceRoute {
  points: THREE.Vector3[];
  curve: THREE.CatmullRomCurve3;
  length: number;
  legalRadius: number;
}

const ROAD_MAT_RE = /491|711|891/;

export function isRoadMaterial(mat: THREE.Material | THREE.Material[] | undefined): boolean {
  const m = Array.isArray(mat) ? mat[0] : mat;
  return ROAD_MAT_RE.test(m?.name ?? '');
}

export function buildStreetNavMesh(
  meshes: THREE.Mesh[],
  bounds: THREE.Box3,
  gridW = 56,
  gridH = 56,
  padding = 24,
): StreetNavMesh {
  const minX = bounds.min.x + padding;
  const maxX = bounds.max.x - padding;
  const minZ = bounds.min.z + padding;
  const maxZ = bounds.max.z - padding;
  const cellW = (maxX - minX) / gridW;
  const cellH = (maxZ - minZ) / gridH;
  const drivable = new Uint8Array(gridW * gridH);
  const heights = new Float32Array(gridW * gridH);
  const raycaster = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const down = new THREE.Vector3(0, -1, 0);

  for (let gz = 0; gz < gridH; gz++) {
    for (let gx = 0; gx < gridW; gx++) {
      const idx = gz * gridW + gx;
      const x = minX + (gx + 0.5) * cellW;
      const z = minZ + (gz + 0.5) * cellH;
      origin.set(x, 120, z);
      raycaster.set(origin, down);
      const hits = raycaster.intersectObjects(meshes, false);
      if (!hits.length) continue;
      const hit = hits[0];
      const mat = hit.object instanceof THREE.Mesh ? hit.object.material : undefined;
      if (isRoadMaterial(mat)) {
        drivable[idx] = 1;
        heights[idx] = hit.point.y;
      }
    }
  }

  return { minX, maxX, minZ, maxZ, cellW, cellH, gridW, gridH, drivable, heights };
}

function idx(nav: StreetNavMesh, gx: number, gz: number) {
  return gz * nav.gridW + gx;
}

export function isWorldOnStreet(nav: StreetNavMesh, x: number, z: number, radius = 1): boolean {
  const gx = Math.floor((x - nav.minX) / nav.cellW);
  const gz = Math.floor((z - nav.minZ) / nav.cellH);
  for (let dz = -radius; dz <= radius; dz++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = gx + dx;
      const nz = gz + dz;
      if (nx < 0 || nz < 0 || nx >= nav.gridW || nz >= nav.gridH) continue;
      if (nav.drivable[idx(nav, nx, nz)]) return true;
    }
  }
  return false;
}

export function sampleStreetHeight(nav: StreetNavMesh, x: number, z: number): number | null {
  const gx = Math.floor((x - nav.minX) / nav.cellW);
  const gz = Math.floor((z - nav.minZ) / nav.cellH);
  if (gx < 0 || gz < 0 || gx >= nav.gridW || gz >= nav.gridH) return null;
  const i = idx(nav, gx, gz);
  if (!nav.drivable[i]) return null;
  return nav.heights[i];
}

/** Moore-neighborhood A* across drivable street cells */
export function findStreetPath(
  nav: StreetNavMesh,
  from: THREE.Vector3,
  to: THREE.Vector3,
): THREE.Vector3[] {
  const startGx = Math.floor((from.x - nav.minX) / nav.cellW);
  const startGz = Math.floor((from.z - nav.minZ) / nav.cellH);
  const endGx = Math.floor((to.x - nav.minX) / nav.cellW);
  const endGz = Math.floor((to.z - nav.minZ) / nav.cellH);

  const startKey = `${startGx},${startGz}`;
  const endKey = `${endGx},${endGz}`;
  if (!nav.drivable[idx(nav, startGx, startGz)] || !nav.drivable[idx(nav, endGx, endGz)]) {
    return [from.clone(), to.clone()];
  }

  const open = new Map<string, { gx: number; gz: number; f: number; g: number }>();
  const cameFrom = new Map<string, string>();
  const gScore = new Map<string, number>();

  const h = (gx: number, gz: number) => Math.hypot(gx - endGx, gz - endGz);
  gScore.set(startKey, 0);
  open.set(startKey, { gx: startGx, gz: startGz, f: h(startGx, startGz), g: 0 });

  const neighbors = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  let guard = 0;
  while (open.size > 0 && guard++ < 8000) {
    let currentKey = '';
    let bestF = Infinity;
    open.forEach((v, k) => {
      if (v.f < bestF) { bestF = v.f; currentKey = k; }
    });
    if (currentKey === endKey) break;

    const current = open.get(currentKey)!;
    open.delete(currentKey);

    for (const [dx, dz] of neighbors) {
      const nx = current.gx + dx;
      const nz = current.gz + dz;
      if (nx < 0 || nz < 0 || nx >= nav.gridW || nz >= nav.gridH) continue;
      if (!nav.drivable[idx(nav, nx, nz)]) continue;

      const nKey = `${nx},${nz}`;
      const step = Math.hypot(dx, dz);
      const tentative = (gScore.get(currentKey) ?? Infinity) + step;
      if (tentative >= (gScore.get(nKey) ?? Infinity)) continue;

      cameFrom.set(nKey, currentKey);
      gScore.set(nKey, tentative);
      open.set(nKey, { gx: nx, gz: nz, f: tentative + h(nx, nz), g: tentative });
    }
  }

  const path: THREE.Vector3[] = [];
  let ck = endKey;
  if (!cameFrom.has(ck)) return [from.clone(), to.clone()];

  while (cameFrom.has(ck)) {
    const [gx, gz] = ck.split(',').map(Number);
    const x = nav.minX + (gx + 0.5) * nav.cellW;
    const z = nav.minZ + (gz + 0.5) * nav.cellH;
    const y = nav.heights[idx(nav, gx, gz)] ?? from.y;
    path.unshift(new THREE.Vector3(x, y, z));
    ck = cameFrom.get(ck)!;
  }
  path.unshift(from.clone());
  path.push(to.clone());
  return path;
}

/** Trace outer boundary of drivable street grid into a closed lap loop */
export function extractLapRoute(nav: StreetNavMesh, targetPoints = 72): RaceRoute {
  let start: [number, number] | null = null;
  outer: for (let gz = 0; gz < nav.gridH; gz++) {
    for (let gx = 0; gx < nav.gridW; gx++) {
      if (nav.drivable[idx(nav, gx, gz)]) {
        start = [gx, gz];
        break outer;
      }
    }
  }

  const points: THREE.Vector3[] = [];
  if (!start) {
    const fallback = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(20, 0, 0),
      new THREE.Vector3(20, 0, 20),
      new THREE.Vector3(0, 0, 20),
    ], true);
    return { points: fallback.points, curve: fallback, length: fallback.getLength(), legalRadius: 12 };
  }

  const dirs: [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  let [cx, cy] = start;
  let dir = 0;
  let guard = 0;

  const push = (gx: number, gz: number) => {
    const x = nav.minX + (gx + 0.5) * nav.cellW;
    const z = nav.minZ + (gz + 0.5) * nav.cellH;
    const y = nav.heights[idx(nav, gx, gz)];
    points.push(new THREE.Vector3(x, y, z));
  };

  push(cx, cy);
  while (guard++ < 6000) {
    let moved = false;
    for (let t = 0; t < 4; t++) {
      const d = (dir + t) % 4;
      const nx = cx + dirs[d][0];
      const nz = cy + dirs[d][1];
      if (nx < 0 || nz < 0 || nx >= nav.gridW || nz >= nav.gridH) continue;
      if (!nav.drivable[idx(nav, nx, nz)]) continue;
      cx = nx;
      cy = nz;
      dir = (d + 3) % 4;
      push(cx, cy);
      moved = true;
      break;
    }
    if (!moved) break;
    if (cx === start[0] && cy === start[1] && points.length > 24) break;
  }

  const step = Math.max(1, Math.floor(points.length / targetPoints));
  const decimated: THREE.Vector3[] = [];
  for (let i = 0; i < points.length; i += step) decimated.push(points[i].clone());
  if (decimated.length < 4) decimated.push(...points.slice(0, 4 - decimated.length).map(p => p.clone()));

  const curve = new THREE.CatmullRomCurve3(decimated, true, 'catmullrom', 0.2);
  const legalRadius = Math.max(nav.cellW, nav.cellH) * 2.2;
  return { points: decimated, curve, length: curve.getLength(), legalRadius };
}

export function getClosestRouteProgress(route: RaceRoute, position: THREE.Vector3): number {
  let bestT = 0;
  let bestDist = Infinity;
  const samples = 64;
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    const p = route.curve.getPointAt(t);
    const d = position.distanceTo(p);
    if (d < bestDist) {
      bestDist = d;
      bestT = t;
    }
  }
  return bestT;
}