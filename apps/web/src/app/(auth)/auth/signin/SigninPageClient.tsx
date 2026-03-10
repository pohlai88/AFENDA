"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { PortalType } from "@afenda/contracts";
import { useIsMobile } from "@/hooks/use-mobile";
import { AuthSplitLayout } from "../_components/auth-split-layout";
import { PortalSwitcher } from "../_components/portal-switcher";
import { EntityCard } from "../_components/entity-card";
import { CompliancePanel } from "../_components/compliance-panel";
import { SigninForm } from "./signin-form";
import { getPortalDefaultCallbackUrl } from "@/platform/portals";

interface SigninPageClientProps {
  initialPortal: PortalType;
  callbackUrl: string;
  error?: string;
}

export function SigninPageClient({
  initialPortal,
  callbackUrl,
  error,
}: SigninPageClientProps) {
  const [portal, setPortal] = useState<PortalType>(initialPortal);
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    setPortal(initialPortal);
  }, [initialPortal]);

  const handlePortalSelect = useCallback(
    (newPortal: PortalType) => {
      setPortal(newPortal);
      const effectiveCallback =
        callbackUrl || getPortalDefaultCallbackUrl(newPortal) || "/";
      const params = new URLSearchParams();
      params.set("tab", newPortal);
      params.set("callbackUrl", effectiveCallback);
      if (error) params.set("error", error);
      router.replace(`/auth/signin?${params.toString()}`);
    },
    [callbackUrl, error, router],
  );

  const leftPanel = (
    <div className="flex flex-col form-gap">
      <h2 className="text-sm font-medium text-muted-foreground">Sign in to</h2>
      <PortalSwitcher
        value={portal}
        mobile={isMobile}
        onSelect={handlePortalSelect}
      />
      <EntityCard portal={portal} />
      <CompliancePanel />
    </div>
  );

  const rightPanel = (
    <SigninForm
      callbackUrl={callbackUrl}
      error={error}
      portal={portal}
    />
  );

  return (
    <AuthSplitLayout
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      portal={portal}
    />
  );
}
