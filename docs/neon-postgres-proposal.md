# Neon PostgreSQL — Improvement, Enhancement & Optimization Proposal

Analysis of AFENDA's Neon usage and proposed changes across **capability**, **performance**, **quality**, **cost**, and **security**.

---

## Current Architecture Summary

| Consumer | Connection | Pool | Notes |
|----------|------------|------|-------|
| **API** (Fastify) | `DATABASE_URL` | `createDb()` → pg Pool (max 10) | ✅ Pooled URL, proper shutdown |
| **Web** (Next.js) | `DATABASE_URL` | `getDbForAuth()` singleton | ⚠️ Pool never closed; serverless = N pools |
| **Worker** (Graphile) | `WORKER_DATABASE_URL` or `DATABASE_URL` | Graphile internal | 🔴 **Must use direct** (LISTEN/NOTIFY) |
| **Migrations** | `DATABASE_URL_MIGRATIONS` or `DATABASE_URL` | Single Client | ✅ Direct URL supported |
| **Seed** | `DATABASE_URL` | Single Client | Pooled OK for bulk inserts |

---

## Critical Fixes

### 1. Worker Must Use Direct Connection (LISTEN/NOTIFY)

**Problem:** Graphile Worker uses PostgreSQL `LISTEN/NOTIFY` for job pickup. PgBouncer in **transaction mode** does not support `LISTEN/NOTIFY` — connections are returned to the pool after each transaction, breaking long-lived LISTEN subscriptions.

**Evidence:** [Graphile Worker #337](https://github.com/graphile/worker/issues/337) — "Connection terminated unexpectedly" with PgBouncer.

**Fix:** Set `WORKER_DATABASE_URL` to the **direct** (non-pooler) connection string when using Neon.

```env
# .env / .env.config
WORKER_DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require&sslnegotiation=direct
```

**Action:** Add `WORKER_DATABASE_URL` to `.env.config` and `.env.example` with the direct URL. Document in `docs/neon-optimization.md`.

---

### 2. Auth DB Pool Lifecycle (Web)

**Problem:** `getDbForAuth()` creates a pool but never closes it. The `pool` reference is discarded; only `db` is stored. In Next.js:
- **Serverless (Vercel):** Each function instance creates its own pool. Instances are recycled; pools eventually GC'd. Acceptable.
- **Long-running (custom server):** Pool persists; no explicit close. Minor leak risk on hot-reload.

**Fix (optional):** Store `{ db, pool }` and expose `closeAuthDb()` for graceful shutdown. Next.js doesn't have a built-in shutdown hook for serverless, so this is low priority.

---

## Performance Enhancements

### 3. Configurable Pool Size for Neon

**Current:** Fixed `max: 10` in `createDb()`.

**Proposal:** Support `DB_POOL_MAX` env var. When using Neon PgBouncer, client-side pool can be smaller (e.g. 5) since PgBouncer already pools. Reduces double-pooling overhead.

```typescript
// packages/db/src/client.ts
const poolMax = process.env.DB_POOL_MAX
  ? parseInt(process.env.DB_POOL_MAX, 10)
  : (opts.max ?? 10);
```

**Default:** Keep 10. Document `DB_POOL_MAX=5` for Neon serverless if needed.

---

### 4. Connection Retry for Cold Starts

**Current:** Single connection attempt; 10s timeout for Neon.

**Proposal:** Add retry with exponential backoff for Neon cold starts. First attempt often fails; retry usually succeeds once compute is awake.

```typescript
// Optional: wrap createDb or add connectWithRetry helper
// 2–3 retries, 1s initial delay, exponential backoff
```

**Priority:** Medium. Cold starts are ~300–500ms; 10s timeout usually suffices. Retry improves UX for first request after long idle.

---

### 5. Idle Timeout Tuning for Neon

**Current:** `idleTimeoutMillis: 30_000` (30s).

**Proposal:** For Neon with scale-to-zero, consider shorter idle timeout (e.g. 10s) so connections are released sooner, allowing Neon to suspend compute. Reduces cost.

**Trade-off:** More connection churn vs. lower compute cost. Test before applying.

---

## Quality & Reliability

### 6. Drizzle Config for Migrations

**Current:** `drizzle.config.ts` uses `DATABASE_URL`. Used by `drizzle-kit generate` (no connection) and `db:studio` (needs connection).

**Proposal:** For `db:studio` against Neon, pooled URL is fine. For consistency, optionally support `DATABASE_URL_MIGRATIONS` when running schema introspection. Low priority.

---

### 7. Seed Script Neon Timeout

**Current:** `seed.ts` uses raw `Client` with no connection timeout.

**Proposal:** Add `connectionTimeoutMillis: 10_000` when URL contains `neon.tech` (same as migrate.ts).

---

### 8. Health Check Warm-up

**Current:** `/readyz` runs `checkDbHealth(app.db)` — a simple `SELECT 1`.

**Proposal:** For Neon, the first health check after idle may trigger cold start. Consider a lightweight "warm-up" ping on API startup, or accept that first request may be slower. Document in runbooks.

---

## Security

### 9. WORKER_DATABASE_URL in .env.example

**Action:** Add `WORKER_DATABASE_URL` with comment: "Use direct URL (no -pooler) for Graphile Worker LISTEN/NOTIFY when using Neon."

---

### 10. IP Allow List (Neon Scale Plan)

**Action:** Document in `docs/neon-optimization.md`: Restrict DB access to Vercel/Railway deployment IPs via Neon Console → IP Allow.

---

## Cost Optimization

### 11. Scale-to-Zero vs Always-On

| Environment | Recommendation |
|-------------|----------------|
| Dev / Staging | Scale to zero (5 min default) |
| Production | Disable if cold starts hurt UX; or increase suspend timeout (e.g. 1 hr) |

**Current:** Project has `suspend_timeout_seconds: 0` (disabled). Verify intent.

---

### 12. Autoscaling Range

**Recommendation:** Min 0.25 CU, Max 8 CU. Monitor usage; adjust if needed.

---

## Implementation Priority

| # | Item | Effort | Impact | Priority | Status |
|---|------|--------|--------|----------|--------|
| 1 | Worker direct URL (`WORKER_DATABASE_URL`) | Low | High | **P0** | ✅ Done |
| 2 | Seed Neon timeout | Low | Low | P2 | ✅ Done |
| 3 | `DB_POOL_MAX` env | Low | Medium | P2 | ✅ Done |
| 4 | Connection retry (warmUpDbWithRetry) | Medium | Medium | P2 | ✅ Done |
| 5 | Auth DB pool close (`closeAuthDb`) | Low | Low | P3 | ✅ Done |
| 6 | Idle timeout tuning (`DB_IDLE_TIMEOUT_MS`) | Low | Medium | P3 | ✅ Done |

---

## Already Implemented (from prior work)

- ✅ Connection timeout 10s for Neon in `createDb` and `migrate.ts`
- ✅ `DATABASE_URL_MIGRATIONS` for migrations (direct URL)
- ✅ `sslnegotiation=direct` in connection strings
- ✅ `docs/neon-optimization.md` guide

---

## References

- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon: Pooled vs Direct](https://neon.com/docs/connect/choose-connection#pooled-vs-direct-connections)
- [Graphile Worker #337 — PgBouncer](https://github.com/graphile/worker/issues/337)
- [Neon Connection Latency](https://neon.com/docs/connect/connection-latency)
