# SiteSync OS

**Build. Operate. Own.** — an operating system for construction and real estate.
One console for project delivery, asset operations, investment intelligence, treasury, AI agents
and a 3D BIM workbench, all backed by Supabase.

| Module | What it covers |
|---|---|
| **Build** | Projects, schedule (Gantt), RFIs, submittals, change orders, daily reports, punch list |
| **Ops** | Cost dashboard, budgets, draw requests, tenants, work orders, documents |
| **Vault** | Property portfolio, ROI calculator, lender portal, compliance |
| **Quantum Ledger** | Treasury ledger, milestones, approvals |
| **Intelligence** | AI agents, analytics, simulator, AI assistant, automation compliance |
| **Spatial** | 3D viewer, floor plans, 3D generator, clash analysis, design assistant |

## Stack

React 18 · TypeScript · Vite 5 · Tailwind CSS · shadcn/ui (Radix) · TanStack Query ·
Supabase (Postgres, Auth, Realtime, Edge Functions) · Recharts · Three.js / React Three Fiber · Framer Motion.

## Quick start

```bash
nvm use            # Node 20+
npm ci
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev            # http://localhost:8080
```

| Script | Purpose |
|---|---|
| `npm run dev` | Dev server on port 8080 |
| `npm run build` / `npm run preview` | Production build / serve it locally |
| `npm run check` | Typecheck + lint + unit tests (what CI runs) |
| `npm run qa:shots -- --routes /,/build/rfis --themes dark,light --widths 1440,390` | Screenshot any route with mocked data |

## Deploy to Vercel

The repo ships with a [`vercel.json`](./vercel.json) that sets the Vite framework preset, SPA rewrites,
long-term caching for hashed assets and security headers.

1. Import the repository in Vercel (framework is detected as **Vite**).
2. Add environment variables for **Production** and **Preview**:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID` (optional)
   - `VITE_BLENDER_API_URL` (optional, for the 3D generator service)
3. Deploy. Every pull request gets a preview URL.
4. In Supabase → Authentication → URL Configuration, add your Vercel domain(s) to **Site URL** and
   **Redirect URLs** so sign-up and password-reset links work.

If the Supabase variables are missing, the app shows a setup screen instead of a blank page.

## Project layout

```
src/
  components/
    os/            Design-system building blocks (PageHeader, StatCard, Panel, StatusPill, …)
    ui/            shadcn/ui primitives, restyled on the SiteSync tokens
    AppLayout.tsx  Shell: sidebar, breadcrumbs, ⌘K command palette, theme, account menu
  lib/
    modules.ts     Navigation registry (sidebar, breadcrumbs, palette all derive from it)
    chart.ts       Recharts theme helpers
    dashboard.ts   Pure dashboard metrics (unit-tested)
  hooks/           Data hooks (TanStack Query + Supabase), auth, theme
  pages/           One folder per module
supabase/          Migrations, edge functions (ai-insights, agent-orchestrator, send-notification)
services/          Blender API + MCP integration for 3D generation
remotion/          Marketing video compositions
scripts/qa/        Visual QA harness + fixtures
docs/DESIGN.md     Design system guide
```

## Design system

See [`docs/DESIGN.md`](./docs/DESIGN.md). In short: every color is a token, numbers are mono and
tabular, dark is the default and light is first-class, and every page has designed loading and
empty states.

## Keyboard

| Keys | Action |
|---|---|
| `⌘K` / `Ctrl K` or `/` | Command palette — search records, jump to any module, run actions |
| `⌘B` / `Ctrl B` | Toggle sidebar |

## License

Private — all rights reserved.
