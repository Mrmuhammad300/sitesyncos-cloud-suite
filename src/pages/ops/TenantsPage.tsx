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
import { Search, Plus, Users, DollarSign, Home, AlertTriangle, Trash2, Download } from "lucide-react";
import { useTenants, useCreateTenant, useDeleteTenant } from "@/hooks/useOpsData";
import { Tables } from "@/integrations/supabase/types";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { exportToCSV } from "@/lib/export";

type Tenant = Tables<"tenants">;

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Expired: "bg-destructive/10 text-destructive",
  Terminated: "bg-muted text-muted-foreground",
};

const TenantsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Tenant | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ tenant_name: "", property_name: "", unit: "", monthly_rent: "", lease_start: "", lease_end: "", contact_email: "", contact_phone: "", notes: "" });
  const filters = ["All", "Active", "Pending", "Expired", "Terminated"];
  const { data: tenants = [], isLoading } = useTenants();
  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();

  const filtered = tenants.filter(
    (t) => (filter === "All" || t.status === filter) && (t.tenant_name.toLowerCase().includes(search.toLowerCase()) || t.property_name.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
  } = useTableFeatures<Tenant>(filtered, { pageSize: 25 });

  const totalRent = tenants.filter(t => t.status === "Active").reduce((s, t) => s + Number(t.monthly_rent), 0);
  const expiringSoon = tenants.filter(t => {
    if (!t.lease_end) return false;
    const diff = new Date(t.lease_end).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  }).length;

  const kpis = [
    { label: "Total Tenants", value: tenants.length, icon: <Users className="h-5 w-5 text-primary" /> },
    { label: "Active Leases", value: tenants.filter(t => t.status === "Active").length, icon: <Home className="h-5 w-5 text-success" /> },
    { label: "Monthly Revenue", value: `$${totalRent.toLocaleString()}`, icon: <DollarSign className="h-5 w-5 text-accent" /> },
    { label: "Expiring (90d)", value: expiringSoon, icon: <AlertTriangle className="h-5 w-5 text-warning" /> },
  ];

  const handleCreate = () => {
    if (!form.tenant_name || !form.property_name) return;
    createTenant.mutate({
      tenant_name: form.tenant_name,
      property_name: form.property_name,
      unit: form.unit || null,
      monthly_rent: Number(form.monthly_rent) || 0,
      lease_start: form.lease_start || null,
      lease_end: form.lease_end || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      notes: form.notes || null,
    });
    setCreateOpen(false);
    setForm({ tenant_name: "", property_name: "", unit: "", monthly_rent: "", lease_start: "", lease_end: "", contact_email: "", contact_phone: "", notes: "" });
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "tenants", {
      tenant_name: "Tenant", property_name: "Property", unit: "Unit",
      status: "Status", monthly_rent: "Monthly Rent",
      lease_start: "Lease Start", lease_end: "Lease End",
      contact_email: "Email", contact_phone: "Phone",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Tenants</h1><p className="text-sm text-muted-foreground">Manage tenant leases and contacts</p></div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV}><Download className="mr-2 h-4 w-4" />Export</Button>
          <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Tenant</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (<Card key={k.label} className="ss-stat-card"><CardContent className="p-0 flex items-center gap-3">{k.icon}<div><p className="ss-stat-value">{k.value}</p><p className="ss-stat-label">{k.label}</p></div></CardContent></Card>))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search tenants..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="flex gap-2 flex-wrap">{filters.map((f) => (<Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>))}</div>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No tenants found.</p>
        ) : rows.map((t) => (
          <Card key={t.id} className="cursor-pointer" onClick={() => setDetail(t)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{t.tenant_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.property_name}{t.unit ? ` · Unit ${t.unit}` : ""}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(t.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge className={`text-[10px] ${statusColor[t.status]}`}>{t.status}</Badge>
                <span className="text-xs font-mono text-muted-foreground">${Number(t.monthly_rent).toLocaleString()}/mo</span>
                {t.lease_end && <span className="text-xs text-muted-foreground">Ends {t.lease_end}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hidden sm:block"><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div> : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Tenant" sortKey="tenant_name" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Tenant)} />
                  <SortableHeader label="Property" sortKey="property_name" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Tenant)} />
                  <TableHead>Unit</TableHead>
                  <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Tenant)} />
                  <SortableHeader label="Rent" sortKey="monthly_rent" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Tenant)} className="text-right" />
                  <SortableHeader label="Lease End" sortKey="lease_end" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Tenant)} />
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetail(t)}>
                    <TableCell className="font-medium">{t.tenant_name}</TableCell>
                    <TableCell>{t.property_name}</TableCell>
                    <TableCell>{t.unit || "—"}</TableCell>
                    <TableCell><Badge className={statusColor[t.status]}>{t.status}</Badge></TableCell>
                    <TableCell className="text-right font-mono">${Number(t.monthly_rent).toLocaleString()}/mo</TableCell>
                    <TableCell className="text-sm">{t.lease_end || "—"}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No tenants found</TableCell></TableRow>}
              </TableBody>
            </Table>
            <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
          </>
        )}
      </CardContent></Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.tenant_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Badge className={statusColor[detail?.status || ""]}>{detail?.status}</Badge>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Property:</span> {detail?.property_name}</div>
              <div><span className="text-muted-foreground">Unit:</span> {detail?.unit || "—"}</div>
              <div><span className="text-muted-foreground">Rent:</span> <span className="font-mono">${Number(detail?.monthly_rent || 0).toLocaleString()}/mo</span></div>
              <div><span className="text-muted-foreground">Lease:</span> {detail?.lease_start || "—"} → {detail?.lease_end || "—"}</div>
              <div><span className="text-muted-foreground">Email:</span> {detail?.contact_email || "—"}</div>
              <div><span className="text-muted-foreground">Phone:</span> {detail?.contact_phone || "—"}</div>
            </div>
            {detail?.notes && <div><Label className="text-muted-foreground">Notes</Label><p className="text-sm mt-1">{detail.notes}</p></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Tenant</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Tenant Name</Label><Input value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} placeholder="Full name or company" /></div>
              <div><Label>Property</Label><Input value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} placeholder="Property name" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Unit</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. Suite 101" /></div>
              <div><Label>Monthly Rent ($)</Label><Input type="number" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} placeholder="0" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Lease Start</Label><Input type="date" value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} /></div>
              <div><Label>Lease End</Label><Input type="date" value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Email</Label><Input value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="tenant@email.com" /></div>
              <div><Label>Phone</Label><Input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="(555) 123-4567" /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes..." rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createTenant.isPending}>{createTenant.isPending ? "Adding..." : "Add Tenant"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tenant?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteTenant.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TenantsPage;
