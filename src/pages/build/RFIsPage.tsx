import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Download, Printer, FileQuestion, AlarmClock, Hourglass, CheckCircle2, SearchX, MessageSquarePlus } from "lucide-react";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar } from "@/components/os";
import { DueChip, Field, PriorityMark, SkeletonCards, SkeletonRows, StatusSelect } from "@/components/build/kit";
import { daysBetween, urgencyOf } from "@/components/build/utils";
import { useRFIs, useCreateRFI, useUpdateRFI, useDeleteRFI, useProjects } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type RFI = Database["public"]["Tables"]["rfis"]["Row"];

const STATUSES = ["Open", "In Review", "Answered", "Closed"] as const;
const PRIORITIES = ["High", "Medium", "Low"] as const;

const isResolved = (r: Pick<RFI, "status">) => r.status === "Answered" || r.status === "Closed";

type DueBucket = "all" | "late" | "soon" | "later" | "none";

function bucketOf(r: RFI): Exclude<DueBucket, "all"> | null {
  if (isResolved(r)) return null;
  const { urgency } = urgencyOf(r.due_date);
  if (urgency === "late") return "late";
  if (urgency === "today" || urgency === "soon") return "soon";
  if (urgency === "later") return "later";
  return "none";
}

/** Days an RFI has been open, with a tiny aging bar (fills over 30 days). */
function Aging({ r }: { r: RFI }) {
  if (isResolved(r)) return <span className="font-mono text-[11px] text-muted-foreground/60">—</span>;
  const age = Math.max(0, daysBetween(r.created_at, new Date()));
  const tone = age > 30 ? "bg-destructive" : age > 14 ? "bg-warning" : "bg-muted-foreground/50";
  return (
    <div className="flex items-center gap-2" title={`Open for ${age} days`}>
      <span className={cn("w-9 text-right font-mono text-[11px] tabular-nums", age > 30 ? "text-destructive" : age > 14 ? "text-warning" : "text-muted-foreground")}>{age}d</span>
      <span className="relative h-1 w-10 overflow-hidden rounded-full bg-secondary">
        <span className={cn("absolute inset-y-0 left-0 rounded-full", tone)} style={{ width: `${Math.min(100, (age / 30) * 100)}%` }} />
      </span>
    </div>
  );
}

