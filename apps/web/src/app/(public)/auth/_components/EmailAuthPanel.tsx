"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button, Input, Separator, Spinner, toast } from "@afenda/ui";
import { Github } from "lucide-react";

import { GoogleIcon } from "@/components/GoogleIcon";
import { buildPostSignInPath } from "@/lib/auth/redirects";
import { signIn, signOut, signUp, useSession } from "@/lib/auth/client";

import { AuthFeedback, AuthField } from "./AuthFormPrimitives";
import { AuthPanelFrame } from "./AuthPanelFrame";

type EmailAuthPanelProps = {
  mode: "sign-in" | "sign-up";
  nextPath: string;
  initialError?: string;
  isAuthConfigured: boolean;
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return fallback;
}

export function EmailAuthPanel({
  mode,
  nextPath,
  initialError,
  isAuthConfigured,
}: EmailAuthPanelProps) {
  const router = useRouter();
  const postSignInPath = buildPostSignInPath(nextPath);
  const { data: session, isPending: isSessionPending } = useSession();
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();
  const formErrorId = "email-auth-form-error";

  useEffect(() => {
    if (!isSessionPending && session?.user) {
      router.replace(postSignInPath);
    }
  }, [isSessionPending, postSignInPath, router, session?.user]);

  function handleSubmit(formData: FormData) {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!isAuthConfigured) {
      setError("Neon Auth is not configured for this environment.");
      return;
    }

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (mode === "sign-up") {
      if (!name) {
        setError("Full name is required to create an account.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Password confirmation does not match.");
        return;
      }
    }

    setError(null);

    startTransition(async () => {
      if (mode === "sign-in") {
        const response = await signIn.email({
          email,
          password,
          callbackURL: postSignInPath,
        });

        if (response.error) {
          setError(getErrorMessage(response.error, "Unable to sign in."));
          return;
        }

        toast.success("Signed in.");
        router.replace(postSignInPath);
        router.refresh();
        return;
      }

      const response = await signUp.email({
        name,
        email,
        password,
        callbackURL: postSignInPath,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to create your account."));
        return;
      }

      if (response.data?.user && !response.data.user.emailVerified) {
        toast.success("Account created. Check your email to verify your address.");
        router.replace(
          `/auth/verify-email?next=${encodeURIComponent(nextPath)}&email=${encodeURIComponent(email)}`,
        );
        router.refresh();
        return;
      }

      toast.success("Account created.");
      router.replace(postSignInPath);
      router.refresh();
    });
  }

  function handleSocialSignIn(provider: "google" | "github") {
    if (!isAuthConfigured) {
      setError("Neon Auth is not configured for this environment.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const response = await signIn.social({
        provider,
        callbackURL: postSignInPath,
        disableRedirect: true,
      });

      if (response.error) {
        setError(getErrorMessage(response.error, `Unable to continue with ${provider}.`));
        return;
      }

      const url = response.data?.url;
      if (!url) {
        setError(`Unable to start ${provider} sign in.`);
        return;
      }

      window.location.assign(url);
    });
  }

  async function handleSignOut() {
    setError(null);

    startTransition(async () => {
      const response = await signOut();
      if (response.error) {
        setError(getErrorMessage(response.error, "Unable to sign out."));
        return;
      }

      toast.success("Signed out.");
      router.replace("/");
      router.refresh();
    });
  }

  const isSignIn = mode === "sign-in";

  return (
    <AuthPanelFrame
      title={isSignIn ? "Sign in to AFENDA" : "Create your AFENDA account"}
      description={
        isSignIn
          ? "Use your Neon-backed session to access protected operational routes."
          : "Provision a Neon Auth account, then continue into the workspace."
      }
      footer={
        <>
          <span>Destination after auth: {nextPath}</span>
          {session?.user ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void handleSignOut()}
              disabled={isPending}
            >
              Sign out current session
            </Button>
          ) : null}
        </>
      }
    >
      <form
        className="space-y-4"
        aria-busy={isPending || isSessionPending}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(new FormData(event.currentTarget));
        }}
      >
        {isSignIn ? null : (
          <AuthField htmlFor="auth-name" label="Full name">
            <Input
              id="auth-name"
              name="name"
              autoComplete="name"
              placeholder="Aisha Tan"
              autoFocus
              aria-invalid={Boolean(error)}
              aria-describedby={error ? formErrorId : undefined}
            />
          </AuthField>
        )}

        <AuthField htmlFor="auth-email" label="Email">
          <Input
            id="auth-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="operator@afenda.com"
            autoFocus={isSignIn}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? formErrorId : undefined}
            required
          />
        </AuthField>

        <AuthField htmlFor="auth-password" label="Password">
          <Input
            id="auth-password"
            name="password"
            type="password"
            autoComplete={isSignIn ? "current-password" : "new-password"}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? formErrorId : undefined}
            required
          />
        </AuthField>

        {isSignIn ? (
          <div className="flex justify-end">
            <div className="flex items-center gap-3 text-sm">
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                href={`/auth/sign-in-otp?next=${encodeURIComponent(nextPath)}`}
              >
                Sign in with email code
              </Link>
              <span className="text-muted-foreground">|</span>
              <Link
                className="font-medium text-primary underline-offset-4 hover:underline"
                href={`/auth/forgot-password?next=${encodeURIComponent(nextPath)}`}
              >
                Forgot password?
              </Link>
            </div>
          </div>
        ) : null}

        {isSignIn ? null : (
          <AuthField htmlFor="auth-confirm-password" label="Confirm password">
            <Input
              id="auth-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? formErrorId : undefined}
              required
            />
          </AuthField>
        )}

        {error ? (
          <AuthFeedback id={formErrorId} tone="error" role="alert" ariaLive="assertive">
            {error}
          </AuthFeedback>
        ) : null}

        <Button
          className="w-full"
          type="submit"
          disabled={isPending || isSessionPending || !isAuthConfigured}
        >
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              {isSignIn ? "Signing in..." : "Creating account..."}
            </span>
          ) : isSignIn ? (
            "Sign in"
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {isSignIn ? "Or continue with" : "Or create your account with"}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialSignIn("google")}
            disabled={isPending || isSessionPending || !isAuthConfigured}
          >
            <GoogleIcon className="size-4" />
            Continue with Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialSignIn("github")}
            disabled={isPending || isSessionPending || !isAuthConfigured}
          >
            <Github className="size-4" />
            Continue with GitHub
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>{isSignIn ? "Need an account?" : "Already have an account?"}</p>
        <Link
          className="font-medium text-primary underline-offset-4 hover:underline"
          href={
            isSignIn
              ? `/auth/sign-up?next=${encodeURIComponent(nextPath)}`
              : `/auth/sign-in?next=${encodeURIComponent(nextPath)}`
          }
        >
          {isSignIn ? "Create one" : "Sign in"}
        </Link>
      </div>
    </AuthPanelFrame>
  );
}
