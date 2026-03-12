import { NettingSettlementView } from "../components/netting-settlement-view";
import { fetchTreasuryInternalInterestRates, fetchTreasuryNettingSessions } from "@/lib/api-client";

export default async function NettingPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  await searchParams;

  const [sessions, interestRates] = await Promise.all([
    fetchTreasuryNettingSessions(),
    fetchTreasuryInternalInterestRates(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Netting and Internal Interest</h1>
        <p className="mt-2 text-muted-foreground">
          Net intercompany obligations and apply deterministic internal interest policies.
        </p>
      </div>

      <NettingSettlementView sessions={sessions} interestRates={interestRates} />
    </div>
  );
}
