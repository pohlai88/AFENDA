"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@afenda/ui";
import { signUpPublic } from "@/lib/public-auth";

interface SignupFormProps {
  callbackUrl?: string;
}

export function SignupForm({ callbackUrl = "/" }: SignupFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setErrorMsg("Passwords don't match");
      setIsLoading(false);
      return;
    }

    try {
      await signUpPublic({
        idempotencyKey: crypto.randomUUID(),
        fullName: (formData.get("name") as string) ?? "",
        companyName: (formData.get("companyName") as string) ?? "",
        email: (formData.get("email") as string) ?? "",
        password,
      });

      // Auto sign-in after successful signup
      await signIn("credentials", {
        email: formData.get("email"),
        password,
        callbackUrl,
        redirect: true,
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create account");
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Create account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="John Doe"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company name</Label>
            <Input
              id="companyName"
              name="companyName"
              type="text"
              placeholder="Acme Inc"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              required
              disabled={isLoading}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Sign up"}
          </Button>

          <div className="text-center text-sm">
            <a href="/auth/signin" className="text-muted-foreground hover:underline">
              Already have an account? Sign in
            </a>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
