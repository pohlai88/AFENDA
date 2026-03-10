# AFENDA Architecture Doctrine

# ADR — Portal Domain Ownership

Version: 1.0
Status: Accepted
Applies to: All AFENDA portals and external surfaces

---

# 1. Decision

AFENDA portals are **actor-specific operating surfaces derived from canonical domains**.

Portals **do not own business truth**.

Canonical domains own business truth.

Portals exist to:

* expose bounded interaction surfaces
* reflect canonical domain state
* allow controlled actor participation
* orchestrate workflows across domains

but **never to become a second source of truth**.

---

# 2. Architectural Principle

## Canonical Domain → Projection → Portal Surface

```
Canonical Domain Layer
        ↓
Capability / Projection Layer
        ↓
Portal Experience Layer
```

Domains own truth.

Projections translate truth for actors.

Portals present those projections.

---

# 3. Portal Definition

A portal is defined as:

> A bounded interaction surface serving a distinct actor class, exposing selected projections of canonical domain truth and enabling limited domain actions without granting access to the internal operating shell.

A portal always has:

* a unique actor class
* a unique permission boundary
* a unique UX journey
* a bounded domain center of gravity

---

# 4. Portal Domain Ownership Model

Each portal must have **one dominant canonical domain**.

Adjacent domains may contribute projections but cannot transfer ownership.

| Portal            | Dominant Domain                 | Supporting Domains             |
| ----------------- | ------------------------------- | ------------------------------ |
| App Portal        | Internal Multi-Domain Shell     | All modules                    |
| Supplier Portal   | Accounts Payable                | Procurement, Treasury          |
| Customer Portal   | Accounts Receivable             | Sales / CRM, Treasury          |
| Investor Portal   | Investor Relations              | Reporting, Governance          |
| Contractor Portal | Project Accounting / Operations | Procurement, AP, Compliance    |
| Franchisee Portal | Franchise Management            | Training, Performance, Finance |
| CID Portal        | Platform Control Plane          | IAM, Tenant Management         |

---

# 5. Domain Ownership Rules

## Rule 1 — Domains Own Truth

All canonical business entities must belong to one domain module.

Examples:

| Entity             | Owner               |
| ------------------ | ------------------- |
| Invoice            | Accounts Payable    |
| Customer Statement | Accounts Receivable |
| Purchase Order     | Procurement         |
| Royalty Obligation | Franchise           |
| Investor Intent    | Investor Relations  |
| Work Order         | Project Operations  |

Portals cannot own canonical entities.

---

## Rule 2 — Portals May Only Initiate Commands

Portals may initiate commands into domains but never store canonical results independently.

Example:

Supplier Portal → `submitInvoice()`

The command executes in:

```
Accounts Payable domain
```

The portal only reflects the resulting state.

---

## Rule 3 — Projections Must Derive from Canonical State

Portal views must derive from canonical sources.

Example:

Correct

```
supplier_statement_projection
  derived from AP ledger + open items
```

Incorrect

```
supplier_portal_statement_table
  recalculated separately
```

---

## Rule 4 — Portals Cannot Recompute Financial Truth

Financial truth must always originate from canonical finance modules.

Examples:

| Financial Concept   | Owner         |
| ------------------- | ------------- |
| Supplier Balance    | AP            |
| Customer Balance    | AR            |
| Payment Status      | Treasury / AP |
| Invoice Recognition | AP            |
| Receipt Posting     | AR            |

Portals may only **display projections** of these states.

---

## Rule 5 — Adjacent Domains May Contribute Signals

A portal’s dominant domain may consume signals from adjacent domains.

Example:

Supplier Portal

Dominant domain:

```
Accounts Payable
```

Signals from:

```
Procurement (RFQ / PO)
Treasury (Payment execution)
```

But ownership remains with the domain.

---

# 6. Portal Architecture Details

---

# App Portal

## Actor

Internal employees

## Domain Center

Multi-domain internal workspace

## Purpose

Execute enterprise operations across modules.

## Examples

* finance execution
* approvals
* procurement
* treasury
* governance
* configuration

