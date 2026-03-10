# AFENDA Portal Documentation

**Purpose:** Complete reference for AFENDA's multi-portal architecture.

---

## Document Hierarchy

### 1. [PORTAL-DOCTRINE.md](./PORTAL-DOCTRINE.md) 📜
**Philosophy & Principles**

- What portals are (and are not)
- Domain ownership rules
- Anti-patterns to avoid
- Architectural laws

**Read this first** — establishes foundational principles.

---

### 2. [PORTAL-ARCHITECTURE-LAYER.md](./PORTAL-ARCHITECTURE-LAYER.md) 🏗️
**Projection Layer Architecture**

- Three-layer model (Domain → Projection → Portal)
- Projection responsibilities (6 core functions)
- Package structure
- Implementation patterns
- CI gate requirements

**Read this second** — understand the projection layer.

---

### 3. [PORTAL-ARCHITECTURE.md](./PORTAL-ARCHITECTURE.md) ⚙️
**Technical Implementation Guide**

- Current portal topology (7 portal types)
- Domain ownership matrix
- Projection implementation patterns
- Portal isolation enforcement
- Authentication & session model
- API surface design
- Code examples & recipes

**Read this third** — learn how to implement features.

---

### 4. [PORTAL-REFERENCE.md](./PORTAL-REFERENCE.md) 📊
**Industry Benchmarks & Gap Analysis**

- Comparison with Stripe, Shopify, QuickBooks, SAP Ariba, NetSuite, Salesforce
- Current architecture capabilities
- Gap analysis (security, functional, scalability, observability, compliance)
- Long-term improvement roadmap
- Enterprise quality requirements
- Performance targets & scaling strategy

**Reference material** — for strategic planning and compliance.

---

### 5. [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) 🚀
**Development & Production Guide**

- Phase-by-phase implementation plan (0-4)
- Portal shell UI/UX components (shadcn/ui)
- Dependencies & installation guide
- Definition of Done (DoD) criteria
- Testing strategy (unit, integration, E2E, load)
- Deployment checklist
- Production hardening (security, performance, observability)

**Implementation guide** — step-by-step production path.

---

## Quick Start

### For New Developers
1. Read [PORTAL-DOCTRINE.md](./PORTAL-DOCTRINE.md) to understand philosophy
2. Read [PORTAL-ARCHITECTURE.md](./PORTAL-ARCHITECTURE.md) sections 1-4 for overview
3. Read [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) Phase 0-1 for hands-on implementation

### For Architects
1. Read [PORTAL-DOCTRINE.md](./PORTAL-DOCTRINE.md) for principles
2. Read [PORTAL-ARCHITECTURE-LAYER.md](./PORTAL-ARCHITECTURE-LAYER.md) for layer design
3. Read [PORTAL-REFERENCE.md](./PORTAL-REFERENCE.md) for gap analysis and roadmap

### For Product/Business
1. Read [PORTAL-REFERENCE.md](./PORTAL-REFERENCE.md) Executive Summary
2. Read [PORTAL-REFERENCE.md](./PORTAL-REFERENCE.md) section 3 for objectives
3. Read [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) section 5.1-5.3 for feature roadmap

### For DevOps/Platform Engineers
1. Read [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) section 8 for dependencies
2. Read [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) section 6 for production hardening
3. Read [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) section 10 for deployment checklist

---

## Portal Types

| Portal | Route | Actor | Dominant Domain | Invitation Required |
|--------|-------|-------|----------------|---------------------|
| **App** | `/` | Employees | Multi-domain | No (org membership) |
| **Supplier** | `/portal/supplier` | Vendors | Accounts Payable | Yes |
| **Customer** | `/portal/customer` | Buyers | Accounts Receivable | Yes |
| **Investor** | `/portal/investor` | Investors | Investor Relations | Yes |
| **Franchisee** | `/portal/franchisee` | Franchisees | Franchise Management | Yes |
| **Contractor** | `/portal/contractor` | Contractors | Project Accounting | Yes |
| **CID** | `/portal/cid` | AFENDA Team | Platform Control Plane | Yes (employees only) |

