import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { listRecentAuthIncidents } from "@/features/auth/server/incident/auth-incident.service";

export default async function AdminSecurityIncidentsPage() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    redirect("/app");
  }

  const incidents = await listRecentAuthIncidents(100);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/app/admin/security" className="text-sm text-muted-foreground hover:underline">
          ← Security Ops
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Security Incidents</h1>
        <p className="text-sm text-muted-foreground">
          Triage, assignment, and resolution workflow for auth security events.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {incidents.length === 0 ? (
              <div className="text-sm text-muted-foreground">No incidents found.</div>
            ) : (
              incidents.map((incident) => (
                <div key={incident.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{incident.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {incident.code} · severity: {incident.severity} · status: {incident.status}
                      </div>
                      {incident.relatedEmail ? (
                        <div className="text-sm text-muted-foreground">
                          related: {incident.relatedEmail}
                        </div>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(incident.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
