export interface HrmCommandContext {
  orgId: string;
  actorUserId: string;
  actorEmployeeId?: string | null;
  idempotencyKey: string;
  requestId?: string | null;
  correlationId?: string | null;
  now?: Date;
}