---

## Core Principles

### 1. Domains Own Truth
All canonical business entities belong to **one domain module**.

```typescript
// ✅ CORRECT
const balance = await ap.getSupplierBalance(supplierId);

// ❌ FORBIDDEN
const balance = invoices.reduce((sum, inv) => sum + inv.amount, 0);
```

### 2. Projection Layer Shapes Truth
Portal views derive from **domain projections**, never raw tables.

```typescript
// ✅ CORRECT
const statement = await supplierProjections.getStatement(supplierId);

// ❌ FORBIDDEN
const invoices = await db.select().from(apInvoice).where(...);
```

### 3. Portals Present Truth
Portals are **read-and-orchestrate surfaces** that route commands.

```typescript
// ✅ CORRECT
await ap.submitInvoice(command);

// ❌ FORBIDDEN
await db.insert(apInvoice).values(data); // Portal writes directly
```

---

## Architecture Layers

```
┌─────────────────────────────────────────┐
│ Layer 1: Canonical Domain Layer         │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Owns business truth                   │
│ • Computes financial outcomes           │
│ • Enforces business rules               │
│                                         │
│ Location: packages/core/src/erp/        │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Layer 2: Projection Layer               │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Transforms truth for actors           │
│ • Filters by portal/permissions         │
│ • Composes cross-domain views           │
│                                         │
│ Location: packages/core/src/projections/│
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Layer 3: Portal Experience Layer        │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│ • Presents projections to actors        │
│ • Provides UX interactions              │
│ • Handles UI state                      │
│                                         │
│ Location: apps/web/src/app/portal/      │
└─────────────────────────────────────────┘
```

---

## Key Concepts

### Portal = Authentication Boundary
Portals are **not just UI themes**. Each portal has:
- Dedicated sign-in flow
- Portal-scoped JWT claim
- Middleware routing guards
- Invitation mechanism

### Module = RBAC-Controlled Feature Set
Within the **app** portal, features are modules:
- Finance Module (AP, AR, GL)
- HRM Module (coming soon)
- Governance Module

**Do NOT** create separate portals for employees.

### Projection Envelope
All projections use standard envelope:
```typescript
interface ProjectionEnvelope<T> {
  projectionType: string;
  dominantDomain: string;
  correlationId: string;
  sourceRefs: Record<string, string>;
  generatedAt: Date;
  data: T;
}
```

---

## CI Gates

Portal architecture is enforced by **4 specialized gates**:

1. **portal-domain-ownership** — Portals cannot write to canonical tables
2. **projection-finance-no-recompute** — No balance recalculation outside AP/AR/Treasury
3. **projection-naming-ownership** — Projection names must include domain prefix
4. **portal-no-raw-domain-query** — Portal UI must use projections, not raw queries

Plus **14 general gates** from main codebase.

Run all gates:
```bash
pnpm check:all
```

---

## Related Documentation

- **[PROJECT.md](../../../../../../../PROJECT.md)** — Full AFENDA architecture
- **[AGENTS.md](../../../../../../../AGENTS.md)** — AI agent guide
- **[docs/adr/](../../../../../../../docs/adr/)** — Architecture decision records

---

## Philosophy

> **"AFENDA is not building features. AFENDA is building truth."**

Portals exist to **serve actors**, not to **fragment truth**.

Every portal follows:
```
Canonical Domain (owns truth)
     ↓
Projection Layer (shapes truth)
     ↓
Portal Surface (presents truth)
```

This ensures:
- ✅ Financial correctness
- ✅ Audit integrity
- ✅ Domain clarity
- ✅ Platform scalability
- ✅ Truth remains singular

---

**Maintained By:** AFENDA Platform Team  
**Last Updated:** March 10, 2026  
**Next Review:** June 10, 2026
