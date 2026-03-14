/**
 * ObjectStore Client — Typed client for fetching the GDevelop asset manifest
 * from ObjectStore (molochdagod.github.io/ObjectStore).
 */

export const OBJECTSTORE_BASE = "https://molochdagod.github.io/ObjectStore";
export const MANIFEST_URL = `${OBJECTSTORE_BASE}/api/v1/gdevelop-assets.json`;

// ─── Types ──────────────────────────────────────────────────

export type AssetType = "icon" | "sprite" | "model" | "audio" | "video";

export interface ObjectStoreAsset {
  id: string;
  name: string;
  type: AssetType;
  category: string;
  subcategory: string;
  url: string;
  previewUrl: string | null;
  tags: string[];
  format: string;
  sizeBytes: number;
  metadata?: Record<string, unknown>;
}

export interface CategorySummary {
  type: AssetType;
  category: string;
  count: number;
}

export interface GDevelopManifest {
  version: string;
  generated: string;
  baseUrl: string;
  totalAssets: number;
  types: Record<AssetType, number>;
  categories: CategorySummary[];
  assets: ObjectStoreAsset[];
}

// ─── Fetcher ────────────────────────────────────────────────

let _cache: GDevelopManifest | null = null;

export async function fetchManifest(): Promise<GDevelopManifest> {
  if (_cache) return _cache;
  const res = await fetch(MANIFEST_URL);
  if (!res.ok) throw new Error(`Failed to fetch ObjectStore manifest: ${res.status}`);
  _cache = await res.json();
  return _cache!;
}

export function clearManifestCache() {
  _cache = null;
}

// ─── Helpers ────────────────────────────────────────────────

export function filterAssets(
  assets: ObjectStoreAsset[],
  opts: {
    type?: AssetType;
    category?: string;
    search?: string;
    tags?: string[];
  }
): ObjectStoreAsset[] {
  return assets.filter((a) => {
    if (opts.type && a.type !== opts.type) return false;
    if (opts.category && a.category !== opts.category) return false;
    if (opts.tags?.length && !opts.tags.some((t) => a.tags.includes(t))) return false;
    if (opts.search) {
      const q = opts.search.toLowerCase();
      return (
        a.name.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return true;
  });
}

export function getUniqueCategories(
  assets: ObjectStoreAsset[],
  type?: AssetType
): string[] {
  const filtered = type ? assets.filter((a) => a.type === type) : assets;
  return [...new Set(filtered.map((a) => a.category))].sort();
}

export function formatSize(bytes: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
