export { AppShell } from "./AppShell";
export { AppShellLeftRail } from "./left-rail";
export { AppShellTopBar } from "./top-bar";
export { AppShellWorkspace } from "./workspace";
export { NavTeamSwitcher } from "./nav-team-switcher";
export { NavMain } from "./nav-main";
export { NavProjects } from "./nav-projects";
export { NavUser } from "./nav-user";
export type {
  AppShellProps,
  AppShellBreadcrumbItem,
  AppShellSidebarConfig,
  AppShellOrganization,
  AppShellTeam,
  AppShellMember,
  AppShellNotification,
  AppShellNavMainItem,
  AppShellProject,
  AppShellUser,
} from "./types";

// Temporary legacy stubs until workspaces are rebuilt
export * from "./legacy-stubs";
