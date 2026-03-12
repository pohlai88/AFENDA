import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export interface NettingSessionViewRow {
  id: string;
  sessionNumber: string;
  status: string;
  currencyCode: string;
  totalObligationCount: number;
  totalNettableMinor: string;
}

export interface InternalInterestRateViewRow {
  id: string;
  code: string;
  status: string;
  currencyCode: string;
  annualRateBps: number;
  dayCountConvention: string;
}

export function NettingSettlementView({
  sessions,
  interestRates,
}: {
  sessions: NettingSessionViewRow[];
  interestRates: InternalInterestRateViewRow[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Netting Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No netting sessions yet.</p>
          ) : (
            sessions.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.sessionNumber} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.currencyCode} · obligations {row.totalObligationCount} · nettable{" "}
                  {row.totalNettableMinor}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Internal Interest Rates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {interestRates.length === 0 ? (
            <p className="text-sm text-muted-foreground">No internal interest rates yet.</p>
          ) : (
            interestRates.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.code} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.currencyCode} · {row.annualRateBps} bps · {row.dayCountConvention}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
