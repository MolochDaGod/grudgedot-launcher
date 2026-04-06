/**
 * ObjectStore Client Library — Browser-side
 *
 * Best-practice reference for integrating with the ObjectStore R2 Worker.
 *
 * - Public reads go DIRECT to the Worker (fast CDN, no server hop)
 * - Writes (upload/delete) go through the server proxy at /api/objectstore/*
 *   so the API key stays server-side.
 *
 * Usage:
 *   import { useObjectStoreAssets, useObjectStoreUpload } from '@/lib/objectstore';
 *
 *   const { data, isLoading } = useObjectStoreAssets({ category: 'weapon' });
 *   const upload = useObjectStoreUpload();
 *   upload.mutate({ file, category: 'weapon', tags: ['sword'] });
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "./queryClient";

// ── Types (mirror server/objectStoreR2.ts) ───────────────────────────

export interface R2Asset {
  id: string;
  key: string;
  filename: string;
  mime: string;
  size: number;
  sha256?: string | null;
  category: string;
  tags: string[];
  visibility: string;
  metadata: Record<string, unknown>;
  file_url?: string;
  created_at: string;
}

export interface R2ListResponse {
  items: R2Asset[];
  count: number;
  limit: number;
  offset: number;
}

export interface R2UploadResult {
  id: string;
  key: string;
  filename: string;
  mime: string;
  size: number;
  category: string;
  tags: string[];
  visibility: string;
  url: string;
  created_at: string;
}

export interface R2ListQuery {
  category?: string;
  tag?: string;
  q?: string;
  prefix?: string;
  limit?: number;
  offset?: number;
}

export interface R2HealthResponse {
  status: string;
  service: string;
}

// ── Client ───────────────────────────────────────────────────────────

const WORKER_URL = (
  import.meta.env.VITE_OBJECTSTORE_URL || "https://objectstore.grudge-studio.com"
).replace(/\/$/, "");

/** Build a public file URL for an R2 asset (direct CDN, immutable cache) */
export function getR2FileUrl(assetId: string): string {
  return `${WORKER_URL}/v1/assets/${encodeURIComponent(assetId)}/file`;
}

/** Get the configured ObjectStore base URL */
export function getObjectStoreUrl(): string {
  return WORKER_URL;
}

/**
 * Fetch assets directly from the ObjectStore Worker (public reads).
 * No API key needed — reads are unauthenticated.
 */
async function fetchR2Assets(query: R2ListQuery = {}): Promise<R2ListResponse> {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.tag) params.set("tag", query.tag);
  if (query.q) params.set("q", query.q);
  if (query.prefix) params.set("prefix", query.prefix);
  if (query.limit) params.set("limit", String(query.limit));
  if (query.offset) params.set("offset", String(query.offset));
  const qs = params.toString();

  const res = await fetch(`${WORKER_URL}/v1/assets${qs ? "?" + qs : ""}`);
  if (!res.ok) {
    throw new Error(`ObjectStore list failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Fetch single asset metadata from Worker */
async function fetchR2Asset(id: string): Promise<R2Asset> {
  const res = await fetch(`${WORKER_URL}/v1/assets/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`ObjectStore get failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

/** Health check against Worker */
async function fetchR2Health(): Promise<R2HealthResponse> {
  const res = await fetch(`${WORKER_URL}/health`);
  if (!res.ok) {
    throw new Error(`ObjectStore health check failed: ${res.status}`);
  }
  return res.json();
}

/**
 * Upload a file through the server proxy (keeps API key server-side).
 * POST /api/objectstore/assets with multipart/form-data.
 */
async function uploadViaProxy(params: {
  file: File;
  category?: string;
  tags?: string[];
  visibility?: string;
  metadata?: Record<string, unknown>;
}): Promise<R2UploadResult> {
  const fd = new FormData();
  fd.append("file", params.file);
  if (params.category) fd.append("category", params.category);
  if (params.tags) fd.append("tags", JSON.stringify(params.tags));
  if (params.visibility) fd.append("visibility", params.visibility);
  if (params.metadata) fd.append("metadata", JSON.stringify(params.metadata));

  const res = await fetch("/api/objectstore/assets", {
    method: "POST",
    body: fd,
    credentials: "include",
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || `Upload failed: ${res.status}`);
  }
  return res.json();
}

/** Delete via server proxy */
async function deleteViaProxy(id: string): Promise<{ deleted: boolean; id: string }> {
  const res = await fetch(`/api/objectstore/assets/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as any).error || `Delete failed: ${res.status}`);
  }
  return res.json();
}

// ── React Query Hooks ────────────────────────────────────────────────

/** Query key prefix for all ObjectStore queries */
const OS_KEY = "objectstore-assets";

/**
 * List / search ObjectStore R2 assets.
 * Reads directly from Worker CDN (no server hop).
 */
export function useObjectStoreAssets(query: R2ListQuery = {}, enabled = true) {
  return useQuery<R2ListResponse>({
    queryKey: [OS_KEY, query],
    queryFn: () => fetchR2Assets(query),
    enabled,
    staleTime: 30_000, // 30s — assets don't change rapidly
    retry: 2,
  });
}

/** Get a single asset by ID */
export function useObjectStoreAsset(id: string | null) {
  return useQuery<R2Asset>({
    queryKey: [OS_KEY, "detail", id],
    queryFn: () => fetchR2Asset(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

/** Upload a file to ObjectStore via server proxy */
export function useObjectStoreUpload() {
  return useMutation<
    R2UploadResult,
    Error,
    { file: File; category?: string; tags?: string[]; visibility?: string; metadata?: Record<string, unknown> }
  >({
    mutationFn: uploadViaProxy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OS_KEY] });
    },
  });
}

/** Delete an asset from ObjectStore via server proxy */
export function useObjectStoreDelete() {
  return useMutation<{ deleted: boolean; id: string }, Error, string>({
    mutationFn: deleteViaProxy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [OS_KEY] });
    },
  });
}

/** Health check (polls every 60s when enabled) */
export function useObjectStoreHealth(enabled = true) {
  return useQuery<R2HealthResponse>({
    queryKey: ["objectstore-health"],
    queryFn: fetchR2Health,
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
    retry: 1,
  });
}
