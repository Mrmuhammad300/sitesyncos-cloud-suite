import { useState, useRef, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, PerspectiveCamera, Html } from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Upload, Loader2, FileBox, ShieldAlert, CheckCircle2, FileText, Plus } from "lucide-react";
import { useProjects, useCreateRFI } from "@/hooks/useProjectData";
import { useCreateBlenderJob, useBlenderJobStatus } from "@/hooks/useBlenderData";
import { toast } from "sonner";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useRef as useThreeRef } from "react";

// ─── Clash record shape (matches Blender MCP result_metadata.clashes) ────────

interface ClashRecord {
  id: string;
  elementA: string;
  elementB: string;
  disciplineA: string;
  disciplineB: string;
  severity: "Critical" | "Major" | "Minor";
  location: string;
  description: string;
}

/** Parse clashes from a completed blender_job result_metadata. */
function parseClashes(resultMetadata: unknown): ClashRecord[] {
  if (!resultMetadata || typeof resultMetadata !== "object") return [];
  const meta = resultMetadata as Record<string, unknown>;
  const blenderResponse = meta["blender_response"] ?? meta;
  if (!blenderResponse || typeof blenderResponse !== "object") return [];
  const clashesRaw = (blenderResponse as Record<string, unknown>)["clashes"];
  if (!Array.isArray(clashesRaw)) return [];
  return clashesRaw
    .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
    .map((c, i) => ({
      id: String(c["id"] ?? `clash-${i}`),
      elementA: String(c["elementA"] ?? c["element_a"] ?? "Unknown A"),
      elementB: String(c["elementB"] ?? c["element_b"] ?? "Unknown B"),
      disciplineA: String(c["disciplineA"] ?? c["discipline_a"] ?? "Unknown"),
      disciplineB: String(c["disciplineB"] ?? c["discipline_b"] ?? "Unknown"),
      severity: (["Critical", "Major", "Minor"].includes(String(c["severity"])) ? c["severity"] : "Minor") as ClashRecord["severity"],
      location: String(c["location"] ?? "—"),
      description: String(c["description"] ?? "—"),
    }));
}

const severityColor: Record<string, string> = {
  Critical: "bg-destructive/10 text-destructive border-destructive/20",
  Major: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  Minor: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

function ClashScene({ hasModel }: { hasModel: boolean }) {
  const groupRef = useThreeRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.08;
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={45} />
      <OrbitControls enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.1} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <Grid args={[30, 30]} cellColor="#334155" sectionColor="#475569" />
      <group ref={groupRef}>
        {/* Building structure */}
        {[0, 3, 6, 9, 12].map((y) => (
          <mesh key={`slab-${y}`} position={[0, y, 0]}>
            <boxGeometry args={[6, 0.15, 5]} />
            <meshStandardMaterial color="#94a3b8" transparent opacity={0.5} />
          </mesh>
        ))}
        {[-2.5, 2.5].flatMap((x) => [-2, 2].map((z) => (
          <mesh key={`col-${x}-${z}`} position={[x, 6, z]}>
            <boxGeometry args={[0.25, 12, 0.25]} />
            <meshStandardMaterial color="#3b82f6" />
          </mesh>
        )))}
        {/* HVAC duct */}
        <mesh position={[0, 7.8, 0]}>
          <boxGeometry args={[5.5, 0.4, 0.6]} />
          <meshStandardMaterial color="#8b5cf6" transparent opacity={0.8} />
        </mesh>
        {/* Beam that clashes */}
        <mesh position={[0, 8, 0.5]}>
          <boxGeometry args={[6, 0.5, 0.3]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        {/* Clash highlight */}
        {hasModel && (
          <mesh position={[0, 7.9, 0.4]}>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#ef4444" transparent opacity={0.7} wireframe />
          </mesh>
        )}
      </group>
      {hasModel && (
        <Html position={[0.5, 9.5, 0.5]}>
          <div className="text-[9px] text-destructive bg-background/90 px-1.5 py-0.5 rounded border border-destructive/30 whitespace-nowrap">
            ⚠ Clash Detected
          </div>
        </Html>
      )}
      <Environment preset="city" />
    </>
  );
}

