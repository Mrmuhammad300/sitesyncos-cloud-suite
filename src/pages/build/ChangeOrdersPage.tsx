import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ArrowUpRight } from "lucide-react";
import { useChangeOrders, useCreateChangeOrder, useUpdateChangeOrder } from "@/hooks/useProjectData";
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

const fmt = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(2)}M` : `$${v.toLocaleString()}`;

export default function ChangeOrdersPage() {
  const { data: changeOrders = [], isLoading } = useChangeOrders();
  const createCO = useCreateChangeOrder();
  const updateCO = useUpdateChangeOrder();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    days_impact: "",
    category: "Scope Addition" as string,
    reason: "",
    requested_by: "",
  });

  const filtered = changeOrders.filter(co => {
    const ms = co.title.toLowerCase().includes(search.toLowerCase()) ||
      co.co_number.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || co.status === statusFilter;
    return ms && mst;
  });

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
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Change Order</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total COs</p><p className="text-xl font-bold">{changeOrders.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Value</p><p className="text-xl font-bold">{fmt(totalValue)}</p></CardContent></Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Approved Value</p>
            <p className="text-xl font-bold text-success flex items-center gap-1">
              <ArrowUpRight className="h-4 w-4" />{fmt(approvedValue)}
            </p>
          </CardContent>
        </Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending</p><p className="text-xl font-bold text-warning">{pendingCount}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
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
                  <TableHead className="text-xs">CO #</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Days Impact</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Requested By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((co) => (
                  <TableRow key={co.id}>
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
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                      No change orders found.
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
    </div>
  );
}
