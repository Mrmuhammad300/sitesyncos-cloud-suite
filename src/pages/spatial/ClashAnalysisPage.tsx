import { useState, useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import {
  AlertTriangle, CheckCircle2, Crosshair, FileBox, FileText, Loader2, MapPin, Plus, ShieldAlert, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, StatCard, StatusPill, Toolbar } from "@/components/os";
import { useProjects, useCreateRFI } from "@/hooks/useProjectData";
import { useCreateBlenderJob, useBlenderJobStatus } from "@/hooks/useBlenderData";
import { useScenePalette, type ScenePalette } from "@/components/spatial/sceneTheme";
import { AxisGizmo, Readout, SceneFallback, SceneGrid, SceneLights, Viewport, ViewportSlot } from "@/components/spatial/Viewport";
import { JobProgress } from "@/components/spatial/JobProgress";
import { cn } from "@/lib/utils";

// ─── Mock clash data (replaced with real data from Blender MCP result) ──────

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

const DEMO_CLASHES: ClashRecord[] = [
  { id: "c1", elementA: "HVAC Duct-142", elementB: "Beam-B3-22", disciplineA: "MEP", disciplineB: "Structural", severity: "Critical", location: "Level 3, Grid B-C/2-3", description: "HVAC main duct intersects structural beam by 120mm" },
  { id: "c2", elementA: "Sprinkler-Header-7", elementB: "Column-C4", disciplineA: "MEP", disciplineB: "Structural", severity: "Critical", location: "Level 2, Grid C/4", description: "Fire sprinkler header runs through concrete column" },
  { id: "c3", elementA: "Conduit-E-48", elementB: "Slab-L4", disciplineA: "MEP", disciplineB: "Structural", severity: "Major", location: "Level 4, Grid A/1", description: "Electrical conduit embeds in slab without sleeve" },
  { id: "c4", elementA: "Plumbing-P-33", elementB: "HVAC-Return-12", disciplineA: "MEP", disciplineB: "MEP", severity: "Major", location: "Level 1, Ceiling Plenum", description: "Domestic water pipe and return air duct overlap" },
  { id: "c5", elementA: "CW-Pipe-22", elementB: "Footing-F-9", disciplineA: "MEP", disciplineB: "Structural", severity: "Minor", location: "Basement, Grid D/5", description: "Chilled water pipe passes within 50mm of spread footing" },
];

type Severity = ClashRecord["severity"];
const SEV_TONE: Record<Severity, "destructive" | "warning" | "info"> = { Critical: "destructive", Major: "warning", Minor: "info" };
const SEV_BAR: Record<Severity, string> = { Critical: "bg-destructive", Major: "bg-warning", Minor: "bg-info" };
/** Where each clash sits in the demo scene (y = level height). */
const CLASH_POS: Record<string, [number, number, number]> = {
  c1: [0, 7.9, 0.4], c2: [2.5, 5.2, 2], c3: [-2, 12, -1.5], c4: [0.8, 2.6, -0.6], c5: [-2.5, 0.2, 2],
};
const clashCode = (id: string) => `CL-${id.replace(/\D/g, "").padStart(3, "0")}`;

function ClashScene({ hasModel, palette, focus, clashes }: { hasModel: boolean; palette: ScenePalette; focus: ClashRecord | null; clashes: ClashRecord[] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.getElapsedTime() * 0.08;
  });
  const sevColor = (s: Severity) => (s === "Critical" ? palette.destructive : s === "Major" ? palette.warning : palette.info);

  return (
    <>
      <PerspectiveCamera makeDefault position={[17, 12, 17]} fov={45} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.1} target={[0, 5.5, 0]} />
      <SceneLights palette={palette} />
      <SceneGrid palette={palette} size={32} />
      <group ref={groupRef}>
        {[0, 3, 6, 9, 12].map((y) => (
          <mesh key={`slab-${y}`} position={[0, y, 0]} receiveShadow>
            <boxGeometry args={[6, 0.15, 5]} />
            <meshStandardMaterial color={palette.slab} transparent opacity={0.45} />
          </mesh>
        ))}
        {[-2.5, 2.5].flatMap((x) => [-2, 2].map((z) => (
          <mesh key={`col-${x}-${z}`} position={[x, 6, z]} castShadow>
            <boxGeometry args={[0.25, 12, 0.25]} />
            <meshStandardMaterial color={palette.spatial} transparent opacity={hasModel ? 0.55 : 1} />
          </mesh>
        )))}
        <mesh position={[0, 7.8, 0]}>
          <boxGeometry args={[5.5, 0.4, 0.6]} />
          <meshStandardMaterial color={palette.vault} transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 8, 0.5]}>
          <boxGeometry args={[6, 0.5, 0.3]} />
          <meshStandardMaterial color={palette.concrete} />
        </mesh>
        {hasModel && clashes.map((c) => {
          const on = focus?.id === c.id;
          return (
            <group key={c.id} position={CLASH_POS[c.id] ?? [0, 0, 0]}>
              <mesh>
                <sphereGeometry args={[on ? 0.55 : 0.32, 20, 20]} />
                <meshStandardMaterial color={sevColor(c.severity)} emissive={sevColor(c.severity)} emissiveIntensity={on ? 0.9 : 0.4} transparent opacity={on ? 0.85 : 0.6} />
              </mesh>
              {on && (
                <mesh>
                  <boxGeometry args={[1.3, 1.3, 1.3]} />
                  <meshBasicMaterial color={sevColor(c.severity)} wireframe />
                </mesh>
              )}
              {on && (
                <Html position={[0.7, 1, 0]} zIndexRange={[5, 0]}>
                  <div className="whitespace-nowrap rounded-md border border-destructive/30 bg-background/90 px-1.5 py-0.5 font-mono text-[10px] text-foreground backdrop-blur">
                    {clashCode(c.id)} · {c.severity}
                  </div>
                </Html>
              )}
            </group>
          );
        })}
      </group>
      <AxisGizmo palette={palette} />
    </>
  );
}

