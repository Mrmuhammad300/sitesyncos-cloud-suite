import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useRFIs, useCreateRFI, useUpdateRFI } from "@/hooks/useProjectData";
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

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", description: "", priority: "Medium", assigned_to: "", due_date: "" });

  const filtered = rfis.filter(r => {
    const ms = r.subject.toLowerCase().includes(search.toLowerCase()) ||
      r.rfi_number.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || r.status === statusFilter;
    return ms && mst;
  });

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
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New RFI</Button>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">RFI #</TableHead>
                  <TableHead className="text-xs">Subject</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Assigned To</TableHead>
                  <TableHead className="text-xs">Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rfi) => (
                  <TableRow key={rfi.id}>
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
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                      No RFIs found.
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
    </div>
  );
}