export default function RFIsPage() {
  const { data: rfis = [], isLoading } = useRFIs();
  const { data: projects = [] } = useProjects();
  const createRFI = useCreateRFI();
  const updateRFI = useUpdateRFI();
  const deleteRFI = useDeleteRFI();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<DueBucket>("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", description: "", priority: "Medium", assigned_to: "", due_date: "" });

  const filtered = rfis.filter(r => {
    const ms = r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.rfi_number.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || r.status === statusFilter;
    const mp = projectFilter === "all" || r.project_id === projectFilter;
    const md = dueFilter === "all" || bucketOf(r) === dueFilter;
    return ms && mst && mp && md;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<RFI>(filtered, { pageSize: 25 });

  const m = useMemo(() => {
    const openRfis = rfis.filter(r => !isResolved(r));
    const buckets = { late: 0, soon: 0, later: 0, none: 0 };
    let oldestLate = 0;
    for (const r of openRfis) {
      const b = bucketOf(r);
      if (b) buckets[b] += 1;
      const { urgency, days } = urgencyOf(r.due_date);
      if (urgency === "late" && days !== null) oldestLate = Math.max(oldestLate, -days);
    }
    const ages = openRfis.map(r => Math.max(0, daysBetween(r.created_at, new Date())));
    const avgAge = ages.length ? Math.round(ages.reduce((s, a) => s + a, 0) / ages.length) : 0;
    const stale = ages.filter(a => a > 14).length;
    const inReview = rfis.filter(r => r.status === "In Review").length;
    const answered = rfis.filter(r => r.status === "Answered").length;
    const closed = rfis.filter(r => r.status === "Closed").length;
    const resolvedPct = rfis.length ? Math.round(((answered + closed) / rfis.length) * 100) : 0;
    return { openRfis, buckets, oldestLate, avgAge, stale, inReview, answered, closed, resolvedPct };
  }, [rfis]);

  const projectName = useMemo(() => new Map(projects.map(p => [p.id, p.name])), [projects]);
  const nextNumber = `RFI-${String(rfis.length + 1).padStart(4, "0")}`;

  const handleSubmit = () => {
    if (!form.subject) return;
    createRFI.mutate({
      subject: form.subject,
      description: form.description || null,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      due_date: form.due_date || null,
      rfi_number: nextNumber,
      status: "Open",
    });
    setOpen(false);
    setForm({ subject: "", description: "", priority: "Medium", assigned_to: "", due_date: "" });
  };

  const handleBulkStatusUpdate = (status: string) => {
    selectedItems.forEach(r => updateRFI.mutate({ id: r.id, status }));
    clearSelection();
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "rfis", {
      rfi_number: "RFI #", subject: "Subject", priority: "Priority",
      status: "Status", assigned_to: "Assigned To", due_date: "Due Date",
    });
  };

  const handlePrintPDF = () => {
    const tableHtml = `<table>
      <thead><tr><th>RFI #</th><th>Subject</th><th>Priority</th><th>Status</th><th>Assigned To</th><th>Due Date</th></tr></thead>
      <tbody>${filtered.map(r => `<tr>
        <td>${r.rfi_number}</td>
        <td>${r.subject}</td>
        <td>${r.priority}</td>
        <td>${r.status}</td>
        <td>${r.assigned_to ?? "—"}</td>
        <td>${r.due_date ?? "—"}</td>
      </tr>`).join("")}</tbody>
    </table>`;
    printToPDF(`RFIs — ${new Date().toLocaleDateString()}`, tableHtml);
  };

  const isFiltering = search !== "" || statusFilter !== "all" || projectFilter !== "all" || dueFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setProjectFilter("all"); setDueFilter("all"); };
  const sk = String(sortKey ?? "");
  const onSort = (k: string) => toggleSort(k as keyof RFI);
  const empty = !isLoading && rfis.length === 0;
  const noResults = !isLoading && rfis.length > 0 && rows.length === 0;

  const queue: { key: Exclude<DueBucket, "all">; label: string; sub: string; value: number; tone: string; bar: string }[] = [
    { key: "late", label: "Overdue", sub: m.oldestLate ? `oldest ${m.oldestLate}d late` : "none late", value: m.buckets.late, tone: "text-destructive", bar: "bg-destructive" },
    { key: "soon", label: "Due ≤ 3 days", sub: "incl. today", value: m.buckets.soon, tone: "text-warning", bar: "bg-warning" },
    { key: "later", label: "Later", sub: "more than 3 days out", value: m.buckets.later, tone: "text-foreground", bar: "bg-data" },
    { key: "none", label: "No due date", sub: "set one to track", value: m.buckets.none, tone: "text-muted-foreground", bar: "bg-muted-foreground/40" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="RFIs"
        description="Requests for information — who owes an answer, how long it’s been waiting, and what’s about to slip."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />Export</Button>
            <Button variant="outline" onClick={handlePrintPDF} disabled={filtered.length === 0}><Printer />PDF</Button>
            <Button onClick={() => setOpen(true)}><Plus />New RFI</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Open RFIs" value={m.openRfis.length} icon={FileQuestion} tone="primary" hint={`${m.inReview} in review`} loading={isLoading} />
        <StatCard
          label="Overdue"
          value={m.buckets.late}
          icon={AlarmClock}
          tone={m.buckets.late ? "destructive" : "success"}
          hint={m.buckets.late ? `Oldest ${m.oldestLate}d past due` : "Nothing past due"}
          loading={isLoading}
          onClick={m.buckets.late ? () => setDueFilter("late") : undefined}
        />
        <StatCard
          label="Avg days open"
          value={`${m.avgAge}d`}
          icon={Hourglass}
          tone={m.avgAge > 14 ? "warning" : "default"}
          hint={m.stale ? `${m.stale} open > 2 weeks` : "None older than 2 weeks"}
          loading={isLoading}
        />
        <StatCard label="Resolved" value={`${m.resolvedPct}%`} icon={CheckCircle2} tone="success" hint={`${m.answered} answered · ${m.closed} closed`} loading={isLoading} />
      </section>

      {!empty && m.openRfis.length > 0 && (
        <Panel eyebrow="Response queue" title="Open RFIs by due date" description="Select a bucket to focus the log." actions={dueFilter !== "all" ? <Button variant="ghost" size="xs" onClick={() => setDueFilter("all")}>Show all</Button> : undefined}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {queue.map(q => {
              const on = dueFilter === q.key;
              const pct = m.openRfis.length ? (q.value / m.openRfis.length) * 100 : 0;
              return (
                <button
                  key={q.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDueFilter(on ? "all" : q.key)}
                  className={cn(
                    "ss-interactive group rounded-lg border px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "border-border-strong bg-surface-2" : "bg-surface-2/30 hover:bg-surface-2/60",
                    dueFilter !== "all" && !on && "opacity-60",
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs text-muted-foreground">{q.label}</span>
                    <span className={cn("font-mono text-xl tabular-nums leading-none", q.tone)}>{q.value}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-secondary">
                    <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out-expo", q.bar)} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="mt-1.5 truncate font-mono text-[10.5px] text-muted-foreground/80">{q.sub}</p>
                </button>
              );
            })}
          </div>
        </Panel>
      )}

      <Panel flush eyebrow="Log" title="All RFIs">
        {!empty && (
          <div className="border-t px-5 py-4">
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder="Search subject or RFI #…" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {projects.length > 0 && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-9 w-[180px] text-xs" aria-label="Filter by project"><SelectValue placeholder="All projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {isFiltering && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
              <span className="ml-auto hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{filtered.length} of {rfis.length}</span>
            </Toolbar>
          </div>
        )}

        {empty ? (
          <div className="border-t p-5">
            <EmptyState
              icon={MessageSquarePlus}
              title="No RFIs yet"
              description="When the field needs a design answer, log it here so the question has an owner and a due date."
              action={<Button size="sm" onClick={() => setOpen(true)}><Plus />New RFI</Button>}
            />
          </div>
        ) : noResults ? (
          <div className="border-t p-5">
            <EmptyState
              compact
              icon={SearchX}
              title="No RFIs match these filters"
              description={search ? <>Nothing matches “{search}”.</> : "Try a different status, project or due-date bucket."}
              action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          </div>
        ) : (
          <>
            <div className="sm:hidden">
              {isLoading ? <SkeletonCards /> : (
                <ul className="divide-y divide-border/70 border-t">
                  {rows.map((rfi) => (
                    <li key={rfi.id} className="space-y-2.5 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-[11px] text-muted-foreground">{rfi.rfi_number}</p>
                          <p className="text-sm font-medium leading-snug">{rfi.subject}</p>
                        </div>
                        <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(rfi.id)} aria-label={`Delete ${rfi.rfi_number}`}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <StatusPill status={rfi.status} />
                        <PriorityMark priority={rfi.priority} />
                        <DueChip date={rfi.due_date} done={isResolved(rfi)} />
                      </div>
                      {rfi.assigned_to && <p className="text-xs text-muted-foreground">Ball in court · <span className="text-foreground">{rfi.assigned_to}</span></p>}
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
                    <SortableHeader label="RFI #" sortKey="rfi_number" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Subject" sortKey="subject" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Priority" sortKey="priority" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden md:table-cell" />
                    <SortableHeader label="Status" sortKey="status" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Ball in court" sortKey="assigned_to" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
                    <SortableHeader label="Due" sortKey="due_date" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Age" sortKey="created_at" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden xl:table-cell" />
                    <TableHead className="w-12 pr-5"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <SkeletonRows cols={9} /> : rows.map((rfi) => (
                    <TableRow key={rfi.id} data-state={selected.has(rfi.id) ? "selected" : undefined} className="group">
                      <TableCell className="pl-5">
                        <Checkbox checked={selected.has(rfi.id)} onCheckedChange={() => toggleSelect(rfi.id)} aria-label={`Select ${rfi.rfi_number}`} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{rfi.rfi_number}</TableCell>
                      <TableCell className="max-w-[340px]">
                        <p className="truncate font-medium">{rfi.subject}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {rfi.project_id && projectName.get(rfi.project_id) ? <span className="text-muted-foreground/90">{projectName.get(rfi.project_id)}</span> : null}
                          {rfi.project_id && projectName.get(rfi.project_id) && rfi.description ? " · " : null}
                          {rfi.description}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell"><PriorityMark priority={rfi.priority} /></TableCell>
                      <TableCell>
                        <StatusSelect value={rfi.status} options={STATUSES} onChange={v => updateRFI.mutate({ id: rfi.id, status: v })} label={`Status for ${rfi.rfi_number}`} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{rfi.assigned_to ?? "—"}</TableCell>
                      <TableCell><DueChip date={rfi.due_date} done={isResolved(rfi)} /></TableCell>
                      <TableCell className="hidden xl:table-cell"><Aging r={rfi} /></TableCell>
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => setDeleteId(rfi.id)}
                          aria-label={`Delete ${rfi.rfi_number}`}
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

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New RFI</DialogTitle>
            <DialogDescription>
              Will be logged as <span className="font-mono text-foreground">{nextNumber}</span> and set to Open.
            </DialogDescription>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <Field label="Subject" htmlFor="rfi-subject" required className="sm:col-span-2">
              <Input id="rfi-subject" autoFocus value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="e.g. Clarify fire damper location, corridor B" />
            </Field>
            <Field label="Question / description" htmlFor="rfi-desc" className="sm:col-span-2">
              <Textarea id="rfi-desc" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does the field need answered, and what’s blocked until then?" />
            </Field>
            <Field label="Priority">
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger aria-label="Priority"><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Response due" htmlFor="rfi-due">
              <Input id="rfi-due" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </Field>
            <Field label="Assigned to" htmlFor="rfi-to" hint="The architect, engineer or consultant who owes the answer." className="sm:col-span-2">
              <Input id="rfi-to" value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Studio North" />
            </Field>
            <DialogFooter className="gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.subject || createRFI.isPending}>
                {createRFI.isPending ? "Creating…" : "Create RFI"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {rfis.find(r => r.id === deleteId)?.rfi_number ?? "RFI"}?</AlertDialogTitle>
            <AlertDialogDescription>The RFI and its history will be removed permanently. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteRFI.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete RFI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        count={selectedCount}
        onClear={clearSelection}
        actions={[
          { label: "Open", onClick: () => handleBulkStatusUpdate("Open") },
          { label: "In Review", onClick: () => handleBulkStatusUpdate("In Review") },
          { label: "Answered", onClick: () => handleBulkStatusUpdate("Answered") },
          { label: "Closed", onClick: () => handleBulkStatusUpdate("Closed") },
        ]}
      />
    </div>
  );
}
