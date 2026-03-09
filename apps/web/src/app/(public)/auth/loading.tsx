import { Card, CardContent, CardHeader, Skeleton } from "@afenda/ui";

export default function AuthRootLoading() {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
