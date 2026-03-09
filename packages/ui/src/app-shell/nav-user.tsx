"use client";

import { useMemo, useState } from "react";
import {
  Lock,
  KeyRound,
  Link,
  Bell,
  ChevronsUpDown,
  CreditCard,
  FileText,
  LogOut,
  ShieldCheck,
  Settings,
  Sparkles,
  User,
} from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  Button,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "../components";
import type { AppShellUser } from "./types";

const USER_MENU_ICON_CLASS = "size-4 text-muted-foreground";

export interface NavUserProps {
  user: AppShellUser;
  onUpgrade?: () => void;
  onAccount?: () => void;
  onBilling?: () => void;
  onNotifications?: () => void;
  onProfile?: () => void;
  onSecurity?: () => void;
  onSettings?: () => void;
  onApiKeys?: () => void;
  onSessions?: () => void;
  onIntegrations?: () => void;
  onAuditLog?: () => void;
  onRolesPermissions?: () => void;
  onLogout?: () => void;
  showUpgrade?: boolean;
}

export function NavUser({
  user,
  onUpgrade,
  onAccount,
  onBilling,
  onNotifications,
  onProfile,
  onSecurity,
  onSettings,
  onApiKeys,
  onSessions,
  onIntegrations,
  onAuditLog,
  onRolesPermissions,
  onLogout,
  showUpgrade = false,
}: NavUserProps) {
  const { isMobile } = useSidebar();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const statusBadges = useMemo(() => {
    if (Array.isArray(user.badges) && user.badges.length > 0) {
      return user.badges
        .map((badge) => badge.trim())
        .filter((badge) => badge.length > 0)
        .slice(0, 6);
    }

    const parts: string[] = [];
    if (user.role) parts.push(user.role);
    if (user.plan) parts.push(user.plan);
    if (user.organizationName) parts.push(user.organizationName);
    return parts.filter((badge) => badge.trim().length > 0).slice(0, 6);
  }, [user.badges, user.organizationName, user.plan, user.role]);

  const onConfirmLogout = () => {
    setLogoutDialogOpen(false);
    onLogout?.();
  };

  const hasSubscriptionActions = (showUpgrade && !!onUpgrade) || !!onBilling;
  const hasProfileActions = !!onProfile || !!onNotifications || !!onSecurity || !!onSettings ||
    !!onApiKeys || !!onSessions || (!showUpgrade && !!onBilling);
  const hasAdministrationActions = !!onIntegrations || !!onAuditLog || !!onRolesPermissions;
  const hasSessionActions = !!onLogout;

  const hasSettingsChildren =
    !!onProfile || !!onNotifications || !!onSecurity || !!onSettings || !!onApiKeys || !!onSessions;

  return (
    <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                tooltip={user.name}
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">{user.name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-[--radix-dropdown-menu-trigger-width] min-w-64 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-2 py-2 text-left text-sm">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="rounded-lg">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </div>
                </div>
                {statusBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-2 pb-2">
                    {statusBadges.map((label) => (
                      <Badge key={label} variant="outline" className="text-[10px]">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </DropdownMenuLabel>

              {hasSubscriptionActions && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="pb-1 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Subscription
                    </DropdownMenuLabel>
                    {showUpgrade && onUpgrade && (
                      <DropdownMenuItem onClick={onUpgrade}>
                        <Sparkles className={USER_MENU_ICON_CLASS} />
                        Upgrade to Pro
                      </DropdownMenuItem>
                    )}
                    {onBilling && (
                      <DropdownMenuItem onClick={onBilling}>
                        <CreditCard className={USER_MENU_ICON_CLASS} />
                        Billing
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </>
              )}

              {hasProfileActions && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="pb-1 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Profile & Security
                    </DropdownMenuLabel>
                    {hasSettingsChildren && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Settings className={USER_MENU_ICON_CLASS} />
                          Settings
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-56">
                          {onProfile && (
                            <DropdownMenuItem onClick={onProfile}>
                              <User className={USER_MENU_ICON_CLASS} />
                              Profile
                            </DropdownMenuItem>
                          )}
                          {onNotifications && (
                            <DropdownMenuItem onClick={onNotifications}>
                              <Bell className={USER_MENU_ICON_CLASS} />
                              Notifications
                            </DropdownMenuItem>
                          )}
                          {onSecurity && (
                            <DropdownMenuItem onClick={onSecurity}>
                              <Lock className={USER_MENU_ICON_CLASS} />
                              Security
                            </DropdownMenuItem>
                          )}
                          {onSessions && (
                            <DropdownMenuItem onClick={onSessions}>
                              <ShieldCheck className={USER_MENU_ICON_CLASS} />
                              Sessions & Devices
                            </DropdownMenuItem>
                          )}
                          {onApiKeys && (
                            <DropdownMenuItem onClick={onApiKeys}>
                              <KeyRound className={USER_MENU_ICON_CLASS} />
                              API Keys
                            </DropdownMenuItem>
                          )}
                          {onSettings && (
                            <DropdownMenuItem onClick={onSettings}>
                              <Settings className={USER_MENU_ICON_CLASS} />
                              General Settings
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}
                    {!showUpgrade && onBilling && (
                      <DropdownMenuItem onClick={onBilling}>
                        <CreditCard className={USER_MENU_ICON_CLASS} />
                        Billing
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuGroup>
                </>
              )}

              {hasAdministrationActions && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="pb-1 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Administration
                    </DropdownMenuLabel>
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <ShieldCheck className={USER_MENU_ICON_CLASS} />
                        Workspace Admin
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        {onRolesPermissions && (
                          <DropdownMenuItem onClick={onRolesPermissions}>
                            <ShieldCheck className={USER_MENU_ICON_CLASS} />
                            Roles & Permissions
                          </DropdownMenuItem>
                        )}
                        {onAuditLog && (
                          <DropdownMenuItem onClick={onAuditLog}>
                            <FileText className={USER_MENU_ICON_CLASS} />
                            Audit Log
                          </DropdownMenuItem>
                        )}
                        {onIntegrations && (
                          <DropdownMenuItem onClick={onIntegrations}>
                            <Link className={USER_MENU_ICON_CLASS} />
                            Integrations
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuGroup>
                </>
              )}

              {hasSessionActions && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="pb-1 pt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      Session
                    </DropdownMenuLabel>
                    <DialogTrigger asChild>
                      <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
                        <LogOut className={USER_MENU_ICON_CLASS} />
                        Log out
                      </DropdownMenuItem>
                    </DialogTrigger>
                  </DropdownMenuGroup>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log out of AFENDA?</DialogTitle>
          <DialogDescription>
            You will need to sign in again to continue.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirmLogout}>
            Log out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
