import Link from "next/link";
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardHeader, CardTitle } from "@afenda/ui";
import { SearchX } from "lucide-react";

export default function AuthRootNotFound() {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Auth Page Not Found</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <SearchX />
          <AlertTitle>Route unavailable</AlertTitle>
          <AlertDescription>
            The authentication page you requested does not exist or was moved.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/auth/signin">Go to sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
