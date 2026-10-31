/**
 * Converts a BuildingSpec into categorised, instanced boxes. Everything is a
 * box in metres: [x, y, z] is the box centre, [w, h, d] its size. The renderer
 * draws each part as one InstancedMesh, so even a 40-storey tower is only a
 * few dozen draw calls.
 */
import type { BuildingSpec } from "./buildingSpec";

export type Discipline = "structural" | "architectural" | "hvac" | "plumbing" | "electrical" | "site";
export type MaterialKey =
  | "slab" | "column" | "core" | "glass" | "mullion" | "spandrel" | "cladding" | "window" | "fin" | "balcony"
  | "rail" | "roof" | "parapet" | "plant" | "green" | "duct" | "pipe" | "tray" | "pad" | "paving" | "road"
  | "trunk" | "canopy" | "storefront" | "awning";

export interface Box {
  p: [number, number, number];
  s: [number, number, number];
  /** Human label for the inspector, e.g. "Column C-04". */
  label: string;
  level: string;
  /** Bottom elevation, for build-up animation ordering. */
  y0: number;
}

export interface Part {
  key: string;
  discipline: Discipline;
  material: MaterialKey;
  boxes: Box[];
  /** Round shapes (trees) render as spheres instead of boxes. */
  shape?: "box" | "sphere" | "cylinder";
}

export interface BuildingGeometry {
  parts: Part[];
  height: number;
  /** Half-extent of the site footprint, for camera framing. */
  radius: number;
  levels: { name: string; elevation: number }[];
}

interface Mass {
  x: number;
  z: number;
  w: number;
  d: number;
  y0: number;
  levels: number;
  fh: number;
  firstLevel: number;
  podium: boolean;
}

