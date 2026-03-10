import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@afenda/ui";

/** AP Payments — quick links to payment management pages */
export default function PaymentsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight mb-6">Payments</h1>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Runs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Batch payment processing for AP invoices with early discount optimization.
            </p>
            <div className="flex gap-2">
              <Button variant="default" size="sm" asChild>
                <Link href="/finance/ap/payment-runs">View Payment Runs</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/finance/ap/payment-runs/new">+ New Run</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prepayments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Track advance payments to suppliers and apply to invoices.
            </p>
            <div className="flex gap-2">
              <Button variant="default" size="sm" asChild>
                <Link href="/finance/ap/prepayments">View Prepayments</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/finance/ap/prepayments/new">+ New Prepayment</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Terms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Define payment terms with due dates and early payment discounts.
            </p>
            <Button variant="default" size="sm" asChild>
              <Link href="/finance/ap/payment-terms">Manage Terms</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Payment trends, discount capture rate, and cash flow forecasting — coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
