---
name: SiteSync Design System
description: Token-driven "control room" design system — see docs/DESIGN.md for the full guide
type: design
---

Source of truth: `src/index.css` (tokens) and `docs/DESIGN.md` (rules).

- Dark default (graphite `--background: 228 14% 5%`), light "drafting paper" mode is first-class.
- `primary` = signal orange (intent / main action); `data` = cyan (data series).
- Status: `success`, `warning`, `destructive`, `info`. Module hues: `mod-build|ops|vault|ledger|ai|spatial|system`.
- `accent` is a neutral hover surface (NOT purple).
- Fonts: Geist (sans), Geist Mono (numbers, IDs, eyebrows), Instrument Serif (hero display only).
- Building blocks in `src/components/os`: PageHeader, StatCard, Panel, StatusPill, EmptyState, Toolbar/SearchField, Meter, Sparkline.
- Charts must use helpers from `src/lib/chart.ts`. Never hardcode hsl()/hex/Tailwind palette colors in pages.
