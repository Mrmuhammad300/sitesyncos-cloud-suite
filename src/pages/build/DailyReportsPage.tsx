import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, CloudSun, Users, Clock, AlertTriangle, Trash2, Download, Printer } from "lucide-react";
import { useDailyReports, useCreateDailyReport, useUpdateDailyReport, useDeleteDailyReport } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import type { Database } from "@/integrations/supabase/types";

type DailyReport = Database["public"]["Tables"]["daily_reports"]["Row"];

const statusColor: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  Submitted: "bg-primary/10 text-primary border-primary/20",
  Approved: "bg-success/10 text-success border-success/20",
};

const STATUSES = ["Draft", "Submitted", "Approved"] as const;
const WEATHER = ["Clear", "Partly Cloudy", "Cloudy", "Rain", "Heavy Rain", "Snow", "Fog", "Wind"] as const;

export default function DailyReportsPage() {
  const { data: reports = [], isLoading } = useDailyReports();
  const createReport = useCreateDailyReport();
  const updateReport = useUpdateDailyReport();
  const deleteReport = useDeleteDailyReport();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    report_date: new Date().toISOString().slice(0, 10),
    author_name: "", crew_count: "", work_hours: "",
    weather: "Clear" as string, temp_high: "", temp_low: "",
    summary: "", safety_incidents: "0",
  });

  const filtered = reports.filter(r => {
    const ms = r.report_number.toLowerCase().includes(search.toLowerCase()) ||
      (r.author_name ?? "").toLowerCase().includes(search.toLowerCase());
    return ms;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<DailyReport>(filtered, { pageSize: 25 });

  const totalCrewDays = reports.reduce((s, r) => s + r.crew_count, 0);
  const totalWorkHours = reports.reduce((s, r) => s + r.work_hours, 0);
  const totalSafetyIncidents = reports.reduce((s, r) => s + r.safety_incidents, 0);
  const avgCrew = reports.length ? Math.round(totalCrewDays / reports.length) : 0;
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
      status: "Draft",
    });
    setOpen(false);
    setForm({
      report_date: new Date().toISOString().slice(0, 10),
      author_name: "", crew_count: "", work_hours: "",
      weather: "Clear", temp_high: "", temp_low: "",
      summary: "", safety_incidents: "0",
    });
  };

  const handleBulkStatusUpdate = (status: string) => {
    selectedItems.forEach(r => updateReport.mutate({ id: r.id, status }));
    clearSelection();
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "daily-reports", {
      report_number: "Report #", report_date: "Date", author_name: "Author",
      crew_count: "Crew", work_hours: "Hours", weather: "Weather",
      temp_high: "Temp High", temp_low: "Temp Low",
      safety_incidents: "Safety Incidents", status: "Status",
    });
  };

  const handlePrintPDF = () => {
    const cols = ["Report #", "Date", "Author", "Crew", "Hours", "Weather", "Safety", "Status"];
    const rows_html = filtered.map(r => `<tr>
      <td>${r.report_number}</td>
      <td>${r.report_date}</td>
      <td>${r.author_name ?? "—"}</td>
      <td>${r.crew_count}</td>
      <td>${r.work_hours}h</td>
      <td>${r.weather ?? "—"}</td>
      <td>${r.safety_incidents}</td>
      <td>${r.status}</td>
    </tr>`).join("");
    printToPDF("Daily Reports", `<table><thead><tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr></thead><tbody>${rows_html}</tbody></table>`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Daily Reports</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Build</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Log daily site activity, crew counts, weather, and field observations.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handlePrintPDF}><Printer className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1.5" />CSV</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />File Report</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <div><p className="text-xs text-muted-foreground">Total Reports</p><p className="text-xl font-bold">{reports.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-success" />
            <div><p className="text-xs text-muted-foreground">Avg Crew / Day</p><p className="text-xl font-bold">{avgCrew}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <CloudSun className="h-5 w-5 text-accent" />
            <div><p className="text-xs text-muted-foreground">Total Work Hours</p><p className="text-xl font-bold">{totalWorkHours.toLocaleString()}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div><p className="text-xs text-muted-foreground">Safety Incidents</p><p className="text-xl font-bold">{totalSafetyIncidents}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search reports…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No reports found.</p>
        ) : rows.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{r.report_date}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{r.report_number}{r.author_name ? ` · ${r.author_name}` : ""}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(r.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${statusColor[r.status] ?? ""}`}>{r.status}</Badge>
                <span className="text-xs text-muted-foreground">{r.crew_count} crew · {r.work_hours}h</span>
                {r.weather && <span className="text-xs text-muted-foreground">{r.weather}</span>}
                {r.safety_incidents > 0 && <span className="text-xs text-destructive font-medium">{r.safety_incidents} incident{r.safety_incidents > 1 ? "s" : ""}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table — hidden on mobile */}
      <Card className="hidden sm:block">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={isAllSelected}
                        ref={(el) => { if (el) (el as HTMLButtonElement).dataset.indeterminate = String(isIndeterminate); }}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <SortableHeader label="Report #" sortKey="report_number" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DailyReport)} />
                    <SortableHeader label="Date" sortKey="report_date" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DailyReport)} />
                    <SortableHeader label="Author" sortKey="author_name" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DailyReport)} />
                    <SortableHeader label="Crew" sortKey="crew_count" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DailyReport)} />
                    <SortableHeader label="Hours" sortKey="work_hours" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DailyReport)} />
                    <TableHead className="text-xs">Weather</TableHead>
                    <SortableHeader label="Safety" sortKey="safety_incidents" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DailyReport)} />
                    <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof DailyReport)} />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} data-selected={selected.has(r.id)}>
                      <TableCell>
                        <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{r.report_number}</TableCell>
                      <TableCell className="text-sm">{r.report_date}</TableCell>
                      <TableCell className="text-sm">{r.author_name ?? "—"}</TableCell>
                      <TableCell className="text-sm text-center">{r.crew_count}</TableCell>
                      <TableCell className="text-sm text-center">{r.work_hours}h</TableCell>
                      <TableCell className="text-sm">
                        {r.weather
                          ? `${r.weather}${r.temp_high ? ` ${r.temp_high}°/${r.temp_low ?? "—"}°` : ""}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-center">
                        {r.safety_incidents > 0
                          ? <span className="text-destructive font-medium">{r.safety_incidents}</span>
                          : <span className="text-success">0</span>}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={v => updateReport.mutate({ id: r.id, status: v })}
                        >
                          <SelectTrigger className="h-7 w-[110px] text-[10px] border-0 p-0">
                            <Badge variant="outline" className={`text-[10px] ${statusColor[r.status] ?? ""}`}>{r.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(r.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-8">
                        No reports found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>File Daily Report</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Report Date</Label><Input type="date" value={form.report_date} onChange={e => setForm(f => ({ ...f, report_date: e.target.value }))} /></div>
              <div><Label className="text-xs">Author Name</Label><Input value={form.author_name} onChange={e => setForm(f => ({ ...f, author_name: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Crew Count</Label><Input type="number" value={form.crew_count} onChange={e => setForm(f => ({ ...f, crew_count: e.target.value }))} /></div>
              <div><Label className="text-xs">Work Hours</Label><Input type="number" value={form.work_hours} onChange={e => setForm(f => ({ ...f, work_hours: e.target.value }))} /></div>
            </div>
            <div>
              <Label className="text-xs">Weather</Label>
              <Select value={form.weather} onValueChange={v => setForm(f => ({ ...f, weather: v }))}>
                <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{WEATHER.map(w => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Temp High (°F)</Label><Input type="number" value={form.temp_high} onChange={e => setForm(f => ({ ...f, temp_high: e.target.value }))} /></div>
              <div><Label className="text-xs">Temp Low (°F)</Label><Input type="number" value={form.temp_low} onChange={e => setForm(f => ({ ...f, temp_low: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Summary</Label><Input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} placeholder="Key activities today…" /></div>
            <div><Label className="text-xs">Safety Incidents</Label><Input type="number" min="0" value={form.safety_incidents} onChange={e => setForm(f => ({ ...f, safety_incidents: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleSubmit} disabled={createReport.isPending}>
              {createReport.isPending ? "Submitting…" : "Submit Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteReport.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Bar */}
      <BulkActionBar
        count={selectedCount}
        onClear={clearSelection}
        actions={[
          { label: "Draft", onClick: () => handleBulkStatusUpdate("Draft") },
          { label: "Submitted", onClick: () => handleBulkStatusUpdate("Submitted") },
          { label: "Approved", onClick: () => handleBulkStatusUpdate("Approved") },
        ]}
      />
    </div>
  );
}
