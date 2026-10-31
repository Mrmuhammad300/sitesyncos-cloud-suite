/**
 * Natural-language design edits for the Design Assistant. Each instruction is
 * applied to the current BuildingSpec and produces a new version plus a plain
 * description of what changed — so the conversation and the 3D model stay in
 * sync, and every version can be restored.
 */
import { specFromPrompt, type BuildingSpec, type BuildingUse, type FacadeSystem, type MassingForm, type StructureSystem } from "./buildingSpec";

export interface DesignEdit {
  spec: BuildingSpec;
  changes: string[];
}

const NUM: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, couple: 2, few: 3 };

function count(text: string, fallback: number): number {
  const m = text.match(/(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|couple|few)\s+(?:more\s+|extra\s+|additional\s+)?(?:floors?|stor(?:e)?ys?|stories|levels?)/i);
  if (!m) return fallback;
  return /\d/.test(m[1]) ? parseInt(m[1], 10) : NUM[m[1].toLowerCase()] ?? fallback;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const has = (t: string, re: RegExp) => re.test(t);

/** Apply one instruction. Unrecognised instructions return the spec unchanged with no changes. */
export function applyDesignInstruction(prev: BuildingSpec, instruction: string): DesignEdit {
  const t = instruction.toLowerCase();
  const s: BuildingSpec = { ...prev, prompt: `${prev.prompt}; ${instruction}` };
  const changes: string[] = [];
  const total = () => s.floors + s.podiumFloors;

  // ── Height ──────────────────────────────────────────────────────────
  const setTo = t.match(/\b(?:make it|to|at|set to|total of)\s+(\d{1,2})\s*[- ]?(?:floors?|stor(?:e)?ys?|stories|levels?)/i);
  if (setTo) {
    const target = clamp(parseInt(setTo[1], 10), 1, 60);
    s.floors = Math.max(target - s.podiumFloors, 1);
    changes.push(`Set height to ${total()} storeys`);
  } else if (has(t, /\b(add|more|extra|another|taller|higher|increase (the )?height|go up)\b/) && has(t, /floor|stor|level|taller|higher|height|go up/)) {
    const n = count(t, has(t, /taller|higher|height/) ? 3 : 1);
    s.floors = clamp(s.floors + n, 1, 60 - s.podiumFloors);
    changes.push(`Added ${n} floor${n === 1 ? "" : "s"} (now ${total()} storeys)`);
  } else if (has(t, /\b(remove|fewer|less|lose|drop|shorter|lower|reduce (the )?height|cut)\b/) && has(t, /floor|stor|level|shorter|lower|height/)) {
    const n = count(t, has(t, /shorter|lower|height/) ? 2 : 1);
    s.floors = clamp(s.floors - n, 1, 60);
    changes.push(`Removed ${n} floor${n === 1 ? "" : "s"} (now ${total()} storeys)`);
  }

  // ── Structure ───────────────────────────────────────────────────────
  const structure: [RegExp, StructureSystem, string][] = [
    [/\b(timber|clt|mass timber|wood(en)?|glulam)\b/, "timber", "Switched the structure to mass timber"],
    [/\bsteel\b/, "steel", "Switched the structure to steel frame"],
    [/\b(concrete|post[- ]tension)/, "concrete", "Switched the structure to reinforced concrete"],
  ];
  for (const [re, v, msg] of structure) {
    if (has(t, re) && !has(t, /facade|cladding|fins?/) && s.structure !== v) {
      s.structure = v;
      s.bay = v === "timber" ? 6 : v === "steel" ? 9 : 8;
      changes.push(msg);
      break;
    }
  }

  // ── Facade / daylight ───────────────────────────────────────────────
  const facade: [RegExp, FacadeSystem, string][] = [
    [/\b(curtain wall|all[- ]glass|glass facade|fully glazed|natural light|more light|daylight|brighter|bigger windows|more glass)\b/, "curtain", "Opened the facade to a full-height curtain wall for daylight"],
    [/\b(fins?|louv(re|er)s?|shading|brise|solar control|reduce (heat|glare))\b/, "fins", "Added vertical fins for solar shading"],
    [/\b(brick|masonry|punched|stone|solid facade|fewer windows|more privacy)\b/, "punched", "Changed to a masonry facade with punched windows"],
    [/\b(ribbon|horizontal bands?|strip windows)\b/, "ribbon", "Switched to ribbon glazing with horizontal bands"],
  ];
  for (const [re, v, msg] of facade) {
    if (has(t, re) && s.facade !== v) {
      s.facade = v;
      changes.push(msg);
      break;
    }
  }

  // ── Form ────────────────────────────────────────────────────────────
  const form: [RegExp, MassingForm, string][] = [
    [/\b(courtyard|atrium|light well)\b/, "courtyard", "Reshaped the plan around a central courtyard"],
    [/\b(l[- ]shape|wings?)\b/, "l-shape", "Reshaped the plan into an L with two wings"],
    [/\b(stepped|terraces?|setbacks?|step back)\b/, "stepped", "Stepped the massing back in three tiers"],
    [/\b(simple box|single block|rectangular|compact)\b/, "tower", "Simplified the massing to a single block"],
  ];
  for (const [re, v, msg] of form) {
    if (has(t, re) && s.form !== v) {
      s.form = v;
      changes.push(msg);
      break;
    }
  }

  // ── Features ────────────────────────────────────────────────────────
  if (has(t, /\b(add|with|include|give it)\b.*\bbalcon/) || (has(t, /balcon/) && !has(t, /remove|no |without|drop/))) {
    if (!s.balconies) { s.balconies = true; changes.push("Added balconies to the long elevations"); }
  } else if (has(t, /(remove|no|without|drop).*balcon/) && s.balconies) {
    s.balconies = false;
    changes.push("Removed the balconies");
  }
  if (has(t, /green roof|roof garden|rooftop garden|planting|biophilic|more green|sustainab|net[- ]zero/) && !s.greenRoof) {
    s.greenRoof = true;
    changes.push("Added a planted green roof");
  }
  if (has(t, /(add|with|create).*podium|retail (base|ground floor)|active ground floor/) && !s.podiumFloors) {
    s.podiumFloors = 2;
    s.floors = Math.max(s.floors - 1, 1);
    s.podiumWidth = Math.round(s.width * 1.45);
    s.podiumDepth = Math.round(s.depth * 1.35);
    changes.push("Added a 2-storey glazed podium");
  } else if (has(t, /(remove|no|without|drop).*podium/) && s.podiumFloors) {
    s.floors += s.podiumFloors;
    s.podiumFloors = 0;
    s.podiumWidth = s.width;
    s.podiumDepth = s.depth;
    changes.push("Removed the podium");
  }

  // ── Footprint & efficiency ──────────────────────────────────────────
  if (has(t, /\b(wider|bigger footprint|larger (floor )?plates?|more floor area|expand)\b/)) {
    s.width = Math.round(Math.min(s.width * 1.2, 110));
    s.depth = Math.round(Math.min(s.depth * 1.1, 70));
    changes.push(`Enlarged the floor plate to ${s.width} × ${s.depth} m`);
  } else if (has(t, /\b(narrower|slimmer|thinner|smaller footprint|smaller (floor )?plates?)\b/)) {
    s.width = Math.round(Math.max(s.width * 0.85, 12));
    s.depth = Math.round(Math.max(s.depth * 0.85, 10));
    changes.push(`Slimmed the floor plate to ${s.width} × ${s.depth} m`);
  } else if (has(t, /\b(efficien|optimi[sz]e|net[- ]to[- ]gross)\b/)) {
    // Shallower plates put more area within daylight distance of the facade.
    s.depth = Math.round(Math.max(Math.min(s.depth, 18), 12));
    if (s.form === "courtyard" || s.form === "stepped") s.form = "tower";
    changes.push(`Tightened the plate depth to ${s.depth} m for a more efficient, daylit floor`);
  }

  // ── Use ─────────────────────────────────────────────────────────────
  const uses: [RegExp, BuildingUse][] = [
    [/\b(residential|apartments?|condos?|housing)\b/, "residential"], [/\boffices?\b/, "office"], [/\bhotel\b/, "hotel"],
    [/\b(clinic|medical|hospital)\b/, "medical"], [/\bmixed[- ]use\b/, "mixed"],
  ];
  if (has(t, /\b(convert|change|make it|turn it into|switch)\b/)) {
    for (const [re, v] of uses) {
      if (has(t, re) && s.use !== v) {
        s.use = v;
        s.floorHeight = v === "residential" || v === "hotel" ? 3.1 : v === "medical" ? 4.2 : 3.9;
        changes.push(`Changed the use to ${v}`);
        break;
      }
    }
  }

  // A fresh brief ("design a 20-storey hotel…") replaces the model entirely.
  if (!changes.length && has(t, /\b(design|create|start (over|again)|new (building|design)|build me)\b/)) {
    const fresh = specFromPrompt(instruction);
    return { spec: fresh, changes: [`Started a new design: ${fresh.name}`] };
  }

  if (changes.length) s.name = prev.name.replace(/^\d+-Storey/, `${total()}-Storey`);
  return { spec: changes.length ? s : prev, changes };
}

export const DESIGN_SUGGESTIONS = [
  "Add 4 more floors",
  "Make it mass timber",
  "Increase natural light",
  "Add balconies and a green roof",
  "Reshape it around a courtyard",
  "Make the floor plate more efficient",
];

export interface DesignVariant { key: string; label: string; summary: string; spec: BuildingSpec }

/** Three meaningfully different alternatives to a design, for side-by-side comparison. */
export function designVariants(base: BuildingSpec): DesignVariant[] {
  const total = base.floors + base.podiumFloors;
  const slender: BuildingSpec = {
    ...base,
    floors: Math.min(base.floors + Math.max(3, Math.round(total * 0.35)), 60 - base.podiumFloors),
    width: Math.max(Math.round(base.width * 0.8), 12),
    depth: Math.max(Math.round(base.depth * 0.8), 10),
    form: "tower",
  };
  const timber: BuildingSpec = {
    ...base,
    structure: base.structure === "timber" ? "concrete" : "timber",
    facade: base.structure === "timber" ? "curtain" : "fins",
    bay: base.structure === "timber" ? 8 : 6,
    greenRoof: true,
  };
  const groundscraper: BuildingSpec = {
    ...base,
    floors: Math.max(Math.round(base.floors * 0.55), 2),
    width: Math.min(Math.round(base.width * 1.45), 110),
    depth: Math.min(Math.round(base.depth * 1.3), 70),
    podiumFloors: 0,
    podiumWidth: Math.min(Math.round(base.width * 1.45), 110),
    podiumDepth: Math.min(Math.round(base.depth * 1.3), 70),
    form: "courtyard",
    balconies: base.balconies,
  };
  const v = (key: string, label: string, summary: string, spec: BuildingSpec): DesignVariant => ({
    key, label, summary, spec: { ...spec, name: `${base.name} · ${label}`, seed: base.seed + key.charCodeAt(0) },
  });
  return [
    v("A", "Slender tower", `${slender.floors + slender.podiumFloors} storeys on a ${slender.width}×${slender.depth} m plate — smaller footprint, more open space at grade.`, slender),
    v("B", timber.structure === "timber" ? "Mass timber" : "Concrete frame", timber.structure === "timber" ? "CLT and glulam frame with timber fins and a green roof — lower embodied carbon." : "Concrete frame with curtain wall — longer spans and simpler fire strategy.", timber),
    v("C", "Courtyard block", `${groundscraper.floors} storeys around a courtyard — deep daylight and a shared garden.`, groundscraper),
  ];
}
