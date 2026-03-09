# General Settings — Implementation Plan v2

> Odoo-inspired system-wide configuration. Placed in `kernel/governance/settings`.

**Status:** Accepted with amendments — ready for Phase 1 execution  
**Date:** 2026-03-06  
**References:** PROJECT.md §18, ADR-0005 §3.4 / §5.1–5.6  

---

## 1. Overview

General Settings provides a single, org-scoped configuration surface.

**Phase 1 scope (this document):** 4 keys, full stack, proven end-to-end.

| Key | Type | UI control |
|-----|------|------------|
| `general.units.weightUnit` | `"kg" \| "lb"` | Radio/select |
| `general.units.volumeUnit` | `"m3" \| "ft3"` | Radio/select |
| `general.email.buttonText` | `string` (1–80 chars) | Text input |
| `general.email.buttonColor` | `string` (hex) | Color input |

These 4 keys are enough to prove: enum validation, string validation, GET/PATCH flow,
effective-value reads, atomic batch writes, audit logging, permissions, and web Save/Discard UX.

All other categories (users/invitations, companies, languages, document layout, discuss,
SMTP, OAuth, AI keys) belong to later phases exactly as catalogued in §11.

---

## 2. Architecture Placement

| Concern | Pillar | Module | Layer |
|---------|--------|--------|-------|
| Settings storage & service | kernel | governance/settings | contracts + db + core |
| Settings API | kernel | governance/settings | api route |
| Settings UI | kernel | governance/settings | web page group |

### Import chain

```
contracts/kernel/governance/settings  (Zod, no monorepo deps)
            ↓
db/kernel/governance/settings         (Drizzle, imports *Values only — no Zod)
            ↓
core/kernel/governance/settings       (service + queries, joins contracts + db)
            ↓
api/routes/kernel/settings            (Fastify, imports core + contracts)
            ↓
web/(kernel)/governance/settings      (Next.js RSC, imports contracts + ui only)
```

**Hard constraint:** `web` imports `@afenda/contracts` and `@afenda/ui` only. Never
`@afenda/core`, never `@afenda/db`.

---

## 3. Data Model

### 3.1 Storage strategy

Settings use a **key-value table** (`org_setting`) for all configuration values, plus the
existing `organization` table for typed company master-data fields.

**Company master data (name, slug, functional_currency) stays in `organization`.** These
are first-class business identity fields, not preferences. Updating them goes through a
dedicated `PATCH /v1/organization` command (IAM concern, outside this feature).

The key-value table is the right default for settings because:
- New keys never require migrations
- Values are typed at read-time via the per-key registry (§4)
- Low write volume eliminates performance concerns
- All changes flow through the same service and audit path

### 3.2 `org_setting` table — lean schema

```
SQL name: org_setting

Columns:
  id                   uuid        PK   defaultRandom()
  org_id               uuid        NOT NULL   FK → organization(id)  ON DELETE CASCADE
  key                  text        NOT NULL
  value_json           jsonb       NOT NULL
  updated_at           timestamptz NOT NULL   defaultNow()
  updated_by           uuid        FK → iam_principal(id)  ON DELETE SET NULL

Constraints:
  UNIQUE (org_id, key)
  INDEX  on (org_id)
  RLS    rlsOrg

Notes:
  - No created_at / created_by. Audit log is the truth trail for history.
  - updated_at is intentionally mutable; this is config, not an append-only truth table.
  - value_json is untyped at DB level; typed by the per-key value schema at service boundary.
  - DO NOT add a contract-db-sync gate pair for this table. value_json is intentionally
    polymorphic (one column covers all value types). Adding a sync pair would produce
    false violations. Add a comment in tools/gates/contract-db-sync.mjs noting exclusion
    by design.
```

**DB helpers to use:** `tsz()`, `rlsOrg`, `orgIdCol()` from `schema/_helpers.ts`.
Do not use `new Date()` anywhere in the service layer — use `sql\`now()\`` for DB timestamps.

---

## 4. Setting Registry — Three Distinct Concepts

The most important structural decision in this plan. These three things are different
concerns and must live in separate files.

### 4.1 Key vocabulary (`setting-keys.ts` — no Zod, safe for DB import)

```ts
export const SettingKeyValues = [
  "general.units.weightUnit",
  "general.units.volumeUnit",
  "general.email.buttonText",
  "general.email.buttonColor",
] as const;

export type SettingKey = (typeof SettingKeyValues)[number];
```

Pattern: identical to `PermissionValues` and `AuditActionValues` — pure `as const` array,
no Zod, importable by `@afenda/db`.

### 4.2 Per-key metadata (`settings.registry.ts` — in `core`, not contracts)

```ts
import type { SettingKey } from "@afenda/contracts";
import type { JsonValue } from "@afenda/contracts";

type SettingCategory =
  | "general"
  | "email"
  | "discuss"
  | "permissions"
  | "integrations";

type SettingScope = "org" | "platform";

export type SettingDefinition = {
  key: SettingKey;
  category: SettingCategory;
  scope: SettingScope;
  secret: boolean;       // if true: never return value in API responses; return masked sentinel
  mutable: boolean;      // if false: read-only at runtime (future use)
  defaultValue: JsonValue; // merged in getEffectiveSettings()
};

export const SETTING_REGISTRY: Record<SettingKey, SettingDefinition> = {
  "general.units.weightUnit": {
    key: "general.units.weightUnit",
    category: "general",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "kg",
  },
  "general.units.volumeUnit": {
    key: "general.units.volumeUnit",
    category: "general",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "m3",
  },
  "general.email.buttonText": {
    key: "general.email.buttonText",
    category: "email",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "Contact Us",
  },
  "general.email.buttonColor": {
    key: "general.email.buttonColor",
    category: "email",
    scope: "org",
    secret: false,
    mutable: true,
    defaultValue: "#000000",
  },
};
```

