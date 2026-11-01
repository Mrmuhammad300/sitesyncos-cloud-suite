import { useMemo, useState } from "react";
import { cn, fmtDollar } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, MapPin, Trash2, Download, Pencil, HardHat, CircleDollarSign, Flame, AlertTriangle, SearchX, FolderPlus } from "lucide-react";
import { EmptyState, Meter, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar } from "@/components/os";
import { Field, SegmentBar, SkeletonCards, SkeletonRows, StatusSelect } from "@/components/build/kit";
import { daysUntil, fmtDate } from "@/components/build/utils";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV } from "@/lib/export";
import { budgetBurn } from "@/lib/dashboard";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const STATUSES = ["On Track", "At Risk", "Behind", "Complete"] as const;
const STATUS_TONES = { Complete: "info" } as const;

const fmt = fmtDollar;

/** Spend running ahead of physical progress, in percentage points. */
function burnGap(p: Project) {
  return budgetBurn(p) - p.progress;
}

function FinishLabel({ p }: { p: Project }) {
  if (!p.end_date) return <span className="text-muted-foreground/60">—</span>;
  const d = daysUntil(p.end_date);
  if (p.status === "Complete") return <span className="text-muted-foreground">{fmtDate(p.end_date, true)}</span>;
  return (
    <div className="leading-tight">
      <p className="font-mono text-[12px] tabular-nums">{fmtDate(p.end_date, true)}</p>
      <p className={cn("font-mono text-[10.5px] tabular-nums", d !== null && d < 0 ? "text-destructive" : d !== null && d <= 30 ? "text-warning" : "text-muted-foreground")}>
        {d === null ? "" : d < 0 ? `${-d}d past` : `${d}d left`}
      </p>
    </div>
  );
}

