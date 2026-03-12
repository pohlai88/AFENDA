import { ConnectorMonitor } from "../components/connector-monitor";
import {
  fetchTreasuryBankConnectorExecutions,
  fetchTreasuryBankConnectors,
  fetchTreasuryMarketDataFeeds,
  fetchTreasuryMarketDataObservations,
} from "@/lib/api-client";

export default async function TreasuryIntegrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  await searchParams;

  const [connectors, executions, feeds, observations] = await Promise.all([
    fetchTreasuryBankConnectors(),
    fetchTreasuryBankConnectorExecutions(),
    fetchTreasuryMarketDataFeeds(),
    fetchTreasuryMarketDataObservations(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treasury Integrations</h1>
        <p className="mt-2 text-muted-foreground">
          Connector health and market data ingestion visibility for treasury operations.
        </p>
      </div>
      <ConnectorMonitor
        connectors={connectors as any[]}
        executions={executions as any[]}
        feeds={feeds as any[]}
        observations={observations as any[]}
      />
    </div>
  );
}
