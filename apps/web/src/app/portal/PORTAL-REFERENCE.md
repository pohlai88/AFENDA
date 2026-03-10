# AFENDA Portal Architecture — Enterprise Multi-Tenant B2B Platform

**Version:** 1.0.0  
**Last Updated:** March 10, 2026  
**Status:** Production-Ready Architecture (No MVP — Enterprise Quality from Day 1)  
**Document Type:** Architecture Reference + Product Requirements Document (PRD)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Industry Benchmarks & Best Practices](#2-industry-benchmarks--best-practices)
3. [AFENDA Portal Objectives](#3-afenda-portal-objectives)
4. [Current Architecture (What is Available)](#4-current-architecture-what-is-available)
5. [Gap Analysis (What is Lacking)](#5-gap-analysis-what-is-lacking)
6. [Long-Term Improvements](#6-long-term-improvements)
7. [Enterprise Quality Requirements](#7-enterprise-quality-requirements)
8. [Security & Compliance](#8-security--compliance)
9. [Scalability & Performance](#9-scalability--performance)
10. [Monitoring & Observability](#10-monitoring--observability)

---

## 1. Executive Summary

### 1.1 Purpose

AFENDA is an **audit-first, truth-engine financial platform** for multi-tenant B2B SaaS environments. The portal architecture enables **secure, isolated access** for seven distinct user classes:

1. **App Portal** — Organization employees (Finance, HR, Management)
2. **Supplier Portal** — Vendors submitting invoices/managing orders
3. **Customer Portal** — Buyers viewing statements/tracking shipments
4. **Investor Portal** — Financial stakeholders accessing reports/portfolio data
5. **Franchisee Portal** — Franchise operators managing locations/royalties
6. **Contractor Portal** — External workers accessing work orders/timesheets
7. **CID Portal** — AFENDA Central Intelligence Team (multi-tenant administration)

### 1.2 Strategic Goals

- ✅ **Zero-Trust Multi-Tenancy** — Org-level, portal-level, row-level isolation
- ✅ **Enterprise-Grade Security** — OWASP Top 10 coverage, SOC 2 Type II readiness
- ✅ **Scalability** — Support 10,000+ organizations, 1M+ users, 100M+ transactions
- ✅ **Developer Velocity** — Type-safe contracts, schema-is-truth workflow, CI gates
- ✅ **Auditability** — Every mutation logged with correlation IDs, append-only truth tables

---

## 2. Industry Benchmarks & Best Practices

### 2.1 Reference Architectures

AFENDA's portal architecture is modeled after industry leaders in multi-tenant B2B SaaS:

| Platform | Portal Model | Key Learnings Applied to AFENDA |
|----------|-------------|--------------------------------|
| **Stripe** | Dashboard (internal) + Connect (external merchants) | Separate authentication boundaries for internal vs external users |
| **Shopify** | Admin (merchants) + Plus Partners (agencies/developers) | Role-based feature visibility within portals |
| **QuickBooks Online** | Accountant Portal + Client Portal | Invitation-based provisioning for external parties |
| **SAP Ariba** | Buyer Workbench + Supplier Portal | Portal-specific workflows (e.g., invoice submission vs approval) |
| **NetSuite** | Employee Center + Customer Center + Vendor Center | Clear separation of concerns by actor type |
| **Salesforce** | Experience Cloud (multiple branded portals) | Unified RBAC across portals with portal-specific permissions |

### 2.2 Best Practice Principles

#### Principle 1: Portal = Authentication Boundary
**NOT** just a UI theme. Each portal has:
- Dedicated sign-in flow (`/auth/portal/{portal}/signin`)
- Portal-scoped JWT claims (`token.portal`)
- Middleware routing guards (`isSupplierPortalPath()`)
- Portal-specific invitation mechanism (`auth_portal_invitation` table)

#### Principle 2: Module = RBAC-Controlled Feature Set
Within the "app" portal, features are modules:
- **Finance Module** (AP, AR, GL) — controlled by `ap.invoice.create`, `gl.entry.approve`
- **HRM Module** (coming soon) — controlled by `hrm.admin.hire`, `hrm.self.view_payslip`
- **Governance Module** (Audit, Settings) — controlled by `governance.audit.view`

**DO NOT** create a separate portal for employees — HRM is a module within "app" portal.

#### Principle 3: Row-Level Security (RLS) Everywhere
Every multi-tenant query uses `withOrgContext()` (ADR-0003):
```typescript
await withOrgContext(db, {
  orgId: ctx.activeContext.orgId,
  principalId: ctx.principalId,
}, async (tx) => {
  // PostgreSQL GUCs set: app.org_id, app.principal_id
  // RLS policies enforce org_id isolation automatically
  return tx.query.invoice.findMany();
});
```

#### Principle 4: Append-Only Truth Tables
Financial and audit data are **immutable**:
- `journal_entry` — NO UPDATE/DELETE (GL entries are eternal)
- `audit_log` — NO UPDATE/DELETE (audit trail is tamper-proof)
- `outbox_event` — NO UPDATE/DELETE (event sourcing requires full history)

Corrections use **reversal entries**, not mutations.

#### Principle 5: Idempotency Keys on Commands
Every state-changing command accepts `idempotencyKey`:
```typescript
export interface CreateInvoiceCommand {
  idempotencyKey: string; // UUID v4
  orgId: string;
  // ... other fields
}
```
API deduplicates requests within 24-hour window.

#### Principle 6: Correlation IDs for Distributed Tracing
Every request gets a `correlationId`:
- Propagated via HTTP header: `X-Correlation-ID`
- Stored in audit logs for cross-service tracing
- Enables debugging multi-step workflows (command → event → worker → side-effect)

---

## 3. AFENDA Portal Objectives

### 3.1 Business Objectives

| Objective | Success Criteria | Timeline |
|-----------|-----------------|----------|
| **Enable External Collaboration** | Suppliers submit invoices without org logins | ✅ Delivered (Supplier Portal live) |
| **Investor Transparency** | Real-time financial statements, portfolio dashboards | ✅ Delivered (Investor Portal live) |
| **Franchise Compliance** | Franchisees submit royalty reports, track inventory | ✅ Delivered (Franchisee Portal live) |
| **Contractor Management** | Contractors access work orders, submit timesheets | ✅ Delivered (Contractor Portal live) |
| **Multi-Org Administration** | AFENDA team can manage all orgs from CID Portal | ✅ Delivered (CID Portal live) |
| **Zero Data Leakage** | Supplier A cannot see Supplier B's data | ✅ Enforced via RLS + middleware guards |
| **Audit Compliance** | SOC 2 Type II, ISO 27001 readiness | 🟡 In Progress (see Gap Analysis) |

### 3.2 Technical Objectives

| Objective | Status | Notes |
|-----------|--------|-------|
| **Type-Safe Portal Contracts** | ✅ Complete | Zod schemas in `@afenda/contracts` |
| **JWT-Based Sessions** | ✅ Complete | NextAuth v4, 8-hour sessions, `portal` claim |
| **Portal Routing Middleware** | ✅ Complete | `proxy.ts` enforces portal isolation |
| **Invitation-Based Provisioning** | ✅ Complete | `auth_portal_invitation` + email/SMS delivery |
| **Account Lockout Protection** | ✅ Complete | 5 failures in 15 min → 15-min lockout |
| **Membership Revocation** | ✅ Complete | Status enum: `active` \| `revoked` \| `suspended` |
| **Audit Logging** | ✅ Complete | All mutations write to `audit_log` |
| **Event-Driven Architecture** | ✅ Complete | Outbox pattern + Graphile Worker |

---

## 4. Current Architecture (What is Available)

### 4.1 Portal Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                        AFENDA Platform                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │  App Portal   │  │Supplier Portal│  │Customer Portal│       │
│  │  /            │  │/portal/supplier│ │/portal/customer│      │
│  │               │  │               │  │               │       │
│  │ • Finance     │  │ • Submit      │  │ • View Orders │       │
│  │ • HRM (soon)  │  │   Invoices    │  │ • Statements  │       │
│  │ • Governance  │  │ • Order Status│  │ • Payment     │       │
│  │ • Audit       │  │ • Documents   │  │   History     │       │
│  └───────────────┘  └───────────────┘  └───────────────┘       │
│                                                                   │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐       │
│  │Investor Portal│  │Franchisee     │  │Contractor     │       │
│  │/portal/investor│ │Portal         │  │Portal         │       │
│  │               │  │/portal/       │  │/portal/       │       │
│  │ • Financials  │  │franchisee     │  │contractor     │       │
│  │ • Portfolio   │  │               │  │               │       │
│  │ • Reports     │  │ • Operations  │  │ • Work Orders │       │
│  │ • Analytics   │  │ • Inventory   │  │ • Timesheet   │       │
│  └───────────────┘  │ • Royalties   │  │ • Documents   │       │
│                     └───────────────┘  └───────────────┘       │
│                                                                   │
│  ┌───────────────┐                                               │
│  │  CID Portal   │  AFENDA Internal — Multi-Tenant Admin        │
│  │  /portal/cid  │                                               │
│  │               │                                               │
│  │ • Org Mgmt    │  ⚠️  No org_id isolation (cross-org access)  │
│  │ • Feature     │                                               │
│  │   Flags       │                                               │
│  │ • Support     │                                               │
│  └───────────────┘                                               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Authentication Flow

#### 4.2.1 Portal Sign-In
```
User visits: /auth/portal/supplier/signin
    ↓
Redirects to: /auth/signin?tab=supplier&callbackUrl=/portal/supplier
    ↓
User enters credentials (email + password)
    ↓
NextAuth CredentialsProvider:
  - Validates email/password against iam_principal table
  - Checks account lockout status (auth_login_attempt)
  - Verifies portal membership (party_role_assignment + portal claim)
    ↓
JWT token created with claims:
  {
    sub: principalId,
    portal: "supplier",
    orgId: "...",
    partyRoleId: "...",
    permissions: Set<string>
  }
    ↓
Middleware (proxy.ts) validates:
  - Token exists
  - Token.portal === "supplier"
  - Path starts with /portal/supplier
    ↓
Redirect to: /portal/supplier (home page)
```

#### 4.2.2 Portal Invitation Flow
```
Org Admin (App Portal):
  POST /api/v1/commands/send-portal-invitation
    {
      orgId: "...",
      email: "vendor@example.com",
      portal: "supplier",
      partyKind: "organization",
      partyName: "ACME Supplies Inc."
    }
    ↓
Backend (packages/core/src/kernel/identity/auth-flows.ts):
  1. Create person record (if not exists)
  2. Create iam_principal (if not exists)
  3. Create auth_portal_invitation record
  4. Generate invitation token (UUID)
  5. Send email with link: /auth/portal/accept?token=...
  6. Write audit_log entry
    ↓
Supplier receives email, clicks link
    ↓
GET /auth/portal/accept?token=...
    ↓
Supplier sets password (if new principal)
    ↓
Backend creates:
  - party (if needed)
  - party_role_assignment (org → person, role = "Supplier")
  - Updates auth_portal_invitation (accepted_at, accepted_principal_id)
    ↓
Supplier can now sign in via /auth/portal/supplier/signin
```

### 4.3 Portal Isolation Enforcement

#### 4.3.1 Middleware Guards (proxy.ts)
```typescript
// Supplier users CANNOT access customer portal
if (token.portal === "supplier" && isCustomerPortalPath(pathname)) {
  return redirectTo(request, "/portal/supplier"); // Blocked
}

// Customer users CANNOT access supplier portal
if (token.portal === "customer" && isSupplierPortalPath(pathname)) {
  return redirectTo(request, "/portal/customer"); // Blocked
}

// General portal users CANNOT access app portal
const generalPortalUser = 
  token.portal === "supplier" || 
  token.portal === "customer" || 
  token.portal === "investor" || 
  token.portal === "franchisee" || 
  token.portal === "contractor";

if (generalPortalUser && !isPortalPath(pathname) && !isPublicPath(pathname)) {
  return redirectTo(request, getPortalHomePath(token.portal)); // Blocked
}
```

#### 4.3.2 Database-Level Isolation
```sql
-- Example RLS policy for invoice table
CREATE POLICY invoice_isolation ON invoice
  USING (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;
```
Every query via `withOrgContext()` sets PostgreSQL GUC `app.org_id`, enforcing org-level isolation.

#### 4.3.3 API-Level Validation
```typescript
// apps/api/src/routes/erp/finance/ap.ts
app.post("/v1/commands/create-invoice", {
  schema: { body: CreateInvoiceCommandSchema },
  handler: async (req, reply) => {
    // Middleware already populated req.ctx:
    const { principalId, orgId, permissions, portal } = req.ctx;
    
    // Block supplier portal users from creating invoices
    if (portal === "supplier") {
      return reply.code(403).send({
        error: { code: "IAM_INSUFFICIENT_PERMISSIONS" }
      });
    }
    
    // Check permission
    if (!hasPermission(req.ctx, "ap.invoice.create")) {
      return reply.code(403).send({
        error: { code: "IAM_INSUFFICIENT_PERMISSIONS" }
      });
    }
    
    // Proceed...
  }
});
```

### 4.4 Database Schema (Identity Layer)

#### 4.4.1 Core Tables
```
party                     — Universal legal entity (person | organization)
  ├─ person               — Human beings (email, name)
  └─ organization         — Companies (slug, name, currency)

iam_principal             — Authenticated actors (login accounts)
  ├─ person_id            — Links to person (NULL for service accounts)
  ├─ email                — Login email
  └─ password_hash        — bcrypt hash (NULL for SSO-only)

party_role               — RBAC role definitions (org-scoped)
  ├─ org_id               — Owner organization
  ├─ name                 — "Finance Admin", "AP Clerk", "Supplier"
  └─ permissions          — Array of permission keys

party_role_assignment    — Principal → Role mapping (org-scoped)
  ├─ org_id               — Context organization
  ├─ party_id             — Person or organization being assigned
  ├─ role_id              — Role being granted
  └─ assigned_by          — Auditor trail

auth_portal_invitation   — Invitation tracking
  ├─ org_id               — Inviting organization
  ├─ email                — Invitee email
  ├─ portal               — supplier | customer | cid | investor | etc.
  ├─ token                — UUID for acceptance link
  ├─ expires_at           — Invitation expiry (default 7 days)
  └─ accepted_at          — Acceptance timestamp

auth_login_attempt       — Brute-force protection
  ├─ principal_id         — Who attempted login
  ├─ success              — Boolean
  ├─ ip_address           — Source IP
  └─ created_at           — Timestamp (for 15-min window calc)

party_role_membership_status — Membership lifecycle
  ├─ status               — 'active' | 'revoked' | 'suspended'
  ├─ revoked_at           — Timestamp
  └─ revoked_by           — Principal who revoked
```

#### 4.4.2 Constraints
- ✅ `auth_portal_invitation.portal` — CHECK constraint enforces 6 external portal types
- ✅ `party.kind` — CHECK constraint enforces `'person'` or `'organization'`
- ✅ `iam_principal.kind` — CHECK constraint enforces `'user'` or `'service'`
- ✅ All multi-tenant tables have `org_id` + RLS policies

### 4.5 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | Next.js | 16.1.6 | App Router, React Server Components, Turbopack |
| **UI Components** | shadcn/ui | Latest | Accessible Radix primitives + Tailwind v4 |
| **Authentication** | NextAuth | v4 | JWT sessions, credentials + OAuth providers |
| **API** | Fastify | Latest | High-performance REST API |
| **Database** | PostgreSQL | 15+ | ACID transactions, RLS, JSONB support |
| **ORM** | Drizzle | Latest | Type-safe queries, schema migrations |
| **Job Queue** | Graphile Worker | Latest | PostgreSQL LISTEN/NOTIFY for event processing |
| **Validation** | Zod | Latest | Runtime + compile-time type safety |
| **Monorepo** | Turborepo + pnpm | Latest | Incremental builds, workspace management |

### 4.6 CI/CD Quality Gates

AFENDA enforces **18 CI gates** (`pnpm check:all`) — all must pass before merge:

#### Phase 1: Static Correctness (8 gates)
1. **test-location** — Tests in `__vitest_test__/` only
2. **schema-invariants** — DB schema rules (timestamptz, org_id, indexes)
3. **migration-lint** — SQL migration safety (no DROP without explicit marker)
4. **contract-db-sync** — Zod schemas ↔ Drizzle tables match
5. **token-compliance** — No hardcoded colors (use Tailwind tokens)
6. **shadcn-enforcement** — All UI uses shadcn components (no raw HTML)
7. **owners-lint** — OWNERS.md files complete
8. **catalog** — pnpm catalog consistency

#### Phase 2: Architecture Boundaries (4 gates)
9. **boundaries** — Import Direction Law (contracts → db → core → api/web)
10. **module-boundaries** — Pillar structure (shared/kernel/erp/comm)
11. **org-isolation** — Multi-tenant isolation checks
12. **finance-invariants** — Money types (bigint), journal entry immutability

#### Phase 3: Domain Completeness (6 gates)
13. **domain-completeness** — Error codes, audit actions, permissions registered
14. **route-registry-sync** — API routes documented
15. **audit-enforcement** — Audit logs on mutations
16. **ui-meta** — Entity metadata completeness
17. **server-clock** — No `new Date()` in backend (use `sql\`now()\``)
18. **page-states** — Next.js page suspense boundaries

**Result:** Zero runtime surprises, production-grade code quality from day 1.

---

## 5. Gap Analysis (What is Lacking)

### 5.1 Security Gaps

| Gap | Severity | Impact | Mitigation Required |
|-----|----------|--------|---------------------|
| **No OAuth 2.0 Scopes for Portals** | 🟡 Medium | Cannot restrict API access by portal type (e.g., supplier should only POST invoices, not GET payroll) | Implement OAuth 2.0 scopes in NextAuth JWT: `portal:supplier:invoice.submit` |
| **No IP Whitelisting for CID Portal** | 🟡 Medium | CID portal accessible from any IP (should restrict to AFENDA office/VPN) | Add IP allowlist check in middleware for `/portal/cid` |
| **No 2FA/MFA** | 🔴 High | Password-only authentication insufficient for SOC 2 compliance | Implement TOTP (Time-based OTP) via `@afenda/core/kernel/identity/mfa` |
| **No Session Revocation** | 🟡 Medium | JWT tokens valid until expiry (8 hours) even if user is deleted | Implement redis-backed session blacklist or switch to database-backed sessions |
| **No Rate Limiting per Portal** | 🟡 Medium | Supplier portal users can spam API same as app users | Add portal-specific rate limits (e.g., supplier: 30 req/min, app: 100 req/min) |
| **No CSP (Content Security Policy)** | 🟡 Medium | XSS mitigation not fully hardened | Add CSP headers in Next.js middleware |
| **No Subresource Integrity (SRI)** | 🟢 Low | CDN script tampering possible (if using external CDNs) | Add SRI hashes to external scripts (or self-host all assets) |

### 5.2 Functional Gaps

| Gap | Priority | Impact | Solution |
|-----|----------|--------|---------|
| **No Portal Branding Customization** | 🟡 Medium | All portals share AFENDA branding (cannot white-label for franchisees) | Add `portal_branding` table (logo, colors, domain) + theme switching |
| **No Portal Analytics Dashboard** | 🟡 Medium | Cannot track portal usage (e.g., "How many suppliers logged in this month?") | Add `analytics_portal_activity` table + dashboard |
| **No Portal Onboarding Wizard** | 🟢 Low | New suppliers don't have guided setup (upload documents, configure notifications) | Build onboarding checklist component |
| **No Portal Notification Preferences** | 🟡 Medium | All users get all notifications (cannot opt out of email for order updates) | Add `party_notification_preference` table |
| **No Portal API Documentation** | 🔴 High | External developers cannot integrate supplier portal via API | Generate OpenAPI 3.2 spec from Fastify routes, host Swagger UI |
| **No Portal Sandbox Environment** | 🟡 Medium | Suppliers cannot test integrations without affecting production data | Add `org.environment` enum (`production` \| `sandbox`), seed test data |
| **No Portal Mobile App** | 🟢 Low | Suppliers must use web browser (no native iOS/Android app) | Build React Native app using Expo, share Zod contracts |

### 5.3 Scalability Gaps

| Gap | Priority | Impact | Solution |
|-----|----------|--------|---------|
| **No Database Connection Pooling Config** | 🟡 Medium | Default pool size (10) may hit limit at 1,000+ concurrent users | Configure PgBouncer or increase Drizzle pool size |
| **No Read Replicas** | 🟡 Medium | All queries hit primary DB (read-heavy workloads degrade write performance) | Add read replica, route queries via `db.replica` in Drizzle |
| **No CDN for Static Assets** | 🟡 Medium | Images/CSS served from Next.js server (slower for global users) | Configure Cloudflare CDN or Vercel Edge Network |
| **No Redis Caching** | 🟡 Medium | Permission checks query DB every request | Cache permissions in Redis with 5-min TTL |
| **No横向扩展 (Horizontal Scaling)** | 🟢 Low | Single Next.js instance (cannot scale beyond vertical limits) | Deploy on Kubernetes with HPA (Horizontal Pod Autoscaler) |

### 5.4 Observability Gaps

| Gap | Priority | Impact | Solution |
|-----|----------|--------|---------|
| **No Distributed Tracing** | 🔴 High | Cannot trace request across Next.js → Fastify → PostgreSQL → Worker | Implement OpenTelemetry with Jaeger backend |
| **No Metrics Dashboard** | 🔴 High | Cannot see portal-specific metrics (login rate, API latency, error rate) | Add Prometheus + Grafana, export metrics from Fastify |
| **No Error Tracking** | 🔴 High | Frontend errors not captured (React error boundaries throw to console) | Integrate Sentry or Rollbar |
| **No Audit Log Search** | 🟡 Medium | Cannot search audit logs by correlation ID or action (only raw SQL queries) | Build admin UI for audit log search + export |
| **No Uptime Monitoring** | 🟡 Medium | No alerts if portal goes down | Configure Pingdom or UptimeRobot, alert on 5xx errors |

### 5.5 Compliance Gaps

| Gap | Priority | Impact | Solution |
|-----|----------|--------|---------|
| **No GDPR Data Export** | 🔴 High | Users cannot download their data (GDPR Article 20 violation) | Build `/api/v1/queries/export-my-data` endpoint (JSON + CSV) |
| **No GDPR Data Deletion** | 🔴 High | Users cannot request account deletion (GDPR Article 17 violation) | Build `/api/v1/commands/delete-my-account` (anonymize audit logs) |
| **No Privacy Policy/ToS Acceptance Tracking** | 🟡 Medium | Cannot prove user accepted ToS (legal risk) | Add `iam_principal_consent` table (document_type, version, accepted_at) |
| **No Data Retention Policies** | 🟡 Medium | Old audit logs never purged (storage costs grow unbounded) | Implement retention policy (e.g., archive after 7 years, delete after 10 years) |
| **No SOC 2 Type II Audit Trail** | 🔴 High | Audit logs incomplete (no access logs, no admin actions) | Add access log table, log all admin actions in CID portal |

---

## 6. Long-Term Improvements

### 6.1 Phase 1: Security Hardening (Q2 2026)

#### 6.1.1 Multi-Factor Authentication (MFA)
**Objective:** Achieve SOC 2 Type II compliance.

**Implementation:**
```typescript
// packages/contracts/src/kernel/identity/mfa.ts
export const MfaMethodSchema = z.enum(["totp", "sms", "email", "webauthn"]);

export const EnableMfaCommandSchema = z.object({
  idempotencyKey: z.string().uuid(),
  principalId: z.string().uuid(),
  method: MfaMethodSchema,
  secret: z.string().optional(), // TOTP secret
});

// packages/db/src/schema/kernel/identity.ts
export const iamPrincipalMfa = pgTable("iam_principal_mfa", {
  id: uuid("id").defaultRandom().primaryKey(),
  principalId: uuid("principal_id").notNull().references(() => iamPrincipal.id),
  method: text("method").notNull(), // totp | sms | email | webauthn
  secret: text("secret"), // Encrypted TOTP secret
  backupCodes: text("backup_codes").array(), // Encrypted 10-digit codes
  createdAt: tsz("created_at").defaultNow().notNull(),
});
```

**UI Flow:**
1. User navigates to `/settings/security/mfa`
2. Selects TOTP (Google Authenticator)
3. QR code displayed with secret
4. User enters 6-digit code to verify
5. Backend stores encrypted secret + generates 10 backup codes
6. Next login: password + 6-digit TOTP required

**Success Criteria:**
- ✅ TOTP working for app portal
- ✅ SMS working for supplier/customer portals
- ✅ Backup codes functional (10 codes, single-use)
- ✅ MFA enforcement configurable per organization

---

#### 6.1.2 OAuth 2.0 Scopes
**Objective:** Fine-grained API access control per portal type.

**Implementation:**
```typescript
// packages/contracts/src/kernel/identity/oauth-scopes.ts
export const OAuthScopeValues = [
  // App portal scopes
  "ap.invoice.*",       // Full AP access
  "gl.entry.*",         // Full GL access
  "hrm.admin.*",        // Full HRM access
  
  // Supplier portal scopes
  "ap.invoice.create",  // Can submit invoices
  "ap.invoice.read",    // Can view own invoices
  
  // Customer portal scopes
  "ar.order.read",      // Can view own orders
  "ar.statement.read",  // Can view statements
  
  // Investor portal scopes
  "finance.report.read",// Can view financial reports
  "portfolio.read",     // Can view portfolio
] as const;

// JWT payload
interface AfendaJWT {
  sub: string;          // principalId
  portal: PortalType;
  orgId: string;
  scopes: string[];     // ← NEW
}
```

**Enforcement:**
```typescript
// apps/api/src/hooks/check-scope.ts
export async function checkScope(
  request: FastifyRequest,
  requiredScope: string
): Promise<boolean> {
  const { scopes } = request.ctx;
  
  // Exact match or wildcard match
  return scopes.some(scope => 
    scope === requiredScope || 
    scope === requiredScope.replace(/\.[^.]+$/, ".*")
  );
}

// Route usage
app.post("/v1/commands/create-invoice", {
  preHandler: async (req, reply) => {
    if (!await checkScope(req, "ap.invoice.create")) {
      return reply.code(403).send({ error: { code: "OAUTH_INSUFFICIENT_SCOPE" } });
    }
  },
  handler: async (req, reply) => { /* ... */ }
});
```

**Success Criteria:**
- ✅ Supplier users can only submit invoices, not approve them
- ✅ Customer users can only read their own orders
- ✅ Investor users can only read financial reports (no write access)

---

#### 6.1.3 IP Allowlisting for CID Portal
**Objective:** Restrict CID portal access to AFENDA office/VPN.

**Implementation:**
```typescript
// packages/db/src/schema/kernel/identity.ts
export const iamIpAllowlist = pgTable("iam_ip_allowlist", {
  id: uuid("id").defaultRandom().primaryKey(),
  portal: text("portal").notNull(), // "cid" only for now
  cidr: text("cidr").notNull(),     // e.g., "203.0.113.0/24"
  description: text("description"), // "AFENDA SF Office"
  createdAt: tsz("created_at").defaultNow().notNull(),
});

// apps/web/src/proxy.ts
function isIpAllowed(ip: string, portal: PortalType): boolean {
  if (portal !== "cid") return true; // Only CID portal restricted
  
  const allowlist = [
    "203.0.113.0/24",   // AFENDA SF Office
    "198.51.100.0/24",  // AFENDA VPN
  ];
  
  return allowlist.some(cidr => ipInRange(ip, cidr));
}

export async function middleware(request: NextRequest) {
  // ... existing auth checks ...
  
  if (token.portal === "cid" && !isIpAllowed(clientIp, "cid")) {
    return redirectTo(request, "/auth/access-denied?reason=ip-restricted");
  }
}
```

**Success Criteria:**
- ✅ CID portal accessible from office IP
- ✅ CID portal blocked from home IP
- ✅ Error page explains IP restriction

---

### 6.2 Phase 2: Portal Customization (Q3 2026)

#### 6.2.1 White-Label Branding
**Objective:** Franchisees can customize portal with their logo/colors.

**Schema:**
```sql
CREATE TABLE portal_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id),
  portal TEXT NOT NULL CHECK (portal IN ('supplier', 'customer', 'franchisee')),
  logo_url TEXT,
  primary_color TEXT,   -- Hex color (e.g., "#3B82F6")
  secondary_color TEXT,
  font_family TEXT,     -- "Inter" | "Roboto" | "Open Sans"
  custom_domain TEXT,   -- e.g., "vendor.acmecorp.com"
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, portal)
);
```

**UI Implementation:**
```tsx
// apps/web/src/app/portal/supplier/page.tsx
import { usePortalBranding } from "@/hooks/use-portal-branding";

export default function SupplierPortalHome() {
  const branding = usePortalBranding("supplier");
  
  return (
    <div style={{
      "--primary": branding.primaryColor,
      "--secondary": branding.secondaryColor,
    }}>
      <img src={branding.logoUrl} alt="Logo" />
      <h1 style={{ fontFamily: branding.fontFamily }}>
        Welcome to Supplier Portal
      </h1>
    </div>
  );
}
```

**Success Criteria:**
- ✅ Franchisee can upload logo
- ✅ Franchisee can pick primary/secondary colors
- ✅ Portal reflects branding in real-time
- ✅ Custom domain mapping works (CNAME to AFENDA)

---

#### 6.2.2 Portal Analytics Dashboard
**Objective:** Track portal usage metrics per organization.

**Metrics to Track:**
```typescript
interface PortalMetrics {
  portal: PortalType;
  orgId: string;
  period: "day" | "week" | "month";
  
  // Activity metrics
  uniqueLogins: number;
  totalSessions: number;
  avgSessionDuration: number; // seconds
  
  // API metrics
  apiCalls: number;
  apiErrors: number;
  p50Latency: number; // ms
  p99Latency: number; // ms
  
  // Feature usage
  invoicesSubmitted: number;   // Supplier portal
  ordersPlaced: number;        // Customer portal
  reportsViewed: number;       // Investor portal
}
```

**Storage:**
```sql
CREATE TABLE analytics_portal_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  portal TEXT NOT NULL,
  metric_date DATE NOT NULL,
  unique_logins INT DEFAULT 0,
  total_sessions INT DEFAULT 0,
  api_calls INT DEFAULT 0,
  api_errors INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (org_id, portal, metric_date)
);
```

**Dashboard:**
```tsx
// apps/web/src/app/(app)/analytics/portal/page.tsx
export default function PortalAnalytics() {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardHeader>Supplier Portal</CardHeader>
        <CardContent>
          <p>Unique Logins: 1,234</p>
          <p>Invoices Submitted: 567</p>
          <LineChart data={supplierActivity} />
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>Customer Portal</CardHeader>
        <CardContent>
          <p>Unique Logins: 890</p>
          <p>Orders Placed: 345</p>
          <LineChart data={customerActivity} />
        </CardContent>
      </Card>
      
      {/* ... */}
    </div>
  );
}
```

**Success Criteria:**
- ✅ Real-time metrics (updated every 5 minutes)
- ✅ Exportable to CSV
- ✅ Filterable by date range
- ✅ Visible to org admins only

---

### 6.3 Phase 3: API Platform (Q4 2026)

#### 6.3.1 OpenAPI Documentation
**Objective:** Enable external developers to integrate with portals.

**Implementation:**
```typescript
// apps/api/src/plugins/openapi.ts
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "AFENDA Platform API",
      version: "1.0.0",
      description: "REST API for AFENDA Portals",
    },
    servers: [
      { url: "https://api.afenda.com", description: "Production" },
      { url: "https://api-staging.afenda.com", description: "Staging" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
});

await app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: false,
  },
});
```

**Route Documentation:**
```typescript
// apps/api/src/routes/erp/finance/ap.ts
app.post("/v1/commands/create-invoice", {
  schema: {
    description: "Submit a new invoice (Supplier Portal)",
    tags: ["Accounts Payable"],
    security: [{ bearerAuth: [] }],
    body: CreateInvoiceCommandSchema,
    response: {
      200: CreateInvoiceSuccessSchema,
      400: ValidationErrorSchema,
      403: InsufficientPermissionsSchema,
    },
  },
  handler: async (req, reply) => { /* ... */ }
});
```

**Success Criteria:**
- ✅ Swagger UI at https://api.afenda.com/docs
- ✅ All routes documented with examples
- ✅ "Try it out" functionality works
- ✅ OpenAPI 3.2 spec downloadable as JSON/YAML

---

#### 6.3.2 Webhooks for Portal Events
**Objective:** Notify external systems of portal activity.

**Schema:**
```sql
CREATE TABLE webhook_subscription (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organization(id),
  portal TEXT NOT NULL,
  url TEXT NOT NULL,            -- HTTPS endpoint
  secret TEXT NOT NULL,         -- HMAC signing secret
  events TEXT[] NOT NULL,       -- ["invoice.submitted", "order.placed"]
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES webhook_subscription(id),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL,         -- "pending" | "success" | "failed"
  http_status INT,
  retries INT DEFAULT 0,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Worker Handler:**
```typescript
// apps/worker/src/jobs/kernel/webhooks/deliver.ts
export async function deliverWebhook(payload: {
  subscriptionId: string;
  eventType: string;
  data: Record<string, unknown>;
}) {
  const subscription = await getWebhookSubscription(payload.subscriptionId);
  
  // HMAC signature
  const signature = crypto
    .createHmac("sha256", subscription.secret)
    .update(JSON.stringify(payload.data))
    .digest("hex");
  
  // POST to external endpoint
  const response = await fetch(subscription.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-AFENDA-Signature": signature,
      "X-AFENDA-Event": payload.eventType,
    },
    body: JSON.stringify(payload.data),
  });
  
  // Record delivery
  await recordWebhookDelivery({
    subscriptionId: payload.subscriptionId,
    eventType: payload.eventType,
    status: response.ok ? "success" : "failed",
    httpStatus: response.status,
  });
  
  // Retry on failure (exponential backoff)
  if (!response.ok) {
    await scheduleWebhookRetry(payload, retries: payload.retries + 1);
  }
}
```

**Success Criteria:**
- ✅ Webhooks fire in < 1 second of event
- ✅ HMAC signatures validate correctly
- ✅ Automatic retry with exponential backoff (1min, 5min, 30min, 2hr, 12hr)
- ✅ Dashboard shows delivery status

---

### 6.4 Phase 4: Mobile App (2027)

#### 6.4.1 React Native App (iOS + Android)
**Objective:** Native mobile experience for supplier/customer portals.

**Tech Stack:**
- **Framework:** Expo (React Native)
- **Auth:** NextAuth + React Native App Auth
- **API Client:** TanStack Query (React Query)
- **Contracts:** Shared Zod schemas from `@afenda/contracts`

**App Structure:**
```
apps/mobile/
  ├── src/
  │   ├── screens/
  │   │   ├── SupplierPortal/
  │   │   │   ├── InvoiceListScreen.tsx
  │   │   │   ├── SubmitInvoiceScreen.tsx
  │   │   │   └── OrderStatusScreen.tsx
  │   │   └── CustomerPortal/
  │   │       ├── OrderListScreen.tsx
  │   │       ├── OrderDetailScreen.tsx
  │   │       └── StatementScreen.tsx
  │   ├── hooks/
  │   │   ├── useAuth.ts
  │   │   └── useApi.ts
  │   └── navigation/
  │       ├── SupplierNavigator.tsx
  │       └── CustomerNavigator.tsx
  ├── app.json
  └── package.json
```

**Success Criteria:**
- ✅ App Store + Play Store published
- ✅ Push notifications for new orders/invoices
- ✅ Offline mode (cache invoices locally)
- ✅ Biometric login (Face ID / Fingerprint)

---

## 7. Enterprise Quality Requirements

### 7.1 No MVP Philosophy

**AFENDA launches with enterprise quality from day 1. No "MVP fast-follow" strategy.**

| Requirement Category | Standard | Enforcement |
|---------------------|----------|-------------|
| **Code Quality** | 100% TypeScript strict mode, zero `any` | CI gate: `typecheck` |
| **Test Coverage** | ≥ 80% for all packages | CI gate: `vitest --coverage` |
| **Performance** | < 200ms API p99 latency, < 2s page load | Load testing with k6 |
| **Security** | OWASP Top 10 coverage, no high CVEs | CI gate: `pnpm audit` |
| **Accessibility** | WCAG 2.1 AA compliance | CI gate: `axe-core` tests |
| **Documentation** | All public APIs documented (JSDoc) | CI gate: `eslint @typescript-eslint/require-jsdoc` |
| **Observability** | All critical paths instrumented | OpenTelemetry spans |
| **Disaster Recovery** | RPO < 1 hour, RTO < 4 hours | Daily DB backups, multi-region |

### 7.2 Production Readiness Checklist

#### 7.2.1 Security
- ✅ HTTPS enforced (HSTS enabled)
- ✅ JWT tokens expire in 8 hours (configurable)
- ✅ Password hashing with bcrypt (cost factor 12)
- ✅ Account lockout after 5 failed attempts
- ✅ CSRF protection on all POST/PUT/DELETE routes
- ✅ SQL injection impossible (Drizzle ORM parameterized queries)
- ✅ XSS protection (React escapes JSX by default)
- 🟡 CSP headers (to be implemented)
- 🟡 MFA/TOTP (to be implemented)
- 🟡 Session revocation (to be implemented)

#### 7.2.2 Performance
- ✅ Database indexes on all foreign keys
- ✅ Connection pooling (max 10 connections)
- ✅ Next.js static generation for marketing pages
- ✅ Dynamic rendering for authenticated pages
- 🟡 Redis caching for permissions (to be implemented)
- 🟡 CDN for static assets (to be implemented)
- 🟡 Read replicas for queries (to be implemented)

#### 7.2.3 Reliability
- ✅ Idempotency keys on all commands (24-hour dedup window)
- ✅ Retry logic in Graphile Worker (exponential backoff)
- ✅ Correlation IDs for distributed tracing
- ✅ Graceful degradation (API errors don't crash UI)
- 🟡 Circuit breakers for external services (to be implemented)
- 🟡 Health check endpoints (`/health`, `/ready`) (to be implemented)

#### 7.2.4 Observability
- ✅ Structured logging with Pino (JSON in production)
- ✅ Audit logs for all mutations
- 🔴 Distributed tracing (OpenTelemetry + Jaeger) — **CRITICAL GAP**
- 🔴 Error tracking (Sentry) — **CRITICAL GAP**
- 🔴 Metrics dashboard (Prometheus + Grafana) — **CRITICAL GAP**

---

## 8. Security & Compliance

### 8.1 Threat Model

#### 8.1.1 Threat Actors
1. **External Attacker** — Tries to access another org's data
2. **Malicious Supplier** — Tries to approve their own invoices
3. **Disgruntled Employee** — Tries to exfiltrate customer data
4. **AFENDA Insider** — Tries to abuse CID portal privileges

#### 8.1.2 Attack Vectors & Mitigations

| Attack Vector | Likelihood | Impact | Mitigation |
|--------------|-----------|--------|------------|
| **SQL Injection** | Low | Critical | Drizzle ORM (parameterized queries), no raw SQL |
| **XSS (Stored)** | Low | High | React escapes JSX, DOMPurify for rich text, CSP headers |
| **CSRF** | Medium | High | NextAuth CSRF tokens, SameSite cookies |
| **JWT Token Theft** | Medium | Critical | HttpOnly cookies, 8-hour expiry, session revocation |
| **Brute-Force Login** | High | Medium | Account lockout (5 failures → 15-min lockout) |
| **Privilege Escalation** | Medium | Critical | RBAC enforced at API layer, RLS at DB layer |
| **Data Exfiltration** | Medium | Critical | Audit logs, rate limiting, export throttling |
| **Org Confusion** | Low | Critical | `withOrgContext()` enforces org_id in all queries |
| **Portal Hopping** | Low | High | Middleware enforces `token.portal` matches route |

### 8.2 Compliance Roadmap

| Standard | Target Date | Status | Gaps |
|----------|------------|--------|------|
| **SOC 2 Type I** | Q2 2026 | 🟡 In Progress | MFA, session revocation, access logs |
| **SOC 2 Type II** | Q4 2026 | 🔴 Not Started | 6-month continuous audit |
| **ISO 27001** | Q1 2027 | 🔴 Not Started | ISMS documentation, risk assessments |
| **GDPR** | Q2 2026 | 🟡 In Progress | Data export, data deletion, consent tracking |
| **HIPAA** | Not Planned | ❌ Out of Scope | AFENDA is not a healthcare product |
| **PCI DSS** | Not Planned | ❌ Out of Scope | No credit card storage (use Stripe) |

---

## 9. Scalability & Performance

### 9.1 Load Profile (2026 Projections)

| Metric | Current | 6 Months | 12 Months | 24 Months |
|--------|---------|----------|-----------|-----------|
| **Organizations** | 10 | 500 | 2,000 | 10,000 |
| **Users** | 100 | 5,000 | 25,000 | 200,000 |
| **Supplier Portal Users** | 50 | 2,000 | 10,000 | 80,000 |
| **Daily API Requests** | 10K | 500K | 2M | 10M |
| **Database Size** | 500 MB | 10 GB | 50 GB | 500 GB |
| **Concurrent Users** | 10 | 200 | 1,000 | 5,000 |

### 9.2 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Latency (p50)** | < 50ms | Prometheus histogram |
| **API Latency (p99)** | < 200ms | Prometheus histogram |
| **Page Load (FCP)** | < 1.5s | Lighthouse CI |
| **Page Load (LCP)** | < 2.5s | Lighthouse CI |
| **Database Query (p99)** | < 100ms | pg_stat_statements |
| **Worker Job Pickup** | < 1s | LISTEN/NOTIFY latency |

### 9.3 Scaling Strategy

#### 9.3.1 Vertical Scaling (Short-Term)
- **App Server:** 2 vCPU, 4 GB RAM → 4 vCPU, 8 GB RAM
- **Database:** db.t3.medium → db.r6g.large (16 GB RAM)
- **Worker:** 1 worker → 4 workers (horizontal within same instance)

#### 9.3.2 Horizontal Scaling (Long-Term)
- **Load Balancer:** ALB distributes to 4+ Next.js instances
- **Database:** Primary + 2 read replicas (route queries via Drizzle)
- **Workers:** Kubernetes Deployment with HPA (scale 1 → 20 pods based on queue depth)
- **Redis:** Cluster mode (3+ nodes for high availability)

---

## 10. Monitoring & Observability

### 10.1 Key Metrics

#### 10.1.1 Golden Signals (per Portal)
```
Latency:   p50, p95, p99 response time (ms)
Traffic:   Requests per second (RPS)
Errors:    5xx rate (% of requests)
Saturation: CPU %, Memory %, DB connections used
```

#### 10.1.2 Business Metrics (per Portal)
```
Logins per day
Invoices submitted (supplier portal)
Orders placed (customer portal)
Reports viewed (investor portal)
Time to first action (onboarding metric)
```

### 10.2 Alerting Rules

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **API p99 > 500ms** | 5 min sustained | Warning | Investigate slow queries |
| **5xx rate > 1%** | 2 min sustained | Critical | Page on-call engineer |
| **DB connections > 80%** | 1 min sustained | Warning | Scale up connection pool |
| **Worker queue depth > 1000** | 5 min sustained | Warning | Scale up workers |
| **CID Portal login failure** | 5 consecutive failures | Critical | Potential breach attempt |
| **Disk usage > 85%** | 1 hour sustained | Warning | Expand storage |

---

## 11. Conclusion & Next Actions

### 11.1 Current State Summary

**AFENDA has a production-ready, enterprise-grade portal architecture** with:
- ✅ 7 portal types (app, supplier, customer, investor, franchisee, contractor, cid)
- ✅ Zero-trust multi-tenancy (RLS, middleware isolation, JWT portal claims)
- ✅ Type-safe contracts (Zod → TypeScript → PostgreSQL)
- ✅ Account lockout protection (brute-force mitigation)
- ✅ Membership revocation tracking (status lifecycle)
- ✅ Audit logging (all mutations tracked)
- ✅ 18 CI quality gates (enforcing best practices)

**However, critical gaps prevent SOC 2 compliance:**
- 🔴 No MFA/TOTP
- 🔴 No distributed tracing (OpenTelemetry)
- 🔴 No error tracking (Sentry)
- 🔴 No metrics dashboard (Prometheus + Grafana)
- 🔴 No GDPR data export/deletion
- 🔴 No session revocation

### 11.2 Immediate Priorities (Next 30 Days)

1. **Implement MFA/TOTP** (Security Gap #1)
   - [ ] Create `iam_principal_mfa` table
   - [ ] Build TOTP setup flow (`/settings/security/mfa`)
   - [ ] Integrate speakeasy library for TOTP verification
   - [ ] Enforce MFA for CID portal users

2. **Add OpenTelemetry Tracing** (Observability Gap #1)
   - [ ] Install `@opentelemetry/sdk-node`
   - [ ] Configure Jaeger exporter
   - [ ] Instrument Fastify routes (auto-instrumentation)
   - [ ] Instrument Drizzle queries (manual spans)

3. **Integrate Sentry** (Observability Gap #2)
   - [ ] Create Sentry project
   - [ ] Add `@sentry/nextjs` to `apps/web`
   - [ ] Add `@sentry/node` to `apps/api`
   - [ ] Configure error boundaries in React

4. **Build GDPR Export Endpoint** (Compliance Gap #1)
   - [ ] Create `/api/v1/queries/export-my-data` route
   - [ ] Query all tables with `principal_id` or `email`
   - [ ] Return JSON + CSV zip archive
   - [ ] Write audit log entry

### 11.3 Long-Term Roadmap

**Q2 2026:** Security hardening (MFA, OAuth scopes, IP allowlisting)  
**Q3 2026:** Portal customization (branding, analytics dashboard)  
**Q4 2026:** API platform (OpenAPI docs, webhooks)  
**Q1 2027:** Mobile app (React Native, iOS + Android)  
**Q2 2027:** SOC 2 Type II certification

---

**Document Maintained By:** AFENDA Platform Team  
**Review Cycle:** Quarterly  
**Next Review:** June 10, 2026

---

**End of Portal Architecture Document**
