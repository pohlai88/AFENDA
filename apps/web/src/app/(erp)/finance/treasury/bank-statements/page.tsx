import type { Metadata } from "next";
import { BankStatementManagerClient } from "./BankStatementManagerClient";

export const metadata: Metadata = {
  title: "Treasury Bank Statements — AFENDA",
  description: "Manage treasury bank statements and ingestion",
};

export default function TreasuryBankStatementsPage() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Bank Statements
        </h1>
        <p className="text-sm text-muted-foreground">
          Ingest bank statements and manage transaction lines.
        </p>
      </div>
      <BankStatementManagerClient />
    </div>
  );
}
