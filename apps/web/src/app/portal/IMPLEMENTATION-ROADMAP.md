# AFENDA Portal Implementation Roadmap

**Version:** 1.0.0  
**Last Updated:** March 10, 2026  
**Status:** Active Development Guide  
**For:** Developers & Implementation Teams

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Phase 0: Foundation Setup](#2-phase-0-foundation-setup)
3. [Phase 1: Projection Layer Scaffolding](#3-phase-1-projection-layer-scaffolding)
4. [Phase 2: Portal Shell UI/UX](#4-phase-2-portal-shell-uiux)
5. [Phase 3: Per-Portal Implementation](#5-phase-3-per-portal-implementation)
6. [Phase 4: Production Hardening](#6-phase-4-production-hardening)
7. [Definition of Done (DoD)](#7-definition-of-done-dod)
8. [Dependencies & Installation](#8-dependencies--installation)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Prerequisites

### 1.1 Required Reading

**Before starting implementation, read in this order:**

1. [PORTAL-DOCTRINE.md](./PORTAL-DOCTRINE.md) — Philosophy
2. [PORTAL-ARCHITECTURE-LAYER.md](./PORTAL-ARCHITECTURE-LAYER.md) — Projection layer
3. [PORTAL-ARCHITECTURE.md](./PORTAL-ARCHITECTURE.md) — Technical implementation
4. [PORTAL-REFERENCE.md](./PORTAL-REFERENCE.md) — Gap analysis

**Time investment:** ~2-3 hours for complete understanding.

### 1.2 Current State Assessment

✅ **Already Implemented:**
- 7 portal types in contracts (`PortalTypeValues`)
- NextAuth JWT with portal claim
- Middleware guards (`proxy.ts`)
- Database schema with portal invitation table
- Basic portal sign-in flows
- Portal home pages (placeholder UI)

🔴 **Not Yet Implemented:**
- Projection layer package structure
- Domain → Projection separation
- Portal-specific UI shells
- Cross-domain composition services
- CI gates for portal architecture
- Production-grade portal features

---

## 2. Phase 0: Foundation Setup

**Goal:** Establish project structure and development environment.

**Duration:** 1-2 days

### 2.1 Package Structure Creation

#### Step 1: Create Projection Packages

```bash
# From repo root
mkdir -p packages/core/src/projections/supplier/{queries,composers,policies,interactions,types}
mkdir -p packages/core/src/projections/customer/{queries,composers,policies,interactions,types}
mkdir -p packages/core/src/projections/investor/{queries,composers,policies,interactions,types}
mkdir -p packages/core/src/projections/contractor/{queries,composers,policies,interactions,types}
mkdir -p packages/core/src/projections/franchisee/{queries,composers,policies,interactions,types}
mkdir -p packages/core/src/projections/cid/{queries,composers,policies,interactions,types}
mkdir -p packages/core/src/projections/shared
```

#### Step 2: Create Shared Projection Types

```typescript
// packages/core/src/projections/shared/projection-envelope.ts
import { z } from "zod";

/**
 * Standard envelope for all portal projections.
 * Ensures traceability back to canonical domain truth.
 */
export interface ProjectionEnvelope<T> {
  // Metadata
  projectionType: string;           // "supplier-statement" | "customer-dashboard"
  dominantDomain: string;           // "ap" | "ar" | "ir" | "project" | "franchise"
  supportingDomains?: string[];     // ["treasury", "procurement"]
  
  // Traceability
  correlationId: string;            // Request correlation ID
  sourceRefs: Record<string, string>; // { ap: "balance:supplier-123", treasury: "pmt:456" }
  auditRef?: string;                // Link to audit_log entry
  evidenceRefs?: string[];          // Document attachments
  
  // Temporal
  generatedAt: Date;                // Projection generation timestamp
  validUntil?: Date;                // Optional cache TTL
  
  // Payload
  data: T;
}

export const ProjectionEnvelopeSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    projectionType: z.string(),
    dominantDomain: z.string(),
    supportingDomains: z.array(z.string()).optional(),
    correlationId: z.string().uuid(),
    sourceRefs: z.record(z.string(), z.string()),
    auditRef: z.string().optional(),
    evidenceRefs: z.array(z.string()).optional(),
    generatedAt: z.date(),
    validUntil: z.date().optional(),
    data: dataSchema,
  });
```

#### Step 3: Create Barrel Exports

```typescript
// packages/core/src/projections/index.ts
export * from "./shared/projection-envelope.js";

// Re-export projection modules
export * as supplierProjections from "./supplier/index.js";
export * as customerProjections from "./customer/index.js";
export * as investorProjections from "./investor/index.js";
export * as contractorProjections from "./contractor/index.js";
export * as franchiseeProjections from "./franchisee/index.js";
export * as cidProjections from "./cid/index.js";
```

### 2.2 Update OWNERS.md

```typescript
// packages/core/OWNERS.md
// Add exports for projection layer

## Projections (Portal Interaction Layer)

### Supplier Portal Projections
export { getSupplierStatement } from "./src/projections/supplier/queries/get-statement.js";
export { buildSupplierDashboard } from "./src/projections/supplier/composers/build-dashboard.js";
export { submitInvoiceFromPortal } from "./src/projections/supplier/interactions/submit-invoice.js";

### Customer Portal Projections
export { getCustomerStatement } from "./src/projections/customer/queries/get-statement.js";
export { buildCustomerDashboard } from "./src/projections/customer/composers/build-dashboard.js";

// ... etc for other portals
```

### 2.3 DoD for Phase 0

- [ ] All projection package directories created
- [ ] `ProjectionEnvelope` type defined and exported
- [ ] Barrel exports created for all portal projections
- [ ] OWNERS.md updated with projection exports
- [ ] `pnpm typecheck` passes

---

## 3. Phase 1: Projection Layer Scaffolding

**Goal:** Implement projection layer for ONE portal (Supplier) as reference.

**Duration:** 3-5 days

### 3.1 Supplier Portal — Reference Implementation

#### Step 1: Define View Models

```typescript
// packages/core/src/projections/supplier/types/view-models.ts
import { z } from "zod";

// Statement view model
export const SupplierStatementDataSchema = z.object({
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  totalOutstanding: z.bigint(),
  overdueAmount: z.bigint(),
  nextPaymentDate: z.date().nullable(),
  openInvoices: z.array(z.object({
    id: z.string().uuid(),
    invoiceNumber: z.string(),
    date: z.date(),
    dueDate: z.date(),
    amount: z.bigint(),
    status: z.string(),
    isOverdue: z.boolean(),
  })),
  recentPayments: z.array(z.object({
    id: z.string().uuid(),
    date: z.date(),
    amount: z.bigint(),
    reference: z.string(),
    invoiceNumber: z.string().nullable(),
  })),
});

export type SupplierStatementData = z.infer<typeof SupplierStatementDataSchema>;

// Dashboard view model
export const SupplierDashboardDataSchema = z.object({
  summary: z.object({
    totalOutstanding: z.bigint(),
    overdueAmount: z.bigint(),
    invoicesDue7Days: z.number(),
    lastPaymentDate: z.date().nullable(),
    nextPaymentDate: z.date().nullable(),
  }),
  actionItems: z.array(z.object({
    id: z.string(),
    type: z.enum(["invoice-exception", "po-acknowledgement", "dispute-pending"]),
    title: z.string(),
    description: z.string(),
    priority: z.enum(["high", "medium", "low"]),
    dueDate: z.date().nullable(),
    actions: z.array(z.string()),
  })),
  recentActivity: z.array(z.object({
    id: z.string(),
    type: z.enum(["invoice-submitted", "payment-received", "po-received"]),
    title: z.string(),
    timestamp: z.date(),
    metadata: z.record(z.string(), z.unknown()),
  })),
});

export type SupplierDashboardData = z.infer<typeof SupplierDashboardDataSchema>;
```

#### Step 2: Implement Query Functions

```typescript
// packages/core/src/projections/supplier/queries/get-statement.ts
import type { Db, Context } from "@afenda/db";
import type { ProjectionEnvelope } from "../../shared/projection-envelope.js";
import type { SupplierStatementData } from "../types/view-models.js";
import { getSupplierBalance } from "../../../erp/finance/ap/supplier-balance.js";
import { getSupplierPayments } from "../../../erp/treasury/supplier-payments.js";

/**
 * Get supplier statement projection.
 * 
 * Dominant domain: AP
 * Supporting domains: Treasury
 * 
 * This is a Class B projection (composite, multi-domain).
 */
export async function getSupplierStatement(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<ProjectionEnvelope<SupplierStatementData>> {
  // 1. Query canonical AP domain for balance
  const balance = await getSupplierBalance(db, ctx, supplierId);
  
  // 2. Query canonical Treasury domain for payment history
  const payments = await getSupplierPayments(db, ctx, supplierId);
  
  // 3. Compose into supplier-safe projection
  const data: SupplierStatementData = {
    supplierId: balance.supplierId,
    supplierName: balance.supplierName,
    totalOutstanding: balance.totalOutstanding,
    overdueAmount: balance.overdueAmount,
    nextPaymentDate: payments.next?.date ?? null,
    openInvoices: balance.openItems.map(item => ({
      id: item.id,
      invoiceNumber: item.invoiceNumber,
      date: item.invoiceDate,
      dueDate: item.dueDate,
      amount: item.amount,
      status: item.status,
      isOverdue: item.isOverdue,
    })),
    recentPayments: payments.recent.map(pmt => ({
      id: pmt.id,
      date: pmt.paymentDate,
      amount: pmt.amount,
      reference: pmt.reference,
      invoiceNumber: pmt.invoiceNumber ?? null,
    })),
  };
  
  // 4. Wrap in projection envelope
  return {
    projectionType: "supplier-statement",
    dominantDomain: "ap",
    supportingDomains: ["treasury"],
    correlationId: ctx.correlationId,
    sourceRefs: {
      ap: `balance:${supplierId}`,
      treasury: `payments:${supplierId}`,
    },
    generatedAt: new Date(),
    data,
  };
}
```

#### Step 3: Implement Composer Functions

```typescript
// packages/core/src/projections/supplier/composers/build-dashboard.ts
import type { Db, Context } from "@afenda/db";
import type { ProjectionEnvelope } from "../../shared/projection-envelope.js";
import type { SupplierDashboardData } from "../types/view-models.js";
import { getSupplierBalance } from "../../../erp/finance/ap/supplier-balance.js";
import { getSupplierPayments } from "../../../erp/treasury/supplier-payments.js";
import { getInvoiceExceptions } from "../../../erp/finance/ap/invoice-exceptions.js";
import { getPendingPoAcknowledgements } from "../../../erp/procurement/po-acknowledgements.js";

/**
 * Build supplier dashboard projection.
 * 
 * Dominant domain: AP
 * Supporting domains: Treasury, Procurement
 * 
 * This is a Class C projection (interaction, actionable).
 */
export async function buildSupplierDashboard(
  db: Db,
  ctx: Context,
  supplierId: string
): Promise<ProjectionEnvelope<SupplierDashboardData>> {
  // Parallel domain queries
  const [balance, payments, exceptions, pendingPos] = await Promise.all([
    getSupplierBalance(db, ctx, supplierId),
    getSupplierPayments(db, ctx, supplierId),
    getInvoiceExceptions(db, ctx, supplierId),
    getPendingPoAcknowledgements(db, ctx, supplierId),
  ]);
  
  // Compose action items
  const actionItems = [
    ...exceptions.map(ex => ({
      id: ex.id,
      type: "invoice-exception" as const,
      title: `Invoice ${ex.invoiceNumber} requires attention`,
      description: ex.reason,
      priority: "high" as const,
      dueDate: ex.resolveDueDate,
      actions: ["upload-document", "provide-clarification"],
    })),
    ...pendingPos.map(po => ({
      id: po.id,
      type: "po-acknowledgement" as const,
      title: `Acknowledge PO ${po.poNumber}`,
      description: `Expected delivery: ${po.expectedDeliveryDate.toLocaleDateString()}`,
      priority: "medium" as const,
      dueDate: po.acknowledgementDueDate,
      actions: ["acknowledge", "reject", "request-change"],
    })),
  ];
  
  // Compose recent activity (simplified)
  const recentActivity = [
    ...payments.recent.slice(0, 5).map(pmt => ({
      id: pmt.id,
      type: "payment-received" as const,
      title: `Payment received: ${pmt.reference}`,
      timestamp: pmt.paymentDate,
      metadata: { amount: pmt.amount.toString() },
    })),
  ];
  
  const data: SupplierDashboardData = {
    summary: {
      totalOutstanding: balance.totalOutstanding,
      overdueAmount: balance.overdueAmount,
      invoicesDue7Days: balance.openItems.filter(
        item => item.dueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      ).length,
      lastPaymentDate: payments.recent[0]?.paymentDate ?? null,
      nextPaymentDate: payments.next?.date ?? null,
    },
    actionItems,
    recentActivity,
  };
  
  return {
    projectionType: "supplier-dashboard",
    dominantDomain: "ap",
    supportingDomains: ["treasury", "procurement"],
    correlationId: ctx.correlationId,
    sourceRefs: {
      ap: `balance:${supplierId}`,
      treasury: `payments:${supplierId}`,
      procurement: `pos:${supplierId}`,
    },
    generatedAt: new Date(),
    data,
  };
}
```

#### Step 4: Implement Interaction Functions

```typescript
// packages/core/src/projections/supplier/interactions/submit-invoice.ts
import type { Db, Context, Result } from "@afenda/db";
import type { Invoice } from "@afenda/contracts";
import { submitInvoice } from "../../../erp/finance/ap/submit-invoice.js";
import { getPartyRole } from "../../../kernel/identity/party-roles.js";

export interface SupplierSubmitInvoiceCommand {
  idempotencyKey: string;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: bigint;
  currency: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: bigint;
    amount: bigint;
  }>;
  poNumber?: string;
  attachments?: string[];
}

/**
 * Submit invoice from supplier portal.
 * 
 * This interaction routes the portal command to the canonical AP domain.
 * It NEVER writes to ap_invoice table directly.
 */
export async function submitInvoiceFromPortal(
  db: Db,
  ctx: Context,
  command: SupplierSubmitInvoiceCommand
): Promise<Result<Invoice>> {
  // 1. Validate portal context
  if (ctx.portal !== "supplier") {
    return { ok: false, error: "PORTAL_UNAUTHORIZED" };
  }
  
  // 2. Get supplier party role
  const partyRole = await getPartyRole(db, ctx, ctx.principalId);
  if (!partyRole || partyRole.roleName !== "Supplier") {
    return { ok: false, error: "SUPPLIER_ROLE_REQUIRED" };
  }
  
  // 3. Enrich command with supplier context
  const enrichedCommand = {
    ...command,
    orgId: ctx.activeContext.orgId,
    supplierId: partyRole.partyId,
    submittedVia: "supplier-portal",
    submittedBy: ctx.principalId,
    submittedAt: new Date(),
  };
  
  // 4. Route to canonical AP domain command
  // The AP domain handles:
  // - Validation
  // - 3-way matching (if PO exists)
  // - Duplicate detection
  // - Workflow triggering
  // - Audit logging
  // - Outbox event emission
  return submitInvoice(db, ctx, enrichedCommand);
}
```

#### Step 5: Implement Policy Functions

```typescript
// packages/core/src/projections/supplier/policies/can-view-invoice.ts
import type { Db, Context } from "@afenda/db";
import type { Invoice } from "@afenda/contracts";
import { getPartyRole } from "../../../kernel/identity/party-roles.js";

/**
 * Check if current actor can view an invoice.
 * 
 * Rules for supplier portal:
 * 1. Portal must be "supplier"
 * 2. Actor must have Supplier role
 * 3. Invoice must belong to their supplier party
 * 4. Invoice must belong to their org
 */
export async function canViewInvoice(
  db: Db,
  ctx: Context,
  invoice: Invoice
): Promise<boolean> {
  // Portal-level check
  if (ctx.portal !== "supplier") return false;
  
  // Org-level check
  if (ctx.activeContext.orgId !== invoice.orgId) return false;
  
  // Relationship check
  const partyRole = await getPartyRole(db, ctx, ctx.principalId);
  if (!partyRole || partyRole.partyId !== invoice.supplierId) return false;
  
  return true;
}

/**
 * Check if current actor can submit an invoice.
 */
export async function canSubmitInvoice(
  db: Db,
  ctx: Context
): Promise<boolean> {
  // Portal must be supplier
  if (ctx.portal !== "supplier") return false;
  
  // Must have Supplier role
  const partyRole = await getPartyRole(db, ctx, ctx.principalId);
  if (!partyRole || partyRole.roleName !== "Supplier") return false;
  
  // Check permission
  return ctx.permissions.has("ap.invoice.submit");
}
```

#### Step 6: Create Barrel Exports

```typescript
// packages/core/src/projections/supplier/index.ts

// Queries
export { getSupplierStatement } from "./queries/get-statement.js";

// Composers
export { buildSupplierDashboard } from "./composers/build-dashboard.js";

// Interactions
export { submitInvoiceFromPortal } from "./interactions/submit-invoice.js";

// Policies
export { canViewInvoice, canSubmitInvoice } from "./policies/can-view-invoice.js";

// Types
export type * from "./types/view-models.js";
```

### 3.2 DoD for Phase 1

- [ ] All supplier projection functions implemented
- [ ] View models defined with Zod schemas
- [ ] Query functions use `ProjectionEnvelope`
- [ ] Interaction functions route to domain commands (never write directly)
- [ ] Policy functions enforce access control
- [ ] Unit tests for projection functions (≥ 80% coverage)
- [ ] Integration tests for end-to-end projection flow
- [ ] `pnpm typecheck` passes
- [ ] No ESLint errors

---

## 4. Phase 2: Portal Shell UI/UX

**Goal:** Create reusable portal shell components.

**Duration:** 3-4 days

### 4.1 Portal Shell Architecture

```
Portal Shell Components (shadcn/ui)
├── PortalHeader     — Logo, user menu, notifications
├── PortalNav        — Context-aware navigation
├── PortalSidebar    — Collapsible menu
├── PortalFooter     — Links, support, legal
└── PortalLayout     — Composition of all shell elements
```

### 4.2 Dependencies to Install

```bash
# UI dependencies (if not already installed)
npm install @radix-ui/react-avatar
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-navigation-menu
npm install @radix-ui/react-separator
npm install lucide-react
npm install class-variance-authority
npm install clsx
npm install tailwind-merge

# Add to packages/ui/package.json
```

### 4.3 Shared Portal Components

#### Component 1: PortalHeader

```tsx
// packages/ui/src/portal-shell/portal-header.tsx
import { Avatar, AvatarFallback } from "../components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/dropdown-menu";
import { Button } from "../components/button";
import { Bell, User, LogOut, Settings } from "lucide-react";

export interface PortalHeaderProps {
  portalName: string;
  userName: string;
  userEmail: string;
  unreadNotifications?: number;
  onSignOut: () => void;
  onSettingsClick?: () => void;
}

export function PortalHeader({
  portalName,
  userName,
  userEmail,
  unreadNotifications = 0,
  onSignOut,
  onSettingsClick,
}: PortalHeaderProps) {
  const initials = userName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Portal branding */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-primary">●</span>
            <span className="text-primary">●</span>
            <span className="text-muted-foreground">○</span>
          </div>
          <span className="text-lg font-semibold">AFENDA</span>
          <span className="text-sm text-muted-foreground">{portalName}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                {unreadNotifications}
              </span>
            )}
          </Button>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar>
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userName}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onSettingsClick && (
                <DropdownMenuItem onClick={onSettingsClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
```

#### Component 2: PortalNav

```tsx
// packages/ui/src/portal-shell/portal-nav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  badge?: number;
  disabled?: boolean;
}

export interface PortalNavProps {
  items: NavItem[];
  className?: string;
}

export function PortalNav({ items, className }: PortalNavProps) {
  const pathname = usePathname();

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)}>
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary",
              isActive ? "text-primary" : "text-muted-foreground",
              item.disabled && "pointer-events-none opacity-50"
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{item.title}</span>
            {item.badge !== undefined && item.badge > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
```

#### Component 3: PortalLayout

```tsx
// packages/ui/src/portal-shell/portal-layout.tsx
import { PortalHeader, type PortalHeaderProps } from "./portal-header";
import { PortalNav, type NavItem } from "./portal-nav";
import { Separator } from "../components/separator";

export interface PortalLayoutProps {
  header: PortalHeaderProps;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function PortalLayout({ header, navItems, children }: PortalLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PortalHeader {...header} />
      
      <div className="container py-4">
        <PortalNav items={navItems} />
      </div>
      
      <Separator />
      
      <main className="flex-1 container py-6">
        {children}
      </main>
      
      <footer className="border-t">
        <div className="container flex h-16 items-center justify-between text-sm text-muted-foreground">
          <div>© 2026 AFENDA. All rights reserved.</div>
          <div className="flex gap-4">
            <a href="/support" className="hover:text-primary">Support</a>
            <a href="/privacy" className="hover:text-primary">Privacy</a>
            <a href="/terms" className="hover:text-primary">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

### 4.4 Portal-Specific Shell Configuration

```tsx
// apps/web/src/app/portal/supplier/layout.tsx
import { PortalLayout } from "@afenda/ui/portal-shell";
import { Package, FileText, CreditCard, MessageSquare } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function SupplierPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession();
  
  if (!session || session.user.portal !== "supplier") {
    redirect("/auth/portal/supplier/signin");
  }

  const navItems = [
    {
      title: "Dashboard",
      href: "/portal/supplier",
      icon: Package,
    },
    {
      title: "Invoices",
      href: "/portal/supplier/invoices",
      icon: FileText,
    },
    {
      title: "Payments",
      href: "/portal/supplier/payments",
      icon: CreditCard,
    },
    {
      title: "Messages",
      href: "/portal/supplier/messages",
      icon: MessageSquare,
      badge: session.unreadMessages ?? 0,
    },
  ];

  return (
    <PortalLayout
      header={{
        portalName: "Supplier Portal",
        userName: session.user.name ?? "",
        userEmail: session.user.email ?? "",
        unreadNotifications: session.unreadNotifications ?? 0,
        onSignOut: () => {}, // Client component action
      }}
      navItems={navItems}
    >
      {children}
    </PortalLayout>
  );
}
```

### 4.5 Export Portal Shell Components

```typescript
// packages/ui/src/portal-shell/index.ts
export { PortalHeader, type PortalHeaderProps } from "./portal-header";
export { PortalNav, type PortalNavProps, type NavItem } from "./portal-nav";
export { PortalLayout, type PortalLayoutProps } from "./portal-layout";
```

```typescript
// packages/ui/src/index.ts (add to existing exports)
export * from "./portal-shell";
```

### 4.6 DoD for Phase 2

- [ ] Portal shell components implemented with shadcn/ui
- [ ] PortalHeader with user menu and notifications
- [ ] PortalNav with active state highlighting
- [ ] PortalLayout composition component
- [ ] All components exported from `@afenda/ui`
- [ ] Supplier portal layout uses portal shell
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Accessibility tested (WCAG 2.1 AA)
- [ ] `pnpm typecheck` passes
- [ ] Storybook stories created (optional)

---

## 5. Phase 3: Per-Portal Implementation

**Goal:** Implement features for each portal using projection layer.

**Duration:** 2-3 weeks (iterative)

### 5.1 Supplier Portal Features

#### Priority 1 (Week 1)
- [ ] Dashboard with summary cards
- [ ] Invoice list view (open invoices)
- [ ] Invoice detail view
- [ ] Submit invoice form
- [ ] Payment history view

#### Priority 2 (Week 2)
- [ ] PO acknowledgement workflow
- [ ] Document upload (supporting docs)
- [ ] Invoice exception handling
- [ ] Statement download (PDF)

#### Priority 3 (Week 3)
- [ ] Dispute submission
- [ ] Real-time notifications
- [ ] Search & filter invoices
- [ ] Bulk actions (download multiple PDFs)

### 5.2 Customer Portal Features

#### Priority 1 (Week 1)
- [ ] Dashboard with AR summary
- [ ] Invoice list view (outstanding invoices)
- [ ] Payment history view
- [ ] Statement download (PDF)

#### Priority 2 (Week 2)
- [ ] Order tracking
- [ ] Billing dispute submission
- [ ] Receipt upload
- [ ] Auto-pay configuration

### 5.3 Investor Portal Features

#### Priority 1 (Week 1)
- [ ] Dashboard with portfolio summary
- [ ] Holdings view
- [ ] Document room (disclosures)
- [ ] Financial statements

#### Priority 2 (Week 2)
- [ ] Buy/sell intention submission
- [ ] Investor communication center
- [ ] Report archive
- [ ] Cap table visibility

### 5.4 Implementation Pattern (Repeat for Each Feature)

**Step 1:** Define projection types
```typescript
// packages/core/src/projections/{portal}/types/
```

**Step 2:** Implement domain queries (if missing)
```typescript
// packages/core/src/erp/{domain}/
```

**Step 3:** Implement projection queries/composers
```typescript
// packages/core/src/projections/{portal}/queries/
// packages/core/src/projections/{portal}/composers/
```

**Step 4:** Implement interaction handlers
```typescript
// packages/core/src/projections/{portal}/interactions/
```

**Step 5:** Create API endpoints
```typescript
// apps/api/src/routes/portals/{portal}.ts
```

**Step 6:** Build UI components
```tsx
// apps/web/src/app/portal/{portal}/
```

**Step 7:** Add tests
```typescript
// packages/core/src/projections/{portal}/__vitest_test__/
```

### 5.5 DoD per Feature

- [ ] Projection functions implemented
- [ ] API endpoints created and documented
- [ ] UI components use projection queries
- [ ] Policy checks enforce access control
- [ ] Unit tests (≥ 80% coverage)
- [ ] Integration tests (happy path + error cases)
- [ ] Manual QA tested
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Audit logs written for mutations
- [ ] Performance: p99 < 200ms (API), LCP < 2.5s (UI)

---

## 6. Phase 4: Production Hardening

**Goal:** Security, performance, observability for production launch.

**Duration:** 1-2 weeks

### 6.1 Security Hardening

#### Task 1: Implement MFA/TOTP

```bash
# Install dependencies
npm install speakeasy qrcode
npm install @types/speakeasy @types/qrcode --save-dev
```

**Files to create:**
- `packages/db/src/schema/kernel/mfa.ts` (iam_principal_mfa table)
- `packages/core/src/kernel/identity/mfa/totp.ts` (TOTP service)
- `apps/web/src/app/(app)/settings/security/mfa/page.tsx` (Setup UI)
- `apps/api/src/routes/kernel/mfa.ts` (API endpoints)

**DoD:**
- [ ] TOTP setup flow complete
- [ ] QR code generation working
- [ ] 6-digit verification working
- [ ] Backup codes generated (10 codes)
- [ ] MFA enforcement configurable per org
- [ ] Tests cover TOTP edge cases

#### Task 2: Add OAuth 2.0 Scopes

**Files to modify:**
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` (JWT callbacks)
- `apps/api/src/hooks/check-scope.ts` (Scope checking middleware)
- `apps/api/src/routes/**/*.ts` (Add scope requirements)

**DoD:**
- [ ] JWT includes `scopes` array
- [ ] Scope checking middleware implemented
- [ ] Supplier portal limited to `ap.invoice.submit`
- [ ] Customer portal limited to `ar.*.read`
- [ ] Tests verify scope enforcement

#### Task 3: IP Allowlisting for CID Portal

**Files to create:**
- `packages/db/src/schema/kernel/ip-allowlist.ts`
- `apps/web/src/middleware/ip-check.ts`

**DoD:**
- [ ] IP allowlist table created
- [ ] Middleware checks IP for CID portal
- [ ] CIDR notation supported
- [ ] Error page explains IP restriction
- [ ] Tests verify blocking/allowing

### 6.2 Performance Optimization

#### Task 1: Add Redis Caching

```bash
# Install dependencies
npm install ioredis
npm install @types/ioredis --save-dev
```

**Files to create:**
- `packages/core/src/infra/cache/redis-client.ts`
- `packages/core/src/infra/cache/cache-keys.ts`
- `packages/core/src/projections/shared/cached-projection.ts`

**Caching Strategy:**
- Permission checks: 5-min TTL
- Projection queries: 1-min TTL
- User metadata: 10-min TTL

**DoD:**
- [ ] Redis client configured
- [ ] Cache wrapper for projections
- [ ] Cache invalidation on mutations
- [ ] Metrics track cache hit rate
- [ ] Tests verify caching behavior

#### Task 2: Database Query Optimization

**Tasks:**
- [ ] Add missing indexes (EXPLAIN ANALYZE all queries)
- [ ] Implement connection pooling (PgBouncer or Drizzle pool config)
- [ ] Add slow query logging (> 100ms)
- [ ] Optimize N+1 queries (use joins or batch loaders)

**DoD:**
- [ ] All queries < 100ms (p99)
- [ ] No N+1 queries detected
- [ ] Connection pool configured (max 20)
- [ ] Slow query alerts configured

### 6.3 Observability

#### Task 1: OpenTelemetry Tracing

```bash
# Install dependencies
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-trace-otlp-http
```

**Files to create:**
- `apps/api/src/instrumentation.ts` (Fastify instrumentation)
- `apps/worker/src/instrumentation.ts` (Worker instrumentation)
- `packages/core/src/infra/tracing/tracer.ts` (Manual spans)

**DoD:**
- [ ] Jaeger backend configured
- [ ] All API routes auto-instrumented
- [ ] Database queries traced
- [ ] Worker jobs traced
- [ ] Correlation IDs propagated
- [ ] Traces visible in Jaeger UI

#### Task 2: Error Tracking (Sentry)

```bash
# Install dependencies
npm install @sentry/nextjs @sentry/node
```

**Files to create:**
- `apps/web/sentry.client.config.ts`
- `apps/web/sentry.server.config.ts`
- `apps/api/src/plugins/sentry.ts`

**DoD:**
- [ ] Frontend errors captured
- [ ] API errors captured
- [ ] Worker errors captured
- [ ] Source maps uploaded
- [ ] Error grouping configured
- [ ] Alerts configured (> 10 errors/min)

#### Task 3: Metrics Dashboard (Prometheus + Grafana)

```bash
# Install dependencies
npm install prom-client
```

**Files to create:**
- `apps/api/src/plugins/metrics.ts`
- `apps/api/src/routes/metrics.ts` (Prometheus endpoint)

**Metrics to track:**
- API request duration (histogram)
- API request rate (counter)
- API error rate (counter)
- Database connection pool usage (gauge)
- Worker queue depth (gauge)

**DoD:**
- [ ] Prometheus scraping `/metrics`
- [ ] Grafana dashboards created
- [ ] Golden signals visualized (latency, traffic, errors, saturation)
- [ ] Alerts configured (p99 > 500ms, 5xx > 1%)

### 6.4 DoD for Phase 4

- [ ] MFA/TOTP implemented and tested
- [ ] OAuth scopes enforced
- [ ] IP allowlisting working for CID portal
- [ ] Redis caching implemented (cache hit rate > 80%)
- [ ] All queries < 100ms (p99)
- [ ] OpenTelemetry tracing working
- [ ] Sentry error tracking active
- [ ] Prometheus metrics exported
- [ ] Grafana dashboards deployed
- [ ] Load testing passed (1000 concurrent users)

---

## 7. Definition of Done (DoD)

### 7.1 Code Quality

- [ ] **TypeScript:** No `any`, strict mode enabled
- [ ] **ESLint:** Zero warnings, zero errors
- [ ] **Prettier:** All files formatted
- [ ] **Naming:** Follows conventions (camelCase, PascalCase, kebab-case)
- [ ] **Comments:** Complex logic explained with JSDoc
- [ ] **No console.log:** Use Pino logger

### 7.2 Testing

- [ ] **Unit tests:** ≥ 80% coverage for projection layer
- [ ] **Integration tests:** Happy path + error cases
- [ ] **E2E tests:** Critical user journeys (Playwright)
- [ ] **Manual QA:** Feature tested in dev environment
- [ ] **Regression:** Existing tests still pass

### 7.3 Architecture

- [ ] **Projection pattern:** Domains compute, projection shapes, portals present
- [ ] **No raw queries:** Portal UI uses projection layer only
- [ ] **Access control:** Policy functions enforce permissions
- [ ] **Audit logging:** All mutations logged
- [ ] **Correlation IDs:** All requests traceable
- [ ] **Idempotency:** Commands include idempotency keys

### 7.4 Performance

- [ ] **API latency:** p99 < 200ms
- [ ] **Page load:** LCP < 2.5s, FCP < 1.5s
- [ ] **Database queries:** p99 < 100ms
- [ ] **Bundle size:** No single bundle > 500KB
- [ ] **Lighthouse score:** ≥ 90 (Performance, Accessibility, Best Practices)

### 7.5 Security

- [ ] **Authentication:** JWT with portal claim
- [ ] **Authorization:** RBAC + portal isolation
- [ ] **Input validation:** Zod schemas on all inputs
- [ ] **SQL injection:** Impossible (Drizzle ORM)
- [ ] **XSS:** React auto-escapes, no dangerouslySetInnerHTML
- [ ] **CSRF:** NextAuth CSRF protection enabled
- [ ] **Rate limiting:** Configured per route
- [ ] **Secrets:** No secrets in code, use env vars

### 7.6 Observability

- [ ] **Logging:** Structured JSON logs with Pino
- [ ] **Tracing:** OpenTelemetry spans for critical paths
- [ ] **Metrics:** Prometheus metrics exported
- [ ] **Errors:** Sentry captures all errors
- [ ] **Alerts:** PagerDuty alerts configured

### 7.7 Documentation

- [ ] **API docs:** OpenAPI spec generated
- [ ] **Code comments:** Complex logic explained
- [ ] **README:** Feature documented in relevant README
- [ ] **OWNERS.md:** Exports updated
- [ ] **CHANGELOG:** Entry added

### 7.8 CI/CD

- [ ] **CI passes:** All 18+ gates pass
- [ ] **Tests pass:** `pnpm test` succeeds
- [ ] **Typecheck passes:** `pnpm typecheck` succeeds
- [ ] **Build passes:** `pnpm build` succeeds
- [ ] **Preview deployed:** Vercel preview URL working

---

## 8. Dependencies & Installation

### 8.1 Core Dependencies (Already Installed)

```json
{
  "dependencies": {
    "next": "16.1.6",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "next-auth": "^4.24.0",
    "drizzle-orm": "latest",
    "postgres": "latest",
    "zod": "latest",
    "lucide-react": "latest",
    "@radix-ui/*": "latest"
  }
}
```

### 8.2 New Dependencies to Install

#### For MFA/TOTP:
```bash
npm install speakeasy qrcode
npm install @types/speakeasy @types/qrcode --save-dev
```

#### For Redis Caching:
```bash
npm install ioredis
npm install @types/ioredis --save-dev
```

#### For OpenTelemetry:
```bash
npm install @opentelemetry/sdk-node
npm install @opentelemetry/auto-instrumentations-node
npm install @opentelemetry/exporter-trace-otlp-http
npm install @opentelemetry/instrumentation-fastify
npm install @opentelemetry/instrumentation-pg
```

#### For Sentry:
```bash
npm install @sentry/nextjs @sentry/node
```

#### For Prometheus:
```bash
npm install prom-client
```

#### For Testing:
```bash
npm install @playwright/test --save-dev
npm install vitest @vitest/ui --save-dev
npm install @testing-library/react @testing-library/jest-dom --save-dev
```

### 8.3 Infrastructure Dependencies

**Docker Compose for local development:**

```yaml
# docker-compose.dev.yml (add to existing)
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
  
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "16686:16686"  # Jaeger UI
      - "4318:4318"    # OTLP HTTP receiver
  
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
  
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana

volumes:
  redis-data:
  grafana-data:
```

**Start infrastructure:**
```bash
docker-compose -f docker-compose.dev.yml up -d
```

---

## 9. Testing Strategy

### 9.1 Unit Tests (Vitest)

**Coverage target:** ≥ 80%

**What to test:**
- Projection query functions
- Projection composer functions
- Interaction routing functions
- Policy functions
- Domain service functions

**Example:**
```typescript
// packages/core/src/projections/supplier/__vitest_test__/get-statement.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { getSupplierStatement } from "../queries/get-statement";

describe("getSupplierStatement", () => {
  let db: MockDb;
  let ctx: MockContext;

  beforeEach(() => {
    db = createMockDb();
    ctx = createMockContext({ portal: "supplier" });
  });

  it("should return supplier statement projection", async () => {
    const statement = await getSupplierStatement(db, ctx, "supplier-123");
    
    expect(statement.projectionType).toBe("supplier-statement");
    expect(statement.dominantDomain).toBe("ap");
    expect(statement.data.supplierId).toBe("supplier-123");
  });

  it("should fail if portal is not supplier", async () => {
    ctx.portal = "customer";
    
    await expect(
      getSupplierStatement(db, ctx, "supplier-123")
    ).rejects.toThrow("PORTAL_UNAUTHORIZED");
  });
});
```

### 9.2 Integration Tests

**What to test:**
- Full flow: API → Projection → Domain → Database
- Authentication & authorization
- Cross-domain composition
- Error handling

**Example:**
```typescript
// apps/api/src/routes/portals/__vitest_test__/supplier.integration.test.ts
import { describe, it, expect } from "vitest";
import { createTestClient } from "../../test-utils";

describe("POST /v1/portals/supplier/commands/submit-invoice", () => {
  it("should submit invoice from supplier portal", async () => {
    const client = createTestClient({ portal: "supplier" });
    
    const response = await client.post("/v1/portals/supplier/commands/submit-invoice", {
      idempotencyKey: crypto.randomUUID(),
      invoiceNumber: "INV-001",
      invoiceDate: new Date(),
      dueDate: new Date(),
      amount: 100000n,
      currency: "USD",
      lineItems: [],
    });
    
    expect(response.status).toBe(200);
    expect(response.data.invoiceNumber).toBe("INV-001");
  });

  it("should fail if portal is not supplier", async () => {
    const client = createTestClient({ portal: "customer" });
    
    const response = await client.post("/v1/portals/supplier/commands/submit-invoice", {
      // ... same payload
    });
    
    expect(response.status).toBe(403);
    expect(response.data.error.code).toBe("PORTAL_UNAUTHORIZED");
  });
});
```

### 9.3 E2E Tests (Playwright)

**What to test:**
- Critical user journeys
- Multi-step workflows
- Cross-page navigation
- Error states

**Example:**
```typescript
// apps/web/e2e/supplier-portal.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Supplier Portal - Submit Invoice", () => {
  test("supplier can submit invoice successfully", async ({ page }) => {
    // 1. Sign in
    await page.goto("/auth/portal/supplier/signin");
    await page.fill('input[name="email"]', "vendor@example.com");
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    
    // 2. Navigate to submit invoice
    await expect(page).toHaveURL("/portal/supplier");
    await page.click('a[href="/portal/supplier/invoices/new"]');
    
    // 3. Fill invoice form
    await page.fill('input[name="invoiceNumber"]', "INV-001");
    await page.fill('input[name="amount"]', "1000.00");
    await page.click('button[type="submit"]');
    
    // 4. Verify success
    await expect(page.locator(".success-message")).toContainText(
      "Invoice submitted successfully"
    );
  });
});
```

### 9.4 Load Testing (k6)

**What to test:**
- API throughput (requests/sec)
- Latency under load (p50, p95, p99)
- Concurrent users
- Cache effectiveness

**Example:**
```javascript
// load-tests/supplier-portal.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'], // p99 < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const res = http.get('https://api.afenda.test/v1/portals/supplier/queries/dashboard', {
    headers: { Authorization: `Bearer ${__ENV.JWT_TOKEN}` },
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

**Run load test:**
```bash
k6 run load-tests/supplier-portal.js
```

---

## 10. Deployment Checklist

### 10.1 Pre-Deployment

- [ ] All PR reviews approved
- [ ] CI/CD pipeline green
- [ ] `pnpm check:all` passes
- [ ] Load testing completed (≥ 1000 concurrent users)
- [ ] Security scan completed (no high/critical CVEs)
- [ ] Database migrations tested in staging
- [ ] Feature flags configured
- [ ] Rollback plan documented

### 10.2 Database Migrations

```bash
# 1. Backup production database
pg_dump -h $DB_HOST -U $DB_USER -d afenda_prod > backup-$(date +%Y%m%d).sql

# 2. Run migrations in staging first
pnpm db:migrate --env=staging

# 3. Verify migrations (read-only queries)
psql -h $STAGING_DB_HOST -U $DB_USER -d afenda_staging -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 10;"

# 4. Run migrations in production (during maintenance window)
pnpm db:migrate --env=production

# 5. Verify migrations
psql -h $PROD_DB_HOST -U $DB_USER -d afenda_prod -c "SELECT * FROM drizzle.__drizzle_migrations ORDER BY id DESC LIMIT 10;"
```

### 10.3 Deployment Steps

```bash
# 1. Tag release
git tag -a portal-v2.0.0 -m "Portal architecture v2.0.0"
git push origin portal-v2.0.0

# 2. Deploy API
vercel deploy --prod apps/api

# 3. Deploy Web
vercel deploy --prod apps/web

# 4. Deploy Worker
docker build -t afenda-worker:portal-v2.0.0 apps/worker
docker push afenda-worker:portal-v2.0.0
kubectl set image deployment/afenda-worker worker=afenda-worker:portal-v2.0.0

# 5. Smoke tests
curl https://api.afenda.com/health
curl https://app.afenda.com/portal/supplier
```

### 10.4 Post-Deployment

- [ ] Smoke tests pass
- [ ] Error rate < 0.1% (Sentry)
- [ ] p99 latency < 500ms (Prometheus)
- [ ] No alerts firing (PagerDuty)
- [ ] User acceptance testing passed
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Team notified

### 10.5 Rollback Procedure

**If deployment fails:**

```bash
# 1. Revert web deployment
vercel rollback apps/web

# 2. Revert API deployment
vercel rollback apps/api

# 3. Revert worker deployment
kubectl rollout undo deployment/afenda-worker

# 4. Revert database migrations (if safe)
psql -h $PROD_DB_HOST -U $DB_USER -d afenda_prod < backup-YYYYMMDD.sql

# 5. Verify rollback
curl https://api.afenda.com/health
```

---

## Next Steps

### Immediate Actions (This Week)

1. **Phase 0:** Set up projection package structure (1 day)
2. **Phase 1:** Implement supplier projection layer (3-5 days)
3. **Phase 2:** Create portal shell components (3-4 days)

### Short-Term (Next 2 Weeks)

4. **Phase 3:** Implement supplier portal features (Priority 1)
5. **Testing:** Add unit + integration tests for supplier portal
6. **Deploy:** Ship supplier portal to staging

### Medium-Term (Next Month)

7. **Phase 3:** Implement customer, investor portals
8. **Phase 4:** Security hardening (MFA, OAuth scopes)
9. **Phase 4:** Observability (OpenTelemetry, Sentry, Prometheus)

### Long-Term (Next Quarter)

10. **Phase 3:** Implement franchisee, contractor portals
11. **Phase 4:** Performance optimization (Redis, CDN, read replicas)
12. **Production:** Launch all portals to production

---

## Questions & Support

**For Implementation Questions:**
- Review [PORTAL-ARCHITECTURE.md](./PORTAL-ARCHITECTURE.md) § 10 for patterns
- Check existing code in `packages/core/src/erp/finance/ap/`

**For Architecture Questions:**
- Review [PORTAL-DOCTRINE.md](./PORTAL-DOCTRINE.md) for principles
- Review [PORTAL-ARCHITECTURE-LAYER.md](./PORTAL-ARCHITECTURE-LAYER.md) for layer design

**For Planning Questions:**
- Review [PORTAL-REFERENCE.md](./PORTAL-REFERENCE.md) for gap analysis

---

**Maintained By:** AFENDA Platform Team  
**Last Updated:** March 10, 2026  
**Next Review:** April 10, 2026

---

**"We are not building features. We are building truth."**

Now, start building.
