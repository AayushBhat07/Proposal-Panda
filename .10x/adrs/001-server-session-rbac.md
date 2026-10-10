# ADR-001: Server-authoritative session cookie for RBAC

**Status:** Accepted (default, pending user confirmation) · **Date:** 2026-10-09 · **Feature:** rbac

## Context
Roles lived in localStorage and could be switched from a dropdown, and the API routes had no auth.
RBAC that the browser controls is not access control.

## Decision
A signed (HMAC-SHA256, Web Crypto) HttpOnly cookie carries `{email, role, exp}`, issued by
`/api/auth/login` against a server-side user directory. `proxy.ts` and every API route verify it.
One permission map (`lib/auth/rbac.ts`) is used everywhere. Secret: `AUTH_SECRET`
(required in production, dev fallback with a warning).

## Alternatives Considered
| Alternative | Why not now |
|---|---|
| NextAuth/Auth.js | Needs a provider/DB decision only the user can make; adds deps |
| Keep localStorage roles, gate in UI only | Trivially bypassed; APIs stay open |
| Supabase/Clerk | External service; user has not chosen one |

## Consequences
+ Roles can't be changed from the browser; APIs are enforced.
- Users are a static demo directory until a real user store exists (swap `findUser`).
