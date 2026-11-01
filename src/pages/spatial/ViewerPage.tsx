import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import {
  AlertTriangle, Box, Boxes, Eye, EyeOff, Layers, Maximize2, MessageSquareText, MousePointer2, Rotate3d,
  ScanEye, ShieldAlert, Square, View,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, Panel, StatCard, StatusPill } from "@/components/os";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildGeometry } from "@/lib/spatial/buildingGeometry";
import { detectClashes, type Clash } from "@/lib/spatial/clashes";
import { addAnnotation, listAnnotations, removeAnnotation, updateAnnotation, type Annotation } from "@/lib/spatial/annotations";
import { useAuth } from "@/hooks/useAuth";
import { Check, Trash2, Undo2 } from "lucide-react";
import { useScenePalette, type ScenePalette } from "@/components/spatial/sceneTheme";
import { ProceduralBuilding, buildingFraming, type PickedElement, type RenderMode } from "@/components/spatial/ProceduralBuilding";
import { ModelFile, isRenderableModel } from "@/components/spatial/ModelFile";
import { SAMPLE_BUILDINGS, buildingHeight, elementCounts, grossFloorArea, specFromPrompt, type BuildingSpec } from "@/lib/spatial/buildingSpec";
import type { Discipline } from "@/lib/spatial/buildingGeometry";
import { useGeneratedModels } from "@/hooks/useBlenderData";
import { toast } from "sonner";
import {
  AxisGizmo, CameraProbe, GlassBar, GlassButton, GlassDivider, Readout, SceneFallback, SceneGrid, SceneLights, Viewport, ViewportSlot,
} from "@/components/spatial/Viewport";
import { cn } from "@/lib/utils";

interface ViewerModel {
  id: string;
  name: string;
  format: string;
  updated: string;
  spec: BuildingSpec;
  /** Real geometry (GLB/glTF) when the model came from a generation service. */
  fileUrl?: string | null;
  generated?: boolean;
}

const SAMPLE_MODELS: ViewerModel[] = SAMPLE_BUILDINGS.map((b) => {
  const spec = specFromPrompt(b.prompt);
  return { id: b.id, name: spec.name, format: b.format, updated: b.updated, spec };
});

/** Layer swatches resolve through tokens: `tone` is both a Tailwind suffix and a palette key. */
type LayerTone = "spatial" | "vault" | "data" | "warning" | "success" | "destructive";
interface LayerState { name: string; discipline: Discipline; visible: boolean; tone: LayerTone }

const SWATCH: Record<LayerTone, string> = {
  spatial: "bg-mod-spatial",
  vault: "bg-mod-vault",
  data: "bg-data",
  warning: "bg-warning",
  success: "bg-success",
  destructive: "bg-destructive",
};

const initialLayers: LayerState[] = [
  { name: "Structural", discipline: "structural", visible: true, tone: "spatial" },
  { name: "Architectural", discipline: "architectural", visible: true, tone: "success" },
  { name: "MEP – HVAC", discipline: "hvac", visible: true, tone: "vault" },
  { name: "MEP – Plumbing", discipline: "plumbing", visible: true, tone: "data" },
  { name: "MEP – Electrical", discipline: "electrical", visible: true, tone: "warning" },
  { name: "Site Work", discipline: "site", visible: true, tone: "destructive" },
];

type ViewMode = RenderMode;
type CameraPreset = "iso" | "top" | "front" | "side";

const VIEW_MODES: { key: ViewMode; label: string; icon: typeof Box }[] = [
  { key: "shaded", label: "Shaded", icon: Box },
  { key: "wireframe", label: "Wireframe", icon: Boxes },
  { key: "xray", label: "X-ray", icon: ScanEye },
];

/** Camera directions (normalised later and scaled to the building). */
const PRESETS: Record<CameraPreset, { label: string; icon: typeof Box; dir: [number, number, number] }> = {
  iso: { label: "Isometric", icon: Rotate3d, dir: [1, 0.72, 1] },
  top: { label: "Top", icon: Square, dir: [0.001, 1, 0.001] },
  front: { label: "Front", icon: View, dir: [0, 0.32, 1] },
  side: { label: "Side", icon: Layers, dir: [1, 0.32, 0] },
};

/* ─── Scene ──────────────────────────────────────────────────────────────── */

