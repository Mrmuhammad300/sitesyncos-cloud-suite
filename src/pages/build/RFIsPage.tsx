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
import { Plus, Search, Trash2, Download, Printer } from "lucide-react";
import { useRFIs, useCreateRFI, useUpdateRFI, useDeleteRFI } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import type { Database } from "@/integrations/supabase/types";

type RFI = Database["public"]["Tables"]["rfis"]["Row"];

const priorityColor: Record<string, string> = {
  High: "bg-destructive/10 text-destructive border-destructive/20",
  Medium: "bg-warning/10 text-warning border-warning/20",
  Low: "bg-muted text-muted-foreground",
};

const statusColor: Record<string, string> = {
  Open: "bg-primary/10 text-primary border-primary/20",
  "In Review": "bg-warning/10 text-warning border-warning/20",
  Answered: "bg-success/10 text-success border-success/20",
  Closed: "bg-muted text-muted-foreground",
};

const STATUSES = ["Open", "In Review", "Answered", "Closed"] as const;
const PRIORITIES = ["High", "Medium", "Low"] as const;

export default function RFIsPage() {
  const { data: rfis = [], isLoading } = useRFIs();
  const createRFI = useCreateRFI();
  const updateRFI = useUpdateRFI();
  const deleteRFI = useDeleteRFI();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ subject: "", description: "", priority: "Medium", assigned_to: "", due_date: "" });

  const filtered = rfis.filter(r => {
    const ms = r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.rfi_number.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || r.status === statusFilter;
    return ms && mst;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<RFI>(filtered, { pageSize: 25 });

  const openCount = rfis.filter(r => r.status === "Open").length;
  const inReviewCount = rfis.filter(r => r.status === "In Review").length;
  const answeredCount = rfis.filter(r => r.status === "Answered").length;

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">RFIs</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Build</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Track and resolve Requests for Information.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button size="sm" variant="outline" onClick={handlePrintPDF}><Printer className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New RFI</Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{rfis.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Open</p><p className="text-xl font-bold text-primary">{openCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">In Review</p><p className="text-xl font-bold text-warning">{inReviewCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Answered</p><p className="text-xl font-bold text-success">{answeredCount}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search RFIs…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards — visible on small screens */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No RFIs found.</p>
        ) : rows.map((rfi) => (
          <Card key={rfi.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{rfi.subject}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{rfi.rfi_number}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(rfi.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${priorityColor[rfi.priority] ?? ""}`}>{rfi.priority}</Badge>
                <Badge variant="outline" className={`text-[10px] ${statusColor[rfi.status] ?? ""}`}>{rfi.status}</Badge>
                {rfi.assigned_to && <span className="text-xs text-muted-foreground">{rfi.assigned_to}</span>}
                {rfi.due_date && <span className="text-xs text-muted-foreground">Due {rfi.due_date}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table — hidden on small screens */}
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
                    <SortableHeader label="RFI #" sortKey="rfi_number" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof RFI)} />
                    <SortableHeader label="Subject" sortKey="subject" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof RFI)} />
                    <SortableHeader label="Priority" sortKey="priority" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof RFI)} />
                    <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof RFI)} />
                    <SortableHeader label="Assigned To" sortKey="assigned_to" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof RFI)} />
                    <SortableHeader label="Due Date" sortKey="due_date" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof RFI)} />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((rfi) => (
                    <TableRow key={rfi.id} data-selected={selected.has(rfi.id)}>
                      <TableCell>
                        <Checkbox checked={selected.has(rfi.id)} onCheckedChange={() => toggleSelect(rfi.id)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{rfi.rfi_number}</TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{rfi.subject}</p>
                        {rfi.description && <p className="text-xs text-muted-foreground truncate max-w-xs">{rfi.description}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${priorityColor[rfi.priority] ?? ""}`}>{rfi.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={rfi.status}
                          onValueChange={v => updateRFI.mutate({ id: rfi.id, status: v })}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-[10px] border-0 p-0">
                            <Badge variant="outline" className={`text-[10px] ${statusColor[rfi.status] ?? ""}`}>{rfi.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{rfi.assigned_to ?? "—"}</TableCell>
                      <TableCell className="text-sm">{rfi.due_date ?? "—"}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(rfi.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">
                        No RFIs found.
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
          <DialogHeader><DialogTitle>New RFI</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Subject *</Label><Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
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
            <Button className="w-full" onClick={handleSubmit} disabled={!form.subject || createRFI.isPending}>
              {createRFI.isPending ? "Creating…" : "Create RFI"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete RFI?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteRFI.mutate(deleteId); setDeleteId(null); } }}
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
          { label: "Open", onClick: () => handleBulkStatusUpdate("Open") },
          { label: "In Review", onClick: () => handleBulkStatusUpdate("In Review") },
          { label: "Answered", onClick: () => handleBulkStatusUpdate("Answered") },
          { label: "Closed", onClick: () => handleBulkStatusUpdate("Closed") },
        ]}
      />
    </div>
  );
}
