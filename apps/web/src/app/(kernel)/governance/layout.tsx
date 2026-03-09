import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Governance — AFENDA",
  description: "Audit, compliance, and system settings",
};

export default function GovernanceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
