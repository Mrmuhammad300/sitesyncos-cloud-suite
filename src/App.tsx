import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ModulePage from "@/pages/ModulePage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const modules = [
  { path: "/vault/properties", title: "Properties", desc: "Manage your property portfolio and acquisition pipeline.", module: "SiteSync Vault" },
  { path: "/vault/roi", title: "ROI Calculator", desc: "Analyze returns with NPV, IRR, and Cap Rate models.", module: "SiteSync Vault" },
  { path: "/vault/lender", title: "Lender Portal", desc: "Manage lender relationships and compliance tracking.", module: "SiteSync Vault" },
  { path: "/vault/compliance", title: "Compliance", desc: "Track regulatory compliance and documentation.", module: "SiteSync Vault" },
  { path: "/build/projects", title: "Projects", desc: "Manage construction projects from inception to close-out.", module: "SiteSync Build" },
  { path: "/build/rfis", title: "RFIs", desc: "Track requests for information across all projects.", module: "SiteSync Build" },
  { path: "/build/submittals", title: "Submittals", desc: "Manage submittal workflows and approvals.", module: "SiteSync Build" },
  { path: "/build/change-orders", title: "Change Orders", desc: "Process and track construction change orders.", module: "SiteSync Build" },
  { path: "/build/daily-reports", title: "Daily Reports", desc: "Field reports, weather logs, and crew tracking.", module: "SiteSync Build" },
  { path: "/build/schedule", title: "Schedule", desc: "Gantt scheduling with dependencies and milestones.", module: "SiteSync Build" },
  { path: "/ops/budgets", title: "Budgets", desc: "Create and manage project and operational budgets.", module: "SiteSync Ops" },
  { path: "/ops/draws", title: "Draw Requests", desc: "Submit and approve draw requests with workflows.", module: "SiteSync Ops" },
  { path: "/ops/tenants", title: "Tenants", desc: "Manage tenant leases, contacts, and communications.", module: "SiteSync Ops" },
  { path: "/ops/work-orders", title: "Work Orders", desc: "Create and track maintenance work orders.", module: "SiteSync Ops" },
  { path: "/ops/documents", title: "Documents", desc: "Document management with versioning and search.", module: "SiteSync Ops" },
  { path: "/treasury/ledger", title: "Quantum Ledger", desc: "Event-driven double-entry accounting ledger.", module: "Quantum Ledger" },
  { path: "/treasury/milestones", title: "Milestones", desc: "Track financial and project milestones.", module: "Quantum Ledger" },
  { path: "/treasury/approvals", title: "Approvals", desc: "Manage approval workflows and thresholds.", module: "Quantum Ledger" },
  { path: "/ai/agents", title: "AI Agents", desc: "Multi-agent orchestration for risk, cost, and compliance.", module: "AI & Intelligence" },
  { path: "/ai/analytics", title: "Analytics", desc: "AI-powered analytics and insights dashboard.", module: "AI & Intelligence" },
  { path: "/ai/simulator", title: "Scenario Simulator", desc: "Run what-if scenarios for cost and schedule.", module: "AI & Intelligence" },
  { path: "/spatial/viewer", title: "3D Viewer", desc: "Interactive 3D building models and visualization.", module: "Spatial Workbench" },
  { path: "/spatial/plans", title: "Floor Plans", desc: "Generate and view parametric floor plans.", module: "Spatial Workbench" },
  { path: "/notifications", title: "Notifications", desc: "View all system notifications and alerts.", module: "System" },
  { path: "/settings", title: "Settings", desc: "Platform configuration and user preferences.", module: "System" },
];

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            {modules.map((m) => (
              <Route
                key={m.path}
                path={m.path}
                element={<ModulePage title={m.title} description={m.desc} module={m.module} />}
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
