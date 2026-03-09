"use client";

/**
 * FlowStepper — visualises the entity's workflow state machine.
 *
 * Reads the FlowDef from the registry and renders:
 *   - A horizontal step indicator with the current status highlighted
 *   - Available transitions as action buttons, gated by capabilities
 *   - Disabled transitions show denial reason as a tooltip
 *
 * RULES:
 *   1. Never makes permission decisions — capabilities come as props.
 *   2. Transition buttons gated by `actionCaps[transitionAction].allowed`.
 *   3. Uses DS tokens only.
 */
import { useMemo } from "react";
import type { CapabilityResult } from "@afenda/contracts";
import { getEntityRegistration } from "../meta/registry";
import { Button } from "../components/button";
import { Badge } from "../components/badge";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FlowStepperProps {
  /** Entity key from the registry */
  entityKey: string;
  /** Current status of the record */
  currentStatus: string;
  /** Resolved capabilities for the current principal */
  capabilities: CapabilityResult;
  /** Called when user triggers a flow transition */
  onTransition?: (actionKey: string, targetStatus: string) => void;
}

// ── Status step variant mapping ──────────────────────────────────────────────

type StepVariant = "completed" | "active" | "upcoming" | "terminal";

function getStepClasses(variant: StepVariant): string {
  switch (variant) {
    case "completed":
      return "bg-success text-success-foreground border-success/30";
    case "active":
      return "bg-primary text-primary-foreground border-primary ring-2 ring-primary/20";
    case "terminal":
      return "bg-muted text-muted-foreground border-border";
    case "upcoming":
      return "bg-background text-muted-foreground border-border";
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FlowStepper({
  entityKey,
  currentStatus,
  capabilities,
  onTransition,
}: FlowStepperProps) {
  const registration = useMemo(
    () => getEntityRegistration(entityKey),
    [entityKey],
  );

  const flow = registration.flowDef;
  if (!flow) {
    return null;
  }

  // Build the ordered "happy path" for step display: take states in declaration order
  const states = flow.states;

  // Find the index of the current status
  const currentIdx = states.findIndex((s) => s.stateKey === currentStatus);

  // Find available transitions from the current status
  const availableTransitions = useMemo(() => {
    if (!flow) return [];
    return flow.transitions.filter((t) => t.from === currentStatus);
  }, [flow, currentStatus]);

  // Determine step variant for each state
  function getVariant(stateKey: string, idx: number): StepVariant {
    if (stateKey === currentStatus) return "active";
    const state = states.find((s) => s.stateKey === stateKey);
    if (state?.terminal) return "terminal";
    if (currentIdx >= 0 && idx < currentIdx) return "completed";
    return "upcoming";
  }

  return (
    <div className="space-y-4">
      {/* Step indicators */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {states.map((state, idx) => {
          const variant = getVariant(state.stateKey, idx);
          return (
            <div key={state.stateKey} className="flex items-center gap-2">
              {idx > 0 && (
                <div
                  className={[
                    "h-px w-6 flex-shrink-0",
                    variant === "completed" || variant === "active"
                      ? "bg-primary"
                      : "bg-border",
                  ].join(" ")}
                />
              )}
              <div
                className={[
                  "flex-shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  getStepClasses(variant),
                ].join(" ")}
                aria-current={variant === "active" ? "step" : undefined}
              >
                {state.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Available transitions */}
      {availableTransitions.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Actions:</span>
          {availableTransitions.map((transition) => {
            const actionCap = capabilities.actionCaps[transition.actionKey];
            const allowed = actionCap?.allowed ?? false;
            const reason = actionCap?.reason?.message;

            return (
              <Button
                key={`${transition.from}-${transition.to}`}
                variant={
                  transition.to === "rejected" || transition.to === "voided"
                    ? "destructive"
                    : "outline"
                }
                size="sm"
                disabled={!allowed}
                title={allowed ? transition.label : reason ?? "Not permitted"}
                onClick={() => onTransition?.(transition.actionKey, transition.to)}
              >
                {transition.label}
                {transition.evidenceRequired && (
                  <Badge variant="outline" className="ml-1 text-[10px]">
                    Evidence
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      )}

      {/* Terminal state indicator */}
      {states.find((s) => s.stateKey === currentStatus)?.terminal && (
        <p className="text-xs text-muted-foreground italic">
          This record is in a terminal state and cannot be transitioned further.
        </p>
      )}
    </div>
  );
}
