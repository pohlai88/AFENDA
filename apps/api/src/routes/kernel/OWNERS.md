# api/routes/kernel — OWNERS

## Purpose

Fastify route handlers for the `kernel` pillar.
Covers: identity (IAM), audit, evidence, capabilities, settings.

---

## Import Rules

- Imports `@afenda/core` (services) and `@afenda/contracts` (schemas).
- Never imports `@afenda/db` directly — all DB access through core service calls.
- Route files export a single `async function *Routes(app: FastifyInstance)`.

---

## Files

| File | Routes | Permission |
|------|--------|------------|
| `identity.ts` | `/v1/me`, `/v1/me/contexts` | Authenticated |
| `audit.ts` | `GET /v1/audit-logs` | `admin.org.manage` |
| `evidence.ts` | `POST /v1/evidence/presign`, `POST /v1/documents` | `evidence.attach` |
| `capabilities.ts` | `GET /v1/capabilities/:entityKey` | Authenticated |
| `settings.ts` | `GET /v1/settings`, `PATCH /v1/settings` | `admin.settings.read/write` |

---

## PR Checklist

- [ ] New routes registered in `apps/api/src/index.ts`
- [ ] Permission inline check uses `req.auth.permissionsSet.has(...)` pattern
- [ ] PATCH routes include `Idempotency-Key` header check
- [ ] Error handler delegates to `SettingsError` / domain error pattern
