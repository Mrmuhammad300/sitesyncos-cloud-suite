/**
 * Typical-floor plan layouts derived from a BuildingSpec, in the shape the
 * Floor Plans page stores (`floor_plan_variants.layout_json`). Rooms are laid
 * out around a central core with a perimeter zone, so each variant is a
 * readable, dimensioned plan rather than random boxes.
 */
import type { BuildingSpec } from "./buildingSpec";

export interface PlanRoom { name: string; type: string; area: number; x: number; y: number; width: number; height: number }
export interface PlanLayout {
  rooms: PlanRoom[];
  walls: { x1: number; y1: number; x2: number; y2: number }[];
  dimensions: { total_width: number; total_height: number };
}
export interface PlanVariant {
  variant_name: string;
  layout_json: PlanLayout;
  metrics: { total_area: number; efficiency_ratio: number; room_count: number };
  notes: string;
}

const PROGRAM: Record<BuildingSpec["use"], { name: string; type: string; weight: number }[]> = {
  office: [
    { name: "Open workspace", type: "office", weight: 5 }, { name: "Meeting", type: "meeting", weight: 1.2 },
    { name: "Focus rooms", type: "office", weight: 0.8 }, { name: "Kitchen", type: "kitchen", weight: 0.9 },
    { name: "Reception", type: "lobby", weight: 0.8 }, { name: "Collaboration", type: "meeting", weight: 1.3 },
  ],
  residential: [
    { name: "Apartment 1 · 2BR", type: "living", weight: 2 }, { name: "Apartment 2 · 1BR", type: "living", weight: 1.4 },
    { name: "Apartment 3 · 2BR", type: "living", weight: 2 }, { name: "Apartment 4 · Studio", type: "bedroom", weight: 1 },
    { name: "Apartment 5 · 3BR", type: "living", weight: 2.4 },
  ],
  hotel: [
    { name: "Guest rooms A", type: "bedroom", weight: 3 }, { name: "Guest rooms B", type: "bedroom", weight: 3 },
    { name: "Suite", type: "living", weight: 1.4 }, { name: "Housekeeping", type: "service", weight: 0.5 },
  ],
  medical: [
    { name: "Exam rooms", type: "clinic", weight: 2.4 }, { name: "Waiting", type: "lobby", weight: 1.4 },
    { name: "Nurses station", type: "office", weight: 0.7 }, { name: "Procedure", type: "clinic", weight: 1.4 },
    { name: "Staff & storage", type: "service", weight: 0.9 },
  ],
  retail: [
    { name: "Sales floor", type: "retail", weight: 5 }, { name: "Fitting rooms", type: "service", weight: 0.6 },
    { name: "Stockroom", type: "service", weight: 1.4 }, { name: "Customer service", type: "lobby", weight: 0.6 },
  ],
  mixed: [
    { name: "Workspace", type: "office", weight: 3 }, { name: "Apartments", type: "living", weight: 3 },
    { name: "Amenity", type: "meeting", weight: 1 }, { name: "Lobby", type: "lobby", weight: 0.8 },
  ],
  industrial: [
    { name: "Warehouse floor", type: "service", weight: 7 }, { name: "Loading docks", type: "service", weight: 1.5 },
    { name: "Office", type: "office", weight: 0.8 }, { name: "Welfare", type: "kitchen", weight: 0.4 },
  ],
  education: [
    { name: "Classroom A", type: "office", weight: 1.5 }, { name: "Classroom B", type: "office", weight: 1.5 },
    { name: "Classroom C", type: "office", weight: 1.5 }, { name: "Library", type: "meeting", weight: 1.6 },
    { name: "Staff", type: "office", weight: 0.7 },
  ],
};

const round = (v: number) => Math.round(v * 10) / 10;

/** Split a strip of length `len` into chunks proportional to weights. */
function split(len: number, weights: number[]) {
  const total = weights.reduce((s, w) => s + w, 0) || 1;
  let acc = 0;
  return weights.map((w) => {
    const size = (w / total) * len;
    const start = acc;
    acc += size;
    return [start, size] as const;
  });
}

