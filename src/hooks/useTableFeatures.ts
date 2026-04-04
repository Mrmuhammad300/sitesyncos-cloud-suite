import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

interface TableFeaturesOptions<T> {
  pageSize?: number;
  defaultSort?: keyof T;
  defaultDir?: SortDir;
}

export function useTableFeatures<T extends { id: string }>(
  data: T[],
  options: TableFeaturesOptions<T> = {}
) {
  const { pageSize = 25, defaultSort, defaultDir = "asc" } = options;

  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSort ?? null);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const rows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: keyof T) => {
    setPage(1);
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelected(
      rows.every((r) => selected.has(r.id))
        ? new Set()
        : new Set(rows.map((r) => r.id))
    );

  const clearSelection = () => setSelected(new Set());

  return {
    rows,
    allSorted: sorted,
    sortKey,
    sortDir,
    toggleSort,
    page: safePage,
    setPage,
    totalPages,
    total,
    pageSize,
    selected,
    selectedItems: data.filter((i) => selected.has(i.id)),
    selectedCount: selected.size,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    isAllSelected: rows.length > 0 && rows.every((r) => selected.has(r.id)),
    isIndeterminate:
      selected.size > 0 && !rows.every((r) => selected.has(r.id)),
  };
}
