# grudgeDot Auth Integration
## Overview
grudgeDot has **no in-app login**. Every authentication flow is handled by the unified Grudge ID SSO at `https://id.grudge-studio.com/auth`. The launcher only stores a JWT (keyed `grudge_auth_token` in `localStorage`) and forwards it on API calls. This makes grudgeDot a pure consumer of Grudge ID; adding or changing login methods never requires a grudgeDot deploy.
## Authentication Flow
```
User loads any grudgeDot URL (e.g. /)
    ↓
<AuthGuard> mounts and calls captureAuthCallback()
    ↓
┌── Token in URL (hash or query)? ──┐
│ yes                               │ no
│  Store it, clean the URL          │
│  Render the app                   │
│                                   ↓
│                       ┌── JWT already in localStorage? ──┐
│                       │ yes                              │ no
│                       │  Render the app optimistically   │  window.location.replace →
│                       │  Background /api/auth/verify     │  https://id.grudge-studio.com/auth
│                       │    ✘ logoutSilent() + redirect   │    ?app=grudgedot&redirect=<current-url>
│                       │    ✔ stay logged in              │
└───────────────────────┴──────────────────────────────────┘
```
All login forms, OAuth providers, Puter/Web3 wallet flows, and phone/guest accounts live on `id.grudge-studio.com`. When the SSO finishes, it redirects back to the original grudgeDot URL with the JWT appended as `#token=...` or `?token=...`, and `captureAuthCallback()` picks it up.
## Key Files
- `client/src/lib/auth.ts` — SSO redirect + token capture, `apiCall()` helper, logout
- `client/src/components/AuthGuard.tsx` — Wraps the app, redirects unauthenticated users
- `client/src/hooks/useAuth.ts` — React Query wrapper around `/api/auth/user`
- `server/grudgeAuth.ts` — Thin token proxies (`verify`, `user`, `me`, `logout`) to `id.grudge-studio.com`
- `server/middleware/grudgeJwt.ts` — Express middleware that verifies the JWT on protected routes
## Client-Side API (`client/src/lib/auth.ts`)
| Function | Description |
|---|---|
| `getAuthData()` | Returns current auth data (token, grudgeId, userId, username) or `null`. Automatically clears expired tokens. |
| `checkAuth()` | Same as `getAuthData()` but redirects to SSO if not logged in. |
| `hasAuthToken()` | `true` if a token is present in localStorage (does not validate it). |
| `isTokenExpired(token, bufferSeconds?)` | Client-side JWT `exp` check (no signature verification). |
| `storeAuth(data)` | Persist the token/grudgeId/userId/username from an SSO callback. |
| `captureAuthCallback()` | Reads the token from the current URL (hash, `sso_token`, or `token` query) and stores it. Returns `true` if captured. Call on page load **before** any `getAuthData()`. |
| `redirectToLogin(returnUrl?)` | `window.location.replace` to `https://id.grudge-studio.com/auth?app=grudgedot&redirect=<returnUrl>`. |
| `verifyToken()` | `GET /api/auth/verify` (proxied to SSO). Returns full profile or `null`. |
| `apiCall(endpoint, options)` | Fetch wrapper that auto-attaches `Authorization: Bearer`. Boots the user to SSO on 401. |
| `logout()` | Calls `/api/auth/logout` (SSO), clears localStorage, redirects back to SSO. |
| `logoutSilent()` | Same as `logout()` but does not redirect. |
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
| `grudge_auth_token` | JWT issued by `id.grudge-studio.com` |
| `grudge_id` | Universal Grudge ID (e.g. `GRUDGE_LQXM8K_7H9P4W2NXQ`) |
| `grudge_user_id` | Numeric account ID |
| `grudge_username` | Display name |
Legacy keys (`grudge_puter_auth`, `grudge_auth_provider`) are cleared on logout but no longer written.
## Server-Side Verification
`server/middleware/grudgeJwt.ts` verifies the JWT on protected routes. It first attempts a local verify with `SESSION_SECRET`; if that fails (e.g. the SSO has rotated secrets), it falls back to `POST ${GRUDGE_AUTH_URL}/auth/verify` (5s timeout). The resulting user is attached to `req.grudgeUser`.
## Auth Endpoints (launcher side)
Only four proxy routes are retained. Everything else is handled directly by the SSO.
| Method | Path | Proxies to |
|---|---|---|
| GET | `/api/auth/verify` | `GET /auth/verify` on `id.grudge-studio.com` |
| GET | `/api/auth/user`   | `GET /auth/user` |
| GET | `/api/auth/me`     | `GET /auth/user` |
| POST | `/api/auth/logout` | `POST /auth/logout` |
| GET/POST | `/api/login` | 302 → `id.grudge-studio.com/auth?app=grudgedot&redirect=/` |
| GET/POST | `/api/register` | 302 → `id.grudge-studio.com/auth?app=grudgedot&redirect=/` |
The 302 redirects exist only to keep stale bookmarks working; they should not be called in normal flows.
## Required Environment Variables
```env
# JWT signing key (shared with id.grudge-studio.com so local verify works)
SESSION_SECRET=your-shared-jwt-secret
# SSO origin
GRUDGE_AUTH_URL=https://id.grudge-studio.com
# Game backend (for /api/grudge/* proxy + remote token verify fallback)
GRUDGE_BACKEND_URL=https://api.grudge-studio.com
```
No OAuth client IDs are required on grudgeDot anymore — Google/Discord/GitHub/Puter/wallet/phone all live on the SSO.
## JWT Verification Flow (`server/middleware/grudgeJwt.ts`)
```
Request arrives with Authorization: Bearer <token>
    ↓
1. Extract token from header
    ↓
2. Local verify: jwt.verify(token, SESSION_SECRET)
   ✔ Success → attach req.grudgeUser, done
   ✘ Fail → continue to step 3
    ↓
3. Remote verify: GET GRUDGE_AUTH_URL/auth/verify (5s timeout)
   ✔ Success → attach req.grudgeUser
   ✘ Fail → 401 Unauthorized
```
## Dynamic OAuth Redirect Domains
OAuth flows live entirely on `id.grudge-studio.com`, so grudgeDot does **not** need to register callback URLs per deployment. The SSO redirects back using the `redirect=` query param that grudgeDot passes in, so the launcher works identically on:
- Vercel production (`grudgedot.vercel.app`)
- Vercel preview branches (`grudgedot-git-*.vercel.app`)
- Grudge Studio subdomains (`*.grudge-studio.com`)
- Local development (`localhost:5000`)
## Troubleshooting
- **Infinite redirect loop**: `captureAuthCallback()` isn't storing the token. Check that the SSO is sending a `#token=` hash or `?token=` param and that `AuthGuard` runs before any `window.location.replace`.
- **401 Unauthorized on every API call**: `SESSION_SECRET` mismatch between grudgeDot and the SSO. Fix: sync the secret.
- **Slow API responses (~1–5s per call)**: local JWT verify is failing, so every request falls back to remote verify. Fix: sync `SESSION_SECRET`.
- **Logout doesn't invalidate the JWT**: the SSO's `POST /api/auth/logout` is unreachable. Check that `GRUDGE_AUTH_URL` points to the SSO origin and the SSO has a working logout endpoint.
- **Token accepted by other Grudge apps but rejected by grudgeDot**: cross-service token. Ensure `GRUDGE_AUTH_URL` is reachable so remote verify works.
