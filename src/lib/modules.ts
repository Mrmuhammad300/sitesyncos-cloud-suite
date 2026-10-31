import {
  Activity, AlertTriangle, BarChart3, Bell, Box, Brain, Briefcase, Building2, Calculator,
  CheckSquare, ClipboardList, Compass, Cpu, CreditCard, DollarSign, FileText, FolderOpen,
  HardHat, Home, Landmark, Layers, LayoutDashboard, MessageSquare, ScrollText, Settings,
  Shield, ShieldCheck, Sparkles, TrendingUp, UserCog, Users, Wallet, Wand2, Wrench,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for navigation. The sidebar, breadcrumbs, command
 * palette and page headers all derive from this registry, so a route only
 * has to be described once.
 */
export type ModuleKey = "overview" | "vault" | "build" | "ops" | "ledger" | "ai" | "spatial" | "system";

export interface NavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  /** Extra words the command palette should match on. */
  keywords?: string[];
}

export interface ModuleGroup {
  key: ModuleKey;
  label: string;
  short: string;
  tagline: string;
  /** Tailwind color utility suffix, e.g. `mod-build` → `text-mod-build`. */
  tone: string;
  icon: LucideIcon;
  items: NavItem[];
}

export const MODULES: ModuleGroup[] = [
  {
    key: "overview",
    label: "Overview",
    short: "OS",
    tagline: "Command center",
    tone: "mod-system",
    icon: LayoutDashboard,
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard, keywords: ["home", "overview"] },
      { title: "Notifications", url: "/notifications", icon: Bell, keywords: ["alerts", "inbox"] },
      { title: "AI Assistant", url: "/ai-assistant", icon: Sparkles, keywords: ["chat", "copilot", "ask"] },
    ],
  },
  {
    key: "build",
    label: "Build",
    short: "BLD",
    tagline: "Project delivery",
    tone: "mod-build",
    icon: HardHat,
    items: [
      { title: "Projects", url: "/build/projects", icon: HardHat, keywords: ["jobs", "sites"] },
      { title: "Schedule", url: "/build/schedule", icon: BarChart3, keywords: ["gantt", "timeline", "tasks"] },
      { title: "RFIs", url: "/build/rfis", icon: FileText, keywords: ["request for information", "questions"] },
      { title: "Submittals", url: "/build/submittals", icon: ClipboardList, keywords: ["shop drawings", "approvals"] },
      { title: "Change Orders", url: "/build/change-orders", icon: Layers, keywords: ["co", "scope"] },
      { title: "Daily Reports", url: "/build/daily-reports", icon: Activity, keywords: ["logs", "field", "weather"] },
      { title: "Punch List", url: "/build/punch-list", icon: CheckSquare, keywords: ["closeout", "defects"] },
    ],
  },
  {
    key: "ops",
    label: "Ops",
    short: "OPS",
    tagline: "Asset management",
    tone: "mod-ops",
    icon: Settings,
    items: [
      { title: "Cost Dashboard", url: "/ops/cost-dashboard", icon: TrendingUp, keywords: ["spend", "variance"] },
      { title: "Budgets", url: "/ops/budgets", icon: DollarSign, keywords: ["line items", "cost codes"] },
      { title: "Draw Requests", url: "/ops/draws", icon: CreditCard, keywords: ["payments", "pay app"] },
      { title: "Tenants", url: "/ops/tenants", icon: Users, keywords: ["leases", "occupancy"] },
      { title: "Work Orders", url: "/ops/work-orders", icon: Wrench, keywords: ["maintenance", "tickets"] },
      { title: "Documents", url: "/ops/documents", icon: FolderOpen, keywords: ["files", "drawings", "uploads"] },
    ],
  },
  {
    key: "vault",
    label: "Vault",
    short: "VLT",
    tagline: "Investment intelligence",
    tone: "mod-vault",
    icon: Shield,
    items: [
      { title: "Properties", url: "/vault/properties", icon: Building2, keywords: ["portfolio", "assets", "real estate"] },
      { title: "ROI Calculator", url: "/vault/roi", icon: Calculator, keywords: ["returns", "cap rate", "irr"] },
      { title: "Lender Portal", url: "/vault/lender", icon: Landmark, keywords: ["loans", "financing", "debt"] },
      { title: "Compliance", url: "/vault/compliance", icon: Shield, keywords: ["permits", "inspections", "certificates"] },
    ],
  },
  {
    key: "ledger",
    label: "Quantum Ledger",
    short: "LDG",
    tagline: "Treasury & approvals",
    tone: "mod-ledger",
    icon: Wallet,
    items: [
      { title: "Ledger", url: "/treasury/ledger", icon: Wallet, keywords: ["transactions", "treasury"] },
      { title: "Milestones", url: "/treasury/milestones", icon: TrendingUp, keywords: ["payments", "releases"] },
      { title: "Approvals", url: "/treasury/approvals", icon: Briefcase, keywords: ["sign off", "authorize"] },
    ],
  },
  {
    key: "ai",
    label: "Intelligence",
    short: "AI",
    tagline: "Agents & analytics",
    tone: "mod-ai",
    icon: Brain,
    items: [
      { title: "Agents", url: "/ai/agents", icon: Brain, keywords: ["automation", "bots"] },
      { title: "Analytics", url: "/ai/analytics", icon: Cpu, keywords: ["insights", "reports", "kpi"] },
      { title: "Simulator", url: "/ai/simulator", icon: Compass, keywords: ["scenario", "forecast", "monte carlo"] },
      { title: "Automation Compliance", url: "/ai/compliance", icon: ShieldCheck, keywords: ["controls", "governance", "soc2"] },
    ],
  },
  {
    key: "spatial",
    label: "Spatial",
    short: "3D",
    tagline: "BIM workbench",
    tone: "mod-spatial",
    icon: Box,
    items: [
      { title: "3D Viewer", url: "/spatial/viewer", icon: Box, keywords: ["bim", "model", "three"] },
      { title: "Floor Plans", url: "/spatial/plans", icon: Home, keywords: ["layouts", "drawings"] },
      { title: "3D Generator", url: "/spatial/generator", icon: Wand2, keywords: ["blender", "generate"] },
      { title: "Clash Analysis", url: "/spatial/clash", icon: AlertTriangle, keywords: ["clash detection", "conflicts", "mep"] },
      { title: "Design Assistant", url: "/spatial/design-assistant", icon: MessageSquare, keywords: ["design", "chat"] },
    ],
  },
  {
    key: "system",
    label: "System",
    short: "SYS",
    tagline: "Workspace",
    tone: "mod-system",
    icon: Settings,
    items: [
      { title: "Team", url: "/team", icon: UserCog, keywords: ["users", "roles", "members"] },
      { title: "Audit Log", url: "/audit-log", icon: ScrollText, keywords: ["history", "activity", "security"] },
      { title: "Settings", url: "/settings", icon: Settings, keywords: ["preferences", "profile", "theme"] },
    ],
  },
];

export interface RouteMeta {
  module: ModuleGroup;
  item: NavItem;
}

const routeIndex = new Map<string, RouteMeta>();
for (const module of MODULES) {
  for (const item of module.items) routeIndex.set(item.url, { module, item });
}

/** Resolve navigation metadata for a pathname (exact match, then longest prefix). */
export function getRouteMeta(pathname: string): RouteMeta | undefined {
  const exact = routeIndex.get(pathname);
  if (exact) return exact;
  let best: RouteMeta | undefined;
  let bestLen = 0;
  for (const [url, meta] of routeIndex) {
    if (url !== "/" && pathname.startsWith(url) && url.length > bestLen) {
      best = meta;
      bestLen = url.length;
    }
  }
  return best;
}

export function getModule(key: ModuleKey): ModuleGroup {
  return MODULES.find((m) => m.key === key)!;
}
