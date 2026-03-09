import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Finance — AFENDA",
  description: "Accounts Payable, General Ledger, and financial operations",
};

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
