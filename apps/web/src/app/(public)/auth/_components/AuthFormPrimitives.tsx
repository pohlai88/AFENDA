"use client";

import type { ReactNode } from "react";

import { Label } from "@afenda/ui";

type AuthFieldProps = {
  htmlFor: string;
  label: string;
  children: ReactNode;
};

export function AuthField({ htmlFor, label, children }: AuthFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

type AuthFeedbackTone = "error" | "success" | "info" | "warning";

type AuthFeedbackProps = {
  id?: string;
  tone: AuthFeedbackTone;
  children: ReactNode;
  role?: "alert" | "status";
  ariaLive?: "assertive" | "polite";
};

export function AuthFeedback({ id, tone, children, role, ariaLive }: AuthFeedbackProps) {
  return (
    <div id={id} className={`auth-feedback-${tone}`} role={role} aria-live={ariaLive}>
      {children}
    </div>
  );
}
