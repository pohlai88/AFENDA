# **Projection Layer Architecture**

# **Canonical Domain → Projection → Portal Surface**

Source: 

---

# AFENDA Projection Layer Architecture

## 1. Purpose

The Projection Layer exists to transform canonical domain truth into:

* actor-safe views
* portal-safe read models
* bounded action surfaces
* task-oriented summaries
* evidence-backed status outputs
* externalized statements and reconciliations

It must **not** become a second domain layer.

It is not:

* a shadow ERP
* a duplicate workflow engine
* a place to recalculate financial truth
* a place to invent portal-local states

It is:

## **a read-and-orchestrate layer over canonical truth**

---

# 2. Why AFENDA needs it

Without a formal projection layer, teams usually do this:

* portal page queries raw domain tables directly
* portal-specific business logic gets added in controllers
* balances get recalculated in UI adapters
* duplicate status models appear
* portal teams create local tables “just for convenience”

That is how truth fragments.

The Projection Layer prevents that.

---

# 3. Core law

## **Domains compute truth**

## **Projection layer shapes truth**

## **Portals present truth**

That is the separation.

---

# 4. Responsibilities of the Projection Layer

The Projection Layer should do exactly six things.

## A. Read shaping

Turn canonical domain state into actor-appropriate views.

Example:

* AP open items → supplier-facing statement summary
* AR receipts → customer payment history
* IR disclosures → investor dashboard cards

## B. Access scoping

Filter by:

* portal
* actor
* org
* relationship
* legal access
* disclosure rules

## C. Cross-domain composition

Join multiple domain outputs without changing ownership.

Example:

* Supplier Portal statement view may compose:

  * AP invoice state
  * Treasury payment state
  * Procurement PO reference
  * audit/evidence reference

## D. Experience orchestration

Prepare UX-ready structures:

* dashboard summaries
* task inboxes
* timeline views
* exceptions requiring action
* statement packs
* downloadable document bundles

## E. Evidence attachment

Every meaningful projection should be able to point back to:

* source records
* correlation IDs
* audit references
* document references
* policy outcomes

## F. Bounded command routing

When a portal triggers an action, the Projection Layer routes it to the right domain command.

It does not execute business truth itself.

---

# 5. What the Projection Layer must never do

## Forbidden behavior

### 1. Recompute finance truth

Never recalculate:

* supplier balance
* customer balance
* overdue amount
* settlement status
* recognized liability
* receipt allocation

These must come from AP, AR, Treasury.

### 2. Invent portal-local lifecycle states

Bad example:

* `supplier_portal_invoice_status = awaiting_internal_review`

If that status matters, it belongs in AP workflow canon.

### 3. Own canonical entities

No:

* supplier portal invoice table
* customer portal receipt table
* investor portal disclosure truth table

Only projections, caches, or materialized views are allowed.

### 4. Bypass policy / audit / workflow canon

No direct side mutations from portal adapters.

### 5. Become a generic dumping ground

The Projection Layer must stay disciplined.

---

# 6. AFENDA reference structure

I would model it like this:

```text
Layer 1 — Canonical Domains
├─ iam
├─ procurement
├─ sales_crm
├─ ap
├─ ar
├─ treasury
├─ ir
├─ franchise
├─ project_accounting
├─ governance
└─ workflow / evidence / notifications

Layer 2 — Projection / Interaction Layer
├─ supplier-projections
├─ customer-projections
├─ investor-projections
├─ contractor-projections
├─ franchisee-projections
├─ cid-projections
└─ shared-portal-projections

Layer 3 — Portal Surfaces
├─ supplier portal UI
├─ customer portal UI
├─ investor portal UI
├─ contractor portal UI
├─ franchisee portal UI
└─ cid portal UI
```

---

# 7. Internal design model

Each projection package should contain four parts.

## 1. Query models

Read-only, portal-safe, actor-safe outputs.

Examples:

* statement summaries
* status cards
* timeline entries
* open action lists
* downloadable documents

## 2. Composition services

Cross-domain assemblers that gather domain truth into a single response.

Example:
`buildSupplierStatementView()`

Inputs:

