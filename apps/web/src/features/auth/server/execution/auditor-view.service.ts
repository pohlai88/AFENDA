import { auth } from "@/auth";

export async function assertAuditorReadAccess() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthenticated");
  }

  const allowed =
    session.user.roles?.includes("auditor") ||
    session.user.roles?.includes("internal_audit") ||
    session.user.roles?.includes("admin");

  if (!allowed) {
    throw new Error("Forbidden");
  }

  return session;
}
