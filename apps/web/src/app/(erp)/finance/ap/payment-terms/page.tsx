import Link from "next/link";
import { Button } from "@afenda/ui";
import { PaymentTermsListClient } from "./PaymentTermsListClient";

/** Payment Terms — NET30, 2/10NET30, etc. */
export default async function PaymentTermsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Terms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Define due dates and early payment discounts
          </p>
        </div>
        <Button variant="default" size="sm" asChild>
          <Link href="/finance/ap/payment-terms/new">+ New Terms</Link>
        </Button>
      </div>
      <PaymentTermsListClient />
    </div>
  );
}
