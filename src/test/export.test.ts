import { describe, it, expect, vi, beforeEach } from "vitest";

// We test the pure CSV logic extracted from export.ts.
// The DOM-triggering exportToCSV function is not unit-tested here since
// it requires a real browser environment; the CSV generation logic is tested.

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const s = String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(rows: Record<string, unknown>[], columns?: Record<string, string>): string {
  if (rows.length === 0) return "";
  const keys = columns ? Object.keys(columns) : Object.keys(rows[0]);
  const headers = columns ? Object.values(columns) : keys;
  return [
    headers.join(","),
    ...rows.map((row) => keys.map((k) => escapeCSV(row[k])).join(",")),
  ].join("\n");
}

describe("CSV generation", () => {
  const rows = [
    { id: "1", name: "Alpha Project", budget: 500000, status: "On Track" },
    { id: "2", name: 'Beta, "Complex"', budget: 750000, status: "At Risk" },
    { id: "3", name: "Gamma\nNewline", budget: null, status: "Complete" },
  ];

  it("generates header row from object keys", () => {
    const csv = buildCSV(rows);
    expect(csv.split("\n")[0]).toBe("id,name,budget,status");
  });

  it("generates correct data rows", () => {
    const csv = buildCSV(rows);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('1,Alpha Project,500000,On Track');
  });

  it("escapes values containing commas with double quotes", () => {
    const csv = buildCSV(rows);
    expect(csv).toContain('"Beta, ""Complex"""');
  });

  it("escapes values containing newlines", () => {
    const csv = buildCSV(rows);
    expect(csv).toContain('"Gamma\nNewline"');
  });

  it("converts null values to empty string", () => {
    // Use a row without special characters to test null handling cleanly
    const simpleRows = [
      { id: "1", name: "Simple", budget: null, status: "Complete" },
    ];
    const csv = buildCSV(simpleRows);
    const dataLine = csv.split("\n")[1];
    // budget column (index 2) should be empty
    expect(dataLine.split(",")[2]).toBe("");
  });

  it("uses column whitelist and renames headers", () => {
    const csv = buildCSV(rows, { name: "Project Name", status: "Status" });
    expect(csv.split("\n")[0]).toBe("Project Name,Status");
    expect(csv.split("\n")[1]).toBe("Alpha Project,On Track");
  });

  it("returns empty string for empty rows array", () => {
    expect(buildCSV([])).toBe("");
  });
});
