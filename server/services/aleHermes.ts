/**
 * ALE_HERMES - AI Storage Agent
 * 
 * An intelligent storage orchestration service that manages Grudge users' 
 * object storage and app storage. Named after Hermes, the messenger of gods,
 * this agent handles all file operations with speed and precision.
 * 
 * Features:
 * - User-isolated storage (users/{userId}/{namespace}/{resource})
 * - Namespace support: projects, assets, backups, runtime, app-storage
 * - Metadata tracking and audit logging
 * - Quota management and enforcement
 * - Integration with existing asset pipeline
 */

// Object storage client — @replit/object-storage removed; use S3/R2 via StorageProvider instead.
// ALE_HERMES currently operates in DB-metadata-only mode when no storage backend is configured.
let ReplitClient: any = null;
import { db } from "../db";
import { 
  userObjects, 
  storageAuditLogs, 
  userStorageQuotas,
  type InsertUserObject,
  type InsertStorageAuditLog,
  type UserObject,
  type UserStorageQuota
} from "../../shared/schema";
import { eq, and, like, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { Readable } from "stream";

export type StorageNamespace = "projects" | "assets" | "backups" | "runtime" | "app-storage";

export interface UploadOptions {
  namespace?: StorageNamespace;
  contentType?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  isPublic?: boolean;
}

export interface ListOptions {
  namespace?: StorageNamespace;
  prefix?: string;
  limit?: number;
  offset?: number;
}

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

export class AleHermesService {
  private client: any;
  private agentName = "ALE_HERMES";

  constructor() {
    if (!ReplitClient) {
      console.warn(`[${this.agentName}] No storage backend configured — storage ops will no-op`);
      this.client = null;
    } else {
      this.client = new ReplitClient();
    }
  }

  private buildObjectKey(userId: string, namespace: StorageNamespace, filename: string): string {
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    return `users/${userId}/${namespace}/${sanitizedFilename}`;
  }

  private extractFilenameFromKey(objectKey: string): string {
    const parts = objectKey.split("/");
    return parts[parts.length - 1] || objectKey;
  }

  private calculateChecksum(data: Buffer | string): string {
    const content = typeof data === "string" ? Buffer.from(data) : data;
    return createHash("md5").update(content).digest("hex");
  }

  private async logAudit(
    userId: string,
    operation: string,
    objectKey: string | null,
    success: boolean,
    context: AuditContext,
    errorMessage?: string,
    fileSize?: number,
    targetKey?: string
  ): Promise<void> {
    try {
      const log: InsertStorageAuditLog = {
        userId,
        operation,
        objectKey,
        targetKey,
        fileSize,
        success,
        errorMessage,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      };
      await db.insert(storageAuditLogs).values(log);
    } catch (err) {
      console.error(`[${this.agentName}] Failed to write audit log:`, err);
    }
  }

  private async updateQuota(userId: string, deltaBytes: number, deltaCount: number): Promise<void> {
    const existing = await db.select().from(userStorageQuotas).where(eq(userStorageQuotas.userId, userId)).limit(1);
    
    if (existing.length === 0) {
      await db.insert(userStorageQuotas).values({
        userId,
        usedStorageBytes: Math.max(0, deltaBytes),
        objectCount: Math.max(0, deltaCount),
      });
    } else {
      await db.update(userStorageQuotas)
        .set({
          usedStorageBytes: sql`GREATEST(0, ${userStorageQuotas.usedStorageBytes} + ${deltaBytes})`,
          objectCount: sql`GREATEST(0, ${userStorageQuotas.objectCount} + ${deltaCount})`,
          updatedAt: new Date(),
        })
        .where(eq(userStorageQuotas.userId, userId));
    }
  }

  async getQuota(userId: string): Promise<UserStorageQuota | null> {
    const result = await db.select().from(userStorageQuotas).where(eq(userStorageQuotas.userId, userId)).limit(1);
    if (result.length === 0) {
      await db.insert(userStorageQuotas).values({ userId });
      const newResult = await db.select().from(userStorageQuotas).where(eq(userStorageQuotas.userId, userId)).limit(1);
      return newResult[0] || null;
    }
    return result[0];
  }

  async checkQuota(userId: string, additionalBytes: number): Promise<{ allowed: boolean; reason?: string }> {
    const quota = await this.getQuota(userId);
    if (!quota) return { allowed: true };
    
    if (quota.usedStorageBytes + additionalBytes > quota.maxStorageBytes) {
      return {
        allowed: false,
        reason: `Storage quota exceeded. Used: ${quota.usedStorageBytes}, Max: ${quota.maxStorageBytes}, Requested: ${additionalBytes}`
      };
    }
    return { allowed: true };
  }

  async uploadFromText(
    userId: string,
    filename: string,
    content: string,
    options: UploadOptions = {},
    context: AuditContext = {}
  ): Promise<{ ok: boolean; objectKey?: string; error?: string }> {
    const namespace = options.namespace || "assets";
    const objectKey = this.buildObjectKey(userId, namespace, filename);
    const fileSize = Buffer.byteLength(content, "utf8");

    const quotaCheck = await this.checkQuota(userId, fileSize);
    if (!quotaCheck.allowed) {
      await this.logAudit(userId, "upload", objectKey, false, context, quotaCheck.reason, fileSize);
      return { ok: false, error: quotaCheck.reason };
    }

    try {
      const result = await this.client.uploadFromText(objectKey, content);
      
      if (!result.ok) {
        await this.logAudit(userId, "upload", objectKey, false, context, result.error?.message, fileSize);
        return { ok: false, error: result.error?.message };
      }

      const checksum = this.calculateChecksum(content);
      const objectRecord: InsertUserObject = {
        userId,
        objectKey,
        namespace,
        filename,
        contentType: options.contentType || "text/plain",
        fileSize,
        checksum,
        tags: options.tags || [],
        metadata: options.metadata || {},
        isPublic: options.isPublic || false,
      };

      await db.insert(userObjects).values(objectRecord).onConflictDoUpdate({
        target: userObjects.objectKey,
        set: { ...objectRecord, updatedAt: new Date() }
      });

      await this.updateQuota(userId, fileSize, 1);
      await this.logAudit(userId, "upload", objectKey, true, context, undefined, fileSize);

      return { ok: true, objectKey };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "upload", objectKey, false, context, errorMsg, fileSize);
      return { ok: false, error: errorMsg };
    }
  }

  async uploadFromBytes(
    userId: string,
    filename: string,
    content: Buffer,
    options: UploadOptions = {},
    context: AuditContext = {}
  ): Promise<{ ok: boolean; objectKey?: string; error?: string }> {
    const namespace = options.namespace || "assets";
    const objectKey = this.buildObjectKey(userId, namespace, filename);
    const fileSize = content.length;

    const quotaCheck = await this.checkQuota(userId, fileSize);
    if (!quotaCheck.allowed) {
      await this.logAudit(userId, "upload", objectKey, false, context, quotaCheck.reason, fileSize);
      return { ok: false, error: quotaCheck.reason };
    }

    try {
      const result = await this.client.uploadFromBytes(objectKey, content);
      
      if (!result.ok) {
        await this.logAudit(userId, "upload", objectKey, false, context, result.error?.message, fileSize);
        return { ok: false, error: result.error?.message };
      }

      const checksum = this.calculateChecksum(content);
      const objectRecord: InsertUserObject = {
        userId,
        objectKey,
        namespace,
        filename,
        contentType: options.contentType || "application/octet-stream",
        fileSize,
        checksum,
        tags: options.tags || [],
        metadata: options.metadata || {},
        isPublic: options.isPublic || false,
      };

      await db.insert(userObjects).values(objectRecord).onConflictDoUpdate({
        target: userObjects.objectKey,
        set: { ...objectRecord, updatedAt: new Date() }
      });

      await this.updateQuota(userId, fileSize, 1);
      await this.logAudit(userId, "upload", objectKey, true, context, undefined, fileSize);

      return { ok: true, objectKey };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "upload", objectKey, false, context, errorMsg, fileSize);
      return { ok: false, error: errorMsg };
    }
  }

  async uploadFromStream(
    userId: string,
    filename: string,
    stream: Readable,
    options: UploadOptions = {},
    context: AuditContext = {}
  ): Promise<{ ok: boolean; objectKey?: string; error?: string }> {
    const namespace = options.namespace || "assets";
    const objectKey = this.buildObjectKey(userId, namespace, filename);

    try {
      await this.client.uploadFromStream(objectKey, stream);

      const objectRecord: InsertUserObject = {
        userId,
        objectKey,
        namespace,
        filename,
        contentType: options.contentType || "application/octet-stream",
        fileSize: 0,
        tags: options.tags || [],
        metadata: options.metadata || {},
        isPublic: options.isPublic || false,
      };

      await db.insert(userObjects).values(objectRecord).onConflictDoUpdate({
        target: userObjects.objectKey,
        set: { ...objectRecord, updatedAt: new Date() }
      });

      await this.updateQuota(userId, 0, 1);
      await this.logAudit(userId, "upload", objectKey, true, context);

      return { ok: true, objectKey };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "upload", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async downloadAsText(
    userId: string,
    objectKey: string,
    context: AuditContext = {}
  ): Promise<{ ok: boolean; value?: string; error?: string }> {
    const record = await db.select().from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "download", objectKey, false, context, "Object not found");
      return { ok: false, error: "Object not found or access denied" };
    }

    try {
      const result = await this.client.downloadAsText(objectKey);
      
      if (!result.ok) {
        await this.logAudit(userId, "download", objectKey, false, context, result.error?.message);
        return { ok: false, error: result.error?.message };
      }

      await db.update(userObjects)
        .set({ lastAccessedAt: new Date() })
        .where(eq(userObjects.objectKey, objectKey));

      await this.logAudit(userId, "download", objectKey, true, context);
      return { ok: true, value: result.value };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "download", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async downloadAsBytes(
    userId: string,
    objectKey: string,
    context: AuditContext = {}
  ): Promise<{ ok: boolean; value?: Buffer; error?: string }> {
    const record = await db.select().from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "download", objectKey, false, context, "Object not found");
      return { ok: false, error: "Object not found or access denied" };
    }

    try {
      const result = await this.client.downloadAsBytes(objectKey);
      
      if (!result.ok) {
        await this.logAudit(userId, "download", objectKey, false, context, result.error?.message);
        return { ok: false, error: result.error?.message };
      }

      await db.update(userObjects)
        .set({ lastAccessedAt: new Date() })
        .where(eq(userObjects.objectKey, objectKey));

      await this.logAudit(userId, "download", objectKey, true, context);
      return { ok: true, value: Array.isArray(result.value) ? result.value[0] : result.value };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "download", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async downloadAsStream(
    userId: string,
    objectKey: string,
    context: AuditContext = {}
  ): Promise<{ ok: boolean; value?: Readable; error?: string }> {
    const record = await db.select().from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "download", objectKey, false, context, "Object not found");
      return { ok: false, error: "Object not found or access denied" };
    }

    try {
      const stream = this.client.downloadAsStream(objectKey);
      
      await db.update(userObjects)
        .set({ lastAccessedAt: new Date() })
        .where(eq(userObjects.objectKey, objectKey));

      await this.logAudit(userId, "download", objectKey, true, context);
      return { ok: true, value: stream };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "download", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async listObjects(
    userId: string,
    options: ListOptions = {},
    context: AuditContext = {}
  ): Promise<{ ok: boolean; objects?: UserObject[]; error?: string }> {
    try {
      let query = db.select().from(userObjects).where(eq(userObjects.userId, userId));

      if (options.namespace) {
        query = db.select().from(userObjects)
          .where(and(
            eq(userObjects.userId, userId),
            eq(userObjects.namespace, options.namespace)
          ));
      }

      if (options.prefix) {
        query = db.select().from(userObjects)
          .where(and(
            eq(userObjects.userId, userId),
            like(userObjects.objectKey, `%${options.prefix}%`)
          ));
      }

      const objects = await query
        .orderBy(desc(userObjects.createdAt))
        .limit(options.limit || 100)
        .offset(options.offset || 0);

      await this.logAudit(userId, "list", null, true, context);
      return { ok: true, objects };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "list", null, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async deleteObject(
    userId: string,
    objectKey: string,
    context: AuditContext = {}
  ): Promise<{ ok: boolean; error?: string }> {
    const record = await db.select().from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "delete", objectKey, false, context, "Object not found");
      return { ok: false, error: "Object not found or access denied" };
    }

    const fileSize = record[0].fileSize;

    try {
      const result = await this.client.delete(objectKey);
      
      if (!result.ok) {
        await this.logAudit(userId, "delete", objectKey, false, context, result.error?.message);
        return { ok: false, error: result.error?.message };
      }

      await db.delete(userObjects).where(eq(userObjects.objectKey, objectKey));
      await this.updateQuota(userId, -fileSize, -1);
      await this.logAudit(userId, "delete", objectKey, true, context, undefined, fileSize);

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "delete", objectKey, false, context, errorMsg);
      return { ok: false, error: errorMsg };
    }
  }

  async copyObject(
    userId: string,
    sourceKey: string,
    destFilename: string,
    destNamespace: StorageNamespace = "assets",
    context: AuditContext = {}
  ): Promise<{ ok: boolean; newObjectKey?: string; error?: string }> {
    const record = await db.select().from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, sourceKey)))
      .limit(1);

    if (record.length === 0) {
      await this.logAudit(userId, "copy", sourceKey, false, context, "Source object not found");
      return { ok: false, error: "Source object not found or access denied" };
    }

    const destKey = this.buildObjectKey(userId, destNamespace, destFilename);
    const sourceRecord = record[0];

    const quotaCheck = await this.checkQuota(userId, sourceRecord.fileSize);
    if (!quotaCheck.allowed) {
      await this.logAudit(userId, "copy", sourceKey, false, context, quotaCheck.reason, sourceRecord.fileSize, destKey);
      return { ok: false, error: quotaCheck.reason };
    }

    try {
      const result = await this.client.copy(sourceKey, destKey);
      
      if (!result.ok) {
        await this.logAudit(userId, "copy", sourceKey, false, context, result.error?.message, undefined, destKey);
        return { ok: false, error: result.error?.message };
      }

      const newRecord: InsertUserObject = {
        userId,
        objectKey: destKey,
        namespace: destNamespace,
        filename: destFilename,
        contentType: sourceRecord.contentType,
        fileSize: sourceRecord.fileSize,
        checksum: sourceRecord.checksum,
        tags: sourceRecord.tags || [],
        metadata: sourceRecord.metadata as Record<string, unknown>,
        isPublic: sourceRecord.isPublic,
      };

      await db.insert(userObjects).values(newRecord);
      await this.updateQuota(userId, sourceRecord.fileSize, 1);
      await this.logAudit(userId, "copy", sourceKey, true, context, undefined, sourceRecord.fileSize, destKey);

      return { ok: true, newObjectKey: destKey };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      await this.logAudit(userId, "copy", sourceKey, false, context, errorMsg, undefined, destKey);
      return { ok: false, error: errorMsg };
    }
  }

  async objectExists(
    userId: string,
    objectKey: string
  ): Promise<{ ok: boolean; exists?: boolean; error?: string }> {
    try {
      const record = await db.select().from(userObjects)
        .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
        .limit(1);

      if (record.length > 0) {
        return { ok: true, exists: true };
      }

      const result = await this.client.exists(objectKey);
      return { ok: true, exists: result.ok ? result.value : false };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: errorMsg };
    }
  }

  async getObjectMetadata(
    userId: string,
    objectKey: string
  ): Promise<UserObject | null> {
    const records = await db.select().from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    return records[0] || null;
  }

  async updateObjectMetadata(
    userId: string,
    objectKey: string,
    updates: {
      tags?: string[];
      metadata?: Record<string, unknown>;
      isPublic?: boolean;
    }
  ): Promise<{ ok: boolean; error?: string }> {
    const record = await db.select().from(userObjects)
      .where(and(eq(userObjects.userId, userId), eq(userObjects.objectKey, objectKey)))
      .limit(1);

    if (record.length === 0) {
      return { ok: false, error: "Object not found or access denied" };
    }

    try {
      await db.update(userObjects)
        .set({
          ...(updates.tags && { tags: updates.tags }),
          ...(updates.metadata && { metadata: updates.metadata }),
          ...(updates.isPublic !== undefined && { isPublic: updates.isPublic }),
          updatedAt: new Date(),
        })
        .where(eq(userObjects.objectKey, objectKey));

      return { ok: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: errorMsg };
    }
  }

  async getAuditLogs(
    userId: string,
    limit: number = 50
  ): Promise<{ ok: boolean; logs?: any[]; error?: string }> {
    try {
      const logs = await db.select().from(storageAuditLogs)
        .where(eq(storageAuditLogs.userId, userId))
        .orderBy(desc(storageAuditLogs.createdAt))
        .limit(limit);

      return { ok: true, logs };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      return { ok: false, error: errorMsg };
    }
  }
}

export const aleHermes = new AleHermesService();
