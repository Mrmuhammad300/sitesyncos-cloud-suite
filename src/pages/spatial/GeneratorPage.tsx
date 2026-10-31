import { Suspense, useDeferredValue, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Check, Download, FolderOpen, History, Layers, Loader2, RefreshCw, Sparkles, Wand2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type * as THREE from "three";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCreateDocument } from "@/hooks/useOpsData";
import { useCreateFloorPlanVariants } from "@/hooks/useBlenderData";
import { useAuth } from "@/hooks/useAuth";
import { designVariants, type DesignVariant } from "@/lib/spatial/designEdits";
import { planVariantsFromSpec } from "@/lib/spatial/floorPlan";
import { downloadBlob, exportGlb, slugify } from "@/lib/spatial/exportGlb";
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
import { ProceduralBuilding, buildingFraming } from "@/components/spatial/ProceduralBuilding";
import { ModelFile, isRenderableModel } from "@/components/spatial/ModelFile";
import { buildingHeight, grossFloorArea, specFromPrompt, type BuildingSpec } from "@/lib/spatial/buildingSpec";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "12-storey mass timber office with retail podium and green roof",
  "24-storey residential tower with balconies on a 2-storey podium",
  "Two-level retail showroom, 8,000 sqft, high ceilings, glass facade",
  "Mixed-use tower, 30 floors, retail base, hotel above",
  "4-storey medical clinic around a courtyard, brick facade",
  "Single storey steel distribution warehouse, 12,000 m2",
];

const SHORT = ["Timber office", "Residential tower", "Retail showroom", "Mixed-use tower", "Courtyard clinic", "Warehouse"];

/**
 * Live preview of the parsed prompt. Before generation it shows an x-ray
 * massing; while a job runs the building rises floor by floor; when the job
 * returns a GLB/glTF file, that file is shown instead.
 */
