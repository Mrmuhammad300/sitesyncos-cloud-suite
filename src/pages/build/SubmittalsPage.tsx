import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Download, Printer, Paperclip, Upload, ExternalLink, FileText, ClipboardList, ScanEye, BadgeCheck, AlarmClock, SearchX, FilePlus2, ChevronRight } from "lucide-react";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar, type StatusTone } from "@/components/os";
import { DueChip, Field, Meta, SegmentBar, SkeletonCards, SkeletonRows, StatusSelect } from "@/components/build/kit";
import { fmtDate, urgencyOf } from "@/components/build/utils";
import { useSubmittals, useCreateSubmittal, useUpdateSubmittal, useDeleteSubmittal, useSubmittalFiles, useCreateSubmittalFile, useDeleteSubmittalFile, useProjects } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import { uploadFile, buildStoragePath, formatFileSize } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Database } from "@/integrations/supabase/types";

type Submittal = Database["public"]["Tables"]["submittals"]["Row"];

const STATUSES = ["Pending", "Under Review", "Approved", "Rejected", "Resubmit"] as const;
const STATUS_TONES: Partial<Record<string, StatusTone>> = { Pending: "neutral", Resubmit: "warning", Submitted: "info" };
const DECIDED = new Set(["Approved", "Rejected"]);

function toneFor(status: string): StatusTone {
  if (STATUS_TONES[status]) return STATUS_TONES[status]!;
  const s = status.toLowerCase();
  if (s.includes("approv")) return "success";
  if (s.includes("reject")) return "destructive";
  if (s.includes("resubmit") || s.includes("revise")) return "warning";
  if (s.includes("review") || s.includes("submitted")) return "info";
  return "neutral";
}

function Revision({ rev }: { rev: number }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 min-w-7 items-center justify-center rounded-md border px-1 font-mono text-[11px] tabular-nums",
        rev > 0 ? "border-warning/30 bg-warning/10 text-warning" : "border-border text-muted-foreground",
      )}
      title={rev > 0 ? `Resubmitted ${rev} time${rev === 1 ? "" : "s"}` : "Original submission"}
    >
      R{rev}
    </span>
  );
}

