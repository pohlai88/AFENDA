import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Session depends on cookies — force dynamic (Neon Auth). */
export const dynamic = "force-dynamic";

/**
 * ERP route group layout — defence-in-depth session check.
 *
 * The middleware (proxy.ts) handles the first line of protection.
 * This layout provides a second layer: no ERP page renders without
 * a valid server-side session, regardless of middleware state.
 */
export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/app");
  }

  return <>{children}</>;
}
