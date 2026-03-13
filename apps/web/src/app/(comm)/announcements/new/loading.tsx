import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@afenda/ui";

export default function NewAnnouncementLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-9 w-64" />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>
            <Skeleton className="h-6 w-44" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
