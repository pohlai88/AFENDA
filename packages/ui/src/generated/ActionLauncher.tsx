"use client";

/**
 * ActionLauncher — resolves an action from the registry and renders
 * the appropriate trigger (link, button, or modal opener).
 *
 * RULES:
 *   1. Never makes permission decisions — capabilities come as props.
 *   2. Disabled if `actionCaps[actionKey].allowed` is false.
 *   3. Shows denial reason as tooltip when disabled.
 *   4. `actionType` drives rendering: "navigate" → link, "inline" → button, "modal" → button.
 */
import { useMemo } from "react";
import type { CapabilityResult } from "@afenda/contracts";
import { getEntityRegistration } from "../meta/registry";
import { Button, type buttonVariants } from "../components/button";
import type { VariantProps } from "class-variance-authority";

// ── Types ─────────────────────────────────────────────────────────────────────

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>["variant"]>;

export interface ActionLauncherProps {
  /** Entity key from the registry */
  entityKey: string;
  /** Action key to resolve and render */
  actionKey: string;
  /** Resolved capabilities */
  capabilities: CapabilityResult;
  /** Called when the action is triggered */
  onAction?: (actionKey: string, route?: string) => void;
  /** Custom button variant */
  variant?: ButtonVariant;
  /** Custom button size */
  size?: "default" | "sm" | "lg";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ActionLauncher({
  entityKey,
  actionKey,
  capabilities,
  onAction,
  variant = "default",
  size = "default",
}: ActionLauncherProps) {
  const registration = useMemo(
    () => getEntityRegistration(entityKey),
    [entityKey],
  );

  const action = useMemo(() => {
    return registration.actions.find((a) => a.actionKey === actionKey);
  }, [registration, actionKey]);

  if (!action) {
    return null;
  }

  const actionCap = capabilities.actionCaps[actionKey];
  const allowed = actionCap?.allowed ?? false;
  const reason = actionCap?.reason?.message;

  // Navigate actions render as links, not buttons
  if (action.actionType === "navigate" && action.route) {
    return (
      <a
        href={action.route}
        className={!allowed ? "pointer-events-none opacity-50" : undefined}
        title={allowed ? action.label : reason ?? "Not permitted"}
        aria-disabled={!allowed}
        onClick={(e) => {
          e.preventDefault();
          if (allowed) onAction?.(actionKey, action.route);
        }}
      >
        {action.label}
      </a>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      disabled={!allowed}
      title={allowed ? action.label : reason ?? "Not permitted"}
      onClick={() => onAction?.(actionKey, action.route)}
    >
      {action.label}
    </Button>
  );
}