**Why in core, not contracts?** The `SettingDefinition` type references `JsonValue` (from
contracts/execution/outbox). More importantly, the registry drives service-layer logic
(default merging, secret masking). Core is the right join point.

### 4.3 Per-key value schemas (`settings.value-schemas.ts` — in `core`)

```ts
import { z } from "zod";
import type { SettingKey } from "@afenda/contracts";

const HexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Must be a 6-digit hex color (#rrggbb)");

export const SETTING_VALUE_SCHEMAS: Record<SettingKey, z.ZodTypeAny> = {
  "general.units.weightUnit": z.enum(["kg", "lb"]),
  "general.units.volumeUnit": z.enum(["m3", "ft3"]),
  "general.email.buttonText": z.string().trim().min(1).max(80),
  "general.email.buttonColor": HexColorSchema,
};
```

This is the validation executed in the service layer before any DB write. An unknown key
(not in `SETTING_VALUE_SCHEMAS`) is rejected with `CFG_SETTING_KEY_UNKNOWN`.

**Why separate from the registry?** Key metadata and value validation are different
concerns. The registry is read at query time (default merging, masking). The value schema
map is read at write time (validation). Keeping them separate prevents the service from
becoming a switch-statement mess as keys grow.

### 4.4 Platform settings — excluded entirely

`developer.*` and any `scope: "platform"` settings **must not** enter `SettingKeyValues`,
`SETTING_REGISTRY`, or `/v1/settings` in Phase 1.

The `org_setting` table enforces `org_id NOT NULL`. Platform config has no org — mixing
the vocabularies creates wrong assumptions in the service and UI that are expensive to
unwind later.

Platform developer mode stays as env vars. When a proper platform-scoped config surface
is needed, it gets its own module, table, and route. Not this one.

---

## 5. API Contract — Explicit Decisions

### 5.1 GET /v1/settings — returns **effective values**

Effective = system defaults merged with persisted org overrides.

```
GET /v1/settings
GET /v1/settings?keys=general.units.weightUnit,general.units.volumeUnit
```

Permission: `admin.settings.read`

Response:
```json
{
  "data": {
    "general.units.weightUnit": { "value": "kg", "source": "default" },
    "general.units.volumeUnit": { "value": "m3", "source": "stored" },
    "general.email.buttonText": { "value": "Contact Us", "source": "default" },
    "general.email.buttonColor": { "value": "#000000", "source": "stored" }
  },
  "correlationId": "uuid"
}
```

`source: "default"` — value comes from `SETTING_REGISTRY[key].defaultValue`.  
`source: "stored"` — value is an org override from `org_setting`.

**Why effective values?** An empty org returns a complete, renderable settings form.
The web page never needs to know defaults separately. Future UI autogeneration reads one
clean response shape.

**Secret keys:** If a key has `secret: true` in the registry, its value is replaced with
`"***"` and `source` reflects reality. Phase 1 has no secret keys, but the masking path
is implemented now so it is never retrofitted.

**Unknown `keys` query params:** Rejected with `400 CFG_SETTING_KEY_UNKNOWN`. Silent
ignore was considered and rejected — a typo'd key returning an apparent default is
a hidden client bug. PATCH already rejects unknown keys; GET must be consistent.
Valid keys with no stored override return `source: "default"` normally.

### 5.2 PATCH /v1/settings — atomic, validated, null-policy-explicit

```
PATCH /v1/settings
Idempotency-Key: <uuid>  (header, required by idempotency plugin)
```

Permission: `admin.settings.write`

Body schema (`UpdateSettingsCommandSchema`):
```ts
z.object({
  idempotencyKey: IdempotencyKeySchema,   // also in body, matches existing command pattern
  updates: z.array(
    z.object({
      key: z.enum(SettingKeyValues),
      value: JsonValueSchema,             // validated per-key in service layer
    })
  ).min(1).max(50),
})
```

**Atomicity:** The entire updates array is processed in a single DB transaction. If any
update fails (unknown key, invalid value, DB error), the transaction is rolled back and
nothing is persisted. No partial saves.

**Validation order (service layer):**
1. Reject unknown keys → `CFG_SETTING_KEY_UNKNOWN` (400)
2. Validate each value against `SETTING_VALUE_SCHEMAS[key]` → `CFG_SETTING_INVALID_VALUE` (400)
3. Begin transaction → upsert all rows → write audit row → commit

**Null policy (Model B):** `null` means "remove this org's override and fall back to
default." The service deletes the `org_setting` row when `value === null`. The next GET
will return `source: "default"` for that key. This is explicit — `null` is not silently
ignored and does not mean "set the literal value null."

**Omitted keys:** Keys not in the `updates` array are unchanged.

**Response:** Same shape as GET — the effective values for the keys that were in
the `updates` array only (not the full settings object).

### 5.3 Typed discriminated union for web/core callers

