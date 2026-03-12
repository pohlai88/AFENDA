import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

type TreasuryAccountingPolicyRow = {
  id: string;
  policyCode: string;
  name: string;
  scopeType: string;
  status: string;
  debitAccountCode: string;
  creditAccountCode: string;
};

type TreasuryPostingBridgeRow = {
  id: string;
  sourceType: string;
  status: string;
  amountMinor: string;
  currencyCode: string;
  postedJournalEntryId: string | null;
  failureReason: string | null;
  createdAt: string;
};

export function TreasuryGlReconciliation({
  policies,
  postingBridges,
}: {
  policies: TreasuryAccountingPolicyRow[];
  postingBridges: TreasuryPostingBridgeRow[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Treasury Accounting Policies</CardTitle>
          <CardDescription>
            Policy mappings that drive treasury posting bridge derivation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accounting policies configured yet.</p>
          ) : (
            policies.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.policyCode} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.name} · {row.scopeType}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.debitAccountCode} / {row.creditAccountCode}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Posting Bridge Requests</CardTitle>
          <CardDescription>
            Async posting requests with journal linkage for traceable reconciliation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {postingBridges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posting bridge requests yet.</p>
          ) : (
            postingBridges.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.sourceType} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.amountMinor} {row.currencyCode}
                </div>
                <div className="text-sm text-muted-foreground">
                  journal {row.postedJournalEntryId ?? "pending"}
                </div>
                {row.failureReason ? (
                  <div className="text-sm text-destructive">{row.failureReason}</div>
                ) : null}
                <div className="text-xs text-muted-foreground">
                  {new Date(row.createdAt).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
