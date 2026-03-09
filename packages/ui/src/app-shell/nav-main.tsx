import { ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "../components";
import type { AppShellNavMainItem } from "./types";

export interface NavMainProps {
  items: AppShellNavMainItem[];
  label?: string;
}

export function NavMain({ items, label = "ERP" }: NavMainProps) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.length === 0 && (
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/60" disabled>
              <span>Empty stack</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )}

        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton
                  tooltip={item.title}
                >
                  {item.icon && <item.icon />}
                  <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  {item.items && (
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[collapsible=icon]:hidden group-data-[state=open]/collapsible:rotate-90" />
                  )}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              {item.items && (
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.length === 0 && (
                      <SidebarMenuSubItem>
                        <SidebarMenuSubButton
                          className="pointer-events-none text-sidebar-foreground/60"
                          aria-disabled="true"
                        >
                          <span>Empty stack</span>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    )}

                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton asChild>
                          <a href={subItem.url}>
                            {subItem.icon && <subItem.icon />}
                            <span>{subItem.title}</span>
                          </a>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              )}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
