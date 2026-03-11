"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";

import {
  Button,
  Command,
  CommandEmpty,
  CommandInput,
  CommandList,
  Dialog,
  DialogContent,
  DialogTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  cn,
} from "@afenda/ui";

import type { PortalType } from "@afenda/contracts";
import { getPortal } from "../_lib/portal-registry";
import { buildPortalSignInRedirect } from "../_lib/portal-routing";
import { PortalSwitcherList } from "./portal-switcher-list";

interface PortalSwitcherProps {
  value?: PortalType;
  className?: string;
  mobile?: boolean;
  showShortcuts?: boolean;
  onSelect?: (portal: PortalType) => void;
}

const SWITCHER_PANEL_CLASS =
  "h-[26rem] w-[22rem] overflow-hidden rounded-2xl border border-border/70 bg-popover p-0 shadow-xl";

interface PortalSwitcherTriggerProps
  extends React.ComponentPropsWithoutRef<typeof Button> {
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;
}

const PortalSwitcherTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  PortalSwitcherTriggerProps
>(({ label, icon: Icon, className, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="outline"
      role="combobox"
      className={cn(
        "h-11 w-full justify-between rounded-xl border border-border/70 bg-background px-4 text-sm font-medium shadow-sm",
        "hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Icon
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="truncate text-foreground">{label}</span>
      </span>

      <ChevronsUpDown
        className="h-4 w-4 shrink-0 text-muted-foreground/70"
        aria-hidden
      />
    </Button>
  );
});

PortalSwitcherTrigger.displayName = "PortalSwitcherTrigger";

function PortalSwitcherCommand({
  value,
  showShortcuts,
  onSelect,
}: {
  value: PortalType;
  showShortcuts: boolean;
  onSelect: (portal: PortalType) => void;
}) {
  return (
    <Command className="flex h-full w-full rounded-2xl bg-popover text-popover-foreground shadow-none">
      <div className="border-b border-border/70 p-2">
        <CommandInput
          placeholder="Search portal..."
          className="rounded-lg border border-border/70 bg-background px-3"
        />
      </div>

      <CommandList className="h-[calc(26rem-4rem)] px-2 pb-2">
        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
          No portal found.
        </CommandEmpty>

        <PortalSwitcherList
          value={value}
          onSelect={onSelect}
          showShortcuts={showShortcuts}
        />
      </CommandList>
    </Command>
  );
}

export function PortalSwitcher({
  value = "app",
  className,
  mobile = false,
  showShortcuts = true,
  onSelect,
}: PortalSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const currentPortal = getPortal(value);
  const CurrentIcon = currentPortal.icon;

  const handleSelect = React.useCallback(
    (portal: PortalType) => {
      setOpen(false);

      if (onSelect) {
        onSelect(portal);
        return;
      }

      router.push(buildPortalSignInRedirect(portal));
    },
    [onSelect, router]
  );

  const command = (
    <PortalSwitcherCommand
      value={value}
      showShortcuts={showShortcuts}
      onSelect={handleSelect}
    />
  );

  if (mobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <PortalSwitcherTrigger
            label={currentPortal.label}
            icon={CurrentIcon}
            className={className}
          />
        </DialogTrigger>

        <DialogContent className={cn(SWITCHER_PANEL_CLASS, "sm:max-w-[22rem]")}>
          {command}
        </DialogContent>
      </Dialog>
    );
  }

  if (!mounted) {
    return (
      <PortalSwitcherTrigger
        label={currentPortal.label}
        icon={CurrentIcon}
        className={className}
        aria-expanded={false}
        disabled
      />
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <PortalSwitcherTrigger
          label={currentPortal.label}
          icon={CurrentIcon}
          className={className}
          aria-expanded={open}
        />
      </PopoverTrigger>

      <PopoverContent className={SWITCHER_PANEL_CLASS} align="start">
        {command}
      </PopoverContent>
    </Popover>
  );
}