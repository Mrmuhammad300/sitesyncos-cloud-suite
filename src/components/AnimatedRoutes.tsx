import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./PageTransition";
import ModulePage from "@/pages/ModulePage";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const ProjectsPage = lazy(() => import("@/pages/build/ProjectsPage"));
const SchedulePage = lazy(() => import("@/pages/build/SchedulePage"));
const RFIsPage = lazy(() => import("@/pages/build/RFIsPage"));
const SubmittalsPage = lazy(() => import("@/pages/build/SubmittalsPage"));
const ChangeOrdersPage = lazy(() => import("@/pages/build/ChangeOrdersPage"));
const DailyReportsPage = lazy(() => import("@/pages/build/DailyReportsPage"));
const PunchListPage = lazy(() => import("@/pages/build/PunchListPage"));
const PropertiesPage = lazy(() => import("@/pages/vault/PropertiesPage"));
const ROICalculatorPage = lazy(() => import("@/pages/vault/ROICalculatorPage"));
const LenderPortalPage = lazy(() => import("@/pages/vault/LenderPortalPage"));
const CompliancePage = lazy(() => import("@/pages/vault/CompliancePage"));
const TreasuryPage = lazy(() => import("@/pages/treasury/TreasuryPage"));
const BudgetsPage = lazy(() => import("@/pages/ops/BudgetsPage"));
const CostDashboardPage = lazy(() => import("@/pages/ops/CostDashboardPage"));
const DrawRequestsPage = lazy(() => import("@/pages/ops/DrawRequestsPage"));
const TenantsPage = lazy(() => import("@/pages/ops/TenantsPage"));
const WorkOrdersPage = lazy(() => import("@/pages/ops/WorkOrdersPage"));
const DocumentsPage = lazy(() => import("@/pages/ops/DocumentsPage"));
const AgentsPage = lazy(() => import("@/pages/ai/AgentsPage"));
const AnalyticsPage = lazy(() => import("@/pages/ai/AnalyticsPage"));
const SimulatorPage = lazy(() => import("@/pages/ai/SimulatorPage"));
const AIAssistantPage = lazy(() => import("@/pages/ai/AIAssistantPage"));
const AgentCompliancePage = lazy(() => import("@/pages/ai/AgentCompliancePage"));
const ViewerPage = lazy(() => import("@/pages/spatial/ViewerPage"));
const FloorPlansPage = lazy(() => import("@/pages/spatial/FloorPlansPage"));
const GeneratorPage = lazy(() => import("@/pages/spatial/GeneratorPage"));
const ClashAnalysisPage = lazy(() => import("@/pages/spatial/ClashAnalysisPage"));
const DesignAssistantPage = lazy(() => import("@/pages/spatial/DesignAssistantPage"));
const NotificationsPage = lazy(() => import("@/pages/system/NotificationsPage"));
const SettingsPage = lazy(() => import("@/pages/system/SettingsPage"));
const TeamPage = lazy(() => import("@/pages/system/TeamPage"));
const AuditLogPage = lazy(() => import("@/pages/system/AuditLogPage"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const Loading = () => (
  <div className="flex items-center justify-center h-full min-h-[200px]">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

export function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <PageTransition key={location.pathname}>
        <Suspense fallback={<Loading />}>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            {/* Build */}
            <Route path="/build/projects" element={<ProjectsPage />} />
            <Route path="/build/rfis" element={<RFIsPage />} />
            <Route path="/build/submittals" element={<SubmittalsPage />} />
            <Route path="/build/change-orders" element={<ChangeOrdersPage />} />
            <Route path="/build/daily-reports" element={<DailyReportsPage />} />
            <Route path="/build/schedule" element={<SchedulePage />} />
            <Route path="/build/punch-list" element={<PunchListPage />} />
            {/* Vault */}
            <Route path="/vault/properties" element={<PropertiesPage />} />
            <Route path="/vault/roi" element={<ROICalculatorPage />} />
            <Route path="/vault/lender" element={<LenderPortalPage />} />
            <Route path="/vault/compliance" element={<CompliancePage />} />
            {/* Ops */}
            <Route path="/ops/cost-dashboard" element={<CostDashboardPage />} />
            <Route path="/ops/budgets" element={<BudgetsPage />} />
            <Route path="/ops/draws" element={<DrawRequestsPage />} />
            <Route path="/ops/tenants" element={<TenantsPage />} />
            <Route path="/ops/work-orders" element={<WorkOrdersPage />} />
            <Route path="/ops/documents" element={<DocumentsPage />} />
            {/* Treasury */}
            <Route path="/treasury/ledger" element={<TreasuryPage />} />
            <Route path="/treasury/milestones" element={<TreasuryPage />} />
            <Route path="/treasury/approvals" element={<TreasuryPage />} />
            {/* AI */}
            <Route path="/ai/agents" element={<AgentsPage />} />
            <Route path="/ai/analytics" element={<AnalyticsPage />} />
            <Route path="/ai/simulator" element={<SimulatorPage />} />
            <Route path="/ai/compliance" element={<AgentCompliancePage />} />
            <Route path="/ai-assistant" element={<AIAssistantPage />} />
            {/* Spatial */}
            <Route path="/spatial/viewer" element={<ViewerPage />} />
            <Route path="/spatial/plans" element={<FloorPlansPage />} />
            <Route path="/spatial/generator" element={<GeneratorPage />} />
            <Route path="/spatial/clash" element={<ClashAnalysisPage />} />
            <Route path="/spatial/design-assistant" element={<DesignAssistantPage />} />
            {/* System */}
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/audit-log" element={<AuditLogPage />} />
            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </PageTransition>
    </AnimatePresence>
  );
}
