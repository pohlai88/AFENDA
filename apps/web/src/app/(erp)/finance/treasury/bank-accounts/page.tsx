import type { Metadata } from "next";
import { BankAccountManagerClient } from "./BankAccountManagerClient";

export const metadata: Metadata = {
  title: "Treasury Bank Accounts — AFENDA",
  description: "Manage treasury bank accounts and lifecycle state",
};

export default function TreasuryBankAccountsPage() {
  return (
    <div className="space-y-6 px-6 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bank Account Management</h1>
        <p className="text-sm text-muted-foreground">
          Create, update, activate, and deactivate treasury bank accounts.
        </p>
      </div>
      <BankAccountManagerClient />
    </div>
  );
}
