"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@afenda/ui";
import { sendVerificationEmailAction } from "@/app/auth/_actions/send-verification-email";
import { Mail } from "lucide-react";

/**
 * Send verification email (Neon Auth) — Security settings.
 */
export function SendVerificationEmailClient() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSend() {
    setStatus("loading");
    setMessage(null);
    const result = await sendVerificationEmailAction("/app");
    if (result.ok) {
      setStatus("success");
      setMessage(result.message);
    } else {
      setStatus("error");
      setMessage(result.error);
    }
  }

  return (
    <section>
      <h2 className="mb-0.5 text-sm font-semibold text-foreground">
        Email verification
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Send a verification link to your account email. Use this if you need to verify or re-verify your address.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Send verification email
          </CardTitle>
          <CardDescription className="text-xs">
            We will send a link to your registered email. Click the link to verify.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {message && (
            <p
              className={`text-sm ${status === "success" ? "text-green-600 dark:text-green-400" : "text-destructive"}`}
            >
              {message}
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSend}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Sending…" : "Send verification email"}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
