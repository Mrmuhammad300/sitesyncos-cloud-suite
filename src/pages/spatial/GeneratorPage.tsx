import { useState, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, PerspectiveCamera, Html } from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Wand2, Loader2, CheckCircle2, XCircle, Clock, Activity, Download, FolderOpen, Layers, RefreshCw } from "lucide-react";
import { useProjects } from "@/hooks/useProjectData";
import { useBlenderJobs, useCreateBlenderJob, useBlenderJobStatus } from "@/hooks/useBlenderData";
import * as THREE from "three";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

const SUGGESTIONS = [
  "Modern open-plan office, 5,000 sqft, 30 desks, 3 meeting rooms, kitchen",
  "Residential floor layout, 2,400 sqft, 3 bedrooms, 2 bathrooms, open kitchen",
  "Retail showroom, 8,000 sqft, high ceilings, reception area, storage rooms",
  "Mixed-use lobby, 1,200 sqft, elevator core, mailroom, bike storage",
  "Medical clinic, 3,200 sqft, 6 exam rooms, waiting area, nurses station",
];

function PlaceholderScene() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.4;
    }
  });
  return (
    <>
      <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={45} />
      <OrbitControls enableDamping dampingFactor={0.1} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 15, 10]} intensity={1} />
      <Grid args={[20, 20]} cellColor="#334155" sectionColor="#475569" />
      <mesh ref={meshRef} position={[0, 1.5, 0]}>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#3b82f6" wireframe />
      </mesh>
      <Html center position={[0, 4, 0]}>
        <div className="text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded whitespace-nowrap">
          Generated model will appear here
        </div>
      </Html>
      <Environment preset="city" />
    </>
  );
}

const statusIcon: Record<string, React.ReactNode> = {
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  pending: <Clock className="h-3.5 w-3.5 text-amber-500" />,
  processing: <Activity className="h-3.5 w-3.5 text-blue-500 animate-pulse" />,
};

const statusVariant: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

function JobStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] border rounded-full px-2 py-0.5 ${statusVariant[status] ?? ""}`}>
      {statusIcon[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function ActiveJobMonitor({ jobId }: { jobId: string }) {
  const { data: job } = useBlenderJobStatus(jobId);
  if (!job) return null;
  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {job.status === "processing" || job.status === "pending"
            ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
            : job.status === "completed"
            ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            : <XCircle className="h-4 w-4 text-destructive" />}
          <div>
            <p className="text-xs font-medium">
              {job.status === "pending" ? "Job queued…" :
               job.status === "processing" ? "Blender generating model…" :
               job.status === "completed" ? "Model ready!" : "Generation failed"}
            </p>
            <p className="text-[10px] text-muted-foreground">Job #{job.id.slice(0, 8)}</p>
          </div>
        </div>
        <JobStatusBadge status={job.status} />
      </CardContent>
    </Card>
  );
}

export default function GeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const { data: projects } = useProjects();
  const { data: jobs } = useBlenderJobs(projectId !== "none" ? projectId : undefined);
  const createJob = useCreateBlenderJob();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const job = await createJob.mutateAsync({
      job_type: "generate",
      prompt: prompt.trim(),
      project_id: projectId !== "none" ? projectId : undefined,
    });
    setActiveJobId(job.id);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">3D Generator</h1>
            <Badge variant="outline" className="text-[10px]">Spatial Workbench</Badge>
            <Badge className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20 border">Blender MCP</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Describe a space and AI generates a 3D model via Blender.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Prompt panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-blue-500" /> Generate from Prompt
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Describe the space you want to generate…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                className="text-sm resize-none"
              />

              {/* Quick suggestions */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Quick start</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setPrompt(s)}
                    className="w-full text-left text-[10px] text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted/50 transition-colors truncate"
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Project link */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Link to project (optional)</p>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="No project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects?.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full"
                onClick={handleGenerate}
                disabled={!prompt.trim() || createJob.isPending}
              >
                {createJob.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting…</>
                  : <><Wand2 className="h-4 w-4 mr-2" /> Generate Model</>}
              </Button>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Actions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { icon: Download, label: "Export GLB", desc: "Download 3D file" },
                { icon: FolderOpen, label: "Save to Project", desc: "Attach to project" },
                { icon: Layers, label: "Send to Floor Plans", desc: "Extract 2D layout" },
                { icon: RefreshCw, label: "Generate Variants", desc: "3 alternative layouts" },
              ].map(({ icon: Icon, label, desc }) => (
                <button
                  key={label}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-muted/50 text-left transition-colors"
                >
                  <div className="h-7 w-7 rounded bg-muted flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{label}</p>
                    <p className="text-[10px] text-muted-foreground">{desc}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* 3D canvas */}
        <div className="lg:col-span-2 space-y-4">
          {activeJobId && <ActiveJobMonitor jobId={activeJobId} />}

          <Card>
            <CardContent className="p-0">
              <div className="aspect-[16/9] rounded-lg overflow-hidden bg-muted/20">
                <Canvas shadows>
                  <Suspense fallback={<Html center><div className="text-xs text-muted-foreground">Loading…</div></Html>}>
                    <PlaceholderScene />
                  </Suspense>
                </Canvas>
              </div>
            </CardContent>
          </Card>

          {/* Layer toggles placeholder */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Model Layers</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Generate a model to see layer controls.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Job history */}
      {jobs && jobs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Generation History</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Job ID</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Prompt</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="cursor-pointer hover:bg-muted/30">
                    <TableCell className="text-xs font-mono">{job.id.slice(0, 8)}</TableCell>
                    <TableCell className="text-xs">
                      <Badge variant="outline" className="text-[10px]">{job.job_type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                      {job.prompt ?? "—"}
                    </TableCell>
                    <TableCell><JobStatusBadge status={job.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(job.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
