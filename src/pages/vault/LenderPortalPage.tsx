import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Plus, CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react";
import { useLenders, useCreateLender, useUpdateLender } from "@/hooks/useVaultData";
import { useDrawRequests, useUpdateDrawRequest } from "@/hooks/useOpsData";

const PENDING_STATUSES = ["Submitted", "Under Review"];

export default function LenderPortalPage() {
  const { data: lenders = [], isLoading } = useLenders();
  const { data: draws = [] } = useDrawRequests();
  const create = useCreateLender();
  const update = useUpdateLender();
  const updateDraw = useUpdateDrawRequest();
  const [open, setOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", loan_type: "Senior Debt", commitment: "", drawn: "", rate: "", maturity: "", status: "Active", compliance_score: "100" });
  const [formError, setFormError] = useState("");

  const totalCommitment = lenders.reduce((s, l) => s + Number(l.commitment), 0);
  const totalDrawn = lenders.reduce((s, l) => s + Number(l.drawn), 0);
  const avgCompliance = lenders.length ? Math.round(lenders.reduce((s, l) => s + (l.compliance_score || 0), 0) / lenders.length) : 0;

  const pendingDraws = draws.filter(d => PENDING_STATUSES.includes(d.status));

  const fmt = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString()}`;

  const handleSubmit = () => {
    if (!form.name.trim()) { setFormError("Lender name is required."); return; }
    setFormError("");
    create.mutate({
      name: form.name.trim(), loan_type: form.loan_type, commitment: Number(form.commitment) || 0,
      drawn: Number(form.drawn) || 0, rate: form.rate, maturity: form.maturity || null,
      status: form.status, compliance_score: Number(form.compliance_score) || 100,
    });
    setOpen(false);
    setForm({ name: "", loan_type: "Senior Debt", commitment: "", drawn: "", rate: "", maturity: "", status: "Active", compliance_score: "100" });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Lender Portal</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Vault</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage lender relationships, draws, and compliance.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Lender</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Commitment</p><p className="text-xl font-bold">{fmt(totalCommitment)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total Drawn</p><p className="text-xl font-bold">{fmt(totalDrawn)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Available</p><p className="text-xl font-bold text-success">{fmt(totalCommitment - totalDrawn)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Avg Compliance</p><p className="text-xl font-bold">{avgCompliance}%</p></CardContent></Card>
      </div>

      {/* Pending Draw Requests — approval queue */}
      {pendingDraws.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              Draw Requests Pending Approval
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">{pendingDraws.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Draw #</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Amount</TableHead>
                  <TableHead className="text-xs">Requested By</TableHead>
                  <TableHead className="text-xs">Submitted</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs w-28">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingDraws.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.draw_number}</TableCell>
                    <TableCell className="text-sm font-medium max-w-[200px] truncate">{d.title}</TableCell>
                    <TableCell className="text-sm font-medium">{fmt(Number(d.amount))}</TableCell>
                    <TableCell className="text-xs">{d.requested_by || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.submitted_date || "—"}</TableCell>
                    <TableCell>
                      <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">{d.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] text-emerald-600 border-emerald-500/30 hover:bg-emerald-50"
                          aria-label={`Approve ${d.draw_number}`}
                          onClick={() => setApproveId(d.id)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-[10px] text-destructive border-destructive/30 hover:bg-destructive/5"
                          aria-label={`Reject ${d.draw_number}`}
                          onClick={() => setRejectId(d.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Lenders table */}
      <Card><CardContent className="p-0">
        {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead className="text-xs">Lender</TableHead>
              <TableHead className="text-xs">Type</TableHead>
              <TableHead className="text-xs">Commitment</TableHead>
              <TableHead className="text-xs">Drawn</TableHead>
              <TableHead className="text-xs">Rate</TableHead>
              <TableHead className="text-xs">Maturity</TableHead>
              <TableHead className="text-xs">Compliance</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {lenders.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{l.name}</p>
                    <Select value={l.status} onValueChange={v => update.mutate({ id: l.id, status: v })}>
                      <SelectTrigger className="h-6 w-[90px] text-[10px] border-0 p-0">
                        <Badge variant="outline" className={`text-[10px] mt-0.5 ${l.status === "Maturing" ? "bg-warning/10 text-warning" : "bg-success/10 text-success"}`}>{l.status}</Badge>
                      </SelectTrigger>
                      <SelectContent>{["Active","Maturing","Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm">{l.loan_type}</TableCell>
                  <TableCell className="text-sm font-medium">{fmt(Number(l.commitment))}</TableCell>
                  <TableCell className="text-sm">{fmt(Number(l.drawn))}</TableCell>
                  <TableCell className="text-xs font-mono">{l.rate || "—"}</TableCell>
                  <TableCell className="text-sm">{l.maturity || "—"}</TableCell>
                  <TableCell>
                    <div className="w-16">
                      <p className="text-[10px] text-muted-foreground mb-0.5">{l.compliance_score}%</p>
                      <Progress value={l.compliance_score || 0} className="h-1.5" />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {lenders.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No lenders yet.</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      {/* Add Lender dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormError(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Lender</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Lender Name <span className="text-destructive">*</span></Label>
              <Input value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setFormError(""); }} className={formError ? "border-destructive" : ""} />
              {formError && <p className="text-xs text-destructive mt-1">{formError}</p>}
            </div>
            <div><Label className="text-xs">Loan Type</Label>
              <Select value={form.loan_type} onValueChange={v => setForm(f => ({ ...f, loan_type: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{["Senior Debt","Mezzanine","Construction","Bridge"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Commitment</Label><Input type="number" value={form.commitment} onChange={e => setForm(f => ({ ...f, commitment: e.target.value }))} /></div>
              <div><Label className="text-xs">Drawn</Label><Input type="number" value={form.drawn} onChange={e => setForm(f => ({ ...f, drawn: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Rate</Label><Input value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))} placeholder="e.g. SOFR + 225" /></div>
              <div><Label className="text-xs">Maturity</Label><Input type="date" value={form.maturity} onChange={e => setForm(f => ({ ...f, maturity: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Compliance Score</Label><Input type="number" min="0" max="100" value={form.compliance_score} onChange={e => setForm(f => ({ ...f, compliance_score: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleSubmit} disabled={create.isPending}>
              {create.isPending ? "Adding…" : "Add Lender"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve confirm */}
      <AlertDialog open={!!approveId} onOpenChange={o => !o && setApproveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" />Approve Draw Request?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the draw as Approved and notify the project team.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => { if (approveId) { updateDraw.mutate({ id: approveId, status: "Approved" }); setApproveId(null); } }}
            >
              Approve
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject confirm */}
      <AlertDialog open={!!rejectId} onOpenChange={o => !o && setRejectId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" />Reject Draw Request?</AlertDialogTitle>
            <AlertDialogDescription>This will mark the draw as Rejected. The requester will be notified.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (rejectId) { updateDraw.mutate({ id: rejectId, status: "Rejected" }); setRejectId(null); } }}
            >
              Reject
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
