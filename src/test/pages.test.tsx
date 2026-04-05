/**
 * Page-level render tests — verify pages mount without crashing and show
 * the correct empty / loading states when hook data is empty.
 *
 * Strategy: mock all data hooks to return empty arrays so tests are
 * fast and deterministic; focus on structure not business logic.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ─── Global mocks (hoisted so they're available before vi.mock) ───────────────

const { mockUpdateProfile, mockUpdatePreferences } = vi.hoisted(() => ({
  mockUpdateProfile: vi.fn().mockResolvedValue({ error: null }),
  mockUpdatePreferences: vi.fn().mockResolvedValue({ error: null }),
}));

// Auth
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1", email: "admin@test.com" },
    profile: { display_name: "Test Admin", role: "admin", avatar_url: null, preferences: {} },
    session: { access_token: "fake-token" },
    loading: false,
    updateProfile: mockUpdateProfile,
    updatePreferences: mockUpdatePreferences,
    refreshProfile: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Data hooks
vi.mock("@/hooks/useProjectData", () => ({
  useProjects: () => ({ data: [], isLoading: false }),
  useRFIs: () => ({ data: [], isLoading: false }),
  useSubmittals: () => ({ data: [], isLoading: false }),
  useChangeOrders: () => ({ data: [], isLoading: false }),
  useDailyReports: () => ({ data: [], isLoading: false }),
  useSubmittalFiles: () => ({ data: [], isLoading: false }),
  useCreateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateRFI: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateRFI: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteRFI: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateSubmittal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSubmittal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteSubmittal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreateChangeOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateChangeOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteChangeOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useVaultData", () => ({
  useProperties: () => ({ data: [], isLoading: false }),
  useLenders: () => ({ data: [], isLoading: false }),
  useTreasuryTransactions: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useOpsData", () => ({
  useBudgets: () => ({ data: [], isLoading: false }),
  useDrawRequests: () => ({ data: [], isLoading: false }),
  useTenants: () => ({ data: [], isLoading: false }),
  useWorkOrders: () => ({ data: [], isLoading: false }),
  useDocuments: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/hooks/useBlenderData", () => ({
  useGeneratedModels: () => ({ data: [], isLoading: false }),
  useBlenderJobs: () => ({ data: [], isLoading: false }),
  useCreateBlenderJob: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBlenderJobStatus: () => ({ data: null }),
}));

vi.mock("@/hooks/useWebhooks", () => ({
  useWebhooks: () => ({ data: [], isLoading: false }),
  useWebhookDeliveries: () => ({ data: [], isLoading: false }),
  useCreateWebhook: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateWebhook: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteWebhook: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useToggleWebhook: () => ({ mutate: vi.fn(), isPending: false }),
  WEBHOOK_EVENTS: [],
}));

// Sonner toast — avoid DOM side-effects in tests
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
  Toaster: () => null,
}));

// AiInsightCard — contains its own Supabase calls; stub it out
vi.mock("@/components/AiInsightCard", () => ({
  AiInsightCard: () => <div data-testid="ai-insight-stub" />,
}));

// Supabase client — prevent real network calls from any un-mocked path
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

// ─── Wrapper helper ───────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
  return Wrapper;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

describe("Dashboard page", () => {
  it("renders heading and KPI cards without crashing", async () => {
    const Dashboard = (await import("@/pages/Dashboard")).default;
    const Wrapper = makeWrapper();
    render(<Dashboard />, { wrapper: Wrapper });
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getAllByText("Active Projects").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open RFIs").length).toBeGreaterThan(0);
  });

  it("shows empty state when no projects exist", async () => {
    const Dashboard = (await import("@/pages/Dashboard")).default;
    const Wrapper = makeWrapper();
    render(<Dashboard />, { wrapper: Wrapper });
    expect(screen.getByText("No active projects.")).toBeInTheDocument();
  });
});

// ─── ProjectsPage ────────────────────────────────────────────────────────────

describe("ProjectsPage", () => {
  it("renders page heading", async () => {
    const ProjectsPage = (await import("@/pages/build/ProjectsPage")).default;
    const Wrapper = makeWrapper();
    render(<ProjectsPage />, { wrapper: Wrapper });
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });

  it("shows empty state when no projects", async () => {
    const ProjectsPage = (await import("@/pages/build/ProjectsPage")).default;
    const Wrapper = makeWrapper();
    render(<ProjectsPage />, { wrapper: Wrapper });
    // Text may appear multiple times (table row + filter count)
    expect(screen.getAllByText(/No projects found/i).length).toBeGreaterThan(0);
  });
});

// ─── RFIsPage ────────────────────────────────────────────────────────────────

describe("RFIsPage", () => {
  it("renders page heading", async () => {
    const RFIsPage = (await import("@/pages/build/RFIsPage")).default;
    const Wrapper = makeWrapper();
    render(<RFIsPage />, { wrapper: Wrapper });
    expect(screen.getByText("RFIs")).toBeInTheDocument();
  });

  it("shows empty state when no RFIs", async () => {
    const RFIsPage = (await import("@/pages/build/RFIsPage")).default;
    const Wrapper = makeWrapper();
    render(<RFIsPage />, { wrapper: Wrapper });
    expect(screen.getAllByText(/No RFIs found/i).length).toBeGreaterThan(0);
  });
});

// ─── SettingsPage ─────────────────────────────────────────────────────────────

describe("SettingsPage", () => {
  it("renders the Settings heading", async () => {
    const SettingsPage = (await import("@/pages/system/SettingsPage")).default;
    const Wrapper = makeWrapper();
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("shows Profile tab by default", async () => {
    const SettingsPage = (await import("@/pages/system/SettingsPage")).default;
    const Wrapper = makeWrapper();
    render(<SettingsPage />, { wrapper: Wrapper });
    expect(screen.getByText("Account")).toBeInTheDocument();
    expect(screen.getByText("Display Name")).toBeInTheDocument();
  });

  it("shows user email in the email field", async () => {
    const SettingsPage = (await import("@/pages/system/SettingsPage")).default;
    const Wrapper = makeWrapper();
    render(<SettingsPage />, { wrapper: Wrapper });
    const emailInput = screen.getByDisplayValue("admin@test.com");
    expect(emailInput).toBeInTheDocument();
    expect(emailInput).toBeDisabled();
  });
});

// ─── AnalyticsPage ────────────────────────────────────────────────────────────

describe("AnalyticsPage", () => {
  it("renders Analytics heading and KPI labels", async () => {
    const AnalyticsPage = (await import("@/pages/ai/AnalyticsPage")).default;
    const Wrapper = makeWrapper();
    render(<AnalyticsPage />, { wrapper: Wrapper });
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Budget Efficiency")).toBeInTheDocument();
    expect(screen.getByText("Avg Progress")).toBeInTheDocument();
  });
});
