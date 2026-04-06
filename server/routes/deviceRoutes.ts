/**
 * Device Registration Routes
 *
 * Manages ESP32-GRD17 and browser firmware registrations
 * linked to Grudge accounts via JWT auth.
 *
 * Routes:
 *   POST /api/devices/register     — first-time device registration (public key + firmware)
 *   GET  /api/devices/me           — device fetches its own record via device token
 *   POST /api/devices/heartbeat    — 30s ping: block height, uptime, peers, balances
 *   GET  /api/devices              — list all devices for authenticated account
 *   DELETE /api/devices/:id        — deregister a device
 *
 * Two auth modes:
 *   - User JWT (Authorization: Bearer <grudge_jwt>)  — for /register and GET /api/devices
 *   - Device token (X-Device-Token: <device_jwt>)    — for /me, /heartbeat
 *
 * ESP32 flow:
 *   Boot → POST /register with pubkey + firmware → store returned deviceToken in NVS
 *   Loop → POST /heartbeat every 30s with block height + uptime + peer count
 */

import type { Express, Request, Response } from "express";
import { db } from "../db";
import { grudge_devices } from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";

const JWT_SECRET = process.env.JWT_SECRET || "";
const DEVICE_TOKEN_EXPIRY = "365d"; // long-lived device tokens

// ── Auth helpers ──────────────────────────────────────────────────────────────

function verifyUserJWT(token: string): { grudgeId?: string; userId?: string; username?: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

function issueDeviceToken(deviceId: string, grudgeId: string): string {
  return jwt.sign({ deviceId, grudgeId, type: "device" }, JWT_SECRET, { expiresIn: DEVICE_TOKEN_EXPIRY });
}

function requireUser(req: Request, res: Response): { grudgeId: string; username: string } | null {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) { res.status(401).json({ error: "User JWT required" }); return null; }
  const payload = verifyUserJWT(token);
  if (!payload?.grudgeId) { res.status(401).json({ error: "Invalid or expired token" }); return null; }
  return { grudgeId: payload.grudgeId, username: payload.username || "unknown" };
}

function requireDevice(req: Request, res: Response): { deviceId: string; grudgeId: string } | null {
  const token = req.headers["x-device-token"] as string | undefined
    || (req.headers.authorization || "").replace("Bearer ", "");
  if (!token) { res.status(401).json({ error: "Device token required" }); return null; }
  try {
    const p = jwt.verify(token, JWT_SECRET) as any;
    if (p?.type !== "device") { res.status(401).json({ error: "Not a device token" }); return null; }
    return { deviceId: p.deviceId, grudgeId: p.grudgeId };
  } catch {
    res.status(401).json({ error: "Invalid device token" }); return null;
  }
}

// ── Route registrations ───────────────────────────────────────────────────────

