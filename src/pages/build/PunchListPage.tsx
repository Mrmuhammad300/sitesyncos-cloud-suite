import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, CheckSquare, Trash2, Download, Printer, CheckCircle2, AlarmClock, Siren, ListChecks, SearchX, ClipboardCheck } from "lucide-react";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar, type StatusTone } from "@/components/os";
import { DueChip, Field, Meta, PriorityMark, ProgressRing, SkeletonCards, SkeletonRows, StatusSelect } from "@/components/build/kit";
import { fmtDate, urgencyOf } from "@/components/build/utils";
import { useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder } from "@/hooks/useOpsData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";

type WorkOrder = Tables<"work_orders">;

const STATUSES = ["Open", "In Progress", "Completed", "On Hold", "Cancelled"] as const;
const STATUS_TONES: Partial<Record<string, StatusTone>> = { Open: "primary" };
const PRIORITIES = ["Emergency", "High", "Medium", "Low"] as const;

const isDone = (w: Pick<WorkOrder, "status">) => w.status === "Completed" || w.status === "Cancelled";

export default function PunchListPage() {
  const { data: allWorkOrders = [], isLoading } = useWorkOrders();
  const createWO = useCreateWorkOrder();
  const updateWO = useUpdateWorkOrder();
  const deleteWO = useDeleteWorkOrder();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium", assigned_to: "",
    property_name: "", unit: "", due_date: "",
  });

  // Only Punch List items
  const punchItems = useMemo(() => allWorkOrders.filter(w => w.category === "Punch List"), [allWorkOrders]);

  const filtered = punchItems.filter(w => {
    const ms = w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.wo_number.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || w.status === statusFilter;
    const mo = ownerFilter === null || (w.assigned_to ?? "Unassigned") === ownerFilter;
    return ms && mst && mo;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<WorkOrder>(filtered, { pageSize: 25 });

  const m = useMemo(() => {
    const openCount = punchItems.filter(w => w.status === "Open").length;
    const inProgressCount = punchItems.filter(w => w.status === "In Progress").length;
    const completedCount = punchItems.filter(w => w.status === "Completed").length;
    const completionPct = punchItems.length > 0 ? Math.round((completedCount / punchItems.length) * 100) : 0;
    const remaining = punchItems.filter(w => !isDone(w));
    const overdue = remaining.filter(w => urgencyOf(w.due_date).urgency === "late").length;
    const urgent = remaining.filter(w => w.priority === "Emergency" || w.priority === "High").length;
    // Completion by responsible party (the trade or sub the item is assigned to).
    const groups = new Map<string, { total: number; done: number; overdue: number }>();
    for (const w of punchItems) {
      const key = w.assigned_to ?? "Unassigned";
      const g = groups.get(key) ?? { total: 0, done: 0, overdue: 0 };
      g.total += 1;
      if (w.status === "Completed") g.done += 1;
      if (!isDone(w) && urgencyOf(w.due_date).urgency === "late") g.overdue += 1;
      groups.set(key, g);
    }
    const byOwner = [...groups.entries()]
      .map(([name, g]) => ({ name, ...g, pct: g.total ? Math.round((g.done / g.total) * 100) : 0 }))
      .sort((a, b) => (b.total - b.done) - (a.total - a.done) || a.pct - b.pct);
    return { openCount, inProgressCount, completedCount, completionPct, remaining, overdue, urgent, byOwner };
  }, [punchItems]);

  const handleSubmit = () => {
    if (!form.title) return;
    const woNum = `PL-${String(allWorkOrders.length + 1).padStart(3, "0")}`;
    createWO.mutate({
      wo_number: woNum,
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      category: "Punch List",
      assigned_to: form.assigned_to || null,
      property_name: form.property_name || null,
      unit: form.unit || null,
      due_date: form.due_date || null,
    });
    setOpen(false);
    setForm({ title: "", description: "", priority: "Medium", assigned_to: "", property_name: "", unit: "", due_date: "" });
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "punch-list", {
      wo_number: "Item #", title: "Title", priority: "Priority",
      status: "Status", assigned_to: "Assigned To",
      property_name: "Property", unit: "Unit", due_date: "Due Date",
    });
  };

  const handlePrintPDF = () => {
    const tableHtml = `<table>
      <thead><tr><th>Item #</th><th>Title</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Property</th><th>Due Date</th></tr></thead>
      <tbody>${filtered.map(w => `<tr>
        <td>${w.wo_number}</td>
        <td>${w.title}</td>
        <td>${w.priority}</td>
        <td>${w.status}</td>
        <td>${w.assigned_to ?? "—"}</td>
        <td>${w.property_name ?? "—"}${w.unit ? ` · ${w.unit}` : ""}</td>
        <td>${w.due_date ?? "—"}</td>
      </tr>`).join("")}</tbody>
    </table>`;
    printToPDF(`Punch List — ${new Date().toLocaleDateString()}`, tableHtml);
  };

  const markComplete = (w: WorkOrder) => updateWO.mutate({ id: w.id, status: "Completed" });
  const isFiltering = search !== "" || statusFilter !== "all" || ownerFilter !== null;
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setOwnerFilter(null); };
  const sk = String(sortKey ?? "");
  const onSort = (k: string) => toggleSort(k as keyof WorkOrder);
  const empty = !isLoading && punchItems.length === 0;
  const noResults = !isLoading && punchItems.length > 0 && rows.length === 0;
  const ringTone = m.completionPct >= 90 ? "success" : m.completionPct >= 50 ? "data" : "primary";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Punch List"
        description="Deficiencies standing between the job and handover — who owns each one and how close every trade is to done."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />Export</Button>
            <Button variant="outline" onClick={handlePrintPDF} disabled={filtered.length === 0}><Printer />PDF</Button>
            <Button onClick={() => setOpen(true)}><Plus />Add item</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Remaining" value={m.remaining.length} icon={ListChecks} tone="primary" hint={`${m.openCount} open · ${m.inProgressCount} in progress`} loading={isLoading} />
        <StatCard
          label="Overdue"
          value={m.overdue}
          icon={AlarmClock}
          tone={m.overdue ? "destructive" : "success"}
          hint={m.overdue ? "Past their due date" : "Nothing past due"}
          loading={isLoading}
        />
        <StatCard
          label="High priority"
          value={m.urgent}
          icon={Siren}
          tone={m.urgent ? "warning" : "default"}
          hint="Emergency + high, still open"
          loading={isLoading}
        />
        <StatCard
          label="Closed out"
          value={`${m.completionPct}%`}
          icon={CheckSquare}
          tone="success"
          hint={`${m.completedCount} of ${punchItems.length} complete`}
          loading={isLoading}
        />
      </section>

      {!empty && !isLoading && (
        <Panel
          eyebrow="Closeout readiness"
          title="Completion by responsible party"
          description="Select a party to see only their items."
          actions={ownerFilter ? <Button variant="ghost" size="xs" onClick={() => setOwnerFilter(null)}>Show all</Button> : undefined}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center">
            <div className="flex items-center gap-4 md:w-60 md:shrink-0 md:border-r md:pr-5">
              <ProgressRing value={m.completionPct} size={96} stroke={8} tone={ringTone}>
                <span className="font-mono text-2xl font-medium tabular-nums leading-none">{m.completionPct}<span className="text-sm text-muted-foreground">%</span></span>
              </ProgressRing>
              <div className="space-y-1">
                <p className="text-sm font-medium">Overall</p>
                <p className="font-mono text-xs tabular-nums text-muted-foreground">{m.completedCount}/{punchItems.length} items closed</p>
                <p className="text-xs text-muted-foreground">{m.remaining.length ? `${m.remaining.length} to go` : "Ready for handover"}</p>
              </div>
            </div>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {m.byOwner.slice(0, 8).map(g => {
                const on = ownerFilter === g.name;
                return (
                  <button
                    key={g.name}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setOwnerFilter(on ? null : g.name)}
                    className={cn(
                      "ss-interactive flex min-w-0 items-center gap-3 rounded-lg border p-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "border-border-strong bg-surface-2" : "bg-surface-2/30 hover:bg-surface-2/60",
                      ownerFilter && !on && "opacity-60",
                    )}
                  >
                    <ProgressRing value={g.pct} size={40} stroke={4} tone={g.pct === 100 ? "success" : g.overdue ? "destructive" : "data"}>
                      <span className="font-mono text-[10px] tabular-nums">{g.pct}</span>
                    </ProgressRing>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">{g.name}</p>
                      <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                        {g.total - g.done} left{g.overdue ? <span className="text-destructive"> · {g.overdue} late</span> : null}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Panel>
      )}

      <Panel flush eyebrow="Items" title="Punch list">
        {!empty && (
          <div className="border-t px-5 py-4">
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder="Search title or item #…" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[150px] text-xs" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {ownerFilter && (
                <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-surface-2/60 px-3 text-xs">
                  <span className="text-muted-foreground">Party</span>{ownerFilter}
                </span>
              )}
              {isFiltering && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
              <span className="ml-auto hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{filtered.length} of {punchItems.length}</span>
            </Toolbar>
          </div>
        )}

        {empty ? (
          <div className="border-t p-5">
            <EmptyState
              icon={ClipboardCheck}
              title="No punch list items"
              description="Walk the site and log deficiencies here — each gets an owner, a location and a due date so closeout doesn’t stall."
              action={<Button size="sm" onClick={() => setOpen(true)}><Plus />Add item</Button>}
            />
          </div>
        ) : noResults ? (
          <div className="border-t p-5">
            <EmptyState
              compact
              icon={SearchX}
              title="No items match"
              description={search ? <>Nothing matches “{search}”.</> : "No items with this status or owner."}
              action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          </div>
        ) : (
          <>
            <div className="sm:hidden">
              {isLoading ? <SkeletonCards /> : (
                <ul className="divide-y divide-border/70 border-t">
                  {rows.map((w) => (
                    <li key={w.id} className="flex items-start gap-2 px-4 py-3.5">
                      <button type="button" className="min-w-0 flex-1 space-y-2 text-left" onClick={() => setDetail(w)}>
                        <div>
                          <p className="font-mono text-[11px] text-muted-foreground">{w.wo_number}{w.property_name ? ` · ${w.property_name}` : ""}{w.unit ? ` · ${w.unit}` : ""}</p>
                          <p className={cn("text-sm font-medium leading-snug", isDone(w) && "text-muted-foreground line-through decoration-muted-foreground/40")}>{w.title}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <StatusPill status={w.status} tone={STATUS_TONES[w.status]} />
                          <PriorityMark priority={w.priority} />
                          <DueChip date={w.due_date} done={isDone(w)} />
                        </div>
                      </button>
                      <div className="-mr-2 flex shrink-0 items-center">
                        {w.status !== "Completed" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-success" onClick={() => markComplete(w)} aria-label={`Mark ${w.wo_number} complete`}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(w.id)} aria-label={`Delete ${w.wo_number}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!isLoading && <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
            </div>

            <div className="hidden overflow-x-auto border-t sm:block">
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
                    <SortableHeader label="Item #" sortKey="wo_number" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Deficiency" sortKey="title" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Priority" sortKey="priority" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden md:table-cell" />
                    <SortableHeader label="Status" sortKey="status" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Assigned to" sortKey="assigned_to" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
                    <SortableHeader label="Due" sortKey="due_date" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <TableHead className="w-20 pr-5"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <SkeletonRows cols={8} /> : rows.map((w) => (
                    <TableRow key={w.id} data-state={selected.has(w.id) ? "selected" : undefined} className="group cursor-pointer" onClick={() => setDetail(w)}>
                      <TableCell className="pl-5" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selected.has(w.id)} onCheckedChange={() => toggleSelect(w.id)} aria-label={`Select ${w.wo_number}`} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{w.wo_number}</TableCell>
                      <TableCell className="max-w-[320px]">
                        <p className={cn("truncate font-medium", isDone(w) && "text-muted-foreground line-through decoration-muted-foreground/40")}>{w.title}</p>
                        {w.property_name && <p className="truncate text-xs text-muted-foreground">{w.property_name}{w.unit ? ` · ${w.unit}` : ""}</p>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><PriorityMark priority={w.priority} /></TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <StatusSelect value={w.status} options={STATUSES} tones={STATUS_TONES} onChange={v => updateWO.mutate({ id: w.id, status: v })} label={`Status for ${w.wo_number}`} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{w.assigned_to ?? "—"}</TableCell>
                      <TableCell><DueChip date={w.due_date} done={isDone(w)} /></TableCell>
                      <TableCell className="pr-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          {w.status !== "Completed" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-success" onClick={() => markComplete(w)} aria-label={`Mark ${w.wo_number} complete`} title="Mark complete">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(w.id)} aria-label={`Delete ${w.wo_number}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="font-mono text-[11px] text-muted-foreground">{detail?.wo_number}</p>
            <DialogTitle className="leading-snug">{detail?.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {detail && <StatusPill status={detail.status} tone={STATUS_TONES[detail.status]} />}
                {detail && <PriorityMark priority={detail.priority} />}
                {detail && <DueChip date={detail.due_date} done={isDone(detail)} />}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Meta label="Assigned to">{detail?.assigned_to ?? "—"}</Meta>
              <Meta label="Due" mono>{fmtDate(detail?.due_date, true)}</Meta>
              <Meta label="Property">{detail?.property_name ?? "—"}</Meta>
              <Meta label="Unit / area">{detail?.unit ?? "—"}</Meta>
            </div>
            {detail?.description && (
              <div className="space-y-1.5">
                <p className="ss-eyebrow text-[9.5px]">Description</p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{detail.description}</p>
              </div>
            )}
          </div>
          {detail?.status !== "Completed" && (
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
              <Button onClick={() => { if (detail) { markComplete(detail); setDetail(null); } }}>
                <CheckCircle2 />
                Mark as completed
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add punch list item</DialogTitle>
            <DialogDescription>Log a deficiency with an owner and a location so it can be verified and closed.</DialogDescription>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <Field label="Deficiency" htmlFor="pl-title" required className="sm:col-span-2">
              <Input id="pl-title" autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Paint touch-up at corridor 3B" />
            </Field>
            <Field label="Description" htmlFor="pl-desc" className="sm:col-span-2">
              <Textarea id="pl-desc" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What needs fixing and how it will be verified" />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Due date" htmlFor="pl-due">
              <Input id="pl-due" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </Field>
            <Field label="Assigned to" htmlFor="pl-to" hint="The trade or subcontractor responsible." className="sm:col-span-2">
              <Input id="pl-to" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Drywall sub" />
            </Field>
            <Field label="Property" htmlFor="pl-prop">
              <Input id="pl-prop" value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} />
            </Field>
            <Field label="Unit / area" htmlFor="pl-unit">
              <Input id="pl-unit" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} placeholder="Level 3, Unit 304" />
            </Field>
            <DialogFooter className="gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.title || createWO.isPending}>
                {createWO.isPending ? "Adding…" : "Add item"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {punchItems.find(w => w.id === deleteId)?.wo_number ?? "item"}?</AlertDialogTitle>
            <AlertDialogDescription>The punch list item will be removed permanently. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteWO.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        count={selectedCount}
        onClear={clearSelection}
        actions={[
          { label: "In Progress", onClick: () => { selectedItems.forEach(w => updateWO.mutate({ id: w.id, status: "In Progress" })); clearSelection(); } },
          { label: "Completed", onClick: () => { selectedItems.forEach(w => updateWO.mutate({ id: w.id, status: "Completed" })); clearSelection(); } },
          { label: "On Hold", onClick: () => { selectedItems.forEach(w => updateWO.mutate({ id: w.id, status: "On Hold" })); clearSelection(); } },
        ]}
      />
    </div>
  );
}
