import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { redirect } from "next/navigation";

import { assertAuditorReadAccess } from "@/features/auth/server/execution/auditor-view.service";
import { getAuthGovernanceSnapshot } from "@/features/auth/server/governance/auth-governance.service";

export default async function AuditorSecurityPage() {
  try {
    await assertAuditorReadAccess();
  } catch {
    redirect("/app");
  }

  const snapshot = await getAuthGovernanceSnapshot();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditor Security View</h1>
        <p className="text-sm text-muted-foreground">
          Read-only access to auth governance and evidence health.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Active Challenges" value={snapshot.metrics.activeChallenges} />
        <Metric title="Pending Audit Events" value={snapshot.metrics.pendingAuditEvents} />
        <Metric title="Failed Audit Events" value={snapshot.metrics.failedAuditEvents} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Incidents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.recentIncidents.length === 0 ? (
            <div className="text-sm text-muted-foreground">No recent incidents.</div>
          ) : (
            snapshot.recentIncidents.map((incident) => (
              <div key={incident.id} className="rounded-md border p-3">
                <div className="font-medium">{incident.title}</div>
                <div className="text-sm text-muted-foreground">
                  {incident.code} · {incident.severity} · {incident.status}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
