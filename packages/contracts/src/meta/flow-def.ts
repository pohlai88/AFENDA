/**
 * FlowDef — state machine definition for entity lifecycle.
 *
 * RULES:
 *   1. Transport shape only — no React, no Tailwind, no icon imports.
 *   2. States use the same string values as the entity's status enum
 *      (e.g. `InvoiceStatusValues`).
 *   3. Transition `guard.permission` must reference a valid `Permissions.*`
 *      key from `@afenda/contracts/iam`. CI gate validates this.
 *   4. `evidenceRequired` means the transition cannot proceed without
 *      an attached evidence record.
 */
import { z } from "zod";

export const FlowStateSchema = z.object({
  stateKey: z.string().min(1).max(64),
  label: z.string().min(1).max(128),
  /** Terminal states cannot be transitioned out of */
  terminal: z.boolean().default(false),
});

export type FlowState = z.infer<typeof FlowStateSchema>;

/** Input type — `terminal` is optional (defaults to false). */
export type FlowStateInput = z.input<typeof FlowStateSchema>;

export const FlowTransitionSchema = z.object({
  /** Source state key */
  from: z.string().min(1).max(64),
  /** Target state key */
  to: z.string().min(1).max(64),
  /** Human label: `"Approve"`, `"Reject"` */
  label: z.string().min(1).max(128),
  /** Action key for capability lookup */
  actionKey: z.string().min(1).max(128),
  guard: z
    .object({
      /** Permission required (dot-notation from Permissions map) */
      permission: z.string().min(1).max(128),
    })
    .optional(),
  /** Whether evidence must be attached before transition */
  evidenceRequired: z.boolean().default(false),
});

export type FlowTransition = z.infer<typeof FlowTransitionSchema>;

/** Input type — `evidenceRequired` is optional (defaults to false). */
export type FlowTransitionInput = z.input<typeof FlowTransitionSchema>;

export const FlowDefSchema = z.object({
  /** Entity key this flow belongs to */
  entityKey: z.string().min(1).max(128),
  states: z.array(FlowStateSchema).min(1),
  transitions: z.array(FlowTransitionSchema),
});

export type FlowDef = z.infer<typeof FlowDefSchema>;

/** Input type — nested states/transitions accept optional defaulted fields. */
export type FlowDefInput = z.input<typeof FlowDefSchema>;
