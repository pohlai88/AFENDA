/**
 * /finance/ap/invoices — AP Invoice list page (RSC).
 *
 * Server component: fetches initial invoice data + capabilities,
 * then hydrates the client-side interactive list.
 */

import Link from "next/link";
import { fetchInvoices, fetchCapabilities } from "@/lib/api-client";
import type { CapabilityResult } from "@afenda/contracts";
import InvoiceListClient from "./InvoiceListClient";

const EMPTY_CAPS: CapabilityResult = {
  fieldCaps: {},
  actionCaps: {},
  policyVersion: "1.0.0",
  evaluatedAt: new Date().toISOString(),
};

export default async function InvoiceListPage() {
  const [invoiceResult, capsResult] = await Promise.allSettled([
    fetchInvoices({ limit: 20 }),
    fetchCapabilities("finance.ap_invoice"),
  ]);

  const invoices =
    invoiceResult.status === "fulfilled" ? invoiceResult.value : null;
  const capabilities =
    capsResult.status === "fulfilled" ? capsResult.value.data : EMPTY_CAPS;

  if (!invoices) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight mb-6">AP Invoices</h1>
        <div className="border border-destructive/30 rounded-lg p-8 text-center">
          <p className="text-destructive font-medium">Failed to load invoices</p>
          <p className="text-sm text-muted-foreground mt-1">
            {invoiceResult.status === "rejected"
              ? String(invoiceResult.reason)
              : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AP Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage accounts payable invoices
          </p>
        </div>
        <Link
          href="/finance/ap/invoices/new"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
        >
          + New Invoice
        </Link>
      </div>

      <InvoiceListClient
        initialData={invoices.data}
        initialCursor={invoices.cursor}
        initialHasMore={invoices.hasMore}
        capabilities={capabilities}
      />
    </div>
  );
}
