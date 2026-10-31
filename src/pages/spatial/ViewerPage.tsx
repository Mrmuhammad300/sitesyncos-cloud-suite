import { Suspense, useEffect, useRef, useState } from "react";
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
import { PageHeader, Panel, StatCard, StatusPill } from "@/components/os";
import { useScenePalette, type ScenePalette } from "@/components/spatial/sceneTheme";
import {
  AxisGizmo, CameraProbe, GlassBar, GlassButton, GlassDivider, Readout, SceneFallback, SceneGrid, SceneLights, Viewport, ViewportSlot,
} from "@/components/spatial/Viewport";
import { cn } from "@/lib/utils";

const mockModels = [
  { id: "1", name: "Tower A – Structural", type: "IFC", size: "142 MB", elements: 12480, lastUpdated: "2026-03-28" },
  { id: "2", name: "Tower B – MEP Systems", type: "RVT", size: "89 MB", elements: 8320, lastUpdated: "2026-03-30" },
  { id: "3", name: "Podium – Architectural", type: "IFC", size: "204 MB", elements: 18750, lastUpdated: "2026-04-01" },
];

/** Layer swatches resolve through tokens: `tone` is both a Tailwind suffix and a palette key. */
type LayerTone = "spatial" | "vault" | "data" | "warning" | "success" | "destructive";
interface LayerState { name: string; visible: boolean; tone: LayerTone; count: number }

const SWATCH: Record<LayerTone, string> = {
  spatial: "bg-mod-spatial",
  vault: "bg-mod-vault",
  data: "bg-data",
  warning: "bg-warning",
  success: "bg-success",
  destructive: "bg-destructive",
};

const initialLayers: LayerState[] = [
  { name: "Structural", visible: true, tone: "spatial", count: 4200 },
  { name: "MEP – HVAC", visible: true, tone: "vault", count: 2180 },
  { name: "MEP – Plumbing", visible: true, tone: "data", count: 1640 },
  { name: "MEP – Electrical", visible: false, tone: "warning", count: 1320 },
  { name: "Architectural", visible: true, tone: "success", count: 5800 },
  { name: "Site Work", visible: false, tone: "destructive", count: 980 },
];

type ViewMode = "shaded" | "wireframe" | "xray";
type CameraPreset = "iso" | "top" | "front" | "side";

const VIEW_MODES: { key: ViewMode; label: string; icon: typeof Box }[] = [
  { key: "shaded", label: "Shaded", icon: Box },
  { key: "wireframe", label: "Wireframe", icon: Boxes },
  { key: "xray", label: "X-ray", icon: ScanEye },
];

const PRESETS: Record<CameraPreset, { label: string; icon: typeof Box; pos: [number, number, number] }> = {
  iso: { label: "Isometric", icon: Rotate3d, pos: [15, 12, 15] },
  top: { label: "Top", icon: Square, pos: [0.01, 30, 0.01] },
  front: { label: "Front", icon: View, pos: [0, 8, 26] },
  side: { label: "Side", icon: Layers, pos: [26, 8, 0] },
};

interface Selection { id: string; layer: string; label: string; level: string }

/* ─── Scene ──────────────────────────────────────────────────────────────── */

interface ElementProps {
  id: string;
  layer: string;
  label: string;
  level: string;
  color: string;
  mode: ViewMode;
  palette: ScenePalette;
  selected: string | null;
  onSelect: (s: Selection) => void;
  opacity?: number;
  position: [number, number, number];
  rotation?: [number, number, number];
  children: React.ReactNode;
}

