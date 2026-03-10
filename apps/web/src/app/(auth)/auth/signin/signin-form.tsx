"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import type { PortalType } from "@afenda/contracts";
import { Button, Input, Label } from "@afenda/ui";
import { AuthFooterLinks, FOOTER_SIGNIN_LINKS } from "../_components/auth-footer-links";

interface SigninFormProps {
  callbackUrl?: string;
  error?: string;
  portal?: PortalType;
}

export function SigninForm({ callbackUrl = "/", error, portal = "app" }: SigninFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(error || "");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      callbackUrl,
      redirect: false,
      portal,
    });

    if (result?.error) {
      setErrorMsg("Invalid email or password");
      setIsLoading(false);
    } else if (result?.ok) {
      window.location.href = callbackUrl;
    }
  }

  return (
    <section className="w-full">
      <h1 className="text-2xl font-semibold text-center mb-4">Sign in</h1>
      <form onSubmit={handleSubmit} className="flex flex-col form-gap">
        {errorMsg && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        <div className="flex flex-col form-gap">
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

        <div className="flex flex-col form-gap">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>

        <AuthFooterLinks links={FOOTER_SIGNIN_LINKS} />
      </form>
    </section>
  );
}
