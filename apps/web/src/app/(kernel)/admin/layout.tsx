import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Session depends on cookies — force dynamic (Neon Auth). */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — AFENDA",
  description: "Internal admin and observability tools",
};

/**
 * Admin layout — defence-in-depth session check.
 * Middleware is the first gate; this layout is the second.
 */
export default async function AdminLayout({
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
