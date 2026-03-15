"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { EmployeeStatusBadge } from "./employee-status-badge";

export interface TimelineItem {
  kind: "employment" | "status" | "assignment";
  occurredAt: string;
  title: string;
  status: string | null;
  reasonCode: string | null;
  effectiveTo?: string | null;
}

export interface EmploymentTimelineProps {
  items: TimelineItem[];
  employmentId: string;
  className?: string;
}

export function EmploymentTimeline({ items, employmentId, className }: EmploymentTimelineProps) {
  if (items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Employment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No timeline events for this employment record.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Employment Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-4 border-l-2 border-muted pl-4">
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.title}</span>
                  {item.status && <EmployeeStatusBadge status={item.status} />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {item.occurredAt}
                  {item.effectiveTo ? ` → ${item.effectiveTo}` : " (current)"}
                </p>
                {item.reasonCode && (
                  <p className="text-sm text-muted-foreground">Reason: {item.reasonCode}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
