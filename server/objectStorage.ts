// Referenced from javascript_object_storage integration blueprint
import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as nodePath from "path";
import {
  ObjectAclPolicy,
  ObjectPermission,
  canAccessObject,
  getObjectAclPolicy,
  setObjectAclPolicy,
} from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const IS_REPLIT = !!process.env.REPL_ID || !!process.env.REPLIT_DEPLOYMENT;

// Only create the GCS client when running on Replit (sidecar available).
// On Vercel the object-storage routes are unused — they'll return 503 gracefully.
export const objectStorageClient: Storage | null = IS_REPLIT
  ? new Storage({
      credentials: {
        audience: "replit",
        subject_token_type: "access_token",
        token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
        type: "external_account",
        credential_source: {
          url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
          format: {
            type: "json",
            subject_token_field_name: "access_token",
          },
        },
        universe_domain: "googleapis.com",
      },
      projectId: "",
    })
  : null;

/** Throws if called outside Replit (sidecar unavailable). */
function requireClient(): Storage {
  if (!objectStorageClient) {
    throw new Error("Object storage unavailable (Replit sidecar not running)");
  }
  return objectStorageClient;
}

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
        "PUBLIC_OBJECT_SEARCH_PATHS not set. Create a bucket in 'Object Storage' " +
          "tool and set PUBLIC_OBJECT_SEARCH_PATHS env var (comma-separated paths)."
      );
    }
    return paths;
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  async searchPublicObject(filePath: string): Promise<File | null> {
    for (const searchPath of this.getPublicObjectSearchPaths()) {
      const fullPath = `${searchPath}/${filePath}`;
      const { bucketName, objectName } = parseObjectPath(fullPath);
      const bucket = objectStorageClient.bucket(bucketName);
      const file = bucket.file(objectName);

      const [exists] = await file.exists();
      if (exists) {
        return file;
      }
    }

    return null;
  }

  async downloadObject(file: File, res: Response, cacheTtlSec: number = 3600) {
    try {
      const [metadata] = await file.getMetadata();
      const aclPolicy = await getObjectAclPolicy(file);
      const isPublic = aclPolicy?.visibility === "public";

      res.set({
        "Content-Type": metadata.contentType || "application/octet-stream",
        "Content-Length": metadata.size,
        "Cache-Control": `${
          isPublic ? "public" : "private"
        }, max-age=${cacheTtlSec}`,
      });

      const stream = file.createReadStream();

      stream.on("error", (err: Error) => {
        console.error("Stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file" });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error("Error downloading file:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error downloading file" });
      }
    }
  }

  async listFiles(prefix: string): Promise<Array<{ name: string; size?: number; updated?: string }>> {
    const publicSearchPaths = this.getPublicObjectSearchPaths();
    if (publicSearchPaths.length === 0) {
      return [];
    }
    
    const basePath = publicSearchPaths[0];
    const { bucketName } = parseObjectPath(basePath);
    const bucket = objectStorageClient.bucket(bucketName);
    
    const [files] = await bucket.getFiles({ prefix });
    
    return files.map(file => ({
      name: file.name,
      size: file.metadata?.size ? parseInt(String(file.metadata.size), 10) : undefined,
      updated: file.metadata?.updated as string | undefined,
    }));
  }

  async getObjectEntityUploadURL(): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    if (!privateObjectDir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }

    const objectId = randomUUID();
    const fullPath = `${privateObjectDir}/uploads/${objectId}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    return signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
    });
  }

  // Get upload URL for public asset files (images, models, shaders)
  async getAssetUploadURL(fileName: string, contentType: string): Promise<{uploadURL: string, publicPath: string}> {
    const publicSearchPaths = this.getPublicObjectSearchPaths();
    if (publicSearchPaths.length === 0) {
      throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set");
    }

    // Use first public search path for uploads
    const basePath = publicSearchPaths[0];
    const fileId = randomUUID();
    const extension = fileName.split('.').pop() || '';
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const publicPath = `assets/${fileId}_${sanitizedName}`;
    const fullPath = `${basePath}/${publicPath}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
      contentType,
    });

    return { uploadURL, publicPath };
  }

  async getObjectEntityFile(objectPath: string): Promise<File> {
    if (!objectPath.startsWith("/objects/")) {
      throw new ObjectNotFoundError();
    }

    const parts = objectPath.slice(1).split("/");
    if (parts.length < 2) {
      throw new ObjectNotFoundError();
    }

    const entityId = parts.slice(1).join("/");
    let entityDir = this.getPrivateObjectDir();
    if (!entityDir.endsWith("/")) {
      entityDir = `${entityDir}/`;
    }
    const objectEntityPath = `${entityDir}${entityId}`;
    const { bucketName, objectName } = parseObjectPath(objectEntityPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const objectFile = bucket.file(objectName);
    const [exists] = await objectFile.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }
    return objectFile;
  }

  normalizeObjectEntityPath(rawPath: string): string {
    if (!rawPath.startsWith("https://storage.googleapis.com/")) {
      return rawPath;
    }

    const url = new URL(rawPath);
    const rawObjectPath = url.pathname;

    let objectEntityDir = this.getPrivateObjectDir();
    if (!objectEntityDir.endsWith("/")) {
      objectEntityDir = `${objectEntityDir}/`;
    }

    if (!rawObjectPath.startsWith(objectEntityDir)) {
      return rawObjectPath;
    }

    const entityId = rawObjectPath.slice(objectEntityDir.length);
    return `/objects/${entityId}`;
  }

  async trySetObjectEntityAclPolicy(
    rawPath: string,
    aclPolicy: ObjectAclPolicy
  ): Promise<string> {
    const normalizedPath = this.normalizeObjectEntityPath(rawPath);
    if (!normalizedPath.startsWith("/")) {
      return normalizedPath;
    }

    const objectFile = await this.getObjectEntityFile(normalizedPath);
    await setObjectAclPolicy(objectFile, aclPolicy);
    return normalizedPath;
  }

  async canAccessObjectEntity({
    userId,
    objectFile,
    requestedPermission,
  }: {
    userId?: string;
    objectFile: File;
    requestedPermission?: ObjectPermission;
  }): Promise<boolean> {
    return canAccessObject({
      userId,
      objectFile,
      requestedPermission: requestedPermission ?? ObjectPermission.READ,
    });
  }

  async getOrganizedAssetUploadURL(
    fileName: string, 
    contentType: string, 
    folder: string
  ): Promise<{uploadURL: string, publicPath: string, fullStoragePath: string}> {
    const publicSearchPaths = this.getPublicObjectSearchPaths();
    if (publicSearchPaths.length === 0) {
      throw new Error("PUBLIC_OBJECT_SEARCH_PATHS not set");
    }

    const basePath = publicSearchPaths[0];
    const fileId = randomUUID().slice(0, 8);
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/-]/g, '_');
    const publicPath = `game-assets/${sanitizedFolder}/${fileId}_${sanitizedName}`;
    const fullPath = `${basePath}/${publicPath}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);

    const uploadURL = await signObjectURL({
      bucketName,
      objectName,
      method: "PUT",
      ttlSec: 900,
      contentType,
    });

    return { uploadURL, publicPath, fullStoragePath: fullPath };
  }

  async uploadFileToStorage(
    localPath: string,
    folder: string,
    fileName: string
  ): Promise<{publicPath: string, fullStoragePath: string}> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fileBuffer = await fs.readFile(localPath);
    const ext = path.extname(fileName).toLowerCase();
    
    const contentTypeMap: Record<string, string> = {
      '.glb': 'model/gltf-binary',
      '.gltf': 'model/gltf+json',
      '.fbx': 'application/octet-stream',
      '.obj': 'model/obj',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.tga': 'image/x-tga',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    
    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    
    const { uploadURL, publicPath, fullStoragePath } = await this.getOrganizedAssetUploadURL(
      fileName,
      contentType,
      folder
    );
    
    const uploadResponse = await fetch(uploadURL, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: fileBuffer,
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Failed to upload ${fileName}: ${uploadResponse.status}`);
    }
    
    return { publicPath, fullStoragePath };
  }

  async listStorageAssets(folder?: string): Promise<Array<{name: string, path: string}>> {
    const publicSearchPaths = this.getPublicObjectSearchPaths();
    if (publicSearchPaths.length === 0) {
      return [];
    }

    const basePath = publicSearchPaths[0];
    const prefix = folder ? `game-assets/${folder}/` : 'game-assets/';
    const { bucketName, objectName } = parseObjectPath(`${basePath}/${prefix}`);
    
    const bucket = objectStorageClient.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: objectName });
    
    return files.map(file => ({
      name: file.name.split('/').pop() || file.name,
      path: `/${bucketName}/${file.name}`,
    }));
  }

  async listAllPublicAssets(prefix?: string): Promise<Array<{name: string, path: string, fullPath: string}>> {
    // Fallback to static manifest when GCS is unavailable (Vercel)
    if (!objectStorageClient) {
      const assets = this.getStaticManifest();
      let filtered = assets;
      if (prefix) {
        filtered = assets.filter(a => a.storagePath?.includes(prefix));
      }
      return filtered.map(a => ({
        name: a.filename,
        path: a.storagePath || a.url,
        fullPath: a.url,
      }));
    }

    const publicSearchPaths = this.getPublicObjectSearchPaths();
    if (publicSearchPaths.length === 0) {
      return [];
    }

    const basePath = publicSearchPaths[0];
    const { bucketName, objectName } = parseObjectPath(basePath);
    const searchPrefix = prefix ? `${objectName}/${prefix}` : objectName;
    
    const bucket = objectStorageClient.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: searchPrefix });
    
    return files.map(file => ({
      name: file.name.split('/').pop() || file.name,
      path: file.name.replace(objectName + '/', ''),
      fullPath: `/${bucketName}/${file.name}`,
    }));
  }

  getPublicAssetURL(publicPath: string): string {
    return `/api/assets/public/${publicPath}`;
  }

  // Read static asset manifest bundled in public/ (used as fallback when GCS unavailable)
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

  // Enhanced asset registry with UUIDs and full metadata
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
    // Fallback to static manifest when GCS is unavailable (Vercel)
    if (!objectStorageClient) {
      return this.getStaticManifest(filter);
    }

    const publicSearchPaths = this.getPublicObjectSearchPaths();
    if (publicSearchPaths.length === 0) {
      return this.getStaticManifest(filter);
    }

    const basePath = publicSearchPaths[0];
    const { bucketName, objectName } = parseObjectPath(basePath);
    
    const bucket = objectStorageClient.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: objectName });
    
    const assets = await Promise.all(files.map(async (file) => {
      const filename = file.name.split('/').pop() || file.name;
      const relativePath = file.name.replace(objectName + '/', '');
      const pathParts = relativePath.split('/');
      const folder = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';
      
      // Determine file type from extension
      const ext = filename.split('.').pop()?.toLowerCase() || '';
      const typeMap: Record<string, string> = {
        'glb': 'model', 'gltf': 'model', 'fbx': 'model', 'obj': 'model',
        'png': 'image', 'jpg': 'image', 'jpeg': 'image', 'webp': 'image', 'gif': 'image',
        'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio',
        'json': 'data', 'xml': 'data',
      };
      const type = typeMap[ext] || 'other';
      
      // Generate a consistent UUID from the file path
      const crypto = await import('crypto');
      const uuid = crypto.createHash('md5').update(file.name).digest('hex');
      const shortId = uuid.substring(0, 8);
      
      // Get metadata if available
      let metadata: any = {};
      try {
        [metadata] = await file.getMetadata();
      } catch (e) {
        // Ignore metadata errors
      }
      
      return {
        id: shortId,
        uuid: uuid,
        filename: filename,
        type: type,
        folder: folder,
        url: `/public-objects/${relativePath}`,
        directUrl: `/api/asset-registry/${shortId}`,
        storagePath: `/${bucketName}/${file.name}`,
        size: metadata.size ? parseInt(metadata.size) : undefined,
        contentType: metadata.contentType,
        createdAt: metadata.timeCreated,
      };
    }));
    
    // Apply filters
    let filtered = assets;
    if (filter?.type) {
      filtered = filtered.filter(a => a.type === filter.type);
    }
    if (filter?.folder) {
      filtered = filtered.filter(a => a.folder.includes(filter.folder!));
    }
    
    return filtered;
  }

  // Find asset URL from static manifest by ID (used on Vercel for redirect)
  getStaticAssetUrl(id: string): string | null {
    const assets = this.getStaticManifest();
    const asset = assets.find(a => a.id === id || a.uuid === id);
    return asset?.url || null;
  }

  async getAssetById(id: string): Promise<{
    file: File;
    metadata: any;
  } | null> {
    if (!objectStorageClient) {
      return null;
    }

    const publicSearchPaths = this.getPublicObjectSearchPaths();
    if (publicSearchPaths.length === 0) {
      return null;
    }

    const basePath = publicSearchPaths[0];
    const { bucketName, objectName } = parseObjectPath(basePath);
    
    const bucket = objectStorageClient.bucket(bucketName);
    const [files] = await bucket.getFiles({ prefix: objectName });
    
    const crypto = await import('crypto');
    
    for (const file of files) {
      const uuid = crypto.createHash('md5').update(file.name).digest('hex');
      const shortId = uuid.substring(0, 8);
      
      if (shortId === id || uuid === id) {
        const [metadata] = await file.getMetadata();
        return { file, metadata };
      }
    }
    
    return null;
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
}

async function signObjectURL({
  bucketName,
  objectName,
  method,
  ttlSec,
  contentType,
}: {
  bucketName: string;
  objectName: string;
  method: "GET" | "PUT" | "DELETE" | "HEAD";
  ttlSec: number;
  contentType?: string;
}): Promise<string> {
  const request: any = {
    bucket_name: bucketName,
    object_name: objectName,
    method,
    expires_at: new Date(Date.now() + ttlSec * 1000).toISOString(),
  };

  if (contentType) {
    request.content_type = contentType;
  }

  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    }
  );
  if (!response.ok) {
    throw new Error(
      `Failed to sign object URL, errorcode: ${response.status}, ` +
        `make sure you're running on Replit`
    );
  }

  const { signed_url: signedURL } = await response.json();
  return signedURL;
}
