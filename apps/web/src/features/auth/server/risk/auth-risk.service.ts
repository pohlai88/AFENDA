import type { AuthRiskInput, AuthRiskResult } from "./auth-risk.types";

export async function evaluateAuthRisk(
  _input: AuthRiskInput,
): Promise<AuthRiskResult> {
  return {
    level: "low",
    requiresMfa: false,
    blocked: false,
    reasons: [],
  };
}
