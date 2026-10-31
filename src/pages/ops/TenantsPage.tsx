import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Users, DollarSign, Home, CalendarClock, Trash2, Download, Building2, Mail, Phone } from "lucide-react";
import { useTenants, useCreateTenant, useDeleteTenant } from "@/hooks/useOpsData";
import { Tables } from "@/integrations/supabase/types";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { exportToCSV } from "@/lib/export";
import { fmtDollar, cn } from "@/lib/utils";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar } from "@/components/os";
import { DetailGrid, DetailItem, FilterChips, FormField, NoResults, PanelBar, Shimmer, TableSkeleton } from "@/components/ops/OpsKit";
import { countBy, daysUntil, fmtDate, fmtMoney, pctOf, relDays, statusOptions } from "@/components/ops/format";

type Tenant = Tables<"tenants">;

const CANONICAL = ["Active", "Pending", "Expired", "Terminated"] as const;
const INACTIVE = ["Expired", "Terminated"];

/** Lease-expiry buckets, in days from today. */
const BUCKETS = [
  { key: "expired", label: "Expired", test: (d: number) => d < 0, bar: "bg-destructive", text: "text-destructive" },
  { key: "90", label: "0–90d", test: (d: number) => d >= 0 && d <= 90, bar: "bg-warning", text: "text-warning" },
  { key: "180", label: "3–6 mo", test: (d: number) => d > 90 && d <= 180, bar: "bg-data", text: "text-foreground" },
  { key: "365", label: "6–12 mo", test: (d: number) => d > 180 && d <= 365, bar: "bg-data/75", text: "text-foreground" },
  { key: "730", label: "1–2 yr", test: (d: number) => d > 365 && d <= 730, bar: "bg-data/50", text: "text-foreground" },
  { key: "far", label: "2 yr +", test: (d: number) => d > 730, bar: "bg-data/30", text: "text-foreground" },
] as const;

const TenantsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Tenant | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ tenant_name: "", property_name: "", unit: "", monthly_rent: "", lease_start: "", lease_end: "", contact_email: "", contact_phone: "", notes: "" });
  const { data: tenants = [], isLoading } = useTenants();
  const createTenant = useCreateTenant();
  const deleteTenant = useDeleteTenant();

  const filters = useMemo(() => statusOptions(CANONICAL, tenants.map((t) => t.status)), [tenants]);
  const counts = useMemo(() => countBy(tenants, (t) => t.status), [tenants]);

  const filtered = tenants.filter(
    (t) => (filter === "All" || t.status === filter) && (t.tenant_name.toLowerCase().includes(search.toLowerCase()) || t.property_name.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
  } = useTableFeatures<Tenant>(filtered, { pageSize: 25 });

  const activeTenants = tenants.filter((t) => t.status === "Active");
  const totalRent = activeTenants.reduce((s, t) => s + Number(t.monthly_rent), 0);
  const expiring = tenants.filter((t) => {
    if (!t.lease_end) return false;
    const diff = new Date(t.lease_end).getTime() - Date.now();
    return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
  });
  const expiringSoon = expiring.length;
  const properties = new Set(tenants.map((t) => t.property_name)).size;

  // Lease-expiry ladder (all leases that aren't terminated)
  const ladder = useMemo(() => {
    const live = tenants.filter((t) => t.status !== "Terminated");
    const out = BUCKETS.map((b) => {
      const items = live.filter((t) => { const d = daysUntil(t.lease_end); return d !== null && b.test(d); });
      return { ...b, count: items.length, rent: items.reduce((s, t) => s + Number(t.monthly_rent), 0), names: items.map((t) => t.tenant_name) };
    });
    const undated = live.filter((t) => !t.lease_end).length;
    return { buckets: out, undated, max: Math.max(1, ...out.map((b) => b.rent)) };
  }, [tenants]);

  // Rent roll by property (in-place leases)
  const rentRoll = useMemo(() => {
    const m: Record<string, { rent: number; units: number }> = {};
    tenants.filter((t) => !INACTIVE.includes(t.status)).forEach((t) => {
      m[t.property_name] ??= { rent: 0, units: 0 };
      m[t.property_name].rent += Number(t.monthly_rent);
      m[t.property_name].units += 1;
    });
    const list = Object.entries(m).map(([property, d]) => ({ property, ...d })).sort((a, b) => b.rent - a.rent);
    return { list, total: list.reduce((s, p) => s + p.rent, 0) };
  }, [tenants]);

  const sortProps = (key: keyof Tenant) => ({
    sortKey: key as string,
    currentKey: String(sortKey ?? ""),
    currentDir: sortDir,
    onSort: (k: string) => toggleSort(k as keyof Tenant),
  });

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

  const resetFilters = () => { setSearch(""); setFilter("All"); };
  const leaseTone = (d: number | null) => (d === null ? "text-muted-foreground" : d < 0 ? "text-destructive" : d <= 90 ? "text-warning" : "text-muted-foreground");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenants"
        description="Your rent roll, lease calendar and tenant contacts — with expiries surfaced before they become vacancies."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />Export</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus />Add tenant</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Tenants" value={tenants.length} icon={Users} hint={`${properties} propert${properties === 1 ? "y" : "ies"}`} loading={isLoading} />
        <StatCard label="Active leases" value={activeTenants.length} icon={Home} tone="success" hint={`${pctOf(activeTenants.length, tenants.length)}% of tenants`} loading={isLoading} />
        <StatCard label="Monthly revenue" value={fmtDollar(totalRent)} icon={DollarSign} tone="data" hint={`${fmtDollar(totalRent * 12)} annualised`} loading={isLoading} />
        <StatCard
          label="Expiring · 90d"
          value={expiringSoon}
          icon={CalendarClock}
          tone={expiringSoon ? "warning" : "default"}
          hint={expiringSoon ? `${fmtDollar(expiring.reduce((s, t) => s + Number(t.monthly_rent), 0))}/mo at stake` : "No near-term expiries"}
          loading={isLoading}
        />
      </section>

      <section className="grid grid-cols-1 items-start gap-3 xl:grid-cols-5">
        <Panel className="xl:col-span-3" eyebrow="Lease calendar" title="Expiry ladder · monthly rent rolling off">
          {isLoading ? (
            <Shimmer className="h-[180px] w-full" />
          ) : tenants.length === 0 ? (
            <EmptyState compact icon={CalendarClock} title="No leases to chart" description="Lease end dates will build your expiry ladder." />
          ) : (
            <div className="space-y-3">
              <div className="grid h-[150px] grid-cols-6 items-end gap-1.5 sm:gap-3">
                {ladder.buckets.map((b) => (
                  <div key={b.key} className="group flex h-full flex-col justify-end gap-1.5" title={b.names.join(", ") || "No leases"}>
                    <span className={cn("text-center font-mono text-[10.5px] tabular-nums sm:text-[11px]", b.count ? b.text : "text-muted-foreground/50")}>
                      {b.rent ? fmtDollar(b.rent) : "—"}
                    </span>
                    <div
                      className={cn("w-full rounded-t-md transition-[height] duration-700 ease-out-expo", b.count ? b.bar : "bg-secondary")}
                      style={{ height: b.count ? `${Math.max(8, (b.rent / ladder.max) * 100)}%` : "3px" }}
                    />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-6 gap-1.5 border-t pt-2 sm:gap-3">
                {ladder.buckets.map((b) => (
                  <div key={b.key} className="min-w-0 text-center">
                    <p className="truncate text-[10.5px] font-medium sm:text-[11px]">{b.label}</p>
                    <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{b.count} lease{b.count === 1 ? "" : "s"}</p>
                  </div>
                ))}
              </div>
              {ladder.undated > 0 && (
                <p className="text-[11px] text-muted-foreground">{ladder.undated} lease{ladder.undated === 1 ? " has" : "s have"} no end date and {ladder.undated === 1 ? "is" : "are"} not shown.</p>
              )}
            </div>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2"
          eyebrow="Rent roll"
          title="By property"
          actions={<span className="font-mono text-xs font-medium tabular-nums">{fmtMoney(rentRoll.total)}<span className="text-muted-foreground">/mo</span></span>}
        >
          {isLoading ? (
            <div className="space-y-3">{[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-8 w-full" />)}</div>
          ) : rentRoll.list.length === 0 ? (
            <EmptyState compact icon={Building2} title="No leases in place" description="Add tenants to build your rent roll." />
          ) : (
            <ul className="space-y-3">
              {rentRoll.list.map((p, i) => {
                const share = pctOf(p.rent, rentRoll.total);
                return (
                  <li key={p.property} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="w-4 shrink-0 font-mono text-[10.5px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                        <span className="truncate font-medium">{p.property}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[11px] tabular-nums">
                        {fmtMoney(p.rent)} <span className="text-muted-foreground">· {share}%</span>
                      </span>
                    </div>
                    <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-data transition-[width] duration-700 ease-out-expo" style={{ width: `${share}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </section>

      <Panel
        flush
        eyebrow="Directory"
        title="All tenants"
        actions={<span className="font-mono text-[11px] tabular-nums text-muted-foreground">{filtered.length} of {tenants.length}</span>}
      >
        <PanelBar>
          <Toolbar className="min-w-0 flex-1">
            <SearchField value={search} onChange={setSearch} placeholder="Search tenant or property…" />
          </Toolbar>
          <FilterChips options={filters} value={filter} onChange={setFilter} counts={counts} />
        </PanelBar>
        {isLoading ? (
          <TableSkeleton />
        ) : tenants.length === 0 ? (
          <div className="border-t p-4 sm:p-5">
            <EmptyState
              icon={Users}
              title="No tenants yet"
              description="Add a tenant to start tracking rent, lease dates and contacts."
              action={<Button onClick={() => setCreateOpen(true)}><Plus />Add tenant</Button>}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t"><NoResults query={search} onReset={resetFilters} noun="tenants" /></div>
        ) : (
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Tenant" {...sortProps("tenant_name")} />
                  <SortableHeader label="Property" {...sortProps("property_name")} className="hidden md:table-cell" />
                  <SortableHeader label="Status" {...sortProps("status")} className="hidden sm:table-cell" />
                  <SortableHeader label="Rent" {...sortProps("monthly_rent")} className="text-right" />
                  <SortableHeader label="Lease end" {...sortProps("lease_end")} className="hidden lg:table-cell" />
                  <TableHead className="w-10"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => {
                  const d = daysUntil(t.lease_end);
                  return (
                    <TableRow key={t.id} className="cursor-pointer" onClick={() => setDetail(t)}>
                      <TableCell className="max-w-[240px]">
                        <div className="truncate font-medium">{t.tenant_name}</div>
                        <div className="truncate text-xs text-muted-foreground md:hidden">{t.property_name}{t.unit ? ` · ${t.unit}` : ""}</div>
                        <div className="truncate text-xs text-muted-foreground max-md:hidden">{t.contact_email || "No contact on file"}</div>
                        <div className="mt-1 sm:hidden"><StatusPill status={t.status} /></div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="truncate">{t.property_name}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{t.unit || "—"}</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell"><StatusPill status={t.status} /></TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {fmtMoney(Number(t.monthly_rent))}<span className="text-muted-foreground">/mo</span>
                        <div className={cn("text-[11px] lg:hidden", leaseTone(d))}>{t.lease_end ? relDays(d) : ""}</div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="font-mono text-xs tabular-nums">{fmtDate(t.lease_end)}</div>
                        <div className={cn("font-mono text-[11px] tabular-nums", leaseTone(d))}>{t.lease_end ? relDays(d) : "No end date"}</div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(t.id)}
                          aria-label={`Delete ${t.tenant_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
      </Panel>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <p className="ss-eyebrow">{detail?.property_name}{detail?.unit ? ` · ${detail.unit}` : ""}</p>
            <DialogTitle className="flex flex-wrap items-center gap-2">{detail?.tenant_name} <StatusPill status={detail?.status} /></DialogTitle>
            {detail?.notes && <DialogDescription>{detail.notes}</DialogDescription>}
          </DialogHeader>
          <DetailGrid>
            <DetailItem label="Monthly rent" mono>{fmtMoney(Number(detail?.monthly_rent || 0))}</DetailItem>
            <DetailItem label="Annualised" mono>{fmtMoney(Number(detail?.monthly_rent || 0) * 12)}</DetailItem>
            <DetailItem label="Lease start" mono>{fmtDate(detail?.lease_start)}</DetailItem>
            <DetailItem label="Lease end" mono>
              {fmtDate(detail?.lease_end)}
              {detail?.lease_end && <span className={cn("ml-1.5 text-[11px]", leaseTone(daysUntil(detail.lease_end)))}>{relDays(daysUntil(detail.lease_end))}</span>}
            </DetailItem>
          </DetailGrid>
          <div className="flex flex-col gap-2 sm:flex-row">
            {detail?.contact_email ? (
              <Button variant="outline" size="sm" className="min-w-0 flex-1 justify-start" asChild>
                <a href={`mailto:${detail.contact_email}`}><Mail /><span className="truncate">{detail.contact_email}</span></a>
              </Button>
            ) : <p className="flex-1 text-xs text-muted-foreground">No email on file</p>}
            {detail?.contact_phone && (
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <a href={`tel:${detail.contact_phone}`}><Phone /><span className="font-mono tabular-nums">{detail.contact_phone}</span></a>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add tenant</DialogTitle>
            <DialogDescription>Lease dates feed the expiry ladder; rent feeds the rent roll.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Tenant name" htmlFor="t-name" required>
              <Input id="t-name" value={form.tenant_name} onChange={(e) => setForm({ ...form, tenant_name: e.target.value })} placeholder="Full name or company" />
            </FormField>
            <FormField label="Property" htmlFor="t-prop" required>
              <Input id="t-prop" value={form.property_name} onChange={(e) => setForm({ ...form, property_name: e.target.value })} placeholder="Property name" />
            </FormField>
            <FormField label="Unit" htmlFor="t-unit">
              <Input id="t-unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="e.g. Suite 101" />
            </FormField>
            <FormField label="Monthly rent" htmlFor="t-rent" hint="USD">
              <Input id="t-rent" type="number" inputMode="decimal" className="font-mono tabular-nums" value={form.monthly_rent} onChange={(e) => setForm({ ...form, monthly_rent: e.target.value })} placeholder="0" />
            </FormField>
            <FormField label="Lease start" htmlFor="t-start">
              <Input id="t-start" type="date" value={form.lease_start} onChange={(e) => setForm({ ...form, lease_start: e.target.value })} />
            </FormField>
            <FormField label="Lease end" htmlFor="t-end">
              <Input id="t-end" type="date" value={form.lease_end} onChange={(e) => setForm({ ...form, lease_end: e.target.value })} />
            </FormField>
            <FormField label="Email" htmlFor="t-email">
              <Input id="t-email" type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} placeholder="tenant@email.com" />
            </FormField>
            <FormField label="Phone" htmlFor="t-phone">
              <Input id="t-phone" type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} placeholder="(555) 123-4567" />
            </FormField>
            <FormField label="Notes" htmlFor="t-notes" className="sm:col-span-2">
              <Textarea id="t-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes…" rows={2} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.tenant_name || !form.property_name || createTenant.isPending}>{createTenant.isPending ? "Adding…" : "Add tenant"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tenant?</AlertDialogTitle>
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
