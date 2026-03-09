"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  Plus,
  Search,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  ScrollArea,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useSidebar,
} from "../components";
import type {
  AppShellMember,
  AppShellOrganization,
  AppShellTeam,
} from "./types";

const rowClassName = "rounded-lg px-2 py-2";
const iconBoxClassName =
  "mr-3 flex size-8 items-center justify-center rounded-lg border bg-background";
const addIconBoxClassName =
  "mr-3 flex size-8 items-center justify-center rounded-lg border border-dashed bg-background";

export interface NavTeamSwitcherProps {
  organizations?: AppShellOrganization[];
  teams: AppShellTeam[];
  members?: AppShellMember[];
  onOrganizationChange?: (organization: AppShellOrganization) => void;
  onTeamChange?: (team: AppShellTeam) => void;
  onMemberSelect?: (member: AppShellMember) => void;
  onAddMember?: () => void;
  onAddTeam?: () => void;
  onAddOrganization?: () => void;
}

export function NavTeamSwitcher({
  organizations = [],
  teams,
  members = [],
  onOrganizationChange,
  onTeamChange,
  onMemberSelect,
  onAddMember,
  onAddTeam,
  onAddOrganization,
}: NavTeamSwitcherProps) {
  type SelectorTab = "organizations" | "teams" | "members";

  const { isMobile } = useSidebar();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SelectorTab>(() => {
    if (organizations.length > 0) return "organizations";
    if (teams.length > 0) return "teams";
    return "members";
  });

  const [activeOrganization, setActiveOrganization] =
    useState<AppShellOrganization | undefined>(organizations[0]);
  const [activeTeam, setActiveTeam] = useState<AppShellTeam | undefined>(teams[0]);

  useEffect(() => {
    if (organizations.length === 0) {
      setActiveOrganization(undefined);
      return;
    }

    const nextOrg =
      activeOrganization &&
      organizations.find((org) => org.name === activeOrganization.name);

    setActiveOrganization(nextOrg ?? organizations[0]);
  }, [organizations, activeOrganization]);

  useEffect(() => {
    if (teams.length === 0) {
      setActiveTeam(undefined);
      return;
    }

    const nextTeam =
      activeTeam && teams.find((team) => team.name === activeTeam.name);

    setActiveTeam(nextTeam ?? teams[0]);
  }, [teams, activeTeam]);

  if (!activeTeam && !activeOrganization) {
    return null;
  }

  const CurrentLogo = activeOrganization?.logo ?? activeTeam?.logo ?? Building2;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredOrganizations = useMemo(() => {
    if (!normalizedQuery) return organizations;
    return organizations.filter((organization) =>
      organization.name.toLowerCase().includes(normalizedQuery)
    );
  }, [organizations, normalizedQuery]);

  const filteredTeams = useMemo(() => {
    if (!normalizedQuery) return teams;
    return teams.filter((team) => {
      const haystack = `${team.name} ${team.plan ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [teams, normalizedQuery]);

  const filteredMembers = useMemo(() => {
    if (!normalizedQuery) return members;
    return members.filter((member) => {
      const haystack = `${member.name} ${member.email} ${member.role ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [members, normalizedQuery]);

  const handleOrganizationSelect = (organization: AppShellOrganization) => {
    setActiveOrganization(organization);
    onOrganizationChange?.(organization);
  };

  const handleTeamSelect = (team: AppShellTeam) => {
    setActiveTeam(team);
    onTeamChange?.(team);
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={activeOrganization?.name ?? activeTeam?.name ?? "Organization"}
              className={[
                "h-15 rounded-xl border border-sidebar-border/70 bg-sidebar/50",
                "px-3 shadow-sm transition-all",
                "hover:bg-sidebar-accent/60 hover:border-sidebar-border",
                "data-[state=open]:bg-sidebar-accent",
                "data-[state=open]:border-sidebar-border",
                "data-[state=open]:text-sidebar-accent-foreground",
                "group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:rounded-md",
                "group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent",
                "group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:shadow-none",
              ].join(" ")}
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <CurrentLogo className="size-4" />
              </div>

              <div className="grid min-w-0 flex-1 gap-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold leading-none">
                  {activeOrganization?.name ?? activeTeam?.name}
                </span>

                <div className="flex min-w-0 flex-wrap items-center gap-1">
                  <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-medium">
                    {activeTeam?.name ?? "No team"}
                  </Badge>

                  {activeTeam?.plan ? (
                    <Badge
                      variant="outline"
                      className="hidden h-5 rounded-md px-1.5 text-[10px] font-medium sm:inline-flex"
                    >
                      {activeTeam.plan}
                    </Badge>
                  ) : null}

                  <Badge
                    variant="outline"
                    className="hidden h-5 rounded-md px-1.5 text-[10px] font-medium md:inline-flex"
                  >
                    {members.length} member{members.length === 1 ? "" : "s"}
                  </Badge>
                </div>
              </div>

              <ChevronDown className="size-4 shrink-0 text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={8}
            className="w-96 overflow-hidden rounded-2xl border bg-popover p-0 shadow-xl"
          >
            <div className="border-b bg-popover/95 p-3">
              <div className="rounded-xl border bg-muted/30 p-3">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <CurrentLogo className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {activeOrganization?.name ?? "No organization selected"}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {activeTeam?.name ?? "No team selected"}
                    </div>
                  </div>

                  {activeTeam?.plan ? (
                    <Badge variant="secondary" className="rounded-md px-2 py-0.5 text-xs">
                      {activeTeam.plan}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search organizations, teams, members"
                  className="h-9 pl-8"
                />
              </div>
            </div>

            <div className="p-2 pb-3">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SelectorTab)}>
                <TabsList className="grid h-9 w-full grid-cols-3">
                  <TabsTrigger value="organizations">
                    Organizations
                  </TabsTrigger>
                  <TabsTrigger value="teams">
                    Teams
                  </TabsTrigger>
                  <TabsTrigger value="members">
                    Members
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="organizations" className="mt-2">
                  <ScrollArea className="h-72 pr-1">
                    <DropdownMenuGroup>
                      {filteredOrganizations.length > 0 ? (
                        filteredOrganizations.map((organization) => (
                          <DropdownMenuItem
                            key={organization.name}
                            onClick={() => handleOrganizationSelect(organization)}
                            className={rowClassName}
                          >
                            <div className={iconBoxClassName}>
                              <organization.logo className="size-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{organization.name}</div>
                            </div>

                            {activeOrganization?.name === organization.name ? (
                              <Check className="size-4 text-muted-foreground" />
                            ) : null}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled className={rowClassName}>
                          <div className={iconBoxClassName}>
                            <Building2 className="size-4" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {organizations.length > 0 ? "No organizations found" : "No organizations"}
                          </span>
                        </DropdownMenuItem>
                      )}

                      {onAddOrganization && (
                        <DropdownMenuItem onClick={onAddOrganization} className={rowClassName}>
                          <div className={addIconBoxClassName}>
                            <Plus className="size-4" />
                          </div>
                          <span className="text-sm font-medium">Add organization</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="teams" className="mt-2">
                  <ScrollArea className="h-72 pr-1">
                    <DropdownMenuGroup>
                      {filteredTeams.length > 0 ? (
                        filteredTeams.map((team) => (
                          <DropdownMenuItem
                            key={team.name}
                            onClick={() => handleTeamSelect(team)}
                            className={rowClassName}
                          >
                            <div className={iconBoxClassName}>
                              <team.logo className="size-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{team.name}</div>
                              {team.plan ? (
                                <div className="truncate text-xs text-muted-foreground">{team.plan}</div>
                              ) : null}
                            </div>

                            {activeTeam?.name === team.name ? (
                              <Check className="size-4 text-muted-foreground" />
                            ) : null}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled className={rowClassName}>
                          <div className={iconBoxClassName}>
                            <Users className="size-4" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {teams.length > 0 ? "No teams found" : "No teams available"}
                          </span>
                        </DropdownMenuItem>
                      )}

                      {onAddTeam && (
                        <DropdownMenuItem onClick={onAddTeam} className={rowClassName}>
                          <div className={addIconBoxClassName}>
                            <Plus className="size-4" />
                          </div>
                          <span className="text-sm font-medium">Add team</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="members" className="mt-2">
                  <ScrollArea className="h-72 pr-1">
                    <DropdownMenuGroup>
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => (
                          <DropdownMenuItem
                            key={member.id}
                            onClick={() => onMemberSelect?.(member)}
                            className={rowClassName}
                          >
                            <div className={iconBoxClassName}>
                              <User className="size-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{member.name}</div>
                              <div className="truncate text-xs text-muted-foreground">{member.email}</div>
                            </div>

                            {member.role ? (
                              <span className="ml-2 text-xs text-muted-foreground">{member.role}</span>
                            ) : null}
                          </DropdownMenuItem>
                        ))
                      ) : (
                        <DropdownMenuItem disabled className={rowClassName}>
                          <div className={iconBoxClassName}>
                            <User className="size-4" />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {members.length > 0 ? "No members found" : "No members yet"}
                          </span>
                        </DropdownMenuItem>
                      )}

                      {onAddMember && (
                        <DropdownMenuItem onClick={onAddMember} className={rowClassName}>
                          <div className={addIconBoxClassName}>
                            <UserPlus className="size-4" />
                          </div>
                          <span className="text-sm font-medium">Add member</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuGroup>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
