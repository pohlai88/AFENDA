"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Star, X } from "lucide-react";
import {
  Button,
  Input,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "../components";
import { NavMain } from "./nav-main";
import { NavTeamSwitcher } from "./nav-team-switcher";
import { NavUser } from "./nav-user";
import type {
  AppShellMember,
  AppShellNavMainItem,
  AppShellOrganization,
  AppShellProject,
  AppShellTeam,
  AppShellUser,
} from "./types";

export interface AppShellLeftRailProps {
  organizations?: AppShellOrganization[];
  teams?: AppShellTeam[];
  members?: AppShellMember[];
  navMain?: AppShellNavMainItem[];
  projects?: AppShellProject[];
  user?: AppShellUser;
  onOrganizationChange?: (organization: AppShellOrganization) => void;
  onTeamChange?: (team: AppShellTeam) => void;
  onMemberSelect?: (member: AppShellMember) => void;
  onAddMember?: () => void;
  onAddTeam?: () => void;
  onAddOrganization?: () => void;
  onProjectView?: (project: AppShellProject) => void;
  onProjectShare?: (project: AppShellProject) => void;
  onProjectDelete?: (project: AppShellProject) => void;
  onShowMoreProjects?: () => void;
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
}

interface LeftRailActionHandlers {
  onOrganizationChange?: (organization: AppShellOrganization) => void;
  onTeamChange?: (team: AppShellTeam) => void;
  onMemberSelect?: (member: AppShellMember) => void;
  onAddMember?: () => void;
  onAddTeam?: () => void;
  onAddOrganization?: () => void;
  onProjectView?: (project: AppShellProject) => void;
  onProjectShare?: (project: AppShellProject) => void;
  onProjectDelete?: (project: AppShellProject) => void;
  onShowMoreProjects?: () => void;
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
}

interface NavEndpointItem {
  key: string;
  title: string;
  url: string;
  icon?: AppShellNavMainItem["icon"] | AppShellProject["icon"];
}

const MAX_PINNED_ITEMS = 3;

type PinLevel = "module" | "domain" | "endpoint";

interface NavPinCandidate extends NavEndpointItem {
  level: PinLevel;
  module: string;
  domain: string;
  isActionEndpoint: boolean;
}

function createEmojiIcon(emoji: string): AppShellNavMainItem["icon"] {
  const EmojiIcon = ({ className }: { className?: string }) => (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center leading-none text-[14px] ${className ?? ""}`.trim()}
    >
      {emoji}
    </span>
  );

  return EmojiIcon as AppShellNavMainItem["icon"];
}

function isActionEndpoint(title: string, url: string): boolean {
  const actionPattern =
    /(create|add|new|approve|submit|reject|delete|remove|void|post|mark|pay|share|invite|export|import|send|run|sync|publish|assign|close|open|start|stop|archive)/i;

  return actionPattern.test(title) ||
    actionPattern.test(url) ||
    url.includes("/commands/") ||
    url.includes("/actions/") ||
    url.endsWith("/action");
}

function parsePickerQuery(rawQuery: string): { level?: PinLevel; text: string } {
  const normalized = rawQuery.trim().toLowerCase();

  if (normalized.startsWith("m:") || normalized.startsWith("module:")) {
    return {
      level: "module",
      text: normalized.replace(/^m:|^module:/, "").trim(),
    };
  }

  if (normalized.startsWith("d:") || normalized.startsWith("domain:")) {
    return {
      level: "domain",
      text: normalized.replace(/^d:|^domain:/, "").trim(),
    };
  }

  if (normalized.startsWith("e:") || normalized.startsWith("endpoint:")) {
    return {
      level: "endpoint",
      text: normalized.replace(/^e:|^endpoint:/, "").trim(),
    };
  }

  return { text: normalized };
}

function endpointMatches(endpoint: NavPinCandidate, query: string): boolean {
  if (!query) return true;
  const haystack = `${endpoint.title} ${endpoint.module} ${endpoint.domain} ${endpoint.url}`.toLowerCase();
  return haystack.includes(query);
}

function PinnedSection({
  title,
  selectedKeys,
  allCandidates,
  query,
  pickerQuery,
  onPickerQueryChange,
  onAdd,
  onRemove,
}: {
  title: string;
  selectedKeys: string[];
  allCandidates: NavPinCandidate[];
  query: string;
  pickerQuery: string;
  onPickerQueryChange: (value: string) => void;
  onAdd: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const selectedSet = useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const pickerFilter = useMemo(() => parsePickerQuery(pickerQuery), [pickerQuery]);

  const selectedItems = useMemo(
    () => allCandidates.filter((candidate) => selectedSet.has(candidate.key)),
    [allCandidates, selectedSet]
  );

  const availableItems = useMemo(() => {
    return allCandidates
      .filter((candidate) => !selectedSet.has(candidate.key))
      .filter((candidate) => {
        if (pickerFilter.level && candidate.level !== pickerFilter.level) {
          return false;
        }

        return endpointMatches(candidate, pickerFilter.text);
      });
  }, [allCandidates, pickerFilter, selectedSet]);

  const visibleItems = useMemo(
    () => selectedItems.filter((endpoint) => endpointMatches(endpoint, query)),
    [query, selectedItems]
  );

  const canAddMore = selectedItems.length < MAX_PINNED_ITEMS;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between px-2 pb-2">
        <SidebarGroupLabel>{title}</SidebarGroupLabel>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              disabled={!canAddMore}
              aria-label={`Add ${title}`}
            >
              <Plus className="size-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            side="right"
            className="w-[26rem] max-w-[calc(100vw-2rem)] p-4 md:w-[30rem]"
          >
            <div className="space-y-3">
              <Input
                value={pickerQuery}
                onChange={(event) => onPickerQueryChange(event.target.value)}
                placeholder={`Search ${title.toLowerCase()} (m:, d:, e:)`}
                className="h-10"
              />
              <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
                {availableItems.slice(0, 20).map((endpoint) => (
                  <Button
                    key={`${title}-picker-${endpoint.key}`}
                    type="button"
                    variant="ghost"
                    className="h-auto w-full justify-start gap-2 px-2 py-2 text-left text-sm"
                    onClick={() => onAdd(endpoint.key)}
                  >
                    {endpoint.icon && <endpoint.icon className="size-4 text-muted-foreground" />}
                    <span className="truncate">{endpoint.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {endpoint.level}
                    </span>
                  </Button>
                ))}
                {availableItems.length === 0 && (
                  <div className="rounded-md px-2 py-2 text-sm text-muted-foreground">
                    No items available
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                Filter codes: <span className="font-medium">m:</span> module, <span className="font-medium">d:</span> domain, <span className="font-medium">e:</span> endpoint
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <SidebarMenu>
        {visibleItems.map((endpoint) => (
          <SidebarMenuItem key={`${title}-selected-${endpoint.key}`} className="relative">
            <SidebarMenuButton asChild>
              <a href={endpoint.url}>
                {endpoint.icon && <endpoint.icon />}
                <span className="truncate">{endpoint.title}</span>
              </a>
            </SidebarMenuButton>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 size-7"
              onClick={() => onRemove(endpoint.key)}
              aria-label={`Remove ${endpoint.title}`}
            >
              <X className="size-3.5" />
            </Button>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

function ModernLeftRail({
  organizations,
  teams,
  members,
  navMain,
  projects,
  user,
  onOrganizationChange,
  onTeamChange,
  onMemberSelect,
  onAddMember,
  onAddTeam,
  onAddOrganization,
  onProjectView,
  onProjectShare,
  onProjectDelete,
  onShowMoreProjects,
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
}: {
  organizations?: AppShellOrganization[];
  teams?: AppShellTeam[];
  members?: AppShellMember[];
  navMain?: AppShellNavMainItem[];
  projects?: AppShellProject[];
  user?: AppShellUser;
} & LeftRailActionHandlers) {
  const { setOpen } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);
  const [quickActionKeys, setQuickActionKeys] = useState<string[]>([]);
  const [favoritePickerQuery, setFavoritePickerQuery] = useState("");
  const [quickActionPickerQuery, setQuickActionPickerQuery] = useState("");

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const pinCandidates = useMemo<NavPinCandidate[]>(() => {
    const candidates: NavPinCandidate[] = [];
    const firstErpUrl = (navMain ?? [])[0]?.url;
    const firstBoardroomUrl = (projects ?? [])[0]?.url;

    if (firstErpUrl) {
      candidates.push({
        key: "module:erp",
        level: "module",
        module: "ERP",
        domain: "All Domains",
        title: "ERP",
        url: firstErpUrl,
        isActionEndpoint: false,
      });
    }

    if (firstBoardroomUrl) {
      candidates.push({
        key: "module:boardroom",
        level: "module",
        module: "BoardRoom",
        domain: "Communication",
        title: "BoardRoom",
        url: firstBoardroomUrl,
        isActionEndpoint: false,
      });
    }

    (navMain ?? []).forEach((item) => {
      candidates.push({
        key: `domain:erp:${item.url}`,
        level: "domain",
        module: "ERP",
        domain: item.title,
        title: item.title,
        url: item.url,
        icon: item.icon,
        isActionEndpoint: false,
      });

      if (item.items && item.items.length > 0) {
        item.items.forEach((subItem) => {
          candidates.push({
            key: `endpoint:erp:${subItem.url}`,
            level: "endpoint",
            module: "ERP",
            domain: item.title,
            title: `${item.title} / ${subItem.title}`,
            url: subItem.url,
            icon: item.icon,
            isActionEndpoint: isActionEndpoint(subItem.title, subItem.url),
          });
        });
      } else {
        candidates.push({
          key: `endpoint:erp:${item.url}`,
          level: "endpoint",
          module: "ERP",
          domain: item.title,
          title: item.title,
          url: item.url,
          icon: item.icon,
          isActionEndpoint: isActionEndpoint(item.title, item.url),
        });
      }
    });

    if (firstBoardroomUrl) {
      candidates.push({
        key: "domain:boardroom:communication",
        level: "domain",
        module: "BoardRoom",
        domain: "Communication",
        title: "Communication",
        url: firstBoardroomUrl,
        isActionEndpoint: false,
      });
    }

    (projects ?? []).forEach((project) => {
      candidates.push({
        key: `endpoint:boardroom:${project.url}`,
        level: "endpoint",
        module: "BoardRoom",
        domain: "Communication",
        title: project.name,
        url: project.url,
        icon: project.icon,
        isActionEndpoint: isActionEndpoint(project.name, project.url),
      });
    });

    const deduplicated = new Map<string, NavPinCandidate>();
    candidates.forEach((candidate) => {
      deduplicated.set(candidate.key, candidate);
    });

    return Array.from(deduplicated.values());
  }, [navMain, projects]);

  const quickActionCandidates = useMemo(
    () => pinCandidates.filter((candidate) => candidate.level === "endpoint" && candidate.isActionEndpoint),
    [pinCandidates]
  );

  const filteredErpDomains = useMemo(() => {
    return (navMain ?? [])
      .filter((item) => {
        if (!normalizedQuery) return true;

        const itemMatches = `${item.title} ${item.url}`.toLowerCase().includes(normalizedQuery);
        const childMatches = (item.items ?? []).some((subItem) => {
          const haystack = `${subItem.title} ${subItem.url}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        });

        return itemMatches || childMatches;
      })
      .map((item) => ({
        ...item,
        items: undefined,
      }));
  }, [navMain, normalizedQuery]);

  const filteredBoardroom = useMemo(() => {
    if (!normalizedQuery) return projects;

    return (projects ?? []).filter((item) => {
      const haystack = `${item.name} ${item.url}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, projects]);

  const hasTeamSwitcher =
    (organizations?.length ?? 0) > 0 ||
    (teams?.length ?? 0) > 0 ||
    (members?.length ?? 0) > 0;

  const moduleDomainItems = useMemo<AppShellNavMainItem[]>(() => {
    const erpModule: AppShellNavMainItem = {
      title: "ERP",
      url: "/erp",
      icon: createEmojiIcon("🧩"),
      isActive: true,
      items: filteredErpDomains.map((domain) => ({
        title: domain.title,
        url: domain.url,
        icon: domain.icon,
      })),
    };

    const boardRoomModule: AppShellNavMainItem = {
      title: "BoardRoom",
      url: "/boardroom",
      icon: createEmojiIcon("🏢"),
      items: (filteredBoardroom ?? []).map((domain) => ({
        title: domain.name,
        url: domain.url,
        icon: domain.icon,
      })),
    };

    return [erpModule, boardRoomModule];
  }, [filteredBoardroom, filteredErpDomains]);

  const addPinned = (
    setCurrent: (next: string[] | ((prev: string[]) => string[])) => void,
    key: string
  ) => {
    setCurrent((prev) => {
      if (prev.includes(key) || prev.length >= MAX_PINNED_ITEMS) {
        return prev;
      }
      return [...prev, key];
    });
  };

  const removePinned = (
    setCurrent: (next: string[] | ((prev: string[]) => string[])) => void,
    key: string
  ) => {
    setCurrent((prev) => prev.filter((currentKey) => currentKey !== key));
  };

  return (
    <Sidebar side="left" collapsible="icon" variant="sidebar">
      <SidebarHeader>
        {hasTeamSwitcher && (
          <NavTeamSwitcher
            organizations={organizations}
            teams={teams ?? []}
            members={members}
            onOrganizationChange={onOrganizationChange}
            onTeamChange={onTeamChange}
            onMemberSelect={onMemberSelect}
            onAddMember={onAddMember}
            onAddTeam={onAddTeam}
            onAddOrganization={onAddOrganization}
          />
        )}

        <div className="group-data-[collapsible=icon]:hidden px-2 pt-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search endpoints"
              className="h-9 pl-8"
            />
          </div>
          <Separator className="mt-3" />
        </div>

      </SidebarHeader>

      <SidebarContent>
        <div className="hidden group-data-[collapsible=icon]:block p-2 pt-1">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Search" onClick={() => setOpen(true)}>
                <Search />
                <span className="sr-only">Search</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <Separator className="mt-2" />
        </div>

        <PinnedSection
          title="Favourite"
          selectedKeys={favoriteKeys}
          allCandidates={pinCandidates}
          query={normalizedQuery}
          pickerQuery={favoritePickerQuery}
          onPickerQueryChange={setFavoritePickerQuery}
          onAdd={(key) => addPinned(setFavoriteKeys, key)}
          onRemove={(key) => removePinned(setFavoriteKeys, key)}
        />

        <PinnedSection
          title="Quick Action"
          selectedKeys={quickActionKeys}
          allCandidates={quickActionCandidates}
          query={normalizedQuery}
          pickerQuery={quickActionPickerQuery}
          onPickerQueryChange={setQuickActionPickerQuery}
          onAdd={(key) => addPinned(setQuickActionKeys, key)}
          onRemove={(key) => removePinned(setQuickActionKeys, key)}
        />

        <NavMain items={moduleDomainItems} label="Modules" />
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <NavUser
            user={user}
            onUpgrade={onUserUpgrade}
            onAccount={onUserAccount}
            onBilling={onUserBilling}
            onNotifications={onUserNotifications}
            onProfile={onUserProfile}
            onSecurity={onUserSecurity}
            onSettings={onUserSettings}
            onApiKeys={onUserApiKeys}
            onSessions={onUserSessions}
            onIntegrations={onUserIntegrations}
            onAuditLog={onUserAuditLog}
            onRolesPermissions={onUserRolesPermissions}
            onLogout={onUserLogout}
            showUpgrade={!!onUserUpgrade}
          />
        </SidebarFooter>
      )}

      <SidebarRail />
    </Sidebar>
  );
}

export function AppShellLeftRail({
  organizations,
  teams,
  members,
  navMain,
  projects,
  user,
  onOrganizationChange,
  onTeamChange,
  onMemberSelect,
  onAddMember,
  onAddTeam,
  onAddOrganization,
  onProjectView,
  onProjectShare,
  onProjectDelete,
  onShowMoreProjects,
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
}: AppShellLeftRailProps) {
  return (
    <ModernLeftRail
      organizations={organizations}
      teams={teams}
      members={members}
      navMain={navMain}
      projects={projects}
      user={user}
      onOrganizationChange={onOrganizationChange}
      onTeamChange={onTeamChange}
      onMemberSelect={onMemberSelect}
      onAddMember={onAddMember}
      onAddTeam={onAddTeam}
      onAddOrganization={onAddOrganization}
      onProjectView={onProjectView}
      onProjectShare={onProjectShare}
      onProjectDelete={onProjectDelete}
      onShowMoreProjects={onShowMoreProjects}
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
  );
}