The raw `{key, value}` wire format is correct for the API. Inside web and core tests,
use a typed discriminated union to prevent mismatched key/value pairs at compile time:

```ts
// In contracts/kernel/governance/settings/settings.commands.ts
export type SettingUpdate =
  | { key: "general.units.weightUnit"; value: "kg" | "lb" }
  | { key: "general.units.volumeUnit"; value: "m3" | "ft3" }
  | { key: "general.email.buttonText"; value: string }
  | { key: "general.email.buttonColor"; value: string };
```

This union is maintained alongside `SettingKeyValues`. When a new key is added to the
vocabulary, the union gets a new variant — the compiler catches the gap.

**Registry synchronization — mandatory checklist for every new key:**

Adding a key requires updates to all four of these in the same PR. Missing any one is a
latent bug; the CI gates do not currently catch this gap automatically.

| File | Required change |
|------|----------------|
| `setting-keys.ts` | Add to `SettingKeyValues` |
| `settings.commands.ts` | Add variant to `SettingUpdate` union |
| `settings.registry.ts` | Add entry to `SETTING_REGISTRY` with `defaultValue` |
| `settings.value-schemas.ts` | Add entry to `SETTING_VALUE_SCHEMAS` with Zod schema |

A type-level assertion can enforce the first three stay in sync:

```ts
// In settings.registry.ts — compile-time check
// Fails if a key is in SettingKeyValues but missing from SETTING_REGISTRY
type AssertRegistryCoverage = {
  [K in SettingKey]: (typeof SETTING_REGISTRY)[K];
};
```

Add a matching check in `settings.value-schemas.ts` for `SETTING_VALUE_SCHEMAS`.
These are zero-runtime assertions — they vanish after TypeScript compilation.

---

## 6. Permissions

### 6.1 New permission keys

Add to `packages/contracts/src/shared/permissions.ts`:

```ts
// Settings
"admin.settings.read",
"admin.settings.write",
```

`admin.` is the correct scope — it extends the existing `admin.org.manage` capability
taxonomy. `PERMISSION_SCOPES.admin` auto-picks these up via the existing `.filter()` call.
No changes to the `PERMISSION_SCOPES` object literal are needed.

### 6.2 Seed

`packages/db/src/seed.ts` must insert `admin.settings.read` and `admin.settings.write`
into `iam_permission` and assign both to the `admin` role. Without this step, the admin
principal will receive 403 on settings routes after `pnpm db:seed`.

### 6.3 Future scope (not Phase 1)

A potential `admin.settings.secrets.write` permission (for writing encrypted API keys)
belongs to Phase 3 when secrets are introduced. Do not define it now.

---

## 7. Audit

### 7.1 New audit action

Add to `packages/contracts/src/kernel/governance/audit/actions.ts`:

```ts
"settings.updated",
```

Do **not** add `settings.read`. Reads are not audited in this system.

### 7.2 New audit entity type

Add to `AuditEntityTypeValues` in the same file:

```ts
"setting",
```

Both arrays must be updated together. The audit service write uses:
- `action: "settings.updated"`
- `entityType: "setting"`
- `entityId: null` (no single row is "the" entity; the batch is)

### 7.3 Audit batching — one row per request

One `audit_log` row per PATCH request, not one per key and not grouped by namespace.

The `details` payload captures the changed keys with precision:

```json
{
  "changedKeys": ["general.units.weightUnit", "general.email.buttonColor"],
  "categories": ["general", "email"],
  "keyCount": 2
}
```

`categories` is a deduplicated array, not a single string. A single save can span
multiple categories (e.g., `general.units.*` + `general.email.*`). A scalar `category`
field would be wrong for any multi-category batch and must not be used.

Secret key values are **never included** in the details payload even in Phase 1 (future-
proof the masking path now). Non-secret new values may be included at implementation
discretion; old values should not be stored (no before/after diff in Phase 1 — log the
fact of change, not a changelog).

---

## 8. Outbox Events

No outbox event in Phase 1. The audit row is sufficient.

Phase 3 addition (if workers need to react to SMTP/integration config changes):

```ts
// kernel/execution/outbox/envelope.ts
// type:    "KERNEL.SETTINGS_UPDATED"
// version: "1"
// payload: { changedKeys: string[], categories: string[], orgId: string }
```

This is documented now so it is not invented ad-hoc in Phase 3.

---

## 9. Error Codes

Add to `packages/contracts/src/shared/errors.ts`:

```ts
// CFG — settings / configuration
"CFG_SETTING_INVALID_VALUE",
"CFG_SETTING_KEY_UNKNOWN",
// Reserved — not used in Phase 1:
// "CFG_SETTING_NOT_FOUND",
```

`CFG_` is the new scope prefix for configuration errors. These are transport-agnostic —
HTTP status mapping lives in core/api, not here.

**Phase 1 uses only `CFG_SETTING_KEY_UNKNOWN` and `CFG_SETTING_INVALID_VALUE`.**
`CFG_SETTING_NOT_FOUND` has no clear Phase 1 trigger: GET returns effective values
(never 404), PATCH null clears to default (not a not-found). The code is reserved in a
comment so the name is claimed and consistent when it is needed later. Do not add it to
`ErrorCodeValues` until there is a concrete route handler that returns it.

---

## 10. Web UI Structure

### 10.1 Route placement

