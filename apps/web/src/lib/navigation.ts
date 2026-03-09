import {
  Building2,
  Folder,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";
import type {
  AppShellMember,
  AppShellNotification,
  AppShellTeam,
  AppShellOrganization,
  AppShellNavMainItem,
  AppShellProject,
  AppShellUser,
} from "@afenda/ui";
import {
  boardRoomNavigationDomains,
  erpNavigationDomains,
  type NavigationIconKey,
  userMenuRoutes,
} from "./navigation.config";

function navigateTo(url: string): void {
  if (typeof window === "undefined") return;
  window.location.assign(url);
}

const ICON_MAP: Record<NavigationIconKey, LucideIcon> = {
  "book-open": createEmojiIcon("📘"),
  "briefcase": createEmojiIcon("💼"),
  "credit-card": createEmojiIcon("💳"),
  factory: createEmojiIcon("🏭"),
  folder: createEmojiIcon("📁"),
  "hand-coins": createEmojiIcon("💰"),
  package: createEmojiIcon("📦"),
  presentation: createEmojiIcon("📋"),
  shield: createEmojiIcon("🛡️"),
  "shopping-cart": createEmojiIcon("🛒"),
  users: createEmojiIcon("👥"),
};

function createEmojiIcon(emoji: string): LucideIcon {
  const EmojiIcon = ({ className }: { className?: string }) =>
    createElement(
      "span",
      {
        "aria-hidden": "true",
        className: `inline-flex items-center justify-center leading-none text-[14px] ${className ?? ""}`.trim(),
      },
      emoji
    );

  return EmojiIcon as unknown as LucideIcon;
}

function buildManualNavMain(): AppShellNavMainItem[] {
  return erpNavigationDomains.map((domain) => ({
    title: domain.title,
    url: domain.url,
    icon: domain.icon ? ICON_MAP[domain.icon] : Folder,
    items: domain.items?.map((item) => ({
      title: item.title,
      url: item.url,
      icon: item.icon ? ICON_MAP[item.icon] : Folder,
    })),
  }));
}

function buildManualBoardRoomDomains(): AppShellProject[] {
  return boardRoomNavigationDomains.map((domain) => ({
    name: domain.name,
    url: domain.url,
    icon: domain.icon ? ICON_MAP[domain.icon] : Folder,
  }));
}

/**
 * Navigation configuration for AFENDA web app.
 * All data is configurable and non-hardcoded.
 */

export interface NavigationConfig {
  organizations: AppShellOrganization[];
  teams: AppShellTeam[];
  members: AppShellMember[];
  notifications: AppShellNotification[];
  navMain: AppShellNavMainItem[];
  projects: AppShellProject[];
  user: AppShellUser;
}

/**
 * Default navigation configuration.
 * In production, this would come from the API/database.
 */
export const defaultNavigation: NavigationConfig = {
  organizations: [
    {
      name: "AFENDA",
      logo: Building2,
    },
  ],
  teams: [],
  members: [],
  notifications: [],
  navMain: buildManualNavMain(),
  projects: buildManualBoardRoomDomains(),
  user: {
    name: "Default User",
    email: "user@afenda.com",
    avatar: "/avatars/default.jpg",
    badges: ["Admin", "Starter", "AFENDA"],
  },
};

/**
 * Get navigation configuration.
 * In production, this would fetch from API based on user permissions.
 */
export async function getNavigationConfig(): Promise<NavigationConfig> {
  // TODO: Fetch from API based on:
  // - User permissions
  // - Active organization
  // - Feature flags
  return defaultNavigation;
}

/**
 * Navigation event handlers.
 * These would be wired to actual routing/state management in production.
 */
export const navigationHandlers = {
  onOrganizationChange: (_organization: AppShellOrganization) => {
    // TODO: Update active organization context
  },

  onTeamChange: (team: AppShellTeam) => {
    console.log("Team changed:", team.name);
    // TODO: Update active organization context
  },

  onMemberSelect: (_member: AppShellMember) => {
    // TODO: Open member details panel
  },

  onAddMember: () => {
    // TODO: Show add member dialog
  },
  
  onAddTeam: () => {
    console.log("Add team clicked");
    // TODO: Show create organization dialog
  },

  onAddOrganization: () => {
    // TODO: Show create organization flow
  },
  
  onProjectView: (project: AppShellProject) => {
    console.log("View project:", project.name);
    // TODO: Navigate to project detail
  },
  
  onProjectShare: (project: AppShellProject) => {
    console.log("Share project:", project.name);
    // TODO: Show share dialog
  },
  
  onProjectDelete: (project: AppShellProject) => {
    console.log("Delete project:", project.name);
    // TODO: Show confirmation dialog
  },
  
  onShowMoreProjects: () => {
    console.log("Show more projects");
    // TODO: Navigate to projects list
  },
  
  onUserUpgrade: () => {
    navigateTo(userMenuRoutes.upgrade);
  },
  
  onUserAccount: () => {
    navigateTo(userMenuRoutes.account);
  },
  
  onUserBilling: () => {
    navigateTo(userMenuRoutes.billing);
  },
  
  onUserNotifications: () => {
    navigateTo(userMenuRoutes.notifications);
  },

  onUserProfile: () => {
    navigateTo(userMenuRoutes.profile);
  },

  onUserSecurity: () => {
    navigateTo(userMenuRoutes.security);
  },

  onUserSettings: () => {
    navigateTo(userMenuRoutes.settings);
  },

  onUserApiKeys: () => {
    navigateTo(userMenuRoutes.apiKeys);
  },

  onUserSessions: () => {
    navigateTo(userMenuRoutes.sessions);
  },

  onUserIntegrations: () => {
    navigateTo(userMenuRoutes.integrations);
  },

  onUserAuditLog: () => {
    navigateTo(userMenuRoutes.auditLog);
  },

  onUserRolesPermissions: () => {
    navigateTo(userMenuRoutes.rolesPermissions);
  },
  
  onUserLogout: () => {
    navigateTo(userMenuRoutes.logout);
  },
};
