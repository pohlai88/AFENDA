import { type ResolutionStatus } from "@afenda/contracts";

export interface ResolutionStateGuardError {
  code: string;
  message: string;
}

export type ResolutionCommandGuardAction = "update" | "withdraw" | "cast_vote";

const FINALIZED_STATUSES: readonly ResolutionStatus[] = ["approved", "rejected"];
const WITHDRAWN_STATUSES: readonly ResolutionStatus[] = ["deferred", "tabled"];
const COMM_RESOLUTION_WITHDRAWN_CODE = "COMM_RESOLUTION_IS_WITHDRAWN" as const;
const COMM_RESOLUTION_FINALIZED_CODE = "COMM_RESOLUTION_IS_FINALIZED" as const;

export function getResolutionStateGuardError(
  status: ResolutionStatus,
  action: ResolutionCommandGuardAction,
): ResolutionStateGuardError | null {
  const actionLabel =
    action === "cast_vote" ? "Voting" : action === "withdraw" ? "Withdrawal" : "Update";

  if (WITHDRAWN_STATUSES.includes(status)) {
    return {
      code: COMM_RESOLUTION_WITHDRAWN_CODE,
      message: `${actionLabel} is not allowed for withdrawn resolutions.`,
    };
  }

  if (FINALIZED_STATUSES.includes(status)) {
    return {
      code: COMM_RESOLUTION_FINALIZED_CODE,
      message: `${actionLabel} is not allowed for finalized resolutions.`,
    };
  }

  return null;
}
