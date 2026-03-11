import type { ReactNode } from "react";
import type { PortalType } from "@afenda/contracts";
import { AuthExperienceAside } from "./auth-experience-aside";
import { AuthSplitShell } from "./auth-split-shell";

export type AuthJourney = "signin" | "signup";

interface AuthPageShellProps {
  children: ReactNode;
  portal?: PortalType;
  journey?: AuthJourney;
  aside?: ReactNode;
}

export function AuthPageShell({
  children,
  portal = "app",
  journey = "signin",
  aside,
}: AuthPageShellProps) {
  return (
    <AuthSplitShell
      aside={aside ?? <AuthExperienceAside portal={portal} journey={journey} />}
    >
      {children}
    </AuthSplitShell>
  );
}