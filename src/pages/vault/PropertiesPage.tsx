import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis, Cell } from "recharts";
import {
  ArrowUpRight, Building2, Calculator, Gauge, LayoutGrid, MapPin, Percent, Plus, Rows3, Users, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { EmptyState, Meter, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar, type StatusTone } from "@/components/os";
import { useProperties, useCreateProperty, useUpdateProperty } from "@/hooks/useVaultData";
import type { Database } from "@/integrations/supabase/types";
import { cn, fmtDollar } from "@/lib/utils";
import { SERIES, axisProps, gridProps, tooltipProps } from "@/lib/chart";

type Property = Database["public"]["Tables"]["properties"]["Row"];

const BASE_TYPES = ["Office", "Multifamily", "Industrial", "Retail"];
const STATUSES = ["Active", "Under Contract", "Due Diligence", "Pipeline", "Closed"];

/** Property lifecycle → pill tone (lifecycle words aren't in the shared vocabulary). */
const PROPERTY_TONE: Record<string, StatusTone> = {
  Active: "success", Stabilized: "success", "Under Contract": "info", "Due Diligence": "warning",
  "Under Review": "info", "Lease-up": "data", Pipeline: "neutral", Closed: "neutral",
};

const EMPTY_FORM = { name: "", address: "", property_type: "Office", status: "Active", price: "", sqft: "", cap_rate: "", noi: "", irr: "", year_built: "", units: "", occupancy: "" };
const VIEW_KEY = "ss.vault.properties.view";

const pct = (v: number | null | undefined, d = 1) => (Number.isFinite(Number(v)) ? `${Number(v).toFixed(d)}%` : "—");

export default function PropertiesPage() {
  const { data: properties = [], isLoading } = useProperties();
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selected, setSelected] = useState<Property | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [view, setView] = useState<"grid" | "table">(() => {
    try { return localStorage.getItem(VIEW_KEY) === "table" ? "table" : "grid"; } catch { return "grid"; }
  });
  useEffect(() => { try { localStorage.setItem(VIEW_KEY, view); } catch { /* storage unavailable */ } }, [view]);

  const types = useMemo(
    () => Array.from(new Set([...BASE_TYPES, ...properties.map((p) => p.property_type).filter(Boolean)])),
    [properties],
  );

  const filtered = properties.filter((p) => {
    const q = search.toLowerCase();
    const ms = p.name.toLowerCase().includes(q) || (p.address || "").toLowerCase().includes(q);
    const mt = typeFilter === "all" || p.property_type === typeFilter;
    return ms && mt;
  });

  const m = useMemo(() => {
    const totalValue = properties.reduce((s, p) => s + Number(p.price), 0);
    const totalNoi = properties.reduce((s, p) => s + Number(p.noi || 0), 0);
    const avgCap = properties.length ? properties.reduce((s, p) => s + Number(p.cap_rate || 0), 0) / properties.length : 0;
    const avgOcc = properties.length ? properties.reduce((s, p) => s + Number(p.occupancy || 0), 0) / properties.length : 0;
    const avgIrr = properties.length ? properties.reduce((s, p) => s + Number(p.irr || 0), 0) / properties.length : 0;
    const units = properties.reduce((s, p) => s + Number(p.units || 0), 0);
    const sqft = properties.reduce((s, p) => s + Number(p.sqft || 0), 0);
    const allocation = types
      .map((t, i) => ({
        type: t,
        value: properties.filter((p) => p.property_type === t).reduce((s, p) => s + Number(p.price), 0),
        count: properties.filter((p) => p.property_type === t).length,
        color: SERIES[i % SERIES.length],
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value);
    const scatter = properties.map((p) => ({
      name: p.name, cap: Number(p.cap_rate || 0), irr: Number(p.irr || 0), price: Number(p.price),
      color: allocation.find((a) => a.type === p.property_type)?.color ?? SERIES[0],
    }));
    return { totalValue, totalNoi, avgCap, avgOcc, avgIrr, units, sqft, allocation, scatter };
  }, [properties, types]);

  const handleSubmit = () => {
    createProperty.mutate({
      name: form.name, address: form.address, property_type: form.property_type, status: form.status,
      price: Number(form.price) || 0, sqft: Number(form.sqft) || 0, cap_rate: Number(form.cap_rate) || 0,
      noi: Number(form.noi) || 0, irr: Number(form.irr) || 0, year_built: Number(form.year_built) || null,
      units: Number(form.units) || 0, occupancy: Number(form.occupancy) || 0,
    });
    setOpen(false);
    setForm(EMPTY_FORM);
  };

  const statusSelect = (p: Property) => (
    <Select value={p.status} onValueChange={(v) => updateProperty.mutate({ id: p.id, status: v })}>
      <SelectTrigger
        aria-label={`Status for ${p.name}`}
        className="h-auto w-auto shrink-0 gap-1 border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-40"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex"><StatusPill status={p.status} tone={PROPERTY_TONE[p.status]} /></div>
      </SelectTrigger>
      <SelectContent onClick={(e) => e.stopPropagation()}>
        {Array.from(new Set([p.status, ...STATUSES])).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
      </SelectContent>
    </Select>
  );

  const setField = (k: keyof typeof EMPTY_FORM) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Your owned portfolio and acquisition pipeline — yield, return and occupancy at a glance."
        actions={
          <>
            <Button variant="outline" onClick={() => navigate("/vault/roi")}><Calculator /> Underwrite a deal</Button>
            <Button onClick={() => setOpen(true)}><Plus /> Add property</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Portfolio value" value={fmtDollar(m.totalValue)} icon={Wallet} tone="data" loading={isLoading}
          hint={`${properties.length} asset${properties.length === 1 ? "" : "s"}`} />
        <StatCard label="Annual NOI" value={fmtDollar(m.totalNoi)} icon={Building2} loading={isLoading}
          hint={m.totalValue ? `${((m.totalNoi / m.totalValue) * 100).toFixed(1)}% portfolio yield` : "No assets yet"} />
        <StatCard label="Avg cap rate" value={properties.length ? pct(m.avgCap) : "—"} icon={Percent} loading={isLoading}
          hint={properties.length ? `${pct(m.avgIrr)} avg target IRR` : "—"} tone={properties.length ? "primary" : "default"} />
        <StatCard label="Avg occupancy" value={properties.length ? pct(m.avgOcc) : "—"} icon={Users} loading={isLoading}
          tone={!properties.length ? "default" : m.avgOcc >= 90 ? "success" : m.avgOcc >= 80 ? "warning" : "destructive"}
          hint={!properties.length ? "—" : m.units ? `${m.units.toLocaleString()} units · ${(m.sqft / 1e6).toFixed(2)}M sf` : `${(m.sqft / 1e3).toFixed(0)}K sf`} />
      </section>

      {(isLoading || properties.length > 0) && (
        <section className="grid grid-cols-1 gap-3 xl:grid-cols-5">
          <Panel className="xl:col-span-2" eyebrow="Allocation" title="Capital by asset class">
            {isLoading ? (
              <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />)}</div>
            ) : (
              <div className="space-y-5">
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-secondary">
                  {m.allocation.map((a) => (
                    <div key={a.type} className="h-full transition-[width] duration-700 ease-out-expo first:rounded-l-full last:rounded-r-full"
                      style={{ width: `${(a.value / m.totalValue) * 100}%`, background: a.color }} title={a.type} />
                  ))}
                </div>
                <ul className="space-y-1">
                  {m.allocation.map((a) => (
                    <li key={a.type}>
                      <button
                        type="button"
                        onClick={() => setTypeFilter(typeFilter === a.type ? "all" : a.type)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2/60",
                          typeFilter === a.type && "bg-surface-2",
                        )}
                      >
                        <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: a.color }} />
                        <span className="min-w-0 flex-1 truncate text-[13px]">{a.type}</span>
                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{a.count}</span>
                        <span className="w-16 text-right font-mono text-[13px] tabular-nums">{fmtDollar(a.value)}</span>
                        <span className="w-11 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                          {((a.value / m.totalValue) * 100).toFixed(0)}%
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>

          <Panel className="xl:col-span-3" eyebrow="Risk / return" title="Cap rate vs. target IRR"
            actions={<span className="hidden text-xs text-muted-foreground sm:block">Bubble size = value</span>}>
            <div className="h-[240px] w-full">
              {!isLoading && (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid {...gridProps} vertical />
                    <XAxis type="number" dataKey="cap" name="Cap rate" {...axisProps} unit="%" domain={["dataMin - 0.5", "dataMax + 0.5"]} tickFormatter={(v) => Number(v).toFixed(1)} />
                    <YAxis type="number" dataKey="irr" name="IRR" {...axisProps} unit="%" domain={["dataMin - 1", "dataMax + 1"]} tickFormatter={(v) => Number(v).toFixed(0)} />
                    <ZAxis type="number" dataKey="price" range={[80, 900]} />
                    <Tooltip
                      {...tooltipProps}
                      cursor={{ strokeDasharray: "2 4", stroke: "hsl(var(--border-strong))" }}
                      content={({ payload }) => {
                        const d = payload?.[0]?.payload as (typeof m.scatter)[number] | undefined;
                        if (!d) return null;
                        return (
                          <div style={tooltipProps.contentStyle}>
                            <p className="mb-1 text-xs font-medium">{d.name}</p>
                            <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                              Cap {d.cap.toFixed(1)}% · IRR {d.irr.toFixed(1)}% · {fmtDollar(d.price)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Scatter data={m.scatter} fillOpacity={0.7}>
                      {m.scatter.map((d) => <Cell key={d.name} fill={d.color} stroke={d.color} />)}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              )}
            </div>
          </Panel>
        </section>
      )}

      <Panel
        flush
        eyebrow="Portfolio"
        title={`${filtered.length} of ${properties.length} properties`}
        actions={
          <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v as "grid" | "table")} className="rounded-lg border bg-surface-2/50 p-0.5">
            <ToggleGroupItem value="grid" aria-label="Card view" className="h-7 w-7 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm"><LayoutGrid className="h-3.5 w-3.5" /></ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" className="h-7 w-7 p-0 data-[state=on]:bg-background data-[state=on]:shadow-sm"><Rows3 className="h-3.5 w-3.5" /></ToggleGroupItem>
          </ToggleGroup>
        }
      >
        <Toolbar className="border-t px-5 py-3">
          <SearchField value={search} onChange={setSearch} placeholder="Search name or address…" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[150px] text-[13px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </Toolbar>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 border-t p-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-[196px] animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : properties.length === 0 ? (
          <div className="border-t p-5">
            <EmptyState icon={Building2} title="No properties yet"
              description="Add your first asset to track value, yield and occupancy across the portfolio."
              action={<Button size="sm" onClick={() => setOpen(true)}><Plus /> Add property</Button>} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="border-t p-5">
            <EmptyState compact icon={MapPin} title="No matches" description="Nothing matches your search or type filter."
              action={<Button size="sm" variant="outline" onClick={() => { setSearch(""); setTypeFilter("all"); }}>Clear filters</Button>} />
          </div>
        ) : view === "grid" ? (
          <div className="stagger grid grid-cols-1 gap-3 border-t p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
            {filtered.map((p) => {
              const occ = Number(p.occupancy || 0);
              return (
                <article
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelected(p)}
                  onKeyDown={(e) => { if (e.key === "Enter") setSelected(p); }}
                  className="ss-card ss-interactive group relative cursor-pointer overflow-hidden p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="ss-blueprint pointer-events-none absolute inset-x-0 top-0 h-20 opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="ss-eyebrow text-[9.5px]">{p.property_type}{p.year_built ? ` · ${p.year_built}` : ""}</p>
                      <h3 className="mt-1 truncate text-[15px] font-semibold tracking-tight">{p.name}</h3>
                      <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{p.address || "—"}</p>
                    </div>
                    {statusSelect(p)}
                  </div>
                  <div className="relative mt-4 flex items-end justify-between gap-2">
                    <span className="font-mono text-[24px] font-medium leading-none tracking-[-0.03em] tabular-nums">{fmtDollar(Number(p.price))}</span>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
                  </div>
                  <dl className="relative mt-4 grid grid-cols-3 divide-x divide-border rounded-lg border bg-surface-2/40">
                    {[
                      ["Cap", pct(Number(p.cap_rate))],
                      ["IRR", pct(Number(p.irr))],
                      ["NOI", fmtDollar(Number(p.noi || 0))],
                    ].map(([k, v]) => (
                      <div key={k} className="px-2.5 py-2">
                        <dt className="ss-eyebrow text-[9px]">{k}</dt>
                        <dd className={cn("mt-0.5 font-mono text-[13px] tabular-nums", k === "IRR" && "text-success")}>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="relative mt-4 flex items-center gap-3">
                    <span className="ss-eyebrow w-16 text-[9px]">Occupancy</span>
                    <Meter value={occ} tone={occ >= 90 ? "success" : occ >= 80 ? "warning" : "destructive"} className="flex-1" />
                    <span className="w-9 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{occ.toFixed(0)}%</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto border-t">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b text-left">
                  {["Property", "Status", "Type", "Value", "NOI", "Cap", "IRR", "Occupancy", ""].map((h, i) => (
                    <th key={i} className={cn("ss-eyebrow px-4 py-2.5 text-[9.5px] font-medium first:pl-5", i >= 3 && i <= 6 && "text-right")}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filtered.map((p) => {
                  const occ = Number(p.occupancy || 0);
                  return (
                    <tr key={p.id} className="cursor-pointer transition-colors hover:bg-surface-2/50" onClick={() => setSelected(p)}>
                      <td className="px-4 py-3 pl-5">
                        <p className="font-medium">{p.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{p.address || "—"}</p>
                      </td>
                      <td className="px-4 py-3">{statusSelect(p)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.property_type}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{fmtDollar(Number(p.price))}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted-foreground">{fmtDollar(Number(p.noi || 0))}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">{pct(Number(p.cap_rate))}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-success">{pct(Number(p.irr))}</td>
                      <td className="px-4 py-3">
                        <div className="flex w-32 items-center gap-2">
                          <Meter value={occ} tone={occ >= 90 ? "success" : occ >= 80 ? "warning" : "destructive"} className="flex-1" />
                          <span className="w-8 text-right font-mono text-[11px] tabular-nums text-muted-foreground">{occ.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 pr-5 text-right">
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Open ${p.name}`} onClick={(e) => { e.stopPropagation(); setSelected(p); }}>
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2"><StatusPill status={selected.status} tone={PROPERTY_TONE[selected.status]} /><span className="ss-eyebrow">{selected.property_type}</span></div>
                <DialogTitle className="pt-1 text-xl">{selected.name}</DialogTitle>
                <DialogDescription className="flex items-center gap-1"><MapPin className="h-3 w-3" />{selected.address || "No address"}</DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border bg-surface-2/40 p-4">
                <p className="ss-eyebrow">Valuation</p>
                <p className="mt-1 font-mono text-3xl font-medium tabular-nums tracking-[-0.03em]">{fmtDollar(Number(selected.price))}</p>
                {Number(selected.sqft) > 0 && (
                  <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground">${(Number(selected.price) / Number(selected.sqft)).toFixed(0)} / sf</p>
                )}
              </div>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-3">
                {[
                  ["NOI", fmtDollar(Number(selected.noi))],
                  ["Cap rate", pct(Number(selected.cap_rate))],
                  ["Target IRR", pct(Number(selected.irr))],
                  ["Square feet", Number(selected.sqft).toLocaleString()],
                  ["Year built", selected.year_built ?? "—"],
                  ...(Number(selected.units) > 0 ? [["Units", String(selected.units)]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="bg-card px-3 py-2.5">
                    <dt className="ss-eyebrow text-[9px]">{k}</dt>
                    <dd className={cn("mt-1 font-mono text-sm tabular-nums", k === "Target IRR" && "text-success")}>{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex items-center gap-3">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="ss-eyebrow text-[9.5px]">Occupancy</span>
                <Meter value={Number(selected.occupancy)} tone="data" className="flex-1" />
                <span className="font-mono text-xs tabular-nums">{Number(selected.occupancy).toFixed(0)}%</span>
              </div>
              <Button variant="outline" onClick={() => navigate(`/vault/roi?property=${selected.id}`)}>
                <Calculator /> Underwrite in ROI calculator
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add property</DialogTitle>
            <DialogDescription>Capture the basics now — you can underwrite it in the ROI calculator later.</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            <div className="space-y-1.5"><Label className="text-xs">Name</Label><Input value={form.name} onChange={setField("name")} /></div>
            <div className="space-y-1.5"><Label className="text-xs">Address</Label><Input value={form.address} onChange={setField("address")} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Type</Label>
                <Select value={form.property_type} onValueChange={(v) => setForm((f) => ({ ...f, property_type: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{BASE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label className="text-xs">Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Price</Label><Input type="number" className="font-mono" value={form.price} onChange={setField("price")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Sq ft</Label><Input type="number" className="font-mono" value={form.sqft} onChange={setField("sqft")} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Cap rate %</Label><Input type="number" className="font-mono" value={form.cap_rate} onChange={setField("cap_rate")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">NOI</Label><Input type="number" className="font-mono" value={form.noi} onChange={setField("noi")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">IRR %</Label><Input type="number" className="font-mono" value={form.irr} onChange={setField("irr")} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Year built</Label><Input type="number" className="font-mono" value={form.year_built} onChange={setField("year_built")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Units</Label><Input type="number" className="font-mono" value={form.units} onChange={setField("units")} /></div>
              <div className="space-y-1.5"><Label className="text-xs">Occupancy %</Label><Input type="number" className="font-mono" value={form.occupancy} onChange={setField("occupancy")} /></div>
            </div>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={!form.name}>Add property</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
