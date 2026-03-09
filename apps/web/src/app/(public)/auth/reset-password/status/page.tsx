import Link from "next/link";
import { Alert, AlertDescription, AlertTitle, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";

const STATUS_MAP = {
  instructionsSent: {
    title: "Reset Instructions Sent",
    description: "If an account exists for that email, reset instructions have been sent.",
    alertTitle: "Check your inbox",
    alertDescription: "Your email may contain either a reset link or a 6-digit code.",
  },
  linkSent: {
    title: "Reset Link Sent",
    description: "If an account exists for that email, a reset link has been sent.",
    alertTitle: "Check your inbox",
    alertDescription: "Use the link in your email to continue resetting your password.",
  },
  codeSent: {
    title: "Reset Code Sent",
    description: "If an account exists for that email, a 6-digit reset code has been sent.",
    alertTitle: "Check your inbox",
    alertDescription: "Enter the 6-digit code on the reset page, then set your new password.",
  },
  passwordUpdated: {
    title: "Password Updated",
    description: "Your password was reset successfully.",
    alertTitle: "You can sign in now",
    alertDescription: "Return to sign in and use your new password.",
  },
  invalidToken: {
    title: "Invalid Reset Token",
    description: "The token is invalid or has expired.",
    alertTitle: "Request a new reset link",
    alertDescription: "Go back and submit your email again to receive a new token.",
  },
} as const;

type StatusKey = keyof typeof STATUS_MAP;

export default async function ResetPasswordStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const state = (params.state ?? "linkSent") as StatusKey;
  const content = STATUS_MAP[state] ?? STATUS_MAP.linkSent;

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <CardTitle>{content.title}</CardTitle>
        <CardDescription>{content.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTitle>{content.alertTitle}</AlertTitle>
          <AlertDescription>{content.alertDescription}</AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button asChild className="w-full">
            <Link href="/auth/signin">Go to sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/reset-password">Back to reset form</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
