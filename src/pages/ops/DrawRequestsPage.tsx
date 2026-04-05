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
import { Search, Plus, CreditCard, Clock, CheckCircle2, DollarSign, Trash2, Download, Printer } from "lucide-react";
import { useDrawRequests, useCreateDrawRequest, useDeleteDrawRequest } from "@/hooks/useOpsData";
import { Tables } from "@/integrations/supabase/types";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { exportToCSV, printToPDF } from "@/lib/export";
import { fmtDollar } from "@/lib/utils";

type DrawRequest = Tables<"draw_requests">;

const statusConfig: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-primary/10 text-primary",
  "Under Review": "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Rejected: "bg-destructive/10 text-destructive",
  Paid: "bg-accent/10 text-accent",
};

const DrawRequestsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<DrawRequest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", amount: "", description: "", requested_by: "" });
  const filters = ["All", "Draft", "Submitted", "Under Review", "Approved", "Rejected", "Paid"];
  const { data: draws = [], isLoading } = useDrawRequests();
  const createDraw = useCreateDrawRequest();
  const deleteDraw = useDeleteDrawRequest();

  const filtered = draws.filter(
    (d) => (filter === "All" || d.status === filter) && (d.title.toLowerCase().includes(search.toLowerCase()) || d.draw_number.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
  } = useTableFeatures<DrawRequest>(filtered, { pageSize: 25 });

  const totalRequested = draws.reduce((s, d) => s + Number(d.amount), 0);
  const totalApproved = draws.filter(d => d.status === "Approved" || d.status === "Paid").reduce((s, d) => s + Number(d.amount), 0);

  const kpis = [
    { label: "Total Draws", value: draws.length, icon: <CreditCard className="h-5 w-5 text-primary" /> },
    { label: "Total Requested", value: `$${(totalRequested / 1e6).toFixed(1)}M`, icon: <DollarSign className="h-5 w-5 text-accent" /> },
    { label: "Approved/Paid", value: `$${(totalApproved / 1e6).toFixed(1)}M`, icon: <CheckCircle2 className="h-5 w-5 text-success" /> },
    { label: "Pending", value: draws.filter(d => ["Submitted", "Under Review"].includes(d.status)).length, icon: <Clock className="h-5 w-5 text-warning" /> },
  ];

  const handleCreate = () => {
    if (!form.title) return;
    const drawNum = `DRAW-${String(draws.length + 1).padStart(3, "0")}`;
    createDraw.mutate({
      draw_number: drawNum,
      title: form.title,
      amount: Number(form.amount) || 0,
      description: form.description || null,
      requested_by: form.requested_by || null,
      submitted_date: new Date().toISOString().split("T")[0],
      status: "Submitted",
    });
    setCreateOpen(false);
    setForm({ title: "", amount: "", description: "", requested_by: "" });
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "draw-requests", {
      draw_number: "Draw #", title: "Title", status: "Status",
      amount: "Amount", requested_by: "Requested By", submitted_date: "Submitted",
    });
  };

  const handlePrintPDF = () => {
    const tableHtml = `<table>
      <thead><tr><th>Draw #</th><th>Title</th><th>Status</th><th>Amount</th><th>Requested By</th><th>Submitted</th></tr></thead>
      <tbody>${filtered.map(d => `<tr>
        <td>${d.draw_number}</td>
        <td>${d.title}</td>
        <td>${d.status}</td>
        <td>$${Number(d.amount).toLocaleString()}</td>
        <td>${d.requested_by ?? "—"}</td>
        <td>${d.submitted_date ?? "—"}</td>
      </tr>`).join("")}</tbody>
    </table>`;
    printToPDF(`Draw Requests — ${new Date().toLocaleDateString()}`, tableHtml);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Draw Requests</h1><p className="text-sm text-muted-foreground">Submit and approve draw requests</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button variant="outline" size="sm" onClick={handlePrintPDF}><Printer className="mr-2 h-4 w-4" />PDF</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Draw Request</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (<Card key={k.label} className="ss-stat-card"><CardContent className="p-0 flex items-center gap-3">{k.icon}<div><p className="ss-stat-value">{k.value}</p><p className="ss-stat-label">{k.label}</p></div></CardContent></Card>))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search draw requests..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="flex gap-2 flex-wrap">{filters.map((f) => (<Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>))}</div>
      </div>

      <Card><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Draw #" sortKey="draw_number" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DrawRequest)} />
                  <SortableHeader label="Title" sortKey="title" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DrawRequest)} />
                  <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DrawRequest)} />
                  <SortableHeader label="Amount" sortKey="amount" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DrawRequest)} className="text-right" />
                  <SortableHeader label="Requested By" sortKey="requested_by" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DrawRequest)} />
                  <SortableHeader label="Submitted" sortKey="submitted_date" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DrawRequest)} />
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetail(d)}>
                    <TableCell className="font-mono text-xs">{d.draw_number}</TableCell>
                    <TableCell className="font-medium max-w-[250px] truncate">{d.title}</TableCell>
                    <TableCell><Badge className={statusConfig[d.status]}>{d.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono">${Number(d.amount).toLocaleString()}</TableCell>
                    <TableCell>{d.requested_by || "—"}</TableCell>
                    <TableCell className="text-sm">{d.submitted_date || "—"}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(d.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No draw requests found</TableCell></TableRow>}
              </TableBody>
            </Table>
            <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{detail?.draw_number}</span>{detail?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Badge className={statusConfig[detail?.status || ""]}>{detail?.status}</Badge>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Amount:</span> <span className="font-mono font-bold">${Number(detail?.amount || 0).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Requested By:</span> {detail?.requested_by || "—"}</div>
              <div><span className="text-muted-foreground">Approved By:</span> {detail?.approved_by || "—"}</div>
              <div><span className="text-muted-foreground">Submitted:</span> {detail?.submitted_date || "—"}</div>
            </div>
            {detail?.description && <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1">{detail.description}</p></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Draw Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Draw request title" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the draw request..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount ($)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0" /></div>
              <div><Label>Requested By</Label><Input value={form.requested_by} onChange={(e) => setForm({ ...form, requested_by: e.target.value })} placeholder="Name" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createDraw.isPending}>{createDraw.isPending ? "Submitting..." : "Submit Draw"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draw Request?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteDraw.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DrawRequestsPage;
