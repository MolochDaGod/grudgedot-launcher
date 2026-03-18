/**
 * StorageProvider — Abstraction layer for file storage backends.
 *
 * Implementations:
 *   - LocalFSProvider:    serves files from a local directory (dev)
 *   - VercelBlobProvider: uses @vercel/blob for Vercel deployments
 *
 * The active provider is selected by the STORAGE_PROVIDER env var:
 *   STORAGE_PROVIDER=local   → LocalFSProvider (default for dev)
 *   STORAGE_PROVIDER=vercel  → VercelBlobProvider
 */

import fs from "fs/promises";
import { existsSync, createReadStream, statSync } from "fs";
import path from "path";
import { createHash, randomUUID } from "crypto";

// ── Interface ──────────────────────────────────────────────────────

export interface StorageFile {
  name: string;
  path: string;
  size: number;
  contentType: string;
  url: string;
  updatedAt?: string;
}

export interface UploadResult {
  url: string;
  storagePath: string;
  size: number;
}

export interface StorageProvider {
  /** Human-readable name */
  readonly name: string;

  /** Upload a file buffer to storage */
  upload(
    buffer: Buffer,
    filename: string,
    folder: string,
    contentType: string
  ): Promise<UploadResult>;

  /** Get a signed or public URL for a stored file */
  getUrl(storagePath: string): Promise<string>;

  /** List files under a prefix/folder */
  list(prefix?: string): Promise<StorageFile[]>;

  /** Check if a file exists */
  exists(storagePath: string): Promise<boolean>;

  /** Delete a file */
  delete(storagePath: string): Promise<boolean>;

  /** Stream a file (for serving to clients) */
  getStream(storagePath: string): NodeJS.ReadableStream | null;

  /** Get file metadata */
  getMetadata(storagePath: string): Promise<StorageFile | null>;
}

// ── Content type detection ─────────────────────────────────────────

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".fbx": "application/octet-stream",
  ".obj": "model/obj",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".json": "application/json",
};

function detectContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  return CONTENT_TYPE_MAP[ext] || "application/octet-stream";
}

// ── LocalFSProvider ────────────────────────────────────────────────

export class LocalFSProvider implements StorageProvider {
  readonly name = "local";
  private baseDir: string;
  private servePrefix: string;

  /**
   * @param baseDir     Absolute path to the local directory (e.g. D:/Games/Models)
   * @param servePrefix URL prefix for serving files (e.g. /api/local-assets)
   */
  constructor(baseDir: string, servePrefix = "/api/local-assets") {
    this.baseDir = baseDir;
    this.servePrefix = servePrefix;
  }

  async upload(
    buffer: Buffer,
    filename: string,
    folder: string,
    contentType: string
  ): Promise<UploadResult> {
    const id = randomUUID().slice(0, 8);
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const relative = path.join(folder, `${id}_${sanitized}`);
    const fullPath = path.join(this.baseDir, relative);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, buffer);

    return {
      url: `${this.servePrefix}/${relative.replace(/\\/g, "/")}`,
      storagePath: relative.replace(/\\/g, "/"),
      size: buffer.length,
    };
  }

  async getUrl(storagePath: string): Promise<string> {
    return `${this.servePrefix}/${storagePath}`;
  }

  async list(prefix?: string): Promise<StorageFile[]> {
    const dir = prefix ? path.join(this.baseDir, prefix) : this.baseDir;
    if (!existsSync(dir)) return [];

    const results: StorageFile[] = [];

    async function walk(currentDir: string, basePath: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relative = path.join(basePath, entry.name).replace(/\\/g, "/");
        if (entry.isDirectory()) {
          await walk(fullPath, relative);
        } else if (entry.isFile()) {
          const stat = statSync(fullPath);
          results.push({
            name: entry.name,
            path: relative,
            size: stat.size,
            contentType: detectContentType(entry.name),
            url: relative,
            updatedAt: stat.mtime.toISOString(),
          });
        }
      }
    }

    await walk(dir, prefix || "");
    return results;
  }

  async exists(storagePath: string): Promise<boolean> {
    return existsSync(path.join(this.baseDir, storagePath));
  }

  async delete(storagePath: string): Promise<boolean> {
    const fullPath = path.join(this.baseDir, storagePath);
    if (!existsSync(fullPath)) return false;
    await fs.unlink(fullPath);
    return true;
  }

  getStream(storagePath: string): NodeJS.ReadableStream | null {
    const fullPath = path.join(this.baseDir, storagePath);
    if (!existsSync(fullPath)) return null;
    return createReadStream(fullPath);
  }

  async getMetadata(storagePath: string): Promise<StorageFile | null> {
    const fullPath = path.join(this.baseDir, storagePath);
    if (!existsSync(fullPath)) return null;

    const stat = statSync(fullPath);
    const filename = path.basename(storagePath);
    return {
      name: filename,
      path: storagePath,
      size: stat.size,
      contentType: detectContentType(filename),
      url: `${this.servePrefix}/${storagePath}`,
      updatedAt: stat.mtime.toISOString(),
    };
  }
}

