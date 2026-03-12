import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

type ConnectorRow = {
  id: string;
  code: string;
  connectorType: string;
  status: string;
  health: string;
  bankName: string;
  consecutiveFailureCount: number;
};

type ExecutionRow = {
  id: string;
  status: string;
  executionType: string;
  retryCount: number;
};

type FeedRow = {
  id: string;
  code: string;
  providerCode: string;
  feedType: string;
  status: string;
};

type ObservationRow = {
  id: string;
  marketDataFeedId: string;
  observationDate: string;
  sourceVersion: string;
};

export function ConnectorMonitor({
  connectors,
  executions,
  feeds,
  observations,
}: {
  connectors: ConnectorRow[];
  executions: ExecutionRow[];
  feeds: FeedRow[];
  observations: ObservationRow[];
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Bank Connectors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {connectors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bank connectors configured.</p>
          ) : (
            connectors.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.code} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.bankName} · {row.connectorType} · {row.health} · failures{" "}
                  {row.consecutiveFailureCount}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connector Executions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {executions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No connector executions yet.</p>
          ) : (
            executions.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.executionType} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">Retries {row.retryCount}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Market Data Feeds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {feeds.length === 0 ? (
            <p className="text-sm text-muted-foreground">No market data feeds configured.</p>
          ) : (
            feeds.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">
                  {row.code} · {row.status}
                </div>
                <div className="text-sm text-muted-foreground">
                  {row.providerCode} · {row.feedType}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Latest Observations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {observations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No observations loaded yet.</p>
          ) : (
            observations.map((row) => (
              <div key={row.id} className="rounded-xl border p-4">
                <div className="font-medium">Feed {row.marketDataFeedId}</div>
                <div className="text-sm text-muted-foreground">
                  {row.observationDate} · {row.sourceVersion}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
