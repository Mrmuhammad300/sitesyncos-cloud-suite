import { useMemo, useState } from "react";
import { fmtDollar, cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Wallet, TrendingUp, AlertTriangle, Gauge, Sparkles, Trash2, Download, PiggyBank } from "lucide-react";
import { useBudgets, useCreateBudget, useDeleteBudget } from "@/hooks/useOpsData";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { AiInsightCard } from "@/components/AiInsightCard";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { exportToCSV } from "@/lib/export";
import { EmptyState, Meter, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar } from "@/components/os";
import { DetailGrid, DetailItem, FilterChips, FormField, LegendDot, NoResults, PanelBar, Shimmer, TableSkeleton } from "@/components/ops/OpsKit";
import { countBy, fmtMoney, pctOf, statusOptions } from "@/components/ops/format";

type Budget = Tables<"budgets">;

const CANONICAL = ["Active", "Draft", "Closed", "Over Budget"] as const;

const BudgetsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "", description: "", allocated: "", fiscal_year: "" });
  const { data: budgets = [], isLoading } = useBudgets();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();
  const { user } = useAuth();

  const filters = useMemo(() => statusOptions(CANONICAL, budgets.map((b) => b.status)), [budgets]);
  const counts = useMemo(() => countBy(budgets, (b) => b.status), [budgets]);

  const filtered = budgets.filter(
    (b) => (filter === "All" || b.status === filter) && b.category.toLowerCase().includes(search.toLowerCase())
  );

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
  } = useTableFeatures<Budget>(filtered, { pageSize: 25 });

  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent), 0);
  const utilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;
  const overBudget = budgets.filter((b) => Number(b.spent) > Number(b.allocated));
  const remaining = totalAllocated - totalSpent;

  // Allocation vs spent, grouped by category, sorted by remaining runway (tightest first)
  const allocation = useMemo(() => {
    const m: Record<string, { allocated: number; spent: number; lines: number }> = {};
    budgets.forEach((b) => {
      m[b.category] ??= { allocated: 0, spent: 0, lines: 0 };
      m[b.category].allocated += Number(b.allocated);
      m[b.category].spent += Number(b.spent);
      m[b.category].lines += 1;
    });
    return Object.entries(m)
      .map(([category, d]) => ({ category, ...d, remaining: d.allocated - d.spent, pct: pctOf(d.spent, d.allocated) }))
      .sort((a, b) => b.pct - a.pct);
  }, [budgets]);
  const maxAlloc = Math.max(1, ...allocation.map((a) => Math.max(a.allocated, a.spent)));

  const sortProps = (key: keyof Budget) => ({
    sortKey: key as string,
    currentKey: String(sortKey ?? ""),
    currentDir: sortDir,
    onSort: (k: string) => toggleSort(k as keyof Budget),
  });

  const handleCreate = () => {
    if (!form.category) return;
    createBudget.mutate({
      category: form.category,
      description: form.description || null,
      allocated: Number(form.allocated) || 0,
      fiscal_year: form.fiscal_year || null,
      created_by: user?.id || null,
    });
    setCreateOpen(false);
    setForm({ category: "", description: "", allocated: "", fiscal_year: "" });
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "budgets", {
      category: "Category", status: "Status", allocated: "Allocated",
      spent: "Spent", fiscal_year: "Fiscal Year",
    });
  };

  const resetFilters = () => { setSearch(""); setFilter("All"); };
  const detailPct = detail ? pctOf(Number(detail.spent), Number(detail.allocated)) : 0;
  const detailRemaining = detail ? Number(detail.allocated) - Number(detail.spent) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budgets"
        description="Allocate cost categories, track spend against them and see how much runway each line has left."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />Export</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus />New budget</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total allocated" value={fmtDollar(totalAllocated)} icon={Wallet} tone="data" hint={`${budgets.length} budget line${budgets.length === 1 ? "" : "s"}`} loading={isLoading} />
        <StatCard label="Total spent" value={fmtDollar(totalSpent)} icon={TrendingUp} hint={`${utilization}% utilised`} loading={isLoading} />
        <StatCard
          label="Remaining"
          value={fmtDollar(remaining)}
          icon={PiggyBank}
          tone={remaining >= 0 ? "success" : "destructive"}
          hint={totalAllocated > 0 ? `${Math.max(0, 100 - utilization)}% of allocation left` : "Nothing allocated"}
          loading={isLoading}
        />
        <StatCard
          label="Over budget"
          value={overBudget.length}
          icon={AlertTriangle}
          tone={overBudget.length ? "destructive" : "default"}
          hint={overBudget.length ? `${fmtDollar(overBudget.reduce((s, b) => s + Number(b.spent) - Number(b.allocated), 0))} overspend` : "All lines within budget"}
          loading={isLoading}
        />
      </section>

      <section className="grid grid-cols-1 items-start gap-3 xl:grid-cols-3">
        <Panel
          className="xl:col-span-2"
          eyebrow="Allocation vs spent"
          title="Runway by category"
          actions={
            <div className="hidden items-center gap-3 sm:flex">
              <LegendDot className="bg-data">Spent</LegendDot>
              <LegendDot className="bg-secondary ring-1 ring-border-strong">Remaining</LegendDot>
            </div>
          }
        >
          {isLoading ? (
            <div className="space-y-4">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-9 w-full" />)}</div>
          ) : allocation.length === 0 ? (
            <EmptyState
              compact
              icon={Gauge}
              title="Nothing allocated yet"
              description="Create a budget line to see spend against allocation and remaining runway."
              action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus />New budget</Button>}
            />
          ) : (
            <>
            <ul className="-mx-2 divide-y divide-border/50">
              {allocation.map((a) => {
                const width = (a.allocated / maxAlloc) * 100;
                const spentW = a.allocated > 0 ? Math.min(a.spent / a.allocated, 1) * 100 : 100;
                const over = a.remaining < 0;
                const left = Math.max(0, 100 - a.pct);
                return (
                  <li
                    key={a.category}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2/50 sm:grid-cols-[150px_minmax(0,1fr)_120px_110px]"
                  >
                    <span className="min-w-0 truncate text-[13px] font-medium">{a.category}</span>
                    <span
                      className={cn(
                        "text-right font-mono text-[11px] font-medium tabular-nums sm:order-last",
                        over ? "text-destructive" : left <= 15 ? "text-warning" : "text-foreground",
                      )}
                    >
                      {over ? `${fmtDollar(-a.remaining)} over` : `${fmtDollar(a.remaining)} · ${left}%`}
                    </span>
                    <div className="col-span-2 sm:col-span-1">
                      <div
                        className="relative flex h-2.5 overflow-hidden rounded-[3px] bg-secondary"
                        style={{ width: `${Math.max(width, 6)}%` }}
                        role="img"
                        aria-label={`${a.category}: ${a.pct}% spent`}
                      >
                        <div
                          className={cn(
                            "h-full transition-[width] duration-700 ease-out-expo",
                            over ? "bg-destructive" : a.pct >= 85 ? "bg-warning" : "bg-data",
                          )}
                          style={{ width: `${spentW}%` }}
                        />
                      </div>
                    </div>
                    <span className="hidden text-right font-mono text-[11px] tabular-nums text-muted-foreground sm:block">
                      {fmtDollar(a.spent)} <span className="text-muted-foreground/60">/</span> {fmtDollar(a.allocated)}
                    </span>
                  </li>
                );
              })}
            </ul>
            <p className="pt-2 text-[11px] text-muted-foreground">Remaining shown as dollars · % of allocation left. Tightest lines first.</p>
            </>
          )}
        </Panel>

        <AiInsightCard
          type="budget-monitor"
          title="Quantum Ledger — Budget Analysis"
          agentName="Quantum Ledger"
          icon={<Sparkles className="h-4 w-4 text-mod-ai" />}
        />
      </section>

      <Panel
        flush
        eyebrow="Ledger"
        title="All budget lines"
        actions={<span className="font-mono text-[11px] tabular-nums text-muted-foreground">{filtered.length} of {budgets.length}</span>}
      >
        <PanelBar>
          <Toolbar className="min-w-0 flex-1">
            <SearchField value={search} onChange={setSearch} placeholder="Search categories…" />
          </Toolbar>
          <FilterChips options={filters} value={filter} onChange={setFilter} counts={counts} />
        </PanelBar>
        {isLoading ? (
          <TableSkeleton />
        ) : budgets.length === 0 ? (
          <div className="border-t p-4 sm:p-5">
            <EmptyState
              icon={Wallet}
              title="No budgets yet"
              description="Budgets anchor the cost dashboard and draw approvals. Start with your largest cost category."
              action={<Button onClick={() => setCreateOpen(true)}><Plus />Create first budget</Button>}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t"><NoResults query={search} onReset={resetFilters} noun="budgets" /></div>
        ) : (
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Category" {...sortProps("category")} />
                  <SortableHeader label="Status" {...sortProps("status")} className="hidden sm:table-cell" />
                  <SortableHeader label="Allocated" {...sortProps("allocated")} className="hidden text-right md:table-cell" />
                  <SortableHeader label="Spent" {...sortProps("spent")} className="hidden text-right md:table-cell" />
                  <TableHead className="min-w-[132px]">Utilisation</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Remaining</TableHead>
                  <SortableHeader label="FY" {...sortProps("fiscal_year")} className="hidden lg:table-cell" />
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => {
                  const pct = Number(b.allocated) > 0 ? Math.round((Number(b.spent) / Number(b.allocated)) * 100) : 0;
                  const rem = Number(b.allocated) - Number(b.spent);
                  return (
                    <TableRow key={b.id} className="cursor-pointer" onClick={() => setDetail(b)}>
                      <TableCell className="max-w-[220px]">
                        <div className="truncate font-medium">{b.category}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {b.description || <span className="font-mono tabular-nums md:hidden">{fmtDollar(Number(b.spent))} of {fmtDollar(Number(b.allocated))}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell"><StatusPill status={b.status} /></TableCell>
                      <TableCell className="hidden text-right font-mono tabular-nums md:table-cell">{fmtMoney(Number(b.allocated))}</TableCell>
                      <TableCell className="hidden text-right font-mono tabular-nums md:table-cell">{fmtMoney(Number(b.spent))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Meter value={pct} risk className="w-20 flex-none" />
                          <span className={cn("font-mono text-xs tabular-nums", pct >= 100 ? "text-destructive" : pct >= 85 ? "text-warning" : "text-muted-foreground")}>{pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className={cn("hidden text-right font-mono tabular-nums lg:table-cell", rem < 0 ? "text-destructive" : "text-muted-foreground")}>
                        {fmtMoney(rem)}
                      </TableCell>
                      <TableCell className="hidden font-mono text-xs tabular-nums text-muted-foreground lg:table-cell">{b.fiscal_year || "—"}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(b.id)}
                          aria-label={`Delete ${b.category} budget`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
      </Panel>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="ss-eyebrow">Budget line{detail?.fiscal_year ? ` · FY ${detail.fiscal_year}` : ""}</p>
            <DialogTitle className="flex flex-wrap items-center gap-2">{detail?.category} <StatusPill status={detail?.status} /></DialogTitle>
            {detail?.description && <DialogDescription>{detail.description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Utilisation</span>
                <span className="font-mono tabular-nums">{detailPct}%</span>
              </div>
              <Meter value={detailPct} risk />
            </div>
            <DetailGrid>
              <DetailItem label="Allocated" mono>{fmtMoney(Number(detail?.allocated || 0))}</DetailItem>
              <DetailItem label="Spent" mono>{fmtMoney(Number(detail?.spent || 0))}</DetailItem>
              <DetailItem label="Remaining" mono className={detailRemaining < 0 ? "[&_dd]:text-destructive" : undefined}>{fmtMoney(detailRemaining)}</DetailItem>
              <DetailItem label="Fiscal year" mono>{detail?.fiscal_year || "—"}</DetailItem>
            </DetailGrid>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New budget</DialogTitle>
            <DialogDescription>Allocate funds to a cost category. Spend is tracked against it automatically.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Category" htmlFor="b-category" required className="sm:col-span-2">
              <Input id="b-category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Structural, MEP, Sitework" />
            </FormField>
            <FormField label="Description" htmlFor="b-desc" className="sm:col-span-2">
              <Input id="b-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What this line covers" />
            </FormField>
            <FormField label="Allocated amount" htmlFor="b-alloc" hint="USD, whole dollars">
              <Input id="b-alloc" type="number" inputMode="decimal" className="font-mono tabular-nums" value={form.allocated} onChange={(e) => setForm({ ...form, allocated: e.target.value })} placeholder="0" />
            </FormField>
            <FormField label="Fiscal year" htmlFor="b-fy">
              <Input id="b-fy" className="font-mono tabular-nums" value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} placeholder="2026" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.category || createBudget.isPending}>{createBudget.isPending ? "Creating…" : "Create budget"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>This removes the budget line and its spend history. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteBudget.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BudgetsPage;
