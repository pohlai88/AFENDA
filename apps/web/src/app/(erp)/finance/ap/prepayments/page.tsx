import Link from "next/link";
import { Button } from "@afenda/ui";
import { PrepaymentListClient } from "./PrepaymentListClient";

/** Prepayments — advance payments to suppliers */
export default async function PrepaymentsPage() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Prepayments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Advance payments to suppliers
          </p>
        </div>
        <Button variant="default" size="sm" asChild>
          <Link href="/finance/ap/prepayments/new">+ New Prepayment</Link>
        </Button>
      </div>
      <PrepaymentListClient />
    </div>
  );
}