Per ADR-0005 §5.6, governance pages (audit, evidence, settings) live under
`(kernel)/governance/`. Admin (`(kernel)/admin/`) is strictly observability.

```
apps/web/src/app/
  (kernel)/
    admin/            ← existing — insights, traces
    auth/             ← existing — signin
    governance/       ← NEW route group
      layout.tsx      ← governance navigation shell
      settings/
        layout.tsx    ← settings group sidebar (tabs: General, Emails, …)
        page.tsx      ← General Settings RSC (default tab)
        emails/
          page.tsx
        discuss/
          page.tsx
        contacts/
          page.tsx
        permissions/
          page.tsx
        integrations/
          page.tsx
        developer/
          page.tsx    ← Phase 5 — env-var backed, no org_setting writes
```

### 10.2 Navigation

The existing `(kernel)/admin/layout.tsx` NAV array is not modified. Settings navigation
lives inside `(kernel)/governance/settings/layout.tsx` (group sidebar tabs). The root
app layout may add a top-level "Settings" link to `/governance/settings`.

### 10.3 API client additions

`apps/web/src/lib/api-client.ts` — two new functions, following the existing
`apiFetch` + typed return shape pattern:

```ts
fetchSettings(keys?: SettingKey[]): Promise<SettingsResponse>
updateSettings(updates: SettingUpdate[], idempotencyKey: string): Promise<SettingsResponse>
```

Where `SettingsResponse` matches the GET shape (`Record<SettingKey, { value, source }>`).

### 10.4 RSC + client form pattern

Settings pages follow the same RSC-hydrates-client pattern as invoice list:

1. **Server component** (`page.tsx`) — calls `fetchSettings()`, passes result as props
2. **Client component** (`GeneralSettingsClient.tsx`, `"use client"`) — owns dirty/save
   state, renders form, calls `updateSettings()` on Save

### 10.5 UI component set

| Component | Purpose |
|-----------|---------|
| `SettingsSection` | Collapsible group with title and description |
| `SettingsField` | Single key input, typed by control (select, toggle, text, color) |
| `SettingsLink` | Navigation row ("→ Manage Users", with optional count badge) |
| `SettingsSaveBar` | Sticky Save/Discard footer, visible when form state is dirty |

All components use existing design tokens. No hardcoded color values (enforced by
`token-compliance` CI gate and `no-hardcoded-colors` ESLint rule).

### 10.6 Schema-driven field rendering

Even in Phase 1, the form should not hardcode business logic in JSX. A small
`SETTINGS_FIELD_UI` config object lives in the web layer (not in contracts or core):

```ts
// apps/web/src/app/(kernel)/governance/settings/settings-ui-config.ts
type FieldUIConfig = {
  label: string;
  description?: string;
  controlType: "select" | "text" | "color" | "toggle";
  options?: { value: string; label: string }[];
};

export const SETTINGS_FIELD_UI: Partial<Record<SettingKey, FieldUIConfig>> = {
  "general.units.weightUnit": {
    label: "Weight",
    description: "Define your weight unit of measure",
    controlType: "select",
    options: [{ value: "kg", label: "Kilograms (kg)" }, { value: "lb", label: "Pounds (lb)" }],
  },
  // ...
};
```

This config is for display only and does not duplicate validation logic.

---

## 11. Implementation — Phase 1 Steps

Follow the schema-is-truth order. Do not skip ahead.

### Step 1 — Contracts

**New files:**

| File | Contents |
|------|----------|
| `kernel/governance/settings/setting-keys.ts` | `SettingKeyValues` as-const + `SettingKey` type |
| `kernel/governance/settings/settings.entity.ts` | `OrgSettingSchema` (id, orgId, key, valueJson, updatedAt, updatedByPrincipalId) |
| `kernel/governance/settings/settings.commands.ts` | `UpdateSettingsCommandSchema`, `SettingUpdate` discriminated union |
| `kernel/governance/settings/settings.query.ts` | `SettingsQueryParamsSchema`, `SettingValueResponseSchema`, `SettingsResponseSchema` (explicit object — see note) |
| `kernel/governance/settings/index.ts` | Barrel re-export |

**Files to update:**

| File | Change |
|------|--------|
| `kernel/governance/index.ts` | Add `export * from "./settings/index.js"` |
| `shared/permissions.ts` | Add `"admin.settings.read"`, `"admin.settings.write"` to `PermissionValues` |
| `kernel/governance/audit/actions.ts` | Add `"settings.updated"` to `AuditActionValues`; add `"setting"` to `AuditEntityTypeValues` |
| `shared/errors.ts` | Add `CFG_SETTING_NOT_FOUND`, `CFG_SETTING_INVALID_VALUE`, `CFG_SETTING_KEY_UNKNOWN` |

**Implementation note — `SettingsResponseSchema`:** For Phase 1's 4 known keys, use an
explicit `z.object({...})` rather than a generic `z.record(...)`. A typed object gives
precise per-key serialization error messages, avoids open-ended `z.record` runtime
behavior, and documents the shape clearly for OpenAPI generation. Use `z.record` only
if the key set becomes dynamic or large.

```ts
const SettingValueResponseSchema = z.object({
  value: JsonValueSchema,
  source: z.enum(["default", "stored"]),
});

export const SettingsResponseSchema = z.object({
  "general.units.weightUnit": SettingValueResponseSchema,
  "general.units.volumeUnit": SettingValueResponseSchema,
  "general.email.buttonText": SettingValueResponseSchema,
  "general.email.buttonColor": SettingValueResponseSchema,
});
```

