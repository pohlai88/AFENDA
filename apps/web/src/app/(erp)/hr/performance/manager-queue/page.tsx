import Link from "next/link";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

export default async function ManagerReviewQueuePage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Manager Review Queue</h1>
          <p className="text-sm text-muted-foreground">
            Performance reviews pending your feedback.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr/performance/review-cycles">Review Cycles</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/hr">Back to HR</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Reviews</CardTitle>
          <CardDescription>
            Use the API with reviewerEmploymentId to list reviews assigned to you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The manager review queue requires your employment ID. Integrate with your
            session/context to show reviews assigned to the current manager.
          </p>
          <div className="mt-4 flex gap-2">
            <Badge variant="outline">GET /v1/hrm/performance/reviews/manager-queue</Badge>
            <Badge variant="outline">?reviewerEmploymentId=...</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
