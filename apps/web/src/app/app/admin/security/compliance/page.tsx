import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { runAuthControlChecks } from "@/features/auth/server/compliance/control-checks.service";

export default async function AdminSecurityCompliancePage() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    redirect("/auth/signin");
  }

  const allRuns = await runAuthControlChecks();
  const controlRuns = allRuns.filter((r): r is NonNullable<typeof r> => Boolean(r));

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link
          href="/app/admin/security"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Security Ops
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Compliance & Evidence
        </h1>
        <p className="text-sm text-muted-foreground">
          Control runs, attestations, retention, and signed evidence exports.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latest Control Runs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {controlRuns.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No control runs yet.
            </div>
          ) : (
            controlRuns.map((run) => (
              <div key={run.id} className="rounded-md border p-3">
                <div className="font-medium">
                  {run.controlCode} · {run.status.toUpperCase()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {run.summary} · findings: {run.findingsCount}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