type Framing = ReturnType<typeof buildingFraming>;

function presetPosition(preset: CameraPreset, f: Framing, reach: number): THREE.Vector3 {
  return new THREE.Vector3(...PRESETS[preset].dir).normalize().multiplyScalar(f.distance * reach).add(new THREE.Vector3(...f.target));
}

/** Smoothly glides the camera to a preset and re-targets the orbit controls. */
function CameraRig({ preset, nonce, framing }: { preset: CameraPreset; nonce: number; framing: Framing }) {
  const { camera, controls, size } = useThree();
  const goal = useRef<THREE.Vector3 | null>(null);
  // Portrait viewports (phones) need the camera pulled back to frame the tower.
  const reach = size.width / Math.max(size.height, 1) < 1 ? 1.45 : 1;
  useEffect(() => {
    goal.current = presetPosition(preset, framing, reach);
  }, [preset, nonce, reach, framing]);
  useFrame(() => {
    if (!goal.current) return;
    camera.position.lerp(goal.current, 0.12);
    const ctl = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null;
    ctl?.target?.lerp(new THREE.Vector3(...framing.target), 0.12);
    ctl?.update?.();
    if (camera.position.distanceTo(goal.current) < 0.05) goal.current = null;
  });
  return null;
}

interface SceneProps {
  model: ViewerModel;
  framing: Framing;
  layers: LayerState[];
  mode: ViewMode;
  preset: CameraPreset;
  nonce: number;
  palette: ScenePalette;
  selected: string | null;
  onSelect: (s: PickedElement) => void;
  probe: React.RefObject<HTMLSpanElement>;
  onFileError: () => void;
}

