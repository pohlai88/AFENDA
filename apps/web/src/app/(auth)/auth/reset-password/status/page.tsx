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
import { AUTH_CARD_CLASS } from "../../_components/auth-card";
import { AuthFooterLinks, FOOTER_RESET_LINKS } from "../../_components/auth-footer-links";
import { AuthHeader } from "../../_components/auth-header";

const STATUS_MAP = {
  instructionsSent: {
    title: "Reset instructions sent",
    description: "If an account exists for that email, reset instructions have been sent.",
    alertTitle: "Check your inbox",
    alertDescription: "Your email may contain either a reset link or a 6-digit code.",
  },
  linkSent: {
    title: "Reset link sent",
    description: "If an account exists for that email, a reset link has been sent.",
    alertTitle: "Check your inbox",
    alertDescription: "Use the link in your email to continue resetting your password.",
  },
  codeSent: {
    title: "Reset code sent",
    description: "If an account exists for that email, a 6-digit reset code has been sent.",
    alertTitle: "Check your inbox",
    alertDescription: "Enter the 6-digit code on the reset page, then set your new password.",
  },
  passwordUpdated: {
    title: "Password updated",
    description: "Your password was reset successfully.",
    alertTitle: "You can sign in now",
    alertDescription: "Return to sign in and use your new password.",
  },
  invalidToken: {
    title: "Invalid reset token",
    description: "The token is invalid or has expired.",
    alertTitle: "Request a new reset link",
    alertDescription: "Go back and submit your email again to receive a new token.",
  },
} as const;

type StatusKey = keyof typeof STATUS_MAP;
const DEFAULT_STATE: StatusKey = "linkSent";

function getStatusContent(state: string | undefined) {
  return state != null && state in STATUS_MAP
    ? STATUS_MAP[state as StatusKey]
    : STATUS_MAP[DEFAULT_STATE];
}

export default async function ResetPasswordStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const content = getStatusContent(params.state);

  return (
    <Card className={AUTH_CARD_CLASS}>
      <AuthHeader title={content.title} description={content.description} />
      <CardContent className="space-y-5">
        <Alert>
          <AlertTitle>{content.alertTitle}</AlertTitle>
          <AlertDescription>{content.alertDescription}</AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/auth/signin">Go to sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/auth/reset-password">Back to reset form</Link>
          </Button>
        </div>

        <Separator />

        <AuthFooterLinks links={FOOTER_RESET_LINKS} />
      </CardContent>
    </Card>
  );
}
