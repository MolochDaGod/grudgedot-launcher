# GDevelop Assistant — Language Rules & Coding Conventions

---

## 1. Auth — Single Token

`grudge_auth_token` in `localStorage` is the canonical JWT across all Grudge Studio apps.

| Key | Purpose |
|---|---|
| `grudge_auth_token` | Bearer JWT |
| `grudge_id` | Grudge ID |
| `grudge_username` | Display name |
| `grudge_user_id` | Numeric account ID |
| `grudge_puter_auth` | `'true'` if authenticated via Puter |

All helpers are in `client/src/lib/auth.ts`:
- `getAuthData()` — read current auth
- `storeAuth(data)` — write after any login flow
- `logout()` — fires server-side invalidation + clears + redirects
- `logoutSilent()` — same but no redirect (for account switching)
- `captureAuthCallback()` — called on page load to capture `?token=` from SSO redirect

**Never write any other token key.** Never pass tokens in URL params beyond the initial SSO return.

---

## 2. API Calls

- Auth API: `client/src/lib/auth.ts` → calls `/api/login`, `/api/register`, `/api/guest`
- Backend API: `client/src/lib/grudgeBackendApi.ts` → calls `api.grudge-studio.com`
- Never raw `fetch()` in components — use the typed helpers in these files

---

## 3. TypeScript

- All source is TypeScript (`.ts`, `.tsx`)
- `interface` over `type` for object shapes
- No `any` — use `unknown` and narrow

---

## 4. Git

- Branch: `main` is production
- Commit prefixes: `feat:`, `fix:`, `security:`, `docs:`, `chore:`
- Never commit `.env`
