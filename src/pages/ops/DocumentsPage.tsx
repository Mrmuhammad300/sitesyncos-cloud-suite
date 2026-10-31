import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderOpen, FileCheck2, FileClock, HardDrive, Upload, Download, X, Trash2, LayoutGrid, List, File as FileIcon } from "lucide-react";
import { useDocuments, useCreateDocument, useDeleteDocument } from "@/hooks/useOpsData";
import { Tables } from "@/integrations/supabase/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTableFeatures } from "@/hooks/useTableFeatures";
import { SortableHeader } from "@/components/SortableHeader";
import { TablePagination } from "@/components/TablePagination";
import { exportToCSV } from "@/lib/export";
import { cn } from "@/lib/utils";
import { EmptyState, PageHeader, Panel, SearchField, StatCard, StatusPill, Toolbar } from "@/components/os";
import { statusTone } from "@/components/os/StatusPill";
import { DetailGrid, DetailItem, FilterChips, FormField, NoResults, PanelBar, Shimmer, TableSkeleton } from "@/components/ops/OpsKit";
import { FileGlyph } from "@/components/ops/FileGlyph";
import { countBy, fmtBytes, fmtDate, parseSize, statusOptions } from "@/components/ops/format";

const DOC_TYPES = ["Drawing", "Specification", "Report", "Contract", "General"] as const;
const STATUSES = ["All", "Draft", "Under Review", "Approved", "Superseded", "Archived"] as const;
const VIEW_KEY = "ss.ops.documents.view";

type DocRecord = Tables<"documents">;
type View = "list" | "grid";

const isReview = (s: string) => /review/i.test(s);

function readView(): View {
  try { return localStorage.getItem(VIEW_KEY) === "grid" ? "grid" : "list"; } catch { return "list"; }
}

const DocumentsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [view, setViewState] = useState<View>(readView);
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Tables<"documents"> | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    doc_type: "General" as string,
    uploaded_by: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading } = useDocuments();
  const createDoc = useCreateDocument();
  const deleteDoc = useDeleteDocument();

  const setView = (v: View) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ }
  };

  const filters = useMemo(() => statusOptions(STATUSES, docs.map((d) => d.status)), [docs]);
  const counts = useMemo(() => countBy(docs, (d) => d.status), [docs]);
  const typeOptions = useMemo(() => {
    const set = new Set<string>(DOC_TYPES);
    docs.forEach((d) => d.doc_type && set.add(d.doc_type));
    return [...set].sort();
  }, [docs]);

  const filtered = docs.filter(
    (d) =>
      (filter === "All" || d.status === filter) &&
      (typeFilter === "All" || d.doc_type === typeFilter) &&
      (d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.doc_number.toLowerCase().includes(search.toLowerCase()))
  );

  const {
    rows, sortKey, sortDir, toggleSort,
    page, setPage, totalPages, total, pageSize,
  } = useTableFeatures<DocRecord>(filtered, { pageSize: 25 });

  const handleExportCSV = () => {
    exportToCSV(filtered, "documents", {
      doc_number: "Doc #", title: "Title", doc_type: "Type", status: "Status",
      version: "Version", file_size: "Size", uploaded_by: "Uploaded By",
    });
  };

  const current = docs.filter((d) => statusTone(d.status) === "success").length;
  const inReview = docs.filter((d) => isReview(d.status)).length;
  const attention = docs.filter((d) => !isReview(d.status) && ["warning", "destructive"].includes(statusTone(d.status)));
  const storage = docs.reduce((s, d) => s + parseSize(d.file_size), 0);
  const withFiles = docs.filter((d) => d.file_url).length;
  const typeCount = new Set(docs.map((d) => d.doc_type)).size;

  const sortProps = (key: keyof DocRecord) => ({
    sortKey: key as string,
    currentKey: String(sortKey ?? ""),
    currentDir: sortDir,
    onSort: (k: string) => toggleSort(k as keyof DocRecord),
  });

  const pickFile = (file: File | null) => {
    setSelectedFile(file);
    if (file && !form.title) {
      // Auto-fill title from filename (strip extension)
      setForm((f) => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files?.[0] ?? null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) pickFile(file);
  };

  const handleCreate = () => {
    if (!form.title) return;
    const docNum = `DOC-${String(docs.length + 1).padStart(3, "0")}`;
    createDoc.mutate(
      {
        doc_number: docNum,
        title: form.title,
        description: form.description || null,
        doc_type: form.doc_type,
        uploaded_by: form.uploaded_by || null,
        file: selectedFile ?? undefined,
      },
      {
        onSuccess: () => {
          setCreateOpen(false);
          setForm({ title: "", description: "", doc_type: "General", uploaded_by: "" });
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      }
    );
  };

  const handleCloseCreate = () => {
    setCreateOpen(false);
    setForm({ title: "", description: "", doc_type: "General", uploaded_by: "" });
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetFilters = () => { setSearch(""); setFilter("All"); setTypeFilter("All"); };

  const rowActions = (d: DocRecord, className?: string) => (
    <div className={cn("flex items-center gap-0.5", className)} onClick={(e) => e.stopPropagation()}>
      {d.file_url && (
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" asChild>
          <a href={d.file_url} target="_blank" rel="noopener noreferrer" aria-label={`Download ${d.title}`}>
            <Download className="h-3.5 w-3.5" />
          </a>
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        onClick={() => setDeleteId(d.id)}
        aria-label={`Delete ${d.title}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Drawings, contracts, permits and reports — versioned, searchable and one click from download."
        actions={
          <>
            <Button variant="outline" onClick={handleExportCSV} disabled={filtered.length === 0}><Download />Export</Button>
            <Button onClick={() => setCreateOpen(true)}><Upload />Upload document</Button>
          </>
        }
      />

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Documents" value={docs.length} icon={FolderOpen} tone="primary" hint={`${typeCount} type${typeCount === 1 ? "" : "s"}`} loading={isLoading} />
        <StatCard label="Approved & current" value={current} icon={FileCheck2} tone="success" hint={docs.length ? `${Math.round((current / docs.length) * 100)}% of library` : "—"} loading={isLoading} />
        <StatCard
          label="In review"
          value={inReview}
          icon={FileClock}
          tone={inReview ? "info" : "default"}
          hint={attention.length ? `${attention.length} expiring or flagged` : "Nothing flagged"}
          loading={isLoading}
        />
        <StatCard label="Library size" value={fmtBytes(storage)} icon={HardDrive} tone="data" hint={`${withFiles} with files attached`} loading={isLoading} />
      </section>

      <Panel
        flush
        eyebrow="Library"
        title="All documents"
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{filtered.length} of {docs.length}</span>
            <div className="flex items-center rounded-lg border bg-surface-2/50 p-0.5" role="group" aria-label="View">
              {([["list", List], ["grid", LayoutGrid]] as const).map(([v, Icon]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  aria-label={`${v === "list" ? "List" : "Grid"} view`}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    view === v ? "bg-surface-3 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>
        }
      >
        <PanelBar className="lg:flex-col lg:items-stretch">
          <Toolbar className="min-w-0 flex-1 flex-nowrap">
            <SearchField value={search} onChange={setSearch} placeholder="Search title or doc #…" className="min-w-0" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-9 w-[132px] shrink-0 sm:w-[160px]" aria-label="Filter by type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All types</SelectItem>
                {typeOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Toolbar>
          <FilterChips options={filters} value={filter} onChange={setFilter} counts={counts} />
        </PanelBar>

        {isLoading ? (
          view === "grid" ? (
            <div className="grid grid-cols-1 gap-3 border-t p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <Shimmer key={i} className="h-40" />)}
            </div>
          ) : <TableSkeleton />
        ) : docs.length === 0 ? (
          <div className="border-t p-4 sm:p-5">
            <EmptyState
              icon={FolderOpen}
              title="Your document library is empty"
              description="Upload drawings, specs, contracts or permits. Files are versioned and stored securely."
              action={<Button onClick={() => setCreateOpen(true)}><Upload />Upload first document</Button>}
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="border-t"><NoResults query={search} onReset={resetFilters} noun="documents" /></div>
        ) : view === "grid" ? (
          <ul className="stagger grid grid-cols-1 gap-3 border-t p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-4">
            {rows.map((d) => (
              <li key={d.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetail(d)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetail(d); } }}
                  className="ss-interactive group relative flex h-full cursor-pointer flex-col gap-3 rounded-xl border bg-surface-2/30 p-4 hover:-translate-y-0.5 hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-start justify-between gap-3">
                    <FileGlyph type={d.doc_type} size="lg" />
                    {rowActions(d, "transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100")}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{d.doc_number} · v{d.version}</p>
                    <p className="line-clamp-2 text-[13px] font-medium leading-snug">{d.title}</p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t pt-3">
                    <StatusPill status={d.status} />
                    <span className="truncate font-mono text-[10.5px] tabular-nums text-muted-foreground">{d.file_size ?? "—"}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader label="Document" {...sortProps("title")} />
                  <SortableHeader label="Doc #" {...sortProps("doc_number")} className="hidden lg:table-cell" />
                  <SortableHeader label="Type" {...sortProps("doc_type")} className="hidden md:table-cell" />
                  <SortableHeader label="Status" {...sortProps("status")} className="hidden sm:table-cell" />
                  <TableHead className="hidden text-right md:table-cell">Ver.</TableHead>
                  <TableHead className="hidden text-right lg:table-cell">Size</TableHead>
                  <SortableHeader label="Uploaded by" {...sortProps("uploaded_by")} className="hidden xl:table-cell" />
                  <TableHead className="w-[76px]"><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetail(d)}>
                    <TableCell className="max-w-[320px]">
                      <div className="flex items-center gap-3">
                        <FileGlyph type={d.doc_type} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{d.title}</div>
                          <div className="truncate font-mono text-[11px] tabular-nums text-muted-foreground lg:hidden">
                            {d.doc_number} · v{d.version}
                          </div>
                          <div className="mt-1 sm:hidden"><StatusPill status={d.status} /></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs tabular-nums text-muted-foreground lg:table-cell">{d.doc_number}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell">{d.doc_type}</TableCell>
                    <TableCell className="hidden sm:table-cell"><StatusPill status={d.status} pulse={isReview(d.status)} /></TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums md:table-cell">v{d.version}</TableCell>
                    <TableCell className="hidden text-right font-mono text-xs tabular-nums text-muted-foreground lg:table-cell">{d.file_size ?? "—"}</TableCell>
                    <TableCell className="hidden text-muted-foreground xl:table-cell">{d.uploaded_by ?? "—"}</TableCell>
                    <TableCell>{rowActions(d, "justify-end")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <TablePagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPage={setPage} />
      </Panel>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-start gap-4">
              <FileGlyph type={detail?.doc_type} size="lg" />
              <div className="min-w-0 space-y-1.5">
                <p className="ss-eyebrow font-mono">{detail?.doc_number} · v{detail?.version}</p>
                <DialogTitle className="leading-snug">{detail?.title}</DialogTitle>
                <StatusPill status={detail?.status} />
              </div>
            </div>
            {detail?.description && <DialogDescription className="pt-2">{detail.description}</DialogDescription>}
          </DialogHeader>
          <DetailGrid>
            <DetailItem label="Type">{detail?.doc_type ?? "—"}</DetailItem>
            <DetailItem label="File size" mono>{detail?.file_size ?? "—"}</DetailItem>
            <DetailItem label="Uploaded by">{detail?.uploaded_by ?? "—"}</DetailItem>
            <DetailItem label="Last updated" mono>{fmtDate(detail?.updated_at)}</DetailItem>
          </DetailGrid>
          {detail?.file_url ? (
            <Button variant="outline" className="w-full" asChild>
              <a href={detail.file_url} target="_blank" rel="noopener noreferrer"><Download />Download file</a>
            </Button>
          ) : (
            <p className="rounded-lg border border-dashed px-3 py-2.5 text-center text-xs text-muted-foreground">No file attached to this record.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete document?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteId) { deleteDoc.mutate(deleteId); setDeleteId(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create / Upload Dialog */}
      <Dialog open={createOpen} onOpenChange={handleCloseCreate}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription>Drop a file or browse. The title fills in from the filename.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* File drop zone */}
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose a file to upload"
              className={cn(
                "relative overflow-hidden rounded-xl border border-dashed p-6 text-center transition-colors sm:col-span-2",
                "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                dragging ? "border-primary bg-primary/5" : "border-border-strong hover:border-primary/50 hover:bg-surface-2/50",
              )}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileInputRef.current?.click(); } }}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              <div className="ss-blueprint pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(circle_at_center,black,transparent_70%)]" />
              {selectedFile ? (
                <div className="relative flex items-center gap-3 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-surface-2 text-primary">
                    <FileIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                    <p className="font-mono text-xs tabular-nums text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label="Remove file"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative space-y-1.5">
                  <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border bg-surface-2 text-muted-foreground">
                    <Upload className="h-4 w-4" />
                  </span>
                  <p className="text-sm"><span className="font-medium text-foreground">Drop a file</span> <span className="text-muted-foreground">or click to browse</span></p>
                  <p className="font-mono text-[10.5px] uppercase tracking-wider text-muted-foreground/70">PDF · DWG · XLSX · DOCX · PNG · JPG</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.dwg,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.svg"
                onChange={handleFileChange}
              />
            </div>

            <FormField label="Title" htmlFor="doc-title" required className="sm:col-span-2">
              <Input id="doc-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Document title" />
            </FormField>
            <FormField label="Type" htmlFor="doc-type">
              <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                <SelectTrigger id="doc-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Uploaded by" htmlFor="doc-by">
              <Input id="doc-by" value={form.uploaded_by} onChange={(e) => setForm({ ...form, uploaded_by: e.target.value })} placeholder="Your name" />
            </FormField>
            <FormField label="Description" htmlFor="doc-desc" className="sm:col-span-2">
              <Textarea id="doc-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description…" rows={2} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreate}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || createDoc.isPending}>
              {createDoc.isPending ? "Uploading…" : "Upload document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
