import { TreasuryPolicyConsole } from "../components/treasury-policy-console";
import {
  fetchTreasuryLimitBreaches,
  fetchTreasuryLimits,
  fetchTreasuryPolicies,
} from "@/lib/api-client";

export default async function TreasuryGovernancePage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string }>;
}) {
  await searchParams;

  const [policies, limits, breaches] = await Promise.all([
    fetchTreasuryPolicies(),
    fetchTreasuryLimits(),
    fetchTreasuryLimitBreaches(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Treasury Governance</h1>
        <p className="mt-2 text-muted-foreground">
          Policy and limit control panel for treasury approvals and breach visibility.
        </p>
      </div>
      <TreasuryPolicyConsole
        policies={policies as any[]}
        limits={limits as any[]}
        breaches={breaches as any[]}
      />
    </div>
  );
}
