import { useState, useRef, Suspense, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Grid, Environment, PerspectiveCamera, Html } from "@react-three/drei";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, EyeOff, Maximize2 } from "lucide-react";
import * as THREE from "three";
import { useGeneratedModels, useBlenderJobs } from "@/hooks/useBlenderData";

// Fallback mock data shown only when no real models exist yet
const FALLBACK_MODELS = [
  { id: "mock-1", name: "Tower A – Structural (demo)", type: "IFC", elements: 12480, lastUpdated: "—" },
  { id: "mock-2", name: "Tower B – MEP Systems (demo)", type: "RVT", elements: 8320, lastUpdated: "—" },
  { id: "mock-3", name: "Podium – Architectural (demo)", type: "IFC", elements: 18750, lastUpdated: "—" },
];

interface LayerState { name: string; visible: boolean; color: string; count: number }

const initialLayers: LayerState[] = [
  { name: "Structural", visible: true, color: "#3b82f6", count: 4200 },
  { name: "MEP – HVAC", visible: true, color: "#8b5cf6", count: 2180 },
  { name: "MEP – Plumbing", visible: true, color: "#06b6d4", count: 1640 },
  { name: "MEP – Electrical", visible: false, color: "#eab308", count: 1320 },
  { name: "Architectural", visible: true, color: "#22c55e", count: 5800 },
  { name: "Site Work", visible: false, color: "#ef4444", count: 980 },
];

// Memoized position arrays — created once, not on every render
const SLAB_POSITIONS = [1, 2, 3, 4, 5] as const;
const COLUMN_POSITIONS = [-3, 0, 3].flatMap(x => [-2, 2].map(z => ({ x, z })));
const WALL_ROTS = [0, Math.PI / 2, Math.PI, -Math.PI / 2] as const;
const DUCT_Y = [2, 5, 8, 11] as const;
const PIPE_X = [-2, 2] as const;
const ELEC_Y = [1, 4, 7, 10, 13] as const;

