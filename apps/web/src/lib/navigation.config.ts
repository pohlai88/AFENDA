export type NavigationIconKey =
  | "book-open"
  | "briefcase"
  | "credit-card"
  | "factory"
  | "folder"
  | "hand-coins"
  | "package"
  | "presentation"
  | "shield"
  | "shopping-cart"
  | "users";

export interface NavigationDomainConfig {
  key: string;
  title: string;
  url: string;
  icon?: NavigationIconKey;
  items?: {
    title: string;
    url: string;
    icon?: NavigationIconKey;
  }[];
}

export interface BoardRoomDomainConfig {
  name: string;
  url: string;
  icon?: NavigationIconKey;
}

export type UserMenuRouteKey =
  | "upgrade"
  | "account"
  | "billing"
  | "notifications"
  | "profile"
  | "security"
  | "settings"
  | "apiKeys"
  | "sessions"
  | "integrations"
  | "auditLog"
  | "rolesPermissions"
  | "logout";

/**
 * Centralized destination map for user-menu actions.
 * Update routes here without touching handler logic.
 */
export const userMenuRoutes: Record<UserMenuRouteKey, string> = {
  upgrade: "/governance/settings?tab=plan",
  account: "/governance/settings/company",
  billing: "/governance/settings?tab=billing",
  notifications: "/governance/settings?tab=notifications",
  profile: "/governance/settings/company?tab=profile",
  security: "/governance/settings/security",
  settings: "/governance/settings",
  apiKeys: "/governance/settings/security?panel=api-keys",
  sessions: "/governance/settings/security?panel=sessions",
  integrations: "/governance/settings/features",
  auditLog: "/governance/audit/logs",
  rolesPermissions: "/governance/settings/access",
  logout: "/auth/signout",
};

/**
 * Valid icon keys:
 * - "book-open"
 * - "briefcase"
 * - "credit-card"
 * - "factory"
 * - "folder"
 * - "hand-coins"
 * - "package"
 * - "presentation"
 * - "shield"
 * - "shopping-cart"
 * - "users"
 */

/**
 * Manual navigation config source of truth.
 * Update this file directly to change ERP and BoardRoom navigation.
 */
export const erpNavigationDomains: NavigationDomainConfig[] = [
  { key: "crm", title: "CRM", url: "/crm", icon: "users" },
  {
    key: "finance",
    title: "Finance",
    url: "/finance",
    icon: "credit-card",
    items: [
      { title: "Dashboard", url: "/finance/dashboards", icon: "presentation" },
      { title: "AP", url: "/finance/ap/invoices", icon: "credit-card" },
      { title: "AR", url: "/finance/ar/invoices", icon: "hand-coins" },
      { title: "GL Accounts", url: "/finance/gl/accounts", icon: "book-open" },
      { title: "GL Journals", url: "/finance/gl/journals", icon: "book-open" },
      { title: "Trial Balance", url: "/finance/gl/trial-balance", icon: "book-open" },
      { title: "Tax", url: "/finance/tax/calculations", icon: "shield" },
    ],
  },
  { key: "hr", title: "HR", url: "/hr", icon: "users" },
  { key: "inventory", title: "Inventory", url: "/inventory", icon: "package" },
  { key: "manufacturing", title: "Manufacturing", url: "/manufacturing", icon: "factory" },
  { key: "project", title: "Project", url: "/project", icon: "presentation" },
  { key: "purchasing", title: "Purchasing", url: "/procurement", icon: "shopping-cart" },
  { key: "sales", title: "Sales", url: "/sales", icon: "hand-coins" },
  { key: "supplier", title: "Supplier", url: "/procurement/suppliers", icon: "briefcase" },
  {
    key: "governance",
    title: "Governance",
    url: "/governance/settings",
    icon: "shield",
    items: [
      { title: "General", url: "/governance/settings", icon: "folder" },
      { title: "Company", url: "/governance/settings/company", icon: "briefcase" },
      { title: "Security", url: "/governance/settings/security", icon: "shield" },
      { title: "Features", url: "/governance/settings/features", icon: "presentation" },
      { title: "Access", url: "/governance/settings/access", icon: "users" },
      { title: "Audit Logs", url: "/governance/audit/logs", icon: "book-open" },
    ],
  },
  // Quick toggle template examples:
  // { key: "treasury", title: "Treasury", url: "/finance/treasury", icon: "credit-card" },
  // { key: "compliance", title: "Compliance", url: "/governance/compliance", icon: "shield" },
];

/**
 * Empty by default. Add communication domains when ready.
 * Example:
 * { name: "Announcements", url: "/boardroom/announcements", icon: "folder" }
 */
export const boardRoomNavigationDomains: BoardRoomDomainConfig[] = [];

// Quick toggle template examples:
// export const boardRoomNavigationDomains: BoardRoomDomainConfig[] = [
//   { name: "Announcements", url: "/boardroom/announcements", icon: "folder" },
//   { name: "Team Channels", url: "/boardroom/channels", icon: "users" },
//   { name: "Meetings", url: "/boardroom/meetings", icon: "presentation" },
// ];
