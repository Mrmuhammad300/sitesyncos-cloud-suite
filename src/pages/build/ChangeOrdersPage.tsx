import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ArrowUpRight, Trash2, Download, Printer } from "lucide-react";
import { useChangeOrders, useCreateChangeOrder, useUpdateChangeOrder, useDeleteChangeOrder, useProjects } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import type { Database } from "@/integrations/supabase/types";

type ChangeOrder = Database["public"]["Tables"]["change_orders"]["Row"];

const statusColor: Record<string, string> = {
  Pending: "bg-muted text-muted-foreground",
  "Under Review": "bg-warning/10 text-warning border-warning/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const STATUSES = ["Pending", "Under Review", "Approved", "Rejected"] as const;
const CATEGORIES = ["Scope Addition", "Scope Reduction", "Design Change", "Unforeseen Conditions", "Owner Request", "Other"] as const;

const fmt = fmtDollar;

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

  const totalValue = changeOrders.reduce((s, co) => s + Number(co.amount), 0);
  const approvedValue = changeOrders
    .filter(co => co.status === "Approved")
    .reduce((s, co) => s + Number(co.amount), 0);
  const pendingCount = changeOrders.filter(co => co.status === "Pending").length;
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Change Orders</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Build</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Review, approve, and track change orders and cost impacts.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrintPDF}><Printer className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1.5" />CSV</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Change Order</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Total COs</p><p className="ss-stat-value">{changeOrders.length}</p></CardContent></Card>
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Total Value</p><p className="ss-stat-value">{fmt(totalValue)}</p></CardContent></Card>
        <Card className="ss-stat-card">
          <CardContent className="p-0">
            <p className="ss-stat-label">Approved Value</p>
            <p className="ss-stat-value text-success flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" />{fmt(approvedValue)}
            </p>
          </CardContent>
        </Card>
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Pending</p><p className="ss-stat-value text-warning">{pendingCount}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search change orders…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {projects.length > 0 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No change orders found.</p>
        ) : rows.map((co) => (
          <Card key={co.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{co.title}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{co.co_number}{co.category ? ` · ${co.category}` : ""}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(co.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${statusColor[co.status] ?? ""}`}>{co.status}</Badge>
                <span className="text-xs font-mono font-medium">{fmt(Number(co.amount))}</span>
                {Number(co.days_impact) > 0 && <span className="text-xs text-warning">+{co.days_impact}d</span>}
                {co.requested_by && <span className="text-xs text-muted-foreground">{co.requested_by}</span>}
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
                    <SortableHeader label="CO #" sortKey="co_number" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof ChangeOrder)} />
                    <SortableHeader label="Title" sortKey="title" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof ChangeOrder)} />
                    <SortableHeader label="Category" sortKey="category" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof ChangeOrder)} />
                    <SortableHeader label="Amount" sortKey="amount" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof ChangeOrder)} />
                    <SortableHeader label="Days" sortKey="days_impact" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof ChangeOrder)} />
                    <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof ChangeOrder)} />
                    <SortableHeader label="Requested By" sortKey="requested_by" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof ChangeOrder)} />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((co) => (
                    <TableRow key={co.id} data-selected={selected.has(co.id)}>
                      <TableCell>
                        <Checkbox checked={selected.has(co.id)} onCheckedChange={() => toggleSelect(co.id)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{co.co_number}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{co.title}</p>
                        {co.reason && <p className="text-xs text-muted-foreground truncate max-w-xs">{co.reason}</p>}
                      </TableCell>
                      <TableCell className="text-sm">{co.category ?? "—"}</TableCell>
                      <TableCell className="text-sm font-medium">{fmt(Number(co.amount))}</TableCell>
                      <TableCell className="text-sm text-center">
                        {Number(co.days_impact) > 0
                          ? <span className="text-warning">+{co.days_impact}d</span>
                          : <span className="text-muted-foreground">{co.days_impact}d</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={co.status}
                          onValueChange={v => updateCO.mutate({ id: co.id, status: v })}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-[10px] border-0 p-0">
                            <Badge variant="outline" className={`text-[10px] ${statusColor[co.status] ?? ""}`}>{co.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{co.requested_by ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(co.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                        No change orders found.
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
          <DialogHeader><DialogTitle>New Change Order</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Title *</Label><Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Amount ($)</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} /></div>
              <div><Label className="text-xs">Days Impact</Label><Input type="number" value={form.days_impact} onChange={e => setForm(f => ({ ...f, days_impact: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Reason / Description</Label><Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} /></div>
            <div><Label className="text-xs">Requested By</Label><Input value={form.requested_by} onChange={e => setForm(f => ({ ...f, requested_by: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleSubmit} disabled={!form.title || createCO.isPending}>
              {createCO.isPending ? "Creating…" : "Create Change Order"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Change Order?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteCO.mutate(deleteId); setDeleteId(null); } }}
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
          { label: "Under Review", onClick: () => handleBulkStatusUpdate("Under Review") },
          { label: "Approved", onClick: () => handleBulkStatusUpdate("Approved") },
          { label: "Rejected", onClick: () => handleBulkStatusUpdate("Rejected") },
        ]}
      />
    </div>
  );
}
