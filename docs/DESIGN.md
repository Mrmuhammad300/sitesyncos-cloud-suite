# SiteSync OS — Design System

The interface is a **control room for the built world**: graphite surfaces, hairline structure,
signal-orange for intent, cyan for data, mono numerals for anything you'd measure.
Dark is the default; light mode is "drafting paper". Both are first-class.

## Principles

1. **Tokens only.** Never write `hsl(217 91% 60%)`, `text-blue-500`, `#fff` or `bg-purple-*` in a page.
   Every color comes from a CSS variable (`src/index.css`) through Tailwind utilities.
2. **Numbers are instruments.** KPIs, currency, percentages, IDs (RFI‑142, CO‑031) render in
   `font-mono tabular-nums` (`ss-num`).
3. **One accent per moment.** `primary` (signal orange) marks the main action and "you are here".
   Status colors carry meaning only — don't decorate with them.
4. **Every state is designed.** Loading → skeleton/shimmer. Empty → `<EmptyState>` with a next step.
   Error → toast with a human sentence.
5. **Calm motion.** 200–600ms, `ease-out-expo`. Lists use `.stagger`. Everything respects
   `prefers-reduced-motion` (handled globally).

## Tokens (Tailwind utilities)

| Purpose | Utility |
|---|---|
| Page background | `bg-background` |
| Raised surfaces | `bg-surface-1` · `bg-surface-2` · `bg-surface-3` |
| Text | `text-foreground` · `text-muted-foreground` |
| Intent / brand | `primary` (orange) |
| Data series / secondary highlight | `data` (cyan) |
| Status | `success` · `warning` · `destructive` · `info` |
| Lines | `border` · `border-border-strong` |
| Module identity | `mod-build` · `mod-ops` · `mod-vault` · `mod-ledger` · `mod-ai` · `mod-spatial` · `mod-system` |
| Fonts | `font-sans` (Geist) · `font-mono` (Geist Mono) · `font-display` (Instrument Serif, hero moments only) |

> `accent` is a **neutral hover surface** (shadcn convention), not a brand color. Use `text-mod-ai`
> for the old "purple AI" look.

## Building blocks — `@/components/os`

```tsx
import { PageHeader, StatCard, Panel, StatusPill, EmptyState, Toolbar, SearchField, Meter, Sparkline } from "@/components/os";
```

| Component | Use |
|---|---|
| `PageHeader` | Top of every page. Module eyebrow + icon are inferred from the route (`src/lib/modules.ts`). Put primary actions in `actions`. |
| `StatCard` | KPI tile. `tone`, `icon`, `hint`, `delta` (+`invertDelta` for costs), `spark` (number[]). Grid: `grid grid-cols-2 gap-3 lg:grid-cols-4 stagger`. |
| `Panel` | Any grouped block (chart, list, table). `eyebrow` + `title` + `actions`. `flush` for edge-to-edge tables. |
| `StatusPill` | Any status string. Tone is inferred (`On Track`→success, `Overdue`→destructive …). |
| `EmptyState` | Zero data. Always pass an `action` when the user can fix it. |
| `Toolbar` + `SearchField` | Filter row above lists/tables. |
| `Meter` | Progress / utilisation bars. `risk` auto-colors by threshold. |

Charts: import from `@/lib/chart` — `CHART`, `SERIES`, `STATUS_CHART_COLOR`, `axisProps`, `gridProps`,
`tooltipProps`, `legendProps`. Spread them onto Recharts primitives; never pass literal colors.

## Page anatomy

```tsx
<div className="space-y-6">
  <PageHeader title="Projects" description="…" actions={<>…<Button><Plus />New project</Button></>} />
  <section className="stagger grid grid-cols-2 gap-3 lg:grid-cols-4">{/* StatCards */}</section>
  <Panel flush title="All projects" actions={<Toolbar>…</Toolbar>}>{/* Table */}</Panel>
</div>
```

- Buttons: default size for page actions; `size="sm"` in panels; `size="xs"` for inline row actions.
  Icons go inside buttons **without** margin classes (the button has `gap-2`).
- Tables live in a `flush` Panel. Wrap wide tables in `overflow-x-auto`. Row actions are ghost icon buttons.
- Dialogs: `DialogContent className="sm:max-w-lg"`, two-column field grids on `sm:`.
- Mobile: everything must work at 390px with no horizontal page scroll.

## Visual QA

`node scripts/qa/shoot.mjs --routes /build/projects --themes dark,light --widths 1440,390 --out qa-shots`
boots the app with mocked Supabase data (`scripts/qa/fixtures.mjs`) and screenshots each route.
Add `--empty` to review empty states.
