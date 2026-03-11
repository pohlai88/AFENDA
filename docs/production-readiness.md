# Production Readiness Checklist

Pre-deployment validation for AFENDA (NexusCanon) production environments.

---

## 1. Environment Variables

### Required Secrets (must be real values, not placeholders)

| Variable | Purpose | Generate |
|----------|---------|----------|
| `NEXTAUTH_SECRET` | JWT signing, session encryption | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_CHALLENGE_SECRET` | MFA, invite, reset token HMAC | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `AUTH_EVIDENCE_SIGNING_SECRET` | Evidence export signatures | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Production URLs

| Variable | Example |
|----------|---------|
| `NEXTAUTH_URL` | `https://nexuscanon.com` |
| `NEXT_PUBLIC_API_URL` | `https://api.nexuscanon.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://nexuscanon.com` |
| `NEXT_PUBLIC_APP_URL` | `https://nexuscanon.com` |

### CORS

| Variable | Example |
|----------|---------|
| `ALLOWED_ORIGINS` | `https://nexuscanon.com` (no `http://localhost` in prod) |

---

## 2. Database (Neon)

- [ ] `DATABASE_URL` uses **pooled** URL (`-pooler` in hostname)
- [ ] `DATABASE_URL_MIGRATIONS` uses **direct** URL (no pooler)
- [ ] `WORKER_DATABASE_URL` uses **direct** URL (Graphile LISTEN/NOTIFY)
- [ ] Connection strings include `sslmode=require&sslnegotiation=direct`
- [ ] Neon Console: IP Allow list (restrict to Vercel/Railway IPs)
- [ ] Neon Console: Branch protection enabled for production branch
- [ ] Scale-to-zero: Disabled for prod if cold starts are unacceptable

See `docs/neon-optimization.md` for details.

---

## 3. Storage (R2)

- [ ] `S3_*` vars set for API (R2 is S3-compatible)
- [ ] `R2_*` vars set for web app
- [ ] Bucket CORS configured for upload domains

---

## 4. Redis

- [ ] `REDIS_URL` or `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD` set
- [ ] Required for rate limiting and session storage

---

## 5. Observability

- [ ] `OTEL_ENABLED=true` for production
- [ ] `OTEL_EXPORTER_OTLP_*` and `OTEL_TOKEN` configured
- [ ] `SENTRY_DSN` set for error tracking

---

## 6. Security

- [ ] `ENABLE_DEV_CREDENTIALS=false`
- [ ] OAuth redirect URIs updated in Google/GitHub console
- [ ] No placeholder secrets (`change-in-production`, `your-*`, etc.)
- [ ] API validates `NEXTAUTH_SECRET` is not a placeholder in production

---

## 7. Pre-Deploy Commands

```bash
pnpm typecheck
pnpm test
pnpm check:all
pnpm db:migrate   # Run migrations against production DB (use DATABASE_URL_MIGRATIONS)
```

---

## 8. Post-Deploy Verification

- [ ] Health: `GET /healthz` and `GET /readyz` return 200
- [ ] Auth: Sign-in flow works
- [ ] API: Bearer token from NextAuth accepted by API
- [ ] CORS: Frontend can call API from production origin
