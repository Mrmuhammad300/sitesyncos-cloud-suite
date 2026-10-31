import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Download, Printer, Layers, Scale, Hourglass, CalendarRange, SearchX, FilePlus2 } from "lucide-react";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar, type StatusTone } from "@/components/os";
import { Field, SkeletonCards, SkeletonRows, StatusSelect } from "@/components/build/kit";
import { fmtSignedDollar } from "@/components/build/utils";
import { useChangeOrders, useCreateChangeOrder, useUpdateChangeOrder, useDeleteChangeOrder, useProjects } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import { cn, fmtDollar } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type ChangeOrder = Database["public"]["Tables"]["change_orders"]["Row"];

const STATUSES = ["Pending", "Under Review", "Approved", "Rejected"] as const;
const STATUS_TONES: Partial<Record<string, StatusTone>> = { Pending: "warning", "Under Review": "info" };
const CATEGORIES = ["Scope Addition", "Scope Reduction", "Design Change", "Unforeseen Conditions", "Owner Request", "Other"] as const;

const fmt = fmtDollar;
const signed = (v: number) => fmtSignedDollar(v, fmt);
const isOpen = (co: ChangeOrder) => co.status !== "Approved" && co.status !== "Rejected";

function Amount({ v }: { v: number }) {
  return (
    <span className={cn("font-mono tabular-nums", v < 0 ? "text-success" : "text-foreground")}>
      {v < 0 ? signed(v) : fmt(v)}
    </span>
  );
}

function Days({ d }: { d: number }) {
  if (!d) return <span className="font-mono text-xs tabular-nums text-muted-foreground">0d</span>;
  return (
    <span className={cn("font-mono text-xs tabular-nums", d > 0 ? "text-warning" : "text-success")}>
      {d > 0 ? "+" : "−"}{Math.abs(d)}d
    </span>
  );
}

