import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BrandMark } from "@/components/os/BrandMark";
import { MODULES, getRouteMeta, type ModuleKey } from "@/lib/modules";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const COLLAPSE_KEY = "sitesync-nav-collapsed";

function readCollapsed(): Partial<Record<ModuleKey, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const { pathname } = useLocation();
  const activeModule = getRouteMeta(pathname)?.module.key;
  const { profile, user } = useAuth();
  const [closedGroups, setClosedGroups] = useState(readCollapsed);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, JSON.stringify(closedGroups));
    } catch {
      /* ignore */
    }
  }, [closedGroups]);

  // Close the mobile drawer after navigating.
  useEffect(() => {
    if (isMobile) setOpenMobile(false);
  }, [pathname, isMobile, setOpenMobile]);

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Operator";
  const initials = displayName.split(/[\s._-]+/).map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="px-3 pb-2 pt-3.5">
        <NavLink to="/" className="group flex items-center gap-2.5 rounded-lg px-1 py-1" aria-label="SiteSync OS home">
          <BrandMark className="h-8 w-8 shrink-0 transition-transform duration-500 ease-out-expo group-hover:rotate-[-6deg]" />
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-none">
              <span className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-sidebar-foreground">
                SiteSync
                <span className="rounded border border-sidebar-border px-1 py-px font-mono text-[9px] font-medium tracking-widest text-sidebar-muted">
                  OS
                </span>
              </span>
              <span className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-sidebar-muted">
                Build · Operate · Own
              </span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="gap-0 px-2 pb-2">
        {MODULES.map((group) => {
          const isOpen = collapsed || !closedGroups[group.key] || group.key === activeModule;
          const isActiveGroup = group.key === activeModule;
          return (
            <Collapsible
              key={group.key}
              open={isOpen}
              onOpenChange={(o) => setClosedGroups((prev) => ({ ...prev, [group.key]: !o }))}
            >
              <SidebarGroup className="px-0 py-1">
                {!collapsed ? (
                  <CollapsibleTrigger className="group/trigger flex h-7 w-full items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-sidebar-accent/60 focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                    <span className={cn("h-1.5 w-1.5 rounded-[2px]", `bg-${group.tone}`, !isActiveGroup && "opacity-60")} />
                    <span
                      className={cn(
                        "flex-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em]",
                        isActiveGroup ? "text-sidebar-foreground" : "text-sidebar-muted",
                      )}
                    >
                      {group.label}
                    </span>
                    <ChevronRight
                      className={cn(
                        "h-3 w-3 text-sidebar-muted transition-transform duration-200",
                        isOpen && "rotate-90",
                      )}
                    />
                  </CollapsibleTrigger>
                ) : (
                  <div className="mx-auto my-1 h-px w-5 bg-sidebar-border" />
                )}
                <CollapsibleContent className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden">
                  <SidebarGroupContent className="pt-0.5">
                    <SidebarMenu className="gap-px">
                      {group.items.map((item) => {
                        const active = item.url === "/" ? pathname === "/" : pathname === item.url || pathname.startsWith(item.url + "/");
                        return (
                          <SidebarMenuItem key={item.url}>
                            <SidebarMenuButton asChild size="sm" tooltip={item.title} isActive={active} className="h-8">
                              <NavLink
                                to={item.url}
                                end={item.url === "/"}
                                className={cn(
                                  "group/item relative flex items-center gap-2.5 rounded-md px-2 text-[13px] font-normal text-sidebar-foreground/65 transition-colors",
                                  "hover:bg-sidebar-accent hover:text-sidebar-foreground",
                                  active && "bg-sidebar-accent font-medium text-sidebar-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))]",
                                )}
                              >
                                {active && (
                                  <span className={cn("absolute -left-2 top-1.5 bottom-1.5 w-[2px] rounded-full", `bg-${group.tone}`)} />
                                )}
                                <item.icon
                                  className={cn(
                                    "h-[15px] w-[15px] shrink-0 transition-colors",
                                    active ? `text-${group.tone}` : "text-sidebar-muted group-hover/item:text-sidebar-foreground",
                                  )}
                                />
                                <span className="truncate">{item.title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <NavLink
          to="/settings"
          className={cn(
            "flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-sidebar-accent",
            collapsed && "justify-center",
          )}
        >
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary/80 to-mod-vault/80 text-[11px] font-semibold text-primary-foreground">
                {initials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-success" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-medium text-sidebar-foreground">{displayName}</p>
              <p className="truncate font-mono text-[10px] uppercase tracking-wider text-sidebar-muted">
                {(profile?.role ?? "member").replace(/_/g, " ")}
              </p>
            </div>
          )}
        </NavLink>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
