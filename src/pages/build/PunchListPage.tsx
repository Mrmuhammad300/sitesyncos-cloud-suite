import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, CheckSquare, Trash2, Download, Printer, CheckCircle2 } from "lucide-react";
import { useWorkOrders, useCreateWorkOrder, useUpdateWorkOrder, useDeleteWorkOrder } from "@/hooks/useOpsData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import type { Tables } from "@/integrations/supabase/types";

type WorkOrder = Tables<"work_orders">;

const statusConfig: Record<string, string> = {
  Open: "bg-primary/10 text-primary border-primary/20",
  "In Progress": "bg-warning/10 text-warning border-warning/20",
  Completed: "bg-success/10 text-success border-success/20",
  "On Hold": "bg-muted text-muted-foreground",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const priorityColor: Record<string, string> = {
  Emergency: "bg-destructive/10 text-destructive border-destructive/20",
  High: "bg-warning/10 text-warning border-warning/20",
  Medium: "bg-accent/10 text-accent",
  Low: "bg-muted text-muted-foreground",
};

const STATUSES = ["Open", "In Progress", "Completed", "On Hold", "Cancelled"] as const;
const PRIORITIES = ["Emergency", "High", "Medium", "Low"] as const;

export default function PunchListPage() {
  const { data: allWorkOrders = [], isLoading } = useWorkOrders();
  const createWO = useCreateWorkOrder();
  const updateWO = useUpdateWorkOrder();
  const deleteWO = useDeleteWorkOrder();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkOrder | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", priority: "Medium", assigned_to: "",
    property_name: "", unit: "", due_date: "",
  });
  const [formError, setFormError] = useState("");

  // Only Punch List items
  const punchItems = allWorkOrders.filter(w => w.category === "Punch List");

  const filtered = punchItems.filter(w => {
    const ms = w.title.toLowerCase().includes(search.toLowerCase()) ||
      w.wo_number.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || w.status === statusFilter;
    return ms && mst;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<WorkOrder>(filtered, { pageSize: 25 });

  const openCount = punchItems.filter(w => w.status === "Open").length;
  const inProgressCount = punchItems.filter(w => w.status === "In Progress").length;
  const completedCount = punchItems.filter(w => w.status === "Completed").length;
  const completionPct = punchItems.length > 0
    ? Math.round((completedCount / punchItems.length) * 100)
    : 0;

  const handleSubmit = () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setFormError("");
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Punch List</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Build</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Track and close out deficiencies before project handoff.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button size="sm" variant="outline" onClick={handlePrintPDF}><Printer className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Add Item</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CheckSquare className="h-5 w-5 text-primary" />
            <div><p className="text-xs text-muted-foreground">Total Items</p><p className="text-xl font-bold">{punchItems.length}</p></div>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-xl font-bold text-primary">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Progress</p><p className="text-xl font-bold text-warning">{inProgressCount}</p></CardContent></Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-muted-foreground">Completion</p>
              <p className="text-xs font-semibold text-success">{completionPct}%</p>
            </div>
            <Progress value={completionPct} className="h-2" />
            <p className="text-[10px] text-muted-foreground mt-1">{completedCount} of {punchItems.length} closed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search punch list…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No punch list items found.</p>
        ) : rows.map((w) => (
          <Card key={w.id} className="cursor-pointer" onClick={() => setDetail(w)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{w.title}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{w.wo_number}{w.property_name ? ` · ${w.property_name}` : ""}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {w.status !== "Completed" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-success"
                      title="Mark complete"
                      onClick={e => { e.stopPropagation(); updateWO.mutate({ id: w.id, status: "Completed" }); }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={e => { e.stopPropagation(); setDeleteId(w.id); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${priorityColor[w.priority] ?? ""}`}>{w.priority}</Badge>
                <Badge variant="outline" className={`text-[10px] ${statusConfig[w.status] ?? ""}`}>{w.status}</Badge>
                {w.assigned_to && <span className="text-xs text-muted-foreground">{w.assigned_to}</span>}
                {w.due_date && <span className="text-xs text-muted-foreground">Due {w.due_date}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table — hidden on mobile */}
      <Card className="hidden sm:block">
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
                    <SortableHeader label="Item #" sortKey="wo_number" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                    <SortableHeader label="Title" sortKey="title" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                    <SortableHeader label="Priority" sortKey="priority" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                    <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                    <SortableHeader label="Assigned To" sortKey="assigned_to" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                    <SortableHeader label="Due Date" sortKey="due_date" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof WorkOrder)} />
                    <TableHead className="w-16" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((w) => (
                    <TableRow key={w.id} data-selected={selected.has(w.id)} className="cursor-pointer" onClick={() => setDetail(w)}>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selected.has(w.id)} onCheckedChange={() => toggleSelect(w.id)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{w.wo_number}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{w.title}</p>
                        {w.property_name && <p className="text-xs text-muted-foreground">{w.property_name}{w.unit ? ` · ${w.unit}` : ""}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${priorityColor[w.priority] ?? ""}`}>{w.priority}</Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Select
                          value={w.status}
                          onValueChange={v => updateWO.mutate({ id: w.id, status: v })}
                        >
                          <SelectTrigger className="h-7 w-[130px] text-[10px] border-0 p-0">
                            <Badge variant="outline" className={`text-[10px] ${statusConfig[w.status] ?? ""}`}>{w.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{w.assigned_to ?? "—"}</TableCell>
                      <TableCell className="text-sm">{w.due_date ?? "—"}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          {w.status !== "Completed" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-success"
                              title="Mark complete"
                              onClick={() => updateWO.mutate({ id: w.id, status: "Completed" })}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteId(w.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        No punch list items found.
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

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{detail?.wo_number}</span>
              {detail?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${priorityColor[detail?.priority ?? ""] ?? ""}`}>{detail?.priority}</Badge>
              <Badge variant="outline" className={`text-[10px] ${statusConfig[detail?.status ?? ""] ?? ""}`}>{detail?.status}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Assigned To:</span> {detail?.assigned_to ?? "—"}</div>
              <div><span className="text-muted-foreground">Due Date:</span> {detail?.due_date ?? "—"}</div>
              <div><span className="text-muted-foreground">Property:</span> {detail?.property_name ?? "—"}</div>
              <div><span className="text-muted-foreground">Unit / Area:</span> {detail?.unit ?? "—"}</div>
            </div>
            {detail?.description && (
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{detail.description}</p>
              </div>
            )}
            {detail?.status !== "Completed" && (
              <Button
                className="w-full"
                onClick={() => { if (detail) { updateWO.mutate({ id: detail.id, status: "Completed" }); setDetail(null); } }}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Mark as Completed
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormError(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Punch List Item</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(""); }} placeholder="Deficiency description" className={formError ? "border-destructive" : ""} />
              {formError && <p className="text-xs text-destructive mt-1">{formError}</p>}
            </div>
            <div><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Priority</Label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Assigned To</Label><Input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Property</Label><Input value={form.property_name} onChange={e => setForm(f => ({ ...f, property_name: e.target.value }))} /></div>
              <div><Label className="text-xs">Unit / Area</Label><Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={!form.title || createWO.isPending}>
              {createWO.isPending ? "Adding…" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Punch List Item?</AlertDialogTitle>
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

      {/* Bulk Action Bar */}
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
