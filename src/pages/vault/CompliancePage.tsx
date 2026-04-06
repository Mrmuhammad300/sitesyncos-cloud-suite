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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, AlertTriangle, Clock, Search, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Tables } from "@/integrations/supabase/types";

type ComplianceItem = Tables<"compliance_items">;

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  Compliant: { color: "text-green-500", icon: CheckCircle2 },
  "Non-Compliant": { color: "text-destructive", icon: AlertTriangle },
  Pending: { color: "text-yellow-500", icon: Clock },
  Expired: { color: "text-destructive", icon: AlertTriangle },
};

const STATUSES = ["Compliant", "Non-Compliant", "Pending", "Expired"] as const;

type ItemForm = { category: string; requirement: string; status: string; due_date: string; assignee: string };
const EMPTY_FORM: ItemForm = { category: "", requirement: "", status: "Pending", due_date: "", assignee: "" };

export default function CompliancePage() {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ComplianceItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [createError, setCreateError] = useState("");
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState<ItemForm>(EMPTY_FORM);
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["compliance_items"],
    queryFn: async () => {
      const { data, error } = await supabase.from("compliance_items").select("*").order("due_date", { ascending: true });
      if (error) throw error;
      return data as ComplianceItem[];
    },
  });

  const create = useMutation({
    mutationFn: async (form: FormData) => {
      const req = form.get("requirement") as string;
      if (!req?.trim()) throw new Error("Requirement is required.");
      const { error } = await supabase.from("compliance_items").insert({
        category: form.get("category") as string,
        requirement: req.trim(),
        status: form.get("status") as string,
        due_date: form.get("due_date") as string || null,
        assignee: form.get("assignee") as string,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compliance_items"] }); setCreateOpen(false); toast.success("Item added"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ComplianceItem> & { id: string }) => {
      const { error } = await supabase
        .from("compliance_items")
        .update({ ...data, last_checked: new Date().toISOString().split("T")[0] })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compliance_items"] }); setEditItem(null); toast.success("Item updated"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("compliance_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["compliance_items"] }); toast.success("Item deleted"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleEdit = (item: ComplianceItem) => {
    setEditItem(item);
    setEditForm({ category: item.category, requirement: item.requirement, status: item.status, due_date: item.due_date ?? "", assignee: item.assignee ?? "" });
    setEditError("");
  };

  const handleEditSave = () => {
    if (!editForm.requirement.trim()) { setEditError("Requirement is required."); return; }
    if (!editItem) return;
    setEditError("");
    updateItem.mutate({ id: editItem.id, ...editForm, due_date: editForm.due_date || null });
  };

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
          <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) setCreateError(""); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5 mr-1.5" />Add Item</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Compliance Item</DialogTitle></DialogHeader>
              <form onSubmit={e => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                if (!(fd.get("requirement") as string)?.trim()) { setCreateError("Requirement is required."); return; }
                setCreateError("");
                create.mutate(fd);
              }} className="space-y-3">
                <div><Label>Category</Label><Input name="category" required placeholder="e.g. Fire Safety, OSHA" /></div>
                <div>
                  <Label>Requirement <span className="text-destructive">*</span></Label>
                  <Input name="requirement" className={createError ? "border-destructive" : ""} onChange={() => setCreateError("")} />
                  {createError && <p className="text-xs text-destructive mt-1">{createError}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Status</Label>
                    <Select name="status" defaultValue="Pending">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Due Date</Label><Input name="due_date" type="date" /></div>
                </div>
                <div><Label>Assignee</Label><Input name="assignee" /></div>
                <Button type="submit" className="w-full" disabled={create.isPending}>{create.isPending ? "Adding…" : "Create"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Compliance Score</p><p className="text-2xl font-bold">{score}%</p><Progress value={score} className="h-1.5 mt-2" /></CardContent></Card>
        {(["Compliant", "Pending", "Non-Compliant"] as const).map(s => {
          const count = items.filter(i => i.status === s).length;
          const cfg = statusConfig[s];
          return <Card key={s}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{s}</p><p className={`text-2xl font-bold ${cfg.color}`}>{count}</p></CardContent></Card>;
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="Search requirements…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 text-sm h-9" />
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="Compliant" className="text-xs">Compliant</TabsTrigger>
            <TabsTrigger value="Pending" className="text-xs">Pending</TabsTrigger>
            <TabsTrigger value="Non-Compliant" className="text-xs">Issues</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow>
            <TableHead className="text-xs">Category</TableHead>
            <TableHead className="text-xs">Requirement</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs">Due Date</TableHead>
            <TableHead className="text-xs">Assignee</TableHead>
            <TableHead className="text-xs w-20">Actions</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm">Loading…</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-sm text-muted-foreground">No compliance items</TableCell></TableRow>
            ) : filtered.map(item => {
              const cfg = statusConfig[item.status] || statusConfig.Pending;
              const Icon = cfg.icon;
              return (
                <TableRow key={item.id}>
                  <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{item.category}</Badge></TableCell>
                  <TableCell className="text-xs font-medium">{item.requirement}</TableCell>
                  <TableCell>
                    <Select value={item.status} onValueChange={status => updateItem.mutate({ id: item.id, status })}>
                      <SelectTrigger className="h-7 text-[10px] w-32 border-0 p-1">
                        <div className={`flex items-center gap-1.5 text-xs ${cfg.color}`}><Icon className="h-3.5 w-3.5" />{item.status}</div>
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{item.due_date || "—"}</TableCell>
                  <TableCell className="text-xs">{item.assignee || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        aria-label={`Edit ${item.requirement}`}
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${item.requirement}`}
                        onClick={() => setDeleteId(item.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent></Card>

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={o => { if (!o) setEditItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Compliance Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Category</Label><Input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} /></div>
            <div>
              <Label>Requirement <span className="text-destructive">*</span></Label>
              <Input value={editForm.requirement} onChange={e => { setEditForm(f => ({ ...f, requirement: e.target.value })); setEditError(""); }} className={editError ? "border-destructive" : ""} />
              {editError && <p className="text-xs text-destructive mt-1">{editError}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Due Date</Label><Input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            </div>
            <div><Label>Assignee</Label><Input value={editForm.assignee} onChange={e => setEditForm(f => ({ ...f, assignee: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={updateItem.isPending}>
              {updateItem.isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Compliance Item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteItem.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
