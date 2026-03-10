"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus, Settings } from "lucide-react";

import { cn } from "@afenda/ui";
import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  Dialog,
  DialogContent,
  DialogTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@afenda/ui";

import type { PortalType } from "@afenda/contracts";
import {
  PORTAL_GROUP_LABELS,
  getPortal,
  getPortalsByGroup,
  buildPortalSignInRedirect,
  type PortalGroup,
} from "@/platform/portals";

const PORTAL_GROUP_ORDER = ["app", "portals", "internal"] as const;

interface PortalSwitcherProps {
  /** Current portal value. Alias: portal (for backward compat) */
  value?: PortalType;
  portal?: PortalType;
  className?: string;
  mobile?: boolean;
  showShortcuts?: boolean;
  /** When provided, called on select instead of navigating. Used on signin page to change tab. */
  onSelect?: (portal: PortalType) => void;
  /** @deprecated Use onSelect */
  onPortalChange?: (portal: PortalType) => void;
}

function PortalSwitcherList({
  value,
  onSelect,
  showShortcuts = true,
}: {
  value?: PortalType;
  onSelect: (portal: PortalType) => void;
  showShortcuts?: boolean;
}) {
  return (
    <Command>
      <CommandInput placeholder="Search portal..." />
      <CommandList>
        <CommandEmpty>No portal found.</CommandEmpty>

        {PORTAL_GROUP_ORDER.map((group) => {
          const portals = getPortalsByGroup(group).filter(
            (p) => p.visibleInSwitcher !== false,
          );

          if (!portals.length) return null;

          return (
            <CommandGroup key={group} heading={PORTAL_GROUP_LABELS[group]}>
              {portals.map((portal) => {
                const Icon = portal.icon;
                const selected = value === portal.value;

                return (
                  <CommandItem
                    key={portal.value}
                    value={`${portal.label} ${portal.value} ${group}`}
                    onSelect={() => onSelect(portal.value)}
                    className="gap-2"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                    <span className="truncate">{portal.label}</span>

                    {showShortcuts && portal.shortcut ? (
                      <span className="ml-auto text-xs text-muted-foreground">
                        {portal.shortcut}
                      </span>
                    ) : null}

                    <Check
                      className={cn(
                        "ml-2 h-4 w-4",
                        selected ? "opacity-100" : "opacity-0",
                      )}
                      aria-hidden
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          );
        })}

        <CommandGroup>
          <CommandItem asChild>
            <Link
              href="/auth/signup"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Plus className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>Add account</span>
            </Link>
          </CommandItem>
          <CommandItem asChild>
            <Link
              href="/governance/settings"
              className="flex items-center gap-2 cursor-pointer"
            >
              <Settings className="h-4 w-4 text-muted-foreground" aria-hidden />
              <span>Manage organization</span>
            </Link>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  );
}

export function PortalSwitcher({
  value: valueProp,
  portal: portalProp,
  className,
  mobile = false,
  showShortcuts = true,
  onSelect,
  onPortalChange,
}: PortalSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const value = valueProp ?? portalProp ?? "app";
  const currentPortal = getPortal(value);
  const CurrentIcon = currentPortal.icon;

  const handleSelect = React.useCallback(
    (portal: PortalType) => {
      setOpen(false);

      const handler = onSelect ?? onPortalChange;
      if (handler) {
        handler(portal);
        return;
      }

      router.push(buildPortalSignInRedirect(portal));
    },
    [onSelect, onPortalChange, router],
  );

  const trigger = (
    <Button
      variant="outline"
      role="combobox"
      aria-expanded={open}
      className={cn(
        "w-full justify-between gap-2 h-14 px-4 shadow-sm hover:bg-accent/50 transition-colors",
        mobile ? "w-full" : "min-w-[260px]",
        className,
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <CurrentIcon className="size-4" aria-hidden />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium leading-none truncate">
            {currentPortal.label}
          </span>
          <span className="text-xs text-muted-foreground mt-1">
            Active Context
          </span>
        </div>
      </span>
      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
    </Button>
  );

  const list = (
    <PortalSwitcherList
      value={value}
      onSelect={handleSelect}
      showShortcuts={showShortcuts}
    />
  );

  if (mobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="p-0 sm:max-w-md">{list}</DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] min-w-60 p-0"
        align="start"
      >
        {list}
      </PopoverContent>
    </Popover>
  );
}
