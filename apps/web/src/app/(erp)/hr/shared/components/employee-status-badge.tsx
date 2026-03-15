"use client";

import { Badge } from "@afenda/ui";

export interface EmployeeStatusBadgeProps {
  status: string;
  workerType?: string;
  className?: string;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  active: "default",
  employed: "default",
  terminated: "destructive",
  resigned: "destructive",
  on_leave: "secondary",
  probation: "outline",
  suspended: "secondary",
};

export function EmployeeStatusBadge({ status, workerType, className }: EmployeeStatusBadgeProps) {
  const variant = STATUS_VARIANTS[status?.toLowerCase()] ?? "outline";
  const label = workerType ? `${status} · ${workerType}` : status;

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
