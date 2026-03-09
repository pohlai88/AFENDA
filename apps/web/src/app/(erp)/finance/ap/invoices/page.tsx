import Link from "next/link";
import { Button } from "@afenda/ui";
import { fetchInvoices, fetchCapabilities } from "@/lib/api-client";
import InvoiceListClient from "./InvoiceListClient";

/** AP Invoices list — server-fetched data, client interactivity. */
export default async function InvoiceListPage() {
  const [invoicesRes, capabilitiesRes] = await Promise.all([
    fetchInvoices({ limit: 20 }),
    fetchCapabilities("finance.ap_invoice"),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">AP Invoices</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/ap/invoices/new">+ New Invoice</Link>
        </Button>
      </div>
      <InvoiceListClient
        initialData={invoicesRes.data}
        initialCursor={invoicesRes.cursor}
        initialHasMore={invoicesRes.hasMore}
        capabilities={capabilitiesRes.data}
      />
    </div>
  );
}
