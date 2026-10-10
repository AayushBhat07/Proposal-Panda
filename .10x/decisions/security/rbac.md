# Security: RBAC (2026-10-09)
- Session: HMAC-SHA256 signed cookie, HttpOnly, SameSite=Lax, Secure in production, 8h expiry.
- `AUTH_SECRET` required in production (throws); demo login disabled in production unless `DEMO_PASSWORD` set.
- Login `next` redirect accepts only same-site relative paths.
- Verified: forged role payload → 401; per-role page/API matrix matches rbac.ts.
- Open: no rate limiting on /api/auth/login; demo accounts share one password; no CSRF token (SameSite=Lax plus JSON/multipart fetch bodies limit cross-site posts, but add tokens before production).
