import type { Metadata } from "next";
import { PaymentManagerClient } from "./PaymentManagerClient";

export const metadata: Metadata = {
  title: "Payments — Treasury — AFENDA",
  description: "Create, submit, approve, and release payment instructions and batches",
};

export default function TreasuryPaymentsPage() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payment Factory</h1>
        <p className="text-sm text-muted-foreground">
          Create and manage payment instructions—submit, approve, or reject—and group
          them into release batches.
        </p>
      </div>
      <PaymentManagerClient />
    </div>
  );
}
