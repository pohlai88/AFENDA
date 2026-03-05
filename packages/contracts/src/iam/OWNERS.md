# contracts/iam — OWNERS

> **Package-wide rules (import boundaries, JSON-first types, barrel imports,
> file naming) are inherited from the root
> [`packages/contracts/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `iam/` directory.**

## Purpose

Identity & Access Management schemas: organizations, principals, roles, permissions.

**IAM contracts define identifiers and vocabulary — not authorization decisions.**

| ✅ Belongs | ❌ Never here |
|---|---|
| Permission keys, role keys, request context shape | `isAllowed()`, role inheritance, SoD matrices |
| Canonical entity DTOs (read shapes) | Policy engines, default role assignment rules |
| Create/update command schemas | JWT signing/verifying, cookie parsing, session persistence |
| `*Values` arrays for DB enum sync | Password hashing, MFA, OAuth provider config |

---

## Files

| File | Key exports | Notes |
|---|---|---|
| `role.entity.ts` | `Permissions`, `PermissionKey`, `PermissionKeyValues`, `PermissionKeySchema`, `RoleKeyValues`, `RoleKeySchema`, `RoleKey` | Single source of truth for all keys; see rules below |
| `tenant.entity.ts` | `OrgTypeValues`, `OrgTypeSchema`, `OrgType`, `OrgSlugSchema`, `OrgSlug`, `OrgSchema`, `Org`, `CreateOrgSchema`, `CreateOrg` | `CreateOrgSchema` is standalone (not a `.pick()`) |
| `user.entity.ts` | `PrincipalSchema`, `Principal`, `RequestContextSchema`, `RequestContext` | `RequestContextSchema` must stay lean — see rule below |
| `index.ts` | Domain barrel — re-exports all of the above | Role vocabulary exported first (user.entity depends on it) |

> **Splitting rule:** Create/update schemas live in the same `*.entity.ts` file
> until it exceeds ~150 lines, then split into a `*.commands.ts` sibling.
> `CreateOrgSchema` is the current candidate for `tenant.commands.ts`.

---

## Rule: `RequestContextSchema` — claims only, no entity embedding

`RequestContextSchema` captures what is known from the request boundary (headers,
decoded JWT claims). It must not trigger or imply a DB lookup.

Allowed fields:
- `orgId` — from `OrgIdSchema`
- `principalId` — from `PrincipalIdSchema`
- `roles` — array of `RoleKeySchema`; duplicates removed at parse time
- `permissions` — array of `PermissionKeySchema`; duplicates removed at parse time
- `correlationId` — from `CorrelationIdSchema`

**Never embed full `PrincipalSchema` or `OrgSchema` inside `RequestContextSchema`.**
Lean = cheaper to pass across service boundaries and easy to serialise.

---

## Rule: `Permissions` — camelCase registry, wire-string values, no logic

`Permissions` is a const map from developer-friendly camelCase keys to the
wire-level dot-notation strings:

```ts
// ✅ registry const — allowed
export const Permissions = {
  apInvoiceApprove: "ap.invoice.approve",
  glJournalPost:    "gl.journal.post",
} as const;

// PermissionKeyValues and PermissionKeySchema are derived from Permissions — never maintained separately.

// ❌ never in contracts
export function isAllowed(ctx: RequestContext, key: PermissionKey): boolean { ... }
```

If you need per-permission metadata (description, scope) for UI labels, add it
in `@afenda/core` as a separate lookup table keyed by `PermissionKey`.

---

## Rule: `*Values` arrays — versioning and deprecation

`PermissionKeyValues` and `RoleKeyValues` are API surface.

- Removing or renaming a key is a **breaking change**.
- Add a `// @deprecated` comment for at least one major version before removal.
- Never reuse a removed key for a different meaning.
- New keys are non-breaking (additive).

---

## DB Alignment

DB schema may import only `*Values` arrays (and types via `import type`) from
contracts — never Zod schemas directly. This prevents Zod from being bundled
into edge/serverless DB workers.

```ts
// ✅ packages/db/src/schema/iam.ts
import { OrgTypeValues, RoleKeyValues } from '@afenda/contracts';
import type { OrgId, PrincipalId } from '@afenda/contracts';

export const orgTypeEnum = pgEnum('org_type', OrgTypeValues);
export const roleKeyEnum    = pgEnum('role_key',    RoleKeyValues);
```

---

## Belongs Here
- `OrgSchema` and org status values
- `PrincipalSchema`, `RequestContextSchema` (claims-only)
- `RoleKeySchema`, `PermissionKeySchema`, `Permissions` metadata const

## Does NOT Belong Here
- Database column definitions → `packages/db/src/schema/iam.ts`
- Permission-checking / SoD logic → `packages/core/src/sod.ts`
- JWT signing/verifying, cookie parsing, session persistence → `apps/api` or a dedicated auth package
- Password hashing, MFA, OAuth provider config → `packages/core/src/auth.ts` or API layer
- UI auth components → `apps/web`
