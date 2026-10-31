import { beforeEach, describe, expect, it } from "vitest";
import { specFromPrompt, SAMPLE_BUILDINGS } from "@/lib/spatial/buildingSpec";
import { applyDesignInstruction, designVariants } from "@/lib/spatial/designEdits";
import { planVariantsFromSpec } from "@/lib/spatial/floorPlan";
import { buildGeometry } from "@/lib/spatial/buildingGeometry";
import { detectClashes } from "@/lib/spatial/clashes";
import { addAnnotation, listAnnotations, updateAnnotation, removeAnnotation } from "@/lib/spatial/annotations";

const base = specFromPrompt("10-storey office");

describe("applyDesignInstruction", () => {
  it("adds and removes floors", () => {
    const up = applyDesignInstruction(base, "add 4 more floors");
    expect(up.spec.floors).toBe(base.floors + 4);
    expect(up.changes[0]).toMatch(/Added 4 floors/);
    const down = applyDesignInstruction(up.spec, "remove two floors");
    expect(down.spec.floors).toBe(base.floors + 2);
    expect(applyDesignInstruction(base, "make it 20 storeys").spec.floors + base.podiumFloors).toBe(20);
  });

  it("changes structure, facade, form and features", () => {
    expect(applyDesignInstruction(base, "make it mass timber").spec.structure).toBe("timber");
    expect(applyDesignInstruction(specFromPrompt("brick clinic"), "increase natural light").spec.facade).toBe("curtain");
    expect(applyDesignInstruction(base, "reshape it around a courtyard").spec.form).toBe("courtyard");
    const feat = applyDesignInstruction(base, "add balconies and a green roof");
    expect(feat.spec.balconies && feat.spec.greenRoof).toBe(true);
    expect(feat.changes).toHaveLength(2);
    expect(applyDesignInstruction(base, "add a retail podium").spec.podiumFloors).toBe(2);
  });

  it("leaves the model alone when nothing is understood", () => {
    const r = applyDesignInstruction(base, "hmm interesting");
    expect(r.changes).toHaveLength(0);
    expect(r.spec).toBe(base);
  });

  it("starts over on a fresh brief", () => {
    expect(applyDesignInstruction(base, "design a 20-storey hotel").spec.use).toBe("hotel");
  });
});

describe("designVariants", () => {
  it("returns three distinct alternatives", () => {
    const v = designVariants(base);
    expect(v.map((x) => x.key)).toEqual(["A", "B", "C"]);
    expect(v[0].spec.floors).toBeGreaterThan(base.floors);
    expect(v[1].spec.structure).not.toBe(base.structure);
    expect(v[2].spec.form).toBe("courtyard");
  });
});

describe("planVariantsFromSpec", () => {
  it("produces three dimensioned plans that fit the plate", () => {
    const plans = planVariantsFromSpec(base);
    expect(plans).toHaveLength(3);
    for (const p of plans) {
      expect(p.layout_json.rooms.some((r) => r.type === "core")).toBe(true);
      for (const r of p.layout_json.rooms) {
        expect(r.x + r.width).toBeLessThanOrEqual(base.width + 0.2);
        expect(r.y + r.height).toBeLessThanOrEqual(base.depth + 0.2);
      }
      expect(p.metrics.efficiency_ratio).toBeGreaterThan(0.5);
      expect(p.metrics.efficiency_ratio).toBeLessThanOrEqual(1);
    }
  });
});

describe("detectClashes", () => {
  it("finds real overlaps, sorted by severity, deterministically", () => {
    for (const b of SAMPLE_BUILDINGS) {
      const geo = buildGeometry(specFromPrompt(b.prompt));
      const c1 = detectClashes(geo);
      expect(detectClashes(geo)).toEqual(c1);
      const order = { critical: 0, major: 1, minor: 2 } as const;
      for (let i = 1; i < c1.length; i++) expect(order[c1[i - 1].severity]).toBeLessThanOrEqual(order[c1[i].severity]);
    }
    const tower = detectClashes(buildGeometry(specFromPrompt(SAMPLE_BUILDINGS[0].prompt)));
    expect(tower.length).toBeGreaterThan(0);
    expect(tower[0].a.label).toBeTruthy();
  });
});

describe("annotations", () => {
  beforeEach(() => localStorage.clear());
  it("adds, resolves and removes notes per model", () => {
    const n = addAnnotation({ modelId: "m1", elementId: "columns#3", elementLabel: "Column C-04", level: "Level 2", text: "Check fireproofing", author: "Jo" });
    addAnnotation({ modelId: "m2", elementId: "x", elementLabel: "x", level: "x", text: "other", author: "Jo" });
    expect(listAnnotations("m1")).toHaveLength(1);
    updateAnnotation(n.id, { resolved: true });
    expect(listAnnotations("m1")[0].resolved).toBe(true);
    removeAnnotation(n.id);
    expect(listAnnotations("m1")).toHaveLength(0);
  });
});