export default function SubmittalsPage() {
  const { data: submittals = [], isLoading } = useSubmittals();
  const { data: projects = [] } = useProjects();
  const createSubmittal = useCreateSubmittal();
  const updateSubmittal = useUpdateSubmittal();
  const deleteSubmittal = useDeleteSubmittal();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Submittal | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", spec_section: "", submitted_by: "", reviewer: "", due_date: "",
  });

  const filtered = submittals.filter(s => {
    const ms = s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.submittal_number.toLowerCase().includes(search.toLowerCase());
    const mst = statusFilter === "all" || s.status === statusFilter;
    const mp = projectFilter === "all" || s.project_id === projectFilter;
    return ms && mst && mp;
  });

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
    selected, selectedItems, selectedCount,
    toggleSelect, toggleSelectAll, clearSelection,
    isAllSelected, isIndeterminate,
  } = useTableFeatures<Submittal>(filtered, { pageSize: 25 });

  const { data: submittalFiles = [] } = useSubmittalFiles(detail?.id ?? null);
  const createFile = useCreateSubmittalFile();
  const deleteFile = useDeleteSubmittalFile();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !detail) return;
    setUploading(true);
    try {
      const path = buildStoragePath("documents", file);
      const url = await uploadFile("documents", path, file);
      const existingVersions = submittalFiles.filter(f => f.submittal_id === detail.id);
      await createFile.mutateAsync({
        submittal_id: detail.id,
        file_name: file.name,
        file_url: url,
        file_size: formatFileSize(file.size),
        version: existingVersions.length + 1,
        uploaded_by: null,
        notes: null,
      });
    } catch {
      // error toast handled in hook
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const m = useMemo(() => {
    const inReview = submittals.filter(s => toneFor(s.status) === "info").length;
    const approved = submittals.filter(s => s.status === "Approved").length;
    const rejected = submittals.filter(s => s.status === "Rejected").length;
    const decided = approved + rejected;
    const approvalRate = decided ? Math.round((approved / decided) * 100) : null;
    const awaiting = submittals.filter(s => !DECIDED.has(s.status));
    const overdue = awaiting.filter(s => urgencyOf(s.due_date).urgency === "late").length;
    const resubmitted = submittals.filter(s => s.revision > 0).length;
    // Pipeline: canonical statuses first, then any others present in the data.
    const order = [...STATUSES, ...Array.from(new Set(submittals.map(s => s.status))).filter(s => !(STATUSES as readonly string[]).includes(s))];
    const segments = order
      .map(s => ({ key: s, label: s, value: submittals.filter(x => x.status === s).length, tone: toneFor(s) }))
      .filter(s => s.value > 0 || (STATUSES as readonly string[]).includes(s.key));
    return { inReview, approved, rejected, approvalRate, awaiting, overdue, resubmitted, segments };
  }, [submittals]);

  const nextNumber = `SUB-${String(submittals.length + 1).padStart(4, "0")}`;

  const handleSubmit = () => {
    if (!form.title) return;
    createSubmittal.mutate({
      submittal_number: nextNumber,
      title: form.title,
      spec_section: form.spec_section || null,
      submitted_by: form.submitted_by || null,
      reviewer: form.reviewer || null,
      due_date: form.due_date || null,
      status: "Pending",
      revision: 1,
    });
    setOpen(false);
    setForm({ title: "", spec_section: "", submitted_by: "", reviewer: "", due_date: "" });
  };

  const handleBulkStatusUpdate = (status: string) => {
    selectedItems.forEach(s => updateSubmittal.mutate({ id: s.id, status }));
    clearSelection();
  };

  const handleExportCSV = () => {
    exportToCSV(filtered, "submittals", {
      submittal_number: "Sub #", title: "Title", spec_section: "Spec Section",
      revision: "Rev", status: "Status", submitted_by: "Submitted By",
      reviewer: "Reviewer", due_date: "Due Date",
    });
  };

  const handlePrintPDF = () => {
    const tableHtml = `<table>
      <thead><tr><th>Sub #</th><th>Title</th><th>Spec Section</th><th>Rev</th><th>Status</th><th>Submitted By</th><th>Due Date</th></tr></thead>
      <tbody>${filtered.map(s => `<tr>
        <td>${s.submittal_number}</td>
        <td>${s.title}</td>
        <td>${s.spec_section ?? "—"}</td>
        <td>r${s.revision}</td>
        <td>${s.status}</td>
        <td>${s.submitted_by ?? "—"}</td>
        <td>${s.due_date ?? "—"}</td>
      </tr>`).join("")}</tbody>
    </table>`;
    printToPDF(`Submittals — ${new Date().toLocaleDateString()}`, tableHtml);
  };

  const isFiltering = search !== "" || statusFilter !== "all" || projectFilter !== "all";
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setProjectFilter("all"); };
  const sk = String(sortKey ?? "");
  const onSort = (k: string) => toggleSort(k as keyof Submittal);
  const empty = !isLoading && submittals.length === 0;
  const noResults = !isLoading && submittals.length > 0 && rows.length === 0;
  const statusOptions = useMemo(
    () => Array.from(new Set<string>([...STATUSES, ...submittals.map(s => s.status)])),
    [submittals],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Submittals"
        description="Shop drawings, product data and samples moving through design review — and what’s holding up procurement."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />Export</Button>
            <Button variant="outline" onClick={handlePrintPDF} disabled={filtered.length === 0}><Printer />PDF</Button>
            <Button onClick={() => setOpen(true)}><Plus />New submittal</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="In the log" value={submittals.length} icon={ClipboardList} tone="primary" hint={`${m.awaiting.length} awaiting decision`} loading={isLoading} />
        <StatCard label="In review" value={m.inReview} icon={ScanEye} tone="info" hint="With the design team" loading={isLoading} />
        <StatCard
          label="Approved"
          value={m.approved}
          icon={BadgeCheck}
          tone="success"
          hint={m.approvalRate === null ? "No decisions yet" : `${m.approvalRate}% of decisions`}
          loading={isLoading}
        />
        <StatCard
          label="Overdue"
          value={m.overdue}
          icon={AlarmClock}
          tone={m.overdue ? "destructive" : "success"}
          hint={m.resubmitted ? `${m.resubmitted} on a resubmission` : "No resubmissions"}
          loading={isLoading}
        />
      </section>

      <Panel flush eyebrow="Review pipeline" title="Submittal log" description={!empty ? "Click a stage to filter the log." : undefined}>
        {!empty && (
          <div className="space-y-4 border-t px-5 py-4">
            <SegmentBar segments={m.segments} active={statusFilter === "all" ? undefined : statusFilter} onSelect={setStatusFilter} />
            <Toolbar>
              <SearchField value={search} onChange={setSearch} placeholder="Search title or SUB #…" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs" aria-label="Filter by status"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              {projects.length > 0 && (
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="h-9 w-[180px] text-xs" aria-label="Filter by project"><SelectValue placeholder="All projects" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {isFiltering && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
              <span className="ml-auto hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{filtered.length} of {submittals.length}</span>
            </Toolbar>
          </div>
        )}

        {empty ? (
          <div className="border-t p-5">
            <EmptyState
              icon={FilePlus2}
              title="No submittals yet"
              description="Log shop drawings, product data and samples to track them through review and approval."
              action={<Button size="sm" onClick={() => setOpen(true)}><Plus />New submittal</Button>}
            />
          </div>
        ) : noResults ? (
          <div className="border-t p-5">
            <EmptyState
              compact
              icon={SearchX}
              title="No submittals match"
              description={search ? <>Nothing matches “{search}”.</> : "No submittals in this stage or project."}
              action={<Button size="sm" variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          </div>
        ) : (
          <>
            <div className="sm:hidden">
              {isLoading ? <SkeletonCards /> : (
                <ul className="divide-y divide-border/70 border-t">
                  {rows.map((s) => (
                    <li key={s.id}>
                      <button type="button" className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2/50" onClick={() => setDetail(s)}>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div>
                            <p className="font-mono text-[11px] text-muted-foreground">{s.submittal_number}{s.spec_section ? ` · ${s.spec_section}` : ""}</p>
                            <p className="text-sm font-medium leading-snug">{s.title}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusPill status={s.status} tone={toneFor(s.status)} />
                            <Revision rev={s.revision} />
                            <DueChip date={s.due_date} done={DECIDED.has(s.status)} />
                          </div>
                        </div>
                        <ChevronRight className="mt-5 h-4 w-4 shrink-0 text-muted-foreground/50" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!isLoading && <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />}
            </div>

            <div className="hidden overflow-x-auto border-t sm:block">
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
                    <SortableHeader label="Sub #" sortKey="submittal_number" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Title" sortKey="title" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Spec" sortKey="spec_section" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
                    <SortableHeader label="Rev" sortKey="revision" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Status" sortKey="status" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <SortableHeader label="Submitted by" sortKey="submitted_by" currentKey={sk} currentDir={sortDir} onSort={onSort} className="hidden md:table-cell" />
                    <SortableHeader label="Due" sortKey="due_date" currentKey={sk} currentDir={sortDir} onSort={onSort} />
                    <TableHead className="w-12 pr-5"><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? <SkeletonRows cols={9} /> : rows.map((s) => (
                    <TableRow key={s.id} data-state={selected.has(s.id) ? "selected" : undefined} className="group cursor-pointer" onClick={() => setDetail(s)}>
                      <TableCell className="pl-5" onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} aria-label={`Select ${s.submittal_number}`} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{s.submittal_number}</TableCell>
                      <TableCell className="max-w-[300px]">
                        <p className="truncate font-medium">{s.title}</p>
                        <p className="truncate text-xs text-muted-foreground">Reviewer · {s.reviewer ?? "Unassigned"}</p>
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap font-mono text-xs tabular-nums text-muted-foreground lg:table-cell">{s.spec_section ?? "—"}</TableCell>
                      <TableCell><Revision rev={s.revision} /></TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <StatusSelect value={s.status} options={STATUSES} tones={{ ...STATUS_TONES, [s.status]: toneFor(s.status) }} onChange={v => updateSubmittal.mutate({ id: s.id, status: v })} label={`Status for ${s.submittal_number}`} />
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground md:table-cell">{s.submitted_by ?? "—"}</TableCell>
                      <TableCell><DueChip date={s.due_date} done={DECIDED.has(s.status)} /></TableCell>
                      <TableCell className="pr-5" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-60 transition-opacity hover:text-destructive group-hover:opacity-100 focus-visible:opacity-100"
                          onClick={() => setDeleteId(s.id)}
                          aria-label={`Delete ${s.submittal_number}`}
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

      {/* Detail + Files Dialog */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <p className="font-mono text-[11px] text-muted-foreground">{detail?.submittal_number}{detail?.spec_section ? ` · Spec ${detail.spec_section}` : ""}</p>
            <DialogTitle className="leading-snug">{detail?.title}</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {detail && <StatusPill status={detail.status} tone={toneFor(detail.status)} />}
                {detail && <Revision rev={detail.revision} />}
                {detail && <DueChip date={detail.due_date} done={DECIDED.has(detail.status)} />}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-2">
              <Meta label="Submitted by">{detail?.submitted_by ?? "—"}</Meta>
              <Meta label="Reviewer">{detail?.reviewer ?? "—"}</Meta>
              <Meta label="Submitted" mono>{fmtDate(detail?.submitted_date, true)}</Meta>
              <Meta label="Due" mono>{fmtDate(detail?.due_date, true)}</Meta>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="flex items-center gap-1.5 text-sm font-semibold">
                  <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                  Attachments
                  {submittalFiles.length > 0 && <span className="font-mono text-xs font-normal tabular-nums text-muted-foreground">{submittalFiles.length}</span>}
                </h4>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.xlsx,.docx,.doc"
                />
                <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileInputRef.current?.click()}>
                  <Upload />
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </div>

              {submittalFiles.length === 0 ? (
                <EmptyState compact icon={FileText} title="No files attached" description="Upload drawings, product data or specs (PDF, DWG, images, Office)." />
              ) : (
                <ul className="space-y-1.5">
                  {submittalFiles.map(f => (
                    <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border bg-surface-2/40 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-surface-1 text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{f.file_name}</p>
                          <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">v{f.version}{f.file_size ? ` · ${f.file_size}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
                          <a href={f.file_url} target="_blank" rel="noreferrer" aria-label={`Open ${f.file_name}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteFile.mutate({ id: f.id, submittalId: f.submittal_id })}
                          aria-label={`Remove ${f.file_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New submittal</DialogTitle>
            <DialogDescription>Will be logged as <span className="font-mono text-foreground">{nextNumber}</span> and set to Pending.</DialogDescription>
          </DialogHeader>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
            <Field label="Title" htmlFor="sub-title" required className="sm:col-span-2">
              <Input id="sub-title" autoFocus value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Structural steel shop drawings" />
            </Field>
            <Field label="Spec section" htmlFor="sub-spec">
              <Input id="sub-spec" className="font-mono" value={form.spec_section} onChange={e => setForm(f => ({ ...f, spec_section: e.target.value }))} placeholder="03 30 00" />
            </Field>
            <Field label="Review due" htmlFor="sub-due">
              <Input id="sub-due" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </Field>
            <Field label="Submitted by" htmlFor="sub-by">
              <Input id="sub-by" value={form.submitted_by} onChange={e => setForm(f => ({ ...f, submitted_by: e.target.value }))} placeholder="Subcontractor" />
            </Field>
            <Field label="Reviewer" htmlFor="sub-rev">
              <Input id="sub-rev" value={form.reviewer} onChange={e => setForm(f => ({ ...f, reviewer: e.target.value }))} placeholder="Architect / engineer" />
            </Field>
            <DialogFooter className="gap-2 sm:col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.title || createSubmittal.isPending}>
                {createSubmittal.isPending ? "Creating…" : "Create submittal"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {submittals.find(s => s.id === deleteId)?.submittal_number ?? "submittal"}?</AlertDialogTitle>
            <AlertDialogDescription>The submittal and its review history will be removed permanently. This can’t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteSubmittal.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete submittal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BulkActionBar
        count={selectedCount}
        onClear={clearSelection}
        actions={[
          { label: "Under Review", onClick: () => handleBulkStatusUpdate("Under Review") },
          { label: "Approved", onClick: () => handleBulkStatusUpdate("Approved") },
          { label: "Rejected", onClick: () => handleBulkStatusUpdate("Rejected") },
          { label: "Resubmit", onClick: () => handleBulkStatusUpdate("Resubmit") },
        ]}
      />
    </div>
  );
}
