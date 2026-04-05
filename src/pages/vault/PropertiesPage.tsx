import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, MapPin, Eye, ArrowUpRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer } from "recharts";
import { useProperties, useCreateProperty, useUpdateProperty } from "@/hooks/useVaultData";
import type { Database } from "@/integrations/supabase/types";
import { fmtDollar } from "@/lib/utils";

type Property = Database["public"]["Tables"]["properties"]["Row"];

const statusColor: Record<string, string> = {
  Active: "bg-success/10 text-success border-success/20",
  "Under Contract": "bg-primary/10 text-primary border-primary/20",
  "Due Diligence": "bg-warning/10 text-warning border-warning/20",
  Closed: "bg-muted text-muted-foreground",
  Pipeline: "bg-accent/10 text-accent border-accent/20",
};

export default function PropertiesPage() {
  const { data: properties = [], isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Property | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", property_type: "Office", status: "Active", price: "", sqft: "", cap_rate: "", noi: "", irr: "", year_built: "", units: "", occupancy: "" });

  const filtered = properties.filter((p) => {
    const ms = p.name.toLowerCase().includes(search.toLowerCase()) || (p.address || "").toLowerCase().includes(search.toLowerCase());
    const mt = typeFilter === "all" || p.property_type === typeFilter;
    return ms && mt;
  });

  const totalValue = properties.reduce((s, p) => s + Number(p.price), 0);
  const avgCap = properties.length ? properties.reduce((s, p) => s + Number(p.cap_rate || 0), 0) / properties.length : 0;
  const avgOcc = properties.length ? properties.reduce((s, p) => s + Number(p.occupancy || 0), 0) / properties.length : 0;

  const chartData = ["Office", "Multifamily", "Industrial", "Retail"].map(t => ({
    type: t,
    value: properties.filter(p => p.property_type === t).reduce((s, p) => s + Number(p.price), 0),
  })).filter(d => d.value > 0);

  const handleSubmit = () => {
    createProperty.mutate({
      name: form.name, address: form.address, property_type: form.property_type, status: form.status,
      price: Number(form.price) || 0, sqft: Number(form.sqft) || 0, cap_rate: Number(form.cap_rate) || 0,
      noi: Number(form.noi) || 0, irr: Number(form.irr) || 0, year_built: Number(form.year_built) || null,
      units: Number(form.units) || 0, occupancy: Number(form.occupancy) || 0,
    });
    setOpen(false);
    setForm({ name: "", address: "", property_type: "Office", status: "Active", price: "", sqft: "", cap_rate: "", noi: "", irr: "", year_built: "", units: "", occupancy: "" });
  };

  const fmt = fmtDollar;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Properties</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Vault</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your property portfolio and acquisition pipeline.</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" /> Add Property</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Portfolio Value</p><p className="ss-stat-value">{fmt(totalValue)}</p></CardContent></Card>
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Properties</p><p className="ss-stat-value">{properties.length}</p></CardContent></Card>
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Avg Cap Rate</p><p className="ss-stat-value">{avgCap.toFixed(1)}%</p></CardContent></Card>
        <Card className="ss-stat-card"><CardContent className="p-0"><p className="ss-stat-label">Avg Occupancy</p><p className="ss-stat-value">{avgOcc.toFixed(1)}%</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {chartData.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2"><CardTitle className="text-base">Portfolio by Type</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="type" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v / 1e6}M`} />
                  <ReTooltip formatter={(v: number) => [fmt(v), "Value"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Multifamily">Multifamily</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
                <SelectItem value="Retail">Retail</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Property</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Price</TableHead>
                <TableHead className="text-xs">Cap Rate</TableHead>
                <TableHead className="text-xs">IRR</TableHead>
                <TableHead className="text-xs w-[60px]"></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelected(p)}>
                    <TableCell>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.address || "—"}</p>
                    </TableCell>
                    <TableCell>
                      <Select value={p.status} onValueChange={v => { updateProperty.mutate({ id: p.id, status: v }); }} >
                        <SelectTrigger className="h-7 w-[120px] text-[10px] border-0 p-0" onClick={e => e.stopPropagation()}>
                          <Badge variant="outline" className={`text-[10px] ${statusColor[p.status] || ""}`}>{p.status}</Badge>
                        </SelectTrigger>
                        <SelectContent>{["Active","Under Contract","Due Diligence","Pipeline","Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm">{p.property_type}</TableCell>
                    <TableCell className="text-sm font-medium">{fmt(Number(p.price))}</TableCell>
                    <TableCell className="text-sm">{Number(p.cap_rate).toFixed(1)}%</TableCell>
                    <TableCell className="text-sm font-medium text-success flex items-center gap-0.5"><ArrowUpRight className="h-3 w-3" />{Number(p.irr).toFixed(1)}%</TableCell>
                    <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setSelected(p); }}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No properties found.</TableCell></TableRow>}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.name}</DialogTitle>
                <DialogDescription>{selected.address || "No address"} · {selected.property_type}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div><p className="text-xs text-muted-foreground">Price</p><p className="font-bold">{fmt(Number(selected.price))}</p></div>
                <div><p className="text-xs text-muted-foreground">NOI</p><p className="font-bold">{fmt(Number(selected.noi))}</p></div>
                <div><p className="text-xs text-muted-foreground">Cap Rate</p><p className="font-bold">{Number(selected.cap_rate).toFixed(1)}%</p></div>
                <div><p className="text-xs text-muted-foreground">IRR</p><p className="font-bold text-success">{Number(selected.irr).toFixed(1)}%</p></div>
                <div><p className="text-xs text-muted-foreground">Sq Ft</p><p className="font-bold">{Number(selected.sqft).toLocaleString()}</p></div>
                <div><p className="text-xs text-muted-foreground">Occupancy</p><p className="font-bold">{Number(selected.occupancy).toFixed(0)}%</p></div>
                <div><p className="text-xs text-muted-foreground">Year Built</p><p className="font-bold">{selected.year_built || "—"}</p></div>
                {Number(selected.units) > 0 && <div><p className="text-xs text-muted-foreground">Units</p><p className="font-bold">{selected.units}</p></div>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Property</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto">
            <div><Label className="text-xs">Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label className="text-xs">Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Type</Label>
                <Select value={form.property_type} onValueChange={v => setForm(f => ({ ...f, property_type: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Office","Multifamily","Industrial","Retail"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{["Active","Under Contract","Due Diligence","Pipeline","Closed"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Price</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div><Label className="text-xs">Sq Ft</Label><Input type="number" value={form.sqft} onChange={e => setForm(f => ({ ...f, sqft: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Cap Rate %</Label><Input type="number" value={form.cap_rate} onChange={e => setForm(f => ({ ...f, cap_rate: e.target.value }))} /></div>
              <div><Label className="text-xs">NOI</Label><Input type="number" value={form.noi} onChange={e => setForm(f => ({ ...f, noi: e.target.value }))} /></div>
              <div><Label className="text-xs">IRR %</Label><Input type="number" value={form.irr} onChange={e => setForm(f => ({ ...f, irr: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Year Built</Label><Input type="number" value={form.year_built} onChange={e => setForm(f => ({ ...f, year_built: e.target.value }))} /></div>
              <div><Label className="text-xs">Units</Label><Input type="number" value={form.units} onChange={e => setForm(f => ({ ...f, units: e.target.value }))} /></div>
              <div><Label className="text-xs">Occupancy %</Label><Input type="number" value={form.occupancy} onChange={e => setForm(f => ({ ...f, occupancy: e.target.value }))} /></div>
            </div>
            <Button className="w-full" onClick={handleSubmit} disabled={!form.name}>Add Property</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
