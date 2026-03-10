"use client";

import { Avatar, AvatarFallback, Badge } from "@afenda/ui";
import type { PortalType } from "@afenda/contracts";
import { getPortal } from "@/platform/portals";

interface EntityCardProps {
  portal: PortalType;
}

export function EntityCard({ portal }: EntityCardProps) {
  const config = getPortal(portal);
  const initial = config.label.charAt(0);
  const label = config.label;

  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center gap-3">
        <Avatar size="lg">
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium leading-none">{label}</span>
          <Badge variant="secondary" className="w-fit text-xs">
            Active
          </Badge>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Select your portal above to sign in with the appropriate context.
      </p>
    </div>
  );
}
