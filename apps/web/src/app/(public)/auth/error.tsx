"use client";

import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from "@afenda/ui";
import { ShieldX } from "lucide-react";

export default function AuthErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Authentication Error</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <ShieldX />
          <AlertTitle>Sign-in flow interrupted</AlertTitle>
          <AlertDescription>
            {error.message || "An authentication error occurred."}
          </AlertDescription>
        </Alert>

        {error.digest ? <p className="text-xs text-muted-foreground">Error ID: {error.digest}</p> : null}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={reset}>
            Try again
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/auth/signin">Back to sign in</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
