import { Card, CardContent, Skeleton } from "@afenda/ui";
import { AuthLoadingBrand } from "./_components/auth-loading-brand";

export default function AuthRootLoading() {
  return (
    <Card className="border-border/60 shadow-sm">
      <AuthLoadingBrand />
      <CardContent className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}
