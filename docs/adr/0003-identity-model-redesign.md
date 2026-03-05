# ADR-0003: Identity Model Redesign — Party + Principal + Membership

**Status:** Accepted (Phase 4 Complete)  
**Date:** 2026-03-05  
**Author:** Architecture  
**Revision:** 4 (Phase 4 deprecation cleanup complete)

---

## Context

The current identity model uses `TenantId` as the primary data isolation boundary, with `UserId` scoped within tenants. This creates problems:

1. **"Tenant" is SaaS jargon** — unclear to domain experts, won't be understood in 100 years
2. **One person, one hat** — a user can only belong to one tenant at a time contextually
3. **Conflates party types** — Suppliers, customers, investors all exist outside the tenant model
4. **RLS complexity** — `tenant_id` column everywhere, but business relationships cross tenants

## Decision

Adopt a **Party + Principal + PartyRole + Membership** model with full referential integrity.

### Core Principles

> 1. **PersonId** refers to a human being (stable, survives across logins/merges).
> 2. **PrincipalId** refers to an authenticated actor (user account or service account).
> 3. **PartyId** refers to a legal entity — person OR organization.
> 4. **PartyRoleId** refers to "this party plays role X in org Y" — the **hat**.
> 5. **Membership** links a principal to one or more party roles — no polymorphic FKs.

### Why Principal ≠ Person

Real systems have:
- **Service accounts** — ETL, integrations, scheduled jobs (no human)
- **Merged identities** — one person with SSO + email/password logins
- **Headless contacts** — imported contacts, ex-employees, legal signers (no login)

So:
- `Token.sub` = **PrincipalId** (authenticated actor)
- Principal → Person is **nullable** (service accounts have no person)
- Person can have **multiple principals** (merged accounts)

### ID Hierarchy

| ID | Meaning | FK Target |
|---|---|---|
| `PersonId` | Human being — stable identity | `person.id` |
| `PrincipalId` | Authenticated actor (user or service account) | `iam_principal.id` |
| `OrgId` | Organization — legal entity | `organization.id` |
| `PartyId` | Either a person or organization | `party.id` |
| `PartyRoleId` | "Party X plays role Y in org Z" — the hat | `party_role.id` |

Role types (controlled vocab, not separate IDs):
- `employee`, `shareholder`, `customer`, `supplier`, `investor`, `franchisee`, `franchisor`, `contractor`, `auditor`

### Data Model

```sql
-- ═══════════════════════════════════════════════════════════════════════════
-- PARTY: the universal "legal entity" abstraction
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE party (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('person', 'organization'))
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PERSON: human beings (may or may not have a login)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE person (
  id         uuid PRIMARY KEY REFERENCES party(id),
  email      text,                     -- nullable: imported contacts may lack email
  name       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ORGANIZATION: companies, franchises, counterparties
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE organization (
  id                      uuid PRIMARY KEY REFERENCES party(id),
  slug                    text NOT NULL UNIQUE,
  name                    text NOT NULL,
  functional_currency     text NOT NULL DEFAULT 'USD',
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- PRINCIPAL: authenticated actors (users + service accounts)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE iam_principal (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id     uuid REFERENCES person(id),  -- NULL for service accounts
  kind          text NOT NULL CHECK (kind IN ('user', 'service')),
  email         text UNIQUE,                 -- login email (nullable for service)
  password_hash text,                        -- NULL = SSO-only or service account
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX principal_person_idx ON iam_principal(person_id) WHERE person_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- PARTY_ROLE: "party X plays role Y in org Z" — the HAT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE party_role (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id    uuid NOT NULL REFERENCES organization(id),
  party_id  uuid NOT NULL REFERENCES party(id),
  role_type text NOT NULL,  -- employee | supplier | customer | shareholder | ...
  
  UNIQUE (org_id, party_id, role_type)
);

CREATE INDEX party_role_lookup_idx ON party_role(org_id, role_type, party_id);
CREATE INDEX party_role_party_idx ON party_role(party_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- MEMBERSHIP: links principal → party_role (SINGLE FK — full integrity)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE membership (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id   uuid NOT NULL REFERENCES iam_principal(id),
  party_role_id  uuid NOT NULL REFERENCES party_role(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (principal_id, party_role_id)
);

CREATE INDEX membership_principal_idx ON membership(principal_id);
CREATE INDEX membership_party_role_idx ON membership(party_role_id);
```