export default function ClashAnalysisPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string>("none");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedClashes, setSelectedClashes] = useState<Set<string>>(new Set());

  const { data: projects } = useProjects();
  const createJob = useCreateBlenderJob();
  const createRFI = useCreateRFI();
  const { data: activeJob } = useBlenderJobStatus(activeJobId);

  const isAnalyzing = activeJob?.status === "pending" || activeJob?.status === "processing";
  // Parse real clash results from the completed job's result_metadata
  const clashes: ClashRecord[] = activeJob?.status === "completed"
    ? parseClashes(activeJob.result_metadata)
    : [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    const job = await createJob.mutateAsync({
      job_type: "clash",
      project_id: projectId !== "none" ? projectId : undefined,
      file: selectedFile,
    });
    setActiveJobId(job.id);
  };

  const toggleClashSelect = (id: string) => {
    setSelectedClashes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleCreateRFIs = async () => {
    if (projectId === "none") {
      toast.error("Select a project first to create RFIs");
      return;
    }
    const targets = clashes.filter((c) => selectedClashes.has(c.id));
    for (const clash of targets) {
      await createRFI.mutateAsync({
        subject: `Clash: ${clash.elementA} vs ${clash.elementB}`,
        description: `${clash.description}\nLocation: ${clash.location}\nSeverity: ${clash.severity}`,
        status: "Open",
        priority: clash.severity === "Critical" ? "High" : clash.severity === "Major" ? "Medium" : "Low",
        project_id: projectId,
      } as Parameters<typeof createRFI.mutateAsync>[0]);
    }
    toast.success(`${targets.length} RFI${targets.length !== 1 ? "s" : ""} created`);
    setSelectedClashes(new Set());
  };

  const criticalCount = clashes.filter((c) => c.severity === "Critical").length;
  const majorCount = clashes.filter((c) => c.severity === "Major").length;
  const minorCount = clashes.filter((c) => c.severity === "Minor").length;

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Clash Analysis</h1>
            <Badge variant="outline" className="text-[10px]">Spatial Workbench</Badge>
            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 border">Blender MCP</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Upload a BIM model to detect clashes using AI. Create RFIs for conflicts instantly.
          </p>
        </div>
      </div>

      {/* KPI row */}
      {clashes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Clashes", value: clashes.length, cls: "" },
            { label: "Critical", value: criticalCount, cls: "text-destructive" },
            { label: "Major", value: majorCount, cls: "text-amber-500" },
            { label: "Minor", value: minorCount, cls: "text-blue-500" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Upload panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4 text-blue-500" /> Upload BIM Model
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ifc,.rvt,.glb,.gltf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/50 hover:bg-muted/30 transition-colors"
              >
                <FileBox className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <p className="text-xs font-medium">{selectedFile ? selectedFile.name : "Drop file or click to browse"}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">IFC, RVT, GLB, GLTF</p>
                </div>
              </button>

              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Link to project (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                onClick={handleAnalyze}
                disabled={!selectedFile || isAnalyzing || createJob.isPending}
              >
                {isAnalyzing
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyzing…</>
                  : <><ShieldAlert className="h-4 w-4 mr-2" /> Analyze Clashes</>}
              </Button>

              {activeJob && (
                <div className={`text-xs p-2 rounded border ${
                  activeJob.status === "completed" ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600" :
                  activeJob.status === "failed" ? "border-destructive/30 bg-destructive/5 text-destructive" :
                  "border-blue-500/30 bg-blue-500/5 text-blue-600"
                }`}>
                  {activeJob.status === "pending" ? "Job queued…" :
                   activeJob.status === "processing" ? "Blender analyzing model…" :
                   activeJob.status === "completed" ? "Analysis complete" :
                   `Failed: ${activeJob.error_message}`}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {clashes.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Actions</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={handleCreateRFIs}
                  disabled={selectedClashes.size === 0 || createRFI.isPending}
                >
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Create RFI{selectedClashes.size > 1 ? "s" : ""} ({selectedClashes.size} selected)
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  <FileText className="h-3.5 w-3.5 mr-2" /> Export PDF Report
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => setSelectedClashes(new Set(clashes.map((c) => c.id)))}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Select All
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 3D Viewer */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-0">
              <div className="aspect-[16/9] rounded-lg overflow-hidden bg-muted/20">
                <Canvas shadows>
                  <Suspense fallback={<Html center><div className="text-xs text-muted-foreground">Loading…</div></Html>}>
                    <ClashScene hasModel={clashes.length > 0} />
                  </Suspense>
                </Canvas>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Clash table */}
      {clashes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Clash Report ({clashes.length} issues)
              </CardTitle>
              {selectedClashes.size > 0 && (
                <span className="text-xs text-muted-foreground">{selectedClashes.size} selected</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead className="text-xs">Element A</TableHead>
                  <TableHead className="text-xs">Element B</TableHead>
                  <TableHead className="text-xs">Disciplines</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                  <TableHead className="text-xs">Location</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clashes.map((clash) => (
                  <TableRow
                    key={clash.id}
                    className={`cursor-pointer ${selectedClashes.has(clash.id) ? "bg-primary/5" : "hover:bg-muted/30"}`}
                    onClick={() => toggleClashSelect(clash.id)}
                  >
                    <TableCell>
                      <div className={`h-3.5 w-3.5 rounded border-2 ${selectedClashes.has(clash.id) ? "bg-primary border-primary" : "border-muted-foreground/30"}`} />
                    </TableCell>
                    <TableCell className="text-xs font-mono">{clash.elementA}</TableCell>
                    <TableCell className="text-xs font-mono">{clash.elementB}</TableCell>
                    <TableCell className="text-xs">
                      <span className="text-muted-foreground">{clash.disciplineA} × {clash.disciplineB}</span>
                    </TableCell>
                    <TableCell>
                      <span className={`text-[10px] border rounded-full px-2 py-0.5 ${severityColor[clash.severity]}`}>
                        {clash.severity}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] text-muted-foreground">{clash.location}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{clash.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!selectedFile && clashes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Upload a BIM model to detect clashes</p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports IFC, Revit (.rvt), and GLB files. Blender MCP will analyze element intersections across all disciplines.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
