import type { Metadata } from "next";
import { ReconciliationManagerClient } from "./ReconciliationManagerClient";

export const metadata: Metadata = {
  title: "Reconciliation — Treasury — AFENDA",
  description: "Manage bank statement reconciliation sessions and match transactions",
};

export default function TreasuryReconciliationPage() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reconciliation</h1>
        <p className="text-sm text-muted-foreground">
          Open reconciliation sessions, match statement lines to transactions, and close
          when complete.
        </p>
      </div>
      <ReconciliationManagerClient />
    </div>
  );
}