### Step 2 — DB

**New files:**

| File | Contents |
|------|----------|
| `schema/kernel/governance/settings.ts` | `orgSetting` pgTable (SQL: `"org_setting"`) |
| `drizzle/NNNN_org_setting.sql` | Migration — CREATE TABLE + UNIQUE + INDEX |

**Files to update:**

| File | Change |
|------|--------|
| `schema/kernel/governance/index.ts` | Add `export * from "./settings.js"` |
| `seed.ts` | Insert `admin.settings.read`, `admin.settings.write` into `iam_permission`; assign to admin role |

**Do NOT add** a `contract-db-sync` sync pair for `org_setting`. Add a comment in
`tools/gates/contract-db-sync.mjs` under `SYNC_PAIRS` explaining the exclusion:

```js
// org_setting is excluded by design: value_json is intentionally polymorphic
// (one column carries all setting value types). A 1:1 sync pair would produce
// false violations. Type safety is enforced by the per-key registry in core.
```

### Step 3 — Core

**New files:**

| File | Contents |
|------|----------|
| `kernel/governance/settings/settings.registry.ts` | `SETTING_REGISTRY`, `SettingDefinition` type |
| `kernel/governance/settings/settings.value-schemas.ts` | `SETTING_VALUE_SCHEMAS` per-key Zod map, `HexColorSchema` |
| `kernel/governance/settings/settings.service.ts` | `upsertSettings()` — validates, upserts in transaction, writes audit row |
| `kernel/governance/settings/settings.queries.ts` | `getEffectiveSettings()`, `getSettingsRaw()` (internal) |
| `kernel/governance/settings/index.ts` | Barrel + `instrumentService()` |

**Files to update:**

| File | Change |
|------|--------|
| `kernel/governance/index.ts` | Add settings barrel export |

**Service layer contract:**

```ts
// upsertSettings — called by API route handler
async function upsertSettings(
  db: DbClient,
  orgId: OrgId,
  updates: SettingUpdate[],
  actorPrincipalId: PrincipalId,
): Promise<EffectiveSettingsSlice>  // slice = only updated keys, effective values

// getEffectiveSettings — merges stored + defaults
async function getEffectiveSettings(
  db: DbClient,
  orgId: OrgId,
  keys?: SettingKey[],
): Promise<EffectiveSettings>  // all keys (or filtered), with source field

// getSettingsRaw — returns only stored rows (internal, not exposed via API)
async function getSettingsRaw(
  db: DbClient,
  orgId: OrgId,
): Promise<OrgSettingRow[]>
```

### Step 4 — API

**New files:**

| File | Contents |
|------|----------|
| `routes/kernel/settings.ts` | `settingsRoutes` — GET + PATCH, inline permission checks |

**Files to update:**

| File | Change |
|------|--------|
| `apps/api/src/index.ts` | Import `settingsRoutes`; register with `{ prefix: "/v1" }` |

Permission check pattern (no `requirePermission` helper exists — inline only):

```ts
if (!auth.permissionsSet.has("admin.settings.read")) {
  return reply.status(403).send({ error: { code: "SHARED_FORBIDDEN", message: "..." }, correlationId });
}
```

### Step 5 — Web

**New files:**

| File | Contents |
|------|----------|
| `(kernel)/governance/layout.tsx` | Governance route group layout |
| `(kernel)/governance/settings/layout.tsx` | Settings group sidebar nav |
| `(kernel)/governance/settings/page.tsx` | General Settings RSC |
| `(kernel)/governance/settings/GeneralSettingsClient.tsx` | `"use client"` form |
| `(kernel)/governance/settings/settings-ui-config.ts` | `SETTINGS_FIELD_UI` display config |

**Files to update:**

| File | Change |
|------|--------|
| `lib/api-client.ts` | Add `fetchSettings`, `updateSettings` |

### Step 6 — Tests

| File | What it tests |
|------|--------------|
| `core/.../settings/__vitest_test__/settings.service.test.ts` | `upsertSettings`: creates, updates, atomic rollback on invalid key, null clears override; `getEffectiveSettings`: returns defaults for empty org, returns stored overrides |
| `api/src/__vitest_test__/settings.test.ts` | GET returns effective values; PATCH persists and echoes; unknown key → 400 CFG_SETTING_KEY_UNKNOWN; invalid value → 400 CFG_SETTING_INVALID_VALUE; missing permission → 403; idempotency replay returns same response |

### Step 7 — OWNERS.md

Every new directory requires an `OWNERS.md` with Purpose, Import Rules, Files table, and PR Checklist. Every updated directory requires its Files table amended.

---

## 12. Complete Phase 1 File Change Table

