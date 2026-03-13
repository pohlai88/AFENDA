# Production Readiness Checklist

Pre-deployment validation for AFENDA (NexusCanon) production environments.

---

## 1. Environment Variables

### Required Secrets (must be real values, not placeholders)

| Variable                       | Purpose                         | Generate                                                                      |
| ------------------------------ | ------------------------------- | ----------------------------------------------------------------------------- |
| `NEXTAUTH_SECRET`              | JWT signing, session encryption | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_CHALLENGE_SECRET`        | MFA, invite, reset token HMAC   | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`    |
| `AUTH_EVIDENCE_SIGNING_SECRET` | Evidence export signatures      | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`    |

### Production URLs

| Variable               | Example                      |
| ---------------------- | ---------------------------- |
| `NEXTAUTH_URL`         | `https://nexuscanon.com`     |
| `NEXT_PUBLIC_API_URL`  | `https://api.nexuscanon.com` |
| `NEXT_PUBLIC_SITE_URL` | `https://nexuscanon.com`     |
| `NEXT_PUBLIC_APP_URL`  | `https://nexuscanon.com`     |

### CORS

| Variable          | Example                                                  |
| ----------------- | -------------------------------------------------------- |
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

### Treasury Wave 3 Migration Rollout (Required Before Treasury Release)

- [ ] Confirm migration file exists: `packages/db/drizzle/0043_treasury_lineage.sql`
- [ ] Confirm target branch/database for rollout (staging first, then production)
- [ ] Backup/PITR checkpoint created before applying migration
- [ ] Run migration in staging:

```bash
pnpm db:migrate
```

- [ ] Verify staging schema contains Wave 3 lineage objects:
  - [ ] `cash_position_snapshot_lineage`
  - [ ] `liquidity_forecast_bucket_lineage`
  - [ ] `liquidity_source_feed`
  - [ ] `forecast_variance`
- [ ] Verify Treasury lineage endpoints respond in staging:
  - [ ] `GET /v1/treasury/cash-position-snapshots/:id/lineage`
  - [ ] `GET /v1/treasury/liquidity-forecasts/:id/lineage`
- [ ] Run migration in production:

```bash
pnpm db:migrate
```

- [ ] Repeat schema + endpoint verification in production
- [ ] Record migration completion timestamp, operator, and environment in release notes

See `docs/neon-optimization.md` for details.

---

## 3. Storage (R2)

- [ ] Queue target exists for bucket event notifications (default: `afenda-r2-events`)
- [ ] Notification rules send `object-create` and `object-delete` to queue
- [ ] Keep buckets private: `r2.dev` disabled and no public custom domain unless explicitly approved
- [ ] Tenant constraint model documented: bucket policies are account-wide; tenant isolation is enforced in app layer by `orgId`-scoped object keys and API permissions
- [ ] Queue consumer worker deployed (`wrangler deploy`) and reading `afenda-r2-events`
- [ ] Dead-letter queue exists (`afenda-r2-events-dlq`) with retry policy configured
- [ ] Optional webhook sink configured via `R2_EVENT_WEBHOOK_URL` + `R2_EVENT_WEBHOOK_SECRET`
- [ ] Run and verify:

```bash
pnpm r2:list
pnpm r2:queue:list
pnpm r2:queue:create
pnpm r2:queue:create:dlq
pnpm r2:worker:deploy
pnpm r2:notify:apply
# Optional if backup bucket exists:
pnpm r2:notify:apply:all
pnpm r2:cors:apply
pnpm r2:cors:list:attachments
# Optional if backup bucket exists:
pnpm r2:cors:apply:all
pnpm r2:cors:list:backup
pnpm r2:local-uploads:get:attachments
pnpm r2:local-uploads:get:backup
pnpm r2:dev-url:get:attachments
pnpm r2:dev-url:get:backup
pnpm r2:lifecycle:list:attachments
pnpm r2:lifecycle:list:backup
pnpm r2:lock:list:attachments
pnpm r2:lock:list:backup
pnpm r2:notification:list:attachments
pnpm r2:notification:list:backup
pnpm r2:queue:info
pnpm r2:queue:info:dlq
pnpm r2:domain:list:attachments
pnpm r2:domain:list:backup
# Full audit:
pnpm r2:audit:all
```

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
