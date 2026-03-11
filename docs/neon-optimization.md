# Neon Optimization Guide

Optimization recommendations for AFENDA's Neon Serverless Postgres setup across **capability**, **performance**, **quality**, **cost**, and **security**.

---

## Implemented Optimizations

### 1. Connection Timeouts (Cold Start Resilience)

- **`packages/db/src/client.ts`**: When `DATABASE_URL` contains `neon.tech`, `connectionTimeoutMillis` defaults to **10s** (vs 5s for local). Accommodates Neon scale-to-zero cold starts (~300–500ms).
- **`packages/db/src/migrate.ts`**: Same 10s timeout for migrations when connecting to Neon.

### 2. Migrations Use Direct Connection

- **`packages/db/src/migrate.ts`**: Prefers `DATABASE_URL_MIGRATIONS` when set. Use the **direct** (non-pooler) URL for DDL, advisory locks, and `CREATE INDEX CONCURRENTLY`.
- Pooled connections (PgBouncer) use transaction mode and don't support some DDL patterns.

### 3. SSL Negotiation

- **`.env.config`**: `sslnegotiation=direct` added to connection strings for faster SSL handshake (Postgres 17+ client).

### 4. Connection Pooling

- **Runtime**: Use pooled URL (`-pooler` in hostname) for API and web.
- **Worker**: Use **direct** URL (`WORKER_DATABASE_URL`) — Graphile Worker uses LISTEN/NOTIFY, which PgBouncer (transaction mode) does not support.
- **Migrations**: Use direct URL (no `-pooler`).

### 5. Pool Tuning (Env)

- **`DB_POOL_MAX`**: Override pool size (default 10). Use 5 for Neon serverless to reduce double-pooling.
- **`DB_IDLE_TIMEOUT_MS`**: Override idle timeout (default 30s). Use 10000 for Neon scale-to-zero to release connections sooner.

### 6. Connection Retry & Warm-up

- **API startup**: When `DATABASE_URL` contains `neon.tech`, runs `warmUpDbWithRetry` (3 retries, exponential backoff) to handle cold starts.
- Pool size: default 10 is appropriate when using Neon's PgBouncer (10k client connections, ~377 concurrent transactions per user/DB at 1 CU).

---

## Neon Console Recommendations

### Performance & Cost

| Setting | Recommendation | Rationale |
|--------|----------------|-----------|
| **Scale to zero** | 5 min (default) or disable for prod | Balance cost vs cold-start latency. Disable for always-on prod. |
| **Autoscaling** | Min 0.25 CU, Max 8 CU | Pay for what you use; scale up under load. |
| **Region** | `ap-southeast-1` (match app) | Minimize latency; same region as Vercel/Railway. |

### Security

| Setting | Recommendation | Rationale |
|--------|----------------|-----------|
| **IP Allow** (Scale plan) | Restrict to Vercel/Railway IPs | Limit DB access to known deployment IPs. Configure in Neon Console → Project Settings → IP Allow. |
| **API keys** | Rotate periodically; use least-privilege | Revoke old `neonctl-init-*` keys in Console. |
| **Connection string** | `sslmode=require` | Already configured. |

### Quality

| Setting | Recommendation | Rationale |
|--------|----------------|-----------|
| **Branch protection** | Protect `production` branch | Prevent accidental deletes. |
| **Point-in-time restore** | Default retention | Use for recovery if needed. |

---

## Connection String Checklist

```
# Runtime (pooled) — API, web
postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db?sslmode=require&channel_binding=require&sslnegotiation=direct

# Direct (no pooler) — migrations, worker, pg_dump
postgresql://user:pass@ep-xxx.region.aws.neon.tech/db?sslmode=require&sslnegotiation=direct
```

- `-pooler` = PgBouncer (API, web)
- No `-pooler` = direct Postgres (migrations, **worker** — LISTEN/NOTIFY, pg_dump, logical replication)

**Worker:** Set `WORKER_DATABASE_URL` to the direct URL. Graphile Worker uses LISTEN/NOTIFY; PgBouncer transaction mode does not support it.

---

## Cost Optimization

1. **Scale to zero**: Enable for dev/staging; disable for prod if cold starts are unacceptable.
2. **Autoscaling**: Set min CU low (0.25) so idle costs stay minimal.
3. **Branch lifecycle**: Delete unused preview branches.
4. **Storage**: Monitor `branch_logical_size`; archive old data if needed.

---

## Monitoring

- **Neon Console** → Monitoring: connections, compute usage, storage.
- **Pooler graphs**: "Pooler client connections" and "Pooler server connections" for pool health.
- **Slow queries**: Use Neon's slow query insights if available.

---

## References

- [Neon Connection Pooling](https://neon.com/docs/connect/connection-pooling)
- [Connection Latency & Timeouts](https://neon.com/docs/connect/connection-latency)
- [Scale to Zero](https://neon.com/docs/introduction/scale-to-zero)
- [Autoscaling](https://neon.com/docs/introduction/autoscaling)
- [IP Allow](https://neon.com/docs/introduction/ip-allow)
