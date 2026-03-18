/**
 * Object Storage Service — Grudge VPS Backend
 *
 * Formerly used the Replit GCS sidecar (127.0.0.1:1106).
 * Now all storage operations either:
 *   - Fall back to the static asset manifest (Vercel / local dev)
 *   - Return 503 for write operations (uploads should go through
 *     the VPS asset service at assets-api.grudge-studio.com)
 */

import { Response } from "express";
import * as fs from "fs";
import * as nodePath from "path";

/** GCS Storage client — always null (sidecar removed). */
export const objectStorageClient: null = null;

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    const paths = Array.from(
      new Set(
        pathsStr
          .split(",")
          .map((path) => path.trim())
          .filter((path) => path.length > 0)
      )
    );
    if (paths.length === 0) {
      throw new Error(
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Configure VPS storage or use the static asset manifest."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Configure VPS storage."
      );
    }
    return dir;
  }

  // ── Read operations fall back to static manifest ──

  async searchPublicObject(_filePath: string): Promise<null> {
    // GCS sidecar removed — public objects served via CDN (assets.grudge-studio.com)
    return null;
  }

  async downloadObject(_file: any, res: Response, _cacheTtlSec: number = 3600) {
    res.status(503).json({
      error: "Direct object download unavailable. Use CDN at assets.grudge-studio.com",
    });
  }

  async listFiles(_prefix: string): Promise<Array<{ name: string; size?: number; updated?: string }>> {
    return this.getStaticManifest().map((a) => ({
      name: a.filename,
      size: a.size,
    }));
  }

  // ── Write operations return 503 (use VPS asset service) ──

  async getObjectEntityUploadURL(): Promise<string> {
    throw new Error(
      "Upload via GCS sidecar removed. Use VPS asset service at assets-api.grudge-studio.com"
    );
  }

  async getAssetUploadURL(
    _fileName: string,
    _contentType: string
  ): Promise<{ uploadURL: string; publicPath: string }> {
    throw new Error(
      "Upload via GCS sidecar removed. Use VPS asset service at assets-api.grudge-studio.com"
    );
  }

  async getOrganizedAssetUploadURL(
    _fileName: string,
    _contentType: string,
    _folder: string
  ): Promise<{ uploadURL: string; publicPath: string; fullStoragePath: string }> {
    throw new Error(
      "Upload via GCS sidecar removed. Use VPS asset service at assets-api.grudge-studio.com"
    );
  }

  async uploadFileToStorage(
    _localPath: string,
    _folder: string,
    _fileName: string
  ): Promise<{ publicPath: string; fullStoragePath: string }> {
    throw new Error(
      "Upload via GCS sidecar removed. Use VPS asset service at assets-api.grudge-studio.com"
    );
  }

  async getObjectEntityFile(_objectPath: string): Promise<never> {
    throw new ObjectNotFoundError();
  }

  normalizeObjectEntityPath(rawPath: string): string {
    return rawPath;
  }

  // ── Listing / Registry (static manifest fallback) ──

  async listStorageAssets(
    _folder?: string
  ): Promise<Array<{ name: string; path: string }>> {
    return this.getStaticManifest().map((a) => ({
      name: a.filename,
      path: a.url,
    }));
  }

  async listAllPublicAssets(
    prefix?: string
  ): Promise<Array<{ name: string; path: string; fullPath: string }>> {
    let assets = this.getStaticManifest();
    if (prefix) {
      assets = assets.filter((a) => a.storagePath?.includes(prefix));
    }
    return assets.map((a) => ({
      name: a.filename,
      path: a.storagePath || a.url,
      fullPath: a.url,
    }));
  }

  getPublicAssetURL(publicPath: string): string {
    return `/api/assets/public/${publicPath}`;
  }

  /** Read static asset manifest bundled in public/ */
  private getStaticManifest(filter?: { type?: string; folder?: string }): Array<{
    id: string;
    uuid: string;
    filename: string;
    type: string;
    folder: string;
    url: string;
    directUrl: string;
    storagePath: string;
    size?: number;
    tags?: string[];
  }> {
    try {
      const manifestPath = nodePath.join(process.cwd(), "public", "asset-manifest.json");
      const raw = fs.readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(raw);
      let assets: any[] = manifest.assets || [];
      if (filter?.type) {
        assets = assets.filter((a: any) => a.type === filter.type);
      }
      if (filter?.folder) {
        assets = assets.filter((a: any) => a.folder?.includes(filter.folder!));
      }
      return assets;
    } catch {
      return [];
    }
  }

  /** Asset registry — always uses static manifest (GCS removed) */
  async getAssetRegistry(filter?: { type?: string; folder?: string }): Promise<Array<{
    id: string;
    uuid: string;
    filename: string;
    type: string;
    folder: string;
    url: string;
    directUrl: string;
    storagePath: string;
    size?: number;
    contentType?: string;
    createdAt?: string;
  }>> {
    return this.getStaticManifest(filter);
  }

  /** Find asset URL from static manifest by ID */
  getStaticAssetUrl(id: string): string | null {
    const assets = this.getStaticManifest();
    const asset = assets.find((a) => a.id === id || a.uuid === id);
    return asset?.url || null;
  }

  async getAssetById(_id: string): Promise<null> {
    // GCS removed — redirect handled via getStaticAssetUrl in routes
    return null;
  }
}
