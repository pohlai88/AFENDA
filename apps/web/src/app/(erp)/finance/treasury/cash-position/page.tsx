import type { Metadata } from "next";
import { CashPositionDashboard } from "../components/cash-position-dashboard";

export const metadata: Metadata = {
  title: "Cash Position — Treasury — AFENDA",
  description: "View and generate cash position snapshots for treasury visibility",
};

export default function TreasuryCashPositionPage() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cash Position Snapshot</h1>
        <p className="text-sm text-muted-foreground">
          Generate reproducible as-of snapshots of available cash, pending inflows, and
          pending outflows.
        </p>
      </div>
      <CashPositionDashboard />
    </div>
  );
}
