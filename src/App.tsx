import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import ModulePage from "@/pages/ModulePage";
import LoginPage from "@/pages/auth/LoginPage";
import ProjectsPage from "@/pages/build/ProjectsPage";
import SchedulePage from "@/pages/build/SchedulePage";
import RFIsPage from "@/pages/build/RFIsPage";
import SubmittalsPage from "@/pages/build/SubmittalsPage";
import ChangeOrdersPage from "@/pages/build/ChangeOrdersPage";
import DailyReportsPage from "@/pages/build/DailyReportsPage";
import PropertiesPage from "@/pages/vault/PropertiesPage";
import ROICalculatorPage from "@/pages/vault/ROICalculatorPage";
import LenderPortalPage from "@/pages/vault/LenderPortalPage";
import TreasuryPage from "@/pages/treasury/TreasuryPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const stubModules = [
  { path: "/vault/compliance", title: "Compliance", desc: "Track regulatory compliance and documentation.", module: "SiteSync Vault" },
  { path: "/ops/budgets", title: "Budgets", desc: "Create and manage project and operational budgets.", module: "SiteSync Ops" },
  { path: "/ops/budgets", title: "Budgets", desc: "Create and manage project and operational budgets.", module: "SiteSync Ops" },
  { path: "/ops/draws", title: "Draw Requests", desc: "Submit and approve draw requests with workflows.", module: "SiteSync Ops" },
  { path: "/ops/tenants", title: "Tenants", desc: "Manage tenant leases, contacts, and communications.", module: "SiteSync Ops" },
  { path: "/ops/work-orders", title: "Work Orders", desc: "Create and track maintenance work orders.", module: "SiteSync Ops" },
  { path: "/ops/documents", title: "Documents", desc: "Document management with versioning and search.", module: "SiteSync Ops" },
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
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={
            <AppLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/vault/properties" element={<PropertiesPage />} />
                <Route path="/vault/roi" element={<ROICalculatorPage />} />
                <Route path="/vault/lender" element={<LenderPortalPage />} />
                <Route path="/build/projects" element={<ProjectsPage />} />
                <Route path="/build/rfis" element={<RFIsPage />} />
                <Route path="/build/submittals" element={<SubmittalsPage />} />
                <Route path="/build/change-orders" element={<ChangeOrdersPage />} />
                <Route path="/build/daily-reports" element={<DailyReportsPage />} />
                <Route path="/build/schedule" element={<SchedulePage />} />
                <Route path="/treasury/ledger" element={<TreasuryPage />} />
                <Route path="/treasury/milestones" element={<TreasuryPage />} />
                <Route path="/treasury/approvals" element={<TreasuryPage />} />
                {stubModules.map((m) => (
                  <Route key={m.path} path={m.path} element={<ModulePage title={m.title} description={m.desc} module={m.module} />} />
                ))}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AppLayout>
          } />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
