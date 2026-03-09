import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

/** AR Invoices — placeholder. */
export default function ARInvoicesPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>AR Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Accounts receivable invoices — coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
