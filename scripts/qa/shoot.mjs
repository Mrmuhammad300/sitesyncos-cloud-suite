#!/usr/bin/env node
/**
 * Visual QA harness. Boots the Vite dev server in demo mode (the in-browser
 * backend in src/lib/demo serves deterministic sample data) and screenshots
 * the requested routes.
 *
 *   node scripts/qa/shoot.mjs --routes /,/build/projects --out /tmp/shots
 *   node scripts/qa/shoot.mjs --routes /login --themes dark,light --widths 1440,390
 *   QA_URL=http://localhost:8080 node scripts/qa/shoot.mjs ...   # reuse a server started with VITE_DEMO_MODE=true
 *   --empty   start with empty tables (to review empty states)
 *   --full    capture the full scrollable page (default true)
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { createServer } from "node:net";
import { chromium } from "playwright";

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


const freePort = () => new Promise((r) => { const s = createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => r(p)); }); });

let server;
let baseURL = process.env.QA_URL;
if (!baseURL) {
  const port = await freePort();
  baseURL = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [resolve("node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"], { stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, VITE_DEMO_MODE: "true" } });
  server.stderr.on("data", (d) => process.stderr.write(d));
  const deadline = Date.now() + 60_000;
  for (;;) {
    try { if ((await fetch(baseURL)).ok) break; } catch { /* not up yet */ }
    if (Date.now() > deadline) throw new Error("vite did not start");
    await new Promise((r) => setTimeout(r, 300));
  }
}


const browser = await chromium.launch({ executablePath: process.env.QA_CHROME ?? (process.env.CI ? undefined : "/opt/pw-browsers/chromium") }).catch(() => chromium.launch());
const failures = [];
try {
  for (const theme of themes) {
    for (const width of widths) {
      const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 }, deviceScaleFactor: width < 600 ? 2 : 1, reducedMotion: "reduce", colorScheme: theme });
      await ctx.addInitScript(([th, isEmpty]) => {
        const AUTH = "sb-demo-auth-token";
        const publicRoute = /^\/(login|reset-password)/.test(location.pathname);
        if (!sessionStorage.getItem("qa-init")) {
          sessionStorage.setItem("qa-init", "1");
          localStorage.removeItem("sitesync-demo-db");
        }
        if (publicRoute) {
          localStorage.setItem("sitesync-demo-signed-out", "1");
          localStorage.removeItem(AUTH);
        } else {
          localStorage.removeItem("sitesync-demo-signed-out");
        }
        if (isEmpty) localStorage.setItem("sitesync-demo-empty", "1");
        else localStorage.removeItem("sitesync-demo-empty");
        localStorage.setItem("sitesync-theme", th);
      }, [theme, empty]);
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