function Building({ layers }: { layers: LayerState[] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.1) * 0.05;
  });

  const structVisible = layers[0]?.visible;
  const hvacVisible = layers[1]?.visible;
  const plumbVisible = layers[2]?.visible;
  const elecVisible = layers[3]?.visible;
  const archVisible = layers[4]?.visible;

  return (
    <group ref={groupRef}>
      {/* Foundation */}
      {structVisible && (
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[8, 0.5, 6]} />
          <meshStandardMaterial color="#64748b" roughness={0.8} />
        </mesh>
      )}
      {/* Floor slabs */}
      {structVisible && SLAB_POSITIONS.map(i => (
        <mesh key={`slab-${i}`} position={[0, i * 3, 0]}>
          <boxGeometry args={[7.5, 0.2, 5.5]} />
          <meshStandardMaterial color="#94a3b8" transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Columns */}
      {structVisible && COLUMN_POSITIONS.map(({ x, z }) => (
        <mesh key={`col-${x}-${z}`} position={[x, 7.5, z]}>
          <boxGeometry args={[0.3, 15, 0.3]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>
      ))}
      {/* Glass facade */}
      {archVisible && WALL_ROTS.map((rot, i) => (
        <mesh key={`wall-${i}`} position={[Math.sin(rot) * 3.8, 7.5, Math.cos(rot) * (i % 2 === 0 ? 2.8 : 3.8)]} rotation={[0, rot, 0]}>
          <planeGeometry args={[i % 2 === 0 ? 5.5 : 7.5, 14.5]} />
          <meshStandardMaterial color="#93c5fd" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* HVAC ducts */}
      {hvacVisible && DUCT_Y.map(y => (
        <mesh key={`duct-${y}`} position={[0, y + 0.5, 0]}>
          <boxGeometry args={[6, 0.15, 0.3]} />
          <meshStandardMaterial color="#8b5cf6" />
        </mesh>
      ))}
      {/* Plumbing risers */}
      {plumbVisible && PIPE_X.map(x => (
        <mesh key={`pipe-${x}`} position={[x, 7.5, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 14.5, 8]} />
          <meshStandardMaterial color="#06b6d4" />
        </mesh>
      ))}
      {/* Electrical conduits */}
      {elecVisible && ELEC_Y.map(y => (
        <mesh key={`elec-${y}`} position={[2.5, y, 1.5]}>
          <boxGeometry args={[0.08, 0.08, 4]} />
          <meshStandardMaterial color="#eab308" />
        </mesh>
      ))}
      {/* Roof */}
      {structVisible && (
        <mesh position={[0, 15.1, 0]}>
          <boxGeometry args={[8, 0.15, 6]} />
          <meshStandardMaterial color="#475569" />
        </mesh>
      )}
    </group>
  );
}

function Scene({ layers }: { layers: LayerState[] }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[15, 12, 15]} fov={45} />
      <OrbitControls enableDamping dampingFactor={0.1} maxPolarAngle={Math.PI / 2.1} minDistance={8} maxDistance={40} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <Grid args={[20, 20]} position={[0, 0, 0]} cellSize={1} cellThickness={0.5} cellColor="#334155" sectionSize={5} sectionThickness={1} sectionColor="#475569" fadeDistance={40} />
      <Building layers={layers} />
      <Environment preset="city" />
    </>
  );
}

export default function ViewerPage() {
  const { data: generatedModels = [], isLoading: modelsLoading } = useGeneratedModels();
  const { data: blenderJobs = [] } = useBlenderJobs();

  // Build a unified model list from real data; fall back to demo when empty
  const realModels = generatedModels
    .filter(m => m.file_format === "glb" || m.file_format === "gltf")
    .map(m => {
      const job = blenderJobs.find(j => j.id === m.blender_job_id);
      return {
        id: m.id,
        name: m.model_name,
        type: m.file_format.toUpperCase(),
        elements: m.element_count ?? 0,
        lastUpdated: new Date(m.created_at).toLocaleDateString(),
        fileUrl: m.file_url,
        jobType: job?.job_type ?? "generate",
        isReal: true,
      };
    });

  const models = realModels.length > 0
    ? realModels
    : FALLBACK_MODELS.map(m => ({ ...m, fileUrl: null, jobType: "demo", isReal: false }));

  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [layers, setLayers] = useState(initialLayers);

  const selectedId = selectedModelId ?? models[0]?.id ?? "";
  const model = models.find(m => m.id === selectedId) ?? models[0];

  const toggleLayer = (i: number) => setLayers(prev => prev.map((l, idx) => idx === i ? { ...l, visible: !l.visible } : l));

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">3D Viewer</h1>
            <Badge variant="outline" className="text-[10px]">Spatial Workbench</Badge>
            {realModels.length === 0 && !modelsLoading && (
              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40">Demo Mode</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            {modelsLoading ? "Loading models…" : realModels.length > 0
              ? `${realModels.length} generated model${realModels.length !== 1 ? "s" : ""} from Blender.`
              : "Interactive BIM model visualization. Generate models via Spatial → 3D Generator."}
          </p>
        </div>
        <Select value={selectedId} onValueChange={setSelectedModelId}>
          <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>{models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="md:col-span-2 lg:col-span-3">
          <CardContent className="p-0">
            <div className="aspect-[16/9] rounded-lg overflow-hidden bg-muted/20">
              <Canvas shadows>
                <Suspense fallback={<Html center><div className="text-xs text-muted-foreground">Loading 3D…</div></Html>}>
                  <Scene layers={layers} />
                </Suspense>
              </Canvas>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Model Info</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Format</span><span className="font-medium">{model?.type ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Elements</span><span className="font-medium">{(model?.elements ?? 0).toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Updated</span><span className="font-medium">{model?.lastUpdated ?? "—"}</span></div>
              {"fileUrl" in (model ?? {}) && (model as { fileUrl: string | null }).fileUrl && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Source</span>
                  <Badge variant="outline" className="text-[10px]">Blender</Badge>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">Layers</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {layers.map((layer, i) => (
                <button key={layer.name} onClick={() => toggleLayer(i)} aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`} className="flex items-center justify-between w-full text-xs py-1.5 px-2 rounded hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: layer.color, opacity: layer.visible ? 1 : 0.3 }} />
                    <span className={layer.visible ? "" : "text-muted-foreground line-through"}>{layer.name}</span>
                  </div>
                  {layer.visible ? <Eye className="h-3 w-3 text-muted-foreground" /> : <EyeOff className="h-3 w-3 text-muted-foreground/40" />}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Elements", value: (model?.elements ?? 0).toLocaleString() },
          { label: "Visible Layers", value: `${layers.filter(l => l.visible).length} / ${layers.length}` },
          { label: "Generated Models", value: realModels.length.toString() },
          { label: "Annotations", value: "34" },
        ].map(s => (
          <Card key={s.label}><CardContent className="p-4 text-center"><p className="text-lg font-bold">{s.value}</p><p className="text-[11px] text-muted-foreground">{s.label}</p></CardContent></Card>
        ))}
      </div>
    </div>
  );
}
