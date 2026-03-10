# AFENDA Portal Architecture

**Version:** 2.0.0  
**Last Updated:** March 10, 2026  
**Status:** Production Implementation  
**Supersedes:** PORTAL-REFERENCE.md  

---

## Philosophy

> **"AFENDA is not building features. AFENDA is building truth."**

Portals are **actor-specific operating surfaces** that expose canonical domain truth.

**Portals do not own truth. Domains own truth. Portals present truth.**

---

## Table of Contents

1. [Architectural Law](#1-architectural-law)
2. [Portal Topology](#2-portal-topology)
3. [Three-Layer Model](#3-three-layer-model)
4. [Domain Ownership Matrix](#4-domain-ownership-matrix)
5. [Projection Layer Implementation](#5-projection-layer-implementation)
6. [Portal Isolation Enforcement](#6-portal-isolation-enforcement)
7. [Authentication & Session Model](#7-authentication--session-model)
8. [API Surface Design](#8-api-surface-design)
9. [CI Gates](#9-ci-gates)
10. [Implementation Patterns](#10-implementation-patterns)

---

## 1. Architectural Law

### 1.1 The Three Laws of Portal Architecture

#### Law 1: Domains Compute Truth
All canonical business entities belong to **one domain module**.

Portal logic **never** computes financial truth, lifecycle states, or business outcomes.

```typescript
// ✅ CORRECT — Domain computes truth
const balance = await ap.getSupplierBalance(supplierId);

// ❌ FORBIDDEN — Portal recomputes truth
const balance = invoices.reduce((sum, inv) => sum + inv.amount, 0);
```

#### Law 2: Projection Layer Shapes Truth
Portal views derive from **domain projections**, never raw domain tables.

```typescript
// ✅ CORRECT — Use projection
const statement = await supplierProjections.getStatement(supplierId);

// ❌ FORBIDDEN — Query raw domain tables
const invoices = await db.select().from(apInvoice).where(...);
```

#### Law 3: Portals Present Truth
Portals are **read-and-orchestrate surfaces** that route commands to domains.

```typescript
// ✅ CORRECT — Route command to domain
await ap.submitInvoice(command);

// ❌ FORBIDDEN — Portal implements business logic
if (invoice.amount > threshold) {
  invoice.requiresApproval = true; // Portal logic
}
```

---

### 1.2 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 1: Canonical Domain Layer                              │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Owns business truth                                        │
│ • Computes financial outcomes                                │
│ • Enforces business rules                                    │
│ • Manages lifecycle states                                   │
│ • Writes to canonical tables                                 │
│                                                              │
│ Packages: @afenda/core/erp/{ap,ar,gl,procurement,...}       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Projection / Interaction Layer                      │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Transforms domain truth for actors                         │
│ • Filters by portal/actor/org/permissions                    │
│ • Composes cross-domain views                                │
│ • Routes portal commands to domain services                  │
│ • Attaches evidence/audit references                         │
│                                                              │
│ Packages: @afenda/core/projections/{supplier,customer,...}  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Portal Experience Layer                             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Presents projections to actors                             │
│ • Provides UX-specific interactions                          │
│ • Enforces portal-level access control                       │
│ • Handles UI state (loading, errors, optimistic updates)     │
│                                                              │
│ Location: apps/web/src/app/portal/{supplier,customer,...}   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Portal Topology

### 2.1 Seven Portal Types

| Portal | Actor Class | Authentication | Purpose |
|--------|------------|----------------|---------|
| **app** | Organization employees | Email + password, OAuth | Internal multi-domain workspace |
| **supplier** | External vendors | Invitation-based | AP interaction surface |
| **customer** | External buyers | Invitation-based | AR transparency surface |
| **investor** | Financial stakeholders | Invitation-based | Investor relations surface |
| **franchisee** | Franchise operators | Invitation-based | Franchise management surface |
| **contractor** | External workers | Invitation-based | Project accounting surface |
| **cid** | AFENDA platform team | Email + password, IP-restricted | Multi-tenant administration |

### 2.2 Portal Characteristics

#### App Portal (Internal)
- **Route:** `/` (root)
- **Sign-In:** `/auth/signin?tab=personal` or `?tab=organization`
- **Modules:** Finance (AP, AR, GL), HRM, Governance, Audit
- **Access:** Organization membership + RBAC permissions
- **Multi-Domain:** Yes — all canonical domains accessible

#### External Portals (Supplier, Customer, Investor, Franchisee, Contractor)
- **Route:** `/portal/{portal-type}`
- **Sign-In:** `/auth/portal/{portal-type}/signin`
- **Modules:** Single dominant domain + limited supporting domains
- **Access:** Portal invitation + party relationship
- **Multi-Domain:** No — scoped to dominant domain projections

#### CID Portal (Platform Administration)
- **Route:** `/portal/cid`
- **Sign-In:** `/auth/portal/cid/signin`
- **Modules:** Platform control plane, tenant management
- **Access:** AFENDA employee + IP allowlist
- **Multi-Domain:** Cross-org access (no `org_id` isolation)

---

## 3. Three-Layer Model

### 3.1 Layer 1: Canonical Domain Layer

**Responsibility:** Own and compute all business truth.

**Location:** `packages/core/src/erp/{domain}/`

**Key Domains:**
- **AP (Accounts Payable)** — Supplier invoices, payables ledger, 3-way matching
- **AR (Accounts Receivable)** — Customer invoices, receivables ledger, cash application
- **GL (General Ledger)** — Journal entries, chart of accounts, trial balance
- **Treasury** — Payments, receipts, bank reconciliation
- **Procurement** — Purchase orders, RFQs, supplier contracts
- **Investor Relations** — Investor records, buy/sell queue, disclosures
- **Franchise** — Franchise agreements, royalties, compliance
- **Project Accounting** — Work orders, milestones, contractor assignments

**Domain Rules:**
1. ✅ All financial calculations happen here
2. ✅ All lifecycle state machines live here
3. ✅ All business rules enforced here
4. ✅ All mutations write to canonical tables
5. ❌ Domains never reference portal types
6. ❌ Domains never filter by `portal` claim

**Example:**
```typescript
// packages/core/src/erp/finance/ap/supplier-balance.ts
export async function getSupplierBalance(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<SupplierBalance> {
  // Query canonical AP tables
  const payables = await withOrgContext(db, ctx, async (tx) => {
    return tx.query.apInvoice.findMany({
      where: eq(apInvoice.supplierId, supplierId)
    });
  });
  
  // Compute balance from canonical truth
  const balance = payables.reduce((sum, inv) => {
    return sum + (inv.amount - inv.paidAmount);
  }, 0n);
  
  return { supplierId, balance, asOf: new Date() };
}
```

---

### 3.2 Layer 2: Projection / Interaction Layer

**Responsibility:** Transform canonical truth into actor-safe, portal-safe views.

**Location:** `packages/core/src/projections/{portal}/`

**Six Responsibilities:**

#### A. Read Shaping
Transform domain entities into UX-ready structures.

```typescript
// packages/core/src/projections/supplier/queries/get-statement.ts
export async function getSupplierStatement(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<SupplierStatementProjection> {
  // 1. Get canonical balance from AP domain
  const balance = await ap.getSupplierBalance(db, ctx, supplierId);
  
  // 2. Get payment status from Treasury domain
  const payments = await treasury.getSupplierPayments(db, ctx, supplierId);
  
  // 3. Get PO references from Procurement domain
  const orders = await procurement.getSupplierOrders(db, ctx, supplierId);
  
  // 4. Compose into supplier-safe projection
  return {
    projectionType: "supplier-statement",
    dominantDomain: "ap",
    correlationId: ctx.correlationId,
    sourceRefs: {
      apBalanceRef: balance.sourceRef,
      treasuryPaymentRef: payments.sourceRef,
    },
    data: {
      supplierId,
      supplierName: balance.supplierName,
      totalOutstanding: balance.balance,
      openInvoices: balance.openItems.map(item => ({
        invoiceNumber: item.number,
        date: item.date,
        amount: item.amount,
        dueDate: item.dueDate,
        status: item.status,
        // NO internal workflow states exposed
      })),
      recentPayments: payments.recent.map(pmt => ({
        date: pmt.date,
        amount: pmt.amount,
        reference: pmt.reference,
      })),
      relatedOrders: orders.active.map(order => ({
        poNumber: order.number,
        date: order.date,
        status: order.status,
      })),
    },
  };
}
```

#### B. Access Scoping
Filter projections by actor permissions.

```typescript
// packages/core/src/projections/supplier/policies/can-view-invoice.ts
export async function canViewInvoice(
  ctx: Context,
  invoice: Invoice
): Promise<boolean> {
  // Portal-level check
  if (ctx.portal !== "supplier") return false;
  
  // Relationship check
  const partyRole = await getPartyRole(ctx.principalId);
  if (partyRole?.partyId !== invoice.supplierId) return false;
  
  // Org-level check
  if (ctx.activeContext.orgId !== invoice.orgId) return false;
  
  return true;
}
```

#### C. Cross-Domain Composition
Join multiple domain outputs without changing ownership.

```typescript
// packages/core/src/projections/supplier/composers/build-dashboard.ts
export async function buildSupplierDashboard(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<SupplierDashboardProjection> {
  // Parallel domain queries
  const [balance, payments, orders, disputes] = await Promise.all([
    ap.getSupplierBalance(db, ctx, supplierId),        // AP domain
    treasury.getSupplierPayments(db, ctx, supplierId), // Treasury domain
    procurement.getSupplierOrders(db, ctx, supplierId),// Procurement domain
    ap.getSupplierDisputes(db, ctx, supplierId),       // AP domain
  ]);
  
  return {
    projectionType: "supplier-dashboard",
    dominantDomain: "ap",
    supportingDomains: ["treasury", "procurement"],
    data: {
      summary: {
        totalOutstanding: balance.balance,
        overdueAmount: balance.overdueAmount,
        nextPaymentDate: payments.next?.date,
      },
      actionItems: [
        ...disputes.open.map(d => ({ type: "dispute", ...d })),
        ...orders.pendingAck.map(o => ({ type: "po-ack", ...o })),
      ],
    },
  };
}
```

#### D. Experience Orchestration
Prepare UX-ready task lists and workflows.

```typescript
// packages/core/src/projections/supplier/composers/build-task-inbox.ts
export async function buildSupplierTaskInbox(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<TaskInboxProjection> {
  const tasks: Task[] = [];
  
  // AP domain — invoice exceptions
  const exceptions = await ap.getInvoiceExceptions(db, ctx, supplierId);
  tasks.push(...exceptions.map(ex => ({
    id: ex.id,
    type: "invoice-exception",
    title: `Invoice ${ex.invoiceNumber} requires attention`,
    description: ex.reason,
    priority: "high",
    dueDate: ex.resolveDueDate,
    actions: ["upload-document", "provide-clarification"],
  })));
  
  // Procurement domain — PO acknowledgements
  const pendingPos = await procurement.getPendingAcknowledgements(db, ctx, supplierId);
  tasks.push(...pendingPos.map(po => ({
    id: po.id,
    type: "po-acknowledgement",
    title: `Acknowledge PO ${po.number}`,
    description: `Expected delivery: ${po.expectedDate}`,
    priority: "medium",
    dueDate: po.ackDueDate,
    actions: ["acknowledge", "reject", "request-change"],
  })));
  
  return {
    projectionType: "task-inbox",
    dominantDomain: "ap",
    data: { tasks },
  };
}
```

#### E. Evidence Attachment
Link projections back to audit trail.

```typescript
// All projections include source references
export interface ProjectionEnvelope<T> {
  projectionType: string;
  dominantDomain: string;
  supportingDomains?: string[];
  correlationId: string;
  sourceRefs: {
    [domain: string]: string; // Reference to canonical record
  };
  auditRef?: string; // Link to audit log entry
  evidenceRefs?: string[]; // Supporting documents
  generatedAt: Date;
  data: T;
}
```

#### F. Bounded Command Routing
Route portal actions to domain commands.

```typescript
// packages/core/src/projections/supplier/interactions/submit-invoice.ts
export async function submitInvoiceFromPortal(
  db: Db,
  ctx: Context,
  command: SupplierSubmitInvoiceCommand
): Promise<Result<Invoice>> {
  // 1. Validate portal context
  if (ctx.portal !== "supplier") {
    return { ok: false, error: "PORTAL_UNAUTHORIZED" };
  }
  
  // 2. Enrich with supplier context
  const partyRole = await getPartyRole(ctx.principalId);
  const enrichedCommand = {
    ...command,
    supplierId: partyRole.partyId,
    submittedVia: "supplier-portal",
    submittedBy: ctx.principalId,
  };
  
  // 3. Route to canonical AP domain command
  return ap.submitInvoice(db, ctx, enrichedCommand);
  
  // Portal NEVER writes to ap_invoice table directly
}
```

---

### 3.3 Layer 3: Portal Experience Layer

**Responsibility:** Present projections to actors, handle UI state.

**Location:** `apps/web/src/app/portal/{portal}/`

**Portal UI Rules:**
1. ✅ Use React Server Components for initial data
2. ✅ Use projection queries (never raw domain queries)
3. ✅ Route mutations to projection interaction handlers
4. ✅ Handle loading/error states gracefully
5. ✅ Use shadcn/ui components (no raw HTML)
6. ❌ Never compute business logic in UI
7. ❌ Never directly query domain tables
8. ❌ Never store portal-local canonical state

**Example:**
```tsx
// apps/web/src/app/portal/supplier/page.tsx
import { getSupplierDashboard } from "@afenda/core/projections/supplier";

export default async function SupplierPortalHome() {
  const ctx = await getServerContext();
  const partyRole = await getPartyRole(ctx.principalId);
  
  // Query projection layer
  const dashboard = await getSupplierDashboard(
    db, 
    ctx, 
    partyRole.partyId
  );
  
  return (
    <div>
      <DashboardHeader 
        supplierId={dashboard.data.summary.supplierId}
        totalOutstanding={dashboard.data.summary.totalOutstanding}
      />
      
      <TaskInbox tasks={dashboard.data.actionItems} />
      
      <RecentActivity 
        payments={dashboard.data.recentPayments}
        invoices={dashboard.data.recentInvoices}
      />
    </div>
  );
}
```

---

## 4. Domain Ownership Matrix

### 4.1 Portal → Domain Mapping

| Portal | Dominant Domain | Supporting Domains | Ownership Rule |
|--------|----------------|-------------------|----------------|
| **Supplier** | Accounts Payable | Procurement, Treasury | All payable truth from AP. Procurement provides PO context. Treasury provides payment execution. |
| **Customer** | Accounts Receivable | Sales/CRM, Treasury | All receivable truth from AR. Sales provides order context. Treasury provides receipt posting. |
| **Investor** | Investor Relations | Reporting, Governance | All investor records from IR. Reporting provides statements. Governance provides disclosures. |
| **Contractor** | Project Accounting | Contracts, Procurement, AP | All work orders from Project. AP provides payable status. Contracts provide agreement terms. |
| **Franchisee** | Franchise Management | Training, Performance, Finance | All franchise records from Franchise. Finance provides royalty obligations. Training provides curriculum. |
| **CID** | Platform Control Plane | IAM, Tenant Mgmt, Support | All tenant records from Platform. IAM provides access control. Support provides case context. |
| **App** | Multi-Domain Shell | All domains | No single dominant domain. Modules accessed via RBAC permissions. |

### 4.2 Entity Ownership Table

| Canonical Entity | Owner Domain | Portal Visibility |
|-----------------|-------------|-------------------|
| **ap_invoice** | Accounts Payable | App (finance users), Supplier (own invoices only) |
| **ar_invoice** | Accounts Receivable | App (finance users), Customer (own invoices only) |
| **journal_entry** | General Ledger | App (finance users with gl.entry.view) |
| **purchase_order** | Procurement | App (procurement users), Supplier (own POs only) |
| **payment** | Treasury | App (treasury users), Supplier (own payments only) |
| **investor_record** | Investor Relations | App (IR users), Investor (own record only) |
| **franchise_agreement** | Franchise | App (franchise users), Franchisee (own agreement only) |
| **work_order** | Project Accounting | App (project users), Contractor (assigned orders only) |

---

## 5. Projection Layer Implementation

### 5.1 Package Structure

```
packages/core/src/projections/
├── supplier/
│   ├── queries/
│   │   ├── get-statement.ts
│   │   ├── get-payment-status.ts
│   │   ├── get-open-items.ts
│   │   └── get-invoice-detail.ts
│   ├── composers/
│   │   ├── build-dashboard.ts
│   │   ├── build-task-inbox.ts
│   │   └── build-payment-timeline.ts
│   ├── policies/
│   │   ├── can-view-invoice.ts
│   │   ├── can-submit-invoice.ts
│   │   └── can-view-payment.ts
│   ├── interactions/
│   │   ├── submit-invoice.ts
│   │   ├── acknowledge-po.ts
│   │   ├── upload-document.ts
│   │   └── raise-dispute.ts
│   └── types/
│       ├── projection-envelope.ts
│       └── supplier-view-models.ts
├── customer/
│   ├── queries/
│   ├── composers/
│   ├── policies/
│   ├── interactions/
│   └── types/
├── investor/
│   ├── queries/
│   ├── composers/
│   ├── policies/
│   ├── interactions/
│   └── types/
├── contractor/
│   ├── queries/
│   ├── composers/
│   ├── policies/
│   ├── interactions/
│   └── types/
├── franchisee/
│   ├── queries/
│   ├── composers/
│   ├── policies/
│   ├── interactions/
│   └── types/
└── cid/
    ├── queries/
    ├── composers/
    ├── policies/
    ├── interactions/
    └── types/
```

### 5.2 Projection Envelope Standard

**All projections MUST use this structure:**

```typescript
// packages/core/src/projections/shared/projection-envelope.ts
export interface ProjectionEnvelope<T> {
  // Metadata
  projectionType: string;           // "supplier-statement" | "customer-dashboard" etc.
  dominantDomain: string;           // "ap" | "ar" | "ir" etc.
  supportingDomains?: string[];     // ["treasury", "procurement"]
  
  // Traceability
  correlationId: string;            // Request correlation ID
  sourceRefs: Record<string, string>; // { ap: "inv-123", treasury: "pmt-456" }
  auditRef?: string;                // Link to audit_log entry
  evidenceRefs?: string[];          // Document attachments
  
  // Temporal
  generatedAt: Date;                // Projection generation timestamp
  validUntil?: Date;                // Cache TTL
  
  // Payload
  data: T;
}

// Usage example
export type SupplierStatementProjection = ProjectionEnvelope<{
  supplierId: string;
  supplierName: string;
  totalOutstanding: bigint;
  overdueAmount: bigint;
  openInvoices: Array<{
    invoiceNumber: string;
    date: Date;
    amount: bigint;
    dueDate: Date;
    status: string;
  }>;
  recentPayments: Array<{
    date: Date;
    amount: bigint;
    reference: string;
  }>;
}>;
```

### 5.3 Projection Classes

#### Class A: Pure Projections
Direct read models from one canonical domain.

```typescript
// Class A — Single domain, no joins
export async function getSupplierOpenItems(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<ProjectionEnvelope<OpenItemsData>> {
  // Query ONLY AP domain
  const items = await ap.getOpenItems(db, ctx, supplierId);
  
  return {
    projectionType: "supplier-open-items",
    dominantDomain: "ap",
    correlationId: ctx.correlationId,
    sourceRefs: { ap: `supplier:${supplierId}` },
    generatedAt: new Date(),
    data: items,
  };
}
```

#### Class B: Composite Projections
Joined read models across domains (read-only).

```typescript
// Class B — Multi-domain composition
export async function getSupplierPaymentTimeline(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<ProjectionEnvelope<PaymentTimelineData>> {
  // Join AP + Treasury
  const [invoices, payments] = await Promise.all([
    ap.getSupplierInvoices(db, ctx, supplierId),
    treasury.getSupplierPayments(db, ctx, supplierId),
  ]);
  
  // Merge timelines (no recalculation)
  const timeline = mergeTimelines(invoices, payments);
  
  return {
    projectionType: "supplier-payment-timeline",
    dominantDomain: "ap",
    supportingDomains: ["treasury"],
    correlationId: ctx.correlationId,
    sourceRefs: {
      ap: `invoices:${supplierId}`,
      treasury: `payments:${supplierId}`,
    },
    generatedAt: new Date(),
    data: timeline,
  };
}
```

#### Class C: Interaction Projections
Views that include actionable state and allowed commands.

```typescript
// Class C — Actionable projection
export async function getSupplierTaskInbox(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<ProjectionEnvelope<TaskInboxData>> {
  // Query domain state
  const tasks = await buildSupplierTaskInbox(db, ctx, supplierId);
  
  // Determine allowed actions per task
  const enrichedTasks = await Promise.all(
    tasks.map(async (task) => ({
      ...task,
      allowedActions: await getAllowedActions(ctx, task),
    }))
  );
  
  return {
    projectionType: "supplier-task-inbox",
    dominantDomain: "ap",
    supportingDomains: ["procurement", "workflow"],
    correlationId: ctx.correlationId,
    sourceRefs: { workflow: "task-queue" },
    generatedAt: new Date(),
    data: { tasks: enrichedTasks },
  };
}
```

---

## 6. Portal Isolation Enforcement

### 6.1 Middleware Guards

**Location:** `apps/web/src/proxy.ts`

**Enforcement Points:**
1. JWT portal claim validation
2. Route-based portal path matching
3. Cross-portal access blocking
4. Portal-to-app spillover prevention

```typescript
// apps/web/src/proxy.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Bypass paths (static assets, API routes)
  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }
  
  // Public paths (marketing, auth)
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  
  // Get JWT token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });
  
  if (!token) {
    return redirectTo(request, "/auth/signin");
  }
  
  // Resolve portal from token
  const portal = resolvePortal(token);
  if (!portal) {
    return redirectTo(request, "/auth/signin");
  }
  
  // ENFORCE PORTAL ISOLATION
  
  // Supplier users → Supplier portal only
  if (portal === "supplier") {
    if (!isSupplierPortalPath(pathname)) {
      return redirectTo(request, "/portal/supplier");
    }
  }
  
  // Customer users → Customer portal only
  if (portal === "customer") {
    if (!isCustomerPortalPath(pathname)) {
      return redirectTo(request, "/portal/customer");
    }
  }
  
  // Investor users → Investor portal only
  if (portal === "investor") {
    if (!isInvestorPortalPath(pathname)) {
      return redirectTo(request, "/portal/investor");
    }
  }
  
  // Franchisee users → Franchisee portal only
  if (portal === "franchisee") {
    if (!isFranchiseePortalPath(pathname)) {
      return redirectTo(request, "/portal/franchisee");
    }
  }
  
  // Contractor users → Contractor portal only
  if (portal === "contractor") {
    if (!isContractorPortalPath(pathname)) {
      return redirectTo(request, "/portal/contractor");
    }
  }
  
  // CID users → CID portal only
  if (portal === "cid") {
    if (!isCidPortalPath(pathname)) {
      return redirectTo(request, "/portal/cid");
    }
  }
  
  // App users → Cannot access external portals
  if (portal === "app") {
    if (isPortalPath(pathname)) {
      return redirectTo(request, "/");
    }
  }
  
  return NextResponse.next();
}
```

### 6.2 Database-Level Isolation (RLS)

**PostgreSQL Row-Level Security enforces org-level isolation.**

```sql
-- Example RLS policy for ap_invoice table
CREATE POLICY ap_invoice_isolation ON ap_invoice
  USING (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE ap_invoice ENABLE ROW LEVEL SECURITY;
```

**Every query uses `withOrgContext()`:**

```typescript
// packages/db/src/client.ts
export async function withOrgContext<T>(
  db: Db,
  ctx: { orgId: string; principalId: string },
  callback: (tx: DbTransaction) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => {
    // Set PostgreSQL GUCs
    await tx.execute(sql`SET LOCAL app.org_id = ${ctx.orgId}`);
    await tx.execute(sql`SET LOCAL app.principal_id = ${ctx.principalId}`);
    
    // Execute callback — RLS policies now enforced
    return callback(tx);
  });
}
```

### 6.3 API-Level Validation

**Fastify middleware enforces portal-scoped permissions.**

```typescript
// apps/api/src/hooks/check-portal-access.ts
export async function checkPortalAccess(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { portal } = request.ctx;
  const { route } = request;
  
  // Supplier portal users can only access AP commands
  if (portal === "supplier") {
    if (!route.startsWith("/v1/commands/ap/")) {
      reply.code(403).send({
        error: { code: "PORTAL_INSUFFICIENT_ACCESS" }
      });
    }
  }
  
  // Customer portal users can only access AR queries
  if (portal === "customer") {
    if (!route.startsWith("/v1/queries/ar/")) {
      reply.code(403).send({
        error: { code: "PORTAL_INSUFFICIENT_ACCESS" }
      });
    }
  }
  
  // Continue...
}
```

---

## 7. Authentication & Session Model

### 7.1 JWT Claims Structure

```typescript
interface AfendaJWT {
  // NextAuth standard claims
  sub: string;              // principalId
  email: string;
  name: string;
  iat: number;
  exp: number;
  
  // AFENDA custom claims
  portal: PortalType;       // "app" | "supplier" | "customer" | etc.
  orgId: string;            // Active organization
  partyRoleId: string;      // Party role assignment ID
  permissions: string[];    // Flattened permission keys
  
  // Optional claims
  scopes?: string[];        // OAuth 2.0 scopes (future)
  mfaVerified?: boolean;    // MFA status (future)
}
```

### 7.2 Portal Invitation Flow

```
┌───────────────────────────────────────────────────────────────┐
│ Step 1: Org Admin sends invitation                            │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                │
│ POST /api/v1/commands/send-portal-invitation                  │
│ {                                                              │
│   orgId: "...",                                                │
│   email: "vendor@example.com",                                │
│   portal: "supplier",                                          │
│   partyKind: "organization",                                   │
│   partyName: "ACME Supplies Inc."                             │
│ }                                                              │
│                                                                │
│ Backend creates:                                               │
│   - person (if not exists)                                     │
│   - iam_principal (if not exists)                             │
│   - auth_portal_invitation (token, expires 7 days)            │
│   - Sends email with link: /auth/portal/accept?token=...      │
└───────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────┐
│ Step 2: Invited user accepts invitation                        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                │
│ GET /auth/portal/accept?token=...                             │
│                                                                │
│ User sets password (if new principal):                         │
│   POST /api/v1/commands/accept-portal-invitation              │
│   {                                                            │
│     token: "...",                                              │
│     password: "..."                                            │
│   }                                                            │
│                                                                │
│ Backend creates:                                               │
│   - party (if needed)                                          │
│   - party_role_assignment (org → person, role = "Supplier")  │
│   - Updates auth_portal_invitation.accepted_at                │
└───────────────────────────────────────────────────────────────┘
                            ↓
┌───────────────────────────────────────────────────────────────┐
│ Step 3: User signs in                                          │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                │
│ POST /api/auth/callback/credentials                           │
│ {                                                              │
│   email: "vendor@example.com",                                │
│   password: "...",                                             │
│   portal: "supplier"                                           │
│ }                                                              │
│                                                                │
│ NextAuth CredentialsProvider:                                  │
│   1. Validate credentials                                      │
│   2. Check account lockout status                              │
│   3. Verify portal membership                                  │
│   4. Create JWT with portal claim                              │
│                                                                │
│ JWT created with claims:                                       │
│ {                                                              │
│   sub: principalId,                                            │
│   portal: "supplier",                                          │
│   orgId: "...",                                                │
│   permissions: ["ap.invoice.submit", "ap.invoice.view"]       │
│ }                                                              │
└───────────────────────────────────────────────────────────────┘
```

---

## 8. API Surface Design

### 8.1 Portal-Scoped Endpoints

**Commands routed through projection layer:**

```typescript
// apps/api/src/routes/portals/supplier.ts
export async function supplierRoutes(app: FastifyInstance) {
  // Submit invoice (supplier portal only)
  app.post("/v1/portals/supplier/commands/submit-invoice", {
    schema: {
      body: SupplierSubmitInvoiceCommandSchema,
      response: {
        200: InvoiceSubmittedSuccessSchema,
        400: ValidationErrorSchema,
        403: InsufficientPermissionsSchema,
      },
    },
    preHandler: [checkPortal("supplier")],
    handler: async (req, reply) => {
      const result = await submitInvoiceFromPortal(
        app.db,
        req.ctx,
        req.body
      );
      
      if (!result.ok) {
        return reply.code(400).send({ error: result.error });
      }
      
      return reply.code(200).send({ data: result.value });
    },
  });
  
  // Get statement (supplier portal only)
  app.get("/v1/portals/supplier/queries/statement/:supplierId", {
    schema: {
      params: z.object({ supplierId: z.string().uuid() }),
      response: {
        200: SupplierStatementProjectionSchema,
        403: InsufficientPermissionsSchema,
      },
    },
    preHandler: [checkPortal("supplier")],
    handler: async (req, reply) => {
      const statement = await getSupplierStatement(
        app.db,
        req.ctx,
        req.params.supplierId
      );
      
      return reply.code(200).send({ data: statement });
    },
  });
}
```

### 8.2 Error Response Standards

```typescript
// Consistent error structure
interface ApiError {
  error: {
    code: string;              // "AP_INVOICE_DUPLICATE" | "IAM_INSUFFICIENT_PERMISSIONS"
    message: string;           // Human-readable message
    correlationId: string;     // Request correlation ID
    details?: Record<string, unknown>; // Additional context
  };
}

// Usage
return reply.code(403).send({
  error: {
    code: "PORTAL_INSUFFICIENT_ACCESS",
    message: "Supplier portal users cannot approve invoices",
    correlationId: req.correlationId,
    details: {
      portal: req.ctx.portal,
      requiredPortal: "app",
    },
  },
});
```

---

## 9. CI Gates

### 9.1 Portal-Specific Gates

**Location:** `tools/gates/portal-*.mjs`

#### Gate 1: `portal-domain-ownership`
**Fail if:** Portal packages write directly to canonical domain tables.

```javascript
// tools/gates/portal-domain-ownership.mjs
// Scan all projection files for direct domain table writes
const violations = await scanProjectionFiles((filePath, content) => {
  // Look for db.insert(apInvoice) or db.update(arInvoice) etc.
  const directWrites = content.match(/db\.(insert|update|delete)\([a-z]+Invoice/g);
  
  if (directWrites) {
    return {
      file: filePath,
      violation: "Projection layer must not write to canonical domain tables",
      fix: "Use domain command functions instead"
    };
  }
});
```

#### Gate 2: `projection-finance-no-recompute`
**Fail if:** Financial balances recalculated outside AP/AR/Treasury.

```javascript
// tools/gates/projection-finance-no-recompute.mjs
const violations = await scanProjectionFiles((filePath, content) => {
  // Look for balance calculations
  const balanceCalc = content.match(/\.reduce\(\(sum.*amount/g);
  
  if (balanceCalc && !filePath.includes("/erp/finance/")) {
    return {
      file: filePath,
      violation: "Financial balances must compute in AP/AR/Treasury domains",
      fix: "Call domain.getBalance() instead of recalculating"
    };
  }
});
```

#### Gate 3: `projection-naming-ownership`
**Fail if:** Projection names don't indicate domain ownership.

```javascript
// tools/gates/projection-naming-ownership.mjs
const violations = await scanProjectionFiles((filePath, content) => {
  // Extract projection type strings
  const projections = content.match(/projectionType:\s*["']([^"']+)["']/g);
  
  projections?.forEach(proj => {
    const type = proj.match(/["']([^"']+)["']/)[1];
    
    // Must include domain prefix (ap-, ar-, ir-, etc.)
    if (!type.match(/^(ap|ar|gl|treasury|ir|franchise|project)-/)) {
      violations.push({
        file: filePath,
        violation: `Projection type "${type}" must include domain prefix`,
        fix: "Use format: {domain}-{projection-name}"
      });
    }
  });
});
```

#### Gate 4: `portal-no-raw-domain-query`
**Fail if:** Portal UI queries raw domain tables directly.

```javascript
// tools/gates/portal-no-raw-domain-query.mjs
const violations = await scanPortalFiles((filePath, content) => {
  // Look for db.query.{domainTable}
  const rawQueries = content.match(/db\.query\.(ap|ar|gl|treasury)[A-Z]/g);
  
  if (rawQueries) {
    return {
      file: filePath,
      violation: "Portal UI must query projection layer, not raw domain tables",
      fix: "Import projection query functions instead"
    };
  }
});
```

### 9.2 Existing Gates (Apply to Portals)

1. **boundaries** — Import direction law (no portal → domain imports)
2. **module-boundaries** — Pillar structure enforcement
3. **org-isolation** — Multi-tenant isolation checks
4. **finance-invariants** — Money types, immutability
5. **audit-enforcement** — Audit logs on mutations
6. **shadcn-enforcement** — UI component standards

**Run all gates:**
```bash
pnpm check:all
```

---

## 10. Implementation Patterns

### 10.1 Adding a New Portal Feature

**Example: Add "Download Statement PDF" to Supplier Portal**

#### Step 1: Domain Service (if needed)
```typescript
// packages/core/src/erp/finance/ap/statement-pdf.ts
export async function generateStatementPdf(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<Buffer> {
  // Get canonical balance
  const balance = await getSupplierBalance(db, ctx, supplierId);
  
  // Generate PDF from canonical data
  const pdf = await createPdf({
    title: `Supplier Statement - ${balance.supplierName}`,
    data: balance,
  });
  
  // Write audit log
  await writeAuditLog(db, ctx, {
    action: "ap.statement.generated",
    entityType: "supplier",
    entityId: supplierId,
  });
  
  return pdf;
}
```

#### Step 2: Projection Interaction
```typescript
// packages/core/src/projections/supplier/interactions/download-statement.ts
import { generateStatementPdf } from "@afenda/core/erp/finance/ap";

export async function downloadStatementFromPortal(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<Result<Buffer>> {
  // Validate portal access
  if (ctx.portal !== "supplier") {
    return { ok: false, error: "PORTAL_UNAUTHORIZED" };
  }
  
  // Validate supplier relationship
  const partyRole = await getPartyRole(ctx.principalId);
  if (partyRole.partyId !== supplierId) {
    return { ok: false, error: "SUPPLIER_MISMATCH" };
  }
  
  // Route to domain service
  const pdf = await generateStatementPdf(db, ctx, supplierId);
  
  return { ok: true, value: pdf };
}
```

#### Step 3: API Endpoint
```typescript
// apps/api/src/routes/portals/supplier.ts
app.get("/v1/portals/supplier/queries/statement/:supplierId/pdf", {
  schema: {
    params: z.object({ supplierId: z.string().uuid() }),
    response: {
      200: z.instanceof(Buffer),
      403: InsufficientPermissionsSchema,
    },
  },
  preHandler: [checkPortal("supplier")],
  handler: async (req, reply) => {
    const result = await downloadStatementFromPortal(
      app.db,
      req.ctx,
      req.params.supplierId
    );
    
    if (!result.ok) {
      return reply.code(403).send({ error: result.error });
    }
    
    return reply
      .code(200)
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", "attachment; filename=statement.pdf")
      .send(result.value);
  },
});
```

#### Step 4: Portal UI
```tsx
// apps/web/src/app/portal/supplier/statement/page.tsx
import { downloadStatement } from "@/lib/api/supplier";

export default function SupplierStatementPage() {
  const handleDownload = async () => {
    const blob = await downloadStatement(supplierId);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "statement.pdf";
    a.click();
  };
  
  return (
    <div>
      <Button onClick={handleDownload}>
        Download Statement PDF
      </Button>
    </div>
  );
}
```

---

### 10.2 Portal Command Pattern

**All portal commands follow this pattern:**

```typescript
// 1. Portal interaction function (projection layer)
export async function {action}FromPortal(
  db: Db,
  ctx: Context,
  command: {Action}Command
): Promise<Result<{Entity}>> {
  // Step 1: Validate portal context
  if (ctx.portal !== "{expected-portal}") {
    return { ok: false, error: "PORTAL_UNAUTHORIZED" };
  }
  
  // Step 2: Validate actor permissions
  if (!hasPermission(ctx, "{required-permission}")) {
    return { ok: false, error: "IAM_INSUFFICIENT_PERMISSIONS" };
  }
  
  // Step 3: Enrich command with portal context
  const enrichedCommand = {
    ...command,
    submittedVia: "{portal}-portal",
    submittedBy: ctx.principalId,
  };
  
  // Step 4: Route to canonical domain command
  return {domain}.{action}(db, ctx, enrichedCommand);
  
  // NEVER write to domain tables directly
}

// 2. API route (portal-scoped)
app.post("/v1/portals/{portal}/commands/{action}", {
  schema: {
    body: {Action}CommandSchema,
    response: { 200: {Action}SuccessSchema },
  },
  preHandler: [checkPortal("{portal}")],
  handler: async (req, reply) => {
    const result = await {action}FromPortal(app.db, req.ctx, req.body);
    
    if (!result.ok) {
      return reply.code(400).send({ error: result.error });
    }
    
    return reply.code(200).send({ data: result.value });
  },
});

// 3. Portal UI (React Server Action)
"use server";
export async function {action}Action(formData: FormData) {
  const command = {Action}CommandSchema.parse({
    // Parse form data
  });
  
  const result = await {action}FromPortal(db, ctx, command);
  
  if (!result.ok) {
    return { error: result.error };
  }
  
  revalidatePath("/portal/{portal}");
  return { success: true };
}
```

---

## Conclusion

**AFENDA portals exist to serve actors, not to fragment truth.**

**Every portal follows the pattern:**

```
Canonical Domain (owns truth)
     ↓
Projection Layer (shapes truth)
     ↓
Portal Surface (presents truth)
```

**This ensures:**
- ✅ Financial correctness
- ✅ Audit integrity
- ✅ Domain clarity
- ✅ Platform scalability
- ✅ Truth remains singular

---

**"We are not building features. We are building truth."**

---

**Document Maintained By:** AFENDA Platform Team  
**Review Cycle:** Quarterly  
**Next Review:** June 10, 2026  
**Related Documents:**
- [PORTAL-DOCTRINE.md](./PORTAL-DOCTRINE.md) — Philosophical principles
- [PORTAL-ARCHITECTURE-LAYER.md](./PORTAL-ARCHITECTURE-LAYER.md) — Projection layer details
- [PORTAL-REFERENCE.md](./PORTAL-REFERENCE.md) — Industry benchmarks & gap analysis

---
