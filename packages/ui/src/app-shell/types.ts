import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type AppShellBreadcrumbItem = {
  label: string;
  href?: string;
};

// Team/Organization data structure
export type AppShellTeam = {
  name: string;
  logo: LucideIcon;
  plan: string;
};

export type AppShellOrganization = {
  name: string;
  logo: LucideIcon;
};

export type AppShellMember = {
  id: string;
  name: string;
  email: string;
  role?: string;
};

export type AppShellNotification = {
  id: string;
  title: string;
  description: string;
  category?: "system" | "finance" | "security" | "general";
  timeLabel?: string;
  read?: boolean;
};

// Hierarchical navigation item with optional collapsible subitems
export type AppShellNavMainItem = {
  title: string;
  url: string;
  icon?: LucideIcon;
  isActive?: boolean;
  items?: {
    title: string;
    url: string;
    icon?: LucideIcon;
  }[];
};

// Project item
export type AppShellProject = {
  name: string;
  url: string;
  icon: LucideIcon;
};

// User profile data
export type AppShellUser = {
  name: string;
  email: string;
  avatar: string;
  role?: string;
  plan?: string;
  organizationName?: string;
  badges?: string[];
};

// Modern app-shell sidebar configuration (sidebar-07 structure)
export interface AppShellSidebarConfig {
  organizations?: AppShellOrganization[];
  teams?: AppShellTeam[];
  members?: AppShellMember[];
  notifications?: AppShellNotification[];
  navMain?: AppShellNavMainItem[];
  projects?: AppShellProject[];
  user?: AppShellUser;
}

export interface AppShellProps {
  topTitle?: string;
  topBreadcrumbs?: AppShellBreadcrumbItem[];
  currentPathname?: string;
  // Modern API for sidebar-07 structure
  sidebar?: AppShellSidebarConfig;
  // Team switcher actions
  onOrganizationChange?: (organization: AppShellOrganization) => void;
  onTeamChange?: (team: AppShellTeam) => void;
  onMemberSelect?: (member: AppShellMember) => void;
  onNotificationsChange?: (notifications: AppShellNotification[]) => void;
  onAddMember?: () => void;
  onAddTeam?: () => void;
  onAddOrganization?: () => void;
  // User menu actions
  onUserUpgrade?: () => void;
  onUserAccount?: () => void;
  onUserBilling?: () => void;
  onUserNotifications?: () => void;
  onUserProfile?: () => void;
  onUserSecurity?: () => void;
  onUserSettings?: () => void;
  onUserApiKeys?: () => void;
  onUserSessions?: () => void;
  onUserIntegrations?: () => void;
  onUserAuditLog?: () => void;
  onUserRolesPermissions?: () => void;
  onUserLogout?: () => void;
  // Workspace props
  textareaValue?: string;
  defaultTextareaValue?: string;
  textareaPlaceholder?: string;
  onTextareaChange?: (value: string) => void;
  children?: ReactNode;
}
