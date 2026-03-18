# Grudge Auth Gateway Integration

## Overview

GGE authenticates via the **Grudge Auth Gateway** at `https://id.grudge-studio.com`. All auth flows produce a **JWT** stored in localStorage as `grudge_auth_token`. The auth gateway is the source of truth for the shared `accounts` table across all Grudge Studio apps.

## Authentication Flow

```
User visits GGE
    ↓
AuthGuard checks localStorage for JWT
    ↓
No token? → Redirect to id.grudge-studio.com?return=GGE_URL
    ↓
User logs in (password, Puter, guest, or wallet)
    ↓
Auth gateway issues JWT, stores in localStorage:
  - grudge_auth_token  (JWT)
  - grudge_id          (Grudge ID, e.g. GRUDGE_LQXM8K_...)
  - grudge_user_id     (numeric user ID)
  - grudge_username    (display name)
    ↓
Redirect back to GGE → User authenticated ✅
```

## Key Files

- `client/src/lib/auth.ts` — All auth functions (login, logout, token storage, API helper)
- `client/src/components/AuthGuard.tsx` — Wraps the app, redirects if not authenticated
- `server/middleware/grudgeJwt.ts` — Express middleware that verifies JWT on protected routes

## Client-Side API (`client/src/lib/auth.ts`)

| Function | Description |
|---|---|
| `getAuthData()` | Returns current auth data (token, grudgeId, username) or `null` |
| `checkAuth()` | Same as `getAuthData()` but redirects to login if not authenticated |
| `loginWithPassword(user, pass)` | Login via auth-gateway `/api/login` |
| `registerAccount(user, pass, email?)` | Register via auth-gateway `/api/register` |
| `loginWithPuter(uuid, username)` | Bridge Puter.js auth to Grudge JWT |
| `loginAsGuest(deviceId?)` | Guest login via auth-gateway `/api/guest` |
| `verifyToken()` | Verify current JWT with server |
| `apiCall(endpoint, options)` | Fetch wrapper that auto-attaches `Authorization: Bearer` header |
| `logout()` | Clear all auth data and redirect to login |
| `logoutSilent()` | Clear auth data without redirect |

## Usage in Components

```tsx
import { getAuthData, logout, apiCall } from '@/lib/auth';

function MyComponent() {
  const auth = getAuthData();
  return (
    <div>
      <p>Welcome, {auth?.username}! (Grudge ID: {auth?.grudgeId})</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

// Authenticated API call (auto-attaches JWT)
const profile = await apiCall('user/profile');
```

## localStorage Keys

| Key | Value |
|---|---|
| `grudge_auth_token` | JWT (signed by auth-gateway) |
| `grudge_id` | Universal Grudge ID (e.g. `GRUDGE_LQXM8K_7H9P4W2NXQ`) |
| `grudge_user_id` | Numeric account ID |
| `grudge_username` | Display name |
| `grudge_puter_auth` | `"true"` if logged in via Puter |

## Server-Side Verification

The Express middleware at `server/middleware/grudgeJwt.ts` verifies JWTs on protected routes. It decodes the token and attaches the user to `req.user`.

## Auth Endpoints (Direct DB — `server/grudgeAuth.ts`)

All auth flows hit the shared Neon `accounts` table directly. No external gateway proxy needed.

**Core Auth:**
- `POST /api/login` — Username/email/grudgeId + password
- `POST /api/register` — Create account (auto-creates Crossmint wallet if `CROSSMINT_SERVER_API_KEY` is set)
- `POST /api/guest` — Guest login (500 starting gold)

**OAuth Providers:**
- `GET /api/auth/google` + `/api/auth/google/callback` — Google OAuth (requires `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- `GET /api/auth/discord` + `/api/auth/discord/callback` — Discord OAuth (requires `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`)
- `GET /api/auth/github` + `/api/auth/github/callback` — GitHub OAuth (requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)

**Other Auth Methods:**
- `POST /api/auth/puter` — Puter UUID → JWT bridge
- `POST /api/auth/wallet` — Connect Solana wallet (login or link)
- `POST /api/auth/phone` — SMS verification (requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`; returns 503 if not configured)

**Token / Profile:**
- `GET /api/auth/verify` — Verify token (returns full profile)
- `GET /api/auth/user` — Current user (local JWT decode)
- `GET /api/auth/me` — Full profile
- `POST /api/auth/link-puter` — Link Puter UUID to existing account (auth required)

## Required Environment Variables

```env
# CRITICAL — JWT signing key shared across all Grudge Studio apps
SESSION_SECRET=your-shared-jwt-secret

# Grudge backend grudge-id service (for cross-service token verification)
GRUDGE_BACKEND_URL=https://id.grudge-studio.com

# Discord OAuth
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
# Redirect URI: https://gdevelop-assistant.vercel.app/api/auth/discord/callback

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
# Redirect URI: https://gdevelop-assistant.vercel.app/api/auth/github/callback

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Redirect URI: https://gdevelop-assistant.vercel.app/api/auth/google/callback
```

`SESSION_SECRET` is the JWT signing key used by all Grudge apps sharing the same `accounts` table.  
If it matches, `grudgeJwt.ts` verifies tokens locally (fast, no network).  
If local verification fails, it falls back to the grudge-backend `POST /auth/verify` endpoint (5s timeout). This allows tokens issued by `grudge-id` (with a different `JWT_SECRET`) to also work in GGE.

## JWT Verification Flow (server/middleware/grudgeJwt.ts)

```
Request arrives with Authorization: Bearer <token>
    ↓
1. Extract token from header
    ↓
2. Try local verify: jwt.verify(token, SESSION_SECRET)
   ✔ Success → attach req.grudgeUser, done
   ✘ Fail → continue to step 3
    ↓
3. Remote verify: POST GRUDGE_BACKEND_URL/auth/verify (5s timeout)
   ✔ Success → attach req.grudgeUser (mapped from grudge-backend payload)
   ✘ Fail → 401 Unauthorized
```

This dual-verify approach means users authenticated via `grudgewarlords.com` or other
Grudge Studio apps can seamlessly use GGE without re-authenticating.

## Troubleshooting

- **Infinite redirect loop**: Token not being stored after login. Check browser console for storeAuth() call.
- **401 Unauthorized**: `SESSION_SECRET` mismatch between GGE and auth-gateway. Check both deployments use the same value.
- **Token not persisting**: Check localStorage isn't being cleared by other code.
- **Slow API responses**: If every request takes 1-5s, `SESSION_SECRET` probably doesn't match the gateway and every request falls back to remote verification. Fix: sync the secret.
- **Discord OAuth fails**: Ensure `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` are set and the redirect URI `https://gdevelop-assistant.vercel.app/api/auth/discord/callback` is registered in the Discord developer portal.
- **GitHub OAuth fails**: Ensure `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` are set and the callback URL `https://gdevelop-assistant.vercel.app/api/auth/github/callback` is registered in GitHub OAuth app settings.
- **Google OAuth fails**: Same pattern — check `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and callback URL.
- **Phone auth returns 503**: Twilio credentials (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) are not configured.
- **Cross-service tokens rejected**: Ensure `GRUDGE_BACKEND_URL` points to the grudge-id service and it's reachable. Check that `gdevelop-assistant.vercel.app` is in the backend's `CORS_ORIGINS`.
