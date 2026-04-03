import { describe, it, expect } from "vitest";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type Property = Database["public"]["Tables"]["properties"]["Row"];

// Pure helper functions extracted from Dashboard logic — tested independently

function countActiveProjects(projects: Pick<Project, "status">[]): number {
  return projects.filter(p => p.status !== "Complete").length;
}

function sumPortfolioValue(properties: Pick<Property, "price">[]): number {
  return properties.reduce((s, p) => s + Number(p.price), 0);
}

function averageProgress(projects: Pick<Project, "progress">[]): number {
  if (projects.length === 0) return 0;
  return Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length);
}

function buildStatusCounts(
  projects: Pick<Project, "status">[],
  statuses: string[]
): { name: string; value: number }[] {
  return statuses
    .map(name => ({ name, value: projects.filter(p => p.status === name).length }))
    .filter(s => s.value > 0);
}

describe("Dashboard data helpers", () => {
  describe("countActiveProjects", () => {
    it("counts projects that are not Complete", () => {
      const projects = [
        { status: "On Track" },
        { status: "Complete" },
        { status: "At Risk" },
      ];
      expect(countActiveProjects(projects)).toBe(2);
    });

    it("returns 0 when all projects are Complete", () => {
      expect(countActiveProjects([{ status: "Complete" }, { status: "Complete" }])).toBe(0);
    });

    it("returns 0 for empty array", () => {
      expect(countActiveProjects([])).toBe(0);
    });
  });

  describe("sumPortfolioValue", () => {
    it("sums property prices correctly", () => {
      const props = [{ price: 1_000_000 }, { price: 2_500_000 }];
      expect(sumPortfolioValue(props)).toBe(3_500_000);
    });

    it("handles string-coerced numbers", () => {
      // Supabase sometimes returns numeric fields as strings
      const props = [{ price: "500000" as unknown as number }];
      expect(sumPortfolioValue(props)).toBe(500_000);
    });

    it("returns 0 for empty array", () => {
      expect(sumPortfolioValue([])).toBe(0);
    });
  });

  describe("averageProgress", () => {
    it("calculates the average and rounds", () => {
      expect(averageProgress([{ progress: 30 }, { progress: 70 }])).toBe(50);
      expect(averageProgress([{ progress: 33 }, { progress: 34 }])).toBe(34);
    });

    it("returns 0 for empty array", () => {
      expect(averageProgress([])).toBe(0);
    });
  });

  describe("buildStatusCounts", () => {
    const projects = [
      { status: "On Track" },
      { status: "On Track" },
      { status: "At Risk" },
      { status: "Complete" },
    ];

    it("counts each status correctly", () => {
      const result = buildStatusCounts(projects, ["On Track", "At Risk", "Behind", "Complete"]);
      expect(result).toEqual(
        expect.arrayContaining([
          { name: "On Track", value: 2 },
          { name: "At Risk", value: 1 },
          { name: "Complete", value: 1 },
        ])
      );
    });

    it("excludes statuses with zero count", () => {
      const result = buildStatusCounts(projects, ["On Track", "At Risk", "Behind", "Complete"]);
      expect(result.find(s => s.name === "Behind")).toBeUndefined();
    });

    it("returns empty array when projects list is empty", () => {
      expect(buildStatusCounts([], ["On Track", "At Risk"])).toEqual([]);
    });
  });
});
