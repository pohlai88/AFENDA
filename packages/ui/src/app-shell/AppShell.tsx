"use client";

import { SidebarInset, SidebarProvider } from "../components";
import { AppShellLeftRail } from "./left-rail";
import { AppShellTopBar } from "./top-bar";
import type { AppShellProps } from "./types";
import { AppShellWorkspace } from "./workspace";

export function AppShell({
  topTitle = "AFENDA App Shell",
  topBreadcrumbs,
  currentPathname,
  sidebar,
  onOrganizationChange,
  onTeamChange,
  onMemberSelect,
  onNotificationsChange,
  onAddMember,
  onAddTeam,
  onAddOrganization,
  onUserUpgrade,
  onUserAccount,
  onUserBilling,
  onUserNotifications,
  onUserProfile,
  onUserSecurity,
  onUserSettings,
  onUserApiKeys,
  onUserSessions,
  onUserIntegrations,
  onUserAuditLog,
  onUserRolesPermissions,
  onUserLogout,
  // Workspace props
  textareaValue,
  defaultTextareaValue,
  textareaPlaceholder,
  onTextareaChange,
  children,
}: AppShellProps) {
  return (
    <SidebarProvider defaultOpen>
      <AppShellLeftRail
        organizations={sidebar?.organizations}
        teams={sidebar?.teams}
        members={sidebar?.members}
        navMain={sidebar?.navMain}
        projects={sidebar?.projects}
        user={sidebar?.user}
        onOrganizationChange={onOrganizationChange}
        onTeamChange={onTeamChange}
        onMemberSelect={onMemberSelect}
        onAddMember={onAddMember}
        onAddTeam={onAddTeam}
        onAddOrganization={onAddOrganization}
        onUserUpgrade={onUserUpgrade}
        onUserAccount={onUserAccount}
        onUserBilling={onUserBilling}
        onUserNotifications={onUserNotifications}
        onUserProfile={onUserProfile}
        onUserSecurity={onUserSecurity}
        onUserSettings={onUserSettings}
        onUserApiKeys={onUserApiKeys}
        onUserSessions={onUserSessions}
        onUserIntegrations={onUserIntegrations}
        onUserAuditLog={onUserAuditLog}
        onUserRolesPermissions={onUserRolesPermissions}
        onUserLogout={onUserLogout}
      />

      <SidebarInset>
        <AppShellTopBar
          title={topTitle}
          breadcrumbs={topBreadcrumbs}
          navMain={sidebar?.navMain}
          notifications={sidebar?.notifications}
          onNotificationsChange={onNotificationsChange}
          currentPathname={currentPathname}
        />

        <div className="flex flex-1 flex-col gap-4 p-4 pt-0 md:gap-6 md:p-6">
          <div className="mx-auto w-full max-w-7xl">
            <AppShellWorkspace
              value={textareaValue}
              defaultValue={defaultTextareaValue}
              placeholder={textareaPlaceholder}
              onChange={onTextareaChange}
            />
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
