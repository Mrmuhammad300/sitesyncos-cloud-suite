import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTreasuryTransactions, useCreateTreasuryTransaction, useUpdateTreasuryTransaction } from "@/hooks/useVaultData";

const statusColor: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/20",
  Posted: "bg-success/10 text-success border-success/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function TreasuryPage() {
  const { data: transactions = [], isLoading } = useTreasuryTransactions();
  const create = useCreateTreasuryTransaction();
  const update = useUpdateTreasuryTransaction();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ txn_number: "", description: "", debit: "", credit: "", account: "General", project_name: "", txn_type: "Ledger", status: "Posted", requestor: "" });

  const ledger = transactions.filter(t => t.txn_type === "Ledger");
  const milestones = transactions.filter(t => t.txn_type === "Milestone");
  const approvals = transactions.filter(t => t.txn_type === "Approval");

  const totalDebit = transactions.reduce((s, t) => s + Number(t.debit || 0), 0);
  const totalCredit = transactions.reduce((s, t) => s + Number(t.credit || 0), 0);
  const pendingCount = approvals.filter(a => a.status === "Pending").length;

  const fmt = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString()}`;

  const handleSubmit = () => {
    create.mutate({
      txn_number: form.txn_number, description: form.description, debit: Number(form.debit) || 0,
      credit: Number(form.credit) || 0, account: form.account, project_name: form.project_name,
      txn_type: form.txn_type, status: form.status, requestor: form.requestor,
    });
    setOpen(false);
    setForm({ txn_number: "", description: "", debit: "", credit: "", account: "General", project_name: "", txn_type: "Ledger", status: "Posted", requestor: "" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Quantum Ledger</h1>
            <Badge variant="outline" className="text-[10px]">Treasury</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Event-driven ledger, milestones, and approval workflows.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> New Entry</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Debits</p><p className="text-xl font-bold">{fmt(totalDebit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Credits</p><p className="text-xl font-bold text-success">{fmt(totalCredit)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Pending Approvals</p><p className="text-xl font-bold text-warning">{pendingCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Net Position</p><p className={`text-xl font-bold ${totalCredit - totalDebit >= 0 ? "text-success" : "text-destructive"}`}>{fmt(Math.abs(totalCredit - totalDebit))}</p></CardContent></Card>
      </div>

      <Tabs defaultValue="ledger">
        <TabsList>
          <TabsTrigger value="ledger" className="text-xs">Ledger</TabsTrigger>
          <TabsTrigger value="milestones" className="text-xs">Milestones</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs">Approvals</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="mt-4">
          <Card><CardContent className="p-0">
            {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs text-right">Debit</TableHead>
                  <TableHead className="text-xs text-right">Credit</TableHead>
                  <TableHead className="text-xs">Account</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {ledger.map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">{e.txn_number}</TableCell>
                      <TableCell className="text-sm">{e.txn_date}</TableCell>
                      <TableCell><p className="text-sm font-medium">{e.description}</p><p className="text-[10px] text-muted-foreground">{e.project_name}</p></TableCell>
                      <TableCell className="text-sm text-right font-medium text-destructive">{Number(e.debit) > 0 ? fmt(Number(e.debit)) : ""}</TableCell>
                      <TableCell className="text-sm text-right font-medium text-success">{Number(e.credit) > 0 ? fmt(Number(e.credit)) : ""}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{e.account}</TableCell>
                    </TableRow>
                  ))}
                  {ledger.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No ledger entries.</TableCell></TableRow>}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="milestones" className="mt-4 space-y-3">
          {milestones.map(m => (
            <Card key={m.id}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.description}</p>
                  <p className="text-xs text-muted-foreground">{m.project_name} · {m.txn_date}</p>
                </div>
                <p className="text-sm font-bold">{fmt(Number(m.debit) || Number(m.credit))}</p>
                <Badge variant="outline" className={`text-[10px] ${statusColor[m.status] || ""}`}>{m.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {milestones.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No milestones.</p>}
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Description</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Requestor</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {approvals.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="text-xs font-mono">{a.txn_number}</TableCell>
                    <TableCell className="text-sm font-medium">{a.description}</TableCell>
                    <TableCell className="text-sm font-medium">{fmt(Number(a.debit) || Number(a.credit))}</TableCell>
                    <TableCell className="text-sm">{a.requestor || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${statusColor[a.status] || ""}`}>{a.status}</Badge></TableCell>
                    <TableCell>
                      {a.status === "Pending" && (
                        <div className="flex gap-1">
                          <Button variant="outline" size="sm" className="h-7 text-xs text-success" onClick={() => update.mutate({ id: a.id, status: "Approved" })}>Approve</Button>
                          <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => update.mutate({ id: a.id, status: "Rejected" })}>Reject</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {approvals.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No approvals.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><Label className="text-xs">Transaction #</Label><Input value={form.txn_number} onChange={e => setForm(f => ({ ...f, txn_number: e.target.value }))} /></div>
            <div><Label className="text-xs">Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><Label className="text-xs">Type</Label>
              <Select value={form.txn_type} onValueChange={v => setForm(f => ({ ...f, txn_type: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["Ledger","Milestone","Approval"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Debit</Label><Input type="number" value={form.debit} onChange={e => setForm(f => ({ ...f, debit: e.target.value }))} /></div>
              <div><Label className="text-xs">Credit</Label><Input type="number" value={form.credit} onChange={e => setForm(f => ({ ...f, credit: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Account</Label><Input value={form.account} onChange={e => setForm(f => ({ ...f, account: e.target.value }))} /></div>
            <div><Label className="text-xs">Project</Label><Input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} /></div>
            {form.txn_type === "Approval" && (
              <div><Label className="text-xs">Requestor</Label><Input value={form.requestor} onChange={e => setForm(f => ({ ...f, requestor: e.target.value }))} /></div>
            )}
            <Button className="w-full" onClick={handleSubmit} disabled={!form.txn_number || !form.description}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
