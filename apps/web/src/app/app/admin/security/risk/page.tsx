import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { auth } from "@/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import { detectAuthAnomalies } from "@/features/auth/server/anomaly/auth-anomaly.service";

export default async function AdminSecurityRiskPage() {
  const session = await auth();

  if (!session?.user || !session.user.roles.includes("admin")) {
    redirect("/auth/signin");
  }

  const findings = await detectAuthAnomalies();

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
          Risk Findings
        </h1>
        <p className="text-sm text-muted-foreground">
          Current anomaly detections across auth operations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detected Findings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {findings.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No active risk findings.
            </div>
          ) : (
            findings.map((finding) => (
              <div key={finding.code} className="rounded-md border p-3">
                <div className="font-medium">{finding.message}</div>
                <div className="text-sm text-muted-foreground">
                  code: {finding.code} · severity: {finding.severity} · value:{" "}
                  {finding.value}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
