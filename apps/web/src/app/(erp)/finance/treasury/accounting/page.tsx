import type { Metadata } from "next";
import { TreasuryGlReconciliation } from "../components/treasury-gl-reconciliation";
import { fetchTreasuryAccountingPolicies, fetchTreasuryPostingBridges } from "@/lib/api-client";

export const metadata: Metadata = {
  title: "Treasury Accounting Bridge - AFENDA",
  description: "Review treasury posting bridge requests and reconciliation with GL",
};

export default async function TreasuryAccountingPage() {
  const [policies, postingBridges] = await Promise.all([
    fetchTreasuryAccountingPolicies(),
    fetchTreasuryPostingBridges(),
  ]);

  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Treasury Accounting Bridge</h1>
        <p className="text-sm text-muted-foreground">
          Inspect accounting policy mappings and posting bridge reconciliation status.
        </p>
      </div>
      <TreasuryGlReconciliation policies={policies} postingBridges={postingBridges} />
    </div>
  );
}
