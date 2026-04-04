import {
  Building2, BarChart3, Wallet, Brain, Box, Users, Home, FileText, HardHat,
  DollarSign, TrendingUp, ClipboardList, Wrench, FolderOpen, Calculator,
  Landmark, Shield, Layers, Cpu, Activity, Compass, Briefcase, CreditCard,
  LayoutDashboard, Settings, Bell, CheckSquare, UserCog, ScrollText
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const moduleGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Notifications", url: "/notifications", icon: Bell },
    ],
  },
  {
    label: "SiteSync Vault",
    items: [
      { title: "Properties", url: "/vault/properties", icon: Building2 },
      { title: "ROI Calculator", url: "/vault/roi", icon: Calculator },
      { title: "Lender Portal", url: "/vault/lender", icon: Landmark },
      { title: "Compliance", url: "/vault/compliance", icon: Shield },
    ],
  },
  {
    label: "SiteSync Build",
    items: [
      { title: "Projects", url: "/build/projects", icon: HardHat },
      { title: "RFIs", url: "/build/rfis", icon: FileText },
      { title: "Submittals", url: "/build/submittals", icon: ClipboardList },
      { title: "Change Orders", url: "/build/change-orders", icon: Layers },
      { title: "Daily Reports", url: "/build/daily-reports", icon: Activity },
      { title: "Schedule", url: "/build/schedule", icon: BarChart3 },
      { title: "Punch List", url: "/build/punch-list", icon: CheckSquare },
    ],
  },
  {
    label: "SiteSync Ops",
    items: [
      { title: "Budgets", url: "/ops/budgets", icon: DollarSign },
      { title: "Draw Requests", url: "/ops/draws", icon: CreditCard },
      { title: "Tenants", url: "/ops/tenants", icon: Users },
      { title: "Work Orders", url: "/ops/work-orders", icon: Wrench },
      { title: "Documents", url: "/ops/documents", icon: FolderOpen },
    ],
  },
  {
    label: "Quantum Ledger",
    items: [
      { title: "Ledger", url: "/treasury/ledger", icon: Wallet },
      { title: "Milestones", url: "/treasury/milestones", icon: TrendingUp },
      { title: "Approvals", url: "/treasury/approvals", icon: Briefcase },
    ],
  },
  {
    label: "AI & Intelligence",
    items: [
      { title: "Agents", url: "/ai/agents", icon: Brain },
      { title: "Analytics", url: "/ai/analytics", icon: Cpu },
      { title: "Simulator", url: "/ai/simulator", icon: Compass },
    ],
  },
  {
    label: "Spatial Workbench",
    items: [
      { title: "3D Viewer", url: "/spatial/viewer", icon: Box },
      { title: "Floor Plans", url: "/spatial/plans", icon: Home },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Team", url: "/team", icon: UserCog },
      { title: "Audit Log", url: "/audit-log", icon: ScrollText },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 py-5">
        <NavLink to="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Building2 className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-sidebar-foreground">BuildOS</span>
              <span className="text-[10px] font-medium uppercase tracking-widest text-sidebar-muted">SiteSync</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {moduleGroups.map((group, gi) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted px-3 mb-1">
              {!collapsed && group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild size="sm">
                      <NavLink
                        to={item.url}
                        end={item.url === "/"}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        activeClassName="bg-sidebar-accent text-sidebar-primary-foreground font-semibold"
                      >
                        <item.icon className="h-4 w-4 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
            {gi < moduleGroups.length - 1 && <Separator className="my-2 bg-sidebar-border" />}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="px-4 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm">
              <NavLink
                to="/settings"
                className="flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
                activeClassName="bg-sidebar-accent text-sidebar-primary-foreground font-semibold"
              >
                <Settings className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Settings</span>}
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
