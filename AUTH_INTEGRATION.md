# Grudge Auth Gateway Integration

## Overview

GGE authenticates via the **Grudge Auth Gateway** at `https://auth-gateway-flax.vercel.app`. All auth flows produce a **JWT** stored in localStorage as `grudge_auth_token`. The auth gateway is the source of truth for the shared `accounts` table across all Grudge Studio apps.

## Authentication Flow

```
User visits GGE
    ↓
AuthGuard checks localStorage for JWT
    ↓
No token? → Redirect to auth-gateway-flax.vercel.app?return=GGE_URL
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

## Auth Gateway Endpoints (proxied through GGE)

GGE proxies auth calls to `auth-gateway-flax.vercel.app`:

- `POST /api/login` — Username/password login
- `POST /api/register` — Create account
- `POST /api/guest` — Guest login
- `POST /api/auth/puter` — Puter UUID → JWT bridge
- `GET /api/auth/verify` — Verify token

## Troubleshooting

- **Infinite redirect loop**: Token not being stored after login. Check browser console.
- **401 Unauthorized**: JWT expired or `JWT_SECRET` mismatch between GGE and auth-gateway.
- **Token not persisting**: Check localStorage isn't being cleared by other code.
