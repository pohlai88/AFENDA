"use client";

import { Badge } from "@afenda/ui";

export interface PositionChipProps {
  positionCode: string;
  positionTitle: string;
  status?: string;
  headcount?: string;
  className?: string;
}

export function PositionChip({
  positionCode,
  positionTitle,
  status,
  headcount,
  className,
}: PositionChipProps) {
  const label = positionTitle || positionCode;
  const sub = [status, headcount].filter(Boolean).join(" · ");

  return (
    <Badge variant="secondary" className={className} title={sub || positionCode}>
      {label}
    </Badge>
  );
}