| Action | Layer | Path |
|--------|-------|------|
| CREATE | contracts | `kernel/governance/settings/setting-keys.ts` |
| CREATE | contracts | `kernel/governance/settings/settings.entity.ts` |
| CREATE | contracts | `kernel/governance/settings/settings.commands.ts` |
| CREATE | contracts | `kernel/governance/settings/settings.query.ts` |
| CREATE | contracts | `kernel/governance/settings/index.ts` |
| UPDATE | contracts | `kernel/governance/index.ts` |
| UPDATE | contracts | `shared/permissions.ts` |
| UPDATE | contracts | `kernel/governance/audit/actions.ts` |
| UPDATE | contracts | `shared/errors.ts` |
| CREATE | db | `schema/kernel/governance/settings.ts` |
| CREATE | db | `drizzle/NNNN_org_setting.sql` |
| UPDATE | db | `schema/kernel/governance/index.ts` |
| UPDATE | db | `seed.ts` |
| UPDATE | gates | `tools/gates/contract-db-sync.mjs` (exclusion comment only) |
| CREATE | core | `kernel/governance/settings/settings.registry.ts` |
| CREATE | core | `kernel/governance/settings/settings.value-schemas.ts` |
| CREATE | core | `kernel/governance/settings/settings.service.ts` |
| CREATE | core | `kernel/governance/settings/settings.queries.ts` |
| CREATE | core | `kernel/governance/settings/index.ts` |
| UPDATE | core | `kernel/governance/index.ts` |
| CREATE | api | `routes/kernel/settings.ts` |
| UPDATE | api | `index.ts` |
| CREATE | web | `app/(kernel)/governance/layout.tsx` |
| CREATE | web | `app/(kernel)/governance/settings/layout.tsx` |
| CREATE | web | `app/(kernel)/governance/settings/page.tsx` |
| CREATE | web | `app/(kernel)/governance/settings/GeneralSettingsClient.tsx` |
| CREATE | web | `app/(kernel)/governance/settings/settings-ui-config.ts` |
| UPDATE | web | `lib/api-client.ts` |
| CREATE | tests | `core/.../settings/__vitest_test__/settings.service.test.ts` |
| CREATE | tests | `api/src/__vitest_test__/settings.test.ts` |
| CREATE | owners | `OWNERS.md` in each new directory |

---

## 13. CI Gate Checklist

All gates must pass before a Phase 1 PR can be opened:

| Gate | What to verify |
|------|----------------|
| `check:boundaries` | web does not import core/db; core does not import ui |
| `check:catalog` | any new deps use `catalog:` if shared across ≥2 packages |
| `check:test-location` | tests in `__vitest_test__/` only, never colocated |
| `check:schema-invariants` | `org_setting` has `org_id`, `updated_at`, UNIQUE(org_id, key) |
| `check:migration-lint` | migration SQL has no DROP, NOT NULL columns have DEFAULT or are nullable |
| `check:contract-db-sync` | `org_setting` excluded by design — comment present in gate file |
| `check:server-clock` | no `new Date()` in settings service (use `sql\`now()\``) |
| `check:owners-lint` | all new dirs have OWNERS.md with accurate Files table |
| `check:token-compliance` | no hardcoded color values in `.tsx` files |
| `check:domain-completeness` | settings module has contracts + core + api + web |
| `check:module-boundaries` | settings imports stay within `kernel/governance/` pillar |

---

## 14. Later Phases — Scope Catalogue

| Phase | Scope | Effort | Prerequisite |
|-------|-------|--------|-------------|
| 2 | Feature flag boolean keys (eatures.*.enabled) in org_setting | Low — extends existing mechanism | Phase 1 complete |
| 2 | Additional General tab keys (document layout link, languages link) | Low | Phase 1 complete |
| 2 | Number series admin surface: config model + API + UI over numbering infra | Medium — may need sequence metadata extension | Phase 1 complete |
| 3 | kernel/governance/custom-fields module: definitions + values, Suppliers first | High — new module, two API surfaces | Phase 2 complete |
| 3 | Settings UI at /governance/settings/custom-fields/ | Medium — additive once module exists | Phase 3 module |
| 3 | Emails tab (SMTP, alias, digest), Discuss tab (activities, ICE/SFU, Tenor, Translate) | High | Encryption utility; comm/email module |
| 4 | Extend custom fields to Invoices and Purchase Orders | Medium — additive | Phase 3 module |
| 4 | Filter/sort/export integration for custom fields | Medium | Phase 3 data model stable |
| 4 | Permissions tab (customer account policy, password reset, 2FA scope), Integrations tab (OAuth, LDAP, MapBox, reCAPTCHA, AI keys) | High | Phase 3 encryption; auth layer coordination |
| 5+ | Document template customization | High — needs PDF pipeline | Phase 4 complete |
| 5+ | Developer Tools tab | Low — env-var backed only; no `org_setting` writes | Separate surface |
| 5+ | Role-based field visibility, richer custom field behaviors in reports/PDF | High | Phase 5 template engine |

**Phase 3 prerequisite — secret encryption utility:**

Before any API key can be stored, packages/core/src/kernel/infrastructure/ must expose:

``	s
encrypt(value: string, keyBuf: Buffer): string
decrypt(ciphertext: string, keyBuf: Buffer): string
``

Sourced from SETTINGS_ENCRYPTION_KEY env var. Secret values are never returned
plaintext in list endpoints — API returns "***" and the registry's secret: true flag
gates this path.

**Phase 3 prerequisite — custom-fields module:**

kernel/governance/custom-fields is a **dedicated governance module**, not a settings
extension. See §16 for full architectural spec. The settings UI at
/governance/settings/custom-fields/ is the entry point; the implementation module is
kernel/governance/custom-fields (sibling of kernel/governance/settings).

**Phase 4 prerequisite — invitation flow:**

