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
import { SearchX } from "lucide-react";
import { AUTH_CARD_CLASS } from "./_components/auth-card";
import { AuthFooterLinks, FOOTER_ERROR_LINKS } from "./_components/auth-footer-links";
import { AuthHeader } from "./_components/auth-header";

export default function AuthRootNotFound() {
  return (
    <Card className={AUTH_CARD_CLASS}>
      <AuthHeader
        title="Auth Page Not Found"
        description="The authentication page you requested does not exist or was moved."
      />
      <CardContent className="space-y-5">
        <Alert>
          <SearchX className="size-4" />
          <AlertTitle>Route unavailable</AlertTitle>
          <AlertDescription>
            Go to sign in or return home using the buttons below.
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

        <Separator />

        <AuthFooterLinks links={FOOTER_ERROR_LINKS} />
      </CardContent>
    </Card>
  );
}
