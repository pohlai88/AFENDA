/**
 * /finance/ap/invoices/[id] — AP Invoice detail page (RSC).
 *
 * Server component: fetches the invoice record + capabilities,
 * then hydrates the client-side interactive detail view.
 */

import { notFound } from "next/navigation";
import { fetchInvoice, fetchCapabilities } from "@/lib/api-client";
import type { CapabilityResult } from "@afenda/contracts";
import InvoiceDetailClient from "./InvoiceDetailClient";

const EMPTY_CAPS: CapabilityResult = {
  fieldCaps: {},
  actionCaps: {},
  policyVersion: "1.0.0",
  evaluatedAt: new Date().toISOString(),
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;

  let invoice;
  try {
    const result = await fetchInvoice(id);
    invoice = result.data;
  } catch {
    notFound();
  }

  let capabilities: CapabilityResult = EMPTY_CAPS;
  try {
    const capsResult = await fetchCapabilities("finance.ap_invoice", {
      submittedByPrincipalId: invoice.submittedByPrincipalId ?? undefined,
    });
    capabilities = capsResult.data;
  } catch {
    // Non-fatal — fall back to empty caps
  }

  return (
    <InvoiceDetailClient invoice={invoice} capabilities={capabilities} />
  );
}