* AP statement truth
* Treasury payment truth
* Procurement references
* evidence references

Output:

* supplier-safe portal view model

## 3. Interaction routing

Portal actions routed to canonical domain commands.

Example:

* supplier uploads invoice → AP intake command
* investor submits sell intention → IR command
* contractor submits milestone evidence → Project command

## 4. Projection policies

Rules for what can be shown in each portal.

Example:

* supplier can see only their payable lines
* investor sees only approved disclosure documents
* customer sees only their statements and receipts

---

# 8. Naming doctrine

Use names that make ownership obvious.

## Good names

* `ap_supplier_statement_projection`
* `ap_supplier_open_items_view`
* `ar_customer_statement_projection`
* `ir_investor_holdings_view`
* `project_contractor_work_queue_view`
* `franchisee_performance_projection`

## Dangerous names

* `supplier_statement`
* `customer_balance_table`
* `investor_dashboard_state`
* `contractor_portal_invoice`

The good names make it clear that:

* ownership remains in the canonical domain
* the artifact is a projection, not truth

---

# 9. Supplier Projection Layer

This is your clearest example.

## Dominant domain

AP

## Supporting domains

Procurement, Treasury, Workflow, Evidence

## Core projections

* supplier statement projection
* payment status projection
* open items projection
* remittance projection
* exception task projection
* invoice intake acknowledgment projection

## Core routed commands

* submit invoice
* upload supporting document
* acknowledge PO
* respond to exception
* dispute / query payable item

## Core rule

Every supplier-facing payable number must derive from canonical AP/Treasury truth.

---

# 10. Customer Projection Layer

## Dominant domain

AR

## Supporting domains

Sales / CRM, Treasury, Returns, Workflow

## Core projections

* customer statement projection
* receipt history projection
* outstanding invoices projection
* applied payment projection
* order visibility projection
* return/adjustment effect projection

## Core routed commands

* submit payment evidence
* raise billing dispute
* acknowledge invoice
* request statement copy
* place order through approved sales channel linkage

## Core rule

The portal reflects what AR recognizes immediately, not what sales hopes happened.

That matches your philosophy exactly.

---

# 11. Investor Projection Layer

## Dominant domain

IR

## Supporting domains

Reporting, Governance, Cap Table / Ownership, Documents

## Core projections

* investor holding summary
* disclosure pack projection
* document room projection
* buy/sell intention queue view
* approved report timeline
* IR communication projection

## Core routed commands

* submit buy intention
* submit sell intention
* upload investor documents
* acknowledge disclosure receipt
* request IR interaction

## Core rule

Investor portal may manage investor interaction, but must never generate its own reporting truth.

---

# 12. Contractor Projection Layer

## Dominant domain

Project Accounting / Operations

## Supporting domains

Contracts, Procurement, AP, Compliance, Documents

## Core projections

* work queue projection
* milestone status projection
* contract obligation view
* compliance requirement projection
* deliverable evidence projection
* settlement visibility projection

## Core routed commands

* submit timesheet
* submit deliverable evidence
* acknowledge assignment
* request clarification
* submit invoice or claim when the project flow allows

## Core rule

Project is the orchestrator. AP is only one contributing truth source.

---

# 13. Franchisee Projection Layer

## Dominant domain

Franchise

## Supporting domains

Training, Performance, Finance, Compliance, Documents

## Core projections

* franchise performance projection
* training assignment projection
* royalty obligation view
* brand compliance task list
* rollout / R&D update feed
* submission inbox

## Core routed commands

* update operational data
* submit compliance documents
* complete training actions
* acknowledge operating updates
* provide required reporting inputs

## Core rule

Franchisee portal is an operator enablement surface, not an independent franchise ERP.

---

# 14. CID Projection Layer

## Dominant domain

Platform control plane

## Supporting domains

IAM, tenant management, support, diagnostics, audit

## Core projections

* tenant health dashboard
* feature flag view
* support case context
* tenant diagnostic summary
* admin audit timeline
* incident / risk view

## Core routed commands

* enable feature flag
* suspend tenant access
* initiate support workflow
* trigger recovery job
* break-glass administrative action

## Core rule

