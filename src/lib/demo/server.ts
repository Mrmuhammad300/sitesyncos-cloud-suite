/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * In-browser demo backend.
 *
 * When SiteSync is deployed without Supabase credentials, the Supabase client is
 * given this `fetch` implementation instead of the network. It emulates the small
 * slice of PostgREST, GoTrue, Storage and Edge Functions the app uses, backed by
 * a seeded dataset persisted to localStorage — so every screen works, and
 * creates/edits/deletes stick for the visitor's browser.
 */
import { FIXTURES, PROFILE, USER_ID } from "./fixtures";

type Row = Record<string, any>;
type DB = Record<string, Row[]>;

export const DEMO_URL = "https://demo.sitesync.local";
export const DEMO_KEY = "demo-anon-key";
const DB_KEY = "sitesync-demo-db";
const DB_VERSION = 1;
export const SIGNED_OUT_KEY = "sitesync-demo-signed-out";
export const EMPTY_KEY = "sitesync-demo-empty";
export const AUTH_STORAGE_KEY = `sb-${new URL(DEMO_URL).hostname.split(".")[0]}-auth-token`;

// ─── Store ───────────────────────────────────────────────────────────────────
let db: DB | null = null;

function seed(): DB {
  return JSON.parse(JSON.stringify(FIXTURES));
}

function load(): DB {
  if (db) return db;
  try {
    if (localStorage.getItem(EMPTY_KEY) === "1") {
      db = Object.fromEntries(Object.keys(FIXTURES).map((k) => [k, k === "profiles" || k === "user_roles" ? FIXTURES[k] : []]));
      return db;
    }
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { v: number; db: DB };
      if (parsed.v === DB_VERSION) return (db = parsed.db);
    }
  } catch {
    /* fall through to seed */
  }
  return (db = seed());
}

function save() {
  try {
    if (localStorage.getItem(EMPTY_KEY) !== "1") localStorage.setItem(DB_KEY, JSON.stringify({ v: DB_VERSION, db }));
  } catch {
    /* quota or private mode — keep in memory */
  }
}

/** Wipe local edits and restore the original demo dataset. */
export function resetDemoData() {
  try {
    localStorage.removeItem(DB_KEY);
  } catch {
    /* ignore */
  }
  db = seed();
}

// ─── Auth ────────────────────────────────────────────────────────────────────
const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

function makeUser(email = "demo@sitesync.dev", name?: string) {
  return {
    id: USER_ID,
    aud: "authenticated",
    role: "authenticated",
    email,
    email_confirmed_at: new Date().toISOString(),
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: name ?? PROFILE.display_name },
    created_at: PROFILE.created_at,
    updated_at: new Date().toISOString(),
  };
}

