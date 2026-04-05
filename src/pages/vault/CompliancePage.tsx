import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, Clock, Search, FileText, Plus } from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  Compliant: { color: "text-green-500", icon: CheckCircle2 },
  "Non-Compliant": { color: "text-destructive", icon: AlertTriangle },
  Pending: { color: "text-yellow-500", icon: Clock },
  Expired: { color: "text-destructive", icon: AlertTriangle },
};

export default function CompliancePage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["compliance_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compliance_items").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const { error } = await supabase.from("compliance_items").insert({
        category: form.get("category") as string,
        requirement: form.get("requirement") as string,
        status: form.get("status") as string,
        due_date: form.get("due_date") as string || null,
        assignee: form.get("assignee") as string,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compliance_items"] }); setOpen(false); toast.success("Item added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("compliance_items").update({ status, last_checked: new Date().toISOString().split("T")[0] }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compliance_items"] }); toast.success("Status updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = items
    .filter(i => tab === "all" || i.status === tab)
    .filter(i => !search || i.requirement.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));

  const compliant = items.filter(i => i.status === "Compliant").length;
  const score = items.length ? Math.round((compliant / items.length) * 100) : 0;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Compliance</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Vault</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Track regulatory compliance, inspections, and certifications.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
              <form onSubmit={e => { e.preventDefault(); create.mutate(new FormData(e.currentTarget)); }} className="space-y-3">
                <div><Label>Category</Label><Input name="category" required placeholder="e.g. Fire Safety, OSHA" /></div>
                <div><Label>Requirement</Label><Input name="requirement" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Status</Label><Select name="status" defaultValue="Pending"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Compliant">Compliant</SelectItem><SelectItem value="Non-Compliant">Non-Compliant</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent></Select></div>
                  <div><Label>Due Date</Label><Input name="due_date" type="date" /></div>
                </div>
                <div><Label>Assignee</Label><Input name="assignee" /></div>
                <Button type="submit" className="w-full" disabled={create.isPending}>Create</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Compliance Score</p><p className="ss-stat-value">{score}%</p><Progress value={score} className="h-1.5 mt-2" /></CardContent></Card>
        {(["Compliant", "Pending", "Non-Compliant"] as const).map(s => {
          const count = items.filter(i => i.status === s).length;
          const cfg = statusConfig[s];
          return <Card key={s} className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">{s}</p><p className={`ss-stat-value ${cfg.color}`}>{count}</p></CardContent></Card>;
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Search requirements…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 text-sm h-9" /></div>
        <Tabs value={tab} onValueChange={setTab}><TabsList className="h-9"><TabsTrigger value="all" className="text-xs">All</TabsTrigger><TabsTrigger value="Compliant" className="text-xs">Compliant</TabsTrigger><TabsTrigger value="Pending" className="text-xs">Pending</TabsTrigger><TabsTrigger value="Non-Compliant" className="text-xs">Issues</TabsTrigger></TabsList></Tabs>
      </div>

      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead className="text-xs">Category</TableHead><TableHead className="text-xs">Requirement</TableHead><TableHead className="text-xs">Status</TableHead><TableHead className="text-xs">Due Date</TableHead><TableHead className="text-xs">Assignee</TableHead><TableHead className="text-xs">Actions</TableHead>
      </TableRow></TableHeader><TableBody>
        {isLoading ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm">Loading…</TableCell></TableRow> :
         filtered.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No compliance items</TableCell></TableRow> :
         filtered.map(item => {
          const cfg = statusConfig[item.status] || statusConfig.Pending;
          const Icon = cfg.icon;
          return (
            <TableRow key={item.id}>
              <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{item.category}</Badge></TableCell>
              <TableCell className="text-xs font-medium">{item.requirement}</TableCell>
              <TableCell><div className={`flex items-center gap-1.5 text-xs ${cfg.color}`}><Icon className="h-3.5 w-3.5" />{item.status}</div></TableCell>
              <TableCell className="text-xs text-muted-foreground">{item.due_date}</TableCell>
              <TableCell className="text-xs">{item.assignee}</TableCell>
              <TableCell>
                <Select value={item.status} onValueChange={status => updateStatus.mutate({ id: item.id, status })}>
                  <SelectTrigger className="h-7 text-[10px] w-28"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Compliant">Compliant</SelectItem><SelectItem value="Non-Compliant">Non-Compliant</SelectItem><SelectItem value="Pending">Pending</SelectItem><SelectItem value="Expired">Expired</SelectItem></SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody></Table></CardContent></Card>
    </div>
  );
}
