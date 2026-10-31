import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Grid3X3, Layers, Maximize2, Ruler, Wand2, XCircle, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, Meter, PageHeader, Panel, StatusPill } from "@/components/os";
import { GlassBar, GlassButton, GlassDivider, Readout } from "@/components/spatial/Viewport";
import { useFloorPlanVariants, useUpdateFloorPlanVariant, type FloorPlanVariant } from "@/hooks/useBlenderData";
import { cn } from "@/lib/utils";

const mockFloors = [
  { id: "b1", label: "Basement 1", rooms: 8, area: "4,200 sqft", status: "Final" },
  { id: "g", label: "Ground Floor", rooms: 12, area: "5,800 sqft", status: "Final" },
  { id: "1", label: "Floor 1", rooms: 14, area: "5,400 sqft", status: "Final" },
  { id: "2", label: "Floor 2", rooms: 14, area: "5,400 sqft", status: "In Review" },
  { id: "3", label: "Floor 3", rooms: 14, area: "5,400 sqft", status: "In Review" },
  { id: "4", label: "Floor 4 – Penthouse", rooms: 6, area: "5,400 sqft", status: "Draft" },
  { id: "r", label: "Roof Plan", rooms: 0, area: "5,800 sqft", status: "Draft" },
];

const mockRooms = [
  { name: "Living Room", area: "380 sqft", type: "Residential", dimensions: "19' × 20'" },
  { name: "Kitchen", area: "180 sqft", type: "Residential", dimensions: "12' × 15'" },
  { name: "Master Bedroom", area: "240 sqft", type: "Residential", dimensions: "15' × 16'" },
  { name: "Bedroom 2", area: "160 sqft", type: "Residential", dimensions: "10' × 16'" },
  { name: "Bathroom 1", area: "80 sqft", type: "Residential", dimensions: "8' × 10'" },
  { name: "Hallway", area: "120 sqft", type: "Circulation", dimensions: "4' × 30'" },
];

const FLOOR_TONE: Record<string, "success" | "info" | "neutral"> = { Final: "success", "In Review": "info", Draft: "neutral" };

/** Plan geometry in a 1000 × 700 drawing space (outer wall 40 → 960 / 40 → 660). */
const ROOM_GEOM: Record<string, { x: number; y: number; w: number; h: number }> = {
  "Living Room": { x: 40, y: 40, w: 420, h: 340 },
  "Master Bedroom": { x: 460, y: 40, w: 500, h: 230 },
  "Bedroom 2": { x: 460, y: 270, w: 250, h: 170 },
  "Bathroom 1": { x: 710, y: 270, w: 250, h: 170 },
  Kitchen: { x: 40, y: 380, w: 420, h: 280 },
  Hallway: { x: 460, y: 440, w: 500, h: 220 },
};

