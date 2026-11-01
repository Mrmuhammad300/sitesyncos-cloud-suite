/**
 * Turns a plain-language prompt ("12-storey mass timber office with retail
 * podium") into a parametric building specification. The 3D viewer and the
 * generator render that spec procedurally, so every prompt yields a coherent,
 * recognisable building — even with no geometry service connected.
 *
 * All dimensions are metres.
 */

export type BuildingUse = "office" | "residential" | "retail" | "medical" | "mixed" | "industrial" | "education" | "hotel";
export type StructureSystem = "concrete" | "steel" | "timber";
export type FacadeSystem = "curtain" | "punched" | "fins" | "ribbon";
export type MassingForm = "slab" | "tower" | "l-shape" | "courtyard" | "stepped";

export interface BuildingSpec {
  /** Short display name derived from the prompt. */
  name: string;
  prompt: string;
  use: BuildingUse;
  structure: StructureSystem;
  facade: FacadeSystem;
  form: MassingForm;
  /** Typical (tower) floors above the podium. */
  floors: number;
  podiumFloors: number;
  floorHeight: number;
  podiumHeight: number;
  /** Tower footprint (width along X, depth along Z). */
  width: number;
  depth: number;
  /** Podium footprint (≥ tower). */
  podiumWidth: number;
  podiumDepth: number;
  /** Column grid spacing. */
  bay: number;
  balconies: boolean;
  greenRoof: boolean;
  basementLevels: number;
  /** Deterministic seed for small variations (mechanical units, trees…). */
  seed: number;
}

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, eighteen: 18,
  twenty: 20, "twenty-four": 24, thirty: 30, forty: 40, fifty: 50, single: 1, double: 2,
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round = (v: number, step = 0.5) => Math.round(v / step) * step;

function has(text: string, ...words: string[]) {
  return words.some((w) => new RegExp(`\\b${w}`, "i").test(text));
}

/** Extract an explicit storey count ("12-storey", "twelve story", "24 floors", "G+8"). */
function parseFloors(text: string): number | null {
  const unit = "(?:stor(?:e)?y|stories|storeys|floors?|levels?|fl\\b)";
  const numeric = text.match(new RegExp(`(\\d{1,3})\\s*[- ]?\\s*${unit}`, "i"));
  if (numeric) return parseInt(numeric[1], 10);
  const gPlus = text.match(/\bg\s*\+\s*(\d{1,3})\b/i);
  if (gPlus) return parseInt(gPlus[1], 10) + 1;
  const word = text.match(new RegExp(`\\b(${Object.keys(WORD_NUMBERS).join("|")})\\s*[- ]?\\s*${unit}`, "i"));
  if (word) return WORD_NUMBERS[word[1].toLowerCase()];
  if (/\bhigh[- ]?rise|skyscraper\b/i.test(text)) return 32;
  if (/\bmid[- ]?rise\b/i.test(text)) return 10;
  if (/\blow[- ]?rise\b/i.test(text)) return 3;
  return null;
}

/** Extract a gross floor area in m² from "5,000 sqft", "1200 m2", "4k sf". */
function parseArea(text: string): number | null {
  const m = text.match(/(\d[\d,.]*)\s*(k)?\s*(sq\.?\s*ft|sqft|sf|square\s*feet|ft2|m2|m²|sqm|square\s*met(?:er|re)s?)/i);
  if (!m) return null;
  let v = parseFloat(m[1].replace(/,/g, ""));
  if (m[2]) v *= 1000;
  const metric = /m2|m²|sqm|met/i.test(m[3]);
  return metric ? v : v * 0.0929;
}

function detectUse(text: string): BuildingUse {
  if (has(text, "mixed[- ]use", "mixed use")) return "mixed";
  if (has(text, "hospital", "clinic", "medical", "health", "surgery", "lab")) return "medical";
  if (has(text, "hotel", "hospitality", "resort")) return "hotel";
  if (has(text, "school", "campus", "universit", "classroom", "education", "library")) return "education";
  if (has(text, "warehouse", "logistics", "industrial", "factory", "distribution", "data cent")) return "industrial";
  if (has(text, "residen", "apartment", "condo", "housing", "bedroom", "flat", "dwelling", "home")) return "residential";
  if (has(text, "office", "workplace", "headquarters", "hq\\b", "cowork")) return "office";
  if (has(text, "retail", "shop", "store", "showroom", "mall", "market")) return "retail";
  return "office";
}

