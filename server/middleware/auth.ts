/**
 * Legacy auth middleware — DEPRECATED.
 *
 * All JWT auth now goes through server/middleware/grudgeJwt.ts which
 * verifies tokens locally via SESSION_SECRET with a remote fallback to
 * the Grudge ID service at id.grudge-studio.com.
 *
 * This file re-exports from grudgeJwt.ts for backwards compatibility.
 */

export { requireAuth as verifyAuthToken, optionalAuth } from "./grudgeJwt";

import type { Request, Response, NextFunction } from "express";

export function requirePremium(req: Request, res: Response, next: NextFunction) {
  if (!req.grudgeUser) return res.status(401).json({ error: "Authentication required" });
  if (!req.grudgeUser.isPremium) return res.status(403).json({ error: "Premium account required" });
  next();
}

export function requireRegistered(req: Request, res: Response, next: NextFunction) {
  if (!req.grudgeUser) return res.status(401).json({ error: "Authentication required" });
  if (req.grudgeUser.isGuest) return res.status(403).json({ error: "Registered account required" });
  next();
}
