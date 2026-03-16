"use client";

import type { ReactNode, RefObject } from "react";
import { usePathname } from "next/navigation";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@afenda/ui";

import { AfendaMark } from "@/app/(public)/(marketing)/AfendaMark";

type AuthPanelFrameProps = {
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  titleRef?: RefObject<HTMLDivElement | null>;
  contentClassName?: string;
};

export function AuthPanelFrame({
  title,
  description,
  children,
  footer,
  titleRef,
  contentClassName = "space-y-5",
}: AuthPanelFrameProps) {
  const pathname = usePathname();

  const laneTone =
    pathname?.includes("/verify-email") ||
    pathname?.includes("/reset-password") ||
    pathname?.includes("/forgot-password")
      ? "premium"
      : pathname?.includes("/sign-out")
        ? "neutral"
        : "interactive";

  return (
    <Card className={`auth-card-surface auth-card-surface--${laneTone} border`}>
      <CardHeader>
        <AfendaMark size={20} variant="static" className="auth-card-mark" />
        <CardTitle ref={titleRef}>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
      {footer ? <CardFooter className="auth-card-footer">{footer}</CardFooter> : null}
    </Card>
  );
}
