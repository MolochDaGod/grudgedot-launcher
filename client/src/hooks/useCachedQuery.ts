/**
 * useCachedQuery — React Query + Puter KV read-through cache.
 *
 * Flow:
 *  1. On mount, read from Puter KV (instant). If found & fresh → use as initialData.
 *  2. Fire the normal React Query fetch to Neon. On success → update Puter KV with TTL.
 *  3. If Puter is unavailable → pure React Query, zero breakage.
 *
 * Neon is ALWAYS the source of truth.
 */

import { useQuery, type UseQueryResult, type QueryKey } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";

const CACHE_PREFIX = "qc_"; // "query cache" namespace in Puter KV

interface CachedEntry<T> {
  data: T;
  ts: number;     // timestamp when cached
  ttl: number;    // TTL in ms
}

function getPuter() {
  return typeof window !== "undefined" && window.puter ? window.puter : null;
}

function cacheKey(queryKey: QueryKey): string {
  const raw = Array.isArray(queryKey) ? queryKey.join("|") : String(queryKey);
  return `${CACHE_PREFIX}${raw}`;
}

async function readFromKV<T>(key: string): Promise<T | undefined> {
  const puter = getPuter();
  if (!puter) return undefined;
  try {
    const raw = await puter.kv.get(key);
    if (!raw) return undefined;
    const entry: CachedEntry<T> =
      typeof raw === "string" ? JSON.parse(raw) : (raw as CachedEntry<T>);
    // Check expiry
    if (entry.ttl > 0 && Date.now() - entry.ts > entry.ttl) {
      // Stale — delete in background, don't await
      puter.kv.del(key).catch(() => {});
      return undefined;
    }
    return entry.data;
  } catch {
    return undefined;
  }
}

async function writeToKV<T>(key: string, data: T, ttlMs: number): Promise<void> {
  const puter = getPuter();
  if (!puter) return;
  try {
    const entry: CachedEntry<T> = { data, ts: Date.now(), ttl: ttlMs };
    await puter.kv.set(key, JSON.stringify(entry));
  } catch {
    // Non-critical — cache write failure is fine
  }
}

/** Invalidate a specific Puter KV cache entry */
export async function invalidatePuterCache(queryKey: QueryKey): Promise<void> {
  const puter = getPuter();
  if (!puter) return;
  try {
    await puter.kv.del(cacheKey(queryKey));
  } catch {
    // Non-critical
  }
}

interface UseCachedQueryOptions {
  /** Cache TTL in milliseconds. Default: 120_000 (2 min) */
  ttlMs?: number;
  /** Whether the query is enabled. Forwarded to React Query. */
  enabled?: boolean;
  /** React Query retry. Default: false */
  retry?: boolean | number;
}

/**
 * Drop-in replacement for useQuery that caches results in Puter KV.
 *
 * @example
 * const { data } = useCachedQuery<UserSettings>(['/api/settings'], { ttlMs: 300_000 });
 */
export function useCachedQuery<T = unknown>(
  queryKey: QueryKey,
  options?: UseCachedQueryOptions,
): UseQueryResult<T> {
  const { ttlMs = 120_000, enabled = true, retry = false } = options ?? {};
  const key = cacheKey(queryKey);

  const [kvData, setKvData] = useState<T | undefined>(undefined);
  const kvLoaded = useRef(false);

  // Read from Puter KV on mount (non-blocking)
  useEffect(() => {
    if (!enabled || kvLoaded.current) return;
    kvLoaded.current = true;
    readFromKV<T>(key).then((cached) => {
      if (cached !== undefined) {
        setKvData(cached);
      }
    });
  }, [key, enabled]);

  const result = useQuery({
    queryKey: queryKey as string[],
    queryFn: async () => {
      // Default fetch for string-array queryKeys like ['/api/settings']
      const url = Array.isArray(queryKey) ? String(queryKey[0]) : String(queryKey);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<T>;
    },
    enabled,
    retry,
    // Use KV data as placeholder until server responds
    ...(kvData !== undefined ? { placeholderData: kvData as any } : {}),
  });

  // Write successful response back to Puter KV
  const prevDataRef = useRef<T | undefined>(undefined);
  useEffect(() => {
    if (result.data !== undefined && result.data !== prevDataRef.current) {
      prevDataRef.current = result.data as T;
      writeToKV(key, result.data, ttlMs);
    }
  }, [result.data, key, ttlMs]);

  return result as UseQueryResult<T>;
}

export default useCachedQuery;