---

# Supplier Portal

## Actor

External suppliers

## Dominant Domain

Accounts Payable

## Purpose

Externalize payable truth and settlement interaction.

## Domain Interactions

From AP

* supplier statements
* invoice lifecycle
* payable balances
* payment status
* disputes
* remittance

From Procurement

* RFQ responses
* quotation submission
* PO acknowledgement

From Treasury

* payment execution
* remittance advice

## Doctrine

Supplier Portal is an **AP interaction surface**, not a procurement system.

Invoice submission exists for:

```
3-way matching
```

---

# Customer Portal

## Actor

Customers

## Dominant Domain

Accounts Receivable

## Purpose

Expose receivable truth to customers.

## Domain Interactions

From AR

* customer statements
* balances
* invoices
* receipts
* allocations

From Treasury

* payment receipts
* cash application

From Sales

* order visibility

## Doctrine

Customer Portal is an **AR transparency surface**, not a sales application.

---

# Investor Portal

## Actor

Investors

## Dominant Domain

Investor Relations

## Purpose

Investor management and disclosure.

## Domain Interactions

From IR

* investor records
* buy/sell intentions
* matching queues

From Reporting

* statements
* investor reports

From Governance

* disclosures
* document rooms

---

# Contractor Portal

## Actor

External contractors

## Dominant Domain

Project Accounting / Operations

## Purpose

Project execution orchestration.

## Domain Interactions

From Project

* work orders
* assignments
* deliverables

From Procurement

* subcontract orders

From AP

* contractor payable status

---

# Franchisee Portal

## Actor

Franchise operators

## Dominant Domain

Franchise Management

## Purpose

Enable franchise operations and obligations.

## Domain Interactions

From Franchise

* franchise records
* compliance

From Training

* learning resources

From Finance

* royalty obligations

---

# CID Portal

## Actor

AFENDA platform operators

## Dominant Domain

Platform administration

## Purpose

Manage tenants and system operations.

## Responsibilities

* tenant management
* feature flags
* diagnostics
* support actions

---

# 7. Anti-Patterns

The following are forbidden architecture patterns.

---

## Anti-Pattern 1

Portal-Owned Financial Truth

Example:

```
supplier_portal_balance_table
```

Balances must derive from AP ledger.

---

## Anti-Pattern 2

Portal-Owned Lifecycle Engines

Example:

```
supplier_portal_invoice_status
```

Invoice lifecycle belongs to AP.

---

## Anti-Pattern 3

Duplicate Domain Logic

Example:

```
customer portal calculating overdue logic
```

Overdue logic must exist in AR.

---

## Anti-Pattern 4

Portal-Local Approval Workflow

Example:

```
supplier portal approval system
```

Approvals must be canonical workflows.

---

# 8. CI Gate Enforcement

Architecture rules must be enforced in CI.

Example gates:

### portal-domain-ownership

Fail if portal modules create canonical entities.

### portal-finance-duplication

Fail if financial balances exist outside AP / AR.

### portal-projection-validation

Ensure portal queries reference domain projections.

---

# 9. Architecture Scoring Model

When designing a new portal feature, score it.

| Question                                                               | Pass Condition |
| ---------------------------------------------------------------------- | -------------- |
| Does the feature derive from a canonical domain?                       | Yes            |
| Does the portal avoid owning truth?                                    | Yes            |
| Does the feature initiate domain commands instead of writing directly? | Yes            |
| Is financial logic executed in finance modules?                        | Yes            |

If any answer is no, redesign.

---

# 10. Architectural Summary

AFENDA portals exist to serve actors, not to fragment truth.

Each portal must follow the pattern:

```
Canonical Domain
     ↓
Projection
     ↓
Portal Surface
```

This ensures:

* financial correctness
* audit integrity
* domain clarity
* platform scalability

---

# Final Assessment

This doctrine aligns strongly with AFENDA’s philosophy:

**“AFENDA is not building features.
AFENDA is building truth.”**

With this doctrine enforced, the portal architecture can scale without fragmenting domain ownership.

---
