import Link from "next/link";
import { Button } from "@afenda/ui";
import { fetchInvoices, fetchCapabilities } from "@/lib/api-client";
import InvoiceSplitClient from "./InvoiceSplitClient";

/** AP Invoices — SplitWorkspace (master-detail) scaffold. */
export default async function InvoiceSplitPage() {
  const [invoicesRes, capabilitiesRes] = await Promise.all([
    fetchInvoices({ limit: 20 }),
    fetchCapabilities("finance.ap_invoice"),
  ]);

  return (
    <div className="max-w-full mx-auto px-6 py-8 h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">AP Invoices (Split)</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href="/finance/ap/invoices">List view</Link>
        </Button>
      </div>
      <InvoiceSplitClient
        initialData={invoicesRes.data}
        initialCursor={invoicesRes.cursor}
        initialHasMore={invoicesRes.hasMore}
        capabilities={capabilitiesRes.data}
      />
    </div>
  );
}
