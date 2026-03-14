/**
 * Grudge JWT Verification Middleware
 * Direct-DB mode: all tokens are signed locally by grudgeAuth.ts.
 * Verified locally with SESSION_SECRET — no external gateway dependency.
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env.SESSION_SECRET || "";
const GRUDGE_BACKEND_URL = process.env.GRUDGE_BACKEND_URL || "https://id.grudge-studio.com";

if (!process.env.SESSION_SECRET) {
  console.warn("⚠️  SESSION_SECRET not set — JWT verification will fail for all requests");
}

/** Shape of the JWT payload issued by auth-gateway */
export interface GrudgeUser {
  grudgeId: string;
  username: string;
  userId: string;
  /** Set after remote verify enriches the payload */
  role?: string;
  isPremium?: boolean;
  isGuest?: boolean;
}

/** Extend Express Request to carry the decoded user */
declare global {
  namespace Express {
    interface Request {
      grudgeUser?: GrudgeUser;
    }
  }
}

// ── Helpers ──

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/** Verify JWT locally using SESSION_SECRET. */
function verifyToken(token: string): GrudgeUser | null {
  if (!SESSION_SECRET) return null;
  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as Record<string, any>;
    if (!decoded.grudgeId) return null;
    return {
      grudgeId: decoded.grudgeId,
      username: decoded.username || "Player",
      userId: decoded.userId || decoded.sub || decoded.grudgeId,
      role: decoded.role,
      isPremium: decoded.isPremium,
      isGuest: decoded.isGuest,
    };
  } catch {
    return null;
  }
}

/**
 * Verify token against the grudge-backend grudge-id service.
 * Used as a fallback when local SESSION_SECRET verification fails
 * (e.g. token was issued by the grudge-backend with a different JWT_SECRET).
 */
async function verifyTokenRemote(token: string): Promise<GrudgeUser | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${GRUDGE_BACKEND_URL}/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.valid || !data.payload) return null;

    const p = data.payload;
    return {
      grudgeId: p.grudge_id || p.grudgeId,
      username: p.username || "Player",
      userId: p.grudge_id || p.grudgeId,
      role: p.role,
      isPremium: p.isPremium,
      isGuest: p.isGuest,
    };
  } catch {
    return null;
  }
}

// ── Middleware Exports ──

/**
 * Require a valid Grudge JWT. Returns 401 if missing/invalid.
 * Attaches `req.grudgeUser` on success.
 * Falls back to grudge-backend remote verification if local verify fails.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  // Try local verification first (fast path)
  let user = verifyToken(token);

  // Fallback: verify against grudge-backend grudge-id service
  if (!user) {
    user = await verifyTokenRemote(token);
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.grudgeUser = user;
  next();
}

/**
 * Optional auth — attaches `req.grudgeUser` if a valid token is present,
 * but continues even if not. Use for endpoints that work with or without auth.
 * Falls back to grudge-backend remote verification if local verify fails.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (token) {
    let user = verifyToken(token);
    if (!user) {
      user = await verifyTokenRemote(token);
    }
    if (user) {
      req.grudgeUser = user;
    }
  }
  next();
}