function PlanDrawing({ zoom, grid, dims, hovered, onHover, floorLabel }: { zoom: number; grid: boolean; dims: boolean; hovered: string | null; onHover: (n: string | null) => void; floorLabel: string }) {
  return (
    <svg viewBox="-40 -40 1080 800" className="h-full w-full transition-transform duration-500 ease-out-expo" style={{ transform: `scale(${zoom})` }} role="img" aria-label={`${floorLabel} floor plan`}>
      <defs>
        <pattern id="fp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="hsl(var(--foreground) / 0.06)" strokeWidth="1" />
        </pattern>
        <pattern id="fp-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="hsl(var(--foreground) / 0.35)" strokeWidth="1.5" />
        </pattern>
      </defs>
      {grid && <rect x="-40" y="-40" width="1080" height="800" fill="url(#fp-grid)" />}

      {/* rooms */}
      {mockRooms.map((r) => {
        const g = ROOM_GEOM[r.name];
        const on = hovered === r.name;
        return (
          <g key={r.name} onMouseEnter={() => onHover(r.name)} onMouseLeave={() => onHover(null)} className="cursor-pointer">
            <rect
              x={g.x} y={g.y} width={g.w} height={g.h}
              fill={on ? "hsl(var(--mod-spatial) / 0.14)" : r.type === "Circulation" ? "hsl(var(--foreground) / 0.025)" : "transparent"}
              stroke="hsl(var(--foreground) / 0.35)" strokeWidth="2"
              className="transition-[fill] duration-200"
            />
            <text x={g.x + g.w / 2} y={g.y + g.h / 2 - 6} textAnchor="middle" fontSize="26" fontWeight={on ? 600 : 500} fill={on ? "hsl(var(--mod-spatial))" : "hsl(var(--foreground) / 0.8)"} fontFamily="Geist, sans-serif">
              {r.name}
            </text>
            <text x={g.x + g.w / 2} y={g.y + g.h / 2 + 22} textAnchor="middle" fontSize="17" fill="hsl(var(--muted-foreground))" fontFamily="Geist Mono, monospace">
              {r.area.toUpperCase()}
            </text>
          </g>
        );
      })}

      {/* outer wall, poché */}
      <path d="M28 28H972V672H28Z M40 40V660H960V40Z" fill="url(#fp-hatch)" fillRule="evenodd" stroke="hsl(var(--foreground) / 0.7)" strokeWidth="2" />

      {/* doors (opening + swing) */}
      {[
        { x: 300, y: 380, r: 60, a: "h" },
        { x: 560, y: 440, r: 56, a: "h" },
        { x: 760, y: 440, r: 50, a: "h" },
        { x: 460, y: 120, r: 60, a: "v" },
      ].map((d, i) => (
        <g key={i} stroke="hsl(var(--primary))" strokeWidth="1.5" fill="none">
          {d.a === "h" ? (
            <>
              <line x1={d.x} y1={d.y} x2={d.x + d.r} y2={d.y} stroke="hsl(var(--background))" strokeWidth="5" />
              <path d={`M${d.x} ${d.y} L${d.x} ${d.y - d.r} A${d.r} ${d.r} 0 0 1 ${d.x + d.r} ${d.y}`} strokeDasharray="4 4" opacity="0.8" />
            </>
          ) : (
            <>
              <line x1={d.x} y1={d.y} x2={d.x} y2={d.y + d.r} stroke="hsl(var(--background))" strokeWidth="5" />
              <path d={`M${d.x} ${d.y} L${d.x + d.r} ${d.y} A${d.r} ${d.r} 0 0 1 ${d.x} ${d.y + d.r}`} strokeDasharray="4 4" opacity="0.8" />
            </>
          )}
        </g>
      ))}

      {/* windows */}
      {[[120, 28, 200], [560, 28, 280]].map(([x, y, w], i) => (
        <g key={i}>
          <rect x={x} y={y} width={w} height="12" fill="hsl(var(--background))" />
          <line x1={x} y1={y + 6} x2={x + w} y2={y + 6} stroke="hsl(var(--data))" strokeWidth="2" />
        </g>
      ))}

      {/* dimensions */}
      {dims && (
        <g stroke="hsl(var(--muted-foreground))" strokeWidth="1" fontFamily="Geist Mono, monospace" fontSize="18" fill="hsl(var(--muted-foreground))">
          <line x1="28" y1="700" x2="972" y2="700" />
          <line x1="28" y1="690" x2="28" y2="710" />
          <line x1="972" y1="690" x2="972" y2="710" />
          <line x1="460" y1="694" x2="460" y2="706" />
          <text x="244" y="730" textAnchor="middle" stroke="none">21'-0"</text>
          <text x="716" y="730" textAnchor="middle" stroke="none">25'-0"</text>
          <line x1="1000" y1="28" x2="1000" y2="672" />
          <line x1="990" y1="28" x2="1010" y2="28" />
          <line x1="990" y1="672" x2="1010" y2="672" />
          <text x="1022" y="355" stroke="none" transform="rotate(90 1022 355)" textAnchor="middle">32'-0"</text>
        </g>
      )}

      {/* north arrow */}
      <g transform="translate(-6 712)" fontFamily="Geist Mono, monospace">
        <circle r="16" fill="none" stroke="hsl(var(--foreground) / 0.4)" />
        <path d="M0 -12 L6 8 L0 4 L-6 8Z" fill="hsl(var(--primary))" />
        <text x="24" y="6" fontSize="18" fill="hsl(var(--muted-foreground))">N</text>
      </g>
    </svg>
  );
}