general.users.defaultRoleId is intentionally excluded from all phases until the
invitation feature ships and role codes are stable across environments. A raw FK (DB UUID)
in a settings value creates environment-specific drift. Use a stable role key slug
(e.g., "operator") if needed, not a DB UUID.

## 15. Architectural Verdict

> **Accepted — ready for implementation.** The Phase 1 `kernel/governance/settings` plan
> is architecturally sound, bounded in scope, consistent with the import law and
> schema-is-truth workflow, and sufficiently explicit on effective reads, atomic writes,
> null-clears-default semantics, per-key validation, and request-level auditing to begin
> scaffolding immediately.

**All ambiguities are closed:**

| Decision | Resolution |
|----------|-----------|
| GET unknown keys | 400 `CFG_SETTING_KEY_UNKNOWN` — not silent ignore |
| GET value shape | Effective values: `{ value, source: "default"\|"stored" }` |
| PATCH atomicity | All-or-nothing DB transaction |
| Null semantics | Model B — null deletes override, falls back to default |
| Audit batching | One row per request; `categories` array (plural) in details |
| Error codes | Phase 1 uses only `CFG_SETTING_KEY_UNKNOWN`, `CFG_SETTING_INVALID_VALUE` |
| Platform settings | Hard-excluded from registry, routes, and vocabulary |
| Registry sync | Explicit 4-file checklist + compile-time type assertions |
| Response schema | Explicit `z.object({...})` for 4 known keys, not generic record |

---

_This document supersedes v1 (2026-03-06). All deviations from codebase patterns are
explicitly noted with rationale. Every implementation decision traces to a section here._

---

## 16. Competitive Gap Analysis — Runtime Customisation Layer

_Added 2026-03-06. Supersedes any earlier gap notes. References ADR-0005 §3.4 and §16 of this document._

### 16.1 What competitors provide that AFENDA lacks

| Platform | "Custom" capability | AFENDA equivalent | Gap? |
|---|---|---|---|
| Odoo | es.config.settings module injection; Studio custom fields; module_xxx toggles | org_setting preference store | Partial — no field customisation, no module toggles |
| Zoho Books | Field Customization tab (typed custom fields on entities); Transaction Number Series; PDF Templates | None yet | Yes — full gap |
| QuickBooks Online | Custom Fields on Customers and Transactions (typed, plan-gated) | None yet | Yes — full gap |

AFENDA Phase 1 settings is a **preference store** only. All three competitors also provide a **runtime schema extension surface** — the ability for org admins to add fields to business entities without writing code.

### 16.2 Four capability tiers

| Tier | Description | AFENDA phase |
|---|---|---|
| Preference keys | Hard-coded org configuration (weight unit, email colour, etc.) | Phase 1 — DONE |
| Feature flags | Boolean org-admin toggles to enable/disable modules | Phase 2 |
| Number series | Admin-configurable document numbering prefixes and seeds | Phase 2 |
| Custom entity fields | Admin-defined typed fields on suppliers, invoices, POs, etc. | Phase 3+ |
| Document templates | Customisable PDF output layouts | Phase 5+ |

### 16.3 Gap 1 — Feature flags

**Classification: settings extension (Phase 2)**

Phase 2 adds boolean setting keys (eatures.*.enabled) to the existing org_setting
mechanism. No new tables. Entries added to SettingKeyValues, SETTING_REGISTRY,
SETTING_VALUE_SCHEMAS following the existing Phase 1 checklist.

**Feature flag category rule — mandatory annotation in SETTING_REGISTRY:**

Not all boolean flags are the same. The category field in SETTING_REGISTRY must
differentiate between:

| Category | Meaning | Who controls |
|---|---|---|
| entitlement | Org has licensed access to a module | Platform operator / billing |
| ehavior | Runtime mode switch within a module | Org admin |

Engineering rollout flags (ollout) must **never** enter org_setting. They belong to
a separate platform-level config surface. Phase 2 feature flags are ehavior or
entitlement only.

Phase 2 initial keys (all ehavior category):

`	s
"features.ap.enabled"
"features.ar.enabled"
"features.purchasing.enabled"
`

### 16.4 Gap 2 — Number series configuration

**Classification: settings-adjacent admin surface (Phase 2)**

AFENDA likely has low-level numbering foundation in kernel/execution/numbering. The
gap is the **admin configuration model + API + UI**:

- Per org, per entity/document type scoping
- Configurable prefix string
- Configurable starting number / seed
- A sequence_config table (or extension of existing sequence metadata)
- Admin API (CRUD for sequence config per entity type)
- Settings UI (dedicated sequences tab in governance/settings)

Do not assume this is only a UI addition — audit the current sequence metadata model
for business-config readiness before scoping Phase 2 numbering work.

### 16.5 Gap 3 — Custom entity fields

**Classification: new kernel/governance/custom-fields module — NOT a settings extension (Phase 3)**

#### Architecture

Custom fields are **governance metadata infrastructure** with a settings entry point.
They affect contracts, reads, writes, validation, search/filtering, exports, reporting,
and audit. This is a different class of capability than org_setting.

Module placement:

`
packages/contracts/src/kernel/governance/custom-fields/   ← types + vocabulary
packages/core/src/kernel/governance/custom-fields/         ← service + queries
apps/api/src/routes/kernel/custom-fields.ts                ← definition API
apps/web/src/app/(kernel)/governance/settings/custom-fields/ ← UI entry point
`