function detectStructure(text: string, use: BuildingUse): StructureSystem {
  if (has(text, "timber", "clt", "mass[- ]timber", "wood", "glulam")) return "timber";
  if (has(text, "steel", "industrial", "warehouse")) return "steel";
  if (has(text, "concrete", "precast", "post[- ]tension")) return "concrete";
  return use === "industrial" ? "steel" : "concrete";
}

function detectFacade(text: string, use: BuildingUse, structure: StructureSystem): FacadeSystem {
  if (has(text, "curtain", "glass", "glazed", "glazing")) return "curtain";
  if (has(text, "fins?", "louvre", "louver", "brise")) return "fins";
  if (has(text, "brick", "masonry", "punched", "stone")) return "punched";
  if (has(text, "ribbon", "band")) return "ribbon";
  if (structure === "timber") return "fins";
  if (use === "residential" || use === "hotel" || use === "medical") return "punched";
  if (use === "industrial") return "ribbon";
  return "curtain";
}

function detectName(text: string, use: BuildingUse, floors: number): string {
  const label: Record<BuildingUse, string> = {
    office: "Office", residential: "Residences", retail: "Retail Pavilion", medical: "Medical Center", mixed: "Mixed-Use Tower",
    industrial: "Logistics Hall", education: "Learning Center", hotel: "Hotel",
  };
  const kind = floors >= 8 && use !== "mixed" && use !== "industrial" ? `${label[use]} Tower` : label[use];
  const material = has(text, "timber", "clt", "wood") ? "Timber " : "";
  return `${floors}-Storey ${material}${kind}`.replace("Tower Tower", "Tower");
}

/** Parse a prompt into a full building specification. Pure and deterministic. */
export function specFromPrompt(rawPrompt: string): BuildingSpec {
  const prompt = rawPrompt.trim() || "8-storey office";
  // "Harbor Point Tower — 18-storey office…" → explicit name + description.
  const titled = prompt.match(/^(.{2,48}?)\s+[—–]\s+(.+)$/);
  const text = (titled ? titled[2] : prompt).toLowerCase();
  const seed = hash(text);
  const use = detectUse(text);
  const structure = detectStructure(text, use);
  const facade = detectFacade(text, use, structure);

  const defaults: Record<BuildingUse, { floors: number; fh: number; w: number; d: number }> = {
    office: { floors: 8, fh: 3.9, w: 36, d: 24 },
    residential: { floors: 12, fh: 3.1, w: 32, d: 18 },
    retail: { floors: 2, fh: 5.0, w: 48, d: 32 },
    medical: { floors: 4, fh: 4.2, w: 44, d: 28 },
    mixed: { floors: 16, fh: 3.4, w: 30, d: 22 },
    industrial: { floors: 1, fh: 11, w: 72, d: 44 },
    education: { floors: 3, fh: 4.0, w: 52, d: 22 },
    hotel: { floors: 18, fh: 3.2, w: 34, d: 18 },
  };
  const d = defaults[use];

  let total = parseFloors(text) ?? d.floors;
  total = clamp(total, 1, 60);

  const wantsPodium = has(text, "podium", "base", "plinth") || use === "mixed" || (has(text, "retail", "shops?") && use !== "retail");
  let podiumFloors = wantsPodium && total >= 4 ? clamp(Math.round(total * 0.18), 1, 4) : 0;
  if (has(text, "podium") && podiumFloors === 0 && total >= 2) podiumFloors = 1;
  const floors = Math.max(total - podiumFloors, 1);

  // Footprint: honour an explicit area as typical-floor plate, else use-type defaults.
  let width = d.w;
  let depth = d.d;
  const area = parseArea(text);
  if (area) {
    const plate = clamp(total > 1 && area > 2500 ? area / total : area, 120, 6000);
    const aspect = d.w / d.d;
    depth = round(Math.sqrt(plate / aspect));
    width = round(plate / depth);
  }
  width = clamp(width, 10, 120);
  depth = clamp(depth, 8, 80);
  const slender = floors >= 20;
  if (slender) {
    width = Math.min(width, 34);
    depth = Math.min(depth, 26);
  }

  let form: MassingForm = floors >= 8 ? "tower" : "slab";
  if (has(text, "courtyard", "atrium")) form = "courtyard";
  else if (has(text, "l[- ]shape", "wing")) form = "l-shape";
  else if (has(text, "stepped", "terrace", "setback", "ziggurat")) form = "stepped";

  const podiumScale = podiumFloors ? 1.45 : 1;
  return {
    name: titled ? titled[1] : detectName(text, use, total),
    prompt,
    use,
    structure,
    facade,
    form,
    floors,
    podiumFloors,
    floorHeight: has(text, "high ceiling", "double[- ]height") ? d.fh + 1.2 : d.fh,
    podiumHeight: use === "industrial" ? d.fh : 5.2,
    width,
    depth,
    podiumWidth: round(Math.min(width * podiumScale, 120)),
    podiumDepth: round(Math.min(depth * (podiumFloors ? 1.35 : 1), 80)),
    bay: structure === "timber" ? 6 : use === "industrial" ? 12 : 8,
    balconies: has(text, "balcon", "terrace") || (use === "residential" && !has(text, "no balcon")) || use === "hotel",
    greenRoof: has(text, "green roof", "roof garden", "rooftop garden", "sustainab", "net[- ]zero", "biophilic"),
    basementLevels: has(text, "basement", "underground", "parking") ? 2 : 0,
    seed,
  };
}