/** Thumbnail for an AI variant, drawn from its layout_json when present. */
function VariantThumb({ v }: { v: FloorPlanVariant }) {
  const rooms = v.layout_json?.rooms ?? [];
  const W = v.layout_json?.dimensions?.total_width || 100;
  const H = v.layout_json?.dimensions?.total_height || 70;
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg border bg-surface-2/60">
      <div className="ss-blueprint absolute inset-0 opacity-70" />
      <svg viewBox={`-4 -4 ${W + 8} ${H + 8}`} className="relative h-full w-full p-3" preserveAspectRatio="xMidYMid meet">
        {rooms.length > 0 ? (
          rooms.map((r, i) => (
            <rect key={i} x={r.x} y={r.y} width={r.width} height={r.height} fill={i % 3 === 0 ? "hsl(var(--mod-spatial) / 0.12)" : "transparent"} stroke="hsl(var(--foreground) / 0.45)" strokeWidth={Math.max(W, H) / 200} />
          ))
        ) : (
          <rect x="0" y="0" width={W} height={H} fill="none" stroke="hsl(var(--foreground) / 0.4)" strokeDasharray="3 3" strokeWidth={Math.max(W, H) / 200} />
        )}
      </svg>
      <span className="ss-num absolute left-2 top-2 rounded border bg-background/80 px-1.5 py-px text-[10px] text-muted-foreground backdrop-blur">V{String(v.variant_number).padStart(2, "0")}</span>
    </div>
  );
}

