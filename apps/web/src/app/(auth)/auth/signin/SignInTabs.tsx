"use client";

import { useState, useCallback } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Separator,
} from "@afenda/ui";
import { GoogleIcon } from "@afenda/ui";
import { ErrorAlert } from "@/components/ErrorAlert";
import { AuthHeader } from "../_components/auth-header";
import { AuthFooterLinks } from "../_components/auth-footer-links";
import { PasswordField } from "../_components/password-field";
import { getAuthErrorMessage } from "@afenda/contracts";
import { ROLES, ROLE_MAP, type RoleValue } from "../_config/signin-roles";
import { ShieldCheck } from "lucide-react";

interface SignInTabsProps {
  /** Where to redirect after a successful sign-in. Defaults to "/". */
  callbackUrl?: string;
  /** NextAuth error code passed via URL query param on redirect-back. */
  error?: string;
  /** Which role pill to pre-select. Useful for deep-links like ?role=supplier. */
  defaultTab?: RoleValue;
}

export function SignInTabs({ callbackUrl = "/", error, defaultTab = "personal" }: SignInTabsProps) {
  const [activeRole, setActiveRole] = useState<RoleValue>(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  const role = ROLE_MAP[activeRole];

  const resolvedError = submitError ?? error;
  const errorMessage = getAuthErrorMessage(resolvedError);

  const handleRoleChange = useCallback((value: RoleValue) => {
    setActiveRole(value);
    setEmail("");
    setPassword("");
    setSubmitError(null);
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) return;
    setIsLoading(true);
    setSubmitError(null);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        portal: role.portal,
        callbackUrl,
        redirect: false,
      });

      if (!result) { setSubmitError("Default"); return; }
      if (result.error) { setSubmitError(result.error); return; }
      if (!result.ok) { setSubmitError("Default"); return; }
      if (result.url?.includes("/auth/error")) {
        const maybeError = new URL(result.url, window.location.origin).searchParams.get("error");
        setSubmitError(maybeError || "Default");
        return;
      }
      router.push(result.url ?? callbackUrl);
    } finally {
      setIsLoading(false);
    }
  }

  async function onGoogleSignIn() {
    setIsGoogleLoading(true);
    setSubmitError(null);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setSubmitError("Default");
      setIsGoogleLoading(false);
    }
  }

  return (
    <Card className="border-border/50 shadow-xl bg-card">
      <AuthHeader title="Welcome back" />
      <CardContent className="space-y-5">

        {/* ── Role selector — scroll horizontally to show all portals ── */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Sign in as
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ROLES.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                variant={activeRole === value ? "default" : "outline"}
                size="sm"
                className="flex-none gap-1.5 rounded-full"
                onClick={() => handleRoleChange(value)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{role.description}</p>
        </div>

        <Separator />

        {/* ── Credentials form ── */}
        <form onSubmit={onSubmit} className="space-y-4" aria-busy={isLoading}>
          <div className="space-y-2">
            <Label htmlFor="email">{role.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <PasswordField
            id="password"
            value={password}
            onChange={setPassword}
            showStrength={false}
          />

          <ErrorAlert error={errorMessage} title="Sign in failed" />

          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
            {isLoading ? (
              <>
                <ShieldCheck className="mr-2 h-4 w-4 animate-pulse" />
                Signing in...
              </>
            ) : (
              role.submitLabel
            )}
          </Button>
        </form>

        {/* ── Google SSO (only for roles that support it) ── */}
        {role.showGoogle && (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={isGoogleLoading || isLoading}
              onClick={onGoogleSignIn}
            >
              {isGoogleLoading ? (
                "Connecting to Google..."
              ) : (
                <>
                  <GoogleIcon className="mr-2 h-4 w-4" />
                  Sign in with Google
                </>
              )}
            </Button>
          </>
        )}

        <Separator />

        <AuthFooterLinks links={role.footerLinks} />
      </CardContent>
    </Card>
  );
}
