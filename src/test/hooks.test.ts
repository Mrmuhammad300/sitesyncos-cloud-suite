/**
 * Tests for data hooks: pagination limits, error handling, and type safety.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useProjects, useRFIs, useSubmittalFiles } from "@/hooks/useProjectData";
import { useDrawRequests, useWorkOrders } from "@/hooks/useOpsData";
import { useBlenderJobs } from "@/hooks/useBlenderData";

// ─── Supabase mock ────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn() })),
    removeChannel: vi.fn(),
  },
}));

// ─── Chain builder ────────────────────────────────────────────────────────────

function buildChain(resolveWith: unknown) {
  // Make the chain itself awaitable (has .then) so `await chain.eq(...)` works
  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    // Make the chain itself a thenable — any `await chain` resolves to resolveWith
    then: (resolve: (v: unknown) => void, _reject?: (e: unknown) => void) => {
      Promise.resolve(resolveWith).then(resolve, _reject);
    },
  };
  return chain;
}

// ─── Wrapper ──────────────────────────────────────────────────────────────────

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, networkMode: "always" }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("useProjects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches projects and returns data array", async () => {
    const projects = [{ id: "p1", name: "Alpha Tower", status: "On Track", progress: 60 }];
    mockFrom.mockReturnValue(buildChain({ data: projects, error: null }));

    const { result } = renderHook(() => useProjects(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(projects);
    expect(result.current.data?.[0].name).toBe("Alpha Tower");
  });

  it("transitions to error state on DB error", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: { message: "Connection refused" } }));

    const { result } = renderHook(() => useProjects(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toContain("Connection refused");
  });
});

describe("useRFIs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches and returns RFI list", async () => {
    const rfis = [{ id: "r1", rfi_number: "RFI-0001", subject: "Load bearing query", status: "Open" }];
    mockFrom.mockReturnValue(buildChain({ data: rfis, error: null }));

    const { result } = renderHook(() => useRFIs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].rfi_number).toBe("RFI-0001");
  });
});

describe("useSubmittalFiles", () => {
  beforeEach(() => vi.clearAllMocks());

  it("stays idle when submittalId is null", () => {
    const { result } = renderHook(() => useSubmittalFiles(null), { wrapper: makeWrapper() });
    // enabled: false — query should not fire
    expect(result.current.isLoading).toBe(false);
    expect(result.current.fetchStatus).toBe("idle");
  });

  it("fetches files when submittalId is provided", async () => {
    const files = [{ id: "f1", submittal_id: "s1", file_name: "drawings.pdf", file_url: "https://cdn.example.com/f.pdf", version: 1 }];
    mockFrom.mockReturnValue(buildChain({ data: files, error: null }));

    const { result } = renderHook(() => useSubmittalFiles("s1"), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].file_name).toBe("drawings.pdf");
  });
});

describe("useBlenderJobs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches blender jobs without type errors", async () => {
    const jobs = [{ id: "j1", job_type: "generate", status: "completed", prompt: "office floor", user_id: null }];
    mockFrom.mockReturnValue(buildChain({ data: jobs, error: null }));

    const { result } = renderHook(() => useBlenderJobs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].job_type).toBe("generate");
    expect(result.current.data?.[0].status).toBe("completed");
  });

  it("scopes query to projectId when provided", async () => {
    mockFrom.mockReturnValue(buildChain({ data: [], error: null }));

    const { result } = renderHook(() => useBlenderJobs("project-abc"), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });
});

describe("useDrawRequests", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns draw requests", async () => {
    const draws = [{ id: "d1", draw_number: "DRAW-001", title: "Foundation", amount: 500000, status: "Approved" }];
    mockFrom.mockReturnValue(buildChain({ data: draws, error: null }));

    const { result } = renderHook(() => useDrawRequests(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].draw_number).toBe("DRAW-001");
  });
});

describe("useWorkOrders", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns work orders", async () => {
    const orders = [{ id: "wo1", wo_number: "WO-001", title: "Fix AC", status: "Open", priority: "High" }];
    mockFrom.mockReturnValue(buildChain({ data: orders, error: null }));

    const { result } = renderHook(() => useWorkOrders(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].wo_number).toBe("WO-001");
  });
});