UI path: /governance/settings/custom-fields — the settings page is the door.
Code module: kernel/governance/custom-fields — sibling of kernel/governance/settings, not a child.

#### Table schema

`sql
-- custom_field_def: admin-managed field definitions
CREATE TABLE custom_field_def (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id             uuid        NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  entity_type        text        NOT NULL,   -- controlled vocab: see CustomFieldEntityTypeValues
  label              text        NOT NULL,
  api_key            text        NOT NULL,   -- immutable after creation; lowercase slug
  data_type          text        NOT NULL,   -- "text"|"number"|"date"|"dropdown"|"checkbox"
  options_json       jsonb,                  -- CustomFieldOption[] | null
  required           boolean     NOT NULL DEFAULT false,
  active             boolean     NOT NULL DEFAULT true,
  sort_order         integer     NOT NULL DEFAULT 0,
  help_text          text,
  default_value_json jsonb,
  show_in_pdf        boolean     NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  created_by         uuid        REFERENCES iam_principal(id) ON DELETE SET NULL,
  UNIQUE (org_id, entity_type, api_key)
);
CREATE INDEX custom_field_def_org_type_idx ON custom_field_def (org_id, entity_type);

-- custom_field_value: per-entity-instance values
CREATE TABLE custom_field_value (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         uuid        NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
  field_def_id   uuid        NOT NULL REFERENCES custom_field_def(id) ON DELETE CASCADE,
  entity_type    text        NOT NULL,
  entity_id      uuid        NOT NULL,   -- polymorphic; FK enforced at application layer
  value_json     jsonb,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  updated_by     uuid        REFERENCES iam_principal(id) ON DELETE SET NULL,
  UNIQUE (field_def_id, entity_id)
);
CREATE INDEX custom_field_value_entity_idx ON custom_field_value (org_id, entity_type, entity_id);
`

The INDEX (org_id, entity_type, entity_id) on values is the most important index.
The common read is "fetch all custom field values for this entity" — entity-centric, not field-centric.

#### Five locked-down decisions

**A. entity_type — controlled vocabulary in contracts:**
Define CustomFieldEntityTypeValues as an s const array in
contracts/kernel/governance/custom-fields/. DB column stays 	ext (no enum type).
Phase 3 initial vocabulary: "supplier", "invoice", "purchase_order".

**B. pi_key — immutable after creation:**
Lowercase slug (/^[a-z][a-z0-9_]{0,62}$/), unique per (org_id, entity_type).
PATCH rejects pi_key changes with 409 CFG_CUSTOM_FIELD_KEY_IMMUTABLE.

**C. Definition lifecycle vs value lifecycle:**
Definitions are kernel/governance metadata. Values are domain business data.
The definition service must never write to custom_field_value. Entity domain services own values.

**D. options_json typed internal shape:**
`	s
type CustomFieldOption = {
  value: string;     // stored value, immutable
  label: string;     // display label, mutable
  active?: boolean;  // default true
  sortOrder?: number;
};
`
The alue inside each option is also immutable once created (it is what gets stored in alue_json).

**E. equired enforcement — prospective only:**
Required enforcement begins from the moment the field is activated. Existing records
created before the field existed are not retroactively backfilled and will not fail
validation. Backfill is a separate capability, not part of Phase 3.

#### API boundary

**Definition API — kernel-governed** (outes/kernel/custom-fields.ts):
`
GET    /v1/custom-fields?entityType=supplier
POST   /v1/custom-fields
PATCH  /v1/custom-fields/:id
DELETE /v1/custom-fields/:id
`

**Value API — entity-domain-governed** (added to entity route files):
`
PATCH  /v1/suppliers/:id/custom-fields
PATCH  /v1/invoices/:id/custom-fields
`

Entity reads include customFields: Record<apiKey, JsonValue | null> assembled from
custom_field_value rows. Entity routes own this read path.

#### Phase 3 scope limit

Phase 3 supports **capture and display only**. Out of scope until Phase 4+:
- List-page filter/sort by custom field
- CSV export includes custom fields
- Report column customisation
- PDF template inclusion
- Role-based field visibility

#### Permissions (Phase 3 new keys)

`
"admin.custom-fields.read"
"admin.custom-fields.write"
`

#### Error codes (Phase 3 new codes)

`
"CFG_CUSTOM_FIELD_KEY_IMMUTABLE"   — attempted api_key change
"CFG_CUSTOM_FIELD_NOT_FOUND"       — definition not found for org
"CFG_CUSTOM_FIELD_INVALID_VALUE"   — value fails data_type validation
`

### 16.6 Gap 4 — Document templates

**Classification: deferred to Phase 5+**

Prerequisite is a stable PDF generation pipeline. The show_in_pdf column on
custom_field_def future-proofs the schema without requiring the template engine now.

### 16.7 Architectural verdict

> **Architectural verdict:** Feature flags and number series configuration are natural
> extensions of the Phase 1 settings mechanism. Custom entity fields are a different
> class of capability: they are not simple settings keys but runtime schema-extension
> infrastructure. Therefore, AFENDA should implement custom fields as a dedicated
> kernel/governance/custom-fields module, exposed through the governance/settings UI,
> with entity-specific read/write integration added incrementally by domain. The settings
> UI is the entry point; the module is not a settings feature.

---

_§16 added 2026-03-06. Approved direction from competitive analysis against Odoo, Zoho Books, and QuickBooks Online._