function Element({ id, layer, label, level, color, mode, palette, selected, onSelect, opacity = 1, position, rotation, children }: ElementProps) {
  const [hover, setHover] = useState(false);
  const isSel = selected === id;
  const xray = mode === "xray";
  const op = xray ? Math.min(opacity, 0.22) : opacity;
  return (
    <mesh
      position={position}
      rotation={rotation}
      castShadow={mode === "shaded"}
      receiveShadow
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
      onPointerOut={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); onSelect({ id, layer, label, level }); }}
    >
      {children}
      <meshStandardMaterial
        color={isSel ? palette.primary : color}
        emissive={isSel ? palette.primary : color}
        emissiveIntensity={isSel ? 0.45 : hover ? 0.25 : 0}
        roughness={0.7}
        metalness={0.05}
        wireframe={mode === "wireframe"}
        transparent={op < 1 || isSel}
        opacity={isSel ? 0.95 : op}
        depthWrite={!xray && op >= 1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Building({ layers, mode, palette, selected, onSelect }: { layers: LayerState[]; mode: ViewMode; palette: ScenePalette; selected: string | null; onSelect: (s: Selection) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.05;
  });

  const [structVisible, hvacVisible, plumbVisible, elecVisible, archVisible, siteVisible] = layers.map((l) => l.visible);
  const c = (t: LayerTone) => palette[t];
  const common = { mode, palette, selected, onSelect };

  return (
    <group ref={groupRef}>
      {siteVisible && (
        <Element id="site-pad" layer="Site Work" label="Site pad / hardscape" level="Grade" color={c("destructive")} opacity={0.35} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} {...common}>
          <planeGeometry args={[14, 11]} />
        </Element>
      )}
      {structVisible && (
        <Element id="foundation" layer="Structural" label="Mat foundation" level="Foundation" color={palette.concrete} position={[0, 0.25, 0]} {...common}>
          <boxGeometry args={[8, 0.5, 6]} />
        </Element>
      )}
      {structVisible && [1, 2, 3, 4, 5].map((i) => (
        <Element key={`slab-${i}`} id={`slab-${i}`} layer="Structural" label={`Floor slab L${i}`} level={`Level ${i}`} color={palette.slab} opacity={0.7} position={[0, i * 3, 0]} {...common}>
          <boxGeometry args={[7.5, 0.2, 5.5]} />
        </Element>
      ))}
      {structVisible && [-3, 0, 3].flatMap((x) => [-2, 2].map((z) => (
        <Element key={`col-${x}-${z}`} id={`col-${x}-${z}`} layer="Structural" label={`Column C-${x + 4}${z > 0 ? "N" : "S"}`} level="L1 – Roof" color={c("spatial")} position={[x, 7.5, z]} {...common}>
          <boxGeometry args={[0.3, 15, 0.3]} />
        </Element>
      )))}
      {archVisible && [0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rot, i) => (
        <Element key={`wall-${i}`} id={`facade-${i}`} layer="Architectural" label={`Curtain wall ${["South", "East", "North", "West"][i]}`} level="L1 – Roof" color={palette.glass} opacity={0.18} position={[Math.sin(rot) * 3.8, 7.5, Math.cos(rot) * (i % 2 === 0 ? 2.8 : 3.8)]} rotation={[0, rot, 0]} {...common}>
          <planeGeometry args={[i % 2 === 0 ? 5.5 : 7.5, 14.5]} />
        </Element>
      ))}
      {hvacVisible && [2, 5, 8, 11].map((y) => (
        <Element key={`duct-${y}`} id={`duct-${y}`} layer="MEP – HVAC" label={`Supply duct SD-${y}`} level={`Level ${Math.ceil(y / 3)}`} color={c("vault")} position={[0, y + 0.5, 0]} {...common}>
          <boxGeometry args={[6, 0.15, 0.3]} />
        </Element>
      ))}
      {plumbVisible && [-2, 2].map((x) => (
        <Element key={`pipe-${x}`} id={`pipe-${x}`} layer="MEP – Plumbing" label={`Riser DW-${x > 0 ? "E" : "W"}`} level="L1 – Roof" color={c("data")} position={[x, 7.5, 0]} {...common}>
          <cylinderGeometry args={[0.06, 0.06, 14.5, 10]} />
        </Element>
      ))}
      {elecVisible && [1, 4, 7, 10, 13].map((y) => (
        <Element key={`elec-${y}`} id={`elec-${y}`} layer="MEP – Electrical" label={`Conduit EC-${y}`} level={`Level ${Math.ceil(y / 3)}`} color={c("warning")} position={[2.5, y, 1.5]} {...common}>
          <boxGeometry args={[0.08, 0.08, 4]} />
        </Element>
      ))}
      {structVisible && (
        <Element id="roof" layer="Structural" label="Roof deck" level="Roof" color={palette.concrete} position={[0, 15.1, 0]} {...common}>
          <boxGeometry args={[8, 0.15, 6]} />
        </Element>
      )}
    </group>
  );
}

