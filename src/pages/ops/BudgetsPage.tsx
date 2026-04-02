import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Search, Plus, DollarSign, TrendingUp, AlertTriangle, PieChart, Sparkles } from "lucide-react";
import { useBudgets, useCreateBudget } from "@/hooks/useOpsData";
import { useAuth } from "@/hooks/useAuth";
import { Tables } from "@/integrations/supabase/types";
import { AiInsightCard } from "@/components/AiInsightCard";

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Draft: "bg-muted text-muted-foreground",
  Closed: "bg-primary/10 text-primary",
  "Over Budget": "bg-destructive/10 text-destructive",
};

const BudgetsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Tables<"budgets"> | null>(null);
  const [form, setForm] = useState({ category: "", description: "", allocated: "", fiscal_year: "" });
  const filters = ["All", "Active", "Draft", "Closed", "Over Budget"];
  const { data: budgets = [], isLoading } = useBudgets();
  const createBudget = useCreateBudget();
  const { user } = useAuth();

  const filtered = budgets.filter(
    (b) => (filter === "All" || b.status === filter) && b.category.toLowerCase().includes(search.toLowerCase())
  );

  const totalAllocated = budgets.reduce((s, b) => s + Number(b.allocated), 0);
  const totalSpent = budgets.reduce((s, b) => s + Number(b.spent), 0);
  const utilization = totalAllocated > 0 ? Math.round((totalSpent / totalAllocated) * 100) : 0;

  const kpis = [
    { label: "Total Allocated", value: `$${(totalAllocated / 1e6).toFixed(1)}M`, icon: <DollarSign className="h-5 w-5 text-primary" /> },
    { label: "Total Spent", value: `$${(totalSpent / 1e6).toFixed(1)}M`, icon: <TrendingUp className="h-5 w-5 text-success" /> },
    { label: "Utilization", value: `${utilization}%`, icon: <PieChart className="h-5 w-5 text-accent" /> },
    { label: "Over Budget", value: budgets.filter(b => Number(b.spent) > Number(b.allocated)).length, icon: <AlertTriangle className="h-5 w-5 text-destructive" /> },
  ];

  const handleCreate = () => {
    if (!form.category) return;
    createBudget.mutate({
      category: form.category,
      description: form.description || null,
      allocated: Number(form.allocated) || 0,
      fiscal_year: form.fiscal_year || null,
      created_by: user?.id || null,
    });
    setCreateOpen(false);
    setForm({ category: "", description: "", allocated: "", fiscal_year: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Budgets</h1><p className="text-sm text-muted-foreground">Create and manage project budgets</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New Budget</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (<Card key={k.label}><CardContent className="p-4 flex items-center gap-3">{k.icon}<div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></CardContent></Card>))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search budgets..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="flex gap-2 flex-wrap">{filters.map((f) => (<Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>))}</div>
      </div>

      <AiInsightCard
        type="budget-monitor"
        title="Quantum Ledger — Budget Analysis"
        agentName="Quantum Ledger"
        icon={<Sparkles className="h-4 w-4 text-accent" />}
      />

      <Card><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Allocated</TableHead><TableHead className="text-right">Spent</TableHead><TableHead>Utilization</TableHead><TableHead>Fiscal Year</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((b) => {
                const pct = Number(b.allocated) > 0 ? Math.round((Number(b.spent) / Number(b.allocated)) * 100) : 0;
                return (
                  <TableRow key={b.id} className="cursor-pointer" onClick={() => setDetail(b)}>
                    <TableCell><div className="font-medium">{b.category}</div><div className="text-xs text-muted-foreground truncate max-w-[200px]">{b.description}</div></TableCell>
                    <TableCell><Badge className={statusColor[b.status] || "bg-muted text-muted-foreground"}>{b.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono">${Number(b.allocated).toLocaleString()}</TableCell>
                    <TableCell className="text-right font-mono">${Number(b.spent).toLocaleString()}</TableCell>
                    <TableCell><div className="flex items-center gap-2"><Progress value={pct} className="h-2 w-16" /><span className="text-xs">{pct}%</span></div></TableCell>
                    <TableCell>{b.fiscal_year || "—"}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No budgets found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.category}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Badge className={statusColor[detail?.status || ""]}>{detail?.status}</Badge>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Allocated:</span> <span className="font-mono font-bold">${Number(detail?.allocated || 0).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Spent:</span> <span className="font-mono">${Number(detail?.spent || 0).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Remaining:</span> <span className="font-mono">${(Number(detail?.allocated || 0) - Number(detail?.spent || 0)).toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Fiscal Year:</span> {detail?.fiscal_year || "—"}</div>
            </div>
            {detail?.description && <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1">{detail.description}</p></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create New Budget</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Structural, MEP, Sitework" /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Budget description" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Allocated Amount ($)</Label><Input type="number" value={form.allocated} onChange={(e) => setForm({ ...form, allocated: e.target.value })} placeholder="0" /></div>
              <div><Label>Fiscal Year</Label><Input value={form.fiscal_year} onChange={(e) => setForm({ ...form, fiscal_year: e.target.value })} placeholder="2026" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createBudget.isPending}>{createBudget.isPending ? "Creating..." : "Create Budget"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetsPage;
