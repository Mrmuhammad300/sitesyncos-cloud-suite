/**
 * Geometric clash detection over a building's parts. MEP runs are tested
 * against structure (hard clashes) and against each other (coordination
 * clashes) using axis-aligned box overlap — the same first pass a BIM
 * coordinator runs before detailed review.
 */
import type { Box, BuildingGeometry, Part } from "./buildingGeometry";

export type ClashSeverity = "critical" | "major" | "minor";

export interface ClashElement { id: string; label: string; level: string; part: string }
export interface Clash {
  id: string;
  severity: ClashSeverity;
  a: ClashElement;
  b: ClashElement;
  /** Overlap volume in m³ — a rough measure of how bad the clash is. */
  overlap: number;
  /** Clash location (scene metres), for focusing the camera. */
  point: [number, number, number];
  description: string;
}

/** Which part pairs are tested, and how serious an overlap is. */
const RULES: { a: string; b: string; severity: ClashSeverity; what: string }[] = [
  { a: "ducts", b: "columns", severity: "critical", what: "Supply duct runs through a structural column" },
  { a: "ducts", b: "core", severity: "critical", what: "Supply duct penetrates the core wall" },
  { a: "trays", b: "columns", severity: "major", what: "Cable tray clashes with a column" },
  { a: "trays", b: "ducts", severity: "major", what: "Cable tray crosses the supply duct at the same height" },
  { a: "risers", b: "ducts", severity: "minor", what: "Riser conflicts with a duct branch" },
];

function overlap(a: Box, b: Box): number {
  let vol = 1;
  for (let i = 0; i < 3; i++) {
    const lo = Math.max(a.p[i] - a.s[i] / 2, b.p[i] - b.s[i] / 2);
    const hi = Math.min(a.p[i] + a.s[i] / 2, b.p[i] + b.s[i] / 2);
    if (hi <= lo) return 0;
    vol *= hi - lo;
  }
  return vol;
}

function centre(a: Box, b: Box): [number, number, number] {
  return [0, 1, 2].map((i) => {
    const lo = Math.max(a.p[i] - a.s[i] / 2, b.p[i] - b.s[i] / 2);
    const hi = Math.min(a.p[i] + a.s[i] / 2, b.p[i] + b.s[i] / 2);
    return (lo + hi) / 2;
  }) as [number, number, number];
}

const el = (part: Part, i: number): ClashElement => ({ id: `${part.key}#${i}`, label: part.boxes[i].label, level: part.boxes[i].level, part: part.key });

export function detectClashes(geo: BuildingGeometry): Clash[] {
  const byKey = new Map(geo.parts.map((p) => [p.key, p]));
  const out: Clash[] = [];
  for (const rule of RULES) {
    const A = byKey.get(rule.a);
    const B = byKey.get(rule.b);
    if (!A || !B) continue;
    A.boxes.forEach((a, i) => {
      B.boxes.forEach((b, j) => {
        const v = overlap(a, b);
        if (v <= 1e-4) return;
        out.push({
          id: `${rule.a}#${i}:${rule.b}#${j}`,
          severity: rule.severity,
          a: el(A, i),
          b: el(B, j),
          overlap: Math.round(v * 1000) / 1000,
          point: centre(a, b),
          description: rule.what,
        });
      });
    });
  }
  const rank: Record<ClashSeverity, number> = { critical: 0, major: 1, minor: 2 };
  return out.sort((x, y) => rank[x.severity] - rank[y.severity] || y.overlap - x.overlap);
}
