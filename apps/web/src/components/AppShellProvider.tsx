"use client";

import { AppShell } from "@afenda/ui";
import type { AppShellBreadcrumbItem } from "@afenda/ui";
import type { AppShellOrganization } from "@afenda/ui";
import { Building2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { defaultNavigation, navigationHandlers } from "@/lib/navigation";
import { isPublicFacingPath } from "@/lib/shell-paths";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

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
  const router = useRouter();
  const pathname = usePathname();
  const resolvedPathname = pathname || "/";

  const [organizations, setOrganizations] = useState<AppShellOrganization[]>(
    defaultNavigation.organizations,
  );
  const [organizationIdByName, setOrganizationIdByName] = useState<Record<string, string>>({});

  const loadTenantContext = useCallback(async () => {
    try {
      const response = await fetch("/api/private/auth/tenant-context", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as {
        enabled?: boolean;
        organizations?: Array<{ id?: string; name?: string; slug?: string }>;
      };

      if (!data.enabled || !Array.isArray(data.organizations)) {
        return;
      }

      const mappedOrganizations: AppShellOrganization[] = [];
      const nameToId: Record<string, string> = {};

      for (const organization of data.organizations) {
        if (!organization?.id || !organization.name) {
          continue;
        }

        const displayName = organization.slug
          ? `${organization.name} (${organization.slug})`
          : organization.name;

        mappedOrganizations.push({
          name: displayName,
          logo: Building2,
        });

        nameToId[displayName] = organization.id;
      }

      if (mappedOrganizations.length > 0) {
        setOrganizations(mappedOrganizations);
        setOrganizationIdByName(nameToId);
      }
    } catch {
      // Keep default shell data on transient fetch failures.
    }
  }, []);

  useEffect(() => {
    void loadTenantContext();
  }, [loadTenantContext]);

  if (isPublicFacingPath(resolvedPathname)) {
    return <>{children}</>;
  }

  const topBreadcrumbs = useMemo(
    () => buildBreadcrumbsFromPath(resolvedPathname),
    [resolvedPathname]
  );

  const handleOrganizationChange = useCallback(
    async (organization: AppShellOrganization) => {
      const organizationId = organizationIdByName[organization.name];
      if (!organizationId) {
        return;
      }

      const response = await fetch("/api/private/auth/tenant-context", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ organizationId }),
      });

      if (!response.ok) {
        return;
      }

      router.refresh();
    },
    [organizationIdByName, router],
  );

  return (
    <AppShell
      topTitle={title}
      topBreadcrumbs={topBreadcrumbs}
      currentPathname={resolvedPathname}
      sidebar={{
        organizations,
        teams: defaultNavigation.teams,
        members: defaultNavigation.members,
        notifications: defaultNavigation.notifications,
        navMain: defaultNavigation.navMain,
        projects: defaultNavigation.projects,
        user: defaultNavigation.user,
      }}
      onOrganizationChange={handleOrganizationChange}
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
