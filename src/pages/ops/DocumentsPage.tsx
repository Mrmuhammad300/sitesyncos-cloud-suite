import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, FolderOpen, FileText, File, Image, FileSpreadsheet } from "lucide-react";
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

const DocumentsPage = () => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<Tables<"documents"> | null>(null);
  const [form, setForm] = useState({ title: "", description: "", doc_type: "General", uploaded_by: "" });
  const filters = ["All", "Draft", "Under Review", "Approved", "Superseded", "Archived"];
  const { data: docs = [], isLoading } = useDocuments();
  const createDoc = useCreateDocument();

  const filtered = docs.filter(
    (d) => (filter === "All" || d.status === filter) && (d.title.toLowerCase().includes(search.toLowerCase()) || d.doc_number.toLowerCase().includes(search.toLowerCase()))
  );

  const kpis = [
    { label: "Total Documents", value: docs.length, icon: <FolderOpen className="h-5 w-5 text-primary" /> },
    { label: "Approved", value: docs.filter(d => d.status === "Approved").length, icon: <FileText className="h-5 w-5 text-success" /> },
    { label: "Under Review", value: docs.filter(d => d.status === "Under Review").length, icon: <FileSpreadsheet className="h-5 w-5 text-warning" /> },
    { label: "Drafts", value: docs.filter(d => d.status === "Draft").length, icon: <File className="h-5 w-5 text-muted-foreground" /> },
  ];

  const handleCreate = () => {
    if (!form.title) return;
    const docNum = `DOC-${String(docs.length + 1).padStart(3, "0")}`;
    createDoc.mutate({
      doc_number: docNum,
      title: form.title,
      description: form.description || null,
      doc_type: form.doc_type,
      uploaded_by: form.uploaded_by || null,
    });
    setCreateOpen(false);
    setForm({ title: "", description: "", doc_type: "General", uploaded_by: "" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">Documents</h1><p className="text-sm text-muted-foreground">Document management with versioning</p></div>
        <Button onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Upload Document</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => (<Card key={k.label}><CardContent className="p-4 flex items-center gap-3">{k.icon}<div><p className="text-2xl font-bold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div></CardContent></Card>))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search documents..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="flex gap-2 flex-wrap">{filters.map((f) => (<Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f}</Button>))}</div>
      </div>

      <Card><CardContent className="p-0">
        {isLoading ? <div className="flex items-center justify-center py-12 text-muted-foreground">Loading...</div> : (
          <Table>
            <TableHeader><TableRow><TableHead>Doc #</TableHead><TableHead>Title</TableHead><TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Version</TableHead><TableHead>Uploaded By</TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id} className="cursor-pointer" onClick={() => setDetail(d)}>
                  <TableCell className="font-mono text-xs">{d.doc_number}</TableCell>
                  <TableCell className="font-medium max-w-[250px] truncate">{d.title}</TableCell>
                  <TableCell><div className="flex items-center gap-1.5">{typeIcon[d.doc_type] || typeIcon.General}<span className="text-sm">{d.doc_type}</span></div></TableCell>
                  <TableCell><Badge className={statusColor[d.status]}>{d.status}</Badge></TableCell>
                  <TableCell className="text-center">v{d.version}</TableCell>
                  <TableCell>{d.uploaded_by || "—"}</TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No documents found</TableCell></TableRow>}
            </TableBody>
          </Table>
        )}
      </CardContent></Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{detail?.doc_number}</span>{detail?.title}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2"><Badge className={statusColor[detail?.status || ""]}>{detail?.status}</Badge><Badge variant="outline">v{detail?.version}</Badge><Badge variant="outline">{detail?.doc_type}</Badge></div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">Uploaded By:</span> {detail?.uploaded_by || "—"}</div>
              <div><span className="text-muted-foreground">File Size:</span> {detail?.file_size || "—"}</div>
            </div>
            {detail?.description && <div><Label className="text-muted-foreground">Description</Label><p className="text-sm mt-1">{detail.description}</p></div>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Document title" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Type</Label>
                <Select value={form.doc_type} onValueChange={(v) => setForm({ ...form, doc_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Drawing">Drawing</SelectItem><SelectItem value="Specification">Specification</SelectItem><SelectItem value="Report">Report</SelectItem><SelectItem value="Contract">Contract</SelectItem><SelectItem value="General">General</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Uploaded By</Label><Input value={form.uploaded_by} onChange={(e) => setForm({ ...form, uploaded_by: e.target.value })} placeholder="Your name" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createDoc.isPending}>{createDoc.isPending ? "Uploading..." : "Upload Document"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DocumentsPage;
