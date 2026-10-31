#!/usr/bin/env node
/**
 * Visual QA harness. Boots the Vite dev server, signs in with a mocked
 * Supabase session, serves deterministic fixtures for every REST call and
 * screenshots the requested routes.
 *
 *   node scripts/qa/shoot.mjs --routes /,/build/projects --out /tmp/shots
 *   node scripts/qa/shoot.mjs --routes /login --themes dark,light --widths 1440,390
 *   QA_URL=http://localhost:8080 node scripts/qa/shoot.mjs ...   # reuse a running server
 *   --empty   serve empty tables (to review empty states)
 *   --full    capture the full scrollable page (default true)
 */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { chromium } from "playwright";
import { FIXTURES, PROFILE, USER_ID } from "./fixtures.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, arr) => {
    if (a.startsWith("--")) acc.push([a.slice(2), arr[i + 1] && !arr[i + 1].startsWith("--") ? arr[i + 1] : "true"]);
    return acc;
  }, []),
);
const routes = (args.routes ?? "/").split(",");
const themes = (args.themes ?? "dark").split(",");
const widths = (args.widths ?? "1440").split(",").map(Number);
const out = resolve(args.out ?? "qa-shots");
const empty = args.empty === "true";
mkdirSync(out, { recursive: true });

const env = Object.fromEntries(
  readFileSync(resolve(".env"), "utf8").split("\n").filter((l) => l.includes("=")).map((l) => {
    const [k, ...v] = l.split("=");
    return [k.trim(), v.join("=").trim().replace(/^"|"$/g, "")];
  }),
);
const SUPA = env.VITE_SUPABASE_URL;
const ref = new URL(SUPA).hostname.split(".")[0];

const freePort = () => new Promise((r) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });

let server;
let baseURL = process.env.QA_URL;
if (!baseURL) {
  const port = await freePort();
  baseURL = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { stdio: ["ignore", "ignore", "pipe"], env: process.env });
  server.stderr.on("data", (d) => process.stderr.write(d));
  const deadline = Date.now() + 60_000;
  for (;;) {
    try { if ((await fetch(baseURL)).ok) break; } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error("vite did not start");
    await new Promise((r) => setTimeout(r, 300));
  }
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 86_400;
const user = { id: USER_ID, aud: "authenticated", role: "authenticated", email: "jordan@sitesync.dev", app_metadata: { provider: "email" }, user_metadata: { display_name: PROFILE.display_name }, created_at: new Date().toISOString() };
const token = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: USER_ID, exp, role: "authenticated", email: user.email })}.sig`;
const session = { access_token: token, refresh_token: "qa-refresh", token_type: "bearer", expires_in: 86_400, expires_at: exp, user };

const browser = await chromium.launch({ executablePath: process.env.QA_CHROME ?? (process.env.CI ? undefined : "/opt/pw-browsers/chromium") }).catch(() => chromium.launch());
const failures = [];
try {
  for (const theme of themes) {
    for (const width of widths) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: width < 600 ? 2 : 1, reducedMotion: "reduce", colorScheme: theme });
      await ctx.addInitScript(([key, s, th]) => {
        const publicRoute = /^\/(login|reset-password)/.test(location.pathname);
        if (publicRoute) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(s));
        localStorage.setItem("sitesync-theme", th);
      }, [`sb-${ref}-auth-token`, session, theme]);
      await ctx.route(`${SUPA}/**`, async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.pathname.startsWith("/auth/v1/user")) return route.fulfill({ json: user });
        if (url.pathname.startsWith("/auth/v1/token")) return route.fulfill({ json: session });
        if (url.pathname.startsWith("/auth/v1/")) return route.fulfill({ json: {} });
        if (url.pathname.startsWith("/functions/v1/")) return route.fulfill({ json: { insight: "Portfolio health is strong: 5 of 8 projects on track. Riverside Medical Pavilion is burning budget 11 pts ahead of progress — review MEP change orders. North Yard Logistics Hub is behind schedule; recommend a recovery plan.", provider: "claude" } });
        if (url.pathname.startsWith("/rest/v1/")) {
          const table = url.pathname.split("/")[3];
          if (req.method() !== "GET" && req.method() !== "HEAD") return route.fulfill({ status: 201, json: [] });
          const rows = empty && table !== "profiles" ? [] : FIXTURES[table] ?? [];
          const single = (req.headers()["accept"] ?? "").includes("vnd.pgrst.object");
          return route.fulfill({ status: 200, headers: { "content-range": `0-${Math.max(rows.length - 1, 0)}/${rows.length}`, "access-control-expose-headers": "content-range" }, json: single ? rows[0] ?? null : rows });
        }
        return route.fulfill({ json: {} });
      });
      const page = await ctx.newPage();
      page.on("pageerror", (e) => failures.push(`[${theme} ${width}] pageerror: ${e.message}`));
      page.on("console", (m) => { if (m.type() === "error" && !/WebSocket|realtime|Failed to load resource|favicon/i.test(m.text())) failures.push(`[${theme} ${width}] console: ${m.text().slice(0, 200)}`); });
      for (const r of routes) {
        await page.goto(baseURL + r, { waitUntil: "load", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1200);
        const vh = width < 600 ? 844 : 900;
        if (args.full !== "false") {
          // The app scrolls inside #main-scroll, so grow the viewport to fit it.
          const h = await page.evaluate(() => {
            const m = document.getElementById("main-scroll");
            return m ? m.scrollHeight + (window.innerHeight - m.clientHeight) : document.documentElement.scrollHeight;
          });
          await page.setViewportSize({ width, height: Math.min(Math.max(h, vh), 6000) });
          await page.waitForTimeout(400);
        }
        const name = `${(r === "/" ? "dashboard" : r.slice(1).replace(/\//g, "_"))}__${theme}_${width}${empty ? "_empty" : ""}.png`;
        await page.screenshot({ path: `${out}/${name}`, fullPage: args.full !== "false" });
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
        if (overflow) failures.push(`[${theme} ${width}] ${r}: horizontal overflow`);
        console.log(`✓ ${name}`);
        await page.setViewportSize({ width, height: vh });
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server?.kill();
}
if (failures.length) {
  console.log("\nIssues:\n" + [...new Set(failures)].map((f) => "  • " + f).join("\n"));
}