/** One layout strategy: rooms wrap the core on the two long sides. */
function layout(spec: BuildingSpec, strategy: "double-loaded" | "perimeter" | "open"): PlanLayout {
  const W = spec.width;
  const D = spec.depth;
  const coreW = Math.min(9, W * 0.28);
  const coreD = Math.min(7, D * 0.34);
  const program = PROGRAM[spec.use];
  const rooms: PlanRoom[] = [];
  const coreX = (W - coreW) / 2;
  const coreY = (D - coreD) / 2;

  if (strategy === "open") {
    // One large flexible zone plus support rooms in a band along the core.
    const band = Math.max(D * 0.22, 4);
    const [main, ...rest] = program;
    rooms.push({ name: main.name, type: main.type, x: 0, y: 0, width: W, height: D - band, area: 0 });
    split(W, rest.map((r) => r.weight)).forEach(([x, w], i) =>
      rooms.push({ name: rest[i].name, type: rest[i].type, x, y: D - band, width: w, height: band, area: 0 }),
    );
  } else {
    const northDepth = strategy === "perimeter" ? D * 0.38 : coreY - 1;
    const southY = strategy === "perimeter" ? D * 0.62 : coreY + coreD + 1;
    const half = Math.ceil(program.length / 2);
    const north = program.slice(0, half);
    const south = program.slice(half);
    split(W, north.map((r) => r.weight)).forEach(([x, w], i) =>
      rooms.push({ name: north[i].name, type: north[i].type, x, y: 0, width: w, height: northDepth, area: 0 }),
    );
    split(W, south.map((r) => r.weight)).forEach(([x, w], i) =>
      rooms.push({ name: south[i].name, type: south[i].type, x, y: southY, width: w, height: D - southY, area: 0 }),
    );
    rooms.push({ name: "Corridor", type: "corridor", x: 0, y: northDepth, width: coreX, height: southY - northDepth, area: 0 });
    rooms.push({ name: "Corridor", type: "corridor", x: coreX + coreW, y: northDepth, width: W - coreX - coreW, height: southY - northDepth, area: 0 });
  }
  rooms.push({ name: "Core · lifts & stairs", type: "core", x: coreX, y: coreY, width: coreW, height: coreD, area: 0 });

  for (const r of rooms) {
    r.x = round(r.x); r.y = round(r.y); r.width = round(r.width); r.height = round(r.height);
    r.area = Math.round(r.width * r.height * 10.764); // ft², to match the Floor Plans schedule
  }
  const walls = rooms.flatMap((r) => [
    { x1: r.x, y1: r.y, x2: r.x + r.width, y2: r.y },
    { x1: r.x + r.width, y1: r.y, x2: r.x + r.width, y2: r.y + r.height },
    { x1: r.x, y1: r.y + r.height, x2: r.x + r.width, y2: r.y + r.height },
    { x1: r.x, y1: r.y, x2: r.x, y2: r.y + r.height },
  ]);
  return { rooms, walls, dimensions: { total_width: round(W), total_height: round(D) } };
}

/** Three typical-floor options for a building: efficient, daylit and flexible. */
export function planVariantsFromSpec(spec: BuildingSpec): PlanVariant[] {
  const options: [Parameters<typeof layout>[1], string, string][] = [
    ["double-loaded", "Option A — double-loaded", "Rooms on both long faces of a central corridor; best net-to-gross."],
    ["perimeter", "Option B — perimeter daylight", "Deeper perimeter zones keep every room within daylight reach."],
    ["open", "Option C — open plate", "One flexible open floor with support rooms banded along the core."],
  ];
  return options.map(([strategy, name, note]) => {
    const plan = layout(spec, strategy);
    const total = Math.round(spec.width * spec.depth * 10.764);
    const usable = plan.rooms.filter((r) => r.type !== "core" && r.type !== "corridor").reduce((s, r) => s + r.area, 0);
    return {
      variant_name: name,
      layout_json: plan,
      metrics: { total_area: total, efficiency_ratio: Math.round((usable / total) * 100) / 100, room_count: plan.rooms.filter((r) => r.type !== "corridor").length },
      notes: `${spec.name}: ${note}`,
    };
  });
}
