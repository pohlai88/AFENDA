/**
 * Approval detail client — step chain visualization + Approve/Reject/Delegate actions.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label } from "@afenda/ui";
import type {
  ApprovalRequestRow,
  ApprovalStepRow,
  ApprovalStatusHistoryRow,
} from "@/lib/api-client";
import {
  approveStep,
  rejectStep,
  delegateStep,
  escalateApproval,
  withdrawApproval,
} from "@/lib/api-client";

interface ApprovalDetailClientProps {
  request: ApprovalRequestRow;
  steps: ApprovalStepRow[];
  history: ApprovalStatusHistoryRow[];
}

type ActionMode = "approve" | "reject" | "delegate" | "escalate" | "withdraw" | null;

const STEP_STATUS_CLASSES: Record<string, string> = {
  pending: "border-border bg-accent/40",
  approved: "border-primary/40 bg-primary/10",
  rejected: "border-destructive/40 bg-destructive/10",
  delegated: "border-secondary bg-secondary/50",
  skipped: "border-muted bg-muted/30",
};

export default function ApprovalDetailClient({
  request,
  steps,
  history,
}: ApprovalDetailClientProps) {
  const router = useRouter();

  const [action, setAction] = useState<ActionMode>(null);
  const [comment, setComment] = useState("");
  const [delegateTo, setDelegateTo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentStep = steps.find(
    (s) => s.stepIndex === request.currentStepIndex && s.status === "pending",
  );
  const isResolved = ["approved", "rejected", "withdrawn", "expired"].includes(request.status);
  const canAct = !isResolved && currentStep !== undefined;

  const resetForm = () => {
    setAction(null);
    setComment("");
    setDelegateTo("");
    setError(null);
  };

  const handleSubmit = async () => {
    if (!currentStep) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (action === "approve") {
        await approveStep({
          approvalRequestId: request.id,
          stepId: currentStep.id,
          comment: comment || undefined,
        });
      } else if (action === "reject") {
        if (!comment.trim()) {
          setError("A comment is required when rejecting.");
          setIsSubmitting(false);
          return;
        }
        await rejectStep({
          approvalRequestId: request.id,
          stepId: currentStep.id,
          comment,
        });
      } else if (action === "delegate") {
        if (!delegateTo.trim()) {
          setError("Delegate-to principal ID is required.");
          setIsSubmitting(false);
          return;
        }
        await delegateStep({
          approvalRequestId: request.id,
          stepId: currentStep.id,
          delegateToPrincipalId: delegateTo,
          comment: comment || undefined,
        });
      } else if (action === "escalate") {
        await escalateApproval({
          approvalRequestId: request.id,
          comment: comment || undefined,
        });
      } else if (action === "withdraw") {
        await withdrawApproval({
          approvalRequestId: request.id,
          comment: comment || undefined,
        });
      }

      resetForm();
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Request meta */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Requested by</p>
          <p className="mt-0.5 font-mono text-xs">{request.requestedByPrincipalId}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Due date</p>
          <p className="mt-0.5">
            {request.dueDate ? new Date(request.dueDate).toLocaleDateString() : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Created</p>
          <p className="mt-0.5">{new Date(request.createdAt).toLocaleDateString()}</p>
        </div>
        {request.resolvedAt && (
          <div>
            <p className="text-xs text-muted-foreground">Resolved</p>
            <p className="mt-0.5">{new Date(request.resolvedAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>

      {/* Step chain */}
      <div className="rounded-lg border p-4">
        <h2 className="mb-4 text-base font-semibold">Approval Steps</h2>
        <ol className="space-y-3">
          {steps.map((step, idx) => (
            <li
              key={step.id}
              className={`flex items-start gap-4 rounded-lg border-l-4 p-4 ${
                STEP_STATUS_CLASSES[step.status] ?? "border-muted bg-muted/20"
              }`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background text-sm font-bold ring-1 ring-border">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium">
                  Assignee: <span className="font-mono text-xs">{step.assigneeId}</span>
                </p>
                {step.delegatedToId && (
                  <p className="text-xs text-muted-foreground">
                    Delegated to: <span className="font-mono">{step.delegatedToId}</span>
                  </p>
                )}
                {step.comment && (
                  <p className="mt-1 rounded bg-background/60 px-2 py-1 text-xs italic">
                    &ldquo;{step.comment}&rdquo;
                  </p>
                )}
                {step.actedAt && (
                  <p className="text-xs text-muted-foreground">
                    Acted: {new Date(step.actedAt).toLocaleString()}
                  </p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium ring-1 ring-border">
                {step.status}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {/* Action buttons */}
      {canAct && action === null && (
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setAction("approve")} variant="default">
            Approve
          </Button>
          <Button onClick={() => setAction("reject")} variant="destructive">
            Reject
          </Button>
          <Button onClick={() => setAction("delegate")} variant="outline">
            Delegate
          </Button>
          <Button onClick={() => setAction("escalate")} variant="outline">
            Escalate
          </Button>
          <Button onClick={() => setAction("withdraw")} variant="ghost">
            Withdraw
          </Button>
        </div>
      )}

      {/* Action form */}
      {action !== null && (
        <div className="rounded-lg border p-6">
          <h3 className="mb-4 text-base font-semibold capitalize">{action} Approval</h3>

          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {action === "delegate" && (
            <div className="mb-4">
              <Label htmlFor="delegate-to" className="block text-sm font-medium">
                Delegate to (Principal ID) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="delegate-to"
                type="text"
                placeholder="UUID of the delegate"
                value={delegateTo}
                onChange={(e) => setDelegateTo(e.target.value)}
                className="mt-1"
              />
            </div>
          )}

          {action !== "approve" || true ? (
            <div className="mb-4">
              <Label htmlFor="action-comment" className="block text-sm font-medium">
                Comment{action === "reject" ? " *" : " (optional)"}
              </Label>
              <Input
                id="action-comment"
                type="text"
                placeholder={
                  action === "reject" ? "Reason for rejection (required)" : "Optional note"
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-1"
              />
            </div>
          ) : null}

          <div className="flex gap-3">
            <Button
              onClick={() => {
                void handleSubmit();
              }}
              disabled={isSubmitting}
              variant={action === "reject" ? "destructive" : "default"}
            >
              {isSubmitting ? "Submitting..." : `Confirm ${action}`}
            </Button>
            <Button variant="outline" onClick={resetForm} disabled={isSubmitting}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Status history */}
      {history.length > 0 && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-base font-semibold">Status History</h2>
          <ol className="space-y-2">
            {history.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
                  {new Date(entry.occurredAt).toLocaleString()}
                </span>
                <span>
                  {entry.fromStatus ? (
                    <>
                      <span className="font-medium">{entry.fromStatus}</span>
                      {" → "}
                    </>
                  ) : null}
                  <span className="font-semibold">{entry.toStatus}</span>
                  {entry.comment && (
                    <span className="ml-2 text-muted-foreground">
                      &ldquo;{entry.comment}&rdquo;
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
