# Auth Operator Actions

Manual security operations available to admin users. Each action emits an audit event.

## API Routes

| Action | Method | Route | Body |
|--------|--------|-------|------|
| Revoke challenge | POST | `/api/internal/security/revoke-challenge` | `{ challengeId?, rawToken?, reason? }` |
| Retry failed outbox | POST | `/api/internal/security/retry-outbox` | `{ eventId }` |
| Force dead-letter outbox | POST | `/api/internal/security/dead-letter-outbox` | `{ eventId, reason? }` |
| Purge expired challenges | POST | `/api/internal/security/purge-challenges` | — |
| Revoke user session | POST | `/api/internal/security/revoke-session` | `{ targetUserId, reason? }` |
| Acknowledge anomaly | POST | `/api/internal/security/acknowledge-anomaly` | `{ anomalyCode, note? }` |

All routes require an admin session (`session.user.roles.includes("admin")`).

## Audit Events

Each action publishes to the auth audit outbox:

- `auth.ops.challenge_revoked` — challenge revoked by operator
- `auth.ops.outbox_retry` — failed event retried
- `auth.ops.outbox_dead_letter` — event force-dead-lettered
- `auth.ops.challenges_purged` — expired challenges purged
- `auth.ops.session_revoked` — user session revoked
- `auth.ops.anomaly_acknowledged` — anomaly acknowledged

## Session Revocation

When an operator revokes a user's session, a row is inserted into `auth_session_revocations`. To enforce revocation, the NextAuth JWT callback must check this table:

```ts
// In auth-options.ts jwt callback:
const revoked = await isUserSessionRevoked(user.id);
if (revoked) {
  // Invalidate token — return null or throw
}
```

**TODO:** Wire `isUserSessionRevoked` into the JWT callback.

## Database Migrations

New tables require migrations:

- `auth_session_revocations` — session revocation records
- `auth_anomaly_acknowledgements` — anomaly acknowledgement records

Run `pnpm db:generate` to generate migrations (may require fixing BigInt serialization in drizzle-kit). Or create migration SQL manually.
