import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { hasAdminOperationAccess } from "@/lib/auth/server";
import { ListUsersClient } from "./ListUsersClient";
import { Button } from "@afenda/ui";
import { ChevronLeft } from "lucide-react";

export const dynamic = "force-dynamic";

/** Admin users — list all users (Neon Auth auth.admin.listUsers). Admin role required. */
export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/app");
  }
  if (!hasAdminOperationAccess(session)) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="mb-2 -ml-2" asChild>
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            Admin
          </Link>
        </Button>
        <h1 className="text-base font-semibold text-foreground">Users</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          List all users (admin only). Use limit and offset for pagination.
        </p>
      </div>
      <ListUsersClient currentUserId={session.user.id} />
    </div>
  );
}

