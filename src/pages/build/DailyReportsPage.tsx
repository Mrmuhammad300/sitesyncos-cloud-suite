import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { LucideIcon } from "lucide-react";
import {
  Plus, Trash2, Download, Printer, Users, Clock, ShieldCheck, ShieldAlert, ClipboardPen, SearchX, Timer,
  Sun, CloudSun, Cloud, CloudRain, CloudRainWind, Snowflake, CloudFog, Wind, Thermometer, NotebookPen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, Toolbar } from "@/components/os";
import { Field, SkeletonCards, SkeletonRows } from "@/components/build/kit";
import { daysUntil, fmtDate } from "@/components/build/utils";
import { useDailyReports, useCreateDailyReport, useUpdateDailyReport, useDeleteDailyReport } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import { CHART, axisProps, gridProps, tooltipProps } from "@/lib/chart";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type DailyReport = Database["public"]["Tables"]["daily_reports"]["Row"];

const WEATHER = ["Clear", "Partly Cloudy", "Cloudy", "Rain", "Heavy Rain", "Snow", "Fog", "Wind"] as const;
const SAFETY_FILTERS = [
  { value: "all", label: "All reports" },
  { value: "incident", label: "With incidents" },
  { value: "clean", label: "Incident-free" },
  { value: "delay", label: "With delays" },
] as const;

function weatherIcon(w: string | null | undefined): LucideIcon {
  const s = (w ?? "").toLowerCase();
  if (s.includes("heavy")) return CloudRainWind;
  if (s.includes("rain") || s.includes("storm")) return CloudRain;
  if (s.includes("snow")) return Snowflake;
  if (s.includes("fog")) return CloudFog;
  if (s.includes("wind")) return Wind;
  if (s.includes("partly")) return CloudSun;
  if (s.includes("cloud") || s.includes("overcast")) return Cloud;
  if (s.includes("clear") || s.includes("sun")) return Sun;
  return Thermometer;
}

const isWet = (w: string | null | undefined) => /rain|snow|storm/i.test(w ?? "");

function WeatherCell({ r }: { r: DailyReport }) {
  if (!r.weather) return <span className="text-muted-foreground/60">—</span>;
  const Icon = weatherIcon(r.weather);
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Icon className={cn("h-3.5 w-3.5", isWet(r.weather) ? "text-info" : "text-muted-foreground")} />
      <span className="text-muted-foreground">{r.weather}</span>
      {r.temp_high !== null && (
        <span className="font-mono text-[11px] tabular-nums text-muted-foreground/80">{r.temp_high}°/{r.temp_low ?? "—"}°</span>
      )}
    </span>
  );
}

function SafetyCell({ n }: { n: number }) {
  return n > 0 ? (
    <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-destructive">
      <ShieldAlert className="h-3 w-3" />{n}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-success"><ShieldCheck className="h-3 w-3" />0</span>
  );
}

