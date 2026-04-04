import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FolderOpen, FileText, File, Image, FileSpreadsheet, Upload, Download, X } from "lucide-react";
import { useDocuments, useCreateDocument } from "@/hooks/useOpsData";
import { Tables } from "@/integrations/supabase/types";

const statusColor: Record<string, string> = {
  Draft: "bg-muted text-muted-foreground",
  "Under Review": "bg-warning/10 text-warning",
  Approved: "bg-success/10 text-success",
  Superseded: "bg-accent/10 text-accent",
  Archived: "bg-muted text-muted-foreground",
};

const typeIcon: Record<string, React.ReactNode> = {
  Drawing: <Image className="h-4 w-4 text-primary" />,
  Specification: <FileText className="h-4 w-4 text-accent" />,
  Report: <FileSpreadsheet className="h-4 w-4 text-success" />,
  Contract: <File className="h-4 w-4 text-warning" />,
  General: <FolderOpen className="h-4 w-4 text-muted-foreground" />,
};

const DOC_TYPES = ["Drawing", "Specification", "Report", "Contract", "General"] as const;
const STATUSES = ["All", "Draft", "Under Review", "Approved", "Superseded", "Archived"] as const;

const DocumentsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Tables<"documents"> | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    doc_type: "General" as string,
    uploaded_by: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: docs = [], isLoading } = useDocuments();
  const createDoc = useCreateDocument();

  const filtered = docs.filter(
    (d) =>
      (filter === "All" || d.status === filter) &&
      (d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.doc_number.toLowerCase().includes(search.toLowerCase()))
  );

  const kpis = [
    { label: "Total Documents", value: docs.length, icon: <FolderOpen className="h-5 w-5 text-primary" /> },
    { label: "Approved", value: docs.filter(d => d.status === "Approved").length, icon: <FileText className="h-5 w-5 text-success" /> },
    { label: "Under Review", value: docs.filter(d => d.status === "Under Review").length, icon: <FileSpreadsheet className="h-5 w-5 text-warning" /> },
    { label: "Drafts", value: docs.filter(d => d.status === "Draft").length, icon: <File className="h-5 w-5 text-muted-foreground" /> },
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    if (file && !form.title) {
      // Auto-fill title from filename (strip extension)
      setForm(f => ({ ...f, title: file.name.replace(/\.[^.]+$/, "") }));
    }
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground">Document management with versioning and file storage.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Upload Document
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              {k.icon}
              <div>
                <p className="text-2xl font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUSES.map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Doc #</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetail(d)}>
                    <TableCell className="font-mono text-xs">{d.doc_number}</TableCell>
                    <TableCell className="font-medium max-w-[220px] truncate">{d.title}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {typeIcon[d.doc_type] ?? typeIcon.General}
                        <span className="text-sm">{d.doc_type}</span>
                      </div>
                    </TableCell>
                    <TableCell><Badge className={statusColor[d.status]}>{d.status}</Badge></TableCell>
                    <TableCell className="text-center">v{d.version}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.file_size ?? "—"}</TableCell>
                    <TableCell>{d.uploaded_by ?? "—"}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      {d.file_url ? (
                        <a href={d.file_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="h-4 w-4" />
                          </Button>
                        </a>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No documents found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{detail?.doc_number}</span>
              {detail?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Badge className={statusColor[detail?.status ?? ""]}>{detail?.status}</Badge>
              <Badge variant="outline">v{detail?.version}</Badge>
              <Badge variant="outline">{detail?.doc_type}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Uploaded By:</span> {detail?.uploaded_by ?? "—"}</div>
              <div><span className="text-muted-foreground">File Size:</span> {detail?.file_size ?? "—"}</div>
            </div>
            {detail?.description && (
              <div>
                <Label className="text-muted-foreground text-xs">Description</Label>
                <p className="text-sm mt-1">{detail.description}</p>
              </div>
            )}
            {detail?.file_url && (
              <a href={detail.file_url} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download File
                </Button>
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Upload Dialog */}
      <Dialog open={createOpen} onOpenChange={handleCloseCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* File drop zone */}
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <File className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 ml-2"
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF, DWG, XLSX, DOCX, PNG, JPG</p>
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

            <div>
              <Label className="text-xs">Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Document title"
              />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description…"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Uploaded By</Label>
                <Input
                  value={form.uploaded_by}
                  onChange={(e) => setForm({ ...form, uploaded_by: e.target.value })}
                  placeholder="Your name"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseCreate}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.title || createDoc.isPending}>
              {createDoc.isPending ? "Uploading…" : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