### Key Insight: Supplier/Customer Are Parties, Not User Roles

A **supplier** is usually an **organization** (or occasionally a person acting as sole proprietor). Portal users are **contacts** of that supplier party.

```
Acme Supplies (organization, party_id = P1)
  └─ party_role: supplier in BuyerCorp (party_role_id = PR1)
       └─ membership: Alice (principal) → PR1
       └─ membership: Bob (principal) → PR1
```

Alice and Bob both log in as "Acme Supplies supplier portal" — they share the same `party_role_id`, different `principal_id`.

### RLS Strategy: SET LOCAL Context (No Subqueries)

Auth middleware verifies membership once, then sets session GUCs:

```sql
-- Middleware sets at request start (transaction-scoped):
SET LOCAL app.principal_id = 'uuid-here';
SET LOCAL app.org_id = 'uuid-here';
SET LOCAL app.party_role_id = 'uuid-here';  -- the active "hat"
SET LOCAL app.role_type = 'employee';        -- optional, for role-specific policies
```

RLS policies become simple equality checks (fast, index-friendly):

```sql
-- Employee sees their org's invoices
CREATE POLICY invoice_by_org ON invoice
  USING (org_id = current_setting('app.org_id', true)::uuid);

-- Supplier sees only POs addressed to their party_role
CREATE POLICY po_by_supplier ON purchase_order
  USING (supplier_party_role_id = current_setting('app.party_role_id', true)::uuid);
```

**Key details:**
- Always use `current_setting('x', true)` — missing settings return NULL, not error
- Keep `org_id` on business tables — still the strongest isolation + performance lever
- Middleware fails fast if membership doesn't exist for requested context

### OAuth Token Structure (Lean JWT)

**Don't** embed full membership graph in JWT — causes huge headers, stale permissions, graph leakage.
```typescript
interface TokenClaims {
  sub: PrincipalId;           // authenticated actor
  activeContext?: {
    partyRoleId: PartyRoleId; // the "hat"
    orgId: OrgId;
  };
  ctxVersion?: number;        // for cache invalidation
  iat: number;
  exp: number;
}
```

For context switching UI, call `/me/contexts` endpoint which returns:

```typescript
interface ContextResponse {
  contexts: Array<{
    partyRoleId: PartyRoleId;
    orgId: OrgId;
    orgName: string;
    roleType: RoleType;
    permissions: Permission[];
  }>;
}
```

This keeps JWTs small, permissions fresh, and org graph server-side.

### Migration Path

1. **Rename `tenant` → `organization`** — clearer naming
2. **Create `party`, `person`, `organization` tables** — party is the base
3. **Create `iam_principal`** — replace `iam_user`, add `kind` discriminator
4. **Create `party_role`** — the "hat" abstraction
5. **Create `membership(principal_id, party_role_id)`** — single FK, full integrity
6. **Deprecate `TenantId`** → alias to `OrgId` during transition
7. **Update RLS** — from `tenant_id =` to `SET LOCAL app.*` + equality checks
8. **Migrate existing data** — `iam_membership` rows → `party_role` + `membership`

## Consequences

### Positive

- **One person, many hats** — same person can be employee + shareholder + customer
- **Parties model reality** — supplier is an org with contacts, not "a user role"
- **Full referential integrity** — no polymorphic FK rot, orphan rows impossible
- **RLS is fast** — equality checks instead of subqueries
- **Clear domain language** — "Organization", "Person", "Party", "Role" are eternal terms
- **Service accounts work** — principal without person_id
- **Merged identities work** — multiple principals → one person

### Negative

- **Breaking change** — requires data migration
- **More tables** — party + person + organization + party_role + membership
- **Conceptual overhead** — team must understand party/principal distinction

### Neutral

- **`TenantId` deprecated but aliased** — existing code compiles with warnings
- **`org_id` still denormalized** — isolation + performance, just renamed from tenant_id

---

## Implementation Checklist

