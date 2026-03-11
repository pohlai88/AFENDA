import { Github } from "lucide-react";
import { Button, Separator } from "@afenda/ui";

import {
  signInWithGitHubAction,
  signInWithGoogleAction,
} from "../_actions/oauth";
import { AuthHiddenField } from "./auth-hidden-field";

/** Google brand logo — lucide does not include brand icons */
function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-hidden
      viewBox="0 0 24 24"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
        fill="currentColor"
      />
    </svg>
  );
}

interface AuthOAuthButtonsProps {
  callbackUrl?: string;
}

export function AuthOAuthButtons({ callbackUrl }: AuthOAuthButtonsProps) {
  const safeCallbackUrl = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/app";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <Separator className="h-px bg-border/80" />
        <span className="shrink-0 text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
          Or continue with
        </span>
        <Separator className="h-px bg-border/80" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <form action={signInWithGoogleAction}>
          <AuthHiddenField name="callbackUrl" value={safeCallbackUrl} />
          <Button type="submit" variant="outline" className="w-full gap-2">
            <GoogleIcon className="h-4 w-4" />
            Google
          </Button>
        </form>

        <form action={signInWithGitHubAction}>
          <AuthHiddenField name="callbackUrl" value={safeCallbackUrl} />
          <Button type="submit" variant="outline" className="w-full gap-2">
            <Github className="h-4 w-4" aria-hidden />
            GitHub
          </Button>
        </form>
      </div>
    </div>
  );
}
