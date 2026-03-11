import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export const metadata: Metadata = {
  title: "Governance — AFENDA",
  description: "Audit, compliance, and system settings",
};

/**
 * Governance layout — defence-in-depth session check.
 * Middleware is the first gate; this layout is the second.
 */
export default async function GovernanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <>{children}</>;
}
