# contracts/shared — OWNERS

> **Package-wide rules (import boundaries, JSON-first types, barrel imports,
> file naming) are inherited from the root
> [`packages/contracts/OWNERS.md`](../../OWNERS.md).
> This file covers only what is specific to the `shared/` directory.**

## Purpose

Cross-cutting primitives used in **3 or more domains**.

`shared/` is not a junk drawer. **Default to domain folders.**
Escalate here only if a primitive meets **one of these two criteria**:

| Criterion                                | Examples                                 |
| ---------------------------------------- | ---------------------------------------- |
| Referenced across 3+ domain packages     | `InvoiceId` (AP + GL + evidence + audit) |
| Infrastructure cross-cut (always needed) | headers, envelopes, error codes          |

### Escape hatch (rare)

If a primitive genuinely belongs here but doesn't reach 3 domains yet, add a
comment at the top of the file pinning the reason:

```ts
// shared-exception: used by <invoice, supplier> because <reason>
```

Without that comment it will be moved to a domain folder at the next review.

---

## Files

| File             | Key exports                                                                                                                                                           | Notes                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `datetime.ts`    | `UtcDateTimeSchema`, `UtcDateTime`, `DateSchema`, `DateString`, `DateRangeSchema`, `DateRange`                                                                        | All timestamps must use `UtcDateTimeSchema` (no local offsets). All business dates must use `DateSchema`.   |
| `ids.ts`         | `UuidSchema`, `EntityIdSchema`, `brandedUuid()`, `CorrelationIdSchema`, `CorrelationId`, `OrgIdSchema`, `PrincipalIdSchema` + 6 cross-domain IDs (incl. `AuditLogId`) | Primitive layer — no deps; see ID rules below                                                               |
| `errors.ts`      | `ErrorCodeValues`, `ErrorCodeSchema`, `ErrorCode`, `ApiErrorSchema`, `ApiError`                                                                                       | Namespaced codes — see below                                                                                |
| `headers.ts`     | `CorrelationIdHeader`, `IdempotencyKeyHeader`, `OrgIdHeader`, `HeaderNameValues`, `HeaderName`                                                                        | **Constants only — no Zod**                                                                                 |
| `idempotency.ts` | `IdempotencyKeySchema`, `IdempotencyKey`                                                                                                                              | Infrastructure cross-cut — every command in every domain carries one                                        |
| `money.ts`       | `CurrencyCodeSchema`, `CurrencyCode`, `MoneySchema`, `Money`                                                                                                          | `bigint` minor units via `z.coerce.bigint()`                                                                |
| `pagination.ts`  | `CURSOR_LIMIT_DEFAULT`, `CURSOR_LIMIT_MAX`, `CursorParamsSchema`, `CursorParams`                                                                                      | Empty-string coercion via `z.preprocess`                                                                    |
| `envelope.ts`    | `ErrorEnvelopeSchema`, `ErrorEnvelope`, `makeSuccessEnvelopeSchema()`, `SuccessEnvelope<T>`, `makeCursorEnvelopeSchema()`, `CursorEnvelope<T>`                        | Schema factories (not constants) — depends on `ids` + `errors`                                              |
| `outbox.ts`      | `JsonValueSchema`, `JsonValue`, `JsonObjectSchema`, `JsonObject`, `OutboxEventSchema`, `OutboxEvent`                                                                  | Depends on `ids`; `.passthrough()` for forward-compat                                                       |
| `audit.ts`       | `AuditActionValues`, `AuditAction`, `AuditEntityTypeValues`, `AuditEntityType`                                                                                        | Controlled vocabulary — no Zod, pure TS types. Adding a new action/entity type requires updating this file. |
| `audit-query.ts` | `AuditLogFilterSchema`, `AuditLogFilter`, `AuditLogRowSchema`, `AuditLogRow`                                                                                          | Read-path Zod schemas for querying the audit log. Depends on `audit.ts`, `ids.ts`, `datetime.ts`.           |
| `permissions.ts` | `PermissionValues`, `Permission`, `PERMISSION_SCOPES`                                                                                                                 | Central permission key registry — every guard references these constants. Pattern: `scope.entity.action`.    |
| `sequence.ts`    | `SequenceEntityTypeValues`, `SequenceEntityType`                                                                                                                      | Closed set of entities using gap-free numbering; adding a value requires seeding sequence rows              |
| `index.ts`       | Domain barrel — re-exports all of the above                                                                                                                           | Primitives before composites; exports only, no logic                                                        |

