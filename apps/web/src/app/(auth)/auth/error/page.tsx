import Link from "next/link";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  Separator,
} from "@afenda/ui";
import { AUTH_CARD_CLASS } from "../_components/auth-card";
import { AuthFooterLinks, FOOTER_ERROR_LINKS } from "../_components/auth-footer-links";
import { AuthHeader } from "../_components/auth-header";

const DEFAULT_MESSAGE = "Authentication failed";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const message = params.error ?? DEFAULT_MESSAGE;

  return (
    <Card className={AUTH_CARD_CLASS}>
      <AuthHeader
        title="Sign in error"
        description="We could not complete your authentication request."
      />
      <CardContent className="space-y-5">
        <Alert variant="destructive">
          <AlertTitle>Authentication failed</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/auth/signin">Try again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>

        <Separator />

        <AuthFooterLinks links={FOOTER_ERROR_LINKS} />
      </CardContent>
    </Card>
  );
}
