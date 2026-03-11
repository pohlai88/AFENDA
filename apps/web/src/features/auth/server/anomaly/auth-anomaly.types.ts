export interface AuthAnomalyFinding {
  code:
    | "high_signin_failure_volume"
    | "high_mfa_failure_volume"
    | "failed_audit_backlog"
    | "expired_challenge_backlog";
  severity: "low" | "medium" | "high";
  message: string;
  value: number;
  threshold: number;
}