---

## Rule: `headers.ts` — constants only, never Zod

`headers.ts` must export **only string constants** (and literal unions if needed).
No Zod schemas. No imports.

**Why:** Headers are consumed in every layer including edge runtimes and the
browser. Keeping them Zod-free avoids accidental bundle bloat and runtime
coupling.

```ts
// ✅ headers.ts
export const OrgIdHeader = "x-org-id" as const;

// ❌ never in headers.ts
export const OrgIdHeaderSchema = z.string(); // → move to envelope or request contract
```

If you need to _validate_ a header value, put the schema in the relevant
request-contract file (e.g. `iam/user.entity.ts`) or a dedicated
`headers.schema.ts` file.

---

## Rule: `ids.ts` — factory + justification required

- **`OrgId` / `PrincipalId`** live here unconditionally (every domain needs them).
- **Domain IDs** (`InvoiceId`, `SupplierId`, …) live here only if referenced across
  3+ domains. Each has a `// cross-domain: referenced by …` comment as proof.
- New domain IDs go in their **own domain folder** first. Escalate to `shared/`
  only once the third cross-domain reference appears.
- Use `brandedUuid('MyEntityId')` in domain folders to keep branding consistent:
  ```ts
  // invoice/invoice.entity.ts
  import { brandedUuid } from "@afenda/contracts";
  export const InvoiceIdSchema = brandedUuid("InvoiceId");
  ```

---

## Rule: `money.ts` — bigint minor units, no arithmetic

- `amountMinor` is `z.coerce.bigint()` — accepts `bigint` directly or numeric
  strings from JSON. No safe-integer ceiling.
- **Negative values are allowed** (credit memos, refunds).
- `currencyCode` must be ISO 4217 uppercase — the schema **rejects** lowercase; callers must normalise before parsing.
- **Rounding and FX conversion live in `@afenda/core`**, not here.
- **Locale-aware formatting** lives in `@afenda/ui/money`, not here or in core.

---

## Rule: `errors.ts` — scoped namespace required

All error codes follow `SCOPE_NOUN_REASON` screaming snake case.

| Prefix     | Domain                                         |
| ---------- | ---------------------------------------------- |
| `SHARED_*` | Infrastructure (auth, validation, idempotency) |
| `AP_*`     | Accounts payable / invoice workflow            |
| `IAM_*`    | Identity & access management                   |
| `GL_*`     | General ledger                                 |
| `SUP_*`    | Supplier management                            |
| `DOC_*`    | Document / evidence                            |

`ErrorCodeValues` is exported as `as const` so callers (DB check constraints,
`switch` statements, test fixtures) can import the list without pulling Zod.

Removing or renaming a code is a **breaking change** — deprecate for one major
version before removal.

---

## Rule: `outbox.ts` — versioning discipline

- `type` — dot-namespaced SCREAMING_SNAKE, minimum two segments: `"AP.INVOICE_SUBMITTED"`, `"GL.JOURNAL.LINE_POSTED"`. Each segment starts with an uppercase letter.
- `version` — `"1"` or `"1.0"`. Additive optional payload fields do **not** require a bump. Breaking changes (removed/renamed fields) **must** bump MAJOR.
- `occurredAt` — UTC only; `Z` suffix is enforced by `.refine()`.
- `payload` — must use `JsonObjectSchema` (recursive JSON-safe values). No `Date`, `BigInt`, `Map`, or class instances.
- Top-level envelope is `.passthrough()` — unknown envelope fields (e.g. future `traceparent`) don't break old workers.

---

## Rule: `index.ts` — exports only

`shared/index.ts` must contain only `export * from "..."` lines.
No imports that execute code, no side effects, no logic.
Keep export order stable — reordering is a git-diff noise source.

---

## Does NOT Belong Here

- Domain-specific schemas (invoices, suppliers, GL accounts) → each domain's own dir
- Any import from another `@afenda/*` package
- Anything used by only one domain (without an approved escape-hatch comment)
- Zod schemas inside `headers.ts`
