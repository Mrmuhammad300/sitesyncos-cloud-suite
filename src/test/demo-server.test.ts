import { beforeEach, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { DEMO_KEY, DEMO_URL, demoFetch, resetDemoData } from "@/lib/demo/server";

const sb = createClient(DEMO_URL, DEMO_KEY, { auth: { persistSession: false }, global: { fetch: demoFetch } });

describe("demo backend (PostgREST emulation through supabase-js)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetDemoData();
  });

  it("serves seeded rows with filters, ordering and limits", async () => {
    const { data, error } = await sb.from("projects").select("id, name, budget").eq("status", "On Track").order("budget", { ascending: false }).limit(2);
    expect(error).toBeNull();
    expect(data).toHaveLength(2);
    expect(Number(data![0].budget)).toBeGreaterThanOrEqual(Number(data![1].budget));
    expect(Object.keys(data![0]).sort()).toEqual(["budget", "id", "name"]);
  });

  it("supports or/ilike search and exact counts", async () => {
    const { data } = await sb.from("rfis").select("*").or("subject.ilike.%curtain%,rfi_number.ilike.%zzz%");
    expect(data!.length).toBe(1);
    const { count } = await sb.from("projects").select("*", { count: "exact", head: true });
    expect(count).toBe(8);
  });

  it("inserts with column defaults, updates and deletes", async () => {
    const { data: created, error } = await sb.from("projects").insert({ name: "Demo Tower" }).select().single();
    expect(error).toBeNull();
    expect(created).toMatchObject({ name: "Demo Tower", spent: 0, progress: 0 });

    await sb.from("projects").update({ status: "Behind" }).eq("id", created!.id);
    const { data: updated } = await sb.from("projects").select("*").eq("id", created!.id).single();
    expect(updated!.status).toBe("Behind");

    await sb.from("projects").delete().eq("id", created!.id);
    const { data: gone } = await sb.from("projects").select("*").eq("id", created!.id);
    expect(gone).toHaveLength(0);
  });

  it("persists edits and can reset", async () => {
    await sb.from("tenants").delete().neq("id", "none");
    expect((await sb.from("tenants").select("*")).data).toHaveLength(0);
    resetDemoData();
    expect((await sb.from("tenants").select("*")).data!.length).toBeGreaterThan(0);
  });

  it("signs in with any credentials and answers ai-insights", async () => {
    const { data, error } = await sb.auth.signInWithPassword({ email: "someone@example.com", password: "whatever" });
    expect(error).toBeNull();
    expect(data.user?.email).toBe("someone@example.com");
    const res = await sb.functions.invoke("ai-insights", { body: { type: "project-health" } });
    expect(res.data.insight).toMatch(/Portfolio health/);
  });
});
