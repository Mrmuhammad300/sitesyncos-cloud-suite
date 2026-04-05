import { useState } from "react";
import { fmtDollar } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MapPin, Trash2, Download, Pencil } from "lucide-react";
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV } from "@/lib/export";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const statusColor: Record<string, string> = {
  "On Track": "bg-success/10 text-success border-success/20",
  "At Risk": "bg-warning/10 text-warning border-warning/20",
  "Behind": "bg-destructive/10 text-destructive border-destructive/20",
  "Complete": "bg-primary/10 text-primary border-primary/20",
};

const STATUSES = ["On Track", "At Risk", "Behind", "Complete"] as const;

const fmt = fmtDollar;

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

  const totalBudget = projects.reduce((s, p) => s + Number(p.budget), 0);
  const totalSpent = projects.reduce((s, p) => s + Number(p.spent), 0);
  const activeCount = projects.filter(p => p.status !== "Complete").length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Build</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage construction projects and track progress.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" />New Project</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Total Projects</p><p className="ss-stat-value">{projects.length}</p></CardContent></Card>
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Active</p><p className="ss-stat-value text-primary">{activeCount}</p></CardContent></Card>
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Total Budget</p><p className="ss-stat-value">{fmt(totalBudget)}</p></CardContent></Card>
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Avg Progress</p><p className="ss-stat-value">{avgProgress}%</p></CardContent></Card>
      </div>

      {/* Spend bar */}
      {totalBudget > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Total Spend vs Budget</span>
              <span>{fmt(totalSpent)} / {fmt(totalBudget)}</span>
            </div>
            <Progress value={Math.min((totalSpent / totalBudget) * 100, 100)} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile card list (hidden on sm+) */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)
        ) : rows.map((proj) => (
          <Card key={proj.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{proj.name}</p>
                  {proj.location && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{proj.location}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Badge variant="outline" className={`text-[10px] ${statusColor[proj.status] ?? ""}`}>{proj.status}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => openEdit(proj)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(proj.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{proj.project_manager ?? "No manager"}</span>
                <span className="font-medium text-foreground">{fmt(Number(proj.budget))}</span>
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                  <span>Progress</span><span>{proj.progress}%</span>
                </div>
                <Progress value={proj.progress} className="h-1.5" />
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && rows.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No projects found.</p>
        )}
        {!isLoading && <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
      </div>

      {/* Table (hidden on mobile) */}
      <Card className="hidden sm:block ss-card-glow">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => { if (el) (el as HTMLButtonElement).dataset.indeterminate = String(isIndeterminate); }}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <SortableHeader label="Project" sortKey="name" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Project)} />
                    <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Project)} />
                    <SortableHeader label="Manager" sortKey="project_manager" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Project)} />
                    <SortableHeader label="Budget" sortKey="budget" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Project)} />
                    <SortableHeader label="Progress" sortKey="progress" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Project)} />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((proj) => (
                    <TableRow key={proj.id} data-selected={selected.has(proj.id)}>
                      <TableCell>
                        <Checkbox checked={selected.has(proj.id)} onCheckedChange={() => toggleSelect(proj.id)} />
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{proj.name}</p>
                        {proj.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{proj.location}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={proj.status}
                          onValueChange={v => updateProject.mutate({ id: proj.id, status: v })}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-[10px] border-0 p-0">
                            <Badge variant="outline" className={`text-[10px] ${statusColor[proj.status] ?? ""}`}>{proj.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{proj.project_manager ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(Number(proj.budget))}</TableCell>
                      <TableCell>
                        <div className="w-24">
                          <div className="text-[10px] text-muted-foreground mb-1">{proj.progress}%</div>
                          <Progress value={proj.progress} className="h-1.5" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(proj.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                        No projects found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label className="text-xs">Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Project Manager</Label><Input value={form.project_manager} onChange={e => setForm(f => ({ ...f, project_manager: e.target.value }))} /></div>
              <div>
                <Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label className="text-xs">Budget ($)</Label><Input type="number" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label className="text-xs">End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={!form.name || createProject.isPending}>
              {createProject.isPending ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteProject.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Bar */}
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
