# core/iam — OWNERS

> **Package-wide rules (import boundaries, no-Zod, service function shape,
> domain vs infra separation) are inherited from the root
> [`packages/core/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `iam/` directory.**

## Purpose

Identity & Access Management service layer: resolve request context from
JWT claims + DB lookups, org slug → UUID resolution.

**IAM services consume schemas and branded types from
`@afenda/contracts/iam` — they do not define schemas themselves.**

| ✅ Belongs                                                           | ❌ Never here                                                    |
| -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `resolvePrincipalContext()` — JWT claims → `RequestContext`          | Schema definitions (→ `@afenda/contracts/iam`)                   |
| `resolveOrgId()` — slug → branded `OrgId`                            | RBAC policy rules (→ `finance/sod.ts` or future `iam/policy.ts`) |
| `listPrincipalContexts()` — parsed `ContextItem[]` for hat switching | JWT signing/verifying, cookie parsing, session storage           |
| `hasPermission()` — O(1) Set-based permission check                  | Password hashing, MFA, OAuth provider config                     |
| Membership verification, role + permission aggregation               | Role-name checks (always use `Permissions.*`)                    |
| Future: impersonation guards, session management                     |                                                                  |

---

## File Conventions

| Pattern                     | Purpose                                                                       |
| --------------------------- | ----------------------------------------------------------------------------- |
| `*.ts`                      | Service functions — one primary responsibility per file                       |
| `__vitest_test__/*.test.ts` | Vitest unit tests in a dedicated subfolder (when the file has testable logic) |

## Files

| File              | Key exports                                                                                                                                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auth.ts`         | `resolvePrincipalContext(db, email, orgSlug, correlationId, partyRoleId?)` → `RequestContext \| null`, `listPrincipalContexts(db, principalId)` → `ContextItem[]` | 7-step query: find principal → resolve org → find memberships (ordered by `createdAt ASC` for determinism) → select hat → fetch roles (org-wide) → fetch permissions (global keys, org-scoped via role chain) → `RequestContextSchema.parse()` (deduplication + `permissionsSet`). `listPrincipalContexts` returns validated `ContextItem[]` with `partyName` resolved via party join. |
| `organization.ts` | `resolveOrgId(db, slug)` → `OrgId \| null`                                                                                                                        | Slug is trimmed + lowercased before lookup (canonical form). Returns branded `OrgId` via `OrgIdSchema.parse()`. DB column `organization.slug` is `UNIQUE NOT NULL`. Renamed from `tenant.ts` (ADR-0003).                                                                                                                                                                               |
| `permissions.ts`  | `hasPermission(ctx, permission)` → `boolean`                                                                                                                      | O(1) permission check via `ctx.permissionsSet.has()`. Separated from `auth.ts` to avoid pulling DB dependencies into test imports. Used by `finance/sod.ts`.                                                                                                                                                                                                                           |
| `index.ts`        | Domain barrel — re-exports `auth.ts` + `organization.ts` + `permissions.ts`                                                                                       | Exports only, no logic.                                                                                                                                                                                                                                                                                                                                                                |

---

## Cross-Domain Import Rule

Other core domains import IAM through the barrel:

```ts
import { resolveOrgId } from "../iam/index.js";
```

Never deep-path into `../iam/organization.js` from outside this directory.

---

## DB Tables Accessed

| Table                                    | Operation                                                         | File                                |
| ---------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| `iam_principal`                          | `SELECT` by email                                                 | `auth.ts`                           |
| `organization`                           | `SELECT` by slug                                                  | `organization.ts`                   |
| `membership` + `party_role`              | `SELECT` + `JOIN` by (principal, org), ordered by `createdAt ASC` | `auth.ts`                           |
| `iam_principal_role` + `iam_role`        | `SELECT` + `JOIN` by (principal, org)                             | `auth.ts`                           |
| `iam_role_permission` + `iam_permission` | `SELECT` + `JOIN` by roleIds                                      | `auth.ts`                           |
| `party` + `person`                       | `LEFT JOIN` for `partyName` resolution (COALESCE)                 | `auth.ts` (`listPrincipalContexts`) |

All queries are **read-only**. Write operations (user creation, role assignment)
belong in future `iam/admin.ts` or the API layer.

---

## RBAC Model (Hard)

- **Permissions are global** (`iamPermission` has no `orgId`).
- **Roles are org-scoped** (`iamRole` carries `orgId`).
- **Role assignments are (principal, org)-scoped** — NOT hat-specific.
  `iamPrincipalRole` PK is `(orgId, principalId, roleId)` with no `partyRoleId`.
  Switching hats does not change the permission set.
- **Org scoping of permissions** is enforced by the `iamPrincipalRole` query
  (filtered by `orgId`), not by `iamRolePermission` (which has no `orgId`).
  This is secure because roleIds are already org-specific through the chain.
- **Membership revocation not yet supported.** Schema lacks `revokedAt` / `status`.
  When those columns land, all membership queries MUST filter by
  `isNull(membership.revokedAt)` — fail-closed.
- **Deterministic hat selection:** memberships ordered by `createdAt ASC`.
  Oldest membership is the default when no explicit `partyRoleId` is provided.

---

## Future Growth

- `policy.ts` — RBAC policy evaluation, permission inheritance rules
- `session.ts` — session creation, refresh, invalidation
- `impersonation.ts` — admin impersonation with audit trail
- Hat-specific roles — when needed, add `partyRoleId` to `iamPrincipalRole`
  and filter by it in `resolvePrincipalContext`.
- When a second file beyond `auth.ts`/`organization.ts` lands, the nesting is
  already correct — no restructure needed.

## Does NOT Belong Here

- `RequestContextSchema`, `Permissions`, `RoleKey` definitions → `@afenda/contracts/iam`
- DB table DDL (`iam_principal`, `iam_role`, etc.) → `@afenda/db`
- HTTP authentication middleware → `apps/api`
- Better Auth provider configuration → `apps/web/src/lib/auth.ts`
