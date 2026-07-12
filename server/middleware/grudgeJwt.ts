/**
 * Grudge JWT Verification Middleware
 * Direct-DB mode: all tokens are signed locally by grudgeAuth.ts.
 * Verified locally with SESSION_SECRET — no external gateway dependency.
 */

import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// Use JWT_SECRET (matching grudge-id backend) for local verification.
// Falls back to SESSION_SECRET for backward compat.
const JWT_VERIFY_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "";
const GRUDGE_BACKEND_URL = process.env.GRUDGE_BACKEND_URL || "https://id.grudge-studio.com";

if (!process.env.JWT_SECRET && !process.env.SESSION_SECRET) {
  console.warn("⚠️  Neither JWT_SECRET nor SESSION_SECRET set — local JWT verification disabled, using remote only");
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

/** Verify JWT locally using JWT_SECRET (or SESSION_SECRET fallback). */
function verifyToken(token: string): GrudgeUser | null {
  if (!JWT_VERIFY_SECRET) return null;
  try {
    const decoded = jwt.verify(token, JWT_VERIFY_SECRET) as Record<string, any>;
    // VPS grudge-id uses snake_case (grudge_id), some local issuers use camelCase (grudgeId)
    const grudgeId = decoded.grudge_id || decoded.grudgeId;
    if (!grudgeId) return null;
    return {
      grudgeId,
      username: decoded.username || "Player",
      userId: decoded.grudge_id || decoded.grudgeId || decoded.sub,
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

/**
 * Require premium user. Must be used after requireAuth.
 */
export function requirePremium(req: Request, res: Response, next: NextFunction) {
  if (!req.grudgeUser) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!req.grudgeUser.isPremium) {
    return res.status(403).json({ error: "Premium account required" });
  }
  next();
}

/**
 * Require non-guest user. Must be used after requireAuth.
 */
export function requireRegistered(req: Request, res: Response, next: NextFunction) {
  if (!req.grudgeUser) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (req.grudgeUser.isGuest) {
    return res.status(403).json({ error: "Registered account required" });
  }
  next();
}