### Phase 1: Contracts + Types ✅
- [x] Add `PersonId`, `PrincipalId`, `OrgId`, `PartyId`, `PartyRoleId` to `ids.ts`
- [x] Deprecate `TenantId` with alias to `OrgId`
- [x] Create `RoleTypeSchema` controlled vocabulary
- [x] Create `PartyRoleSchema`, `MembershipSchema` in `contracts/iam/`
- [x] Update `RequestContextSchema` with `principalId`, `activeContext`

### Phase 2: Database Schema ✅
- [x] Create `party` table (base)
- [x] Create `person` table (extends party)
- [x] Create `organization` table (extends party) — coexists with `tenant`
- [x] Create `iam_principal` (coexists with `iam_user`)
- [x] Create `party_role` table
- [x] Create `membership(principal_id, party_role_id)` table
- [x] Migrate existing `iam_user` → `person` + `iam_principal` → `0004_party_model_data_migration.sql`
- [x] Migrate existing `iam_membership` → `party_role` + `membership` → `0004_party_model_data_migration.sql`
- [x] Update RLS policies to use `SET LOCAL app.*` context → `withOrgContext()` in `@afenda/db`

### Phase 3: Core + API ✅
- [x] Update `auth.ts` to resolve party_roles → added `resolvePrincipalContext`, `listPrincipalContexts`
- [x] Update `tenant.ts` → added `resolveOrgId`
- [x] Update `audit.ts` — supports `orgId`/`tenantId` and `actorPrincipalId`/`actorUserId`
- [x] Add `/me/contexts` endpoint for context switching → `apps/api/src/routes/iam.ts`
- [x] Update `sod.ts` — now uses `PrincipalId` and `ctx.principalId` (ADR-0003 compliant)
- [x] Update API middleware — supports `orgSlug`/`orgId` + deprecated aliases, uses `principalId` for rate limiting

### Phase 4: Deprecation Cleanup ✅
- [x] Remove `TenantId` alias after all usages migrated
- [x] Drop old `iam_user`, `iam_membership`, `tenant` tables → `0005_phase4_deprecation_cleanup.sql`
- [x] Rename `tenant_id` → `org_id` in all business tables
- [x] Rename user FKs → principal FKs (e.g., `submitted_by` → `submitted_by_principal_id`)
- [x] Update RLS policies from `app.tenant_id` → `app.org_id`
- [x] Update all contracts: `TenantIdSchema` → `OrgIdSchema`, `UserIdSchema` → `PrincipalIdSchema`
- [x] Update all core services: `tenantId` → `orgId`, `userId` → `principalId`
- [x] Update seed.ts to use new party model exclusively

---

## Appendix: Role Type Registry

```typescript
export const RoleTypeValues = [
  "employee",
  "shareholder", 
  "customer",
  "supplier",
  "investor",
  "franchisee",
  "franchisor",
  "contractor",   // future
  "auditor",      // future
] as const;

export type RoleType = typeof RoleTypeValues[number];
```

## Appendix: Example — Supplier Portal Flow

```
1. Acme Corp (organization) onboards as supplier to BuyerInc
   → party(id=P1, kind='organization')
   → organization(id=P1, slug='acme-corp', name='Acme Corp')
   → party_role(id=PR1, org_id=BuyerInc, party_id=P1, role_type='supplier')

2. Alice joins Acme Corp as portal user
   → party(id=P2, kind='person')
   → person(id=P2, email='alice@acme.com', name='Alice')
   → iam_principal(id=X1, person_id=P2, kind='user', email='alice@acme.com')
   → membership(principal_id=X1, party_role_id=PR1)

3. Alice logs in, selects "Acme Corp @ BuyerInc" context
   → JWT: { sub: X1, activeContext: { partyRoleId: PR1, orgId: BuyerInc } }
   → Middleware: SET LOCAL app.principal_id = X1;
                 SET LOCAL app.org_id = BuyerInc;
                 SET LOCAL app.party_role_id = PR1;
                 SET LOCAL app.role_type = 'supplier';

4. Alice queries /purchase-orders
   → RLS: WHERE supplier_party_role_id = PR1
   → Returns only POs addressed to Acme Corp
```
