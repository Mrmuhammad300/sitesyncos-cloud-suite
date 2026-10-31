import { Suspense, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Download, FolderOpen, History, Layers, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, PageHeader, Panel, StatusPill } from "@/components/os";
import { useProjects } from "@/hooks/useProjectData";
import { useBlenderJobs, useCreateBlenderJob, useBlenderJobStatus, type BlenderJobStatus } from "@/hooks/useBlenderData";
import { useScenePalette, type ScenePalette } from "@/components/spatial/sceneTheme";
import { AxisGizmo, CameraProbe, Readout, SceneFallback, SceneGrid, SceneLights, Viewport, ViewportSlot } from "@/components/spatial/Viewport";
import { JobProgress } from "@/components/spatial/JobProgress";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Modern open-plan office, 5,000 sqft, 30 desks, 3 meeting rooms, kitchen",
  "Residential floor layout, 2,400 sqft, 3 bedrooms, 2 bathrooms, open kitchen",
  "Retail showroom, 8,000 sqft, high ceilings, reception area, storage rooms",
  "Mixed-use lobby, 1,200 sqft, elevator core, mailroom, bike storage",
  "Medical clinic, 3,200 sqft, 6 exam rooms, waiting area, nurses station",
];

const SHORT = ["Open-plan office", "3-bed residence", "Retail showroom", "Mixed-use lobby", "Medical clinic"];

/** Massing study that "assembles" while a job is running and settles when ready. */
function PlaceholderScene({ palette, status }: { palette: ScenePalette; status: BlenderJobStatus | null }) {
  const groupRef = useRef<THREE.Group>(null);
  const live = status === "pending" || status === "processing";
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * (live ? 0.6 : 0.15);
  });
  const ready = status === "completed";
  const blocks: [number, number, number, number, number, number][] = [
    [0, 1.5, 0, 4, 3, 3],
    [-1, 3.75, 0.25, 2, 1.5, 2.5],
    [1.25, 3.4, -0.5, 1.5, 0.8, 2],
  ];
  return (
    <>
      <PerspectiveCamera makeDefault position={[9, 7, 9]} fov={42} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} target={[0, 2, 0]} />
      <SceneLights palette={palette} />
      <SceneGrid palette={palette} size={28} />
      <group ref={groupRef}>
        {blocks.map(([x, y, z, w, h, d], i) => (
          <mesh key={i} position={[x, y, z]} castShadow>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              color={ready ? (i === 0 ? palette.slab : palette.spatial) : palette.spatial}
              transparent
              opacity={ready ? 0.9 : 0.08}
              roughness={0.6}
            />
            <Edges color={ready ? palette.foreground : live ? palette.primary : palette.spatial} threshold={15} />
          </mesh>
        ))}
      </group>
      <AxisGizmo palette={palette} />
    </>
  );
}

function ActiveJobMonitor({ jobId }: { jobId: string }) {
  const { data: job } = useBlenderJobStatus(jobId);
  if (!job) return null;
  return (
    <JobProgress
      floating
      status={job.status}
      jobId={job.id}
      error={job.error_message}
      copy={{ pending: "Job queued…", processing: "Blender generating model…", completed: "Model ready!", failed: "Generation failed" }}
    />
  );
}

