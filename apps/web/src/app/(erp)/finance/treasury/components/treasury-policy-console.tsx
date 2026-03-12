import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

type PolicyRow = {
  id: string;
  code: string;
  name: string;
  scopeType: string;
  status: string;
};

type LimitRow = {
  id: string;
  code: string;
  thresholdMinor: string;
  metric: string;
  status: string;
};

type BreachRow = {
  id: string;
  sourceType: string;
  measuredValueMinor: string;
  thresholdMinor: string;
  hardBlock: boolean;
};

export function TreasuryPolicyConsole({
  policies,
  limits,
  breaches,
}: {
  policies: PolicyRow[];
  limits: LimitRow[];
  breaches: BreachRow[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No treasury policies yet.</p>
          ) : (
            policies.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.code} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.name} · {row.scopeType}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {limits.length === 0 ? (
            <p className="text-sm text-muted-foreground">No treasury limits yet.</p>
          ) : (
            limits.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.code} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.metric} · threshold {row.thresholdMinor}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Breaches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {breaches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No limit breaches yet.</p>
          ) : (
            breaches.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">{row.sourceType}</div>
                <div className="text-sm text-muted-foreground">
                  {row.measuredValueMinor} / {row.thresholdMinor} · hard block{" "}
                  {String(row.hardBlock)}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
