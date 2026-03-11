import type { PortalType } from "@afenda/contracts";

export type AuthRiskLevel = "low" | "medium" | "high";

export interface AuthRiskInput {
  email?: string;
  portal?: PortalType;
  ipAddress?: string;
  userAgent?: string;
  failureCount?: number;
}

export interface AuthRiskResult {
  level: AuthRiskLevel;
  requiresMfa: boolean;
  blocked: boolean;
  reasons: string[];
}