function rng(seed: number) {
  let t = seed || 1;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const lvl = (n: number) => (n === 0 ? "Ground" : `Level ${n}`);

function masses(s: BuildingSpec): Mass[] {
  const out: Mass[] = [];
  const podH = s.podiumFloors * s.podiumHeight;
  if (s.podiumFloors) {
    out.push({ x: 0, z: 0, w: s.podiumWidth, d: s.podiumDepth, y0: 0, levels: s.podiumFloors, fh: s.podiumHeight, firstLevel: 0, podium: true });
  }
  const base = { y0: podH, fh: s.floorHeight, firstLevel: s.podiumFloors, podium: false };
  const W = s.width;
  const D = s.depth;
  // Towers sit toward the back of a podium, leaving a street-front terrace.
  const zOff = s.podiumFloors ? -(s.podiumDepth - D) / 4 : 0;
  switch (s.form) {
    case "l-shape": {
      const wingD = Math.max(D * 0.48, 9);
      const wingW = Math.max(W * 0.42, 10);
      out.push({ ...base, x: 0, z: zOff - D / 2 + wingD / 2, w: W, d: wingD, levels: s.floors });
      out.push({ ...base, x: -W / 2 + wingW / 2, z: zOff + wingD / 2, w: wingW, d: D - wingD, levels: s.floors });
      break;
    }
    case "courtyard": {
      const t = Math.max(Math.min(W, D) * 0.28, 8);
      out.push({ ...base, x: 0, z: zOff - D / 2 + t / 2, w: W, d: t, levels: s.floors });
      out.push({ ...base, x: 0, z: zOff + D / 2 - t / 2, w: W, d: t, levels: s.floors });
      out.push({ ...base, x: -W / 2 + t / 2, z: zOff, w: t, d: D - 2 * t, levels: s.floors });
      out.push({ ...base, x: W / 2 - t / 2, z: zOff, w: t, d: D - 2 * t, levels: s.floors });
      break;
    }
    case "stepped": {
      const tiers = Math.min(3, s.floors);
      let remaining = s.floors;
      let y = podH;
      let level = s.podiumFloors;
      for (let i = 0; i < tiers; i++) {
        const n = i === tiers - 1 ? remaining : Math.ceil(s.floors / tiers);
        const k = 1 - i * 0.2;
        out.push({ x: 0, z: zOff - (D - D * k) / 2, w: W * k, d: D * k, y0: y, levels: n, fh: s.floorHeight, firstLevel: level, podium: false });
        y += n * s.floorHeight;
        level += n;
        remaining -= n;
      }
      break;
    }
    default:
      out.push({ ...base, x: 0, z: zOff, w: W, d: D, levels: s.floors });
  }
  return out;
}

/** Points along a span, evenly spaced at ≈`step`, inset from the ends. */
function stations(len: number, step: number, inset = 0) {
  const usable = len - inset * 2;
  const n = Math.max(1, Math.round(usable / step));
  return Array.from({ length: n + 1 }, (_, i) => -usable / 2 + (usable / n) * i);
}

export function buildGeometry(s: BuildingSpec): BuildingGeometry {
  const r = rng(s.seed);
  const P: Record<string, Part> = {};
  const part = (key: string, discipline: Discipline, material: MaterialKey, shape: Part["shape"] = "box") =>
    (P[key] ??= { key, discipline, material, boxes: [], shape });
  const add = (key: string, discipline: Discipline, material: MaterialKey, b: Box, shape?: Part["shape"]) => part(key, discipline, material, shape).boxes.push(b);

  const ms = masses(s);
  const slabT = s.structure === "timber" ? 0.32 : 0.28;
  let colN = 0;
  let height = 0;

  for (const m of ms) {
    const top = m.y0 + m.levels * m.fh;
    height = Math.max(height, top);
    const sides: { axis: "x" | "z"; sign: 1 | -1; len: number; name: string }[] = [
      { axis: "z", sign: 1, len: m.w, name: "South" },
      { axis: "z", sign: -1, len: m.w, name: "North" },
      { axis: "x", sign: 1, len: m.d, name: "East" },
      { axis: "x", sign: -1, len: m.d, name: "West" },
    ];
    const facePos = (side: (typeof sides)[number], t: number, out: number): [number, number] =>
      side.axis === "z" ? [m.x + t, m.z + side.sign * (m.d / 2 + out)] : [m.x + side.sign * (m.w / 2 + out), m.z + t];
    const faceSize = (side: (typeof sides)[number], along: number, thick: number): [number, number] =>
      side.axis === "z" ? [along, thick] : [thick, along];

    // ── Structure: slabs, columns, core ─────────────────────────────────
    for (let i = 0; i <= m.levels; i++) {
      const y = m.y0 + i * m.fh;
      const isRoof = i === m.levels;
      if (i === 0 && m.y0 > 0) continue; // podium roof already acts as this slab
      add(isRoof ? "roof" : "slabs", "structural", isRoof ? "roof" : "slab", {
        p: [m.x, y + slabT / 2 - (i === 0 ? 0 : slabT), m.z],
        s: [m.w + (isRoof ? 0 : 0.6), slabT, m.d + (isRoof ? 0 : 0.6)],
        label: isRoof ? "Roof slab" : `Floor slab ${lvl(m.firstLevel + i)}`,
        level: isRoof ? "Roof" : lvl(m.firstLevel + i),
        y0: y,
      });
    }
    const cx = stations(m.w, s.bay, 0.9);
    const cz = stations(m.d, s.bay, 0.9);
    const colW = s.structure === "timber" ? 0.55 : s.structure === "steel" ? 0.4 : 0.6;
    for (const x of cx) for (const z of cz) {
      colN++;
      add("columns", "structural", "column", {
        p: [m.x + x, m.y0 + (m.levels * m.fh) / 2, m.z + z],
        s: [colW, m.levels * m.fh, colW],
        label: `Column C-${String(colN).padStart(2, "0")}`,
        level: `${lvl(m.firstLevel)} – ${lvl(m.firstLevel + m.levels)}`,
        y0: m.y0,
      });
    }
    const hasCore = m.levels * m.fh > 9 && Math.min(m.w, m.d) > 10 && s.use !== "industrial";
    if (hasCore && (!m.podium || ms.length === 1)) {
      const cw = Math.min(9, m.w * 0.28);
      const cd = Math.min(7, m.d * 0.34);
      const overrun = m === ms[ms.length - 1] || ms.length === 1 ? 2.4 : 0;
      add("core", "structural", "core", {
        p: [m.x, m.y0 + (m.levels * m.fh + overrun) / 2, m.z],
        s: [cw, m.levels * m.fh + overrun, cd],
        label: "Lift & stair core",
        level: `${lvl(m.firstLevel)} – Roof`,
        y0: m.y0,
      });
      // ── MEP: risers in the core, ducts and trays on each floor ─────────
      [-1, 1].forEach((k, i) =>
        add("risers", "plumbing", "pipe", {
          p: [m.x + k * (cw / 2 + 0.5), m.y0 + (m.levels * m.fh) / 2, m.z + cd / 2 + 0.4],
          s: [0.22, m.levels * m.fh, 0.22],
          label: `Riser ${i ? "DW-E" : "DW-W"}`,
          level: `${lvl(m.firstLevel)} – Roof`,
          y0: m.y0,
        }, "cylinder"),
      );
    }
    for (let i = 0; i < m.levels; i++) {
      const y = m.y0 + (i + 1) * m.fh - slabT - 0.45;
      add("ducts", "hvac", "duct", {
        p: [m.x, y, m.z - m.d * 0.18], s: [m.w * 0.82, 0.42, 0.7],
        label: `Supply duct SD-${m.firstLevel + i + 1}`, level: lvl(m.firstLevel + i), y0: y,
      });
      add("trays", "electrical", "tray", {
        p: [m.x + m.w * 0.22, y + 0.05, m.z], s: [0.35, 0.1, m.d * 0.8],
        label: `Cable tray EC-${m.firstLevel + i + 1}`, level: lvl(m.firstLevel + i), y0: y,
      });
    }

    // ── Envelope ────────────────────────────────────────────────────────
    const facade = m.podium ? "curtain" : s.facade;
    const H = m.levels * m.fh;
    for (const side of sides) {
      const mullStep = facade === "fins" ? 1.2 : 1.5;
      for (let i = 0; i < m.levels; i++) {
        const y0 = m.y0 + i * m.fh;
        const L = lvl(m.firstLevel + i);
        const groundRetail = m.podium && i === 0;
        if (facade === "punched") {
          // Solid cladding with punched windows.
          const [px, pz] = facePos(side, 0, 0.12);
          const [sx, sz] = faceSize(side, side.len, 0.24);
          add("cladding", "architectural", "cladding", { p: [px, y0 + m.fh / 2, pz], s: [sx, m.fh, sz], label: `${side.name} facade panel`, level: L, y0 });
          for (const t of stations(side.len, 3.2, 1.6)) {
            const [wx, wz] = facePos(side, t, 0.27);
            const [wsx, wsz] = faceSize(side, 1.7, 0.08);
            add("windows", "architectural", "window", { p: [wx, y0 + m.fh * 0.52, wz], s: [wsx, m.fh * 0.58, wsz], label: `${side.name} window`, level: L, y0 });
          }
        } else {
          const glassH = facade === "ribbon" ? m.fh * 0.55 : m.fh - 0.05;
          const glassY = facade === "ribbon" ? y0 + m.fh * 0.55 : y0 + m.fh / 2;
          const [gx, gz] = facePos(side, 0, 0.05);
          const [gsx, gsz] = faceSize(side, side.len, 0.06);
          add(groundRetail ? "storefront" : "glass", "architectural", groundRetail ? "storefront" : "glass", {
            p: [gx, glassY, gz], s: [gsx, glassH, gsz], label: groundRetail ? `${side.name} storefront` : `${side.name} curtain wall`, level: L, y0,
          });
          const bandH = facade === "ribbon" ? m.fh * 0.45 : 0.75;
          const [bx, bz] = facePos(side, 0, 0.1);
          const [bsx, bsz] = faceSize(side, side.len + 0.2, 0.14);
          add("spandrels", "architectural", "spandrel", { p: [bx, y0 + bandH / 2, bz], s: [bsx, bandH, bsz], label: `${side.name} spandrel`, level: L, y0 });
        }
      }
      if (facade !== "punched") {
        // Vertical mullions / fins run the full height of the mass.
        for (const t of stations(side.len, mullStep)) {
          const [mx, mz] = facePos(side, t, facade === "fins" ? 0.35 : 0.1);
          const [msx, msz] = faceSize(side, facade === "fins" ? 0.18 : 0.08, facade === "fins" ? 0.7 : 0.16);
          add(facade === "fins" ? "fins" : "mullions", "architectural", facade === "fins" ? "fin" : "mullion", {
            p: [mx, m.y0 + H / 2, mz], s: [msx, H, msz], label: `${side.name} ${facade === "fins" ? "timber fin" : "mullion"}`, level: "Full height", y0: m.y0,
          });
        }
      }
      // Balconies on the long faces of residential/hotel towers.
      if (s.balconies && !m.podium && side.axis === "z") {
        for (let i = 1; i < m.levels; i++) {
          const y0 = m.y0 + i * m.fh;
          for (const t of stations(side.len, 6.5, 3.5)) {
            if (Math.abs(t) < 3) continue;
            const [bx, bz] = facePos(side, t, 0.85);
            add("balconies", "architectural", "balcony", { p: [bx, y0 + 0.12, bz], s: [3.6, 0.24, 1.7], label: "Balcony slab", level: lvl(m.firstLevel + i), y0 });
            const [rx, rz] = facePos(side, t, 1.65);
            add("rails", "architectural", "rail", { p: [rx, y0 + 0.65, rz], s: [3.6, 1.05, 0.06], label: "Glass balustrade", level: lvl(m.firstLevel + i), y0 });
          }
        }
      }
    }

    // ── Roof: parapet, plant, green roof ────────────────────────────────
    const isTop = !ms.some((o) => o !== m && o.y0 >= top - 0.1 && Math.abs(o.x - m.x) < m.w / 2 && Math.abs(o.z - m.z) < m.d / 2);
    for (const side of sides) {
      const [px, pz] = facePos(side, 0, -0.1);
      const [sx, sz] = faceSize(side, side.len, 0.25);
      add("parapet", "architectural", "parapet", { p: [px, top + 0.55, pz], s: [sx, 1.1, sz], label: "Parapet", level: "Roof", y0: top });
    }
    if (isTop && !m.podium) {
      if (s.greenRoof) {
        add("green", "site", "green", { p: [m.x, top + 0.18, m.z], s: [m.w * 0.84, 0.3, m.d * 0.8], label: "Green roof", level: "Roof", y0: top });
      }
      const units = 2 + Math.floor(r() * 3);
      for (let i = 0; i < units; i++) {
        const w = 2.5 + r() * 3.5;
        const d = 2 + r() * 2.5;
        const h = 1.6 + r() * 1.6;
        add("plant", "hvac", "plant", {
          p: [m.x + (r() - 0.5) * (m.w * 0.55), top + h / 2, m.z + (r() - 0.5) * (m.d * 0.5)],
          s: [w, h, d], label: i === 0 ? "Air handling unit AHU-1" : `Rooftop unit RTU-${i}`, level: "Roof", y0: top,
        });
      }
    } else if (isTop && m.podium && s.greenRoof) {
      add("green", "site", "green", { p: [m.x, top + 0.18, m.z + m.d * 0.3], s: [m.w * 0.9, 0.3, m.d * 0.28], label: "Podium roof garden", level: "Podium roof", y0: top });
    }
  }

  // Entrance canopy on the street (south) face of the ground floor.
  const ground = ms[0];
  add("awning", "architectural", "awning", {
    p: [ground.x, Math.min(ground.fh, 5) - 0.6, ground.z + ground.d / 2 + 1.6], s: [Math.min(ground.w * 0.4, 16), 0.25, 3.2],
    label: "Entrance canopy", level: "Ground", y0: 3,
  });

  // ── Site: pad, paving, road, trees ───────────────────────────────────
  const foot = s.podiumFloors ? { w: s.podiumWidth, d: s.podiumDepth } : { w: Math.max(...ms.map((m) => Math.abs(m.x) + m.w / 2)) * 2, d: Math.max(...ms.map((m) => Math.abs(m.z) + m.d / 2)) * 2 };
  const siteW = foot.w + 24;
  const siteD = foot.d + 26;
  add("pad", "site", "pad", { p: [0, -0.06, 2], s: [siteW, 0.12, siteD], label: "Site pad", level: "Grade", y0: -0.1 });
  add("paving", "site", "paving", { p: [0, 0.02, foot.d / 2 + 6], s: [siteW, 0.06, 8], label: "Plaza paving", level: "Grade", y0: 0 });
  add("road", "site", "road", { p: [0, -0.02, foot.d / 2 + 15], s: [siteW + 40, 0.04, 9], label: "Street", level: "Grade", y0: 0 });
  const trees = Math.max(4, Math.round(siteW / 9));
  for (let i = 0; i < trees; i++) {
    const x = -siteW / 2 + 5 + ((siteW - 10) / Math.max(trees - 1, 1)) * i + (r() - 0.5) * 2;
    const z = foot.d / 2 + 9.5 + (r() - 0.5) * 1.2;
    const h = 3 + r() * 2;
    add("trunks", "site", "trunk", { p: [x, h / 2, z], s: [0.3, h, 0.3], label: "Street tree", level: "Grade", y0: 0 }, "cylinder");
    const c = 2.4 + r() * 1.4;
    add("canopies", "site", "canopy", { p: [x, h + c * 0.35, z], s: [c, c * 0.9, c], label: "Street tree", level: "Grade", y0: 0 }, "sphere");
  }

  const levels: { name: string; elevation: number }[] = [];
  for (const m of ms) for (let i = 0; i < m.levels; i++) {
    const name = lvl(m.firstLevel + i);
    if (!levels.some((l) => l.name === name)) levels.push({ name, elevation: m.y0 + i * m.fh });
  }
  levels.push({ name: "Roof", elevation: height });

  return {
    parts: Object.values(P),
    height,
    radius: Math.max(siteW, siteD, height * 0.8) / 2,
    levels,
  };
}
