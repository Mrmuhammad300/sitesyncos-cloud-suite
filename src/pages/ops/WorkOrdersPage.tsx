import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wrench, Clock, CheckCircle2, AlertTriangle, Trash2, Download, Timer, MapPin, User } from "lucide-react";
import { useWorkOrders, useCreateWorkOrder, useDeleteWorkOrder } from "@/hooks/useOpsData";
import { Tables } from "@/integrations/supabase/types";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { exportToCSV } from "@/lib/export";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar } from "@/components/os";
import { DetailGrid, DetailItem, FilterChips, FormField, NoResults, PanelBar, Shimmer, TableSkeleton } from "@/components/ops/OpsKit";
import { countBy, daysSince, daysUntil, fmtDate, pctOf, statusOptions } from "@/components/ops/format";

type WorkOrder = Tables<"work_orders">;

const CANONICAL = ["Open", "In Progress", "Completed", "On Hold", "Cancelled"] as const;
const CLOSED = ["Completed", "Cancelled"];
const PRIORITIES = ["Emergency", "High", "Medium", "Low"] as const;

/** Priority renders as a signal dot + label so it never reads as a status pill. */
function Priority({ p, className }: { p: string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", p === "Emergency" ? "font-medium text-destructive" : "text-foreground/85", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_BAR[p] ?? "bg-muted-foreground", p === "Emergency" && "animate-pulse")} />
      {p}
    </span>
  );
}
const PRIORITY_BAR: Record<string, string> = {
  Emergency: "bg-destructive", High: "bg-warning", Medium: "bg-info", Low: "bg-muted-foreground",
};

/** Due-date SLA chip text + tone. */
function sla(w: WorkOrder): { label: string; tone: string } {
  if (CLOSED.includes(w.status)) return { label: w.completed_date ? `Done ${fmtDate(w.completed_date, { month: "short", day: "numeric" })}` : w.status, tone: "text-muted-foreground" };
  const d = daysUntil(w.due_date);
  if (d === null) return { label: "No due date", tone: "text-muted-foreground" };
  if (d < 0) return { label: `${-d}d overdue`, tone: "text-destructive" };
  if (d === 0) return { label: "Due today", tone: "text-warning" };
  if (d <= 2) return { label: `Due in ${d}d`, tone: "text-warning" };
  return { label: `Due in ${d}d`, tone: "text-muted-foreground" };
}

const WorkOrdersPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<WorkOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "Medium", category: "", assigned_to: "", property_name: "", unit: "", due_date: "" });
  const { data: wos = [], isLoading } = useWorkOrders();
  const createWO = useCreateWorkOrder();
  const deleteWO = useDeleteWorkOrder();

  const filters = useMemo(() => statusOptions(CANONICAL, wos.map((w) => w.status)), [wos]);
  const counts = useMemo(() => countBy(wos, (w) => w.status), [wos]);

  const filtered = wos.filter(
    (w) => (filter === "All" || w.status === filter) && (w.title.toLowerCase().includes(search.toLowerCase()) || w.wo_number.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
  } = useTableFeatures<WorkOrder>(filtered, { pageSize: 25 });

  const openWOs = wos.filter((w) => !CLOSED.includes(w.status));
  const overdue = openWOs.filter((w) => { const d = daysUntil(w.due_date); return d !== null && d < 0; });
  const completed = wos.filter((w) => w.status === "Completed").length;
  const inProgress = wos.filter((w) => w.status === "In Progress").length;
  const avgAge = openWOs.length
    ? Math.round(openWOs.reduce((s, w) => s + Math.max(0, daysSince(w.created_at) ?? 0), 0) / openWOs.length)
    : null;

  // Priority lanes — open work only, most urgent due date first
  const lanes = useMemo(() => {
    const known = new Set<string>(PRIORITIES);
    const keys = [...PRIORITIES, ...new Set(openWOs.map((w) => w.priority).filter((p) => !known.has(p)))];
    return keys.map((p) => ({
      priority: p,
      items: openWOs
        .filter((w) => w.priority === p)
        .sort((a, b) => (daysUntil(a.due_date) ?? 9999) - (daysUntil(b.due_date) ?? 9999)),
    }));
  }, [openWOs]);

  const sortProps = (key: keyof WorkOrder) => ({
    sortKey: key as string,
    currentKey: String(sortKey ?? ""),
    currentDir: sortDir,
    onSort: (k: string) => toggleSort(k as keyof WorkOrder),
  });

  const handleCreate = () => {
    if (!form.title) return;
    const woNum = `WO-${String(wos.length + 1).padStart(3, "0")}`;
    createWO.mutate({
      wo_number: woNum,
      title: form.title,
      description: form.description || null,
      priority: form.priority,
      category: form.category || null,
      assigned_to: form.assigned_to || null,
      property_name: form.property_name || null,
      unit: form.unit || null,
      due_date: form.due_date || null,
    });
    setCreateOpen(false);
    setForm({ title: "", description: "", priority: "Medium", category: "", assigned_to: "", property_name: "", unit: "", due_date: "" });
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "work-orders", {
      wo_number: "WO #", title: "Title", status: "Status", priority: "Priority",
      category: "Category", assigned_to: "Assigned To",
      property_name: "Property", due_date: "Due Date",
    });
  };

  const resetFilters = () => { setSearch(""); setFilter("All"); };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Orders"
        description="Triage maintenance by priority, watch SLA aging, and keep every ticket moving to done."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />Export</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus />New work order</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open work" value={openWOs.length} icon={Wrench} tone="primary" hint={`${wos.length} total`} loading={isLoading} onClick={() => setFilter("Open")} />
        <StatCard label="In progress" value={inProgress} icon={Clock} tone="data" hint={avgAge !== null ? `Avg open age ${avgAge}d` : "Nothing open"} loading={isLoading} onClick={() => setFilter("In Progress")} />
        <StatCard label="Overdue" value={overdue.length} icon={AlertTriangle} tone={overdue.length ? "destructive" : "default"} hint={overdue.length ? "Past SLA due date" : "All within SLA"} loading={isLoading} />
        <StatCard label="Completed" value={completed} icon={CheckCircle2} tone="success" hint={`${pctOf(completed, wos.length)}% completion`} loading={isLoading} onClick={() => setFilter("Completed")} />
      </section>

      {/* ── Priority lanes ───────────────────────────────── */}
      <Panel
        eyebrow="Triage"
        title="Open work by priority"
        actions={<span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Timer className="h-3.5 w-3.5" />Sorted by SLA</span>}
      >
        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{PRIORITIES.map((p) => <Shimmer key={p} className="h-40" />)}</div>
        ) : openWOs.length === 0 ? (
          <EmptyState
            compact
            icon={CheckCircle2}
            title={wos.length ? "All clear" : "No work orders yet"}
            description={wos.length ? "Every work order is completed or cancelled." : "Log a maintenance request to start the triage board."}
            action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus />New work order</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {lanes.map((lane) => (
              <section
                key={lane.priority}
                aria-label={`${lane.priority} priority`}
                className={cn("min-w-0 flex-col rounded-xl border bg-surface-2/30", lane.items.length === 0 ? "hidden sm:flex" : "flex")}
              >
                <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                  <span className="flex items-center gap-2 text-xs font-medium">
                    <span className={cn("h-2 w-2 rounded-full", PRIORITY_BAR[lane.priority] ?? "bg-muted-foreground")} />
                    {lane.priority}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{lane.items.length}</span>
                </header>
                <ul className="flex flex-1 flex-col gap-2 p-2">
                  {lane.items.length === 0 ? (
                    <li className="flex flex-1 items-center justify-center rounded-lg border border-dashed px-3 py-5 text-[11px] text-muted-foreground/70">Nothing queued</li>
                  ) : lane.items.slice(0, 5).map((w) => {
                    const s = sla(w);
                    const age = daysSince(w.created_at);
                    return (
                      <li key={w.id}>
                        <button
                          type="button"
                          onClick={() => setDetail(w)}
                          className="ss-interactive relative w-full overflow-hidden rounded-lg border bg-card p-2.5 pl-3.5 text-left hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <span className={cn("absolute inset-y-0 left-0 w-[3px]", PRIORITY_BAR[w.priority] ?? "bg-muted-foreground")} />
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{w.wo_number}</span>
                            <span className={cn("font-mono text-[10.5px] font-medium tabular-nums", s.tone)}>{s.label}</span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-[13px] font-medium leading-snug">{w.title}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                            <span className="min-w-0 truncate">{w.assigned_to || "Unassigned"}</span>
                            <StatusPill status={w.status} className="shrink-0" />
                          </div>
                          {age !== null && age >= 0 && (
                            <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">Age {age}d</p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                  {lane.items.length > 5 && (
                    <li className="px-1 text-center font-mono text-[10.5px] text-muted-foreground">+{lane.items.length - 5} more in table</li>
                  )}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        flush
        eyebrow="Register"
        title="All work orders"
        actions={<span className="font-mono text-[11px] tabular-nums text-muted-foreground">{filtered.length} of {wos.length}</span>}
      >
        <PanelBar>
          <Toolbar className="min-w-0 flex-1">
            <SearchField value={search} onChange={setSearch} placeholder="Search by title or WO #…" />
          </Toolbar>
          <FilterChips options={filters} value={filter} onChange={setFilter} counts={counts} />
        </PanelBar>
        {isLoading ? (
          <TableSkeleton />
        ) : wos.length === 0 ? (
          <div className="border-t p-4 sm:p-5">
            <EmptyState
              icon={Wrench}
              title="No work orders yet"
              description="Create a work order for any maintenance request — HVAC, plumbing, electrical and more."
              action={<Button onClick={() => setCreateOpen(true)}><Plus />New work order</Button>}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t"><NoResults query={search} onReset={resetFilters} noun="work orders" /></div>
        ) : (
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="WO #" {...sortProps("wo_number")} className="hidden sm:table-cell" />
                  <SortableHeader label="Title" {...sortProps("title")} />
                  <SortableHeader label="Status" {...sortProps("status")} className="hidden md:table-cell" />
                  <SortableHeader label="Priority" {...sortProps("priority")} className="hidden md:table-cell" />
                  <TableHead className="hidden xl:table-cell">Category</TableHead>
                  <SortableHeader label="Assigned to" {...sortProps("assigned_to")} className="hidden lg:table-cell" />
                  <SortableHeader label="Due" {...sortProps("due_date")} />
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => {
                  const s = sla(w);
                  return (
                    <TableRow key={w.id} className="cursor-pointer" onClick={() => setDetail(w)}>
                      <TableCell className="hidden font-mono text-xs tabular-nums text-muted-foreground sm:table-cell">{w.wo_number}</TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="truncate font-medium">{w.title}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          <span className="font-mono sm:hidden">{w.wo_number} · </span>
                          {[w.property_name, w.unit].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 md:hidden">
                          <StatusPill status={w.status} />
                          <Priority p={w.priority} />
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><StatusPill status={w.status} pulse={w.status === "In Progress"} /></TableCell>
                      <TableCell className="hidden md:table-cell"><Priority p={w.priority} /></TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">{w.category || "—"}</TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{w.assigned_to || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="font-mono text-xs tabular-nums">{fmtDate(w.due_date, { month: "short", day: "numeric" })}</div>
                        <div className={cn("font-mono text-[11px] tabular-nums", s.tone)}>{s.label}</div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(w.id)}
                          aria-label={`Delete ${w.wo_number}`}
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
            <p className="ss-eyebrow font-mono">{detail?.wo_number}{detail?.category ? ` · ${detail.category}` : ""}</p>
            <DialogTitle>{detail?.title}</DialogTitle>
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <StatusPill status={detail?.status} />
              {detail && <Priority p={detail.priority} className="ml-1" />}
              {detail && <span className={cn("ml-1 font-mono text-[11px] tabular-nums", sla(detail).tone)}>{sla(detail).label}</span>}
            </div>
            {detail?.description && <DialogDescription className="pt-1">{detail.description}</DialogDescription>}
          </DialogHeader>
          <DetailGrid>
            <DetailItem label="Property"><span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" />{detail?.property_name || "—"}</span></DetailItem>
            <DetailItem label="Unit" mono>{detail?.unit || "—"}</DetailItem>
            <DetailItem label="Assigned to"><span className="inline-flex items-center gap-1.5"><User className="h-3 w-3 text-muted-foreground" />{detail?.assigned_to || "Unassigned"}</span></DetailItem>
            <DetailItem label="Reported by">{detail?.reported_by || "—"}</DetailItem>
            <DetailItem label="Due" mono>{fmtDate(detail?.due_date)}</DetailItem>
            <DetailItem label="Completed" mono>{fmtDate(detail?.completed_date)}</DetailItem>
          </DetailGrid>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New work order</DialogTitle>
            <DialogDescription>Priority sets the lane; due date drives the SLA clock.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Title" htmlFor="w-title" required className="sm:col-span-2">
              <Input id="w-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. HVAC not cooling — unit 1402" />
            </FormField>
            <FormField label="Description" htmlFor="w-desc" className="sm:col-span-2">
              <Textarea id="w-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue…" rows={3} />
            </FormField>
            <FormField label="Priority" htmlFor="w-priority">
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger id="w-priority"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className="flex items-center gap-2"><span className={cn("h-2 w-2 rounded-full", PRIORITY_BAR[p])} />{p}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Category" htmlFor="w-category">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger id="w-category"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent><SelectItem value="Plumbing">Plumbing</SelectItem><SelectItem value="Electrical">Electrical</SelectItem><SelectItem value="HVAC">HVAC</SelectItem><SelectItem value="Structural">Structural</SelectItem><SelectItem value="General">General</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
              </Select>
            </FormField>
            <FormField label="Property" htmlFor="w-prop">
              <Input id="w-prop" value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} placeholder="Property name" />
            </FormField>
            <FormField label="Unit" htmlFor="w-unit">
              <Input id="w-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unit #" />
            </FormField>
            <FormField label="Assigned to" htmlFor="w-assignee">
              <Input id="w-assignee" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Technician or vendor" />
            </FormField>
            <FormField label="Due date" htmlFor="w-due">
              <Input id="w-due" type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || createWO.isPending}>{createWO.isPending ? "Creating…" : "Create work order"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete work order?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteWO.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default WorkOrdersPage;