export default function FloorPlansPage() {
  const [selectedFloor, setSelectedFloor] = useState("g");
  const [zoom, setZoom] = useState(1);
  const [grid, setGrid] = useState(true);
  const [dims, setDims] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const floor = mockFloors.find((f) => f.id === selectedFloor)!;
  const navigate = useNavigate();
  const { data: variants, isLoading: variantsLoading } = useFloorPlanVariants();
  const updateVariant = useUpdateFloorPlanVariant();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Floor Plans"
        description="Review parametric plans level by level, and approve AI-generated layout variants."
        actions={
          <>
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger className="w-full sm:w-[200px] xl:hidden" aria-label="Level"><SelectValue /></SelectTrigger>
              <SelectContent>
                {mockFloors.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={() => navigate("/spatial/generator")}>
              <Wand2 /> Generate with AI
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[200px_minmax(0,1fr)_260px]">
        {/* Level rail */}
        <Panel eyebrow="Building" title="Levels" className="hidden xl:flex" bodyClassName="px-2 pb-2">
          <ol className="space-y-px">
            {[...mockFloors].reverse().map((f) => {
              const on = f.id === selectedFloor;
              return (
                <li key={f.id}>
                  <button
                    onClick={() => setSelectedFloor(f.id)}
                    aria-current={on}
                    className={cn(
                      "relative flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors",
                      on ? "bg-surface-3 font-medium text-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    {on && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-mod-spatial" />}
                    <span className="truncate">{f.label}</span>
                    <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", f.status === "Final" ? "bg-success" : f.status === "In Review" ? "bg-info" : "bg-muted-foreground/40")} />
                  </button>
                </li>
              );
            })}
          </ol>
        </Panel>

        {/* Drawing */}
        <section className="ss-card relative isolate aspect-[4/3] overflow-hidden bg-surface-1 sm:aspect-[16/11]">
          <div className="absolute inset-0 flex items-center justify-center px-3 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-14">
            <PlanDrawing zoom={zoom} grid={grid} dims={dims} hovered={hovered} onHover={setHovered} floorLabel={floor.label} />
          </div>
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <Readout className="text-foreground">
              <Layers className="h-3 w-3 text-mod-spatial" />
              {floor.label}
            </Readout>
            <StatusPill status={floor.status} tone={FLOOR_TONE[floor.status]} className="hidden bg-background/70 backdrop-blur sm:inline-flex" />
          </div>
          <div className="absolute right-3 top-3">
            <GlassBar label="Plan tools">
              <GlassButton icon={ZoomIn} label="Zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.25).toFixed(2)))} />
              <GlassButton icon={ZoomOut} label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} />
              <GlassButton icon={Maximize2} label="Fit to view" onClick={() => setZoom(1)} />
              <GlassDivider />
              <GlassButton icon={Grid3X3} label="Grid" active={grid} onClick={() => setGrid((g) => !g)} />
              <GlassButton icon={Ruler} label="Dimensions" active={dims} onClick={() => setDims((d) => !d)} />
            </GlassBar>
          </div>
          <Readout className="absolute bottom-3 left-3">
            <span>{floor.area.toUpperCase()}</span>
            <span>·</span>
            <span>{Math.round(zoom * 100)}%</span>
            <span className="hidden sm:inline">· 1:100</span>
          </Readout>
          {["left-2 top-2 border-l border-t", "right-2 top-2 border-r border-t", "left-2 bottom-2 border-l border-b", "right-2 bottom-2 border-r border-b"].map((c) => (
            <span key={c} className={cn("pointer-events-none absolute h-3 w-3 border-primary/50", c)} />
          ))}
        </section>

        {/* Details */}
        <Panel eyebrow="Level" title={floor.label}>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs xl:grid-cols-1">
            <div className="space-y-1"><dt className="ss-eyebrow">Gross area</dt><dd className="ss-num text-xl">{floor.area.replace(" sqft", "")}<span className="ml-1 text-xs text-muted-foreground">sqft</span></dd></div>
            <div className="space-y-1"><dt className="ss-eyebrow">Rooms</dt><dd className="ss-num text-xl">{floor.rooms}</dd></div>
            <div className="space-y-1.5"><dt className="ss-eyebrow">Status</dt><dd><StatusPill status={floor.status} tone={FLOOR_TONE[floor.status]} /></dd></div>
            <div className="space-y-1.5">
              <dt className="ss-eyebrow">Net-to-gross</dt>
              <dd className="flex items-center gap-2"><Meter value={82} tone="data" className="flex-1" /><span className="ss-num text-[11px] text-muted-foreground">82%</span></dd>
            </div>
          </dl>
        </Panel>
      </div>

      {/* Variant gallery */}
      <Panel
        eyebrow="Blender MCP"
        title={<span className="flex items-center gap-2">AI layout variants {variants && variants.length > 0 && <span className="ss-num text-xs font-normal text-muted-foreground">{variants.length}</span>}</span>}
        actions={<Button size="sm" variant="ghost" onClick={() => navigate("/spatial/generator")}><Wand2 /> New variants</Button>}
      >
        {variantsLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[4/5] animate-shimmer rounded-xl bg-[linear-gradient(90deg,hsl(var(--muted))_0%,hsl(var(--surface-3))_50%,hsl(var(--muted))_100%)] bg-[length:200%_100%]" />)}
          </div>
        ) : variants && variants.length > 0 ? (
          <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {variants.map((v) => {
              const eff = Math.round((v.metrics?.efficiency_ratio ?? 0) * 100);
              return (
                <article key={v.id} className="ss-card ss-interactive flex flex-col gap-3 p-3">
                  <VariantThumb v={v} />
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[13px] font-medium">{v.variant_name ?? `Variant ${v.variant_number}`}</p>
                    <StatusPill status={v.status} className="capitalize" tone={v.status === "approved" ? "success" : v.status === "rejected" ? "destructive" : "neutral"} />
                  </div>
                  {v.metrics && (
                    <dl className="grid grid-cols-2 gap-2 text-[11px]">
                      <div><dt className="text-muted-foreground">Area</dt><dd className="ss-num">{v.metrics.total_area?.toLocaleString()} sf</dd></div>
                      <div><dt className="text-muted-foreground">Rooms</dt><dd className="ss-num">{v.metrics.room_count}</dd></div>
                      <div className="col-span-2 space-y-1">
                        <dt className="flex justify-between text-muted-foreground"><span>Efficiency</span><span className="ss-num">{eff}%</span></dt>
                        <dd><Meter value={eff} tone="data" /></dd>
                      </div>
                    </dl>
                  )}
                  {v.status === "draft" && (
                    <div className="mt-auto grid grid-cols-2 gap-1.5">
                      <Button size="xs" variant="outline" className="text-success" onClick={() => updateVariant.mutate({ id: v.id, status: "approved" })}>
                        <CheckCircle2 /> Approve
                      </Button>
                      <Button size="xs" variant="outline" className="text-destructive" onClick={() => updateVariant.mutate({ id: v.id, status: "rejected" })}>
                        <XCircle /> Reject
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            compact
            icon={Wand2}
            title="No layout variants yet"
            description="Describe a program in the 3D Generator and Blender will return alternative layouts to compare here."
            action={<Button size="sm" onClick={() => navigate("/spatial/generator")}><Wand2 /> Generate variants</Button>}
          />
        )}
      </Panel>

      {/* Room schedule */}
      <Panel flush eyebrow="Schedule" title={`Rooms — ${floor.label}`}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Room</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dimensions</TableHead>
                <TableHead className="text-right">Area</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockRooms.map((r) => (
                <TableRow
                  key={r.name}
                  onMouseEnter={() => setHovered(r.name)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(hovered === r.name && "bg-mod-spatial/[0.06]")}
                >
                  <TableCell className="whitespace-nowrap font-medium">{r.name}</TableCell>
                  <TableCell><StatusPill status={r.type} tone={r.type === "Circulation" ? "neutral" : "info"} /></TableCell>
                  <TableCell className="ss-num whitespace-nowrap text-muted-foreground">{r.dimensions}</TableCell>
                  <TableCell className="ss-num whitespace-nowrap text-right">{r.area}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </div>
  );
}
