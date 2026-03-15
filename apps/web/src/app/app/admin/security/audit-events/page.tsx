import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getRecentSecurityAuditEvents } from "@/features/auth/server/ops/auth-ops.service";
import { AuditEventRow } from "../_components/AuditEventRow";

export default async function AdminSecurityAuditEventsPage() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    redirect("/app");
  }

  const events = await getRecentSecurityAuditEvents(100);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/app/admin/security" className="text-sm text-muted-foreground hover:underline">
          ← Security Ops
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Auth Audit Events</h1>
        <p className="text-sm text-muted-foreground">
          Review pending, sent, and failed auth security events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Audit Outbox Events</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.length === 0 ? (
              <div className="text-sm text-muted-foreground">No audit events found.</div>
            ) : (
              events.map((item) => <AuditEventRow key={item.id} item={item} />)
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