const SEVERITIES: ("All" | Severity)[] = ["All", "Critical", "Major", "Minor"];

export default function ClashAnalysisPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectId, setProjectId] = useState<string>("none");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [showDemoClashes, setShowDemoClashes] = useState(false);
  const [selectedClashes, setSelectedClashes] = useState<Set<string>>(new Set());
  const [focusId, setFocusId] = useState<string | null>(null);
  const [sevFilter, setSevFilter] = useState<"All" | Severity>("All");
  const [dragging, setDragging] = useState(false);
  const palette = useScenePalette();

  const { data: projects } = useProjects();
  const createJob = useCreateBlenderJob();
  const createRFI = useCreateRFI();
  const { data: activeJob } = useBlenderJobStatus(activeJobId);

  const isAnalyzing = activeJob?.status === "pending" || activeJob?.status === "processing";
  const clashes = showDemoClashes ? DEMO_CLASHES : [];
  const visible = sevFilter === "All" ? clashes : clashes.filter((c) => c.severity === sevFilter);
  const focus = clashes.find((c) => c.id === focusId) ?? null;

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
    // Show demo clashes after a brief delay to simulate result
    setTimeout(() => { setShowDemoClashes(true); setFocusId(DEMO_CLASHES[0].id); }, 3000);
  };

  const toggleClashSelect = (id: string) => {
    setSelectedClashes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createRFIsFor = async (targets: ClashRecord[]) => {
    if (projectId === "none") {
      toast.error("Select a project first to create RFIs");
      return;
    }
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

  const handleCreateRFIs = () => createRFIsFor(clashes.filter((c) => selectedClashes.has(c.id)));

  const criticalCount = clashes.filter((c) => c.severity === "Critical").length;
  const majorCount = clashes.filter((c) => c.severity === "Major").length;
  const minorCount = clashes.filter((c) => c.severity === "Minor").length;
  const allSelected = clashes.length > 0 && selectedClashes.size === clashes.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clash Analysis"
        description="Upload a BIM model, let Blender detect cross-discipline clashes, and turn conflicts into RFIs in one step."
        actions={
          <>
            <StatusPill status="Blender MCP" tone="data" pulse />
            {clashes.length > 0 && (
              <Button variant="outline" onClick={() => toast.info("PDF export is coming soon")}>
                <FileText /> Export report
              </Button>
            )}
          </>
        }
      />

      {clashes.length > 0 && (
        <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total clashes" value={clashes.length} icon={ShieldAlert} hint="This model" onClick={() => setSevFilter("All")} />
          <StatCard label="Critical" value={criticalCount} icon={AlertTriangle} tone="destructive" hint="Blocks install" onClick={() => setSevFilter("Critical")} />
          <StatCard label="Major" value={majorCount} icon={AlertTriangle} tone="warning" hint="Rework likely" onClick={() => setSevFilter("Major")} />
          <StatCard label="Minor" value={minorCount} icon={AlertTriangle} tone="info" hint="Tolerance" onClick={() => setSevFilter("Minor")} />
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Upload */}
        <Panel eyebrow="Source" title="BIM model">
          <div className="space-y-3">
            <input ref={fileInputRef} type="file" accept=".ifc,.rvt,.glb,.gltf" className="hidden" onChange={handleFileChange} />
            <button
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) setSelectedFile(f); }}
              className={cn(
                "relative flex w-full flex-col items-center gap-2 overflow-hidden rounded-xl border border-dashed p-6 transition-colors",
                dragging ? "border-primary bg-primary/5" : "hover:border-border-strong hover:bg-accent/60",
              )}
            >
              <div className="ss-blueprint pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(circle_at_center,black,transparent_75%)]" />
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl border bg-surface-2 text-muted-foreground">
                {selectedFile ? <FileBox className="h-5 w-5 text-mod-spatial" /> : <Upload className="h-5 w-5" />}
              </span>
              <div className="relative text-center">
                <p className="max-w-[240px] truncate text-[13px] font-medium">{selectedFile ? selectedFile.name : "Drop a model or click to browse"}</p>
                <p className="ss-num mt-0.5 text-[10.5px] text-muted-foreground">
                  {selectedFile ? `${(selectedFile.size / 1048576).toFixed(1)} MB` : "IFC · RVT · GLB · GLTF"}
                </p>
              </div>
            </button>

            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger aria-label="Project"><SelectValue placeholder="Link to project (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects?.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Button className="w-full" onClick={handleAnalyze} disabled={!selectedFile || isAnalyzing || createJob.isPending}>
              {isAnalyzing ? <><Loader2 className="animate-spin" /> Analyzing…</> : <><ShieldAlert /> Analyze clashes</>}
            </Button>

            {activeJob && (
              <JobProgress
                status={activeJob.status}
                jobId={activeJob.id}
                error={activeJob.error_message}
                copy={{ pending: "Job queued…", processing: "Blender analyzing model…", completed: "Analysis complete", failed: "Analysis failed" }}
              />
            )}
          </div>
        </Panel>

        {/* Viewport */}
        <Viewport
          className="h-[360px] sm:h-[440px] lg:h-auto lg:min-h-[440px]"
          overlay={
            <>
              <ViewportSlot at="top-left">
                <Readout className="text-foreground">
                  <span className={cn("h-1.5 w-1.5 rounded-full", clashes.length ? "bg-destructive" : "bg-muted-foreground/50")} />
                  {clashes.length ? `${clashes.length} clashes detected` : "Coordination model · demo"}
                </Readout>
              </ViewportSlot>
              {focus && (
                <ViewportSlot at="bottom-left" className="max-w-[calc(100%-140px)]">
                  <Readout className="text-foreground">
                    <Crosshair className="h-3 w-3 text-destructive" />
                    <span className="truncate">{clashCode(focus.id)} · {focus.location}</span>
                  </Readout>
                </ViewportSlot>
              )}
            </>
          }
        >
          <Canvas shadows dpr={[1, 2]} aria-label="Clash viewport">
            <Suspense fallback={<SceneFallback />}>
              <ClashScene hasModel={showDemoClashes} palette={palette} focus={focus} clashes={visible} />
            </Suspense>
          </Canvas>
        </Viewport>
      </div>

      {/* Report */}
      {clashes.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Panel
            flush
            eyebrow="Report"
            title={<span className="flex items-center gap-2">Clash list <span className="ss-num text-xs font-normal text-muted-foreground">{visible.length}</span></span>}
            actions={
              <Button size="sm" onClick={handleCreateRFIs} disabled={selectedClashes.size === 0 || createRFI.isPending}>
                {createRFI.isPending ? <Loader2 className="animate-spin" /> : <Plus />}
                <span className="hidden sm:inline">Create RFI{selectedClashes.size > 1 ? "s" : ""}</span>
                <span className="ss-num">({selectedClashes.size})</span>
              </Button>
            }
          >
            <Toolbar className="border-b px-5 pb-3">
              <div className="flex rounded-lg border bg-surface-2/60 p-0.5" role="tablist" aria-label="Severity">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    role="tab"
                    aria-selected={sevFilter === s}
                    onClick={() => setSevFilter(s)}
                    className={cn("h-7 rounded-md px-2.5 text-xs font-medium transition-colors", sevFilter === s ? "bg-surface-1 text-foreground shadow-[0_0_0_1px_hsl(var(--border))]" : "text-muted-foreground hover:text-foreground")}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button size="xs" variant="ghost" className="ml-auto" onClick={() => setSelectedClashes(allSelected ? new Set() : new Set(clashes.map((c) => c.id)))}>
                <CheckCircle2 /> {allSelected ? "Clear" : "Select all"}
              </Button>
            </Toolbar>
            <ul className="divide-y">
              {visible.map((clash) => {
                const checked = selectedClashes.has(clash.id);
                const on = focusId === clash.id;
                return (
                  <li key={clash.id} className={cn("relative flex items-stretch transition-colors", on ? "bg-surface-2" : "hover:bg-accent/50")}>
                    <span className={cn("w-0.5 shrink-0", SEV_BAR[clash.severity])} />
                    <label className="flex cursor-pointer items-center px-3.5" aria-label={`Select ${clashCode(clash.id)}`}>
                      <input type="checkbox" className="peer sr-only" checked={checked} onChange={() => toggleClashSelect(clash.id)} />
                      <span className={cn("flex h-4 w-4 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring", checked ? "border-primary bg-primary text-primary-foreground" : "border-border-strong")}>
                        {checked && <CheckCircle2 className="h-3 w-3" />}
                      </span>
                    </label>
                    <button onClick={() => setFocusId(clash.id)} className="flex min-w-0 flex-1 flex-col gap-1 py-3 pr-4 text-left">
                      <div className="flex items-center gap-2">
                        <span className="ss-num text-[11px] text-muted-foreground">{clashCode(clash.id)}</span>
                        <StatusPill status={clash.severity} tone={SEV_TONE[clash.severity]} />
                        <span className="ml-auto hidden text-[11px] text-muted-foreground sm:inline">{clash.disciplineA} × {clash.disciplineB}</span>
                      </div>
                      <p className="truncate font-mono text-[12.5px]">
                        {clash.elementA} <span className="text-muted-foreground">×</span> {clash.elementB}
                      </p>
                      <p className="flex items-center gap-1 truncate text-[11.5px] text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" />{clash.location}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            eyebrow="Detail"
            title={focus ? clashCode(focus.id) : "Select a clash"}
            actions={focus ? <Button size="xs" variant="ghost" aria-label="Close detail" onClick={() => setFocusId(null)}><X /></Button> : null}
            className="lg:sticky lg:top-4 lg:self-start"
          >
            {focus ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={focus.severity} tone={SEV_TONE[focus.severity]} />
                  <span className="text-xs text-muted-foreground">{focus.disciplineA} × {focus.disciplineB}</span>
                </div>
                <p className="text-sm leading-relaxed">{focus.description}</p>
                <div className="grid grid-cols-2 gap-2">
                  {[["Element A", focus.elementA, focus.disciplineA], ["Element B", focus.elementB, focus.disciplineB]].map(([k, v, d]) => (
                    <div key={k} className="rounded-lg border bg-surface-2/50 p-2.5">
                      <p className="ss-eyebrow">{k}</p>
                      <p className="mt-1 truncate font-mono text-[12px]">{v}</p>
                      <p className="text-[11px] text-muted-foreground">{d}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-surface-2/50 p-2.5 text-xs">
                  <MapPin className="h-3.5 w-3.5 text-mod-spatial" />
                  {focus.location}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" onClick={() => createRFIsFor([focus])} disabled={createRFI.isPending}><Plus /> Create RFI</Button>
                  <Button size="sm" variant="outline" onClick={() => toggleClashSelect(focus.id)}>
                    {selectedClashes.has(focus.id) ? "Deselect" : "Add to batch"}
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState compact icon={Crosshair} title="Nothing selected" description="Pick a clash from the list to locate it in the model." />
            )}
          </Panel>
        </div>
      ) : (
        !isAnalyzing && (
          <EmptyState
            icon={ShieldAlert}
            title={selectedFile ? "Ready to analyze" : "Upload a BIM model to detect clashes"}
            description="Supports IFC, Revit (.rvt) and GLB. Blender MCP checks element intersections across every discipline and grades each clash by severity."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {!selectedFile && <Button size="sm" onClick={() => fileInputRef.current?.click()}><Upload /> Choose file</Button>}
                <Button size="sm" variant="outline" onClick={() => { setShowDemoClashes(true); setFocusId(DEMO_CLASHES[0].id); }}>View sample report</Button>
              </div>
            }
          />
        )
      )}
    </div>
  );
}