function Scene({ model, framing, layers, mode, preset, nonce, palette, selected, onSelect, probe, onFileError }: SceneProps) {
  const visible = Object.fromEntries(layers.map((l) => [l.discipline, l.visible])) as Record<Discipline, boolean>;
  const procedural = (
    <ProceduralBuilding spec={model.spec} palette={palette} mode={mode} visible={visible} selectedId={selected} onSelect={onSelect} sway />
  );
  const start = presetPosition("iso", framing, 1);
  return (
    <>
      <PerspectiveCamera makeDefault position={[start.x, start.y, start.z]} fov={42} near={0.1} far={framing.distance * 12} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.05} minDistance={3} maxDistance={framing.distance * 3} target={framing.target} />
      <CameraRig preset={preset} nonce={nonce} framing={framing} />
      <CameraProbe target={probe} />
      <SceneLights palette={palette} extent={Math.max(framing.radius, framing.height)} />
      <SceneGrid palette={palette} size={Math.max(48, framing.radius * 5)} />
      {isRenderableModel(model.fileUrl) ? (
        <ModelFile url={model.fileUrl} fit={Math.max(framing.height, framing.radius * 1.6)} wireframe={mode === "wireframe"} fallback={procedural} onError={onFileError} />
      ) : (
        procedural
      )}
      <AxisGizmo palette={palette} />
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ViewerPage() {
  const navigate = useNavigate();
  const palette = useScenePalette();
  const { data: generated = [] } = useGeneratedModels();
  const models = useMemo<ViewerModel[]>(() => [
    ...SAMPLE_MODELS,
    ...generated.map((g) => ({
      id: g.id,
      name: g.model_name,
      format: isRenderableModel(g.file_url) ? g.file_format.toUpperCase() : "Generated",
      updated: g.created_at.slice(0, 10),
      spec: specFromPrompt(g.model_name),
      fileUrl: g.file_url,
      generated: true,
    })),
  ], [generated]);
  const [selectedModel, setSelectedModel] = useState(SAMPLE_MODELS[0].id);
  const [layers, setLayers] = useState(initialLayers);
  const [mode, setMode] = useState<ViewMode>("shaded");
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [nonce, setNonce] = useState(0);
  const [selection, setSelection] = useState<PickedElement | null>(null);
  const [tab, setTab] = useState<"clashes" | "notes">("clashes");
  const [noteText, setNoteText] = useState("");
  const [notesVersion, setNotesVersion] = useState(0);
  const issuesRef = useRef<HTMLDivElement>(null);
  const { profile, user } = useAuth();
  const probe = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const model = models.find((m) => m.id === selectedModel) ?? models[0];
  const framing = useMemo(() => buildingFraming(model.spec), [model.spec]);
  const counts = useMemo(() => elementCounts(model.spec), [model.spec]);
  const layerCount = (l: LayerState) => counts[l.discipline];
  const clashes = useMemo(() => detectClashes(buildGeometry(model.spec)), [model.spec]);
  const critical = clashes.filter((c) => c.severity === "critical").length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const notes = useMemo(() => listAnnotations(model.id), [model.id, notesVersion]);
  const openNotes = notes.filter((n) => !n.resolved).length;
  const refreshNotes = () => setNotesVersion((v) => v + 1);

  const showIssues = (t: "clashes" | "notes") => {
    setTab(t);
    issuesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const focusClash = (c: Clash) => {
    const layer = c.a.part === "ducts" || c.a.part === "plant" ? "hvac" : c.a.part === "trays" ? "electrical" : c.a.part === "risers" ? "plumbing" : "structural";
    setSelection({ id: c.a.id, label: c.a.label, level: c.a.level, discipline: layer as Discipline });
    setMode("xray");
    frame.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };
  const runClashCheck = () => {
    toast.success(`Clash check complete — ${clashes.length} clash${clashes.length === 1 ? "" : "es"} (${critical} critical)`);
    showIssues("clashes");
  };
  const saveNote = () => {
    if (!selection || !noteText.trim()) return;
    addAnnotation({
      modelId: model.id, elementId: selection.id, elementLabel: selection.label, level: selection.level, text: noteText.trim(),
      author: profile?.display_name || user?.email?.split("@")[0] || "You",
    });
    setNoteText("");
    refreshNotes();
    toast.success("Note pinned to element");
  };
  const focusNote = (n: Annotation) => {
    const [key] = n.elementId.split("#");
    const discipline = (["ducts", "plant"].includes(key) ? "hvac" : key === "trays" ? "electrical" : key === "risers" ? "plumbing" : ["slabs", "roof", "columns", "core"].includes(key) ? "structural" : ["pad", "paving", "road", "trunks", "canopies", "green"].includes(key) ? "site" : "architectural") as Discipline;
    setSelection({ id: n.elementId, label: n.elementLabel, level: n.level, discipline });
    frame.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const toggleLayer = (i: number) => setLayers((prev) => prev.map((l, idx) => (idx === i ? { ...l, visible: !l.visible } : l)));
  const setAll = (visible: boolean) => setLayers((prev) => prev.map((l) => ({ ...l, visible })));
  const goPreset = (p: CameraPreset) => { setPreset(p); setNonce((n) => n + 1); };
  const fullscreen = () => {
    const el = frame.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => undefined);
  };

  const visibleCount = layers.filter((l) => l.visible).length;
  const visibleElements = layers.filter((l) => l.visible).reduce((s, l) => s + layerCount(l), 0);
  const totalElements = layers.reduce((s, l) => s + layerCount(l), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="3D Viewer"
        description="Inspect coordinated BIM models — isolate disciplines, switch render modes and pick elements."
        actions={
          <>
            <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); setSelection(null); }}>
              <SelectTrigger className="w-full sm:w-[248px]" aria-label="Model"><SelectValue /></SelectTrigger>
              <SelectContent>
                {models.map((m) => <SelectItem key={m.id} value={m.id}>{m.generated ? `✦ ${m.name}` : m.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={runClashCheck}>
              <ShieldAlert /> Run clash check
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Viewport
          ref={frame}
          className="h-[440px] sm:h-[560px] xl:h-[640px]"
          overlay={
            <>
              <ViewportSlot at="top-left">
                <GlassBar label="Render mode">
                  {VIEW_MODES.map((v) => (
                    <GlassButton key={v.key} icon={v.icon} label={v.label} showLabel active={mode === v.key} onClick={() => setMode(v.key)} />
                  ))}
                </GlassBar>
                <Readout className="hidden sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="text-foreground">{model.name}</span>
                  <span>·</span>
                  <span>{model.format}</span>
                </Readout>
              </ViewportSlot>

              <ViewportSlot at="top-right">
                <GlassBar label="Camera">
                  {(Object.keys(PRESETS) as CameraPreset[]).map((k) => (
                    <GlassButton key={k} icon={PRESETS[k].icon} label={PRESETS[k].label} active={preset === k} onClick={() => goPreset(k)} />
                  ))}
                  <GlassDivider />
                  <GlassButton icon={Maximize2} label="Fullscreen" onClick={fullscreen} />
                </GlassBar>
              </ViewportSlot>

              <ViewportSlot at="bottom-left" className="max-w-[calc(100%-140px)]">
                {selection && (
                  <Readout className="text-foreground">
                    <MousePointer2 className="h-3 w-3 text-primary" />
                    <span className="truncate">{selection.label}</span>
                  </Readout>
                )}
                <Readout>
                  <span className="text-mod-spatial">CAM</span>
                  <span ref={probe} className="truncate">X 15.00  Y 12.00  Z 15.00</span>
                  <span className="hidden sm:inline">· m</span>
                </Readout>
              </ViewportSlot>
            </>
          }
        >
          <Canvas shadows dpr={[1, 2]} onPointerMissed={() => setSelection(null)} aria-label="BIM model viewport">
            <Suspense fallback={<SceneFallback label="Loading model" />}>
              <Scene
                model={model}
                framing={framing}
                layers={layers}
                mode={mode}
                preset={preset}
                nonce={nonce}
                palette={palette}
                selected={selection?.id ?? null}
                onSelect={setSelection}
                probe={probe}
                onFileError={() => toast.error("Couldn't load the model file — showing the parametric model instead.")}
              />
            </Suspense>
          </Canvas>
        </Viewport>

        {/* Inspector */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 xl:content-start">
          <Panel
            eyebrow="Layers"
            title={<span className="flex items-center gap-2">Disciplines <span className="ss-num text-xs font-normal text-muted-foreground">{visibleCount}/{layers.length}</span></span>}
            actions={
              <>
                <Button size="xs" variant="ghost" onClick={() => setAll(true)}>All</Button>
                <Button size="xs" variant="ghost" onClick={() => setAll(false)}>None</Button>
              </>
            }
            bodyClassName="px-2 pb-2"
          >
            <ul className="space-y-px">
              {layers.map((layer, i) => (
                <li key={layer.name}>
                  <button
                    onClick={() => toggleLayer(i)}
                    aria-pressed={layer.visible}
                    className="group flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-accent"
                  >
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-[3px] ring-1 ring-inset ring-foreground/10 transition-opacity", SWATCH[layer.tone], !layer.visible && "opacity-25")} />
                    <span className={cn("min-w-0 flex-1 truncate", !layer.visible && "text-muted-foreground")}>{layer.name}</span>
                    <span className="ss-num text-[11px] text-muted-foreground">{layerCount(layer).toLocaleString()}</span>
                    {layer.visible ? <Eye className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground/50" />}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel eyebrow="Inspector" title={selection ? selection.label : "Selection"}>
            {selection ? (
              <dl className="space-y-2 text-xs">
                {[
                  ["Element ID", selection.id.replace("#", "-").toUpperCase()],
                  ["Layer", initialLayers.find((l) => l.discipline === selection.discipline)?.name ?? selection.discipline],
                  ["Level", selection.level],
                  ["Model", model.name],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className={cn("truncate text-right", k === "Element ID" && "ss-num")}>{v}</dd>
                  </div>
                ))}
                <div className="space-y-2 pt-2">
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveNote(); }}
                    placeholder="Add a note to this element…"
                    rows={2}
                    className="min-h-[56px] resize-none text-xs"
                  />
                  <div className="flex gap-2">
                    <Button size="xs" className="flex-1" onClick={saveNote} disabled={!noteText.trim()}>
                      <MessageSquareText /> Pin note
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => navigate("/build/rfis")}>Raise RFI</Button>
                    <Button size="xs" variant="ghost" onClick={() => setSelection(null)}>Clear</Button>
                  </div>
                </div>
              </dl>
            ) : (
              <div className="flex items-start gap-3 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                <MousePointer2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>Click any element in the viewport to inspect its layer, level and ID. Drag to orbit, scroll to zoom.</p>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Model" title="Properties" className="sm:col-span-2 xl:col-span-1">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              {[
                ["Format", <StatusPill key="f" status={model.format} tone="data" />],
                ["Storeys", <span key="l" className="ss-num">{model.spec.floors + model.spec.podiumFloors}{model.spec.podiumFloors ? ` (${model.spec.podiumFloors} podium)` : ""}</span>],
                ["Height", <span key="h" className="ss-num">{buildingHeight(model.spec).toFixed(1)} m</span>],
                ["GFA", <span key="g" className="ss-num">{grossFloorArea(model.spec).toLocaleString()} m²</span>],
                ["Structure", <span key="st" className="capitalize">{model.spec.structure}</span>],
                ["Updated", <span key="u" className="ss-num">{model.updated}</span>],
              ].map(([k, v]) => (
                <div key={k as string} className="space-y-1">
                  <dt className="ss-eyebrow">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total elements" value={totalElements.toLocaleString()} icon={Box} hint={`${model.format} · ${model.spec.use}`} />
        <StatCard label="Visible in view" value={visibleElements.toLocaleString()} icon={Eye} hint={`${visibleCount} of ${layers.length} layers`} tone="data" />
        <StatCard label="Clash issues" value={clashes.length} icon={AlertTriangle} hint={`${critical} critical`} tone={critical ? "warning" : clashes.length ? "default" : "success"} onClick={() => showIssues("clashes")} />
        <StatCard label="Annotations" value={notes.length} icon={MessageSquareText} hint={notes.length ? `${openNotes} unresolved` : "Pin notes from the inspector"} onClick={() => showIssues("notes")} />
      </section>

      <div ref={issuesRef} className="scroll-mt-20">
        <Panel
          flush
          eyebrow="Coordination"
          title={model.name}
          actions={
            <Tabs value={tab} onValueChange={(v) => setTab(v as "clashes" | "notes")}>
              <TabsList>
                <TabsTrigger value="clashes">Clashes <span className="ss-num text-[10.5px] text-muted-foreground">{clashes.length}</span></TabsTrigger>
                <TabsTrigger value="notes">Notes <span className="ss-num text-[10.5px] text-muted-foreground">{notes.length}</span></TabsTrigger>
              </TabsList>
            </Tabs>
          }
        >
          {tab === "clashes" ? (
            clashes.length === 0 ? (
              <div className="p-5 pt-0"><EmptyState compact icon={ShieldAlert} title="No clashes" description="MEP runs clear the structure on every level." /></div>
            ) : (
              <ul className="max-h-[420px] divide-y divide-border/70 overflow-y-auto border-t">
                {clashes.slice(0, 80).map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => focusClash(c)}
                      className={cn("grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-surface-2/60", selection?.id === c.a.id && "bg-primary/[0.06]")}
                    >
                      <StatusPill status={c.severity} tone={c.severity === "critical" ? "destructive" : c.severity === "major" ? "warning" : "neutral"} className="capitalize" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px]">{c.description}</span>
                        <span className="block truncate text-xs text-muted-foreground">{c.a.label} × {c.b.label}</span>
                      </span>
                      <span className="ss-num shrink-0 text-[11px] text-muted-foreground">{c.a.level}</span>
                    </button>
                  </li>
                ))}
                {clashes.length > 80 && <li className="px-5 py-2.5 text-xs text-muted-foreground">+ {clashes.length - 80} more</li>}
              </ul>
            )
          ) : notes.length === 0 ? (
            <div className="p-5 pt-0"><EmptyState compact icon={MessageSquareText} title="No notes yet" description="Select an element in the viewport, then pin a note to it from the inspector." /></div>
          ) : (
            <ul className="divide-y divide-border/70 border-t">
              {notes.map((n) => (
                <li key={n.id} className="flex items-start gap-3 px-5 py-3">
                  <button onClick={() => focusNote(n)} className="min-w-0 flex-1 text-left">
                    <p className={cn("text-[13px]", n.resolved && "text-muted-foreground line-through")}>{n.text}</p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {n.elementLabel} · {n.level} · {n.author} · <span className="ss-num">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </p>
                  </button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={n.resolved ? "Reopen note" : "Resolve note"} onClick={() => { updateAnnotation(n.id, { resolved: !n.resolved }); refreshNotes(); }}>
                    {n.resolved ? <Undo2 /> : <Check />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Delete note" onClick={() => { removeAnnotation(n.id); refreshNotes(); }}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