/** Overall height in metres (excluding rooftop plant). */
export function buildingHeight(s: BuildingSpec): number {
  return s.podiumFloors * s.podiumHeight + s.floors * s.floorHeight;
}

/** Gross floor area in m², adjusted for courtyard voids and stepped massing. */
export function grossFloorArea(s: BuildingSpec): number {
  const formFactor = s.form === "courtyard" ? 0.72 : s.form === "l-shape" ? 0.78 : s.form === "stepped" ? 0.85 : 1;
  return Math.round(s.podiumFloors * s.podiumWidth * s.podiumDepth + s.floors * s.width * s.depth * formFactor);
}

/** Approximate BIM element counts per discipline, for layer panels. */
export function elementCounts(s: BuildingSpec) {
  const levels = s.floors + s.podiumFloors;
  const cols = (Math.floor(s.width / s.bay) + 1) * (Math.floor(s.depth / s.bay) + 1);
  const perim = 2 * (s.width + s.depth);
  return {
    structural: levels * (cols + 6) + 40,
    hvac: levels * 18 + 24,
    plumbing: levels * 12 + 16,
    electrical: levels * 22 + 30,
    architectural: Math.round(levels * perim * 0.9) + 60,
    site: 120 + s.basementLevels * 80,
  };
}

/** Curated models shown in the 3D Viewer. */
export const SAMPLE_BUILDINGS: { id: string; prompt: string; format: string; updated: string }[] = [
  { id: "harbor-point", prompt: "Harbor Point Tower — 18-storey glass office tower on a 3-storey retail podium with green roof", format: "IFC", updated: "2026-03-28" },
  { id: "cedar-flats", prompt: "Cedar Flats — 9-storey mass timber residential building with balconies, l-shape", format: "IFC", updated: "2026-03-30" },
  { id: "riverside", prompt: "Riverside Medical Pavilion — 5-storey medical clinic with courtyard, brick facade", format: "RVT", updated: "2026-04-01" },
  { id: "north-yard", prompt: "North Yard Logistics Hub — single storey steel warehouse, 9,000 m2", format: "IFC", updated: "2026-04-03" },
];
