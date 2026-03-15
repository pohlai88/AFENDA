import Link from "next/link";
import { Button } from "@afenda/ui";
import { fetchEmploymentTimeline } from "../../../shared/hrm-client";
import {
  EmploymentTimeline,
  type TimelineItem,
} from "../../../shared/components/employment-timeline";

interface EmploymentTimelineResponse {
  items: TimelineItem[];
}

export default async function EmploymentTimelinePage({
  params,
}: {
  params: Promise<{ employmentId: string }>;
}) {
  const { employmentId } = await params;

  let data: EmploymentTimelineResponse | null = null;
  let error: string | null = null;

  try {
    const res = await fetchEmploymentTimeline(employmentId);
    data = (res as { data: EmploymentTimelineResponse }).data;
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load employment timeline";
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Employment Timeline</h1>
        <p className="mt-2 text-sm text-destructive">
          {error ?? "No lifecycle entries found for this employment record yet."}
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/hr/people/employees">Back to Employees</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Employment Timeline</h1>
          <p className="text-sm text-muted-foreground">
            Chronological lifecycle history for employment state and assignment changes.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/hr/people/employees">Back to Employees</Link>
        </Button>
      </div>

      <EmploymentTimeline items={data.items} employmentId={employmentId} />
    </div>
  );
}