function GeneratedScene({ palette, spec, status, fileUrl }: { palette: ScenePalette; spec: BuildingSpec; status: BlenderJobStatus | null; fileUrl?: string | null }) {
  const framing = useMemo(() => buildingFraming(spec), [spec]);
  const progress = status === "pending" ? 0.06 : status === "processing" ? 0.9 : 1;
  const ready = status === "completed";
  const preview = !status;
  const dir = [1, 0.72, 1];
  const n = Math.hypot(dir[0], dir[1], dir[2]);
  const pos = dir.map((v, i) => (v / n) * framing.distance + framing.target[i]) as [number, number, number];
  const building = (
    <ProceduralBuilding spec={spec} palette={palette} mode={preview ? "xray" : "shaded"} progress={progress} sway={!ready || preview} />
  );
  return (
    <>
      <PerspectiveCamera makeDefault position={pos} fov={42} near={0.1} far={framing.distance * 12} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.05} target={framing.target} autoRotate={!ready} autoRotateSpeed={0.6} />
      <SceneLights palette={palette} extent={Math.max(framing.radius, framing.height)} />
      <SceneGrid palette={palette} size={Math.max(40, framing.radius * 5)} />
      {ready && isRenderableModel(fileUrl) ? (
        <ModelFile url={fileUrl} fit={Math.max(framing.height, framing.radius * 1.6)} fallback={building} />
      ) : (
        building
      )}
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
  const deferredPrompt = useDeferredValue(prompt);
  // The active job's prompt wins once submitted, so editing the box doesn't morph the result.
  const baseSpec = useMemo(() => specFromPrompt(activeJob?.prompt ?? deferredPrompt), [activeJob?.prompt, deferredPrompt]);
  const [variants, setVariants] = useState<DesignVariant[] | null>(null);
  const [variantKey, setVariantKey] = useState<string>("base");
  const variant = variants?.find((v) => v.key === variantKey) ?? null;
  const spec = variant?.spec ?? baseSpec;
  const scene = useRef<THREE.Scene | null>(null);
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const createDocument = useCreateDocument();
  const createPlans = useCreateFloorPlanVariants();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveProject, setSaveProject] = useState<string>("none");

  /** The rendered building as a .glb — the job's own file when it produced one. */
  const modelBlob = async (): Promise<Blob> => {
    const url = activeJob?.result_url;
    if (!variant && isRenderableModel(url)) {
      const res = await fetch(url);
      if (res.ok) return res.blob();
    }
    const obj = scene.current?.getObjectByName("building");
    if (!obj) throw new Error("The model is still loading — try again in a moment.");
    return exportGlb(obj);
  };

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusyAction(key);
    try {
      await fn();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusyAction(null);
    }
  };

  const handleExport = () => run("export", async () => {
    const blob = await modelBlob();
    downloadBlob(blob, `${slugify(spec.name)}.glb`);
    toast.success(`Exported ${spec.name}.glb (${(blob.size / 1024 / 1024).toFixed(1)} MB)`);
  });

  const handleSave = () => run("save", async () => {
    if (saveProject === "none") throw new Error("Choose a project to save the model to.");
    const blob = await modelBlob();
    const file = new File([blob], `${slugify(spec.name)}.glb`, { type: "model/gltf-binary" });
    await createDocument.mutateAsync({
      title: `${spec.name} — 3D model`,
      doc_number: `MDL-${Date.now().toString().slice(-6)}`,
      doc_type: "Model",
      status: "Current",
      version: 1,
      project_id: saveProject,
      description: spec.prompt,
      uploaded_by: profile?.display_name || user?.email || null,
      file,
    });
    setSaveOpen(false);
    const project = projects?.find((p) => p.id === saveProject);
    toast.success(`Saved to ${project?.name ?? "project"}`, { action: { label: "View documents", onClick: () => navigate("/ops/documents") } });
  });

  const handleSendToPlans = () => run("plans", async () => {
    const plans = planVariantsFromSpec(spec).map((v) => ({
      ...v,
      project_id: projectId !== "none" ? projectId : null,
      blender_job_id: activeJobId,
    }));
    await createPlans.mutateAsync(plans);
    navigate("/spatial/plans");
  });

  const handleVariants = () => {
    setVariants(designVariants(baseSpec));
    setVariantKey("A");
    toast.success("3 design variants ready — compare them below the viewer.");
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    const job = await createJob.mutateAsync({
      job_type: "generate",
      prompt: prompt.trim(),
      project_id: projectId !== "none" ? projectId : undefined,
    });
    setActiveJobId(job.id);
    setVariants(null);
    setVariantKey("base");
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
                    {ready ? spec.name : status ? `Building ${spec.name}…` : prompt.trim() ? `Live preview · ${spec.name}` : "Preview · awaiting prompt"}
                  </Readout>
                </ViewportSlot>
                <ViewportSlot at="bottom-left">
                  <Readout><span className="text-mod-spatial">CAM</span><span ref={probe}>—</span></Readout>
                </ViewportSlot>
                {activeJobId ? (
                  <div className="absolute inset-x-3 top-12 z-10 sm:left-auto sm:right-3 sm:top-3 sm:w-[340px]">
                    <ActiveJobMonitor jobId={activeJobId} />
                  </div>
                ) : prompt.trim() ? null : (
                  <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                    <div className="max-w-[260px] rounded-xl border border-border/80 bg-background/70 px-4 py-3 text-center backdrop-blur-md">
                      <Sparkles className="mx-auto mb-1.5 h-4 w-4 text-mod-spatial" />
                      <p className="text-[13px] font-medium">Describe a building</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">It previews live as you type — storeys, use, structure and facade are all understood.</p>
                    </div>
                  </div>
                )}
              </>
            }
          >
            <Canvas shadows dpr={[1, 2]} aria-label="Generated model preview" onCreated={({ scene: s }) => { scene.current = s; }}>
              <Suspense fallback={<SceneFallback />}>
                <GeneratedScene palette={palette} spec={spec} status={status} fileUrl={variant ? null : activeJob?.result_url} />
                <CameraProbe target={probe} />
              </Suspense>
            </Canvas>
          </Viewport>

          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-6">
            {[
              ["Use", spec.use],
              ["Storeys", `${spec.floors + spec.podiumFloors}${spec.podiumFloors ? ` · ${spec.podiumFloors} podium` : ""}`],
              ["Height", `${buildingHeight(spec).toFixed(1)} m`],
              ["GFA", `${grossFloorArea(spec).toLocaleString()} m²`],
              ["Structure", spec.structure],
              ["Facade", spec.facade === "curtain" ? "curtain wall" : spec.facade === "fins" ? "fins" : spec.facade === "punched" ? "punched" : "ribbon"],
            ].map(([k, v]) => (
              <div key={k} className="bg-surface-1 px-3 py-2.5">
                <dt className="ss-eyebrow text-[9.5px]">{k}</dt>
                <dd className="ss-num mt-1 truncate text-[13px] capitalize">{v}</dd>
              </div>
            ))}
          </dl>

          {variants && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[{ key: "base", label: "Original", summary: baseSpec.prompt, spec: baseSpec } as DesignVariant, ...variants].map((v) => (
                <button
                  key={v.key}
                  onClick={() => setVariantKey(v.key)}
                  aria-pressed={variantKey === v.key}
                  className={cn(
                    "ss-card ss-interactive space-y-1.5 p-3 text-left",
                    variantKey === v.key && "border-mod-spatial/50 shadow-[0_0_0_1px_hsl(var(--mod-spatial)/0.4)]",
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[13px] font-medium">
                      <span className="ss-num flex h-5 w-5 items-center justify-center rounded border text-[10px] text-muted-foreground">{v.key === "base" ? "0" : v.key}</span>
                      {v.label}
                    </span>
                    {variantKey === v.key && <Check className="h-3.5 w-3.5 text-mod-spatial" />}
                  </span>
                  <span className="ss-num block text-[11px] text-muted-foreground">
                    {v.spec.floors + v.spec.podiumFloors} st · {buildingHeight(v.spec).toFixed(0)} m · {grossFloorArea(v.spec).toLocaleString()} m²
                  </span>
                  <span className="line-clamp-2 block text-[11.5px] text-muted-foreground">{v.summary}</span>
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
            {[
              { key: "export", icon: Download, label: "Export GLB", desc: "Download the 3D file", onClick: handleExport },
              { key: "save", icon: FolderOpen, label: "Save to project", desc: "File it under Documents", onClick: () => { setSaveProject(projectId); setSaveOpen(true); } },
              { key: "plans", icon: Layers, label: "Send to Floor Plans", desc: "3 typical-floor options", onClick: handleSendToPlans },
              { key: "variants", icon: RefreshCw, label: variants ? "Regenerate variants" : "Generate variants", desc: "3 alternative designs", onClick: handleVariants },
            ].map(({ key, icon: Icon, label, desc, onClick }) => (
              <button
                key={key}
                onClick={onClick}
                disabled={!ready || busyAction !== null}
                title={ready ? label : "Available once a model is generated"}
                className="ss-card ss-interactive group flex items-center gap-3 p-3 text-left disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:shadow-none"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border bg-surface-2 text-muted-foreground group-enabled:group-hover:text-mod-spatial">
                  {busyAction === key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{desc}</span>
                </span>
              </button>
            ))}
          </div>

          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save model to a project</DialogTitle>
                <DialogDescription>
                  {spec.name} is exported as a .glb and filed in the project's documents, so the whole team can open it.
                </DialogDescription>
              </DialogHeader>
              <Select value={saveProject} onValueChange={setSaveProject}>
                <SelectTrigger aria-label="Project to save to"><SelectValue placeholder="Choose a project" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" disabled>Choose a project</SelectItem>
                  {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saveProject === "none" || busyAction === "save"}>
                  {busyAction === "save" ? <Loader2 className="animate-spin" /> : <FolderOpen />} Save model
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
