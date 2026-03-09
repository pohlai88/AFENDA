"use client";

import { AppShell } from "@afenda/ui";
import type { AppShellBreadcrumbItem } from "@afenda/ui";
import { usePathname } from "next/navigation";
import { defaultNavigation, navigationHandlers } from "@/lib/navigation";
import { isPublicFacingPath } from "@/lib/shell-paths";
import { useMemo, type ReactNode } from "react";

const BREADCRUMB_LABEL_MAP: Record<string, string> = {
  ap: "AP",
  ar: "AR",
  auth: "Auth",
  gl: "GL",
  hr: "HR",
  crm: "CRM",
  erp: "ERP",
  kernel: "Kernel",
};

function isIdLike(segment: string): boolean {
  if (/^\d+$/.test(segment)) return true;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(segment)) {
    return true;
  }
  return false;
}

function toTitleCase(value: string): string {
  const lowerValue = value.toLowerCase();
  if (BREADCRUMB_LABEL_MAP[lowerValue]) return BREADCRUMB_LABEL_MAP[lowerValue];

  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function buildBreadcrumbsFromPath(pathname: string): AppShellBreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return [{ label: "Home", href: "/" }];
  }

  let currentPath = "";
  return segments.map((segment, index) => {
    currentPath += `/${segment}`;

    const isLast = index === segments.length - 1;
    const decodedSegment = decodeURIComponent(segment);
    const label = isIdLike(decodedSegment) ? "Details" : toTitleCase(decodedSegment);

    return {
      label,
      href: isLast ? undefined : currentPath,
    };
  });
}

/**
 * Client-side wrapper for AppShell with navigation configuration.
 * This component loads navigation data (including Lucide icons) on the client
 * to avoid Next.js serialization issues with Server Components.
 */
export function AppShellProvider({
  children,
  title = "AFENDA — Business Truth Engine",
}: {
  children: ReactNode;
  title?: string;
}) {
  const pathname = usePathname();
  const resolvedPathname = pathname || "/";
  if (isPublicFacingPath(resolvedPathname)) {
    return <>{children}</>;
  }

  const topBreadcrumbs = useMemo(
    () => buildBreadcrumbsFromPath(resolvedPathname),
    [resolvedPathname]
  );

  return (
    <AppShell
      topTitle={title}
      topBreadcrumbs={topBreadcrumbs}
      currentPathname={resolvedPathname}
      sidebar={{
        organizations: defaultNavigation.organizations,
        teams: defaultNavigation.teams,
        members: defaultNavigation.members,
        notifications: defaultNavigation.notifications,
        navMain: defaultNavigation.navMain,
        projects: defaultNavigation.projects,
        user: defaultNavigation.user,
      }}
      onOrganizationChange={navigationHandlers.onOrganizationChange}
      onTeamChange={navigationHandlers.onTeamChange}
      onMemberSelect={navigationHandlers.onMemberSelect}
      onAddMember={navigationHandlers.onAddMember}
      onAddTeam={navigationHandlers.onAddTeam}
      onAddOrganization={navigationHandlers.onAddOrganization}
      onUserUpgrade={navigationHandlers.onUserUpgrade}
      onUserAccount={navigationHandlers.onUserAccount}
      onUserBilling={navigationHandlers.onUserBilling}
      onUserNotifications={navigationHandlers.onUserNotifications}
      onUserProfile={navigationHandlers.onUserProfile}
      onUserSecurity={navigationHandlers.onUserSecurity}
      onUserSettings={navigationHandlers.onUserSettings}
      onUserApiKeys={navigationHandlers.onUserApiKeys}
      onUserSessions={navigationHandlers.onUserSessions}
      onUserIntegrations={navigationHandlers.onUserIntegrations}
      onUserAuditLog={navigationHandlers.onUserAuditLog}
      onUserRolesPermissions={navigationHandlers.onUserRolesPermissions}
      onUserLogout={navigationHandlers.onUserLogout}
    >
      {children}
    </AppShell>
  );
}
