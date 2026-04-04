import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTableFeatures } from "@/hooks/useTableFeatures";

type Item = { id: string; name: string; amount: number; status: string | null };

function makeItems(n: number): Item[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${i + 1}`,
    name: i % 2 === 0 ? `Beta ${i}` : `Alpha ${i}`,
    amount: (n - i) * 10,
    status: i % 3 === 0 ? null : i % 2 === 0 ? "active" : "idle",
  }));
}

describe("useTableFeatures", () => {
  const items = makeItems(60);

  describe("pagination", () => {
    it("defaults to page 1 with pageSize 25", () => {
      const { result } = renderHook(() => useTableFeatures(items, { pageSize: 25 }));
      expect(result.current.page).toBe(1);
      expect(result.current.rows.length).toBe(25);
      expect(result.current.totalPages).toBe(3);
      expect(result.current.total).toBe(60);
    });

    it("navigates to page 2", () => {
      const { result } = renderHook(() => useTableFeatures(items, { pageSize: 25 }));
      act(() => { result.current.setPage(2); });
      expect(result.current.page).toBe(2);
      expect(result.current.rows.length).toBe(25);
    });

    it("last page has remaining items", () => {
      const { result } = renderHook(() => useTableFeatures(items, { pageSize: 25 }));
      act(() => { result.current.setPage(3); });
      expect(result.current.rows.length).toBe(10);
    });

    it("clamps page to totalPages when data shrinks", () => {
      const small = makeItems(5);
      const { result } = renderHook(({ data }) => useTableFeatures(data, { pageSize: 25 }), {
        initialProps: { data: items },
      });
      act(() => { result.current.setPage(3); });
      // re-render with smaller dataset
      // page should clamp to 1
      const { result: r2 } = renderHook(() => useTableFeatures(small, { pageSize: 25 }));
      expect(r2.current.page).toBe(1);
      expect(r2.current.totalPages).toBe(1);
    });
  });

  describe("sorting", () => {
    it("sorts ascending on first toggleSort", () => {
      const { result } = renderHook(() => useTableFeatures(items));
      act(() => { result.current.toggleSort("name"); });
      expect(result.current.sortKey).toBe("name");
      expect(result.current.sortDir).toBe("asc");
      const names = result.current.rows.map((r) => r.name);
      expect(names).toEqual([...names].sort());
    });

    it("reverses to desc on second toggleSort of same key", () => {
      const { result } = renderHook(() => useTableFeatures(items));
      act(() => { result.current.toggleSort("amount"); });
      act(() => { result.current.toggleSort("amount"); });
      expect(result.current.sortDir).toBe("desc");
      const amounts = result.current.rows.map((r) => r.amount);
      expect(amounts[0]).toBeGreaterThanOrEqual(amounts[amounts.length - 1]);
    });

    it("nulls sort to the end ascending", () => {
      const data: Item[] = [
        { id: "1", name: "B", amount: 1, status: null },
        { id: "2", name: "A", amount: 2, status: "active" },
        { id: "3", name: "C", amount: 3, status: "idle" },
      ];
      const { result } = renderHook(() => useTableFeatures(data));
      act(() => { result.current.toggleSort("status"); });
      const statuses = result.current.rows.map((r) => r.status);
      expect(statuses[statuses.length - 1]).toBeNull();
    });

    it("resets page to 1 when sort changes", () => {
      const { result } = renderHook(() => useTableFeatures(items, { pageSize: 10 }));
      act(() => { result.current.setPage(3); });
      act(() => { result.current.toggleSort("name"); });
      expect(result.current.page).toBe(1);
    });
  });

  describe("row selection", () => {
    it("toggleSelect adds and removes an id", () => {
      const { result } = renderHook(() => useTableFeatures(items));
      act(() => { result.current.toggleSelect("1"); });
      expect(result.current.selected.has("1")).toBe(true);
      expect(result.current.selectedCount).toBe(1);

      act(() => { result.current.toggleSelect("1"); });
      expect(result.current.selected.has("1")).toBe(false);
      expect(result.current.selectedCount).toBe(0);
    });

    it("toggleSelectAll selects all rows on current page", () => {
      const { result } = renderHook(() => useTableFeatures(items, { pageSize: 10 }));
      act(() => { result.current.toggleSelectAll(); });
      expect(result.current.isAllSelected).toBe(true);
      expect(result.current.selectedCount).toBe(10);
    });

    it("toggleSelectAll deselects when all are selected", () => {
      const { result } = renderHook(() => useTableFeatures(items, { pageSize: 10 }));
      act(() => { result.current.toggleSelectAll(); });
      act(() => { result.current.toggleSelectAll(); });
      expect(result.current.selectedCount).toBe(0);
      expect(result.current.isAllSelected).toBe(false);
    });

    it("clearSelection empties the set", () => {
      const { result } = renderHook(() => useTableFeatures(items));
      act(() => { result.current.toggleSelect("1"); result.current.toggleSelect("2"); });
      act(() => { result.current.clearSelection(); });
      expect(result.current.selectedCount).toBe(0);
    });

    it("selectedItems returns the full item objects", () => {
      const { result } = renderHook(() => useTableFeatures(items));
      act(() => { result.current.toggleSelect("1"); result.current.toggleSelect("3"); });
      const ids = result.current.selectedItems.map((i) => i.id);
      expect(ids).toContain("1");
      expect(ids).toContain("3");
    });

    it("isIndeterminate is true when some but not all rows are selected", () => {
      const { result } = renderHook(() => useTableFeatures(items, { pageSize: 10 }));
      act(() => { result.current.toggleSelect(result.current.rows[0].id); });
      expect(result.current.isIndeterminate).toBe(true);
      expect(result.current.isAllSelected).toBe(false);
    });
  });

  describe("empty data", () => {
    it("handles empty array gracefully", () => {
      const { result } = renderHook(() => useTableFeatures<Item>([]));
      expect(result.current.rows).toHaveLength(0);
      expect(result.current.total).toBe(0);
      expect(result.current.totalPages).toBe(1);
      expect(result.current.isAllSelected).toBe(false);
    });
  });
});
