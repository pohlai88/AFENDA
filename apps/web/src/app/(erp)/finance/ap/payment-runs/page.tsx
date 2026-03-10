import Link from "next/link";
import { Button } from "@afenda/ui";
import { PaymentRunListClient } from "./PaymentRunListClient";

/** AP Payment Runs — batch payment processing */
export default async function PaymentRunsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Runs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Batch payment processing for AP invoices
          </p>
        </div>
        <Button variant="default" size="sm" asChild>
          <Link href="/finance/ap/payment-runs/new">+ New Payment Run</Link>
        </Button>
      </div>
      <PaymentRunListClient />
    </div>
  );
}
