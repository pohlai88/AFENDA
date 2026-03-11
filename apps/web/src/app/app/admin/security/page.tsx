import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import { getAuthGovernanceSnapshot } from "@/features/auth/server/governance/auth-governance.service";
import { AnomalyCard } from "./_components/AnomalyCard";
import {
  ArchiveAuditButton,
  PurgeChallengesButton,
  SecurityOpsNav,
} from "./_components/SecurityOpsActions";

export default async function AdminSecurityPage() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    redirect("/auth/signin");
  }

  const snapshot = await getAuthGovernanceSnapshot();

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Security Operations
        </h1>
        <p className="text-sm text-muted-foreground">
          Auth governance, challenge review, and anomaly monitoring.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <SecurityOpsNav />
        <PurgeChallengesButton />
        <ArchiveAuditButton />
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
        <MetricCard
          title="Active Challenges"
          value={snapshot.metrics.activeChallenges}
        />
        <MetricCard
          title="Pending Audit Events"
          value={snapshot.metrics.pendingAuditEvents}
        />
        <MetricCard
          title="Failed Audit Events"
          value={snapshot.metrics.failedAuditEvents}
        />
        <MetricCard
          title="Sign-in Failures (24h)"
          value={snapshot.metrics.recentSigninFailures}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Anomalies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {snapshot.anomalies.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No active anomalies.
            </div>
          ) : (
            snapshot.anomalies.map((finding) => (
              <AnomalyCard key={finding.code} finding={finding} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
