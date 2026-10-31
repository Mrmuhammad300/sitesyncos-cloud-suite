import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CreditCard, Clock, CheckCircle2, DollarSign, Trash2, Download, Printer, ChevronRight, XCircle } from "lucide-react";
import { useDrawRequests, useCreateDrawRequest, useDeleteDrawRequest } from "@/hooks/useOpsData";
import { Tables } from "@/integrations/supabase/types";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { exportToCSV, printToPDF } from "@/lib/export";
import { fmtDollar, cn } from "@/lib/utils";
import { EmptyState, Meter, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar } from "@/components/os";
import { DetailGrid, DetailItem, FilterChips, FormField, NoResults, PanelBar, Shimmer, TableSkeleton } from "@/components/ops/OpsKit";
import { countBy, fmtDate, fmtMoney, pctOf, statusOptions } from "@/components/ops/format";

type DrawRequest = Tables<"draw_requests">;

const CANONICAL = ["Draft", "Submitted", "Under Review", "Approved", "Rejected", "Paid"] as const;

/** Lifecycle stages. Each stage absorbs common status synonyms. */
const STAGES = [
  { key: "Draft", match: ["Draft"], tone: "bg-muted-foreground" },
  { key: "Submitted", match: ["Submitted", "Pending"], tone: "bg-info" },
  { key: "Under Review", match: ["Under Review", "In Review"], tone: "bg-warning" },
  { key: "Approved", match: ["Approved"], tone: "bg-success" },
  { key: "Paid", match: ["Paid", "Funded"], tone: "bg-data" },
] as const;
const STAGE_MATCH: Record<string, readonly string[]> = Object.fromEntries(STAGES.map((s) => [s.key, s.match]));

const DrawRequestsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<DrawRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", amount: "", description: "", requested_by: "" });
  const { data: draws = [], isLoading } = useDrawRequests();
  const createDraw = useCreateDrawRequest();
  const deleteDraw = useDeleteDrawRequest();

  const filters = useMemo(() => statusOptions(CANONICAL, draws.map((d) => d.status)), [draws]);
  const counts = useMemo(() => countBy(draws, (d) => d.status), [draws]);

  const matchesFilter = (d: DrawRequest) =>
    filter === "All" || d.status === filter || (STAGE_MATCH[filter]?.includes(d.status) ?? false);

  const filtered = draws.filter(
    (d) => matchesFilter(d) && (d.title.toLowerCase().includes(search.toLowerCase()) || d.draw_number.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
  } = useTableFeatures<DrawRequest>(filtered, { pageSize: 25 });

  const totalRequested = draws.reduce((s, d) => s + Number(d.amount), 0);
  const totalApproved = draws.filter((d) => d.status === "Approved" || d.status === "Paid").reduce((s, d) => s + Number(d.amount), 0);
  const totalPaid = draws.filter((d) => d.status === "Paid").reduce((s, d) => s + Number(d.amount), 0);
  const pending = draws.filter((d) => ["Submitted", "Under Review"].includes(d.status));

  const pipeline = STAGES.map((s) => {
    const items = draws.filter((d) => (s.match as readonly string[]).includes(d.status));
    return { ...s, count: items.length, amount: items.reduce((a, d) => a + Number(d.amount), 0) };
  });
  const rejected = draws.filter((d) => d.status === "Rejected");
  const maxStageAmt = Math.max(1, ...pipeline.map((p) => p.amount));

  // Requested amounts in submission order — drives KPI sparklines.
  const chrono = [...draws].sort((a, b) => (a.submitted_date ?? a.created_at).localeCompare(b.submitted_date ?? b.created_at));
  const spark = chrono.map((d) => Number(d.amount));

  const sortProps = (key: keyof DrawRequest) => ({
    sortKey: key as string,
    currentKey: String(sortKey ?? ""),
    currentDir: sortDir,
    onSort: (k: string) => toggleSort(k as keyof DrawRequest),
  });

  const handleCreate = () => {
    if (!form.title) return;
    const drawNum = `DRAW-${String(draws.length + 1).padStart(3, "0")}`;
    createDraw.mutate({
      draw_number: drawNum,
      title: form.title,
      amount: Number(form.amount) || 0,
      description: form.description || null,
      requested_by: form.requested_by || null,
      submitted_date: new Date().toISOString().split("T")[0],
      status: "Submitted",
    });
    setCreateOpen(false);
    setForm({ title: "", amount: "", description: "", requested_by: "" });
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "draw-requests", {
      draw_number: "Draw #", title: "Title", status: "Status",
      amount: "Amount", requested_by: "Requested By", submitted_date: "Submitted",
    });
  };

  const handlePrintPDF = () => {
    const tableHtml = `<table>
      <thead><tr><th>Draw #</th><th>Title</th><th>Status</th><th>Amount</th><th>Requested By</th><th>Submitted</th></tr></thead>
      <tbody>${filtered.map(d => `<tr>
        <td>${d.draw_number}</td>
        <td>${d.title}</td>
        <td>${d.status}</td>
        <td>$${Number(d.amount).toLocaleString()}</td>
        <td>${d.requested_by ?? "—"}</td>
        <td>${d.submitted_date ?? "—"}</td>
      </tr>`).join("")}</tbody>
    </table>`;
    printToPDF(`Draw Requests — ${new Date().toLocaleDateString()}`, tableHtml);
  };

  const resetFilters = () => { setSearch(""); setFilter("All"); };
  const detailStage = detail ? STAGES.findIndex((s) => (s.match as readonly string[]).includes(detail.status)) : -1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Draw Requests"
        description="Move pay applications from draft to funded, and see exactly where capital is waiting."
        actions={
          <>
            <Button variant="outline" size="icon" onClick={handleExportCSV} aria-label="Export CSV" title="Export CSV"><Download /></Button>
            <Button variant="outline" size="icon" onClick={handlePrintPDF} aria-label="Print PDF" title="Print PDF"><Printer /></Button>
            <Button onClick={() => setCreateOpen(true)}><Plus />New draw request</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total draws" value={draws.length} icon={CreditCard} tone="primary" hint={rejected.length ? `${rejected.length} rejected` : "None rejected"} loading={isLoading} />
        <StatCard label="Requested" value={fmtDollar(totalRequested)} icon={DollarSign} tone="data" spark={spark.length > 1 ? spark : undefined} hint="All draws" loading={isLoading} />
        <StatCard label="Approved / paid" value={fmtDollar(totalApproved)} icon={CheckCircle2} tone="success" hint={`${pctOf(totalApproved, totalRequested)}% of requested`} loading={isLoading} />
        <StatCard
          label="Pending"
          value={pending.length}
          icon={Clock}
          tone={pending.length ? "warning" : "default"}
          hint={pending.length ? `${fmtDollar(pending.reduce((s, d) => s + Number(d.amount), 0))} in review` : "Queue clear"}
          loading={isLoading}
        />
      </section>

      {/* ── Pipeline ─────────────────────────────────────── */}
      <Panel
        eyebrow="Pipeline"
        title="Draft → funded"
        actions={
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
            {fmtDollar(totalPaid)} paid · {pctOf(totalPaid, totalRequested)}%
          </span>
        }
      >
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{STAGES.map((s) => <Shimmer key={s.key} className="h-[88px]" />)}</div>
        ) : (
          <div className="space-y-4">
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {pipeline.map((s, i) => {
                const active = filter === s.key;
                return (
                  <li key={s.key} className={cn("relative", i === pipeline.length - 1 && "col-span-2 sm:col-span-1")}>
                    <button
                      type="button"
                      onClick={() => setFilter(active ? "All" : s.key)}
                      aria-pressed={active}
                      className={cn(
                        "group flex h-full w-full flex-col gap-2 rounded-xl border p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-border-strong bg-surface-3" : "bg-surface-2/40 hover:bg-surface-2",
                        s.count === 0 && !active && "opacity-60",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn("flex h-5 w-5 items-center justify-center rounded-full font-mono text-[10px] font-medium text-background", s.tone)}>{i + 1}</span>
                        <span className="truncate text-xs font-medium">{s.key}</span>
                      </span>
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-mono text-xl font-medium tabular-nums leading-none">{s.count}</span>
                        <span className="truncate font-mono text-[11px] tabular-nums text-muted-foreground">{fmtDollar(s.amount)}</span>
                      </span>
                      <span className="h-1 overflow-hidden rounded-full bg-secondary">
                        <span className={cn("block h-full rounded-full transition-[width] duration-700 ease-out-expo", s.tone)} style={{ width: `${(s.amount / maxStageAmt) * 100}%` }} />
                      </span>
                    </button>
                    {i < pipeline.length - 1 && (
                      <ChevronRight className="absolute -right-[11px] top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60 sm:block" aria-hidden />
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">Funded</span>
                <Meter value={totalPaid} max={totalRequested || 1} tone="data" className="flex-1" />
                <span className="w-24 shrink-0 text-right font-mono text-[11px] tabular-nums">{fmtDollar(totalPaid)}</span>
              </div>
              {rejected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter(filter === "Rejected" ? "All" : "Rejected")}
                  className="flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs text-destructive transition-colors hover:bg-destructive/10 sm:self-auto"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span className="font-mono tabular-nums">{rejected.length}</span> rejected · <span className="font-mono tabular-nums">{fmtDollar(rejected.reduce((s, d) => s + Number(d.amount), 0))}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </Panel>

      <Panel
        flush
        eyebrow="Register"
        title="All draw requests"
        actions={<span className="font-mono text-[11px] tabular-nums text-muted-foreground">{filtered.length} of {draws.length}</span>}
      >
        <PanelBar>
          <Toolbar className="min-w-0 flex-1">
            <SearchField value={search} onChange={setSearch} placeholder="Search by title or draw #…" />
          </Toolbar>
          <FilterChips options={filters} value={filter} onChange={setFilter} counts={counts} />
        </PanelBar>
        {isLoading ? (
          <TableSkeleton />
        ) : draws.length === 0 ? (
          <div className="border-t p-4 sm:p-5">
            <EmptyState
              icon={CreditCard}
              title="No draw requests yet"
              description="Submit your first pay application to start the approval workflow with your lender."
              action={<Button onClick={() => setCreateOpen(true)}><Plus />New draw request</Button>}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t"><NoResults query={search} onReset={resetFilters} noun="draw requests" /></div>
        ) : (
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Draw #" {...sortProps("draw_number")} className="hidden sm:table-cell" />
                  <SortableHeader label="Title" {...sortProps("title")} />
                  <SortableHeader label="Status" {...sortProps("status")} className="hidden md:table-cell" />
                  <SortableHeader label="Amount" {...sortProps("amount")} className="text-right" />
                  <SortableHeader label="Requested by" {...sortProps("requested_by")} className="hidden lg:table-cell" />
                  <SortableHeader label="Submitted" {...sortProps("submitted_date")} className="hidden md:table-cell" />
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetail(d)}>
                    <TableCell className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">{d.draw_number}</TableCell>
                    <TableCell className="max-w-[260px]">
                      <div className="truncate font-medium">{d.title}</div>
                      <div className="mt-0.5 flex items-center gap-2 md:hidden">
                        <StatusPill status={d.status} />
                        <span className="font-mono text-[11px] text-muted-foreground sm:hidden">{d.draw_number}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell"><StatusPill status={d.status} pulse={d.status === "Under Review"} /></TableCell>
                    <TableCell className="text-right font-mono tabular-nums">{fmtMoney(Number(d.amount))}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{d.requested_by || "—"}</TableCell>
                    <TableCell className="hidden font-mono text-xs tabular-nums text-muted-foreground md:table-cell">{fmtDate(d.submitted_date)}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(d.id)}
                        aria-label={`Delete ${d.draw_number}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
      </Panel>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="ss-eyebrow font-mono">{detail?.draw_number}</p>
            <DialogTitle className="flex flex-wrap items-center gap-2">{detail?.title} <StatusPill status={detail?.status} /></DialogTitle>
            {detail?.description && <DialogDescription>{detail.description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4">
            {/* Mini stepper */}
            <ol className="flex items-center gap-1" aria-label="Draw progress">
              {STAGES.map((s, i) => {
                const reached = detail?.status !== "Rejected" && detailStage >= i;
                return (
                  <li key={s.key} className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className={cn("h-1 rounded-full", reached ? s.tone : "bg-secondary")} />
                    <span className={cn("truncate text-[10px]", reached ? "text-foreground" : "text-muted-foreground/70")}>{s.key}</span>
                  </li>
                );
              })}
            </ol>
            <DetailGrid>
              <DetailItem label="Amount" mono>{fmtMoney(Number(detail?.amount || 0))}</DetailItem>
              <DetailItem label="Submitted" mono>{fmtDate(detail?.submitted_date)}</DetailItem>
              <DetailItem label="Requested by">{detail?.requested_by || "—"}</DetailItem>
              <DetailItem label="Approved by">{detail?.approved_by || "—"}</DetailItem>
            </DetailGrid>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New draw request</DialogTitle>
            <DialogDescription>Submitted requests go straight to the lender review queue.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Title" htmlFor="d-title" required className="sm:col-span-2">
              <Input id="d-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Pay application #18" />
            </FormField>
            <FormField label="Amount" htmlFor="d-amount" hint="USD">
              <Input id="d-amount" type="number" inputMode="decimal" className="font-mono tabular-nums" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" />
            </FormField>
            <FormField label="Requested by" htmlFor="d-by">
              <Input id="d-by" value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} placeholder="Name or company" />
            </FormField>
            <FormField label="Description" htmlFor="d-desc" className="sm:col-span-2">
              <Textarea id="d-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Work completed this period, stored materials, retainage…" rows={3} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || createDraw.isPending}>{createDraw.isPending ? "Submitting…" : "Submit draw"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete draw request?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteDraw.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DrawRequestsPage;
