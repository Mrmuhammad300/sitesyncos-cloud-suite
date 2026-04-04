/**
 * Tests for the webhook system hooks
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: mockFrom,
  },
}));

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

function buildChain(resolveWith: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(resolveWith),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolveWith),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
  };
}

describe("useWebhooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fetches webhooks list", async () => {
    const hooks = [
      {
        id: "wh1",
        name: "Procore Integration",
        url: "https://api.procore.com/webhooks/sitesyncos",
        events: ["rfi.created", "change_order.approved"],
        is_active: true,
      },
    ];
    mockFrom.mockReturnValue(buildChain({ data: hooks, error: null }));

    const { useWebhooks } = await import("@/hooks/useWebhooks");
    const { result } = renderHook(() => useWebhooks(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].name).toBe("Procore Integration");
  });

  it("returns empty array on error", async () => {
    mockFrom.mockReturnValue(buildChain({ data: null, error: { message: "Permission denied" } }));

    const { useWebhooks } = await import("@/hooks/useWebhooks");
    const { result } = renderHook(() => useWebhooks(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("WEBHOOK_EVENTS", () => {
  it("exports the expected event types", async () => {
    const { WEBHOOK_EVENTS } = await import("@/hooks/useWebhooks");
    expect(WEBHOOK_EVENTS).toContain("rfi.created");
    expect(WEBHOOK_EVENTS).toContain("draw_request.approved");
    expect(WEBHOOK_EVENTS).toContain("change_order.approved");
    expect(WEBHOOK_EVENTS).toContain("project.status_changed");
  });
});