export function registerDeviceRoutes(app: Express): void {

  // ── POST /api/devices/register ────────────────────────────────────────────
  // Body: { publicKey, firmwareVersion, hardwareType, deviceName? }
  // Auth: User JWT (links device to the calling account)
  // Returns: { deviceId, deviceToken, device }
  app.post("/api/devices/register", async (req: Request, res: Response) => {
    const user = requireUser(req, res);
    if (!user) return;

    const { publicKey, firmwareVersion = "unknown", hardwareType = "browser", deviceName } = req.body;
    if (!publicKey) {
      return res.status(400).json({ error: "publicKey required" }) as any;
    }

    try {
      // Check if a device with this public key is already registered to this account
      const existing = await db
        .select()
        .from(grudge_devices)
        .where(and(
          eq(grudge_devices.publicKey, publicKey),
          eq(grudge_devices.grudgeId, user.grudgeId)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Re-register: update firmware + refresh token
        const deviceToken = issueDeviceToken(existing[0].id, user.grudgeId);
        await db
          .update(grudge_devices)
          .set({
            firmwareVersion,
            hardwareType,
            deviceName: deviceName || existing[0].deviceName,
            status: "online",
            lastSeen: new Date().toISOString(),
          })
          .where(eq(grudge_devices.id, existing[0].id));

        return res.json({
          deviceId: existing[0].id,
          deviceToken,
          device: { ...existing[0], firmwareVersion, status: "online" },
          isNew: false,
        });
      }

      // New device
      const deviceId = randomUUID();
      const now = new Date().toISOString();
      const deviceToken = issueDeviceToken(deviceId, user.grudgeId);
      const name = deviceName || `${hardwareType}-${deviceId.slice(0, 6).toUpperCase()}`;

      await db.insert(grudge_devices).values({
        id: deviceId,
        grudgeId: user.grudgeId,
        deviceName: name,
        publicKey,
        firmwareVersion,
        hardwareType,
        status: "online",
        lastSeen: now,
        lastHeartbeat: null,
        createdAt: now,
      });

      const [device] = await db
        .select()
        .from(grudge_devices)
        .where(eq(grudge_devices.id, deviceId))
        .limit(1);

      res.status(201).json({ deviceId, deviceToken, device, isNew: true });
    } catch (err: any) {
      console.error("[devices/register]", err.message);
      res.status(500).json({ error: "Registration failed", detail: err.message });
    }
  });

  // ── GET /api/devices/me ───────────────────────────────────────────────────
  // Auth: Device token (X-Device-Token)
  // Returns the device's own record
  app.get("/api/devices/me", async (req: Request, res: Response) => {
    const dev = requireDevice(req, res);
    if (!dev) return;

    try {
      const [device] = await db
        .select()
        .from(grudge_devices)
        .where(eq(grudge_devices.id, dev.deviceId))
        .limit(1);

      if (!device) return res.status(404).json({ error: "Device not found" }) as any;
      res.json(device);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── POST /api/devices/heartbeat ───────────────────────────────────────────
  // Auth: Device token
  // Body: { blockHeight?, uptime?, peerCount?, solBalance?, gbuxBalance?, temp?, rssi? }
  app.post("/api/devices/heartbeat", async (req: Request, res: Response) => {
    const dev = requireDevice(req, res);
    if (!dev) return;

    const {
      blockHeight, uptime, peerCount,
      solBalance, gbuxBalance, rudaBalance,
      temp, rssi, status: deviceStatus,
    } = req.body;

    const heartbeat = {
      ts: Date.now(),
      blockHeight: blockHeight ?? null,
      uptime: uptime ?? null,
      peerCount: peerCount ?? null,
      solBalance: solBalance ?? null,
      gbuxBalance: gbuxBalance ?? null,
      rudaBalance: rudaBalance ?? null,
      temp: temp ?? null,
      rssi: rssi ?? null,
    };

    try {
      await db
        .update(grudge_devices)
        .set({
          lastSeen: new Date().toISOString(),
          lastHeartbeat: JSON.stringify(heartbeat),
          status: deviceStatus ?? "online",
        })
        .where(eq(grudge_devices.id, dev.deviceId));

      res.json({ ok: true, ts: heartbeat.ts, nextIn: 30 });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── GET /api/devices ──────────────────────────────────────────────────────
  // Auth: User JWT
  // Returns all devices for the authenticated account
  app.get("/api/devices", async (req: Request, res: Response) => {
    const user = requireUser(req, res);
    if (!user) return;

    try {
      const devices = await db
        .select()
        .from(grudge_devices)
        .where(eq(grudge_devices.grudgeId, user.grudgeId));

      // Mark stale devices (no heartbeat in 90s)
      const now = Date.now();
      const enriched = devices.map(d => {
        let hb: any = null;
        try { hb = d.lastHeartbeat ? JSON.parse(d.lastHeartbeat as string) : null; } catch {}
        const isStale = !hb?.ts || (now - hb.ts) > 90_000;
        return {
          ...d,
          status: isStale ? "offline" : d.status,
          lastHeartbeat: hb,
          stale: isStale,
        };
      });

      res.json({ devices: enriched, count: enriched.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── DELETE /api/devices/:id ───────────────────────────────────────────────
  // Auth: User JWT — can only delete own devices
  app.delete("/api/devices/:id", async (req: Request, res: Response) => {
    const user = requireUser(req, res);
    if (!user) return;

    try {
      const [device] = await db
        .select()
        .from(grudge_devices)
        .where(and(
          eq(grudge_devices.id, req.params.id),
          eq(grudge_devices.grudgeId, user.grudgeId)
        ))
        .limit(1);

      if (!device) return res.status(404).json({ error: "Device not found or not yours" }) as any;

      await db
        .delete(grudge_devices)
        .where(eq(grudge_devices.id, req.params.id));

      res.json({ deleted: true, id: req.params.id });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[devices] Routes registered: register, me, heartbeat, list, delete");
}
