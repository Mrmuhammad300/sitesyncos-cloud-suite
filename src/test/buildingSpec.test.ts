import { describe, expect, it } from "vitest";
import { SAMPLE_BUILDINGS, buildingHeight, elementCounts, grossFloorArea, specFromPrompt } from "@/lib/spatial/buildingSpec";

describe("specFromPrompt", () => {
  it("reads storeys, structure, use and podium", () => {
    const s = specFromPrompt("12-storey mass timber office with retail podium");
    expect(s.floors + s.podiumFloors).toBe(12);
    expect(s.podiumFloors).toBeGreaterThan(0);
    expect(s.structure).toBe("timber");
    expect(s.use).toBe("office");
    expect(s.facade).toBe("fins");
    expect(s.name).toBe("12-Storey Timber Office Tower");
  });

  it("understands word numbers, G+N and rise keywords", () => {
    expect(specFromPrompt("twelve story apartment building").floors).toBe(12);
    const g = specFromPrompt("G+8 hotel");
    expect(g.floors + g.podiumFloors).toBe(9);
    expect(specFromPrompt("high-rise residential").floors).toBeGreaterThanOrEqual(20);
  });

  it("derives a plausible footprint from an area", () => {
    const s = specFromPrompt("Modern open-plan office, 5,000 sqft, 30 desks");
    expect(s.width * s.depth).toBeGreaterThan(300);
    expect(s.width * s.depth).toBeLessThan(600);
  });

  it("detects use types and features", () => {
    expect(specFromPrompt("3 bedroom residence").use).toBe("residential");
    expect(specFromPrompt("medical clinic with 6 exam rooms").use).toBe("medical");
    expect(specFromPrompt("distribution warehouse").structure).toBe("steel");
    expect(specFromPrompt("office with courtyard").form).toBe("courtyard");
    expect(specFromPrompt("net-zero office").greenRoof).toBe(true);
    expect(specFromPrompt("apartments").balconies).toBe(true);
  });

  it("uses a titled prefix as the building name", () => {
    expect(specFromPrompt(SAMPLE_BUILDINGS[0].prompt).name).toBe("Harbor Point Tower");
  });

  it("is deterministic and always yields sane geometry", () => {
    for (const p of ["", "a", "999 storey", "tiny", ...SAMPLE_BUILDINGS.map((b) => b.prompt)]) {
      const s = specFromPrompt(p);
      expect(specFromPrompt(p)).toEqual(s);
      expect(s.floors).toBeGreaterThanOrEqual(1);
      expect(s.floors + s.podiumFloors).toBeLessThanOrEqual(60);
      expect(buildingHeight(s)).toBeGreaterThan(0);
      expect(grossFloorArea(s)).toBeGreaterThan(0);
      expect(elementCounts(s).structural).toBeGreaterThan(0);
    }
  });
});