export default function GeneratorPage() {
  const [prompt, setPrompt] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const palette = useScenePalette();
  const probe = useRef<HTMLSpanElement>(null);

  const { data: projects } = useProjects();
  const { data: jobs, isLoading: jobsLoading } = useBlenderJobs(projectId !== "none" ? projectId : undefined);
  const { data: activeJob } = useBlenderJobStatus(activeJobId);
  const createJob = useCreateBlenderJob();
  const status = activeJob?.status ?? null;
  const ready = status === "completed";

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const job = await createJob.mutateAsync({
      job_type: "generate",
      prompt: prompt.trim(),
      project_id: projectId !== "none" ? projectId : undefined,
    });
    setActiveJobId(job.id);
  };

  const step = !activeJobId ? (prompt.trim() ? 1 : 0) : ready ? 2 : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="3D Generator"
        description="Describe a space in plain language — Blender builds a coordinated 3D model you can export or send to Floor Plans."
        actions={<StatusPill status="Blender MCP" tone="data" pulse />}
      >
        <ol className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {["Describe", "Generate", "Review"].map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={cn("ss-num flex h-5 w-5 items-center justify-center rounded-full border text-[10px]", i < step ? "border-mod-spatial bg-mod-spatial text-background" : i === step ? "border-mod-spatial text-mod-spatial" : "text-muted-foreground")}>
                {i + 1}
              </span>
              <span className={cn("text-xs", i <= step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
              {i < 2 && <span className="hidden h-px w-8 bg-border sm:block" />}
            </li>
          ))}
        </ol>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* Prompt composer */}
        <div className="space-y-4">
          <Panel glow eyebrow="Prompt" title="What should we build?">
            <div className="space-y-4">
              <div className="rounded-xl border bg-surface-2/50 transition-[border-color,box-shadow] focus-within:border-primary/50 focus-within:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]">
                <Textarea
                  placeholder="e.g. Two-storey clinic, 3,200 sqft, six exam rooms around a daylit waiting area…"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleGenerate(); }}
                  rows={5}
                  className="resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                />
                <div className="flex items-center justify-between border-t px-3 py-2">
                  <span className="ss-num text-[10.5px] text-muted-foreground">{prompt.length} chars</span>
                  <span className="hidden items-center gap-1 text-[10.5px] text-muted-foreground sm:flex"><kbd className="ss-kbd">Ctrl</kbd><kbd className="ss-kbd">↵</kbd> generate</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="ss-eyebrow">Quick start</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      title={s}
                      onClick={() => setPrompt(s)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                        prompt === s ? "border-mod-spatial/40 bg-mod-spatial/10 text-mod-spatial" : "text-muted-foreground hover:border-border-strong hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {SHORT[i]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="ss-eyebrow">Link to project</p>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger aria-label="Project"><SelectValue placeholder="No project" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No project</SelectItem>
                    {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button size="lg" className="w-full" onClick={handleGenerate} disabled={!prompt.trim() || createJob.isPending}>
                {createJob.isPending ? <><Loader2 className="animate-spin" /> Submitting…</> : <><Wand2 /> Generate model</>}
              </Button>
            </div>
          </Panel>
        </div>

        {/* Result viewport */}
        <div className="space-y-4">
          <Viewport
            className="h-[380px] sm:h-[460px] lg:h-[520px]"
            overlay={
              <>
                <ViewportSlot at="top-left">
                  <Readout className="text-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", ready ? "bg-success" : status ? "animate-pulse bg-primary" : "bg-muted-foreground/50")} />
                    {ready ? "Generated model" : status ? "Assembling massing" : "Preview · awaiting prompt"}
                  </Readout>
                </ViewportSlot>
                <ViewportSlot at="bottom-left">
                  <Readout><span className="text-mod-spatial">CAM</span><span ref={probe}>—</span></Readout>
                </ViewportSlot>
                {activeJobId ? (
                  <div className="absolute inset-x-3 top-12 z-10 sm:left-auto sm:right-3 sm:top-3 sm:w-[340px]">
                    <ActiveJobMonitor jobId={activeJobId} />
                  </div>
                ) : (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div className="max-w-[260px] rounded-xl border border-border/80 bg-background/70 px-4 py-3 text-center backdrop-blur-md">
                      <Sparkles className="mx-auto mb-1.5 h-4 w-4 text-mod-spatial" />
                      <p className="text-[13px] font-medium">Your model will appear here</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Write a prompt, then generate.</p>
                    </div>
                  </div>
                )}
              </>
            }
          >
            <Canvas shadows dpr={[1, 2]} aria-label="Generated model preview">
              <Suspense fallback={<SceneFallback />}>
                <PlaceholderScene palette={palette} status={status} />
                <CameraProbe target={probe} />
              </Suspense>
            </Canvas>
          </Viewport>

          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            {[
              { icon: Download, label: "Export GLB", desc: "Download 3D file" },
              { icon: FolderOpen, label: "Save to project", desc: "Attach to project" },
              { icon: Layers, label: "Send to Floor Plans", desc: "Extract 2D layout" },
              { icon: RefreshCw, label: "Generate variants", desc: "3 alternative layouts" },
            ].map(({ icon: Icon, label, desc }) => (
              <button
                key={label}
                disabled={!ready}
                title={ready ? label : "Available once a model is generated"}
                className="ss-card ss-interactive group flex items-center gap-3 p-3 text-left disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:shadow-none"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-surface-2 text-muted-foreground group-enabled:group-hover:text-mod-spatial">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Job history */}
      <Panel flush eyebrow="Blender jobs" title="Generation history" actions={jobs && jobs.length > 0 ? <span className="ss-num text-xs text-muted-foreground">{jobs.length} jobs</span> : null}>
        {jobsLoading ? (
          <div className="space-y-2 p-5 pt-0">
            {[0, 1, 2].map((i) => <div key={i} className="h-9 animate-shimmer rounded-md bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--surface-3))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]" />)}
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} className="cursor-pointer" onClick={() => setActiveJobId(job.id)}>
                    <TableCell className="ss-num text-xs">#{job.id.slice(0, 8)}</TableCell>
                    <TableCell><StatusPill status={job.job_type} tone="data" /></TableCell>
                    <TableCell className="max-w-[340px] truncate text-xs text-muted-foreground">{job.prompt ?? "—"}</TableCell>
                    <TableCell><StatusPill status={job.status} className="capitalize" pulse={job.status === "processing"} /></TableCell>
                    <TableCell className="ss-num whitespace-nowrap text-right text-xs text-muted-foreground">{new Date(job.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="p-5 pt-0">
            <EmptyState compact icon={History} title="No generations yet" description="Every model you generate is logged here with its prompt and status." />
          </div>
        )}
      </Panel>
    </div>
  );
}
