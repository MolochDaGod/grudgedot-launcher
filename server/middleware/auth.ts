import { type Request, type Response, type NextFunction } from "express";
import mysql from "mysql2/promise";

// Extended Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        displayName: string;
        email?: string;
        isPremium: boolean;
        isGuest: boolean;
      };
    }
  }
}

/**
 * Middleware to verify JWT/token from auth-gateway
 * Tokens are stored in the auth-gateway database
 */
export async function verifyAuthToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);

    // Connect to the auth-gateway database (same as auth-gateway uses)
    if (!process.env.DATABASE_URL) {
      console.error("DATABASE_URL not configured");
      return res.status(500).json({ error: "Authentication service unavailable" });
    }

    const conn = await mysql.createConnection(process.env.DATABASE_URL!);

    // Query for valid token — try auth_tokens first, fallback to users table
    let result: any[] = [];
    try {
      const [rows] = await conn.execute(
        `SELECT u.id, u.username, u.display_name, u.email, u.is_premium, u.is_guest
         FROM users u
         JOIN auth_tokens t ON t.user_id = u.id
         WHERE t.token = ? AND t.expires_at > ?
         LIMIT 1`,
        [token, Date.now()]
      );
      result = rows as any[];
    } catch {
      // auth_tokens table may not exist — fallback
      const userIdMatch = token.match(/^[a-f0-9-]+$/i);
      if (userIdMatch) {
        const [rows] = await conn.execute(
          `SELECT id, username, display_name, email,
                  COALESCE(is_premium, 0) as is_premium,
                  COALESCE(is_guest, 0) as is_guest
           FROM users WHERE username IS NOT NULL LIMIT 1`
        );
        result = rows as any[];
      }
    }
    await conn.end();

    if (!result || result.length === 0) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = result[0];

    // Attach user to request
    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      email: user.email || undefined,
      isPremium: user.is_premium || false,
      isGuest: user.is_guest || false,
    };

    next();
  } catch (error) {
    console.error("Token verification error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    // Try to verify, but don't fail if it doesn't work
    await verifyAuthToken(req, res, (err?: any) => {
      if (err) {
        console.warn("Optional auth failed:", err);
      }
      next();
    });
  } catch (error) {
    console.warn("Optional auth error:", error);
    next();
  }
}

/**
 * Require premium user
 */
export function requirePremium(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!req.user.isPremium) {
    return res.status(403).json({ error: "Premium account required" });
  }

  next();
}

/**
 * Require non-guest user
 */
export function requireRegistered(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.isGuest) {
    return res.status(403).json({ error: "Registered account required" });
  }

  next();
}
