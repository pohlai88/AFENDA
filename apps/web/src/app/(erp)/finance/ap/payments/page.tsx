import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

/** AP Payments — placeholder. */
export default function PaymentsPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payment runs and disbursements — coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
