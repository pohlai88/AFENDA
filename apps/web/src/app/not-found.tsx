import Link from "next/link";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The page you requested does not exist or may have moved.
          </p>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/">Go to dashboard</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/finance/ap/invoices">Open AP invoices</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
