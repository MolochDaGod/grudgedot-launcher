/**
 * ObjectStore R2 Client — Server-side TypeScript
 *
 * Wraps the Cloudflare Worker API at objectstore.grudge-studio.com.
 * R2 for file storage, D1 for metadata. Public reads, API-key-gated writes.
 *
 * Usage:
 *   import { r2Client, ObjectStoreR2 } from './objectStoreR2';
 *   const assets = await r2Client.listAssets({ category: 'weapon' });
 *
 * Best-practice reference implementation for all Grudge Studio projects.
 */

// ── Types ────────────────────────────────────────────────────────────

export interface R2Asset {
  id: string;
  key: string;
  filename: string;
  mime: string;
  size: number;
  sha256: string | null;
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

export interface R2UploadMeta {
  filename?: string;
  category?: string;
  tags?: string[];
  visibility?: string;
  metadata?: Record<string, unknown>;
}

export interface R2HealthResponse {
  status: string;
  service: string;
}

export class R2ClientError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number = 0, details: unknown = null) {
    super(message);
    this.name = "R2ClientError";
    this.status = status;
    this.details = details;
  }
}

// ── Client ───────────────────────────────────────────────────────────

const DEFAULT_WORKER_URL = "https://objectstore.grudge-studio.com";

export class ObjectStoreR2 {
  private workerUrl: string;
  private apiKey: string | null;

  constructor(opts?: { workerUrl?: string; apiKey?: string | null }) {
    this.workerUrl = (opts?.workerUrl || process.env.OBJECTSTORE_WORKER_URL || DEFAULT_WORKER_URL).replace(/\/$/, "");
    this.apiKey = opts?.apiKey ?? process.env.OBJECTSTORE_API_KEY ?? null;
  }

  // ── Internal ─────────────────────────────────────────────────────

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { ...extra };
    if (this.apiKey) {
      h["X-API-Key"] = this.apiKey;
    }
    return h;
  }

  private async request<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
    const url = `${this.workerUrl}${path}`;
    const res = await fetch(url, {
      ...opts,
      headers: this.headers(opts.headers as Record<string, string> | undefined),
    });

    if (!res.ok) {
      let details: unknown = null;
      try {
        details = await res.json();
      } catch {
        /* ignore parse errors */
      }
      throw new R2ClientError(
        `R2 API error ${res.status}: ${res.statusText}`,
        res.status,
        details,
      );
    }

    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      return (await res.json()) as T;
    }
    return res as unknown as T;
  }

  // ── Public API ───────────────────────────────────────────────────

  /** List / search assets with optional filters */
  async listAssets(query: R2ListQuery = {}): Promise<R2ListResponse> {
    const params = new URLSearchParams();
    if (query.category) params.set("category", query.category);
    if (query.tag) params.set("tag", query.tag);
    if (query.q) params.set("q", query.q);
    if (query.prefix) params.set("prefix", query.prefix);
    if (query.limit) params.set("limit", String(query.limit));
    if (query.offset) params.set("offset", String(query.offset));
    const qs = params.toString();
    return this.request<R2ListResponse>(`/v1/assets${qs ? "?" + qs : ""}`);
  }

  /** Get single asset metadata by ID */
  async getAsset(id: string): Promise<R2Asset> {
    return this.request<R2Asset>(`/v1/assets/${encodeURIComponent(id)}`);
  }

  /** Build a public file URL for an asset */
  getAssetFileUrl(id: string): string {
    return `${this.workerUrl}/v1/assets/${encodeURIComponent(id)}/file`;
  }

  /** Upload a file via multipart/form-data (requires API key) */
  async uploadAsset(fileBuffer: Buffer | Uint8Array, meta: R2UploadMeta & { contentType?: string }): Promise<R2UploadResult> {
    // Build multipart form body manually for Node.js fetch
    const boundary = `----ObjectStore${Date.now()}`;
    const parts: string[] = [];

    // File part
    const filename = meta.filename || "upload";
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${meta.contentType || "application/octet-stream"}\r\n\r\n`);

    // Metadata fields
    const fields: Record<string, string> = {};
    if (meta.filename) fields.filename = meta.filename;
    if (meta.category) fields.category = meta.category;
    if (meta.tags) fields.tags = JSON.stringify(meta.tags);
    if (meta.visibility) fields.visibility = meta.visibility;
    if (meta.metadata) fields.metadata = JSON.stringify(meta.metadata);

    const fieldParts: string[] = [];
    for (const [key, value] of Object.entries(fields)) {
      fieldParts.push(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}`);
    }

    const ending = `\r\n--${boundary}--\r\n`;

    // Assemble as Uint8Array
    const encoder = new TextEncoder();
    const filePreamble = encoder.encode(parts[0]);
    const fileBytes = fileBuffer instanceof Uint8Array ? fileBuffer : new Uint8Array(fileBuffer);
    const fieldBytes = encoder.encode("\r\n" + fieldParts.join("\r\n"));
    const endBytes = encoder.encode(ending);

    const body = new Uint8Array(filePreamble.length + fileBytes.length + fieldBytes.length + endBytes.length);
    body.set(filePreamble, 0);
    body.set(fileBytes, filePreamble.length);
    body.set(fieldBytes, filePreamble.length + fileBytes.length);
    body.set(endBytes, filePreamble.length + fileBytes.length + fieldBytes.length);

    return this.request<R2UploadResult>("/v1/assets", {
      method: "POST",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body,
    });
  }

  /** Delete an asset by ID (requires API key) */
  async deleteAsset(id: string): Promise<{ deleted: boolean; id: string }> {
    return this.request<{ deleted: boolean; id: string }>(
      `/v1/assets/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  }

  /** Health check */
  async healthCheck(): Promise<R2HealthResponse> {
    return this.request<R2HealthResponse>("/health");
  }

  /** Get the configured worker URL (useful for clients) */
  getWorkerUrl(): string {
    return this.workerUrl;
  }

  /** Check if an API key is configured (for write operations) */
  hasApiKey(): boolean {
    return !!this.apiKey;
  }
}

// ── Singleton ────────────────────────────────────────────────────────

/** Pre-configured singleton using env vars */
export const r2Client = new ObjectStoreR2();