Every CID action must be audit-heavy and reversible where possible.

---

# 15. Projection object design

Every projection object should carry consistent metadata.

I recommend this shape:

```ts
type ProjectionEnvelope<T> = {
  projectionType: string;
  portal: string;
  dominantDomain: string;
  orgId: string;
  actorId: string;
  generatedAt: string;
  correlationId: string;
  evidenceRefs?: string[];
  sourceRefs?: Array<{
    domain: string;
    entity: string;
    id: string;
  }>;
  data: T;
};
```

This matters because AFENDA is building truth, not just screens.

Every projection should be traceable back to source truth.

---

# 16. Projection classes

Use three projection classes.

## Class A — Pure projections

Direct read models from one canonical domain.

Example:

* AR customer statement
* AP supplier open items

## Class B — Composite projections

Joined read models across domains, but still read-only.

Example:

* supplier payment timeline combining AP + Treasury

## Class C — Interaction projections

Views that include current actionable state and allowed next actions.

Example:

* contractor work item with:

  * current milestone
  * required evidence
  * allowed submit actions

This classification helps keep complexity visible.

---

# 17. Recommended package shape

For each portal-derived package:

```text
supplier-projections/
├─ queries/
│  ├─ get-supplier-statement.ts
│  ├─ get-payment-status.ts
│  └─ get-open-items.ts
├─ composers/
│  ├─ build-supplier-dashboard.ts
│  └─ build-payment-timeline.ts
├─ policies/
│  ├─ can-view-line-item.ts
│  └─ can-access-remittance.ts
├─ interactions/
│  ├─ submit-invoice.ts
│  ├─ submit-dispute.ts
│  └─ upload-supporting-doc.ts
└─ types/
   ├─ projection-envelope.ts
   └─ supplier-portal-view-models.ts
```

Repeat the same pattern for customer, investor, contractor, franchisee, and CID.

---

# 18. CI gates for the Projection Layer

You asked before for strict governance. This is where it matters.

## Gate 1 — projection-no-canonical-writes

Fail if projection packages write directly to canonical domain tables except through approved commands.

## Gate 2 — projection-finance-no-recompute

Fail if balances, aging, overdue status, settlement state, or payment status are recalculated outside AP/AR/Treasury modules.

## Gate 3 — projection-naming-ownership

Require names to include dominant domain ownership markers.

## Gate 4 — projection-source-traceability

Require every projection DTO to expose `dominantDomain`, `correlationId`, and `sourceRefs`.

## Gate 5 — portal-no-raw-domain-query

Portal UI cannot query raw canonical tables directly; it must go through projection services.

## Gate 6 — portal-command-routing-only

Portal actions must route through approved interaction services, not direct mutations.

## Gate 7 — projection-policy-enforcement

Every external projection must include actor/org access checks.

---

# 19. Scoring rubric for new projection work

When a team proposes a new projection, score it.

| Question                                                                | Pass condition |
| ----------------------------------------------------------------------- | -------------- |
| Does it have one dominant domain?                                       | Yes            |
| Does it derive from canonical truth rather than duplicate it?           | Yes            |
| Does it avoid recomputing finance truth?                                | Yes            |
| Does it expose source traceability?                                     | Yes            |
| Does it keep portal-specific experience logic out of canonical domains? | Yes            |
| Does it avoid portal-owned lifecycle states?                            | Yes            |

Any “no” means redesign.

---

# 20. Northstar statement

The Projection Layer should make this possible:

## **One truth**

## **Many actor-safe views**

## **Zero truth duplication**

That is the whole game.

---

# 21. Final recommendation for AFENDA

Your strongest architecture is:

## Canonical domains own truth

## Projection layer owns shaping and orchestration

## Portals own experience only

That is how AFENDA becomes:

* audit-grade
* scalable
* coherent
* enterprise-clean

And it matches your message perfectly:

## **AFENDA is not building portals as products.**

## **AFENDA is building controlled windows into The Machine.**

The next best step is to turn this into a **repo-ready final artifact** with:

* doctrine
* diagrams
* package map
* CI gate spec
* TypeScript interface examples
* naming convention matrix
