import type { Island, Vec2 } from './types';

function rectGap(a: Island, b: Island): number {
  const hGap = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const vGap = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.sqrt(hGap * hGap + vGap * vGap);
}

export function islandContaining(islands: Island[], pos: Vec2): Island | null {
  return islands.find(i =>
    pos.x >= i.x && pos.x <= i.x + i.w &&
    pos.y >= i.y && pos.y <= i.y + i.h
  ) ?? null;
}

export function nearestIsland(islands: Island[], pos: Vec2): Island {
  let best = islands[0];
  let bestD = Infinity;
  for (const isl of islands) {
    const cx = isl.x + isl.w / 2;
    const cy = isl.y + isl.h / 2;
    const d = Math.hypot(pos.x - cx, pos.y - cy);
    if (d < bestD) { bestD = d; best = isl; }
  }
  return best;
}

export function isOnIsland(pos: Vec2, islands: Island[]): boolean {
  return islands.some(isl =>
    pos.x >= isl.x && pos.x <= isl.x + isl.w &&
    pos.y >= isl.y && pos.y <= isl.y + isl.h
  );
}

function buildAdj(islands: Island[]): Map<string, string[]> {
  const adj = new Map<string, string[]>(islands.map(i => [i.id, []]));
  for (let i = 0; i < islands.length; i++) {
    for (let j = i + 1; j < islands.length; j++) {
      if (rectGap(islands[i], islands[j]) < 220) {
        adj.get(islands[i].id)!.push(islands[j].id);
        adj.get(islands[j].id)!.push(islands[i].id);
      }
    }
  }
  return adj;
}

/**
 * BFS through island graph to find waypoints from fromPos to toPos.
 * Returns [toPos] if same island, or intermediate island centres + final dest.
 */
export function computePathWaypoints(
  islands: Island[],
  fromPos: Vec2,
  toPos: Vec2,
): Vec2[] {
  const fromIsl = islandContaining(islands, fromPos) ?? nearestIsland(islands, fromPos);
  const toIsl   = islandContaining(islands, toPos)   ?? nearestIsland(islands, toPos);

  if (fromIsl.id === toIsl.id) return [toPos];

  const adj = buildAdj(islands);
  const prev = new Map<string, string | null>([[fromIsl.id, null]]);
  const queue = [fromIsl.id];
  let found = false;

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === toIsl.id) { found = true; break; }
    for (const nb of adj.get(curr) ?? []) {
      if (!prev.has(nb)) { prev.set(nb, curr); queue.push(nb); }
    }
  }

  if (!found) return [toPos];

  const seq: Island[] = [];
  let cur: string | null = toIsl.id;
  while (cur && cur !== fromIsl.id) {
    const isl = islands.find(i => i.id === cur);
    if (isl) seq.unshift(isl);
    cur = prev.get(cur) ?? null;
  }

  const waypoints: Vec2[] = seq.map(isl => ({
    x: isl.x + isl.w / 2,
    y: isl.y + isl.h / 2,
  }));

  if (waypoints.length > 0) {
    waypoints[waypoints.length - 1] = { ...toPos };
  } else {
    waypoints.push({ ...toPos });
  }

  return waypoints;
}
