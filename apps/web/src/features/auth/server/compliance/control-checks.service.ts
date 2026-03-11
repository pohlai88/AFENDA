import { getAuthSecurityMetrics } from "../metrics/auth-metrics.service";
import { AuthComplianceRepository } from "./compliance.repository";
import { AUTH_CONTROL_DEFINITIONS } from "./compliance.service";

const repository = new AuthComplianceRepository();

export async function runAuthControlChecks() {
  const metrics = await getAuthSecurityMetrics();
  const results = [];

  for (const control of AUTH_CONTROL_DEFINITIONS) {
    let status: "passed" | "failed" | "warning" = "passed";
    let findingsCount = 0;
    let summary = "Control passed.";

    if (
      control.code === "AUTH-CTRL-001" &&
      metrics.recentSigninFailures >= 50
    ) {
      status = "failed";
      findingsCount = metrics.recentSigninFailures;
      summary = "Failed sign-in volume exceeded threshold.";
    }

    if (
      control.code === "AUTH-CTRL-002" &&
      metrics.recentMfaFailures >= 20
    ) {
      status = "warning";
      findingsCount = metrics.recentMfaFailures;
      summary = "Elevated MFA failures detected.";
    }

    if (control.code === "AUTH-CTRL-003" && metrics.failedAuditEvents > 0) {
      status = "failed";
      findingsCount = metrics.failedAuditEvents;
      summary = "Failed auth audit events require remediation.";
    }

    if (
      control.code === "AUTH-CTRL-004" &&
      metrics.expiredUnpurgedChallenges > 0
    ) {
      status = "warning";
      findingsCount = metrics.expiredUnpurgedChallenges;
      summary = "Expired auth challenges remain unpurged.";
    }

    const row = await repository.insertControlRun({
      controlCode: control.code,
      framework: control.framework,
      status,
      summary,
      findingsCount,
      metadata: {
        frequency: control.frequency,
        ownerRole: control.ownerRole,
      },
    });

    results.push(row);
  }

  return results;
}
