import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@afenda/ui";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const message = params.error || "Authentication failed";

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>Sign in error</CardTitle>
        <CardDescription>We could not complete your authentication request.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Authentication failed</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Button asChild className="w-full">
            <Link href="/auth/signin">Try again</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