/** One line of the impact ledger. */
function LedgerRow({ label, sub, value, tone, strong }: { label: string; sub?: string; value: string; tone?: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-2", strong && "border-t pt-3")}>
      <div className="min-w-0">
        <p className={cn("text-[13px]", strong ? "font-semibold" : "text-muted-foreground")}>{label}</p>
        {sub && <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground/80">{sub}</p>}
      </div>
      <span className={cn("shrink-0 font-mono tabular-nums", strong ? "text-lg" : "text-sm", tone)}>{value}</span>
    </div>
  );
}

export default function ChangeOrdersPage() {
  const { data: changeOrders = [], isLoading } = useChangeOrders();
  const { data: projects = [] } = useProjects();
  const createCO = useCreateChangeOrder();
  const updateCO = useUpdateChangeOrder();
  const deleteCO = useDeleteChangeOrder();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", amount: "", days_impact: "",
    category: "Scope Addition" as string, reason: "", requested_by: "",
  });

  const filtered = changeOrders.filter(co => {
    const ms = co.title.toLowerCase().includes(search.toLowerCase()) ||
      co.co_number.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || co.status === statusFilter;
    const mp = projectFilter === "all" || co.project_id === projectFilter;
    return ms && mst && mp;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<ChangeOrder>(filtered, { pageSize: 25 });

  const m = useMemo(() => {
    const approved = changeOrders.filter(co => co.status === "Approved");
    const pending = changeOrders.filter(isOpen);
    const rejected = changeOrders.filter(co => co.status === "Rejected");
    const sum = (xs: ChangeOrder[], f: (c: ChangeOrder) => number) => xs.reduce((s, c) => s + f(c), 0);
    const additions = sum(approved, c => Math.max(0, Number(c.amount)));
    const credits = sum(approved, c => Math.min(0, Number(c.amount)));
    const netApproved = additions + credits;
    const pendingValue = sum(pending, c => Number(c.amount));
    const approvedDays = sum(approved, c => Number(c.days_impact));
    const pendingDays = sum(pending, c => Number(c.days_impact));
    const rejectedValue = sum(rejected, c => Number(c.amount));
    // Cumulative approved value in the order COs were raised — a real trend line.
    const spark = [...approved]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .reduce<number[]>((acc, c) => [...acc, (acc[acc.length - 1] ?? 0) + Number(c.amount)], [0]);
    // Exposure by category: approved + pending, signed.
    const cats = new Map<string, { approved: number; pending: number }>();
    for (const c of [...approved, ...pending]) {
      const key = c.category ?? "Uncategorized";
      const e = cats.get(key) ?? { approved: 0, pending: 0 };
      if (c.status === "Approved") e.approved += Number(c.amount);
      else e.pending += Number(c.amount);
      cats.set(key, e);
    }
    const byCategory = [...cats.entries()]
      .map(([name, v]) => ({ name, ...v, total: v.approved + v.pending }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
    const maxAbs = Math.max(1, ...byCategory.map(c => Math.max(Math.abs(c.approved) + Math.abs(c.pending), 0)));
    return { approved, pending, rejected, additions, credits, netApproved, pendingValue, approvedDays, pendingDays, rejectedValue, spark, byCategory, maxAbs };
  }, [changeOrders]);

  const nextNumber = `CO-${String(changeOrders.length + 1).padStart(4, "0")}`;

  const handleSubmit = () => {
    if (!form.title) return;
    createCO.mutate({
      co_number: nextNumber,
      title: form.title,
      amount: Number(form.amount) || 0,
      days_impact: Number(form.days_impact) || 0,
      category: form.category || null,
      reason: form.reason || null,
      requested_by: form.requested_by || null,
      status: "Pending",
    });
    setOpen(false);
    setForm({ title: "", amount: "", days_impact: "", category: "Scope Addition", reason: "", requested_by: "" });
  };

  const handleBulkStatusUpdate = (status: string) => {
    selectedItems.forEach(co => updateCO.mutate({ id: co.id, status }));
    clearSelection();
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "change-orders", {
      co_number: "CO #", title: "Title", category: "Category",
      amount: "Amount", days_impact: "Days Impact", status: "Status",
      requested_by: "Requested By",
    });
  };

  const handlePrintPDF = () => {
    const cols = ["CO #", "Title", "Category", "Amount", "Days Impact", "Requested By", "Status"];
    const rows_html = filtered.map(r => `<tr>
      <td>${r.co_number}</td>
      <td>${r.title}</td>
      <td>${r.category ?? "—"}</td>
      <td>$${Number(r.amount).toLocaleString()}</td>
      <td>${r.days_impact ?? 0}d</td>
      <td>${r.requested_by ?? "—"}</td>
      <td>${r.status}</td>
    </tr>`).join("");
    printToPDF("Change Orders", `<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows_html}</tbody></table>`);
  };

  const isFiltering = search !== "" || statusFilter !== "all" || projectFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setProjectFilter("all"); };
  const sk = String(sortKey ?? "");
  const onSort = (k: string) => toggleSort(k as keyof ChangeOrder);
  const empty = !isLoading && changeOrders.length === 0;
  const noResults = !isLoading && changeOrders.length > 0 && rows.length === 0;
  const amountPreview = Number(form.amount) || 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Change Orders"
        description="Every scope change with its cost and schedule consequence — what’s committed, and what’s still exposure."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />CSV</Button>
            <Button variant="outline" onClick={handlePrintPDF} disabled={filtered.length === 0}><Printer />PDF</Button>
            <Button onClick={() => setOpen(true)}><Plus />New change order</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Net approved"
          value={signed(m.netApproved)}
          icon={Scale}
          tone={m.netApproved > 0 ? "primary" : m.netApproved < 0 ? "success" : "default"}
          hint={`${m.approved.length} approved CO${m.approved.length === 1 ? "" : "s"}`}
          spark={m.spark.length > 2 ? m.spark : undefined}
          loading={isLoading}
        />
        <StatCard
          label="Pending exposure"
          value={signed(m.pendingValue)}
          icon={Hourglass}
          tone={m.pendingValue > 0 ? "warning" : "default"}
          hint={`${m.pending.length} awaiting decision`}
          loading={isLoading}
          onClick={m.pending.length ? () => setStatusFilter("Pending") : undefined}
        />
        <StatCard
          label="Schedule impact"
          value={`${m.approvedDays > 0 ? "+" : m.approvedDays < 0 ? "−" : ""}${Math.abs(m.approvedDays)}d`}
          icon={CalendarRange}
          tone={m.approvedDays > 0 ? "warning" : m.approvedDays < 0 ? "success" : "default"}
          hint={m.pendingDays ? `${m.pendingDays > 0 ? "+" : "−"}${Math.abs(m.pendingDays)}d more if pending approved` : "Approved COs only"}
          loading={isLoading}
        />
        <StatCard
          label="Change orders"
          value={changeOrders.length}
          icon={Layers}
          hint={`${m.rejected.length} rejected · ${fmt(Math.abs(m.rejectedValue))} avoided`}
          loading={isLoading}
        />
      </section>

      {!empty && !isLoading && (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <Panel className="lg:col-span-2" eyebrow="Net impact" title="Contract adjustment">
            <div className="divide-y divide-border/60">
              <LedgerRow label="Approved additions" sub={`${m.approved.filter(c => Number(c.amount) > 0).length} COs`} value={signed(m.additions)} />
              <LedgerRow label="Approved credits" sub={`${m.approved.filter(c => Number(c.amount) < 0).length} COs · VE & deducts`} value={signed(m.credits)} tone="text-success" />
              <LedgerRow strong label="Net to contract" value={signed(m.netApproved)} tone={m.netApproved > 0 ? "text-primary" : "text-success"} />
              <LedgerRow label="If all pending are approved" sub={`${signed(m.pendingValue)} in review`} value={signed(m.netApproved + m.pendingValue)} tone="text-warning" />
              <LedgerRow
                label="Schedule, approved → projected"
                value={`${m.approvedDays >= 0 ? "+" : "−"}${Math.abs(m.approvedDays)}d → ${m.approvedDays + m.pendingDays >= 0 ? "+" : "−"}${Math.abs(m.approvedDays + m.pendingDays)}d`}
                tone="text-warning"
              />
            </div>
          </Panel>

          <Panel
            className="lg:col-span-3"
            eyebrow="Exposure"
            title="By category"
            actions={
              <div className="hidden items-center gap-3 text-[11px] text-muted-foreground sm:flex">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-primary" />Approved</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-warning" />Pending</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-success" />Credit</span>
              </div>
            }
          >
            {m.byCategory.length === 0 ? (
              <EmptyState compact icon={Layers} title="No open or approved exposure" description="Rejected change orders don’t count toward exposure." />
            ) : (
              <ul className="space-y-3">
                {m.byCategory.map(c => {
                  const aw = (Math.abs(c.approved) / m.maxAbs) * 100;
                  const pw = (Math.abs(c.pending) / m.maxAbs) * 100;
                  return (
                    <li key={c.name} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-3 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)_5.5rem]">
                      <span className="truncate text-xs text-muted-foreground" title={c.name}>{c.name}</span>
                      <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary">
                        {c.approved !== 0 && <div className={cn("h-full", c.approved < 0 ? "bg-success" : "bg-primary")} style={{ width: `${aw}%` }} />}
                        {c.pending !== 0 && <div className={cn("h-full", c.pending < 0 ? "bg-success/60" : "bg-warning")} style={{ width: `${pw}%` }} />}
                      </div>
                      <span className={cn("text-right font-mono text-xs tabular-nums", c.total < 0 && "text-success")}>{signed(c.total)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {m.byCategory.length > 0 && (() => {
              const gross = m.byCategory.reduce((s, c) => s + Math.abs(c.total), 0);
              const top = m.byCategory[0];
              const share = gross ? Math.round((Math.abs(top.total) / gross) * 100) : 0;
              return (
                <p className="mt-5 border-t pt-4 text-xs text-muted-foreground">
                  <span className="text-foreground">{top.name}</span> drives <span className="font-mono tabular-nums text-foreground">{share}%</span> of gross exposure
                  {top.pending !== 0 && <> — <span className="font-mono tabular-nums text-warning">{signed(top.pending)}</span> of it still pending</>}.
                </p>
              );
            })()}
          </Panel>
        </section>
      )}

      <Panel flush eyebrow="Log" title="All change orders">
        {!empty && (
          <div className="border-t px-5 py-4">
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder="Search title or CO #…" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 min-w-0 flex-1 text-xs sm:w-[150px] sm:flex-none" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {projects.length > 0 && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-9 min-w-0 flex-1 text-xs sm:w-[180px] sm:flex-none" aria-label="Filter by project"><SelectValue placeholder="All projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {isFiltering && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
              <span className="ml-auto hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{filtered.length} of {changeOrders.length}</span>
            </Toolbar>
          </div>
        )}

        {empty ? (
          <div className="border-t p-5">
            <EmptyState
              icon={FilePlus2}
              title="No change orders yet"
              description="Log scope changes with their cost and schedule impact so the contract sum stays honest."
              action={<Button size="sm" onClick={() => setOpen(true)}><Plus />New change order</Button>}
            />
          </div>
        ) : noResults ? (
          <div className="border-t p-5">
            <EmptyState
              compact
              icon={SearchX}
              title="No change orders match"
              description={search ? <>Nothing matches “{search}”.</> : "No change orders with this status or project."}
              action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          </div>
        ) : (
          <>
            <div className="sm:hidden">
              {isLoading ? <SkeletonCards /> : (
                <ul className="divide-y divide-border/70 border-t">
                  {rows.map((co) => (
                    <li key={co.id} className="space-y-2.5 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-muted-foreground">{co.co_number}{co.category ? ` · ${co.category}` : ""}</p>
                          <p className="text-sm font-medium leading-snug">{co.title}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(co.id)} aria-label={`Delete ${co.co_number}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <StatusPill status={co.status} tone={STATUS_TONES[co.status]} />
                        <span className="flex items-center gap-3 text-sm"><Amount v={Number(co.amount)} /><Days d={Number(co.days_impact)} /></span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!isLoading && <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
            </div>

            <div className="hidden overflow-x-auto border-t sm:block [&_th]:whitespace-nowrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-5">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => { if (el) (el as HTMLButtonElement).dataset.indeterminate = String(isIndeterminate); }}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <SortableHeader label="CO #" sortKey="co_number" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Title" sortKey="title" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Category" sortKey="category" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
                    <SortableHeader label="Amount" sortKey="amount" currentKey={sk} currentDir={sortDir} onSort={onSort} className="text-right" />
                    <SortableHeader label="Days" sortKey="days_impact" currentKey={sk} currentDir={sortDir} onSort={onSort} className="text-right" />
                    <SortableHeader label="Status" sortKey="status" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Requested by" sortKey="requested_by" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden xl:table-cell" />
                    <TableHead className="w-12 pr-5"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <SkeletonRows cols={9} /> : rows.map((co) => (
                    <TableRow key={co.id} data-state={selected.has(co.id) ? "selected" : undefined} className="group">
                      <TableCell className="pl-5">
                        <Checkbox checked={selected.has(co.id)} onCheckedChange={() => toggleSelect(co.id)} aria-label={`Select ${co.co_number}`} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{co.co_number}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate font-medium">{co.title}</p>
                        {co.reason && <p className="truncate text-xs text-muted-foreground">{co.reason}</p>}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{co.category ?? "—"}</TableCell>
                      <TableCell className="text-right"><Amount v={Number(co.amount)} /></TableCell>
                      <TableCell className="text-right"><Days d={Number(co.days_impact)} /></TableCell>
                      <TableCell>
                        <StatusSelect value={co.status} options={STATUSES} tones={STATUS_TONES} onChange={v => updateCO.mutate({ id: co.id, status: v })} label={`Status for ${co.co_number}`} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">{co.requested_by ?? "—"}</TableCell>
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => setDeleteId(co.id)}
                          aria-label={`Delete ${co.co_number}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!isLoading && <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
            </div>
          </>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New change order</DialogTitle>
            <DialogDescription>Will be logged as <span className="font-mono text-foreground">{nextNumber}</span> and set to Pending. Use a negative amount for credits.</DialogDescription>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <Field label="Title" htmlFor="co-title" required className="sm:col-span-2">
              <Input id="co-title" autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Added structural bracing at L3" />
            </Field>
            <Field label="Category" className="sm:col-span-2">
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger aria-label="Category"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Amount (USD)" htmlFor="co-amt" hint={amountPreview ? <span className={cn("font-mono", amountPreview < 0 ? "text-success" : "text-foreground")}>{signed(amountPreview)}{amountPreview < 0 ? " credit" : ""}</span> : undefined}>
              <Input id="co-amt" type="number" inputMode="decimal" className="font-mono tabular-nums" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Schedule impact (days)" htmlFor="co-days">
              <Input id="co-days" type="number" className="font-mono tabular-nums" value={form.days_impact} onChange={e => setForm(f => ({ ...f, days_impact: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Reason / description" htmlFor="co-reason" className="sm:col-span-2">
              <Textarea id="co-reason" rows={3} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="What changed and why" />
            </Field>
            <Field label="Requested by" htmlFor="co-req" className="sm:col-span-2">
              <Input id="co-req" value={form.requested_by} onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))} placeholder="Owner, architect, GC…" />
            </Field>
            <DialogFooter className="gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.title || createCO.isPending}>
                {createCO.isPending ? "Creating…" : "Create change order"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {changeOrders.find(c => c.id === deleteId)?.co_number ?? "change order"}?</AlertDialogTitle>
            <AlertDialogDescription>The change order will be removed permanently and drop out of every total. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteCO.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete change order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        count={selectedCount}
        onClear={clearSelection}
        actions={[
          { label: "Under Review", onClick: () => handleBulkStatusUpdate("Under Review") },
          { label: "Approved", onClick: () => handleBulkStatusUpdate("Approved") },
          { label: "Rejected", onClick: () => handleBulkStatusUpdate("Rejected") },
        ]}
      />
    </div>
  );
}