// ── VercelBlobProvider ─────────────────────────────────────────────

export class VercelBlobProvider implements StorageProvider {
  readonly name = "vercel-blob";

  async upload(
    buffer: Buffer,
    filename: string,
    folder: string,
    contentType: string
  ): Promise<UploadResult> {
    // Dynamic import to avoid requiring @vercel/blob when not on Vercel
    const { put } = await import("@vercel/blob");
    const pathname = `${folder}/${filename}`;

    const blob = await put(pathname, buffer, {
      access: "public",
      contentType,
    });

    return {
      url: blob.url,
      storagePath: blob.pathname,
      size: buffer.length,
    };
  }

  async getUrl(storagePath: string): Promise<string> {
    const { head } = await import("@vercel/blob");
    try {
      const blob = await head(storagePath);
      return blob.url;
    } catch {
      return storagePath; // Return path as-is if lookup fails
    }
  }

  async list(prefix?: string): Promise<StorageFile[]> {
    const { list } = await import("@vercel/blob");
    const result = await list({ prefix: prefix || undefined });

    return result.blobs.map((blob) => ({
      name: blob.pathname.split("/").pop() || blob.pathname,
      path: blob.pathname,
      size: blob.size,
      contentType: detectContentType(blob.pathname),
      url: blob.url,
      updatedAt: blob.uploadedAt.toISOString(),
    }));
  }

  async exists(storagePath: string): Promise<boolean> {
    const { head } = await import("@vercel/blob");
    try {
      await head(storagePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(storagePath: string): Promise<boolean> {
    const { del } = await import("@vercel/blob");
    try {
      await del(storagePath);
      return true;
    } catch {
      return false;
    }
  }

  getStream(_storagePath: string): NodeJS.ReadableStream | null {
    // Vercel Blob uses URLs, not streams — redirect instead
    return null;
  }

  async getMetadata(storagePath: string): Promise<StorageFile | null> {
    const { head } = await import("@vercel/blob");
    try {
      const blob = await head(storagePath);
      return {
        name: blob.pathname.split("/").pop() || blob.pathname,
        path: blob.pathname,
        size: blob.size,
        contentType: detectContentType(blob.pathname),
        url: blob.url,
        updatedAt: blob.uploadedAt.toISOString(),
      };
    } catch {
      return null;
    }
  }
}

// ── Factory ────────────────────────────────────────────────────────

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider;

  const providerType = process.env.STORAGE_PROVIDER || "local";
  const localDir = process.env.LOCAL_ASSET_DIR || "D:/Games/Models";

  switch (providerType) {
    case "vercel":
      _provider = new VercelBlobProvider();
      break;
    case "local":
    default:
      _provider = new LocalFSProvider(localDir);
      break;
  }

  console.log(`[storage] Using ${_provider.name} provider (dir: ${localDir})`);
  return _provider;
}

/** Override the provider (useful for testing) */
export function setStorageProvider(provider: StorageProvider): void {
  _provider = provider;
}
