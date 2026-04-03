import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, MapPin } from "lucide-react";
import { useProjects, useCreateProject, useUpdateProject } from "@/hooks/useProjectData";
import type { Database } from "@/integrations/supabase/types";

type Project = Database["public"]["Tables"]["projects"]["Row"];

const statusColor: Record<string, string> = {
  "On Track": "bg-success/10 text-success border-success/20",
  "At Risk": "bg-warning/10 text-warning border-warning/20",
  "Behind": "bg-destructive/10 text-destructive border-destructive/20",
  "Complete": "bg-primary/10 text-primary border-primary/20",
};

const STATUSES = ["On Track", "At Risk", "Behind", "Complete"] as const;

const fmt = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString()}`;

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", location: "", project_manager: "", status: "On Track",
    budget: "", start_date: "", end_date: "",
  });

  const filtered = projects.filter(p => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.location ?? "").toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || p.status === statusFilter;
    return ms && mst;
  });

  const totalBudget = projects.reduce((s, p) => s + Number(p.budget), 0);
  const totalSpent = projects.reduce((s, p) => s + Number(p.spent), 0);
  const activeCount = projects.filter(p => p.status !== "Complete").length;
  const avgProgress = projects.length
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length)
    : 0;

  const handleSubmit = () => {
    if (!form.name) return;
    createProject.mutate({
      name: form.name,
      location: form.location || null,
      project_manager: form.project_manager || null,
      status: form.status,
      budget: Number(form.budget) || 0,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    });
    setOpen(false);
    setForm({ name: "", location: "", project_manager: "", status: "On Track", budget: "", start_date: "", end_date: "" });
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
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Project</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Projects</p><p className="text-xl font-bold">{projects.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Active</p><p className="text-xl font-bold text-primary">{activeCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Budget</p><p className="text-xl font-bold">{fmt(totalBudget)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Progress</p><p className="text-xl font-bold">{avgProgress}%</p></CardContent></Card>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Project</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Manager</TableHead>
                  <TableHead className="text-xs">Budget</TableHead>
                  <TableHead className="text-xs">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((proj) => (
                  <TableRow key={proj.id}>
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
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                      No projects found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
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
    </div>
  );
}
