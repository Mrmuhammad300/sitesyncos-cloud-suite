import { useRef, useState } from "react";
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
import { Plus, Search, Trash2, Download, Printer, Paperclip, Upload, ExternalLink, FileText } from "lucide-react";
import { useSubmittals, useCreateSubmittal, useUpdateSubmittal, useDeleteSubmittal, useSubmittalFiles, useCreateSubmittalFile, useDeleteSubmittalFile, useProjects } from "@/hooks/useProjectData";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { BulkActionBar } from "@/components/BulkActionBar";
import { exportToCSV, printToPDF } from "@/lib/export";
import { uploadFile, buildStoragePath, formatFileSize } from "@/lib/storage";
import type { Database } from "@/integrations/supabase/types";

type Submittal = Database["public"]["Tables"]["submittals"]["Row"];

const statusColor: Record<string, string> = {
  Pending: "bg-muted text-muted-foreground",
  "Under Review": "bg-warning/10 text-warning border-warning/20",
  Approved: "bg-success/10 text-success border-success/20",
  Rejected: "bg-destructive/10 text-destructive border-destructive/20",
  Resubmit: "bg-accent/10 text-accent border-accent/20",
};

const STATUSES = ["Pending", "Under Review", "Approved", "Rejected", "Resubmit"] as const;

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
  const [formError, setFormError] = useState("");

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

  const underReview = submittals.filter(s => s.status === "Under Review").length;
  const approved = submittals.filter(s => s.status === "Approved").length;
  const rejected = submittals.filter(s => s.status === "Rejected").length;
  const nextNumber = `SUB-${String(submittals.length + 1).padStart(4, "0")}`;

  const handleSubmit = () => {
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    setFormError("");
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Submittals</h1>
            <Badge variant="outline" className="text-[10px]">SiteSync Build</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">Manage submittal logs, approvals, and document workflows.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button size="sm" variant="outline" onClick={handlePrintPDF}><Printer className="h-4 w-4 mr-1.5" />PDF</Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />New Submittal</Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-xl font-bold">{submittals.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Under Review</p><p className="text-xl font-bold text-warning">{underReview}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Approved</p><p className="text-xl font-bold text-success">{approved}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Rejected</p><p className="text-xl font-bold text-destructive">{rejected}</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search submittals…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {projects.length > 0 && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9 w-[180px] text-xs"><SelectValue placeholder="All Projects" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mobile cards */}
      <div className="block sm:hidden space-y-3">
        {isLoading ? (
          [1,2,3].map(i => <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />)
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No submittals found.</p>
        ) : rows.map((s) => (
          <Card key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{s.submittal_number} · r{s.revision}{s.spec_section ? ` · ${s.spec_section}` : ""}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={e => { e.stopPropagation(); setDeleteId(s.id); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={`text-[10px] ${statusColor[s.status] ?? ""}`}>{s.status}</Badge>
                {s.submitted_by && <span className="text-xs text-muted-foreground">{s.submitted_by}</span>}
                {s.due_date && <span className="text-xs text-muted-foreground">Due {s.due_date}</span>}
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
                    <SortableHeader label="Sub #" sortKey="submittal_number" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Submittal)} />
                    <SortableHeader label="Title" sortKey="title" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Submittal)} />
                    <SortableHeader label="Spec Section" sortKey="spec_section" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Submittal)} />
                    <TableHead className="text-xs">Rev</TableHead>
                    <SortableHeader label="Status" sortKey="status" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Submittal)} />
                    <SortableHeader label="Submitted By" sortKey="submitted_by" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Submittal)} />
                    <SortableHeader label="Due Date" sortKey="due_date" currentKey={String(sortKey ?? "")} currentDir={sortDir} onSort={k => toggleSort(k as keyof Submittal)} />
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((s) => (
                    <TableRow key={s.id} data-selected={selected.has(s.id)} className="cursor-pointer" onClick={() => setDetail(s)}>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{s.submittal_number}</TableCell>
                      <TableCell className="text-sm font-medium max-w-[180px] truncate">{s.title}</TableCell>
                      <TableCell className="text-sm">{s.spec_section ?? "—"}</TableCell>
                      <TableCell className="text-sm text-center">r{s.revision}</TableCell>
                      <TableCell>
                        <Select
                          value={s.status}
                          onValueChange={v => updateSubmittal.mutate({ id: s.id, status: v })}
                        >
                          <SelectTrigger className="h-7 w-[120px] text-[10px] border-0 p-0">
                            <Badge variant="outline" className={`text-[10px] ${statusColor[s.status] ?? ""}`}>{s.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(st => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm">{s.submitted_by ?? "—"}</TableCell>
                      <TableCell className="text-sm">{s.due_date ?? "—"}</TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(s.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">
                        No submittals found.
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

      {/* Detail + Files Dialog */}
      <Dialog open={!!detail} onOpenChange={o => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{detail?.submittal_number}</span>
              {detail?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Metadata */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant="outline" className={`text-[10px] ${statusColor[detail?.status ?? ""] ?? ""}`}>{detail?.status}</Badge>
              <Badge variant="outline" className="text-[10px]">r{detail?.revision}</Badge>
              {detail?.spec_section && <Badge variant="outline" className="text-[10px]">{detail.spec_section}</Badge>}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Submitted By:</span> {detail?.submitted_by ?? "—"}</div>
              <div><span className="text-muted-foreground">Reviewer:</span> {detail?.reviewer ?? "—"}</div>
              <div><span className="text-muted-foreground">Due Date:</span> {detail?.due_date ?? "—"}</div>
              <div><span className="text-muted-foreground">Submitted:</span> {detail?.submitted_date ?? "—"}</div>
            </div>

            {/* File Attachments */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  Attachments
                  {submittalFiles.length > 0 && <span className="text-xs text-muted-foreground font-normal">({submittalFiles.length})</span>}
                </h4>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept=".pdf,.dwg,.dxf,.jpg,.jpeg,.png,.xlsx,.docx,.doc"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    {uploading ? "Uploading…" : "Upload"}
                  </Button>
                </div>
              </div>

              {submittalFiles.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-md border-dashed">
                  <FileText className="h-7 w-7 mx-auto mb-2 opacity-30" />
                  <p className="text-xs">No files attached yet. Upload drawings, specs, or submittals.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {submittalFiles.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-2.5 rounded-md border bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{f.file_name}</p>
                          <p className="text-[10px] text-muted-foreground">v{f.version}{f.file_size ? ` · ${f.file_size}` : ""}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                          asChild
                        >
                          <a href={f.file_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteFile.mutate({ id: f.id, submittalId: f.submittal_id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFormError(""); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Submittal</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Title *</Label>
              <Input value={form.title} onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setFormError(""); }} className={formError ? "border-destructive" : ""} />
              {formError && <p className="text-xs text-destructive mt-1">{formError}</p>}
            </div>
            <div><Label className="text-xs">Spec Section</Label><Input value={form.spec_section} onChange={e => setForm(f => ({ ...f, spec_section: e.target.value }))} placeholder="e.g. 03 30 00" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Submitted By</Label><Input value={form.submitted_by} onChange={e => setForm(f => ({ ...f, submitted_by: e.target.value }))} /></div>
              <div><Label className="text-xs">Reviewer</Label><Input value={form.reviewer} onChange={e => setForm(f => ({ ...f, reviewer: e.target.value }))} /></div>
            </div>
            <div><Label className="text-xs">Due Date</Label><Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <Button className="w-full" onClick={handleSubmit} disabled={!form.title || createSubmittal.isPending}>
              {createSubmittal.isPending ? "Creating…" : "Create Submittal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={o => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submittal?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteSubmittal.mutate(deleteId); setDeleteId(null); } }}
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
          { label: "Under Review", onClick: () => handleBulkStatusUpdate("Under Review") },
          { label: "Approved", onClick: () => handleBulkStatusUpdate("Approved") },
          { label: "Rejected", onClick: () => handleBulkStatusUpdate("Rejected") },
          { label: "Resubmit", onClick: () => handleBulkStatusUpdate("Resubmit") },
        ]}
      />
    </div>
  );
}
