import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@afenda/ui";

/** New Invoice — placeholder. */
export default function NewInvoicePage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/finance/ap/invoices">← Back to invoices</Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>New Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            New invoice placeholder. Component examination in progress.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
