import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn (class merging utility)", () => {
  it("returns a single class unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("joins multiple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("omits falsy values", () => {
    expect(cn("foo", false, undefined, null, "baz")).toBe("foo baz");
  });

  it("merges conflicting Tailwind classes, keeping the last", () => {
    // twMerge resolves conflicts: p-2 wins over p-4 when p-2 comes last
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles object syntax from clsx", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("handles array syntax from clsx", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("returns empty string when no args", () => {
    expect(cn()).toBe("");
  });
});