function Glance({ icon: Icon, label, value, sub, tone }: { icon: LucideIcon; label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-lg border bg-surface-2/40 p-3">
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-surface-1", tone ?? "text-muted-foreground")}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="ss-eyebrow text-[9.5px]">{label}</p>
        <p className="truncate font-mono text-base tabular-nums leading-tight">{value}</p>
        {sub && <p className="truncate text-[11px] text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export default function DailyReportsPage() {
  const { data: reports = [], isLoading } = useDailyReports();
  const createReport = useCreateDailyReport();
  const updateReport = useUpdateDailyReport();
  const deleteReport = useDeleteDailyReport();

  const [search, setSearch] = useState("");
  const [safetyFilter, setSafetyFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    author_name: "", crew_count: "", work_hours: "",
    weather: "Clear" as string, temp_high: "", temp_low: "",
    summary: "", safety_incidents: "0",
  });

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    const ms = r.report_number.toLowerCase().includes(q) ||
      (r.author_name ?? "").toLowerCase().includes(q) ||
      (r.weather ?? "").toLowerCase().includes(q);
    const mf = safetyFilter === "all"
      || (safetyFilter === "incident" && r.safety_incidents > 0)
      || (safetyFilter === "clean" && r.safety_incidents === 0)
      || (safetyFilter === "delay" && r.delay_hours > 0);
    return ms && mf;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<DailyReport>(filtered, { pageSize: 25, defaultSort: "report_date", defaultDir: "desc" });

  const m = useMemo(() => {
    const byDate = [...reports].sort((a, b) => a.report_date.localeCompare(b.report_date));
    const totalCrew = reports.reduce((s, r) => s + r.crew_count, 0);
    const totalWorkHours = reports.reduce((s, r) => s + r.work_hours, 0);
    const totalSafetyIncidents = reports.reduce((s, r) => s + r.safety_incidents, 0);
    const totalDelay = reports.reduce((s, r) => s + r.delay_hours, 0);
    const avgCrew = reports.length ? Math.round(totalCrew / reports.length) : 0;
    const lastIncident = [...byDate].reverse().find(r => r.safety_incidents > 0);
    const daysSinceIncident = lastIncident ? -(daysUntil(lastIncident.report_date) ?? 0) : null;
    const latest = byDate[byDate.length - 1] ?? null;
    const recent = byDate.slice(-14);
    const chart = recent.map(r => ({
      day: new Date(`${r.report_date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      crew: r.crew_count,
      hours: r.work_hours,
      weather: r.weather ?? "—",
      color: r.safety_incidents > 0 ? CHART.destructive : isWet(r.weather) ? CHART.info : CHART.primary,
    }));
    const wetDays = recent.filter(r => isWet(r.weather)).length;
    return {
      totalWorkHours, totalSafetyIncidents, totalDelay, avgCrew, lastIncident, daysSinceIncident, latest, chart, wetDays,
      crewSpark: recent.map(r => r.crew_count), hourSpark: recent.map(r => r.work_hours),
    };
  }, [reports]);

  const nextNumber = `DR-${new Date().getFullYear()}-${String(reports.length + 1).padStart(3, "0")}`;

  const handleSubmit = () => {
    createReport.mutate({
      report_number: nextNumber,
      report_date: form.report_date,
      author_name: form.author_name || null,
      crew_count: Number(form.crew_count) || 0,
      work_hours: Number(form.work_hours) || 0,
      weather: form.weather || null,
      temp_high: form.temp_high ? Number(form.temp_high) : null,
      temp_low: form.temp_low ? Number(form.temp_low) : null,
      summary: form.summary || null,
      safety_incidents: Number(form.safety_incidents) || 0,
      delay_hours: 0,
    });
    setOpen(false);
    setForm({
      report_date: new Date().toISOString().slice(0, 10),
      author_name: "", crew_count: "", work_hours: "",
      weather: "Clear", temp_high: "", temp_low: "",
      summary: "", safety_incidents: "0",
    });
  };

  const handleBulkDelete = () => {
    selectedItems.forEach(r => deleteReport.mutate(r.id));
    clearSelection();
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "daily-reports", {
      report_number: "Report #", report_date: "Date", author_name: "Author",
      crew_count: "Crew", work_hours: "Hours", weather: "Weather",
      temp_high: "Temp High", temp_low: "Temp Low",
      safety_incidents: "Safety Incidents",
    });
  };

  const handlePrintPDF = () => {
    const cols = ["Report #", "Date", "Author", "Crew", "Hours", "Weather", "Safety"];
    const rows_html = filtered.map(r => `<tr>
      <td>${r.report_number}</td>
      <td>${r.report_date}</td>
      <td>${r.author_name ?? "—"}</td>
      <td>${r.crew_count}</td>
      <td>${r.work_hours}h</td>
      <td>${r.weather ?? "—"}</td>
      <td>${r.safety_incidents}</td>
    </tr>`).join("");
    printToPDF("Daily Reports", `<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows_html}</tbody></table>`);
  };

  const isFiltering = search !== "" || safetyFilter !== "all";
  const clearFilters = () => { setSearch(""); setSafetyFilter("all"); };
  const sk = String(sortKey ?? "");
  const onSort = (k: string) => toggleSort(k as keyof DailyReport);
  const empty = !isLoading && reports.length === 0;
  const noResults = !isLoading && reports.length > 0 && rows.length === 0;
  const latest = m.latest;
  const LatestWeather = weatherIcon(latest?.weather);
  const latestAge = latest ? -(daysUntil(latest.report_date) ?? 0) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Reports"
        description="The field log — who was on site, what got built, the weather they built it in, and anything that went wrong."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />CSV</Button>
            <Button variant="outline" onClick={handlePrintPDF} disabled={filtered.length === 0}><Printer />PDF</Button>
            <Button onClick={() => setOpen(true)}><Plus />File report</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Reports filed"
          value={reports.length}
          icon={ClipboardPen}
          tone="primary"
          hint={latest ? (latestAge === 0 ? "Latest filed today" : `Latest ${latestAge}d ago`) : "None yet"}
          loading={isLoading}
        />
        <StatCard label="Avg crew / day" value={m.avgCrew} icon={Users} tone="data" hint="Across all reports" spark={m.crewSpark.length > 1 ? m.crewSpark : undefined} loading={isLoading} />
        <StatCard
          label="Work hours"
          value={m.totalWorkHours.toLocaleString()}
          icon={Clock}
          hint={m.totalDelay ? `${m.totalDelay}h lost to delays` : "No delay hours logged"}
          spark={m.hourSpark.length > 1 ? m.hourSpark : undefined}
          loading={isLoading}
        />
        <StatCard
          label="Days since incident"
          value={m.daysSinceIncident === null ? (reports.length ? "None" : "—") : `${m.daysSinceIncident}d`}
          icon={m.totalSafetyIncidents ? ShieldAlert : ShieldCheck}
          tone={m.daysSinceIncident !== null && m.daysSinceIncident < 7 ? "destructive" : reports.length ? "success" : "default"}
          hint={`${m.totalSafetyIncidents} incident${m.totalSafetyIncidents === 1 ? "" : "s"} logged`}
          loading={isLoading}
          onClick={m.totalSafetyIncidents ? () => setSafetyFilter("incident") : undefined}
        />
      </section>

      {!empty && !isLoading && latest && (
        <section className="grid grid-cols-1 gap-3 xl:grid-cols-5">
          <Panel
            glow
            className="xl:col-span-2"
            eyebrow={`Latest · ${latest.report_number}`}
            title={new Date(`${latest.report_date}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            description={latest.author_name ? `Filed by ${latest.author_name}` : undefined}
          >
            <div className="grid grid-cols-2 gap-2">
              <Glance
                icon={LatestWeather}
                label="Weather"
                value={latest.temp_high !== null ? `${latest.temp_high}°/${latest.temp_low ?? "—"}°` : "—"}
                sub={latest.weather ?? "Not recorded"}
                tone={isWet(latest.weather) ? "text-info" : "text-warning"}
              />
              <Glance icon={Users} label="Crew on site" value={latest.crew_count} sub={`${latest.work_hours}h worked`} tone="text-data" />
              <Glance
                icon={Timer}
                label="Delays"
                value={`${latest.delay_hours}h`}
                sub={latest.delay_hours ? "Lost time logged" : "No lost time"}
                tone={latest.delay_hours ? "text-warning" : undefined}
              />
              <Glance
                icon={latest.safety_incidents ? ShieldAlert : ShieldCheck}
                label="Safety"
                value={latest.safety_incidents}
                sub={latest.safety_incidents ? "Incident reported" : "Incident-free"}
                tone={latest.safety_incidents ? "text-destructive" : "text-success"}
              />
            </div>
            {(latest.summary || (latest.activities?.length ?? 0) > 0) && (
              <div className="mt-4 space-y-2.5 border-t pt-4">
                {latest.summary && <p className="text-pretty text-[13px] leading-relaxed text-muted-foreground">{latest.summary}</p>}
                {latest.activities && latest.activities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {latest.activities.map(a => (
                      <span key={a} className="rounded-md border bg-surface-2/60 px-2 py-0.5 text-[11px] text-muted-foreground">{a}</span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Panel>

          <Panel
            className="xl:col-span-3"
            eyebrow="Manpower"
            title={`Last ${m.chart.length} report${m.chart.length === 1 ? "" : "s"}`}
            description={m.wetDays ? `${m.wetDays} wet-weather day${m.wetDays === 1 ? "" : "s"} in this window` : "No wet-weather days in this window"}
            actions={
              <div className="hidden items-center gap-4 text-[11px] text-muted-foreground sm:flex">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-primary" />Crew</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-info" />Wet weather</span>
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-destructive" />Incident</span>
              </div>
            }
          >
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={m.chart} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                  <CartesianGrid {...gridProps} />
                  <XAxis dataKey="day" {...axisProps} interval="preserveStartEnd" minTickGap={12} />
                  <YAxis {...axisProps} width={44} allowDecimals={false} domain={[0, (max: number) => Math.ceil(max / 10) * 10]} tickCount={5} />
                  <Tooltip
                    {...tooltipProps}
                    formatter={(v: number, _n, item) => [`${v} crew · ${(item?.payload as { hours: number }).hours}h · ${(item?.payload as { weather: string }).weather}`, "On site"]}
                  />
                  <Bar dataKey="crew" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                    {m.chart.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </section>
      )}

      <Panel flush eyebrow="Field log" title="All reports">
        {!empty && (
          <div className="border-t px-5 py-4">
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder="Search report #, author, weather…" />
              <Select value={safetyFilter} onValueChange={setSafetyFilter}>
                <SelectTrigger className="h-9 min-w-[8.5rem] flex-1 text-xs sm:w-[150px] sm:flex-none" aria-label="Filter reports"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SAFETY_FILTERS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {isFiltering && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
              <span className="ml-auto hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{filtered.length} of {reports.length}</span>
            </Toolbar>
          </div>
        )}

        {empty ? (
          <div className="border-t p-5">
            <EmptyState
              icon={NotebookPen}
              title="No daily reports yet"
              description="File today’s report — crew, hours, weather and safety — to start the project’s field record."
              action={<Button size="sm" onClick={() => setOpen(true)}><Plus />File report</Button>}
            />
          </div>
        ) : noResults ? (
          <div className="border-t p-5">
            <EmptyState
              compact
              icon={SearchX}
              title="No reports match"
              description={search ? <>Nothing matches “{search}”.</> : "No reports fit this filter."}
              action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          </div>
        ) : (
          <>
            <div className="sm:hidden">
              {isLoading ? <SkeletonCards /> : (
                <ul className="divide-y divide-border/70 border-t">
                  {rows.map((r) => {
                    const Icon = weatherIcon(r.weather);
                    return (
                      <li key={r.id} className="space-y-2.5 px-4 py-3.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">{new Date(`${r.report_date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</p>
                            <p className="truncate font-mono text-[11px] text-muted-foreground">{r.report_number}{r.author_name ? ` · ${r.author_name}` : ""}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(r.id)} aria-label={`Delete ${r.report_number}`}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /><span className="font-mono tabular-nums text-foreground">{r.crew_count}</span> crew</span>
                          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /><span className="font-mono tabular-nums text-foreground">{r.work_hours}h</span></span>
                          {r.weather && <span className="inline-flex items-center gap-1"><Icon className="h-3 w-3" />{r.weather}</span>}
                          <SafetyCell n={r.safety_incidents} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {!isLoading && <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
            </div>

            <div className="hidden overflow-x-auto border-t sm:block [&_th]:whitespace-nowrap">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-5">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => { if (el) (el as HTMLButtonElement).dataset.indeterminate = String(isIndeterminate); }}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <SortableHeader label="Report #" sortKey="report_number" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Date" sortKey="report_date" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Author" sortKey="author_name" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
                    <SortableHeader label="Crew" sortKey="crew_count" currentKey={sk} currentDir={sortDir} onSort={onSort} className="text-right" />
                    <SortableHeader label="Hours" sortKey="work_hours" currentKey={sk} currentDir={sortDir} onSort={onSort} className="text-right" />
                    <TableHead className="hidden md:table-cell">Weather</TableHead>
                    <SortableHeader label="Delay" sortKey="delay_hours" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden text-right xl:table-cell" />
                    <SortableHeader label="Safety" sortKey="safety_incidents" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <TableHead className="w-12 pr-5"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <SkeletonRows cols={10} /> : rows.map((r) => (
                    <TableRow key={r.id} data-state={selected.has(r.id) ? "selected" : undefined} className="group">
                      <TableCell className="pl-5">
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} aria-label={`Select ${r.report_number}`} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{r.report_number}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="font-medium">{fmtDate(r.report_date)}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{new Date(`${r.report_date}T00:00:00`).toLocaleDateString("en-US", { weekday: "short" })}</span>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{r.author_name ?? "—"}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{r.crew_count}</TableCell>
                      <TableCell className="text-right font-mono tabular-nums">{r.work_hours}<span className="text-muted-foreground">h</span></TableCell>
                      <TableCell className="hidden md:table-cell"><WeatherCell r={r} /></TableCell>
                      <TableCell className={cn("hidden text-right font-mono text-xs tabular-nums xl:table-cell", r.delay_hours ? "text-warning" : "text-muted-foreground/60")}>
                        {r.delay_hours ? `${r.delay_hours}h` : "—"}
                      </TableCell>
                      <TableCell><SafetyCell n={r.safety_incidents} /></TableCell>
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => setDeleteId(r.id)}
                          aria-label={`Delete ${r.report_number}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {!isLoading && <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
            </div>
          </>
        )}
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>File daily report</DialogTitle>
            <DialogDescription>Will be logged as <span className="font-mono text-foreground">{nextNumber}</span>.</DialogDescription>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <Field label="Report date" htmlFor="dr-date" required>
              <Input id="dr-date" type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} />
            </Field>
            <Field label="Author" htmlFor="dr-author">
              <Input id="dr-author" value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} placeholder="Superintendent" />
            </Field>
            <Field label="Crew on site" htmlFor="dr-crew">
              <Input id="dr-crew" type="number" min="0" className="font-mono tabular-nums" value={form.crew_count} onChange={e => setForm(f => ({ ...f, crew_count: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Work hours" htmlFor="dr-hours">
              <Input id="dr-hours" type="number" min="0" className="font-mono tabular-nums" value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))} placeholder="0" />
            </Field>
            <Field label="Weather" className="sm:col-span-2">
              <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Weather">
                {WEATHER.map(w => {
                  const Icon = weatherIcon(w);
                  const on = form.weather === w;
                  return (
                    <button
                      key={w}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setForm(f => ({ ...f, weather: w }))}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[10.5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        on ? "border-primary/50 bg-primary/10 text-foreground" : "bg-surface-2/40 text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                      )}
                    >
                      <Icon className={cn("h-4 w-4", on && "text-primary")} />
                      <span className="truncate">{w}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="High (°F)" htmlFor="dr-hi">
              <Input id="dr-hi" type="number" className="font-mono tabular-nums" value={form.temp_high} onChange={e => setForm(f => ({ ...f, temp_high: e.target.value }))} />
            </Field>
            <Field label="Low (°F)" htmlFor="dr-lo">
              <Input id="dr-lo" type="number" className="font-mono tabular-nums" value={form.temp_low} onChange={e => setForm(f => ({ ...f, temp_low: e.target.value }))} />
            </Field>
            <Field label="Summary" htmlFor="dr-sum" className="sm:col-span-2">
              <Textarea id="dr-sum" rows={3} value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Key activities, deliveries, inspections…" />
            </Field>
            <Field label="Safety incidents" htmlFor="dr-safety" hint="Recordables, near-misses and first-aid cases." className="sm:col-span-2">
              <Input id="dr-safety" type="number" min="0" className="w-24 font-mono tabular-nums" value={form.safety_incidents} onChange={e => setForm(f => ({ ...f, safety_incidents: e.target.value }))} />
            </Field>
            <DialogFooter className="gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createReport.isPending}>
                {createReport.isPending ? "Submitting…" : "Submit report"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {reports.find(r => r.id === deleteId)?.report_number ?? "report"}?</AlertDialogTitle>
            <AlertDialogDescription>This report will be removed from the field record permanently. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteReport.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        count={selectedCount}
        onClear={clearSelection}
        actions={[
          { label: "Delete selected", onClick: () => handleBulkDelete(), variant: "destructive" },
        ]}
      />
    </div>
  );
}