/** Smoothly glides the camera to a preset and re-targets the orbit controls. */
function CameraRig({ preset, nonce }: { preset: CameraPreset; nonce: number }) {
  const { camera, controls, size } = useThree();
  const goal = useRef<THREE.Vector3 | null>(null);
  // Portrait viewports (phones) need the camera pulled back to frame the tower.
  const reach = size.width / Math.max(size.height, 1) < 1 ? 1.75 : 1.2;
  useEffect(() => {
    goal.current = new THREE.Vector3(...PRESETS[preset].pos).multiplyScalar(reach);
  }, [preset, nonce, reach]);
  useFrame(() => {
    if (!goal.current) return;
    camera.position.lerp(goal.current, 0.12);
    const ctl = controls as unknown as { target?: THREE.Vector3; update?: () => void } | null;
    ctl?.target?.lerp(new THREE.Vector3(0, 6, 0), 0.12);
    ctl?.update?.();
    if (camera.position.distanceTo(goal.current) < 0.05) goal.current = null;
  });
  return null;
}

function Scene(props: { layers: LayerState[]; mode: ViewMode; preset: CameraPreset; nonce: number; palette: ScenePalette; selected: string | null; onSelect: (s: Selection) => void; probe: React.RefObject<HTMLSpanElement> }) {
  const { palette } = props;
  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={45} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.05} minDistance={8} maxDistance={60} target={[0, 6, 0]} />
      <CameraRig preset={props.preset} nonce={props.nonce} />
      <CameraProbe target={props.probe} />
      <SceneLights palette={palette} />
      <SceneGrid palette={palette} size={48} />
      <Building layers={props.layers} mode={props.mode} palette={palette} selected={props.selected} onSelect={props.onSelect} />
      <AxisGizmo palette={palette} />
    </>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function ViewerPage() {
  const navigate = useNavigate();
  const palette = useScenePalette();
  const [selectedModel, setSelectedModel] = useState(mockModels[0].id);
  const [layers, setLayers] = useState(initialLayers);
  const [mode, setMode] = useState<ViewMode>("shaded");
  const [preset, setPreset] = useState<CameraPreset>("iso");
  const [nonce, setNonce] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const model = mockModels.find((m) => m.id === selectedModel) ?? mockModels[0];

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
  const visibleElements = layers.filter((l) => l.visible).reduce((s, l) => s + l.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="3D Viewer"
        description="Inspect coordinated BIM models — isolate disciplines, switch render modes and pick elements."
        actions={
          <>
            <Select value={selectedModel} onValueChange={(v) => { setSelectedModel(v); setSelection(null); }}>
              <SelectTrigger className="w-full sm:w-[248px]" aria-label="Model"><SelectValue /></SelectTrigger>
              <SelectContent>{mockModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline" onClick={() => navigate("/spatial/clash")}>
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
                  <span>{model.type}</span>
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
              <Scene layers={layers} mode={mode} preset={preset} nonce={nonce} palette={palette} selected={selection?.id ?? null} onSelect={setSelection} probe={probe} />
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
                    <span className="ss-num text-[11px] text-muted-foreground">{layer.count.toLocaleString()}</span>
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
                  ["Element ID", selection.id.toUpperCase()],
                  ["Layer", selection.layer],
                  ["Level", selection.level],
                  ["Model", model.name],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className={cn("truncate text-right", k === "Element ID" && "ss-num")}>{v}</dd>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <Button size="xs" variant="outline" className="flex-1" onClick={() => navigate("/build/rfis")}>
                    <MessageSquareText /> Raise RFI
                  </Button>
                  <Button size="xs" variant="ghost" onClick={() => setSelection(null)}>Clear</Button>
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
                ["Format", <StatusPill key="f" status={model.type} tone="data" />],
                ["File size", <span key="s" className="ss-num">{model.size}</span>],
                ["Elements", <span key="e" className="ss-num">{model.elements.toLocaleString()}</span>],
                ["Updated", <span key="u" className="ss-num">{model.lastUpdated}</span>],
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
        <StatCard label="Total elements" value={model.elements.toLocaleString()} icon={Box} hint={`${model.type} · ${model.size}`} />
        <StatCard label="Visible in view" value={visibleElements.toLocaleString()} icon={Eye} hint={`${visibleCount} of ${layers.length} layers`} tone="data" />
        <StatCard label="Clash issues" value="12" icon={AlertTriangle} hint="3 critical" tone="warning" onClick={() => navigate("/spatial/clash")} />
        <StatCard label="Annotations" value="34" icon={MessageSquareText} hint="8 unresolved" />
      </section>
    </div>
  );
}