export function makeSession(email?: string, name?: string) {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7;
  const user = makeUser(email, name);
  const access_token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, exp, role: "authenticated", email: user.email })}.demo`;
  return { access_token, refresh_token: "demo-refresh", token_type: "bearer", expires_in: 60 * 60 * 24 * 7, expires_at: exp, user };
}

function currentUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (raw) return JSON.parse(raw).user ?? makeUser();
  } catch {
    /* ignore */
  }
  return makeUser();
}

// ─── PostgREST emulation ─────────────────────────────────────────────────────
const RESERVED = new Set(["select", "order", "limit", "offset", "or", "and", "on_conflict", "columns"]);

function coerce(v: string): any {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

function cmp(a: any, b: any) {
  if (a === b) return 0;
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  const na = Number(a);
  const nb = Number(b);
  if (typeof a !== "boolean" && !Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== "" && String(b).trim() !== "") return na - nb;
  return String(a).localeCompare(String(b));
}

function likeToRegex(pattern: string, flags: string) {
  const esc = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[%*]/g, ".*").replace(/_/g, ".");
  return new RegExp(`^${esc}$`, flags);
}

/** Evaluate a single `op.value` expression (optionally prefixed with `not.`) against a cell. */
function test(cell: any, expr: string): boolean {
  if (expr.startsWith("not.")) return !test(cell, expr.slice(4));
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const raw = expr.slice(dot + 1); // URLSearchParams has already decoded it
  const val = coerce(raw);
  switch (op) {
    case "eq": return cell === val || (cell !== null && cell !== undefined && String(cell) === raw);
    case "neq": return !(cell === val || String(cell) === raw);
    case "gt": return cmp(cell, val) > 0;
    case "gte": return cmp(cell, val) >= 0;
    case "lt": return cmp(cell, val) < 0;
    case "lte": return cmp(cell, val) <= 0;
    case "like": return cell != null && likeToRegex(raw, "").test(String(cell));
    case "ilike": return cell != null && likeToRegex(raw, "i").test(String(cell));
    case "is": return val === null ? cell === null || cell === undefined : cell === val;
    case "in": {
      const list = raw.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      return list.includes(String(cell));
    }
    case "cs": {
      const want = raw.replace(/^[{[]|[}\]]$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
      return Array.isArray(cell) && want.every((w) => cell.map(String).includes(w));
    }
    default:
      return true;
  }
}

/** Parse `or=(a.ilike.x,b.eq.y)` into predicates. */
function orPredicate(group: string) {
  const inner = group.replace(/^\(|\)$/g, "");
  const parts: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) parts.push(cur);
  return (row: Row) =>
    parts.some((p) => {
      const i = p.indexOf(".");
      return test(row[p.slice(0, i)], p.slice(i + 1));
    });
}

function filterRows(rows: Row[], params: URLSearchParams) {
  let out = rows;
  for (const [key, value] of params) {
    if (key === "or") out = out.filter(orPredicate(value));
    else if (!RESERVED.has(key)) out = out.filter((r) => test(r[key], value));
  }
  return out;
}

function project(rows: Row[], select: string | null) {
  if (!select || select.trim() === "*" || select.includes("*")) return rows;
  const cols = select.split(",").map((c) => c.trim().split(":").pop()!.split("(")[0]).filter(Boolean);
  return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c] ?? null])));
}

function order(rows: Row[], spec: string | null) {
  if (!spec) return rows;
  const keys = spec.split(",").map((s) => {
    const [col, dir, nulls] = s.split(".");
    return { col, desc: dir === "desc", nullsFirst: nulls === "nullsfirst" };
  });
  return [...rows].sort((a, b) => {
    for (const k of keys) {
      const av = a[k.col];
      const bv = b[k.col];
      if ((av == null) !== (bv == null)) return (av == null ? -1 : 1) * (k.nullsFirst ? 1 : -1);
      const c = cmp(av, bv);
      if (c !== 0) return k.desc ? -c : c;
    }
    return 0;
  });
}

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

const latency = () => new Promise((r) => setTimeout(r, 120 + Math.random() * 180));

async function readBody(init?: RequestInit, req?: Request): Promise<any> {
  try {
    if (init?.body && typeof init.body === "string") return JSON.parse(init.body);
    if (req) {
      const t = await req.clone().text();
      return t ? JSON.parse(t) : null;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

/** Column defaults inferred from the seeded rows, mimicking Postgres DEFAULTs (0, false, '{}', null). */
function shapeDefaults(table: string): Row {
  const sample = FIXTURES[table]?.[0];
  if (!sample) return {};
  return Object.fromEntries(
    Object.entries(sample).map(([k, v]) => [k, typeof v === "number" ? 0 : typeof v === "boolean" ? false : Array.isArray(v) ? [] : null]),
  );
}

function withDefaults(table: string, row: Row): Row {
  const now = new Date().toISOString();
  const base: Row = { ...shapeDefaults(table), id: crypto.randomUUID(), created_at: now, updated_at: now };
  if (table !== "audit_logs" && table !== "user_roles") base.created_by = USER_ID;
  return { ...base, ...row };
}

async function handleRest(table: string, method: string, url: URL, headers: Headers, body: any) {
  const store = load();
  const rows = (store[table] ??= []);
  const params = url.searchParams;
  const accept = headers.get("accept") ?? "";
  const prefer = headers.get("prefer") ?? "";
  const single = accept.includes("vnd.pgrst.object");
  const returnRep = prefer.includes("return=representation");

  if (method === "GET" || method === "HEAD") {
    let result = order(filterRows(rows, params), params.get("order"));
    const total = result.length;
    const offset = Number(params.get("offset") ?? 0);
    const limit = params.get("limit");
    result = result.slice(offset, limit ? offset + Number(limit) : undefined);
    result = project(result, params.get("select"));
    const range = result.length ? `${offset}-${offset + result.length - 1}/${total}` : `*/${total}`;
    const h = { "content-range": range };
    if (method === "HEAD") return new Response(null, { status: 200, headers: h });
    if (single) {
      if (result.length !== 1) return json({ code: "PGRST116", message: "JSON object requested, multiple (or no) rows returned", details: `The result contains ${result.length} rows`, hint: null }, 406);
      return json(result[0], 200, h);
    }
    return json(result, 200, h);
  }

  if (method === "POST") {
    const incoming: Row[] = (Array.isArray(body) ? body : [body]).filter(Boolean).map((r) => withDefaults(table, r));
    const upsert = prefer.includes("resolution=merge-duplicates");
    for (const r of incoming) {
      const idx = upsert ? rows.findIndex((x) => x.id === r.id) : -1;
      if (idx >= 0) rows[idx] = { ...rows[idx], ...r };
      else rows.unshift(r);
    }
    save();
    if (!returnRep) return new Response(null, { status: 201 });
    const out = project(incoming, params.get("select"));
    return single ? json(out[0] ?? null, 201) : json(out, 201);
  }

  if (method === "PATCH") {
    const targets = filterRows(rows, params);
    const now = new Date().toISOString();
    for (const t of targets) Object.assign(t, body ?? {}, { updated_at: body?.updated_at ?? now });
    save();
    if (!returnRep) return new Response(null, { status: 204 });
    const out = project(targets, params.get("select"));
    return single ? json(out[0] ?? null) : json(out);
  }

  if (method === "DELETE") {
    const targets = new Set(filterRows(rows, params));
    store[table] = rows.filter((r) => !targets.has(r));
    save();
    if (!returnRep) return new Response(null, { status: 204 });
    return json(project([...targets], params.get("select")));
  }

  return json({ message: "Method not supported in demo mode" }, 405);
}

// ─── Edge functions ──────────────────────────────────────────────────────────
function insight(type: string | undefined) {
  const store = load();
  const projects = store.projects ?? [];
  const atRisk = projects.filter((p) => p.status === "At Risk" || p.status === "Behind");
  const budgets = store.budgets ?? [];
  const over = budgets.filter((b) => Number(b.spent) / Math.max(Number(b.allocated), 1) >= 0.85);
  const reports = store.daily_reports ?? [];
  const incidents = reports.reduce((s, r) => s + Number(r.safety_incidents ?? 0), 0);
  const delays = reports.reduce((s, r) => s + Number(r.delay_hours ?? 0), 0);
  const fmt = (n: number) => `$${(n / 1e6).toFixed(1)}M`;

  if (type === "budget-monitor")
    return `## Budget overrun watch\n\n${over.length ? over.map((b) => `- **${b.category}** is at ${Math.round((Number(b.spent) / Number(b.allocated)) * 100)}% of its ${fmt(Number(b.allocated))} allocation.`).join("\n") : "- No cost category is above 85% utilisation."}\n\n**Recommendation:** review pending change orders against the tightest lines before approving the next draw.`;
  if (type === "daily-report-summary")
    return `## Field digest — last ${reports.length} reports\n\n- Average crew: **${Math.round(reports.reduce((s, r) => s + Number(r.crew_count ?? 0), 0) / Math.max(reports.length, 1))}** workers/day\n- Delay hours logged: **${delays}**\n- Safety incidents: **${incidents}**${incidents ? " — follow up on the incident report and toolbox talk." : " — clean record."}\n\n**Next step:** weather-related delays are the main schedule drag; consider resequencing exterior work.`;
  return `## Portfolio health\n\n${projects.length - atRisk.length} of ${projects.length} projects are on track.\n\n${atRisk.map((p) => `- **${p.name}** (${p.status}) — ${Math.round((Number(p.spent) / Math.max(Number(p.budget), 1)) * 100)}% of budget spent at ${p.progress}% progress.`).join("\n")}\n\n**Recommendation:** prioritise recovery plans where spend is running ahead of progress.`;
}

