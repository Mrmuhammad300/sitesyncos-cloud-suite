import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Wrench, Clock, CheckCircle2, AlertTriangle, Trash2, Download } from "lucide-react";
import { useWorkOrders, useCreateWorkOrder, useDeleteWorkOrder } from "@/hooks/useOpsData";
import { Tables } from "@/integrations/supabase/types";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { exportToCSV } from "@/lib/export";

type WorkOrder = Tables<"work_orders">;

const statusConfig: Record<string, string> = {
  Open: "bg-primary/10 text-primary",
  "In Progress": "bg-warning/10 text-warning",
  Completed: "bg-success/10 text-success",
  "On Hold": "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/10 text-destructive",
};

const priorityColor: Record<string, string> = {
  Emergency: "bg-destructive/10 text-destructive",
  High: "bg-warning/10 text-warning",
  Medium: "bg-accent/10 text-accent",
  Low: "bg-muted text-muted-foreground",
};

const WorkOrdersPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<WorkOrder | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "Medium", category: "", assigned_to: "", property_name: "", unit: "", due_date: "" });
  const filters = ["All", "Open", "In Progress", "Completed", "On Hold", "Cancelled"];
  const { data: wos = [], isLoading } = useWorkOrders();
  const createWO = useCreateWorkOrder();
  const deleteWO = useDeleteWorkOrder();

  const filtered = wos.filter(
    (w) => (filter === "All" || w.status === filter) && (w.title.toLowerCase().includes(search.toLowerCase()) || w.wo_number.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
  } = useTableFeatures<WorkOrder>(filtered, { pageSize: 25 });

  const kpis = [
    { label: "Total WOs", value: wos.length, icon: <Wrench className="h-5 w-5 text-primary" /> },
    { label: "Open", value: wos.filter(w => w.status === "Open").length, icon: <Clock className="h-5 w-5 text-primary" /> },
    { label: "In Progress", value: wos.filter(w => w.status === "In Progress").length, icon: <AlertTriangle className="h-5 w-5 text-warning" /> },
    { label: "Completed", value: wos.filter(w => w.status === "Completed").length, icon: <CheckCircle2 className="h-5 w-5 text-success" /> },
  ];

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Work Orders</h1><p className="text-sm text-muted-foreground">Create and track maintenance work orders</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Work Order</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (<Card key={k.label}><CardContent className="p-4 flex items-center gap-3">{k.icon}<div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></CardContent></Card>))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search work orders..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="flex gap-2 flex-wrap">{filters.map((f) => (<Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>))}</div>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No work orders found.</p>
        ) : rows.map((w) => (
          <Card key={w.id} className="cursor-pointer" onClick={() => setDetail(w)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{w.title}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{w.wo_number}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(w.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`text-[10px] ${statusConfig[w.status]}`}>{w.status}</Badge>
                <Badge className={`text-[10px] ${priorityColor[w.priority]}`}>{w.priority}</Badge>
                {w.category && <span className="text-xs text-muted-foreground">{w.category}</span>}
                {w.assigned_to && <span className="text-xs text-muted-foreground">{w.assigned_to}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden sm:block"><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="WO #" sortKey="wo_number" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                  <SortableHeader label="Title" sortKey="title" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                  <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                  <SortableHeader label="Priority" sortKey="priority" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                  <TableHead>Category</TableHead>
                  <SortableHeader label="Assigned To" sortKey="assigned_to" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                  <SortableHeader label="Due Date" sortKey="due_date" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => (
                  <TableRow key={w.id} className="cursor-pointer" onClick={() => setDetail(w)}>
                    <TableCell className="font-mono text-xs">{w.wo_number}</TableCell>
                    <TableCell className="font-medium max-w-[250px] truncate">{w.title}</TableCell>
                    <TableCell><Badge className={statusConfig[w.status]}>{w.status}</Badge></TableCell>
                    <TableCell><Badge className={priorityColor[w.priority]}>{w.priority}</Badge></TableCell>
                    <TableCell>{w.category || "—"}</TableCell>
                    <TableCell>{w.assigned_to || "—"}</TableCell>
                    <TableCell className="text-sm">{w.due_date || "—"}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(w.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No work orders found</TableCell></TableRow>}
              </TableBody>
            </Table>
            <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{detail?.wo_number}</span>{detail?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2"><Badge className={statusConfig[detail?.status || ""]}>{detail?.status}</Badge><Badge className={priorityColor[detail?.priority || ""]}>{detail?.priority}</Badge></div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Category:</span> {detail?.category || "—"}</div>
              <div><span className="text-muted-foreground">Assigned To:</span> {detail?.assigned_to || "—"}</div>
              <div><span className="text-muted-foreground">Property:</span> {detail?.property_name || "—"}</div>
              <div><span className="text-muted-foreground">Unit:</span> {detail?.unit || "—"}</div>
              <div><span className="text-muted-foreground">Due:</span> {detail?.due_date || "—"}</div>
              <div><span className="text-muted-foreground">Completed:</span> {detail?.completed_date || "—"}</div>
            </div>
            {detail?.description && <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1">{detail.description}</p></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Work Order</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Work order title" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Emergency">Emergency</SelectItem><SelectItem value="High">High</SelectItem><SelectItem value="Medium">Medium</SelectItem><SelectItem value="Low">Low</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent><SelectItem value="Plumbing">Plumbing</SelectItem><SelectItem value="Electrical">Electrical</SelectItem><SelectItem value="HVAC">HVAC</SelectItem><SelectItem value="Structural">Structural</SelectItem><SelectItem value="General">General</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Property</Label><Input value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} placeholder="Property name" /></div>
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="Unit #" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Assigned To</Label><Input value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Worker name" /></div>
              <div><Label>Due Date</Label><Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createWO.isPending}>{createWO.isPending ? "Creating..." : "Create Work Order"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Work Order?</AlertDialogTitle>
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
