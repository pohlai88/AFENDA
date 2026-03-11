"use client";

import { Check } from "lucide-react";
import { CommandGroup, CommandItem, cn } from "@afenda/ui";
import type { PortalType } from "@afenda/contracts";
import { PORTAL_GROUP_LABELS, getPortalsByGroup } from "../_lib/portal-registry";

const PORTAL_GROUP_ORDER = ["app", "portals", "internal"] as const;
type PortalGroup = (typeof PORTAL_GROUP_ORDER)[number];

interface PortalSwitcherListProps {
  value?: PortalType;
  showShortcuts?: boolean;
  onSelect: (portal: PortalType) => void;
}

export function PortalSwitcherList({
  value,
  showShortcuts = true,
  onSelect,
}: PortalSwitcherListProps) {
  return (
    <>
      {PORTAL_GROUP_ORDER.map((group: PortalGroup) => {
        const portals = getPortalsByGroup(group).filter(
          (portal) => portal.visibleInSwitcher !== false
        );

        if (portals.length === 0) return null;

        return (
          <CommandGroup
            key={group}
            heading={PORTAL_GROUP_LABELS[group]}
            className="px-1 py-2 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-muted-foreground"
          >
            {portals.map((portal) => {
              const Icon = portal.icon;
              const selected = value === portal.value;

              return (
                <CommandItem
                  key={portal.value}
                  value={`${portal.label} ${portal.value} ${group}`}
                  onSelect={() => onSelect(portal.value)}
                  aria-selected={selected}
                  className="gap-3 rounded-lg px-3 py-3"
                >
                  <Icon
                    className="h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />

                  <span className="min-w-0 flex-1 truncate">{portal.label}</span>

                  {showShortcuts ? (
                    <span
                      className={cn(
                        "shrink-0 text-xs text-muted-foreground",
                        !portal.shortcut && "invisible"
                      )}
                    >
                      {portal.shortcut ?? "—"}
                    </span>
                  ) : null}

                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0 transition-opacity",
                      selected ? "opacity-100" : "opacity-0"
                    )}
                    aria-hidden="true"
                  />
                </CommandItem>
              );
            })}
          </CommandGroup>
        );
      })}
    </>
  );
}