import { describe, expect, it } from "vitest";
import { attentionScore, budgetBurn, buildMonthlySpend, daysUntil, greeting, isRfiOverdue } from "@/lib/dashboard";
import { getRouteMeta, MODULES } from "@/lib/modules";
import { statusTone } from "@/components/os/StatusPill";

const NOW = new Date(2026, 9, 15, 10); // 15 Oct 2026, 10:00 local

describe("buildMonthlySpend", () => {
  it("returns 12 trailing months ending in the current month", () => {
    const m = buildMonthlySpend([], NOW);
    expect(m).toHaveLength(12);
    expect(m[11].key).toBe("2026-10");
    expect(m[0].key).toBe("2025-11");
  });

  it("buckets spend in $M and accumulates", () => {
    const m = buildMonthlySpend(
      [
        { spent: 2_000_000, start_date: "2026-09-03", created_at: "2026-01-01" },
        { spent: 1_500_000, start_date: null, created_at: "2026-10-02T00:00:00Z" },
        { spent: 9_000_000, start_date: "2020-01-01", created_at: "2020-01-01" },
      ],
      NOW,
    );
    expect(m[10]).toMatchObject({ key: "2026-09", spend: 2, cumulative: 2, started: 1 });
    expect(m[11]).toMatchObject({ key: "2026-10", spend: 1.5, cumulative: 3.5, started: 1 });
  });
});

describe("RFI timing", () => {
  it("flags open RFIs past due, ignores answered/closed", () => {
    expect(isRfiOverdue({ status: "Open", due_date: "2026-10-14" }, NOW)).toBe(true);
    expect(isRfiOverdue({ status: "Open", due_date: "2026-10-15" }, NOW)).toBe(false);
    expect(isRfiOverdue({ status: "Answered", due_date: "2026-01-01" }, NOW)).toBe(false);
    expect(isRfiOverdue({ status: "Open", due_date: null }, NOW)).toBe(false);
  });

  it("computes signed day distance", () => {
    expect(daysUntil("2026-10-15", NOW)).toBe(0);
    expect(daysUntil("2026-10-18", NOW)).toBe(3);
    expect(daysUntil("2026-10-12", NOW)).toBe(-3);
    expect(daysUntil(null, NOW)).toBeNull();
  });
});

describe("project scoring", () => {
  it("computes budget burn safely", () => {
    expect(budgetBurn({ budget: 100, spent: 45 })).toBe(45);
    expect(budgetBurn({ budget: 0, spent: 45 })).toBe(0);
  });

  it("ranks behind/over-burning projects above healthy ones", () => {
    const healthy = attentionScore({ status: "On Track", budget: 100, spent: 40, progress: 50 });
    const burning = attentionScore({ status: "On Track", budget: 100, spent: 80, progress: 50 });
    const behind = attentionScore({ status: "Behind", budget: 100, spent: 40, progress: 50 });
    expect(burning).toBeGreaterThan(healthy);
    expect(behind).toBeGreaterThan(burning);
  });

  it("greets by time of day", () => {
    expect(greeting(new Date(2026, 0, 1, 9))).toBe("Good morning");
    expect(greeting(new Date(2026, 0, 1, 14))).toBe("Good afternoon");
    expect(greeting(new Date(2026, 0, 1, 20))).toBe("Good evening");
  });
});

describe("navigation registry", () => {
  it("has unique URLs", () => {
    const urls = MODULES.flatMap((m) => m.items.map((i) => i.url));
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("resolves exact and nested routes", () => {
    expect(getRouteMeta("/build/rfis")?.item.title).toBe("RFIs");
    expect(getRouteMeta("/build/rfis/123")?.module.key).toBe("build");
    expect(getRouteMeta("/")?.item.title).toBe("Dashboard");
    expect(getRouteMeta("/nope")).toBeUndefined();
  });
});

describe("statusTone", () => {
  it("maps common statuses case-insensitively", () => {
    expect(statusTone("On Track")).toBe("success");
    expect(statusTone("overdue")).toBe("destructive");
    expect(statusTone("At Risk")).toBe("warning");
    expect(statusTone("something else")).toBe("neutral");
    expect(statusTone(null)).toBe("neutral");
  });
});
