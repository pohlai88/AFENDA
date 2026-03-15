"use client";

import { Badge } from "@afenda/ui";

export interface OrgUnitBadgeProps {
  code: string;
  name: string;
  status?: string;
  className?: string;
}

export function OrgUnitBadge({ code, name, status, className }: OrgUnitBadgeProps) {
  const label = name || code;
  const sub = status ? ` (${status})` : "";

  return (
    <Badge variant="outline" className={className} title={`${code}${sub}`}>
      {label}
    </Badge>
  );
}
