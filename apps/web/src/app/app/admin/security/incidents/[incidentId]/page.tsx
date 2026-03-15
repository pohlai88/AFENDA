import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { auth } from "@/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { exportAuthIncidentEvidence } from "@/features/auth/server/incident/auth-incident.export";
import { getAuthIncidentById } from "@/features/auth/server/incident/auth-incident.service";

interface PageProps {
  params: Promise<{ incidentId: string }>;
}

export default async function AdminSecurityIncidentDetailPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    redirect("/app");
  }

  const { incidentId } = await params;
  const incident = await getAuthIncidentById(incidentId);

  if (!incident) {
    notFound();
  }

  const evidence = await exportAuthIncidentEvidence(incidentId);

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/app/admin/security/incidents"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Incidents
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{incident.title}</h1>
        <p className="text-sm text-muted-foreground">
          {incident.code} · severity: {incident.severity} · status: {incident.status}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>Related email: {incident.relatedEmail ?? "—"}</div>
          <div>Related user: {incident.relatedUserId ?? "—"}</div>
          <div>Related tenant: {incident.relatedTenantId ?? "—"}</div>
          <div>Related portal: {incident.relatedPortal ?? "—"}</div>
          <div>Acknowledged by: {incident.acknowledgedBy ?? "—"}</div>
          <div>Assigned to: {incident.assignedTo ?? "—"}</div>
          <div>Resolved by: {incident.resolvedBy ?? "—"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evidence Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Audit events: {evidence?.relatedAuditEvents.length ?? 0}
          </div>
          <div className="text-sm text-muted-foreground">
            Challenges: {evidence?.relatedChallenges.length ?? 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
