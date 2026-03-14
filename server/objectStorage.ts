/**
 * Object Storage Service — Grudge Backend Asset Proxy
 *
 * Replaces the Replit GCS sidecar with calls to the Grudge backend
 * asset-service at assets-api.grudge-studio.com.
 *
 * On Vercel (production), asset routes proxy to the backend.
 * Static manifest (public/asset-manifest.json) provides offline fallback.
 */

import { Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as nodePath from "path";

const ASSETS_API = process.env.ASSETS_API_URL || process.env.VITE_ASSETS_URL || "https://assets-api.grudge-studio.com";
const OBJECTSTORE_BASE = process.env.VITE_OBJECTSTORE_URL || "https://molochdagod.github.io/ObjectStore";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/**
 * Indicates whether the backend asset-service is available.
 * Always true on the server side — routes gracefully handle 502/503.
 */
export const objectStorageClient: object | null = { provider: "grudge-backend" };

export class ObjectStorageService {
  private token?: string;

  constructor(token?: string) {
    this.token = token;
  }

  // ── Internal fetch helper ────────────────────────────────────
  private async backendFetch(path: string, init?: RequestInit): Promise<globalThis.Response> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> || {}),
    };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;

    return fetch(`${ASSETS_API}${path}`, { ...init, headers });
  }

  // ── Public object search (used by /public-objects/:path) ─────
  async searchPublicObject(filePath: string): Promise<{ name: string; streamUrl: string } | null> {
    // First try the backend asset-service
    try {
      const res = await this.backendFetch(`/assets/public/${filePath}`, { method: "HEAD" });
      if (res.ok) {
        return { name: filePath, streamUrl: `${ASSETS_API}/assets/public/${filePath}` };
      }
    } catch {
      // Backend unreachable — fall through to ObjectStore CDN
    }

    // Fallback: try ObjectStore GitHub Pages CDN
    try {
      const cdnUrl = `${OBJECTSTORE_BASE}/${filePath}`;
      const res = await fetch(cdnUrl, { method: "HEAD" });
      if (res.ok) {
        return { name: filePath, streamUrl: cdnUrl };
      }
    } catch {
      // CDN also unreachable
    }

    return null;
  }

  // ── Download / stream a file to the Express response ─────────
  async downloadObject(file: { name: string; streamUrl: string }, res: Response, cacheTtlSec: number = 3600) {
    try {
      const upstream = await fetch(file.streamUrl);
      if (!upstream.ok) {
        if (!res.headersSent) res.status(upstream.status).json({ error: "Upstream fetch failed" });
        return;
      }

      const contentType = upstream.headers.get("content-type") || "application/octet-stream";
      const contentLength = upstream.headers.get("content-length");

      res.set({
        "Content-Type": contentType,
        ...(contentLength && { "Content-Length": contentLength }),
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
      });

      // Pipe the upstream body to the response
      if (upstream.body) {
        const reader = upstream.body.getReader();
        const pump = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) { res.end(); break; }
            res.write(value);
          }
        };
        pump().catch((err) => {
          console.error("Stream error:", err);
          if (!res.headersSent) res.status(500).json({ error: "Error streaming file" });
        });
      } else {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.send(buffer);
      }
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) res.status(500).json({ error: "Error downloading file" });
    }
  }

  // ── List files from backend ──────────────────────────────────
  async listFiles(prefix: string): Promise<Array<{ name: string; size?: number; updated?: string }>> {
    try {
      const res = await this.backendFetch(`/assets/list?prefix=${encodeURIComponent(prefix)}`);
      if (res.ok) return res.json();
    } catch { /* fallback below */ }
    return [];
  }

  // ── Upload URL generation (proxied to backend) ───────────────
  async getObjectEntityUploadURL(): Promise<string> {
    const res = await this.backendFetch("/assets/upload-url", {
      method: "POST",
      body: JSON.stringify({ type: "private", id: randomUUID() }),
    });
    if (!res.ok) throw new Error(`Upload URL generation failed: ${res.status}`);
    const data = await res.json();
    return data.uploadURL || data.url;
  }

  async getAssetUploadURL(fileName: string, contentType: string): Promise<{ uploadURL: string; publicPath: string }> {
    const res = await this.backendFetch("/assets/upload-url", {
      method: "POST",
      body: JSON.stringify({ fileName, contentType }),
    });
    if (!res.ok) throw new Error(`Asset upload URL generation failed: ${res.status}`);
    return res.json();
  }

  async getOrganizedAssetUploadURL(
    fileName: string,
    contentType: string,
    folder: string
  ): Promise<{ uploadURL: string; publicPath: string; fullStoragePath: string }> {
    const res = await this.backendFetch("/assets/upload-url", {
      method: "POST",
      body: JSON.stringify({ fileName, contentType, folder }),
    });
    if (!res.ok) throw new Error(`Organized upload URL generation failed: ${res.status}`);
    return res.json();
  }

  // ── Upload from local file (proxied to backend) ──────────────
  async uploadFileToStorage(
    localPath: string,
    folder: string,
    fileName: string
  ): Promise<{ publicPath: string; fullStoragePath: string }> {
    const fsP = await import("fs/promises");
    const path = await import("path");

    const fileBuffer = await fsP.readFile(localPath);
    const ext = path.extname(fileName).toLowerCase();

    const contentTypeMap: Record<string, string> = {
      ".glb": "model/gltf-binary",
      ".gltf": "model/gltf+json",
      ".fbx": "application/octet-stream",
      ".obj": "model/obj",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".tga": "image/x-tga",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };
    const contentType = contentTypeMap[ext] || "application/octet-stream";

    const { uploadURL, publicPath, fullStoragePath } = await this.getOrganizedAssetUploadURL(
      fileName,
      contentType,
      folder
    );

    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload ${fileName}: ${uploadResponse.status}`);
    }

    return { publicPath, fullStoragePath };
  }

  // ── List storage assets ──────────────────────────────────────
  async listStorageAssets(folder?: string): Promise<Array<{ name: string; path: string }>> {
    try {
      const qs = folder ? `?folder=${encodeURIComponent(folder)}` : "";
      const res = await this.backendFetch(`/assets/storage-list${qs}`);
      if (res.ok) return res.json();
    } catch { /* fallback */ }
    return [];
  }

  async listAllPublicAssets(prefix?: string): Promise<Array<{ name: string; path: string; fullPath: string }>> {
    // Try backend first
    try {
      const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
      const res = await this.backendFetch(`/assets/public-list${qs}`);
      if (res.ok) return res.json();
    } catch { /* fallback to static manifest */ }

    // Fallback to static manifest
    const assets = this.getStaticManifest();
    let filtered = assets;
    if (prefix) {
      filtered = assets.filter((a) => a.storagePath?.includes(prefix));
    }
    return filtered.map((a) => ({
      name: a.filename,
      path: a.storagePath || a.url,
      fullPath: a.url,
    }));
  }

  getPublicAssetURL(publicPath: string): string {
    return `/api/assets/public/${publicPath}`;
  }

  // ── Static manifest fallback (bundled in public/) ────────────
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
      if (filter?.type) assets = assets.filter((a: any) => a.type === filter.type);
      if (filter?.folder) assets = assets.filter((a: any) => a.folder?.includes(filter.folder!));
      return assets;
    } catch {
      return [];
    }
  }

  // ── Asset registry (with UUIDs and metadata) ─────────────────
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
    // Try backend first
    try {
      const params = new URLSearchParams();
      if (filter?.type) params.set("type", filter.type);
      if (filter?.folder) params.set("folder", filter.folder);
      const qs = params.toString() ? `?${params}` : "";
      const res = await this.backendFetch(`/assets/registry${qs}`);
      if (res.ok) {
        const data = await res.json();
        return data.assets || data;
      }
    } catch { /* fallback to static manifest */ }

    return this.getStaticManifest(filter);
  }

  // ── Find static asset URL by ID ──────────────────────────────
  getStaticAssetUrl(id: string): string | null {
    const assets = this.getStaticManifest();
    const asset = assets.find((a) => a.id === id || a.uuid === id);
    return asset?.url || null;
  }

  // ── Get asset by ID (from backend) ───────────────────────────
  async getAssetById(id: string): Promise<{ streamUrl: string; metadata: any } | null> {
    try {
      const res = await this.backendFetch(`/assets/${id}/info`);
      if (res.ok) {
        const metadata = await res.json();
        return {
          streamUrl: `${ASSETS_API}/assets/${id}`,
          metadata,
        };
      }
    } catch { /* not found */ }
    return null;
  }
}
