import { Card, CardContent, Skeleton } from "@afenda/ui";
import { AUTH_CARD_CLASS } from "./_components/auth-card";
import { AuthLoadingBrand } from "./_components/auth-loading-brand";

export default function AuthRootLoading() {
  return (
    <Card className={AUTH_CARD_CLASS}>
      <AuthLoadingBrand />
      <CardContent className="space-y-4 p-6 sm:p-8">
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-10 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}