function BurnCell({ p }: { p: Project }) {
  const burn = budgetBurn(p);
  const gap = burnGap(p);
  const hot = gap > 10 && p.status !== "Complete";
  return (
    <div className="w-32 space-y-1">
      <div className="flex items-baseline justify-between font-mono text-[11px] tabular-nums">
        <span className={cn(burn >= 100 ? "text-destructive" : "text-muted-foreground")}>{burn}% spent</span>
        {hot && <span className="text-warning" title="Spend is running ahead of progress">+{gap}</span>}
      </div>
      <Meter value={burn} risk />
    </div>
  );
}

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const emptyForm = { name: "", location: "", project_manager: "", status: "On Track", budget: "", start_date: "", end_date: "", progress: "" };
  const [form, setForm] = useState(emptyForm);

  const openEdit = (p: Project) => {
    setEditingProject(p);
    setForm({
      name: p.name,
      location: p.location ?? "",
      project_manager: p.project_manager ?? "",
      status: p.status,
      budget: String(p.budget),
      start_date: p.start_date ?? "",
      end_date: p.end_date ?? "",
      progress: String(p.progress),
    });
    setOpen(true);
  };

  const openCreate = () => {
    setEditingProject(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const filtered = projects.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.location ?? "").toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || p.status === statusFilter;
    return ms && mst;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<Project>(filtered, { pageSize: 25 });

  const m = useMemo(() => {
    const totalBudget = projects.reduce((s, p) => s + Number(p.budget), 0);
    const totalSpent = projects.reduce((s, p) => s + Number(p.spent), 0);
    const active = projects.filter(p => p.status !== "Complete");
    const avgProgress = projects.length
      ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
      : 0;
    const behind = projects.filter(p => p.status === "Behind").length;
    const atRisk = projects.filter(p => p.status === "At Risk").length;
    const overBurn = active.filter(p => burnGap(p) > 10).length;
    const burnPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const segments = STATUSES.map((s) => ({
      key: s, label: s, value: projects.filter(p => p.status === s).length,
      tone: (s === "On Track" ? "success" : s === "At Risk" ? "warning" : s === "Behind" ? "destructive" : "info") as "success" | "warning" | "destructive" | "info",
    }));
    return { totalBudget, totalSpent, active, avgProgress, behind, atRisk, overBurn, burnPct, segments };
  }, [projects]);

  const handleSubmit = () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      location: form.location || null,
      project_manager: form.project_manager || null,
      status: form.status,
      budget: Number(form.budget) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      progress: Number(form.progress) || 0,
    };
    if (editingProject) {
      updateProject.mutate({ id: editingProject.id, ...payload });
    } else {
      createProject.mutate(payload);
    }
    setOpen(false);
    setEditingProject(null);
    setForm(emptyForm);
  };

  const handleBulkStatusUpdate = (status: string) => {
    selectedItems.forEach(p => updateProject.mutate({ id: p.id, status }));
    clearSelection();
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "projects", {
      name: "Name", location: "Location", project_manager: "Manager",
      status: "Status", budget: "Budget", spent: "Spent",
      progress: "Progress %", start_date: "Start Date", end_date: "End Date",
    });
  };

  const isFiltering = search !== "" || statusFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); };
  const sk = String(sortKey ?? "");
  const onSort = (k: string) => toggleSort(k as keyof Project);

  const empty = !isLoading && projects.length === 0;
  const noResults = !isLoading && projects.length > 0 && rows.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Every job in the portfolio — status, spend against budget, and how close each one is to handover."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />Export</Button>
            <Button onClick={openCreate}><Plus />New project</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Active projects"
          value={m.active.length}
          icon={HardHat}
          tone="primary"
          hint={`${projects.length} total · ${projects.length - m.active.length} complete`}
          loading={isLoading}
        />
        <StatCard
          label="Portfolio budget"
          value={fmt(m.totalBudget)}
          icon={CircleDollarSign}
          tone="data"
          hint={`${fmt(m.totalSpent)} spent`}
          loading={isLoading}
        />
        <StatCard
          label="Budget burn"
          value={`${m.burnPct}%`}
          icon={Flame}
          tone={m.burnPct > m.avgProgress + 10 ? "warning" : "default"}
          hint={`vs ${m.avgProgress}% avg progress`}
          loading={isLoading}
        />
        <StatCard
          label="Needs attention"
          value={m.behind + m.atRisk}
          icon={AlertTriangle}
          tone={m.behind ? "destructive" : m.atRisk ? "warning" : projects.length ? "success" : "default"}
          hint={!projects.length ? "No projects yet" : m.behind + m.atRisk === 0 ? "All on track" : `${m.behind} behind · ${m.atRisk} at risk`}
          loading={isLoading}
          onClick={m.behind + m.atRisk > 0 ? () => setStatusFilter(m.behind ? "Behind" : "At Risk") : undefined}
        />
      </section>

      <Panel
        flush
        eyebrow="Portfolio"
        title="All projects"
        description={
          isLoading ? undefined : m.overBurn > 0
            ? <><span className="text-warning">{m.overBurn} active project{m.overBurn === 1 ? " is" : "s are"}</span> spending more than 10 pts ahead of progress.</>
            : "Spend is tracking with progress across active projects."
        }
      >
        {!empty && (
          <div className="space-y-4 border-t px-5 py-4">
            <SegmentBar segments={m.segments} active={statusFilter === "all" ? undefined : statusFilter} onSelect={setStatusFilter} />
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder="Search name or location…" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 min-w-[8.5rem] flex-1 text-xs sm:w-[150px] sm:flex-none" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {isFiltering && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
              <span className="ml-auto hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">
                {filtered.length} of {projects.length}
              </span>
            </Toolbar>
          </div>
        )}

        {empty ? (
          <div className="border-t p-5">
            <EmptyState
              icon={FolderPlus}
              title="No projects yet"
              description="Create your first project to start tracking budget, schedule and field activity."
              action={<Button size="sm" onClick={openCreate}><Plus />New project</Button>}
            />
          </div>
        ) : noResults ? (
          <div className="border-t p-5">
            <EmptyState
              compact
              icon={SearchX}
              title="No projects match"
              description={search ? <>Nothing matches “{search}”{statusFilter !== "all" ? ` in ${statusFilter}` : ""}.</> : `No projects are ${statusFilter}.`}
              action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          </div>
        ) : (
          <>
            {/* Mobile list */}
            <div className="sm:hidden">
              {isLoading ? <SkeletonCards /> : (
                <ul className="divide-y divide-border/70 border-t">
                  {rows.map((proj) => (
                    <li key={proj.id} className="space-y-3 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{proj.name}</p>
                          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                            {proj.location && <><MapPin className="h-3 w-3 shrink-0" />{proj.location} · </>}
                            {proj.project_manager ?? "No manager"}
                          </p>
                        </div>
                        <div className="-mr-2 -mt-1 flex shrink-0 items-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={() => openEdit(proj)} aria-label={`Edit ${proj.name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(proj.id)} aria-label={`Delete ${proj.name}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <StatusPill status={proj.status} tone={proj.status === "Complete" ? "info" : undefined} />
                        <span className="font-mono text-xs tabular-nums">
                          {fmt(Number(proj.spent))} <span className="text-muted-foreground">/ {fmt(Number(proj.budget))}</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Meter value={proj.progress} tone="data" className="flex-1" />
                        <span className="w-9 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{proj.progress}%</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {!isLoading && <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
            </div>

            {/* Desktop table */}
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
                    <SortableHeader label="Project" sortKey="name" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Status" sortKey="status" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Manager" sortKey="project_manager" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
                    <SortableHeader label="Budget" sortKey="budget" currentKey={sk} currentDir={sortDir} onSort={onSort} className="text-right" />
                    <SortableHeader label="Spend" sortKey="spent" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden md:table-cell" />
                    <SortableHeader label="Progress" sortKey="progress" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Finish" sortKey="end_date" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden xl:table-cell" />
                    <TableHead className="w-20 pr-5"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <SkeletonRows cols={9} /> : rows.map((proj) => (
                    <TableRow key={proj.id} data-state={selected.has(proj.id) ? "selected" : undefined} className="group">
                      <TableCell className="pl-5">
                        <Checkbox checked={selected.has(proj.id)} onCheckedChange={() => toggleSelect(proj.id)} aria-label={`Select ${proj.name}`} />
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <p className="truncate font-medium">{proj.name}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                          {proj.location && <><MapPin className="h-3 w-3 shrink-0" />{proj.location}</>}
                          {proj.phase && <span className="text-muted-foreground/70"> · {proj.phase}</span>}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusSelect value={proj.status} options={STATUSES} tones={STATUS_TONES} onChange={v => updateProject.mutate({ id: proj.id, status: v })} label={`Status for ${proj.name}`} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{proj.project_manager ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{fmt(Number(proj.budget))}</TableCell>
                      <TableCell className="hidden md:table-cell"><BurnCell p={proj} /></TableCell>
                      <TableCell>
                        <div className="flex w-28 items-center gap-2">
                          <Meter value={proj.progress} tone={proj.status === "Complete" ? "info" : "data"} className="flex-1" />
                          <span className="w-8 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{proj.progress}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell"><FinishLabel p={proj} /></TableCell>
                      <TableCell className="pr-5">
                        <div className="flex items-center justify-end gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(proj)} aria-label={`Edit ${proj.name}`}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(proj.id)} aria-label={`Delete ${proj.name}`}>
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

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={o => { if (!o) { setOpen(false); setEditingProject(null); } else setOpen(true); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingProject ? "Edit project" : "New project"}</DialogTitle>
            <DialogDescription>{editingProject ? "Update the project’s details, budget and schedule." : "Set up a project to track budget, schedule and field activity."}</DialogDescription>
          </DialogHeader>
          <form
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
          >
            <Field label="Project name" htmlFor="p-name" required className="sm:col-span-2">
              <Input id="p-name" autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Harbor Point Tower" />
            </Field>
            <Field label="Location" htmlFor="p-loc">
              <Input id="p-loc" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City, State" />
            </Field>
            <Field label="Project manager" htmlFor="p-pm">
              <Input id="p-pm" value={form.project_manager} onChange={e => setForm(f => ({ ...f, project_manager: e.target.value }))} />
            </Field>
            <Field label="Status">
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Budget (USD)" htmlFor="p-budget">
              <Input id="p-budget" type="number" inputMode="decimal" className="font-mono tabular-nums" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Start date" htmlFor="p-start">
              <Input id="p-start" type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </Field>
            <Field label="End date" htmlFor="p-end">
              <Input id="p-end" type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} />
            </Field>
            <Field label="Progress (%)" htmlFor="p-prog" className="sm:col-span-2">
              <div className="flex items-center gap-3">
                <Input id="p-prog" type="number" min="0" max="100" className="w-24 font-mono tabular-nums" value={form.progress} onChange={e => setForm(f => ({ ...f, progress: e.target.value }))} placeholder="0" />
                <Meter value={Number(form.progress) || 0} tone="data" className="flex-1" />
              </div>
            </Field>
            <DialogFooter className="gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => { setOpen(false); setEditingProject(null); }}>Cancel</Button>
              <Button type="submit" disabled={!form.name || createProject.isPending || updateProject.isPending}>
                {editingProject
                  ? (updateProject.isPending ? "Saving…" : "Save changes")
                  : (createProject.isPending ? "Creating…" : "Create project")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {projects.find(p => p.id === deleteId)?.name ?? "This project"} will be removed permanently. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteProject.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        count={selectedCount}
        onClear={clearSelection}
        actions={[
          { label: "On Track", onClick: () => handleBulkStatusUpdate("On Track") },
          { label: "At Risk", onClick: () => handleBulkStatusUpdate("At Risk") },
          { label: "Behind", onClick: () => handleBulkStatusUpdate("Behind") },
          { label: "Complete", onClick: () => handleBulkStatusUpdate("Complete") },
        ]}
      />
    </div>
  );
}