// ─── Fetch entry point ───────────────────────────────────────────────────────
export async function demoFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const req = input instanceof Request ? input : undefined;
  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
  const method = (init?.method ?? req?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers ?? req?.headers);
  const path = url.pathname;
  const body = method === "GET" || method === "HEAD" ? null : await readBody(init, req);
  await latency();

  // Auth (GoTrue)
  if (path.startsWith("/auth/v1/")) {
    const route = path.slice("/auth/v1/".length);
    if (route === "token") {
      try {
        localStorage.removeItem(SIGNED_OUT_KEY);
      } catch {
        /* ignore */
      }
      if (url.searchParams.get("grant_type") === "refresh_token") return json(makeSession(currentUser().email));
      return json(makeSession(body?.email));
    }
    if (route === "signup") return json(makeSession(body?.email, body?.data?.display_name));
    if (route === "user") return json(method === "PUT" ? { ...currentUser(), ...(body?.data ? { user_metadata: body.data } : {}) } : currentUser());
    if (route === "logout") {
      try {
        localStorage.setItem(SIGNED_OUT_KEY, "1");
      } catch {
        /* ignore */
      }
      return new Response(null, { status: 204 });
    }
    return json({});
  }

  // Data (PostgREST)
  if (path.startsWith("/rest/v1/")) {
    const table = path.slice("/rest/v1/".length).split("/")[0];
    if (table === "rpc") return json(null);
    return handleRest(table, method, url, headers, body);
  }

  // Edge functions
  if (path.startsWith("/functions/v1/")) {
    const name = path.slice("/functions/v1/".length);
    if (name === "ai-insights") return json({ insight: insight(body?.type), provider: body?.provider ?? "claude", demo: true });
    return json({ ok: true, demo: true });
  }

  // Storage
  if (path.startsWith("/storage/v1/")) {
    if (method === "DELETE") return json([]);
    return json({ Key: path.split("/object/")[1] ?? "demo", Id: crypto.randomUUID() });
  }

  return json({});
}

/** Seed a signed-in demo session (unless the visitor explicitly signed out). */
export function bootstrapDemoSession() {
  try {
    if (localStorage.getItem(SIGNED_OUT_KEY) === "1") return;
    if (!localStorage.getItem(AUTH_STORAGE_KEY)) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(makeSession()));
  } catch {
    /* storage unavailable */
  }
}
